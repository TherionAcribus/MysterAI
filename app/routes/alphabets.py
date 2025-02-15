import os
import json
from flask import Blueprint, jsonify, send_file, request, render_template

alphabets_bp = Blueprint('alphabets', __name__)

ALPHABETS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'alphabets')

def load_alphabet_config(alphabet_dir):
    """Charge la configuration d'un alphabet depuis son dossier."""
    config_path = os.path.join(alphabet_dir, 'alphabet.json')
    if not os.path.exists(config_path):
        return None
        
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
        # Ajouter l'ID de l'alphabet (nom du dossier)
        config['id'] = os.path.basename(alphabet_dir)
        return config

@alphabets_bp.route('/api/alphabets', methods=['GET'])
def get_alphabets():
    """Récupère la liste de tous les alphabets disponibles."""
    alphabets = []
    
    # Parcourir le répertoire des alphabets
    if os.path.exists(ALPHABETS_DIR):
        for dirname in os.listdir(ALPHABETS_DIR):
            alphabet_dir = os.path.join(ALPHABETS_DIR, dirname)
            if os.path.isdir(alphabet_dir):
                config = load_alphabet_config(alphabet_dir)
                if config:
                    alphabets.append(config)
    
    # Si la requête demande du JSON (pour l'API)
    if request.headers.get('Accept') == 'application/json':
        return jsonify(alphabets)
        
    # Sinon, retourner le HTML pour HTMX
    return render_template('components/alphabets_list.html', alphabets=alphabets)

@alphabets_bp.route('/api/alphabets/<alphabet_id>/resource/<path:resource_path>')
def get_alphabet_resource(alphabet_id, resource_path):
    """Récupère une ressource (image ou police) d'un alphabet."""
    alphabet_dir = os.path.join(ALPHABETS_DIR, alphabet_id)
    resource_full_path = os.path.join(alphabet_dir, resource_path)
    
    if not os.path.exists(resource_full_path):
        return jsonify({"error": f"Resource {resource_path} not found"}), 404
        
    return send_file(resource_full_path)

@alphabets_bp.route('/api/alphabets/use/<alphabet_id>', methods=['GET'])
def get_alphabet(alphabet_id):
    """Récupère la configuration d'un alphabet spécifique."""
    alphabet_dir = os.path.join(ALPHABETS_DIR, alphabet_id)
    
    if not os.path.exists(alphabet_dir):
        return jsonify({"error": f"Alphabet {alphabet_id} non trouvé"}), 404
        
    config = load_alphabet_config(alphabet_dir)
    if not config:
        return jsonify({"error": "Configuration de l'alphabet invalide"}), 500
        
    return jsonify(config)
