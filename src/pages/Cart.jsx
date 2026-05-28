import { Link } from 'react-router-dom'
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Package, ChevronLeft, Truck, Shield, Clock, Star, Sparkles } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { CURRENCY, SHIPPING_COST, FREE_SHIPPING_THRESHOLD } from '../lib/stripe'

const related = [
  { id: '3', name: 'Noise Canceling Headphones', price: 89.99, original_price: 129.99, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80' },
  { id: '4', name: 'Portable Bluetooth Speaker', price: 79.99, original_price: 99.99, image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=200&q=80' },
]

export default function Cart() {
  const { items, removeItem, updateQuantity, totalPrice } = useCart()

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <div className="container">
          <div className="cart-empty-box">
            <div className="cart-empty-icon">
              <ShoppingCart size={48} />
            </div>
            <h2>Your cart is empty</h2>
            <p>Looks like you haven't added anything yet.</p>
            <Link to="/products" className="btn btn-primary">
              Start Shopping <ArrowRight size={18} />
            </Link>
          </div>

          <div className="cart-empty-related">
            <h3>You might like</h3>
            <div className="related-mini-grid">
              {related.map(r => (
                <Link to={`/products/${r.id}`} key={r.id} className="related-mini-card">
                  <img src={r.image} alt={r.name} />
                  <p>{r.name}</p>
                  <div className="related-price-row">
                    <span className="price-current">${r.price.toFixed(2)}</span>
                    <span className="price-original">${r.original_price.toFixed(2)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const shipping = totalPrice >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const total = totalPrice + shipping
  const progressPct = Math.min(100, (totalPrice / FREE_SHIPPING_THRESHOLD) * 100)

  return (
    <div className="cart-page">
      <div className="container">
        <div className="cart-header">
          <h1>Shopping Cart</h1>
          <span className="cart-count">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="cart-grid">
          {/* IZQUIERDA: ITEMS */}
          <div className="cart-items-col">
            <div className="cart-delivery-banner">
              <Truck size={16} /> 
              {shipping === 0 
                ? <span><strong>FREE Shipping</strong> on this order</span>
                : <span>Add <strong>${(FREE_SHIPPING_THRESHOLD - totalPrice).toFixed(2)}</strong> more for <strong>FREE Shipping</strong></span>
              }
            </div>

            {shipping > 0 && (
              <div className="cart-progress-box">
                <div className="cart-progress-bar">
                  <div className="cart-progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            )}

            <div className="cart-items-list">
              {items.map(item => (
                <div key={item.id} className="cart-item-row">
                  <div className="cart-item-img-wrap">
                    <img src={item.image} alt={item.name} />
                  </div>
                  <div className="cart-item-details">
                    <Link to={`/products/${item.id}`} className="cart-item-name">{item.name}</Link>
                    <div className="cart-item-price-line">
                      <span className="price-current">${item.price.toFixed(2)}</span>
                      <span className="cart-item-unit">/ unit</span>
                    </div>
                    <div className="cart-item-controls">
                      <div className="cart-item-qty">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>−</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                      </div>
                      <span className="cart-item-subtotal">${(item.price * item.quantity).toFixed(2)}</span>
                      <button className="cart-item-remove" onClick={() => removeItem(item.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="cart-item-stock">
                    <span className="stock-dot" /> In Stock
                  </div>
                </div>
              ))}
            </div>

            {/* Related products */}
            <div className="cart-related-section">
              <h3><Sparkles size={16} /> Add more to your order</h3>
              <div className="related-mini-grid">
                {related.map(r => (
                  <Link to={`/products/${r.id}`} key={r.id} className="related-mini-card">
                    <img src={r.image} alt={r.name} />
                    <p>{r.name}</p>
                    <div className="related-price-row">
                      <span className="price-current">${r.price.toFixed(2)}</span>
                      <span className="price-original">${r.original_price.toFixed(2)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* DERECHA: SUMMARY */}
          <div className="cart-summary-col">
            <div className="cart-summary-box">
              <h2>Order Summary</h2>
              
              <div className="summary-row">
                <span>Subtotal</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>{shipping === 0 ? <span className="free-shipping">FREE</span> : `$${shipping.toFixed(2)}`}</span>
              </div>
              <div className="summary-divider" />
              <div className="summary-row total">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              
              <div className="summary-benefits">
                <div className="summary-benefit"><Shield size={14} /> 30-day guarantee</div>
                <div className="summary-benefit"><Clock size={14} /> Ships in 3-7 days</div>
              </div>

              <Link to="/checkout" className="btn btn-primary checkout-btn">
                Proceed to Checkout <ArrowRight size={18} />
              </Link>
              <Link to="/products" className="continue-shopping">
                <ChevronLeft size={16} /> Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
