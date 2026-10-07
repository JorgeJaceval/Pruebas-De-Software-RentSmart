from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from pwdlib import PasswordHash

from app.settings import Settings

_password_hash = PasswordHash.recommended()
JWT_ALGORITHM = "HS256"
# An unknown email still performs one Argon2 verification, like a known email.
DUMMY_PASSWORD_HASH = _password_hash.hash("Cuenta ficticia para verificación")


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, encoded_hash: str) -> bool:
    return _password_hash.verify(password, encoded_hash)


def create_access_token(user_id: UUID, settings: Settings) -> tuple[str, datetime]:
    issued_at = datetime.now(timezone.utc).replace(microsecond=0)
    expires_at = issued_at + timedelta(minutes=settings.auth_token_minutes)
    token = jwt.encode(
        {"sub": str(user_id), "iat": issued_at, "exp": expires_at},
        settings.auth_secret_key.get_secret_value(),
        algorithm=JWT_ALGORITHM,
    )
    return token, expires_at


def decode_access_token(token: str, settings: Settings) -> UUID:
    claims = jwt.decode(
        token,
        settings.auth_secret_key.get_secret_value(),
        algorithms=[JWT_ALGORITHM],
        options={"require": ["sub", "iat", "exp"]},
    )
    if (
        type(claims["iat"]) is not int
        or type(claims["exp"]) is not int
        or claims["exp"] <= claims["iat"]
    ):
        raise jwt.InvalidTokenError("Invalid token dates")
    try:
        return UUID(claims["sub"])
    except (ValueError, TypeError, AttributeError):
        raise jwt.InvalidTokenError("Invalid subject") from None
