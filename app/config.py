from functools import lru_cache
from typing import Literal

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "ParkEasy"
    environment: Literal["development", "test", "staging", "production"] = "development"
    api_prefix: str = "/api/v1"
    secret_key: str = Field(min_length=16)
    access_token_expire_minutes: int = 60
    refresh_token_expire_minutes: int = 10080
    algorithm: str = "HS256"

    postgres_user: str = "parkeasy"
    postgres_password: str = "parkeasy"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "parkeasy"
    database_url_override: str | None = None

    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    uploads_dir: str = "storage/uploads"
    commission_rate: float = 0.12
    peak_hour_multiplier: float = 1.15
    weekend_multiplier: float = 1.10
    busy_area_multiplier: float = 1.12
    currency: str = "INR"
    default_launch_city: str = "Guwahati"

    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None
    razorpay_webhook_secret: str | None = None

    @computed_field  # type: ignore[misc]
    @property
    def database_url(self) -> str:
        if self.database_url_override:
            return self.database_url_override
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
DATABASE_URL = settings.database_url
