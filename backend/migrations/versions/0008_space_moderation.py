"""Record administrative withdrawals and restorations for HU-18.

Legacy withdrawals keep NULL audit fields: we cannot infer their reason, author or date.

Revision ID: 0008_space_moderation
Revises: 0007_cancellation_audit
"""
from alembic import op
import sqlalchemy as sa

revision = "0008_space_moderation"
down_revision = "0007_cancellation_audit"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("spaces", sa.Column("withdrawal_reason", sa.String(200), nullable=True))
    op.add_column("spaces", sa.Column("withdrawn_by", sa.Uuid(), nullable=True))
    op.add_column("spaces", sa.Column("withdrawn_at", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key("fk_spaces_withdrawn_by_users", "spaces", "users", ["withdrawn_by"], ["id"])
    op.create_check_constraint(
        "ck_spaces_withdrawal_audit", "spaces",
        "(withdrawal_reason IS NULL AND withdrawn_by IS NULL AND withdrawn_at IS NULL) OR "
        "(is_withdrawn AND withdrawn_by IS NOT NULL AND withdrawn_at IS NOT NULL AND "
        "length(btrim(withdrawal_reason)) BETWEEN 1 AND 200)",
    )
    op.create_table(
        "space_moderations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("space_id", sa.Uuid(), nullable=False),
        sa.Column("admin_id", sa.Uuid(), nullable=False),
        sa.Column("action", sa.String(16), nullable=False),
        sa.Column("reason", sa.String(200), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(
            ["space_id"], ["spaces.id"], name="fk_space_moderations_space_id_spaces", ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["admin_id"], ["users.id"], name="fk_space_moderations_admin_id_users"),
        sa.CheckConstraint("action IN ('withdraw', 'restore')", name="ck_space_moderations_action"),
        sa.CheckConstraint(
            "(action = 'withdraw' AND length(btrim(reason)) BETWEEN 1 AND 200) OR "
            "(action = 'restore' AND reason IS NULL)",
            name="ck_space_moderations_reason",
        ),
    )
    op.create_index("ix_space_moderations_space_id", "space_moderations", ["space_id"])


def downgrade():
    op.drop_index("ix_space_moderations_space_id", table_name="space_moderations")
    op.drop_table("space_moderations")
    op.drop_constraint("ck_spaces_withdrawal_audit", "spaces", type_="check")
    op.drop_constraint("fk_spaces_withdrawn_by_users", "spaces", type_="foreignkey")
    op.drop_column("spaces", "withdrawn_at")
    op.drop_column("spaces", "withdrawn_by")
    op.drop_column("spaces", "withdrawal_reason")
