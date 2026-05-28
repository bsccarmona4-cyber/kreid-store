// 🏪 KREID — Stripe Checkout Session (Supabase Edge Function)
// Corre en Deno, no necesita servidor propio.
// Se activa cuando el usuario hace clic en "Pagar"

import { Stripe } from 'https://esm.sh/stripe@17.0.0?target=deno'
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

// ─── Config ───────────────────────────────────────
const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
const clientUrl = Deno.env.get('CLIENT_URL') || 'http://localhost:3000'

const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-02-24.acacia',
  httpClient: Stripe.createFetchHttpClient(),
})

// ─── CORS headers ─────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Solo aceptamos POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parsear body
    const { line_items, shipping_cost, email, customer_name, success_url, cancel_url } = await req.json()

    if (!line_items || line_items.length === 0) {
      return new Response(JSON.stringify({ error: 'No items in cart' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validar que los line_items tengan la estructura correcta
    for (const item of line_items) {
      if (!item.price_data || !item.price_data.currency || !item.price_data.unit_amount || !item.quantity) {
        return new Response(JSON.stringify({ error: 'Invalid line item structure' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Crear la sesión de checkout en Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email || undefined,
      line_items,
      shipping_options: [
        shipping_cost && shipping_cost > 0
          ? {
              shipping_rate_data: {
                type: 'fixed_amount',
                fixed_amount: { amount: shipping_cost, currency: 'usd' },
                display_name: 'Shipping',
                delivery_estimate: {
                  minimum: { unit: 'business_day', value: 5 },
                  maximum: { unit: 'business_day', value: 8 },
                },
              },
            }
          : {
              shipping_rate_data: {
                type: 'fixed_amount',
                fixed_amount: { amount: 0, currency: 'usd' },
                display_name: 'Free Shipping',
                delivery_estimate: {
                  minimum: { unit: 'business_day', value: 5 },
                  maximum: { unit: 'business_day', value: 8 },
                },
              },
            },
      ].filter(Boolean),
      success_url: success_url || `${clientUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${clientUrl}/checkout`,
      metadata: {
        customer_name: customer_name || '',
        source: 'kreid-store',
      },
    })

    console.log(`✅ Checkout session created: ${session.id} — $${(session.amount_total / 100).toFixed(2)}`)

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('❌ Stripe error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
