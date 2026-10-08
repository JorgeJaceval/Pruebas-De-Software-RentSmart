from uuid import UUID, uuid4

import pytest
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session

from app.dependencies import get_reservable_space
from app.errors import SpaceError
from app.models import Space, User
from test_public_catalog import PUBLIC_FIELDS, assert_safe_failure, public_data
from test_space_status import status_change, withdraw_space
from test_space_updates import create_space
from test_spaces import authenticate

pytestmark = pytest.mark.postgres


def make_admin(client, engine):
    account, headers = authenticate(client, "administrador@example.com")
    with Session(engine) as session:
        admin = session.get(User, UUID(account["id"]))
        admin.is_admin = True
        session.add(admin)
        session.commit()
    return headers


def test_cp01_04_detalle_activo_y_relacion_desde_sesion(postgres_client):
    _, owner_headers, space = create_space(postgres_client)
    _, other_headers = authenticate(postgres_client, "arrendatario@example.com")
    path = f"/api/spaces/{space['id']}/detail"
    public = postgres_client.get(f"/api/spaces/public/{space['id']}")
    assert public.status_code == 200 and public.json() == public_data(space)
    for headers, own in ((owner_headers, True), (other_headers, False)):
        response = postgres_client.get(path, headers=headers)
        assert response.status_code == 200
        assert response.json() == {**public_data(space), "is_active": True,
                                  "is_withdrawn": False, "is_owner": own, "can_reserve": not own}
        assert set(response.json()) == PUBLIC_FIELDS | {"is_active", "is_withdrawn", "is_owner", "can_reserve"}
        assert response.headers["Cache-Control"] == "no-store"
    for headers in ({}, {"Authorization": "Bearer token-invalido"}):
        assert postgres_client.get(path, headers=headers).status_code == 401


def test_cp03_inactivos_y_retirados_solo_dueno_o_admin_sin_permisos_de_edicion(
    postgres_client, postgres_engine
):
    _, owner_headers, space = create_space(postgres_client)
    _, other_headers = authenticate(postgres_client, "arrendatario@example.com")
    admin_headers = make_admin(postgres_client, postgres_engine)
    path = f"/api/spaces/{space['id']}/detail"
    assert status_change(postgres_client, space, owner_headers, False).status_code == 200
    for withdrawn in (False, True):
        if withdrawn:
            withdraw_space(postgres_engine, space)
        assert postgres_client.get(f"/api/spaces/public/{space['id']}").status_code == 404
        assert postgres_client.get(path, headers=other_headers).status_code == 404
        for headers, own in ((owner_headers, True), (admin_headers, False)):
            response = postgres_client.get(path, headers=headers)
            assert response.status_code == 200
            assert response.json() == {**public_data(space), "is_active": False,
                                      "is_withdrawn": withdrawn, "is_owner": own, "can_reserve": False}
        assert status_change(postgres_client, space, admin_headers, True).status_code == 403
        assert postgres_client.delete(f"/api/spaces/{space['id']}", headers=admin_headers).status_code == 403


def test_cp04_guardia_backend_rechaza_reserva_propia_y_conserva_bloqueo(
    postgres_client, postgres_engine
):
    owner, _, space = create_space(postgres_client)
    tenant, _ = authenticate(postgres_client, "arrendatario@example.com")
    with Session(postgres_engine) as session:
        with pytest.raises(SpaceError) as failure:
            get_reservable_space(UUID(space["id"]), session, UUID(owner["id"]))
        assert failure.value.status_code == 409
        assert failure.value.detail == "No puedes reservar tu propio espacio."
        session.rollback()
        allowed = get_reservable_space(UUID(space["id"]), session, UUID(tenant["id"]))
        assert allowed.id == UUID(space["id"])
        session.rollback()


def test_cp03_errores_controlados_uuid_y_reintento(postgres_client, monkeypatch):
    _, headers, space = create_space(postgres_client)
    path = f"/api/spaces/{space['id']}/detail"
    original_get = Session.get

    def fail_space(session, entity, *args, **kwargs):
        if entity is Space:
            raise SQLAlchemyError("postgresql://secret-user:secret-password@private-db/internal")
        return original_get(session, entity, *args, **kwargs)

    with monkeypatch.context() as failure:
        failure.setattr(Session, "get", fail_space)
        response = postgres_client.get(path, headers=headers)
    assert_safe_failure(response, "No pudimos consultar el espacio. Inténtalo nuevamente.")
    assert postgres_client.get(path, headers=headers).status_code == 200
    assert postgres_client.get(f"/api/spaces/{uuid4()}/detail", headers=headers).status_code == 404
    invalid = postgres_client.get("/api/spaces/no-es-uuid/detail", headers=headers)
    assert invalid.status_code == 422 and "no-es-uuid" not in invalid.text
