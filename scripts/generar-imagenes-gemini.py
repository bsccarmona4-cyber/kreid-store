#!/usr/bin/env python3
"""
🎨 KREID — Generador de imágenes de productos con Gemini 2.5 Flash
Genera 5 imágenes realistas por producto desde diferentes ángulos/usos
"""

import requests
import json
import sys
import os
import time
import base64
from pathlib import Path

# Config
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY') or open('/home/leo/goose-dropshipping/.env').read().split('GEMINI_API_KEY=')[1].split('\n')[0].strip()
GEMINI_MODEL = "gemini-2.0-flash-exp-image-generation"
OUTPUT_DIR = "/home/leo/goose-dropshipping/public/images/productos"

# Productos a generar con prompts detallados para máxima realismo
PRODUCTOS = [
    {
        "id": "phone-mount-cd",
        "name": "CD Slot Phone Mount",
        "prompts": [
            "Ultra-realistic product photo of a black universal CD slot car phone mount installed in a car dashboard CD player slot. Smartphone attached, 360 degree rotation visible. Professional studio lighting, sharp focus, 8K quality, Amazon product photography style, clean car interior, soft shadows, photorealistic texture.",
            "Close-up macro shot of a CD slot car phone mount with a smartphone held securely. Detailed view of the grip mechanism and silicone padding. Sunlight streaming through car window. Photorealistic, 8K, professional product photography, shallow depth of field.",
            "A car phone mount installed in a CD slot viewed from driver's perspective while driving. Smartphone showing GPS navigation. Blurred road visible through windshield. Realistic car interior lighting, natural colors, cinematic quality, daylight shot.",
            "Lifestyle shot of a person's hand easily clicking a phone into a CD slot mount with one hand. Motion blur effect on hand, crisp focus on mount. Car interior background, casual use scenario, realistic skin tones, natural lighting.",
            "Studio product flat lay of a CD slot car phone mount accessories kit: the mount, spare silicone pads, cleaning wipe, instruction manual. On dark wood surface, dramatic side lighting, premium e-commerce photography, 8K, ultra-realistic texture detail."
        ]
    },
    {
        "id": "phone-mount-vent",
        "name": "Car Air Vent Phone Holder",
        "prompts": [
            "Ultra-realistic product photo of a premium black car air vent phone holder clipped onto a car AC vent. Smartphone attached, horizontal orientation. Professional automotive product photography, 8K resolution, studio lighting, detailed textures, clean modern car interior.",
            "Close-up macro shot of a car vent phone mount's anti-slip silicone pad and strong clip mechanism gripping the vent blades. Detailed texture of silicone and plastic. Golden hour light, shallow depth of field, photorealistic product detail shot.",
            "Wide angle car interior shot showing a phone mounted on the air vent from passenger perspective. Phone screen visible, car dashboard details. Natural dashboard lighting, realistic materials, premium automotive photography style.",
            "Person using one hand to mount their phone on a car vent holder while driving. Focus on the easy one-click mechanism. Blurred city lights through window, nighttime shot, warm interior car lighting, realistic atmosphere.",
            "Studio flat lay of car vent phone mount with accessories: mount body, vent clips, silicone pad, thin metal plate. On light marble surface, soft overhead lighting, clean minimalist product photography, 8K photorealistic."
        ]
    },
    {
        "id": "car-trunk-organizer",
        "name": "Car Trunk Organizer",
        "prompts": [
            "Ultra-realistic product photo of a black heavy-duty 3-compartment car trunk organizer sitting in a clean SUV trunk. Filled with groceries, sports equipment, and tools. Professional automotive photography, 8K, studio lighting, detailed fabric texture, organized compartments visible.",
            "Close-up detail shot of the car trunk organizer showing the waterproof lining, reinforced stitching, and anti-slip bottom texture. Fabric weave detail visible. Macro photography, sharp focus, premium texture detail, natural light.",
            "SUV trunk shot showing the organizer folded flat against the back seats demonstrating portability and space-saving design. Sunlight from open tailgate, realistic shadows, lifestyle automotive photography, spacious trunk visible.",
            "Person's hands placing grocery bags into the trunk organizer compartments. Lifestyle shot, 3 compartments visible with different items. Natural car lighting, casual use scenario, realistic proportions, everyday use photography.",
            "Studio flat lay of trunk organizer with its features highlighted: main body folded, anti-slip strips, side pockets, carrying handles. On concrete floor texture, dramatic side lighting, clean product photography, 8K ultra-realistic."
        ]
    },
    {
        "id": "car-charger-36w",
        "name": "Car Charger PD 36W",
        "prompts": [
            "Ultra-realistic product photo of a premium compact aluminum 36W PD USB-C car charger plugged into a car's 12V power socket. LED glow ring visible. Professional electronics photography, 8K resolution, macro detail, brushed aluminum texture, studio lighting.",
            "Close-up macro shot of the dual-port car charger showing the USB-C and USB-A ports with detailed view of the aluminum alloy body and LED indicator. Extreme macro photography, metallic reflections, premium texture, shallow depth of field.",
            "Person's hand plugging a USB-C cable into the car charger while it's in the car's power socket. Dashboard background with ambient lighting. Lifestyle electronics shot, realistic car interior, natural shadows, evening drive atmosphere.",
            "Charging two devices simultaneously from the dual-port car charger. Phone and tablet visible with charging cables. Car interior background with warm ambient lighting. Realistic use case, modern car dashboard, product in action.",
            "Studio flat lay of the 36W PD car charger with charging cables and a smartphone. On dark wood desk surface, minimalist composition, premium tech product photography, dramatic lighting, 8K ultra-realistic metallic reflections."
        ]
    },
    {
        "id": "car-charger-30w",
        "name": "Car Charger PD 30W",
        "prompts": [
            "Ultra-realistic product photo of a slim profile 30W PD dual-port car charger plugged into a car's accessory socket. Compact design barely protruding. Professional electronics photography, 8K, macro detail, premium black plastic texture, studio lighting.",
            "Close-up macro shot of the 30W car charger showing both USB ports, the smart IC chip indicator, and the sleek body design. Detailed view of the charging ports, metallic contact points, shallow depth of field, photorealistic.",
            "Car interior shot at night showing the car charger with soft blue LED glow charging a smartphone. Dashboard ambient lighting, realistic nighttime car atmosphere, warm interior lights, clean composition, premium look.",
            "Two phones charging simultaneously from the dual-port car charger. Dashboard view, daytime, clean car interior. Lifestyle tech photography, realistic use case, natural lighting through windshield.",
            "Studio product flat lay of the 30W PD car charger with a USB-C cable and smartphone. On slate gray surface, angled composition, soft window lighting, minimalist premium tech product photography, 8K photorealistic."
        ]
    },
    {
        "id": "phone-mount-magnetic",
        "name": "Car Magnetic Phone Holder",
        "prompts": [
            "Ultra-realistic product photo of a sleek black magnetic car phone holder mounted on a dashboard. Smartphone attached via MagSafe, floating design visible. Premium automotive tech photography, 8K, studio lighting, magnetic connection detail visible, clean dashboard.",
            "Close-up macro shot of the magnetic phone holder showing the N52 magnet array and the phone's metal plate/magnetic back connecting. Extreme detail of neodymium magnets. Macro product photography, metallic reflections, shallow depth of field, photorealistic.",
            "Person's hand snapping their phone onto the magnetic mount with one hand while driving. Action shot with motion blur on hand, crisp focus on mount and phone. Road visible through windshield. Natural car lighting, dynamic lifestyle shot.",
            "Car interior wide shot showing the magnetic phone mount on dashboard with phone attached, GPS map visible. Daytime driving, city street visible. Premium car interior photography, realistic proportions, clean composition.",
            "Studio flat lay of the magnetic phone holder kit: mount base, metal plate, adhesive pads, alcohol wipe, instruction card. On dark leather surface, dramatic side lighting, minimalist product photography, 8K ultra-realistic detail."
        ]
    },
    {
        "id": "jump-starter",
        "name": "Portable Jump Starter 2000A",
        "prompts": [
            "Ultra-realistic product photo of a portable 2000A peak jump starter device on a concrete garage floor. Red and black jumper cables attached, LED flashlight feature visible. Professional automotive tool photography, 8K, studio lighting, rugged textured case, heavy-duty look.",
            "Close-up of the jump starter's front panel showing the power button, battery level indicator, USB ports, and LED light bar. Macro detail of the heavy-duty case texture and rubberized grip. Premium tool photography, photorealistic texture.",
            "Action shot of a person using the jump starter to start a car with a dead battery. Jumper cables connected to car battery under open hood. Engine bay lighting, realistic outdoor/garage setting, dramatic rescue scenario, professional automotive photography.",
            "Jump starter device sitting inside a car glove box, demonstrating compact size and portability. Glove box open with other items visible for scale. Natural car interior lighting, lifestyle organizational shot, realistic everyday carry.",
            "Studio product flat lay of the jump starter with all accessories: jumper cable clamps, USB charging cable, carrying case, user manual. On dark workshop bench surface, dramatic directional lighting, professional gear photography, 8K ultra-realistic."
        ]
    },
    {
        "id": "jump-starter-pro",
        "name": "Jump Starter Power Bank Pro 3000A",
        "prompts": [
            "Ultra-realistic product photo of a premium 3000A peak jump starter power bank with 20000mAh capacity. Modern rugged design, red and black color scheme. Next to a smartphone and laptop to show scale. 8K studio photography, premium automotive tech product, dramatic lighting.",
            "Close-up macro shot of the jump starter pro's control interface: LCD battery display, USB-C PD port, USB-A output, LED emergency light modes. Extreme detail of rubberized buttons and textured casing. Premium electronics photography, photorealistic.",
            "Person jump starting a large truck or SUV with the 3000A jump starter. Under-hood shot, jumper cables connected to battery, person's hands visible. Dramatic rescue scenario, natural outdoor lighting, heavy-duty automotive photography.",
            "The jump starter pro device powering a laptop via USB-C PD while also charging a smartphone. Modern coffee shop background. Lifestyle tech photography demonstrating power bank functionality, premium portable power product shot.",
            "Studio flat lay of the 3000A jump starter pro with all accessories: heavy-duty clamp cables, USB-C cable, 12V adapter, premium carrying case, manuals. On dark textured surface, dramatic side lighting, professional gear photography, 8K ultra-realistic."
        ]
    }
]

def generate_image(prompt, output_path, retries=3):
    """Generate an image using Gemini API"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": 0.4,
            "topK": 32,
            "topP": 0.95,
            "maxOutputTokens": 4096
        }
    }
    
    headers = {"Content-Type": "application/json"}
    
    for attempt in range(retries):
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=120)
            data = resp.json()
            
            if resp.status_code == 200 and 'candidates' in data:
                candidate = data['candidates'][0]
                for part in candidate.get('content', {}).get('parts', []):
                    if 'inlineData' in part:
                        image_data = part['inlineData']['data']
                        mime_type = part['inlineData'].get('mimeType', 'image/png')
                        ext = mime_type.split('/')[-1]
                        if ext == 'jpeg': ext = 'jpg'
                        
                        full_path = str(output_path).replace('.png', f'.{ext}')
                        with open(full_path, 'wb') as f:
                            f.write(base64.b64decode(image_data))
                        print(f"  ✅ Saved: {full_path} ({len(image_data)} bytes)")
                        return full_path
                
                # Si no hay inlineData, intentar con safety ratings
                print(f"  ⚠️ No image data in response. Ratings: {candidate.get('safetyRatings', 'N/A')}")
                return None
            else:
                error_msg = data.get('error', {}).get('message', str(data))
                print(f"  ❌ Attempt {attempt+1} failed: {error_msg[:200]}")
                if attempt < retries - 1:
                    wait = 2 ** attempt
                    print(f"     Waiting {wait}s...")
                    time.sleep(wait)
        except Exception as e:
            print(f"  ❌ Error: {e}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    
    return None

def main():
    # Crear directorio de salida
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    
    total = sum(len(p["prompts"]) for p in PRODUCTOS)
    print(f"🎨 KREID — Generador de imágenes Gemini")
    print(f"📦 {len(PRODUCTOS)} productos × 5 imágenes = {total} imágenes totales")
    print(f"📁 Output: {OUTPUT_DIR}")
    print(f"🤖 Modelo: {GEMINI_MODEL}")
    print()
    
    generated = 0
    failed = 0
    
    for prod in PRODUCTOS:
        prod_dir = Path(OUTPUT_DIR) / prod["id"]
        prod_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"📷 [{prod['id']}] {prod['name']}")
        
        for i, prompt in enumerate(prod["prompts"]):
            # Nombre de archivo
            ext = "png"
            # Intentar primero si ya existe
            existing = list(prod_dir.glob(f"img{i+1}_*"))
            if existing:
                print(f"  ⏭️  img{i+1} ya existe, saltando...")
                generated += 1
                continue
            
            output_path = prod_dir / f"img{i+1}.{ext}"
            short_prompt = prompt[:60].replace('\n', ' ')
            print(f"  🎨 img{i+1}/5: \"{short_prompt}...\"")
            
            result = generate_image(prompt, output_path)
            
            if result:
                generated += 1
            else:
                failed += 1
            
            # Rate limiting
            time.sleep(3)
        
        print()
    
    print(f"\n{'='*50}")
    print(f"✅ Generadas: {generated}")
    print(f"❌ Fallidas: {failed}")
    print(f"{'='*50}")
    
    # Generar JSON de mapeo de imágenes
    mapping = {}
    for prod in PRODUCTOS:
        prod_dir = Path(OUTPUT_DIR) / prod["id"]
        images = sorted([str(f) for f in prod_dir.glob("*") if f.suffix in ['.jpg', '.png', '.webp', '.jpeg']])
        # Convertir a rutas públicas
        images_public = [f"/images/productos/{prod['id']}/{Path(f).name}" for f in images]
        mapping[prod["id"]] = {
            "name": prod["name"],
            "images": images_public
        }
    
    mapping_path = Path(OUTPUT_DIR) / "imagenes-map.json"
    with open(mapping_path, 'w') as f:
        json.dump(mapping, f, indent=2)
    print(f"📝 Mapping guardado: {mapping_path}")

if __name__ == "__main__":
    main()
