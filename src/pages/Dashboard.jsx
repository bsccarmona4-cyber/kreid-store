import { useState, useMemo } from 'react'
import {
  LayoutDashboard, Package, ShoppingCart, AlertTriangle, Users,
  TrendingUp, DollarSign, ShoppingBag, Activity, Percent,
  ChevronDown, Search, ArrowUp, ArrowDown, MoreHorizontal,
  Phone, Car, Battery, HardDrive, Star, Eye, Edit, Trash2,
  X, Menu, Home, LogOut, Bell, RefreshCw, Zap
} from 'lucide-react'
import './Dashboard.css'

/* ──────────────── DATA ──────────────── */

const products = [
  { id: 'phone-mount-cd', name: 'CD Slot Phone Mount', price: 33.35, cost: 11.91, margin: 48.5, sales: 547, revenue: 18242.45, stock: 250, category: 'Phone Mounts', badge: 'Best Seller' },
  { id: 'phone-mount-vent', name: 'Car Air Vent Phone Holder', price: 37.83, cost: 13.51, margin: 50.0, sales: 456, revenue: 17250.48, stock: 200, category: 'Phone Mounts', badge: 'Popular' },
  { id: 'phone-mount-magnetic', name: 'Car Magnetic Phone Holder', price: 43.57, cost: 15.56, margin: 51.5, sales: 321, revenue: 13985.97, stock: 180, category: 'Phone Mounts', badge: 'Hot' },
  { id: 'car-charger-36w', name: 'Car Charger PD 36W', price: 33.38, cost: 11.92, margin: 48.5, sales: 394, revenue: 13151.72, stock: 300, category: 'Chargers', badge: 'Best Seller' },
  { id: 'car-charger-30w', name: 'Car Charger PD 30W', price: 29.71, cost: 10.61, margin: 46.9, sales: 331, revenue: 9834.01, stock: 350, category: 'Chargers', badge: null },
  { id: 'car-trunk-organizer', name: 'Car Trunk Organizer', price: 26.12, cost: 9.33, margin: 44.9, sales: 429, revenue: 11205.48, stock: 150, category: 'Organization', badge: 'Popular' },
  { id: 'jump-starter', name: 'Portable Jump Starter 2000A', price: 97.33, cost: 34.76, margin: 61.1, sales: 197, revenue: 19174.01, stock: 100, category: 'Jump Starters', badge: 'Premium' },
  { id: 'jump-starter-pro', name: 'Jump Starter Power Bank Pro 3000A', price: 118.80, cost: 42.43, margin: 61.1, sales: 194, revenue: 23048.20, stock: 80, category: 'Jump Starters', badge: 'Premium' },
]

const orders = [
  { id: 'ORD-1042', customer: 'Emily R.', items: 2, total: 71.21, status: 'delivered', date: '2026-05-28', payment: 'Stripe' },
  { id: 'ORD-1041', customer: 'James K.', items: 1, total: 118.80, status: 'shipped', date: '2026-05-28', payment: 'Stripe' },
  { id: 'ORD-1040', customer: 'Sarah M.', items: 3, total: 97.30, status: 'processing', date: '2026-05-27', payment: 'Stripe' },
  { id: 'ORD-1039', customer: 'Michael T.', items: 1, total: 33.35, status: 'pending', date: '2026-05-27', payment: 'Stripe' },
  { id: 'ORD-1038', customer: 'Jessica L.', items: 2, total: 66.76, status: 'delivered', date: '2026-05-27', payment: 'Stripe' },
  { id: 'ORD-1037', customer: 'David P.', items: 1, total: 43.57, status: 'cancelled', date: '2026-05-26', payment: 'Stripe' },
  { id: 'ORD-1036', customer: 'Rachel G.', items: 4, total: 136.81, status: 'delivered', date: '2026-05-26', payment: 'Stripe' },
  { id: 'ORD-1035', customer: 'Chris W.', items: 1, total: 97.33, status: 'processing', date: '2026-05-26', payment: 'Stripe' },
  { id: 'ORD-1034', customer: 'Amanda N.', items: 2, total: 60.09, status: 'shipped', date: '2026-05-25', payment: 'Stripe' },
  { id: 'ORD-1033', customer: 'Kevin D.', items: 1, total: 26.12, status: 'delivered', date: '2026-05-25', payment: 'Stripe' },
  { id: 'ORD-1032', customer: 'Lisa F.', items: 3, total: 104.66, status: 'delivered', date: '2026-05-24', payment: 'Stripe' },
  { id: 'ORD-1031', customer: 'Tom H.', items: 1, total: 33.38, status: 'pending', date: '2026-05-24', payment: 'Stripe' },
]

const alerts = [
  { id: 1, message: 'Jump Starter Pro 3000A — Only 80 units left!', severity: 'warning', icon: '⚠️' },
  { id: 2, message: 'No sales recorded today — Check ad campaigns', severity: 'critical', icon: '🚨' },
  { id: 3, message: 'CD Slot Phone Mount — 547 units sold, best performer', severity: 'info', icon: '📈' },
  { id: 4, message: 'Car Trunk Organizer — Margin at 44.9%, below target', severity: 'warning', icon: '⚠️' },
]

const weeklyData = [
  { day: 'Mon', revenue: 1842, orders: 28, profit: 1105 },
  { day: 'Tue', revenue: 2156, orders: 32, profit: 1294 },
  { day: 'Wed', revenue: 1987, orders: 30, profit: 1192 },
  { day: 'Thu', revenue: 2310, orders: 35, profit: 1386 },
  { day: 'Fri', revenue: 1720, orders: 25, profit: 1032 },
  { day: 'Sat', revenue: 1247, orders: 23, profit: 811 },
  { day: 'Sun', revenue: 1580, orders: 26, profit: 948 },
]

const statusColors = {
  pending: '#eab308',
  processing: '#3b82f6',
  shipped: '#8b5cf6',
  delivered: '#22c55e',
  cancelled: '#ef4444',
}

const sidebarItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  { id: 'clients', label: 'Clients', icon: Users },
]

const categoryIcons = {
  'Phone Mounts': Phone,
  'Chargers': Battery,
  'Organization': HardDrive,
  'Jump Starters': Car,
}

/* ──────────────── COMPONENT ──────────────── */

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedOrder, setExpandedOrder] = useState(null)

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products
    const q = productSearch.toLowerCase()
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    )
  }, [productSearch])

  const filteredOrders = useMemo(() => {
    let result = orders
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase()
      result = result.filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.customer.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter)
    }
    return result
  }, [orderSearch, statusFilter])

  const metrics = [
    { label: 'Revenue Today', value: '$1,247', icon: DollarSign, change: '+12.5%', up: true, color: '#22c55e' },
    { label: 'Orders Today', value: '23', icon: ShoppingBag, change: '+8.2%', up: true, color: '#3b82f6' },
    { label: 'Profit Today', value: '$811', icon: TrendingUp, change: '+15.3%', up: true, color: '#8b5cf6' },
    { label: 'Conversion Rate', value: '3.2%', icon: Percent, change: '-0.4%', up: false, color: '#f59e0b' },
  ]

  const sectionComponents = {
    overview: <OverviewSection metrics={metrics} weeklyData={weeklyData} />,
    products: <ProductsSection products={filteredProducts} search={productSearch} setSearch={setProductSearch} />,
    orders: <OrdersSection
      orders={filteredOrders}
      search={orderSearch}
      setSearch={setOrderSearch}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      expandedOrder={expandedOrder}
      setExpandedOrder={setExpandedOrder}
    />,
    alerts: <AlertsSection alerts={alerts} />,
    clients: <ClientsSection />,
  }

  return (
    <div className="dashboard-container">
      {/* ─── Sidebar ─── */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Zap size={22} className="logo-icon" />
            <span className="logo-text">KREI<span className="logo-admin">Admin</span></span>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-link ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => { setActiveSection(item.id); setSidebarOpen(false) }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.id === 'alerts' && <span className="sidebar-badge">{alerts.length}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">A</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">Admin</span>
              <span className="sidebar-user-role">Store Owner</span>
            </div>
          </div>
          <button className="sidebar-logout">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ─── Main Content ─── */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-left">
            <button className="header-menu-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={22} />
            </button>
            <div className="header-title">
              <h1>{sidebarItems.find(i => i.id === activeSection)?.label || 'Dashboard'}</h1>
              <span className="header-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
          <div className="header-right">
            <button className="header-icon-btn">
              <RefreshCw size={18} />
            </button>
            <button className="header-icon-btn">
              <Bell size={18} />
              <span className="header-dot" />
            </button>
            <div className="header-avatar">A</div>
          </div>
        </header>

        <div className="dashboard-content">
          {sectionComponents[activeSection]}
        </div>
      </main>
    </div>
  )
}

/* ═══════════════════ SECTIONS ═══════════════════ */

function OverviewSection({ metrics, weeklyData }) {
  return (
    <div className="overview-section">
      <div className="metrics-grid">
        {metrics.map((m, i) => (
          <div key={i} className="metric-card">
            <div className="metric-icon" style={{ background: `${m.color}15`, color: m.color }}>
              <m.icon size={22} />
            </div>
            <div className="metric-info">
              <span className="metric-label">{m.label}</span>
              <span className="metric-value">{m.value}</span>
              <span className={`metric-change ${m.up ? 'up' : 'down'}`}>
                {m.up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                {m.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <h3>Weekly Performance</h3>
          <div className="chart-legend">
            <span><span className="legend-dot" style={{ background: '#7c3aed' }} /> Revenue</span>
            <span><span className="legend-dot" style={{ background: '#06b6d4' }} /> Profit</span>
          </div>
        </div>
        <div className="chart-container">
          <div className="chart-y-labels">
            <span>$2.5K</span>
            <span>$2K</span>
            <span>$1.5K</span>
            <span>$1K</span>
            <span>$500</span>
            <span>$0</span>
          </div>
          <div className="chart-bars-area">
            <div className="chart-gridlines">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} className="chart-gridline" style={{ top: `${(i / 5) * 100}%` }} />
              ))}
            </div>
            <div className="chart-bars">
              {weeklyData.map((d, i) => {
                const maxVal = 2500
                const revHeight = (d.revenue / maxVal) * 100
                const profHeight = (d.profit / maxVal) * 100
                return (
                  <div key={i} className="chart-bar-group">
                    <div className="chart-bar-wrapper">
                      <div className="chart-bar chart-bar-profit" style={{ height: `${profHeight}%` }}>
                        <div className="chart-bar-tooltip">${d.profit}</div>
                      </div>
                      <div className="chart-bar chart-bar-revenue" style={{ height: `${revHeight}%` }}>
                        <div className="chart-bar-tooltip">${d.revenue}</div>
                      </div>
                    </div>
                    <span className="chart-bar-label">{d.day}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <div className="chart-summary">
          <div className="chart-summary-item">
            <span className="summary-label">Total Revenue</span>
            <span className="summary-value">$12,842</span>
          </div>
          <div className="chart-summary-item">
            <span className="summary-label">Total Orders</span>
            <span className="summary-value">199</span>
          </div>
          <div className="chart-summary-item">
            <span className="summary-label">Avg. Order Value</span>
            <span className="summary-value">$64.53</span>
          </div>
        </div>
      </div>

      <div className="overview-bottom">
        <div className="top-product-card">
          <h3>🏆 Top Performer</h3>
          <div className="top-product-item">
            <div className="top-product-icon">
              <Phone size={20} />
            </div>
            <div className="top-product-info">
              <span className="top-product-name">CD Slot Phone Mount</span>
              <span className="top-product-meta">547 units sold · $18,242.45 revenue</span>
            </div>
            <span className="top-product-badge">Best Seller</span>
          </div>
          <div className="top-product-item">
            <div className="top-product-icon">
              <Car size={20} />
            </div>
            <div className="top-product-info">
              <span className="top-product-name">Jump Starter Pro 3000A</span>
              <span className="top-product-meta">$118.80 · 61.1% margin · 194 sales</span>
            </div>
            <span className="top-product-badge premium">Premium</span>
          </div>
        </div>
        <div className="quick-stats-card">
          <h3>⚡ Quick Stats</h3>
          <div className="quick-stats-grid">
            <div className="quick-stat">
              <span className="qs-value">$49.28</span>
              <span className="qs-label">Avg Order Value</span>
            </div>
            <div className="quick-stat">
              <span className="qs-value">64.3%</span>
              <span className="qs-label">Avg Margin</span>
            </div>
            <div className="quick-stat">
              <span className="qs-value">2.3</span>
              <span className="qs-label">Items/Order</span>
            </div>
            <div className="quick-stat">
              <span className="qs-value">48.5%</span>
              <span className="qs-label">Best Margin</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductsSection({ products, search, setSearch }) {
  return (
    <div className="products-section">
      <div className="section-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="search-clear" onClick={() => setSearch('')}><X size={14} /></button>}
        </div>
        <div className="section-actions">
          <button className="action-btn">
            <Eye size={16} /> View Store
          </button>
          <button className="action-btn primary">
            <Package size={16} /> Add Product
          </button>
        </div>
      </div>

      <div className="products-summary">
        <span>{products.length} products</span>
        <span>Total revenue: ${products.reduce((s, p) => s + p.revenue, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        <span>Total units sold: {products.reduce((s, p) => s + p.sales, 0).toLocaleString()}</span>
      </div>

      <div className="table-wrapper">
        <table className="data-table product-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Cost</th>
              <th>Margin</th>
              <th>Sales</th>
              <th>Revenue</th>
              <th>Stock</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => {
              const CatIcon = categoryIcons[p.category] || Package
              return (
                <tr key={p.id}>
                  <td className="td-product">
                    <div className="td-product-icon">
                      <CatIcon size={18} />
                    </div>
                    <div className="td-product-info">
                      <span className="td-product-name">{p.name}</span>
                      <span className="td-product-id">{p.id}</span>
                    </div>
                  </td>
                  <td><span className="td-category">{p.category}</span></td>
                  <td className="td-number">${p.price.toFixed(2)}</td>
                  <td className="td-number">${p.cost.toFixed(2)}</td>
                  <td>
                    <div className="td-margin">
                      <div className="margin-bar-bg">
                        <div className="margin-bar-fill" style={{ width: `${p.margin}%` }} />
                      </div>
                      <span className="margin-value">{p.margin}%</span>
                    </div>
                  </td>
                  <td className="td-number">{p.sales}</td>
                  <td className="td-number">${p.revenue.toFixed(2)}</td>
                  <td>
                    <span className={`td-stock ${p.stock <= 100 ? 'low' : p.stock <= 200 ? 'medium' : 'high'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td>
                    {p.badge ? (
                      <span className={`td-badge ${p.badge === 'Best Seller' ? 'gold' : p.badge === 'Premium' ? 'premium' : p.badge === 'Hot' ? 'hot' : 'popular'}`}>
                        {p.badge}
                      </span>
                    ) : (
                      <span className="td-badge default">Active</span>
                    )}
                  </td>
                  <td>
                    <button className="td-more-btn">
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="table-empty">
            <Package size={40} />
            <p>No products found</p>
          </div>
        )}
      </div>
    </div>
  )
}

function OrdersSection({ orders, search, setSearch, statusFilter, setStatusFilter, expandedOrder, setExpandedOrder }) {
  const statuses = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled']

  const getStatusLabel = (s) => {
    const labels = { pending: 'Pending', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' }
    return labels[s] || s
  }

  return (
    <div className="orders-section">
      <div className="section-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="search-clear" onClick={() => setSearch('')}><X size={14} /></button>}
        </div>
        <div className="order-filters">
          {statuses.map(s => (
            <button
              key={s}
              className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : getStatusLabel(s)}
              {s !== 'all' && <span className="filter-dot" style={{ background: statusColors[s] }} />}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table order-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Date</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr
                key={o.id}
                className={expandedOrder === o.id ? 'expanded' : ''}
                onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
              >
                <td className="td-order-id">{o.id}</td>
                <td>{o.customer}</td>
                <td className="td-number">{o.items}</td>
                <td className="td-number">${o.total.toFixed(2)}</td>
                <td><span className="td-payment">{o.payment}</span></td>
                <td className="td-date">{o.date}</td>
                <td>
                  <span className="td-status" style={{ background: `${statusColors[o.status]}20`, color: statusColors[o.status], borderColor: `${statusColors[o.status]}40` }}>
                    <span className="status-dot" style={{ background: statusColors[o.status] }} />
                    {getStatusLabel(o.status)}
                  </span>
                </td>
                <td>
                  <button className="td-more-btn">
                    <ChevronDown size={16} className={`chevron ${expandedOrder === o.id ? 'rotated' : ''}`} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="table-empty">
            <ShoppingCart size={40} />
            <p>No orders found</p>
          </div>
        )}
      </div>
    </div>
  )
}

function AlertsSection({ alerts }) {
  const severityConfig = {
    critical: { icon: '🚨', color: '#ef4444', bg: '#ef444415' },
    warning: { icon: '⚠️', color: '#eab308', bg: '#eab30815' },
    info: { icon: '📈', color: '#3b82f6', bg: '#3b82f615' },
  }

  return (
    <div className="alerts-section">
      <div className="alerts-header">
        <h3>System Alerts</h3>
        <span className="alerts-count">{alerts.length} active</span>
      </div>

      <div className="alerts-list">
        {alerts.map(a => {
          const cfg = severityConfig[a.severity]
          return (
            <div key={a.id} className="alert-card" style={{ borderLeftColor: cfg.color, background: cfg.bg }}>
              <div className="alert-card-header">
                <span className="alert-icon">{cfg.icon}</span>
                <span className="alert-severity" style={{ color: cfg.color }}>
                  {a.severity.charAt(0).toUpperCase() + a.severity.slice(1)}
                </span>
              </div>
              <p className="alert-message">{a.message}</p>
              <div className="alert-actions">
                <button className="alert-action-btn" style={{ color: cfg.color }}>
                  View Details →
                </button>
                <button className="alert-action-btn dismiss">
                  Dismiss
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="alerts-summary">
        <div className="alert-summary-item" style={{ borderLeftColor: '#ef4444' }}>
          <span className="as-value">{alerts.filter(a => a.severity === 'critical').length}</span>
          <span className="as-label">Critical</span>
        </div>
        <div className="alert-summary-item" style={{ borderLeftColor: '#eab308' }}>
          <span className="as-value">{alerts.filter(a => a.severity === 'warning').length}</span>
          <span className="as-label">Warnings</span>
        </div>
        <div className="alert-summary-item" style={{ borderLeftColor: '#3b82f6' }}>
          <span className="as-value">{alerts.filter(a => a.severity === 'info').length}</span>
          <span className="as-label">Info</span>
        </div>
      </div>
    </div>
  )
}

function ClientsSection() {
  const recentUsers = [
    { name: 'Emily R.', email: 'emily.r@example.com', orders: 3, spent: 142.42, joined: '2026-05-20', status: 'active' },
    { name: 'James K.', email: 'james.k@example.com', orders: 1, spent: 118.80, joined: '2026-05-18', status: 'active' },
    { name: 'Sarah M.', email: 'sarah.m@example.com', orders: 5, spent: 289.15, joined: '2026-05-15', status: 'active' },
    { name: 'Michael T.', email: 'michael.t@example.com', orders: 2, spent: 66.70, joined: '2026-05-12', status: 'inactive' },
    { name: 'Jessica L.', email: 'jessica.l@example.com', orders: 4, spent: 210.50, joined: '2026-05-10', status: 'active' },
    { name: 'David P.', email: 'david.p@example.com', orders: 1, spent: 43.57, joined: '2026-05-08', status: 'active' },
  ]

  return (
    <div className="clients-section">
      <div className="clients-stats-grid">
        <div className="client-stat-card">
          <Users size={24} className="client-stat-icon" />
          <div className="client-stat-info">
            <span className="cs-value">1,247</span>
            <span className="cs-label">Total Users</span>
          </div>
          <span className="cs-change up">+12.3%</span>
        </div>
        <div className="client-stat-card">
          <UserPlusIcon size={24} className="client-stat-icon" />
          <div className="client-stat-info">
            <span className="cs-value">12</span>
            <span className="cs-label">New Today</span>
          </div>
          <span className="cs-change up">+8.5%</span>
        </div>
        <div className="client-stat-card">
          <RepeatIcon size={24} className="client-stat-icon" />
          <div className="client-stat-info">
            <span className="cs-value">34%</span>
            <span className="cs-label">Returning Rate</span>
          </div>
          <span className="cs-change up">+2.1%</span>
        </div>
        <div className="client-stat-card">
          <Star size={24} className="client-stat-icon" />
          <div className="client-stat-info">
            <span className="cs-value">4.7★</span>
            <span className="cs-label">Avg Rating</span>
          </div>
          <span className="cs-change up">+0.1</span>
        </div>
      </div>

      <div className="clients-insights">
        <div className="insight-card">
          <h3>👥 User Growth</h3>
          <div className="insight-bar">
            <div className="insight-bar-label">
              <span>This Month</span>
              <span>+247 users</span>
            </div>
            <div className="insight-bar-track">
              <div className="insight-bar-fill" style={{ width: '78%' }} />
            </div>
          </div>
          <div className="insight-bar">
            <div className="insight-bar-label">
              <span>Last Month</span>
              <span>+198 users</span>
            </div>
            <div className="insight-bar-track">
              <div className="insight-bar-fill" style={{ width: '62%' }} />
            </div>
          </div>
          <div className="insight-conversion">
            <span>Conversion funnel:</span>
            <div className="funnel">
              <div className="funnel-step">
                <span>Visitors</span>
                <span>8,420</span>
              </div>
              <div className="funnel-arrow">→</div>
              <div className="funnel-step">
                <span>Cart</span>
                <span>1,850</span>
              </div>
              <div className="funnel-arrow">→</div>
              <div className="funnel-step">
                <span>Checkout</span>
                <span>723</span>
              </div>
              <div className="funnel-arrow">→</div>
              <div className="funnel-step">
                <span>Purchased</span>
                <span>269</span>
              </div>
            </div>
          </div>
        </div>

        <div className="insight-card">
          <h3>🕐 Recent Users</h3>
          <div className="recent-users-list">
            {recentUsers.map((u, i) => (
              <div key={i} className="recent-user-item">
                <div className="ru-avatar">{u.name.charAt(0)}</div>
                <div className="ru-info">
                  <span className="ru-name">{u.name}</span>
                  <span className="ru-email">{u.email}</span>
                </div>
                <div className="ru-stats">
                  <span className="ru-orders">{u.orders} orders</span>
                  <span className="ru-spent">${u.spent.toFixed(2)}</span>
                </div>
                <span className={`ru-status ${u.status}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Inline icons not in lucide ─── */

function UserPlusIcon({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  )
}

function RepeatIcon({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  )
}
