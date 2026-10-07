import logging
from unittest.mock import MagicMock
from uuid import UUID, uuid4

import pytest
from sqlalchemy import event
from sqlalchemy.exc import OperationalError
from sqlmodel import Session, select

from app.database import get_session
from app.models import User
from app.security import verify_password


def registration(**changes):
    return {
        "name": "Jorge Aceval",
        "email": "jorge@example.com",
        "password": "Clave segura 2026!",
        **changes,
    }


def stored_users(engine):
    with Session(engine) as session:
        return session.exec(select(User)).all()


def test_hu01_ca01_registers_a_normalized_user_without_returning_credentials(
    client, engine, caplog
):
    payload = registration(name="  Jorge Aceval  ", email="  JORGE@Example.com  ")
    with caplog.at_level(logging.INFO):
        response = client.post("/api/auth/register", json=payload)

    assert response.status_code == 201, response.text
    body = response.json()
    assert set(body) == {"id", "name", "email"}
    assert UUID(body["id"])
    assert body["name"] == "Jorge Aceval"
    assert body["email"] == "jorge@example.com"
    users = stored_users(engine)
    assert len(users) == 1
    assert str(users[0].id) == body["id"]
    assert users[0].name == body["name"]
    assert users[0].email == body["email"]
    assert users[0].is_admin is False
    assert payload["password"] not in response.text
    assert payload["password"] not in caplog.text
    assert users[0].password_hash not in response.text


def test_hu01_ca01_reports_success_when_database_reads_fail_after_commit(
    client, engine, monkeypatch
):
    committed = False

    def note_commit(session):
        nonlocal committed
        if session.get_bind() is engine:
            committed = True

    def fail_reads_after_commit(connection, cursor, statement, parameters, context, many):
        if committed and statement.lstrip().upper().startswith("SELECT"):
            raise OperationalError(statement, parameters, Exception("Database read failed"))

    def fail_refresh(session, instance, **options):
        raise OperationalError("SELECT users", {}, Exception("Database read failed"))

    # The insertion and commit are real. Simulate a lost read connection only
    # after persistence, including an explicit refresh or an implicit ORM read.
    monkeypatch.setattr(Session, "refresh", fail_refresh)
    event.listen(Session, "after_commit", note_commit)
    event.listen(engine, "before_cursor_execute", fail_reads_after_commit)
    try:
        response = client.post("/api/auth/register", json=registration())
    finally:
        event.remove(engine, "before_cursor_execute", fail_reads_after_commit)
        event.remove(Session, "after_commit", note_commit)

    assert committed is True
    assert response.status_code == 201, response.text
    users = stored_users(engine)
    assert len(users) == 1
    assert str(users[0].id) == response.json()["id"]
    assert users[0].email == "jorge@example.com"
    assert verify_password("Clave segura 2026!", users[0].password_hash)


@pytest.mark.parametrize(
    "duplicate_email",
    ["jorge@example.com", "JORGE@EXAMPLE.COM", "  Jorge@Example.com  "],
    ids=["same-email", "different-case", "outer-spaces"],
)
def test_hu01_ca02_rejects_existing_email_after_normalization(
    client, engine, duplicate_email
):
    first = client.post("/api/auth/register", json=registration())
    assert first.status_code == 201
    duplicate = client.post(
        "/api/auth/register", json=registration(email=duplicate_email)
    )
    assert duplicate.status_code == 409, duplicate.text
    assert "email" in duplicate.json()["errors"]
    users = stored_users(engine)
    assert len(users) == 1
    assert str(users[0].id) == first.json()["id"]
    assert "Clave segura 2026!" not in duplicate.text


@pytest.mark.parametrize("missing_field", ["name", "email", "password"])
def test_hu01_ca03_rejects_missing_required_fields(client, engine, missing_field):
    payload = registration()
    del payload[missing_field]
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 422, response.text
    assert missing_field in response.json()["errors"]
    assert stored_users(engine) == []
    assert "Clave segura 2026!" not in response.text


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("name", ""),
        ("name", "   "),
        ("name", "A"),
        ("name", "A" * 81),
        ("email", ""),
        ("email", "correo-invalido"),
        ("email", "jorge@"),
        ("email", "a" * 309 + "@example.com"),
        ("password", ""),
        ("password", "1234567"),
        ("password", "S" * 65),
    ],
    ids=[
        "empty-name", "blank-name", "short-name", "long-name",
        "empty-email", "malformed-email", "missing-email-domain", "long-email",
        "empty-password", "short-password", "long-password",
    ],
)
def test_hu01_ca03_rejects_invalid_values_without_creating_an_account(
    client, engine, field, value
):
    response = client.post("/api/auth/register", json=registration(**{field: value}))
    assert response.status_code == 422, response.text
    assert field in response.json()["errors"]
    assert stored_users(engine) == []


@pytest.mark.parametrize("field", ["name", "email", "password"])
@pytest.mark.parametrize("value", [None, 12345678, True, ["text"], {"text": "value"}])
def test_hu01_ca03_rejects_non_string_fields(client, engine, field, value):
    response = client.post("/api/auth/register", json=registration(**{field: value}))
    assert response.status_code == 422, response.text
    assert field in response.json()["errors"]
    assert stored_users(engine) == []


@pytest.mark.parametrize(
    ("name", "password"),
    [("AB", "12345678"), ("A" * 80, "S" * 64)],
    ids=["minimum-lengths", "maximum-lengths"],
)
def test_hu01_ca03_accepts_valid_boundary_lengths(client, engine, name, password):
    response = client.post(
        "/api/auth/register", json=registration(name=name, password=password)
    )
    assert response.status_code == 201, response.text
    assert response.json()["name"] == name
    user = stored_users(engine)[0]
    assert verify_password(password, user.password_hash)


def test_hu01_ca04_hashes_password_with_argon2_and_a_different_salt_per_user(
    client, engine
):
    password = "Misma contraseña 2026!"
    for email in ["jorge@example.com", "joaquin@example.com"]:
        response = client.post(
            "/api/auth/register", json=registration(email=email, password=password)
        )
        assert response.status_code == 201, response.text
    users = stored_users(engine)
    assert len(users) == 2
    hashes = [user.password_hash for user in users]
    assert hashes[0] != hashes[1]
    for encoded_hash in hashes:
        assert encoded_hash.startswith("$argon2id$")
        assert encoded_hash != password
        assert verify_password(password, encoded_hash)
        assert not verify_password("Contraseña equivocada", encoded_hash)


@pytest.mark.parametrize(
    "password", ["  Clave segura 2026!  ", "Ñandú 🔒 contraseña 2026"],
    ids=["significant-spaces", "unicode"],
)
def test_hu01_ca04_preserves_the_exact_password(client, engine, password):
    response = client.post("/api/auth/register", json=registration(password=password))
    assert response.status_code == 201, response.text
    user = stored_users(engine)[0]
    assert verify_password(password, user.password_hash)
    if password != password.strip():
        assert not verify_password(password.strip(), user.password_hash)


def test_hu01_ca04_validation_never_echoes_input_or_password_to_response_or_logs(
    client, engine, caplog
):
    secret = "Nunca divulgar esta contraseña 🔒"
    with caplog.at_level(logging.INFO):
        response = client.post(
            "/api/auth/register", json=registration(email="invalid", password=secret)
        )
    assert response.status_code == 422
    body = response.json()
    assert set(body) == {"detail", "errors"}
    assert body["errors"].keys() == {"email"}
    assert secret not in response.text
    assert secret not in caplog.text
    assert "input" not in response.text
    assert "password_hash" not in response.text


def test_hu01_ca04_database_failure_is_safe_and_rolls_back(client, caplog):
    session = MagicMock(spec=Session)
    private_detail = "private-database-password-and-connection-details"
    session.commit.side_effect = OperationalError(
        "INSERT INTO users", {"password_hash": "private-stored-hash"},
        Exception(private_detail),
    )
    client.app.dependency_overrides[get_session] = lambda: session
    with caplog.at_level(logging.INFO):
        response = client.post("/api/auth/register", json=registration())
    assert response.status_code == 503, response.text
    assert "form" in response.json()["errors"]
    session.rollback.assert_called_once()
    session.refresh.assert_not_called()
    for secret in [private_detail, "private-stored-hash", "Clave segura 2026!"]:
        assert secret not in response.text
        assert secret not in caplog.text


@pytest.mark.parametrize(
    "extra",
    [
        {"role": "admin"},
        {"is_admin": True},
        {"id": str(uuid4())},
        {"password_hash": "$argon2id$attacker-controlled"},
        {"role": "admin", "is_admin": True, "id": str(uuid4())},
    ],
    ids=["admin-role", "admin-flag", "provided-id", "provided-hash", "combined"],
)
def test_hu01_ca05_rejects_privilege_and_identity_fields(client, engine, extra):
    response = client.post("/api/auth/register", json=registration(**extra))
    assert response.status_code == 422, response.text
    assert "form" in response.json()["errors"]
    assert stored_users(engine) == []
    assert "Clave segura 2026!" not in response.text
