from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import pytest
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, select

from app.models import Reservation, Space, User
from test_spaces import authenticate, publication

pytestmark = pytest.mark.postgres

OWNED_FIELDS = {
    "id", "owner_id", "name", "description", "category", "commune",
    "location_reference", "capacity", "price_per_hour", "conditions", "photos",
    "opening_hour", "closing_hour", "is_active", "is_withdrawn",
}


def seed_space(engine, owner_id, identifier, **changes):
    space = Space(
        id=UUID(int=identifier), owner_id=UUID(owner_id), **publication(**changes),
    )
    with Session(engine) as session:
        session.add(space)
        session.commit()
    return str(UUID(int=identifier))


def snapshot(engine):
    with Session(engine) as session:
        return [
            space.model_dump(mode="json")
            for space in session.exec(select(Space).order_by(Space.id)).all()
        ]


def test_cp01_propios_todos_los_estados_orden_estable_y_sin_datos_privados_ajenos(
    postgres_client, postgres_engine,
):
    owner, headers = authenticate(postgres_client)
    other, _ = authenticate(postgres_client, "otro@example.com")
    active = seed_space(postgres_engine, owner["id"], 3, name="Sala propia activa")
    inactive = seed_space(
        postgres_engine, owner["id"], 1, name="Sala propia inactiva", is_active=False,
    )
    withdrawn = seed_space(
        postgres_engine, owner["id"], 2, name="Sala propia retirada",
        is_active=False, is_withdrawn=True,
    )
    foreign = seed_space(postgres_engine, other["id"], 4, name="Sala de otra persona")
    reservation_id = uuid4()
    starts_at = datetime.now(timezone.utc) + timedelta(days=1)
    with Session(postgres_engine) as session:
        session.add(Reservation(
            id=reservation_id, space_id=UUID(active), tenant_id=UUID(other["id"]),
            starts_at=starts_at, ends_at=starts_at + timedelta(hours=1),
            payment_expires_at=starts_at, unit_price=15000,
            total_price=15000, duration_hours=1,
        ))
        session.commit()
    before = snapshot(postgres_engine)
    for _ in range(2):
        response = postgres_client.get("/api/spaces/mine", headers=headers)
        assert response.status_code == 200
        assert response.headers["Cache-Control"] == "no-store"
        spaces = response.json()
        assert [space["id"] for space in spaces] == [inactive, withdrawn, active]
        assert [(space["is_active"], space["is_withdrawn"]) for space in spaces] == [
            (False, False), (False, True), (True, False),
        ]
        for space in spaces:
            assert set(space) == OWNED_FIELDS
            assert space["owner_id"] == owner["id"]
            assert space["price_per_hour"] == 15000
            assert space["photos"] == ["https://example.com/sala.jpg"]
            assert (space["opening_hour"], space["closing_hour"]) == (9, 18)
        for private in (foreign, other["id"], owner["email"], other["email"],
                        str(reservation_id), "password_hash", "tenant_id", "reservations"):
            assert private not in response.text
    assert snapshot(postgres_engine) == before


def test_cp02_administrador_consulta_solamente_sus_espacios(
    postgres_client, postgres_engine,
):
    admin, headers = authenticate(postgres_client, "admin@example.com")
    owner, _ = authenticate(postgres_client, "otro@example.com")
    with Session(postgres_engine) as session:
        account = session.get(User, UUID(admin["id"]))
        account.is_admin = True
        session.add(account)
        session.commit()
    own = seed_space(postgres_engine, admin["id"], 2, name="Sala del administrador")
    foreign = seed_space(postgres_engine, owner["id"], 1, name="Sala de otra persona")
    response = postgres_client.get(
        "/api/spaces/mine", headers=headers, params={"owner_id": owner["id"]},
    )
    assert response.status_code == 200
    assert [space["id"] for space in response.json()] == [own]
    assert response.json()[0]["owner_id"] == admin["id"]
    assert foreign not in response.text


def test_cp03_cuenta_sin_publicaciones_no_confunde_vacio_con_espacios_ajenos(
    postgres_client, postgres_engine,
):
    _, headers = authenticate(postgres_client)
    other, _ = authenticate(postgres_client, "otro@example.com")
    seed_space(postgres_engine, other["id"], 1)
    response = postgres_client.get("/api/spaces/mine", headers=headers)
    assert response.status_code == 200 and response.json() == []
    assert response.headers["Cache-Control"] == "no-store"


def test_cp04_sesion_obligatoria_y_parametros_no_cambian_la_identidad(
    postgres_client, postgres_engine,
):
    owner, headers = authenticate(postgres_client)
    other, _ = authenticate(postgres_client, "otro@example.com")
    own = seed_space(postgres_engine, owner["id"], 1)
    foreign = seed_space(postgres_engine, other["id"], 2)
    for invalid_headers in ({}, {"Authorization": "Bearer token-invalido"}):
        response = postgres_client.get("/api/spaces/mine", headers=invalid_headers)
        assert response.status_code == 401
        assert response.headers["Cache-Control"] == "no-store"
        assert own not in response.text and foreign not in response.text
    for params in (
        {"owner_id": other["id"]}, {"user_id": other["id"]},
        {"owner_id": "no-es-uuid", "user_id": other["id"], "is_admin": "true"},
    ):
        response = postgres_client.get("/api/spaces/mine", headers=headers, params=params)
        assert response.status_code == 200
        assert [space["id"] for space in response.json()] == [own]
        assert foreign not in response.text


def test_cp05_error_controlado_distinto_de_vacio_reintento_y_consulta_sin_escrituras(
    postgres_client, postgres_engine, monkeypatch,
):
    owner, headers = authenticate(postgres_client)
    seed_space(postgres_engine, owner["id"], 1)
    before = snapshot(postgres_engine)

    def fail_query(session, *args, **kwargs):
        raise SQLAlchemyError("postgresql://secret-user:secret-password@private-db/internal")

    with monkeypatch.context() as failure:
        failure.setattr(Session, "exec", fail_query)
        response = postgres_client.get("/api/spaces/mine", headers=headers)
    message = "No pudimos consultar tus espacios. Inténtalo nuevamente."
    assert response.status_code == 503
    assert response.json() == {"detail": message, "errors": {"form": message}}
    assert response.headers["Cache-Control"] == "no-store"
    assert "secret-password" not in response.text and "private-db" not in response.text
    assert snapshot(postgres_engine) == before

    def reject_commit(session):
        pytest.fail("Consultar mis espacios no debe confirmar escrituras.")

    with monkeypatch.context() as read_only:
        read_only.setattr(Session, "commit", reject_commit)
        retry = postgres_client.get("/api/spaces/mine", headers=headers)
    assert retry.status_code == 200 and retry.json() == before
    assert snapshot(postgres_engine) == before
