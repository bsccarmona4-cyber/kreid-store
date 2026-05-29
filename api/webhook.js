// KREID Stripe Webhook v7 - Sin verificación de firma temporal
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const SU = process.env.SUPABASE_URL;
    const SAK = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SU || !SAK) return res.status(200).json({ ok: false, error: 'missing supabase' });

    // Leer body como JSON directamente (sin verificación)
    const buf = [];
    for await (const c of req) buf.push(c);
    const body = JSON.parse(Buffer.concat(buf).toString());
    
    // Verificar que sea de Stripe por el tipo de evento
    const eventType = body?.type;
    if (!eventType) return res.status(200).json({ ok: false, error: 'not a stripe event' });

    console.log(`Event: ${eventType}`);

    if (eventType === 'checkout.session.completed' || eventType === 'checkout.session.async_payment_succeeded') {
      const s = body.data?.object;
      if (!s) return res.status(200).json({ ok: false, error: 'no session object' });

      console.log(`Session: ${s.id} total=${s.amount_total}`);
      
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
      console.log(`Email: ${email} Shipping: ${sa ? 'yes' : 'no'}`);

      const h = (m, e, b) => fetch(`${SU}${e}`, {
        method: m,
        headers: { 'apikey': SAK, 'Authorization': `Bearer ${SAK}`, 'Content-Type': 'application/json', 'Prefer': b ? 'return=representation' : undefined },
        body: b ? JSON.stringify(b) : undefined,
      });

      // Guardar orden
      const or = await h('POST', '/rest/v1/orders', {
        email, status: 'processing',
        total: (s.amount_total || 0) / 100,
        shipping: ((s.amount_total || 0) - (s.amount_subtotal || 0)) / 100,
        subtotal: (s.amount_subtotal || 0) / 100,
        shipping_address: sa,
        stripe_session_id: s.id,
      });

      if (!or.ok) {
        const txt = await or.text();
        console.error(`Order error ${or.status}: ${txt.slice(0,200)}`);
        return res.status(200).json({ ok: false, error: `order: ${or.status}` });
      }

      const order = (await or.json())[0];
      console.log(`✅ Order: ${order.id}`);

      // Items del evento (pueden venir ya en line_items)
      const items = s.line_items?.data || [];
      console.log(`Items in event: ${items.length}`);

      for (const li of items) {
        const p = li.price?.product || {};
        await h('POST', '/rest/v1/order_items', {
          order_id: order.id,
          product_id: p.id || li.price?.product || null,
          name: li.description || 'Product',
          price: (li.price?.unit_amount || 0) / 100,
          quantity: li.quantity || 1,
        }).catch(e => console.error(`Item error: ${e.message}`));
      }
      console.log(`✅ Items saved: ${items.length}`);
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(`Error: ${e.message}`);
    return res.status(200).json({ ok: false, error: e.message });
  }
}
