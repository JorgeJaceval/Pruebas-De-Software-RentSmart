"""Store payment results without inventing historical processing dates.

Revision ID: 0006_payment_simulation
Revises: 0005_reservation_creation
"""
from alembic import op
import sqlalchemy as sa

revision = "0006_payment_simulation"
down_revision = "0005_reservation_creation"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("payments", sa.Column("amount", sa.Integer(), nullable=True))
    op.add_column("payments", sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_check_constraint(
        "ck_payments_processing", "payments",
        "(amount IS NULL AND processed_at IS NULL) OR "
        "(amount IS NOT NULL AND amount > 0 AND processed_at IS NOT NULL)",
    )


def downgrade():
    op.drop_constraint("ck_payments_processing", "payments", type_="check")
    op.drop_column("payments", "processed_at")
    op.drop_column("payments", "amount")
