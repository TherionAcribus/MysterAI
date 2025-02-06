import logging
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event, text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

db = SQLAlchemy()

def init_db(app):
    """Initialize the database."""
    logger.info("Starting database initialization...")
    
    # Initialisation de la base de données
    db.init_app(app)
    
    # Création des tables
    logger.info("Creating all database tables...")
    with app.app_context():
        # Création des tables
        db.create_all()
        
        # Initialisation des données par défaut
        try:
            from app.models.models import Zone
            default_zone = Zone.query.filter_by(name="default").first()
            if default_zone is None:
                default_zone = Zone(name="default", description="Default zone")
                db.session.add(default_zone)
                db.session.commit()
            else:
                logger.info("Default zone already exists")
        except Exception as e:
            logger.error(f"Error creating default zone: {e}")
            db.session.rollback()
    
    logger.info("Database initialization completed")
