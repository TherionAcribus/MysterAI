import os
import json
from flask import Blueprint, jsonify, send_file, request, render_template, current_app

alphabets_bp = Blueprint('alphabets', __name__)

ALPHABETS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'alphabets')

def load_alphabet_config(alphabet_id):
    """Charge la configuration d'un alphabet depuis son dossier."""
    alphabet_path = os.path.join(ALPHABETS_DIR, alphabet_id, 'alphabet.json')
    if not os.path.exists(alphabet_path):
        return None
        
    with open(alphabet_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
        # Ajouter l'ID de l'alphabet (nom du dossier)
        config['id'] = alphabet_id
        return config

@alphabets_bp.route('/api/alphabets/template', methods=['GET'])
def get_alphabets_template():
    """Récupère le template complet avec la liste de tous les alphabets disponibles."""
    alphabets = []
    
    # Parcourir le répertoire des alphabets
    if os.path.exists(ALPHABETS_DIR):
        for dirname in os.listdir(ALPHABETS_DIR):
            alphabet_dir = os.path.join(ALPHABETS_DIR, dirname)
            if os.path.isdir(alphabet_dir):
                config = load_alphabet_config(dirname)
                if config:
                    alphabets.append(config)
    
    # Récupérer les paramètres
    show_examples = request.args.get('show_examples', 'false').lower() == 'true'
    example_text = request.args.get('example_text', 'ABCDEFGHIJKLM')
    font_size = request.args.get('font_size', '32')
    custom_text = request.args.get('custom_text', '')
    
    # Déterminer le texte à afficher (prédéfini ou personnalisé)
    display_text = custom_text if example_text == 'custom' and custom_text else example_text
    
    # Retourner le template complet
    return render_template('components/alphabets_list.html',
                           alphabets=alphabets, 
                           show_examples=show_examples,
                           example_text=example_text,
                           custom_text=custom_text,
                           display_text=display_text,
                           font_size=font_size)

@alphabets_bp.route('/api/alphabets/list', methods=['GET'])
def get_alphabets_list():
    """Récupère uniquement la liste des alphabets (contenu) pour les mises à jour HTMX."""
    alphabets = []
    
    # Parcourir le répertoire des alphabets
    if os.path.exists(ALPHABETS_DIR):
        for dirname in os.listdir(ALPHABETS_DIR):
            alphabet_dir = os.path.join(ALPHABETS_DIR, dirname)
            if os.path.isdir(alphabet_dir):
                config = load_alphabet_config(dirname)
                if config:
                    alphabets.append(config)
    
    # Récupérer les paramètres
    show_examples = request.args.get('show_examples', 'false').lower() == 'true'
    example_text = request.args.get('example_text', 'ABCDEFGHIJKLM')
    font_size = request.args.get('font_size', '32')
    custom_text = request.args.get('custom_text', '')
    
    # Déterminer le texte à afficher (prédéfini ou personnalisé)
    display_text = custom_text if example_text == 'custom' and custom_text else example_text
    
    # Retourner uniquement le contenu de la liste
    return render_template('components/alphabets_list_content.html',
                          alphabets=alphabets, 
                          show_examples=show_examples,
                          example_text=example_text,
                          custom_text=custom_text,
                          display_text=display_text,
                          font_size=font_size)

@alphabets_bp.route('/api/alphabets', methods=['GET'])
def get_alphabets():
    """Récupère la liste de tous les alphabets disponibles au format JSON."""
    alphabets = []
    
    # Parcourir le répertoire des alphabets
    if os.path.exists(ALPHABETS_DIR):
        for dirname in os.listdir(ALPHABETS_DIR):
            alphabet_dir = os.path.join(ALPHABETS_DIR, dirname)
            if os.path.isdir(alphabet_dir):
                config = load_alphabet_config(dirname)
                if config:
                    alphabets.append(config)
    
    # Retourner le JSON
    return jsonify(alphabets)

@alphabets_bp.route('/api/alphabets/<alphabet_id>/resource/<path:resource_path>')
def get_alphabet_resource(alphabet_id, resource_path):
    """Récupère une ressource (image ou police) d'un alphabet."""
    resource_full_path = os.path.join(ALPHABETS_DIR, alphabet_id, resource_path)
    
    # Log pour le débogage
    current_app.logger.info(f"Requested resource: {resource_full_path}")
    
    if not os.path.exists(resource_full_path) or not os.path.isfile(resource_full_path):
        current_app.logger.error(f"Resource not found: {resource_full_path}")
        return jsonify({"error": f"Resource {resource_path} not found"}), 404
        
    return send_file(resource_full_path)

@alphabets_bp.route('/api/alphabets/<alphabet_id>/font')
def get_alphabet_font(alphabet_id):
    """Récupère la police d'un alphabet."""
    config = load_alphabet_config(alphabet_id)
    if not config:
        current_app.logger.error(f"Alphabet not found: {alphabet_id}")
        return jsonify({"error": f"Alphabet {alphabet_id} non trouvé"}), 404
        
    if config['alphabetConfig']['type'] != 'font':
        current_app.logger.error(f"Not a font-based alphabet: {alphabet_id}")
        return jsonify({"error": "Not a font-based alphabet"}), 404
    
    font_path = os.path.join(ALPHABETS_DIR, alphabet_id, config['alphabetConfig']['fontFile'])
    
    # Log pour le débogage
    current_app.logger.info(f"Loading font: {font_path}")
    
    if not os.path.exists(font_path):
        current_app.logger.error(f"Font file not found: {font_path}")
        return jsonify({"error": f"Police {config['alphabetConfig']['fontFile']} non trouvée"}), 404
    
    return send_file(font_path, mimetype='font/ttf')

@alphabets_bp.route('/api/alphabets/<alphabet_id>/view')
def view_alphabet(alphabet_id):
    """Affiche l'interface de visualisation d'un alphabet."""
    alphabet_dir = os.path.join(ALPHABETS_DIR, alphabet_id)
    
    if not os.path.exists(alphabet_dir):
        return jsonify({"error": f"Alphabet {alphabet_id} not found"}), 404
        
    config = load_alphabet_config(alphabet_id)
    if not config:
        return jsonify({"error": "Invalid alphabet configuration"}), 400
    
    # Log pour le débogage
    current_app.logger.info(f"Loading alphabet: {alphabet_id}")
    current_app.logger.info(f"Config: {json.dumps(config, indent=2)}")
    
    return render_template('alphabet_viewer.html', alphabet=config)

@alphabets_bp.route('/api/alphabets/<alphabet_id>/reorder', methods=['POST'])
def reorder_alphabet(alphabet_id):
    """Met à jour l'ordre des symboles dans un alphabet."""
    alphabet_dir = os.path.join(ALPHABETS_DIR, alphabet_id)
    
    if not os.path.exists(alphabet_dir):
        return jsonify({"error": f"Alphabet {alphabet_id} not found"}), 404
        
    config = load_alphabet_config(alphabet_id)
    if not config:
        return jsonify({"error": "Invalid alphabet configuration"}), 400
    
    try:
        order = request.json.get('order', [])
        if not order:
            return jsonify({"error": "No order provided"}), 400
            
        # Réorganiser les symboles selon le nouvel ordre
        config['symbols'] = [config['symbols'][i] for i in order]
        
        # Sauvegarder la configuration mise à jour
        with open(os.path.join(alphabet_dir, 'alphabet.json'), 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
            
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@alphabets_bp.route('/api/alphabets/use/<alphabet_id>', methods=['GET'])
def get_alphabet(alphabet_id):
    """Récupère la configuration d'un alphabet spécifique."""
    alphabet_dir = os.path.join(ALPHABETS_DIR, alphabet_id)
    
    if not os.path.exists(alphabet_dir):
        return jsonify({"error": f"Alphabet {alphabet_id} non trouvé"}), 404
        
    config = load_alphabet_config(alphabet_id)
    if not config:
        return jsonify({"error": "Configuration de l'alphabet invalide"}), 500
        
    return jsonify(config)
