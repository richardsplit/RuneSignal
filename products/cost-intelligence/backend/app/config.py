from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Supabase
    supabase_url: str
    supabase_service_role_key: str

    # Encryption (AES-256 for storing customer API keys)
    encryption_key: str  # 32-byte hex string

    # Stripe
    stripe_secret_key: str
    stripe_webhook_secret: str

    # Resend (email)
    resend_api_key: str
    from_email: str = "insights@runesignal.com"

    # App
    app_url: str = "https://app.runesignal.com"
    environment: str = "production"
    log_level: str = "INFO"

    # Rate limiting
    ingest_rate_limit: int = 10_000  # requests/minute per tenant


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
