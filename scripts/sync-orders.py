#!/usr/bin/env python3
"""
🔄 KREID Order Sync v2
Revisa Stripe por sesiones completadas SIN procesar y:
  1. Guarda orden + items en Supabase
  2. Envía orden a CJ Dropshipping
  3. Guarda tracking en cj_orders

Ejecutar como cron cada 2 minutos:
  * * * * * cd /home/leo/goose-dropshipping && python3 scripts/sync-orders.py >> logs/sync.log 2>&1
"""

import json, os, sys, time, uuid
from datetime import datetime, timezone
import urllib.request, urllib.error, urllib.parse

# ─── Config ────────────────────────────────────────
SUPABASE_URL = "https://tvntylcgdjvgvvjcavkp.supabase.co"
CJ_API_KEY = "CJ5454517@api@80a329ca12224b7b95e2174b2f5ca5e8"
STRIPE_KEY = os.environ.get("STRIPE_SECRET_KEY", "")

# Mapeo: Stripe product_id → Supabase product_id
STRIPE_PROD_TO_ID = {}

SKU_TO_VID = {
    "CJ-PM-CD": "1433302949299359744",
    "CJ-PM-VENT": "27894560-8C39-4B02-8475-50A90D1ABFD5",
    "CJ-PM-MAG": "07152307-79AB-4DBB-9F36-E9C0C69C52B3",
    "CJ-TRUNK-ORG": "2601190353581619600",
    "CJ-CC-36W": "1477534343592284160",
    "CJ-CC-30W": "1407983983391805440",
    "CJ-JS-2000A": "1631541129613160448",
    "CJ-JS-3000A": "2605070837001638800",
}

LOG_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs", "sync.log")

def log(msg):
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")

# ─── Supabase helpers ─────────────────────────────

def supabase_get(token, path):
    req = urllib.request.Request(f"{SUPABASE_URL}{path}", headers={
        "apikey": token, "Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        log(f"Supabase GET error {e.code}: {e.read().decode()[:200]}")
        return None

def supabase_post(token, path, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(f"{SUPABASE_URL}{path}", data=body, headers={
        "apikey": token, "Authorization": f"Bearer {token}",
        "Content-Type": "application/json", "Prefer": "return=representation"}, method="POST")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        err = e.read().decode()[:200]
        log(f"Supabase POST error {e.code}: {err}")
        return None

def supabase_patch(token, path, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(f"{SUPABASE_URL}{path}", data=body, headers={
        "apikey": token, "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"}, method="PATCH")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read()) if r.read() else None
    except urllib.error.HTTPError as e:
        log(f"Supabase PATCH error {e.code}: {e.read().decode()[:200]}")
        return None

# ─── Stripe helpers ───────────────────────────────

def stripe_list_sessions():
    """Listar sesiones completadas de Stripe en las últimas 24h"""
    if not STRIPE_KEY:
        log("❌ STRIPE_SECRET_KEY no configurada")
        return []
    req = urllib.request.Request(
        "https://api.stripe.com/v1/checkout/sessions?limit=20&status=complete",
        headers={"Authorization": f"Bearer {STRIPE_KEY}"})
    try:
        with urllib.request.urlopen(req) as r:
            data = json.loads(r.read())
            return data.get("data", [])
    except Exception as e:
        log(f"Stripe list error: {e}")
        return []

def stripe_get_session(session_id):
    """Obtener sesión con line_items expandidos"""
    req = urllib.request.Request(
        f"https://api.stripe.com/v1/checkout/sessions/{session_id}?expand[]=line_items.data.price.product",
        headers={"Authorization": f"Bearer {STRIPE_KEY}"})
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except Exception as e:
        log(f"Stripe session error: {e}")
        return None

# ─── CJ helpers ───────────────────────────────────

def cj_auth():
    req = urllib.request.Request(
        "https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken",
        data=json.dumps({"apiKey": CJ_API_KEY}).encode(),
        headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read())
    if data.get("code") in (10000, "10000"):
        return data["data"]["accessToken"]
    raise Exception(f"CJ auth: {data.get('message')}")

def cj_create_order(token, order_number, shipping, products):
    payload = {
        "orderNumber": order_number,
        "shippingCountryCode": shipping.get("countryCode", "US"),
        "shippingCountry": shipping.get("country", "United States"),
        "shippingProvince": shipping.get("province", ""),
        "shippingCity": shipping.get("city", ""),
        "shippingAddress": shipping.get("address", ""),
        "shippingAddress2": shipping.get("address2", ""),
        "shippingZip": shipping.get("zip", ""),
        "shippingCustomerName": shipping.get("name", ""),
        "shippingPhone": shipping.get("phone", ""),
        "email": shipping.get("email", ""),
        "logisticName": "CJPacket",
        "fromCountryCode": "CN",
        "isSandbox": 0,
        "products": [{"vid": p["vid"], "quantity": p["quantity"],
                       "storeLineItemId": p["storeLineItemId"]} for p in products],
    }
    req = urllib.request.Request(
        "https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrderV3",
        data=json.dumps(payload).encode(),
        headers={"CJ-Access-Token": token, "platformToken": token, "Content-Type": "application/json"},
        method="POST")
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read())
    if data.get("code") not in (10000, "10000", 20002, "20002"):
        raise Exception(f"CJ: {data.get('message', json.dumps(data)[:200])}")
    return data.get("data", data)

# ─── Lógica principal ─────────────────────────────

def process_session(supabase_key, session):
    """Procesar una sesión de Stripe: guardar orden + items + enviar a CJ"""
    session_id = session["id"]
    email = session.get("customer_details", {}).get("email") or session.get("customer_email", "")

    log(f"📦 Procesando: {session_id} | ${(session.get('amount_total',0))/100} | {email}")

    # Verificar si ya existe en Supabase
    existing = supabase_get(supabase_key, f"/rest/v1/orders?stripe_session_id=eq.{session_id}&select=id&limit=1")
    if existing and len(existing) > 0:
        log(f"⏭️ Ya procesada: {existing[0]['id'][:8]}...")
        return

    # Obtener sesión completa con line_items
    full = stripe_get_session(session_id)
    if not full:
        log("❌ No se pudo obtener sesión completa")
        return

    items = full.get("line_items", {}).get("data", [])
    email = email or full.get("customer_details", {}).get("email") or full.get("customer_email", "")

    # Shipping address
    sa = None
    sd = full.get("shipping_details") or full.get("customer_details", {}).get("shipping")
    if sd and sd.get("address"):
        a = sd["address"]
        sa = json.dumps({
            "name": sd.get("name", ""),
            "address": a.get("line1", ""),
            "address2": a.get("line2", ""),
            "city": a.get("city", ""),
            "province": a.get("state", ""),
            "zip": a.get("postal_code", ""),
            "countryCode": a.get("country", "US"),
            "country": "United States" if a.get("country") == "US" else a.get("country", "United States"),
            "phone": sd.get("phone", ""),
        })

    log(f"  Items: {len(items)} | Shipping: {'YES' if sa else 'NO'}")

    # Guardar orden
    total = full.get("amount_total", 0) / 100
    subtotal = full.get("amount_subtotal", 0) / 100
    order = supabase_post(supabase_key, "/rest/v1/orders", {
        "email": email,
        "status": "processing",
        "total": total,
        "shipping": total - subtotal,
        "subtotal": subtotal,
        "shipping_address": sa,
        "stripe_session_id": session_id,
    })

    if not order or (isinstance(order, list) and len(order) == 0):
        log("❌ Error guardando orden")
        return

    order_id = order[0]["id"] if isinstance(order, list) else order["id"]
    log(f"✅ Orden: {order_id[:8]}...")

    # Guardar items
    cj_products = []
    for li in items:
        p = li.get("price", {}).get("product", {})
        pid = p.get("id") if isinstance(p, dict) else p
        name = li.get("description") or (p.get("name") if isinstance(p, dict) else "Product") or "Product"
        qty = li.get("quantity", 1)

        supabase_post(supabase_key, "/rest/v1/order_items", {
            "order_id": order_id, "product_id": pid,
            "name": name, "price": (li.get("price", {}).get("unit_amount", 0)) / 100,
            "quantity": qty,
        })
        log(f"  ✅ {name} x{qty}")

        # Buscar producto en Supabase por nombre (no por ID de Stripe)
        prods = supabase_get(supabase_key, f"/rest/v1/products?name=ilike.{urllib.parse.quote(name)}&select=sku&limit=1")
        if not prods or len(prods) == 0:
            # Intentar con búsqueda parcial
            prods = supabase_get(supabase_key, f"/rest/v1/products?select=sku,name&limit=20")

        sku = None
        if prods and len(prods) > 0:
            # Buscar por coincidencia en nombre
            name_lower = name.lower()
            for p in prods:
                pname = p.get("name", "").lower()
                if name_lower in pname or pname in name_lower:
                    sku = p.get("sku")
                    break
            if not sku:
                sku = prods[0].get("sku")

        if sku and SKU_TO_VID.get(sku):
            cj_products.append({
                "vid": SKU_TO_VID[sku],
                "quantity": qty,
                "storeLineItemId": f"KREID-{name[:10]}-{uuid.uuid4().hex[:8]}",
            })
            log(f"  🚚 CJ ready: {name} (SKU:{sku})")
        else:
            log(f"  ⚠️ Sin SKU/VID: {name}")

    # Enviar a CJ
    if cj_products and sa:
        try:
            token = cj_auth()
            sha = json.loads(sa)
            short_id = order_id.replace("-", "")[:8].upper()
            ts = int(time.time())
            cj_num = f"KREID-{short_id}-{ts}"

            cj_result = cj_create_order(token, cj_num, {**sha, "email": email}, cj_products)
            cj_id = cj_result.get("cjOrderId") or cj_result.get("data", {}).get("cjOrderId")
            cj_num_resp = cj_result.get("cjOrderNumber") or cj_result.get("data", {}).get("cjOrderNumber") or cj_num

            supabase_post(supabase_key, "/rest/v1/cj_orders", {
                "order_id": order_id,
                "cj_order_id": cj_id or "",
                "cj_order_number": cj_num_resp,
                "cj_status": "processing" if cj_id else "failed",
                "logistic_name": "CJPacket",
                "error_log": None if cj_id else json.dumps(cj_result)[:300],
            })
            log(f"🚀 CJ: {cj_num_resp} | ID: {cj_id or 'N/A'}")

            # Pausa para no rate-limitear CJ
            time.sleep(2)
        except Exception as e:
            log(f"❌ CJ error: {e}")
            supabase_post(supabase_key, "/rest/v1/cj_orders", {
                "order_id": order_id, "cj_status": "failed", "error_log": str(e),
            })
    else:
        log(f"ℹ️ CJ skipped: products={len(cj_products)} shipping={'YES' if sa else 'NO'}")

def main():
    log("=" * 50)
    log("🔄 KREID Order Sync iniciado")

    # Obtener service role key
    # Cargar variables desde .env si no están en entorno
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if '=' in line and not line.startswith('#'):
                    k, v = line.split('=', 1)
                    env_vars[k.strip()] = v.strip()

    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or env_vars.get("SUPABASE_SERVICE_ROLE_KEY", "")
    stripe_key = os.environ.get("STRIPE_SECRET_KEY") or env_vars.get("STRIPE_SECRET_KEY", "")

    global STRIPE_KEY
    STRIPE_KEY = stripe_key

    if not supabase_key:
        log("❌ SUPABASE_SERVICE_ROLE_KEY no configurada")
        sys.exit(1)
    if not stripe_key:
        log("❌ STRIPE_SECRET_KEY no configurada de .env")
        sys.exit(1)

    # Listar sesiones de Stripe
    sessions = stripe_list_sessions()
    log(f"Stripe: {len(sessions)} sesiones completadas")

    for s in sessions:
        try:
            process_session(supabase_key, s)
        except Exception as e:
            log(f"❌ Error procesando {s.get('id', '?')}: {e}")
            import traceback
            traceback.print_exc()

    log("✅ Sync completado")
    print("")  # línea en blanco para separar ciclos en el log

if __name__ == "__main__":
    main()
