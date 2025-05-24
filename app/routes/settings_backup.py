from flask import Blueprint, jsonify, request, render_template
from app.models.app_config import AppConfig
import logging

# Configurer le logger
logger = logging.getLogger(__name__)

# Créer un blueprint pour les routes de paramètres
settings_bp = Blueprint('settings', __name__, url_prefix='/api/settings')

@settings_bp.route('/general_panel', methods=['GET'])
def get_general_settings_panel():
    """
    Retourne le template HTML pour les paramètres généraux
    """
    logger.info("=== DEBUG: Route /api/settings/general_panel appelée ===")
    try:
        html = render_template('settings/general_settings.html')
        logger.info("=== DEBUG: Template des paramètres généraux rendu avec succès ===")
        return html
    except Exception as e:
        logger.error(f"=== ERREUR lors du rendu du template: {str(e)} ===")
        return f"Erreur lors du chargement des paramètres: {str(e)}", 500

@settings_bp.route('/formula_panel', methods=['GET'])
def get_formula_settings_panel():
    """
    Retourne le template HTML pour les paramètres du Formula Solver
    """
    logger.info("=== DEBUG: Route /api/settings/formula_panel appelée ===")
    try:
        html = render_template('settings/formula_settings.html')
        logger.info("=== DEBUG: Template des paramètres Formula Solver rendu avec succès ===")
        return html
    except Exception as e:
        logger.error(f"=== ERREUR lors du rendu du template: {str(e)} ===")
        return f"Erreur lors du chargement des paramètres: {str(e)}", 500

@settings_bp.route('/general', methods=['GET'])
def get_general_settings():
    """
    Récupère les paramètres généraux
    """
    logger.info("=== DEBUG: Route /api/settings/general appelée ===")
    try:
        settings = {
            'auto_mark_solved': AppConfig.get_value('auto_mark_solved', True),
            'auto_correct_coordinates': AppConfig.get_value('auto_correct_coordinates', True),
            'enable_auto_scoring': AppConfig.get_value('enable_auto_scoring', True)
        }
        
        # Générer une version de cache basée sur le timestamp
        from datetime import datetime
        cache_version = datetime.now().strftime("%H:%M:%S")
        
        logger.info(f"=== DEBUG: Paramètres récupérés: {settings} ===")
        return jsonify({
            'success': True,
            'settings': settings,
            'cache_version': cache_version,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"=== ERREUR lors de la récupération des paramètres: {str(e)} ===")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@settings_bp.route('/formula', methods=['GET'])
def get_formula_settings():
    """
    Récupère les paramètres du Formula Solver
    """
    logger.info("=== DEBUG: Route /api/settings/formula appelée ===")
    try:
        settings = {
            'formula_extraction_method': AppConfig.get_value('formula_extraction_method', 'regex'),
            'question_extraction_method': AppConfig.get_value('question_extraction_method', 'regex')
        }
        
        logger.info(f"=== DEBUG: Paramètres Formula Solver récupérés: {settings} ===")
        return jsonify({
            'success': True,
            'settings': settings
        })
    except Exception as e:
        logger.error(f"=== ERREUR lors de la récupération des paramètres Formula Solver: {str(e)} ===")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@settings_bp.route('/general/save', methods=['POST'])
def save_general_settings():
    """
    Enregistre les paramètres généraux
    """
    try:
        data = request.get_json()
        logger.info(f"=== DEBUG: Données reçues pour enregistrement: {data} ===")
        
        # Valider les données
        if not isinstance(data, dict):
            return jsonify({
                'success': False,
                'error': 'Format de données invalide'
            }), 400
        
        # Enregistrer les paramètres
        AppConfig.set_value(
            'auto_mark_solved', 
            data.get('auto_mark_solved', True),
            category='general',
            description='Marquer automatiquement une géocache comme "résolue" quand on corrige les coordonnées'
        )
        
        AppConfig.set_value(
            'auto_correct_coordinates', 
            data.get('auto_correct_coordinates', True),
            category='general',
            description='Dans le Solver, corriger automatiquement les coordonnées quand on trouve des coordonnées valides'
        )
        
        AppConfig.set_value(
            'enable_auto_scoring', 
            data.get('enable_auto_scoring', True),
            category='general',
            description='Activer le système de scoring automatique pour évaluer la pertinence des résultats de déchiffrement'
        )
        
        # Générer une version de cache basée sur le timestamp
        from datetime import datetime
        cache_version = datetime.now().strftime("%H:%M:%S")
        
        logger.info("=== DEBUG: Paramètres enregistrés avec succès ===")
        return jsonify({
            'success': True,
            'message': 'Paramètres enregistrés avec succès',
            'cache_version': cache_version,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"=== ERREUR lors de l'enregistrement des paramètres: {str(e)} ===")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@settings_bp.route('/formula/save', methods=['POST'])
def save_formula_settings():
    """
    Enregistre les paramètres du Formula Solver
    """
    try:
        data = request.get_json()
        logger.info(f"=== DEBUG: Données reçues pour enregistrement Formula Solver: {data} ===")
        
        # Valider les données
        if not isinstance(data, dict):
            return jsonify({
                'success': False,
                'error': 'Format de données invalide'
            }), 400
        
        # Récupérer les méthodes d'extraction
        formula_extraction_method = data.get('formula_extraction_method', 'regex')
        question_extraction_method = data.get('question_extraction_method', 'regex')
        
        logger.info(f"=== DEBUG: Méthode d'extraction de formule à enregistrer: {formula_extraction_method} ===")
        logger.info(f"=== DEBUG: Méthode d'extraction de question à enregistrer: {question_extraction_method} ===")
        
        # Enregistrer les paramètres
        result1 = AppConfig.set_value(
            'formula_extraction_method', 
            formula_extraction_method,
            category='formula',
            description='Méthode d\'extraction des formules (ia ou regex)'
        )
        
        result2 = AppConfig.set_value(
            'question_extraction_method', 
            question_extraction_method,
            category='formula',
            description='Méthode d\'extraction des questions (ia ou regex)'
        )
        
        # Vérifier l'enregistrement
        saved_formula_value = AppConfig.get_value('formula_extraction_method', 'regex')
        saved_question_value = AppConfig.get_value('question_extraction_method', 'regex')
        
        logger.info(f"=== DEBUG: Valeur de formule enregistrée en base: {saved_formula_value} ===")
        logger.info(f"=== DEBUG: Valeur de question enregistrée en base: {saved_question_value} ===")
        
        logger.info("=== DEBUG: Paramètres Formula Solver enregistrés avec succès ===")
        return jsonify({
            'success': True,
            'message': 'Paramètres enregistrés avec succès',
            'saved_values': {
                'formula_extraction_method': saved_formula_value,
                'question_extraction_method': saved_question_value
            }
        })
        
    except Exception as e:
        logger.error(f"=== ERREUR lors de l'enregistrement des paramètres Formula Solver: {str(e)} ===")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@settings_bp.route('/param/<param_name>', methods=['GET'])
def get_specific_param(param_name):
    """
    Récupère la valeur d'un paramètre spécifique par son nom
    """
    logger.info(f"=== DEBUG: Route /api/settings/param/{param_name} appelée ===")
    try:
        value = AppConfig.get_value(param_name)
        logger.info(f"=== DEBUG: Valeur récupérée pour {param_name}: {value} ===")
        return jsonify({
            'success': True,
            'key': param_name,
            'value': value
        })
    except Exception as e:
        logger.error(f"=== ERREUR lors de la récupération du paramètre {param_name}: {str(e)} ===")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@settings_bp.route('/param/debug/set/<param_name>/<param_value>', methods=['GET'])
def debug_set_param(param_name, param_value):
    """
    Route de débogage pour définir rapidement un paramètre
    """
    logger.info(f"=== DEBUG: Route de débogage pour définir {param_name}={param_value} ===")
    try:
        # Convertir param_value au format approprié
        if param_value.lower() == 'true':
            value = True
        elif param_value.lower() == 'false':
            value = False
        elif param_value.isdigit():
            value = int(param_value)
        else:
            value = param_value
            
        # Enregistrer la valeur
        AppConfig.set_value(param_name, value, category='general')
        
        logger.info(f"=== DEBUG: Paramètre {param_name} défini à {value} ===")
        return jsonify({
            'success': True,
            'message': f"Paramètre {param_name} défini à {value}"
        })
    except Exception as e:
        logger.error(f"=== ERREUR lors de la définition du paramètre {param_name}: {str(e)} ===")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@settings_bp.route('/test_simple', methods=['GET'])
def test_simple_settings():
    """
    Page de test ultra-simple pour le système de settings amélioré
    """
    logger.info("=== DEBUG: Route /api/settings/test_simple appelée ===")
   
    html_content = """
<!DOCTYPE html>
<html lang="fr" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Système Settings Amélioré</title>
    <script src="https://cdn.tailwindcss.com"></script>
   
    <style>
        body {
            background-color: #1a1a1a;
            color: #e5e5e5;
        }
    </style>
</head>
<body class="p-8">
    <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold mb-8 text-center">🚀 Système Settings Amélioré</h1>
       
        <!-- Statut du système -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-green-900/30 border border-green-700 rounded-lg p-4">
                <h3 class="text-lg font-semibold mb-2 text-green-400">✅ Architecture Modulaire</h3>
                <div class="text-sm space-y-1">
                    <div>• Classe de base réutilisable</div>
                    <div>• Contrôleurs spécialisés</div>
                    <div>• Templates modulaires</div>
                </div>
            </div>
            
            <div class="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                <h3 class="text-lg font-semibold mb-2 text-blue-400">⚡ Fonctionnalités</h3>
                <div class="text-sm space-y-1">
                    <div>• Auto-save avec debounce</div>
                    <div>• Indicateurs visuels</div>
                    <div>• Gestion d'erreurs robuste</div>
                </div>
            </div>
            
            <div class="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
                <h3 class="text-lg font-semibold mb-2 text-purple-400">🔧 UX/UI</h3>
                <div class="text-sm space-y-1">
                    <div>• Interface responsive</div>
                    <div>• Notifications intelligentes</div>
                    <div>• Protection perte données</div>
                </div>
            </div>
        </div>
       
        <!-- Paramètres Généraux -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6">
            <div id="general-settings-container">
                <!-- Le template sera chargé ici -->
                <p class="text-gray-400">Chargement des paramètres généraux...</p>
            </div>
        </div>
       
        <!-- Console de débogage -->
        <div class="bg-gray-900 rounded-lg p-4">
            <h3 class="text-lg font-semibold mb-2">🔍 Console de Débogage</h3>
            <div id="debug-console" class="h-40 overflow-y-auto text-sm font-mono bg-black p-3 rounded">
                <div class="text-green-400">[INIT] Système de settings amélioré initialisé...</div>
            </div>
        </div>
        
        <!-- Instructions d'utilisation -->
        <div class="mt-8 bg-blue-900/20 border border-blue-700 rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-4 text-blue-400">📖 Comment utiliser ce système</h3>
            <div class="space-y-3 text-sm">
                <div><strong>1. Créer un nouveau type de settings :</strong></div>
                <div class="ml-4 bg-gray-800 p-3 rounded font-mono text-xs">
                    // Hériter de BaseSettingsController<br>
                    import BaseSettingsController from './base_settings_controller.js'<br>
                    export default class extends BaseSettingsController { ... }
                </div>
                
                <div><strong>2. Définir les méthodes requises :</strong></div>
                <div class="ml-4 bg-gray-800 p-3 rounded font-mono text-xs">
                    apiEndpoint = '/api/settings/mon-type'<br>
                    gatherSettings() { return {...} }<br>
                    updateUI(settings) { ... }<br>
                    getDefaults() { return {...} }
                </div>
                
                <div><strong>3. Ajouter les routes API correspondantes</strong></div>
                <div><strong>4. Créer le template HTML avec les targets appropriés</strong></div>
            </div>
        </div>
    </div>

    <script type="module">
        // Console de debug
        function addToConsole(message, type = 'info') {
            const console = document.getElementById('debug-console');
            const div = document.createElement('div');
            div.className = type === 'error' ? 'text-red-400' :
                          type === 'success' ? 'text-green-400' :
                          type === 'warning' ? 'text-yellow-400' : 'text-blue-400';
            div.innerHTML = `[${new Date().toLocaleTimeString()}] ${message}`;
            console.appendChild(div);
            console.scrollTop = console.scrollHeight;
        }
       
        // Importer dynamiquement Stimulus
        async function initStimulus() {
            try {
                addToConsole('Importation de Stimulus...', 'info')
                const { Application } = await import('https://unpkg.com/@hotwired/stimulus/dist/stimulus.js')
                window.Stimulus = Application.start()
                addToConsole('✅ Stimulus démarré', 'success')
                
                // Charger le contrôleur général
                addToConsole('Chargement du contrôleur général...', 'info')
                const GeneralController = await import('/js/controllers/general_settings_controller.js')
                window.Stimulus.register('general-settings', GeneralController.default)
                addToConsole('✅ Contrôleur général enregistré', 'success')
                
                // Charger le template
                addToConsole('Chargement du template...', 'info')
                const response = await fetch('/api/settings/general_panel')
                if (response.ok) {
                    const html = await response.text()
                    document.getElementById('general-settings-container').innerHTML = html
                    addToConsole('✅ Template chargé et connecté', 'success')
                } else {
                    throw new Error(`HTTP ${response.status}`)
                }
                
            } catch (error) {
                addToConsole(`❌ Erreur: ${error.message}`, 'error')
                console.error(error)
            }
        }
       
        // Démarrer l'application
        initStimulus()
        
        // Log des événements pour debug
        document.addEventListener('stimulus:connect', (event) => {
            addToConsole(`🔗 Contrôleur connecté: ${event.detail.controller.identifier}`, 'success')
        })
        
        document.addEventListener('stimulus:disconnect', (event) => {
            addToConsole(`🔌 Contrôleur déconnecté: ${event.detail.controller.identifier}`, 'warning')
        })
    </script>
</body>
</html>
"""
   
    return html_content

@settings_bp.route('/test_compatible', methods=['GET'])
def test_compatible_settings():
    """
    Page de test compatible avec l'architecture Stimulus existante
    """
    logger.info("=== DEBUG: Route /api/settings/test_compatible appelée ===")
   
    html_content = """
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Settings Compatible</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/@hotwired/stimulus/dist/stimulus.umd.js"></script>
   
    <style>
        body { background-color: #1a1a1a; color: #e5e5e5; }
    </style>
</head>
<body class="p-8">
    <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold mb-8 text-center">🔧 Test Système Settings Compatible</h1>
       
        <!-- Statut du chargement -->
        <div id="loading-status" class="mb-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
            <h3 class="text-lg font-semibold mb-2 text-blue-400">📡 Statut du Chargement</h3>
            <div id="status-list" class="text-sm space-y-1">
                <div>⏳ Initialisation...</div>
            </div>
        </div>
       
        <!-- Paramètres Généraux -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 class="text-xl font-semibold mb-4">Paramètres Généraux</h2>
            <div id="general-settings-container">
                <p class="text-gray-400">Chargement des paramètres généraux...</p>
            </div>
        </div>
       
        <!-- Paramètres Formula Solver -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 class="text-xl font-semibold mb-4">Paramètres Formula Solver</h2>
            <div id="formula-settings-container">
                <p class="text-gray-400">Chargement des paramètres Formula Solver...</p>
            </div>
        </div>
       
        <!-- Console -->
        <div class="bg-gray-900 rounded-lg p-4">
            <h3 class="text-lg font-semibold mb-2">🖥️ Console</h3>
            <div id="console" class="h-32 overflow-y-auto text-sm font-mono bg-black p-2 rounded"></div>
        </div>
    </div>

    <script>
        // Utilitaires
        function addToStatus(message) {
            const statusList = document.getElementById('status-list');
            const div = document.createElement('div');
            div.textContent = `✅ ${message}`;
            statusList.appendChild(div);
        }
        
        function addToConsole(message, type = 'info') {
            const console = document.getElementById('console');
            const div = document.createElement('div');
            div.className = type === 'error' ? 'text-red-400' : 
                          type === 'success' ? 'text-green-400' : 'text-blue-400';
            div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            console.appendChild(div);
            console.scrollTop = console.scrollHeight;
        }
        
        // Initialiser Stimulus
        addToConsole('Initialisation de Stimulus...');
        window.Stimulus = Stimulus.Application.start();
        window.application = window.Stimulus; // Alias pour compatibilité
        addToStatus('Stimulus initialisé');
        addToConsole('✅ Stimulus prêt');
        
        // Charger les contrôleurs dans l'ordre
        async function loadControllers() {
            try {
                // 1. Charger BaseSettingsController
                addToConsole('Chargement de BaseSettingsController...');
                await loadScript('/js/controllers/base_settings_controller.js');
                addToStatus('BaseSettingsController chargé');
                
                // Attendre un peu pour s'assurer que la classe est disponible
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // 2. Charger les contrôleurs spécialisés
                addToConsole('Chargement des contrôleurs spécialisés...');
                await Promise.all([
                    loadScript('/js/controllers/general_settings_controller.js'),
                    loadScript('/js/controllers/formula_settings_controller.js')
                ]);
                addToStatus('Contrôleurs spécialisés chargés');
                
                // 3. Charger les templates
                addToConsole('Chargement des templates...');
                await loadTemplates();
                addToStatus('Templates chargés et connectés');
                
                addToConsole('🎉 Système complètement initialisé !', 'success');
                
            } catch (error) {
                addToConsole(`❌ Erreur: ${error.message}`, 'error');
            }
        }
        
        function loadScript(src) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = () => reject(new Error(`Impossible de charger ${src}`));
                document.head.appendChild(script);
            });
        }
        
        async function loadTemplates() {
            // Charger template général
            const generalResponse = await fetch('/api/settings/general_panel');
            if (generalResponse.ok) {
                const generalHtml = await generalResponse.text();
                document.getElementById('general-settings-container').innerHTML = generalHtml;
            }
            
            // Charger template formula
            const formulaResponse = await fetch('/api/settings/formula_panel');
            if (formulaResponse.ok) {
                const formulaHtml = await formulaResponse.text();
                document.getElementById('formula-settings-container').innerHTML = formulaHtml;
            }
        }
        
        // Démarrer le chargement
        loadControllers();
    </script>
</body>
</html>
"""
   
    return html_content 

@settings_bp.route('/test_robust', methods=['GET'])
def test_robust_settings():
    """
    Page de test robuste qui utilise le chargeur indépendant
    """
    logger.info("=== DEBUG: Route /api/settings/test_robust appelée ===")
   
    html_content = """
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Settings Robuste</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/@hotwired/stimulus/dist/stimulus.umd.js"></script>
   
    <style>
        body { background-color: #1a1a1a; color: #e5e5e5; }
        .status-item { transition: all 0.3s ease; }
        .status-item.completed { opacity: 0.7; }
    </style>
</head>
<body class="p-8">
    <div class="max-w-5xl mx-auto">
        <h1 class="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            🚀 Test Système Settings Robuste
        </h1>
       
        <!-- Statut du chargement -->
        <div class="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h3 class="text-lg font-semibold mb-4 text-blue-400">📡 Statut du Chargement</h3>
                <div id="status-list" class="space-y-2 text-sm"></div>
            </div>
            
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h3 class="text-lg font-semibold mb-4 text-green-400">✅ Fonctionnalités</h3>
                <div class="space-y-2 text-sm">
                    <div>• Auto-save avec debounce (2s)</div>
                    <div>• Indicateurs visuels temps réel</div>
                    <div>• Gestion d'erreurs robuste</div>
                    <div>• Architecture modulaire</div>
                    <div>• Compatibilité Stimulus globale</div>
                </div>
            </div>
        </div>
       
        <!-- Paramètres Généraux -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
            <h2 class="text-xl font-semibold mb-4 flex items-center">
                <span class="mr-3">⚙️</span>
                Paramètres Généraux
                <span id="general-status" class="ml-auto text-sm px-2 py-1 rounded bg-yellow-600">Chargement...</span>
            </h2>
            <div id="general-settings-container">
                <div class="animate-pulse flex space-x-4">
                    <div class="rounded bg-gray-700 h-4 w-4"></div>
                    <div class="flex-1 space-y-2">
                        <div class="h-4 bg-gray-700 rounded w-3/4"></div>
                        <div class="h-4 bg-gray-700 rounded w-1/2"></div>
                    </div>
                </div>
            </div>
        </div>
       
        <!-- Paramètres Formula Solver -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
            <h2 class="text-xl font-semibold mb-4 flex items-center">
                <span class="mr-3">🔬</span>
                Paramètres Formula Solver
                <span id="formula-status" class="ml-auto text-sm px-2 py-1 rounded bg-yellow-600">Chargement...</span>
            </h2>
            <div id="formula-settings-container">
                <div class="animate-pulse flex space-x-4">
                    <div class="rounded bg-gray-700 h-10 w-full"></div>
                </div>
            </div>
        </div>
       
        <!-- Console de développement -->
        <div class="bg-gray-900 rounded-lg p-6 border border-gray-600">
            <h3 class="text-lg font-semibold mb-4 text-amber-400">🖥️ Console de Développement</h3>
            <div id="console" class="h-40 overflow-y-auto text-sm font-mono bg-black p-4 rounded border"></div>
            <div class="mt-4 flex space-x-2">
                <button onclick="clearConsole()" class="px-3 py-1 bg-gray-700 text-white rounded text-sm hover:bg-gray-600">
                    Effacer
                </button>
                <button onclick="testSettings()" class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                    Test Manuel
                </button>
            </div>
        </div>
    </div>

    <script>
        // === UTILITAIRES ===
        
        function addToStatus(message, isCompleted = false) {
            const statusList = document.getElementById('status-list');
            const div = document.createElement('div');
            div.className = `status-item flex items-center space-x-2 ${isCompleted ? 'completed' : ''}`;
            div.innerHTML = `
                <span class="text-green-400">✅</span>
                <span>${message}</span>
                <span class="text-xs text-gray-500">[${new Date().toLocaleTimeString()}]</span>
            `;
            statusList.appendChild(div);
        }
        
        function addToConsole(message, type = 'info') {
            const console = document.getElementById('console');
            const div = document.createElement('div');
            const colors = {
                'error': 'text-red-400',
                'success': 'text-green-400', 
                'warning': 'text-yellow-400',
                'info': 'text-blue-400'
            };
            div.className = colors[type] || 'text-gray-300';
            div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            console.appendChild(div);
            console.scrollTop = console.scrollHeight;
        }
        
        function updateStatus(containerId, status, color) {
            const element = document.getElementById(containerId);
            if (element) {
                element.textContent = status;
                element.className = success ? 'text-green-400' : 'text-red-400';
            }
        }
        
        function clearConsole() {
            document.getElementById('console').innerHTML = '';
        }
        
        function testSettings() {
            addToConsole('🧪 Test manuel démarré...', 'info');
            if (window.BaseSettingsController) {
                addToConsole('✅ BaseSettingsController disponible', 'success');
            } else {
                addToConsole('❌ BaseSettingsController non disponible', 'error');
            }
        }

        // === INITIALISATION ===
        
        addToConsole('🚀 Initialisation de la page de test...', 'info');
        
        // Initialiser Stimulus
        window.Stimulus = Stimulus.Application.start();
        window.application = window.Stimulus;
        addToStatus('Stimulus initialisé');
        addToConsole('✅ Stimulus prêt', 'success');
        
        // Écouter les événements du système
        window.addEventListener('BaseSettingsControllerReady', () => {
            addToStatus('BaseSettingsController prêt');
            addToConsole('✅ BaseSettingsController disponible', 'success');
        });
        
        window.addEventListener('SettingsSystemReady', (event) => {
            addToStatus('Système complet prêt');
            addToConsole(`🎉 Système prêt avec contrôleurs: ${event.detail.controllers.join(', ')}`, 'success');
            loadTemplates();
        });
        
        // Charger les templates
        async function loadTemplates() {
            try {
                addToConsole('📦 Chargement des templates...', 'info');
                
                // Template général
                const generalResponse = await fetch('/api/settings/general_panel');
                if (generalResponse.ok) {
                    const generalHtml = await generalResponse.text();
                    document.getElementById('general-settings-container').innerHTML = generalHtml;
                    updateStatus('general-status', 'Actif', true);
                    addToConsole('✅ Template général chargé', 'success');
                } else {
                    throw new Error(`Erreur général: ${generalResponse.status}`);
                }
                
                // Template formula
                const formulaResponse = await fetch('/api/settings/formula_panel');
                if (formulaResponse.ok) {
                    const formulaHtml = await formulaResponse.text();
                    document.getElementById('formula-settings-container').innerHTML = formulaHtml;
                    updateStatus('formula-status', 'Actif', true);
                    addToConsole('✅ Template Formula Solver chargé', 'success');
                } else {
                    throw new Error(`Erreur formula: ${formulaResponse.status}`);
                }
                
                addToStatus('Templates chargés et connectés');
                addToConsole('🎉 Tous les templates sont actifs !', 'success');
                
            } catch (error) {
                addToConsole(`❌ Erreur templates: ${error.message}`, 'error');
                updateStatus('general-status', 'Erreur', 'bg-red-600');
                updateStatus('formula-status', 'Erreur', 'bg-red-600');
            }
        }
        
    </script>
    
    <!-- Charger le système de settings -->
    <script src="/js/settings_loader.js"></script>
</body>
</html>
"""
   
    return html_content 

@settings_bp.route('/test_debug', methods=['GET'])
def test_debug_settings():
    """
    Page de test avec débogage détaillé
    """
    logger.info("=== DEBUG: Route /api/settings/test_debug appelée ===")
   
    html_content = """
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Settings - Débogage</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/@hotwired/stimulus/dist/stimulus.umd.js"></script>
   
    <style>
        body { background-color: #1a1a1a; color: #e5e5e5; }
        .console-line { font-family: 'Courier New', monospace; }
    </style>
</head>
<body class="p-8">
    <div class="max-w-6xl mx-auto">
        <h1 class="text-3xl font-bold mb-8 text-center text-red-400">
            🔧 Mode Débogage - Système Settings
        </h1>
       
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- État du système -->
            <div class="bg-gray-800 rounded-lg p-6">
                <h3 class="text-lg font-semibold mb-4 text-blue-400">📊 État du Système</h3>
                <div id="system-status" class="space-y-2 text-sm">
                    <div id="stimulus-status">🔄 Vérification de Stimulus...</div>
                    <div id="base-controller-status">🔄 Vérification de BaseSettingsController...</div>
                    <div id="controllers-status">🔄 Vérification des contrôleurs...</div>
                </div>
                
                <div class="mt-4 space-x-2">
                    <button onclick="checkSystem()" class="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700">
                        Vérifier Système
                    </button>
                    <button onclick="forceReload()" class="px-3 py-1 bg-orange-600 rounded text-sm hover:bg-orange-700">
                        Forcer Rechargement
                    </button>
                </div>
            </div>
            
            <!-- Console temps réel -->
            <div class="bg-gray-900 rounded-lg p-6">
                <h3 class="text-lg font-semibold mb-4 text-yellow-400">🖥️ Console Temps Réel</h3>
                <div id="realtime-console" class="h-40 overflow-y-auto text-xs bg-black p-2 rounded"></div>
                <button onclick="clearRealtimeConsole()" class="mt-2 px-3 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600">
                    Effacer
                </button>
            </div>
        </div>
        
        <!-- Test des contrôleurs -->
        <div class="mt-8 bg-gray-800 rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-4 text-green-400">🧪 Test des Contrôleurs</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Paramètres Généraux -->
                <div class="border border-gray-600 rounded p-4">
                    <h4 class="font-semibold mb-2">Paramètres Généraux</h4>
                    <div id="general-test-container">
                        <div class="text-gray-400 text-sm">Attente du chargement...</div>
                    </div>
                </div>
                
                <!-- Paramètres Formula -->
                <div class="border border-gray-600 rounded p-4">
                    <h4 class="font-semibold mb-2">Paramètres Formula</h4>
                    <div id="formula-test-container">
                        <div class="text-gray-400 text-sm">Attente du chargement...</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Logs détaillés -->
        <div class="mt-8 bg-gray-900 rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-4 text-purple-400">📋 Logs Détaillés</h3>
            <div id="detailed-logs" class="h-60 overflow-y-auto text-xs bg-black p-4 rounded border"></div>
        </div>
    </div>

    <script>
        // === CAPTURE DES LOGS ===
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;
        
        function addToRealtimeConsole(message, type = 'info') {
            const console = document.getElementById('realtime-console');
            const div = document.createElement('div');
            div.className = `console-line ${type === 'error' ? 'text-red-400' : type === 'warn' ? 'text-yellow-400' : 'text-green-400'}`;
            div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            console.appendChild(div);
            console.scrollTop = console.scrollHeight;
        }
        
        function addToDetailedLogs(message, type = 'info') {
            const logs = document.getElementById('detailed-logs');
            const div = document.createElement('div');
            div.className = `console-line ${type === 'error' ? 'text-red-400' : type === 'warn' ? 'text-yellow-400' : 'text-blue-400'}`;
            div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            logs.appendChild(div);
            logs.scrollTop = logs.scrollHeight;
        }
        
        // Intercepter les logs de la console
        console.log = function(...args) {
            originalConsoleLog.apply(console, args);
            const message = args.join(' ');
            addToRealtimeConsole(message, 'info');
            addToDetailedLogs(message, 'info');
        };
        
        console.error = function(...args) {
            originalConsoleError.apply(console, args);
            const message = args.join(' ');
            addToRealtimeConsole(message, 'error');
            addToDetailedLogs(message, 'error');
        };
        
        console.warn = function(...args) {
            originalConsoleWarn.apply(console, args);
            const message = args.join(' ');
            addToRealtimeConsole(message, 'warn');
            addToDetailedLogs(message, 'warn');
        };
        
        // === VÉRIFICATIONS SYSTÈME ===
        
        function updateStatus(elementId, status, success) {
            const element = document.getElementById(elementId);
            element.textContent = status;
            element.className = success ? 'text-green-400' : 'text-red-400';
        }
        
        function checkSystem() {
            addToDetailedLogs('🔍 Vérification du système...', 'info');
            
            // Vérifier Stimulus
            if (window.Stimulus) {
                updateStatus('stimulus-status', '✅ Stimulus (window.Stimulus) disponible', true);
            } else if (window.StimulusApp) {
                updateStatus('stimulus-status', '✅ StimulusApp (window.StimulusApp) disponible', true);
            } else {
                updateStatus('stimulus-status', '❌ Aucune version de Stimulus trouvée', false);
            }
            
            // Vérifier BaseSettingsController
            if (window.BaseSettingsController) {
                updateStatus('base-controller-status', '✅ BaseSettingsController disponible', true);
            } else {
                updateStatus('base-controller-status', '❌ BaseSettingsController manquant', false);
            }
            
            // Vérifier les contrôleurs enregistrés
            const app = window.application || window.StimulusApp || window.Stimulus;
            if (app && app.controllers) {
                const controllers = Array.from(app.controllers).map(c => c.identifier);
                updateStatus('controllers-status', `✅ Contrôleurs: ${controllers.join(', ')}`, true);
            } else {
                updateStatus('controllers-status', '❌ Aucun contrôleur trouvé', false);
            }
        }
        
        function clearRealtimeConsole() {
            document.getElementById('realtime-console').innerHTML = '';
        }
        
        function forceReload() {
            addToDetailedLogs('🔄 Rechargement forcé du système...', 'info');
            window.location.reload();
        }
        
        // === INITIALISATION ===
        
        addToDetailedLogs('🚀 Initialisation du mode débogage...', 'info');
        
        // Initialiser Stimulus
        if (typeof Stimulus !== 'undefined') {
            window.Stimulus = Stimulus.Application.start();
            window.application = window.Stimulus;
            addToDetailedLogs('✅ Stimulus initialisé via UMD', 'info');
        } else {
            addToDetailedLogs('❌ Stimulus UMD non disponible', 'error');
        }
        
        // Vérifier immédiatement
        setTimeout(checkSystem, 500);
        
        // Écouter les événements du système
        window.addEventListener('BaseSettingsControllerReady', () => {
            addToDetailedLogs('📡 Événement BaseSettingsControllerReady reçu', 'info');
            setTimeout(checkSystem, 100);
        });
        
        // Charger le contrôleur de débogage
        async function loadDebugController() {
            try {
                addToDetailedLogs('📦 Chargement du contrôleur de débogage...', 'info');
                
                const script = document.createElement('script');
                script.src = '/js/controllers/base_settings_controller_debug.js';
                script.onload = () => {
                    addToDetailedLogs('✅ Contrôleur de débogage chargé', 'info');
                    setTimeout(checkSystem, 500);
                };
                script.onerror = () => {
                    addToDetailedLogs('❌ Erreur chargement contrôleur de débogage', 'error');
                };
                document.head.appendChild(script);
                
            } catch (error) {
                addToDetailedLogs(`❌ Erreur: ${error.message}`, 'error');
            }
        }
        
        // Démarrer le chargement
        setTimeout(loadDebugController, 1000);
        
    </script>
</body>
</html>
"""
   
    return html_content 

@settings_bp.route('/test_final', methods=['GET'])
def test_final_settings():
    """
    Page de test finale avec la version corrigée
    """
    logger.info("=== DEBUG: Route /api/settings/test_final appelée ===")
   
    html_content = """
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Settings - Version Finale</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/@hotwired/stimulus/dist/stimulus.umd.js"></script>
   
    <style>
        body { background-color: #1a1a1a; color: #e5e5e5; }
        .notification { padding: 0.5rem; margin: 0.5rem 0; border-radius: 0.25rem; }
        .notification.success { background-color: #065f46; color: #10b981; }
        .notification.error { background-color: #7f1d1d; color: #ef4444; }
        .notification.info { background-color: #1e3a8a; color: #3b82f6; }
        .notification.hidden { display: none; }
    </style>
</head>
<body class="p-8">
    <div class="max-w-4xl mx-auto">
        <h1 class="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            ✅ Test Final - Système Settings
        </h1>
       
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-green-900/30 border border-green-700 rounded-lg p-4">
                <h3 class="text-lg font-semibold mb-2 text-green-400">🎯 Objectif</h3>
                <div class="text-sm">
                    Test de la version corrigée qui devrait résoudre tous les problèmes de compatibilité Stimulus.
                </div>
            </div>
            
            <div class="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                <h3 class="text-lg font-semibold mb-2 text-blue-400">🔧 Status</h3>
                <div id="system-status" class="text-sm">
                    <div id="status-stimulus">🔄 Vérification Stimulus...</div>
                    <div id="status-base">🔄 Vérification BaseController...</div>
                    <div id="status-controllers">🔄 Vérification contrôleurs...</div>
                </div>
            </div>
            
            <div class="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
                <h3 class="text-lg font-semibold mb-2 text-purple-400">📊 Résultats</h3>
                <div id="test-results" class="text-sm">
                    <div id="result-summary">En attente...</div>
                </div>
            </div>
        </div>
       
        <!-- Test des paramètres généraux -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6" 
             data-controller="general-settings"
             data-general-settings-api-endpoint-value="/api/settings/general">
            
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold">⚙️ Paramètres Généraux</h2>
                <div class="flex items-center space-x-2">
                    <div data-general-settings-target="syncStatus" class="text-sm px-2 py-1 rounded bg-gray-700">-</div>
                    <div data-general-settings-target="loadingIndicator" class="hidden">🔄</div>
                </div>
            </div>
            
            <div data-general-settings-target="notification" class="notification hidden"></div>
            
            <div class="space-y-4">
                <label class="flex items-center space-x-3">
                    <input type="checkbox" 
                           data-general-settings-target="autoMarkSolved"
                           data-action="change->general-settings#settingChanged"
                           class="rounded">
                    <span>Marquer automatiquement comme "résolue"</span>
                </label>
                
                <label class="flex items-center space-x-3">
                    <input type="checkbox" 
                           data-general-settings-target="autoCorrectCoordinates"
                           data-action="change->general-settings#settingChanged"
                           class="rounded">
                    <span>Corriger automatiquement les coordonnées</span>
                </label>
                
                <label class="flex items-center space-x-3">
                    <input type="checkbox" 
                           data-general-settings-target="enableAutoScoring"
                           data-action="change->general-settings#settingChanged"
                           class="rounded">
                    <span>Activer le scoring automatique</span>
                </label>
            </div>
            
            <div class="mt-4 flex justify-between items-center">
                <div class="text-xs text-gray-400">
                    Cache: <span data-general-settings-target="cacheVersion">-</span>
                </div>
                <div class="space-x-2">
                    <button data-action="click->general-settings#manualSave"
                            data-general-settings-target="saveButton"
                            class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                        Sauvegarder
                    </button>
                    <button data-action="click->general-settings#refreshSettings"
                            class="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">
                        Recharger
                    </button>
                    <button data-action="click->general-settings#resetDefaults"
                            class="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700">
                        Défauts
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Console de test -->
        <div class="bg-gray-900 rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-4 text-yellow-400">🖥️ Console de Test</h3>
            <div id="test-console" class="h-40 overflow-y-auto text-xs font-mono bg-black p-3 rounded"></div>
            <div class="mt-2 flex space-x-2">
                <button onclick="clearConsole()" class="px-3 py-1 bg-gray-700 text-white rounded text-sm">
                    Effacer
                </button>
                <button onclick="runTests()" class="px-3 py-1 bg-green-600 text-white rounded text-sm">
                    Lancer Tests
                </button>
            </div>
        </div>
    </div>

    <script>
        // Console de test
        function addToConsole(message, type = 'info') {
            const console = document.getElementById('test-console');
            const div = document.createElement('div');
            div.className = type === 'error' ? 'text-red-400' : 
                          type === 'success' ? 'text-green-400' : 
                          type === 'warning' ? 'text-yellow-400' : 'text-blue-400';
            div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            console.appendChild(div);
            console.scrollTop = console.scrollHeight;
        }
        
        function clearConsole() {
            document.getElementById('test-console').innerHTML = '';
        }
        
        function updateStatus(elementId, text, success) {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = success ? `✅ ${text}` : `❌ ${text}`;
                element.className = success ? 'text-green-400' : 'text-red-400';
            }
        }
        
        function runTests() {
            addToConsole('🧪 Début des tests...', 'info');
            
            // Test 1: Stimulus
            const stimulusOk = !!(window.Stimulus || window.StimulusApp);
            updateStatus('status-stimulus', 'Stimulus disponible', stimulusOk);
            addToConsole(`Test Stimulus: ${stimulusOk ? 'OK' : 'ÉCHEC'}`, stimulusOk ? 'success' : 'error');
            
            // Test 2: BaseSettingsController
            const baseOk = !!window.BaseSettingsController;
            updateStatus('status-base', 'BaseSettingsController disponible', baseOk);
            addToConsole(`Test BaseController: ${baseOk ? 'OK' : 'ÉCHEC'}`, baseOk ? 'success' : 'error');
            
            // Test 3: Contrôleurs enregistrés
            const app = window.application || window.StimulusApp || window.Stimulus;
            const controllersOk = !!(app && app.controllers);
            updateStatus('status-controllers', 'Contrôleurs enregistrés', controllersOk);
            addToConsole(`Test contrôleurs: ${controllersOk ? 'OK' : 'ÉCHEC'}`, controllersOk ? 'success' : 'error');
            
            // Résumé
            const allOk = stimulusOk && baseOk && controllersOk;
            document.getElementById('result-summary').textContent = allOk ? 
                '🎉 Tous les tests passés !' : 
                '⚠️ Certains tests ont échoué';
            document.getElementById('result-summary').className = allOk ? 'text-green-400' : 'text-red-400';
            
            addToConsole(`=== RÉSUMÉ: ${allOk ? 'SUCCÈS' : 'ÉCHECS DÉTECTÉS'} ===`, allOk ? 'success' : 'error');
        }
        
        // Initialisation
        addToConsole('🚀 Initialisation du test final...', 'info');
        
        // Initialiser Stimulus
        if (typeof Stimulus !== 'undefined') {
            window.Stimulus = Stimulus.Application.start();
            window.application = window.Stimulus;
            addToConsole('✅ Stimulus initialisé', 'success');
        } else {
            addToConsole('❌ Stimulus UMD non disponible', 'error');
        }
        
        // Écouter les événements
        window.addEventListener('BaseSettingsControllerReady', () => {
            addToConsole('📡 BaseSettingsController prêt !', 'success');
            setTimeout(runTests, 500);
        });
        
        // Charger BaseSettingsController corrigé
        const script = document.createElement('script');
        script.src = '/js/controllers/base_settings_controller_final.js';
        script.onload = () => addToConsole('✅ Script BaseController chargé', 'success');
        script.onerror = () => addToConsole('❌ Erreur chargement BaseController', 'error');
        document.head.appendChild(script);
        
        // Charger le contrôleur général (version simplifiée inline)
        setTimeout(() => {
            if (window.BaseSettingsController) {
                try {
                    class GeneralSettingsController extends window.BaseSettingsController {
                        static targets = [
                            ...window.BaseSettingsController.targets,
                            "autoMarkSolved", "autoCorrectCoordinates", "enableAutoScoring"
                        ]
                        
                        apiEndpoint = '/api/settings/general'
                        
                        gatherSettings() {
                            return {
                                auto_mark_solved: this.hasAutoMarkSolvedTarget ? this.autoMarkSolvedTarget.checked : true,
                                auto_correct_coordinates: this.hasAutoCorrectCoordinatesTarget ? this.autoCorrectCoordinatesTarget.checked : true,
                                enable_auto_scoring: this.hasEnableAutoScoringTarget ? this.enableAutoScoringTarget.checked : true
                            };
                        }
                        
                        updateUI(settings) {
                            if (this.hasAutoMarkSolvedTarget) {
                                this.autoMarkSolvedTarget.checked = settings.auto_mark_solved !== false;
                            }
                            if (this.hasAutoCorrectCoordinatesTarget) {
                                this.autoCorrectCoordinatesTarget.checked = settings.auto_correct_coordinates !== false;
                            }
                            if (this.hasEnableAutoScoringTarget) {
                                this.enableAutoScoringTarget.checked = settings.enable_auto_scoring !== false;
                            }
                        }
                        
                        getDefaults() {
                            return {
                                auto_mark_solved: true,
                                auto_correct_coordinates: true,
                                enable_auto_scoring: true
                            };
                        }
                    }
                    
                    const app = window.application || window.StimulusApp || window.Stimulus;
                    app.register('general-settings', GeneralSettingsController);
                    addToConsole('✅ GeneralSettingsController enregistré', 'success');
                    
                    setTimeout(runTests, 1000);
                    
                } catch (error) {
                    addToConsole(`❌ Erreur création GeneralController: ${error.message}`, 'error');
                }
            } else {
                addToConsole('⚠️ BaseSettingsController non disponible pour créer GeneralController', 'warning');
            }
        }, 2000);
        
    </script>
</body>
</html>
"""
   
    return html_content

@settings_bp.route('/test_final_v2', methods=['GET'])
def test_final_v2_settings():
    """
    Page de test avec la version finale simplifiée de BaseSettingsController
    """
    logger.info("=== DEBUG: Route /api/settings/test_final_v2 appelée ===")
   
    html_content = """
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Settings - Version Finale V2</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/@hotwired/stimulus/dist/stimulus.umd.js"></script>
   
    <style>
        body { background-color: #1a1a1a; color: #e5e5e5; }
        .notification { 
            padding: 0.75rem; 
            margin: 0.5rem 0; 
            border-radius: 0.5rem; 
            border: 1px solid;
            transition: all 0.3s ease;
        }
        .notification.success { 
            background-color: #065f46; 
            color: #10b981; 
            border-color: #10b981;
        }
        .notification.error { 
            background-color: #7f1d1d; 
            color: #ef4444; 
            border-color: #ef4444;
        }
        .notification.info { 
            background-color: #1e3a8a; 
            color: #3b82f6; 
            border-color: #3b82f6;
        }
        .notification.hidden { 
            opacity: 0; 
            transform: translateY(-10px); 
        }
    </style>
</head>
<body class="p-8">
    <div class="max-w-5xl mx-auto">
        <h1 class="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            🚀 Test Final V2 - Système Settings
        </h1>
       
        <!-- Statut du système en temps réel -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h3 class="text-lg font-semibold mb-4 text-blue-400">📊 État du Système</h3>
                <div id="system-status" class="space-y-2 text-sm">
                    <div id="status-stimulus" class="flex justify-between">
                        <span>Stimulus UMD:</span>
                        <span class="text-gray-400">Vérification...</span>
                    </div>
                    <div id="status-app" class="flex justify-between">
                        <span>Application:</span>
                        <span class="text-gray-400">Vérification...</span>
                    </div>
                    <div id="status-base" class="flex justify-between">
                        <span>BaseController:</span>
                        <span class="text-gray-400">Vérification...</span>
                    </div>
                    <div id="status-general" class="flex justify-between">
                        <span>GeneralController:</span>
                        <span class="text-gray-400">Vérification...</span>
                    </div>
                </div>
                
                <div class="mt-4 space-x-2">
                    <button onclick="updateSystemStatus()" class="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700">
                        Actualiser
                    </button>
                    <button onclick="runDiagnostic()" class="px-3 py-1 bg-purple-600 rounded text-sm hover:bg-purple-700">
                        Diagnostic
                    </button>
                </div>
            </div>
            
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h3 class="text-lg font-semibold mb-4 text-green-400">🎯 Objectifs de ce Test</h3>
                <div class="space-y-2 text-sm">
                    <div>✅ Détection robuste de Stimulus</div>
                    <div>✅ Chargement fiable de BaseController</div>
                    <div>✅ Création automatique des contrôleurs</div>
                    <div>✅ Interface fonctionnelle complète</div>
                    <div>✅ Gestion d'erreurs intelligente</div>
                </div>
            </div>
        </div>
       
        <!-- Test des paramètres généraux -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700" 
             data-controller="general-settings"
             data-general-settings-api-endpoint-value="/api/settings/general">
            
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold flex items-center">
                    <span class="mr-3">⚙️</span>
                    Paramètres Généraux
                </h2>
                <div class="flex items-center space-x-3">
                    <div data-general-settings-target="syncStatus" class="text-sm px-3 py-1 rounded bg-gray-700">
                        Initialisation...
                    </div>
                    <div data-general-settings-target="loadingIndicator" class="hidden text-blue-400">
                        🔄 Chargement...
                    </div>
                </div>
            </div>
            
            <div data-general-settings-target="notification" class="notification hidden"></div>
            
            <div class="space-y-4 mb-6">
                <label class="flex items-center space-x-3 p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                    <input type="checkbox" 
                           data-general-settings-target="autoMarkSolved"
                           data-action="change->general-settings#settingChanged"
                           class="rounded text-blue-600 focus:ring-blue-500 focus:ring-2">
                    <div>
                        <div class="font-medium">Marquer automatiquement comme "résolue"</div>
                        <div class="text-sm text-gray-400">Marque une géocache comme résolue lors de la correction des coordonnées</div>
                    </div>
                </label>
                
                <label class="flex items-center space-x-3 p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                    <input type="checkbox" 
                           data-general-settings-target="autoCorrectCoordinates"
                           data-action="change->general-settings#settingChanged"
                           class="rounded text-blue-600 focus:ring-blue-500 focus:ring-2">
                    <div>
                        <div class="font-medium">Corriger automatiquement les coordonnées</div>
                        <div class="text-sm text-gray-400">Corrige automatiquement les coordonnées dans le Solver</div>
                    </div>
                </label>
                
                <label class="flex items-center space-x-3 p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                    <input type="checkbox" 
                           data-general-settings-target="enableAutoScoring"
                           data-action="change->general-settings#settingChanged"
                           class="rounded text-blue-600 focus:ring-blue-500 focus:ring-2">
                    <div>
                        <div class="font-medium">Activer le scoring automatique</div>
                        <div class="text-sm text-gray-400">Évalue la pertinence des résultats de déchiffrement</div>
                    </div>
                </label>
            </div>
            
            <div class="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-600">
                <div class="text-xs text-gray-400 space-x-4">
                    <span>Cache: <span data-general-settings-target="cacheVersion" class="text-blue-400">-</span></span>
                    <span>Auto-save: 2s</span>
                </div>
                <div class="flex space-x-2">
                    <button data-action="click->general-settings#manualSave"
                            data-general-settings-target="saveButton"
                            class="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
                        💾 Sauvegarder
                    </button>
                    <button data-action="click->general-settings#refreshSettings"
                            class="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors">
                        🔄 Recharger
                    </button>
                    <button data-action="click->general-settings#resetDefaults"
                            class="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition-colors">
                        ↩️ Défauts
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Console de développement avancée -->
        <div class="bg-gray-900 rounded-lg p-6 border border-gray-600">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-yellow-400">🖥️ Console de Développement</h3>
                <div class="flex space-x-2">
                    <span id="log-count" class="text-xs text-gray-400">0 entrées</span>
                    <button onclick="exportLogs()" class="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">
                        📄 Exporter
                    </button>
                </div>
            </div>
            <div id="dev-console" class="h-48 overflow-y-auto text-xs font-mono bg-black p-4 rounded border"></div>
            <div class="mt-4 flex flex-wrap gap-2">
                <button onclick="clearConsole()" class="px-3 py-1 bg-gray-700 text-white rounded text-sm hover:bg-gray-600">
                    🗑️ Effacer
                </button>
                <button onclick="runFullTest()" class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                    🧪 Test Complet
                </button>
                <button onclick="simulateError()" class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                    ⚠️ Simuler Erreur
                </button>
                <button onclick="testAutoSave()" class="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">
                    ⏰ Test Auto-Save
                </button>
            </div>
        </div>
    </div>

    <script>
        let logCount = 0;
        const logs = [];
        
        // Console de développement améliorée
        function addToConsole(message, type = 'info') {
            const console = document.getElementById('dev-console');
            const div = document.createElement('div');
            const timestamp = new Date().toLocaleTimeString();
            
            const colors = {
                'error': 'text-red-400',
                'success': 'text-green-400', 
                'warning': 'text-yellow-400',
                'info': 'text-blue-400',
                'debug': 'text-purple-400'
            };
            
            div.className = colors[type] || 'text-gray-300';
            div.innerHTML = `<span class="text-gray-500">[${timestamp}]</span> ${message}`;
            console.appendChild(div);
            console.scrollTop = console.scrollHeight;
            
            // Garder un historique
            logs.push({ timestamp, message, type });
            logCount++;
            document.getElementById('log-count').textContent = `${logCount} entrées`;
        }
        
        function clearConsole() {
            document.getElementById('dev-console').innerHTML = '';
        }
        
        function exportLogs() {
            const logText = logs.map(log => `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`).join('\\n');
            const blob = new Blob([logText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `settings-debug-${new Date().toISOString().slice(0,19)}.log`;
            a.click();
            URL.revokeObjectURL(url);
        }
        
        // Statut système
        function updateSystemStatus() {
            const statuses = {
                'status-stimulus': typeof Stimulus !== 'undefined',
                'status-app': !!(window.application || window.StimulusApp || window.Stimulus),
                'status-base': !!window.BaseSettingsController,
                'status-general': !!(window.application && window.application.getControllerForElementAndIdentifier)
            };
            
            Object.entries(statuses).forEach(([id, status]) => {
                const element = document.getElementById(id);
                if (element) {
                    const statusSpan = element.querySelector('span:last-child');
                    statusSpan.textContent = status ? '✅ OK' : '❌ KO';
                    statusSpan.className = status ? 'text-green-400' : 'text-red-400';
                }
            });
            
            addToConsole('📊 Statut système mis à jour', 'debug');
        }
        
        // Tests
        function runFullTest() {
            addToConsole('🧪 === DÉBUT DU TEST COMPLET ===', 'info');
            updateSystemStatus();
            
            // Test 1: Stimulus
            const stimulusOk = typeof Stimulus !== 'undefined';
            addToConsole(`Test Stimulus UMD: ${stimulusOk ? 'SUCCÈS' : 'ÉCHEC'}`, stimulusOk ? 'success' : 'error');
            
            // Test 2: Application
            const app = window.application || window.StimulusApp || window.Stimulus;
            const appOk = !!app;
            addToConsole(`Test Application: ${appOk ? 'SUCCÈS' : 'ÉCHEC'}`, appOk ? 'success' : 'error');
            
            // Test 3: BaseSettingsController
            const baseOk = !!window.BaseSettingsController;
            addToConsole(`Test BaseSettingsController: ${baseOk ? 'SUCCÈS' : 'ÉCHEC'}`, baseOk ? 'success' : 'error');
            
            // Test 4: Contrôleur général
            let generalOk = false;
            if (app && app.controllers) {
                const controllers = Array.from(app.controllers);
                generalOk = controllers.some(c => c.identifier === 'general-settings');
            }
            addToConsole(`Test GeneralController: ${generalOk ? 'SUCCÈS' : 'ÉCHEC'}`, generalOk ? 'success' : 'error');
            
            const allOk = stimulusOk && appOk && baseOk;
            addToConsole(`=== RÉSULTAT GLOBAL: ${allOk ? 'TOUS LES TESTS PASSÉS' : 'CERTAINS TESTS ONT ÉCHOUÉ'} ===`, allOk ? 'success' : 'error');
        }
        
        function runDiagnostic() {
            addToConsole('🔍 === DIAGNOSTIC DÉTAILLÉ ===', 'info');
            addToConsole(`window.Stimulus: ${!!window.Stimulus}`, 'debug');
            addToConsole(`window.StimulusApp: ${!!window.StimulusApp}`, 'debug');
            addToConsole(`window.application: ${!!window.application}`, 'debug');
            addToConsole(`Stimulus (UMD): ${typeof Stimulus !== 'undefined'}`, 'debug');
            addToConsole(`BaseSettingsController: ${!!window.BaseSettingsController}`, 'debug');
            
            if (window.BaseSettingsController) {
                addToConsole(`BaseController.name: ${window.BaseSettingsController.name}`, 'debug');
                addToConsole(`BaseController.targets: ${window.BaseSettingsController.targets?.join(', ')}`, 'debug');
            }
        }
        
        function simulateError() {
            addToConsole('⚠️ Simulation d\'erreur pour test de robustesse', 'warning');
            try {
                throw new Error('Erreur simulée pour tester la gestion d\'erreurs');
            } catch (error) {
                addToConsole(`❌ Erreur capturée: ${error.message}`, 'error');
            }
        }
        
        function testAutoSave() {
            addToConsole('⏰ Test du système d\'auto-save...', 'info');
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            if (checkboxes.length > 0) {
                const checkbox = checkboxes[0];
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
                addToConsole('✅ Changement simulé, auto-save dans 2s...', 'success');
            } else {
                addToConsole('❌ Aucun contrôle trouvé pour le test', 'error');
            }
        }
        
        // Initialisation
        addToConsole('🚀 Initialisation Test Final V2...', 'info');
        
        // Initialiser Stimulus
        if (typeof Stimulus !== 'undefined') {
            window.Stimulus = Stimulus.Application.start();
            window.application = window.Stimulus;
            addToConsole('✅ Stimulus initialisé via UMD', 'success');
        } else {
            addToConsole('❌ Stimulus UMD non disponible', 'error');
        }
        
        // Écouter les événements
        window.addEventListener('BaseSettingsControllerReady', (event) => {
            addToConsole('📡 Événement BaseSettingsControllerReady reçu !', 'success');
            
            // Créer et enregistrer le contrôleur général
            try {
                class GeneralSettingsController extends window.BaseSettingsController {
                    static targets = [
                        ...window.BaseSettingsController.targets,
                        "autoMarkSolved", "autoCorrectCoordinates", "enableAutoScoring"
                    ]
                    
                    apiEndpoint = '/api/settings/general'
                    
                    gatherSettings() {
                        return {
                            auto_mark_solved: this.hasAutoMarkSolvedTarget ? this.autoMarkSolvedTarget.checked : true,
                            auto_correct_coordinates: this.hasAutoCorrectCoordinatesTarget ? this.autoCorrectCoordinatesTarget.checked : true,
                            enable_auto_scoring: this.hasEnableAutoScoringTarget ? this.enableAutoScoringTarget.checked : true
                        };
                    }
                    
                    updateUI(settings) {
                        if (this.hasAutoMarkSolvedTarget) {
                            this.autoMarkSolvedTarget.checked = settings.auto_mark_solved !== false;
                        }
                        if (this.hasAutoCorrectCoordinatesTarget) {
                            this.autoCorrectCoordinatesTarget.checked = settings.auto_correct_coordinates !== false;
                        }
                        if (this.hasEnableAutoScoringTarget) {
                            this.enableAutoScoringTarget.checked = settings.enable_auto_scoring !== false;
                        }
                    }
                    
                    getDefaults() {
                        return {
                            auto_mark_solved: true,
                            auto_correct_coordinates: true,
                            enable_auto_scoring: true
                        };
                    }
                }
                
                const app = window.application || window.StimulusApp || window.Stimulus;
                app.register('general-settings', GeneralSettingsController);
                addToConsole('✅ GeneralSettingsController enregistré avec succès', 'success');
                
                setTimeout(() => {
                    updateSystemStatus();
                    runFullTest();
                }, 1000);
                
            } catch (error) {
                addToConsole(`❌ Erreur création GeneralController: ${error.message}`, 'error');
            }
        });
        
        // Charger BaseSettingsController
        const script = document.createElement('script');
        script.src = '/js/controllers/base_settings_controller_final.js';
        script.onload = () => addToConsole('✅ Script BaseController final chargé', 'success');
        script.onerror = () => addToConsole('❌ Erreur chargement BaseController final', 'error');
        document.head.appendChild(script);
        
        // Statut initial
        setTimeout(updateSystemStatus, 500);
        
    </script>
</body>
</html>
"""
   
    return html_content

@settings_bp.route('/page', methods=['GET'])
def settings_page():
    """
    Page principale des paramètres de l'application
    """
    logger.info("=== DEBUG: Route /api/settings/page appelée ===")
    try:
        return render_template('settings_page.html')
    except Exception as e:
        logger.error(f"=== ERREUR lors du rendu de la page settings: {str(e)} ===")
        return f"Erreur lors du chargement de la page: {str(e)}", 500

@settings_bp.route('/test_debug_final', methods=['GET'])
def test_debug_final():
    """
    Page de test finale pour débugger les problèmes de settings
    """
    logger.info("=== DEBUG: Route /api/settings/test_debug_final appelée ===")
   
    html_content = """
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Debug Final - Settings</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/@hotwired/stimulus/dist/stimulus.umd.js"></script>
   
    <style>
        body { background-color: #1a1a1a; color: #e5e5e5; }
        .notification { 
            padding: 0.75rem; 
            margin: 0.5rem 0; 
            border-radius: 0.5rem; 
            border: 1px solid;
            transition: all 0.3s ease;
        }
        .notification.success { 
            background-color: #065f46; 
            color: #10b981; 
            border-color: #10b981;
        }
        .notification.error { 
            background-color: #7f1d1d; 
            color: #ef4444; 
            border-color: #ef4444;
        }
        .notification.info { 
            background-color: #1e3a8a; 
            color: #3b82f6; 
            border-color: #3b82f6;
        }
        .notification.hidden { 
            opacity: 0; 
            transform: translateY(-10px); 
        }
    </style>
</head>
<body class="p-8">
    <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold mb-8 text-center">🔧 Debug Final - Système Settings</h1>
       
        <!-- Statut système -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
            <h3 class="text-lg font-semibold mb-4 text-blue-400">📊 État du Système</h3>
            <div id="system-status" class="grid grid-cols-2 gap-4 text-sm">
                <div>Stimulus: <span id="status-stimulus" class="text-gray-400">Vérification...</span></div>
                <div>BaseController: <span id="status-base" class="text-gray-400">Vérification...</span></div>
                <div>GeneralController: <span id="status-general" class="text-gray-400">Vérification...</span></div>
                <div>API: <span id="status-api" class="text-gray-400">Test en cours...</span></div>
            </div>
            <button onclick="runDiagnostic()" class="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">
                🔍 Diagnostic Complet
            </button>
        </div>
       
        <!-- Paramètres Généraux -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
            <h2 class="text-xl font-semibold mb-4">⚙️ Test Paramètres Généraux</h2>
            <div id="general-settings-container">
                <div class="text-gray-400">Chargement du template...</div>
            </div>
        </div>
        
        <!-- Console de debug -->
        <div class="bg-gray-900 rounded-lg p-6 border border-gray-600">
            <h3 class="text-lg font-semibold mb-4 text-yellow-400">🖥️ Console de Debug</h3>
            <div id="debug-console" class="h-40 overflow-y-auto text-xs font-mono bg-black p-3 rounded border"></div>
            <div class="mt-4 flex space-x-2">
                <button onclick="clearConsole()" class="px-3 py-1 bg-gray-700 rounded text-sm">
                    Effacer
                </button>
                <button onclick="testAPI()" class="px-3 py-1 bg-green-600 rounded text-sm">
                    Test API
                </button>
                <button onclick="testSave()" class="px-3 py-1 bg-purple-600 rounded text-sm">
                    Test Sauvegarde
                </button>
            </div>
        </div>
    </div>

    <script>
        console.log('Debug page loaded');
        
        // Initialiser Stimulus
        if (typeof Stimulus !== 'undefined') {
            window.Stimulus = Stimulus.Application.start();
            window.application = window.Stimulus;
        }
        
        // Charger BaseSettingsController et tester
        const script = document.createElement('script');
        script.src = '/js/controllers/base_settings_controller_final.js';
        document.head.appendChild(script);
    </script>
</body>
</html>
"""
   
    return html_content

@settings_bp.route('/test_simple_debug', methods=['GET'])
def test_simple_debug():
    """
    Test ultra-simple pour diagnostiquer l'affichage des valeurs
    """
    logger.info("=== DEBUG: Route /api/settings/test_simple_debug appelée ===")
   
    html_content = """
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Simple Debug - Settings</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/@hotwired/stimulus/dist/stimulus.umd.js"></script>
    <style>
        body { background-color: #1a1a1a; color: #e5e5e5; }
    </style>
</head>
<body class="p-8">
    <div class="max-w-3xl mx-auto">
        <h1 class="text-2xl font-bold mb-6">🔧 Test Simple Debug</h1>
        
        <div class="bg-gray-800 rounded p-4 mb-6">
            <h2 class="text-lg font-semibold mb-4">📡 Test API Direct</h2>
            <button onclick="testAPICall()" class="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700">
                Tester l'API /api/settings/general
            </button>
            <div id="api-result" class="mt-4 p-3 bg-gray-900 rounded text-sm font-mono hidden"></div>
        </div>
        
        <div class="bg-gray-900 rounded p-4">
            <h3 class="text-lg font-semibold mb-2">🖥️ Console</h3>
            <div id="console" class="h-32 overflow-y-auto text-xs font-mono bg-black p-2 rounded"></div>
        </div>
    </div>

    <script>
        async function testAPICall() {
            try {
                console.log('Test API...');
                const response = await fetch('/api/settings/general');
                const data = await response.json();
                
                const resultDiv = document.getElementById('api-result');
                resultDiv.textContent = JSON.stringify(data, null, 2);
                resultDiv.classList.remove('hidden');
                
                console.log('Données:', data);
                return data;
            } catch (error) {
                console.error('Erreur:', error);
            }
        }
    </script>
</body>
</html>
"""
   
    return html_content

@settings_bp.route('/test_interaction', methods=['GET'])
def test_interaction():
    """
    Test ultra-simple pour diagnostiquer l'absence d'interaction
    """
    logger.info("=== DEBUG: Route /api/settings/test_interaction appelée ===")
   
    html_content = """
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Interaction - Settings</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/@hotwired/stimulus/dist/stimulus.umd.js"></script>
    <style>
        body { background-color: #1a1a1a; color: #e5e5e5; }
    </style>
</head>
<body class="p-8">
    <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold mb-8 text-center text-red-400">
            🔍 Diagnostic - Aucune Interaction
        </h1>
        
        <!-- Statut du système en temps réel -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 class="text-xl font-semibold mb-4">📊 État du Système</h2>
            <div id="status" class="space-y-2">
                <div>Stimulus: <span id="status-stimulus" class="text-gray-400">Vérification...</span></div>
                <div>BaseController: <span id="status-base" class="text-gray-400">Vérification...</span></div>
                <div>GeneralController: <span id="status-general" class="text-gray-400">Vérification...</span></div>
                <div>Contrôleurs enregistrés: <span id="status-controllers" class="text-gray-400">Vérification...</span></div>
            </div>
            <button onclick="runDiagnostic()" class="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">
                🔄 Actualiser Diagnostic
            </button>
        </div>
        
        <!-- Test contrôleur simple -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 class="text-xl font-semibold mb-4">🧪 Test Contrôleur Simple</h2>
            
            <!-- Test avec contrôleur de base -->
            <div class="mb-4 p-4 border border-gray-600 rounded" data-controller="test-simple">
                <h3 class="font-semibold mb-2">Test Stimulus Simple</h3>
                <button data-action="click->test-simple#test" class="px-3 py-1 bg-green-600 rounded hover:bg-green-700">
                    Test Click Simple
                </button>
                <div data-test-simple-target="output" class="mt-2 text-green-400"></div>
            </div>
            
            <!-- Test du template settings réel -->
            <div class="mt-6">
                <button onclick="loadRealTemplate()" class="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700">
                    Charger Template Settings Réel
                </button>
                <div id="real-template-container" class="mt-4 hidden">
                    <!-- Template sera chargé ici -->
                </div>
            </div>
        </div>
        
        <!-- Console en temps réel -->
        <div class="bg-gray-900 rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-4 text-yellow-400">🖥️ Console en Temps Réel</h3>
            <div id="console" class="h-32 overflow-y-auto text-xs font-mono bg-black p-3 rounded"></div>
            <button onclick="clearConsole()" class="mt-2 px-3 py-1 bg-gray-700 rounded text-sm">
                Effacer Console
            </button>
        </div>
    </div>

    <script>
        // Console en temps réel
        function log(message, type = 'info') {
            const console = document.getElementById('console');
            const div = document.createElement('div');
            const colors = {
                'error': 'text-red-400',
                'success': 'text-green-400', 
                'warning': 'text-yellow-400',
                'info': 'text-blue-400'
            };
            div.className = colors[type] || 'text-gray-300';
            div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            console.appendChild(div);
            console.scrollTop = console.scrollHeight;
            console.log(message);
        }
        
        function clearConsole() {
            document.getElementById('console').innerHTML = '';
        }
        
        function updateStatus(id, text, isOk) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = isOk ? `✅ ${text}` : `❌ ${text}`;
                element.className = isOk ? 'text-green-400' : 'text-red-400';
            }
        }
        
        // Diagnostic complet
        function runDiagnostic() {
            log('🔍 === DIAGNOSTIC COMPLET ===', 'info');
            
            // 1. Vérifier Stimulus
            const stimulusOk = !!(window.Stimulus || window.StimulusApp || window.application);
            updateStatus('status-stimulus', stimulusOk ? 'Disponible' : 'Non trouvé', stimulusOk);
            log(`Stimulus: ${stimulusOk ? 'TROUVÉ' : 'MANQUANT'}`, stimulusOk ? 'success' : 'error');
            
            if (stimulusOk) {
                const app = window.application || window.StimulusApp || window.Stimulus;
                log(`Application Stimulus: ${!!app}`, app ? 'success' : 'error');
                log(`Controllers disponibles: ${app.controllers ? app.controllers.size : 0}`, 'info');
            }
            
            // 2. Vérifier BaseSettingsController
            const baseOk = !!window.BaseSettingsController;
            updateStatus('status-base', baseOk ? 'Disponible' : 'Non chargé', baseOk);
            log(`BaseSettingsController: ${baseOk ? 'TROUVÉ' : 'MANQUANT'}`, baseOk ? 'success' : 'error');
            
            // 3. Vérifier contrôleur général
            let generalOk = false;
            if (stimulusOk) {
                const app = window.application || window.StimulusApp || window.Stimulus;
                if (app && app.controllers) {
                    const controllers = Array.from(app.controllers);
                    generalOk = controllers.some(c => c.identifier === 'general-settings');
                    const controllerNames = controllers.map(c => c.identifier);
                    updateStatus('status-controllers', controllerNames.join(', '), controllerNames.length > 0);
                    log(`Contrôleurs enregistrés: [${controllerNames.join(', ')}]`, 'info');
                }
            }
            updateStatus('status-general', generalOk ? 'Enregistré' : 'Non trouvé', generalOk);
            log(`GeneralController: ${generalOk ? 'ENREGISTRÉ' : 'MANQUANT'}`, generalOk ? 'success' : 'error');
            
            // 4. Vérifier les erreurs
            log('Vérification des erreurs dans la console...', 'info');
        }
        
        // Charger le template réel
        async function loadRealTemplate() {
            try {
                log('📦 Chargement du template settings réel...', 'info');
                
                const response = await fetch('/api/settings/general_panel');
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const html = await response.text();
                log('✅ Template HTML récupéré', 'success');
                
                const container = document.getElementById('real-template-container');
                container.innerHTML = html;
                container.classList.remove('hidden');
                
                log('✅ Template inséré dans le DOM', 'success');
                
                // Attendre un peu puis re-diagnostiquer
                setTimeout(runDiagnostic, 1000);
                
            } catch (error) {
                log(`❌ Erreur chargement template: ${error.message}`, 'error');
            }
        }
        
        // Initialisation
        log('🚀 Initialisation du diagnostic...', 'info');
        
        // Initialiser Stimulus
        if (typeof Stimulus !== 'undefined') {
            window.Stimulus = Stimulus.Application.start();
            window.application = window.Stimulus;
            log('✅ Stimulus initialisé localement', 'success');
            
            // Créer un contrôleur de test simple
            class TestSimpleController extends Stimulus.Controller {
                static targets = ["output"]
                
                test() {
                    log('🎯 Contrôleur test-simple appelé !', 'success');
                    if (this.hasOutputTarget) {
                        this.outputTarget.textContent = 'Stimulus fonctionne !';
                    }
                }
            }
            
            window.application.register('test-simple', TestSimpleController);
            log('✅ Contrôleur test-simple enregistré', 'success');
            
        } else {
            log('❌ Stimulus UMD non disponible', 'error');
        }
        
        // Charger BaseSettingsController et contrôleurs
        const baseScript = document.createElement('script');
        baseScript.src = '/js/controllers/base_settings_controller_final.js';
        baseScript.onload = () => {
            log('✅ BaseSettingsController chargé', 'success');
            setTimeout(runDiagnostic, 500);
        };
        baseScript.onerror = () => {
            log('❌ Erreur chargement BaseSettingsController', 'error');
        };
        document.head.appendChild(baseScript);
        
        // Événements
        window.addEventListener('BaseSettingsControllerReady', () => {
            log('📡 Événement BaseSettingsControllerReady reçu !', 'success');
            setTimeout(runDiagnostic, 500);
        });
        
        // Charger index.js pour les contrôleurs de settings
        const indexScript = document.createElement('script');
        indexScript.src = '/js/controllers/index.js';
        indexScript.onload = () => {
            log('✅ index.js chargé', 'success');
            setTimeout(runDiagnostic, 1000);
        };
        indexScript.onerror = () => {
            log('❌ Erreur chargement index.js', 'error');
        };
        document.head.appendChild(indexScript);
        
        // Diagnostic initial
        setTimeout(runDiagnostic, 2000);
        
    </script>
</body>
</html>
"""
   
    return html_content

@settings_bp.route('/test_minimal', methods=['GET'])
def test_minimal():
    """
    Test minimal pour isoler le problème d'interaction
    """
    logger.info("=== DEBUG: Route /api/settings/test_minimal appelée ===")
   
    html_content = """
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Minimal - Settings</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/@hotwired/stimulus/dist/stimulus.umd.js"></script>
    <style>
        body { background-color: #1a1a1a; color: #e5e5e5; }
    </style>
</head>
<body class="p-8">
    <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold mb-8 text-center text-green-400">
            ✅ Test Minimal - Settings
        </h1>
        
        <!-- Test contrôleur ultra-simple -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 class="text-xl font-semibold mb-4">🧪 Test Contrôleur Ultra-Simple</h2>
            
            <div class="p-4 border border-gray-600 rounded" data-controller="minimal-test">
                <button data-action="click->minimal-test#test" 
                        class="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">
                    Test Click Minimal
                </button>
                <div data-minimal-test-target="result" class="mt-4 p-2 bg-gray-900 rounded hidden">
                    Résultat s'affichera ici
                </div>
            </div>
        </div>
        
        <!-- Test template settings complet mais inline -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 class="text-xl font-semibold mb-4">⚙️ Test Settings Complet (Inline)</h2>
            
            <div data-controller="general-settings" 
                 data-general-settings-api-endpoint-value="/api/settings/general"
                 class="space-y-4">
                
                <div data-general-settings-target="notification" 
                     class="hidden p-3 rounded border"></div>
                
                <div class="space-y-3">
                    <label class="flex items-center space-x-3">
                        <input type="checkbox" 
                               data-general-settings-target="autoMarkSolved"
                               data-action="change->general-settings#settingChanged"
                               class="rounded">
                        <span>Marquer automatiquement comme "résolue"</span>
                    </label>
                    
                    <label class="flex items-center space-x-3">
                        <input type="checkbox" 
                               data-general-settings-target="autoCorrectCoordinates"
                               data-action="change->general-settings#settingChanged"
                               class="rounded">
                        <span>Corriger automatiquement les coordonnées</span>
                    </label>
                    
                    <label class="flex items-center space-x-3">
                        <input type="checkbox" 
                               data-general-settings-target="enableAutoScoring"
                               data-action="change->general-settings#settingChanged"
                               class="rounded">
                        <span>Activer le scoring automatique</span>
                    </label>
                </div>
                
                <div class="flex space-x-3 pt-4">
                    <button data-action="click->general-settings#manualSave"
                            data-general-settings-target="saveButton"
                            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                        Enregistrer
                    </button>
                    <button data-action="click->general-settings#refreshSettings"
                            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Recharger
                    </button>
                </div>
                
                <div class="text-sm text-gray-400">
                    Statut: <span data-general-settings-target="syncStatus">-</span>
                </div>
            </div>
        </div>
        
        <!-- Console -->
        <div class="bg-gray-900 rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-4 text-yellow-400">🖥️ Console</h3>
            <div id="console" class="h-40 overflow-y-auto text-xs font-mono bg-black p-3 rounded"></div>
            <button onclick="clearConsole()" class="mt-2 px-3 py-1 bg-gray-700 rounded text-sm">
                Effacer
            </button>
        </div>
    </div>

    <script>
        // Console
        function log(message, type = 'info') {
            const console = document.getElementById('console');
            const div = document.createElement('div');
            const colors = {
                'error': 'text-red-400',
                'success': 'text-green-400', 
                'warning': 'text-yellow-400',
                'info': 'text-blue-400'
            };
            div.className = colors[type] || 'text-gray-300';
            div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            console.appendChild(div);
            console.scrollTop = console.scrollHeight;
        }
        
        function clearConsole() {
            document.getElementById('console').innerHTML = '';
        }
        
        // Initialisation
        log('🚀 Initialisation test minimal...', 'info');
        
        // Vérifier Stimulus
        if (typeof Stimulus !== 'undefined') {
            log('✅ Stimulus UMD trouvé', 'success');
            
            // Initialiser application
            window.Stimulus = Stimulus.Application.start();
            window.application = window.Stimulus;
            log('✅ Application Stimulus initialisée', 'success');
            
            // Contrôleur de test minimal
            class MinimalTestController extends Stimulus.Controller {
                static targets = ["result"]
                
                connect() {
                    log('🔗 MinimalTestController connecté !', 'success');
                }
                
                test() {
                    log('🎯 MinimalTestController.test() appelé !', 'success');
                    if (this.hasResultTarget) {
                        this.resultTarget.textContent = 'TEST RÉUSSI ! Stimulus fonctionne parfaitement.';
                        this.resultTarget.classList.remove('hidden');
                        this.resultTarget.className = 'mt-4 p-2 bg-green-800 text-green-200 rounded';
                    }
                }
            }
            
            window.application.register('minimal-test', MinimalTestController);
            log('✅ MinimalTestController enregistré', 'success');
            
            // Charger BaseSettingsController de façon isolée
            const script = document.createElement('script');
            script.textContent = `
                // BaseSettingsController minimal inline
                (function() {
                    class BaseSettingsControllerMinimal extends Stimulus.Controller {
                        static targets = ["notification", "syncStatus", "saveButton"]
                        static values = { apiEndpoint: String }
                        
                        connect() {
                            console.log('🔗 BaseSettingsControllerMinimal connecté !');
                            this.apiEndpoint = this.apiEndpointValue || this.apiEndpoint;
                            this.loadInitialSettings();
                        }
                        
                        async loadInitialSettings() {
                            try {
                                this.updateSyncStatus('Chargement...');
                                
                                const response = await fetch(this.apiEndpoint);
                                const data = await response.json();
                                
                                if (data.success) {
                                    this.updateUI(data.settings);
                                    this.updateSyncStatus('À jour');
                                    this.showNotification('Paramètres chargés', 'success');
                                }
                            } catch (error) {
                                console.error('Erreur chargement:', error);
                                this.showNotification('Erreur: ' + error.message, 'error');
                                this.updateSyncStatus('Erreur');
                            }
                        }
                        
                        settingChanged() {
                            console.log('🔄 Paramètre modifié');
                            this.updateSyncStatus('Non sauvé');
                        }
                        
                        async manualSave() {
                            try {
                                console.log('💾 Sauvegarde manuelle...');
                                const settings = this.gatherSettings();
                                
                                const response = await fetch(this.apiEndpoint + '/save', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(settings)
                                });
                                
                                const data = await response.json();
                                if (data.success) {
                                    this.showNotification('Sauvegardé !', 'success');
                                    this.updateSyncStatus('À jour');
                                } else {
                                    throw new Error(data.error);
                                }
                            } catch (error) {
                                console.error('Erreur sauvegarde:', error);
                                this.showNotification('Erreur: ' + error.message, 'error');
                            }
                        }
                        
                        async refreshSettings() {
                            console.log('🔄 Actualisation...');
                            await this.loadInitialSettings();
                        }
                        
                        showNotification(message, type = 'info') {
                            console.log('[' + type.toUpperCase() + '] ' + message);
                            if (this.hasNotificationTarget) {
                                this.notificationTarget.textContent = message;
                                this.notificationTarget.className = 'p-3 rounded border ' + 
                                    (type === 'success' ? 'bg-green-800 text-green-200 border-green-600' :
                                     type === 'error' ? 'bg-red-800 text-red-200 border-red-600' :
                                     'bg-blue-800 text-blue-200 border-blue-600');
                                this.notificationTarget.classList.remove('hidden');
                                
                                setTimeout(() => {
                                    if (this.hasNotificationTarget) {
                                        this.notificationTarget.classList.add('hidden');
                                    }
                                }, 3000);
                            }
                        }
                        
                        updateSyncStatus(text) {
                            if (this.hasSyncStatusTarget) {
                                this.syncStatusTarget.textContent = text;
                            }
                        }
                        
                        gatherSettings() { return {}; }
                        updateUI(settings) {}
                    }
                    
                    // Contrôleur général qui hérite
                    class GeneralSettingsControllerMinimal extends BaseSettingsControllerMinimal {
                        static targets = [...BaseSettingsControllerMinimal.targets, 
                                        "autoMarkSolved", "autoCorrectCoordinates", "enableAutoScoring"]
                        
                        apiEndpoint = '/api/settings/general'
                        
                        gatherSettings() {
                            return {
                                auto_mark_solved: this.hasAutoMarkSolvedTarget ? this.autoMarkSolvedTarget.checked : true,
                                auto_correct_coordinates: this.hasAutoCorrectCoordinatesTarget ? this.autoCorrectCoordinatesTarget.checked : true,
                                enable_auto_scoring: this.hasEnableAutoScoringTarget ? this.enableAutoScoringTarget.checked : true
                            };
                        }
                        
                        updateUI(settings) {
                            console.log('🔄 Mise à jour UI avec:', settings);
                            
                            if (this.hasAutoMarkSolvedTarget) {
                                this.autoMarkSolvedTarget.checked = settings.auto_mark_solved !== false;
                            }
                            if (this.hasAutoCorrectCoordinatesTarget) {
                                this.autoCorrectCoordinatesTarget.checked = settings.auto_correct_coordinates !== false;
                            }
                            if (this.hasEnableAutoScoringTarget) {
                                this.enableAutoScoringTarget.checked = settings.enable_auto_scoring !== false;
                            }
                        }
                    }
                    
                    window.application.register('general-settings', GeneralSettingsControllerMinimal);
                    console.log('✅ GeneralSettingsControllerMinimal enregistré');
                })();
            `;
            document.head.appendChild(script);
            log('✅ Contrôleurs inline chargés', 'success');
            
        } else {
            log('❌ Stimulus UMD non disponible', 'error');
        }
        
    </script>
</body>
</html>
"""
   
    return html_content