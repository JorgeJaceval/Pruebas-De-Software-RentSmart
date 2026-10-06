from collections.abc import Iterator
from functools import lru_cache

from sqlmodel import Session, create_engine

from app.settings import get_settings


@lru_cache
def get_engine():
    return create_engine(
        get_settings().database_url,
        pool_pre_ping=True,
        connect_args={"connect_timeout": 5},
    )


def get_session() -> Iterator[Session]:
    with Session(get_engine()) as session:
        yield session
