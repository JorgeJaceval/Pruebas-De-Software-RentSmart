from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, select

from app.database import get_session
from app.dependencies import get_current_user, get_reservable_space
from app.errors import SpaceError
from app.models import Payment, Reservation, Space, User
from app.reservation_schemas import (
    PaymentSimulation, ReceivedReservationList, ReceivedReservationRead,
    ReservationCancellation, ReservationCreate, ReservationList, ReservationRead,
)
from app.reservations import effective_status, ensure_no_overlap, reservation_read, validate_interval
from app.routers.auth import rollback
from app.space_schemas import SpaceFailure

router = APIRouter(prefix="/reservations", tags=["reservations"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def tenant_reservation_query(tenant_id: UUID):
    # One statement keeps the reservation and payment from the same database
    # snapshot. A missing legacy payment must not hide its reservation.
    return (
        select(Reservation, Space, Payment)
        .join(Space, Space.id == Reservation.space_id)
        .outerjoin(Payment, Payment.reservation_id == Reservation.id)
        .where(Reservation.tenant_id == tenant_id)
    )


@router.get(
    "", response_model=ReservationList,
    responses={503: {"model": SpaceFailure, "description": "Consulta no disponible."}},
)
def list_reservations(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> ReservationList:
    try:
        rows = session.exec(tenant_reservation_query(user.id).order_by(
            Reservation.starts_at, Reservation.id,
        )).all()
        # Read the clock once after the query so all states and capabilities
        # describe the same instant, including time spent waiting for the DB.
        now = utc_now()
        upcoming, history = [], []
        for reservation, space, payment in rows:
            item = reservation_read(reservation, space, payment, now)
            (upcoming if item.status in {"pending_payment", "paid"} else history).append(item)
        # Stable sorting preserves ascending UUID order for equal start times.
        history.sort(key=lambda item: item.starts_at, reverse=True)
        return ReservationList(items=upcoming + history, as_of=now)
    except SQLAlchemyError:
        message = "No pudimos consultar tus reservas. Inténtalo nuevamente."
        raise SpaceError(503, message) from None


@router.post(
    "", response_model=ReservationRead, status_code=status.HTTP_201_CREATED,
    responses={
        409: {"model": SpaceFailure, "description": "Espacio u horario no disponible."},
        422: {"model": SpaceFailure, "description": "Intervalo inválido."},
        503: {"model": SpaceFailure, "description": "Reserva no disponible."},
    },
)
def create_reservation(
    request: ReservationCreate,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> ReservationRead:
    try:
        # This lock is shared with editing, status changes and deletion. Keep it
        # through both inserts; re-read the clock only after any lock wait.
        space = get_reservable_space(request.space_id, session, user.id)
        now = utc_now()
        starts_at, ends_at, duration = validate_interval(request, space, now)
        ensure_no_overlap(session, space, starts_at, ends_at, now)
        reservation = Reservation(
            space_id=space.id, tenant_id=user.id, starts_at=starts_at, ends_at=ends_at,
            duration_hours=duration, unit_price=space.price_per_hour,
            total_price=space.price_per_hour * duration, created_at=now,
            payment_expires_at=min(now + timedelta(minutes=15), starts_at),
            status="pending_payment",
        )
        session.add(reservation)
        session.flush()
        payment = Payment(reservation_id=reservation.id, status="pending", created_at=now)
        session.add(payment)
        response = reservation_read(reservation, space, payment, now)
        session.commit()
    except SpaceError:
        rollback(session)
        raise
    except SQLAlchemyError:
        rollback(session)
        message = "No pudimos crear la reserva. Inténtalo nuevamente."
        raise SpaceError(503, message) from None
    return response


@router.get(
    "/received", response_model=ReceivedReservationList,
    responses={
        404: {"model": SpaceFailure, "description": "Espacio propio no encontrado."},
        503: {"model": SpaceFailure, "description": "Consulta no disponible."},
    },
)
def list_received_reservations(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
    space_id: UUID | None = None,
) -> ReceivedReservationList:
    try:
        if space_id is not None:
            owned = session.exec(select(Space.id).where(
                Space.id == space_id, Space.owner_id == user.id,
            )).first()
            if owned is None:
                raise SpaceError(404, "No encontramos el espacio propio solicitado.")
        # Ownership is part of the query, including when the caller is an admin.
        query = (
            select(Reservation, Space, Payment, User.name)
            .join(Space, Space.id == Reservation.space_id)
            .join(User, User.id == Reservation.tenant_id)
            .outerjoin(Payment, Payment.reservation_id == Reservation.id)
            .where(Space.owner_id == user.id)
        )
        if space_id is not None:
            query = query.where(Space.id == space_id)
        rows = session.exec(query.order_by(Reservation.starts_at, Reservation.id)).all()
        now = utc_now()
        upcoming, history = [], []
        for reservation, space, payment, tenant_name in rows:
            data = reservation_read(reservation, space, payment, now).model_dump()
            # A property owner cannot pay on behalf of the tenant.
            data["can_pay"] = False
            item = ReceivedReservationRead(**data, tenant_name=tenant_name)
            (upcoming if item.status in {"pending_payment", "paid"} else history).append(item)
        history.sort(key=lambda item: item.starts_at, reverse=True)
        return ReceivedReservationList(items=upcoming + history, as_of=now)
    except SQLAlchemyError:
        raise SpaceError(503, "No pudimos consultar las reservas recibidas. Inténtalo nuevamente.") from None


@router.post(
    "/{reservation_id}/payment", response_model=ReservationRead,
    responses={
        404: {"model": SpaceFailure, "description": "Reserva no accesible."},
        409: {"model": SpaceFailure, "description": "La reserva no admite pago."},
        503: {"model": SpaceFailure, "description": "Pago simulado no disponible."},
    },
)
def simulate_payment(
    reservation_id: UUID,
    request: PaymentSimulation,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> ReservationRead:
    try:
        space_id = session.exec(select(Reservation.space_id).where(
            Reservation.id == reservation_id, Reservation.tenant_id == user.id,
        )).first()
        if space_id is None:
            raise SpaceError(404, "No encontramos la reserva solicitada.")
        # Writers use the same lock order: space -> reservation -> payment.
        # Keep the locks through commit; read the clock after any waiting.
        space = session.exec(select(Space).where(Space.id == space_id)
            .with_for_update().execution_options(populate_existing=True)).first()
        reservation = session.exec(select(Reservation).where(
            Reservation.id == reservation_id, Reservation.tenant_id == user.id,
        ).with_for_update().execution_options(populate_existing=True)).first()
        if space is None or reservation is None:
            raise SpaceError(404, "No encontramos la reserva solicitada.")
        payment = session.exec(select(Payment).where(Payment.reservation_id == reservation.id)
            .with_for_update().execution_options(populate_existing=True)).first()
        now = utc_now()
        current = effective_status(reservation, now)
        if current in {"cancelled", "expired", "completed"}:
            raise SpaceError(409, "Esta reserva está cancelada, expirada o finalizada y no admite pagos.")
        if current == "paid" and payment is not None and payment.status == "approved":
            # An approval retry (or a later rejection) never rewrites this result.
            return reservation_read(reservation, space, payment, now)
        if current != "pending_payment" or reservation.starts_at <= now:
            raise SpaceError(409, "Esta reserva ya no admite pagos.")
        if payment is not None and payment.status not in {"pending", "rejected"}:
            raise SpaceError(409, "El pago de esta reserva no admite un nuevo intento.")
        if payment is None:
            payment = Payment(reservation_id=reservation.id, created_at=now)
        payment.status = request.result
        payment.amount = reservation.total_price
        payment.processed_at = now
        if request.result == "approved":
            reservation.status = "paid"
        session.add(payment)
        session.add(reservation)
        session.flush()
        response = reservation_read(reservation, space, payment, now)
        session.commit()
        return response
    except SpaceError:
        rollback(session)
        raise
    except SQLAlchemyError:
        rollback(session)
        raise SpaceError(503, "No pudimos confirmar el pago simulado. Actualiza la reserva antes de reintentar.") from None


@router.post(
    "/{reservation_id}/cancel", response_model=ReservationRead,
    responses={
        404: {"model": SpaceFailure, "description": "Reserva no accesible."},
        409: {"model": SpaceFailure, "description": "La reserva no admite cancelación."},
        503: {"model": SpaceFailure, "description": "Cancelación no disponible."},
    },
)
def cancel_reservation(
    reservation_id: UUID,
    request: ReservationCancellation,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> ReservationRead:
    try:
        space_id = session.exec(
            select(Reservation.space_id).join(Space, Space.id == Reservation.space_id)
            .where(Reservation.id == reservation_id,
                   (Reservation.tenant_id == user.id) | (Space.owner_id == user.id))
        ).first()
        if space_id is None:
            raise SpaceError(404, "No encontramos la reserva solicitada.")
        # Shared with payment and reservation creation: space -> reservation -> payment.
        space = session.exec(select(Space).where(Space.id == space_id)
            .with_for_update().execution_options(populate_existing=True)).first()
        reservation = session.exec(select(Reservation).where(Reservation.id == reservation_id)
            .with_for_update().execution_options(populate_existing=True)).first()
        if space is None or reservation is None or user.id not in (space.owner_id, reservation.tenant_id):
            raise SpaceError(404, "No encontramos la reserva solicitada.")
        payment = session.exec(select(Payment).where(Payment.reservation_id == reservation.id)
            .with_for_update().execution_options(populate_existing=True)).first()
        now = utc_now()
        # Replays remain successful after the original start time and preserve the first audit.
        if reservation.status == "cancelled":
            return reservation_read(reservation, space, payment, now)
        if effective_status(reservation, now) not in {"pending_payment", "paid"} or reservation.starts_at <= now:
            raise SpaceError(409, "Esta reserva está expirada, finalizada o ya iniciada y no admite cancelación.")
        reservation.status = "cancelled"
        reservation.cancelled_by = user.id
        reservation.cancelled_at = now
        session.add(reservation)
        if payment is not None and payment.status == "approved":
            payment.status = "refunded"
            session.add(payment)
        session.flush()
        response = reservation_read(reservation, space, payment, now)
        session.commit()
        return response
    except SpaceError:
        rollback(session)
        raise
    except SQLAlchemyError:
        rollback(session)
        raise SpaceError(503, "No pudimos confirmar la cancelación. Actualiza las reservas antes de reintentar.") from None


@router.get("/{reservation_id}", response_model=ReservationRead)
def get_reservation(
    reservation_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> ReservationRead:
    try:
        row = session.exec(tenant_reservation_query(user.id).where(
            Reservation.id == reservation_id,
        )).first()
        if row is None:
            raise SpaceError(404, "No encontramos la reserva solicitada.")
        reservation, space, payment = row
        return reservation_read(reservation, space, payment, utc_now())
    except SQLAlchemyError:
        message = "No pudimos consultar la reserva. Inténtalo nuevamente."
        raise SpaceError(503, message) from None
