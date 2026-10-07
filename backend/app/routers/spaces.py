from datetime import datetime, time, timezone
from typing import Annotated
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, status
from pydantic import ValidationError
from sqlalchemy import and_, or_
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, select

from app.database import get_session
from app.dependencies import get_current_user
from app.errors import SpaceError, space_validation_errors
from app.models import Reservation, Space, User
from app.routers.auth import rollback
from app.space_schemas import (
    PublicSpace, SpaceCreate, SpaceFailure, SpaceRead,
    SpaceStatusChange, SpaceStatusRead, SpaceUpdate,
)

router = APIRouter(prefix="/spaces", tags=["spaces"])
SANTIAGO = ZoneInfo("America/Santiago")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def check_reserved_hours(session: Session, space_id: UUID, update: SpaceUpdate) -> None:
    now = utc_now()
    reservations = session.exec(select(Reservation).where(
        Reservation.space_id == space_id,
        or_(
            and_(Reservation.status == "paid", Reservation.ends_at > now),
            and_(
                Reservation.status == "pending_payment",
                Reservation.payment_expires_at > now,
                Reservation.starts_at > now,
            ),
        ),
    )).all()
    errors: dict[str, str] = {}
    for reservation in reservations:
        start = reservation.starts_at.astimezone(SANTIAGO)
        end = reservation.ends_at.astimezone(SANTIAGO)
        if start.date() != end.date():
            errors["form"] = "Una reserva vigente abarca más de un día de disponibilidad."
            continue
        if start.time() < time(update.opening_hour):
            errors["opening_hour"] = "La apertura dejaría fuera una reserva vigente."
        if end.time() > time(update.closing_hour):
            errors["closing_hour"] = "El cierre dejaría fuera una reserva vigente."
    if errors:
        message = "El horario propuesto afecta reservas vigentes."
        errors.setdefault("form", message)
        raise SpaceError(409, message, errors)


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
        ).first()
        if space is None:
            raise SpaceError(404, "No encontramos el espacio solicitado.")
        if space.owner_id != user.id:
            raise SpaceError(403, "No tienes permiso para editar este espacio.")
        if (space.opening_hour, space.closing_hour) != (
            update.opening_hour, update.closing_hour
        ):
            check_reserved_hours(session, space.id, update)
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
