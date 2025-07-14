import os
import json
import re
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

def load_alphabet_readme(alphabet_id):
    """Charge le contenu du README d'un alphabet s'il existe."""
    alphabet_dir = os.path.join(ALPHABETS_DIR, alphabet_id)
    possible_names = ["README.md", "Readme.md", "readme.md"]
    
    for name in possible_names:
        readme_path = os.path.join(alphabet_dir, name)
        if os.path.isfile(readme_path):
            try:
                with open(readme_path, 'r', encoding='utf-8') as f:
                    return f.read()
            except:
                continue
    return ""

def search_alphabets(query, alphabets, search_in_name=True, search_in_tags=True, search_in_readme=True):
    """
    Recherche dans les alphabets selon une requête et les préférences de recherche.
    Recherche dans : nom, tags, et contenu README selon les préférences.
    """
    if not query or query.strip() == "":
        return alphabets
    
    query = query.lower().strip()
    results = []
    
    for alphabet in alphabets:
        score = 0
        matches = []
        
        # Recherche dans le nom (si activé)
        if search_in_name:
            name = alphabet.get('name', '').lower()
            if query in name:
                score += 10
                matches.append(f"nom: {alphabet.get('name', '')}")
        
        # Recherche dans la description (si activé - même checkbox que nom)
        if search_in_name:
            description = alphabet.get('description', '').lower()
            if query in description:
                score += 5
                matches.append(f"description: {alphabet.get('description', '')}")
        
        # Recherche dans les tags (si activé)
        if search_in_tags:
            tags = alphabet.get('tags', [])
            if isinstance(tags, list):
                for tag in tags:
                    if query in tag.lower():
                        score += 8
                        matches.append(f"tag: {tag}")
        
        # Recherche dans le README (si activé)
        if search_in_readme:
            readme_content = load_alphabet_readme(alphabet.get('id', ''))
            if readme_content and query in readme_content.lower():
                score += 3
                matches.append("description longue (README)")
        
        # Recherche partielle (mots séparés) - seulement si au moins une option est activée
        if search_in_name or search_in_tags or search_in_readme:
            query_words = query.split()
            for word in query_words:
                if len(word) >= 3:  # Éviter les mots trop courts
                    if search_in_name:
                        # Recherche partielle dans le nom
                        name = alphabet.get('name', '').lower()
                        if word in name:
                            score += 2
                        # Recherche partielle dans la description
                        description = alphabet.get('description', '').lower()
                        if word in description:
                            score += 1
                    
                    if search_in_tags:
                        # Recherche partielle dans les tags
                        tags = alphabet.get('tags', [])
                        if isinstance(tags, list):
                            for tag in tags:
                                if word in tag.lower():
                                    score += 1
        
        if score > 0:
            alphabet['search_score'] = score
            alphabet['search_matches'] = matches
            results.append(alphabet)
    
    # Trier par score décroissant
    results.sort(key=lambda x: x.get('search_score', 0), reverse=True)
    return results

def get_all_alphabets():
    """Récupère tous les alphabets disponibles."""
    alphabets = []
    
    if os.path.exists(ALPHABETS_DIR):
        for dirname in os.listdir(ALPHABETS_DIR):
            alphabet_dir = os.path.join(ALPHABETS_DIR, dirname)
            if os.path.isdir(alphabet_dir):
                config = load_alphabet_config(dirname)
                if config:
                    alphabets.append(config)
    
    return alphabets

@alphabets_bp.route('/api/alphabets/template', methods=['GET'])
def get_alphabets_template():
    """Récupère le template complet avec la liste de tous les alphabets disponibles."""
    alphabets = get_all_alphabets()
    
    # Gérer la recherche
    search_query = request.args.get('search', '').strip()
    search_in_name = request.args.get('search_in_name', 'true').lower() == 'true'
    search_in_tags = request.args.get('search_in_tags', 'true').lower() == 'true'
    search_in_readme = request.args.get('search_in_readme', 'false').lower() == 'true'  # Par défaut désactivé
    
    if search_query:
        alphabets = search_alphabets(search_query, alphabets, search_in_name, search_in_tags, search_in_readme)
    
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
                           font_size=font_size,
                           search_query=search_query,
                           search_in_name=search_in_name,
                           search_in_tags=search_in_tags,
                           search_in_readme=search_in_readme)

@alphabets_bp.route('/api/alphabets/list', methods=['GET'])
def get_alphabets_list():
    """Récupère uniquement la liste des alphabets (contenu) pour les mises à jour HTMX."""
    alphabets = get_all_alphabets()
    
    # Gérer la recherche
    search_query = request.args.get('search', '').strip()
    search_in_name = request.args.get('search_in_name', 'true').lower() == 'true'
    search_in_tags = request.args.get('search_in_tags', 'true').lower() == 'true'
    search_in_readme = request.args.get('search_in_readme', 'false').lower() == 'true'  # Par défaut désactivé
    
    if search_query:
        alphabets = search_alphabets(search_query, alphabets, search_in_name, search_in_tags, search_in_readme)
    
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
                          font_size=font_size,
                          search_query=search_query,
                          search_in_name=search_in_name,
                          search_in_tags=search_in_tags,
                          search_in_readme=search_in_readme)

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

@alphabets_bp.route('/api/alphabets/<alphabet_id>/sources', methods=['GET'])
def get_alphabet_sources(alphabet_id):
    """Récupère les sources et crédits d'un alphabet."""
    config = load_alphabet_config(alphabet_id)
    if not config:
        return jsonify({"error": f"Alphabet {alphabet_id} non trouvé"}), 404
        
    sources = config.get('sources', [])
    return jsonify({
        "alphabet_id": alphabet_id,
        "alphabet_name": config.get('name', alphabet_id),
        "sources": sources
    })

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

# -----------------------------------------------------------------------------
# Nouvelle route : Panneau d'informations d'un alphabet (README)
# -----------------------------------------------------------------------------

@alphabets_bp.route('/api/alphabets/<alphabet_id>/info_panel')
def get_alphabet_info_panel(alphabet_id):
    """Renvoie le contenu du README.md d'un alphabet sous forme de panneau HTML."""
    try:
        alphabet_dir = os.path.join(ALPHABETS_DIR, alphabet_id)
        if not os.path.exists(alphabet_dir):
            return jsonify({"error": f"Alphabet {alphabet_id} not found"}), 404

        # Chercher fichier README
        possible_names = ["README.md", "Readme.md", "readme.md"]
        readme_path = None
        for name in possible_names:
            candidate = os.path.join(alphabet_dir, name)
            if os.path.isfile(candidate):
                readme_path = candidate
                break

        if readme_path:
            with open(readme_path, 'r', encoding='utf-8') as f:
                readme_content = f.read()

            try:
                import markdown
                readme_html = markdown.markdown(readme_content, extensions=['fenced_code', 'tables'])
            except ImportError:
                readme_html = f"<pre>{readme_content}</pre>"
        else:
            readme_html = '<p class="text-gray-400">Aucun README trouvé pour cet alphabet.</p>'

        return render_template('alphabet_info_panel.html', alphabet_name=alphabet_id, readme_html=readme_html)
    except Exception as e:
        current_app.logger.error(f"Error loading alphabet info panel: {e}")
        return jsonify({"error": str(e)}), 500
