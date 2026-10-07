from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session

from app.database import get_session
from app.dependencies import get_current_user
from app.errors import SpaceError
from app.models import Space, User
from app.routers.auth import rollback
from app.space_schemas import SpaceCreate, SpaceFailure, SpaceRead

router = APIRouter(prefix="/spaces", tags=["spaces"])


@router.post(
    "",
    response_model=SpaceRead,
    status_code=status.HTTP_201_CREATED,
    responses={
        422: {"model": SpaceFailure, "description": "Datos inválidos."},
        503: {"model": SpaceFailure, "description": "Publicación no disponible."},
    },
)
def create_space(
    publication: SpaceCreate,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> SpaceRead:
    space = Space(
        **publication.model_dump(mode="json"), owner_id=user.id, is_active=True
    )
    response = SpaceRead.model_validate(space)
    try:
        session.add(space)
        session.commit()
    except SQLAlchemyError:
        rollback(session)
        message = "No pudimos publicar tu espacio. Inténtalo nuevamente."
        raise SpaceError(503, message, {"form": message}) from None
    return response


@router.get("/{space_id}", response_model=SpaceRead)
def get_space(
    space_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> SpaceRead:
    try:
        space = session.get(Space, space_id)
    except SQLAlchemyError:
        message = "No pudimos consultar tu espacio. Inténtalo nuevamente."
        raise SpaceError(503, message, {"form": message}) from None
    if space is None:
        raise SpaceError(404, "No encontramos el espacio solicitado.")
    if space.owner_id != user.id:
        raise SpaceError(403, "No tienes permiso para consultar este espacio.")
    return SpaceRead.model_validate(space)
