#!/usr/bin/env python3
"""
🎨 KREID — Generador de imágenes v2 con Gemini Flash + fallback
Usa la API REST correcta de Gemini 2.0 Flash para generar imágenes
"""

import requests
import json
import os
import time
import base64
import sys
from pathlib import Path

# Config
GEMINI_API_KEY = None
env_path = Path('/home/leo/goose-dropshipping/.env')
if env_path.exists():
    for line in env_path.read_text().splitlines():
        if line.startswith('GEMINI_API_KEY='):
            GEMINI_API_KEY = line.split('=', 1)[1].strip()

if not GEMINI_API_KEY:
    print("❌ No GEMINI_API_KEY found")
    sys.exit(1)

OUTPUT_DIR = Path("/home/leo/goose-dropshipping/public/images/productos")
MODEL = "gemini-2.5-flash-image"

# Productos con prompts certificados para generar imágenes realistas
PRODUCTOS = [
    {
        "id": "phone-mount-cd",
        "name": "CD Slot Phone Mount",
        "prompts": [
            "Professional product photo of a black universal CD slot car phone mount installed in a car dashboard CD slot. A smartphone is securely attached. Clean car interior, studio lighting, sharp focus on the product, realistic materials, commercial product photography, white background style.",
            "Close-up macro shot of a CD slot car phone mount, detailed view of the grip mechanism holding a smartphone. Soft natural lighting, shallow depth of field, realistic textures of rubber and plastic, professional product photography.",
            "Car dashboard view from driver's perspective showing a smartphone mounted on a CD slot phone mount. GPS navigation on screen, sunlight through windshield, realistic car interior, natural colors.",
            "Person using one hand to place their phone into a CD slot car mount. Focus on the mounting mechanism, hand partially visible, car interior background, realistic use case scenario.",
            "Flat lay product photography of CD slot car phone mount kit: the mount, spare silicone pads, cleaning wipe, user manual. On dark wood table, soft side lighting, clean product presentation."
        ]
    },
    {
        "id": "phone-mount-vent",
        "name": "Car Air Vent Phone Holder",
        "prompts": [
            "Professional product photo of a black car air vent phone holder clipped onto a car AC vent with a smartphone attached. Clean modern car interior, studio lighting, sharp product focus, commercial automotive photography.",
            "Close-up macro shot of a car vent phone mount's clip mechanism gripping the vent blades. Detailed texture of silicone padding and plastic. Soft natural lighting, shallow depth of field, product detail photography.",
            "Car interior shot from passenger perspective showing a phone mounted on the air vent with navigation visible. Dashboard details, realistic materials, professional automotive photography.",
            "Person quickly mounting their phone on a car vent holder with one hand. Focus on ease of use, car interior background, natural lighting, realistic lifestyle scenario.",
            "Flat lay photography of car vent phone mount with all accessories: mount body, extra clips, silicone pads, metal plate. On light marble surface, minimal clean product photography."
        ]
    },
    {
        "id": "car-trunk-organizer",
        "name": "Car Trunk Organizer",
        "prompts": [
            "Professional product photo of a black heavy-duty 3-compartment car trunk organizer sitting in an SUV trunk. Filled with groceries and sports equipment. Clean organized trunk, studio lighting, commercial product photography.",
            "Close-up detail shot of car trunk organizer showing waterproof lining, reinforced stitching, and anti-slip bottom. Fabric texture visible, professional product detail photography.",
            "SUV trunk with the organizer folded flat, demonstrating portability and foldable design. Tailgate open with natural light, realistic automotive lifestyle photography.",
            "Person placing grocery bags into the trunk organizer compartments. Lifestyle shot showing practical use, natural lighting, realistic car interior setting.",
            "Flat lay product photography of trunk organizer features: main body, anti-slip strips, side pockets, carrying handles. On concrete floor, dramatic side lighting."
        ]
    },
    {
        "id": "car-charger-36w",
        "name": "Car Charger PD 36W",
        "prompts": [
            "Professional product photo of a compact aluminum 36W PD USB-C car charger plugged into a car's 12V socket. Brushed metal texture visible, subtle LED glow. Clean car interior, studio lighting, commercial electronics photography.",
            "Close-up macro shot of a dual-port car charger showing the USB-C and USB-A ports with brushed aluminum body detail. Metallic reflections, premium textures, professional product macro photography.",
            "Car interior shot showing a phone charging from the USB-C car charger. Cable connected, dashboard ambient lighting, realistic use scenario.",
            "Two devices charging simultaneously from the dual-port car charger. Phone and tablet visible, car interior background, realistic lifestyle technology photography.",
            "Flat lay photography of the 36W PD car charger with charging cable and smartphone. On dark wood desk, minimalist premium product photography."
        ]
    },
    {
        "id": "car-charger-30w",
        "name": "Car Charger PD 30W",
        "prompts": [
            "Professional product photo of a slim 30W PD dual-port car charger in a car's accessory socket. Compact low-profile design, black finish. Clean car interior, commercial electronics photography, studio lighting.",
            "Close-up macro shot of the 30W car charger showing both USB ports and slim body design. Detailed plastic texture, metallic contact points visible, professional product macro.",
            "Night car interior shot showing the car charger with LED indicator glow charging a smartphone. Dashboard ambient lights, realistic nighttime atmosphere.",
            "Two phones charging from the dual-port charger, dashboard view. Daytime car interior, clean modern dashboard, realistic use case photography.",
            "Flat lay product photography of the 30W PD car charger with USB-C cable on slate surface. Minimalist composition, soft natural lighting."
        ]
    },
    {
        "id": "phone-mount-magnetic",
        "name": "Car Magnetic Phone Holder",
        "prompts": [
            "Professional product photo of a black magnetic car phone holder mounted on a dashboard with a smartphone attached via magnetic connection. Clean modern car interior, studio lighting, premium automotive product photography.",
            "Close-up macro shot of the magnetic phone holder showing the magnet array and phone connection point. Detailed metallic surface, shallow depth of field, professional product photography.",
            "Person snapping their phone onto a magnetic car mount with one hand while driving. Action shot showing magnetic connection, car interior background, realistic lifestyle photography.",
            "Car dashboard wide shot with magnetic phone mount holding a phone displaying GPS map. Daytime city driving, realistic car interior, premium photography.",
            "Flat lay photography of the magnetic phone holder kit: mount base, metal plate, adhesive pads, alcohol wipe. On dark leather surface, dramatic side lighting."
        ]
    },
    {
        "id": "jump-starter",
        "name": "Portable Jump Starter 2000A",
        "prompts": [
            "Professional product photo of a portable 2000A peak jump starter device on a garage floor. Red and black jumper cables, rugged textured case, heavy-duty design. Studio lighting, commercial tool photography.",
            "Close-up macro detail of the jump starter's control panel showing power button, battery level indicator, USB ports, and LED light. Professional product detail photography.",
            "Person using the jump starter to start a car with a dead battery. Jumper cables connected under the hood, realistic outdoor garage setting, dramatic rescue scenario photography.",
            "Jump starter sitting inside a car glove box showing compact size portability. Glove box open, realistic car interior photography.",
            "Flat lay product photography of the jump starter with all accessories: jumper clamps, USB cable, carrying case, manual. On dark workshop bench, professional tool photography."
        ]
    },
    {
        "id": "jump-starter-pro",
        "name": "Jump Starter Power Bank Pro 3000A",
        "prompts": [
            "Professional product photo of a premium 3000A peak jump starter power bank with 20000mAh capacity. Modern rugged design, next to a smartphone showing scale. Studio lighting, premium automotive tool photography.",
            "Close-up macro shot of the jump starter pro's LCD display, USB-C PD port, and LED light modes. Detailed texture of rubberized casing, professional electronics macro photography.",
            "Person jump starting a large truck with the 3000A jump starter. Under-hood shot with cables connected, dramatic rescue scenario, realistic outdoor lighting.",
            "Jump starter pro powering a laptop via USB-C PD while charging a smartphone demonstrating power bank functionality. Modern setting, lifestyle tech photography.",
            "Flat lay product photography of the 3000A jump starter with all accessories: heavy-duty clamps, USB-C cable, 12V adapter, carrying case. On dark textured surface."
        ]
    }
]

def generate_with_gemini(prompt, output_path, retries=3):
    """Generate image using Gemini 2.0 Flash"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={GEMINI_API_KEY}"
    
    payload = {
        "contents": [{
            "parts": [
                {"text": "Generate a realistic, professional product photo. " + prompt}
            ]
        }],
        "generationConfig": {
            "temperature": 0.3,
            "topK": 32,
            "topP": 0.95,
            "maxOutputTokens": 8192
        }
    }
    
    headers = {"Content-Type": "application/json"}
    
    for attempt in range(retries):
        try:
            print(f"    ⏳ Requesting... ({attempt+1}/{retries})")
            resp = requests.post(url, json=payload, headers=headers, timeout=180)
            data = resp.json()
            
            if not resp.ok:
                err = data.get('error', {}).get('message', str(data))
                if 'SAFETY' in str(err).upper():
                    print(f"    ⚠️ Safety block (attempt {attempt+1})")
                else:
                    print(f"    ⚠️ API Error: {err[:150]}")
                if attempt < retries - 1:
                    time.sleep(5 * (attempt + 1))
                continue
            
            candidates = data.get('candidates', [])
            if not candidates:
                print(f"    ⚠️ No candidates returned")
                if attempt < retries - 1:
                    time.sleep(5)
                continue
            
            parts = candidates[0].get('content', {}).get('parts', [])
            found_image = False
            
            for part in parts:
                if 'inlineData' in part:
                    img_data = part['inlineData']['data']
                    mime_type = part['inlineData'].get('mimeType', 'image/png')
                    ext = mime_type.split('/')[-1]
                    if ext == 'jpeg': ext = 'jpg'
                    
                    final_path = output_path.with_suffix(f'.{ext}')
                    with open(final_path, 'wb') as f:
                        f.write(base64.b64decode(img_data))
                    print(f"    ✅ Saved: {final_path.name} ({len(img_data)//1024}KB)")
                    return True
            
            # Try text-based fallback
            text = parts[0].get('text', '') if parts else ''
            print(f"    ⚠️ No image data. Text: {text[:100] if text else 'N/A'}")
            
        except requests.Timeout:
            print(f"    ⚠️ Timeout (attempt {attempt+1})")
        except Exception as e:
            print(f"    ⚠️ Error: {e}")
        
        if attempt < retries - 1:
            wait = 10 * (attempt + 1)
            print(f"    Waiting {wait}s...")
            time.sleep(wait)
    
    return False

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    total = sum(len(p["prompts"]) for p in PRODUCTOS)
    print(f"🎨 KREID — Generador de imágenes Gemini v2")
    print(f"📦 {len(PRODUCTOS)} productos × 5 imágenes = {total}")
    print(f"📁 {OUTPUT_DIR}")
    print(f"🤖 {MODEL}")
    print()
    
    generated = 0
    failed = 0
    skipped = 0
    
    for prod in PRODUCTOS:
        prod_dir = OUTPUT_DIR / prod["id"]
        prod_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"📷 [{prod['id']}] {prod['name']}")
        
        for i, prompt in enumerate(prod["prompts"]):
            # Check if already exists
            existing = list(prod_dir.glob(f"img{i+1}.*"))
            if existing:
                print(f"  ⏭️  img{i+1} ya existe ({existing[0].name})")
                skipped += 1
                generated += 1
                continue
            
            output_path = prod_dir / f"img{i+1}.jpg"
            short = prompt[:70]
            print(f"  🎨 img{i+1}/5: {short}...")
            
            success = generate_with_gemini(prompt, output_path)
            
            if success:
                generated += 1
            else:
                failed += 1
            
            time.sleep(4)  # Rate limit
        
        print()
    
    print(f"\n{'='*50}")
    print(f"✅ Éxito: {generated}")
    print(f"⏭️  Omitidas: {skipped}")
    print(f"❌ Fallidas: {failed}")
    print(f"📊 Total: {generated + failed}")
    print(f"{'='*50}")
    
    # Generate image mapping JSON
    mapping = {}
    for prod in PRODUCTOS:
        prod_dir = OUTPUT_DIR / prod["id"]
        images = sorted([f for f in prod_dir.glob("*") if f.suffix in ['.jpg', '.png', '.webp', '.jpeg']])
        images_public = [f"/images/productos/{prod['id']}/{f.name}" for f in images]
        mapping[prod["id"]] = {
            "name": prod["name"],
            "images": images_public
        }
    
    with open(OUTPUT_DIR / "imagenes-map.json", 'w') as f:
        json.dump(mapping, f, indent=2)
    print(f"📝 Mapping guardado")

if __name__ == "__main__":
    main()
