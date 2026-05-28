import '../styles/landing.css'
import { Link } from 'react-router-dom'
import { Star, Truck, Shield, Zap, Package, Sparkles, ChevronRight, ArrowRight, ShoppingCart } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useCart } from '../contexts/CartContext'

const heroProducts = [
  { id: 'phone-mount-cd', name: 'CD Slot Phone Mount', price: 33.35, original_price: null, rating: 4.6, reviews: 547, image: 'https://images.unsplash.com/photo-1617814065895-b17e6e3a41de?w=400&q=80', badge: null },
  { id: 'phone-mount-vent', name: 'Car Air Vent Phone Holder', price: 37.83, original_price: 44.99, rating: 4.7, reviews: 456, image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&q=80', badge: '-16%' },
  { id: 'car-trunk-organizer', name: 'Car Trunk Organizer', price: 26.12, original_price: 34.99, rating: 4.5, reviews: 429, image: 'https://images.unsplash.com/photo-1610647752706-3bb12232b3e4?w=400&q=80', badge: '-25%' },
  { id: 'car-charger-36w', name: 'Car Charger PD 36W', price: 33.38, original_price: 39.99, rating: 4.8, reviews: 394, image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&q=80', badge: '-17%' },
]

const bestsellers = [
  { id: 'phone-mount-cd', name: 'CD Slot Phone Mount', price: 33.35, original_price: null, rating: 4.6, reviews: 547, image: 'https://images.unsplash.com/photo-1617814065895-b17e6e3a41de?w=400&q=80', badge: 'Best Seller' },
  { id: 'car-charger-36w', name: 'Car Charger PD 36W', price: 33.38, original_price: 39.99, rating: 4.8, reviews: 394, image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&q=80', badge: 'Best Seller' },
  { id: 'phone-mount-vent', name: 'Car Air Vent Holder', price: 37.83, original_price: 44.99, rating: 4.7, reviews: 456, image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&q=80', badge: 'Popular' },
  { id: 'car-trunk-organizer', name: 'Car Trunk Organizer', price: 26.12, original_price: 34.99, rating: 4.5, reviews: 429, image: 'https://images.unsplash.com/photo-1610647752706-3bb12232b3e4?w=400&q=80', badge: 'Popular' },
  { id: 'phone-mount-magnetic', name: 'Magnetic Phone Holder', price: 43.57, original_price: 54.99, rating: 4.8, reviews: 321, image: 'https://images.unsplash.com/photo-1597773150796-e5c14ebecbf5?w=400&q=80', badge: 'Hot' },
  { id: 'car-charger-30w', name: 'Car Charger PD 30W', price: 29.71, original_price: null, rating: 4.7, reviews: 331, image: 'https://images.unsplash.com/photo-1596208132977-d37f7bf1b46e?w=400&q=80', badge: null },
]

const highTicket = [
  { id: 'jump-starter', name: 'Portable Jump Starter 2000A', price: 97.33, original_price: 129.99, rating: 4.9, reviews: 197, image: 'https://images.unsplash.com/photo-1611200945005-403b702294fd?w=400&q=80', badge: 'Premium' },
  { id: 'jump-starter-pro', name: 'Jump Starter Power Bank Pro', price: 118.80, original_price: 159.99, rating: 4.9, reviews: 194, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=80', badge: 'Premium' },
]

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const { addItem } = useCart()
  const intervalRef = useRef(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % heroProducts.length)
    }, 4000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const handleQuickAdd = (p, e) => {
    e.preventDefault()
    e.stopPropagation()
    addItem({ id: p.id, name: p.name, price: p.price, image: p.image, quantity: 1 })
  }

  return (
    <div className="home-page">
      {/* ═══ HERO SPLIT ═══ */}
      <section className="home-hero">
        <div className="container">
          <div className="hero-split">
            <div className="hero-left">
              <div className="hero-badge">🏆 Trusted by 500+ drivers</div>
              <h1>Gear Up Your<br />Ride for Less</h1>
              <p>Premium car accessories at unbeatable prices. Free shipping on orders over $45. Ships from US warehouse in 5-8 days.</p>
              <div className="hero-actions">
                <Link to="/products" className="btn btn-primary btn-lg">
                  Shop All <ArrowRight size={20} />
                </Link>
                <Link to="/products/jump-starter" className="btn btn-outline btn-lg">
                  View Bundles
                </Link>
              </div>
              <div className="hero-stats">
                <div className="hstat"><span className="hstat-val">1,200+</span><span className="hstat-lbl">Orders Shipped</span></div>
                <div className="hstat"><span className="hstat-val">4.7★</span><span className="hstat-lbl">Average Rating</span></div>
                <div className="hstat"><span className="hstat-val">Free Ship</span><span className="hstat-lbl">Over $45</span></div>
              </div>
            </div>
            <div className="hero-right">
              <Link to={`/products/${heroProducts[currentSlide].id}`} className="hero-spotlight">
                <div className="spotlight-badge">{heroProducts[currentSlide].badge || 'Top Pick'}</div>
                <img src={heroProducts[currentSlide].image} alt={heroProducts[currentSlide].name} />
                <div className="spotlight-info">
                  <h3>{heroProducts[currentSlide].name}</h3>
                  <div className="spotlight-price">
                    <span>${heroProducts[currentSlide].price.toFixed(2)}</span>
                    {heroProducts[currentSlide].original_price && (
                      <span className="price-original">${heroProducts[currentSlide].original_price.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="spotlight-cta">Shop Now →</div>
                </div>
              </Link>
              <div className="hero-dots">
                {heroProducts.map((_, i) => (
                  <span key={i} className={`hero-dot ${i === currentSlide ? 'active' : ''}`} onClick={() => setCurrentSlide(i)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="home-features">
        <div className="container">
          <div className="features-row">
            <div className="feature-item">
              <Truck size={32} />
              <h4>Free Shipping $45+</h4>
              <p>On all orders over $45</p>
            </div>
            <div className="feature-item">
              <Shield size={32} />
              <h4>30-Day Guarantee</h4>
              <p>Not happy? We'll fix it</p>
            </div>
            <div className="feature-item">
              <Package size={32} />
              <h4>US Warehouse</h4>
              <p>Ships in 5-8 days</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BESTSELLERS ═══ */}
      <section className="home-section">
        <div className="container">
          <div className="section-header-row">
            <div>
              <h2>🔥 Bestsellers</h2>
              <p className="section-sub">Our most popular car accessories</p>
            </div>
            <Link to="/products" className="btn btn-outline btn-sm">View All <ArrowRight size={16} /></Link>
          </div>
          <div className="products-grid">
            {bestsellers.map(p => (
              <Link to={`/products/${p.id}`} key={p.id} className="product-card">
                <div className="product-image-wrap">
                  <img src={p.image} alt={p.name} loading="lazy" />
                  {p.badge && <span className="product-badge">{p.badge}</span>}
                  <button className="quick-add-btn" onClick={(e) => handleQuickAdd(p, e)}>
                    <ShoppingCart size={16} />
                  </button>
                </div>
                <div className="product-info-pad">
                  <span className="product-card-category">Car Accessories</span>
                  <h3>{p.name}</h3>
                  <div className="rating-row">
                    <div className="stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={12} fill={i < Math.floor(p.rating) ? '#F59E0B' : 'none'} color="#F59E0B" strokeWidth={1.5} />
                      ))}
                    </div>
                    <span className="rating-value">{p.rating}</span>
                    <span className="rating-count">({p.reviews})</span>
                  </div>
                  <div className="price-row">
                    <span className="price-current">${p.price.toFixed(2)}</span>
                    {p.original_price && <span className="price-original">${p.original_price.toFixed(2)}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COMPLETE YOUR SETUP ═══ */}
      <section className="home-section home-section-dark">
        <div className="container">
          <div className="section-header-row">
            <div>
              <h2 style={{ color: 'var(--white)' }}>⚡ Complete Your Setup</h2>
              <p className="section-sub" style={{ color: 'var(--gray-400)' }}>Power up with premium jump starters</p>
            </div>
          </div>
          <div className="high-ticket-grid">
            {highTicket.map(p => (
              <Link to={`/products/${p.id}`} key={p.id} className="high-ticket-card">
                <div className="ht-badge">{p.badge}</div>
                <img src={p.image} alt={p.name} />
                <div className="ht-info">
                  <h3>{p.name}</h3>
                  <div className="rating-row">
                    <div className="stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={13} fill={i < Math.floor(p.rating) ? '#F59E0B' : 'none'} color="#F59E0B" strokeWidth={1.5} />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>({p.reviews})</span>
                  </div>
                  <div className="price-row" style={{ marginTop: 8, justifyContent: 'flex-start' }}>
                    <span className="price-current" style={{ fontSize: '1.2rem' }}>${p.price.toFixed(2)}</span>
                    {p.original_price && <span className="price-original">${p.original_price.toFixed(2)}</span>}
                  </div>
                  <p className="ht-desc">{p.id === 'jump-starter' ? '2000A peak — starts any 12V vehicle' : '3000A peak + 20,000mAh power bank'}</p>
                  <span className="ht-cta">Shop Now →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BUNDLES ═══ */}
      <section className="home-section">
        <div className="container">
          <div className="section-header-row">
            <div>
              <h2>🎯 Smart Bundles</h2>
              <p className="section-sub">Save more when you bundle</p>
            </div>
          </div>
          <div className="bundles-grid">
            <Link to="/products/phone-mount-cd" className="bundle-card">
              <div className="bundle-card-header">
                <span className="badge badge-red">Save $8</span>
                <h3>Road Trip Essential</h3>
              </div>
              <div className="bundle-items-preview">
                <div className="bundle-item-mini">
                  <img src="https://images.unsplash.com/photo-1617814065895-b17e6e3a41de?w=100&q=80" alt="" />
                  <span>Phone Mount</span>
                </div>
                <span className="bundle-plus">+</span>
                <div className="bundle-item-mini">
                  <img src="https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=100&q=80" alt="" />
                  <span>Car Charger</span>
                </div>
                <span className="bundle-plus">+</span>
                <div className="bundle-item-mini">
                  <img src="https://images.unsplash.com/photo-1610647752706-3bb12232b3e4?w=100&q=80" alt="" />
                  <span>Trunk Organizer</span>
                </div>
              </div>
              <div className="bundle-price-row">
                <span className="bundle-total">$84.99</span>
                <span className="bundle-original">$92.85</span>
                <span className="bundle-save">Save $8</span>
              </div>
              <span className="bundle-cta">View Bundle →</span>
            </Link>

            <Link to="/products/phone-mount-vent" className="bundle-card">
              <div className="bundle-card-header">
                <span className="badge badge-red">Save $8</span>
                <h3>Daily Driver</h3>
              </div>
              <div className="bundle-items-preview">
                <div className="bundle-item-mini">
                  <img src="https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=100&q=80" alt="" />
                  <span>Vent Mount</span>
                </div>
                <span className="bundle-plus">+</span>
                <div className="bundle-item-mini">
                  <img src="https://images.unsplash.com/photo-1596208132977-d37f7bf1b46e?w=100&q=80" alt="" />
                  <span>30W Charger</span>
                </div>
              </div>
              <div className="bundle-price-row">
                <span className="bundle-total">$59.99</span>
                <span className="bundle-original">$67.54</span>
                <span className="bundle-save">Save $8</span>
              </div>
              <span className="bundle-cta">View Bundle →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="home-section home-section-cta">
        <div className="container">
          <div className="cta-box">
            <h2>Ready to Upgrade Your Ride?</h2>
            <p>Premium car accessories, shipped from US warehouse. Free shipping over $45.</p>
            <div className="cta-buttons">
              <Link to="/products" className="btn btn-primary btn-lg">Shop All Products</Link>
              <Link to="/products/jump-starter" className="btn btn-outline btn-lg">View Jump Starters</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER SOCIAL ═══ */}
      <section className="home-section home-section-social" style={{ padding: '20px 0', background: 'var(--gray-50)' }}>
        <div className="container">
          <div className="social-bar">
            <span>🏆 Trusted by drivers across the US</span>
            <span>★ 4.7 average rating</span>
            <span>📦 Ships from US warehouse</span>
            <span>⚡ Free shipping over $45</span>
          </div>
        </div>
      </section>
    </div>
  )
}
