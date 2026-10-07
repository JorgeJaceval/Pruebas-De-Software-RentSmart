from uuid import UUID, uuid4

from sqlalchemy import Boolean, CheckConstraint, Column, String, UniqueConstraint, text
from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
        CheckConstraint(
            "email = lower(trim(email))", name="ck_users_email_normalized"
        ),
        CheckConstraint(
            "length(name) BETWEEN 2 AND 80", name="ck_users_name_length"
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(sa_column=Column(String(80), nullable=False))
    email: str = Field(sa_column=Column(String(320), nullable=False))
    password_hash: str = Field(
        repr=False, sa_column=Column(String(255), nullable=False)
    )
    is_admin: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False, server_default=text("false")),
    )
