import logging
import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_migrate import Migrate
from app.database import db
from app.config import Config
from app.models.geocache import Zone
from app.plugin_manager import PluginManager
from app.utils.logger import setup_logger

logger = setup_logger()

def get_plugin_manager():
    from flask import current_app
    return current_app.plugin_manager


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__, 
                template_folder='../templates',
                static_folder='../static',
                static_url_path='')
    app.config.from_object(Config)

    # Initialisation de CORS avec les options appropriées
    CORS(app, resources={
        r"/*": {
            "origins": "*",  # En développement seulement
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "HX-Request", "HX-Current-URL", "HX-Target", "HX-Trigger"],
            "supports_credentials": True
        }
    })

    # Initialisation de la base de données
    db.init_app(app)

    # Initialisation de Flask-Migrate
    migrate = Migrate(app, db)

    # Enregistrer tous les blueprints
    try:
        from .routes import blueprints
        print(f"Blueprints importés : {blueprints}")
        for blueprint in blueprints:
            print(f"Enregistrement du blueprint {blueprint.name}")
            app.register_blueprint(blueprint)
    except Exception as e:
        print(f"Erreur lors de l'enregistrement des blueprints : {e}")
        raise

    # Création des tables si elles n'existent pas
    with app.app_context():
        db.create_all()
        
        # Création de la zone par défaut si nécessaire
        default_zone = Zone.query.filter_by(name="default").first()
        if default_zone is None:
            default_zone = Zone(name="default", description="Default zone")
            db.session.add(default_zone)
            db.session.commit()

        # Initialisation du gestionnaire de plugins
        logger.info("Initializing PluginManager...")
        plugins_dir = os.path.join(app.config['BASEDIR'], 'plugins')
        app.plugin_manager = PluginManager(plugins_dir, app)
        logger.info("Loading plugins...")
        app.plugin_manager.load_plugins()
        logger.info("PluginManager initialized.")

    return app
