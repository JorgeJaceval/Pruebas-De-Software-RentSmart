from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlmodel import Session, select

from app.availability import check_reserved_hours
from app.database import get_session
from app.dependencies import get_current_user
from app.errors import SpaceError, space_validation_errors
from app.models import Reservation, Space, User
from app.routers.auth import rollback
from app.space_schemas import (
    PublicSpace, SpaceCreate, SpaceDetail, SpaceFailure, SpaceRead,
    SpaceStatusChange, SpaceStatusRead, SpaceUpdate,
)

router = APIRouter(prefix="/spaces", tags=["spaces"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


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


@router.get("", response_model=list[PublicSpace])
def public_spaces(session: Annotated[Session, Depends(get_session)]) -> list[PublicSpace]:
    try:
        available = session.exec(select(Space).where(
            Space.is_active.is_(True), Space.is_withdrawn.is_(False)
        ).order_by(Space.id)).all()
    except SQLAlchemyError:
        message = "No pudimos consultar los espacios disponibles. Inténtalo nuevamente."
        raise SpaceError(503, message, {"form": message}) from None
    return [PublicSpace.model_validate(space) for space in available]


@router.get(
    "/mine",
    response_model=list[SpaceRead],
    responses={503: {"model": SpaceFailure, "description": "Consulta no disponible."}},
)
def owned_spaces(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[SpaceRead]:
    try:
        owned = session.exec(
            select(Space).where(Space.owner_id == user.id).order_by(Space.id)
        ).all()
    except SQLAlchemyError:
        message = "No pudimos consultar tus espacios. Inténtalo nuevamente."
        raise SpaceError(503, message, {"form": message}) from None
    return [SpaceRead.model_validate(space) for space in owned]


@router.get("/public/{space_id}", response_model=PublicSpace)
def public_space(
    space_id: UUID,
    session: Annotated[Session, Depends(get_session)],
) -> PublicSpace:
    try:
        space = session.exec(select(Space).where(
            Space.id == space_id,
            Space.is_active.is_(True), Space.is_withdrawn.is_(False),
        )).first()
    except SQLAlchemyError:
        message = "No pudimos consultar el espacio. Inténtalo nuevamente."
        raise SpaceError(503, message, {"form": message}) from None
    if space is None:
        raise SpaceError(404, "No encontramos el espacio solicitado.")
    return PublicSpace.model_validate(space)


@router.get("/{space_id}/detail", response_model=SpaceDetail)
def space_detail(
    space_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> SpaceDetail:
    try:
        space = session.get(Space, space_id)
    except SQLAlchemyError:
        message = "No pudimos consultar el espacio. Inténtalo nuevamente."
        raise SpaceError(503, message, {"form": message}) from None
    if space is None:
        raise SpaceError(404, "No encontramos el espacio solicitado.")
    is_owner = space.owner_id == user.id
    visible = space.is_active and not space.is_withdrawn
    if not visible and not (is_owner or user.is_admin):
        raise SpaceError(404, "No encontramos el espacio solicitado.")
    return SpaceDetail(
        **PublicSpace.model_validate(space).model_dump(mode="json"),
        is_active=space.is_active,
        is_withdrawn=space.is_withdrawn,
        is_owner=is_owner,
        can_reserve=visible and not is_owner,
    )


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


@router.put(
    "/{space_id}",
    response_model=SpaceRead,
    responses={
        409: {"model": SpaceFailure, "description": "Conflicto con reservas vigentes."},
        422: {"model": SpaceFailure, "description": "Datos inválidos."},
        503: {"model": SpaceFailure, "description": "Edición no disponible."},
    },
)
def update_space(
    space_id: UUID,
    update: SpaceUpdate,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> SpaceRead:
    try:
        # A future reservation writer must acquire this same space lock before
        # checking availability and inserting a reservation.
        space = session.exec(
            select(Space).where(Space.id == space_id).with_for_update()
            .execution_options(populate_existing=True)
        ).first()
        if space is None:
            raise SpaceError(404, "No encontramos el espacio solicitado.")
        if space.owner_id != user.id:
            raise SpaceError(403, "No tienes permiso para editar este espacio.")
        if (space.opening_hour, space.closing_hour) != (
            update.opening_hour, update.closing_hour
        ):
            check_reserved_hours(
                session, space.id, update.opening_hour, update.closing_hour, utc_now(),
            )
        for field, value in update.model_dump(mode="json").items():
            setattr(space, field, value)
        response = SpaceRead.model_validate(space)
        session.add(space)
        session.commit()
    except SQLAlchemyError:
        rollback(session)
        message = "No pudimos guardar los cambios. Inténtalo nuevamente."
        raise SpaceError(503, message, {"form": message}) from None
    return response


@router.patch("/{space_id}/status", response_model=SpaceStatusRead)
def change_space_status(
    space_id: UUID,
    change: SpaceStatusChange,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> SpaceStatusRead:
    try:
        space = session.exec(
            select(Space).where(Space.id == space_id).with_for_update()
            .execution_options(populate_existing=True)
        ).first()
        if space is None:
            raise SpaceError(404, "No encontramos el espacio solicitado.")
        if space.owner_id != user.id:
            raise SpaceError(403, "No tienes permiso para cambiar el estado de este espacio.")
        if change.is_active:
            if space.is_withdrawn:
                raise SpaceError(409, "El espacio fue retirado por administración y no puede activarse.")
            try:
                SpaceCreate.model_validate(space, from_attributes=True)
            except ValidationError as error:
                failures = [
                    {**failure, "loc": ("body", *failure.get("loc", ()))}
                    for failure in error.errors(include_input=False, include_context=False)
                ]
                raise SpaceError(
                    422, "Revisa los datos del espacio antes de activarlo.",
                    space_validation_errors(failures),
                ) from None
        space.is_active = change.is_active
        response = SpaceStatusRead.model_validate(space)
        session.add(space)
        session.commit()
    except SQLAlchemyError:
        rollback(session)
        message = "No pudimos cambiar el estado del espacio. Inténtalo nuevamente."
        raise SpaceError(503, message, {"form": message}) from None
    return response


def deletion_history_conflict() -> SpaceError:
    return SpaceError(
        409,
        "El espacio tiene reservas registradas. Puedes desactivarlo en lugar de eliminarlo.",
    )


@router.delete(
    "/{space_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    responses={
        409: {"model": SpaceFailure, "description": "El espacio tiene historial de reservas."},
        503: {"model": SpaceFailure, "description": "Eliminación no disponible."},
    },
)
def delete_space(
    space_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> Response:
    try:
        # The fixture booking writer and future HU-12 writer share this lock.
        space = session.exec(
            select(Space).where(Space.id == space_id).with_for_update()
            .execution_options(populate_existing=True)
        ).first()
        if space is None:
            raise SpaceError(404, "No encontramos el espacio solicitado.")
        if space.owner_id != user.id:
            raise SpaceError(403, "No tienes permiso para eliminar este espacio.")
        history = session.exec(
            select(Reservation.id).where(Reservation.space_id == space.id).limit(1)
        ).first()
        if history is not None:
            raise deletion_history_conflict()
        session.delete(space)
        session.commit()
    except IntegrityError as error:
        rollback(session)
        diagnostic = getattr(error.orig, "diag", None)
        if (
            getattr(error.orig, "sqlstate", None) == "23503"
            and getattr(diagnostic, "constraint_name", None) == "fk_reservations_space_id_spaces"
        ):
            raise deletion_history_conflict() from None
        message = "No pudimos eliminar el espacio. Inténtalo nuevamente."
        raise SpaceError(503, message, {"form": message}) from None
    except SQLAlchemyError:
        rollback(session)
        message = "No pudimos eliminar el espacio. Inténtalo nuevamente."
        raise SpaceError(503, message, {"form": message}) from None
    return Response(status_code=status.HTTP_204_NO_CONTENT)
