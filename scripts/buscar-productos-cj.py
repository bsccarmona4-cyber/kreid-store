#!/usr/bin/env python3
"""
🔍 CJ Dropshipping - Buscador de productos rentables para USA
Usa API v2 con listV2 para obtener precios reales y calcular unit economics
"""

import requests
import json
import sys
import time

# Config
API_KEY = "CJ5454517@api@80a329ca12224b7b95e2174b2f5ca5e8"
BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1"
STRIPE_PERCENTAGE = 0.029
STRIPE_FIXED = 0.30
SHIPPING_ESTIMATE = 5.00  # shipping estimado US
MIN_MARGIN = 40  # margen mínimo aceptable (%)
MAX_WEIGHT = 500  # peso máximo en gramos (para shipping barato)

TOKEN = None
TOKEN_EXPIRY = None

def get_token():
    """Obtener access token de CJ (cacheado)"""
    global TOKEN, TOKEN_EXPIRY
    if TOKEN:
        return TOKEN
    r = requests.post(
        f"{BASE_URL}/authentication/getAccessToken",
        json={"apiKey": API_KEY},
        headers={"Content-Type": "application/json"},
        timeout=15
    )
    data = r.json()
    if data.get("success"):
        TOKEN = data["data"]["accessToken"]
        return TOKEN
    raise Exception(f"Error getting token: {data.get('message')}")

def search_v2(keyword="", category_id="", min_price=0, max_price=100, 
              page=1, size=50, sort="asc", order_by=2, free_shipping=None):
    """Buscar productos con listV2 (precios reales)"""
    token = get_token()
    params = {
        "page": page,
        "size": size,
        "startSellPrice": min_price,
        "endSellPrice": max_price,
        "sort": sort,
        "orderBy": order_by
    }
    if keyword:
        params["keyWord"] = keyword
    if category_id:
        params["categoryId"] = category_id
    if free_shipping is not None:
        params["addMarkStatus"] = 1 if free_shipping else 0
    
    r = requests.get(
        f"{BASE_URL}/product/listV2",
        params=params,
        headers={"CJ-Access-Token": token},
        timeout=20
    )
    data = r.json()
    if data.get("success"):
        return data["data"]
    raise Exception(f"Error: {data.get('message')}")

def calculate_profit(sell_price):
    """Calcular ganancia usando precio real de CJ"""
    price = float(sell_price)
    selling_price = round(price * 3, 2)  # regla 3x
    if selling_price <= 0:
        return 0, 0, 0, 0
    stripe_fee = round(selling_price * STRIPE_PERCENTAGE + STRIPE_FIXED, 2)
    total_cost = price + stripe_fee + SHIPPING_ESTIMATE
    profit = round(selling_price - total_cost, 2)
    margin = round((profit / selling_price) * 100, 1)
    return selling_price, profit, margin, stripe_fee

def show_results(data, keyword=""):
    """Mostrar resultados con análisis de rentabilidad"""
    content = data.get("content", [])
    products = []
    for c in content:
        products.extend(c.get("productList", []))
    
    total = data.get("totalRecords", 0)
    
    print(f"\n{'═'*100}")
    print(f"{'🔍 CJ DROPSHIPPING - PRODUCTOS RENTABLES PARA USA':^100}")
    if keyword:
        print(f"{f'Búsqueda: \"{keyword}\" — {total} resultados encontrados':^100}")
    print(f"{'═'*100}")
    
    print(f"\n{'Producto':<45} {'Costo':>7} {'Precio 3x':>9} {'Stripe':>7} {'Envío':>7} {'Ganancia':>9} {'Margen':>7} {'Rating':>7}")
    print(f"{'─'*45} {'─'*7} {'─'*9} {'─'*7} {'─'*7} {'─'*9} {'─'*7} {'─'*7}")
    
    resultados = []
    for p in products:
        name = p.get("nameEn", "Unknown")[:43]
        sell_price = p.get("sellPrice", "0")
        now_price = p.get("nowPrice", sell_price)
        
        # Usar el precio de venta real
        # El precio puede ser un rango "0.03 -- 1.46", tomamos el promedio
        def parse_price(p):
            try:
                if '--' in str(p):
                    parts = str(p).split('--')
                    return (float(parts[0]) + float(parts[1])) / 2
                return float(p)
            except:
                return 0.0
        price = parse_price(sell_price)
        
        weight = p.get("packWeight", "0")
        try:
            weight_grams = float(weight.split("-")[0])
        except:
            weight_grams = 0
        
        # Shipping gratis?
        free_ship = p.get("addMarkStatus", 0) == 1
        shipping = 0 if free_ship else SHIPPING_ESTIMATE
        
        if price <= 0:
            continue
        
        selling_price, profit, margin, stripe_fee = calculate_profit(price)
        
        # Verificar que selling_price no sea 0
        if selling_price <= 0:
            continue
        
        listed = p.get("listedNum", 0)  # listing count = demanda
        
        # Calcular con shipping real (gratis o no)
        if free_ship:
            total_cost = price + stripe_fee
            profit = round(selling_price - total_cost, 2)
            margin = round((profit / selling_price) * 100, 1)
        
        meets_margin = margin >= MIN_MARGIN
        light_weight = weight_grams <= MAX_WEIGHT if weight_grams > 0 else True
        
        status = "🟢" if (meets_margin and light_weight) else "🟡" if meets_margin else "🔴"
        ship_label = "FREE" if free_ship else f"${SHIPPING_ESTIMATE:.0f}"
        
        print(f"{status} {name:<42} ${price:<5.2f} ${selling_price:<6.2f} ${stripe_fee:<4.2f} {ship_label:<5} ${profit:<6.2f} {margin:<5.1f}% {listed:<5}")
        
        resultados.append({
            "status": status,
            "name": name.strip(),
            "pid": p.get("id"),
            "sku": p.get("sku"),
            "cost": price,
            "selling_price": selling_price,
            "profit": profit,
            "margin": margin,
            "weight": weight_grams,
            "free_shipping": free_ship,
            "image": p.get("bigImage", ""),
            "listed": listed,
            "meets_margin": meets_margin,
            "light_weight": light_weight
        })
    
    print(f"\n{'═'*100}")
    
    # Estadísticas
    greens = [r for r in resultados if r["status"] == "🟢"]
    yellows = [r for r in resultados if r["status"] == "🟡"]
    reds = [r for r in resultados if r["status"] == "🔴"]
    
    print(f"📊 Resumen: 🟢 {len(greens)} listos | 🟡 {len(yellows)} borderline | 🔴 {len(reds)} no viables")
    
    if greens:
        print(f"\n🏆 TOP PRODUCTOS RECOMENDADOS (margen ≥ {MIN_MARGIN}%, peso ≤ {MAX_WEIGHT}g):")
        for r in sorted(greens, key=lambda x: x["margin"], reverse=True)[:5]:
            ship_emoji = "🚚" if r["free_shipping"] else "💰"
            print(f"  {r['name']:<40} → ${r['cost']:.2f} → ${r['selling_price']:.2f} (margen: {r['margin']:.1f}%) {ship_emoji}")
    
    return resultados

def browse_categories():
    """Mostrar categorías para navegar"""
    token = get_token()
    r = requests.get(
        f"{BASE_URL}/product/getCategory",
        headers={"CJ-Access-Token": token},
        timeout=15
    )
    data = r.json()
    if not data.get("success"):
        print(f"Error: {data.get('message')}")
        return None
    
    return data["data"]

def main():
    token = get_token()
    print(f"✅ Conectado a CJ Dropshipping API (1.4M+ productos disponibles)")
    
    if len(sys.argv) > 1:
        keyword = sys.argv[1]
        print(f"\n🔎 Buscando: \"{keyword}\"...")
        data = search_v2(keyword=keyword, page=1, size=30)
        show_results(data, keyword)
    else:
        # Modo interactivo
        print("\n📂 Cargando categorías...")
        cats = browse_categories()
        
        if cats:
            print("\nCategorías principales:")
            cat_map = {}
            for i, cat in enumerate(cats, 1):
                name = cat["categoryFirstName"]
                sub_count = len(cat.get("categoryFirstList", []))
                print(f"  {i}. {name} ({sub_count} sub)")
                cat_map[str(i)] = cat["categoryFirstId"]
            
            cat_map["s"] = "search"
            cat_map["q"] = "quit"
            
            while True:
                print("\n" + "─"*60)
                choice = input("🔢 # categoría, 's' buscar keyword, 'q' salir: ").strip().lower()
                
                if choice == 'q':
                    break
                elif choice == 's':
                    kw = input("Keyword: ").strip()
                    if kw:
                        data = search_v2(keyword=kw, page=1, size=30)
                        show_results(data, kw)
                elif choice in cat_map:
                    cat_id = cat_map[choice]
                    cat_name = next((c["categoryFirstName"] for c in cats 
                                    if c["categoryFirstId"] == cat_id), "?")
                    print(f"\n📂 Categoría: {cat_name} — buscando productos...")
                    data = search_v2(category_id=cat_id, page=1, size=30)
                    show_results(data, cat_name)

if __name__ == "__main__":
    main()
