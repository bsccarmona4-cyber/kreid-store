#!/usr/bin/env node
/**
 * 🗄️ KREID — Aplicar Schema SQL a Supabase
 * Conecta directo a PostgreSQL de Supabase
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Conexión directa a Supabase PostgreSQL
// Host: db.tvntylcgdjvgvvjcavkp.supabase.co
// Port: 5432
// Database: postgres
// User: postgres
// Password: la misma del dashboard de Supabase

const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

async function main() {
  if (!DB_PASSWORD) {
    console.log('❌ SUPABASE_DB_PASSWORD no configurada');
    console.log('   Ve a: https://supabase.com/dashboard/project/tvntylcgdjvgvvjcavkp/settings/database');
    console.log('   Copia la contraseña y ejecuta:');
    console.log('   export SUPABASE_DB_PASSWORD="tu_password"');
    process.exit(1);
  }

  const client = new Client({
    host: 'db.tvntylcgdjvgvvjcavkp.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Conectando a Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Conectado!\n');

    // 1. Schema base
    console.log('📦 Aplicando schema base (products, profiles, orders, order_items)...');
    const baseSchema = fs.readFileSync(path.join(__dirname, '..', 'supabase-schema.sql'), 'utf8');
    await client.query(baseSchema);
    console.log('✅ Schema base aplicado\n');

    // 2. Schema completo (analytics, alerts, etc.)
    console.log('📊 Aplicando schema completo (analytics, alerts, visits, triggers)...');
    const fullSchema = fs.readFileSync(path.join(__dirname, '..', 'supabase-schema-completo.sql'), 'utf8');
    await client.query(fullSchema);
    console.log('✅ Schema completo aplicado\n');

    // 3. Insertar productos
    console.log('📦 Insertando 8 productos...');
    const products = [
      { id: 'phone-mount-cd', name: 'CD Slot Phone Mount', price: 33.35, original_price: null, description: 'Universal CD slot phone mount. Fits all phones up to 6.9". Secure grip, 360° rotation, easy one-click release. No adhesive needed.', features: ['Universal Fit','360° Rotation','One-Click Release','No Adhesive','Secure Grip','Fits CD Slots'], category: 'Phone Mounts', badge: 'Best Seller', rating: 4.6, reviews_count: 547, stock: 250, sku: 'CJ-PM-CD', shipping_days: '5-8', images_count: 5 },
      { id: 'phone-mount-vent', name: 'Car Air Vent Phone Holder', price: 37.83, original_price: 44.99, description: 'Premium air vent phone mount. Ultra-strong clip, anti-slip silicone pad.', features: ['Universal Fit','Anti-Slip Silicone','Strong Vent Clip','360° Rotation','One-Hand Operation','Ultra-Compact'], category: 'Phone Mounts', badge: 'Popular', rating: 4.7, reviews_count: 456, stock: 200, sku: 'CJ-PM-VENT', shipping_days: '5-8', images_count: 5 },
      { id: 'phone-mount-magnetic', name: 'Car Magnetic Phone Holder', price: 43.57, original_price: 54.99, description: 'Strong magnetic phone holder. Ultra-strong N52 magnets.', features: ['Ultra-Strong N52 Magnets','MagSafe Compatible','One-Hand Operation','Dashboard Mount','Ultra-Slim Design','No Vibration'], category: 'Phone Mounts', badge: 'Hot', rating: 4.8, reviews_count: 321, stock: 180, sku: 'CJ-PM-MAG', shipping_days: '5-8', images_count: 5 },
      { id: 'car-charger-36w', name: 'Car Charger PD 36W', price: 33.38, original_price: 39.99, description: '36W PD USB-C car charger. Super fast charging.', features: ['36W PD Fast Charging','USB-C + USB-A','iPhone 15/16 Compatible','Samsung Super Fast','Aluminum Alloy','Overcharge Protection'], category: 'Chargers', badge: 'Best Seller', rating: 4.8, reviews_count: 394, stock: 300, sku: 'CJ-CC-36W', shipping_days: '5-8', images_count: 5 },
      { id: 'car-charger-30w', name: 'Car Charger PD 30W', price: 29.71, original_price: null, description: '30W PD fast car charger. Dual port design.', features: ['30W PD Fast Charging','Dual Ports','Slim Design','12V/24V Compatible','Smart IC Chip','Protection'], category: 'Chargers', badge: null, rating: 4.7, reviews_count: 331, stock: 350, sku: 'CJ-CC-30W', shipping_days: '5-8', images_count: 5 },
      { id: 'car-trunk-organizer', name: 'Car Trunk Organizer', price: 26.12, original_price: 34.99, description: 'Heavy-duty car trunk organizer. 3-compartment design.', features: ['3-Compartment Design','Heavy-Duty Material','Foldable & Portable','Waterproof Lining','Anti-Slip Bottom','Fits Most Vehicles'], category: 'Organization', badge: 'Popular', rating: 4.5, reviews_count: 429, stock: 150, sku: 'CJ-TRUNK-ORG', shipping_days: '5-8', images_count: 5 },
      { id: 'jump-starter', name: 'Portable Jump Starter 2000A', price: 97.33, original_price: 129.99, description: '2000A peak portable jump starter.', features: ['2000A Peak Current','Starts Dead Battery','Built-in Power Bank','LED Flashlight','USB-C Charging','Cars/SUVs/Trucks'], category: 'Jump Starters', badge: 'Premium', rating: 4.9, reviews_count: 197, stock: 100, sku: 'CJ-JS-2000A', shipping_days: '5-8', images_count: 5 },
      { id: 'jump-starter-pro', name: 'Jump Starter Power Bank Pro 3000A', price: 118.80, original_price: 159.99, description: '3000A peak jump starter + 20,000mAh power bank.', features: ['3000A Peak Current','20000mAh Power Bank','Fast Charge Laptops','Reverse Polarity Protection','LED Light','12V/24V'], category: 'Jump Starters', badge: 'Premium', rating: 4.9, reviews_count: 194, stock: 80, sku: 'CJ-JS-3000A', shipping_days: '5-8', images_count: 5 },
    ];

    for (const p of products) {
      const { rows } = await client.query(
        `INSERT INTO products (id, name, price, original_price, description, features, category, badge, rating, reviews_count, stock, sku, shipping_days, images_count)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (id) DO UPDATE SET
           price = EXCLUDED.price, stock = EXCLUDED.stock, reviews_count = EXCLUDED.reviews_count
         RETURNING id`,
        [p.id, p.name, p.price, p.original_price, p.description, p.features, p.category, p.badge, p.rating, p.reviews_count, p.stock, p.sku, p.shipping_days, p.images_count]
      );
      console.log(`  ✅ ${p.name} — $${p.price}`);
    }

    console.log('\n✅ Todos los productos insertados!');
    console.log('\n📊 Database lista para producción!');
    
    await client.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
