# TrustLayer Architectural Deviations

This document tracks all variations and refinements made to the TrustLayer platform during its implementation compared to the original high-level specifications.

### 1. Database & State Management
- **Supabase Transition**: Migrated from a purely transient/Redis-only architecture to a persistent Supabase-backed persistence layer. This provides long-term audit immutability and real-time dashboard sync via PostgreSQL.
- **Upstash Redis Rate Limiting**: Implemented edge-based rate limiting using Upstash Redis within `middleware.ts` to provide cost-effective, high-performance per-tenant throttling without hitting the primary DB for every request.

### 2. S1 Conflict Arbiter
- **Semantic Mediation (pgvector)**: Instead of simple keyword conflict detection, we implemented `pgvector`-based intent comparison. This allows the Arbiter to detect "conceptual overlap" between agents even if they use different wording.
- **Multi-Vendor LLM Support**: Added a mediation layer supporting both **OpenAI** and **Anthropic (Claude-3.5-Sonnet)**, allowing tenants to bring their own keys (BYOK) for mediation reasoning.

### 3. S7 HITL (Human-in-the-Loop)
- **Priority-Based SLAs**: Extended the exception model to include dynamic SLA deadlines (15m for Critical, 1h for High, etc.) with automated escalation triggers.
- **Slack Notification Routing**: Integrated real-time Slack webhooks for instant administrative intervention upon security or conflict breaches.

### 4. S5 Insurance Micro-OS
- **Dynamic Risk Score (0-100)**: Implemented an actuarial aggregator that computes agent risk scores live from the audit ledger, rather than using static assessments.
- **Actuarial Premium Multipliers**: Automated the connection between risk scores and monthly premiums (up to 3.0x multiplier for high-risk profiles).

### 5. Infrastructure Fixes
- **Path Aliasing**: Standardized on `@lib/*` and `@/*` imports for cleaner, more portable code across the Next.js App Router hierarchy.
- **Strict Identity Enforcement**: Every certified call (S3) and intent (S1) is cryptographically linked to a registered agent via mandatory `X-Agent-Id` header validation.

---
*Last Updated: 2026-03-26*
