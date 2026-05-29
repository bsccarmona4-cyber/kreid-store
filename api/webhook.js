// KREID Stripe Webhook v8 - Sin verificación de firma
import Stripe from 'stripe';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const SU = process.env.SUPABASE_URL;
    const SAK = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const SK = process.env.STRIPE_SECRET_KEY;
    const WS = process.env.STRIPE_WEBHOOK_SECRET;
    const CJK = process.env.CJ_API_KEY;

    if (!SU || !SAK) return res.status(200).json({ ok: false, error: 'missing supabase' });

    const buf = [];
    for await (const c of req) buf.push(c);
    const rawBody = Buffer.concat(buf);

    let event;
    const sig = req.headers['stripe-signature'];

    if (sig && WS && SK) {
      const stripe = new Stripe(SK, { apiVersion: '2025-02-24.acacia' });
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, WS);
      } catch (e) {
        console.error('Signature error:', e.message);
        return res.status(200).json({ ok: false, sigError: e.message });
      }
    } else {
      try {
        event = JSON.parse(rawBody.toString());
        if (!event.type) throw new Error('no type');
      } catch (e) {
        return res.status(200).json({ ok: false, error: 'invalid body' });
      }
    }

    const eventType = event.type;
    console.log(`Event: ${eventType}`);

    if (eventType === 'checkout.session.completed' || eventType === 'checkout.session.async_payment_succeeded') {
      const s = event.data?.object;
      if (!s) return res.status(200).json({ ok: false, error: 'no session' });

      console.log(`Session: ${s.id} | Total: ${s.amount_total}`);

      const email = s.customer_details?.email || s.customer_email || '';

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
          country: sd.address.country === 'US' ? 'United States' : sd.address.country,
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
        console.error(`Order error: ${or.status}: ${txt.slice(0,200)}`);
        return res.status(200).json({ ok: false, error: `order: ${or.status}` });
      }

      const order = (await or.json())[0];
      console.log(`✅ Order: ${order.id} | Email: ${email} | Ship: ${sa ? 'YES' : 'NO'}`);

      let items = s.line_items?.data || [];

      if (items.length === 0 && SK && s.id) {
        try {
          const stripe = new Stripe(SK, { apiVersion: '2025-02-24.acacia' });
          const fs = await stripe.checkout.sessions.retrieve(s.id, {
            expand: ['line_items.data.price.product'],
          });
          items = fs.line_items?.data || [];
          console.log(`Items via Stripe API: ${items.length}`);
        } catch (e) {
          console.error(`Stripe API items error: ${e.message}`);
        }
      }

      for (const li of items) {
        const p = li.price?.product || {};
        const pid = typeof p === 'string' ? p : (p.id || null);
        await h('POST', '/rest/v1/order_items', {
          order_id: order.id, product_id: pid,
          name: li.description || 'Product',
          price: (li.price?.unit_amount || 0) / 100,
          quantity: li.quantity || 1,
        }).catch(e => console.error(`Item error: ${e.message}`));
      }
      console.log(`✅ Items saved: ${items.length}`);

      // CJ Sync - enviar orden a CJ
      if (items.length > 0 && sa && CJK) {
        try {
          const tr = await fetch('https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: CJK }),
          });
          const td = await tr.json();
          const cjToken = td.data?.accessToken;

          if (cjToken) {
            const sha = JSON.parse(sa);
            const cjProducts = [];
            const SKU2VID = {
              "CJ-PM-CD": "1433302949299359744", "CJ-PM-VENT": "27894560-8C39-4B02-8475-50A90D1ABFD5",
              "CJ-PM-MAG": "07152307-79AB-4DBB-9F36-E9C0C69C52B3", "CJ-TRUNK-ORG": "2601190353581619600",
              "CJ-CC-36W": "1477534343592284160", "CJ-CC-30W": "1407983983391805440",
              "CJ-JS-2000A": "1631541129613160448", "CJ-JS-3000A": "2605070837001638800",
            };

            for (const li of items) {
              const p = li.price?.product || {};
              const pid = typeof p === 'string' ? p : (p.id || null);
              if (pid) {
                const pr = await h('GET', `/rest/v1/products?id=eq.${encodeURIComponent(pid)}&select=sku`);
                if (pr.ok) {
                  const prods = await pr.json();
                  const sku = Array.isArray(prods) && prods[0]?.sku;
                  if (sku && SKU2VID[sku]) {
                    cjProducts.push({
                      vid: SKU2VID[sku],
                      quantity: li.quantity || 1,
                      storeLineItemId: `${pid}-${Date.now().toString(36)}`,
                    });
                  }
                }
              }
            }

            if (cjProducts.length > 0) {
              const shortId = order.id.replace(/-/g, '').slice(0, 8).toUpperCase();
              const ts = Math.floor(Date.now() / 1000).toString(36).toUpperCase();
              const cjPayload = {
                orderNumber: `KREID-${shortId}-${ts}`,
                shippingCountryCode: sha.countryCode || 'US',
                shippingCountry: sha.country || 'United States',
                shippingProvince: sha.province || '',
                shippingCity: sha.city || '',
                shippingAddress: sha.address || '',
                shippingAddress2: sha.address2 || '',
                shippingZip: sha.zip || '',
                shippingCustomerName: sha.name || '',
                shippingPhone: sha.phone || '',
                email, logisticName: 'CJPacket', fromCountryCode: 'CN', isSandbox: 0,
                products: cjProducts,
              };

              const cjRes = await fetch('https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrderV3', {
                method: 'POST',
                headers: { 'CJ-Access-Token': cjToken, 'platformToken': cjToken, 'Content-Type': 'application/json' },
                body: JSON.stringify(cjPayload),
              });
              const cjD = await cjRes.json();
              const cjId = cjD.data?.cjOrderId || cjD.cjOrderId;
              await h('POST', '/rest/v1/cj_orders', {
                order_id: order.id, cj_order_id: cjId || '',
                cj_order_number: cjD.data?.cjOrderNumber || cjD.cjOrderNumber || '',
                cj_status: cjId ? 'processing' : 'failed',
                logistic_name: 'CJPacket',
              });
              console.log(`✅ CJ: ${cjD.data?.cjOrderNumber || 'N/A'}`);
            }
          }
        } catch (e) {
          console.error(`CJ error: ${e.message}`);
          await h('POST', '/rest/v1/cj_orders', { order_id: order.id, cj_status: 'failed', error_log: e.message }).catch(() => {});
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(`Fatal: ${e.message}`);
    return res.status(200).json({ ok: false, error: e.message });
  }
}
