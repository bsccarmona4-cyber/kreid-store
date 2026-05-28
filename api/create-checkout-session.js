// 🏪 KREID — Stripe Checkout Session (Vercel Serverless)
// Endpoint: POST /api/create-checkout-session

import Stripe from 'stripe';

export default async function handler(req, res) {
  // ─── CORS ──────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ─── Config desde env vars ─────────────────────
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

  if (!stripeKey) {
    console.error('❌ STRIPE_SECRET_KEY no configurada');
    return res.status(500).json({ error: 'Stripe key not configured' });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2025-02-24.acacia',
  });

  try {
    const { line_items, shipping_cost, email, customer_name, success_url, cancel_url } = req.body;

    if (!line_items || line_items.length === 0) {
      return res.status(400).json({ error: 'No items in cart' });
    }

    // Validar estructura de line_items
    for (const item of line_items) {
      if (!item.price_data?.currency || !item.price_data?.unit_amount || !item.quantity) {
        return res.status(400).json({ error: 'Invalid line item structure' });
      }
    }

    console.log(`📦 Creating checkout session for ${line_items.length} items...`);

    // Crear la sesión de checkout en Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email || undefined,
      line_items,
      shipping_options: [
        shipping_cost && shipping_cost > 0
          ? {
              shipping_rate_data: {
                type: 'fixed_amount',
                fixed_amount: { amount: shipping_cost, currency: 'usd' },
                display_name: 'Shipping (5-8 days)',
                delivery_estimate: {
                  minimum: { unit: 'business_day', value: 5 },
                  maximum: { unit: 'business_day', value: 8 },
                },
              },
            }
          : {
              shipping_rate_data: {
                type: 'fixed_amount',
                fixed_amount: { amount: 0, currency: 'usd' },
                display_name: 'Free Shipping',
                delivery_estimate: {
                  minimum: { unit: 'business_day', value: 5 },
                  maximum: { unit: 'business_day', value: 8 },
                },
              },
            },
      ].filter(Boolean),
      success_url: success_url || `${clientUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${clientUrl}/checkout`,
      metadata: {
        customer_name: customer_name || '',
        source: 'kreid-store',
      },
    });

    console.log(`✅ Checkout session created: ${session.id} — $${(session.amount_total / 100).toFixed(2)}`);

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('❌ Stripe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
