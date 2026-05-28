// 🎉 KREID — Página de éxito post-pago
// Esta es una página simple que se muestra después de un pago exitoso
// Se usa tanto en React Router (/success) como HTML estático (/success.html)

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, Package, Shield, Truck, Clock } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { trackPurchase } from '../lib/analytics'

export default function Success() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [countdown, setCountdown] = useState(15)
  const { items, totalPrice, clearCart } = useCart()

  // Track purchase + clear cart on mount
  useEffect(() => {
    if (sessionId && items.length > 0) {
      const shipping = totalPrice >= 45 ? 0 : 4.99
      trackPurchase(sessionId, items, totalPrice + shipping, shipping)
      clearCart()
    }
  }, [sessionId])

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

          <Link to="/" className="btn btn-primary btn-lg">
            Continue Shopping {countdown > 0 && `(${countdown}s)`}
          </Link>

          <p className="success-footer">
            Any questions? Contact us at support@kreid.com
          </p>
        </div>
      </div>
    </div>
  )
}
