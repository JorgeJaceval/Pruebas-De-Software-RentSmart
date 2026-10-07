"""Create accounts for HU-01 (REN-1).

Revision ID: 0001_create_users
Revises:
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_create_users"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("is_admin", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.CheckConstraint(
            "email = lower(trim(email))", name="ck_users_email_normalized"
        ),
        sa.CheckConstraint(
            "length(name) BETWEEN 2 AND 80", name="ck_users_name_length"
        ),
    )


def downgrade():
    op.drop_table("users")
