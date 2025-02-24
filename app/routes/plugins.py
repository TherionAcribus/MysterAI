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


@plugins_bp.route('/api/plugins/<plugin_name>/execute_old', methods=['POST'])
def execute_plugin_old(plugin_name):
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
                'id': plugin.id,
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

@plugins_bp.route('/api/plugin/<plugin_id>')
def get_plugin_details(plugin_id):
    """Renvoie les détails d'un plugin spécifique."""
    try:
        plugin = Plugin.query.get(plugin_id)
        if not plugin:
            return jsonify({'error': 'Plugin non trouvé'}), 404
            
        plugin_data = {
            'name': plugin.name,
            'version': plugin.version,
            'description': plugin.description,
            'author': plugin.author,
            'categories': json.loads(plugin.categories)
        }
        
        return render_template('plugin_details.html', plugin=plugin_data)
    except Exception as e:
        print(f"Error loading plugin details: {str(e)}")
        return jsonify({'error': str(e)}), 500

@plugins_bp.route('/api/plugins/<plugin_name>/interface')
def get_plugin_interface(plugin_name):
    """Renvoie l'interface HTML du plugin avec ses métadonnées."""
    try:
        plugin = Plugin.query.filter_by(name=plugin_name).first()
        if not plugin:
            return jsonify({'error': 'Plugin non trouvé'}), 404
            
        # Utiliser le chemin stocké dans la base de données
        plugin_json_path = os.path.join(plugin.path, 'plugin.json')
        
        print(f"Searching for plugin.json at: {plugin_json_path}")
        
        # Vérifier que le fichier existe
        if not os.path.isfile(plugin_json_path):
            return jsonify({'error': f'plugin.json non trouvé dans {plugin.path}'}), 404
            
        with open(plugin_json_path, 'r', encoding='utf-8') as f:
            plugin_data = json.load(f)
            
        # Fusionner les données de la base avec celles du plugin.json
        plugin_data.update({
            'id': plugin.id,
            'name': plugin.name,
            'version': plugin.version,
            'description': plugin.description,
            'author': plugin.author,
            'categories': json.loads(plugin.categories)
        })
        
        return render_template('plugin_interface.html', plugin=plugin_data)
    except Exception as e:
        print(f"Error loading plugin interface: {str(e)}")
        return jsonify({'error': str(e)}), 500

@plugins_bp.route('/api/plugins/<plugin_name>/execute', methods=['POST'])
def execute_plugin(plugin_name):
    """Exécute le plugin avec les paramètres fournis."""
    try:
        plugin = Plugin.query.filter_by(name=plugin_name).first()
        if not plugin:
            return jsonify({'error': 'Plugin non trouvé'}), 404

        # Récupérer les inputs JSON
        inputs = request.get_json()
        if not inputs:
            return jsonify({'error': 'Aucune donnée JSON reçue'}), 400

        print("Executing plugin", plugin_name, "with inputs:", inputs)

        # Charger les métadonnées du plugin pour la conversion des types
        plugin_json_path = os.path.join(plugin.path, 'plugin.json')
        with open(plugin_json_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
            input_types = metadata.get('input_types', {})

        # Convertir les types selon la configuration du plugin.json
        converted_inputs = {}
        for key, value in inputs.items():
            if key in input_types:
                type_info = input_types[key]
                if type_info['type'] == 'number':
                    converted_inputs[key] = float(value)
                elif type_info['type'] == 'select':
                    converted_inputs[key] = str(value)
                else:
                    converted_inputs[key] = value
            else:
                converted_inputs[key] = value

        # Exécuter le plugin via le plugin manager
        from app import get_plugin_manager
        plugin_manager = get_plugin_manager()
        
        try:
            result = plugin_manager.execute_plugin(plugin_name, converted_inputs)
            
            # Formater le résultat en HTML
            output_html = '<div class="bg-gray-700 p-4 rounded-lg">'
            
            if isinstance(result, dict):
                for key, value in result.items():
                    output_html += f'<div class="mb-2"><span class="font-semibold text-blue-400">{key}:</span> <span class="text-gray-200">{value}</span></div>'
            else:
                output_html += f'<div class="text-gray-200">{result}</div>'
                
            output_html += '</div>'
            
            return output_html
            
        except Exception as e:
            error_html = f'<div class="bg-red-900 text-red-100 p-4 rounded-lg">Erreur lors de l\'exécution du plugin: {str(e)}</div>'
            return error_html, 500
            
    except Exception as e:
        print(f"Error executing plugin: {str(e)}")
        return jsonify({'error': str(e)}), 500

@plugins_bp.route('/geocache-analysis', methods=['GET', 'POST'])
def geocache_analysis():
    """Renvoie la page d'analyse d'une géocache."""
    print("geocache_analysis", request.values)
    geocache_id = request.values.get('geocache_id')  # Works for both GET and POST
    gc_code = request.values.get('gc_code')
    return render_template('geocache_analysis.html',
                         geocache_id=geocache_id,
                         gc_code=gc_code)
