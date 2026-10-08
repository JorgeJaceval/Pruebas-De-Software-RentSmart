"""Complete reservation snapshots and add pending payments for HU-12.

Revision ID: 0005_reservation_creation
Revises: 0004_space_withdrawal
"""
from alembic import op
import sqlalchemy as sa

revision = "0005_reservation_creation"
down_revision = "0004_space_withdrawal"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("reservations", sa.Column("duration_hours", sa.Float(), nullable=True))
    op.add_column("reservations", sa.Column("created_at", sa.DateTime(timezone=True), nullable=True))
    # Previous snapshots have no creation timestamp. Preserve them and record an
    # estimate; only HU-12's new writer records the actual creation instant.
    op.execute("""
        UPDATE reservations
        SET duration_hours = EXTRACT(EPOCH FROM (ends_at - starts_at)) / 3600.0,
            created_at = payment_expires_at - INTERVAL '15 minutes'
    """)
    op.alter_column("reservations", "duration_hours", nullable=False)
    op.alter_column("reservations", "created_at", nullable=False, server_default=sa.text("CURRENT_TIMESTAMP"))
    op.create_check_constraint("ck_reservations_duration_hours", "reservations", "duration_hours > 0")
    op.create_table(
        "payments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("reservation_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["reservation_id"], ["reservations.id"], name="fk_payments_reservation_id_reservations"),
        sa.UniqueConstraint("reservation_id", name="uq_payments_reservation_id"),
        sa.CheckConstraint("status IN ('pending', 'rejected', 'approved', 'refunded')", name="ck_payments_status"),
    )
    # Do not invent payment records for historical reservation fixtures.


def downgrade():
    op.drop_table("payments")
    op.drop_constraint("ck_reservations_duration_hours", "reservations", type_="check")
    op.drop_column("reservations", "created_at")
    op.drop_column("reservations", "duration_hours")
