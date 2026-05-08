"""RuneSignal Python SDK — Platform Metrics"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict

from .http import BaseHTTPClient


@dataclass
class PlatformMetrics:
    agents: int
    active_intents: int
    open_exceptions: int
    violations_today: int
    approvals_open: int
    approvals_approved_today: int
    approvals_sla_breached: int
    incidents_open: int
    incidents_serious: int
    controls_passing: int
    controls_failing: int
    controls_health_pct: float
    finops_budget_utilization_pct: float
    finops_cost_this_month_usd: float
    finops_projected_monthly_usd: float
    health_status: str
    as_of: str


class MetricsResource:
    def __init__(self, http: BaseHTTPClient):
        self._http = http

    async def get(self) -> PlatformMetrics:
        raw = await self._http.request("GET", "/api/v1/metrics")
        s = raw.get("summary", {})
        a = raw.get("approvals", {})
        i = raw.get("incidents", {})
        c = raw.get("controls", {})
        f = raw.get("finops", {})
        return PlatformMetrics(
            agents=s.get("agents", 0),
            active_intents=s.get("active_intents", 0),
            open_exceptions=s.get("open_exceptions", 0),
            violations_today=s.get("violations_today", 0),
            approvals_open=a.get("open", 0),
            approvals_approved_today=a.get("approved_today", 0),
            approvals_sla_breached=a.get("sla_breached", 0),
            incidents_open=i.get("open", 0),
            incidents_serious=i.get("serious", 0),
            controls_passing=c.get("passing", 0),
            controls_failing=c.get("failing", 0),
            controls_health_pct=c.get("overall_health_pct", 0.0),
            finops_budget_utilization_pct=f.get("budget_utilization_pct", 0.0),
            finops_cost_this_month_usd=f.get("cost_this_month_usd", 0.0),
            finops_projected_monthly_usd=f.get("projected_monthly_usd", 0.0),
            health_status=raw.get("health_status", "healthy"),
            as_of=raw.get("as_of", ""),
        )
