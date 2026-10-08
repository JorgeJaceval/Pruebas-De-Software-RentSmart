from datetime import timedelta
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlmodel import Session, select

from app.models import Payment, Reservation
from app.routers import reservations
from test_space_updates import NOW, SANTIAGO, create_space
from test_spaces import authenticate

pytestmark = pytest.mark.postgres


def test_upgrade_conserva_snapshot_legado_fraccionario_sin_inventar_pago(
    postgres_client, postgres_engine, monkeypatch,
):
    monkeypatch.setattr(reservations, "utc_now", lambda: NOW)
    _, _, space = create_space(postgres_client)
    tenant, headers = authenticate(postgres_client, "legado@example.com")
    reservation_id = uuid4()
    start = (NOW.astimezone(SANTIAGO) + timedelta(days=1)).replace(hour=9)
    expiry = NOW + timedelta(minutes=11)
    original = {
        "id": reservation_id, "space_id": UUID(space["id"]), "tenant_id": UUID(tenant["id"]),
        "starts_at": start, "ends_at": start + timedelta(hours=8, minutes=30),
        "status": "pending_payment", "payment_expires_at": expiry,
        "unit_price": 15000, "total_price": 127500,
    }
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    # The test owns an isolated schema. Simulate its pre-HU12 database and then
    # upgrade real existing data, including values allowed by the prior schema.
    with postgres_engine.begin() as connection:
        config.attributes["connection"] = connection
        command.downgrade(config, "0004_space_withdrawal")
        connection.execute(text("""
            INSERT INTO reservations
                (id, space_id, tenant_id, starts_at, ends_at, status,
                 payment_expires_at, unit_price, total_price)
            VALUES
                (:id, :space_id, :tenant_id, :starts_at, :ends_at, :status,
                 :payment_expires_at, :unit_price, :total_price)
        """), original)
        command.upgrade(config, "head")
    with Session(postgres_engine) as session:
        saved = session.get(Reservation, reservation_id)
        for field, value in original.items():
            assert getattr(saved, field) == value
        assert saved.duration_hours == 8.5
        assert saved.created_at == expiry - timedelta(minutes=15)
        assert session.exec(select(Payment)).all() == []
    response = postgres_client.get(f"/api/reservations/{reservation_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["duration_hours"] == 8.5
    assert response.json()["payment"] is None
    assert response.json()["unit_price"] == 15000 and response.json()["total_price"] == 127500
