"""
API key authentication middleware.
Keys are stored as bcrypt hashes in ci_tenants.api_key_hash.
"""

from __future__ import annotations

import hashlib
import time
from collections import defaultdict
from threading import Lock
from typing import Annotated

import bcrypt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..db import get_db

bearer = HTTPBearer(auto_error=False)

# ── Simple in-process rate limiter (10K req/min per tenant) ────────────────────
# In production, replace with Redis sliding window.
_rate_buckets: dict[str, list[float]] = defaultdict(list)
_rate_lock = Lock()
RATE_WINDOW = 60.0       # seconds
RATE_LIMIT   = 10_000    # requests per window


def _check_rate_limit(tenant_id: str) -> None:
    now = time.monotonic()
    with _rate_lock:
        bucket = _rate_buckets[tenant_id]
        # Drop timestamps outside the window
        cutoff = now - RATE_WINDOW
        _rate_buckets[tenant_id] = [t for t in bucket if t > cutoff]
        if len(_rate_buckets[tenant_id]) >= RATE_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded: 10,000 requests/minute",
                headers={"Retry-After": "60"},
            )
        _rate_buckets[tenant_id].append(now)


async def require_tenant(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> dict:
    """
    Validates Bearer API key and returns the tenant row.
    Raises 401 on missing/invalid key, 429 on rate limit exceeded.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key",
            headers={"WWW-Authenticate": "Bearer"},
        )

    raw_key: str = credentials.credentials

    # Fast path: hash the key and lookup
    # We use SHA-256 for the lookup index (fast), then bcrypt verify for security.
    sha = hashlib.sha256(raw_key.encode()).hexdigest()

    db = await get_db()
    result = await db.table("ci_tenants").select("*").eq("api_key_hash_sha", sha).maybe_single().execute()
    tenant = result.data if result else None

    if tenant is None:
        # Fallback: bcrypt scan (slow — only for tenants not yet migrated to sha index)
        all_tenants = (await db.table("ci_tenants").select("id,api_key_hash,tier,email,first_log_received_at").execute()).data or []
        for row in all_tenants:
            try:
                if bcrypt.checkpw(raw_key.encode(), row["api_key_hash"].encode()):
                    tenant = row
                    break
            except Exception:
                continue

    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "Bearer"},
        )

    _check_rate_limit(tenant["id"])

    # Attach tenant to request state for downstream use
    request.state.tenant = tenant
    return tenant


TenantDep = Annotated[dict, Depends(require_tenant)]
