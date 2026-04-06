# Environment File Updates

You need to add these keys exactly inside the `.env.local` file you currently have open (at line 19).

```env
# Stripe Billing
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Sentry Telemetry
SENTRY_AUTH_TOKEN="sntrys_..."
```

*(Note: Sentry sometimes auto-generates a `.env.sentry-build-plugin` file during the wizard setup, but adding `SENTRY_AUTH_TOKEN` directly to `.env.local` is the cleanest way to ensure Vercel and your Next.js build picks it up).*

If you are deploying this to Vercel, you will also need to copy and paste these exact same keys and values into your **Vercel Project Settings > Environment Variables** tab.
