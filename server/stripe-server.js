const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');

// ─── Config ───────────────────────────────────────
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();
const PORT = process.env.STRIPE_SERVER_PORT || 3001;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// ─── Health check ─────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Create Checkout Session ──────────────────────
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { line_items, shipping_cost, email, customer_name, success_url, cancel_url } = req.body;

    if (!line_items || line_items.length === 0) {
      return res.status(400).json({ error: 'No items in cart' });
    }

    // Crear la sesión de checkout en Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email || undefined,
      line_items,
      shipping_options: shipping_cost > 0
        ? [{ shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: shipping_cost, currency: 'usd' },
            display_name: 'Shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 8 },
            },
          }}]
        : [{ shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 0, currency: 'usd' },
            display_name: 'Free Shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 8 },
            },
          }}],
      success_url: success_url || `${process.env.CLIENT_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${process.env.CLIENT_URL || 'http://localhost:3000'}/checkout`,
      metadata: {
        customer_name: customer_name || '',
        source: 'kreid-store',
      },
    });

    console.log(`✅ Checkout session created: ${session.id} — $${(session.amount_total / 100).toFixed(2)}`);
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('❌ Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Webhook (para eventos post-pago) ─────────────
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = JSON.parse(req.body);
    }
  } catch (err) {
    console.error('❌ Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log(`💰 Payment completed: ${session.id} — $${(session.amount_total / 100).toFixed(2)}`);
      // Aquí después podemos guardar la orden en Supabase
      break;
    case 'checkout.session.expired':
      console.log(`⌛ Session expired: ${event.data.object.id}`);
      break;
    default:
      console.log(`📨 Unhandled event: ${event.type}`);
  }

  res.json({ received: true });
});

// ─── Start ────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
═══════════════════════════════════════
  💳 Stripe Server corriendo
  Puerto: ${PORT}
  Health: http://localhost:${PORT}/api/health
  Create Session: POST /api/create-checkout-session
═══════════════════════════════════════
  `);
});
