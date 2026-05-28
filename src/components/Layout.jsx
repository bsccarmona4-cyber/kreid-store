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



export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [cartBounce, setCartBounce] = useState(false)
  const { items, totalItems, totalPrice } = useCart()
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
            <Link to="/account" className="nav-account-icon" title="My Account">
              <User size={20} />
            </Link>
            <Link to="/cart" className="cart-link">
              <div className={`cart-icon ${cartBounce ? 'bounce' : ''}`}>
                <ShoppingCart size={20} />
                {totalItems > 0 && (
                  <span className="cart-count-badge">{totalItems}</span>
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
              <Link to="/account" onClick={() => setMenuOpen(false)}>My Account</Link>
              <Link to="/cart" onClick={() => setMenuOpen(false)}>Cart {totalItems > 0 && `(${totalItems})`}</Link>
            </div>
          </div>
        )}
      </nav>

      <main className="main-content">
        <Outlet />
      </main>



      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <Package size={20} className="logo-icon" />
            <span>KREID</span>
          </div>
          <div className="footer-links">
            <Link to="/products">Shop All</Link>
            <Link to="/account">My Account</Link>
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
