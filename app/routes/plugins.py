from flask import Blueprint, render_template, jsonify, request, current_app
from app.models.plugin_model import Plugin
import json
import os

plugins_bp = Blueprint('plugins', __name__)

@plugins_bp.route('/plugins/use/<plugin_name>')
def use_plugin_page(plugin_name):
    """Renvoie la page pour utiliser un plugin spécifique."""
    plugin = Plugin.query.filter_by(name=plugin_name).first_or_404()
    metadata = json.loads(plugin.metadata_json)
    return render_template('use_plugin.html', 
                         plugin=plugin,
                         input_types=metadata.get('input_types', {}),
                         output_types=metadata.get('output_types', {}))

@plugins_bp.route('/api/plugins')
def get_plugins():
    """Renvoie la liste des plugins au format JSON."""
    plugins = Plugin.query.all()
    plugins_list = []
    
    for plugin in plugins:
        plugins_list.append({
            'id': plugin.id,
            'name': plugin.name,
            'version': plugin.version,
            'description': plugin.description,
            'author': plugin.author,
            'plugin_type': plugin.plugin_type,
            'enabled': plugin.enabled,
            'categories': plugin.categories,
            'metadata_json': plugin.metadata_json,
            'path': plugin.path,
            'entry_point': plugin.entry_point
        })
    
    return jsonify(plugins_list)

@plugins_bp.route('/api/plugins/<plugin_name>/execute', methods=['POST'])
def execute_plugin(plugin_name):
    """Exécute un plugin avec les paramètres fournis."""
    plugin = Plugin.query.filter_by(name=plugin_name).first_or_404()
    if not plugin.enabled:
        return jsonify({'error': 'Plugin désactivé'}), 400
        
    try:
        # Récupérer les inputs du formulaire
        inputs = request.get_json()
        
        # Convertir les types si nécessaire
        metadata = json.loads(plugin.metadata_json)
        input_types = metadata.get('input_types', {})
        
        # Conversion basique des types
        for key, type_info in input_types.items():
            if key in inputs:
                if type_info == 'integer':
                    inputs[key] = int(inputs[key])
                elif type_info == 'float':
                    inputs[key] = float(inputs[key])
                elif type_info == 'boolean':
                    inputs[key] = inputs[key].lower() == 'true'
        
        # Exécuter le plugin
        result = current_app.plugin_manager.execute_plugin(plugin_name, inputs)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@plugins_bp.route('/api/categories', methods=['GET'])
def get_categories():
    """Récupère l'arborescence des catégories de plugins."""
    try:
        categories_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'plugin_categories.json')
        with open(categories_file, 'r', encoding='utf-8') as f:
            categories = json.load(f)
        return jsonify(categories)
    except Exception as e:
        print(f"Error loading categories: {str(e)}")
        return jsonify({'error': str(e)}), 500

@plugins_bp.route('/api/plugins_list')
def get_plugins_list():
    """Renvoie le template HTML de la liste des plugins avec leurs catégories."""
    try:
        # Récupérer les catégories
        categories_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'plugins', 'data', 'plugin_categories.json')
        with open(categories_file, 'r', encoding='utf-8') as f:
            categories_data = json.load(f)
        
        # Transformer la structure imbriquée en liste plate
        categories_list = []
        def flatten_categories(cat_dict, parent_name=""):
            for name, subcats in cat_dict.items():
                full_name = f"{parent_name}/{name}" if parent_name else name
                categories_list.append({"name": full_name})
                if isinstance(subcats, dict):
                    flatten_categories(subcats, full_name)
                
        flatten_categories(categories_data["categories"])
        
        # Récupérer les plugins
        plugins = Plugin.query.all()
        plugins_list = []
        for plugin in plugins:
            plugins_list.append({
                'name': plugin.name,
                'version': plugin.version,
                'description': plugin.description,
                'categories': json.loads(plugin.categories)
            })
        
        print("categories_list: ", categories_list)
        print("plugins_list: ", plugins_list)
        return render_template('plugins_list.html', categories=categories_list, plugins=plugins_list)
    except Exception as e:
        print(f"Error loading plugins list: {str(e)}")
        return jsonify({'error': str(e)}), 500
