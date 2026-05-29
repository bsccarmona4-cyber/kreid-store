// KREID Stripe Webhook v8 - Simple, sin verificación de firma
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const SU = process.env.SUPABASE_URL;
    const SAK = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SU || !SAK) return res.status(200).json({ ok: false, error: 'missing supabase' });

    // Leer body como JSON
    const buf = [];
    for await (const c of req) buf.push(c);
    const body = JSON.parse(Buffer.concat(buf).toString());

    const eventType = body?.type;
    if (!eventType) return res.status(200).json({ ok: false, error: 'not a stripe event' });

    console.log(`Event: ${eventType}`);

    if (eventType === 'checkout.session.completed' || eventType === 'checkout.session.async_payment_succeeded') {
      const s = body.data?.object;
      if (!s) return res.status(200).json({ ok: false, error: 'no session' });

      console.log(`Session: ${s.id}`);

      const email = s.customer_details?.email || s.customer_email || '';

      // Shipping
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
      const orderPayload = {
        email,
        status: 'processing',
        total: (s.amount_total || 0) / 100,
        shipping: ((s.amount_total || 0) - (s.amount_subtotal || 0)) / 100,
        subtotal: (s.amount_subtotal || 0) / 100,
        shipping_address: sa,
        stripe_session_id: s.id,
      };

      const or = await h('POST', '/rest/v1/orders', orderPayload);
      if (!or.ok) {
        const txt = await or.text();
        console.error(`Order error ${or.status}: ${txt.slice(0,200)}`);
        return res.status(200).json({ ok: false, error: `order: ${or.status}` });
      }

      const order = (await or.json())[0];
      console.log(`✅ Order: ${order.id} | Email: ${email} | Shipping: ${sa ? 'yes' : 'no'}`);

      // Obtener line_items - desde el evento o desde Stripe API
      let items = s.line_items?.data || [];

      // Si no vienen en el evento, intentar con Stripe API
      if (items.length === 0 && process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) {
        try {
          const Stripe = (await import('stripe')).default;
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' });
          const fs = await stripe.checkout.sessions.retrieve(s.id, {
            expand: ['line_items.data.price.product'],
          });
          items = fs.line_items?.data || [];
          console.log(`Items via Stripe API: ${items.length}`);
        } catch (e) {
          console.error(`Stripe API error: ${e.message}`);
        }
      }

      console.log(`Items to save: ${items.length}`);

      // Guardar items
      for (const li of items) {
        const p = li.price?.product || {};
        const itemPayload = {
          order_id: order.id,
          product_id: typeof p === 'string' ? p : (p.id || null),
          name: li.description || (typeof p === 'object' ? p.name : 'Product') || 'Product',
          price: (li.price?.unit_amount || 0) / 100,
          quantity: li.quantity || 1,
        };

        const ir = await h('POST', '/rest/v1/order_items', itemPayload);
        if (ir.ok) console.log(`  ✅ ${itemPayload.name} x${itemPayload.quantity}`);
        else console.error(`  ❌ Item error: ${await ir.text().catch(() => 'unknown')}`);
      }
    }

    return res.status(200).json({ ok: true, event: eventType });
  } catch (e) {
    console.error(`Error: ${e.message}`);
    return res.status(200).json({ ok: false, error: e.message });
  }
}
