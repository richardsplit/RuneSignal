"""
RuneSignal Cost Intelligence — FastAPI application entrypoint.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.v1 import ingest, margins, stripe_webhook
from .config import get_settings
from .services.job_scheduler import start_scheduler

cfg = get_settings()

logging.basicConfig(
    level=cfg.log_level.upper(),
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="RuneSignal Cost Intelligence API",
    version="0.1.0",
    description="Track, attribute, and reduce AI inference costs.",
    docs_url="/docs" if cfg.environment != "production" else None,
    redoc_url=None,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        cfg.app_url,
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(ingest.router,           prefix="/v1")
app.include_router(margins.router,          prefix="/v1")
app.include_router(stripe_webhook.router)   # /webhooks/stripe (no prefix)


# ── Lifecycle ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup() -> None:
    logger.info("Cost Intelligence API starting up (env=%s)", cfg.environment)
    start_scheduler()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    from .services.job_scheduler import scheduler  # noqa: PLC0415
    if scheduler.running:
        scheduler.shutdown(wait=False)
    logger.info("Cost Intelligence API shut down")


# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"], include_in_schema=False)
async def health() -> dict:
    return {"status": "ok", "service": "cost-intelligence"}
