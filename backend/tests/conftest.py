import re
from collections.abc import Iterator
from pathlib import Path
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine

from app.database import get_engine, get_session
from app.main import create_app
from app.models import User  # Registers the user table in SQLModel metadata.
from app.settings import Settings


@pytest.fixture
def engine() -> Iterator[Engine]:
    test_engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(test_engine)
    try:
        yield test_engine
    finally:
        test_engine.dispose()


def application_with_database(engine: Engine):
    application = create_app(Settings(_env_file=None))

    def test_session():
        with Session(engine) as session:
            yield session

    application.dependency_overrides[get_session] = test_session
    return application


@pytest.fixture
def application_factory():
    return application_with_database


@pytest.fixture
def client(engine):
    application = application_with_database(engine)
    with TestClient(application) as test_client:
        yield test_client


@pytest.fixture
def postgres_engine() -> Iterator[Engine]:
    """Run the real migrations in a private schema, leaving existing users alone."""
    admin_engine = get_engine()
    assert admin_engine.dialect.name == "postgresql"
    schema = f"hu01_{uuid4().hex}"
    # The schema identifier comes exclusively from this generated UUID.
    assert re.fullmatch(r"hu01_[0-9a-f]{32}", schema)
    with admin_engine.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))

    test_engine = create_engine(
        admin_engine.url,
        connect_args={"options": f"-csearch_path={schema}", "connect_timeout": 5},
        pool_pre_ping=True,
    )
    configuration = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    try:
        with test_engine.begin() as connection:
            configuration.attributes["connection"] = connection
            command.upgrade(configuration, "head")
        yield test_engine
    finally:
        test_engine.dispose()
        with admin_engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))


@pytest.fixture
def postgres_client(postgres_engine):
    application = application_with_database(postgres_engine)
    with TestClient(application) as test_client:
        yield test_client
