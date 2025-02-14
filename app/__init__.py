import logging
import os
from flask import Flask, send_from_directory, jsonify, request, render_template, url_for
from flask_cors import CORS
from flask_migrate import Migrate
from app.database import db
from app.config import Config
from app.models.geocache import Zone, Geocache
from app.plugin_manager import PluginManager
from app.utils.logger import setup_logger
import base64

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

    # Route pour l'éditeur d'image
    @app.route('/geocaches/image-editor/<image_id>')
    def image_editor(image_id):
        try:
            # Récupérer les informations de l'image
            image = Geocache.get_image_by_id(image_id)
            if not image:
                return jsonify({'error': 'Image non trouvée'}), 404

            # Construire les URLs
            image_url = url_for('serve_geocache_image', filename=image['filename'])
            save_url = url_for('save_edited_image', image_id=image_id)

            return render_template('image_editor.html', 
                                 image_name=image['filename'],
                                 image_url=image_url,
                                 save_url=save_url)

        except Exception as e:
            app.logger.error(f"Erreur lors du chargement de l'éditeur d'image: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # Route pour sauvegarder l'image éditée
    @app.route('/geocaches/save-image/<image_id>', methods=['POST'])
    def save_edited_image(image_id):
        try:
            data = request.get_json()
            if not data or 'image_data' not in data:
                return jsonify({'error': 'Données d\'image manquantes'}), 400

            # Récupérer les informations de l'image
            image = Geocache.get_image_by_id(image_id)
            if not image:
                return jsonify({'error': 'Image non trouvée'}), 404

            # Décoder l'image base64 et la sauvegarder
            image_data = data['image_data'].split(',')[1]  # Enlever le préfixe "data:image/png;base64,"
            image_bytes = base64.b64decode(image_data)

            # Sauvegarder l'image
            image_path = os.path.join(app.config['GEOCACHES_IMAGES_FOLDER'], image['filename'])
            with open(image_path, 'wb') as f:
                f.write(image_bytes)

            return jsonify({'success': True})

        except Exception as e:
            app.logger.error(f"Erreur lors de la sauvegarde de l'image: {str(e)}")
            return jsonify({'error': str(e)}), 500

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
