from datetime import datetime, time, timedelta, timezone

from sqlmodel import Session, select

from app.availability import SANTIAGO, blocking_reservation_condition, ensure_reservation_hours
from app.errors import SpaceError
from app.models import Payment, Reservation, Space
from app.reservation_schemas import PaymentRead, ReservationCreate, ReservationRead


def local_hour(calendar_date, hour: int, field: str) -> datetime:
    local = datetime.combine(calendar_date, time(hour), tzinfo=SANTIAGO)
    try:
        instant = local.astimezone(timezone.utc)
    except (OverflowError, ValueError):
        message = "La fecha y hora están fuera del intervalo permitido."
        raise SpaceError(422, message, {"date": message}) from None
    if instant.astimezone(SANTIAGO).replace(tzinfo=None) != local.replace(tzinfo=None):
        message = "Esta hora no existe por el cambio de hora en Santiago. Elige otra hora."
        raise SpaceError(422, message, {field: message})
    if local.utcoffset() != local.replace(fold=1).utcoffset():
        message = "Esta hora se repite por el cambio de hora en Santiago. Elige otra hora."
        raise SpaceError(422, message, {field: message})
    return instant


def validate_interval(request: ReservationCreate, space: Space, now: datetime):
    duration = request.end_hour - request.start_hour
    if not 1 <= duration <= 8:
        message = "Elige un intervalo de 1 a 8 horas con término posterior al inicio."
        raise SpaceError(422, message, {"end_hour": message})
    # Reject extreme calendar dates before timezone conversion can overflow.
    if request.date < now.astimezone(SANTIAGO).date():
        message = "El inicio debe ser posterior a la hora actual de Santiago."
        raise SpaceError(422, message, {"date": message, "start_hour": message})
    if request.date > (now + timedelta(days=90)).astimezone(SANTIAGO).date():
        message = "El inicio debe estar dentro de los próximos 90 días."
        raise SpaceError(422, message, {"date": message})
    starts_at = local_hour(request.date, request.start_hour, "start_hour")
    ends_at = local_hour(request.date, request.end_hour, "end_hour")
    if starts_at <= now:
        message = "El inicio debe ser posterior a la hora actual de Santiago."
        raise SpaceError(422, message, {"date": message, "start_hour": message})
    if starts_at > now + timedelta(days=90):
        message = "El inicio debe estar dentro de los próximos 90 días."
        raise SpaceError(422, message, {"date": message})
    try:
        ensure_reservation_hours(space, starts_at, ends_at)
    except SpaceError as error:
        fields = {"starts_at": "start_hour", "ends_at": "end_hour"}
        raise SpaceError(error.status_code, error.detail, {
            fields.get(key, key): value for key, value in error.errors.items()
        }) from None
    return starts_at, ends_at, duration


def ensure_no_overlap(session: Session, space: Space, starts_at: datetime, ends_at: datetime, now: datetime):
    overlap = session.exec(select(Reservation.id).where(
        Reservation.space_id == space.id,
        blocking_reservation_condition(now),
        Reservation.starts_at < ends_at,
        Reservation.ends_at > starts_at,
    ).limit(1)).first()
    if overlap is not None:
        message = "Este horario ya no está disponible. Elige otro intervalo."
        raise SpaceError(409, message)


def effective_status(reservation: Reservation, now: datetime) -> str:
    if reservation.status == "pending_payment" and now >= min(
        reservation.payment_expires_at, reservation.starts_at,
    ):
        return "expired"
    if reservation.status == "paid" and now >= reservation.ends_at:
        return "completed"
    return reservation.status


def reservation_read(reservation: Reservation, space: Space, payment: Payment | None, now: datetime) -> ReservationRead:
    start, end = reservation.starts_at.astimezone(SANTIAGO), reservation.ends_at.astimezone(SANTIAGO)
    current_status = effective_status(reservation, now)
    future_start = reservation.starts_at > now
    return ReservationRead(
        id=reservation.id, space_id=space.id, space_name=space.name,
        date=start.date(), start_hour=start.hour, end_hour=end.hour,
        starts_at=reservation.starts_at.astimezone(timezone.utc),
        ends_at=reservation.ends_at.astimezone(timezone.utc),
        duration_hours=reservation.duration_hours,
        unit_price=reservation.unit_price, total_price=reservation.total_price,
        created_at=reservation.created_at, payment_expires_at=reservation.payment_expires_at,
        status=current_status,
        payment=PaymentRead.model_validate(payment) if payment is not None else None,
        can_pay=current_status == "pending_payment" and future_start,
        can_cancel=current_status in {"pending_payment", "paid"} and future_start,
    )
