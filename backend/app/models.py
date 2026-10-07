from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
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


class Space(SQLModel, table=True):
    __tablename__ = "spaces"
    __table_args__ = (
        CheckConstraint("length(name) BETWEEN 5 AND 80", name="ck_spaces_name_length"),
        CheckConstraint(
            "length(description) BETWEEN 20 AND 1000", name="ck_spaces_description_length"
        ),
        CheckConstraint("length(commune) BETWEEN 2 AND 80", name="ck_spaces_commune_length"),
        CheckConstraint(
            "length(location_reference) BETWEEN 5 AND 150",
            name="ck_spaces_location_reference_length",
        ),
        CheckConstraint(
            "length(conditions) BETWEEN 10 AND 500", name="ck_spaces_conditions_length"
        ),
        CheckConstraint(
            "category IN ('meeting_room', 'photo_studio', 'multipurpose_room')",
            name="ck_spaces_category",
        ),
        CheckConstraint("capacity BETWEEN 1 AND 100", name="ck_spaces_capacity"),
        CheckConstraint(
            "price_per_hour BETWEEN 500 AND 500000", name="ck_spaces_price_per_hour"
        ),
        CheckConstraint(
            "opening_hour >= 0 AND opening_hour < closing_hour AND closing_hour <= 23",
            name="ck_spaces_hours",
        ),
        CheckConstraint(
            "jsonb_typeof(photos) = 'array' AND jsonb_array_length(photos) BETWEEN 1 AND 3",
            name="ck_spaces_photos_count",
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(sa_column=Column(
        Uuid(),
        ForeignKey("users.id", name="fk_spaces_owner_id_users"),
        nullable=False,
        index=True,
    ))
    name: str = Field(sa_column=Column(String(80), nullable=False))
    description: str = Field(sa_column=Column(String(1000), nullable=False))
    category: str = Field(sa_column=Column(String(32), nullable=False))
    commune: str = Field(sa_column=Column(String(80), nullable=False))
    location_reference: str = Field(sa_column=Column(String(150), nullable=False))
    capacity: int = Field(sa_column=Column(Integer, nullable=False))
    price_per_hour: int = Field(sa_column=Column(Integer, nullable=False))
    conditions: str = Field(sa_column=Column(String(500), nullable=False))
    photos: list[str] = Field(sa_column=Column(JSONB, nullable=False))
    opening_hour: int = Field(
        default=9, sa_column=Column(Integer, nullable=False, server_default=text("9"))
    )
    closing_hour: int = Field(
        default=18, sa_column=Column(Integer, nullable=False, server_default=text("18"))
    )
    is_active: bool = Field(
        default=True,
        sa_column=Column(Boolean, nullable=False, server_default=text("true")),
    )
