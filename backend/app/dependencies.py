from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, select

from app.database import get_session
from app.errors import AuthenticationError, SpaceError
from app.models import Space, User
from app.security import decode_access_token
from app.settings import Settings, get_settings

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    session: Annotated[Session, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> User:
    invalid_session = AuthenticationError(
        401, "Tu sesión no es válida o ha expirado. Inicia sesión nuevamente."
    )
    if credentials is None:
        raise invalid_session
    try:
        user_id = decode_access_token(credentials.credentials, settings)
    except jwt.InvalidTokenError:
        raise invalid_session from None
    try:
        # Read both identity and permissions from the database for every request.
        user = session.get(User, user_id)
    except SQLAlchemyError:
        raise AuthenticationError(
            503, "No pudimos comprobar tu sesión. Inténtalo nuevamente."
        ) from None
    if user is None:
        raise invalid_session
    return user


def require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if not user.is_admin:
        raise AuthenticationError(403, "No tienes permiso para acceder a esta sección.")
    return user


def get_reservable_space(space_id: UUID, session: Session, tenant_id: UUID) -> Space:
    # The future booking transaction must keep this lock until its own commit.
    # Refresh an existing ORM instance before checking the current status.
    space = session.exec(
        select(Space).where(Space.id == space_id).with_for_update()
        .execution_options(populate_existing=True)
    ).first()
    if space is None:
        raise SpaceError(404, "No encontramos el espacio solicitado.")
    if not space.is_active or space.is_withdrawn:
        raise SpaceError(409, "Este espacio no está disponible para reservas.")
    if space.owner_id == tenant_id:
        raise SpaceError(409, "No puedes reservar tu propio espacio.")
    return space
