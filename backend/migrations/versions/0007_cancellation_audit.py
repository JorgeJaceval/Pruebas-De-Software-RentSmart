"""Record cancellation authors and dates without inventing historical audit data."""
from alembic import op
import sqlalchemy as sa

revision = "0007_cancellation_audit"
down_revision = "0006_payment_simulation"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("reservations", sa.Column("cancelled_by", sa.Uuid(), nullable=True))
    op.add_column("reservations", sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key("fk_reservations_cancelled_by_users", "reservations", "users", ["cancelled_by"], ["id"])
    op.create_check_constraint(
        "ck_reservations_cancellation_audit", "reservations",
        "(cancelled_by IS NULL AND cancelled_at IS NULL) OR "
        "(cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL AND status = 'cancelled')",
    )


def downgrade():
    op.drop_constraint("ck_reservations_cancellation_audit", "reservations", type_="check")
    op.drop_constraint("fk_reservations_cancelled_by_users", "reservations", type_="foreignkey")
    op.drop_column("reservations", "cancelled_at")
    op.drop_column("reservations", "cancelled_by")
