from typing import Annotated, Any
from uuid import UUID

from pydantic import (
    BaseModel,
    BeforeValidator,
    ConfigDict,
    EmailStr,
    Field,
    SecretStr,
)


def require_string(value: Any) -> str:
    if not isinstance(value, str):
        raise ValueError("Se requiere texto.")
    return value


def normalize_name(value: Any) -> str:
    return require_string(value).strip()


def normalize_email(value: Any) -> str:
    return require_string(value).strip().lower()


class RegistrationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    name: Annotated[
        str, Field(min_length=2, max_length=80), BeforeValidator(normalize_name)
    ]
    email: Annotated[
        EmailStr, Field(max_length=320), BeforeValidator(normalize_email)
    ]
    password: Annotated[
        SecretStr,
        Field(min_length=8, max_length=64),
        BeforeValidator(require_string),
    ]


class RegisteredUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: str


class RegistrationFailure(BaseModel):
    detail: str
    errors: dict[str, str]
