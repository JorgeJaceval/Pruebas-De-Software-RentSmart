from functools import lru_cache

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    database_host: str = "127.0.0.1"
    database_port: int = Field(default=15432, ge=1, le=65535)
    database_user: str = "rentsmart"
    database_password: SecretStr = SecretStr("rentsmart_dev")
    database_name: str = "rentsmart"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    auth_secret_key: SecretStr = Field(min_length=32)
    auth_token_minutes: int = Field(default=30, ge=1, le=1440)
    # HU-17: optional. Without a key the suggestion endpoint explains that AI is unavailable.
    gemini_api_key: SecretStr | None = None
    gemini_model: str = Field(default="gemini-flash-lite-latest", pattern=r"^[a-z0-9][a-z0-9.\-]{1,63}$")
    # Below the 15 s the browser waits (CA-05), so the API can still answer with a clear error.
    ai_timeout_seconds: float = Field(default=12, gt=0, le=14)
    # Suggestions allowed per user in each window, counted in memory of each backend process.
    ai_user_requests: int = Field(default=5, ge=1, le=100)
    ai_user_window_seconds: float = Field(default=60, gt=0, le=3600)

    @field_validator("gemini_model", "ai_timeout_seconds", "ai_user_requests", "ai_user_window_seconds", mode="before")
    @classmethod
    def empty_ai_option_uses_default(cls, value, info):
        # Optional AI variables left empty in a .env file mean "use the default".
        if isinstance(value, str) and not value.strip():
            return cls.model_fields[info.field_name].default
        return value

    @property
    def database_url(self) -> URL:
        return URL.create(
            "postgresql+psycopg",
            username=self.database_user,
            password=self.database_password.get_secret_value(),
            host=self.database_host,
            port=self.database_port,
            database=self.database_name,
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
