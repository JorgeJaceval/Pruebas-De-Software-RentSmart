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
from app.reservation_schemas import ReservationCreate, ReservationRead
from app.reservations import ensure_no_overlap, reservation_read, validate_interval
from app.routers.auth import rollback
from app.space_schemas import SpaceFailure

router = APIRouter(prefix="/reservations", tags=["reservations"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


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


@router.get("/{reservation_id}", response_model=ReservationRead)
def get_reservation(
    reservation_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> ReservationRead:
    try:
        reservation = session.get(Reservation, reservation_id)
        if reservation is None or reservation.tenant_id != user.id:
            raise SpaceError(404, "No encontramos la reserva solicitada.")
        space = session.get(Space, reservation.space_id)
        payment = session.exec(select(Payment).where(Payment.reservation_id == reservation.id)).first()
        return reservation_read(reservation, space, payment, utc_now())
    except SQLAlchemyError:
        message = "No pudimos consultar la reserva. Inténtalo nuevamente."
        raise SpaceError(503, message) from None
