"""Add administrative withdrawal state for HU-05.

Revision ID: 0004_space_withdrawal
Revises: 0003_create_reservations
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_space_withdrawal"
down_revision = "0003_create_reservations"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("spaces", sa.Column(
        "is_withdrawn", sa.Boolean(), server_default=sa.false(), nullable=False
    ))
    op.create_check_constraint(
        "ck_spaces_withdrawn_inactive", "spaces", "NOT (is_active AND is_withdrawn)"
    )


def downgrade():
    op.drop_constraint("ck_spaces_withdrawn_inactive", "spaces", type_="check")
    op.drop_column("spaces", "is_withdrawn")
