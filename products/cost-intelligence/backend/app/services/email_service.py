"""
Email service via Resend.
The most important email: "first dangerous customer" — sent 24h after first log.
"""

from __future__ import annotations

import logging

import httpx

from ..config import get_settings
from .attribution_engine import format_dangerous_customer_insight, get_first_dangerous_customer

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


async def send_email(
    to: str,
    subject: str,
    html: str,
    text: str | None = None,
) -> bool:
    """Send an email via Resend. Returns True on success."""
    cfg = get_settings()
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                RESEND_API_URL,
                headers={"Authorization": f"Bearer {cfg.resend_api_key}"},
                json={
                    "from": cfg.from_email,
                    "to": [to],
                    "subject": subject,
                    "html": html,
                    **({"text": text} if text else {}),
                },
            )
            if resp.status_code >= 400:
                logger.error("Resend API error %d: %s", resp.status_code, resp.text)
                return False
            return True
    except Exception as exc:
        logger.exception("Failed to send email to %s: %s", to, exc)
        return False


async def send_first_dangerous_customer_email(
    tenant_id: str,
    tenant_email: str,
) -> bool:
    """
    The flagship email. Sent 24h after first inference log is received.
    Shows the most margin-damaging customer in loss-framed language.
    """
    customer = await get_first_dangerous_customer(tenant_id)
    if customer is None:
        logger.info("No dangerous customer found for tenant %s — skipping email", tenant_id)
        return False

    cfg = get_settings()
    insight = format_dangerous_customer_insight(customer)
    dashboard_url = f"{cfg.app_url}/ci"

    name = customer.display_name or customer.customer_id
    cost_delta = customer.ai_cost_usd - customer.revenue_usd
    margin_str = (
        f"{customer.gross_margin_pct:.0f}%"
        if customer.gross_margin_pct is not None
        else "negative"
    )

    subject = f"⚠️ {name} is costing you ${cost_delta:,.2f}/month more than they pay"

    html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #0f0f0f; color: #e2e8f0; margin: 0; padding: 0; }}
    .wrap {{ max-width: 560px; margin: 40px auto; padding: 0 20px; }}
    .card {{ background: #1a1a2e; border: 1px solid #2d2d44; border-radius: 12px;
             padding: 32px; margin: 24px 0; }}
    .metric {{ font-size: 2rem; font-weight: 800; color: #ef4444; margin: 8px 0; }}
    .label  {{ font-size: 0.78rem; color: #64748b; text-transform: uppercase;
               letter-spacing: 0.06em; }}
    .insight {{ font-size: 1rem; line-height: 1.7; color: #94a3b8;
                border-left: 3px solid #ef4444; padding-left: 16px; margin: 24px 0; }}
    .cta {{ display: inline-block; background: linear-gradient(135deg,#6366f1,#8b5cf6);
            color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none;
            font-weight: 700; font-size: 0.95rem; margin: 8px 0; }}
    .footer {{ font-size: 0.72rem; color: #334155; margin-top: 32px; text-align: center; }}
    h1 {{ font-size: 1.5rem; font-weight: 800; color: #e2e8f0; margin: 0 0 8px; }}
    p  {{ color: #94a3b8; line-height: 1.6; }}
  </style>
</head>
<body>
  <div class="wrap">
    <p style="color:#6366f1;font-weight:700;font-size:0.8rem;letter-spacing:0.1em;
              text-transform:uppercase;margin-bottom:8px;">RuneSignal · Cost Intelligence</p>
    <h1>Your first AI cost insight</h1>
    <p>You connected RuneSignal 24 hours ago. Here's what we found in your data.</p>

    <div class="card">
      <div class="label">Most Margin-Damaging Customer</div>
      <div class="metric">{name}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:20px;">
        <div>
          <div class="label">Monthly Revenue</div>
          <div style="font-size:1.1rem;font-weight:700;color:#10b981;">${customer.revenue_usd:,.0f}</div>
        </div>
        <div>
          <div class="label">AI Cost / Month</div>
          <div style="font-size:1.1rem;font-weight:700;color:#ef4444;">${customer.ai_cost_usd:,.2f}</div>
        </div>
        <div>
          <div class="label">Gross Margin</div>
          <div style="font-size:1.1rem;font-weight:700;color:{'#ef4444' if (customer.gross_margin_pct or 0) < 0 else '#f59e0b'};">{margin_str}</div>
        </div>
      </div>
    </div>

    <div class="insight">{insight}</div>

    <p style="font-size:0.9rem;">
      This means every dollar {name} pays you costs you
      <strong style="color:#ef4444;">${(customer.ai_cost_usd / max(customer.revenue_usd, 0.01)):.2f} in AI inference</strong>.
      At scale, this customer profile destroys gross margin.
    </p>

    <a href="{dashboard_url}" class="cta">View full margin breakdown →</a>

    <p style="font-size:0.82rem;color:#475569;margin-top:24px;">
      Your dashboard now shows every customer ranked by gross margin impact.
      Fix the worst offenders first.
    </p>

    <div class="footer">
      RuneSignal · <a href="{cfg.app_url}/ci/settings" style="color:#475569;">Settings</a> ·
      <a href="{cfg.app_url}/unsubscribe" style="color:#475569;">Unsubscribe</a>
    </div>
  </div>
</body>
</html>
"""

    text = (
        f"Your first RuneSignal insight\n\n"
        f"{insight}\n\n"
        f"View dashboard: {dashboard_url}\n\n"
        f"---\nRuneSignal Cost Intelligence"
    )

    ok = await send_email(tenant_email, subject, html, text)
    if ok:
        logger.info("Sent first-dangerous-customer email to %s (tenant %s)", tenant_email, tenant_id)
    return ok
