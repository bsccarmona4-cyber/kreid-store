// 🎉 KREID — Página de éxito post-pago
import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, Package, Shield, Truck, Clock } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { trackPurchase } from '../lib/analytics'

export default function Success() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const { items, totalPrice, clearCart } = useCart()

  // Track purchase + LIMPIAR CARRITO al montar
  useEffect(() => {
    // Siempre limpiar el carrito al llegar a Success
    if (sessionId && items.length > 0) {
      const shipping = totalPrice >= 45 ? 0 : 4.99
      trackPurchase(sessionId, items, totalPrice + shipping, shipping)
    }
    // Limpiar carrito pase lo que pase
    clearCart()
    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, []) // Solo al montar la página

  return (
    <div className="success-page">
      <div className="container">
        <div className="success-card">
          <div className="success-icon-wrap">
            <CheckCircle size={64} strokeWidth={1.5} />
          </div>

          <h1>Payment Successful! 🎉</h1>
          <p className="success-subtitle">Thank you for your order. Your payment has been processed successfully.</p>

          {sessionId && (
            <div className="success-order-id">
              Order: {sessionId.replace('cs_test_', '#')}
            </div>
          )}

          <p className="success-email-note">
            You'll receive a confirmation email shortly with your order details.
          </p>

          <p className="success-webhook-note">
            <small>🪝 Your order has been saved — check your <Link to="/account">Account</Link> for updates.</small>
          </p>

          <div className="success-benefits">
            <div className="success-benefit">
              <Package size={18} />
              <span>Ships in 5-8 business days</span>
            </div>
            <div className="success-benefit">
              <Shield size={18} />
              <span>30-day satisfaction guarantee</span>
            </div>
            <div className="success-benefit">
              <Truck size={18} />
              <span>Free shipping on orders $45+</span>
            </div>
            <div className="success-benefit">
              <Clock size={18} />
              <span>Tracking info sent to your email</span>
            </div>
          </div>

          <Link to="/" className="btn btn-primary btn-lg" onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}>
            Continue Shopping
          </Link>

          <p className="success-footer">
            Any questions? Contact us at support@kreid.com
          </p>
        </div>
      </div>
    </div>
  )
}
