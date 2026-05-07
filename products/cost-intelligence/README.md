# RuneSignal — Cost Intelligence

> Which of your customers is running at negative gross margin? You'll know within 24 hours.

AI Cost Intelligence is a product within the RuneSignal platform that helps AI-native software companies track, attribute, and reduce AI inference costs by joining them with Stripe revenue.

## The one thing it does

```
Customer "acme-corp" contributes 12% of your MRR ($480/month) but consumes 
41% of your AI inference spend ($1,640/month). Their effective gross margin: -241%.
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  AI-native SaaS (customer's app)                    │
│  @runesignal.track → POST /v1/ingest/log            │
└──────────────────────────┬──────────────────────────┘
                           │
          ┌────────────────▼────────────────┐
          │  FastAPI backend (Railway)       │
          │  • Ingest API                   │
          │  • Stripe webhook receiver      │
          │  • Attribution engine           │
          │  • Email service (Resend)       │
          │  • APScheduler (24h email job)  │
          └────────────────┬────────────────┘
                           │
          ┌────────────────▼────────────────┐
          │  Supabase (Postgres)            │
          │  • ci_inference_logs            │
          │  • ci_revenue_events            │
          │  • ci_tenants                   │
          │  • Materialized views (hourly)  │
          └────────────────┬────────────────┘
                           │
          ┌────────────────▼────────────────┐
          │  Next.js frontend (Vercel)      │
          │  /ci          — margin table    │
          │  /ci/models   — model spend     │
          │  /ci/trends   — 6-month chart   │
          │  /ci/settings — connections     │
          │  /ci-onboarding — setup flow   │
          └─────────────────────────────────┘
```

## Phase 1 (this branch)

- [x] Supabase schema — 4 tables + materialized views
- [x] Python SDK (`pip install runesignal`) — `@track` decorator + proxy mode
- [x] FastAPI backend — ingest, Stripe webhook, attribution engine, email service
- [x] Dashboard — customer margin table, model spend, trend chart, settings
- [x] Onboarding — 4-step flow, < 5 minutes

## Deploy

### Backend → Railway

```bash
cd products/cost-intelligence/backend
cp .env.example .env   # fill in values
railway up
```

Set env vars in Railway dashboard from `.env.example`.

### Frontend

Already integrated into the existing Vercel deployment. Add to `.env`:

```
CI_API_URL=https://your-railway-app.railway.app
CI_SERVICE_API_KEY=rs_live_...
```

## Billing tiers

| Tier | Price | AI Spend Tracked |
|---|---|---|
| Starter | $199/mo | Up to $10K/mo |
| Growth | $599/mo | Up to $50K/mo |
| Scale | $1,299/mo | Up to $250K/mo |
| Overage | $0.01 per $1 tracked | Above tier limit |

30-day free trial, no credit card required.

## Phase 2 (next)

- Feature profitability monitor (heatmap by `feature_tag`)
- Anomaly detector (3-sigma, 15-min cadence, Slack/PagerDuty alerts)
- Budget guardrails (OpenAI-compatible proxy with hard/soft limits)
