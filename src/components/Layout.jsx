import { Outlet, Link, useLocation } from 'react-router-dom'
import { ShoppingCart, Menu, X, Package, User } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useCart } from '../contexts/CartContext'
import './Layout.css'

function AnnouncementBar() {
  return (
    <div className="announcement-bar">
      <div className="announcement-scroll">
        <span>🔥 FREE SHIPPING ON ORDERS OVER $45</span>
        <span className="sep">•</span>
        <span>⚡ SHIPS FROM US WAREHOUSE</span>
        <span className="sep">•</span>
        <span>🎉 30-DAY HAPPINESS GUARANTEE</span>
        <span className="sep">•</span>
        <span>🔥 FREE SHIPPING ON ORDERS OVER $45</span>
        <span className="sep">•</span>
        <span>⚡ SHIPS FROM US WAREHOUSE</span>
        <span className="sep">•</span>
        <span>🎉 30-DAY HAPPINESS GUARANTEE</span>
      </div>
    </div>
  )
}

function SocialProofPopup() {
  const [visible, setVisible] = useState(false)
  const [name, setName] = useState('')
  const [product, setProduct] = useState('')

  const names = ['Mike D.', 'Sarah K.', 'Tom B.', 'Alex W.', 'David H.', 'Laura M.', 'Jordan F.', 'Kevin J.']
  const products = ['CD Slot Phone Mount', 'Car Charger 36W', 'Air Vent Holder', 'Trunk Organizer', 'Jump Starter', 'Magnetic Mount']

  useEffect(() => {
    const show = () => {
      setName(names[Math.floor(Math.random() * names.length)])
      setProduct(products[Math.floor(Math.random() * products.length)])
      setVisible(true)
      setTimeout(() => setVisible(false), 4000)
    }
    const first = setTimeout(show, 5000)
    const interval = setInterval(() => {
      if (Math.random() > 0.4) show()
    }, 15000 + Math.random() * 15000)
    return () => { clearTimeout(first); clearInterval(interval) }
  }, [])

  if (!visible) return null

  return (
    <div className="social-proof-popup">
      <div className="proof-avatar">{name[0]}</div>
      <div className="proof-text">
        <p className="proof-name">{name}</p>
        <p className="proof-action">just purchased</p>
        <p className="proof-product">{product}</p>
      </div>
    </div>
  )
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [cartBounce, setCartBounce] = useState(false)
  const { items, totalPrice } = useCart()
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (items.length > 0) {
      setCartBounce(true)
      setTimeout(() => setCartBounce(false), 300)
    }
  }, [items.length])

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="layout">
      <AnnouncementBar />

      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container nav-inner">
          <Link to="/" className="nav-logo">
            <Package size={22} className="logo-icon" />
            <span className="logo-text">KREID</span>
          </Link>

          <div className="nav-links-desktop">
            <Link to="/products" className={isActive('/products') ? 'active' : ''}>Shop All</Link>
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Link>
          </div>

          <div className="nav-actions">
            <Link to="/cart" className="cart-link">
              <div className={`cart-icon ${cartBounce ? 'bounce' : ''}`}>
                <ShoppingCart size={20} />
                {items.length > 0 && (
                  <span className="cart-count-badge">{items.length}</span>
                )}
              </div>
              {totalPrice > 0 && (
                <span className="cart-total">${totalPrice.toFixed(2)}</span>
              )}
            </Link>
            <button
              className="menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="mobile-menu">
            <div className="container">
              <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
              <Link to="/products" onClick={() => setMenuOpen(false)}>Shop All</Link>
              <Link to="/cart" onClick={() => setMenuOpen(false)}>Cart {items.length > 0 && `(${items.length})`}</Link>
            </div>
          </div>
        )}
      </nav>

      <main className="main-content">
        <Outlet />
      </main>

      <SocialProofPopup />

      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <Package size={20} className="logo-icon" />
            <span>KREID</span>
          </div>
          <div className="footer-links">
            <Link to="/products">Shop All</Link>
            <Link to="/cart">Cart</Link>
            <Link to="/">Home</Link>
          </div>
          <p className="footer-text">Premium car accessories. Shipped from US warehouses. Free shipping over $45.</p>
          <p className="footer-copy">&copy; 2026 KREID. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
