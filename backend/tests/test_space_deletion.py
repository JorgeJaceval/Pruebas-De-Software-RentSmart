from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from threading import Event
from time import monotonic
from uuid import UUID, uuid4

import pytest
from sqlalchemy import event, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlmodel import Session, select

from app.dependencies import get_reservable_space
from app.errors import SpaceError
from app.models import Reservation, Space, User
from test_space_status import database_snapshot, status_change, withdraw_space
from test_space_updates import create_space, reservation_snapshot, seed_reservation
from test_spaces import authenticate, publication

pytestmark = pytest.mark.postgres


def delete(client, space, headers):
    return client.delete(f"/api/spaces/{space['id']}", headers=headers)


def new_reservation(space_id, tenant_id):
    now = datetime.now(timezone.utc)
    return Reservation(
        space_id=space_id, tenant_id=tenant_id,
        starts_at=now + timedelta(days=1), ends_at=now + timedelta(days=1, hours=2),
        status="paid", payment_expires_at=now + timedelta(minutes=15),
        unit_price=15000, total_price=30000, duration_hours=2, created_at=now,
    )


def wait_for_database_lock(engine, waiter, blocker):
    # Observe PostgreSQL's actual blocking relationship; do not use timing sleeps.
    deadline = monotonic() + 3
    with engine.connect() as connection:
        while monotonic() < deadline:
            blocked = connection.execute(text(
                "SELECT :blocker = ANY(pg_blocking_pids(:waiter))"
            ), {"blocker": blocker, "waiter": waiter}).scalar_one()
            if blocked:
                return
    raise AssertionError("Expected PostgreSQL row-lock contention was not observed")


def test_cp01_borrado_fisico_sin_reservas_en_cualquier_estado(postgres_client, postgres_engine):
    _, headers, untouched = create_space(postgres_client)
    before = database_snapshot(postgres_engine, untouched)
    for state in ("active", "inactive", "withdrawn"):
        response = postgres_client.post("/api/spaces", headers=headers, json=publication(name=f"Sala {state} vacía"))
        assert response.status_code == 201
        target = response.json()
        if state == "inactive":
            assert status_change(postgres_client, target, headers, False).status_code == 200
        elif state == "withdrawn":
            withdraw_space(postgres_engine, target)
        response = delete(postgres_client, target, headers)
        assert response.status_code == 204 and response.content == b""
        assert response.headers["Cache-Control"] == "no-store"
        assert postgres_client.get(f"/api/spaces/{target['id']}", headers=headers).status_code == 404
        assert target["id"] not in {row["id"] for row in postgres_client.get("/api/spaces").json()}
        with Session(postgres_engine) as session:
            assert session.get(Space, UUID(target["id"])) is None
        assert database_snapshot(postgres_engine, untouched) == before


def test_cp03_cualquier_historial_impide_borrar_sin_modificar_snapshots(postgres_client, postgres_engine):
    _, headers, base = create_space(postgres_client)
    tenant, _ = authenticate(postgres_client, "arrendatario@example.com")
    for state in ("pending_payment", "paid", "cancelled", "expired", "completed"):
        response = postgres_client.post("/api/spaces", headers=headers, json=publication(name=f"Sala con reserva {state}"))
        assert response.status_code == 201
        target = response.json()
        reservation_id = seed_reservation(postgres_engine, target, tenant["id"], status=state)
        saved_space = database_snapshot(postgres_engine, target)
        saved_reservation = reservation_snapshot(postgres_engine, reservation_id)
        response = delete(postgres_client, target, headers)
        assert response.status_code == 409
        assert set(response.json()["errors"]) == {"form"}
        assert response.headers["Cache-Control"] == "no-store"
        assert database_snapshot(postgres_engine, target) == saved_space
        assert reservation_snapshot(postgres_engine, reservation_id) == saved_reservation
        assert postgres_client.get(f"/api/spaces/{target['id']}", headers=headers).status_code == 200
    assert database_snapshot(postgres_engine, base)["is_active"] is True
    # A direct writer that bypasses the HTTP guard is still stopped by the FK.
    with Session(postgres_engine) as session:
        session.delete(session.get(Space, UUID(target["id"])))
        with pytest.raises(IntegrityError) as failure:
            session.commit()
        assert failure.value.orig.diag.constraint_name == "fk_reservations_space_id_spaces"
        session.rollback()
    assert reservation_snapshot(postgres_engine, reservation_id) == saved_reservation


def test_cp04_desactivar_es_alternativa_explicita_con_historial_intacto(postgres_client, postgres_engine):
    _, headers, target = create_space(postgres_client)
    tenant, _ = authenticate(postgres_client, "arrendatario@example.com")
    reservation_id = seed_reservation(postgres_engine, target, tenant["id"], status="completed")
    snapshot = reservation_snapshot(postgres_engine, reservation_id)
    response = delete(postgres_client, target, headers)
    assert response.status_code == 409
    assert database_snapshot(postgres_engine, target)["is_active"] is True
    response = status_change(postgres_client, target, headers, False)
    assert response.status_code == 200 and response.json()["is_active"] is False
    assert database_snapshot(postgres_engine, target)["is_active"] is False
    assert reservation_snapshot(postgres_engine, reservation_id) == snapshot
    assert delete(postgres_client, target, headers).status_code == 409


def test_cp05_sesion_propietario_no_existe_y_uuid_invalido(postgres_client, postgres_engine):
    _, headers, target = create_space(postgres_client)
    before = database_snapshot(postgres_engine, target)
    for invalid_headers in ({}, {"Authorization": "Bearer token-invalido"}):
        response = delete(postgres_client, target, invalid_headers)
        assert response.status_code == 401 and response.headers["Cache-Control"] == "no-store"
    other, other_headers = authenticate(postgres_client, "otro@example.com")
    for is_admin in (False, True):
        with Session(postgres_engine) as session:
            user = session.get(User, UUID(other["id"]))
            user.is_admin = is_admin
            session.add(user)
            session.commit()
        response = delete(postgres_client, target, other_headers)
        assert response.status_code == 403 and response.headers["Cache-Control"] == "no-store"
    missing = delete(postgres_client, {"id": str(uuid4())}, headers)
    assert missing.status_code == 404
    invalid = delete(postgres_client, {"id": "identificador-invalido"}, headers)
    assert invalid.status_code == 422 and invalid.headers["Cache-Control"] == "no-store"
    assert database_snapshot(postgres_engine, target) == before


def test_cp06_concurrencia_writer_fixture_y_delete_en_ambos_ordenes(
    postgres_client, postgres_engine
):
    _, headers, original = create_space(postgres_client)
    tenant, _ = authenticate(postgres_client, "arrendatario@example.com")
    for winner in ("writer", "delete"):
        response = postgres_client.post("/api/spaces", headers=headers, json=publication(name=f"Sala carrera {winner}"))
        assert response.status_code == 201
        target = response.json()
        target_before = database_snapshot(postgres_engine, target)
        space_id, tenant_id = UUID(target["id"]), UUID(tenant["id"])
        writer_locked, delete_locked = Event(), Event()
        writer_attempted, delete_attempted = Event(), Event()
        release_winner = Event()
        pids = {}

        def before_lock(connection, cursor, statement, parameters, context, executemany):
            if "FOR UPDATE" not in statement.upper() or "FROM SPACES" not in statement.upper():
                return
            pid = connection.connection.driver_connection.info.backend_pid
            if pid == pids.get("writer"):
                writer_attempted.set()
            else:
                pids["delete"] = pid
                delete_attempted.set()

        def after_lock(connection, cursor, statement, parameters, context, executemany):
            if (
                winner == "delete" and "FOR UPDATE" in statement.upper()
                and "FROM SPACES" in statement.upper()
                and connection.connection.driver_connection.info.backend_pid == pids.get("delete")
            ):
                delete_locked.set()
                assert release_winner.wait(timeout=5)

        def fixture_writer():
            with Session(postgres_engine) as session:
                pids["writer"] = session.connection().connection.driver_connection.info.backend_pid
                try:
                    get_reservable_space(space_id, session, tenant_id)
                except SpaceError as error:
                    return {"error": error.status_code}
                writer_locked.set()
                if winner == "writer":
                    assert release_winner.wait(timeout=5)
                reservation = new_reservation(space_id, tenant_id)
                reservation_id = reservation.id
                session.add(reservation)
                session.commit()
                session.refresh(reservation)
                return {"id": reservation_id, "snapshot": reservation.model_dump()}

        event.listen(postgres_engine, "before_cursor_execute", before_lock)
        event.listen(postgres_engine, "after_cursor_execute", after_lock)
        try:
            with ThreadPoolExecutor(max_workers=2) as executor:
                if winner == "writer":
                    writer = executor.submit(fixture_writer)
                    assert writer_locked.wait(timeout=5)
                    deletion = executor.submit(delete, postgres_client, target, headers)
                    try:
                        assert delete_attempted.wait(timeout=5)
                        wait_for_database_lock(postgres_engine, pids["delete"], pids["writer"])
                    finally:
                        release_winner.set()
                else:
                    deletion = executor.submit(delete, postgres_client, target, headers)
                    assert delete_locked.wait(timeout=5)
                    writer = executor.submit(fixture_writer)
                    try:
                        assert writer_attempted.wait(timeout=5)
                        wait_for_database_lock(postgres_engine, pids["writer"], pids["delete"])
                    finally:
                        release_winner.set()
                deleted_response, writer_result = deletion.result(timeout=5), writer.result(timeout=5)
        finally:
            release_winner.set()
            event.remove(postgres_engine, "before_cursor_execute", before_lock)
            event.remove(postgres_engine, "after_cursor_execute", after_lock)
        with Session(postgres_engine) as session:
            reservations = session.exec(select(Reservation).where(Reservation.space_id == space_id)).all()
            if winner == "writer":
                assert deleted_response.status_code == 409
                stored_space = session.get(Space, space_id)
                assert stored_space is not None and stored_space.model_dump() == target_before
                assert len(reservations) == 1 and reservations[0].id == writer_result["id"]
                assert reservations[0].model_dump() == writer_result["snapshot"]
            else:
                assert deleted_response.status_code == 204 and deleted_response.content == b""
                assert writer_result == {"error": 404}
                assert session.get(Space, space_id) is None and reservations == []
                session.add(new_reservation(space_id, tenant_id))
                with pytest.raises(IntegrityError) as failure:
                    session.commit()
                assert failure.value.orig.diag.constraint_name == "fk_reservations_space_id_spaces"
                session.rollback()
                assert session.exec(select(Reservation).where(Reservation.space_id == space_id)).all() == []
    assert database_snapshot(postgres_engine, original)["is_active"] is True


def test_cp07_fallo_sql_tras_delete_rollback_y_reintento(
    postgres_client, postgres_engine, monkeypatch
):
    _, headers, target = create_space(postgres_client)
    before = database_snapshot(postgres_engine, target)
    original_commit, original_rollback = Session.commit, Session.rollback
    rolled_back = []

    def fail_commit(session):
        if any(isinstance(value, Space) for value in session.deleted):
            session.flush()
            raise SQLAlchemyError("postgresql://secret-user:secret-password@private-db/internal")
        original_commit(session)

    def track_rollback(session):
        rolled_back.append(True)
        original_rollback(session)

    with monkeypatch.context() as failure:
        failure.setattr(Session, "commit", fail_commit)
        failure.setattr(Session, "rollback", track_rollback)
        response = delete(postgres_client, target, headers)
    assert response.status_code == 503
    assert response.json() == {
        "detail": "No pudimos eliminar el espacio. Inténtalo nuevamente.",
        "errors": {"form": "No pudimos eliminar el espacio. Inténtalo nuevamente."},
    }
    assert response.headers["Cache-Control"] == "no-store"
    assert "secret-password" not in response.text and "private-db" not in response.text
    assert rolled_back and database_snapshot(postgres_engine, target) == before
    response = delete(postgres_client, target, headers)
    assert response.status_code == 204 and response.content == b""
    with Session(postgres_engine) as session:
        assert session.get(Space, UUID(target["id"])) is None
