from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.models import User
from app.routers import auth
from app.security import hash_password, verify_password


pytestmark = pytest.mark.postgres


def test_hu01_ca01_registration_persists_across_sessions_and_application_instances(
    postgres_client, postgres_engine, application_factory
):
    password = "Cuenta persistente 2026!"
    response = postgres_client.post(
        "/api/auth/register",
        json={"name": "Jorge Aceval", "email": "jorge@example.com", "password": password},
    )
    assert response.status_code == 201, response.text
    with Session(postgres_engine) as session:
        user = session.exec(select(User)).one()
        assert str(user.id) == response.json()["id"]
        assert verify_password(password, user.password_hash)
        assert user.is_admin is False
    # A new app and new SQLModel session must see the committed account.
    new_app = application_factory(postgres_engine)
    with TestClient(new_app) as new_client:
        duplicate = new_client.post(
            "/api/auth/register",
            json={"name": "Jorge Aceval", "email": "JORGE@EXAMPLE.COM", "password": password},
        )
    assert duplicate.status_code == 409, duplicate.text
    with Session(postgres_engine) as session:
        assert len(session.exec(select(User)).all()) == 1
    with postgres_engine.connect() as connection:
        assert connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one()


def test_hu01_ca06_simultaneous_registration_only_creates_one_account(
    postgres_client, postgres_engine, monkeypatch
):
    both_requests_reached_insert = Barrier(2)
    original_hash = auth.hash_password

    def synchronize_hash(password):
        encoded_hash = original_hash(password)
        both_requests_reached_insert.wait(timeout=15)
        return encoded_hash

    # Hold both requests immediately before insertion. This creates a real
    # unique-index race on PostgreSQL rather than sequential duplicate requests.
    monkeypatch.setattr(auth, "hash_password", synchronize_hash)
    payload = {
        "name": "Jorge Aceval",
        "email": "jorge@example.com",
        "password": "Registro concurrente 2026!",
    }
    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(
            executor.map(
                lambda _: postgres_client.post("/api/auth/register", json=payload),
                range(2),
            )
        )
    assert sorted(result.status_code for result in results) == [201, 409], [
        result.text for result in results
    ]
    with Session(postgres_engine) as session:
        users = session.exec(select(User)).all()
        assert len(users) == 1
        assert users[0].email == payload["email"]
        assert verify_password(payload["password"], users[0].password_hash)
        assert users[0].is_admin is False


def test_hu01_ca02_database_enforces_email_uniqueness_without_the_api(
    postgres_client, postgres_engine
):
    response = postgres_client.post(
        "/api/auth/register",
        json={"name": "Jorge Aceval", "email": "jorge@example.com", "password": "Clave 2026!"},
    )
    assert response.status_code == 201
    with Session(postgres_engine) as session:
        session.add(
            User(
                name="Otra cuenta", email="jorge@example.com",
                password_hash=hash_password("Otra contraseña 2026!"),
            )
        )
        with pytest.raises(IntegrityError) as failure:
            session.commit()
        assert failure.value.orig.sqlstate == "23505"
        assert failure.value.orig.diag.constraint_name == "uq_users_email"
        session.rollback()
        assert len(session.exec(select(User)).all()) == 1


@pytest.mark.parametrize("email", ["JORGE@EXAMPLE.COM", " jorge@example.com "])
def test_hu01_ca02_database_rejects_unnormalized_email_even_without_the_api(
    postgres_engine, email
):
    with Session(postgres_engine) as session:
        session.add(
            User(name="Jorge Aceval", email=email, password_hash=hash_password("Clave 2026!"))
        )
        with pytest.raises(IntegrityError) as failure:
            session.commit()
        assert failure.value.orig.sqlstate == "23514"
        assert failure.value.orig.diag.constraint_name == "ck_users_email_normalized"
        session.rollback()
        assert session.exec(select(User)).all() == []
