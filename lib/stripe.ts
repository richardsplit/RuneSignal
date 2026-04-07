import Stripe from 'stripe';

const apiKey = process.env.STRIPE_SECRET_KEY || '';

export const stripe = new Stripe(apiKey, {
  apiVersion: '2025-01-27.acacia' as any,
  appInfo: {
    name: 'TrustLayer Platform',
    version: '0.1.0',
  },
});

// Runtime check to ensure the key is present when actually used
if (!apiKey && process.env.NODE_ENV === 'production') {
  console.warn('STRIPE_SECRET_KEY is missing. Stripe operations will fail at runtime.');
}
