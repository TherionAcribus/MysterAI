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
    """Envoie un message à l'IA et retourne la réponse"""
    data = request.json
    messages = data.get('messages', [])
    system_prompt = data.get('system_prompt')
    
    response = ai_service.chat(messages, system_prompt)
    
    return jsonify({
        'response': response
    })

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