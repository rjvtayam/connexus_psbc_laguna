"""add updated_at and deleted_at to announcements

Revision ID: 013
Revises: 012
Create Date: 2026-09-13
"""
from alembic import op
import sqlalchemy as sa

revision = '013'
down_revision = '012'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('announcements', sa.Column('updated_at', sa.DateTime, nullable=True))
    op.add_column('announcements', sa.Column('deleted_at', sa.DateTime, nullable=True))
    op.create_index('ix_announcements_deleted_at', 'announcements', ['deleted_at'])


def downgrade():
    op.drop_index('ix_announcements_deleted_at')
    op.drop_column('announcements', 'deleted_at')
    op.drop_column('announcements', 'updated_at')
