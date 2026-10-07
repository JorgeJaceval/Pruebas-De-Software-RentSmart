"""Create reservation snapshots for the HU-04 schedule guard.

Revision ID: 0003_create_reservations
Revises: 0002_create_spaces
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_create_reservations"
down_revision = "0002_create_spaces"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "reservations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("space_id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(32), server_default=sa.text("'pending_payment'"), nullable=False),
        sa.Column("payment_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("unit_price", sa.Integer(), nullable=False),
        sa.Column("total_price", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["space_id"], ["spaces.id"], name="fk_reservations_space_id_spaces"),
        sa.ForeignKeyConstraint(["tenant_id"], ["users.id"], name="fk_reservations_tenant_id_users"),
        sa.CheckConstraint(
            "status IN ('pending_payment', 'paid', 'cancelled', 'expired', 'completed')",
            name="ck_reservations_status",
        ),
        sa.CheckConstraint("ends_at > starts_at", name="ck_reservations_interval"),
        sa.CheckConstraint(
            "unit_price BETWEEN 500 AND 500000", name="ck_reservations_unit_price"
        ),
        sa.CheckConstraint("total_price > 0", name="ck_reservations_total_price"),
    )
    op.create_index("ix_reservations_space_id", "reservations", ["space_id"])


def downgrade():
    op.drop_index("ix_reservations_space_id", table_name="reservations")
    op.drop_table("reservations")
