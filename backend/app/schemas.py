from datetime import datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    BeforeValidator,
    ConfigDict,
    EmailStr,
    Field,
    SecretStr,
)
from pydantic_core import PydanticCustomError


def require_string(value: Any) -> str:
    if not isinstance(value, str):
        raise ValueError("Se requiere texto.")
    try:
        value.encode("utf-8")
    except UnicodeEncodeError:
        raise PydanticCustomError("text_encoding", "Texto Unicode no válido.")
    return value


def normalize_name(value: Any) -> str:
    name = require_string(value).strip()
    if "\x00" in name:
        raise PydanticCustomError("name_null_byte", "Nombre con carácter nulo.")
    return name


def normalize_email(value: Any) -> str:
    email = require_string(value).strip().lower()
    if "<" in email or ">" in email:
        raise ValueError("Ingresa solo la dirección de correo.")
    return email


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


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    email: Annotated[
        EmailStr, Field(max_length=320), BeforeValidator(normalize_email)
    ]
    # Short or empty passwords reach the same credential check as any wrong
    # password. Registration owns the policy for creating a new password.
    password: Annotated[
        SecretStr, Field(max_length=64), BeforeValidator(require_string)
    ]


class AuthenticatedUser(RegisteredUser):
    is_admin: bool


class LoginResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_at: datetime
    user: AuthenticatedUser
