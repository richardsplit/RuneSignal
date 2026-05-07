"""Supabase client (service role — bypasses RLS for backend operations)."""

from functools import lru_cache

from supabase import AsyncClient, acreate_client

from .config import get_settings


@lru_cache(maxsize=1)
def _get_cached_client() -> AsyncClient:
    raise RuntimeError("Call await get_db() instead")


_client: AsyncClient | None = None


async def get_db() -> AsyncClient:
    global _client
    if _client is None:
        cfg = get_settings()
        _client = await acreate_client(cfg.supabase_url, cfg.supabase_service_role_key)
    return _client
