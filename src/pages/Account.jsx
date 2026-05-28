import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { User, Package, Calendar, MapPin, ChevronRight, LogOut, Mail, Lock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, getMyOrders, signUp, signIn, signOut } from '../lib/supabase'

export default function Account() {
  const { user, loading } = useAuth()
  const [orders, setOrders] = useState([])
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authSuccess, setAuthSuccess] = useState(false)

  useEffect(() => {
    if (user) {
      getMyOrders(user.id).then(setOrders).catch(() => setOrders([]))
    }
  }, [user])

  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    try {
      if (isLogin) {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        setAuthSuccess(true)
      }
    } catch (err) {
      setAuthError(err.message)
    }
    setAuthLoading(false)
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  if (loading) return <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>Loading...</div>

  // ═══ NO AUTENTICADO: formulario de login ═══
  if (!user) {
    return (
      <div className="account-page">
        <div className="container">
          <div className="account-auth-box">
            <div className="account-auth-icon">
              <User size={36} />
            </div>
            <h2>{isLogin ? 'Welcome back' : 'Create your account'}</h2>
            <p className="account-auth-sub">
              {isLogin ? 'Sign in to view your orders and account details.' : 'Sign up to get 10% off your first order.'}
            </p>

            <form onSubmit={handleAuth} className="account-auth-form">
              <div className="auth-input-wrap">
                <Mail size={16} />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="form-input"
                />
              </div>
              <div className="auth-input-wrap">
                <Lock size={16} />
                <input
                  type="password"
                  placeholder="Password (min 6 characters)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="form-input"
                />
              </div>
              {authError && <p className="auth-error">{authError}</p>}
              {authSuccess && <p className="auth-success">Account created! Check your email to confirm. You can also try signing in.</p>}
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={authLoading}>
                {authLoading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <p className="auth-toggle">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button onClick={() => { setIsLogin(!isLogin); setAuthError(''); setAuthSuccess(false) }}>
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>

            <Link to="/" className="auth-back-link">Back to Home</Link>
          </div>
        </div>
      </div>
    )
  }

  // ═══ AUTENTICADO: panel de cuenta ═══
  const createdDate = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="account-page">
      <div className="container">
        <div className="account-header">
          <div className="account-avatar">{user.email[0].toUpperCase()}</div>
          <div className="account-user-info">
            <h1>{user.email}</h1>
            <p>Member since {createdDate}</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleSignOut}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        <div className="account-grid">
          <div className="account-card">
            <div className="account-card-header">
              <Package size={20} />
              <h2>My Orders</h2>
            </div>
            {orders.length === 0 ? (
              <div className="account-empty">
                <p>No orders yet</p>
                <Link to="/products" className="btn btn-primary btn-sm">Start Shopping</Link>
              </div>
            ) : (
              <div className="account-orders">
                {orders.map(order => (
                  <div key={order.id} className="account-order-item">
                    <div>
                      <p className="order-id">Order #{order.id}</p>
                      <p className="order-date">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`order-status ${order.status}`}>{order.status}</span>
                    <span className="order-total">${order.total?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="account-card">
            <div className="account-card-header">
              <MapPin size={20} />
              <h2>Shipping Info</h2>
            </div>
            <p className="account-muted">No shipping address saved yet.</p>
          </div>

          <div className="account-card">
            <div className="account-card-header">
              <Calendar size={20} />
              <h2>Account Details</h2>
            </div>
            <div className="account-detail-row">
              <span>Email</span>
              <span>{user.email}</span>
            </div>
            <div className="account-detail-row">
              <span>Member Since</span>
              <span>{createdDate}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
