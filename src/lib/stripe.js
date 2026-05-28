import { loadStripe } from '@stripe/stripe-js'

export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

export const CURRENCY = 'usd'
export const SHIPPING_COST = 4.99
export const FREE_SHIPPING_THRESHOLD = 45
