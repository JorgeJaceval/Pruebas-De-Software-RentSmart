from uuid import uuid4

import pytest
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session

from app.space_schemas import SpaceCreate
from test_space_status import status_change, withdraw_space
from test_space_updates import create_space, seed_reservation
from test_spaces import authenticate, publication

pytestmark = pytest.mark.postgres
PUBLIC_FIELDS = {"id", *SpaceCreate.model_fields}


def public_data(space):
    return {field: space[field] for field in PUBLIC_FIELDS}


def fail_database_query(session, *args, **kwargs):
    raise SQLAlchemyError("postgresql://secret-user:secret-password@private-db/internal")


def assert_safe_failure(response, message):
    assert response.status_code == 503
    assert response.json() == {"detail": message, "errors": {"form": message}}
    assert response.headers["Cache-Control"] == "no-store"
    assert "secret-password" not in response.text and "private-db" not in response.text


def test_cp01_02_05_catalogo_publico_completo_y_sin_datos_privados(postgres_client, postgres_engine):
    _, owner_headers, first = create_space(postgres_client)
    active = [first]
    for category, name in (
        ("photo_studio", "Estudio fotográfico central"),
        ("multipurpose_room", "Sala multiuso central"),
    ):
        response = postgres_client.post(
            "/api/spaces", headers=owner_headers, json=publication(category=category, name=name)
        )
        assert response.status_code == 201
        active.append(response.json())
    for name, hidden_state in (("Sala inactiva central", "inactive"), ("Sala retirada central", "withdrawn")):
        response = postgres_client.post("/api/spaces", headers=owner_headers, json=publication(name=name))
        assert response.status_code == 201
        if hidden_state == "inactive":
            assert status_change(postgres_client, response.json(), owner_headers, False).status_code == 200
        else:
            withdraw_space(postgres_engine, response.json())
    visitor, visitor_headers = authenticate(postgres_client, "visitante@example.com")
    # This is a catalogue of active publications, not availability for a requested date.
    seed_reservation(postgres_engine, active[1], visitor["id"], status="paid")
    expected = sorted([public_data(space) for space in active], key=lambda space: space["id"])
    for headers in ({}, visitor_headers):
        response = postgres_client.get("/api/spaces", headers=headers)
        assert response.status_code == 200 and response.json() == expected
        assert response.headers["Cache-Control"] == "no-store"
        for space in response.json():
            assert set(space) == PUBLIC_FIELDS
            assert {"name", "category", "commune", "capacity", "price_per_hour", "photos"} <= set(space)
            assert "owner_id" not in space and "is_active" not in space and "is_withdrawn" not in space


def test_cp03_vacio_es_distinto_de_error_y_permite_reintentar(postgres_client, monkeypatch):
    empty = postgres_client.get("/api/spaces")
    assert empty.status_code == 200 and empty.json() == []
    assert empty.headers["Cache-Control"] == "no-store"
    _, _, active = create_space(postgres_client)
    with monkeypatch.context() as failure:
        failure.setattr(Session, "exec", fail_database_query)
        response = postgres_client.get("/api/spaces")
    assert_safe_failure(
        response, "No pudimos consultar los espacios disponibles. Inténtalo nuevamente."
    )
    retry = postgres_client.get("/api/spaces")
    assert retry.status_code == 200 and retry.json() == [public_data(active)]


def test_cp06_lectura_publica_basica_respeta_visibilidad_y_controla_errores(
    postgres_client, postgres_engine, monkeypatch
):
    _, owner_headers, active = create_space(postgres_client)
    path = f"/api/spaces/public/{active['id']}"
    response = postgres_client.get(path)
    assert response.status_code == 200 and response.json() == public_data(active)
    assert response.headers["Cache-Control"] == "no-store"
    assert set(response.json()) == PUBLIC_FIELDS
    with monkeypatch.context() as failure:
        failure.setattr(Session, "exec", fail_database_query)
        failed = postgres_client.get(path)
    assert_safe_failure(failed, "No pudimos consultar el espacio. Inténtalo nuevamente.")
    retry = postgres_client.get(path)
    assert retry.status_code == 200 and retry.json() == public_data(active)
    assert status_change(postgres_client, active, owner_headers, False).status_code == 200
    missing = postgres_client.get(f"/api/spaces/public/{uuid4()}")
    inactive = postgres_client.get(path)
    withdraw_space(postgres_engine, active)
    withdrawn = postgres_client.get(path)
    removed = postgres_client.delete(f"/api/spaces/{active['id']}", headers=owner_headers)
    assert removed.status_code == 204 and removed.content == b""
    deleted = postgres_client.get(path)
    assert postgres_client.get(f"/api/spaces/{active['id']}", headers=owner_headers).status_code == 404
    for denied in (missing, inactive, withdrawn, deleted):
        assert denied.status_code == 404
        assert denied.json() == {"detail": "No encontramos el espacio solicitado.",
                                 "errors": {"form": "No encontramos el espacio solicitado."}}
        assert denied.headers["Cache-Control"] == "no-store"
    invalid = postgres_client.get("/api/spaces/public/id-no-valido")
    assert invalid.status_code == 422
    assert invalid.headers["Cache-Control"] == "no-store"
    assert "id-no-valido" not in invalid.text
