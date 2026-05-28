import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CreditCard, Lock, ChevronLeft, Package, Shield, Clock } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { CURRENCY, SHIPPING_COST, FREE_SHIPPING_THRESHOLD } from '../lib/stripe'

export default function Checkout() {
  const { items, totalPrice } = useCart()
  const navigate = useNavigate()
  const [processing, setProcessing] = useState(false)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setProcessing(true)

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

      // Llamar a tu backend/serverless function para crear la Checkout Session
      // Por ahora, redirigimos a un placeholder de Stripe
      // En producción, necesitas un endpoint que cree la sesión con Stripe secret key
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_items: lineItems,
          shipping_cost: Math.round(shipping * 100),
          email: form.email,
          customer_name: form.name,
          success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/checkout`,
        }),
      })

      if (!response.ok) throw new Error('Failed to create checkout session')

      const { url } = await response.json()
      // Stripe Checkout Session redirect — SEGURO, PCI-DSS compliant
      window.location.href = url
    } catch (err) {
      console.error('Checkout error:', err)
      // Fallback: mostrar mensaje de que Stripe Checkout se configurará después
      alert('🛒 Stripe Checkout Session próximamente. Por ahora, este es un placeholder seguro.')
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
