import { useEffect, useRef, useState } from 'react'

/**
 * 🎆 KREID — Efectos de Dopamina Overload
 * Partículas flotantes, confetti, spotlight mouse tracker,
 * contadores animados, todo en uno
 */

// ─── PARTÍCULAS FLOTANTES ───
export function FloatingParticles({ count = 20 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    let w, h

    const resize = () => {
      w = canvas.width = canvas.offsetWidth
      h = canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Crear partículas
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -(Math.random() * 0.3 + 0.1),
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.4 + 0.1,
      hue: Math.random() > 0.5 ? 0 : 40, // rojo o dorado
    }))

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        
        // Reset cuando sale
        if (p.y < -10) {
          p.y = h + 10
          p.x = Math.random() * w
        }
        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10
        
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 80%, 50%, ${p.opacity})`
        ctx.fill()
      })
      
      animId = requestAnimationFrame(draw)
    }
    
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [count])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  )
}

// ─── CONFETTI ───
export function ConfettiBurst({ active, onFinish }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const colors = ['#DC2626', '#F59E0B', '#EF4444', '#FFFFFF', '#16A34A', '#3B82F6']
    const pieces = Array.from({ length: 80 }, () => ({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 100,
      y: window.innerHeight / 2,
      vx: (Math.random() - 0.5) * 20,
      vy: -(Math.random() * 15 + 5),
      w: Math.random() * 8 + 4,
      h: Math.random() * 6 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 15,
      gravity: 0.4 + Math.random() * 0.2,
    }))

    let frame = 0
    let animId

    const animate = () => {
      frame++
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      let alive = false
      pieces.forEach(p => {
        p.x += p.vx
        p.vy += p.gravity
        p.y += p.vy
        p.rotation += p.rotSpeed
        p.vx *= 0.99
        
        if (p.y < canvas.height + 50) {
          alive = true
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate((p.rotation * Math.PI) / 180)
          ctx.fillStyle = p.color
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
          ctx.restore()
        }
      })

      if (alive && frame < 120) {
        animId = requestAnimationFrame(animate)
      } else {
        onFinish && onFinish()
      }
    }

    animId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animId)
  }, [active])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  )
}

// ─── SPOTLIGHT MOUSE TRACKER ───
export function MouseSpotlight({ children, className = '', strength = 8 }) {
  const cardRef = useRef(null)

  const handleMouseMove = (e) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -strength
    const rotateY = ((x - centerX) / centerX) * strength
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02,1.02,1.02)`
  }

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)'
    }
  }

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)', willChange: 'transform' }}
    >
      {children}
    </div>
  )
}

// ─── CONTADOR ANIMADO ───
export function AnimatedCounter({ target, suffix = '', prefix = '', duration = 2000 }) {
  const [count, setCount] = useState(0)
  const frameRef = useRef(null)

  useEffect(() => {
    const start = performance.now()
    const animate = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) frameRef.current = requestAnimationFrame(animate)
      else setCount(target)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])

  return <>{prefix}{count.toLocaleString()}{suffix}</>
}

// ─── FLASH SALE TIMER ───
export function FlashSaleTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState('')
  
  useEffect(() => {
    const update = () => {
      const diff = new Date(targetDate) - new Date()
      if (diff <= 0) { setTimeLeft('SALE ENDED'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  return <span>{timeLeft}</span>
}

// ─── STAGGER ENTRY ───
export function StaggerEntry({ children, delay = 0.05, className = '' }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={`stagger-container ${className}`}>
      {visible && children}
    </div>
  )
}

// ─── TYPING TEXT ───
export function TypingText({ text, speed = 50, className = '' }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (done) return
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) { clearInterval(interval); setDone(true) }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  return (
    <span className={className}>
      {displayed}
      {!done && <span className="typing-cursor">|</span>}
    </span>
  )
}

// ─── VIEWING COUNTER (simulado) ───
export function ViewingCounter({ base = 12 }) {
  const [count, setCount] = useState(base)
  
  useEffect(() => {
    const fluctuate = () => {
      setCount(base + Math.floor(Math.random() * 20) - 5)
    }
    fluctuate()
    const interval = setInterval(fluctuate, 5000 + Math.random() * 5000)
    return () => clearInterval(interval)
  }, [base])

  return <span>{count} people viewing</span>
}
