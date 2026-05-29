-- ============================================
-- 🚚 KREID — CJ Dropshipping Orders Tracking
-- (Ejecutar DESPUÉS de supabase-schema.sql)
-- ============================================

CREATE TABLE IF NOT EXISTS cj_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  cj_order_id TEXT,
  cj_order_number TEXT,
  cj_status TEXT DEFAULT 'pending',
  tracking_number TEXT,
  tracking_url TEXT,
  logistic_name TEXT,
  shipping_cost DECIMAL(10,2),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_cj_orders_order_id ON cj_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_cj_orders_cj_order_id ON cj_orders(cj_order_id);

-- RLS
ALTER TABLE cj_orders ENABLE ROW LEVEL SECURITY;

-- Users can see their own cj orders (via the orders table join)
DROP POLICY IF EXISTS "Users can view own cj orders" ON cj_orders;
CREATE POLICY "Users can view own cj orders" ON cj_orders 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = cj_orders.order_id AND orders.user_id = auth.uid())
  );

-- Admins/service_role can manage all
DROP POLICY IF EXISTS "Service role can manage cj_orders" ON cj_orders;
CREATE POLICY "Service role can manage cj_orders" ON cj_orders 
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- ✅ FIN — Schema CJ aplicado
-- ============================================
