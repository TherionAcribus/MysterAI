from flask import Blueprint, request, jsonify, Response
from app.services.ai_service import ai_service
from app.services.model_registry import model_registry
from app.models.app_config import AppConfig
from app.services.ocr_service import get_ocr_service
from app.services.pipeline_registry import pipeline_registry
import logging

# Configurer le logger
logger = logging.getLogger(__name__)

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')

@ai_bp.route('/settings', methods=['GET'])
def get_settings():
    """Récupère les paramètres actuels de l'IA"""
    settings = ai_service.get_settings()
    
    # Masquer la clé API dans la réponse
    if 'api_key' in settings and settings['api_key']:
        settings['api_key'] = '********'
    
    return jsonify(settings)

@ai_bp.route('/save_settings', methods=['POST'])
def save_settings():
    """Enregistre les paramètres de l'IA"""
    settings = request.json
    result = ai_service.save_settings(settings)
    return jsonify(result)

@ai_bp.route('/test_ollama_connection', methods=['POST'])
def test_ollama_connection():
    """Teste la connexion à Ollama"""
    data = request.json
    url = data.get('url')
    result = ai_service.test_ollama_connection(url)
    return jsonify(result)

@ai_bp.route('/chat', methods=['POST'])
def chat():
    """
    Endpoint pour le chat avec l'IA
    
    Cette route gère les requêtes de chat et peut utiliser deux implémentations différentes :
    1. LangGraph - Implémentation avancée avec support des outils/plugins
    2. LangChain - Implémentation simple sans outils
    
    Le choix entre les deux est déterminé par les paramètres 'use_langgraph' et 'use_tools'.
    """
    try:
        data = request.json
        messages = data.get('messages', [])
        model_id = data.get('model_id')  # Récupérer l'ID du modèle spécifié
        system_prompt = data.get('system_prompt')  # Récupérer le prompt système personnalisé
        pipeline_id = data.get('pipeline_id')  # Pipeline éditable optionnel
        use_tools = data.get('use_tools', True)  # Activer/désactiver l'utilisation des outils
        
        if not messages:
            return jsonify({
                'success': False,
                'error': 'Aucun message fourni'
            }), 400
        
        # Si un modèle spécifique est demandé, l'utiliser temporairement
        settings = ai_service.get_settings()
        original_mode = settings.get('mode')
        original_model = None
        model_used = None
        
        if model_id:
            # Déterminer si le modèle est en ligne ou local (accepter id court ou complet pour local)
            short_local = model_id.split(':')[0] if ':' in model_id else model_id
            if settings.get('online_models') and model_id in settings['online_models']:
                original_model = settings.get('online_model')
                settings['mode'] = 'online'
                settings['online_model'] = model_id
                model_used = settings['online_models'][model_id].get('name', model_id)
            elif settings.get('local_models') and short_local in settings['local_models']:
                original_model = settings.get('local_model')
                settings['mode'] = 'local'
                # Conserver l'id complet si fourni pour compatibilité Ollama
                settings['local_model'] = model_id
                model_used = settings['local_models'][short_local].get('name', short_local)
        
        # Vérifier si on doit utiliser LangGraph
        use_langgraph = settings.get('use_langgraph', True)
        
        # Obtenir la réponse de l'IA
        if use_langgraph and use_tools:
            # Utiliser LangGraph avec les outils de plugin
            # Cette implémentation permet d'utiliser les plugins comme outils
            # pour résoudre des énigmes de géocaching
            # Importer ici pour éviter l'importation circulaire
            from app.services.langgraph_service import langgraph_service
            response = langgraph_service.chat(messages, system_prompt, pipeline_id=pipeline_id)
        else:
            # Utiliser le service AI standard (LangChain)
            # Cette implémentation est plus simple et n'utilise pas les outils
            response = ai_service.chat(messages, settings)
        
        # Restaurer les paramètres originaux si nécessaire
        if model_id and original_mode:
            settings['mode'] = original_mode
            if original_model:
                if original_mode == 'online':
                    settings['online_model'] = original_model
                else:
                    settings['local_model'] = original_model
        
        return jsonify({
            'success': True,
            'response': response,
            'model_used': model_used,  # Renvoyer le nom du modèle utilisé
            'used_langgraph': use_langgraph and use_tools  # Indiquer si LangGraph a été utilisé
        })
    except Exception as e:
        logger.error(f"Erreur lors de l'appel au chat IA: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_bp.route('/settings_panel', methods=['GET'])
def settings_panel():
    """Rendu du panneau de paramètres IA"""
    logger.info("=== DEBUG: Route /api/ai/settings_panel appelée ===")
    
    try:
        # Récupérer les paramètres
        settings = ai_service.get_settings()
        logger.info(f"=== DEBUG: Paramètres récupérés: {settings} ===")
        
        # Récupérer le fournisseur actuel
        current_provider = settings.get('ai_provider', 'openai')
        
        # Récupérer la clé API spécifique au fournisseur actuel
        provider_key_name = f"{current_provider}_api_key"
        provider_api_key = AppConfig.get_value(provider_key_name, '')
        
        # Si pas de clé spécifique, utiliser la clé générique
        if not provider_api_key:
            provider_api_key = AppConfig.get_value('api_key', '')
        
        # Masquer la clé API pour l'affichage
        masked_api_key = ''
        if provider_api_key:
            if len(provider_api_key) > 4:
                masked_api_key = '*' * (len(provider_api_key) - 4) + provider_api_key[-4:]
            else:
                masked_api_key = '*' * len(provider_api_key)
        
        # Mettre à jour les paramètres avec la clé masquée
        settings['api_key'] = masked_api_key
        # Ne pas inclure la clé non masquée dans les paramètres pour éviter qu'elle soit visible dans le HTML
        
        logger.info(f"=== DEBUG: Fournisseur actuel: {current_provider}, Clé masquée: {masked_api_key[:10]}... ===")
        
        # Récupérer les modèles depuis le registre
        registry_online = model_registry.get_models(type='online')
        registry_local = model_registry.get_models(type='local')

        # Construire les optgroups dynamiques pour les modèles en ligne
        provider_order = ['openai', 'anthropic', 'google']
        provider_labels = {
            'openai': 'OpenAI',
            'anthropic': 'Anthropic',
            'google': 'Google'
        }
        grouped: dict = {}
        for m in registry_online:
            p = m.get('provider', 'autre')
            grouped.setdefault(p, []).append(m)
        # Ajouter providers non listés
        for p in list(grouped.keys()):
            if p not in provider_order:
                provider_order.append(p)

        online_optgroups_html = ''
        current_online_model = settings.get('ai_model')
        for p in provider_order:
            models = grouped.get(p, [])
            if not models:
                # Créer un optgroup vide pour cohérence visuelle si provider connu
                if p in provider_labels:
                    online_optgroups_html += f"<optgroup label=\"{provider_labels.get(p, p.title())}\" data-provider=\"{p}\"></optgroup>"
                continue
            label = provider_labels.get(p, p.title())
            online_optgroups_html += f"<optgroup label=\"{label}\" data-provider=\"{p}\">"
            for m in models:
                mid = m.get('model_id')
                mname = m.get('name', mid)
                selected = 'selected' if current_online_model == mid else ''
                online_optgroups_html += f"<option value=\"{mid}\" {selected}>{mname}</option>"
            online_optgroups_html += "</optgroup>"

        # Construire les options dynamiques pour les modèles locaux (sélecteur)
        local_options_html = ''
        current_local_model = settings.get('local_model', '')
        for m in registry_local:
            if not m.get('installed', False):
                continue
            full = m.get('model_id') or ''
            name = m.get('name', full)
            selected = 'selected' if current_local_model == full else ''
            local_options_html += f"<option value=\"{full}\" {selected}>{name}</option>"

        # Construire les cases à cocher pour les modèles locaux disponibles
        local_checkboxes_html = ''
        local_models_state = settings.get('local_models', {})
        for m in registry_local:
            if not m.get('installed', False):
                continue
            full = m.get('model_id') or ''
            short_id = full.split(':')[0] if ':' in full else full
            enabled = local_models_state.get(short_id, {}).get('enabled', True)
            checked = 'checked' if enabled else ''
            label = m.get('name', short_id)
            local_checkboxes_html += (
                f"<div class=\"flex items-center\">"
                f"<input type=\"checkbox\" class=\"mr-2 form-checkbox\" data-ai-settings-target=\"localModelEnabled\" data-model-id=\"{short_id}\" {checked}>"
                f"<label>{label}</label>"
                f"</div>"
            )

        # Générer le HTML directement
        html = f"""
        <h2 class="text-lg font-semibold mb-4">Paramètres IA</h2>
        
        <div class="bg-blue-900 text-white p-2 mb-4 rounded">
            Template AI Settings chargé avec succès! Mode: {settings.get('ai_mode', 'online')}
        </div>
        
        <form id="ai-settings-form" class="space-y-6">
            <!-- Sélection du mode (en ligne/local) -->
            <div class="mb-6">
                <h3 class="text-md font-medium mb-2">Mode d'exécution</h3>
                <div class="flex items-center space-x-4">
                    <label class="inline-flex items-center">
                        <input type="radio" name="ai_mode" value="online" class="form-radio" 
                               data-action="change->ai-settings#changeMode"
                               data-ai-settings-target="modeRadio"
                               {"checked" if settings.get('ai_mode') == 'online' else ""}>
                        <span class="ml-2">En ligne (API)</span>
                    </label>
                    <label class="inline-flex items-center">
                        <input type="radio" name="ai_mode" value="local" class="form-radio" 
                               data-action="change->ai-settings#changeMode"
                               data-ai-settings-target="modeRadio"
                               {"checked" if settings.get('ai_mode') == 'local' else ""}>
                        <span class="ml-2">Local (Ollama)</span>
                    </label>
                </div>
            </div>
            
            <!-- Sélection du framework (LangChain/LangGraph) -->
            <div class="mb-6">
                <h3 class="text-md font-medium mb-2">Framework IA</h3>
                <div class="flex items-center space-x-4">
                    <label class="inline-flex items-center">
                        <input type="radio" name="use_langgraph" value="true" class="form-radio" 
                               data-ai-settings-target="frameworkRadio"
                               {"checked" if settings.get('use_langgraph', True) else ""}>
                        <span class="ml-2">LangGraph (Avancé)</span>
                    </label>
                    <label class="inline-flex items-center">
                        <input type="radio" name="use_langgraph" value="false" class="form-radio" 
                               data-ai-settings-target="frameworkRadio"
                               {"checked" if not settings.get('use_langgraph', True) else ""}>
                        <span class="ml-2">LangChain (Simple)</span>
                    </label>
                </div>
                <p class="text-xs text-gray-500 mt-1">LangGraph offre des fonctionnalités avancées comme les agents et les outils.</p>
            </div>
            
            <div id="models-panel">
            <!-- Paramètres pour le mode en ligne -->
            <div id="online-settings" class="settings-group mb-6" data-ai-settings-target="onlineSettings">
                <h3 class="text-md font-medium mb-2">Paramètres API</h3>
                
                <!-- Sélection du fournisseur -->
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-1">Fournisseur</label>
                    <select class="form-select w-full" data-ai-settings-target="provider" data-action="change->ai-settings#changeProvider">
                        <option value="openai" {"selected" if settings.get('ai_provider') == 'openai' else ""}>OpenAI (ChatGPT)</option>
                        <option value="anthropic" {"selected" if settings.get('ai_provider') == 'anthropic' else ""}>Anthropic (Claude)</option>
                        <option value="google" {"selected" if settings.get('ai_provider') == 'google' else ""}>Google (Gemini)</option>
                    </select>
                </div>
                
                <!-- Clé API -->
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-1">Clé API pour <span class="font-bold" id="provider-name">{'OpenAI' if current_provider == 'openai' else 'Anthropic (Claude)' if current_provider == 'anthropic' else 'Google (Gemini)' if current_provider == 'google' else current_provider.title()}</span></label>
                    <div class="flex">
                        <input type="password" class="form-input flex-grow" 
                               data-ai-settings-target="apiKey" 
                               data-action="input->ai-settings#onApiKeyInput"
                               value="{masked_api_key}"
                               data-raw-key="{provider_api_key}"
                               placeholder="Entrez votre clé API">
                        <button type="button" class="ml-2 p-2 bg-gray-700 hover:bg-gray-600 rounded" 
                                data-action="click->ai-settings#toggleApiKeyVisibility">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                    
                    <!-- Bouton pour tester la clé API -->
                    <div class="mt-2">
                        <button type="button" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white text-sm"
                                data-action="click->ai-settings#testAPIConnection">
                            <i class="fas fa-key mr-1"></i>Tester la clé API
                        </button>
                        <span class="ml-2 text-sm" data-ai-settings-target="apiTestStatus"></span>
                    </div>
                    
                    <p class="text-xs text-gray-500 mt-1">Chaque fournisseur utilise sa propre clé API. En changeant de fournisseur, la clé API correspondante sera chargée automatiquement.</p>
                </div>
                
                <!-- Modèle -->
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-1">Modèle</label>
                    <select class="form-select w-full" data-ai-settings-target="onlineModel">
                        {online_optgroups_html}
                    </select>
                </div>
            </div>
            
            <!-- Paramètres pour le mode local -->
            <div id="local-settings" class="settings-group mb-6" data-ai-settings-target="localSettings">
                <h3 class="text-md font-medium mb-2">Paramètres Ollama</h3>
                
                <!-- URL Ollama -->
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-1">URL Ollama</label>
                    <input type="text" class="form-input w-full" 
                           data-ai-settings-target="ollamaUrl" 
                           value="{settings.get('ollama_url', 'http://localhost:11434')}"
                           placeholder="http://localhost:11434">
                </div>
                
                <!-- Modèle local -->
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-1">Modèle</label>
                    <select class="form-select w-full" data-ai-settings-target="localModel">
                        {local_options_html}
                    </select>
                </div>
                
                <!-- Bouton pour vérifier la connexion Ollama -->
                <div class="mb-4">
                    <button type="button" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                            data-action="click->ai-settings#testOllamaConnection">
                        Tester la connexion
                    </button>
                    <button type="button" class="ml-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                            data-action="click->ai-settings#refreshModels">
                        Rafraîchir les modèles
                    </button>
                    <span class="ml-2 text-sm" data-ai-settings-target="connectionStatus"></span>
                </div>
                
                <!-- Modèles locaux disponibles -->
                <div class="mb-4">
                    <h4 class="text-sm font-medium mb-2">Modèles locaux disponibles</h4>
                    <div class="bg-gray-800 p-3 rounded">
                        <div class="grid grid-cols-2 gap-2">
                            {local_checkboxes_html}
                        </div>
                    </div>
                </div>
            </div>
            </div>
            
            <!-- Paramètres communs -->
            <div class="mb-6">
                <h3 class="text-md font-medium mb-2">Paramètres généraux</h3>
                
                <!-- Température -->
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-1">
                        Température: <span data-ai-settings-target="temperatureValue">{settings.get('temperature', 0.7)}</span>
                    </label>
                    <input type="range" min="0" max="2" step="0.1" 
                           class="form-range w-full" 
                           data-ai-settings-target="temperature"
                           data-action="input->ai-settings#updateTemperature"
                           value="{settings.get('temperature', 0.7)}">
                    <div class="flex justify-between text-xs text-gray-500">
                        <span>Précis (0)</span>
                        <span>Équilibré (1)</span>
                        <span>Créatif (2)</span>
                    </div>
                </div>
                
                <!-- Contexte maximum -->
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-1">Contexte maximum (messages)</label>
                    <input type="number" class="form-input w-full" 
                           data-ai-settings-target="maxContext"
                           value="{settings.get('max_context', 10)}"
                           min="1" max="50">
                </div>
            </div>
            
            <!-- Boutons d'action -->
            <div class="flex justify-end space-x-4">
                <button type="button" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white"
                        data-action="click->ai-settings#resetDefaults">
                    Réinitialiser
                </button>
                <button type="button" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                        data-action="click->ai-settings#saveSettings">
                    Enregistrer
                </button>
            </div>
        </form>
        """
        return Response(html, mimetype='text/html')
    except Exception as e:
        logger.error(f"=== ERROR: Erreur lors du rendu du panneau de paramètres IA: {str(e)} ===")
        # Renvoyer un message d'erreur visible dans l'interface
        return f"""
        <div class="bg-red-800 text-white p-4 rounded">
            <h3 class="font-bold">Erreur lors du chargement des paramètres IA</h3>
            <p>{str(e)}</p>
        </div>
        """ 

@ai_bp.route('/models', methods=['GET'])
def get_ai_models():
    """
    Récupère la liste des modèles d'IA disponibles
    """
    try:
        # Récupérer les paramètres actuels (mode, modèles actifs)
        settings = ai_service.get_settings()

        # Récupérer les modèles depuis le registre
        registry_online = model_registry.get_models(type='online')
        registry_local = model_registry.get_models(type='local')

        models = []

        # Online: garder l'id legacy (model_id, ex: 'gpt-4o') pour compat UI
        for m in registry_online:
            legacy_id = m.get('model_id')
            is_active = settings.get('mode') == 'online' and settings.get('online_model') == legacy_id
            is_usable = bool(m.get('is_usable', False))
            name = m.get('name', legacy_id) + ('' if is_usable else ' (API Key manquante)')
            models.append({
                'id': legacy_id,
                'name': name,
                'type': 'online',
                'is_active': is_active,
                'is_usable': is_usable
            })

        # Local: n'afficher QUE les modèles installés; id complet (ex: 'llama3:latest')
        for m in registry_local:
            full = m.get('model_id') or ''
            if not m.get('installed', False):
                continue
            short_id = full.split(':')[0] if ':' in full else full
            is_active = settings.get('mode') == 'local' and (
                settings.get('local_model') == full or settings.get('local_model') == short_id
            )
            models.append({
                'id': full,
                'name': m.get('name', short_id),
                'type': 'local',
                'is_active': is_active,
                'is_usable': True
            })

        # Fallback si vide
        if not models:
            models.append({'id': 'default', 'name': 'Modèle par défaut (non configuré)', 'type': 'online', 'is_active': True})

        models.sort(key=lambda x: x['name'])

        return jsonify({'success': True, 'models': models, 'current_mode': settings.get('mode', 'online')})
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des modèles d'IA: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_bp.route('/models/refresh', methods=['POST'])
def refresh_ai_models():
    """Force un rafraîchissement du registre de modèles (fichiers + découverte)."""
    try:
        cache = model_registry.refresh()
        return jsonify({'success': True, 'refreshed_at': cache.get('refreshed_at'), 'count': len(cache.get('models', []))})
    except Exception as e:
        logger.error(f"Erreur lors du rafraîchissement des modèles: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@ai_bp.route('/models/user', methods=['GET'])
def get_user_models_config():
    """Retourne la configuration utilisateur (models.user.json)."""
    try:
        cfg = model_registry.get_user_config()
        return jsonify({'success': True, 'config': cfg})
    except Exception as e:
        logger.error(f"Erreur lecture user models config: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@ai_bp.route('/models/user', methods=['POST'])
def save_user_models_config():
    """Enregistre la configuration utilisateur (models.user.json) et rafraîchit le registre."""
    try:
        body = request.json or {}
        cache = model_registry.save_user_config(body)
        return jsonify({'success': True, 'refreshed_at': cache.get('refreshed_at')})
    except Exception as e:
        logger.error(f"Erreur écriture user models config: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
@ai_bp.route('/pipelines', methods=['GET'])
def get_pipelines():
    """Retourne la liste fusionnée des pipelines (cache)."""
    try:
        cache = pipeline_registry.get_cache()
        return jsonify({'success': True, 'pipelines': cache.get('pipelines', [])})
    except Exception as e:
        logger.error(f"Erreur lecture pipelines: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@ai_bp.route('/pipelines/<pipeline_id>', methods=['GET'])
def get_pipeline(pipeline_id):
    try:
        p = pipeline_registry.get_pipeline(pipeline_id)
        if not p:
            return jsonify({'success': False, 'error': 'Pipeline introuvable'}), 404
        return jsonify({'success': True, 'pipeline': p})
    except Exception as e:
        logger.error(f"Erreur lecture pipeline {pipeline_id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@ai_bp.route('/pipelines/<pipeline_id>', methods=['POST'])
def save_pipeline(pipeline_id):
    """Écrit la configuration user (remplace ou ajoute le pipeline) puis rafraîchit le cache."""
    try:
        body = request.json or {}
        # Charger l'actuel user config
        user = pipeline_registry._read_json_file(pipeline_registry.USER_PATH)
        pipes = {p.get('id'): p for p in user.get('pipelines', [])}
        pipes[pipeline_id] = body
        new_user = {"pipelines": list(pipes.values())}
        cache = pipeline_registry.save_user_config(new_user)
        return jsonify({'success': True, 'refreshed_at': cache.get('refreshed_at')})
    except Exception as e:
        logger.error(f"Erreur écriture pipeline {pipeline_id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@ai_bp.route('/pipelines/refresh', methods=['POST'])
def refresh_pipelines():
    try:
        cache = pipeline_registry.refresh()
        return jsonify({'success': True, 'refreshed_at': cache.get('refreshed_at'), 'count': len(cache.get('pipelines', []))})
    except Exception as e:
        logger.error(f"Erreur refresh pipelines: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@ai_bp.route('/use_cases', methods=['GET'])
def get_use_cases_mapping():
    """Retourne le mapping use_case → modèle issu du registre (cache)."""
    try:
        cache = model_registry.get_cache()
        return jsonify({'success': True, 'use_case_models': cache.get('use_case_models', {})})
    except Exception as e:
        logger.error(f"Erreur lecture use_cases: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@ai_bp.route('/use_cases', methods=['POST'])
def set_use_case_model():
    """Définit un modèle pour un cas d'usage puis rafraîchit le registre."""
    try:
        body = request.json or {}
        use_case = body.get('use_case')
        model_id = body.get('model_id')
        if not use_case or not model_id:
            return jsonify({'success': False, 'error': 'use_case ou model_id manquant'}), 400
        cache = model_registry.set_use_case_model(use_case, model_id)
        return jsonify({'success': True, 'refreshed_at': cache.get('refreshed_at')})
    except Exception as e:
        logger.error(f"Erreur set use_case: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@ai_bp.route('/set_active_model', methods=['POST'])
def set_active_model():
    """
    Définit le modèle d'IA actif
    """
    try:
        data = request.json
        model_id = data.get('model_id')
        
        if not model_id:
            return jsonify({
                'success': False,
                'error': 'ID de modèle non spécifié'
            }), 400
        
        # Récupérer les paramètres actuels
        settings = ai_service.get_settings()
        
        # Déterminer si le modèle est en ligne ou local (via registre) et s'il est utilisable
        model_type = None
        model_name = model_id
        is_usable = True

        # Online
        for m in model_registry.get_models(type='online'):
            if m.get('model_id') == model_id:
                model_type = 'online'
                model_name = m.get('name', model_id)
                is_usable = bool(m.get('is_usable', False))
                break
        
        # Local
        if model_type is None:
            short_local = model_id.split(':')[0] if ':' in model_id else model_id
            for m in model_registry.get_models(type='local'):
                full = m.get('model_id') or ''
                short = full.split(':')[0] if ':' in full else full
                if full == model_id or short == short_local:
                    model_type = 'local'
                    model_name = m.get('name', short)
                    is_usable = bool(m.get('installed', False))
                    model_id = full or model_id
                    break
        
        if not model_type:
            return jsonify({
                'success': False,
                'error': 'Modèle non trouvé'
            }), 404
        
        # Rejeter si non utilisable
        if not is_usable:
            return jsonify({
                'success': False,
                'error': "Modèle non utilisable (clé API manquante ou modèle non installé)"
            }), 400

        # Mettre à jour les paramètres
        settings['mode'] = model_type
        
        # Créer un dictionnaire de paramètres pour la sauvegarde
        save_settings = {
            'ai_mode': model_type,  # Utiliser ai_mode au lieu de mode pour la compatibilité
            'temperature': settings.get('temperature', 0.7),
            'max_context': settings.get('max_context', 10)
        }
        
        if model_type == 'online':
            settings['online_model'] = model_id
            save_settings['ai_provider'] = settings.get('provider', 'openai')
            save_settings['ai_model'] = model_id  # Utiliser ai_model au lieu de online_model
        else:
            # Conserver l'id complet si fourni
            settings['local_model'] = model_id
            save_settings['local_model'] = model_id
        
        # Sauvegarder les paramètres
        result = ai_service.save_settings(save_settings)
        
        if not result.get('success', False):
            return jsonify({
                'success': False,
                'error': result.get('error', 'Erreur lors de la sauvegarde des paramètres')
            }), 500
        
        return jsonify({
            'success': True,
            'model_id': model_id,
            'model_name': model_name,
            'model_type': model_type
        })
    except Exception as e:
        logger.error(f"Erreur lors de la définition du modèle d'IA actif: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_bp.route('/test_api_key', methods=['POST'])
def test_api_key():
    """
    Teste la validité d'une clé API pour un fournisseur donné
    """
    try:
        data = request.json
        provider = data.get('provider')
        api_key = data.get('api_key')
        
        if not provider or not api_key:
            return jsonify({
                'success': False,
                'error': 'Fournisseur ou clé API manquante'
            }), 400
        
        logger.info(f"=== DEBUG: Test de clé API pour le fournisseur {provider} ===")
        
        # Test différent selon le fournisseur
        if provider == 'openai':
            # Importer les bibliothèques nécessaires
            try:
                from openai import OpenAI
                client = OpenAI(api_key=api_key)
                models = client.models.list()
                
                # Récupérer les noms des modèles
                model_names = [model.id for model in models.data if model.id.startswith('gpt')]
                
                return jsonify({
                    'success': True,
                    'models': model_names
                })
            except Exception as e:
                logger.error(f"=== ERROR: Test OpenAI API échoué: {str(e)} ===")
                return jsonify({
                    'success': False,
                    'error': str(e)
                })
                
        elif provider == 'anthropic':
            # Test pour Anthropic
            try:
                from importlib import import_module
                anthropic = import_module('anthropic')
                client = anthropic.Anthropic(api_key=api_key)
                
                # Une simple requête pour vérifier que la clé est valide
                _ = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=10,
                    messages=[{"role": "user", "content": "Hello Claude"}]
                )
                
                return jsonify({
                    'success': True,
                    'models': ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"]
                })
            except Exception as e:
                logger.error(f"=== ERROR: Test Anthropic API échoué: {str(e)} ===")
                return jsonify({
                    'success': False,
                    'error': str(e)
                })
                
        else:
            return jsonify({
                'success': False,
                'error': f"Test pour le fournisseur {provider} non implémenté"
            })
            
    except Exception as e:
        logger.error(f"=== ERROR: Erreur lors du test de la clé API: {str(e)} ===")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_bp.route('/provider_api_key/<provider>', methods=['GET'])
def get_provider_api_key(provider):
    """
    Récupère la clé API pour un fournisseur spécifique
    """
    try:
        if provider not in ['openai', 'anthropic', 'google']:
            return jsonify({
                'success': False,
                'error': 'Fournisseur non reconnu'
            }), 400
            
        # Construire le nom de la clé correspondant au fournisseur
        key_name = f"{provider}_api_key"
        
        # Récupérer la clé API
        api_key = AppConfig.get_value(key_name, '')
        
        # Si pas de clé spécifique, utiliser la clé générique
        if not api_key:
            api_key = AppConfig.get_value('api_key', '')
        
        # Masquer la clé pour la réponse si elle existe
        masked_key = ''
        if api_key:
            if len(api_key) > 4:
                # Masquer la clé en ne montrant que les 4 derniers caractères
                masked_key = '*' * (len(api_key) - 4) + api_key[-4:]
            else:
                masked_key = '*' * len(api_key)
                
        logger.info(f"=== DEBUG: Récupération de la clé API pour {provider} ===")
        
        return jsonify({
            'success': True,
            'provider': provider,
            'api_key': masked_key,
            'raw_api_key': api_key,  # Clé non masquée pour le JavaScript
            'has_key': bool(api_key)
        })
        
    except Exception as e:
        logger.error(f"=== ERROR: Erreur lors de la récupération de la clé API pour {provider}: {str(e)} ===")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_bp.route('/ocr/extract', methods=['POST'])
def ocr_extract():
    """Extrait le texte d'une image via OCR (EasyOCR puis IA facultative).

    Form-data attendu :
        - image : fichier image (obligatoire)
        - use_ai : 'true' ou 'false' (optionnel, défaut : false)
    """
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'Aucun fichier image fourni'}), 400

    image_file = request.files['image']
    use_ai = request.form.get('use_ai', 'false').lower() == 'true'

    ocr_service = get_ocr_service()

    try:
        result = ocr_service.extract_text(image_file.read(), use_ai_fallback=use_ai)
        return jsonify({'success': True, **result})
    except Exception as e:
        logger.error(f"Erreur OCR : {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@ai_bp.route('/qr/extract', methods=['POST'])
def qr_extract():
    """Détecte et décode les QR codes dans une image.

    Form-data attendu :
        - image : fichier image (obligatoire)
    """
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'Aucun fichier image fourni'}), 400

    image_file = request.files['image']

    from app.services.qr_service import get_qr_service
    qr_service = get_qr_service()

    try:
        result = qr_service.detect_qr_codes(image_file.read())
        return jsonify(result)
    except Exception as e:
        logger.error(f"Erreur QR Code : {e}")
        return jsonify({'success': False, 'error': str(e)}), 500 