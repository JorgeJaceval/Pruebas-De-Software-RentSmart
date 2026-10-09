from datetime import timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy import event
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, select

from app.models import Payment, Reservation, User
from app.routers import reservations, spaces
from test_reservations import as_datetime
from test_space_status import status_change, withdraw_space
from test_space_updates import NOW, SANTIAGO, create_space, update_data
from test_spaces import authenticate

pytestmark = pytest.mark.postgres


@pytest.fixture
def history_clock(monkeypatch):
    clock = {"now": NOW}
    monkeypatch.setattr(reservations, "utc_now", lambda: clock["now"])
    monkeypatch.setattr(spaces, "utc_now", lambda: clock["now"])
    return clock


@pytest.fixture
def history_setup(postgres_client, history_clock):
    owner, owner_headers, space = create_space(postgres_client)
    tenant, headers = authenticate(postgres_client, "historial@example.com")
    return owner, owner_headers, space, tenant, headers


def seed_history(
    engine, space, tenant_id, *, starts_at=None, ends_at=None,
    status="pending_payment", payment_status="pending", expires_at=None,
    reservation_id=None, unit_price=15000, total_price=30000, created_at=None,
):
    starts_at = starts_at if starts_at is not None else NOW + timedelta(days=1)
    ends_at = ends_at if ends_at is not None else starts_at + timedelta(hours=2)
    reservation = Reservation(
        id=reservation_id or uuid4(), space_id=UUID(space["id"]),
        tenant_id=UUID(tenant_id), starts_at=starts_at, ends_at=ends_at,
        duration_hours=(ends_at - starts_at).total_seconds() / 3600,
        status=status, payment_expires_at=(
            expires_at if expires_at is not None else NOW + timedelta(minutes=10)
        ),
        unit_price=unit_price, total_price=total_price,
        created_at=created_at if created_at is not None else NOW - timedelta(minutes=5),
    )
    saved_id = reservation.id
    with Session(engine) as session:
        session.add(reservation)
        session.flush()
        if payment_status is not None:
            session.add(Payment(
                reservation_id=reservation.id, status=payment_status,
                created_at=reservation.created_at,
            ))
        session.commit()
    return saved_id


def stored_history(engine):
    with Session(engine) as session:
        return {
            "reservations": {
                str(item.id): item.model_dump()
                for item in session.exec(select(Reservation)).all()
            },
            "payments": {
                str(item.id): item.model_dump()
                for item in session.exec(select(Payment)).all()
            },
        }


def test_ca01_ca07_consulta_autenticada_y_vacio_distinguen_error(
    postgres_client, history_setup,
):
    _, _, _, _, headers = history_setup
    for invalid_headers in ({}, {"Authorization": "Bearer token-invalido"}):
        response = postgres_client.get("/api/reservations", headers=invalid_headers)
        assert response.status_code == 401
        assert response.headers["Cache-Control"] == "no-store"
        assert "items" not in response.json()
    response = postgres_client.get("/api/reservations", headers=headers)
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"
    assert response.json()["items"] == []
    assert as_datetime(response.json()["as_of"]) == NOW


def test_ca01_ca06_cada_cuenta_solo_ve_reservas_propias_incluso_admin_y_propietario(
    postgres_client, postgres_engine, history_setup,
):
    owner, owner_headers, space, tenant, headers = history_setup
    other, other_headers = authenticate(postgres_client, "otro-historial@example.com")
    admin, admin_headers = authenticate(postgres_client, "admin-historial@example.com")
    with Session(postgres_engine) as session:
        user = session.get(User, UUID(admin["id"]))
        user.is_admin = True
        session.add(user)
        session.commit()
    ids = {
        tenant["id"]: seed_history(postgres_engine, space, tenant["id"]),
        other["id"]: seed_history(postgres_engine, space, other["id"]),
        admin["id"]: seed_history(postgres_engine, space, admin["id"]),
    }
    for account, auth_headers in ((tenant, headers), (other, other_headers),
                                  (admin, admin_headers), (owner, owner_headers)):
        response = postgres_client.get("/api/reservations", headers=auth_headers)
        assert response.status_code == 200
        expected = [str(ids[account["id"]])] if account["id"] in ids else []
        assert [item["id"] for item in response.json()["items"]] == expected
        # Neither the tenant's nor the owner's identity is part of this read DTO.
        for private in (tenant["id"], tenant["email"], owner["id"], owner["email"]):
            assert private not in response.text
    forged = postgres_client.get(
        "/api/reservations",
        headers=headers,
        params={"tenant_id": other["id"], "user_id": admin["id"], "all": "true"},
    )
    assert forged.status_code == 200
    assert [item["id"] for item in forged.json()["items"]] == [str(ids[tenant["id"]])]
    for auth_headers in (other_headers, admin_headers, owner_headers):
        denied = postgres_client.get(f"/api/reservations/{ids[tenant['id']]}", headers=auth_headers)
        missing = postgres_client.get(f"/api/reservations/{uuid4()}", headers=auth_headers)
        assert denied.status_code == missing.status_code == 404
        assert denied.json() == missing.json()
        assert denied.headers["Cache-Control"] == "no-store"


def test_ca01_ca02_ca03_ca07_historial_mixto_estados_efectivos_y_orden_estable(
    postgres_client, postgres_engine, history_setup,
):
    _, _, space, tenant, headers = history_setup
    future = NOW + timedelta(days=1)
    cases = [
        ("pending_payment", "pending", future, NOW + timedelta(minutes=10), "pending_payment", True, True),
        ("pending_payment", "rejected", future + timedelta(hours=1), NOW + timedelta(minutes=10), "pending_payment", True, True),
        ("paid", "approved", NOW - timedelta(hours=1), NOW - timedelta(days=1), "paid", False, False),
        ("paid", "approved", future + timedelta(days=1), NOW - timedelta(days=1), "paid", False, True),
        ("pending_payment", "pending", future + timedelta(days=3), NOW, "expired", False, False),
        ("cancelled", "refunded", future + timedelta(days=2), NOW + timedelta(minutes=10), "cancelled", False, False),
        ("expired", "rejected", future, NOW + timedelta(minutes=10), "expired", False, False),
        ("paid", "approved", NOW - timedelta(hours=2), NOW - timedelta(days=1), "completed", False, False),
        ("completed", "approved", NOW - timedelta(days=1), NOW - timedelta(days=2), "completed", False, False),
    ]
    expected = {}
    for stored_status, payment_status, start, expiry, effective, can_pay, can_cancel in cases:
        reservation_id = seed_history(
            postgres_engine, space, tenant["id"], starts_at=start,
            status=stored_status, payment_status=payment_status, expires_at=expiry,
        )
        expected[str(reservation_id)] = (effective, payment_status, can_pay, can_cancel)
    before = stored_history(postgres_engine)
    response = postgres_client.get("/api/reservations", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert as_datetime(body["as_of"]) == NOW
    assert len(body["items"]) == len(cases)
    for item in body["items"]:
        effective, payment_status, can_pay, can_cancel = expected[item["id"]]
        assert item["status"] == effective
        assert item["payment"]["status"] == payment_status
        assert item["can_pay"] is can_pay and item["can_cancel"] is can_cancel
        assert item["space_id"] == space["id"] and item["space_name"] == space["name"]
        assert item["unit_price"] == 15000 and item["total_price"] == 30000
        assert item["duration_hours"] == 2
        assert item["date"] == as_datetime(item["starts_at"]).astimezone(SANTIAGO).date().isoformat()
        assert as_datetime(item["payment_expires_at"]) == before["reservations"][item["id"]]["payment_expires_at"]
    # Active bookings come first chronologically, followed by terminal history
    # in reverse chronological order. UUID is the deterministic final tie break.
    nonterminal = [item for item in body["items"] if item["status"] in ("pending_payment", "paid")]
    terminal = [item for item in body["items"] if item["status"] not in ("pending_payment", "paid")]
    assert body["items"] == nonterminal + terminal
    assert nonterminal == sorted(nonterminal, key=lambda item: (as_datetime(item["starts_at"]), item["id"]))
    assert terminal == sorted(terminal, key=lambda item: (-as_datetime(item["starts_at"]).timestamp(), item["id"]))
    assert stored_history(postgres_engine) == before


@pytest.mark.parametrize("stored_status,start_offset,end_offset,expiry_offset,expected,pay,cancel", [
    ("pending_payment", 60, 120, 1, "pending_payment", True, True),
    ("pending_payment", 60, 120, 0, "expired", False, False),
    ("pending_payment", 60, 120, -1, "expired", False, False),
    ("pending_payment", 0, 60, 1, "expired", False, False),
    ("pending_payment", -1, 60, 60, "expired", False, False),
    ("paid", 1, 60, -1, "paid", False, True),
    ("paid", 0, 60, -1, "paid", False, False),
    ("paid", -60, 1, -1, "paid", False, False),
    ("paid", -60, 0, -1, "completed", False, False),
    ("cancelled", 60, 120, 60, "cancelled", False, False),
    ("expired", 60, 120, 60, "expired", False, False),
    ("completed", 60, 120, 60, "completed", False, False),
])
def test_ca02_ca03_ca04_limites_exactos_y_mismo_estado_en_lista_y_detalle(
    postgres_client, postgres_engine, history_setup,
    stored_status, start_offset, end_offset, expiry_offset, expected, pay, cancel,
):
    _, _, space, tenant, headers = history_setup
    payment_status = "approved" if stored_status in ("paid", "completed") else "pending"
    reservation_id = seed_history(
        postgres_engine, space, tenant["id"], status=stored_status,
        payment_status=payment_status,
        starts_at=NOW + timedelta(seconds=start_offset),
        ends_at=NOW + timedelta(seconds=end_offset),
        expires_at=NOW + timedelta(seconds=expiry_offset),
    )
    before = stored_history(postgres_engine)
    listing = postgres_client.get("/api/reservations", headers=headers)
    detail = postgres_client.get(f"/api/reservations/{reservation_id}", headers=headers)
    assert listing.status_code == detail.status_code == 200
    item = listing.json()["items"][0]
    assert detail.json() == item
    assert item["status"] == expected and item["can_pay"] is pay and item["can_cancel"] is cancel
    assert stored_history(postgres_engine) == before


def test_ca02_ca04_recargar_revalida_vencimiento_sin_modificar_datos_persistidos(
    postgres_client, postgres_engine, history_setup, history_clock,
):
    _, _, space, tenant, headers = history_setup
    pending_id = seed_history(postgres_engine, space, tenant["id"])
    paid_end = NOW + timedelta(minutes=20)
    paid_id = seed_history(
        postgres_engine, space, tenant["id"], status="paid", payment_status="approved",
        starts_at=NOW - timedelta(hours=1), ends_at=paid_end,
    )
    before = stored_history(postgres_engine)
    first = postgres_client.get("/api/reservations", headers=headers)
    assert first.status_code == 200
    states = {item["id"]: item["status"] for item in first.json()["items"]}
    assert states == {str(pending_id): "pending_payment", str(paid_id): "paid"}
    history_clock["now"] = paid_end
    second = postgres_client.get("/api/reservations", headers=headers)
    assert second.status_code == 200
    states = {item["id"]: item["status"] for item in second.json()["items"]}
    assert states == {str(pending_id): "expired", str(paid_id): "completed"}
    assert all(not item["can_pay"] and not item["can_cancel"] for item in second.json()["items"])
    assert as_datetime(second.json()["as_of"]) == paid_end
    assert stored_history(postgres_engine) == before


def test_ca02_ca04_un_solo_reloj_actual_despues_de_consultar_para_todas_las_filas(
    postgres_client, postgres_engine, history_setup, monkeypatch,
):
    _, _, space, tenant, headers = history_setup
    for _ in range(3):
        seed_history(postgres_engine, space, tenant["id"])
    state = {"now": NOW, "calls": 0}

    def now_after_query():
        state["calls"] += 1
        return state["now"]

    def advance_during_query(connection, cursor, statement, parameters, context, executemany):
        if statement.lstrip().upper().startswith("SELECT") and "FROM reservations" in statement:
            state["now"] = NOW + timedelta(minutes=10)

    monkeypatch.setattr(reservations, "utc_now", now_after_query)
    event.listen(postgres_engine, "before_cursor_execute", advance_during_query)
    try:
        response = postgres_client.get("/api/reservations", headers=headers)
    finally:
        event.remove(postgres_engine, "before_cursor_execute", advance_during_query)
    assert response.status_code == 200
    assert state["calls"] == 1
    assert as_datetime(response.json()["as_of"]) == NOW + timedelta(minutes=10)
    assert len(response.json()["items"]) == 3
    assert all(item["status"] == "expired" for item in response.json()["items"])
    assert all(not item["can_pay"] and not item["can_cancel"] for item in response.json()["items"])


def test_ca05_editar_precio_desactivar_y_retirar_no_borra_contrato_ni_referencia(
    postgres_client, postgres_engine, history_setup,
):
    _, owner_headers, space, tenant, headers = history_setup
    reservation_id = seed_history(
        postgres_engine, space, tenant["id"], status="paid", payment_status="approved",
        starts_at=NOW - timedelta(days=2),
    )
    before = stored_history(postgres_engine)
    edited = postgres_client.put(
        f"/api/spaces/{space['id']}", headers=owner_headers,
        json=update_data(space, price_per_hour=25000, name="Sala central renovada"),
    )
    assert edited.status_code == 200
    assert status_change(postgres_client, space, owner_headers, False).status_code == 200
    for action in (None, "withdraw"):
        if action == "withdraw":
            response = postgres_client.delete(f"/api/spaces/{space['id']}", headers=owner_headers)
            assert response.status_code == 409
            # HU-06 preserves every booking's readable space reference by
            # refusing deletion. Administrative withdrawal is seeded until HU-18.
            withdraw_space(postgres_engine, space)
        listing = postgres_client.get("/api/reservations", headers=headers)
        detail = postgres_client.get(f"/api/reservations/{reservation_id}", headers=headers)
        assert listing.status_code == detail.status_code == 200
        item = listing.json()["items"][0]
        assert detail.json() == item
        assert item["space_id"] == space["id"] and item["space_name"] == "Sala central renovada"
        assert item["unit_price"] == 15000 and item["total_price"] == 30000
        assert item["status"] == "completed" and item["duration_hours"] == 2
        assert stored_history(postgres_engine) == before


def test_ca01_ca05_legado_fraccionario_minutos_precio_pactado_y_pago_ausente(
    postgres_client, postgres_engine, history_setup,
):
    _, _, space, tenant, headers = history_setup
    local_start = (NOW.astimezone(SANTIAGO) + timedelta(days=1)).replace(hour=9, minute=30)
    reservation_id = seed_history(
        postgres_engine, space, tenant["id"], status="paid", payment_status=None,
        starts_at=local_start, ends_at=local_start + timedelta(hours=8, minutes=30),
        unit_price=15000, total_price=12345, expires_at=NOW - timedelta(hours=2),
        created_at=NOW - timedelta(hours=2, minutes=15),
    )
    before = stored_history(postgres_engine)
    listing = postgres_client.get("/api/reservations", headers=headers)
    detail = postgres_client.get(f"/api/reservations/{reservation_id}", headers=headers)
    assert listing.status_code == detail.status_code == 200
    item = listing.json()["items"][0]
    assert detail.json() == item
    assert item["duration_hours"] == 8.5
    assert as_datetime(item["starts_at"]).astimezone(SANTIAGO).strftime("%H:%M") == "09:30"
    assert as_datetime(item["ends_at"]).astimezone(SANTIAGO).strftime("%H:%M") == "18:00"
    assert item["unit_price"] == 15000 and item["total_price"] == 12345
    assert item["payment"] is None
    assert item["status"] == "paid" and item["can_cancel"] is True and item["can_pay"] is False
    assert stored_history(postgres_engine) == before


def test_ca07_misma_hora_orden_uuid_estable_entre_recargas(
    postgres_client, postgres_engine, history_setup,
):
    _, _, space, tenant, headers = history_setup
    ids = [UUID("00000000-0000-4000-8000-000000000003"),
           UUID("00000000-0000-4000-8000-000000000001"),
           UUID("00000000-0000-4000-8000-000000000002")]
    for reservation_id in ids:
        seed_history(postgres_engine, space, tenant["id"], reservation_id=reservation_id)
    for _ in range(2):
        response = postgres_client.get("/api/reservations", headers=headers)
        assert response.status_code == 200
        assert [item["id"] for item in response.json()["items"]] == [str(value) for value in sorted(ids)]


@pytest.mark.parametrize("detail", [False, True])
def test_consulta_usa_una_select_compartida_de_reservas_espacios_y_pago(
    postgres_client, postgres_engine, history_setup, detail,
):
    _, _, space, tenant, headers = history_setup
    ids = [seed_history(postgres_engine, space, tenant["id"], payment_status=None)
           for _ in range(5)]
    statements = []

    def capture(connection, cursor, statement, parameters, context, executemany):
        if statement.lstrip().upper().startswith("SELECT"):
            statements.append(statement)

    event.listen(postgres_engine, "before_cursor_execute", capture)
    try:
        path = f"/api/reservations/{ids[0]}" if detail else "/api/reservations"
        response = postgres_client.get(path, headers=headers)
    finally:
        event.remove(postgres_engine, "before_cursor_execute", capture)
    assert response.status_code == 200
    # Authentication reads the current user once; one further query reads the
    # reservation contract, readable space reference and optional payment.
    assert len(statements) == 2
    reservation_query = statements[1]
    assert "FROM reservations" in reservation_query
    assert "JOIN spaces" in reservation_query and "LEFT OUTER JOIN payments" in reservation_query
    assert "reservations.tenant_id" in reservation_query
    if not detail:
        assert len(response.json()["items"]) == 5
        assert all(item["payment"] is None for item in response.json()["items"])


@pytest.mark.parametrize("detail", [False, True])
def test_ca07_fallo_de_consulta_es_503_sin_datos_sensibles_y_reintento_correcto(
    postgres_client, postgres_engine, history_setup, monkeypatch, detail,
):
    _, _, space, tenant, headers = history_setup
    reservation_id = seed_history(postgres_engine, space, tenant["id"])
    original_exec = Session.exec
    private = "postgres://private-user:private-password@private-host/private-db"

    def fail_reservation_query(session, statement, *args, **kwargs):
        if "FROM reservations" in str(statement):
            raise SQLAlchemyError(private)
        return original_exec(session, statement, *args, **kwargs)

    path = f"/api/reservations/{reservation_id}" if detail else "/api/reservations"
    with monkeypatch.context() as context:
        context.setattr(Session, "exec", fail_reservation_query)
        response = postgres_client.get(path, headers=headers)
    assert response.status_code == 503
    assert response.headers["Cache-Control"] == "no-store"
    assert private not in response.text and "items" not in response.json()
    retried = postgres_client.get(path, headers=headers)
    assert retried.status_code == 200
    if detail:
        assert retried.json()["id"] == str(reservation_id)
    else:
        assert [item["id"] for item in retried.json()["items"]] == [str(reservation_id)]
