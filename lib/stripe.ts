import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set.');
    }
    _stripe = new Stripe(apiKey, {
      apiVersion: '2025-01-27.acacia' as any,
      appInfo: { name: 'RuneSignal Platform', version: '0.1.0' },
    });
  }
  return _stripe;
}

/* Backwards-compat named export — resolves lazily on first use */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop];
  },
});
