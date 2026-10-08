from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from threading import Event
from uuid import UUID, uuid4

import pytest
from sqlalchemy import event
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlmodel import Session, select

from app.models import Payment, Reservation, Space
from app.routers import reservations, spaces
from test_space_deletion import wait_for_database_lock
from test_space_status import status_change, withdraw_space
from test_space_updates import NOW, SANTIAGO, create_space, update_data
from test_spaces import authenticate, publication

pytestmark = pytest.mark.postgres


@pytest.fixture
def clock(monkeypatch):
    current = {"now": NOW}
    monkeypatch.setattr(reservations, "utc_now", lambda: current["now"])
    monkeypatch.setattr(spaces, "utc_now", lambda: current["now"])
    return current


@pytest.fixture
def booking_setup(postgres_client, clock):
    owner, owner_headers, space = create_space(postgres_client)
    tenant, tenant_headers = authenticate(postgres_client, "arrendatario@example.com")
    return owner, owner_headers, space, tenant, tenant_headers


def request_data(space, **changes):
    return {
        "space_id": space["id"],
        "date": (NOW.astimezone(SANTIAGO).date() + timedelta(days=1)).isoformat(),
        "start_hour": 10, "end_hour": 12,
        **changes,
    }


def reserve(client, space, headers, **changes):
    return client.post("/api/reservations", headers=headers, json=request_data(space, **changes))


def as_datetime(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def records(engine):
    with Session(engine) as session:
        return session.exec(select(Reservation)).all(), session.exec(select(Payment)).all()


def seed_booking(engine, space, tenant_id, *, status, expires_at):
    start = (NOW.astimezone(SANTIAGO) + timedelta(days=1)).replace(hour=10)
    reservation = Reservation(
        space_id=UUID(space["id"]), tenant_id=UUID(tenant_id),
        starts_at=start, ends_at=start.replace(hour=12),
        duration_hours=2, unit_price=space["price_per_hour"],
        total_price=space["price_per_hour"] * 2, created_at=NOW,
        status=status, payment_expires_at=expires_at,
    )
    payment = Payment(reservation_id=reservation.id, status="pending", created_at=NOW)
    with Session(engine) as session:
        session.add(reservation)
        session.flush()
        session.add(payment)
        session.commit()
        return reservation.id


def test_ca01_ca05_confirmacion_persistida_pago_unico_y_snapshot_precio(
    postgres_client, postgres_engine, booking_setup,
):
    owner, owner_headers, space, tenant, headers = booking_setup
    response = reserve(postgres_client, space, headers)
    assert response.status_code == 201
    assert response.headers["Cache-Control"] == "no-store"
    body = response.json()
    assert UUID(body["id"]) and UUID(body["payment"]["id"])
    assert body["space_id"] == space["id"] and body["space_name"] == space["name"]
    assert body["date"] == request_data(space)["date"]
    assert (body["start_hour"], body["end_hour"], body["duration_hours"]) == (10, 12, 2)
    assert body["unit_price"] == 15000 and body["total_price"] == 30000
    assert body["status"] == "pending_payment" and body["payment"]["status"] == "pending"
    assert as_datetime(body["created_at"]) == NOW
    assert as_datetime(body["payment_expires_at"]) == NOW + timedelta(minutes=15)
    assert as_datetime(body["starts_at"]).astimezone(SANTIAGO).hour == 10
    assert as_datetime(body["ends_at"]) - as_datetime(body["starts_at"]) == timedelta(hours=2)
    for private in (owner["id"], tenant["id"], owner["email"], tenant["email"]):
        assert private not in response.text
    bookings, payments = records(postgres_engine)
    assert len(bookings) == len(payments) == 1
    saved = bookings[0]
    assert saved.tenant_id == UUID(tenant["id"]) and saved.space_id == UUID(space["id"])
    assert saved.id == UUID(body["id"]) and saved.duration_hours == 2
    assert saved.created_at == NOW and saved.payment_expires_at == NOW + timedelta(minutes=15)
    assert saved.unit_price == 15000 and saved.total_price == 30000
    assert payments[0].reservation_id == saved.id and payments[0].created_at == NOW
    assert str(payments[0].id) == body["payment"]["id"]
    # A second payment for the same booking is rejected by PostgreSQL, not just HTTP.
    with Session(postgres_engine) as session:
        session.add(Payment(reservation_id=saved.id, status="pending", created_at=NOW))
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()
    assert postgres_client.put(
        f"/api/spaces/{space['id']}", headers=owner_headers,
        json=update_data(space, price_per_hour=22000),
    ).status_code == 200
    refreshed = postgres_client.get(f"/api/reservations/{saved.id}", headers=headers)
    assert refreshed.status_code == 200
    assert refreshed.json()["unit_price"] == 15000 and refreshed.json()["total_price"] == 30000
    bookings, payments = records(postgres_engine)
    assert len(bookings) == len(payments) == 1
    assert bookings[0].model_dump() == saved.model_dump()


def test_ca05_vencimiento_es_inicio_si_faltan_menos_de_quince_minutos(
    postgres_client, booking_setup, clock,
):
    _, _, space, _, headers = booking_setup
    local_now = NOW.astimezone(SANTIAGO).replace(hour=9, minute=50)
    clock["now"] = local_now.astimezone(timezone.utc)
    response = reserve(postgres_client, space, headers, date=local_now.date().isoformat())
    assert response.status_code == 201
    body = response.json()
    assert as_datetime(body["created_at"]) == clock["now"]
    assert as_datetime(body["payment_expires_at"]) == as_datetime(body["starts_at"])
    assert as_datetime(body["payment_expires_at"]) - clock["now"] == timedelta(minutes=10)


def test_ca02_horas_enteras_duracion_limites_y_datos_requeridos(
    postgres_client, postgres_engine, booking_setup,
):
    _, owner_headers, space, _, headers = booking_setup
    assert postgres_client.put(
        f"/api/spaces/{space['id']}", headers=owner_headers,
        json=update_data(space, opening_hour=0, closing_hour=23),
    ).status_code == 200
    invalid = [
        {"start_hour": -1}, {"end_hour": 24}, {"start_hour": 23},
        {"start_hour": True}, {"end_hour": False},
        {"start_hour": "10"}, {"end_hour": "12"},
        {"start_hour": 10.5}, {"end_hour": 12.5},
        {"start_hour": 10.0}, {"end_hour": 12.0},
        {"start_hour": None}, {"end_hour": None},
        {"end_hour": 10}, {"end_hour": 9}, {"start_hour": 9, "end_hour": 18},
        {"date": "2026-02-30"}, {"date": "2026-07-16T10:00:00Z"},
        {"date": "0001-01-01"},
        {"date": "9999-12-31", "start_hour": 21, "end_hour": 22},
        {"date": None}, {"date": 20260716}, {"space_id": "no-es-un-uuid"},
    ]
    for changes in invalid:
        response = reserve(postgres_client, space, headers, **changes)
        assert response.status_code == 422, (changes, response.text)
        assert response.headers["Cache-Control"] == "no-store"
    for field in request_data(space):
        payload = request_data(space)
        del payload[field]
        response = postgres_client.post("/api/reservations", headers=headers, json=payload)
        assert response.status_code == 422
    assert records(postgres_engine) == ([], [])
    for start, end in ((0, 1), (1, 9), (22, 23)):
        response = reserve(postgres_client, space, headers, start_hour=start, end_hour=end)
        assert response.status_code == 201
        assert response.json()["duration_hours"] == end - start


def test_ca02_inicio_futuro_y_ventana_exacta_de_noventa_dias(
    postgres_client, postgres_engine, booking_setup, clock,
):
    _, _, space, _, headers = booking_setup
    local_now = NOW.astimezone(SANTIAGO)
    for date, start, end in (
        (local_now.date() - timedelta(days=1), 10, 12),
        (local_now.date(), 9, 10),
        (local_now.date(), 10, 12),
        (local_now.date() + timedelta(days=91), 10, 12),
    ):
        response = reserve(postgres_client, space, headers,
                           date=date.isoformat(), start_hour=start, end_hour=end)
        assert response.status_code == 422
    # The UTC instant matters across Santiago's seasonal offset change.
    cutoff = (NOW + timedelta(days=90)).astimezone(SANTIAGO)
    assert cutoff.minute == cutoff.second == 0
    clock["now"] = NOW - timedelta(seconds=1)
    response = reserve(postgres_client, space, headers, date=cutoff.date().isoformat(),
                       start_hour=cutoff.hour, end_hour=cutoff.hour + 1)
    assert response.status_code == 422  # Exactly one second beyond the permitted window.
    assert records(postgres_engine) == ([], [])
    clock["now"] = NOW
    response = reserve(postgres_client, space, headers, date=cutoff.date().isoformat(),
                       start_hour=cutoff.hour, end_hour=cutoff.hour + 1)
    assert response.status_code == 201
    assert as_datetime(response.json()["starts_at"]) == NOW + timedelta(days=90)


@pytest.mark.parametrize("month", [1, 7])
def test_ca02_dia_en_santiago_aunque_utc_cruce_medianoche(
    postgres_client, booking_setup, clock, month,
):
    _, owner_headers, space, _, headers = booking_setup
    clock["now"] = datetime(2026, month, 14, 10, tzinfo=SANTIAGO).astimezone(timezone.utc)
    assert postgres_client.put(
        f"/api/spaces/{space['id']}", headers=owner_headers,
        json=update_data(space, opening_hour=21, closing_hour=23),
    ).status_code == 200
    response = reserve(postgres_client, space, headers, date=f"2026-{month:02d}-15",
                       start_hour=21, end_hour=23)
    assert response.status_code == 201
    body = response.json()
    assert body["date"] == f"2026-{month:02d}-15"
    assert as_datetime(body["starts_at"]).day == 16
    assert as_datetime(body["starts_at"]).astimezone(SANTIAGO).day == 15
    assert body["duration_hours"] == 2 and body["total_price"] == 30000


@pytest.mark.parametrize("date,start,end", [("2026-09-06", 0, 1), ("2026-04-04", 22, 23)])
def test_ca02_horas_inexistentes_o_ambiguas_del_cambio_de_hora(
    postgres_client, postgres_engine, booking_setup, clock, date, start, end,
):
    _, owner_headers, space, _, headers = booking_setup
    day = datetime.fromisoformat(date).replace(tzinfo=SANTIAGO)
    clock["now"] = (day - timedelta(days=1)).replace(hour=12).astimezone(timezone.utc)
    assert postgres_client.put(
        f"/api/spaces/{space['id']}", headers=owner_headers,
        json=update_data(space, opening_hour=0, closing_hour=23),
    ).status_code == 200
    response = reserve(postgres_client, space, headers, date=date, start_hour=start, end_hour=end)
    assert response.status_code == 422
    assert records(postgres_engine) == ([], [])


def test_ca03_ca07_autenticacion_y_campos_controlados_por_servidor(
    postgres_client, postgres_engine, booking_setup,
):
    _, _, space, tenant, headers = booking_setup
    for invalid_headers in ({}, {"Authorization": "Bearer token-invalido"}):
        response = reserve(postgres_client, space, invalid_headers)
        assert response.status_code == 401
        assert response.headers["Cache-Control"] == "no-store"
    for field, value in (
        ("tenant_id", str(uuid4())), ("owner_id", str(uuid4())), ("id", str(uuid4())),
        ("unit_price", 1), ("total_price", 1), ("duration_hours", 1),
        ("status", "paid"), ("payment", {"status": "approved"}),
        ("created_at", "2000-01-01T00:00:00Z"),
        ("payment_expires_at", "2099-01-01T00:00:00Z"),
        ("starts_at", "2026-07-16T10:30:00-04:00"),
        ("ends_at", "2026-07-17T12:00:00-04:00"),
    ):
        response = reserve(postgres_client, space, headers, **{field: value})
        assert response.status_code == 422, (field, response.text)
        assert set(response.json()["errors"]) == {"form"}
    assert records(postgres_engine) == ([], [])
    response = reserve(postgres_client, space, headers)
    assert response.status_code == 201
    bookings, _ = records(postgres_engine)
    assert bookings[0].tenant_id == UUID(tenant["id"])
    assert bookings[0].status == "pending_payment" and bookings[0].total_price == 30000


def test_ca03_ca10_propietario_estados_actuales_y_espacio_inexistente(
    postgres_client, postgres_engine, booking_setup,
):
    _, owner_headers, space, _, headers = booking_setup
    assert reserve(postgres_client, space, owner_headers).status_code == 409
    assert postgres_client.get(f"/api/spaces/{space['id']}/detail", headers=headers).status_code == 200
    assert status_change(postgres_client, space, owner_headers, False).status_code == 200
    assert reserve(postgres_client, space, headers).status_code == 409
    assert status_change(postgres_client, space, owner_headers, True).status_code == 200
    withdraw_space(postgres_engine, space)
    assert reserve(postgres_client, space, headers).status_code == 409
    assert reserve(postgres_client, {"id": str(uuid4())}, headers).status_code == 404
    assert records(postgres_engine) == ([], [])


def test_ca10_horario_y_precio_actuales_prevalecen_sobre_detalle_anterior(
    postgres_client, postgres_engine, booking_setup,
):
    _, owner_headers, space, _, headers = booking_setup
    assert postgres_client.get(f"/api/spaces/{space['id']}/detail", headers=headers).status_code == 200
    assert postgres_client.put(
        f"/api/spaces/{space['id']}", headers=owner_headers,
        json=update_data(space, opening_hour=11, price_per_hour=22000),
    ).status_code == 200
    response = reserve(postgres_client, space, headers)
    assert response.status_code == 422
    assert records(postgres_engine) == ([], [])
    response = reserve(postgres_client, space, headers, start_hour=11, end_hour=13)
    assert response.status_code == 201
    assert response.json()["unit_price"] == 22000 and response.json()["total_price"] == 44000


@pytest.mark.parametrize("status", ["pending_payment", "paid"])
def test_ca04_superposiciones_rechazadas_y_intervalos_consecutivos_permitidos(
    postgres_client, postgres_engine, booking_setup, status,
):
    _, _, space, tenant, headers = booking_setup
    seed_booking(postgres_engine, space, tenant["id"], status=status,
                 expires_at=NOW + timedelta(minutes=15))
    for start, end in ((10, 12), (11, 13), (9, 11), (9, 13)):
        response = reserve(postgres_client, space, headers, start_hour=start, end_hour=end)
        assert response.status_code == 409
        assert response.json()["detail"] and response.headers["Cache-Control"] == "no-store"
    assert len(records(postgres_engine)[0]) == len(records(postgres_engine)[1]) == 1
    for start, end in ((9, 10), (12, 13)):
        assert reserve(postgres_client, space, headers,
                       start_hour=start, end_hour=end).status_code == 201
    bookings, payments = records(postgres_engine)
    assert len(bookings) == len(payments) == 3


@pytest.mark.parametrize("status", ["cancelled", "expired", "completed", "pending_payment"])
def test_ca09_terminales_y_pendiente_vencida_no_bloquean_sin_actualizacion_programada(
    postgres_client, postgres_engine, booking_setup, status,
):
    _, _, space, tenant, headers = booking_setup
    reservation_id = seed_booking(postgres_engine, space, tenant["id"], status=status,
                                  expires_at=NOW)
    with Session(postgres_engine) as session:
        before = session.get(Reservation, reservation_id).model_dump()
    response = reserve(postgres_client, space, headers)
    assert response.status_code == 201
    with Session(postgres_engine) as session:
        assert session.get(Reservation, reservation_id).model_dump() == before
    bookings, payments = records(postgres_engine)
    assert len(bookings) == len(payments) == 2


def test_ca09_pendiente_que_ya_inicio_no_bloquea_aunque_su_vencimiento_guardado_sea_futuro(
    postgres_client, postgres_engine, booking_setup,
):
    _, _, space, tenant, headers = booking_setup
    reservation_id = seed_booking(postgres_engine, space, tenant["id"], status="pending_payment",
                                  expires_at=NOW + timedelta(minutes=15))
    with Session(postgres_engine) as session:
        stale = session.get(Reservation, reservation_id)
        stale.starts_at, stale.ends_at = NOW, NOW + timedelta(hours=2)
        session.add(stale)
        session.commit()
        session.refresh(stale)
        before = stale.model_dump()
    response = reserve(postgres_client, space, headers,
                       date=NOW.astimezone(SANTIAGO).date().isoformat(),
                       start_hour=11, end_hour=12)
    assert response.status_code == 201
    with Session(postgres_engine) as session:
        assert session.get(Reservation, reservation_id).model_dump() == before
    assert len(records(postgres_engine)[0]) == 2


def test_ca08_confirmacion_privada_y_estado_efectivo_al_recargar(
    postgres_client, postgres_engine, booking_setup, clock,
):
    _, owner_headers, space, _, headers = booking_setup
    response = reserve(postgres_client, space, headers)
    assert response.status_code == 201
    body = response.json()
    path = f"/api/reservations/{body['id']}"
    assert postgres_client.get(path).status_code == 401
    assert postgres_client.get(path, headers=owner_headers).status_code == 404
    _, stranger_headers = authenticate(postgres_client, "otra-cuenta@example.com")
    assert postgres_client.get(path, headers=stranger_headers).status_code == 404
    assert postgres_client.get(f"/api/reservations/{uuid4()}", headers=headers).status_code == 404
    assert postgres_client.get("/api/reservations/id-invalido", headers=headers).status_code == 422
    refreshed = postgres_client.get(path, headers=headers)
    assert refreshed.status_code == 200 and refreshed.json() == body
    assert refreshed.headers["Cache-Control"] == "no-store"
    clock["now"] = NOW + timedelta(minutes=15)
    refreshed = postgres_client.get(path, headers=headers)
    assert refreshed.status_code == 200 and refreshed.json()["status"] == "expired"
    assert refreshed.json()["payment"]["status"] == "pending"
    bookings, _ = records(postgres_engine)
    assert bookings[0].status == "pending_payment"


def run_contending_requests(engine, first_call, second_call):
    """Hold the first real API row lock until PostgreSQL confirms the second waits."""
    locked, second_attempted, release = Event(), Event(), Event()
    pids = {}

    def before_lock(connection, cursor, statement, parameters, context, executemany):
        if "FOR UPDATE" not in statement.upper() or "FROM SPACES" not in statement.upper():
            return
        pid = connection.connection.driver_connection.info.backend_pid
        if "first" not in pids:
            pids["first"] = pid
        elif pid != pids["first"]:
            pids["second"] = pid
            second_attempted.set()

    def after_lock(connection, cursor, statement, parameters, context, executemany):
        if (
            "FOR UPDATE" in statement.upper() and "FROM SPACES" in statement.upper()
            and connection.connection.driver_connection.info.backend_pid == pids.get("first")
            and not locked.is_set()
        ):
            locked.set()
            assert release.wait(timeout=10)

    event.listen(engine, "before_cursor_execute", before_lock)
    event.listen(engine, "after_cursor_execute", after_lock)
    try:
        with ThreadPoolExecutor(max_workers=2) as executor:
            first = executor.submit(first_call)
            assert locked.wait(timeout=10)
            second = executor.submit(second_call)
            try:
                assert second_attempted.wait(timeout=10)
                wait_for_database_lock(engine, pids["second"], pids["first"])
            finally:
                release.set()
            return first.result(timeout=10), second.result(timeout=10)
    finally:
        release.set()
        event.remove(engine, "before_cursor_execute", before_lock)
        event.remove(engine, "after_cursor_execute", after_lock)


def test_ca06_dos_solicitudes_simultaneas_por_api_generan_una_reserva_y_un_pago(
    postgres_client, postgres_engine, booking_setup,
):
    _, _, space, tenant, headers = booking_setup
    _, other_headers = authenticate(postgres_client, "competidor@example.com")
    first, second = run_contending_requests(
        postgres_engine,
        lambda: reserve(postgres_client, space, headers),
        lambda: reserve(postgres_client, space, other_headers),
    )
    assert first.status_code == 201 and second.status_code == 409
    assert second.json()["detail"] and second.headers["Cache-Control"] == "no-store"
    bookings, payments = records(postgres_engine)
    assert len(bookings) == len(payments) == 1
    assert bookings[0].tenant_id == UUID(tenant["id"])
    assert bookings[0].id == UUID(first.json()["id"])
    assert payments[0].reservation_id == bookings[0].id


def test_ca02_ca06_revalida_hora_actual_despues_de_esperar_bloqueo_real(
    postgres_client, postgres_engine, booking_setup, clock,
):
    _, _, space, _, headers = booking_setup
    attempting = Event()
    waiter = {}

    def before_lock(connection, cursor, statement, parameters, context, executemany):
        if "FOR UPDATE" in statement.upper() and "FROM SPACES" in statement.upper():
            waiter["pid"] = connection.connection.driver_connection.info.backend_pid
            attempting.set()

    # Another transaction holds the row while a valid request waits. Time advances
    # to its requested start before it can validate and create the reservation.
    with Session(postgres_engine) as holder:
        holder.exec(select(Space).where(Space.id == UUID(space["id"])).with_for_update()).one()
        blocker_pid = holder.connection().connection.driver_connection.info.backend_pid
        event.listen(postgres_engine, "before_cursor_execute", before_lock)
        try:
            with ThreadPoolExecutor(max_workers=1) as executor:
                request = executor.submit(
                    lambda: reserve(postgres_client, space, headers,
                                    date=NOW.astimezone(SANTIAGO).date().isoformat(),
                                    start_hour=11, end_hour=12)
                )
                try:
                    assert attempting.wait(timeout=10)
                    wait_for_database_lock(postgres_engine, waiter["pid"], blocker_pid)
                    clock["now"] = NOW + timedelta(hours=1)
                finally:
                    holder.commit()
                response = request.result(timeout=10)
        finally:
            event.remove(postgres_engine, "before_cursor_execute", before_lock)
    assert response.status_code == 422
    assert records(postgres_engine) == ([], [])


@pytest.mark.parametrize("operation", ["schedule", "disable", "delete"])
@pytest.mark.parametrize("winner", ["reservation", "space_change"])
def test_ca06_ca10_reserva_real_y_cambios_del_espacio_en_ambos_ordenes(
    postgres_client, postgres_engine, booking_setup, operation, winner,
):
    _, owner_headers, space, _, headers = booking_setup

    def change_space():
        if operation == "schedule":
            return postgres_client.put(
                f"/api/spaces/{space['id']}", headers=owner_headers,
                json=update_data(space, opening_hour=11),
            )
        if operation == "disable":
            return status_change(postgres_client, space, owner_headers, False)
        return postgres_client.delete(f"/api/spaces/{space['id']}", headers=owner_headers)

    booking = lambda: reserve(postgres_client, space, headers)
    if winner == "reservation":
        reservation_response, change_response = run_contending_requests(
            postgres_engine, booking, change_space,
        )
    else:
        change_response, reservation_response = run_contending_requests(
            postgres_engine, change_space, booking,
        )
    bookings, payments = records(postgres_engine)
    with Session(postgres_engine) as session:
        stored = session.get(Space, UUID(space["id"]))
        if winner == "reservation":
            assert reservation_response.status_code == 201
            assert len(bookings) == len(payments) == 1
            assert payments[0].reservation_id == bookings[0].id
            if operation == "disable":
                assert change_response.status_code == 200 and stored.is_active is False
            else:
                assert change_response.status_code == 409
                assert stored.opening_hour == 9
        else:
            expected = {"schedule": (200, 422), "disable": (200, 409), "delete": (204, 404)}
            assert (change_response.status_code, reservation_response.status_code) == expected[operation]
            assert bookings == payments == []
            if operation == "delete":
                assert stored is None
            elif operation == "disable":
                assert stored.is_active is False
            else:
                assert stored.opening_hour == 11


@pytest.mark.parametrize("failure", ["payment_insert", "commit"])
def test_ca05_ca06_fallo_de_pago_o_commit_revierte_toda_la_operacion(
    postgres_client, postgres_engine, booking_setup, monkeypatch, failure,
):
    _, _, space, _, headers = booking_setup
    private_error = "postgresql://privado:secreto@interno/base SQL INSERT pagos"

    def reject_payment(connection, cursor, statement, parameters, context, executemany):
        if statement.lstrip().upper().startswith("INSERT INTO PAYMENTS"):
            raise SQLAlchemyError(private_error)

    def reject_commit(self):
        raise SQLAlchemyError(private_error)

    if failure == "payment_insert":
        event.listen(postgres_engine, "before_cursor_execute", reject_payment)
    try:
        with monkeypatch.context() as patch:
            if failure == "commit":
                patch.setattr(Session, "commit", reject_commit)
            response = reserve(postgres_client, space, headers)
    finally:
        if failure == "payment_insert":
            event.remove(postgres_engine, "before_cursor_execute", reject_payment)
    assert response.status_code == 503
    assert response.headers["Cache-Control"] == "no-store"
    assert private_error not in response.text and "secreto" not in response.text
    assert records(postgres_engine) == ([], [])
    # Rollback also releases the lock: retrying can reserve the unchanged interval.
    assert reserve(postgres_client, space, headers).status_code == 201
    bookings, payments = records(postgres_engine)
    assert len(bookings) == len(payments) == 1
