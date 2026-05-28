import { Link } from 'react-router-dom'
import { CheckCircle, Package, ArrowRight } from 'lucide-react'

export default function Success() {
  return (
    <div className="success-page">
      <div className="container">
        <div className="success-card glass">
          <div className="success-icon">
            <CheckCircle size={64} />
          </div>
          <h1>Order Confirmed!</h1>
          <p className="success-message">
            Thank you for your purchase! We'll send you a confirmation email with your order details and tracking information.
          </p>
          <div className="success-details glass">
            <Package size={20} />
            <div>
              <p className="detail-label">Order Number</p>
              <p className="detail-value">KREID-{Date.now().toString(36).toUpperCase()}</p>
            </div>
          </div>
          <p className="success-eta">Estimated delivery: 3-7 business days</p>
          <div className="success-actions">
            <Link to="/products" className="btn btn-primary">
              Continue Shopping <ArrowRight size={18} />
            </Link>
            <Link to="/" className="btn btn-secondary">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
