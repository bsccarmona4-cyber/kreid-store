// 🕸️ KREID — Stripe Webhook (Vercel Serverless) v5 - HYBRID APPROACH
// Solo guarda la orden en Supabase + marca para CJ
// El script local (cron) se encarga de enviar a CJ

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, stripe-signature');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const WS = process.env.STRIPE_WEBHOOK_SECRET;
    const SU = process.env.SUPABASE_URL;
    const SAK = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const SK = process.env.STRIPE_SECRET_KEY;

    if (!WS || !SU || !SAK || !SK) {
      return res.status(200).json({ ok: false, error: 'missing env vars' });
    }

    const sig = req.headers['stripe-signature'];
    if (!sig) return res.status(200).json({ ok: false, error: 'no sig' });

    const stripe = new (await import('stripe')).default(SK, { apiVersion: '2025-02-24.acacia' });

    // Leer body raw usando enfoque compatible con Vercel
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks);
    const event = stripe.webhooks.constructEvent(rawBody, sig, WS);

    const h = (m, e, b) => fetch(`${SU}${e}`, {
      method: m,
      headers: { 'apikey': SAK, 'Authorization': `Bearer ${SAK}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: b ? JSON.stringify(b) : undefined,
    });

    // Solo checkout completado
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const s = event.data.object;
      const email = s.customer_details?.email || s.customer_email || '';

      // Extraer shipping address
      let sa = null;
      const sd = s.shipping_details || s.customer_details?.shipping;
      if (sd?.address) {
        sa = JSON.stringify({
          name: sd.name || email.split('@')[0] || 'Customer',
          address: sd.address.line1 || '',
          address2: sd.address.line2 || '',
          city: sd.address.city || '',
          province: sd.address.state || '',
          zip: sd.address.postal_code || '',
          countryCode: sd.address.country || 'US',
          country: sd.address.country === 'US' ? 'United States' : (sd.address.country || 'United States'),
          phone: sd.phone || '',
        });
      }

      // Obtener line items de Stripe (expandidos)
      let items = [];
      try {
        const fs = await stripe.checkout.sessions.retrieve(s.id, { expand: ['line_items.data.price.product'] });
        items = fs.line_items?.data || [];
      } catch (e) {
        console.error(`Error getting line items: ${e.message}`);
        items = s.line_items?.data || [];
      }

      // Guardar orden
      const orderPayload = {
        email,
        status: 'processing',
        total: parseFloat(s.amount_total || 0) / 100,
        shipping: (parseFloat(s.amount_total || 0) - parseFloat(s.amount_subtotal || 0)) / 100,
        subtotal: parseFloat(s.amount_subtotal || 0) / 100,
        shipping_address: sa,
        stripe_session_id: s.id,
      };

      const or = await h('POST', '/rest/v1/orders', orderPayload);
      if (!or.ok) {
        const txt = await or.text();
        console.error(`Order save error: ${or.status}: ${txt.slice(0,200)}`);
        return res.status(200).json({ ok: false, error: `order: ${txt.slice(0,100)}` });
      }

      const savedOrders = await or.json();
      const order = savedOrders[0];
      console.log(`✅ Order saved: ${order.id} | Items: ${items.length}`);

      // Guardar items
      for (const li of items) {
        const p = li.price?.product || {};
        await h('POST', '/rest/v1/order_items', {
          order_id: order.id,
          product_id: p.id || null,
          name: li.description || p.name || 'Unknown',
          price: parseFloat(li.price?.unit_amount || 0) / 100,
          quantity: li.quantity || 1,
          image_url: (p.images && p.images[0]) || null,
        }).catch(() => {});
      }

      console.log(`✅ Items saved: ${items.length}`);
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(`Webhook error: ${e.message}`);
    return res.status(200).json({ ok: false, error: e.message });
  }
}
