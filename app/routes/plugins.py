from flask import Blueprint, render_template, jsonify, request, current_app
from app.models.plugin_model import Plugin
import json
import os
from app.services.scoring_service import get_scoring_service
# Ajout pour la détection automatique de coordonnées GPS
from app.routes.coordinates import detect_gps_coordinates

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

@plugins_bp.route('/api/solver/plugins')
def get_solver_plugins():
    """Renvoie la liste des plugins simplifiée pour le Solver."""
    try:
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
        
        return render_template('solver_plugins_list.html', plugins=plugins_list)
    except Exception as e:
        print(f"Error loading solver plugins list: {str(e)}")
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
            
        # Récupérer les catégories existantes
        categories = json.loads(plugin.categories)
        
        # Vérifier si la requête provient du Solver
        referer = request.headers.get('Referer', '')
        context = request.args.get('context', '')
        
        if 'geocache_solver' in referer or request.args.get('from_solver') or context == 'solver':
            # Ajouter la catégorie "solver" si elle n'existe pas déjà
            if 'solver' not in categories:
                categories.append('solver')
            
        # Fusionner les données de la base avec celles du plugin.json
        plugin_data.update({
            'id': plugin.id,
            'name': plugin.name,
            'version': plugin.version,
            'description': plugin.description,
            'author': plugin.author,
            'categories': categories
        })

        # Récupérer les paramètres de l'URL
        params = {}
        for key, value in request.args.items():
            params[key] = value
            
        # Ajouter les paramètres aux données du plugin
        plugin_data['params'] = params
        
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
            
            # ------------------------------------------------------------------
            # Détection automatique de coordonnées GPS dans les résultats
            # ------------------------------------------------------------------

            def _add_coords_to_text(text: str):
                """Retourne un dict de coordonnées détectées dans le texte (ou None)."""
                if not text or not isinstance(text, str):
                    return None
                try:
                    coords = detect_gps_coordinates(text, include_numeric_only=True)
                    return coords if coords else None
                except Exception as exc:
                    # En cas d'erreur, on ne bloque pas l'exécution
                    current_app.logger.error(f"Erreur détection GPS: {exc}")
                    return None

            def _ensure_coordinates(obj):
                """Ajoute les coordonnées à un résultat de plugin si manquantes."""
                if not isinstance(obj, dict):
                    return obj

                # Nouveau format standardisé avec liste de résultats
                if 'results' in obj and isinstance(obj['results'], list):
                    for res in obj['results']:
                        if not res.get('coordinates') or not res.get('coordinates', {}).get('exist'):
                            coords = _add_coords_to_text(res.get('text_output') or res.get('output'))
                            if coords:
                                res['coordinates'] = coords

                    # Définir un champ racine "coordinates" basé sur le meilleur résultat si présent
                    if 'summary' in obj and obj['summary'].get('best_result_id'):
                        best_id = obj['summary']['best_result_id']
                        best = next((r for r in obj['results'] if r.get('id') == best_id), None)
                    else:
                        best = obj['results'][0] if obj['results'] else None

                    if best and best.get('coordinates'):
                        obj['coordinates'] = best['coordinates']

                # Ancien format plat
                else:
                    if not obj.get('coordinates') or not obj.get('coordinates', {}).get('exist'):
                        # Chercher un champ texte plausible
                        text_candidate = obj.get('text_output') or obj.get('output')
                        if not text_candidate and 'result' in obj and isinstance(obj['result'], dict):
                            nested = obj['result']
                            text_candidate = nested.get('text_output') or nested.get('output')
                            if not text_candidate and 'text' in nested and isinstance(nested['text'], dict):
                                text_candidate = nested['text'].get('text_output')

                        coords = _add_coords_to_text(text_candidate)
                        if coords:
                            obj['coordinates'] = coords
                return obj

            # Appliquer l'enrichissement
            result = _ensure_coordinates(result)
            
            # Vérifier si le client a demandé du JSON 
            accept_header = request.headers.get('Accept', '')
            wants_json = 'application/json' in accept_header or inputs.get('_format') == 'json'
            
            # Normaliser les résultats pour une interface unifiée
            normalized_result = {}
            
            # Cas 1: Plugin standard avec text_output
            if isinstance(result, dict) and 'text_output' in result:
                normalized_result = result
            # Cas 2: Plugin avec structure {result: {text: {text_output: ...}}}
            elif isinstance(result, dict) and 'result' in result and isinstance(result['result'], dict) and 'text' in result['result']:
                normalized_result = {
                    'text_output': result['result']['text'].get('text_output', ''),
                    'original_result': result  # Garder le résultat original pour référence
                }
                
                # Récupérer le log s'il existe
                if 'log' in result['result']:
                    normalized_result['log'] = result['result']['log']
                
                # Traitement spécial pour les coordonnées GPS
                if 'coordinates' in result:
                    normalized_result['coordinates'] = result['coordinates']
                elif 'result' in result and 'gps_coordinates' in result['result']:
                    normalized_result['coordinates'] = result['result']['gps_coordinates']
                
            # Cas 3: Plugin avec juste 'output' au lieu de 'text_output'
            elif isinstance(result, dict) and 'output' in result:
                normalized_result = {
                    'text_output': result['output'],
                    'original_result': result
                }
                
                # Traitement spécial pour les coordonnées GPS
                if 'coordinates' in result:
                    normalized_result['coordinates'] = result['coordinates']
            else:
                # Pour tout autre format de résultat
                normalized_result = result
            
            # S'assurer que les coordonnées sont gérées correctement
            if isinstance(normalized_result, dict) and 'coordinates' not in normalized_result:
                # Vérifier si les coordonnées existent dans result.gps_coordinates
                if isinstance(result, dict) and 'result' in result and 'gps_coordinates' in result['result']:
                    normalized_result['coordinates'] = result['result']['gps_coordinates']
                else:
                    normalized_result['coordinates'] = {
                        'exist': False,
                        'ddm_lat': None,
                        'ddm_lon': None,
                        'ddm': None,
                        'decimal': {"latitude": None, "longitude": None}
                    }
            
            # Si c'est un résultat d'analyse complexe (qui contient combined_results)
            if isinstance(result, dict) and 'combined_results' in result:
                if wants_json:
                    return jsonify(result)
                    
                # Sinon, on continue avec le format HTML pour la rétrocompatibilité
                # (Le reste du code reste inchangé)
            else:
                # Pour les résultats normalisés standard
                return jsonify(normalized_result)
            
            # Vérifier si le plugin est standard (comme Caesar)
            if isinstance(result, dict) and not 'combined_results' in result:
                # S'assurer que les coordonnées sont gérées s'il n'y en a pas
                if 'coordinates' not in result:
                    result['coordinates'] = {
                        'exist': False,
                        'ddm_lat': None,
                        'ddm_lon': None,
                        'ddm': None
                    }
                # Renvoyer directement le JSON
                return jsonify(result)
            
            # Si c'est un résultat combiné (outil d'analyse complexe)
            if isinstance(result, dict) and 'combined_results' in result and wants_json:
                return jsonify(result)
                
            # Sinon, on continue avec le format HTML pour la rétrocompatibilité
            # Formater le résultat en HTML
            output_html = '<div class="space-y-4">'
            
            if isinstance(result, dict) and 'combined_results' in result:
                combined_results = result['combined_results']
                
                # Coordonnées détectées
                coordinates = []
                if 'coordinates_finder' in combined_results and combined_results['coordinates_finder']:
                    coordinates.extend(combined_results['coordinates_finder'])
                if 'formula_parser' in combined_results and combined_results['formula_parser'].get('coordinates'):
                    coordinates.extend(combined_results['formula_parser']['coordinates'])
                
                if coordinates:
                    output_html += '''
                        <div class="bg-gray-700 p-4 rounded-lg">
                            <h3 class="text-lg font-semibold text-blue-400 mb-3">Coordonnées détectées</h3>
                            <div class="space-y-2">
                    '''
                    for coord in coordinates:
                        output_html += f'''
                            <div class="bg-gray-600 p-3 rounded">
                                <div class="text-gray-200">{coord.get('original_text', '')}</div>
                                <div class="text-sm text-gray-400 mt-1">{coord.get('lat', '')}, {coord.get('lng', '')}</div>
                            </div>
                        '''
                    output_html += '</div></div>'

                # Textes intéressants
                interesting_texts = []
                
                # Textes colorés
                if 'color_text_detector' in combined_results:
                    findings = combined_results['color_text_detector'].get('findings', [])
                    for finding in findings:
                        interesting_texts.append({
                            'text': finding,
                            'type': 'Texte invisible',
                            'icon': '🎨'
                        })

                # Commentaires HTML
                if 'html_comments_finder' in combined_results:
                    findings = combined_results['html_comments_finder'].get('findings', [])
                    for finding in findings:
                        interesting_texts.append({
                            'text': finding,
                            'type': 'Commentaire HTML',
                            'icon': '💬'
                        })

                # Textes alternatifs d'images
                if 'image_alt_text_extractor' in combined_results:
                    findings = combined_results['image_alt_text_extractor'].get('findings', [])
                    for finding in findings:
                        if finding.get('isInteresting'):
                            interesting_texts.append({
                                'text': finding['content'],
                                'type': finding.get('description', 'Texte d\'image'),
                                'icon': '🖼️'
                            })

                if interesting_texts:
                    output_html += '''
                        <div class="bg-gray-700 p-4 rounded-lg">
                            <h3 class="text-lg font-semibold text-blue-400 mb-3">Textes intéressants</h3>
                            <div class="space-y-2">
                    '''
                    for text in interesting_texts:
                        output_html += f'''
                            <div class="bg-gray-600 p-3 rounded">
                                <div class="flex items-center gap-2">
                                    <span class="text-xl">{text['icon']}</span>
                                    <span class="text-gray-400 text-sm">{text['type']}</span>
                                </div>
                                <div class="text-gray-200 mt-1">{text['text']}</div>
                            </div>
                        '''
                    output_html += '</div></div>'

                # Points de passage
                if 'additional_waypoints_analyzer' in combined_results and combined_results['additional_waypoints_analyzer']:
                    waypoints = combined_results['additional_waypoints_analyzer']
                    output_html += '''
                        <div class="bg-gray-700 p-4 rounded-lg">
                            <h3 class="text-lg font-semibold text-blue-400 mb-3">Points de passage</h3>
                            <div class="space-y-2">
                    '''
                    for wp in waypoints:
                        output_html += f'''
                            <div class="bg-gray-600 p-3 rounded">
                                <div class="flex justify-between">
                                    <span class="text-gray-200">{wp.get('name', '')}</span>
                                    <span class="text-gray-400">{wp.get('prefix', '')}</span>
                                </div>
                                <div class="text-sm text-gray-400 mt-1">{wp.get('coordinates', '')}</div>
                            </div>
                        '''
                    output_html += '</div></div>'

                # Si aucun résultat intéressant
                if not coordinates and not interesting_texts and not (combined_results.get('additional_waypoints_analyzer')):
                    output_html += '''
                        <div class="bg-gray-700 p-4 rounded-lg">
                            <div class="text-gray-400">Aucun élément intéressant trouvé dans l'analyse.</div>
                        </div>
                    '''

                # Liste des analyseurs sans résultats
                empty_analyzers = []
                analyzer_names = {
                    'coordinates_finder': 'Détecteur de coordonnées',
                    'color_text_detector': 'Détecteur de textes invisibles',
                    'formula_parser': 'Analyseur de formules',
                    'html_comments_finder': 'Détecteur de commentaires HTML',
                    'image_alt_text_extractor': 'Analyseur de textes d\'images',
                    'additional_waypoints_analyzer': 'Analyseur de points de passage'
                }

                for analyzer, name in analyzer_names.items():
                    result = combined_results.get(analyzer)
                    if result is None or result == [] or result == {} or (
                        isinstance(result, dict) and (
                            (result.get('findings', []) == [] and result.get('coordinates', []) == []) or
                            (result.get('coordinates', []) == [] and result.get('details', {}).get('info') == 'Aucune coordonnée détectée')
                        )
                    ):
                        empty_analyzers.append(name)

                if empty_analyzers:
                    output_html += '''
                        <div class="bg-gray-700 p-4 rounded-lg">
                            <h3 class="text-lg font-semibold text-blue-400 mb-3">Analyseurs sans résultats</h3>
                            <div class="text-gray-400">
                    '''
                    for analyzer in empty_analyzers:
                        output_html += f'<div class="mb-1">• {analyzer}</div>'
                    output_html += '</div></div>'

            else:
                output_html += f'''
                    <div class="bg-gray-700 p-4 rounded-lg">
                        <div class="text-gray-200">{result}</div>
                    </div>
                '''
                
            output_html += '</div>'
            
            return output_html
            
        except Exception as e:
            import traceback
            print(f"Error executing plugin: {str(e)}")
            print("Traceback:")
            print(traceback.format_exc())
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

@plugins_bp.route('/api/plugins/metadetection/execute', methods=['POST'])
def execute_metadetection():
    """
    Route spécifique pour exécuter le plugin metadetection avec des fonctionnalités étendues.
    Ce plugin est un méta-plugin qui peut analyser et décoder du texte en utilisant d'autres plugins.
    """
    try:
        # Initialiser le service WebSocket et la session (si fournie par le client, la réutiliser)
        try:
            from app.services.websocket_service import get_websocket_service
            ws_service = get_websocket_service()
        except Exception:
            ws_service = None

        # Récupérer les inputs du formulaire
        text = request.form.get('text', '')
        mode = request.form.get('mode', 'detect')  # 'detect' ou 'decode'
        strict = request.form.get('strict', 'smooth')  # 'strict' ou 'smooth'
        embedded = request.form.get('embedded', 'false').lower() == 'true'
        plugin_name = request.form.get('plugin_name', None)  # Optionnel, pour le décodage avec un plugin spécifique
        key = request.form.get('key', None)
        plugin_scope = request.form.get('plugin_scope')  # 'selected' | 'all'
        # Optionnel: coordonnées d'origine au format JSON { ddm_lat, ddm_lon }
        origin_coords_json = request.form.get('origin_coords')
        origin_coords = None
        if origin_coords_json:
            try:
                origin_coords = json.loads(origin_coords_json)
            except Exception:
                origin_coords = None
        # Session WebSocket optionnelle transmise par le frontend
        ws_session_id = request.form.get('ws_session_id') or request.form.get('session_id')
        
        # Normaliser le texte
        text = normalize_text(text)
        
        # Récupérer les caractères autorisés s'ils sont fournis
        allowed_chars_json = request.form.get('allowed_chars', None)
        allowed_chars = None
        if allowed_chars_json:
            try:
                allowed_chars = json.loads(allowed_chars_json)
                print(f"Caractères autorisés: {allowed_chars}")
            except json.JSONDecodeError:
                print(f"Erreur de décodage JSON pour allowed_chars: {allowed_chars_json}")
        
        if not text:
            return jsonify({'error': 'Aucun texte fourni'}), 400
            
        # Créer une session si non fournie
        if ws_service and (ws_session_id is None or ws_session_id == ""):
            try:
                ws_session_id = ws_service.create_session('metadetection')
            except Exception:
                ws_session_id = None

        # Émettre un début de progression
        if ws_service and ws_session_id:
            try:
                ws_service.emit_progress(ws_session_id, 'started', "Démarrage du MetaSolver...", 0, {
                    'mode': mode,
                    'embedded': embedded,
                    'strict': strict
                })
            except Exception:
                pass

        # Vérifier que le plugin metadetection existe
        plugin = Plugin.query.filter_by(name='metadetection').first()
        if not plugin:
            return jsonify({'error': 'Plugin metadetection non trouvé'}), 404
            
        # Préparer les inputs pour le plugin
        inputs = {
            'text': text,
            'mode': mode,
            'strict': strict,  # Transmettre le paramètre strict tel quel ('strict' ou 'smooth')
            'ws_session_id': ws_session_id
        }
        if plugin_scope:
            inputs['plugin_scope'] = plugin_scope
            try:
                from loguru import logger as _lg
                _lg.debug(f"routes.plugins.execute_metadetection: plugin_scope={plugin_scope}")
            except Exception:
                pass
        
        # Ajouter les caractères autorisés si fournis
        if allowed_chars:
            inputs['allowed_chars'] = allowed_chars
        
        # Ajouter le plugin_name si fourni
        if plugin_name:
            inputs['plugin_name'] = plugin_name
        
        # Ajouter la clé si fournie
        if key:
            inputs['key'] = key
        # Ajouter les coordonnées d'origine si fournies
        if origin_coords and isinstance(origin_coords, dict):
            # Normaliser les clés attendues
            ddm_lat = origin_coords.get('ddm_lat') or origin_coords.get('lat')
            ddm_lon = origin_coords.get('ddm_lon') or origin_coords.get('lon')
            if ddm_lat and ddm_lon:
                inputs['origin_coords'] = { 'ddm_lat': ddm_lat, 'ddm_lon': ddm_lon }
            
        # Obtenir le plugin manager
        from app import get_plugin_manager
        plugin_manager = get_plugin_manager()
        
        # Exécuter le plugin
        result = plugin_manager.execute_plugin('metadetection', inputs)

        # Émettre le succès et le résultat via WebSocket
        if ws_service and ws_session_id:
            try:
                ws_service.emit_success(ws_session_id, 'MetaSolver terminé', result)
            except Exception:
                pass
        
        # Retourner le résultat en JSON
        # Inclure l'id de session pour le frontend si utile
        response_payload = result if isinstance(result, dict) else {'result': result}
        if ws_session_id:
            response_payload['ws_session_id'] = ws_session_id
        return jsonify(response_payload)
        
    except Exception as e:
        import traceback
        print(f"Error executing metadetection plugin: {str(e)}")
        print("Traceback:")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@plugins_bp.route('/api/plugins/metadetection/session', methods=['POST'])
def create_metasolver_session():
    """Crée une session WebSocket pour suivre l'exécution du MetaSolver."""
    try:
        from app.services.websocket_service import get_websocket_service
        ws_service = get_websocket_service()
        session_id = ws_service.create_session('metadetection')
        return jsonify({'session_id': session_id, 'operation_type': 'metadetection'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@plugins_bp.route('/api/plugins/metadetection/pause', methods=['POST'])
def pause_metasolver():
    """Met une session MetaSolver en pause."""
    try:
        session_id = request.form.get('session_id') or (request.get_json() or {}).get('session_id')
        if not session_id:
            return jsonify({'error': 'session_id requis'}), 400
        from app.services.websocket_service import get_websocket_service
        ws_service = get_websocket_service()
        ws_service.set_control(session_id, paused=True)
        ws_service.emit_progress(session_id, 'paused', 'MetaSolver en pause', None, {})
        return jsonify({'ok': True, 'session_id': session_id, 'paused': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@plugins_bp.route('/api/plugins/metadetection/resume', methods=['POST'])
def resume_metasolver():
    """Relance une session MetaSolver en pause."""
    try:
        session_id = request.form.get('session_id') or (request.get_json() or {}).get('session_id')
        if not session_id:
            return jsonify({'error': 'session_id requis'}), 400
        from app.services.websocket_service import get_websocket_service
        ws_service = get_websocket_service()
        ws_service.set_control(session_id, paused=False)
        ws_service.emit_progress(session_id, 'resumed', 'MetaSolver repris', None, {})
        return jsonify({'ok': True, 'session_id': session_id, 'paused': False})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@plugins_bp.route('/api/plugins/metadetection/cancel', methods=['POST'])
def cancel_metasolver():
    """Annule une session MetaSolver en cours."""
    try:
        session_id = request.form.get('session_id') or (request.get_json() or {}).get('session_id')
        if not session_id:
            return jsonify({'error': 'session_id requis'}), 400
        from app.services.websocket_service import get_websocket_service
        ws_service = get_websocket_service()
        ws_service.set_control(session_id, canceled=True)
        ws_service.emit_progress(session_id, 'canceled', "MetaSolver annulé par l'utilisateur", None, {})
        return jsonify({'ok': True, 'session_id': session_id, 'canceled': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Fonction utilitaire pour normaliser le texte
def normalize_text(text: str) -> str:
    """
    Normalise le texte avant de l'envoyer aux plugins.
    Remplace les caractères spéciaux et normalise les espaces.
    """
    if not text:
        return ""
        
    # Remplacer les espaces insécables par des espaces normaux
    normalized = text.replace('\xa0', ' ')
    
    # Normaliser les retours à la ligne
    normalized = normalized.replace('\r\n', '\n')
    
    # Supprimer les espaces multiples
    import re
    normalized = re.sub(r'\s+', ' ', normalized)
    
    # Supprimer les espaces en début et fin de chaîne
    normalized = normalized.strip()
    
    print(f"Texte normalisé: {normalized}")
    return normalized

@plugins_bp.route('/api/plugins/score', methods=['POST'])
def score_plugin_output():
    """
    Évalue la pertinence d'un texte déchiffré en lui attribuant un score de confiance.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Aucune donnée JSON reçue'
            }), 400
        
        # Valider les données requises
        if 'text' not in data:
            return jsonify({
                'success': False,
                'error': 'Le paramètre "text" est requis'
            }), 400
        
        # Extraire les paramètres
        text = data.get('text', '')
        context = data.get('context', {})
        
        # Obtenir le service de scoring
        scoring_service = get_scoring_service()
        
        # Effectuer le scoring
        result = scoring_service.score_text(text, context)
        
        # Ajouter les métadonnées de la requête au résultat
        result['input'] = {
            'text': text[:100] + ('...' if len(text) > 100 else ''),  # Tronquer pour la lisibilité
            'context_provided': bool(context)
        }
        
        return jsonify({
            'success': True,
            'result': result
        })
    except Exception as e:
        import traceback
        print(f"Error in scoring: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@plugins_bp.route('/api/test/scoring', methods=['GET'])
def test_scoring():
    """
    Route de test pour le système de scoring.
    Utile pour tester rapidement le scoring sur différents textes.
    """
    try:
        # Récupérer le texte à évaluer depuis les paramètres de requête
        text = request.args.get('text', 'Voici un exemple de texte en français pour tester le scoring.')
        
        # Obtenir le service de scoring
        scoring_service = get_scoring_service()
        
        # Effectuer le scoring
        result = scoring_service.score_text(text)
        
        # Retourner les résultats sous forme HTML pour un affichage facile dans le navigateur
        html_result = f"""
        <html>
        <head>
            <title>Test du système de scoring</title>
            <style>
                body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }}
                h1 {{ color: #333; }}
                pre {{ background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }}
                .score {{ font-size: 18px; font-weight: bold; }}
                .high {{ color: green; }}
                .medium {{ color: orange; }}
                .low {{ color: red; }}
                .words {{ margin-top: 10px; }}
                .word {{ display: inline-block; background: #e0f0ff; padding: 3px 8px; margin: 3px; border-radius: 3px; }}
                table {{ border-collapse: collapse; width: 100%; margin-top: 20px; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
                tr:nth-child(even) {{ background-color: #f9f9f9; }}
            </style>
        </head>
        <body>
            <h1>Test du système de scoring</h1>
            
            <h2>Texte analysé</h2>
            <pre>{text}</pre>
            
            <h2>Résultat du scoring</h2>
        """
        
        if result.get("status") == "disabled":
            html_result += f"""
            <p>Le scoring automatique est désactivé dans les paramètres.</p>
            """
        elif result.get("status") == "rejected":
            html_result += f"""
            <p>Le texte a été rejeté par le pré-filtrage : {result.get("message")}</p>
            """
        else:
            # Déterminer la classe CSS pour le score
            score_class = "low"
            if result.get("confidence_level") == "high":
                score_class = "high"
            elif result.get("confidence_level") == "medium":
                score_class = "medium"
                
            html_result += f"""
            <p>Score : <span class="score {score_class}">{result.get("score", 0):.2f}</span> ({result.get("confidence_level", "inconnu")})</p>
            <p>Langue détectée : {result.get("language", "inconnue")}</p>
            
            <h3>Mots reconnus</h3>
            <div class="words">
            """
            
            for word in result.get("words_found", []):
                html_result += f'<span class="word">{word}</span>'
                
            html_result += """
            </div>
            
            <h3>Coordonnées GPS détectées</h3>
            """
            
            coords = result.get("coordinates", {})
            if coords.get("exist"):
                html_result += f"""
                <p>Coordonnées : {coords.get("ddm", "Non spécifié")}</p>
                <p>Latitude : {coords.get("ddm_lat", "Non spécifié")}</p>
                <p>Longitude : {coords.get("ddm_lon", "Non spécifié")}</p>
                """
                if "decimal" in coords and coords["decimal"]:
                    html_result += f"""
                    <p>Coordonnées décimales : {coords["decimal"].get("latitude", "?")} , {coords["decimal"].get("longitude", "?")}</p>
                    """
            else:
                html_result += "<p>Aucune coordonnée GPS détectée</p>"
                
            # Ajouter des détails sur les candidats
            html_result += """
            <h3>Détails des candidats</h3>
            <table>
                <tr>
                    <th>Texte</th>
                    <th>Score</th>
                    <th>Score lexical</th>
                    <th>Bonus GPS</th>
                </tr>
            """
            
            for candidate in result.get("candidates", []):
                html_result += f"""
                <tr>
                    <td>{candidate.get("text", "")}</td>
                    <td>{candidate.get("score", 0):.2f}</td>
                    <td>{candidate.get("lexical_score", 0):.2f}</td>
                    <td>{candidate.get("gps_bonus", 0):.2f}</td>
                </tr>
                """
                
            html_result += """
            </table>
            """
            
        html_result += f"""
            <h2>Données techniques</h2>
            <p>Temps d'exécution : {result.get("execution_time_ms", 0)} ms</p>
            <pre>{json.dumps(result, indent=2)}</pre>
            
            <h2>Tester un autre texte</h2>
            <form action="/api/test/scoring" method="get">
                <textarea name="text" rows="5" style="width: 100%;">{text}</textarea>
                <input type="submit" value="Évaluer">
            </form>
        </body>
        </html>
        """
        
        return html_result
        
    except Exception as e:
        return f"""
        <html>
        <head><title>Erreur</title></head>
        <body>
            <h1>Erreur lors du test de scoring</h1>
            <p>{str(e)}</p>
        </body>
        </html>
        """

# -----------------------------------------------------------------------------
# Nouvelle route : Panneau d'informations d'un plugin (README)
# -----------------------------------------------------------------------------

@plugins_bp.route('/api/plugins/<plugin_name>/info_panel')
def get_plugin_info_panel(plugin_name):
    """Renvoie le contenu du fichier README.md d'un plugin sous forme de panneau HTML."""
    try:
        from app.models import Plugin  # Import tardif pour éviter les boucles

        # Rechercher le plugin en base
        plugin = Plugin.query.filter_by(name=plugin_name).first()
        if not plugin:
            return jsonify({'error': 'Plugin non trouvé'}), 404

        # Chercher le fichier README dans le dossier du plugin
        possible_names = ["README.md", "Readme.md", "readme.md"]
        readme_path = None
        for filename in possible_names:
            path_candidate = os.path.join(plugin.path, filename)
            if os.path.isfile(path_candidate):
                readme_path = path_candidate
                break

        if readme_path:
            with open(readme_path, 'r', encoding='utf-8') as f:
                readme_content = f.read()

            try:
                import markdown
            except ImportError:
                # Fallback: texte brut si markdown n'est pas installé
                readme_html = f"<pre>{readme_content}</pre>"
            else:
                readme_html = markdown.markdown(readme_content, extensions=['fenced_code', 'tables'])
        else:
            readme_html = '<p class="text-gray-400">Aucun fichier README trouvé pour ce plugin.</p>'

        return render_template(
            'plugin_info_panel.html',
            plugin_name=plugin.name,
            readme_html=readme_html
        )

    except Exception as e:
        print(f"Error loading plugin info panel: {str(e)}")
        return jsonify({'error': str(e)}), 500
