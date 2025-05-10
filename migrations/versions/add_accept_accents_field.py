"""add accept_accents field

Revision ID: add_accept_accents_field
Revises: 1d10f99f50ca
Create Date: 2023-11-15 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_accept_accents_field'
down_revision = '1d10f99f50ca'
branch_labels = None
depends_on = None


def upgrade():
    # Ajouter la colonne accept_accents dans la table plugins
    op.add_column('plugins', sa.Column('accept_accents', sa.Boolean(), nullable=True, server_default='0'))
    
    # Mettre à jour les plugins existants pour déterminer s'ils acceptent les accents
    # Les plugins basés sur la transposition doivent être mis à jour manuellement ou via un script personnalisé


def downgrade():
    # Supprimer la colonne accept_accents de la table plugins
    op.drop_column('plugins', 'accept_accents') 