from datetime import datetime, time, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import and_, or_
from sqlmodel import Session, select

from app.errors import SpaceError
from app.models import Reservation, Space

SANTIAGO = ZoneInfo("America/Santiago")


def hour_conflicts(
    starts_at: datetime, ends_at: datetime, opening_hour: int, closing_hour: int,
) -> dict[str, str]:
    """Compare an interval with the uniform daily schedule in Santiago."""
    if starts_at.utcoffset() is None or ends_at.utcoffset() is None:
        return {"form": "El intervalo debe indicar su zona horaria."}
    if ends_at.astimezone(timezone.utc) <= starts_at.astimezone(timezone.utc):
        return {"form": "El término debe ser posterior al inicio."}
    start, end = starts_at.astimezone(SANTIAGO), ends_at.astimezone(SANTIAGO)
    if start.date() != end.date():
        return {"form": "El intervalo debe estar dentro del mismo día en Santiago."}
    errors = {}
    if start.time() < time(opening_hour):
        errors["opening_hour"] = "La apertura dejaría fuera una reserva vigente."
    if end.time() > time(closing_hour):
        errors["closing_hour"] = "El cierre dejaría fuera una reserva vigente."
    return errors


def ensure_reservation_hours(space: Space, starts_at: datetime, ends_at: datetime) -> None:
    conflicts = hour_conflicts(starts_at, ends_at, space.opening_hour, space.closing_hour)
    if not conflicts:
        return
    errors = {}
    if "opening_hour" in conflicts:
        errors["starts_at"] = "El inicio debe ser a la apertura o después, en hora de Santiago."
    if "closing_hour" in conflicts:
        errors["ends_at"] = "El término debe ser al cierre o antes, en hora de Santiago."
    message = conflicts.get("form", "El intervalo está fuera del horario diario del espacio.")
    errors["form"] = message
    raise SpaceError(422, message, errors)


def blocking_reservation_condition(now: datetime):
    return or_(
        and_(Reservation.status == "paid", Reservation.ends_at > now),
        and_(
            Reservation.status == "pending_payment",
            Reservation.payment_expires_at > now,
            Reservation.starts_at > now,
        ),
    )


def check_reserved_hours(
    session: Session, space_id: UUID, opening_hour: int, closing_hour: int, now: datetime,
) -> None:
    reservations = session.exec(select(Reservation).where(
        Reservation.space_id == space_id, blocking_reservation_condition(now),
    )).all()
    errors: dict[str, str] = {}
    for reservation in reservations:
        errors.update(hour_conflicts(
            reservation.starts_at, reservation.ends_at, opening_hour, closing_hour,
        ))
    if errors:
        message = "El horario propuesto afecta reservas vigentes."
        errors.setdefault("form", message)
        raise SpaceError(409, message, errors)
