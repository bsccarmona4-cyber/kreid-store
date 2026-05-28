import { createClient } from '@supabase/supabase-js'

const supabaseRawUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseUrl = supabaseRawUrl.replace(/\/rest\/v1\/?$/, '')
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// ─── Auth ───────────────────────────────────────
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session, event)
  })
}

// ─── Products ────────────────────────────────────
export async function getProducts() {
  const { data, error } = await supabase.from('products').select('*')
  if (error) throw error
  return data || []
}

export async function getProductById(id) {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

// ─── Orders ──────────────────────────────────────
export async function createOrder(order) {
  const { data, error } = await supabase.from('orders').insert(order).select().single()
  if (error) throw error
  return data
}

export async function getMyOrders(userId) {
  const { data, error } = await supabase.from('orders').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ─── Coupon ───────────────────────────────────────
export async function getCoupon(code) {
  const { data, error } = await supabase.from('coupons').select('*').eq('code', code).single()
  if (error) throw error
  return data
}
