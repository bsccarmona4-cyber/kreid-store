#!/usr/bin/env python3
"""
📦 KREID — Insertar 8 productos reales CJ en Supabase
Usa la service_role key para hacer inserts directos (bypass RLS)
"""
import os
import json
import sys
from datetime import datetime

# ─── Config (desde variables de entorno) ──────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://tvntylcgdjvgvvjcavkp.supabase.co")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
if not SUPABASE_SERVICE_KEY:
    print("❌ ERROR: SUPABASE_SERVICE_KEY no está configurada")
    print("   Ejecuta: export SUPABASE_SERVICE_KEY='tu_service_role_key'")
    print("   (La key está en el dashboard de Supabase > Settings > API > service_role key)")
    sys.exit(1)

PRODUCTS = [
    {
        "id": "phone-mount-cd",
        "name": "CD Slot Phone Mount",
        "price": 33.35,
        "original_price": None,
        "description": "Universal CD slot phone mount. Fits all phones up to 6.9\". Secure grip, 360° rotation, easy one-click release. No adhesive needed.",
        "features": ["Universal Fit", "360° Rotation", "One-Click Release", "No Adhesive", "Secure Grip", "Fits CD Slots"],
        "category": "Phone Mounts",
        "badge": "Best Seller",
        "rating": 4.6,
        "reviews_count": 547,
        "stock": 250,
        "sku": "CJ-PM-CD",
        "cj_cost": 11.91,
        "profit_margin": 48.5,
        "shipping_days": "5-8",
        "images_count": 5,
        "warehouse": "US"
    },
    {
        "id": "phone-mount-vent",
        "name": "Car Air Vent Phone Holder",
        "price": 37.83,
        "original_price": 44.99,
        "description": "Premium air vent phone mount. Ultra-strong clip, anti-slip silicone pad. Compatible with all smartphones. Easy installation in seconds.",
        "features": ["Universal Fit", "Anti-Slip Silicone", "Strong Vent Clip", "360° Rotation", "One-Hand Operation", "Ultra-Compact"],
        "category": "Phone Mounts",
        "badge": "Popular",
        "rating": 4.7,
        "reviews_count": 456,
        "stock": 200,
        "sku": "CJ-PM-VENT",
        "cj_cost": 13.51,
        "profit_margin": 50.0,
        "shipping_days": "5-8",
        "images_count": 5,
        "warehouse": "US"
    },
    {
        "id": "phone-mount-magnetic",
        "name": "Car Magnetic Phone Holder",
        "price": 43.57,
        "original_price": 54.99,
        "description": "Strong magnetic phone holder for car. Ultra-strong N52 magnets. One-hand operation. Compatible with MagSafe and all phones with metal plate.",
        "features": ["Ultra-Strong N52 Magnets", "MagSafe Compatible", "One-Hand Operation", "Dashboard Mount", "Ultra-Slim Design", "No Vibration While Driving"],
        "category": "Phone Mounts",
        "badge": "Hot",
        "rating": 4.8,
        "reviews_count": 321,
        "stock": 180,
        "sku": "CJ-PM-MAG",
        "cj_cost": 15.56,
        "profit_margin": 51.5,
        "shipping_days": "5-8",
        "images_count": 5,
        "warehouse": "US"
    },
    {
        "id": "car-charger-36w",
        "name": "Car Charger PD 36W",
        "price": 33.38,
        "original_price": 39.99,
        "description": "36W PD USB-C car charger. Super fast charging for iPhone 15/16, Samsung, iPad. Dual ports. Compact aluminum design.",
        "features": ["36W PD Fast Charging", "USB-C + USB-A Ports", "iPhone 15/16 Compatible", "Samsung Super Fast", "Aluminum Alloy", "Overcharge Protection"],
        "category": "Chargers",
        "badge": "Best Seller",
        "rating": 4.8,
        "reviews_count": 394,
        "stock": 300,
        "sku": "CJ-CC-36W",
        "cj_cost": 11.92,
        "profit_margin": 48.5,
        "shipping_days": "5-8",
        "images_count": 5,
        "warehouse": "US"
    },
    {
        "id": "car-charger-30w",
        "name": "Car Charger PD 30W",
        "price": 29.71,
        "original_price": None,
        "description": "30W PD fast car charger. Dual port design. Charges two devices simultaneously. Slim profile fits any 12V/24V socket.",
        "features": ["30W PD Fast Charging", "Dual Ports", "Slim Design", "12V/24V Compatible", "Smart IC Chip", "Multiple Device Protection"],
        "category": "Chargers",
        "badge": None,
        "rating": 4.7,
        "reviews_count": 331,
        "stock": 350,
        "sku": "CJ-CC-30W",
        "cj_cost": 10.61,
        "profit_margin": 46.9,
        "shipping_days": "5-8",
        "images_count": 5,
        "warehouse": "US"
    },
    {
        "id": "car-trunk-organizer",
        "name": "Car Trunk Organizer",
        "price": 26.12,
        "original_price": 34.99,
        "description": "Heavy-duty car trunk organizer. 3-compartment design. Foldable, waterproof. Keeps groceries, tools, and sports gear secure. Fits most SUVs and sedans.",
        "features": ["3-Compartment Design", "Heavy-Duty Material", "Foldable & Portable", "Waterproof Lining", "Anti-Slip Bottom", "Fits Most Vehicles"],
        "category": "Organization",
        "badge": "Popular",
        "rating": 4.5,
        "reviews_count": 429,
        "stock": 150,
        "sku": "CJ-TRUNK-ORG",
        "cj_cost": 9.33,
        "profit_margin": 44.9,
        "shipping_days": "5-8",
        "images_count": 5,
        "warehouse": "US"
    },
    {
        "id": "jump-starter",
        "name": "Portable Jump Starter 2000A",
        "price": 97.33,
        "original_price": 129.99,
        "description": "2000A peak portable jump starter. Starts dead batteries in seconds. Built-in power bank, LED flashlight. Works on all 12V vehicles up to 8L gas / 6L diesel.",
        "features": ["2000A Peak Current", "Starts Dead Battery in Seconds", "Built-in Power Bank", "LED Flashlight", "USB-C Charging", "Works on Cars/SUVs/Trucks"],
        "category": "Jump Starters",
        "badge": "Premium",
        "rating": 4.9,
        "reviews_count": 197,
        "stock": 100,
        "sku": "CJ-JS-2000A",
        "cj_cost": 34.76,
        "profit_margin": 61.1,
        "shipping_days": "5-8",
        "images_count": 5,
        "warehouse": "US"
    },
    {
        "id": "jump-starter-pro",
        "name": "Jump Starter Power Bank Pro 3000A",
        "price": 118.80,
        "original_price": 159.99,
        "description": "3000A peak jump starter + 20,000mAh power bank. Starts any 12V vehicle. Fast-charge phones, tablets, laptops. Intelligent clamps with reverse polarity protection.",
        "features": ["3000A Peak Current", "20000mAh Power Bank", "Fast Charge Laptops", "Reverse Polarity Protection", "LED Emergency Light", "12V/24V Compatible"],
        "category": "Jump Starters",
        "badge": "Premium",
        "rating": 4.9,
        "reviews_count": 194,
        "stock": 80,
        "sku": "CJ-JS-3000A",
        "cj_cost": 42.43,
        "profit_margin": 61.1,
        "shipping_days": "5-8",
        "images_count": 5,
        "warehouse": "US"
    },
]

def insert_products():
    """Insert products via Supabase REST API"""
    import urllib.request
    
    url = f"{SUPABASE_URL}/rest/v1/products"
    
    for p in PRODUCTS:
        # Prepare payload (only columns that exist in DB)
        payload = {
            "id": p["id"],
            "name": p["name"],
            "price": p["price"],
            "original_price": p["original_price"],
            "description": p["description"],
            "features": p["features"],
            "category": p["category"],
            "badge": p["badge"],
            "rating": p["rating"],
            "reviews_count": p["reviews_count"],
            "stock": p["stock"],
            "sku": p["sku"],
            "shipping_days": p["shipping_days"],
            "images_count": p["images_count"],
        }
        
        # Upsert by id
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url + "?on_conflict=id",
            data=data,
            headers={
                "Content-Type": "application/json",
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Prefer": "resolution=merge-duplicates"
            },
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req) as resp:
                result = resp.read().decode()
                print(f"✅ {p['name']} — ${p['price']:.2f} — OK")
        except urllib.error.HTTPError as e:
            error_body = e.read().decode()
            print(f"❌ {p['name']} — ERROR {e.code}: {error_body[:200]}")
        except Exception as e:
            print(f"❌ {p['name']} — ERROR: {e}")

def test_connection():
    """Test connection to Supabase"""
    import urllib.request
    url = f"{SUPABASE_URL}/rest/v1/products?limit=1"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"
        }
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            print(f"🔌 Conexión a Supabase OK")
            if data:
                print(f"   Productos existentes: {len(data)}")
            else:
                print(f"   Tabla products vacía")
            return True
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("📦 KREID — Insertar Productos en Supabase")
    print("=" * 50)
    
    if test_connection():
        print()
        insert_products()
        print()
        print("=" * 50)
        print("✅ Proceso completado")
        print("=" * 50)
    else:
        print()
        print("❌ No se pudo conectar a Supabase")
        sys.exit(1)
