from datetime import timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy import event
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session

from app.models import Space, User
from test_reservation_history import (
    history_clock, history_setup, seed_history, stored_history,
)
from test_space_updates import NOW
from test_spaces import authenticate, publication

pytestmark = pytest.mark.postgres
PATH = "/api/reservations/received"


def test_ca01_autenticacion_vacio_y_no_cache(postgres_client, history_setup):
    _, owner_headers, _, _, _ = history_setup
    for headers in ({}, {"Authorization": "Bearer invalido"}):
        assert postgres_client.get(PATH, headers=headers).status_code == 401
    response = postgres_client.get(PATH, headers=owner_headers)
    assert response.status_code == 200
    assert response.json()["items"] == []
    assert response.headers["Cache-Control"] == "no-store"


def test_ca01_ca02_propiedad_y_datos_minimos_incluso_admin(
    postgres_client, postgres_engine, history_setup,
):
    owner, headers, space, tenant, tenant_headers = history_setup
    reservation_id = seed_history(postgres_engine, space, tenant["id"])
    other, other_headers = authenticate(postgres_client, "otro-propietario@example.com")
    other_space = postgres_client.post("/api/spaces", headers=other_headers, json=publication()).json()
    other_id = seed_history(postgres_engine, other_space, tenant["id"])
    with Session(postgres_engine) as session:
        user = session.get(User, UUID(other["id"]))
        user.is_admin = True
        session.add(user)
        session.commit()
    for auth, expected in ((headers, reservation_id), (other_headers, other_id)):
        response = postgres_client.get(PATH, headers=auth, params={"owner_id": other["id"], "all": "true"})
        assert response.status_code == 200
        assert [item["id"] for item in response.json()["items"]] == [str(expected)]
        item = response.json()["items"][0]
        assert item["tenant_name"] == tenant["name"]
        assert item["can_pay"] is False
        assert item["can_cancel"] is True
        for private in (owner["id"], tenant["id"], tenant["email"], "password", "token", "is_admin"):
            assert private not in response.text
    assert postgres_client.get(PATH, headers=tenant_headers).json()["items"] == []
    # Owner access to the new panel does not broaden the tenant-only detail.
    assert postgres_client.get(f"/api/reservations/{reservation_id}", headers=headers).status_code == 404


def test_ca03_filtro_espacio_propio_ajeno_inexistente_y_uuid_invalido(
    postgres_client, postgres_engine, history_setup,
):
    _, headers, space, tenant, tenant_headers = history_setup
    expected = seed_history(postgres_engine, space, tenant["id"])
    empty_space = postgres_client.post("/api/spaces", headers=headers, json=publication()).json()
    for space_id, ids in ((space["id"], [str(expected)]), (empty_space["id"], [])):
        response = postgres_client.get(PATH, headers=headers, params={"space_id": space_id})
        assert response.status_code == 200
        assert [item["id"] for item in response.json()["items"]] == ids
    foreign = postgres_client.get(PATH, headers=tenant_headers, params={"space_id": space["id"]})
    missing = postgres_client.get(PATH, headers=tenant_headers, params={"space_id": str(uuid4())})
    assert foreign.status_code == missing.status_code == 404
    assert foreign.json() == missing.json()
    assert postgres_client.get(PATH, headers=headers, params={"space_id": "invalido"}).status_code == 422


@pytest.mark.parametrize("withdrawn", [False, True])
def test_ca01_ca02_ca04_ca06_historial_persistido_y_publicaciones_no_visibles(
    postgres_client, postgres_engine, history_setup, withdrawn,
):
    _, headers, space, tenant, _ = history_setup
    pending = seed_history(postgres_engine, space, tenant["id"])
    paid = seed_history(postgres_engine, space, tenant["id"], status="paid", payment_status="approved")
    expired = seed_history(postgres_engine, space, tenant["id"], expires_at=NOW)
    old = seed_history(
        postgres_engine, space, tenant["id"], status="paid", payment_status=None,
        starts_at=NOW - timedelta(days=2), ends_at=NOW - timedelta(days=2) + timedelta(hours=1.5),
        total_price=21000,
    )
    cancelled = seed_history(postgres_engine, space, tenant["id"], status="cancelled", payment_status="refunded")
    with Session(postgres_engine) as session:
        stored = session.get(Space, UUID(space["id"]))
        stored.is_active = False
        stored.is_withdrawn = withdrawn
        stored.price_per_hour = 25000
        session.add(stored)
        session.commit()
    before = stored_history(postgres_engine)
    response = postgres_client.get(PATH, headers=headers)
    assert response.status_code == 200
    items = response.json()["items"]
    by_id = {item["id"]: item for item in items}
    assert [item["status"] for item in items[:2]] == ["pending_payment", "paid"] or \
        [item["status"] for item in items[:2]] == ["paid", "pending_payment"]
    assert set(by_id) == {str(x) for x in (pending, paid, expired, old, cancelled)}
    assert by_id[str(expired)]["status"] == "expired"
    assert by_id[str(old)]["status"] == "completed"
    assert by_id[str(old)]["payment"] is None
    assert by_id[str(old)]["duration_hours"] == 1.5
    assert by_id[str(old)]["total_price"] == 21000
    assert by_id[str(paid)]["unit_price"] == 15000
    assert by_id[str(cancelled)]["can_cancel"] is False
    assert all(not item["can_pay"] for item in items)
    assert stored_history(postgres_engine) == before


def test_ca06_relectura_del_reloj_sin_actualizar_filas(
    postgres_client, postgres_engine, history_setup, history_clock,
):
    _, headers, space, tenant, _ = history_setup
    seed_history(postgres_engine, space, tenant["id"], expires_at=NOW + timedelta(minutes=5))
    assert postgres_client.get(PATH, headers=headers).json()["items"][0]["status"] == "pending_payment"
    history_clock["now"] = NOW + timedelta(minutes=5)
    item = postgres_client.get(PATH, headers=headers).json()["items"][0]
    assert item["status"] == "expired" and not item["can_cancel"]


def test_consulta_conjunta_sin_n_mas_uno(postgres_client, postgres_engine, history_setup):
    _, headers, space, tenant, _ = history_setup
    for _ in range(3):
        seed_history(postgres_engine, space, tenant["id"])
    statements = []

    def record(connection, cursor, statement, parameters, context, executemany):
        statements.append(statement)

    event.listen(postgres_engine, "before_cursor_execute", record)
    try:
        response = postgres_client.get(PATH, headers=headers)
    finally:
        event.remove(postgres_engine, "before_cursor_execute", record)
    assert response.status_code == 200
    assert len(response.json()["items"]) == 3
    assert len(statements) == 2  # autenticación + consulta con joins
    assert "spaces.owner_id" in statements[1]
    assert "JOIN users" in statements[1] and "LEFT OUTER JOIN payments" in statements[1]


def test_fallo_controlado_no_se_confunde_con_vacio_y_permite_reintentar(
    postgres_client, history_setup, monkeypatch,
):
    _, headers, _, _, _ = history_setup
    original = Session.exec

    def fail(session, statement, *args, **kwargs):
        if "FROM reservations" in str(statement):
            raise SQLAlchemyError("datos internos privados")
        return original(session, statement, *args, **kwargs)

    with monkeypatch.context() as context:
        context.setattr(Session, "exec", fail)
        response = postgres_client.get(PATH, headers=headers)
    assert response.status_code == 503
    assert "datos internos" not in response.text and "items" not in response.json()
    assert response.headers["Cache-Control"] == "no-store"
    assert postgres_client.get(PATH, headers=headers).json()["items"] == []
