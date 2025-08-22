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