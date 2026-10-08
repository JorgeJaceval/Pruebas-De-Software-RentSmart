from uuid import UUID, uuid4

import pytest
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlmodel import Session, select

from app.dependencies import get_reservable_space
from app.errors import SpaceError
from app.models import Reservation, Space, User
from app.space_schemas import SpaceCreate
from test_space_updates import (
    create_space, read_space, reservation_snapshot, seed_reservation, update_data,
)
from test_spaces import authenticate, publication

pytestmark = pytest.mark.postgres


def status_change(client, space, headers, requested):
    return client.patch(
        f"/api/spaces/{space['id']}/status", headers=headers, json={"is_active": requested}
    )


def database_snapshot(engine, space):
    with Session(engine) as session:
        return session.get(Space, UUID(space["id"])).model_dump()


def withdraw_space(engine, space):
    with Session(engine) as session:
        record = session.get(Space, UUID(space["id"]))
        record.is_active = False
        record.is_withdrawn = True
        session.add(record)
        session.commit()


def test_cp01_desactivar_persistencia_y_respuesta_reducida(postgres_client, postgres_engine):
    _, headers, original = create_space(postgres_client)
    before = database_snapshot(postgres_engine, original)
    response = status_change(postgres_client, original, headers, False)
    assert response.status_code == 200
    assert response.json() == {"id": original["id"], "is_active": False, "is_withdrawn": False}
    assert response.headers["Cache-Control"] == "no-store"
    assert database_snapshot(postgres_engine, original) == {**before, "is_active": False}
    assert read_space(postgres_client, original, headers) == {**original, "is_active": False}


def test_cp02_reactivar_valida_datos_actuales_y_desactivar_invalidos(postgres_client, postgres_engine):
    _, headers, original = create_space(postgres_client)
    assert status_change(postgres_client, original, headers, False).status_code == 200
    response = status_change(postgres_client, original, headers, True)
    assert response.status_code == 200 and response.json()["is_active"] is True
    with Session(postgres_engine) as session:
        record = session.get(Space, UUID(original["id"]))
        # This legacy value satisfies JSONB count constraints but fails HTTPS validation.
        record.photos = ["http://example.com/legacy.jpg"]
        session.add(record)
        session.commit()
    invalid_before = database_snapshot(postgres_engine, original)
    loaded = read_space(postgres_client, original, headers)
    assert loaded["photos"] == ["http://example.com/legacy.jpg"]
    # A reduced status response permits deactivation without serializing invalid full data.
    assert status_change(postgres_client, original, headers, False).status_code == 200
    response = status_change(postgres_client, original, headers, True)
    assert response.status_code == 422
    assert set(response.json()["errors"]) == {"photos"}
    assert "http://example.com/legacy.jpg" not in response.text
    assert response.headers["Cache-Control"] == "no-store"
    assert database_snapshot(postgres_engine, original) == {**invalid_before, "is_active": False}
    repaired = postgres_client.put(
        f"/api/spaces/{original['id']}", headers=headers,
        json=update_data(loaded, photos=original["photos"]),
    )
    assert repaired.status_code == 200 and repaired.json()["is_active"] is False
    activated = status_change(postgres_client, original, headers, True)
    assert activated.status_code == 200 and activated.json()["is_active"] is True
    assert read_space(postgres_client, original, headers)["photos"] == original["photos"]


def test_cp03_retiro_impide_activar_y_edicion_preserva_bandera(postgres_client, postgres_engine):
    _, headers, original = create_space(postgres_client)
    withdraw_space(postgres_engine, original)
    before = database_snapshot(postgres_engine, original)
    response = status_change(postgres_client, original, headers, True)
    assert response.status_code == 409
    assert set(response.json()["errors"]) == {"form"}
    assert database_snapshot(postgres_engine, original) == before
    assert status_change(postgres_client, original, headers, False).status_code == 200
    response = postgres_client.put(
        f"/api/spaces/{original['id']}", headers=headers,
        json=update_data(original, name="Sala retirada actualizada"),
    )
    assert response.status_code == 200
    assert response.json()["is_withdrawn"] is True and response.json()["is_active"] is False
    assert status_change(postgres_client, original, headers, True).status_code == 409
    for method, path, payload in (
        ("post", "/api/spaces", publication(is_withdrawn=True)),
        ("put", f"/api/spaces/{original['id']}", update_data(original, is_withdrawn=False)),
    ):
        response = getattr(postgres_client, method)(path, headers=headers, json=payload)
        assert response.status_code == 422 and set(response.json()["errors"]) == {"form"}
    with Session(postgres_engine) as session:
        record = session.get(Space, UUID(original["id"]))
        record.is_active = True
        with pytest.raises(IntegrityError) as failure:
            session.commit()
        assert failure.value.orig.diag.constraint_name == "ck_spaces_withdrawn_inactive"
        session.rollback()
    assert database_snapshot(postgres_engine, original)["is_withdrawn"] is True


def test_cp04_autorizacion_booleano_estricto_y_extras(postgres_client, postgres_engine):
    _, headers, original = create_space(postgres_client)
    before = database_snapshot(postgres_engine, original)
    for invalid_headers in ({}, {"Authorization": "Bearer token-invalido"}):
        response = status_change(postgres_client, original, invalid_headers, False)
        assert response.status_code == 401
        assert response.headers["Cache-Control"] == "no-store"
    other, other_headers = authenticate(postgres_client, "otro@example.com")
    for is_admin in (False, True):
        with Session(postgres_engine) as session:
            user = session.get(User, UUID(other["id"]))
            user.is_admin = is_admin
            session.add(user)
            session.commit()
        response = status_change(postgres_client, original, other_headers, False)
        assert response.status_code == 403 and response.headers["Cache-Control"] == "no-store"
    for value in (0, 1, "true", "false", 0.0, None, [], {}):
        response = status_change(postgres_client, original, headers, value)
        assert response.status_code == 422 and set(response.json()["errors"]) == {"is_active"}
    path = f"/api/spaces/{original['id']}/status"
    for payload, field in (({}, "is_active"), ({"is_active": False, "owner_id": other["id"]}, "form"),
                           ({"is_active": False, "is_withdrawn": False}, "form"),
                           ({"is_active": False, "password": "input-secret-sentinel"}, "form")):
        response = postgres_client.patch(path, headers=headers, json=payload)
        assert response.status_code == 422 and set(response.json()["errors"]) == {field}
        assert "input-secret-sentinel" not in response.text
        assert response.headers["Cache-Control"] == "no-store"
    missing = status_change(postgres_client, {"id": str(uuid4())}, headers, False)
    assert missing.status_code == 404
    assert database_snapshot(postgres_engine, original) == before


def test_cp05_peticion_idempotente_en_ambos_estados(postgres_client, postgres_engine):
    _, headers, original = create_space(postgres_client)
    original_data = database_snapshot(postgres_engine, original)
    for state in (False, True):
        first = status_change(postgres_client, original, headers, state)
        second = status_change(postgres_client, original, headers, state)
        assert first.status_code == second.status_code == 200
        assert first.json() == second.json() == {
            "id": original["id"], "is_active": state, "is_withdrawn": False
        }
        assert database_snapshot(postgres_engine, original) == {**original_data, "is_active": state}
    with Session(postgres_engine) as session:
        assert len(session.exec(select(Space)).all()) == 1


def test_cp06_todas_las_reservas_conservan_snapshots(postgres_client, postgres_engine):
    _, headers, original = create_space(postgres_client)
    tenant, _ = authenticate(postgres_client, "arrendatario@example.com")
    snapshots = {}
    for state in ("pending_payment", "paid", "cancelled", "expired", "completed"):
        reservation_id = seed_reservation(postgres_engine, original, tenant["id"], status=state)
        snapshots[reservation_id] = reservation_snapshot(postgres_engine, reservation_id)
    for active in (False, True):
        assert status_change(postgres_client, original, headers, active).status_code == 200
        assert {
            reservation_id: reservation_snapshot(postgres_engine, reservation_id)
            for reservation_id in snapshots
        } == snapshots
    with Session(postgres_engine) as session:
        assert len(session.exec(select(Reservation)).all()) == 5


def test_cp07_listado_publico_y_guardia_refresca_estado_previamente_leido(
    postgres_client, postgres_engine
):
    _, headers, original = create_space(postgres_client)
    extra_spaces = []
    for name in ("Sala inactiva de prueba", "Sala retirada de prueba"):
        response = postgres_client.post("/api/spaces", headers=headers, json=publication(name=name))
        assert response.status_code == 201
        extra_spaces.append(response.json())
    assert status_change(postgres_client, extra_spaces[0], headers, False).status_code == 200
    withdraw_space(postgres_engine, extra_spaces[1])
    public = postgres_client.get("/api/spaces")
    assert public.status_code == 200 and public.headers["Cache-Control"] == "no-store"
    assert public.json() == [{"id": original["id"], **{
        field: original[field] for field in SpaceCreate.model_fields
    }}]
    assert all("owner_id" not in row and "is_withdrawn" not in row for row in public.json())
    space_id = UUID(original["id"])
    with Session(postgres_engine) as reader:
        cached = reader.get(Space, space_id)
        assert cached.is_active is True
        assert status_change(postgres_client, original, headers, False).status_code == 200
        assert cached.is_active is True  # The old ORM instance is intentionally stale.
        with pytest.raises(SpaceError) as failure:
            get_reservable_space(space_id, reader, uuid4())
        assert failure.value.status_code == 409 and cached.is_active is False
        reader.rollback()  # Caller owns transaction/lock lifetime; no booking endpoint exists.
        assert cached.is_active is False
        assert status_change(postgres_client, original, headers, True).status_code == 200
        assert cached.is_active is False
        assert get_reservable_space(space_id, reader, uuid4()) is cached and cached.is_active is True
        reader.rollback()
        assert cached.is_active is True
        withdraw_space(postgres_engine, original)
        with pytest.raises(SpaceError) as failure:
            get_reservable_space(space_id, reader, uuid4())
        assert failure.value.status_code == 409 and cached.is_withdrawn is True
        reader.rollback()
        with pytest.raises(SpaceError) as failure:
            get_reservable_space(uuid4(), reader, uuid4())
        assert failure.value.status_code == 404
    assert postgres_client.get("/api/spaces").json() == []


def test_cp08_fallo_sql_revierte_estado_y_permite_reintentar(
    postgres_client, postgres_engine, monkeypatch
):
    _, headers, original = create_space(postgres_client)
    before = database_snapshot(postgres_engine, original)
    original_commit = Session.commit
    original_rollback = Session.rollback
    rolled_back = []

    def fail_commit(session):
        if any(isinstance(value, Space) for value in session.dirty):
            session.flush()
            raise SQLAlchemyError("postgresql://secret-user:secret-password@private-db/internal")
        original_commit(session)

    def track_rollback(session):
        rolled_back.append(True)
        original_rollback(session)

    with monkeypatch.context() as failure:
        failure.setattr(Session, "commit", fail_commit)
        failure.setattr(Session, "rollback", track_rollback)
        response = status_change(postgres_client, original, headers, False)
    assert response.status_code == 503
    assert response.json() == {
        "detail": "No pudimos cambiar el estado del espacio. Inténtalo nuevamente.",
        "errors": {"form": "No pudimos cambiar el estado del espacio. Inténtalo nuevamente."},
    }
    assert response.headers["Cache-Control"] == "no-store"
    assert "secret-password" not in response.text and "private-db" not in response.text
    assert rolled_back and database_snapshot(postgres_engine, original) == before
    response = status_change(postgres_client, original, headers, False)
    assert response.status_code == 200 and response.json()["is_active"] is False
    assert database_snapshot(postgres_engine, original) == {**before, "is_active": False}
