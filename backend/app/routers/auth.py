import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlmodel import Session, select

from app.database import get_session
from app.dependencies import get_current_user, require_admin
from app.errors import AuthenticationError, RegistrationError
from app.models import User
from app.schemas import (
    AuthenticatedUser,
    LoginRequest,
    LoginResponse,
    RegisteredUser,
    RegistrationFailure,
    RegistrationRequest,
)
from app.security import (
    DUMMY_PASSWORD_HASH,
    create_access_token,
    hash_password,
    verify_password,
)
from app.settings import Settings, get_settings

router = APIRouter(prefix="/auth", tags=["auth"])


def is_duplicate_email(error: IntegrityError) -> bool:
    original = error.orig
    diagnostic = getattr(original, "diag", None)
    if getattr(original, "sqlstate", None) == "23505":
        return getattr(diagnostic, "constraint_name", None) == "uq_users_email"
    return (
        isinstance(original, sqlite3.IntegrityError)
        and getattr(original, "sqlite_errorcode", None)
        == sqlite3.SQLITE_CONSTRAINT_UNIQUE
        and str(original) == "UNIQUE constraint failed: users.email"
    )


def rollback(session: Session) -> None:
    try:
        session.rollback()
    except SQLAlchemyError:
        # A disconnected database can also fail during rollback. Its internal
        # details must not replace the safe error returned to the client.
        pass


@router.post(
    "/register",
    response_model=RegisteredUser,
    status_code=status.HTTP_201_CREATED,
    responses={
        409: {"model": RegistrationFailure, "description": "Correo ya registrado."},
        422: {"model": RegistrationFailure, "description": "Datos inválidos."},
        503: {"model": RegistrationFailure, "description": "Registro no disponible."},
    },
)
def register(
    registration: RegistrationRequest,
    session: Annotated[Session, Depends(get_session)],
) -> RegisteredUser:
    user = User(
        name=registration.name,
        email=str(registration.email),
        password_hash=hash_password(registration.password.get_secret_value()),
        is_admin=False,
    )
    response = RegisteredUser.model_validate(user)
    try:
        session.add(user)
        session.commit()
    except IntegrityError as error:
        rollback(session)
        if is_duplicate_email(error):
            raise RegistrationError(
                409,
                "Ya existe una cuenta con este correo.",
                {"email": "Ya existe una cuenta con este correo."},
            ) from None
        raise RegistrationError(
            503,
            "No pudimos crear tu cuenta. Inténtalo nuevamente.",
            {"form": "No pudimos crear tu cuenta. Inténtalo nuevamente."},
        ) from None
    except SQLAlchemyError:
        rollback(session)
        raise RegistrationError(
            503,
            "No pudimos crear tu cuenta. Inténtalo nuevamente.",
            {"form": "No pudimos crear tu cuenta. Inténtalo nuevamente."},
        ) from None

    return response


@router.post("/login", response_model=LoginResponse)
def login(
    credentials: LoginRequest,
    session: Annotated[Session, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> LoginResponse:
    try:
        user = session.exec(
            select(User).where(User.email == str(credentials.email))
        ).first()
    except SQLAlchemyError:
        raise AuthenticationError(
            503, "No pudimos iniciar sesión. Inténtalo nuevamente."
        ) from None
    encoded_hash = user.password_hash if user is not None else DUMMY_PASSWORD_HASH
    password_matches = verify_password(
        credentials.password.get_secret_value(), encoded_hash
    )
    if user is None or not password_matches:
        raise AuthenticationError(401, "Correo o contraseña incorrectos.")
    token, expires_at = create_access_token(user.id, settings)
    return LoginResponse(
        access_token=token,
        expires_at=expires_at,
        user=AuthenticatedUser.model_validate(user),
    )


@router.get("/me", response_model=AuthenticatedUser)
def me(user: Annotated[User, Depends(get_current_user)]) -> AuthenticatedUser:
    return AuthenticatedUser.model_validate(user)


@router.get("/admin-access", response_model=AuthenticatedUser)
def admin_access(user: Annotated[User, Depends(require_admin)]) -> AuthenticatedUser:
    return AuthenticatedUser.model_validate(user)
