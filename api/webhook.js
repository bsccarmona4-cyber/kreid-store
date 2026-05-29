// 🕸️ KREID — Stripe Webhook (Vercel Serverless) v2
// Endpoint: POST /api/webhook

import Stripe from 'stripe';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, stripe-signature');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
    const CJ_API_KEY = process.env.CJ_API_KEY;
    const CLIENT_URL = process.env.CLIENT_URL || 'https://goose-dropshipping.vercel.app';

    const missing = [];
    if (!STRIPE_WEBHOOK_SECRET) missing.push('STRIPE_WEBHOOK_SECRET');
    if (!STRIPE_SECRET_KEY) missing.push('STRIPE_SECRET_KEY');
    if (!SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');

    if (missing.length > 0) {
      return res.status(200).json({
        status: 'config_error',
        missing,
        env_check: {
          has_STRIPE_WEBHOOK_SECRET: !!STRIPE_WEBHOOK_SECRET,
          has_STRIPE_SECRET_KEY: !!STRIPE_SECRET_KEY,
          has_SUPABASE_URL: !!SUPABASE_URL,
          has_SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
          has_CJ_API_KEY: !!CJ_API_KEY,
          node_version: process.version,
        }
      });
    }

    // Verificar firma Stripe
    const sig = req.headers['stripe-signature'];
    if (!sig) {
      return res.status(200).json({ status: 'no_signature', message: 'Missing stripe-signature header' });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' });

    // Leer body raw
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    const event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
    console.log(`📨 Evento Stripe: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log(`🛒 Checkout: ${session.id}`);

      // Guardar orden en Supabase
      const email = session.customer_details?.email || session.customer_email || '';
      const total = (session.amount_total || 0) / 100;
      const subtotal = (session.amount_subtotal || 0) / 100;
      const shipping = total - subtotal;

      // Shipping address
      let shippingAddress = null;
      if (session.shipping_details?.address) {
        const s = session.shipping_details;
        shippingAddress = {
          name: s.name || '',
          address: s.address.line1 || '',
          address2: s.address.line2 || '',
          city: s.address.city || '',
          province: s.address.state || '',
          zip: s.address.postal_code || '',
          countryCode: s.address.country || 'US',
          country: s.address.country === 'US' ? 'United States' : (s.address.country || 'United States'),
          phone: s.phone || '',
        };
      }

      const orderPayload = {
        email,
        status: 'processing',
        total,
        shipping,
        subtotal,
        shipping_address: shippingAddress ? JSON.stringify(shippingAddress) : null,
        stripe_session_id: session.id,
      };

      console.log(`📦 Guardando orden: $${total} - ${email}`);

      // Supabase via REST
      const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(orderPayload),
      });

      if (!orderRes.ok) {
        const errText = await orderRes.text();
        throw new Error(`Supabase order error: ${orderRes.status}: ${errText.slice(0, 200)}`);
      }

      const savedOrders = await orderRes.json();
      const order = savedOrders[0];
      console.log(`✅ Orden guardada: ${order.id}`);

      // CJ SKU mapping
      const SKU_TO_VID = {
        "CJ-PM-CD": "1433302949299359744",
        "CJ-PM-VENT": "27894560-8C39-4B02-8475-50A90D1ABFD5",
        "CJ-PM-MAG": "07152307-79AB-4DBB-9F36-E9C0C69C52B3",
        "CJ-TRUNK-ORG": "2601190353581619600",
        "CJ-CC-36W": "1477534343592284160",
        "CJ-CC-30W": "1407983983391805440",
        "CJ-JS-2000A": "1631541129613160448",
        "CJ-JS-3000A": "2605070837001638800",
      };

      // Obtener line items
      const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items.data.price.product'],
      });
      const lineItems = expandedSession.line_items?.data || [];

      const cjProducts = [];

      for (const li of lineItems) {
        const product = li.price?.product || {};
        const productId = product.id || null;
        const itemName = li.description || product.name || 'Unknown';

        // Guardar order_item
        const itemPayload = {
          order_id: order.id,
          product_id: productId,
          name: itemName,
          price: (li.price?.unit_amount || 0) / 100,
          quantity: li.quantity || 1,
          image_url: (product.images && product.images[0]) || null,
        };

        await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(itemPayload),
        });
        console.log(`  ✅ Item: ${itemName} x${li.quantity}`);

        // Buscar SKU para CJ
        if (productId) {
          const prodRes = await fetch(
            `${SUPABASE_URL}/rest/v1/products?id=eq.${productId}&select=sku`,
            { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
          );
          const prods = await prodRes.json();
          const sku = Array.isArray(prods) && prods.length > 0 ? prods[0].sku : null;
          if (sku && SKU_TO_VID[sku]) {
            cjProducts.push({ vid: SKU_TO_VID[sku], quantity: li.quantity || 1, storeLineItemId: `KREID-${productId}-${Date.now().toString(36)}` });
          }
        }
      }

      // CJ Order
      if (cjProducts.length > 0 && shippingAddress) {
        try {
          const cjOrderNumber = `KREID-${order.id.slice(0, 8).toUpperCase()}-${Math.floor(Date.now() / 1000).toString(36).toUpperCase()}`;

          // CJ Token
          const tokenRes = await fetch('https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: CJ_API_KEY }),
          });
          const tokenData = await tokenRes.json();
          const cjToken = tokenData.data?.accessToken;

          if (!cjToken) throw new Error(`CJ auth failed: ${tokenData.message}`);

          // Crear orden en CJ
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

          const cjRes = await fetch('https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrderV3', {
            method: 'POST',
            headers: {
              'CJ-Access-Token': cjToken,
              'platformToken': cjToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(cjPayload),
          });
          const cjResult = await cjRes.json();
          console.log(`✅ CJ orden: ${cjResult.data?.cjOrderNumber}`);

          const cjOrderId = cjResult.data?.cjOrderId || cjResult.cjOrderId;

          // Guardar cj_order
          await fetch(`${SUPABASE_URL}/rest/v1/cj_orders`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({
              order_id: order.id,
              cj_order_id: cjOrderId || '',
              cj_order_number: cjResult.data?.cjOrderNumber || cjOrderNumber,
              cj_status: cjOrderId ? 'processing' : 'failed',
              logistic_name: 'CJPacket',
            }),
          });
          console.log(`✅ CJ sync completa para: ${order.id}`);
        } catch (cjErr) {
          console.error(`⚠️ CJ error (non-fatal): ${cjErr.message}`);
          await fetch(`${SUPABASE_URL}/rest/v1/cj_orders`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ order_id: order.id, cj_status: 'failed', error_log: cjErr.message }),
          });
        }
      }
    }

    return res.status(200).json({ received: true, type: event.type });
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    return res.status(200).json({ received: true, type: 'error', message: err.message });
  }
}
