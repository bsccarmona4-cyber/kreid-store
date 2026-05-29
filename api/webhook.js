// KREID Stripe Webhook v9
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const SU = process.env.SUPABASE_URL;
    const SAK = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SU || !SAK) return res.status(200).json({ ok: false, error: 'missing supabase' });

    const buf = [];
    for await (const c of req) buf.push(c);
    const raw = Buffer.concat(buf);

    let body;
    try { body = JSON.parse(raw.toString()); } catch (e) { return res.status(200).json({ ok: false, error: 'invalid json' }); }

    const eventType = body?.type;
    if (!eventType) return res.status(200).json({ ok: false, error: 'not a stripe event' });

    if (eventType.includes('checkout.session.completed') || eventType.includes('async_payment_succeeded')) {
      const s = body.data?.object;
      if (!s) return res.status(200).json({ ok: false });

      const email = s.customer_details?.email || s.customer_email || '';

      // Intentar obtener shipping_address:
      // 1. Desde shipping_details de Stripe
      // 2. Desde metadata (enviado por nuestro frontend)
      let sa = null;
      const sd = s.shipping_details || s.customer_details?.shipping;

      if (sd?.address) {
        // Stripe recolectó la dirección
        sa = JSON.stringify({
          name: sd.name || '',
          address: sd.address.line1 || '',
          address2: sd.address.line2 || '',
          city: sd.address.city || '',
          province: sd.address.state || '',
          zip: sd.address.postal_code || '',
          countryCode: sd.address.country || 'US',
          country: sd.address.country === 'US' ? 'United States' : (sd.address.country || 'United States'),
          phone: sd.phone || '',
        });
      } else if (s.metadata?.shipping_line1) {
        // Nuestro frontend envió la dirección como metadata
        sa = JSON.stringify({
          name: s.metadata.shipping_name || s.metadata.customer_name || email || 'Customer',
          address: s.metadata.shipping_line1 || '',
          address2: '',
          city: s.metadata.shipping_city || '',
          province: s.metadata.shipping_state || '',
          zip: s.metadata.shipping_zip || '',
          countryCode: s.metadata.shipping_country || 'US',
          country: 'United States',
          phone: '',
        });
      }

      const headers = {
        'apikey': SAK,
        'Authorization': `Bearer ${SAK}`,
        'Content-Type': 'application/json',
      };

      // Guardar orden
      const or = await fetch(`${SU}/rest/v1/orders`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          email,
          status: 'pending',
          total: (s.amount_total || 0) / 100,
          shipping: ((s.amount_total || 0) - (s.amount_subtotal || 0)) / 100,
          subtotal: (s.amount_subtotal || 0) / 100,
          shipping_address: sa,
          stripe_session_id: s.id,
        }),
      });

      if (!or.ok) {
        const t = await or.text();
        console.error(`Order error: ${or.status}: ${t.slice(0,200)}`);
        return res.status(200).json({ ok: false });
      }

      const order = (await or.json())[0];
      console.log(`✅ Order: ${order.id} | Ship: ${sa ? 'YES' : 'NO'} | ${email}`);
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(`Error: ${e.message}`);
    return res.status(200).json({ ok: false, error: e.message });
  }
}
