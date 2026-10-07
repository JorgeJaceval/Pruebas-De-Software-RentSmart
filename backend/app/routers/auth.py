import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlmodel import Session

from app.database import get_session
from app.errors import RegistrationError
from app.models import User
from app.schemas import RegisteredUser, RegistrationFailure, RegistrationRequest
from app.security import hash_password

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
