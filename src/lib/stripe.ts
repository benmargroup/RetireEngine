import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const PRICES = {
  standard: 1900,
  premium: 4900,
} as const;

export const PRICE_LABELS = {
  standard: '$19',
  premium: '$49',
} as const;
