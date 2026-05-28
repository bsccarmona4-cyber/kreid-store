import { useState, useEffect, useRef } from 'react'
import { X, Clock, Gift, Copy, Check } from 'lucide-react'
import { supabase, signUp, signIn } from '../lib/supabase'

const COUPON_CODE = 'WELCOME10'
const COUPON_DISCOUNT = 10 // 10%
const DURATION = 10 * 60 // 10 minutos en segundos

export default function CouponPopup({ show, onClose }) {
  const [step, setStep] = useState('auth') // 'auth' | 'coupon' | 'expired'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!show) return

    // Limpiar estados al abrir
    setStep('auth')
    setError('')
    setTimeLeft(DURATION)
    setCopied(false)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [show])

  useEffect(() => {
    if (step !== 'coupon') return

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setStep('expired')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [step])

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        await signIn(email, password)
      } else {
        await signUp(email, password)
      }
      setStep('coupon')
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(COUPON_CODE)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSkip = () => {
    // Usuario sin cupón pero registrado
    if (timerRef.current) clearInterval(timerRef.current)
    onClose()
  }

  if (!show) return null

  return (
    <div className="coupon-overlay">
      <div className="coupon-modal">
        <button className="coupon-close" onClick={onClose}>
          <X size={18} />
        </button>

        {step === 'auth' && (
          <div className="coupon-auth">
            <div className="coupon-icon-wrap">
              <Gift size={32} />
            </div>
            <h2>🎉 Welcome to KREID!</h2>
            <p className="coupon-subtitle">
              Create your account and get <strong>10% OFF</strong> your first order.
              <br />
              <span className="coupon-timer-note">
                <Clock size={14} /> This offer expires in 10 minutes!
              </span>
            </p>

            <form onSubmit={handleAuth} className="coupon-form">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="form-input"
              />
              <input
                type="password"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="form-input"
              />
              {error && <p className="coupon-error">{error}</p>}
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Processing...' : isLogin ? 'Sign In & Claim Offer' : 'Create Account & Claim 10% OFF'}
              </button>
            </form>

            <p className="coupon-toggle">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button onClick={() => { setIsLogin(!isLogin); setError('') }}>
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        )}

        {step === 'coupon' && (
          <div className="coupon-success">
            <div className="coupon-icon-wrap success">
              <Gift size={32} />
            </div>
            <h2>🎉 Your 10% OFF is Ready!</h2>
            <div className="coupon-timer">
              <Clock size={16} />
              <span>{formatTime(timeLeft)}</span>
            </div>
            <div className="coupon-code-box">
              <span className="coupon-code">{COUPON_CODE}</span>
              <button className="coupon-copy-btn" onClick={handleCopy}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="coupon-note">
              Use code <strong>{COUPON_CODE}</strong> at checkout for {COUPON_DISCOUNT}% off your first order.
              <br />
              <span className="coupon-urgent">Hurry! This code expires when the timer runs out.</span>
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { window.location.href = '/products' }}>
              Shop Now
            </button>
            <button className="coupon-skip" onClick={handleSkip}>
              Maybe later
            </button>
          </div>
        )}

        {step === 'expired' && (
          <div className="coupon-expired">
            <div className="coupon-icon-wrap expired">
              <Clock size={32} />
            </div>
            <h2>⏰ Offer Expired</h2>
            <p>Your 10% coupon has expired. But don't worry — we have more deals waiting for you!</p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>
              Browse Deals
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
