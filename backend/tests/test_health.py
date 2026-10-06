from unittest.mock import MagicMock

from sqlalchemy.exc import OperationalError
from sqlmodel import Session

from app.database import get_session


def test_api_health_does_not_require_database(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "rentsmart-api"}


def test_readiness_checks_database_through_sqlmodel(client):
    response = client.get("/api/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "connected"}


def test_readiness_reports_database_failure_without_exposing_connection_details(client):
    session = MagicMock(spec=Session)
    session.exec.side_effect = OperationalError(
        "SELECT 1", {}, Exception("password=private-password")
    )
    client.app.dependency_overrides[get_session] = lambda: session
    response = client.get("/api/health/ready")
    assert response.status_code == 503
    assert response.json() == {"detail": "La base de datos no está disponible."}
    assert "private-password" not in response.text


def test_cors_accepts_local_frontend(client):
    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_rejects_unknown_origin(client):
    response = client.options(
        "/api/health",
        headers={
            "Origin": "https://unknown.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
