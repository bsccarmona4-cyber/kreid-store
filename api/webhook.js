import Stripe from 'stripe';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, stripe-signature');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const SK = process.env.STRIPE_SECRET_KEY;
    const WS = process.env.STRIPE_WEBHOOK_SECRET;
    const SU = process.env.SUPABASE_URL;
    const SAK = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const CJK = process.env.CJ_API_KEY;

    if (!SK || !WS || !SU || !SAK) {
      return res.status(200).json({ ok: false, error: 'missing env vars' });
    }

    const sig = req.headers['stripe-signature'];
    if (!sig) return res.status(200).json({ ok: false, error: 'no sig' });

    const stripe = new Stripe(SK, { apiVersion: '2025-02-24.acacia' });
    const rawBody = Buffer.concat(await req.toArray());
    const event = stripe.webhooks.constructEvent(rawBody, sig, WS);

    if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
      return res.status(200).json({ ok: true, type: event.type, skipped: true });
    }

    const s = event.data.object;
    const email = s.customer_details?.email || s.customer_email || '';

    // Extraer shipping
    let sa = null;
    const sd = s.shipping_details || s.customer_details?.shipping;
    if (sd?.address) {
      sa = JSON.stringify({
        name: sd.name || '', address: sd.address.line1 || '', address2: sd.address.line2 || '',
        city: sd.address.city || '', province: sd.address.state || '',
        zip: sd.address.postal_code || '', countryCode: sd.address.country || 'US',
        country: sd.address.country === 'US' ? 'United States' : (sd.address.country || 'United States'),
        phone: sd.phone || '',
      });
    }

    const h = (m, e, b) => fetch(`${SU}${e}`, { method: m, headers: { apikey: SAK, Authorization: `Bearer ${SAK}`, 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });

    // Crear orden
    const or = await h('POST', '/rest/v1/orders', {
      email, status: 'processing',
      total: parseFloat(s.amount_total || 0) / 100,
      shipping: (parseFloat(s.amount_total || 0) - parseFloat(s.amount_subtotal || 0)) / 100,
      subtotal: parseFloat(s.amount_subtotal || 0) / 100,
      shipping_address: sa, stripe_session_id: s.id,
    });
    const order = (await or.json())[0];

    // Obtener line items
    const fs = await stripe.checkout.sessions.retrieve(s.id, { expand: ['line_items.data.price.product'] });
    const items = fs.line_items?.data || [];

    const SKU2VID = {
      "CJ-PM-CD": "1433302949299359744", "CJ-PM-VENT": "27894560-8C39-4B02-8475-50A90D1ABFD5",
      "CJ-PM-MAG": "07152307-79AB-4DBB-9F36-E9C0C69C52B3", "CJ-TRUNK-ORG": "2601190353581619600",
      "CJ-CC-36W": "1477534343592284160", "CJ-CC-30W": "1407983983391805440",
      "CJ-JS-2000A": "1631541129613160448", "CJ-JS-3000A": "2605070837001638800",
    };
    const cjp = [];

    for (const li of items) {
      const p = li.price?.product || {};
      await h('POST', '/rest/v1/order_items', {
        order_id: order.id, product_id: p.id || null,
        name: li.description || p.name || 'Unknown',
        price: parseFloat(li.price?.unit_amount || 0) / 100,
        quantity: li.quantity || 1,
        image_url: (p.images && p.images[0]) || null,
      });

      if (p.id) {
        const pr = await h('GET', `/rest/v1/products?id=eq.${p.id}&select=sku`);
        const ps = await pr.json();
        const sku = Array.isArray(ps) && ps[0]?.sku;
        if (sku && SKU2VID[sku]) cjp.push({ vid: SKU2VID[sku], quantity: li.quantity || 1, storeLineItemId: `${p.id}-${Date.now()}` });
      }
    }

    // CJ
    if (cjp.length > 0 && sa) {
      try {
        const tr = await fetch('https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: CJK }),
        });
        const td = await tr.json();
        const tk = td.data?.accessToken;
        if (!tk) throw new Error('CJ auth fail');

        const sha = JSON.parse(sa);
        const cjR = await fetch('https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrderV3', {
          method: 'POST',
          headers: { 'CJ-Access-Token': tk, 'platformToken': tk, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderNumber: `KREID-${order.id.slice(0,8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
            shippingCountryCode: sha.countryCode || 'US',
            shippingCountry: sha.country || 'United States',
            shippingProvince: sha.province || '', shippingCity: sha.city || '',
            shippingAddress: sha.address || '', shippingAddress2: sha.address2 || '',
            shippingZip: sha.zip || '', shippingCustomerName: sha.name || '',
            shippingPhone: sha.phone || '', email,
            logisticName: 'CJPacket', fromCountryCode: 'CN', isSandbox: 0,
            products: cjp,
          }),
        });
        const cjD = await cjR.json();
        const cjId = cjD.data?.cjOrderId || cjD.cjOrderId;
        await h('POST', '/rest/v1/cj_orders', {
          order_id: order.id, cj_order_id: cjId || '', cj_order_number: cjD.data?.cjOrderNumber || cjD.cjOrderNumber || '',
          cj_status: cjId ? 'processing' : 'failed',
          logistic_name: 'CJPacket', error_log: cjId ? null : JSON.stringify(cjD).slice(0,300),
        });
      } catch (e) {
        await h('POST', '/rest/v1/cj_orders', { order_id: order.id, cj_status: 'failed', error_log: e.message });
      }
    }

    return res.status(200).json({ ok: true, order: order.id });
  } catch (e) {
    console.error(e);
    return res.status(200).json({ ok: false, error: e.message });
  }
}
