// 🕸️ KREID — Stripe Webhook (Vercel Serverless) v4 - DEBUG
import Stripe from 'stripe';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, stripe-signature');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const CJ_API_KEY = process.env.CJ_API_KEY;

  const steps = [];
  function log(s) { steps.push(s); console.log(`[WEBHOOK] ${s}`); }

  try {
    // 1. Verificar config
    const check = { STRIPE_WEBHOOK_SECRET: !!STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY: !!STRIPE_SECRET_KEY, SUPABASE_URL: !!SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_KEY, CJ_API_KEY: !!CJ_API_KEY };
    log(`Config check: ${JSON.stringify(check)}`);
    if (!STRIPE_WEBHOOK_SECRET || !STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(200).json({ received: true, error: 'Missing config', check, steps });
    }

    // 2. Firma
    const sig = req.headers['stripe-signature'];
    log(`Signature header present: ${!!sig}`);
    if (!sig) return res.status(200).json({ received: true, error: 'No signature', steps });

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' });

    // 3. Leer body raw
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const rawBody = Buffer.concat(chunks);
    log(`Raw body: ${rawBody.length} bytes`);

    // 4. Verificar evento
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
      log(`Event confirmed: ${event.type}`);
    } catch (e) {
      log(`Signature error: ${e.message}`);
      return res.status(200).json({ received: true, error: e.message, steps });
    }

    // 5. Solo procesar checkout completado
    if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
      log(`Ignored event type: ${event.type}`);
      return res.status(200).json({ received: true, type: event.type, ignored: true, steps });
    }

    const session = event.data.object;
    log(`Session: ${session.id} | amount_total: ${session.amount_total} | payment_status: ${session.payment_status}`);
    log(`Customer: ${session.customer_details?.email || session.customer_email || 'N/A'}`);

    // 6. Guardar orden en Supabase
    const email = session.customer_details?.email || session.customer_email || '';

    // Shipping address
    let shippingAddress = null;
    const sd = session.shipping_details || session.customer_details?.shipping;
    if (sd?.address) {
      shippingAddress = {
        name: sd.name || email || 'Customer',
        address: sd.address.line1 || '',
        address2: sd.address.line2 || '',
        city: sd.address.city || '',
        province: sd.address.state || '',
        zip: sd.address.postal_code || '',
        countryCode: sd.address.country || 'US',
        country: sd.address.country === 'US' ? 'United States' : (sd.address.country || 'United States'),
        phone: sd.phone || '',
      };
    }
    log(`Shipping address: ${shippingAddress ? 'yes' : 'no'}`);

    const total = parseFloat(session.amount_total || 0) / 100;
    const subtotal = parseFloat(session.amount_subtotal || 0) / 100;

    const orderPayload = {
      email,
      status: 'processing',
      total,
      shipping: total - subtotal,
      subtotal,
      shipping_address: shippingAddress ? JSON.stringify(shippingAddress) : null,
      stripe_session_id: session.id,
    };

    log(`Saving order: $${total} to ${email}`);
    const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify(orderPayload),
    });

    if (!orderRes.ok) {
      const txt = await orderRes.text();
      log(`Supabase order error ${orderRes.status}: ${txt.slice(0, 200)}`);
      return res.status(200).json({ received: true, error: `Supabase order error: ${orderRes.status}`, steps });
    }

    const savedOrders = await orderRes.json();
    const order = savedOrders[0];
    log(`Order saved: ${order.id}`);

    // 7. Obtener line_items de Stripe
    log(`Fetching line_items from Stripe...`);
    let lineItems = [];
    try {
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items.data.price.product'] });
      lineItems = fullSession.line_items?.data || [];
      log(`Line items from Stripe: ${lineItems.length}`);
    } catch (e) {
      log(`Error getting line_items from Stripe: ${e.message}`);
      // Intentar con lo que vino en el evento
      lineItems = session.line_items?.data || [];
      log(`Line items from event: ${lineItems.length}`);
    }

    // SKU mapping
    const SKU_TO_VID = {
      "CJ-PM-CD": "1433302949299359744", "CJ-PM-VENT": "27894560-8C39-4B02-8475-50A90D1ABFD5",
      "CJ-PM-MAG": "07152307-79AB-4DBB-9F36-E9C0C69C52B3", "CJ-TRUNK-ORG": "2601190353581619600",
      "CJ-CC-36W": "1477534343592284160", "CJ-CC-30W": "1407983983391805440",
      "CJ-JS-2000A": "1631541129613160448", "CJ-JS-3000A": "2605070837001638800",
    };

    const cjProducts = [];

    for (const li of lineItems) {
      const product = li.price?.product || {};
      const productId = product.id || null;
      const itemName = li.description || product.name || 'Unknown';
      const itemPrice = parseFloat(li.price?.unit_amount || 0) / 100;
      const itemQty = li.quantity || 1;

      log(`  Item: ${itemName} x${itemQty} = $${itemPrice} | product_id: ${productId}`);

      // Guardar order_item
      const itemRes = await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, product_id: productId, name: itemName, price: itemPrice, quantity: itemQty, image_url: (product.images && product.images[0]) || null }),
      });
      log(`  Item saved: ${itemRes.ok}`);

      // Buscar SKU
      if (productId) {
        try {
          const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(productId)}&select=sku`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
          });
          const prods = await prodRes.json();
          const sku = Array.isArray(prods) && prods.length > 0 ? prods[0].sku : null;
          log(`  SKU lookup: ${sku || 'not found'}`);
          if (sku && SKU_TO_VID[sku]) {
            cjProducts.push({ vid: SKU_TO_VID[sku], quantity: itemQty, storeLineItemId: `KREID-${productId.slice(0,12)}-${Date.now().toString(36)}` });
          }
        } catch (e) {
          log(`  SKU lookup error: ${e.message}`);
        }
      }
    }

    log(`CJ products ready: ${cjProducts.length}`);

    // 8. Enviar a CJ
    if (cjProducts.length > 0 && shippingAddress) {
      try {
        const shortId = order.id.replace(/-/g, '').slice(0, 8).toUpperCase();
        const ts = Math.floor(Date.now() / 1000).toString(36).toUpperCase();
        const cjOrderNumber = `KREID-${shortId}-${ts}`;

        log(`Getting CJ token...`);
        const tokenRes = await fetch('https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: CJ_API_KEY }),
        });
        const tokenData = await tokenRes.json();
        const cjToken = tokenData.data?.accessToken;
        log(`CJ token: ${cjToken ? cjToken.slice(0,20)+'...' : 'FAILED'}`);
        if (!cjToken) throw new Error(`CJ auth: ${tokenData.message}`);

        // Crear orden
        const cjPayload = {
          orderNumber: cjOrderNumber,
          shippingCountryCode: shippingAddress.countryCode || 'US',
          shippingCountry: shippingAddress.country || 'United States',
          shippingProvince: shippingAddress.province || '',
          shippingCity: shippingAddress.city || '',
          shippingAddress: shippingAddress.address || '',
          shippingAddress2: shippingAddress.address2 || '',
          shippingZip: shippingAddress.zip || '',
          shippingCustomerName: shippingAddress.name || '',
          shippingPhone: shippingAddress.phone || '',
          email: email,
          logisticName: 'CJPacket',
          fromCountryCode: 'CN',
          isSandbox: 0,
          products: cjProducts,
        };

        log(`Creating CJ order...`);
        const cjRes = await fetch('https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrderV3', {
          method: 'POST',
          headers: { 'CJ-Access-Token': cjToken, 'platformToken': cjToken, 'Content-Type': 'application/json' },
          body: JSON.stringify(cjPayload),
        });
        const cjResult = await cjRes.json();
        log(`CJ response code: ${cjResult.code} | ${cjResult.message || 'OK'}`);

        const cjOrderId = cjResult.data?.cjOrderId || cjResult.cjOrderId;
        const cjOrderNumberResp = cjResult.data?.cjOrderNumber || cjResult.cjOrderNumber || cjOrderNumber;

        // Guardar en cj_orders
        const cjRecord = {
          order_id: order.id,
          cj_order_id: cjOrderId || '',
          cj_order_number: cjOrderNumberResp,
          cj_status: cjOrderId ? 'processing' : 'failed',
          logistic_name: 'CJPacket',
          error_log: cjOrderId ? null : JSON.stringify(cjResult).slice(0, 300),
        };

        await fetch(`${SUPABASE_URL}/rest/v1/cj_orders`, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(cjRecord),
        });
        log(`CJ order saved: ${cjOrderNumberResp} | ID: ${cjOrderId || 'N/A'}`);
      } catch (cjErr) {
        log(`CJ error: ${cjErr.message}`);
        await fetch(`${SUPABASE_URL}/rest/v1/cj_orders`, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: order.id, cj_status: 'failed', error_log: cjErr.message }),
        }).catch(() => {});
      }
    } else {
      log(`CJ skipped: products=${cjProducts.length} shipping=${!!shippingAddress}`);
    }

    log(`✅ Done!`);
    return res.status(200).json({ received: true, type: event.type, steps });
  } catch (err) {
    log(`FATAL: ${err.message}`);
    return res.status(200).json({ received: true, error: err.message, steps });
  }
}
