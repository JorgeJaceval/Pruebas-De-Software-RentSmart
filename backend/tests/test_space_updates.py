import json
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlmodel import Session, select

from app.models import Reservation, Space, User
from app.routers import spaces
from app.space_schemas import SpaceCreate
from test_spaces import authenticate, publication

pytestmark = pytest.mark.postgres
SANTIAGO = ZoneInfo("America/Santiago")
NOW = datetime(2026, 7, 15, 10, tzinfo=SANTIAGO).astimezone(timezone.utc)


def create_space(client):
    owner, headers = authenticate(client)
    response = client.post("/api/spaces", headers=headers, json=publication())
    assert response.status_code == 201
    return owner, headers, response.json()


def update_data(space, **changes):
    return {**{field: space[field] for field in SpaceCreate.model_fields}, **changes}


def read_space(client, space, headers):
    response = client.get(f"/api/spaces/{space['id']}", headers=headers)
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"
    return response.json()


def seed_reservation(engine, space, tenant_id, **changes):
    tomorrow = NOW.astimezone(SANTIAGO) + timedelta(days=1)
    reservation = Reservation(
        space_id=UUID(space["id"]), tenant_id=UUID(tenant_id),
        starts_at=tomorrow.replace(hour=10), ends_at=tomorrow.replace(hour=12),
        status="paid", payment_expires_at=NOW + timedelta(hours=1),
        unit_price=space["price_per_hour"], total_price=space["price_per_hour"] * 2,
    )
    for field, value in changes.items():
        setattr(reservation, field, value)
    with Session(engine) as session:
        session.add(reservation)
        session.commit()
        return reservation.id


def reservation_snapshot(engine, reservation_id):
    with Session(engine) as session:
        return session.get(Reservation, reservation_id).model_dump()


def test_cp01_carga_edicion_normalizada_y_persistencia(postgres_client, postgres_engine):
    owner, headers, original = create_space(postgres_client)
    assert read_space(postgres_client, original, headers) == original
    edits = update_data(
        original, name="  Sala renovada central  ",
        description="  Espacio renovado para reuniones y trabajo en equipo.  ",
        category="multipurpose_room", commune="  Santiago  ",
        location_reference="  Cerca del metro Universidad de Chile.  ",
        capacity=20, price_per_hour=22000, conditions="  No se permite fumar en la sala.  ",
        photos=["  https://EXAMPLE.com/renovada.jpg  "], opening_hour=8, closing_hour=20,
    )
    response = postgres_client.put(f"/api/spaces/{original['id']}", headers=headers, json=edits)
    assert response.status_code == 200
    expected = {**edits, "id": original["id"], "owner_id": owner["id"], "is_active": True}
    for field in ("name", "description", "commune", "location_reference", "conditions"):
        expected[field] = expected[field].strip()
    expected["photos"] = ["https://example.com/renovada.jpg"]
    assert response.json() == expected
    assert response.headers["Cache-Control"] == "no-store"
    assert read_space(postgres_client, original, headers) == expected
    with Session(postgres_engine) as session:
        records = session.exec(select(Space)).all()
        assert len(records) == 1 and str(records[0].id) == original["id"]
        assert records[0].name == expected["name"]


def test_cp02_autenticacion_propietario_y_campos_no_editables(postgres_client, postgres_engine):
    _, headers, original = create_space(postgres_client)
    path = f"/api/spaces/{original['id']}"
    for invalid_headers in ({}, {"Authorization": "Bearer token-invalido"}):
        response = postgres_client.put(path, headers=invalid_headers, json=update_data(original))
        assert response.status_code == 401
        assert response.headers["Cache-Control"] == "no-store"
    other, other_headers = authenticate(postgres_client, "administrador-ajeno@example.com")
    with Session(postgres_engine) as session:
        user = session.get(User, UUID(other["id"]))
        user.is_admin = True
        session.add(user)
        session.commit()
    denied = postgres_client.put(path, headers=other_headers, json=update_data(original))
    assert denied.status_code == 403 and denied.headers["Cache-Control"] == "no-store"
    for field, value in (("owner_id", other["id"]), ("id", str(uuid4())), ("is_active", False)):
        response = postgres_client.put(path, headers=headers, json=update_data(original, **{field: value}))
        assert response.status_code == 422 and set(response.json()["errors"]) == {"form"}
    missing = postgres_client.put(f"/api/spaces/{uuid4()}", headers=headers, json=update_data(original))
    assert missing.status_code == 404
    assert read_space(postgres_client, original, headers) == original


def test_cp03_validaciones_y_horas_obligatorias_sin_cambios(postgres_client):
    _, headers, original = create_space(postgres_client)
    variants = [
        ("name", " "), ("name", "x" * 81), ("description", "corta"),
        ("commune", "x"), ("location_reference", "x"), ("conditions", "x"),
        ("name", "Nombre\x00inválido"), ("description", "Texto\ud800inválido"),
        ("capacity", 0), ("capacity", 101), ("capacity", True), ("capacity", "10"),
        ("capacity", 10.0), ("price_per_hour", 499), ("price_per_hour", 500001),
        ("price_per_hour", False), ("price_per_hour", "15000"), ("price_per_hour", 15000.0),
        ("category", "desconocida"), ("photos", []),
        ("photos", ["https://example.com/sala.jpg"] * 4), ("photos", ["http://example.com/foto.jpg"]),
        ("photos", ["https://"]), ("opening_hour", -1), ("opening_hour", True),
        ("closing_hour", 24), ("closing_hour", 9), ("closing_hour", "18"),
    ]
    for field, value in variants:
        response = postgres_client.put(
            f"/api/spaces/{original['id']}",
            headers={**headers, "Content-Type": "application/json"},
            content=json.dumps(update_data(original, **{field: value}), ensure_ascii=True),
        )
        assert response.status_code == 422 and set(response.json()["errors"]) == {field}
        assert response.headers["Cache-Control"] == "no-store"
        assert read_space(postgres_client, original, headers) == original
    for field in SpaceCreate.model_fields:
        incomplete = update_data(original)
        del incomplete[field]
        response = postgres_client.put(f"/api/spaces/{original['id']}", headers=headers, json=incomplete)
        assert response.status_code == 422 and set(response.json()["errors"]) == {field}
    assert read_space(postgres_client, original, headers) == original


def test_cp04_precio_nuevo_preserva_snapshot_reserva(postgres_client, postgres_engine):
    _, headers, original = create_space(postgres_client)
    tenant, _ = authenticate(postgres_client, "arrendatario@example.com")
    reservation_id = seed_reservation(postgres_engine, original, tenant["id"])
    before = reservation_snapshot(postgres_engine, reservation_id)
    response = postgres_client.put(
        f"/api/spaces/{original['id']}", headers=headers,
        json=update_data(original, price_per_hour=30000),
    )
    assert response.status_code == 200 and response.json()["price_per_hour"] == 30000
    assert reservation_snapshot(postgres_engine, reservation_id) == before
    assert before["unit_price"] == 15000 and before["total_price"] == 30000
    # The migrated database schema also enforces the snapshot's pricing bounds.
    with Session(postgres_engine) as session:
        record = session.get(Reservation, reservation_id)
        record.unit_price = 499
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()
    assert reservation_snapshot(postgres_engine, reservation_id) == before


def test_cp06_espacio_inactivo_conserva_su_estado(postgres_client, postgres_engine):
    _, headers, original = create_space(postgres_client)
    with Session(postgres_engine) as session:
        record = session.get(Space, UUID(original["id"]))
        record.is_active = False
        session.add(record)
        session.commit()
    inactive = read_space(postgres_client, original, headers)
    assert inactive["is_active"] is False
    response = postgres_client.put(
        f"/api/spaces/{original['id']}", headers=headers,
        json=update_data(inactive, name="Sala inactiva renovada"),
    )
    assert response.status_code == 200 and response.json()["is_active"] is False
    assert read_space(postgres_client, original, headers)["is_active"] is False


def test_cp07_reservas_vigentes_y_limites_exactos_en_santiago(
    postgres_client, postgres_engine, monkeypatch
):
    monkeypatch.setattr(spaces, "utc_now", lambda: NOW)
    _, headers, original = create_space(postgres_client)
    tenant, _ = authenticate(postgres_client, "arrendatario@example.com")
    local_now = NOW.astimezone(SANTIAGO)
    tomorrow = local_now + timedelta(days=1)
    future_start = tomorrow.replace(hour=9, minute=30)
    future_end = tomorrow.replace(hour=17, minute=30)
    cases = [
        ("paid", future_start, future_end, NOW - timedelta(days=1), 409),
        ("pending_payment", future_start, future_end, NOW + timedelta(hours=1), 409),
        ("paid", local_now.replace(hour=9, minute=30), local_now.replace(hour=17, minute=30), NOW, 409),
        *[(state, future_start, future_end, NOW + timedelta(hours=1), 200)
          for state in ("cancelled", "expired", "completed")],
        ("pending_payment", future_start, future_end, NOW, 200),
        ("pending_payment", local_now, local_now.replace(hour=17, minute=30), NOW + timedelta(hours=1), 200),
        ("paid", future_start - timedelta(days=2), future_end - timedelta(days=2), NOW, 200),
        ("paid", local_now.replace(hour=9), local_now, NOW, 200),
    ]
    path = f"/api/spaces/{original['id']}"
    for state, starts_at, ends_at, expiry, expected_status in cases:
        assert postgres_client.put(path, headers=headers, json=update_data(original)).status_code == 200
        reservation_id = seed_reservation(
            postgres_engine, original, tenant["id"], status=state,
            starts_at=starts_at, ends_at=ends_at, payment_expires_at=expiry,
        )
        before = reservation_snapshot(postgres_engine, reservation_id)
        candidate = update_data(original, name="Cambio junto con horario", price_per_hour=20000,
                                opening_hour=10, closing_hour=17)
        response = postgres_client.put(path, headers=headers, json=candidate)
        assert response.status_code == expected_status
        assert response.headers["Cache-Control"] == "no-store"
        if expected_status == 409:
            assert {"opening_hour", "closing_hour", "form"} == set(response.json()["errors"])
            assert read_space(postgres_client, original, headers) == original
        else:
            assert response.json()["price_per_hour"] == 20000
        assert reservation_snapshot(postgres_engine, reservation_id) == before
        with Session(postgres_engine) as session:
            session.delete(session.get(Reservation, reservation_id))
            session.commit()
    # Exact opening/closing boundaries are valid; seconds and half hours outside are not.
    for starts_at, ends_at, opening, closing, expected_status, field in (
        (tomorrow.replace(hour=10), tomorrow.replace(hour=17), 10, 17, 200, None),
        (tomorrow.replace(hour=10), tomorrow.replace(hour=17, second=1), 10, 17, 409, "closing_hour"),
        (tomorrow.replace(hour=9, minute=59, second=59), tomorrow.replace(hour=17), 10, 17, 409, "opening_hour"),
        (tomorrow.replace(hour=22), tomorrow.replace(hour=23, minute=30), 8, 23, 409, "closing_hour"),
        (tomorrow.replace(hour=22), tomorrow.replace(hour=23), 8, 23, 200, None),
    ):
        assert postgres_client.put(path, headers=headers, json=update_data(original)).status_code == 200
        reservation_id = seed_reservation(
            postgres_engine, original, tenant["id"], starts_at=starts_at, ends_at=ends_at
        )
        response = postgres_client.put(path, headers=headers, json=update_data(
            original, opening_hour=opening, closing_hour=closing
        ))
        assert response.status_code == expected_status
        if field:
            assert field in response.json()["errors"]
            assert read_space(postgres_client, original, headers) == original
        with Session(postgres_engine) as session:
            session.delete(session.get(Reservation, reservation_id))
            session.commit()


def test_cp08_fallo_commit_revierte_cambios_y_permite_reintento(
    postgres_client, postgres_engine, monkeypatch
):
    _, headers, original = create_space(postgres_client)
    original_commit = Session.commit
    original_rollback = Session.rollback
    rollbacks = []

    def failed_commit(session):
        if any(isinstance(value, Space) for value in session.dirty):
            session.flush()
            raise SQLAlchemyError("postgresql://secret-user:secret-password@private-db/internal")
        original_commit(session)

    def tracked_rollback(session):
        rollbacks.append(True)
        original_rollback(session)

    candidate = update_data(original, name="Edición para reintentar", price_per_hour=25000)
    with monkeypatch.context() as failure:
        failure.setattr(Session, "commit", failed_commit)
        failure.setattr(Session, "rollback", tracked_rollback)
        response = postgres_client.put(f"/api/spaces/{original['id']}", headers=headers, json=candidate)
    assert response.status_code == 503
    assert response.json() == {
        "detail": "No pudimos guardar los cambios. Inténtalo nuevamente.",
        "errors": {"form": "No pudimos guardar los cambios. Inténtalo nuevamente."},
    }
    assert rollbacks and "secret-password" not in response.text and "private-db" not in response.text
    assert response.headers["Cache-Control"] == "no-store"
    assert read_space(postgres_client, original, headers) == original
    response = postgres_client.put(f"/api/spaces/{original['id']}", headers=headers, json=candidate)
    assert response.status_code == 200 and response.json()["name"] == candidate["name"]
    assert read_space(postgres_client, original, headers) == response.json()
