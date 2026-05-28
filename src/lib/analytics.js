// 📊 KREID — Google Analytics 4 Event Tracking
// Trackea eventos clave para entender conversión

export function trackPageView(page) {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: page || window.location.pathname,
    })
  }
}

export function trackViewItem(product) {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'view_item', {
      currency: 'USD',
      value: product.price,
      items: [{
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        quantity: 1,
      }],
    })
  }
}

export function trackAddToCart(product, quantity = 1) {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'add_to_cart', {
      currency: 'USD',
      value: product.price * quantity,
      items: [{
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        quantity,
      }],
    })
  }
}

export function trackBeginCheckout(items, total) {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'begin_checkout', {
      currency: 'USD',
      value: total,
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    })
  }
}

export function trackPurchase(orderId, items, total, shipping = 0) {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'purchase', {
      transaction_id: orderId,
      currency: 'USD',
      value: total,
      shipping,
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    })
  }
}

export function trackSearch(searchTerm) {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'search', {
      search_term: searchTerm,
    })
  }
}

export function trackViewCart(items, total) {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'view_cart', {
      currency: 'USD',
      value: total,
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    })
  }
}
