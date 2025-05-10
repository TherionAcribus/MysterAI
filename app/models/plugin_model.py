# models/plugin_model.py

from datetime import datetime, timezone
from app.database import db

class Plugin(db.Model):
    """
    Représente un plugin tel que décrit par plugin.json,
    stocké dans la base de données pour un chargement/découverte plus facile.
    """
    __tablename__ = 'plugins'
    __bind_key__ = 'plugins'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    version = db.Column(db.String(32), nullable=False)
    description = db.Column(db.Text)
    author = db.Column(db.String(128))
    plugin_type = db.Column(db.String(32))
    path = db.Column(db.String(256), nullable=False)
    entry_point = db.Column(db.String(128))
    enabled = db.Column(db.Boolean, default=True)
    metadata_json = db.Column(db.Text)
    bruteforce = db.Column(db.Boolean, default=False)
    accept_accents = db.Column(db.Boolean, default=False)  # Indique si le plugin accepte les caractères accentués
    
    # Store categories as a JSON array string
    categories = db.Column(db.Text, default='[]', nullable=False)
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.UniqueConstraint('name', 'version', name='_name_version_uc'),
    )

    def __repr__(self):
        return f'<Plugin {self.name} v{self.version}>'
