#!/usr/bin/env python3
"""
🔥 KREID — Obtener productos reales de CJ Dropshipping
y exportarlos para cargar en la tienda
"""
import requests, json, sys, time

API_KEY = "CJ5454517@api@80a329ca12224b7b95e2174b2f5ca5e8"
BASE = "https://developers.cjdropshipping.com/api2.0/v1"

def get_token():
    r = requests.post(f"{BASE}/authentication/getAccessToken",
        json={"apiKey": API_KEY},
        headers={"Content-Type": "application/json"},
        timeout=20)
    data = r.json()
    if data.get("success"):
        return data["data"]["accessToken"]
    raise Exception(f"Token error: {data.get('message')}")

def get_products(token, page=1, size=50, start_price=5, end_price=50):
    # listV2 usa GET con query params
    # Intentar con todos los parámetros posibles
    time.sleep(1.5)  # Rate limit: 1 req/sec
    
    # Primero intentar list (documentado)
    r = requests.post(f"{BASE}/product/list",
        headers={"Content-Type": "application/json", "CJ-Access-Token": token},
        json={"pageSize": size, "pageNum": page, "startPrice": start_price, "endPrice": end_price},
        timeout=30)
    
    data = r.json()
    if data.get("success") and data.get("data", {}).get("productList"):
        return data
    
    # Si list no funciona, intentar listV2 con GET
    r2 = requests.get(f"{BASE}/product/listV2",
        headers={"CJ-Access-Token": token},
        params={"pageSize": size, "pageNum": page},
        timeout=30)
    return r2.json()

def main():
    print("=== KREID - CJ Product Scanner ===\n")
    token = get_token()
    print(f"Token obtenido: {token[:20]}...\n")

    productos_finales = []
    categorias_vistas = set()
    
    # Escanear 5 páginas para tener variedad
    for page in range(1, 4):
        print(f"\n--- Página {page} ---")
        data = get_products(token, page, 50)
        
        if not data.get("success"):
            print(f"  Error: {data.get('message', '?')}")
            continue
        
        lista = data.get("data", {}).get("list", [])
        print(f"  Productos recibidos: {len(lista)}")
        
        for p in lista:
            name_en = (p.get("productNameEn") or p.get("productName") or "").strip()
            price_str = (p.get("sellPrice") or "0").strip()
            
            if not name_en or len(name_en) < 5:
                continue
                
            # Parsear precio: puede ser "0.03 -- 1.46" o "12.99"
            try:
                if "--" in price_str:
                    parts = price_str.split("--")
                    price = float(parts[0].strip())
                    price_max = float(parts[-1].strip()) if len(parts) > 1 else price
                else:
                    price = float(price_str)
                    price_max = price
            except:
                continue
            
            # Filtrar: precio entre $5 y $50
            if price < 5 or price > 50:
                continue
            
            weight = p.get("productWeight", 0)
            if isinstance(weight, str) and weight.replace('.','',1).isdigit():
                weight = float(weight)
            elif not isinstance(weight, (int, float)):
                weight = 999
            
            # Imagen principal
            img_field = (p.get("productImage") or "").strip()
            images = [x.strip() for x in img_field.split(",") if x.strip()] if img_field else []
            main_img = images[0] if images else ""
            
            category = (p.get("categoryId") or p.get("categoryName") or "")
            subcategory = (p.get("subcategoryId") or "")
            
            vid = ""
            variants = p.get("variants", [])
            if variants and isinstance(variants, list) and len(variants) > 0:
                vid = variants[0].get("vid", "")
            
            if not vid and p.get("pid"):
                vid = p["pid"]
            
            pid = p.get("pid", name_en[:20])
            
            prod = {
                "name": name_en[:80],
                "price": round(price, 2),
                "price_max": round(price_max, 2),
                "weight_g": weight,
                "image": main_img,
                "images": images[:4],
                "category": category,
                "subcategory": subcategory,
                "sku": vid or f"CJ-{pid}",
                "cj_id": pid or "",
                "variant_id": vid or "",
                "page": page
            }
            
            # Deduplicar por nombre
            if name_en[:40] not in categorias_vistas:
                categorias_vistas.add(name_en[:40])
                productos_finales.append(prod)
                print(f"  ✅ {name_en[:60]} | ${price:.2f} | {weight}g | img:{bool(main_img)}")
    
    print(f"\n\n=== RESULTADO FINAL ===")
    print(f"Total productos únicos: {len(productos_finales)}")
    
    # Clasificar por precio
    baratos = [p for p in productos_finales if p['price'] <= 12]
    medios = [p for p in productos_finales if 12 < p['price'] <= 25]
    caros = [p for p in productos_finales if p['price'] > 25]
    
    print(f"\nClasificación:")
    print(f"  💰 Baratos ($5-12): {len(baratos)}")
    print(f"  💵 Medios ($12-25): {len(medios)}")
    print(f"  💎 Caros ($25+): {len(caros)}")
    
    # Guardar JSON
    output = {
        "total": len(productos_finales),
        "productos_baratos": baratos[:5],
        "productos_medios": medios[:5],
        "productos_caros": caros[:5],
        "todos": productos_finales[:20]
    }
    
    with open("/home/leo/goose-dropshipping/productos-cj.json", "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\nGuardado en productos-cj.json")
    
    # Mostrar top picks
    print(f"\n🔥 TOP PICKS POR CATEGORÍA:")
    
    if baratos:
        print(f"\n  BARATOS (buenos para upsells/complementos):")
        for p in baratos[:3]:
            print(f"    • {p['name'][:50]} - ${p['price']:.2f}")
    
    if medios:
        print(f"\n  MEDIOS (buenos como producto principal):")
        for p in medios[:3]:
            print(f"    • {p['name'][:50]} - ${p['price']:.2f}")
    
    if caros:
        print(f"\n  CAROS (alto margen, menos ventas):")
        for p in caros[:3]:
            print(f"    • {p['name'][:50]} - ${p['price']:.2f}")

if __name__ == "__main__":
    main()
