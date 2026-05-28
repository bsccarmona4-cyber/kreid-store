-- ============================================================
-- 🚀 KREID — Supabase Schema Completo
-- ============================================================

-- 1. TABLA: products
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  category TEXT,
  subcategory TEXT,
  badge TEXT,
  images TEXT[], -- array de URLs
  features TEXT[], -- array de strings
  rating DECIMAL(2,1) DEFAULT 5.0,
  reviews_count INTEGER DEFAULT 0,
  sku TEXT UNIQUE,
  cj_product_id TEXT,
  cj_variant_id TEXT,
  weight_grams INTEGER,
  warehouse TEXT DEFAULT 'US',
  free_shipping BOOLEAN DEFAULT false,
  stock BOOLEAN DEFAULT true,
  shipping_days TEXT DEFAULT '3-7',
  tags TEXT[], -- para búsqueda
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: product_relations (complementos / upsells)
CREATE TABLE IF NOT EXISTS product_relations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  related_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  relation_type TEXT CHECK (relation_type IN ('complement', 'upsell', 'crossell', 'alternative')),
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, related_product_id)
);

-- 3. TABLA: orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  total DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  shipping DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  coupon_code TEXT,
  shipping_address JSONB,
  payment_method TEXT,
  stripe_payment_id TEXT,
  cj_order_id TEXT,
  items JSONB, -- array de {product_id, name, price, quantity, image}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: coupons
CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_percent INTEGER DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  min_purchase DECIMAL(10,2) DEFAULT 0,
  max_uses INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA: cart_abandoned (para recuperación)
CREATE TABLE IF NOT EXISTS cart_abandoned (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  items JSONB,
  total DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  recovered BOOLEAN DEFAULT false
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

-- ============================================================
-- FUNCIONES
-- ============================================================
CREATE OR REPLACE FUNCTION get_complementary_products(p_product_id UUID, p_limit INTEGER DEFAULT 3)
RETURNS TABLE (
  id UUID,
  name TEXT,
  price DECIMAL,
  category TEXT,
  images TEXT[],
  relation_type TEXT
) LANGUAGE SQL AS $$
  SELECT p.id, p.name, p.price, p.category, p.images, pr.relation_type
  FROM product_relations pr
  JOIN products p ON p.id = pr.related_product_id
  WHERE pr.product_id = p_product_id AND p.is_active = true
  ORDER BY pr.priority
  LIMIT p_limit;
$$;

-- ============================================================
-- SEED DATA: Cupón de bienvenida
-- ============================================================
INSERT INTO coupons (code, discount_percent, max_uses, expires_at)
VALUES ('WELCOME10', 10, 1, NOW() + INTERVAL '10 minutes')
ON CONFLICT (code) DO NOTHING;
