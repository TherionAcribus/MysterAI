from flask import Blueprint, render_template, jsonify, url_for, request
from app.models.geocache import Geocache
import base64
import os
from flask import send_from_directory, current_app

main = Blueprint('main', __name__)

@main.route('/')
def index():
    print("Route '/' appelée")
    try:
        return render_template('index.html')
    except Exception as e:
        print(f"Erreur lors du rendu du template : {e}")
        raise

@main.route('/geocaches/image-editor/<image_id>')
def image_editor(image_id):
    try:
        print(f"=== DEBUG: Requête reçue pour l'image {image_id} ===")
        
        # Récupérer les informations de l'image
        image = Geocache.get_image_by_id(image_id)
        print(f"=== DEBUG: Données de l'image ===", image)
        
        if not image:
            print(f"Image {image_id} non trouvée")
            return jsonify({'error': 'Image non trouvée'}), 404

        # Construire les URLs
        image_url = url_for('main.serve_geocache_image', 
                           gc_code=image['gc_code'], 
                           filename=image['filename'],
                           _external=True)  # URL absolue
        save_url = url_for('main.save_edited_image', 
                          image_id=image['id'],
                          _external=True)  # URL absolue

        print(f"=== DEBUG: URLs générées ===")
        print(f"Image URL: {image_url}")
        print(f"Save URL: {save_url}")

        response = render_template('image_editor.html', 
                                 image_name=image['filename'],
                                 image_url=image_url,
                                 save_url=save_url)
        print(f"=== DEBUG: Template rendu ===")
        print(response)
        return response

    except Exception as e:
        print(f"Erreur lors du chargement de l'éditeur d'image: {str(e)}")
        return jsonify({'error': str(e)}), 500

@main.route('/geocaches/save-image/<image_id>', methods=['POST'])
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
        image_path = os.path.join(current_app.config['GEOCACHES_IMAGES_FOLDER'], image['gc_code'], image['filename'])
        with open(image_path, 'wb') as f:
            f.write(image_bytes)

        return jsonify({'success': True})

    except Exception as e:
        print(f"Erreur lors de la sauvegarde de l'image: {str(e)}")
        return jsonify({'error': str(e)}), 500

@main.route('/geocaches_images/<gc_code>/<filename>')
def serve_geocache_image(gc_code, filename):
    try:
        # Ajouter les headers CORS
        response = send_from_directory(
            os.path.join(current_app.root_path, 'geocaches_images', gc_code),
            filename
        )
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response
    except Exception as e:
        print(f"Erreur lors de l'envoi de l'image: {str(e)}")
        return jsonify({'error': str(e)}), 500
