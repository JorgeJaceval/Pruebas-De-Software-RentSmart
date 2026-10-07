from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import UUID

import pytest
from sqlmodel import Session, select

from app.models import User
from app.routers import auth
from app.security import verify_password

pytestmark = pytest.mark.postgres


def data(**changes):
    return {
        "name": "Jorge Aceval",
        "email": "jorge@example.com",
        "password": "Clave de prueba 2026!",
        **changes,
    }


def users(engine):
    with Session(engine) as session:
        return session.exec(select(User)).all()


def test_cp01_registro_valido(postgres_client, postgres_engine):
    response = postgres_client.post("/api/auth/register", json=data())
    assert response.status_code == 201
    body = response.json()
    assert set(body) == {"id", "name", "email"}
    assert UUID(body["id"])
    stored = users(postgres_engine)  # Consulta desde otra sesión PostgreSQL.
    assert len(stored) == 1
    assert str(stored[0].id) == body["id"]
    assert stored[0].name == body["name"] == "Jorge Aceval"
    assert stored[0].email == body["email"] == "jorge@example.com"


def test_cp02_duplicado_normalizado(postgres_client, postgres_engine):
    first = postgres_client.post("/api/auth/register", json=data())
    assert first.status_code == 201
    response = postgres_client.post(
        "/api/auth/register",
        json=data(
            name="Joaquín Viveros",
            email="  JORGE@EXAMPLE.COM  ",
            password="Otra clave de prueba!",
        ),
    )
    assert response.status_code == 409
    assert set(response.json()["errors"]) == {"email"}
    stored = users(postgres_engine)
    assert len(stored) == 1
    assert str(stored[0].id) == first.json()["id"]
    assert stored[0].name == "Jorge Aceval"


def test_cp03_nombre_vacio(postgres_client, postgres_engine):
    response = postgres_client.post("/api/auth/register", json=data(name=""))
    assert response.status_code == 422
    assert set(response.json()["errors"]) == {"name"}
    assert users(postgres_engine) == []


def test_cp04_password_siete_caracteres(postgres_client, postgres_engine):
    response = postgres_client.post(
        "/api/auth/register", json=data(password="Abc1234")
    )
    assert response.status_code == 422
    assert set(response.json()["errors"]) == {"password"}
    assert users(postgres_engine) == []


def test_cp05_hash_sin_secretos_en_respuesta(postgres_client, postgres_engine):
    payload = data()
    response = postgres_client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    stored = users(postgres_engine)
    assert len(stored) == 1
    encoded = stored[0].password_hash
    assert encoded.startswith("$argon2id$")
    assert encoded != payload["password"]
    assert verify_password(payload["password"], encoded)
    assert set(response.json()) == {"id", "name", "email"}
    assert payload["password"] not in response.text
    assert encoded not in response.text


def test_cp06_is_admin_del_cliente_rechazado(postgres_client, postgres_engine):
    response = postgres_client.post(
        "/api/auth/register", json=data(is_admin=True)
    )
    assert response.status_code == 422
    assert set(response.json()["errors"]) == {"form"}
    assert users(postgres_engine) == []


def test_cp07_concurrencia_mismo_correo(postgres_client, postgres_engine, monkeypatch):
    barrier = Barrier(2)
    original_hash = auth.hash_password

    def synchronize_hash(password):
        result = original_hash(password)
        barrier.wait(timeout=15)
        return result

    monkeypatch.setattr(auth, "hash_password", synchronize_hash)
    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(
            lambda _: postgres_client.post("/api/auth/register", json=data()),
            range(2),
        ))
    assert sorted(response.status_code for response in responses) == [201, 409]
    stored = users(postgres_engine)
    assert len(stored) == 1
    success = next(response for response in responses if response.status_code == 201)
    assert str(stored[0].id) == success.json()["id"]
    assert stored[0].email == "jorge@example.com"
