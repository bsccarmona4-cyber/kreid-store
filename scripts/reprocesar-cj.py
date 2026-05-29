#!/usr/bin/env python3
"""
Reprocesa órdenes existentes en Supabase que no tienen CJ sync
Útil para cuando el webhook falló antes y hay órdenes pendientes
"""
import requests, json, os, sys, time, uuid
from datetime import datetime, timezone

SUPABASE_URL = "https://tvntylcgdjvgvvjcavkp.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
CJ_API_KEY = "CJ5454517@api@80a329ca12224b7b95e2174b2f5ca5e8"

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

def supabase_get(path):
    r = requests.get(f"{SUPABASE_URL}{path}", headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    })
    return r.json() if r.status_code == 200 else None

def supabase_post(path, data):
    r = requests.post(f"{SUPABASE_URL}{path}", json=data, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    })
    return r.json() if r.status_code in (200, 201) else None

def get_cj_token():
    r = requests.post("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken",
                      json={"apiKey": CJ_API_KEY})
    d = r.json()
    if d.get("code") in (10000, "10000"):
        return d["data"]["accessToken"]
    raise Exception(f"CJ auth error: {d.get('message')}")

def create_cj_order(order_number, shipping_info, products):
    token = get_cj_token()
    payload = {
        "orderNumber": order_number,
        "shippingCountryCode": shipping_info.get("countryCode", "US"),
        "shippingCountry": shipping_info.get("country", "United States"),
        "shippingProvince": shipping_info.get("province", ""),
        "shippingCity": shipping_info.get("city", ""),
        "shippingAddress": shipping_info.get("address", ""),
        "shippingAddress2": shipping_info.get("address2", ""),
        "shippingZip": shipping_info.get("zip", ""),
        "shippingCustomerName": shipping_info.get("name", ""),
        "shippingPhone": shipping_info.get("phone", ""),
        "email": shipping_info.get("email", ""),
        "logisticName": "CJPacket",
        "fromCountryCode": "CN",
        "isSandbox": 0,
        "products": [{"vid": p["vid"], "quantity": p["quantity"],
                       "storeLineItemId": f"KREID-RETRO-{uuid.uuid4().hex[:8]}"} for p in products],
    }
    r = requests.post("https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrderV3",
                      json=payload, headers={
                          "CJ-Access-Token": token, "platformToken": token,
                          "Content-Type": "application/json",
                      })
    d = r.json()
    if d.get("code") not in (10000, "10000", 20002, "20002"):
        raise Exception(f"CJ error: {d.get('message')}")
    return d.get("data", d)

def main():
    print("=" * 60)
    print("🔄 REPROCESANDO ÓRDENES SIN CJ SYNC")
    print("=" * 60)

    # Buscar órdenes sin cj_orders
    orders = supabase_get("/rest/v1/orders?order=created_at.desc&limit=10") or []
    for o in orders:
        oid = o["id"]
        # Verificar si ya tiene cj_orders
        cj = supabase_get(f"/rest/v1/cj_orders?order_id=eq.{oid}&limit=1")
        if cj and len(cj) > 0:
            print(f"\n⏭️  {oid[:8]}... Ya tiene CJ: {cj[0].get('cj_status')}")
            continue

        print(f"\n{'='*50}")
        print(f"📦 Orden: {oid[:8]}... | ${o['total']} | {o.get('email')} | Status: {o['status']}")

        # Obtener items
        items = supabase_get(f"/rest/v1/order_items?order_id=eq.{oid}") or []
        if not items:
            print("   ❌ Sin items — no se puede reprocesar")
            continue

        # Extraer shipping
        sa = o.get("shipping_address")
        if isinstance(sa, str):
            sa = json.loads(sa)
        if not sa:
            print("   ❌ Sin dirección de envío — no se puede reprocesar")
            continue

        cj_products = []
        for item in items:
            pid = item.get("product_id")
            qty = item.get("quantity", 1)
            if pid:
                prod = supabase_get(f"/rest/v1/products?id=eq.{pid}&limit=1")
                if prod and len(prod) > 0:
                    sku = prod[0].get("sku")
                    if sku and SKU_TO_VID.get(sku):
                        cj_products.append({"vid": SKU_TO_VID[sku], "quantity": qty,
                                            "storeLineItemId": f"KREID-{pid[:12]}-{uuid.uuid4().hex[:8]}"})
                        print(f"   🚚 {item['name']} x{qty} → VID: {SKU_TO_VID[sku][:12]}...")
                    else:
                        print(f"   ⚠️ {item['name']} → SKU '{sku}' no mapeado")
                else:
                    print(f"   ⚠️ {item['name']} → producto no encontrado en Supabase")

        if not cj_products:
            print("   ❌ No hay productos mapeables para CJ")
            continue

        # Crear orden en CJ
        short_id = oid.replace("-", "")[:8].upper()
        ts = int(time.time())
        cj_order_num = f"KREID-RETRO-{short_id}-{ts}"

        shipping_info = {
            "countryCode": sa.get("countryCode", "US"),
            "country": sa.get("country", "United States"),
            "province": sa.get("province", ""),
            "city": sa.get("city", ""),
            "address": sa.get("address", ""),
            "address2": sa.get("address2", ""),
            "zip": sa.get("zip", ""),
            "name": sa.get("name", ""),
            "phone": sa.get("phone", ""),
            "email": o.get("email", ""),
        }

        try:
            print(f"🚀 Enviando a CJ...")
            cj_result = create_cj_order(cj_order_num, shipping_info, cj_products)
            cj_order_id = cj_result.get("cjOrderId") or cj_result.get("data", {}).get("cjOrderId")
            cj_order_num_resp = cj_result.get("cjOrderNumber") or cj_result.get("data", {}).get("cjOrderNumber") or cj_order_num

            cj_record = {
                "order_id": oid,
                "cj_order_id": cj_order_id or "",
                "cj_order_number": cj_order_num_resp,
                "cj_status": "processing" if cj_order_id else "failed",
                "logistic_name": "CJPacket",
            }
            if not cj_order_id:
                cj_record["error_log"] = "No cjOrderId in response"

            supabase_post("/rest/v1/cj_orders", cj_record)
            print(f"✅ CJ: {cj_order_num_resp} | ID: {cj_order_id or 'N/A'}")
        except Exception as e:
            print(f"❌ Error CJ: {e}")
            supabase_post("/rest/v1/cj_orders", {
                "order_id": oid, "cj_status": "failed", "error_log": str(e),
            })
            continue

        # Pequeña pausa para no rate-limitear CJ
        time.sleep(1.5)

    print("\n" + "=" * 60)
    print("✅ Repocesamiento completado")
    print("=" * 60)

if __name__ == "__main__":
    main()
