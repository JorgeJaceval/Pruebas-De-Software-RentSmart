import pytest
from fastapi.testclient import TestClient

from app.database import get_engine
from app.main import create_app


@pytest.mark.postgres
def test_readiness_with_real_postgresql():
    assert get_engine().dialect.name == "postgresql"
    with TestClient(create_app()) as client:
        response = client.get("/api/health/ready")
    assert response.status_code == 200, response.text
    assert response.json() == {"status": "ok", "database": "connected"}
