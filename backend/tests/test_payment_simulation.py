from datetime import timedelta
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, select

from app.models import Payment, Reservation, Space, User
from test_reservation_history import stored_history
from test_reservations import (
    as_datetime, booking_setup, clock, records, reserve, run_contending_requests,
)
from test_space_updates import NOW
from test_spaces import authenticate

pytestmark = pytest.mark.postgres


def pay(client, reservation_id, headers, result="approved", **extra):
    return client.post(f"/api/reservations/{reservation_id}/payment", headers=headers,
                       json={"result": result, **extra})


def test_ca01_solo_arrendatario_sin_filtrar_identidad(postgres_client, postgres_engine, booking_setup):
    owner, owner_headers, space, _, headers = booking_setup
    booking = reserve(postgres_client, space, headers).json()
    _, other_headers = authenticate(postgres_client, "otro-pago@example.com")
    with Session(postgres_engine) as session:
        admin = session.get(User, UUID(owner["id"]))
        admin.is_admin = True
        session.add(admin)
        session.commit()
    before = stored_history(postgres_engine)
    assert pay(postgres_client, booking["id"], {}).status_code == 401
    for auth in (owner_headers, other_headers):
        foreign = pay(postgres_client, booking["id"], auth)
        missing = pay(postgres_client, uuid4(), auth)
        assert foreign.status_code == missing.status_code == 404
        assert foreign.json() == missing.json()
    assert stored_history(postgres_engine) == before


def test_ca02_ca04_aprobacion_persistida_referencia_importe_fecha_y_panel(
    postgres_client, postgres_engine, booking_setup,
):
    _, owner_headers, space, _, headers = booking_setup
    booking = reserve(postgres_client, space, headers).json()
    response = pay(postgres_client, booking["id"], headers)
    assert response.status_code == 200 and response.headers["Cache-Control"] == "no-store"
    body = response.json()
    assert body["status"] == "paid" and not body["can_pay"]
    assert body["payment"] == {
        "id": booking["payment"]["id"], "status": "approved", "amount": booking["total_price"],
        "processed_at": body["payment"]["processed_at"],
    }
    assert as_datetime(body["payment"]["processed_at"]) == NOW
    saved, payments = records(postgres_engine)
    assert len(saved) == len(payments) == 1
    assert saved[0].status == "paid" and payments[0].amount == saved[0].total_price
    assert payments[0].processed_at == NOW
    assert postgres_client.get(f"/api/reservations/{booking['id']}", headers=headers).json() == body
    assert postgres_client.get("/api/reservations", headers=headers).json()["items"] == [body]
    received = postgres_client.get("/api/reservations/received", headers=owner_headers).json()["items"]
    assert received[0]["payment"] == body["payment"] and not received[0]["can_pay"]


def test_ca05_ca06_rechazo_reintento_e_idempotencia(postgres_client, postgres_engine, booking_setup, clock):
    _, _, space, _, headers = booking_setup
    booking = reserve(postgres_client, space, headers).json()
    rejected = pay(postgres_client, booking["id"], headers, "rejected").json()
    assert rejected["status"] == "pending_payment" and rejected["can_pay"]
    assert rejected["payment"]["status"] == "rejected"
    clock["now"] += timedelta(minutes=1)
    approved = pay(postgres_client, booking["id"], headers).json()
    assert approved["payment"]["id"] == rejected["payment"]["id"]
    assert as_datetime(approved["payment"]["processed_at"]) == clock["now"]
    before = stored_history(postgres_engine)
    clock["now"] += timedelta(hours=1)  # el plazo de pago inicial ya pasó
    for result in ("approved", "rejected"):
        response = pay(postgres_client, booking["id"], headers, result)
        assert response.status_code == 200
        assert response.json()["payment"] == approved["payment"]
        assert response.json()["status"] == "paid"
    assert stored_history(postgres_engine) == before


@pytest.mark.parametrize("body", [
    {}, {"result": "pending"}, {"result": True},
    {"result": "approved", "amount": 1}, {"result": "approved", "status": "paid"},
])
def test_ca03_datos_controlados_por_servidor(postgres_client, postgres_engine, booking_setup, body):
    _, _, space, _, headers = booking_setup
    booking = reserve(postgres_client, space, headers).json()
    before = stored_history(postgres_engine)
    response = postgres_client.post(f"/api/reservations/{booking['id']}/payment", headers=headers, json=body)
    assert response.status_code == 422
    assert stored_history(postgres_engine) == before


@pytest.mark.parametrize("state", ["deadline", "started", "cancelled", "expired", "completed", "paid_completed"])
def test_ca03_ca07_limites_y_estados_no_admiten_pago(
    postgres_client, postgres_engine, booking_setup, clock, state,
):
    _, _, space, _, headers = booking_setup
    booking = reserve(postgres_client, space, headers).json()
    with Session(postgres_engine) as session:
        item = session.get(Reservation, UUID(booking["id"]))
        if state == "deadline":
            clock["now"] = item.payment_expires_at
        elif state == "started":
            clock["now"] = item.starts_at
        elif state == "paid_completed":
            item.status = "paid"
            payment = session.exec(select(Payment).where(Payment.reservation_id == item.id)).one()
            payment.status = "approved"
            session.add(payment)
            clock["now"] = item.ends_at
        else:
            item.status = state
        session.add(item)
        session.commit()
    before = stored_history(postgres_engine)
    assert pay(postgres_client, booking["id"], headers).status_code == 409
    assert stored_history(postgres_engine) == before


def test_ca08_tarifa_desactivacion_y_retiro_no_alteran_contrato(postgres_client, postgres_engine, booking_setup):
    _, _, space, _, headers = booking_setup
    booking = reserve(postgres_client, space, headers).json()
    with Session(postgres_engine) as session:
        item = session.get(Space, UUID(space["id"]))
        item.price_per_hour = 50000
        item.is_active = False
        item.is_withdrawn = True
        session.add(item)
        session.commit()
    body = pay(postgres_client, booking["id"], headers).json()
    assert body["status"] == "paid"
    assert body["payment"]["amount"] == booking["total_price"] == 30000
    assert body["unit_price"] == booking["unit_price"]


def test_ca09_error_despues_del_flush_revierte_pago_y_reserva(postgres_client, postgres_engine, booking_setup, monkeypatch):
    _, _, space, _, headers = booking_setup
    booking = reserve(postgres_client, space, headers).json()
    before = stored_history(postgres_engine)

    def fail_commit(session):
        raise SQLAlchemyError("detalle-privado-de-persistencia")

    with monkeypatch.context() as context:
        context.setattr(Session, "commit", fail_commit)
        response = pay(postgres_client, booking["id"], headers)
    assert response.status_code == 503 and "detalle-privado" not in response.text
    assert stored_history(postgres_engine) == before
    assert pay(postgres_client, booking["id"], headers).json()["status"] == "paid"


def test_ca06_dos_pagos_reales_concurrentes_comparten_referencia(postgres_client, postgres_engine, booking_setup):
    _, _, space, _, headers = booking_setup
    booking = reserve(postgres_client, space, headers).json()
    first, second = run_contending_requests(postgres_engine,
        lambda: pay(postgres_client, booking["id"], headers),
        lambda: pay(postgres_client, booking["id"], headers, "rejected"))
    assert first.status_code == second.status_code == 200
    assert first.json()["payment"] == second.json()["payment"]
    assert second.json()["status"] == "paid"
    assert len(records(postgres_engine)[1]) == 1


def test_ca03_hora_se_revalida_despues_de_esperar_bloqueo(postgres_client, postgres_engine, booking_setup, clock):
    _, _, space, _, headers = booking_setup
    booking = reserve(postgres_client, space, headers).json()

    def hold_space_and_advance_clock():
        with Session(postgres_engine) as session:
            session.exec(select(Space).where(Space.id == UUID(space["id"])).with_for_update()).one()
            clock["now"] = as_datetime(booking["payment_expires_at"])
            session.commit()

    _, response = run_contending_requests(postgres_engine, hold_space_and_advance_clock,
        lambda: pay(postgres_client, booking["id"], headers))
    assert response.status_code == 409
    saved, payments = records(postgres_engine)
    assert saved[0].status == "pending_payment" and payments[0].status == "pending"


def test_migracion_conserva_pago_historico_sin_inventar_resultado(postgres_client, postgres_engine, booking_setup):
    _, _, space, _, headers = booking_setup
    booking = reserve(postgres_client, space, headers).json()
    original = stored_history(postgres_engine)
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    with postgres_engine.begin() as connection:
        config.attributes["connection"] = connection
        command.downgrade(config, "0005_reservation_creation")
        command.upgrade(config, "head")
    assert stored_history(postgres_engine) == original
    saved = postgres_client.get(f"/api/reservations/{booking['id']}", headers=headers).json()
    assert saved["payment"]["amount"] is None and saved["payment"]["processed_at"] is None


def test_reserva_legada_vigente_sin_pago_crea_su_primer_resultado(postgres_client, postgres_engine, booking_setup):
    _, _, space, _, headers = booking_setup
    booking = reserve(postgres_client, space, headers).json()
    with Session(postgres_engine) as session:
        session.delete(session.get(Payment, UUID(booking["payment"]["id"])))
        session.commit()
    response = pay(postgres_client, booking["id"], headers)
    assert response.status_code == 200 and response.json()["status"] == "paid"
    assert response.json()["payment"]["amount"] == booking["total_price"]
    assert len(records(postgres_engine)[1]) == 1


@pytest.mark.parametrize("winner", ["payment", "cancellation"])
def test_pago_y_escritor_de_cancelacion_respetan_protocolo_de_bloqueo(
    postgres_client, postgres_engine, booking_setup, winner,
):
    _, _, space, _, headers = booking_setup
    booking = reserve(postgres_client, space, headers).json()

    # HU-15 has no public endpoint yet. This writer tests the shared locking
    # contract; it is not evidence of the future cancellation UI/API.
    def cancel_writer():
        with Session(postgres_engine) as session:
            session.exec(select(Space).where(Space.id == UUID(space["id"])).with_for_update()).one()
            item = session.exec(select(Reservation).where(Reservation.id == UUID(booking["id"]))
                .with_for_update()).one()
            payment = session.exec(select(Payment).where(Payment.reservation_id == item.id).with_for_update()).one()
            item.status = "cancelled"
            if payment.status == "approved":
                payment.status = "refunded"
            session.add(item)
            session.add(payment)
            session.commit()

    process = lambda: pay(postgres_client, booking["id"], headers)
    if winner == "payment":
        response, _ = run_contending_requests(postgres_engine, process, cancel_writer)
        assert response.status_code == 200
    else:
        _, response = run_contending_requests(postgres_engine, cancel_writer, process)
        assert response.status_code == 409
    saved, payments = records(postgres_engine)
    assert saved[0].status == "cancelled"
    assert payments[0].status == ("refunded" if winner == "payment" else "pending")
