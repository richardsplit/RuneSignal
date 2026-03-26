# TrustLayer : Enterprise AI Governance Platform

TrustLayer is a centralized, cryptographic control plane for enterprise AI agents. It provides provenance, accountability, identity, and operational control over autonomous AI actors acting on behalf of an enterprise.

## Architecture Modules

The platform is split into 5 core governance modules:
- **S3 (Provenance Engine)**: Cryptographic hashing and signing of LLM inputs, outputs, and system prompts acting as a tamper-evident audit ledger.
- **S6 (Identity & Permissions)**: Registration and credential issuance for agents (RS256 JWTs) and strictly typed tool permission scopes.
- **S1 (Conflict Arbiter)**: Semantic intent registry (`pgvector`) preventing multi-agent collisions and enforcing global corporate policies.
- **S7 (HITL Ops Routing)**: Human-in-the-loop exception handling, SLA tracking, and Slack routing for agent ambiguities.
- **S5 (Insurance Micro-OS)**: Actuarial risk scoring and dynamic premium generation based on historical agent telemetry.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL 15, `pgvector`, RLS)
- **Authentication**: JWT / `@panva/jose` edge middleware
- **Cryptography**: Ed25519 signatures via Web Crypto API
- **Deployment**: Vercel

## Local Setup

1. **Clone & Install Dependencies**
   ```bash
   git clone https://github.com/richardsplit/TrustLayer.git
   cd TrustLayer
   npm install
   ```

2. **Environment Variables**
   Create a `.env.local` file based on `.env.local.example`. You will need to provide your Supabase connection strings, Edge Secret Key (for auth), and Ed25519 signing keys.

3. **Database Migrations**
   Use the Supabase CLI, or copy the SQL files in `supabase/migrations/` into the Supabase Dashboard SQL editor to provision the core schema.
   ```bash
   npx supabase db push
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Design System
TrustLayer uses a bespoke design system focusing on professional fintech aesthetics components. It embraces a deep charcoal background with electric emerald and warm amber accents, combined with glassmorphism to present an advanced cyber-physical command center feel.
