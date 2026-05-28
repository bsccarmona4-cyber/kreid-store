import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShoppingCart, Star, Truck, Shield, Check, Minus, Plus, ChevronLeft, ChevronRight, Clock, Zap } from 'lucide-react'
import { useCart } from '../contexts/CartContext'

const productData = {
  'phone-mount-cd': {
    id: 'phone-mount-cd', name: 'CD Slot Phone Mount', price: 33.35, original_price: null, rating: 4.6, reviews: 547,
    images: [
      'https://images.unsplash.com/photo-1617814065895-b17e6e3a41de?w=600&q=80',
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&q=80',
      'https://images.unsplash.com/photo-1597773150796-e5c14ebecbf5?w=600&q=80',
    ],
    category: 'Car Accessories', badge: 'Best Seller',
    description: 'Universal CD slot phone mount. Fits all phones up to 6.9". Secure grip, 360° rotation, easy one-click release. No adhesive needed.',
    features: ['Universal Fit', '360° Rotation', 'One-Click Release', 'No Adhesive', 'Secure Grip', 'Fits CD Slots'],
    reviews_list: [
      { user: 'Mike D.', rating: 5, text: 'Perfect fit in my CD slot. Rock solid while driving.' },
      { user: 'Sarah K.', rating: 5, text: 'So much better than vent mounts. Doesnt block my AC.' },
      { user: 'Tom B.', rating: 4, text: 'Sturdy build. Only issue is it sticks out a bit.' },
      { user: 'Jessica R.', rating: 5, text: 'Bought for my truck. Works perfectly on bumpy roads.' },
    ],
    stock: true, sku: 'CJ-PM-CD', shipping_days: '5-8'
  },
  'phone-mount-vent': {
    id: 'phone-mount-vent', name: 'Car Air Vent Phone Holder', price: 37.83, original_price: 44.99, rating: 4.7, reviews: 456,
    images: [
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&q=80',
      'https://images.unsplash.com/photo-1617814065895-b17e6e3a41de?w=600&q=80',
      'https://images.unsplash.com/photo-1583959329763-451d8501f692?w=600&q=80',
    ],
    category: 'Car Accessories', badge: 'Popular',
    description: 'Premium air vent phone mount. Ultra-strong clip, anti-slip silicone pad. Compatible with all smartphones. Easy installation in seconds.',
    features: ['Universal Fit', 'Anti-Slip Silicone', 'Strong Vent Clip', '360° Rotation', 'One-Hand Operation', 'Ultra-Compact'],
    reviews_list: [
      { user: 'Alex W.', rating: 5, text: 'Clip is incredibly strong. Doesnt move at all.' },
      { user: 'Emily T.', rating: 5, text: 'Best vent mount Ive used. Compact and sleek.' },
      { user: 'James L.', rating: 4, text: 'Works great but can block some AC vents.' },
    ],
    stock: true, sku: 'CJ-PM-VENT', shipping_days: '5-8'
  },
  'car-charger-36w': {
    id: 'car-charger-36w', name: 'Car Charger PD 36W', price: 33.38, original_price: 39.99, rating: 4.8, reviews: 394,
    images: [
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&q=80',
      'https://images.unsplash.com/photo-1589871973318-9ca669baf33f?w=600&q=80',
      'https://images.unsplash.com/photo-1596208132977-d37f7bf1b46e?w=600&q=80',
    ],
    category: 'Car Accessories', badge: 'Best Seller',
    description: '36W PD USB-C car charger. Super fast charging for iPhone 15/16, Samsung, iPad. Dual ports. Compact aluminum design.',
    features: ['36W PD Fast Charging', 'USB-C + USB-A Ports', 'iPhone 15/16 Compatible', 'Samsung Super Fast', 'Aluminum Alloy', 'Overcharge Protection'],
    reviews_list: [
      { user: 'David H.', rating: 5, text: 'Charges my iPhone 16 Pro in 30 minutes. Insane speed.' },
      { user: 'Laura M.', rating: 5, text: 'Compact and powerful. Love the aluminum build.' },
      { user: 'Ryan P.', rating: 4, text: 'Great charger. Wish the cable was included.' },
    ],
    stock: true, sku: 'CJ-CC-36W', shipping_days: '5-8'
  },
  'car-charger-30w': {
    id: 'car-charger-30w', name: 'Car Charger PD 30W', price: 29.71, original_price: null, rating: 4.7, reviews: 331,
    images: [
      'https://images.unsplash.com/photo-1596208132977-d37f7bf1b46e?w=600&q=80',
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&q=80',
    ],
    category: 'Car Accessories', badge: null,
    description: '30W PD fast car charger. Dual port design. Charges two devices simultaneously. Slim profile fits any 12V/24V socket.',
    features: ['30W PD Fast Charging', 'Dual Ports', 'Slim Design', '12V/24V Compatible', 'Smart IC Chip', 'Multiple Device Protection'],
    reviews_list: [
      { user: 'Chris N.', rating: 5, text: 'Perfect for charging my phone and tablet on road trips.' },
      { user: 'Megan S.', rating: 5, text: 'Slim enough to barely notice. Works great.' },
    ],
    stock: true, sku: 'CJ-CC-30W', shipping_days: '5-8'
  },
  'phone-mount-magnetic': {
    id: 'phone-mount-magnetic', name: 'Car Magnetic Phone Holder', price: 43.57, original_price: 54.99, rating: 4.8, reviews: 321,
    images: [
      'https://images.unsplash.com/photo-1597773150796-e5c14ebecbf5?w=600&q=80',
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&q=80',
      'https://images.unsplash.com/photo-1617814065895-b17e6e3a41de?w=600&q=80',
    ],
    category: 'Car Accessories', badge: 'Hot',
    description: 'Strong magnetic phone holder for car. Ultra-strong N52 magnets. One-hand operation. Compatible with MagSafe and all phones with metal plate.',
    features: ['Ultra-Strong N52 Magnets', 'MagSafe Compatible', 'One-Hand Operation', 'Dashboard Mount', 'Ultra-Slim Design', 'No Vibration While Driving'],
    reviews_list: [
      { user: 'Jordan F.', rating: 5, text: 'Magnet is incredibly strong. Phone doesnt budge on rough roads.' },
      { user: 'Rachel K.', rating: 5, text: 'So convenient. Just snap my phone on and go.' },
      { user: 'Derek M.', rating: 4, text: 'Great mount. Metal plate is a bit bulky on the phone.' },
    ],
    stock: true, sku: 'CJ-PM-MAG', shipping_days: '5-8'
  },
  'car-trunk-organizer': {
    id: 'car-trunk-organizer', name: 'Car Trunk Organizer', price: 26.12, original_price: 34.99, rating: 4.5, reviews: 429,
    images: [
      'https://images.unsplash.com/photo-1610647752706-3bb12232b3e4?w=600&q=80',
      'https://images.unsplash.com/photo-1599594144187-98ddc6b1b9c9?w=600&q=80',
      'https://images.unsplash.com/photo-1605030753481-bb38b08c384a?w=600&q=80',
    ],
    category: 'Car Accessories', badge: 'Popular',
    description: 'Heavy-duty car trunk organizer. 3-compartment design. Foldable, waterproof. Keeps groceries, tools, and sports gear secure. Fits most SUVs and sedans.',
    features: ['3-Compartment Design', 'Heavy-Duty Material', 'Foldable & Portable', 'Waterproof Lining', 'Anti-Slip Bottom', 'Fits Most Vehicles'],
    reviews_list: [
      { user: 'Samantha P.', rating: 5, text: 'Keeps my trunk so organized. Groceries dont slide around anymore.' },
      { user: 'Mike R.', rating: 5, text: 'Sturdy and well-made. Holds more than expected.' },
      { user: 'Nina V.', rating: 4, text: 'Great for organizing. Wish it was a bit taller.' },
    ],
    stock: true, sku: 'CJ-TRUNK-ORG', shipping_days: '5-8'
  },
  'jump-starter': {
    id: 'jump-starter', name: 'Portable Jump Starter', price: 97.33, original_price: 129.99, rating: 4.9, reviews: 197,
    images: [
      'https://images.unsplash.com/photo-1611200945005-403b702294fd?w=600&q=80',
      'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80',
      'https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=600&q=80',
    ],
    category: 'Car Accessories', badge: 'Premium',
    description: '2000A peak portable jump starter. Starts dead batteries in seconds. Built-in power bank, LED flashlight. Works on all 12V vehicles up to 8L gas / 6L diesel.',
    features: ['2000A Peak Current', 'Starts Dead Battery in Seconds', 'Built-in Power Bank', 'LED Flashlight', 'USB-C Charging', 'Works on Cars/SUVs/Trucks'],
    reviews_list: [
      { user: 'Trucker Dan', rating: 5, text: 'Saved me twice already on the road. Worth every penny.' },
      { user: 'Lisa C.', rating: 5, text: 'Small enough to keep in the glove box. Very powerful.' },
      { user: 'Mark W.', rating: 5, text: 'Jump started my F-150 with ease. The power bank feature is a bonus.' },
    ],
    stock: true, sku: 'CJ-JS-2000A', shipping_days: '5-8'
  },
  'jump-starter-pro': {
    id: 'jump-starter-pro', name: 'Jump Starter Power Bank Pro', price: 118.80, original_price: 159.99, rating: 4.9, reviews: 194,
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80',
      'https://images.unsplash.com/photo-1611200945005-403b702294fd?w=600&q=80',
      'https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=600&q=80',
    ],
    category: 'Car Accessories', badge: 'Premium',
    description: '3000A peak jump starter + 20,000mAh power bank. Starts any 12V vehicle. Fast-charge phones, tablets, laptops. Intelligent clamps with reverse polarity protection.',
    features: ['3000A Peak Current', '20000mAh Power Bank', 'Fast Charge Laptops', 'Reverse Polarity Protection', 'LED Emergency Light', '12V/24V Compatible'],
    reviews_list: [
      { user: 'Kevin J.', rating: 5, text: 'This thing is a beast. Jump started my diesel truck no problem.' },
      { user: 'Amanda R.', rating: 5, text: 'The power bank feature is genius. Charges my laptop twice.' },
      { user: 'Steve L.', rating: 4, text: 'Premium build quality. Clamps feel very solid.' },
    ],
    stock: true, sku: 'CJ-JS-3000A', shipping_days: '5-8'
  },
}

// Bundles sugeridos para frequently bought together
export const bundles = {
  'bundle-basic': {
    name: 'Road Trip Essential Bundle',
    products: ['phone-mount-cd', 'car-charger-36w', 'car-trunk-organizer'],
    original_total: 33.35 + 33.38 + 26.12,
    bundle_price: 84.99,
  },
  'bundle-daily': {
    name: 'Daily Driver Bundle',
    products: ['phone-mount-vent', 'car-charger-30w'],
    original_total: 37.83 + 29.71,
    bundle_price: 59.99,
  },
}

// Relaciones: qué productos comprar juntos
export const relatedProducts = {
  'phone-mount-cd': ['car-charger-36w', 'car-trunk-organizer'],
  'phone-mount-vent': ['car-charger-30w', 'phone-mount-magnetic'],
  'phone-mount-magnetic': ['car-charger-36w', 'jump-starter'],
  'car-charger-36w': ['phone-mount-cd', 'phone-mount-vent'],
  'car-charger-30w': ['phone-mount-vent', 'phone-mount-cd'],
  'car-trunk-organizer': ['jump-starter', 'phone-mount-cd'],
  'jump-starter': ['jump-starter-pro', 'car-charger-36w'],
  'jump-starter-pro': ['jump-starter', 'car-trunk-organizer'],
}

export default function ProductDetail() {
  const { id } = useParams()
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)

  const p = productData[id]

  if (!p) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h2 style={{ marginBottom: 16 }}>Product not found</h2>
        <Link to="/products" className="btn btn-primary">Back to Products</Link>
      </div>
    )
  }

  const prevImage = () => setSelectedImage(prev => (prev === 0 ? p.images.length - 1 : prev - 1))
  const nextImage = () => setSelectedImage(prev => (prev === p.images.length - 1 ? 0 : prev + 1))

  const handleAdd = () => {
    addItem({ id: p.id, name: p.name, price: p.price, image: p.images[0], quantity })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  const related = (relatedProducts[id] || []).map(rid => productData[rid]).filter(Boolean)

  return (
    <div className="product-detail-page">
      <div className="container">
        <Link to="/products" className="back-link">
          <ChevronLeft size={16} /> Back to Products
        </Link>

        <div className="product-detail-grid">
          {/* Gallery */}
          <div>
            <div className="gallery-overlay-wrap">
              <img src={p.images[selectedImage]} alt={p.name} className="gallery-main-img" />
              {p.badge && <span className="product-badge gallery-badge">{p.badge}</span>}
              <button className="gallery-arrow gallery-arrow-left" onClick={prevImage} aria-label="Previous"><ChevronLeft size={22} /></button>
              <button className="gallery-arrow gallery-arrow-right" onClick={nextImage} aria-label="Next"><ChevronRight size={22} /></button>
              <div className="gallery-dots-bar">
                {p.images.map((_, i) => (
                  <span key={i} className={`g-dot ${selectedImage === i ? 'active' : ''}`} onClick={() => setSelectedImage(i)} />
                ))}
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="product-detail-info">
            <div className="detail-meta-top">
              {p.badge && <span className="badge badge-red">{p.badge}</span>}
              <span className="detail-category">{p.category}</span>
              <span className="detail-sku">SKU: {p.sku}</span>
            </div>
            <h1>{p.name}</h1>

            <div className="detail-price-row">
              <span className="detail-price">${p.price.toFixed(2)}</span>
              {p.original_price && <span className="price-original">${p.original_price.toFixed(2)}</span>}
              {p.original_price && <span className="detail-savings">Save ${(p.original_price - p.price).toFixed(2)}</span>}
            </div>

            <div className="rating-row">
              <div className="stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={15} fill={i < Math.floor(p.rating) ? '#F59E0B' : 'none'} color="#F59E0B" strokeWidth={1.5} />
                ))}
              </div>
              <span className="rating-value">{p.rating}</span>
              <span className="rating-count">({p.reviews} reviews)</span>
            </div>

            <div className="detail-meta">
              <div className="detail-meta-item"><Truck size={16} /> Free shipping on orders over $45</div>
              <div className="detail-meta-item"><Shield size={16} /> 30-day satisfaction guarantee</div>
              <div className="detail-meta-item"><Clock size={16} /> Ships in {p.shipping_days} business days</div>
            </div>

            <p className="detail-desc">{p.description}</p>

            <div className="detail-features">
              <h3>What's Included</h3>
              <ul>
                {p.features.map((f, i) => (
                  <li key={i}><Check size={14} /> {f}</li>
                ))}
              </ul>
            </div>

            <div className="stock-row">
              <span className="stock-dot" /> <span>In Stock</span>
              <span className="stock-shipping">— Ships from US warehouse</span>
            </div>

            <div className="detail-actions">
              <div className="qty-selector">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>−</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>
              <button className={`btn btn-primary ${added ? 'added' : ''}`} onClick={handleAdd}>
                <ShoppingCart size={18} /> {added ? '✓ Added!' : 'Add to Cart'}
              </button>
            </div>

            {/* Frequently Bought Together */}
            {related.length > 0 && (
              <div className="detail-bought-together">
                <h3><Zap size={16} /> Frequently Bought Together</h3>
                <div className="bought-together-list">
                  {related.map(r => (
                    <Link to={`/products/${r.id}`} key={r.id} className="bought-together-item">
                      <img src={r.images[0]} alt={r.name} />
                      <div>
                        <p>{r.name}</p>
                        <span>${r.price.toFixed(2)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="detail-reviews-horizontal">
              <h3>Customer Reviews</h3>
              <div className="reviews-horizontal-list">
                {p.reviews_list.map((r, i) => (
                  <div key={i} className="review-horizontal-item">
                    <div className="review-horiz-header">
                      <div className="review-horiz-avatar">{r.user[0]}</div>
                      <div>
                        <span className="review-horiz-name">{r.user}</span>
                        <div className="stars" style={{ marginTop: 2 }}>
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Star key={j} size={9} fill={j < r.rating ? '#F59E0B' : 'none'} color="#F59E0B" strokeWidth={1.5} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="review-horiz-text">"{r.text}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
