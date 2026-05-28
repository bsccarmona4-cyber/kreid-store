#!/usr/bin/env python3
"""
Escáner de rentabilidad para productos dropshipping.
Calcula unit economics reales: costos CJ, Stripe fees, envío, márgenes.
"""

import json

# Config Stripe USA
STRIPE_PERCENTAGE = 0.029
STRIPE_FIXED = 0.30

productos = [
    {"name": "MagSafe Wallet + Stand", "cost": 6.00, "price": 25.99, "shipping": 4.00, "weight": 80},
    {"name": "Cable Organizer Escritorio", "cost": 4.80, "price": 22.99, "shipping": 4.50, "weight": 180},
    {"name": "Neck Massager Shiatsu", "cost": 11.50, "price": 34.99, "shipping": 5.50, "weight": 350},
    {"name": "Shapewear Bodysuit", "cost": 5.50, "price": 24.99, "shipping": 4.80, "weight": 180},
    {"name": "LED Dog Collar", "cost": 6.00, "price": 22.99, "shipping": 5.00, "weight": 120},
]

print(f"\n{'═'*70}")
print(f"{'🔥 UNIT ECONOMICS - DROPSHIPPING USA 2026':^70}")
print(f"{'═'*70}\n")

print(f"{'Producto':<35} {'Costo':>8} {'Precio':>8} {'Stripe':>8} {'Envío':>8} {'Ganancia':>10} {'Margen':>8} {'3x?':>6}")
print(f"{'─'*35} {'─'*8} {'─'*8} {'─'*8} {'─'*8} {'─'*10} {'─'*8} {'─'*6}")

for p in productos:
    stripe_fee = round(p["price"] * STRIPE_PERCENTAGE + STRIPE_FIXED, 2)
    total_cost = p["cost"] + stripe_fee + p["shipping"]
    profit = round(p["price"] - total_cost, 2)
    margin = round((profit / p["price"]) * 100, 1)
    x3 = "✅" if p["price"] >= p["cost"] * 3 else "❌"
    
    print(f"{p['name']:<35} ${p['cost']:<6.2f} ${p['price']:<5.2f} ${stripe_fee:<5.2f} ${p['shipping']:<5.2f} ${profit:<7.2f} {margin:<6.1f}% {x3:<4}")

print(f"\n{'═'*70}")
print(f"{'💰 ESCALABILIDAD':^70}")
print(f"{'═'*70}\n")

for p in productos:
    stripe_fee = round(p["price"] * STRIPE_PERCENTAGE + STRIPE_FIXED, 2)
    total_cost = p["cost"] + stripe_fee + p["shipping"]
    profit = round(p["price"] - total_cost, 2)
    
    # Métricas de escalabilidad
    ventas_5000 = round(5000 / profit)
    ventas_10000 = round(10000 / profit)
    revenue_100_diarias = round(100 * p["price"], 2)
    
    print(f"📦 {p['name']}")
    print(f"   Ventas pa' $5,000/mes:  {ventas_5000} unidades ({round(ventas_5000/30)} ventas/día)")
    print(f"   Ventas pa' $10,000/mes: {ventas_10000} unidades ({round(ventas_10000/30)} ventas/día)")
    print(f"   Revenue con 100 ventas: ${revenue_100_diarias:.2f}")
    print()

print(f"{'═'*70}")
print(f"{'📊 ROI EN AD SPEND (CAC vs LTV)':^70}")
print(f"{'═'*70}\n")

for p in productos:
    stripe_fee = round(p["price"] * STRIPE_PERCENTAGE + STRIPE_FIXED, 2)
    total_cost = p["cost"] + stripe_fee + p["shipping"]
    profit = round(p["price"] - total_cost, 2)
    
    print(f"🔥 {p['name']} (ganancia: ${profit}/venta)")
    for cac in [5, 8, 10, 12, 15]:
        roi = round((profit - cac) / cac * 100, 1)
        status = "🟢" if roi > 100 else "🟡" if roi > 50 else "🔴"
        print(f"   {status} CAC=${cac} → ROI={roi}%")
    print()
