// KREID Stripe Webhook v6 - ULTRA SIMPLE
// Usa Stripe SDK para verificar y procesar

import Stripe from 'stripe';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const WS = process.env.STRIPE_WEBHOOK_SECRET;
    const SK = process.env.STRIPE_SECRET_KEY;
    const SU = process.env.SUPABASE_URL;
    const SAK = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!WS || !SK || !SU || !SAK) {
      console.error('Missing env vars');
      return res.status(200).json({ ok: false });
    }

    // Leer body
    const buf = [];
    for await (const c of req) buf.push(c);
    const raw = Buffer.concat(buf);

    // Verificar
    const stripe = new Stripe(SK, { apiVersion: '2025-02-24.acacia' });
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(raw, sig, WS);
    } catch (e) {
      console.error('Signature error:', e.message);
      return res.status(200).json({ ok: false, sigError: e.message });
    }

    console.log(`Event: ${event.type}`);

    // Solo procesar checkout completado
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const s = event.data.object;
      console.log(`Session: ${s.id} total=${s.amount_total} payment=${s.payment_status}`);

      const email = s.customer_details?.email || s.customer_email || '';

      // Shipping address
      let sa = null;
      const sd = s.shipping_details || s.customer_details?.shipping;
      if (sd?.address) {
        sa = JSON.stringify({
          name: sd.name || '',
          address: sd.address.line1 || '',
          address2: sd.address.line2 || '',
          city: sd.address.city || '',
          province: sd.address.state || '',
          zip: sd.address.postal_code || '',
          countryCode: sd.address.country || 'US',
          phone: sd.phone || '',
        });
      }
      console.log(`Email: ${email} Shipping: ${sa ? 'yes' : 'no'}`);

      const h = (m, e, b) => fetch(`${SU}${e}`, {
        method: m,
        headers: {
          'apikey': SAK,
          'Authorization': `Bearer ${SAK}`,
          'Content-Type': 'application/json',
          ...(b ? { 'Prefer': 'return=representation' } : {}),
        },
        body: b ? JSON.stringify(b) : undefined,
      });

      // Guardar orden
      const or = await h('POST', '/rest/v1/orders', {
        email,
        status: 'processing',
        total: (s.amount_total || 0) / 100,
        shipping: ((s.amount_total || 0) - (s.amount_subtotal || 0)) / 100,
        subtotal: (s.amount_subtotal || 0) / 100,
        shipping_address: sa,
        stripe_session_id: s.id,
      });

      if (!or.ok) {
        console.error(`Order error: ${or.status}`);
        return res.status(200).json({ ok: false });
      }

      const order = (await or.json())[0];
      console.log(`Order saved: ${order.id}`);

      // Obtener line items de Stripe
      let items = [];
      try {
        const fs = await stripe.checkout.sessions.retrieve(s.id, {
          expand: ['line_items.data.price.product'],
        });
        items = fs.line_items?.data || [];
      } catch (e) {
        console.error(`Line items error: ${e.message}`);
      }

      console.log(`Items from Stripe: ${items.length}`);

      // Guardar items
      for (const li of items) {
        const p = li.price?.product || {};
        const pi = {
          order_id: order.id,
          product_id: p.id || null,
          name: li.description || p.name || 'Unknown',
          price: (li.price?.unit_amount || 0) / 100,
          quantity: li.quantity || 1,
        };
        const ir = await h('POST', '/rest/v1/order_items', pi);
        if (ir.ok) console.log(`  Item: ${pi.name}`);
        else console.error(`  Item error: ${await ir.text()}`);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(`Fatal: ${e.message}`);
    return res.status(200).json({ ok: false, error: e.message });
  }
}
