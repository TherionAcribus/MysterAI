from flask import Blueprint, request, jsonify, render_template, Response
from app.services.ai_service import ai_service
import logging
import os

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
            # Déterminer si le modèle est en ligne ou local
            if settings.get('online_models') and model_id in settings['online_models']:
                original_model = settings.get('online_model')
                settings['mode'] = 'online'
                settings['online_model'] = model_id
                model_used = settings['online_models'][model_id].get('name', model_id)
            elif settings.get('local_models') and model_id in settings['local_models']:
                original_model = settings.get('local_model')
                settings['mode'] = 'local'
                settings['local_model'] = model_id
                model_used = settings['local_models'][model_id].get('name', model_id)
        
        # Vérifier si on doit utiliser LangGraph
        use_langgraph = settings.get('use_langgraph', True)
        
        # Obtenir la réponse de l'IA
        if use_langgraph and use_tools:
            # Utiliser LangGraph avec les outils de plugin
            # Cette implémentation permet d'utiliser les plugins comme outils
            # pour résoudre des énigmes de géocaching
            # Importer ici pour éviter l'importation circulaire
            from app.services.langgraph_service import langgraph_service
            response = langgraph_service.chat(messages, system_prompt)
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
        
        # Masquer la clé API
        if settings.get('api_key'):
            masked_key = settings['api_key']
            if masked_key and len(masked_key) > 4:
                settings['api_key'] = '*' * (len(masked_key) - 4) + masked_key[-4:]
        
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
                    <label class="block text-sm font-medium mb-1">Clé API</label>
                    <div class="flex">
                        <input type="password" class="form-input flex-grow" 
                               data-ai-settings-target="apiKey" 
                               value="{settings.get('api_key', '')}"
                               placeholder="Entrez votre clé API">
                        <button type="button" class="ml-2 p-2 bg-gray-700 hover:bg-gray-600 rounded" 
                                data-action="click->ai-settings#toggleApiKeyVisibility">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Modèle -->
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-1">Modèle</label>
                    <select class="form-select w-full" data-ai-settings-target="onlineModel">
                        <!-- OpenAI Models -->
                        <optgroup label="OpenAI" data-provider="openai">
                            <option value="gpt-4o" {"selected" if settings.get('ai_model') == 'gpt-4o' else ""}>GPT-4o</option>
                            <option value="gpt-4-turbo" {"selected" if settings.get('ai_model') == 'gpt-4-turbo' else ""}>GPT-4 Turbo</option>
                            <option value="gpt-3.5-turbo" {"selected" if settings.get('ai_model') == 'gpt-3.5-turbo' else ""}>GPT-3.5 Turbo</option>
                        </optgroup>
                        <!-- Anthropic Models -->
                        <optgroup label="Anthropic" data-provider="anthropic">
                            <option value="claude-3-opus" {"selected" if settings.get('ai_model') == 'claude-3-opus' else ""}>Claude 3 Opus</option>
                            <option value="claude-3-sonnet" {"selected" if settings.get('ai_model') == 'claude-3-sonnet' else ""}>Claude 3 Sonnet</option>
                            <option value="claude-3-haiku" {"selected" if settings.get('ai_model') == 'claude-3-haiku' else ""}>Claude 3 Haiku</option>
                        </optgroup>
                        <!-- Google Models -->
                        <optgroup label="Google" data-provider="google">
                            <option value="gemini-pro" {"selected" if settings.get('ai_model') == 'gemini-pro' else ""}>Gemini Pro</option>
                            <option value="gemini-ultra" {"selected" if settings.get('ai_model') == 'gemini-ultra' else ""}>Gemini Ultra</option>
                        </optgroup>
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
                        <option value="deepseek-coder:latest" {"selected" if settings.get('local_model') == 'deepseek-coder:latest' else ""}>DeepSeek Coder</option>
                        <option value="deepseek-v3:latest" {"selected" if settings.get('local_model') == 'deepseek-v3:latest' else ""}>DeepSeek V3</option>
                        <option value="deepseek-r1:latest" {"selected" if settings.get('local_model') == 'deepseek-r1:latest' else ""}>DeepSeek R1</option>
                        <option value="gwent:latest" {"selected" if settings.get('local_model') == 'gwent:latest' else ""}>Gwent</option>
                        <option value="mistral:latest" {"selected" if settings.get('local_model') == 'mistral:latest' else ""}>Mistral</option>
                        <option value="llama3:latest" {"selected" if settings.get('local_model') == 'llama3:latest' else ""}>Llama 3</option>
                        <option value="phi3:latest" {"selected" if settings.get('local_model') == 'phi3:latest' else ""}>Phi-3</option>
                    </select>
                </div>
                
                <!-- Bouton pour vérifier la connexion Ollama -->
                <div class="mb-4">
                    <button type="button" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                            data-action="click->ai-settings#testOllamaConnection">
                        Tester la connexion
                    </button>
                    <span class="ml-2 text-sm" data-ai-settings-target="connectionStatus"></span>
                </div>
                
                <!-- Modèles locaux disponibles -->
                <div class="mb-4">
                    <h4 class="text-sm font-medium mb-2">Modèles locaux disponibles</h4>
                    <div class="bg-gray-800 p-3 rounded">
                        <div class="grid grid-cols-2 gap-2">
                            <!-- Llama 3 -->
                            <div class="flex items-center">
                                <input type="checkbox" id="enable-llama3" class="mr-2 form-checkbox"
                                       data-ai-settings-target="localModelEnabled"
                                       data-model-id="llama3"
                                       {"checked" if settings.get('local_models', {}).get('llama3', {}).get('enabled', False) else ""}>
                                <label for="enable-llama3">Llama 3</label>
                            </div>
                            
                            <!-- Mistral -->
                            <div class="flex items-center">
                                <input type="checkbox" id="enable-mistral" class="mr-2 form-checkbox"
                                       data-ai-settings-target="localModelEnabled"
                                       data-model-id="mistral"
                                       {"checked" if settings.get('local_models', {}).get('mistral', {}).get('enabled', False) else ""}>
                                <label for="enable-mistral">Mistral</label>
                            </div>
                            
                            <!-- DeepSeek Coder -->
                            <div class="flex items-center">
                                <input type="checkbox" id="enable-deepseek-coder" class="mr-2 form-checkbox"
                                       data-ai-settings-target="localModelEnabled"
                                       data-model-id="deepseek-coder"
                                       {"checked" if settings.get('local_models', {}).get('deepseek-coder', {}).get('enabled', False) else ""}>
                                <label for="enable-deepseek-coder">DeepSeek Coder</label>
                            </div>
                            
                            <!-- Phi-3 -->
                            <div class="flex items-center">
                                <input type="checkbox" id="enable-phi3" class="mr-2 form-checkbox"
                                       data-ai-settings-target="localModelEnabled"
                                       data-model-id="phi3"
                                       {"checked" if settings.get('local_models', {}).get('phi3', {}).get('enabled', False) else ""}>
                                <label for="enable-phi3">Phi-3</label>
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
        # Récupérer les paramètres actuels
        settings = ai_service.get_settings()
        
        # Construire la liste des modèles
        models = []
        
        # Modèles en ligne (OpenAI, etc.) - uniquement si une clé API est configurée
        if settings.get('online_models') and settings.get('api_key'):
            for model_id, model_info in settings['online_models'].items():
                # Vérifier si le modèle correspond au fournisseur actuel
                provider = settings.get('provider', 'openai')
                
                # Filtrer selon le fournisseur (à adapter selon votre structure)
                if (provider == 'openai' and model_id.startswith('gpt')) or \
                   (provider == 'anthropic' and model_id.startswith('claude')) or \
                   (provider == 'google' and model_id.startswith('gemini')):
                    models.append({
                        'id': model_id,
                        'name': model_info.get('name', model_id),
                        'type': 'online',
                        'is_active': settings.get('mode') == 'online' and settings.get('online_model') == model_id
                    })
        
        # Modèles locaux (Ollama, etc.) - uniquement ceux marqués comme enabled
        if settings.get('local_models'):
            for model_id, model_info in settings['local_models'].items():
                if model_info.get('enabled', False):
                    models.append({
                        'id': model_id,
                        'name': model_info.get('name', model_id),
                        'type': 'local',
                        'is_active': settings.get('mode') == 'local' and settings.get('local_model') == model_id
                    })
        
        # Si aucun modèle n'est disponible, ajouter un modèle par défaut
        if not models:
            models.append({
                'id': 'default',
                'name': 'Modèle par défaut (non configuré)',
                'type': 'online',
                'is_active': True
            })
        
        # Trier les modèles par nom
        models.sort(key=lambda x: x['name'])
        
        return jsonify({
            'success': True,
            'models': models,
            'current_mode': settings.get('mode', 'online')
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des modèles d'IA: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

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
        
        # Déterminer si le modèle est en ligne ou local
        model_type = None
        model_name = model_id
        
        # Vérifier dans les modèles en ligne
        if settings.get('online_models') and model_id in settings['online_models']:
            model_type = 'online'
            model_name = settings['online_models'][model_id].get('name', model_id)
        
        # Vérifier dans les modèles locaux
        elif settings.get('local_models') and model_id in settings['local_models']:
            model_type = 'local'
            model_name = settings['local_models'][model_id].get('name', model_id)
        
        if not model_type:
            return jsonify({
                'success': False,
                'error': 'Modèle non trouvé'
            }), 404
        
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