"""Create publications for HU-03 (REN-3).

Revision ID: 0002_create_spaces
Revises: 0001_create_users
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002_create_spaces"
down_revision = "0001_create_users"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "spaces",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("description", sa.String(1000), nullable=False),
        sa.Column("category", sa.String(32), nullable=False),
        sa.Column("commune", sa.String(80), nullable=False),
        sa.Column("location_reference", sa.String(150), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("price_per_hour", sa.Integer(), nullable=False),
        sa.Column("conditions", sa.String(500), nullable=False),
        sa.Column("photos", postgresql.JSONB(), nullable=False),
        sa.Column("opening_hour", sa.Integer(), server_default=sa.text("9"), nullable=False),
        sa.Column("closing_hour", sa.Integer(), server_default=sa.text("18"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], name="fk_spaces_owner_id_users"),
        sa.CheckConstraint("length(name) BETWEEN 5 AND 80", name="ck_spaces_name_length"),
        sa.CheckConstraint(
            "length(description) BETWEEN 20 AND 1000", name="ck_spaces_description_length"
        ),
        sa.CheckConstraint("length(commune) BETWEEN 2 AND 80", name="ck_spaces_commune_length"),
        sa.CheckConstraint(
            "length(location_reference) BETWEEN 5 AND 150",
            name="ck_spaces_location_reference_length",
        ),
        sa.CheckConstraint(
            "length(conditions) BETWEEN 10 AND 500", name="ck_spaces_conditions_length"
        ),
        sa.CheckConstraint(
            "category IN ('meeting_room', 'photo_studio', 'multipurpose_room')",
            name="ck_spaces_category",
        ),
        sa.CheckConstraint("capacity BETWEEN 1 AND 100", name="ck_spaces_capacity"),
        sa.CheckConstraint(
            "price_per_hour BETWEEN 500 AND 500000", name="ck_spaces_price_per_hour"
        ),
        sa.CheckConstraint(
            "opening_hour >= 0 AND opening_hour < closing_hour AND closing_hour <= 23",
            name="ck_spaces_hours",
        ),
        sa.CheckConstraint(
            "jsonb_typeof(photos) = 'array' AND jsonb_array_length(photos) BETWEEN 1 AND 3",
            name="ck_spaces_photos_count",
        ),
    )
    op.create_index("ix_spaces_owner_id", "spaces", ["owner_id"])


def downgrade():
    op.drop_index("ix_spaces_owner_id", table_name="spaces")
    op.drop_table("spaces")
