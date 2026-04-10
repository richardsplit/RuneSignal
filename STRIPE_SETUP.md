# Stripe Setup Guide

## Status: Products & prices created ✓

The following test-mode products and prices were created on 2026-04-10:

| Plan | Product ID | Price ID | Amount |
|------|-----------|----------|--------|
| Pro | `prod_UJLPja6XkNKNaR` | `price_1TKiiKBpeiNDAhuj4HUHFJ65` | $299/mo |
| Enterprise | `prod_UJLPlbmS2RVdE7` | `price_1TKiiLBpeiNDAhujbt0jIvRJ` | $999/mo |

---

## Step 1 — Add to `.env.local`

Copy the following block into your `.env.local` (merge with existing Supabase vars):

```env
# Stripe (test)
STRIPE_SECRET_KEY="sk_test_51T0QMFBpeiNDAhuj..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_51T0QMFBpeiNDAhuj..."

NEXT_PUBLIC_STRIPE_PRO_PRICE_ID="price_1TKiiKBpeiNDAhuj4HUHFJ65"
NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID="price_1TKiiLBpeiNDAhujbt0jIvRJ"
STRIPE_PRO_PRICE_ID="price_1TKiiKBpeiNDAhuj4HUHFJ65"
STRIPE_ENTERPRISE_PRICE_ID="price_1TKiiLBpeiNDAhujbt0jIvRJ"

# Fill this in after Step 2
STRIPE_WEBHOOK_SECRET="whsec_..."
```

---

## Step 2 — Start the webhook listener (local dev)

The webhook is required to update `tenants.plan_tier` after a successful checkout.

1. Install the Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. In a separate terminal, run:

```bash
stripe listen --forward-to localhost:3000/api/v1/billing/webhook
```

4. Copy the `whsec_...` secret it prints and paste it as `STRIPE_WEBHOOK_SECRET` in `.env.local`
5. Restart `npm run dev`

---

## Step 3 — Test a checkout

1. Go to `/billing`
2. Click **Upgrade to Pro**
3. Use Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC
4. After checkout completes you'll land on `/billing/success`
5. The webhook updates `tenants.plan_tier = 'pro'` in Supabase
6. Return to `/billing` — the plan card should show **Active Plan**

---

## Step 4 — Go live (when ready)

1. In Stripe dashboard, create matching products/prices in live mode
2. Swap env vars to production keys (commented out in `.env.local`)
3. Register the webhook endpoint in Stripe dashboard:
   - URL: `https://your-domain.com/api/v1/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
4. Copy the live `whsec_...` into your production environment

---

## Webhook events handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Updates `tenants.plan_tier` → `pro` or `enterprise`, stores `stripe_customer_id` + `stripe_subscription_id` |
| `customer.subscription.deleted` | Downgrades tenant to `free`, clears subscription ID |
| `invoice.payment_failed` | Sets `plan_tier = 'past_due'`, fires internal webhook notification |
