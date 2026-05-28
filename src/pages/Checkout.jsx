import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CreditCard, Lock, ChevronLeft, Package, Shield, Clock } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { CURRENCY, SHIPPING_COST, FREE_SHIPPING_THRESHOLD } from '../lib/stripe'

export default function Checkout() {
  const { items, totalPrice, clearCart } = useCart()
  const navigate = useNavigate()
  const [processing, setProcessing] = useState(false)
  const [form, setForm] = useState({
    email: '',
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    card: '',
    exp: '',
    cvc: ''
  })

  const shipping = totalPrice >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const total = totalPrice + shipping

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setProcessing(true)

    // Simular proceso de pago (Stripe real se configurará después)
    await new Promise(r => setTimeout(r, 2000))

    clearCart()
    navigate('/success')
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

            <div className="form-section glass">
              <h2><CreditCard size={18} /> Payment</h2>
              <div className="form-row">
                <input type="text" name="card" placeholder="Card Number" maxLength="19" value={form.card} onChange={handleChange} required className="form-input" />
              </div>
              <div className="form-row double">
                <input type="text" name="exp" placeholder="MM/YY" maxLength="5" value={form.exp} onChange={handleChange} required className="form-input" />
                <input type="text" name="cvc" placeholder="CVC" maxLength="4" value={form.cvc} onChange={handleChange} required className="form-input" />
              </div>
              <div className="secure-badge">
                <Lock size={14} /> Secure payment with Stripe
              </div>
            </div>

            <button type="submit" className="btn btn-primary place-order-btn" disabled={processing}>
              {processing ? 'Processing...' : `Pay $${total.toFixed(2)}`}
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
