from functools import lru_cache

from pydantic import Field, SecretStr
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
