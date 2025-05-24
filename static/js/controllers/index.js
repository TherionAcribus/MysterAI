// Version simplifiée pour éviter les conflits avec Stimulus déjà initialisé
console.log('🔧 Chargement des contrôleurs de settings...');

// Fonction pour attendre que Stimulus soit disponible
function waitForStimulus() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50;
        
        function check() {
            const app = window.application || window.StimulusApp || window.Stimulus;
            
            if (app && app.register) {
                console.log('✅ Application Stimulus trouvée pour enregistrer les contrôleurs');
                resolve(app);
                return;
            }
            
            attempts++;
            if (attempts >= maxAttempts) {
                reject(new Error('Application Stimulus non disponible après 5 secondes'));
                return;
            }
            
            setTimeout(check, 100);
        }
        
        check();
    });
}

// Fonction pour charger dynamiquement un script
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Erreur chargement ${src}`));
        document.head.appendChild(script);
    });
}

// Fonction principale d'initialisation
async function initializeSettingsControllers() {
    try {
        console.log('🔧 Initialisation des contrôleurs de settings...');
        
        // 1. Attendre que Stimulus soit disponible
        const app = await waitForStimulus();
        
        // 2. Charger BaseSettingsController s'il n'est pas déjà chargé
        if (!window.BaseSettingsController) {
            console.log('📦 Chargement de BaseSettingsController...');
            await loadScript('/js/controllers/base_settings_controller_final.js');
            
            // Attendre que BaseSettingsController soit disponible
            await new Promise((resolve, reject) => {
                let attempts = 0;
                const check = () => {
                    if (window.BaseSettingsController) {
                        console.log('✅ BaseSettingsController disponible');
                        resolve();
                    } else if (++attempts > 50) {
                        reject(new Error('BaseSettingsController timeout'));
                    } else {
                        setTimeout(check, 100);
                    }
                };
                check();
            });
        } else {
            console.log('✅ BaseSettingsController déjà disponible');
        }
        
        // 3. Créer et enregistrer le contrôleur des paramètres généraux
        console.log('🔧 Création du contrôleur des paramètres généraux...');
        class GeneralSettingsController extends window.BaseSettingsController {
            static targets = [
                ...window.BaseSettingsController.targets,
                "autoMarkSolved", "autoCorrectCoordinates", "enableAutoScoring"
            ]
            
            apiEndpoint = '/api/settings/general'
            
            connect() {
                console.log('🔗 GeneralSettingsController connecté !');
                super.connect();
            }
            
            gatherSettings() {
                const settings = {
                    auto_mark_solved: this.hasAutoMarkSolvedTarget ? this.autoMarkSolvedTarget.checked : true,
                    auto_correct_coordinates: this.hasAutoCorrectCoordinatesTarget ? this.autoCorrectCoordinatesTarget.checked : true,
                    enable_auto_scoring: this.hasEnableAutoScoringTarget ? this.enableAutoScoringTarget.checked : true
                };
                console.log('📤 GeneralSettings gatherSettings:', settings);
                return settings;
            }
            
            updateUI(settings) {
                console.log('🔄 GeneralSettings updateUI appelée avec:', settings);
                
                if (this.hasAutoMarkSolvedTarget) {
                    this.autoMarkSolvedTarget.checked = settings.auto_mark_solved !== false;
                    console.log(`✅ auto_mark_solved mis à jour: ${this.autoMarkSolvedTarget.checked}`);
                } else {
                    console.warn('⚠️ Target autoMarkSolved non trouvé');
                }
                
                if (this.hasAutoCorrectCoordinatesTarget) {
                    this.autoCorrectCoordinatesTarget.checked = settings.auto_correct_coordinates !== false;
                    console.log(`✅ auto_correct_coordinates mis à jour: ${this.autoCorrectCoordinatesTarget.checked}`);
                } else {
                    console.warn('⚠️ Target autoCorrectCoordinates non trouvé');
                }
                
                if (this.hasEnableAutoScoringTarget) {
                    this.enableAutoScoringTarget.checked = settings.enable_auto_scoring !== false;
                    console.log(`✅ enable_auto_scoring mis à jour: ${this.enableAutoScoringTarget.checked}`);
                } else {
                    console.warn('⚠️ Target enableAutoScoring non trouvé');
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
        
        app.register('general-settings', GeneralSettingsController);
        console.log('✅ GeneralSettingsController enregistré avec succès');
        
        // 4. Créer et enregistrer le contrôleur des paramètres Formula Solver
        console.log('🔧 Création du contrôleur Formula Solver...');
        class FormulaSettingsController extends window.BaseSettingsController {
            static targets = [
                ...window.BaseSettingsController.targets,
                "formulaExtractionMethod", "questionExtractionMethod"
            ]
            
            apiEndpoint = '/api/settings/formula'
            
            connect() {
                console.log('🔗 FormulaSettingsController connecté !');
                super.connect();
            }
            
            gatherSettings() {
                return {
                    formula_extraction_method: this.hasFormulaExtractionMethodTarget ? 
                        this.formulaExtractionMethodTarget.value : 'regex',
                    question_extraction_method: this.hasQuestionExtractionMethodTarget ? 
                        this.questionExtractionMethodTarget.value : 'regex'
                };
            }
            
            updateUI(settings) {
                console.log('🔄 FormulaSettings updateUI appelée avec:', settings);
                
                if (this.hasFormulaExtractionMethodTarget) {
                    this.formulaExtractionMethodTarget.value = settings.formula_extraction_method || 'regex';
                }
                if (this.hasQuestionExtractionMethodTarget) {
                    this.questionExtractionMethodTarget.value = settings.question_extraction_method || 'regex';
                }
            }
            
            getDefaults() {
                return {
                    formula_extraction_method: 'regex',
                    question_extraction_method: 'regex'
                };
            }
        }
        
        app.register('formula-settings', FormulaSettingsController);
        console.log('✅ FormulaSettingsController enregistré avec succès');
        
        // 5. Déclencher l'événement global
        window.dispatchEvent(new CustomEvent('SettingsSystemReady', {
            detail: { 
                controllers: ['general-settings', 'formula-settings'],
                message: 'Système de settings complètement initialisé'
            }
        }));
        console.log('🎉 Système de settings complètement initialisé !');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation des contrôleurs de settings:', error);
    }
}

// Démarrer l'initialisation
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSettingsControllers);
} else {
    initializeSettingsControllers();
}

console.log('✅ Script index.js chargé (version simplifiée)');
