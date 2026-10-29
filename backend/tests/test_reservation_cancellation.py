from datetime import timedelta
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlmodel import Session, select

from app.models import Payment, Reservation, Space, User
from test_payment_simulation import pay
from test_reservation_history import stored_history
from test_reservations import as_datetime, booking_setup, clock, records, reserve, run_contending_requests
from test_space_updates import NOW
from test_spaces import authenticate

pytestmark = pytest.mark.postgres


def cancel(client, reservation_id, headers, **body):
    return client.post(f"/api/reservations/{reservation_id}/cancel", headers=headers, json=body)


def test_sesion_y_propiedad_incluso_admin_sin_revelar_existencia(postgres_client, postgres_engine, booking_setup):
    _, _, space, _, headers = booking_setup
    booking = reserve(postgres_client, space, headers).json()
    stranger, stranger_headers = authenticate(postgres_client, "extra-cancel@example.com")
    with Session(postgres_engine) as session:
        user = session.get(User, UUID(stranger["id"]))
        user.is_admin = True
        session.add(user)
        session.commit()
    before = stored_history(postgres_engine)
    assert cancel(postgres_client, booking["id"], {}).status_code == 401
    missing = cancel(postgres_client, uuid4(), stranger_headers)
    foreign = cancel(postgres_client, booking["id"], stranger_headers)
    assert foreign.status_code == missing.status_code == 404 and foreign.json() == missing.json()
    assert cancel(postgres_client, "invalid", headers).status_code == 422
    assert stored_history(postgres_engine) == before


@pytest.mark.parametrize("actor", ["owner", "tenant"])
@pytest.mark.parametrize("payment_state", ["pending", "rejected", "approved"])
def test_cancelacion_atomica_auditoria_historial_y_horario_liberado(
    postgres_client, postgres_engine, booking_setup, actor, payment_state,
):
    owner, owner_headers, space, tenant, tenant_headers = booking_setup
    booking = reserve(postgres_client, space, tenant_headers).json()
    if payment_state != "pending":
        assert pay(postgres_client, booking["id"], tenant_headers, payment_state).status_code == 200
    before = stored_history(postgres_engine)
    user, headers = (owner, owner_headers) if actor == "owner" else (tenant, tenant_headers)
    response = cancel(postgres_client, booking["id"], headers)
    assert response.status_code == 200 and response.headers["Cache-Control"] == "no-store"
    body = response.json()
    assert body["status"] == "cancelled" and not body["can_cancel"] and not body["can_pay"]
    assert body["payment"]["status"] == ("refunded" if payment_state == "approved" else payment_state)
    saved, payments = records(postgres_engine)
    assert saved[0].cancelled_by == UUID(user["id"]) and saved[0].cancelled_at == NOW
    for key in ("space_id", "tenant_id", "starts_at", "ends_at", "unit_price", "total_price", "created_at"):
        assert getattr(saved[0], key) == before["reservations"][booking["id"]][key]
    for key in ("id", "amount", "processed_at", "created_at"):
        assert getattr(payments[0], key) == before["payments"][booking["payment"]["id"]][key]
    received = postgres_client.get("/api/reservations/received", headers=owner_headers).json()["items"][0]
    assert received["status"] == "cancelled" and received["payment"] == body["payment"]
    assert postgres_client.get(f"/api/reservations/{booking['id']}", headers=tenant_headers).json() == body
    # A real new booking in the same interval proves that cancellation releases it.
    assert reserve(postgres_client, space, tenant_headers).status_code == 201


def test_reintentos_por_ambos_roles_conservan_primer_autor_y_fecha(
    postgres_client, postgres_engine, booking_setup, clock,
):
    owner, owner_headers, space, _, tenant_headers = booking_setup
    booking = reserve(postgres_client, space, tenant_headers).json()
    pay(postgres_client, booking["id"], tenant_headers)
    first = cancel(postgres_client, booking["id"], owner_headers).json()
    before = stored_history(postgres_engine)
    clock["now"] = as_datetime(booking["ends_at"]) + timedelta(days=1)
    for headers in (owner_headers, tenant_headers):
        response = cancel(postgres_client, booking["id"], headers)
        assert response.status_code == 200 and response.json() == first
    assert stored_history(postgres_engine) == before
    assert records(postgres_engine)[0][0].cancelled_by == UUID(owner["id"])


@pytest.mark.parametrize("boundary", ["deadline", "start_pending", "start_paid", "expired", "completed"])
def test_limites_temporales_y_estados_no_cancelables_no_modifican_datos(
    postgres_client, postgres_engine, booking_setup, clock, boundary,
):
    _, owner_headers, space, _, tenant_headers = booking_setup
    booking = reserve(postgres_client, space, tenant_headers).json()
    if boundary in {"start_paid", "completed"}:
        pay(postgres_client, booking["id"], tenant_headers)
    if boundary == "deadline":
        clock["now"] = as_datetime(booking["payment_expires_at"])
    elif boundary.startswith("start"):
        clock["now"] = as_datetime(booking["starts_at"])
    elif boundary == "completed":
        clock["now"] = as_datetime(booking["ends_at"])
    else:
        with Session(postgres_engine) as session:
            item = session.get(Reservation, UUID(booking["id"]))
            item.status = "expired"
            session.add(item)
            session.commit()
    before = stored_history(postgres_engine)
    response = cancel(postgres_client, booking["id"], owner_headers)
    assert response.status_code == 409
    assert stored_history(postgres_engine) == before


def test_publicacion_retirada_y_tarifa_nueva_no_impiden_cancelar_contrato(
    postgres_client, postgres_engine, booking_setup,
):
    _, owner_headers, space, _, tenant_headers = booking_setup
    booking = reserve(postgres_client, space, tenant_headers).json()
    pay(postgres_client, booking["id"], tenant_headers)
    with Session(postgres_engine) as session:
        item = session.get(Space, UUID(space["id"]))
        item.is_active = False
        item.is_withdrawn = True
        item.price_per_hour = 50000
        session.add(item)
        session.commit()
    response = cancel(postgres_client, booking["id"], owner_headers)
    assert response.status_code == 200 and response.json()["payment"]["amount"] == booking["total_price"]


@pytest.mark.parametrize("legacy", ["missing_payment", "historical_approval"])
def test_compatibilidad_sin_inventar_pagos_fechas_o_importes(postgres_client, postgres_engine, booking_setup, legacy):
    _, owner_headers, space, _, tenant_headers = booking_setup
    booking = reserve(postgres_client, space, tenant_headers).json()
    with Session(postgres_engine) as session:
        payment = session.get(Payment, UUID(booking["payment"]["id"]))
        if legacy == "missing_payment":
            session.delete(payment)
        else:
            payment.status = "approved"
            item = session.get(Reservation, UUID(booking["id"]))
            item.status = "paid"
            session.add(payment)
            session.add(item)
        session.commit()
    body = cancel(postgres_client, booking["id"], owner_headers).json()
    assert body["status"] == "cancelled"
    if legacy == "missing_payment":
        assert body["payment"] is None and records(postgres_engine)[1] == []
    else:
        assert body["payment"]["status"] == "refunded"
        assert body["payment"]["amount"] is None and body["payment"]["processed_at"] is None


def test_fallo_de_commit_revierte_cancelacion_auditoria_y_reembolso(
    postgres_client, postgres_engine, booking_setup, monkeypatch,
):
    _, owner_headers, space, _, tenant_headers = booking_setup
    booking = reserve(postgres_client, space, tenant_headers).json()
    pay(postgres_client, booking["id"], tenant_headers)
    before = stored_history(postgres_engine)
    def fail_commit(session):
        raise SQLAlchemyError("detalle-privado-cancelacion")
    with monkeypatch.context() as context:
        context.setattr(Session, "commit", fail_commit)
        response = cancel(postgres_client, booking["id"], owner_headers)
    assert response.status_code == 503 and "detalle-privado" not in response.text
    assert stored_history(postgres_engine) == before
    assert cancel(postgres_client, booking["id"], owner_headers).json()["status"] == "cancelled"


def test_datos_de_auditoria_y_reembolso_no_se_aceptan_del_cliente(postgres_client, postgres_engine, booking_setup):
    _, headers, space, _, tenant_headers = booking_setup
    booking = reserve(postgres_client, space, tenant_headers).json()
    before = stored_history(postgres_engine)
    assert cancel(postgres_client, booking["id"], headers, cancelled_by=str(uuid4()), amount=1).status_code == 422
    assert stored_history(postgres_engine) == before


def test_cancelaciones_concurrentes_preservan_primera_auditoria(postgres_client, postgres_engine, booking_setup):
    owner, owner_headers, space, _, tenant_headers = booking_setup
    booking = reserve(postgres_client, space, tenant_headers).json()
    first, second = run_contending_requests(postgres_engine,
        lambda: cancel(postgres_client, booking["id"], owner_headers),
        lambda: cancel(postgres_client, booking["id"], tenant_headers))
    assert first.status_code == second.status_code == 200 and first.json() == second.json()
    saved, _ = records(postgres_engine)
    assert saved[0].cancelled_by == UUID(owner["id"])


def test_hora_se_revalida_despues_del_bloqueo(postgres_client, postgres_engine, booking_setup, clock):
    _, owner_headers, space, _, tenant_headers = booking_setup
    booking = reserve(postgres_client, space, tenant_headers).json()
    def advance_while_locked():
        with Session(postgres_engine) as session:
            session.exec(select(Space).where(Space.id == UUID(space["id"])).with_for_update()).one()
            clock["now"] = as_datetime(booking["payment_expires_at"])
            session.commit()
    _, response = run_contending_requests(postgres_engine, advance_while_locked,
        lambda: cancel(postgres_client, booking["id"], owner_headers))
    assert response.status_code == 409
    assert records(postgres_engine)[0][0].cancelled_at is None


def test_migracion_conserva_cancelacion_legada_y_restringe_auditoria_incompleta(
    postgres_client, postgres_engine, booking_setup,
):
    _, _, space, _, tenant_headers = booking_setup
    booking = reserve(postgres_client, space, tenant_headers).json()
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    with postgres_engine.begin() as connection:
        config.attributes["connection"] = connection
        command.downgrade(config, "0006_payment_simulation")
        connection.execute(text("UPDATE reservations SET status='cancelled' WHERE id=:id"), {"id": UUID(booking["id"])})
        command.upgrade(config, "head")
    saved, _ = records(postgres_engine)
    assert saved[0].status == "cancelled" and saved[0].cancelled_by is None and saved[0].cancelled_at is None
    assert saved[0].total_price == booking["total_price"]
    with Session(postgres_engine) as session:
        item = session.get(Reservation, saved[0].id)
        item.cancelled_at = NOW
        session.add(item)
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()
