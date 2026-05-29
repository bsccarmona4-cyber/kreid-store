// 🕸️ KREID — Stripe Webhook (Vercel Serverless) v3
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

    const missing = [];
    if (!STRIPE_WEBHOOK_SECRET) missing.push('STRIPE_WEBHOOK_SECRET');
    if (!STRIPE_SECRET_KEY) missing.push('STRIPE_SECRET_KEY');
    if (!SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    if (!CJ_API_KEY) missing.push('CJ_API_KEY');

    if (missing.length > 0) {
      return res.status(200).json({ received: true, warning: `Missing: ${missing.join(', ')}` });
    }

    const sig = req.headers['stripe-signature'];
    if (!sig) {
      return res.status(200).json({ received: true, warning: 'Missing stripe-signature header' });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' });

    // Leer body raw
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);
    const event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
    console.log(`📨 Evento: ${event.type} | ID: ${event.id}`);

    // Manejar checkout completado (ambos tipos, síncrono y asíncrono)
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object;
      console.log(`🛒 Checkout: ${session.id} | Pago: $${(session.amount_total||0)/100}`);

      const email = session.customer_details?.email || session.customer_email || '';
      const total = parseFloat(session.amount_total || 0) / 100;
      const subtotal = parseFloat(session.amount_subtotal || 0) / 100;
      const shipping = total - subtotal;

      // Extraer shipping_address
      let shippingAddress = null;
      // Stripe a veces manda el shipping en customer_details.shipping o en shipping_details
      const sd = session.shipping_details || session.customer_details?.shipping;
      if (sd?.address) {
        shippingAddress = {
          name: sd.name || email.split('@')[0] || 'Customer',
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

      console.log(`📦 Guardando orden en Supabase...`);

      // POST a Supabase para crear la orden
      const orderPayload = {
        email,
        status: 'processing',
        total,
        shipping,
        subtotal,
        shipping_address: shippingAddress ? JSON.stringify(shippingAddress) : null,
        stripe_session_id: session.id,
      };

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
        const txt = await orderRes.text();
        console.error(`❌ Error guardando orden: ${orderRes.status}: ${txt.slice(0, 200)}`);
        return res.status(200).json({ received: true, warning: `Supabase error: ${txt.slice(0, 100)}` });
      }

      const savedOrders = await orderRes.json();
      const order = savedOrders[0];
      console.log(`✅ Orden: ${order.id}`);

      // Obtener line_items
      console.log(`📋 Obteniendo line_items de Stripe...`);
      let lineItems = [];
      try {
        const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['line_items.data.price.product'],
        });
        lineItems = fullSession.line_items?.data || [];
      } catch (e) {
        console.warn(`⚠️ No se pudieron obtener line_items de Stripe: ${e.message}`);
      }

      // SKU → VID mapping
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

      const cjProducts = [];

      for (const li of lineItems) {
        const product = li.price?.product || {};
        const productId = product.id || null;
        const itemName = li.description || product.name || 'Unknown Product';
        const itemPrice = parseFloat(li.price?.unit_amount || 0) / 100;
        const itemQty = li.quantity || 1;

        // Guardar order_item en Supabase
        const itemPayload = {
          order_id: order.id,
          product_id: productId,
          name: itemName,
          price: itemPrice,
          quantity: itemQty,
          image_url: (product.images && product.images[0]) || null,
        };

        try {
          await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(itemPayload),
          });
          console.log(`  ✅ Item: ${itemName} x${itemQty} = $${itemPrice}`);
        } catch (e) {
          console.warn(`  ⚠️ Error guardando item ${itemName}: ${e.message}`);
        }

        // Obtener SKU del producto desde Supabase
        if (productId) {
          try {
            const prodRes = await fetch(
              `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(productId)}&select=sku`,
              { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
            );
            const prods = await prodRes.json();
            const sku = Array.isArray(prods) && prods.length > 0 ? prods[0].sku : null;
            if (sku && SKU_TO_VID[sku]) {
              cjProducts.push({
                vid: SKU_TO_VID[sku],
                quantity: itemQty,
                storeLineItemId: `KREID-${productId}-${Date.now().toString(36)}`,
              });
              console.log(`  🚚 CJ ready: ${itemName} (SKU: ${sku})`);
            } else {
              console.log(`  ⚠️ Sin VID CJ para SKU: ${sku}`);
            }
          } catch (e) {
            console.warn(`  ⚠️ Error buscando SKU: ${e.message}`);
          }
        }
      }

      // Enviar a CJ
      if (cjProducts.length > 0 && shippingAddress) {
        try {
          const shortId = order.id.replace(/-/g, '').slice(0, 8).toUpperCase();
          const ts = Math.floor(Date.now() / 1000).toString(36).toUpperCase();
          const cjOrderNumber = `KREID-${shortId}-${ts}`;

          console.log(`🚀 Enviando ${cjProducts.length} producto(s) a CJ...`);

          // Obtener token CJ
          const tokenRes = await fetch(
            'https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey: CJ_API_KEY }),
            }
          );
          const tokenData = await tokenRes.json();
          const cjToken = tokenData.data?.accessToken;
          if (!cjToken) throw new Error(`CJ auth: ${tokenData.message}`);

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

          const cjRes = await fetch(
            'https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrderV3',
            {
              method: 'POST',
              headers: {
                'CJ-Access-Token': cjToken,
                'platformToken': cjToken,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(cjPayload),
            }
          );
          const cjResult = await cjRes.json();
          const cjOrderId = cjResult.data?.cjOrderId || cjResult.cjOrderId;
          const cjOrderNumberResp = cjResult.data?.cjOrderNumber || cjResult.cjOrderNumber || cjOrderNumber;

          if (cjOrderId) {
            console.log(`✅ CJ orden creada: ${cjOrderNumberResp} (ID: ${cjOrderId})`);
          } else {
            console.warn(`⚠️ CJ respuesta inesperada: ${JSON.stringify(cjResult).slice(0, 200)}`);
          }

          // Guardar en cj_orders
          const cjRecord = {
            order_id: order.id,
            cj_order_id: cjOrderId || '',
            cj_order_number: cjOrderNumberResp,
            cj_status: cjOrderId ? 'processing' : 'failed',
            logistic_name: 'CJPacket',
            error_log: cjOrderId ? null : (cjResult.message || 'No cjOrderId in response'),
          };

          await fetch(`${SUPABASE_URL}/rest/v1/cj_orders`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify(cjRecord),
          });
          console.log(`✅ CJ sync completa para orden ${order.id}`);
        } catch (cjErr) {
          console.error(`❌ Error CJ: ${cjErr.message}`);
          await fetch(`${SUPABASE_URL}/rest/v1/cj_orders`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              order_id: order.id,
              cj_status: 'failed',
              error_log: cjErr.message,
            }),
          }).catch(() => {});
        }
      } else {
        console.log(`ℹ️ CJ saltado: ${cjProducts.length === 0 ? 'sin productos mapeados' : 'sin dirección de envío'}`);
        if (cjProducts.length > 0 && !shippingAddress) {
          await fetch(`${SUPABASE_URL}/rest/v1/cj_orders`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              order_id: order.id,
              cj_status: 'failed',
              error_log: 'Sin dirección de envío',
            }),
          }).catch(() => {});
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error(`❌ Error general: ${err.message}`);
    return res.status(200).json({ received: true, error: err.message });
  }
}
