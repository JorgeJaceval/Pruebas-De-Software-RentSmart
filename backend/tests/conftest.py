import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, create_engine

from app.database import get_session
from app.main import create_app
from app.settings import Settings


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    application = create_app(Settings(_env_file=None))

    def test_session():
        with Session(engine) as session:
            yield session

    application.dependency_overrides[get_session] = test_session
    with TestClient(application) as test_client:
        yield test_client
    engine.dispose()
