from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from threading import Event
from uuid import UUID

import pytest
from sqlalchemy import event
from sqlmodel import Session, select

from app.dependencies import get_reservable_interval
from app.errors import SpaceError
from app.models import Reservation, Space
from app.routers import spaces
from app.space_schemas import PublicSpace
from test_space_deletion import wait_for_database_lock
from test_space_status import database_snapshot
from test_space_updates import (
    NOW, SANTIAGO, create_space, read_space, reservation_snapshot, seed_reservation, update_data,
)
from test_spaces import authenticate, publication

pytestmark = pytest.mark.postgres


def test_cp01_horario_amplio_persistido_y_limites_de_publicacion(postgres_client):
    _, headers, original = create_space(postgres_client)
    for opening, closing in ((0, 23), (22, 23), (0, 1)):
        response = postgres_client.put(
            f"/api/spaces/{original['id']}", headers=headers,
            json=update_data(original, opening_hour=opening, closing_hour=closing),
        )
        assert response.status_code == 200
        saved = read_space(postgres_client, original, headers)
        assert (saved["opening_hour"], saved["closing_hour"]) == (opening, closing)
    for opening, closing in ((9, 9), (18, 9), (9.5, 18), (9, 18.5), (0, 24)):
        response = postgres_client.post(
            "/api/spaces", headers=headers,
            json=publication(opening_hour=opening, closing_hour=closing),
        )
        assert response.status_code == 422


def test_cp03_intervalos_en_horario_de_santiago_invierno_y_verano(
    postgres_client, postgres_engine,
):
    _, _, original = create_space(postgres_client)
    tenant, _ = authenticate(postgres_client, "arrendatario@example.com")
    space_id, tenant_id = UUID(original["id"]), UUID(tenant["id"])
    for month in (1, 7):
        start = datetime(2026, month, 15, 9, tzinfo=SANTIAGO)
        end = start.replace(hour=17)
        # Local dates may differ from UTC; daily boundaries belong to Santiago.
        cases = [
            (start, end, None),
            (start.astimezone(timezone.utc), end.astimezone(timezone.utc), None),
            (start - timedelta(seconds=1), end, "starts_at"),
            (start, end.replace(hour=18, second=1), "ends_at"),
            (start, start, "form"),
            (end, start, "form"),
            (start, end + timedelta(days=1), "form"),
            (start.replace(tzinfo=None), end, "form"),
        ]
        for begins, finishes, error_field in cases:
            with Session(postgres_engine) as session:
                if error_field is None:
                    space = get_reservable_interval(space_id, session, tenant_id, begins, finishes)
                    assert space.id == space_id
                else:
                    with pytest.raises(SpaceError) as failure:
                        get_reservable_interval(space_id, session, tenant_id, begins, finishes)
                    assert failure.value.status_code == 422
                    assert error_field in failure.value.errors
        with Session(postgres_engine) as session:
            exact_close = start.replace(hour=18)
            get_reservable_interval(space_id, session, tenant_id, start.replace(hour=17), exact_close)
    assert database_snapshot(postgres_engine, original)["opening_hour"] == 9
    with Session(postgres_engine) as session:
        assert session.exec(select(Reservation)).all() == []


def test_cp03_dia_local_cuando_utc_cruza_medianoche(postgres_client, postgres_engine):
    _, headers, original = create_space(postgres_client)
    assert postgres_client.put(
        f"/api/spaces/{original['id']}", headers=headers,
        json=update_data(original, opening_hour=21, closing_hour=23),
    ).status_code == 200
    tenant, _ = authenticate(postgres_client, "arrendatario@example.com")
    start = datetime(2026, 7, 15, 21, tzinfo=SANTIAGO).astimezone(timezone.utc)
    end = datetime(2026, 7, 15, 23, tzinfo=SANTIAGO).astimezone(timezone.utc)
    assert start.day == 16
    with Session(postgres_engine) as session:
        get_reservable_interval(UUID(original["id"]), session, UUID(tenant["id"]), start, end)


def test_cp06_consultas_publicas_con_horario_sin_identidad_de_reservas(
    postgres_client, postgres_engine,
):
    owner, _, original = create_space(postgres_client)
    tenant, _ = authenticate(postgres_client, "privado@example.com")
    reservation_id = seed_reservation(postgres_engine, original, tenant["id"])
    for path in ("/api/spaces", f"/api/spaces/public/{original['id']}"):
        response = postgres_client.get(path)
        assert response.status_code == 200
        body = response.json()[0] if isinstance(response.json(), list) else response.json()
        assert set(body) == set(PublicSpace.model_fields)
        assert body["opening_hour"] == 9 and body["closing_hour"] == 18
        for private in (tenant["id"], tenant["email"], owner["id"], str(reservation_id)):
            assert private not in response.text


@pytest.mark.parametrize("winner", ["writer", "update"])
def test_cp07_cambio_de_horario_y_writer_fixture_en_ambos_ordenes(
    postgres_client, postgres_engine, monkeypatch, winner,
):
    monkeypatch.setattr(spaces, "utc_now", lambda: NOW)
    _, headers, original = create_space(postgres_client)
    tenant, _ = authenticate(postgres_client, "arrendatario@example.com")
    space_id, tenant_id = UUID(original["id"]), UUID(tenant["id"])
    tomorrow = NOW.astimezone(SANTIAGO) + timedelta(days=1)
    starts_at, ends_at = tomorrow.replace(hour=9), tomorrow.replace(hour=11)
    update_locked, writer_locked = Event(), Event()
    update_attempted, writer_attempted = Event(), Event()
    release_winner = Event()
    pids = {}

    def before_lock(connection, cursor, statement, parameters, context, executemany):
        if "FOR UPDATE" not in statement.upper() or "FROM SPACES" not in statement.upper():
            return
        pid = connection.connection.driver_connection.info.backend_pid
        if pid == pids.get("writer"):
            writer_attempted.set()
        else:
            pids["update"] = pid
            update_attempted.set()

    def after_lock(connection, cursor, statement, parameters, context, executemany):
        if (
            winner == "update" and "FOR UPDATE" in statement.upper()
            and "FROM SPACES" in statement.upper()
            and connection.connection.driver_connection.info.backend_pid == pids.get("update")
        ):
            update_locked.set()
            assert release_winner.wait(timeout=5)

    def fixture_writer():
        with Session(postgres_engine) as session:
            pids["writer"] = session.connection().connection.driver_connection.info.backend_pid
            # Cache the old schedule deliberately; the locked guard must refresh it.
            cached = session.get(Space, space_id)
            assert cached.opening_hour == 9
            try:
                get_reservable_interval(space_id, session, tenant_id, starts_at, ends_at)
            except SpaceError as error:
                return {"error": error.status_code}
            writer_locked.set()
            if winner == "writer":
                assert release_winner.wait(timeout=5)
            reservation = Reservation(
                space_id=space_id, tenant_id=tenant_id, starts_at=starts_at, ends_at=ends_at,
                status="paid", payment_expires_at=NOW + timedelta(minutes=15),
                unit_price=original["price_per_hour"], total_price=original["price_per_hour"] * 2,
                duration_hours=2, created_at=NOW,
            )
            reservation_id = reservation.id
            session.add(reservation)
            session.commit()
            return {"id": reservation_id}

    def update():
        return postgres_client.put(
            f"/api/spaces/{original['id']}", headers=headers,
            json=update_data(original, opening_hour=10),
        )

    event.listen(postgres_engine, "before_cursor_execute", before_lock)
    event.listen(postgres_engine, "after_cursor_execute", after_lock)
    try:
        with ThreadPoolExecutor(max_workers=2) as executor:
            if winner == "writer":
                writer = executor.submit(fixture_writer)
                assert writer_locked.wait(timeout=5)
                updating = executor.submit(update)
                try:
                    assert update_attempted.wait(timeout=5)
                    wait_for_database_lock(postgres_engine, pids["update"], pids["writer"])
                finally:
                    release_winner.set()
            else:
                updating = executor.submit(update)
                assert update_locked.wait(timeout=5)
                writer = executor.submit(fixture_writer)
                try:
                    assert writer_attempted.wait(timeout=5)
                    wait_for_database_lock(postgres_engine, pids["writer"], pids["update"])
                finally:
                    release_winner.set()
            response, result = updating.result(timeout=5), writer.result(timeout=5)
    finally:
        release_winner.set()
        event.remove(postgres_engine, "before_cursor_execute", before_lock)
        event.remove(postgres_engine, "after_cursor_execute", after_lock)
    with Session(postgres_engine) as session:
        stored = session.get(Space, space_id)
        reservations = session.exec(select(Reservation).where(Reservation.space_id == space_id)).all()
        if winner == "writer":
            assert response.status_code == 409
            assert stored.opening_hour == 9
            assert len(reservations) == 1 and reservations[0].id == result["id"]
            snapshot = reservation_snapshot(postgres_engine, result["id"])
            assert snapshot["starts_at"] == starts_at and snapshot["ends_at"] == ends_at
        else:
            assert response.status_code == 200 and stored.opening_hour == 10
            assert result == {"error": 422} and reservations == []
