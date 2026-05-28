-- ============================================
-- 🗄️ KREID — Schema COMPLETO (extensión)
-- ============================================
-- ⚠️  Este archivo AGREGA tablas nuevas al schema existente.
--     No modifica las tablas originales (products, profiles, orders, order_items).
--     Ejecutar DESPUÉS de supabase-schema.sql
-- ============================================
-- Orden de ejecución:
--   1. supabase-schema.sql (tablas base)
--   2. supabase-schema-completo.sql (analytics, alerts, visits, abandoned carts + triggers + seed)
-- ============================================

-- ============================================
-- 📊 TABLA: analytics_daily
-- Resumen diario de métricas del negocio
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_orders INT DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  total_profit DECIMAL(10,2) DEFAULT 0,
  avg_order_value DECIMAL(10,2) DEFAULT 0,
  new_users INT DEFAULT 0,
  unique_customers INT DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 📊 TABLA: product_analytics
-- Métricas individuales por producto
-- ============================================
CREATE TABLE IF NOT EXISTS product_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  total_orders INT DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  total_quantity INT DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  total_profit DECIMAL(10,2) DEFAULT 0,
  profit_margin DECIMAL(5,2) DEFAULT 0,
  views INT DEFAULT 0,
  cart_adds INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Evitar duplicados por producto
  CONSTRAINT unique_product_analytics UNIQUE (product_id)
);

-- ============================================
-- ⚠️ TABLA: alerts_config
-- Configuración de alertas del sistema
-- ============================================
CREATE TABLE IF NOT EXISTS alerts_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_name TEXT NOT NULL,
  alert_type TEXT CHECK (alert_type IN ('stock','profit','sales','system')),
  threshold_value DECIMAL(10,2),
  comparison TEXT DEFAULT 'less_than' CHECK (comparison IN ('less_than','greater_than','equal')),
  enabled BOOLEAN DEFAULT true,
  notify_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ⚠️ TABLA: alerts_log
-- Historial de alertas disparadas
-- ============================================
CREATE TABLE IF NOT EXISTS alerts_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_config_id UUID REFERENCES alerts_config(id) ON DELETE CASCADE,
  alert_name TEXT NOT NULL,
  alert_type TEXT,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 👁️ TABLA: site_visits
-- Analytics de tráfico por página
-- ============================================
CREATE TABLE IF NOT EXISTS site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page TEXT NOT NULL,
  user_id UUID,
  session_id TEXT,
  duration_seconds INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 🛒 TABLA: abandoned_carts
-- Carritos abandonados para recuperación
-- ============================================
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email TEXT,
  cart_data JSONB,
  total DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','recovered','lost')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 🔄 FUNCIÓN: update_product_analytics
-- Auto-actualiza product_analytics cuando se crea un order_item
-- ============================================
CREATE OR REPLACE FUNCTION update_product_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO product_analytics (product_id, product_name, total_orders, total_revenue, total_quantity, total_cost)
  VALUES (NEW.product_id, NEW.name, 1, NEW.price * NEW.quantity, NEW.quantity, NEW.price * 0.35 * NEW.quantity)
  ON CONFLICT (product_id) DO UPDATE SET
    total_orders = product_analytics.total_orders + 1,
    total_revenue = product_analytics.total_revenue + (NEW.price * NEW.quantity),
    total_quantity = product_analytics.total_quantity + NEW.quantity,
    total_cost = product_analytics.total_cost + (NEW.price * 0.35 * NEW.quantity),
    total_profit = product_analytics.total_revenue - product_analytics.total_cost,
    profit_margin = CASE 
      WHEN product_analytics.total_revenue > 0 
        THEN ((product_analytics.total_revenue - product_analytics.total_cost) / product_analytics.total_revenue * 100)
      ELSE 0 
    END,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: on order_item insert → update product_analytics
DROP TRIGGER IF EXISTS on_order_item_created ON order_items;
CREATE TRIGGER on_order_item_created
  AFTER INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION update_product_analytics();

-- ============================================
-- 🔄 FUNCIÓN: update_daily_analytics
-- Auto-actualiza analytics_daily cuando se crea una orden
-- ============================================
CREATE OR REPLACE FUNCTION update_daily_analytics()
RETURNS TRIGGER AS $$
DECLARE
  today DATE := CURRENT_DATE;
BEGIN
  INSERT INTO analytics_daily (date, total_orders, total_revenue, total_cost, total_profit)
  VALUES (today, 1, NEW.total, NEW.total * 0.35, NEW.total * 0.65)
  ON CONFLICT (date) DO UPDATE SET
    total_orders = analytics_daily.total_orders + 1,
    total_revenue = analytics_daily.total_revenue + NEW.total,
    total_cost = analytics_daily.total_cost + (NEW.total * 0.35),
    total_profit = analytics_daily.total_profit + (NEW.total * 0.65),
    avg_order_value = (analytics_daily.total_revenue + NEW.total) / (analytics_daily.total_orders + 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: on order insert → update analytics_daily
DROP TRIGGER IF EXISTS on_order_created ON orders;
CREATE TRIGGER on_order_created
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION update_daily_analytics();

-- ============================================
-- 🔄 FUNCIÓN: check_alerts
-- Verifica condiciones de alerta al actualizar productos
-- ============================================
CREATE OR REPLACE FUNCTION check_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- Check stock alerts: si stock < 10, dispara alerta
  IF NEW.stock < 10 THEN
    INSERT INTO alerts_log (alert_config_id, alert_name, alert_type, message, severity)
    VALUES (
      (SELECT id FROM alerts_config WHERE alert_type = 'stock' AND enabled = true LIMIT 1),
      'Low Stock',
      'stock',
      '⚠️ Product "' || NEW.name || '" has only ' || NEW.stock || ' units left!',
      'warning'
    );
  END IF;

  -- Check profit margin alerts: si el margen baja del 20%
  IF NEW.original_price IS NOT NULL AND NEW.original_price > 0 THEN
    DECLARE
      margin DECIMAL(5,2);
    BEGIN
      margin := ((NEW.original_price - NEW.price) / NEW.original_price) * 100;
      IF margin < 20 THEN
        INSERT INTO alerts_log (alert_config_id, alert_name, alert_type, message, severity)
        VALUES (
          (SELECT id FROM alerts_config WHERE alert_type = 'profit' AND enabled = true LIMIT 1),
          'Low Profit Margin',
          'profit',
          '⚠️ Product "' || NEW.name || '" has low profit margin: ' || ROUND(margin, 2) || '%',
          'warning'
        );
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: on product update → check alerts
DROP TRIGGER IF EXISTS on_product_updated ON products;
CREATE TRIGGER on_product_updated
  AFTER UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION check_alerts();

-- ============================================
-- 🌱 SEED DATA: Alertas pre-configuradas
-- ============================================
INSERT INTO alerts_config (alert_name, alert_type, threshold_value, comparison, enabled) VALUES
('Low Stock Warning', 'stock', 10, 'less_than', true),
('Low Profit Margin', 'profit', 20, 'less_than', true),
('Sales Spike', 'sales', 50, 'greater_than', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 🔒 ROW LEVEL SECURITY — Nuevas tablas
-- ============================================

-- analytics_daily
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage analytics" ON analytics_daily;
CREATE POLICY "Admins can manage analytics" ON analytics_daily 
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Analytics viewable by authenticated" ON analytics_daily;
CREATE POLICY "Analytics viewable by authenticated" ON analytics_daily 
  FOR SELECT USING (auth.role() IN ('service_role', 'authenticated'));

-- product_analytics
ALTER TABLE product_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage product analytics" ON product_analytics;
CREATE POLICY "Admins can manage product analytics" ON product_analytics 
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Product analytics viewable by authenticated" ON product_analytics;
CREATE POLICY "Product analytics viewable by authenticated" ON product_analytics 
  FOR SELECT USING (auth.role() IN ('service_role', 'authenticated'));

-- alerts_config
ALTER TABLE alerts_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage alerts config" ON alerts_config;
CREATE POLICY "Admins can manage alerts config" ON alerts_config 
  FOR ALL USING (auth.role() = 'service_role');

-- alerts_log
ALTER TABLE alerts_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage alerts log" ON alerts_log;
CREATE POLICY "Admins can manage alerts log" ON alerts_log 
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Users can view alerts" ON alerts_log;
CREATE POLICY "Users can view alerts" ON alerts_log 
  FOR SELECT USING (true);

-- site_visits (público puede insertar para tracking)
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Insert visits" ON site_visits;
CREATE POLICY "Insert visits" ON site_visits 
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can view visits" ON site_visits;
CREATE POLICY "Admins can view visits" ON site_visits 
  FOR SELECT USING (auth.role() = 'service_role');

-- abandoned_carts
ALTER TABLE abandoned_carts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own abandoned carts" ON abandoned_carts;
CREATE POLICY "Users manage own abandoned carts" ON abandoned_carts 
  FOR ALL USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- ============================================
-- ✅ FIN — Schema completo aplicado
-- ============================================
