"""create bulletin_comments table

Revision ID: 012
Revises: 011
Create Date: 2026-09-13
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '012'
down_revision = '011'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'bulletin_comments',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('announcement_id', UUID(as_uuid=True), sa.ForeignKey('announcements.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('bulletin_comments')
