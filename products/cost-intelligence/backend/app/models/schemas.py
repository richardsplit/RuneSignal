from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


# ── Ingest ─────────────────────────────────────────────────────────────────────

class InferenceLogPayload(BaseModel):
    customer_id: str | None = None
    feature_tag: str | None = None
    endpoint_id: str | None = None
    model: str
    provider: str = "openai"
    input_tokens: int = Field(ge=0, default=0)
    output_tokens: int = Field(ge=0, default=0)
    cached_tokens: int = Field(ge=0, default=0)
    reasoning_tokens: int = Field(ge=0, default=0)
    cost_usd: float = Field(ge=0.0, default=0.0)
    latency_ms: int | None = Field(default=None, ge=0)
    session_id: str | None = None
    request_id: str | None = None
    metadata: dict[str, Any] | None = None

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, v: str) -> str:
        allowed = {"openai", "anthropic", "gemini", "other"}
        return v if v in allowed else "other"


class BatchIngestPayload(BaseModel):
    logs: list[InferenceLogPayload] = Field(min_length=1, max_length=500)


class IngestResponse(BaseModel):
    ok: bool = True
    inserted: int = 1


# ── Attribution ────────────────────────────────────────────────────────────────

class CustomerMargin(BaseModel):
    customer_id: str
    display_name: str | None = None
    revenue_usd: float
    ai_cost_usd: float
    gross_margin_pct: float | None
    request_count: int
    plan_tier: str | None = None
    is_dangerous: bool = False
    revenue_share_pct: float | None = None
    ai_cost_share_pct: float | None = None


class MarginSummary(BaseModel):
    month: str
    customers: list[CustomerMargin]
    total_revenue_usd: float
    total_ai_cost_usd: float
    overall_margin_pct: float | None


# ── Tenant / Auth ──────────────────────────────────────────────────────────────

class TenantCreate(BaseModel):
    email: str
    openai_api_key: str | None = None
    stripe_connect_id: str | None = None


class TenantOut(BaseModel):
    id: str
    email: str
    tier: str
    trial_ends_at: datetime
    onboarding_completed_at: datetime | None
    created_at: datetime


# ── Stripe webhook ─────────────────────────────────────────────────────────────

class StripeWebhookResponse(BaseModel):
    received: bool = True
    event_type: str = ""
