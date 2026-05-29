import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CreditCard, Lock, ChevronLeft, Package, Shield, Clock } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { CURRENCY, SHIPPING_COST, FREE_SHIPPING_THRESHOLD } from '../lib/stripe'
import { trackBeginCheckout, trackPurchase } from '../lib/analytics'

export default function Checkout() {
  const { items, totalPrice } = useCart()
  const navigate = useNavigate()
  const [processing, setProcessing] = useState(false)
  const [purchaseTracked, setPurchaseTracked] = useState(false)
  const [form, setForm] = useState({
    email: '',
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
  })

  const shipping = totalPrice >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const total = totalPrice + shipping

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Track begin_checkout al cargar
  useEffect(() => {
    const checkoutItems = items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    }))
    trackBeginCheckout(checkoutItems, total)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setProcessing(true)
    if (!purchaseTracked) {
      trackPurchase('pending_' + Date.now(), items, total, shipping)
      setPurchaseTracked(true)
    }

    try {
      // Construir line items para Stripe Checkout Session
      const lineItems = items.map(item => ({
        price_data: {
          currency: CURRENCY.toLowerCase(),
          product_data: { name: item.name, images: [item.image] },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      }))

      // Stripe Checkout Session — SEGURO, PCI-DSS compliant
      // En Vercel, la función vive en el mismo dominio (/api/...)
      // En local, necesitas el servidor Stripe en otro puerto
      const apiUrl = import.meta.env.VITE_STRIPE_API_URL || '/api/create-checkout-session'
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_items: lineItems,
          shipping_cost: Math.round(shipping * 100),
          email: form.email,
          customer_name: form.name,
          success_url: `${window.location.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/checkout`,
          shipping_address: {
            name: form.name,
            line1: form.address,
            city: form.city,
            state: form.state,
            postal_code: form.zip,
            country: 'US',
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const { url } = await response.json()
      // Stripe Checkout redirige a stripe.com — el usuario paga allí y vuelve
      if (url) {
        window.location.href = url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err) {
      console.error('Checkout error:', err)
      alert(`❌ Error al procesar el pago: ${err.message}. Si estás en local, asegúrate de que el servidor Stripe esté corriendo en el puerto 3001.`)
      setProcessing(false)
    }
  }

  if (items.length === 0) {
    navigate('/cart')
    return null
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <Link to="/cart" className="back-link">
          <ChevronLeft size={20} /> Back to Cart
        </Link>

        <h1>Checkout</h1>

        <div className="checkout-content">
          <form className="checkout-form" onSubmit={handleSubmit}>
            <div className="form-section glass">
              <h2>Contact</h2>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-section glass">
              <h2>Shipping</h2>
              <div className="form-row">
                <input type="text" name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required className="form-input" />
              </div>
              <div className="form-row">
                <input type="text" name="address" placeholder="Address" value={form.address} onChange={handleChange} required className="form-input" />
              </div>
              <div className="form-row triple">
                <input type="text" name="city" placeholder="City" value={form.city} onChange={handleChange} required className="form-input" />
                <input type="text" name="state" placeholder="State" value={form.state} onChange={handleChange} required className="form-input" />
                <input type="text" name="zip" placeholder="ZIP Code" value={form.zip} onChange={handleChange} required className="form-input" />
              </div>
            </div>

            {/* ⚠️ NO CAPTURAMOS DATOS DE TARJETA — Stripe Elements se integra aparte */}
            <div className="form-section glass">
              <h2><CreditCard size={18} /> Payment</h2>
              <div className="secure-payment-placeholder">
                <Lock size={24} />
                <div>
                  <h3>Secure Payment via Stripe</h3>
                  <p>Your payment will be processed securely by Stripe. No card data touches our servers.</p>
                </div>
              </div>
              <div className="secure-badge">
                <Lock size={14} /> PCI-DSS Compliant — Powered by Stripe
              </div>
            </div>

            <button type="submit" className="btn btn-primary place-order-btn" disabled={processing}>
              {processing ? 'Redirecting to Stripe...' : `Pay $${total.toFixed(2)}`}
            </button>
          </form>

          <div className="cart-summary-box">
            <h2>Order Summary</h2>
            {items.map(item => (
              <div className="checkout-item-row" key={item.id}>
                <img src={item.image} alt={item.name} />
                <div className="checkout-item-info">
                  <p>{item.name}</p>
                  <span>Qty: {item.quantity}</span>
                </div>
                <span className="checkout-item-price-label">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="summary-divider" />
            <div className="summary-row">
              <span>Subtotal</span><span>${totalPrice.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span><span>{shipping === 0 ? <span className="free-shipping">FREE</span> : `$${shipping.toFixed(2)}`}</span>
            </div>
            <div className="summary-divider" />
            <div className="summary-row total">
              <span>Total</span><span>${total.toFixed(2)}</span>
            </div>
            <div className="summary-benefits">
              <div className="summary-benefit"><Shield size={14} /> 30-day guarantee</div>
              <div className="summary-benefit"><Clock size={14} /> Ships in 3-7 days</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
