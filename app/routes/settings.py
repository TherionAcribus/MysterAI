from flask import Blueprint, jsonify, request, render_template, Response
from app.models.app_config import AppConfig
import logging

# Configurer le logger
logger = logging.getLogger(__name__)

# Créer un blueprint pour les routes de paramètres
settings_bp = Blueprint('settings', __name__, url_prefix='/api/settings')

# Créer un blueprint pour les routes des plugins de configuration (pour GoldenLayout)
plugins_config_bp = Blueprint('plugins_config', __name__, url_prefix='/api/plugins')

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
            'enable_auto_scoring': AppConfig.get_value('enable_auto_scoring', True),
            'open_tab_in_same_section': AppConfig.get_value('open_tab_in_same_section', True),
            'zones_sort_order': AppConfig.get_value('zones_sort_order', 'recent')
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
        
        AppConfig.set_value(
            'open_tab_in_same_section', 
            data.get('open_tab_in_same_section', True),
            category='general',
            description='Ouvrir les nouveaux onglets dans la même section GoldenLayout par défaut'
        )

        # Sauvegarder l'ordre d'affichage des zones si fourni
        if 'zones_sort_order' in data:
            AppConfig.set_value(
                'zones_sort_order',
                data.get('zones_sort_order', 'recent'),
                category='general',
                description="Ordre d'affichage des zones (recent, oldest, name, name_desc, caches_desc, caches_asc)"
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

@settings_bp.route('/plugins', methods=['GET'])
def get_plugins_settings():
    """
    Récupère les paramètres des plugins (liste des plugins activés pour analyse/décryptage)
    """
    logger.info("=== DEBUG: Route /api/settings/plugins appelée ===")
    try:
        from app.plugin_manager import PluginManager
        from flask import current_app

        # Récupérer le PluginManager depuis l'app
        plugin_manager = current_app.plugin_manager

        # Récupérer les paramètres actuels
        settings = {
            'analysis_enabled_plugins': AppConfig.get_value('plugins.analysis.enabled', []),
            'analysis_disabled_plugins': AppConfig.get_value('plugins.analysis.disabled', []),
            'decode_enabled_plugins': AppConfig.get_value('plugins.decode.enabled', []),
            'decode_disabled_plugins': AppConfig.get_value('plugins.decode.disabled', [])
        }

        # Récupérer la liste des plugins disponibles
        available_plugins = []
        for name, wrapper in plugin_manager.loaded_plugins.items():
            metadata_dict = None
            try:
                record = plugin_manager._get_plugin_record(name)
                if record and record.metadata_json:
                    import json as _json
                    metadata_dict = _json.loads(record.metadata_json)
            except Exception:
                pass

            capabilities = (metadata_dict or {}).get("capabilities", {}) or {}
            kinds = (metadata_dict or {}).get("kinds", []) or []
            defaults = (metadata_dict or {}).get("defaults", {}) or {}

            # Déterminer si le plugin peut être utilisé pour analyse/décryptage
            can_analyze = capabilities.get("analyze", False) or (wrapper._instance and hasattr(wrapper._instance, "check_code"))
            can_decode = capabilities.get("decode", False) or (wrapper._instance and hasattr(wrapper._instance, "execute"))

            available_plugins.append({
                'name': name,
                'description': metadata_dict.get('description', '') if metadata_dict else '',
                'kinds': kinds,
                'can_analyze': can_analyze,
                'can_decode': can_decode,
                'default_analysis': defaults.get('include_in_analysis', True),
                'default_decode': defaults.get('include_in_decode', True)
            })

        # Générer une version de cache basée sur le timestamp
        from datetime import datetime
        cache_version = datetime.now().strftime("%H:%M:%S")

        logger.info(f"=== DEBUG: Paramètres plugins récupérés: {len(available_plugins)} plugins disponibles ===")
        return jsonify({
            'success': True,
            'settings': settings,
            'available_plugins': available_plugins,
            'cache_version': cache_version,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"=== ERREUR lors de la récupération des paramètres plugins: {str(e)} ===")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@settings_bp.route('/plugins_panel', methods=['GET'])
def get_plugins_settings_panel():
    """
    Retourne le template HTML pour les paramètres des plugins
    """
    logger.info("=== DEBUG: Route /api/settings/plugins_panel appelée ===")
    try:
        html = render_template('settings/plugins_settings.html')
        logger.info("=== DEBUG: Template des paramètres plugins rendu avec succès ===")
        return html
    except Exception as e:
        logger.error(f"=== ERREUR lors du rendu du template plugins: {str(e)} ===")
        return f"Erreur lors du chargement des paramètres plugins: {str(e)}", 500

@settings_bp.route('/plugins/save', methods=['POST'])
def save_plugins_settings():
    """
    Enregistre les paramètres des plugins
    """
    try:
        data = request.get_json()
        logger.info(f"=== DEBUG: Données reçues pour enregistrement plugins: {data} ===")

        # Valider les données
        if not isinstance(data, dict):
            return jsonify({
                'success': False,
                'error': 'Format de données invalide'
            }), 400

        # Enregistrer les paramètres d'analyse
        if 'analysis_enabled_plugins' in data:
            AppConfig.set_value(
                'plugins.analysis.enabled',
                data.get('analysis_enabled_plugins', []),
                category='plugins',
                description='Plugins explicitement activés pour l\'analyse'
            )

        if 'analysis_disabled_plugins' in data:
            AppConfig.set_value(
                'plugins.analysis.disabled',
                data.get('analysis_disabled_plugins', []),
                category='plugins',
                description='Plugins explicitement désactivés pour l\'analyse'
            )

        # Enregistrer les paramètres de décryptage
        if 'decode_enabled_plugins' in data:
            AppConfig.set_value(
                'plugins.decode.enabled',
                data.get('decode_enabled_plugins', []),
                category='plugins',
                description='Plugins explicitement activés pour le décryptage'
            )

        if 'decode_disabled_plugins' in data:
            AppConfig.set_value(
                'plugins.decode.disabled',
                data.get('decode_disabled_plugins', []),
                category='plugins',
                description='Plugins explicitement désactivés pour le décryptage'
            )

        # Générer une version de cache basée sur le timestamp
        from datetime import datetime
        cache_version = datetime.now().strftime("%H:%M:%S")

        logger.info("=== DEBUG: Paramètres plugins enregistrés avec succès ===")
        return jsonify({
            'success': True,
            'message': 'Paramètres des plugins enregistrés avec succès',
            'cache_version': cache_version,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"=== ERREUR lors de l'enregistrement des paramètres plugins: {str(e)} ===")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@plugins_config_bp.route('/analysis-config/interface', methods=['GET'])
def get_plugins_analysis_config():
    """
    Page de configuration détaillée des plugins pour l'analyse
    """
    try:
        from app.plugin_manager import PluginManager
        from flask import current_app

        # Récupérer le PluginManager depuis l'app
        plugin_manager = current_app.plugin_manager

        # Récupérer les paramètres actuels
        settings = {
            'analysis_enabled_plugins': AppConfig.get_value('plugins.analysis.enabled', []),
            'analysis_disabled_plugins': AppConfig.get_value('plugins.analysis.disabled', [])
        }

        # Récupérer la liste des plugins disponibles pour l'analyse
        available_plugins = []
        for name, wrapper in plugin_manager.loaded_plugins.items():
            metadata_dict = None
            try:
                record = plugin_manager._get_plugin_record(name)
                if record and record.metadata_json:
                    import json as _json
                    metadata_dict = _json.loads(record.metadata_json)
            except Exception:
                pass

            capabilities = (metadata_dict or {}).get("capabilities", {}) or {}
            kinds = (metadata_dict or {}).get("kinds", []) or []
            defaults = (metadata_dict or {}).get("defaults", {}) or {}

            # Vérifier si le plugin peut être utilisé pour l'analyse
            can_analyze = capabilities.get("analyze", False) or (wrapper._instance and hasattr(wrapper._instance, "check_code"))

            if can_analyze:
                available_plugins.append({
                    'name': name,
                    'description': metadata_dict.get('description', '') if metadata_dict else '',
                    'kinds': kinds,
                    'can_analyze': can_analyze,
                    'default_analysis': defaults.get('include_in_analysis', True)
                })

        # Générer le HTML pour la page de configuration
        html = f"""
        <div data-controller="plugin-config"
             data-plugin-config-mode-value="analysis"
             class="p-6 text-gray-200">

            <div class="mb-6">
                <h2 class="text-2xl font-semibold mb-2 flex items-center">
                    <i class="fas fa-search text-blue-400 mr-3"></i>
                    Configuration des Plugins - Analyse
                </h2>
                <p class="text-gray-400">
                    Sélectionnez les plugins à utiliser lors de la phase d'analyse du MetaSolver.
                    Les plugins non sélectionnés ne seront pas testés lors de la détection automatique.
                </p>
            </div>

            <!-- Barre d'outils -->
            <div class="flex justify-between items-center mb-6 p-4 bg-gray-800 rounded-lg">
                <div class="flex space-x-3">
                    <button data-action="click->plugin-config#selectAll"
                            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                        <i class="fas fa-check-square mr-2"></i>Tout sélectionner
                    </button>
                    <button data-action="click->plugin-config#deselectAll"
                            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                        <i class="fas fa-square mr-2"></i>Tout désélectionner
                    </button>
                </div>
                <div class="text-sm text-gray-400">
                    <span data-plugin-config-target="selectedCount">0</span> / <span data-plugin-config-target="totalCount">0</span> plugins sélectionnés
                </div>
            </div>

            <!-- Liste des plugins -->
            <div class="space-y-3" data-plugin-config-target="pluginList">
        """

        for plugin in available_plugins:
            # Déterminer l'état initial
            enabled_plugins = set(settings['analysis_enabled_plugins'] or [])
            disabled_plugins = set(settings['analysis_disabled_plugins'] or [])

            if plugin['name'] in enabled_plugins:
                is_checked = True
                is_default = False
            elif plugin['name'] in disabled_plugins:
                is_checked = False
                is_default = False
            else:
                is_checked = plugin['default_analysis']
                is_default = True

            checked_attr = 'checked' if is_checked else ''
            default_indicator = ' <span class="text-xs text-gray-500">(défaut)</span>' if is_default else ''

            html += f"""
                <div class="plugin-item bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center space-x-3 mb-2">
                                <input type="checkbox"
                                       data-plugin-config-target="pluginCheckbox"
                                       data-plugin-name="{plugin['name']}"
                                       {checked_attr}
                                       class="form-checkbox h-5 w-5 text-blue-600 bg-gray-700 border-gray-600 rounded">
                                <h4 class="font-semibold text-white">{plugin['name']}{default_indicator}</h4>
                            </div>
                            {f'<p class="text-gray-300 text-sm mb-2 ml-8">{plugin["description"]}</p>' if plugin['description'] else ''}
                            <div class="flex flex-wrap gap-1 ml-8">
                                {"".join([f'<span class="px-2 py-1 bg-blue-600 text-white text-xs rounded">{kind}</span>' for kind in plugin["kinds"]])}
                            </div>
                        </div>
                        <div class="flex flex-col items-end text-xs text-gray-500">
                            <span class="mb-1">Analyse: <span class="text-green-400">✓</span></span>
                        </div>
                    </div>
                </div>
            """

        html += """
            </div>

            <!-- Barre de sauvegarde -->
            <div class="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-4">
                <div class="flex justify-between items-center max-w-7xl mx-auto">
                    <div class="text-sm text-gray-400">
                        Les modifications sont sauvegardées automatiquement
                    </div>
                    <div class="flex space-x-3">
                        <button data-action="click->plugin-config#resetToDefaults"
                                class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
                            <i class="fas fa-undo mr-2"></i>Réinitialiser
                        </button>
                        <button data-action="click->plugin-config#saveConfiguration"
                                data-plugin-config-target="saveButton"
                                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                            <i class="fas fa-save mr-2"></i>Enregistrer
                        </button>
                    </div>
                </div>
            </div>

            <!-- Styles -->
            <style>
                .plugin-item:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                }
                .form-checkbox:checked {
                    background-color: #3b82f6;
                    border-color: #3b82f6;
                }
            </style>
        </div>
        """

        return Response(html, mimetype='text/html')
    except Exception as e:
        logger.error(f"Erreur génération page configuration analyse: {str(e)}")
        return Response(f"<div class='p-4 text-red-200'>Erreur: {str(e)}</div>", mimetype='text/html', status=500)

@plugins_config_bp.route('/decode-config/interface', methods=['GET'])
def get_plugins_decode_config():
    """
    Page de configuration détaillée des plugins pour le décryptage
    """
    try:
        from app.plugin_manager import PluginManager
        from flask import current_app

        # Récupérer le PluginManager depuis l'app
        plugin_manager = current_app.plugin_manager

        # Récupérer les paramètres actuels
        settings = {
            'decode_enabled_plugins': AppConfig.get_value('plugins.decode.enabled', []),
            'decode_disabled_plugins': AppConfig.get_value('plugins.decode.disabled', [])
        }

        # Récupérer la liste des plugins disponibles pour le décryptage
        available_plugins = []
        for name, wrapper in plugin_manager.loaded_plugins.items():
            metadata_dict = None
            try:
                record = plugin_manager._get_plugin_record(name)
                if record and record.metadata_json:
                    import json as _json
                    metadata_dict = _json.loads(record.metadata_json)
            except Exception:
                pass

            capabilities = (metadata_dict or {}).get("capabilities", {}) or {}
            kinds = (metadata_dict or {}).get("kinds", []) or []
            defaults = (metadata_dict or {}).get("defaults", {}) or {}

            # Vérifier si le plugin peut être utilisé pour le décryptage
            can_decode = capabilities.get("decode", False) or (wrapper._instance and hasattr(wrapper._instance, "execute"))

            if can_decode:
                available_plugins.append({
                    'name': name,
                    'description': metadata_dict.get('description', '') if metadata_dict else '',
                    'kinds': kinds,
                    'can_decode': can_decode,
                    'default_decode': defaults.get('include_in_decode', True)
                })

        # Générer le HTML pour la page de configuration
        html = f"""
        <div data-controller="plugin-config"
             data-plugin-config-mode-value="decode"
             class="p-6 text-gray-200">

            <div class="mb-6">
                <h2 class="text-2xl font-semibold mb-2 flex items-center">
                    <i class="fas fa-key text-purple-400 mr-3"></i>
                    Configuration des Plugins - Décryptage
                </h2>
                <p class="text-gray-400">
                    Sélectionnez les plugins à utiliser lors de la phase de décryptage du MetaSolver.
                    Les plugins non sélectionnés ne seront pas utilisés lors de l'exécution des algorithmes.
                </p>
            </div>

            <!-- Barre d'outils -->
            <div class="flex justify-between items-center mb-6 p-4 bg-gray-800 rounded-lg">
                <div class="flex space-x-3">
                    <button data-action="click->plugin-config#selectAll"
                            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                        <i class="fas fa-check-square mr-2"></i>Tout sélectionner
                    </button>
                    <button data-action="click->plugin-config#deselectAll"
                            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                        <i class="fas fa-square mr-2"></i>Tout désélectionner
                    </button>
                </div>
                <div class="text-sm text-gray-400">
                    <span data-plugin-config-target="selectedCount">0</span> / <span data-plugin-config-target="totalCount">0</span> plugins sélectionnés
                </div>
            </div>

            <!-- Liste des plugins -->
            <div class="space-y-3" data-plugin-config-target="pluginList">
        """

        for plugin in available_plugins:
            # Déterminer l'état initial
            enabled_plugins = set(settings['decode_enabled_plugins'] or [])
            disabled_plugins = set(settings['decode_disabled_plugins'] or [])

            if plugin['name'] in enabled_plugins:
                is_checked = True
                is_default = False
            elif plugin['name'] in disabled_plugins:
                is_checked = False
                is_default = False
            else:
                is_checked = plugin['default_decode']
                is_default = True

            checked_attr = 'checked' if is_checked else ''
            default_indicator = ' <span class="text-xs text-gray-500">(défaut)</span>' if is_default else ''

            html += f"""
                <div class="plugin-item bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center space-x-3 mb-2">
                                <input type="checkbox"
                                       data-plugin-config-target="pluginCheckbox"
                                       data-plugin-name="{plugin['name']}"
                                       {checked_attr}
                                       class="form-checkbox h-5 w-5 text-purple-600 bg-gray-700 border-gray-600 rounded">
                                <h4 class="font-semibold text-white">{plugin['name']}{default_indicator}</h4>
                            </div>
                            {f'<p class="text-gray-300 text-sm mb-2 ml-8">{plugin["description"]}</p>' if plugin['description'] else ''}
                            <div class="flex flex-wrap gap-1 ml-8">
                                {"".join([f'<span class="px-2 py-1 bg-purple-600 text-white text-xs rounded">{kind}</span>' for kind in plugin["kinds"]])}
                            </div>
                        </div>
                        <div class="flex flex-col items-end text-xs text-gray-500">
                            <span class="mb-1">Décryptage: <span class="text-green-400">✓</span></span>
                        </div>
                    </div>
                </div>
            """

        html += """
            </div>

            <!-- Barre de sauvegarde -->
            <div class="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-4">
                <div class="flex justify-between items-center max-w-7xl mx-auto">
                    <div class="text-sm text-gray-400">
                        Les modifications sont sauvegardées automatiquement
                    </div>
                    <div class="flex space-x-3">
                        <button data-action="click->plugin-config#resetToDefaults"
                                class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
                            <i class="fas fa-undo mr-2"></i>Réinitialiser
                        </button>
                        <button data-action="click->plugin-config#saveConfiguration"
                                data-plugin-config-target="saveButton"
                                class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50">
                            <i class="fas fa-save mr-2"></i>Enregistrer
                        </button>
                    </div>
                </div>
            </div>

            <!-- Styles -->
            <style>
                .plugin-item:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                }
                .form-checkbox:checked {
                    background-color: #9333ea;
                    border-color: #9333ea;
                }
            </style>
        </div>
        """

        return Response(html, mimetype='text/html')
    except Exception as e:
        logger.error(f"Erreur génération page configuration décryptage: {str(e)}")
        return Response(f"<div class='p-4 text-red-200'>Erreur: {str(e)}</div>", mimetype='text/html', status=500)

@plugins_config_bp.route('/analysis-config/save', methods=['POST'])
def save_plugins_analysis_config():
    """
    Sauvegarde la configuration détaillée des plugins pour l'analyse
    """
    try:
        data = request.get_json()
        logger.info(f"=== DEBUG: Données reçues pour sauvegarde analyse: {data} ===")

        # Valider les données
        if not isinstance(data, dict):
            return jsonify({
                'success': False,
                'error': 'Format de données invalide'
            }), 400

        # Sauvegarder les paramètres d'analyse
        enabled_plugins = data.get('enabled_plugins', [])
        disabled_plugins = data.get('disabled_plugins', [])

        AppConfig.set_value(
            'plugins.analysis.enabled',
            enabled_plugins,
            category='plugins',
            description='Plugins explicitement activés pour l\'analyse'
        )

        AppConfig.set_value(
            'plugins.analysis.disabled',
            disabled_plugins,
            category='plugins',
            description='Plugins explicitement désactivés pour l\'analyse'
        )

        # Générer une version de cache basée sur le timestamp
        from datetime import datetime
        cache_version = datetime.now().strftime("%H:%M:%S")

        logger.info("=== DEBUG: Configuration analyse sauvegardée avec succès ===")
        return jsonify({
            'success': True,
            'message': 'Configuration de l\'analyse sauvegardée avec succès',
            'cache_version': cache_version,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"=== ERREUR lors de la sauvegarde de la configuration analyse: {str(e)} ===")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@plugins_config_bp.route('/decode-config/save', methods=['POST'])
def save_plugins_decode_config():
    """
    Sauvegarde la configuration détaillée des plugins pour le décryptage
    """
    try:
        data = request.get_json()
        logger.info(f"=== DEBUG: Données reçues pour sauvegarde décryptage: {data} ===")

        # Valider les données
        if not isinstance(data, dict):
            return jsonify({
                'success': False,
                'error': 'Format de données invalide'
            }), 400

        # Sauvegarder les paramètres de décryptage
        enabled_plugins = data.get('enabled_plugins', [])
        disabled_plugins = data.get('disabled_plugins', [])

        AppConfig.set_value(
            'plugins.decode.enabled',
            enabled_plugins,
            category='plugins',
            description='Plugins explicitement activés pour le décryptage'
        )

        AppConfig.set_value(
            'plugins.decode.disabled',
            disabled_plugins,
            category='plugins',
            description='Plugins explicitement désactivés pour le décryptage'
        )

        # Générer une version de cache basée sur le timestamp
        from datetime import datetime
        cache_version = datetime.now().strftime("%H:%M:%S")

        logger.info("=== DEBUG: Configuration décryptage sauvegardée avec succès ===")
        return jsonify({
            'success': True,
            'message': 'Configuration du décryptage sauvegardée avec succès',
            'cache_version': cache_version,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"=== ERREUR lors de la sauvegarde de la configuration décryptage: {str(e)} ===")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@plugins_config_bp.route('/analysis-config/info_panel', methods=['GET'])
def get_plugins_analysis_info_panel():
    """
    Retourne le panneau d'information pour la configuration d'analyse
    """
    try:
        html = """
        <div class="p-4">
            <h3 class="text-lg font-semibold mb-3 text-gray-200">
                <i class="fas fa-search text-blue-400 mr-2"></i>
                Configuration des Plugins - Analyse
            </h3>
            <div class="text-sm text-gray-400 space-y-2">
                <p>
                    <strong>Analyse</strong> : Phase de détection automatique des plugins pertinents
                    pour déchiffrer une énigme de géocaching.
                </p>
                <p>
                    Cette page vous permet de configurer quels plugins sont utilisés lors de
                    l'analyse automatique par le MetaSolver.
                </p>
                <ul class="mt-3 space-y-1">
                    <li>• <strong>Plugins activés</strong> : Utilisés lors de l'analyse</li>
                    <li>• <strong>Plugins désactivés</strong> : Ignorés lors de l'analyse</li>
                    <li>• <strong>Plugins par défaut</strong> : Suivent la configuration par défaut</li>
                </ul>
            </div>
        </div>
        """
        return Response(html, mimetype='text/html')
    except Exception as e:
        logger.error(f"Erreur génération panneau info analyse: {str(e)}")
        return Response("<div class='p-4 text-red-400'>Erreur de chargement</div>", mimetype='text/html', status=500)

@plugins_config_bp.route('/decode-config/info_panel', methods=['GET'])
def get_plugins_decode_info_panel():
    """
    Retourne le panneau d'information pour la configuration de décryptage
    """
    try:
        html = """
        <div class="p-4">
            <h3 class="text-lg font-semibold mb-3 text-gray-200">
                <i class="fas fa-key text-purple-400 mr-2"></i>
                Configuration des Plugins - Décryptage
            </h3>
            <div class="text-sm text-gray-400 space-y-2">
                <p>
                    <strong>Décryptage</strong> : Phase d'exécution des algorithmes de déchiffrement
                    sur les énigmes détectées.
                </p>
                <p>
                    Cette page vous permet de configurer quels plugins sont utilisés lors de
                    l'exécution des algorithmes de décryptage par le MetaSolver.
                </p>
                <ul class="mt-3 space-y-1">
                    <li>• <strong>Plugins activés</strong> : Utilisés lors du décryptage</li>
                    <li>• <strong>Plugins désactivés</strong> : Ignorés lors du décryptage</li>
                    <li>• <strong>Plugins par défaut</strong> : Suivent la configuration par défaut</li>
                </ul>
            </div>
        </div>
        """
        return Response(html, mimetype='text/html')
    except Exception as e:
        logger.error(f"Erreur génération panneau info décryptage: {str(e)}")
        return Response("<div class='p-4 text-red-400'>Erreur de chargement</div>", mimetype='text/html', status=500)

@settings_bp.route('/test_tabopener', methods=['GET'])
def test_tabopener():
    """
    Page de test pour diagnostiquer le TabOpenerService
    """
    logger.info("=== DEBUG: Route /api/settings/test_tabopener appelée ===")
    try:
        with open('test_tabopener_debug.html', 'r', encoding='utf-8') as f:
            html_content = f.read()
        return html_content
    except Exception as e:
        logger.error(f"=== ERREUR lors du chargement du test TabOpener: {str(e)} ===")
        return f"Erreur lors du chargement de la page de test: {str(e)}", 500 