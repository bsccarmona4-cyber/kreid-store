// 🕸️ KREID — Stripe Webhook (Vercel Serverless)
// Endpoint: POST /api/webhook
// Escucha eventos de Stripe: checkout.session.completed, checkout.session.expired
// Guarda órdenes en Supabase y envía a CJ Dropshipping DIRECTAMENTE (sin Python)
//
// Variables de entorno requeridas:
//   STRIPE_SECRET_KEY          — sk_live_xxx o sk_test_xxx
//   STRIPE_WEBHOOK_SECRET      — whsec_xxx (para verificar firma)
//   SUPABASE_URL               — https://tvntylcgdjvgvvjcavkp.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  — service_role key de Supabase
//   CJ_API_KEY                 — CJ5454517@api@... (la API key de CJ)
//   CLIENT_URL                 — opcional

// ─── Config ──────────────────────────────────────
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const CJ_API_KEY = process.env.CJ_API_KEY || "CJ5454517@api@80a329ca12224b7b95e2174b2f5ca5e8";
const CLIENT_URL = process.env.CLIENT_URL || "https://goose-dropshipping.vercel.app";

// ─── CJ API Constants ────────────────────────────
const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
const SKU_TO_VID = {
  "CJ-PM-CD":     "1433302949299359744",
  "CJ-PM-VENT":   "27894560-8C39-4B02-8475-50A90D1ABFD5",
  "CJ-PM-MAG":    "07152307-79AB-4DBB-9F36-E9C0C69C52B3",
  "CJ-TRUNK-ORG": "2601190353581619600",
  "CJ-CC-36W":    "1477534343592284160",
  "CJ-CC-30W":    "1407983983391805440",
  "CJ-JS-2000A":  "1631541129613160448",
  "CJ-JS-3000A":  "2605070837001638800",
};

// ─── Helpers ─────────────────────────────────────

/** Fetch helper para llamar a Supabase REST API */
async function supabaseFetch(method, endpoint, body = null) {
  const url = `${SUPABASE_URL}${endpoint}`;
  const headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
  if (method === 'POST' || method === 'PATCH') {
    headers['Prefer'] = 'return=representation';
  }
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase ${method} ${endpoint} → ${res.status}: ${errText.slice(0, 200)}`);
  }
  return res.json();
}

/** Obtener token de acceso a CJ */
let cjTokenCache = { token: null, expiresAt: 0 };

async function getCjToken() {
  if (cjTokenCache.token && Date.now() < cjTokenCache.expiresAt - 300000) {
    return cjTokenCache.token;
  }
  console.log('🔑 Obteniendo token CJ...');
  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: CJ_API_KEY }),
  });
  const data = await res.json();
  if (data.code !== 10000 && data.code !== '10000') {
    throw new Error(`CJ auth error: ${data.message}`);
  }
  cjTokenCache = {
    token: data.data.accessToken,
    expiresAt: Date.now() + 7000000,
  };
  console.log(`✅ Token CJ obtenido: ${cjTokenCache.token.slice(0, 20)}...`);
  return cjTokenCache.token;
}

/** Crear orden en CJ Dropshipping via createOrderV3 */
async function createCjOrder(orderNumber, shippingInfo, products) {
  const token = await getCjToken();
  const payload = {
    orderNumber,
    shippingCountryCode: shippingInfo.countryCode || 'US',
    shippingCountry: shippingInfo.country || 'United States',
    shippingProvince: shippingInfo.province || '',
    shippingCity: shippingInfo.city || '',
    shippingAddress: shippingInfo.address || '',
    shippingAddress2: shippingInfo.address2 || '',
    shippingZip: shippingInfo.zip || '',
    shippingCustomerName: shippingInfo.name || '',
    shippingPhone: shippingInfo.phone || '',
    email: shippingInfo.email || '',
    logisticName: shippingInfo.logistic || 'CJPacket',
    fromCountryCode: 'CN',
    isSandbox: 0, // PRODUCCIÓN
    products: products.map(p => ({
      vid: p.vid,
      quantity: p.quantity,
      storeLineItemId: p.storeLineItemId,
    })),
  };

  console.log(`📦 Enviando orden a CJ: ${orderNumber}`);
  const res = await fetch(`${CJ_BASE}/shopping/order/createOrderV3`, {
    method: 'POST',
    headers: {
      'CJ-Access-Token': token,
      'platformToken': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  if (data.code !== 10000 && data.code !== '10000' && data.code !== 20002 && data.code !== '20002') {
    throw new Error(`CJ createOrder error: ${data.message || JSON.stringify(data)}`);
  }
  console.log(`✅ Orden CJ creada: ${data.data?.cjOrderNumber} [ID: ${data.data?.cjOrderId}]`);
  return data.data || data;
}

/** Pagar orden en CJ */
async function payCjOrder(cjOrderId) {
  const token = await getCjToken();
  const res = await fetch(`${CJ_BASE}/shopping/pay/payBalanceV2`, {
    method: 'POST',
    headers: {
      'CJ-Access-Token': token,
      'platformToken': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ orderId: cjOrderId }),
  });
  const data = await res.json();
  if (data.code === 10000 || data.code === '10000') {
    console.log(`💳 Orden CJ pagada: ${cjOrderId}`);
  } else {
    console.log(`⚠️ Pago CJ: ${data.message || 'ya pagada o no requiere pago'}`);
  }
  return data;
}

/** Obtener detalle de orden CJ (tracking) */
async function getCjOrderDetail(cjOrderId) {
  const token = await getCjToken();
  const res = await fetch(`${CJ_BASE}/shopping/order/getOrderDetail?orderId=${cjOrderId}`, {
    headers: {
      'CJ-Access-Token': token,
      'platformToken': token,
    },
  });
  const data = await res.json();
  return data.data || data;
}

/** Obtener los line_items expandidos de una sesión de Stripe */
async function getExpandedLineItems(stripe, sessionId) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items.data.price.product'],
  });
  return session.line_items?.data || [];
}

/** Buscar SKU de producto desde Supabase por product_id */
async function getProductSku(productId) {
  try {
    const products = await supabaseFetch(
      'GET',
      `/rest/v1/products?id=eq.${encodeURIComponent(productId)}&select=sku&limit=1`
    );
    if (Array.isArray(products) && products.length > 0) {
      return products[0].sku;
    }
  } catch (e) {
    console.log(`⚠️ No se pudo obtener SKU para ${productId}: ${e.message}`);
  }
  return null;
}

/** Extraer datos de shipping de la sesión de Stripe */
function extractShippingAddress(session) {
  const sd = session.shipping_details;
  if (!sd?.address) return null;
  return {
    name: sd.name || '',
    address: sd.address.line1 || '',
    address2: sd.address.line2 || '',
    city: sd.address.city || '',
    province: sd.address.state || '',
    zip: sd.address.postal_code || '',
    countryCode: sd.address.country || 'US',
    country: sd.address.country === 'US' ? 'United States' : sd.address.country || 'United States',
    phone: sd.phone || '',
  };
}

/** Generar ID único para orden en CJ */
function generateCjOrderNumber(orderId) {
  const shortId = orderId.replace(/-/g, '').slice(0, 8).toUpperCase();
  const ts = Math.floor(Date.now() / 1000).toString(36).toUpperCase();
  return `KREID-${shortId}-${ts}`;
}

/** Obtener VID de CJ para un producto */
function getCjVid(sku) {
  const vid = SKU_TO_VID[sku];
  if (!vid) {
    throw new Error(`SKU '${sku}' no tiene VID mapeado. SKUs disponibles: ${Object.keys(SKU_TO_VID).join(', ')}`);
  }
  return vid;
}

// ─── Handlers de eventos ─────────────────────────

/** Manejar checkout.session.completed */
async function handleCheckoutCompleted(stripe, session) {
  const sessionId = session.id;
  console.log(`🛒 Checkout completed: ${sessionId}`);

  // 1. Extraer datos del cliente y shipping
  const email = session.customer_details?.email || session.customer_email || '';
  const shippingAddress = extractShippingAddress(session);

  // 2. Intentar obtener line items expandidos
  let lineItems;
  try {
    lineItems = await getExpandedLineItems(stripe, sessionId);
  } catch (err) {
    console.error('❌ Error fetching line items:', err.message);
    lineItems = session.line_items?.data || [];
  }
  console.log(`📦 ${lineItems.length} items en la orden`);

  // 3. Calcular totales
  const subtotal = (session.amount_subtotal || 0) / 100;
  const total = (session.amount_total || 0) / 100;
  const shipping = session.shipping_cost
    ? ((session.shipping_cost.amount_total || 0) - (session.shipping_cost.amount_tax || 0)) / 100
    : 0;

  // 4. Guardar orden en Supabase
  let supabaseOrder;
  try {
    const orderPayload = {
      email,
      status: 'processing',
      total,
      shipping,
      subtotal,
      shipping_address: shippingAddress ? JSON.stringify(shippingAddress) : null,
      stripe_session_id: sessionId,
      user_id: session.metadata?.user_id || null,
    };
    const orders = await supabaseFetch('POST', '/rest/v1/orders', orderPayload);
    supabaseOrder = orders[0];
    console.log(`✅ Orden guardada en Supabase: ${supabaseOrder.id} — $${total.toFixed(2)}`);
  } catch (err) {
    console.error('❌ Error guardando orden:', err.message);
    throw err;
  }

  // 5. Guardar order_items y recolectar datos para CJ
  const cjProducts = [];
  for (const li of lineItems) {
    const product = li.price?.product || {};
    const productId = product.id || null;
    const itemName = li.description || product.name || 'Unknown Product';
    const itemPrice = (li.price?.unit_amount || 0) / 100;
    const itemQuantity = li.quantity || 1;

    // Guardar order_item
    const itemPayload = {
      order_id: supabaseOrder.id,
      product_id: productId,
      name: itemName,
      price: itemPrice,
      quantity: itemQuantity,
      image_url: (product.images && product.images[0]) || null,
    };
    try {
      await supabaseFetch('POST', '/rest/v1/order_items', itemPayload);
      console.log(`  ✅ Item: ${itemName} x${itemQuantity}`);
    } catch (err) {
      console.error(`  ⚠️ Error guardando item ${itemName}: ${err.message}`);
    }

    // Preparar para CJ - buscar SKU
    let sku = null;
    if (productId) {
      sku = await getProductSku(productId);
    }
    if (!sku) {
      // Intentar extraer de metadata o usar el ID del producto como fallback
      sku = product.metadata?.sku || productId || null;
    }

    if (sku && SKU_TO_VID[sku]) {
      cjProducts.push({
        vid: SKU_TO_VID[sku],
        quantity: itemQuantity,
        storeLineItemId: `KREID-${productId || 'unknown'}-${Date.now().toString(36)}`,
        name: itemName,
      });
    } else {
      console.log(`  ⚠️ Producto sin mapeo CJ: ${itemName} (SKU: ${sku})`);
    }
  }

  // 6. Enviar a CJ Dropshipping si hay productos mapeados
  if (cjProducts.length > 0 && shippingAddress) {
    try {
      const cjOrderNumber = generateCjOrderNumber(supabaseOrder.id);
      const shippingInfo = {
        ...shippingAddress,
        email,
        logistic: 'CJPacket',
      };

      console.log(`\n🚀 Enviando a CJ Dropshipping (${cjProducts.length} productos)...`);
      const cjResult = await createCjOrder(cjOrderNumber, shippingInfo, cjProducts);

      const cjOrderId = cjResult.cjOrderId || cjResult.data?.cjOrderId;
      const cjOrderNumberResp = cjResult.cjOrderNumber || cjResult.data?.cjOrderNumber;

      // Guardar en cj_orders
      let trackingNumber = '', trackingUrl = '', logisticName = 'CJPacket';

      if (cjOrderId) {
        try {
          // Esperar un poco y obtener detalle
          await new Promise(r => setTimeout(r, 2000));
          const detail = await getCjOrderDetail(cjOrderId);
          trackingNumber = detail.trackNumber || detail.data?.trackNumber || '';
          trackingUrl = detail.trackUrl || detail.data?.trackUrl || '';
          logisticName = detail.logisticName || detail.data?.logisticName || 'CJPacket';
          if (trackingNumber) console.log(`📬 Tracking: ${trackingNumber}`);
        } catch (e) {
          console.log(`⚠️ Tracking no disponible inmediato: ${e.message}`);
        }

        // Pagar la orden
        try {
          await payCjOrder(cjOrderId);
        } catch (e) {
          console.log(`⚠️ Pago CJ: ${e.message}`);
        }
      }

      await supabaseFetch('POST', '/rest/v1/cj_orders', {
        order_id: supabaseOrder.id,
        cj_order_id: cjOrderId || '',
        cj_order_number: cjOrderNumberResp || cjOrderNumber,
        cj_status: cjOrderId ? 'processing' : 'failed',
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        logistic_name: logisticName,
        error_log: null,
      });
      console.log(`✅ CJ Sync completa para orden ${supabaseOrder.id}`);
    } catch (err) {
      console.error(`❌ Error enviando a CJ: ${err.message}`);
      // Guardar error pero no fallar - la orden ya se guardó
      try {
        await supabaseFetch('POST', '/rest/v1/cj_orders', {
          order_id: supabaseOrder.id,
          cj_status: 'failed',
          error_log: err.message,
        });
      } catch (_) { /* ignore */ }
    }
  } else if (cjProducts.length > 0 && !shippingAddress) {
    console.log(`⚠️ Orden sin shipping address - CJ no puede procesar`);
    try {
      await supabaseFetch('POST', '/rest/v1/cj_orders', {
        order_id: supabaseOrder.id,
        cj_status: 'failed',
        error_log: 'Missing shipping address',
      });
    } catch (_) { /* ignore */ }
  } else {
    console.log(`ℹ️ Ningún producto tiene mapeo CJ - orden guardada sin CJ`);
  }

  return { orderId: supabaseOrder.id };
}

/** Manejar checkout.session.expired */
async function handleCheckoutExpired(session) {
  const sessionId = session.id;
  console.log(`⏰ Checkout expirado: ${sessionId}`);
  try {
    await supabaseFetch(
      'PATCH',
      `/rest/v1/orders?stripe_session_id=eq.${encodeURIComponent(sessionId)}`,
      { status: 'cancelled' }
    );
    console.log(`✅ Orden cancelada: ${sessionId}`);
  } catch (err) {
    console.log(`ℹ️ Orden no encontrada para sesión expirada ${sessionId}`);
  }
}

// ─── Handler principal ───────────────────────────

// ─── Helper para leer body raw ────────────────────
function readBody(req) {
  return new Promise((resolve) => {
    if (req.body) {
      // Si Vercel ya parseó el body, lo serializamos de vuelta
      resolve(Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body)));
      return;
    }
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

export default async function handler(req, res) {
  // ─── CORS ──────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, stripe-signature');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ─── Validar configuración ─────────────────────
  const missing = [];
  if (!STRIPE_WEBHOOK_SECRET) missing.push('STRIPE_WEBHOOK_SECRET');
  if (!STRIPE_SECRET_KEY) missing.push('STRIPE_SECRET_KEY');
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  if (missing.length > 0) {
    console.error(`❌ Variables faltantes: ${missing.join(', ')}`);
    return res.status(500).json({ error: `Missing env: ${missing.join(', ')}` });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' });

  // ─── 1. Verificar firma de Stripe ──────────────
  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).json({ error: 'Missing stripe-signature header' });

  let event;
  try {
    const rawBody = await readBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Firma inválida:', err.message);
    return res.status(400).json({ error: `Invalid signature: ${err.message}` });
  }

  console.log(`📨 Evento Stripe: ${event.type} [${event.id}]`);

  // ─── 2. Manejar el evento ──────────────────────
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const result = await handleCheckoutCompleted(stripe, session);
        console.log(`✅ Flujo completo para orden ${result.orderId}`);
        break;
      }
      case 'checkout.session.expired': {
        await handleCheckoutExpired(event.data.object);
        break;
      }
      default: {
        console.log(`ℹ️ Evento no manejado: ${event.type}`);
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error(`❌ Error procesando ${event.type}: ${err.message}`);
    return res.status(200).json({ received: true, warning: err.message });
  }
}
