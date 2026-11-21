"""HU-18: administrative moderation of publications.

Administrators only list, withdraw and restore spaces. They never change prices, owners,
passwords or payment states from here (CA-07), and existing reservations are untouched (CA-05).
"""
from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import aliased
from sqlmodel import Session, select

from app.database import get_session
from app.dependencies import require_admin
from app.errors import SpaceError
from app.models import Space, SpaceModeration, User
from app.routers.auth import rollback
from app.space_schemas import AdminSpace, SpaceFailure, SpaceWithdrawalRequest

router = APIRouter(prefix="/admin", tags=["admin"])

FAILURES = {
    404: {"model": SpaceFailure, "description": "Espacio inexistente."},
    409: {"model": SpaceFailure, "description": "El estado actual no admite la acción."},
    503: {"model": SpaceFailure, "description": "Moderación no disponible."},
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def admin_space(space: Space, owner: User, withdrawn_by: User | None) -> AdminSpace:
    return AdminSpace(
        id=space.id, name=space.name, commune=space.commune,
        owner_id=owner.id, owner_name=owner.name, owner_email=owner.email,
        is_active=space.is_active, is_withdrawn=space.is_withdrawn,
        withdrawal_reason=space.withdrawal_reason, withdrawn_at=space.withdrawn_at,
        withdrawn_by_name=withdrawn_by.name if withdrawn_by else None,
    )


def locked_space(session: Session, space_id: UUID) -> Space:
    # Same lock as reservation creation, payment and cancellation: a booking cannot
    # interleave with a withdrawal of its space.
    space = session.exec(
        select(Space).where(Space.id == space_id).with_for_update()
        .execution_options(populate_existing=True)
    ).first()
    if space is None:
        raise SpaceError(404, "No encontramos el espacio solicitado.")
    return space


@router.get("/spaces", response_model=list[AdminSpace], responses={503: FAILURES[503]})
def list_spaces(
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> list[AdminSpace]:
    owner = aliased(User)
    withdrawer = aliased(User)
    try:
        rows = session.exec(
            select(Space, owner, withdrawer)
            .join(owner, owner.id == Space.owner_id)
            .outerjoin(withdrawer, withdrawer.id == Space.withdrawn_by)
            .order_by(Space.name, Space.id)
        ).all()
    except SQLAlchemyError:
        message = "No pudimos consultar las publicaciones. Inténtalo nuevamente."
        raise SpaceError(503, message) from None
    return [admin_space(*row) for row in rows]


@router.post("/spaces/{space_id}/withdrawal", response_model=AdminSpace, responses=FAILURES)
def withdraw_space(
    space_id: UUID,
    request: SpaceWithdrawalRequest,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> AdminSpace:
    try:
        space = locked_space(session, space_id)
        if space.is_withdrawn:
            raise SpaceError(409, "La publicación ya está retirada por administración.")
        now = utc_now()
        space.is_active = False
        space.is_withdrawn = True
        space.withdrawal_reason = request.reason
        space.withdrawn_by = admin.id
        space.withdrawn_at = now
        session.add(space)
        session.add(SpaceModeration(
            space_id=space.id, admin_id=admin.id, action="withdraw",
            reason=request.reason, created_at=now,
        ))
        session.flush()
        response = admin_space(space, session.get(User, space.owner_id), admin)
        session.commit()
        return response
    except SpaceError:
        rollback(session)
        raise
    except SQLAlchemyError:
        rollback(session)
        raise SpaceError(503, "No pudimos retirar la publicación. Actualiza el listado antes de reintentar.") from None


@router.delete("/spaces/{space_id}/withdrawal", response_model=AdminSpace, responses=FAILURES)
def restore_space(
    space_id: UUID,
    admin: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> AdminSpace:
    try:
        space = locked_space(session, space_id)
        if not space.is_withdrawn:
            raise SpaceError(409, "La publicación no está retirada por administración.")
        # CA-06: lifting the withdrawal leaves the space inactive; only its owner reactivates it.
        space.is_active = False
        space.is_withdrawn = False
        space.withdrawal_reason = None
        space.withdrawn_by = None
        space.withdrawn_at = None
        session.add(space)
        session.add(SpaceModeration(
            space_id=space.id, admin_id=admin.id, action="restore", created_at=utc_now(),
        ))
        session.flush()
        response = admin_space(space, session.get(User, space.owner_id), None)
        session.commit()
        return response
    except SpaceError:
        rollback(session)
        raise
    except SQLAlchemyError:
        rollback(session)
        raise SpaceError(503, "No pudimos levantar el retiro. Actualiza el listado antes de reintentar.") from None
