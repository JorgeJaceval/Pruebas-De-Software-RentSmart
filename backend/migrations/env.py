from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool
from sqlmodel import SQLModel

from app.models import Space, User  # noqa: F401: register table metadata
from app.settings import get_settings

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = SQLModel.metadata


def run_with_connection(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    # Tests supply a connection scoped to their own PostgreSQL schema.
    connection = config.attributes.get("connection")
    if connection is not None:
        run_with_connection(connection)
        return

    engine = create_engine(get_settings().database_url, poolclass=pool.NullPool)
    with engine.connect() as connection:
        run_with_connection(connection)
    engine.dispose()


if context.is_offline_mode():
    context.configure(
        url=get_settings().database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    run_migrations_online()
