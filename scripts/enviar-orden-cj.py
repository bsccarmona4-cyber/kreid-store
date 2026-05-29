#!/usr/bin/env python3
"""
enviar-orden-cj.py — Envía órdenes de KREID a CJ Dropshipping.

Uso:
    # Manual por UUID de orden
    python3 scripts/enviar-orden-cj.py --order-id=UUID

    # Desde webhook por stripe session id
    python3 scripts/enviar-orden-cj.py --stripe-session-id=cs_test_xxx

    # Modo sandbox (pruebas)
    python3 scripts/enviar-orden-cj.py --order-id=UUID --sandbox

Requiere:
    pip install requests python-dotenv

Variables de entorno (o .env en la raíz del proyecto):
    SUPABASE_URL=https://tvntylcgdjvgvvjcavkp.supabase.co
    SUPABASE_SERVICE_KEY=ey_...  (service_role key, NO anon)
    CJ_API_KEY=CJ5454517@api@80a329ca12224b7b95e2174b2f5ca5e8
"""

import argparse
import json
import os
import sys
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

import requests

# ──────────────────────────────────────────────────────────────────────
# CONSTANTES
# ──────────────────────────────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://tvntylcgdjvgvvjcavkp.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
CJ_API_KEY = os.getenv("CJ_API_KEY", "CJ5454517@api@80a329ca12224b7b95e2174b2f5ca5e8")

CJ_AUTH_URL = "https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken"
CJ_CREATE_ORDER_URL = "https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrderV3"
CJ_ORDER_LIST_URL = "https://developers.cjdropshipping.com/api2.0/v1/shopping/order/list"
CJ_ORDER_DETAIL_URL = "https://developers.cjdropshipping.com/api2.0/v1/shopping/order/getOrderDetail"
CJ_TRACKING_URL = "https://developers.cjdropshipping.com/api2.0/v1/logistic/trackInfo"
CJ_PAY_URL = "https://developers.cjdropshipping.com/api2.0/v1/shopping/pay/payBalanceV2"
CJ_FREIGHT_URL = "https://developers.cjdropshipping.com/api2.0/v1/logistic/freightCalculate"

# Productos KREID → CJ VID mapping
SKU_TO_VID = {
    "CJ-PM-CD":       "1433302949299359744",
    "CJ-PM-VENT":     "27894560-8C39-4B02-8475-50A90D1ABFD5",
    "CJ-PM-MAG":      "07152307-79AB-4DBB-9F36-E9C0C69C52B3",
    "CJ-TRUNK-ORG":   "2601190353581619600",
    "CJ-CC-36W":      "1477534343592284160",
    "CJ-CC-30W":      "1407983983391805440",
    "CJ-JS-2000A":    "1631541129613160448",
    "CJ-JS-3000A":    "2605070837001638800",
}

# Estados de orden KREID
STATUS_PENDING = "pending"
STATUS_PROCESSING = "processing"
STATUS_SHIPPED = "shipped"
STATUS_DELIVERED = "delivered"
STATUS_CANCELLED = "cancelled"

# SQL para crear la tabla cj_orders
SQL_CREATE_CJ_ORDERS = """
CREATE TABLE IF NOT EXISTS cj_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  cj_order_id TEXT,
  cj_order_number TEXT,
  cj_status TEXT DEFAULT 'pending',
  tracking_number TEXT,
  tracking_url TEXT,
  logistic_name TEXT,
  shipping_cost DECIMAL(10,2),
  error_log TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cj_orders_order_id ON cj_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_cj_orders_cj_order_id ON cj_orders(cj_order_id);
"""


# ──────────────────────────────────────────────────────────────────────
# CLIENTE SUPABASE LIGERO
# ──────────────────────────────────────────────────────────────────────

class SupabaseClient:
    """Cliente Supabase REST mínimo usando requests."""

    def __init__(self, url: str, service_key: str):
        self.url = url.rstrip("/")
        self.headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    def _request(self, method: str, path: str, data: Optional[dict] = None,
                 params: Optional[dict] = None) -> dict:
        url = f"{self.url}{path}"
        resp = requests.request(method, url, headers=self.headers,
                                json=data, params=params, timeout=30)
        try:
            result = resp.json()
        except json.JSONDecodeError:
            result = {"error": resp.text}

        if resp.status_code >= 400:
            msg = result.get("message") or result.get("error") or resp.text
            raise RuntimeError(f"Supabase {resp.status_code}: {msg}")

        return result

    def get_order_by_stripe_session(self, session_id: str) -> Optional[dict]:
        result = self._request("GET", "/rest/v1/orders", params={
            "stripe_session_id": f"eq.{session_id}",
            "select": "*", "limit": "1",
        })
        if isinstance(result, list) and len(result) > 0:
            return result[0]
        return None

    def get_order_by_id(self, order_id: str) -> Optional[dict]:
        result = self._request("GET", "/rest/v1/orders", params={
            "id": f"eq.{order_id}",
            "select": "*", "limit": "1",
        })
        if isinstance(result, list) and len(result) > 0:
            return result[0]
        return None

    def get_order_items(self, order_id: str) -> list:
        result = self._request("GET", "/rest/v1/order_items", params={
            "order_id": f"eq.{order_id}", "select": "*",
        })
        return result if isinstance(result, list) else []

    def get_product_by_id(self, product_id: str) -> Optional[dict]:
        result = self._request("GET", "/rest/v1/products", params={
            "id": f"eq.{product_id}", "select": "*", "limit": "1",
        })
        if isinstance(result, list) and len(result) > 0:
            return result[0]
        return None

    def update_order_status(self, order_id: str, status: str) -> dict:
        return self._request("PATCH", f"/rest/v1/orders?id=eq.{order_id}", data={
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    def save_cj_order(self, data: dict) -> dict:
        existing = self._request("GET", "/rest/v1/cj_orders", params={
            "order_id": f"eq.{data['order_id']}", "select": "id", "limit": "1",
        })
        now = datetime.now(timezone.utc).isoformat()
        if isinstance(existing, list) and len(existing) > 0:
            cj_id = existing[0]["id"]
            return self._request("PATCH", f"/rest/v1/cj_orders?id=eq.{cj_id}",
                                 data={**data, "updated_at": now})
        else:
            return self._request("POST", "/rest/v1/cj_orders",
                                 data={**data, "created_at": now})

    def ensure_cj_orders_table(self):
        try:
            resp = requests.post(
                f"{self.url}/rest/v1/rpc/",
                headers=self.headers,
                json={"query": SQL_CREATE_CJ_ORDERS},
                timeout=30,
            )
            if resp.status_code < 400:
                print("✅ Tabla cj_orders verificada/creada.")
            else:
                print(f"⚠️  No se pudo crear automáticamente: {resp.text}")
                print(SQL_CREATE_CJ_ORDERS)
        except Exception as e:
            print(f"⚠️  Error creando tabla: {e}")
            print(SQL_CREATE_CJ_ORDERS)


# ──────────────────────────────────────────────────────────────────────
# CLIENTE CJ DROPSHIPPING
# ──────────────────────────────────────────────────────────────────────

class CJClient:
    def __init__(self, api_key: str, sandbox: bool = False):
        self.api_key = api_key
        self.sandbox = sandbox
        self.access_token: Optional[str] = None
        self.token_expires_at: float = 0

    def authenticate(self) -> str:
        if self.access_token and time.time() < self.token_expires_at - 300:
            return self.access_token
        print("🔑 Solicitando token de CJ...")
        resp = requests.post(CJ_AUTH_URL,
                             json={"apiKey": self.api_key},
                             headers={"Content-Type": "application/json"},
                             timeout=30)
        if resp.status_code != 200:
            raise RuntimeError(f"Error auth CJ {resp.status_code}: {resp.text}")
        data = resp.json()
        code = data.get("code")
        if code not in ("10000", 10000):
            raise RuntimeError(f"CJ auth error: {data.get('message')} (code: {code})")
        self.access_token = data["data"]["accessToken"]
        self.token_expires_at = time.time() + 7000
        print(f"✅ Token CJ: {self.access_token[:20]}...")
        return self.access_token

    def _headers(self) -> dict:
        token = self.authenticate()
        return {
            "CJ-Access-Token": token,
            "platformToken": token,
            "Content-Type": "application/json",
        }

    def create_order(self, order_number: str, shipping_info: dict,
                     products: list[dict]) -> dict:
        self.authenticate()
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
            "logisticName": shipping_info.get("logistic", "CJPacket"),
            "fromCountryCode": "CN",
            "isSandbox": 1 if self.sandbox else 0,
            "products": products,
        }
        print(f"📦 Creando orden CJ: {order_number} ({len(products)} producto(s))")
        if self.sandbox:
            print("   🧪 Modo SANDBOX")
        resp = requests.post(CJ_CREATE_ORDER_URL, json=payload,
                             headers=self._headers(), timeout=60)
        if resp.status_code != 200:
            raise RuntimeError(f"Error crear orden CJ {resp.status_code}: {resp.text}")
        data = resp.json()
        code = data.get("code")
        if code not in ("10000", 10000, "20002", 20002):
            raise RuntimeError(f"CJ createOrder error: {data.get('message')} (code: {code})")
        result = data.get("data", data)
        print(f"✅ Orden CJ: {result.get('cjOrderNumber')} [ID: {result.get('cjOrderId')}]")
        return result

    def pay_order(self, cj_order_id: str) -> dict:
        print(f"💳 Pagando orden CJ: {cj_order_id}")
        resp = requests.post(CJ_PAY_URL, json={"orderId": cj_order_id},
                             headers=self._headers(), timeout=30)
        if resp.status_code != 200:
            raise RuntimeError(f"Error pagar CJ {resp.status_code}: {resp.text}")
        data = resp.json()
        code = data.get("code")
        if code not in ("10000", 10000):
            print(f"⚠️  Pago no necesario: {data.get('message')}")
        else:
            print(f"✅ Pagada")
        return data

    def get_order_detail(self, cj_order_id: str) -> dict:
        resp = requests.get(CJ_ORDER_DETAIL_URL,
                            params={"orderId": cj_order_id},
                            headers=self._headers(), timeout=30)
        if resp.status_code != 200:
            raise RuntimeError(f"Error detalle CJ {resp.status_code}: {resp.text}")
        return resp.json().get("data", resp.json())

    def get_tracking(self, tracking_number: str) -> dict:
        resp = requests.get(CJ_TRACKING_URL,
                            params={"trackNumber": tracking_number},
                            headers=self._headers(), timeout=30)
        if resp.status_code != 200:
            raise RuntimeError(f"Error tracking CJ {resp.status_code}: {resp.text}")
        return resp.json().get("data", resp.json())

    def list_orders(self, page: int = 1, page_size: int = 10) -> list:
        resp = requests.get(CJ_ORDER_LIST_URL,
                            params={"pageNum": page, "pageSize": page_size},
                            headers=self._headers(), timeout=30)
        if resp.status_code != 200:
            raise RuntimeError(f"Error listar CJ {resp.status_code}: {resp.text}")
        return resp.json().get("data", resp.json())


# ──────────────────────────────────────────────────────────────────────
# LÓGICA PRINCIPAL
# ──────────────────────────────────────────────────────────────────────

def get_cj_vid(sku: str) -> str:
    vid = SKU_TO_VID.get(sku)
    if not vid:
        raise ValueError(
            f"SKU '{sku}' no mapeado. Disponibles: {list(SKU_TO_VID.keys())}")
    return vid


def build_products_list(order_items: list[dict], db: SupabaseClient) -> list[dict]:
    products = []
    for item in order_items:
        product_id = item.get("product_id")
        quantity = item.get("quantity", 1)
        product = db.get_product_by_id(product_id)
        if product:
            sku = product.get("sku", product_id)
        else:
            print(f"⚠️  Producto {product_id} no encontrado, usando ID como SKU")
            sku = product_id
        vid = get_cj_vid(sku)
        store_line_item_id = f"KREID-{product_id}-{uuid.uuid4().hex[:8]}"
        products.append({
            "vid": vid,
            "quantity": quantity,
            "storeLineItemId": store_line_item_id,
        })
        print(f"   📱 {item.get('name', sku)} x{quantity} (SKU:{sku} VID:{vid[:12]}...)")
    return products


def process_order(order_id: str, db: SupabaseClient, cj: CJClient,
                  sandbox: bool = False) -> dict:
    print(f"\n{'='*60}")
    print(f"🔄 PROCESANDO ORDEN: {order_id}")
    print(f"{'='*60}")

    order = db.get_order_by_id(order_id)
    if not order:
        raise ValueError(f"Orden no encontrada: {order_id}")
    print(f"📋 Estado: {order.get('status')} | Total: ${order.get('total', 0)}")

    order_items = db.get_order_items(order_id)
    if not order_items:
        raise ValueError(f"Sin items en orden: {order_id}")
    print(f"📦 {len(order_items)} item(s)")
    products_payload = build_products_list(order_items, db)

    shipping_address = order.get("shipping_address", {})
    if isinstance(shipping_address, str):
        shipping_address = json.loads(shipping_address)

    address_line = (shipping_address.get("line1") or
                    shipping_address.get("address") or
                    shipping_address.get("street") or "")
    address_line2 = shipping_address.get("line2") or shipping_address.get("address2") or ""

    shipping_info = {
        "countryCode": shipping_address.get("country_code", "US"),
        "country": shipping_address.get("country", "United States"),
        "province": shipping_address.get("state", shipping_address.get("province", "")),
        "city": shipping_address.get("city", ""),
        "address": address_line,
        "address2": address_line2,
        "zip": shipping_address.get("postal_code", shipping_address.get("zip", "")),
        "name": shipping_address.get("name", shipping_address.get("recipient", "")),
        "phone": shipping_address.get("phone", shipping_address.get("phone_number", "")),
        "email": order.get("email", ""),
        "logistic": "CJPacket",
    }

    print(f"\n📍 Envío: {shipping_info['name']} | {shipping_info['city']}, "
          f"{shipping_info['province']} {shipping_info['zip']}")

    cj_order_number = f"KREID-{order_id[:8].upper()}-{int(time.time())}"

    print(f"\n🚀 Enviando a CJ...")
    try:
        cj_result = cj.create_order(cj_order_number, shipping_info, products_payload)
    except Exception as e:
        error_msg = f"Error CJ: {e}"
        print(f"\n❌ {error_msg}")
        db.save_cj_order({
            "order_id": order_id,
            "cj_status": "failed",
            "error_log": error_msg,
        })
        raise

    cj_order_id = cj_result.get("cjOrderId") or cj_result.get("data", {}).get("cjOrderId")
    cj_order_number_resp = (cj_result.get("cjOrderNumber") or
                            cj_result.get("data", {}).get("cjOrderNumber"))

    if cj_order_id and not sandbox:
        try:
            cj.pay_order(cj_order_id)
        except Exception as e:
            print(f"⚠️  Pago automático falló: {e}")

    tracking_number = None
    tracking_url = None
    logistic_name = "CJPacket"
    shipping_cost = None

    if cj_order_id:
        try:
            detail = cj.get_order_detail(cj_order_id)
            tracking_number = (detail.get("trackNumber") or
                               detail.get("data", {}).get("trackNumber"))
            tracking_url = (detail.get("trackUrl") or
                            detail.get("data", {}).get("trackUrl"))
            logistic_name = (detail.get("logisticName") or
                             detail.get("data", {}).get("logisticName") or "CJPacket")
            shipping_cost = (detail.get("shippingCost") or
                             detail.get("data", {}).get("shippingCost"))
            if tracking_number:
                print(f"📬 Tracking: {tracking_number}")
        except Exception as e:
            print(f"⚠️  Tracking no disponible inmediato: {e}")

    db.save_cj_order({
        "order_id": order_id,
        "cj_order_id": cj_order_id or "",
        "cj_order_number": cj_order_number_resp or cj_order_number,
        "cj_status": "processing" if cj_order_id else "failed",
        "tracking_number": tracking_number or "",
        "tracking_url": tracking_url or "",
        "logistic_name": logistic_name,
        "shipping_cost": float(shipping_cost) if shipping_cost else None,
    })

    db.update_order_status(order_id, STATUS_PROCESSING)

    print(f"\n{'='*60}")
    print(f"✅ ORDEN PROCESADA")
    print(f"   Order ID:     {order_id}")
    print(f"   CJ Order ID:  {cj_order_id or 'N/A'}")
    print(f"   CJ Order #:   {cj_order_number_resp or cj_order_number}")
    print(f"   Tracking:     {tracking_number or 'Pendiente'}")
    print(f"{'='*60}")

    return {
        "success": True,
        "order_id": order_id,
        "cj_order_id": cj_order_id,
        "cj_order_number": cj_order_number_resp or cj_order_number,
        "tracking_number": tracking_number,
        "tracking_url": tracking_url,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Envía órdenes de KREID a CJ Dropshipping",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Ejemplos:
  python3 scripts/enviar-orden-cj.py --order-id=550e8400-e29b-41d4-a716-446655440000
  python3 scripts/enviar-orden-cj.py --stripe-session-id=cs_test_a1b2c3d4
  python3 scripts/enviar-orden-cj.py --order-id=... --sandbox""")

    parser.add_argument("--order-id", help="UUID de la orden en Supabase")
    parser.add_argument("--stripe-session-id", help="Stripe session ID")
    parser.add_argument("--sandbox", action="store_true",
                        help="Modo sandbox CJ")
    parser.add_argument("--create-table", action="store_true",
                        help="Crear tabla cj_orders y salir")
    parser.add_argument("--tracking", action="store_true",
                        help="Mostrar tracking después")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Más detalles")

    args = parser.parse_args()

    env_path = os.path.join(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__))), ".env")
    if os.path.exists(env_path):
        try:
            from dotenv import load_dotenv
            load_dotenv(env_path)
        except ImportError:
            pass

    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
    CJ_API_KEY = os.getenv("CJ_API_KEY", "CJ5454517@api@80a329ca12224b7b95e2174b2f5ca5e8")
    SUPABASE_URL = os.getenv("SUPABASE_URL",
                             "https://tvntylcgdjvgvvjcavkp.supabase.co")

    if not SUPABASE_SERVICE_KEY:
        print("❌ SUPABASE_SERVICE_KEY no configurada")
        sys.exit(1)

    db = SupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    cj = CJClient(CJ_API_KEY, sandbox=args.sandbox)

    if args.create_table:
        print("🏗️ Creando tabla cj_orders...")
        db.ensure_cj_orders_table()
        return

    order_id = None
    if args.stripe_session_id:
        print(f"🔍 Buscando por Stripe session: {args.stripe_session_id}")
        order = db.get_order_by_stripe_session(args.stripe_session_id)
        if not order:
            print(f"❌ No encontrada")
            sys.exit(1)
        order_id = order["id"]
        print(f"✅ Orden: {order_id}")
    elif args.order_id:
        order_id = args.order_id
    else:
        print("❌ Debes usar --order-id o --stripe-session-id")
        parser.print_help()
        sys.exit(1)

    try:
        result = process_order(order_id, db, cj, sandbox=args.sandbox)
        if args.tracking and result.get("tracking_number"):
            print(f"\n📬 Tracking: {result['tracking_number']}")
            try:
                track = cj.get_tracking(result["tracking_number"])
                if args.verbose:
                    print(json.dumps(track, indent=2, default=str))
            except Exception as e:
                print(f"   ⚠️ {e}")
        print(f"\n✨ Completado.")
    except (ValueError, RuntimeError) as e:
        print(f"\n❌ {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ {type(e).__name__}: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    print(f"🚀 KREID → CJ Dropshipping Sync")
    print(f"   {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    main()
