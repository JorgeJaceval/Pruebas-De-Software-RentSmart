import base64
import json
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import jwt
import pytest
from sqlmodel import Session

from app.models import User

pytestmark = pytest.mark.postgres

PASSWORD = " Clave de prueba 2026! "
LOGIN = {"email": "jorge@example.com", "password": PASSWORD}
PRIVATE_PATHS = ("/api/auth/me", "/api/auth/admin-access")


def registered_user(client):
    response = client.post(
        "/api/auth/register", json={"name": "Jorge Aceval", **LOGIN}
    )
    assert response.status_code == 201
    return response.json()


def login(client):
    response = client.post("/api/auth/login", json=LOGIN)
    assert response.status_code == 200
    return response.json()


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def signed(claims, settings, algorithm="HS256"):
    return jwt.encode(
        claims, settings.auth_secret_key.get_secret_value(), algorithm=algorithm
    )


def claims_for(user_id):
    now = datetime.now(timezone.utc)
    return {"sub": user_id, "iat": now, "exp": now + timedelta(minutes=30)}


def set_admin(engine, user_id, is_admin):
    with Session(engine) as session:
        user = session.get(User, UUID(user_id))
        user.is_admin = is_admin
        session.add(user)
        session.commit()


def test_cp01_login_normalizacion_y_usuario_actual(postgres_client, auth_settings):
    user = registered_user(postgres_client)
    response = postgres_client.post(
        "/api/auth/login", json={**LOGIN, "email": "  JORGE@EXAMPLE.COM  "}
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"access_token", "token_type", "expires_at", "user"}
    assert body["token_type"] == "bearer"
    assert body["user"] == {**user, "is_admin": False}
    claims = jwt.decode(
        body["access_token"], auth_settings.auth_secret_key.get_secret_value(),
        algorithms=["HS256"],
    )
    assert set(claims) == {"sub", "iat", "exp"}
    assert claims["sub"] == user["id"]
    expires_at = datetime.fromisoformat(body["expires_at"].replace("Z", "+00:00"))
    assert expires_at.utcoffset() == timedelta(0)
    assert int(expires_at.timestamp()) == claims["exp"]
    assert claims["exp"] - claims["iat"] == auth_settings.auth_token_minutes * 60
    assert PASSWORD not in response.text and "password_hash" not in response.text
    assert response.headers["Cache-Control"] == "no-store"
    me = postgres_client.get("/api/auth/me", headers=bearer(body["access_token"]))
    assert me.status_code == 200
    assert me.json() == body["user"]
    assert me.headers["Cache-Control"] == "no-store"


def test_cp02_credenciales_invalidas_sin_enumeracion(postgres_client):
    registered_user(postgres_client)
    failures = [
        {**LOGIN, "password": "Otra clave incorrecta!"},
        {**LOGIN, "password": "x"},
        {**LOGIN, "password": ""},
        {**LOGIN, "password": PASSWORD.strip()},
        {**LOGIN, "email": "desconocido@example.com"},
    ]
    bodies = []
    for credentials in failures:
        response = postgres_client.post("/api/auth/login", json=credentials)
        assert response.status_code == 401
        assert response.headers["WWW-Authenticate"] == "Bearer"
        assert response.headers["Cache-Control"] == "no-store"
        assert PASSWORD not in response.text and "password_hash" not in response.text
        bodies.append(response.json())
    assert all(
        body == {"detail": "Correo o contraseña incorrectos."} for body in bodies
    )


def test_cp05_tokens_ausentes_invalidos_alterados(postgres_client, auth_settings):
    user = registered_user(postgres_client)
    token = login(postgres_client)["access_token"]
    header, _, signature = token.split(".")
    altered_payload = base64.urlsafe_b64encode(
        json.dumps({"sub": user["id"], "is_admin": True}).encode()
    ).rstrip(b"=").decode()
    malformed_claims = claims_for(user["id"])
    missing_claim_tokens = [
        signed(
            {key: value for key, value in malformed_claims.items() if key != missing},
            auth_settings,
        )
        for missing in ("sub", "iat", "exp")
    ]
    invalid_tokens = [
        None,
        "texto-invalido",
        f"{header}.{altered_payload}.{signature}",
        jwt.encode(malformed_claims, "", algorithm="none"),
        jwt.encode(
            malformed_claims, "other-test-signing-key-at-least-32-chars",
            algorithm="HS256",
        ),
        signed(malformed_claims, auth_settings, algorithm="HS512"),
        signed(claims_for("no-es-uuid"), auth_settings),
        signed(claims_for(str(uuid4())), auth_settings),
        *missing_claim_tokens,
    ]
    for invalid_token in invalid_tokens:
        for path in PRIVATE_PATHS:
            response = postgres_client.get(
                path, headers=bearer(invalid_token) if invalid_token is not None else {}
            )
            assert response.status_code == 401
            assert response.headers["WWW-Authenticate"] == "Bearer"
            assert response.headers["Cache-Control"] == "no-store"
            assert response.json() == {
                "detail": "Tu sesión no es válida o ha expirado. Inicia sesión nuevamente."
            }


def test_cp06_token_vencido_rechazado(postgres_client, auth_settings):
    user = registered_user(postgres_client)
    now = datetime.now(timezone.utc)
    token = signed(
        {
            "sub": user["id"],
            "iat": now - timedelta(minutes=30),
            "exp": now - timedelta(seconds=1),
        },
        auth_settings,
    )
    for path in PRIVATE_PATHS:
        response = postgres_client.get(path, headers=bearer(token))
        assert response.status_code == 401
        assert response.headers["Cache-Control"] == "no-store"


def test_cp07_elevacion_rechazada_y_rol_desde_base_de_datos(
    postgres_client, postgres_engine, auth_settings
):
    user = registered_user(postgres_client)
    response = postgres_client.post("/api/auth/login", json={**LOGIN, "is_admin": True})
    assert response.status_code == 422
    assert response.json()["errors"] == {
        "form": "El inicio de sesión solo acepta correo y contraseña."
    }
    assert PASSWORD not in response.text
    # A signed extra claim cannot override the actual role in PostgreSQL.
    token = signed({**claims_for(user["id"]), "is_admin": True}, auth_settings)
    headers = bearer(token)
    assert postgres_client.get("/api/auth/me", headers=headers).json()["is_admin"] is False
    response = postgres_client.get("/api/auth/admin-access", headers=headers)
    assert response.status_code == 403
    assert response.headers["Cache-Control"] == "no-store"
    set_admin(postgres_engine, user["id"], True)
    assert postgres_client.get("/api/auth/admin-access", headers=headers).status_code == 200
    set_admin(postgres_engine, user["id"], False)
    assert postgres_client.get("/api/auth/admin-access", headers=headers).status_code == 403
    # Missing or malformed credentials do not echo the submitted password.
    for payload, field in [
        ({"email": LOGIN["email"]}, "password"),
        ({"password": PASSWORD}, "email"),
        ({**LOGIN, "password": [PASSWORD]}, "password"),
    ]:
        response = postgres_client.post("/api/auth/login", json=payload)
        assert response.status_code == 422
        assert set(response.json()["errors"]) == {field}
        assert PASSWORD not in response.text
        assert response.headers["Cache-Control"] == "no-store"


def test_cp08_administrador_autenticado(postgres_client, postgres_engine):
    user = registered_user(postgres_client)
    set_admin(postgres_engine, user["id"], True)
    authentication = login(postgres_client)
    assert authentication["user"] == {**user, "is_admin": True}
    response = postgres_client.get(
        "/api/auth/admin-access", headers=bearer(authentication["access_token"])
    )
    assert response.status_code == 200
    assert response.json() == authentication["user"]
    assert response.headers["Cache-Control"] == "no-store"
