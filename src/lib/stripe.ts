import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const PRICES = {
  standard: 900,
  premium: 1900,
} as const;

export const PRICE_LABELS = {
  standard: '$9',
  premium: '$19',
} as const;