"""add last_updated to geocache

Revision ID: add_last_updated_to_geocache
Revises: add_accept_accents_field
Create Date: 2025-07-13 08:05:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime, timezone


# revision identifiers, used by Alembic.
revision = 'add_last_updated_to_geocache'
down_revision = 'add_accept_accents_field'
branch_labels = None
depends_on = None


def upgrade():
    # Ajouter la colonne last_updated dans la table geocache
    # Utiliser CURRENT_TIMESTAMP comme valeur par défaut
    op.add_column('geocache', sa.Column('last_updated', sa.DateTime(), nullable=True))
    
    # Mettre à jour les géocaches existantes avec la valeur created_at ou la date actuelle
    connection = op.get_bind()
    connection.execute(
        sa.text("UPDATE geocache SET last_updated = COALESCE(created_at, datetime('now')) WHERE last_updated IS NULL")
    )


def downgrade():
    # Supprimer la colonne last_updated de la table geocache
    op.drop_column('geocache', 'last_updated') 