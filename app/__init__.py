import logging
import os
import json
from flask import Flask, send_from_directory, jsonify, request, render_template, url_for
from flask_cors import CORS
from flask_migrate import Migrate
from app.database import db
from app.config import Config
from app.models.geocache import Zone, Geocache, Attribute
from app.plugin_manager import PluginManager
from app.utils.logger import setup_logger
import base64
from sqlalchemy import inspect

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

    # Configuration du dossier des images GC
    logger.info("Configuring static folders...")
    images_folder = os.path.abspath(os.path.join(app.config['BASEDIR'], 'geocaches_images'))
    logger.info(f"Images folder path: {images_folder}")
    app.images_folder = images_folder
    app.config['UPLOAD_FOLDER'] = images_folder
    app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif'}

    # Créer les dossiers s'ils n'existent pas
    for folder in [images_folder]:
        if not os.path.exists(folder):
            os.makedirs(folder)
            logger.info(f"Created folder: {folder}")

    # Initialisation de CORS avec les options appropriées
    CORS(app, resources={
        r"/*": {
            "origins": ["http://localhost:8080", "http://localhost:3000", "http://127.0.0.1:3000", "http://127.0.0.1:8080"],  # Autoriser les deux ports et leurs équivalents 127.0.0.1
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "HX-Request", "HX-Current-URL", "HX-Target", "HX-Trigger"],
            "supports_credentials": True
        }
    })

    # Initialisation de la base de données
    db.init_app(app)

    # Initialisation de Flask-Migrate
    migrate = Migrate(app, db)

    # Route pour servir les images des géocaches
    @app.route('/geocaches_images/<gc_code>/<filename>')
    def serve_geocache_image(gc_code, filename):
        logger.debug(f"Tentative d'accès à l'image: {gc_code}/{filename}")
        try:
            # Construire le chemin complet
            full_path = os.path.join(app.images_folder, gc_code, filename)
            logger.debug(f"Chemin complet: {full_path}")
            logger.debug(f"Le fichier existe: {os.path.exists(full_path)}")
            
            # Obtenir le répertoire contenant l'image et le nom du fichier
            directory = os.path.dirname(full_path)
            return send_from_directory(directory=directory, path=filename)
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi de l'image: {str(e)}")
            return f"Erreur: {str(e)}", 404

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
            
        # Initialisation des attributs de geocaching si nécessaire
        try:
            # Vérifier si la table existe et si les colonnes sont présentes
            inspector = inspect(db.engine)
            if 'attribute' in inspector.get_table_names():
                # Vérifier si des attributs existent déjà
                attribute_count = db.session.query(db.func.count(Attribute.id)).scalar()
                if attribute_count == 0:
                    logger.info("Initializing geocaching attributes...")
                    try:
                        # Charger les attributs depuis le fichier JSON
                        json_path = os.path.join(app.config['BASEDIR'], 'app', 'data', 'attributes.json')
                        with open(json_path, 'r', encoding='utf-8') as f:
                            attributes_data = json.load(f)
                        
                        # Vérifier si les nouvelles colonnes existent
                        columns = [c['name'] for c in inspector.get_columns('attribute')]
                        has_new_columns = 'is_negative' in columns and 'base_name' in columns
                        
                        # Créer les attributs en base de données
                        for attr_data in attributes_data:
                            base_name = attr_data['attribute_name']
                            base_filename = attr_data['base_filename']
                            
                            # Pour chaque variante (yes/no), créer un attribut distinct
                            for variant in attr_data.get('variants', ['yes']):
                                attr_name = f"{base_name} - {variant.upper()}" if variant != 'yes' else base_name
                                icon_url = f"{base_filename}-{variant}.png"
                                is_negative = variant == 'no'
                                
                                # Créer l'attribut
                                if has_new_columns:
                                    attribute = Attribute(
                                        name=attr_name, 
                                        icon_url=icon_url,
                                        is_negative=is_negative,
                                        base_name=base_name
                                    )
                                else:
                                    attribute = Attribute(
                                        name=attr_name, 
                                        icon_url=icon_url
                                    )
                                db.session.add(attribute)
                        
                        db.session.commit()
                        logger.info(f"Successfully initialized {len(attributes_data) * 2} geocaching attributes")
                    except Exception as e:
                        logger.error(f"Error initializing geocaching attributes: {str(e)}")
                        # Rollback en cas d'erreur
                        db.session.rollback()
        except Exception as e:
            logger.error(f"Error checking attributes table: {str(e)}")

        # Initialisation du gestionnaire de plugins
        logger.info("Initializing PluginManager...")
        plugins_dir = os.path.join(app.config['BASEDIR'], 'plugins')
        app.plugin_manager = PluginManager(plugins_dir, app)
        logger.info("Loading plugins...")
        app.plugin_manager.load_plugins()
        logger.info("PluginManager initialized.")

    return app
