import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Star, ChevronDown, ShoppingCart } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { trackSearch, trackAddToCart } from '../lib/analytics'

const allProducts = [
  { id: 'phone-mount-cd', name: 'CD Slot Phone Mount', price: 33.35, original_price: null, rating: 4.6, reviews: 547, image: 'https://images.unsplash.com/photo-1617814065895-b17e6e3a41de?w=400&q=80', category: 'Phone Mounts', badge: 'Best Seller' },
  { id: 'phone-mount-vent', name: 'Car Air Vent Phone Holder', price: 37.83, original_price: 44.99, rating: 4.7, reviews: 456, image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&q=80', category: 'Phone Mounts', badge: 'Popular' },
  { id: 'phone-mount-magnetic', name: 'Car Magnetic Phone Holder', price: 43.57, original_price: 54.99, rating: 4.8, reviews: 321, image: 'https://images.unsplash.com/photo-1597773150796-e5c14ebecbf5?w=400&q=80', category: 'Phone Mounts', badge: 'Hot' },
  { id: 'car-charger-36w', name: 'Car Charger PD 36W', price: 33.38, original_price: 39.99, rating: 4.8, reviews: 394, image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&q=80', category: 'Chargers', badge: 'Best Seller' },
  { id: 'car-charger-30w', name: 'Car Charger PD 30W', price: 29.71, original_price: null, rating: 4.7, reviews: 331, image: 'https://images.unsplash.com/photo-1596208132977-d37f7bf1b46e?w=400&q=80', category: 'Chargers', badge: null },
  { id: 'car-trunk-organizer', name: 'Car Trunk Organizer', price: 26.12, original_price: 34.99, rating: 4.5, reviews: 429, image: 'https://images.unsplash.com/photo-1610647752706-3bb12232b3e4?w=400&q=80', category: 'Organization', badge: 'Popular' },
  { id: 'jump-starter', name: 'Portable Jump Starter 2000A', price: 97.33, original_price: 129.99, rating: 4.9, reviews: 197, image: 'https://images.unsplash.com/photo-1611200945005-403b702294fd?w=400&q=80', category: 'Jump Starters', badge: 'Premium' },
  { id: 'jump-starter-pro', name: 'Jump Starter Power Bank Pro', price: 118.80, original_price: 159.99, rating: 4.9, reviews: 194, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=80', category: 'Jump Starters', badge: 'Premium' },
]

const categories = ['All', 'Phone Mounts', 'Chargers', 'Organization', 'Jump Starters']

export default function Products() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [sort, setSort] = useState('default')
  const { addItem } = useCart()

  // Track search queries
  useEffect(() => {
    if (search.length >= 2) {
      const debounce = setTimeout(() => trackSearch(search), 500)
      return () => clearTimeout(debounce)
    }
  }, [search])

  let filtered = allProducts.filter(p => {
    if (category !== 'All' && p.category !== category) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (sort === 'price-asc') filtered.sort((a, b) => a.price - b.price)
  else if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price)
  else if (sort === 'rating') filtered.sort((a, b) => b.rating - a.rating)

  return (
    <div className="products-page">
      <div className="container">
        <div className="products-page-header">
          <h1>All Products</h1>
          <p>Premium car accessories. Ships from US warehouse.</p>
        </div>

        <div className="products-toolbar">
          <div className="search-box">
            <Search size={16} />
            <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="toolbar-filters">
            <div className="filter-group">
              {categories.map(c => (
                <button key={c} className={`filter-btn ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
                  {c}
                </button>
              ))}
            </div>
            <div className="sort-wrapper">
              <select value={sort} onChange={e => setSort(e.target.value)}>
                <option value="default">Sort by</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
              <ChevronDown size={14} />
            </div>
          </div>
        </div>

        <div className="products-grid">
          {filtered.map(p => (
            <Link to={`/products/${p.id}`} key={p.id} className="product-card">
              <div className="product-image-wrap">
                <img src={p.image} alt={p.name} loading="lazy" />
                {p.badge && <span className="product-badge">{p.badge}</span>}
              </div>
              <div className="product-info-pad">
                <span className="product-card-category">{p.category}</span>
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
    </div>
  )
}
