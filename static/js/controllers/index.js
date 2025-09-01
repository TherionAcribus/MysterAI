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
                "autoMarkSolved", "autoCorrectCoordinates", "enableAutoScoring", "openTabInSameSection"
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
                    enable_auto_scoring: this.hasEnableAutoScoringTarget ? this.enableAutoScoringTarget.checked : true,
                    open_tab_in_same_section: this.hasOpenTabInSameSectionTarget ? this.openTabInSameSectionTarget.checked : true
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
                
                if (this.hasOpenTabInSameSectionTarget) {
                    this.openTabInSameSectionTarget.checked = settings.open_tab_in_same_section !== false;
                    console.log(`✅ open_tab_in_same_section mis à jour: ${this.openTabInSameSectionTarget.checked}`);
                } else {
                    console.warn('⚠️ Target openTabInSameSection non trouvé');
                }
            }
            
            getDefaults() {
                return {
                    auto_mark_solved: true,
                    auto_correct_coordinates: true,
                    enable_auto_scoring: true,
                    open_tab_in_same_section: true
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
        
        // 4. Créer et enregistrer le contrôleur des paramètres des plugins
        console.log('🔧 Création du contrôleur des paramètres des plugins...');
        class PluginSettingsController extends window.BaseSettingsController {
            static values = { mode: String }
            static targets = [
                ...window.BaseSettingsController.targets,
                "pluginList", "analysisTab", "decodeTab", "selectAllAnalysis", "selectAllDecode",
                "deselectAllAnalysis", "deselectAllDecode", "analysisCount", "decodeCount"
            ]

            apiEndpoint = '/api/settings/plugins'

            connect() {
                console.log('🔗 PluginSettingsController connecté !');
                super.connect();
                this.currentTab = 'analysis'; // Onglet par défaut
                this.updateTabVisibility();
            }

            gatherSettings() {
                const mode = this.hasModeValue ? (this.modeValue || 'both') : 'both';
                const settings = {};

                // Collecter les états des checkboxes
                const checkboxes = this.element.querySelectorAll('input[type="checkbox"][data-plugin]');
                checkboxes.forEach(checkbox => {
                    const pluginName = checkbox.dataset.plugin;
                    const isAnalysis = checkbox.dataset.type === 'analysis';
                    const isEnabled = checkbox.checked;

                    if (isAnalysis) {
                        if (mode !== 'decode') {
                            if (!('analysis_enabled_plugins' in settings)) settings.analysis_enabled_plugins = [];
                            if (!('analysis_disabled_plugins' in settings)) settings.analysis_disabled_plugins = [];
                            if (isEnabled) settings.analysis_enabled_plugins.push(pluginName);
                            else settings.analysis_disabled_plugins.push(pluginName);
                        }
                    } else {
                        if (mode !== 'analysis') {
                            if (!('decode_enabled_plugins' in settings)) settings.decode_enabled_plugins = [];
                            if (!('decode_disabled_plugins' in settings)) settings.decode_disabled_plugins = [];
                            if (isEnabled) settings.decode_enabled_plugins.push(pluginName);
                            else settings.decode_disabled_plugins.push(pluginName);
                        }
                    }
                });

                console.log('📤 PluginSettings gatherSettings:', settings);
                return settings;
            }

            updateUI(settings) {
                console.log('🔄 PluginSettings updateUI appelée avec:', settings);

                const availablePlugins = this.availablePlugins || [];
                const mode = this.hasModeValue ? (this.modeValue || 'both') : 'both';
                const enabledAnalysisArr = this.parseListSetting(settings.analysis_enabled_plugins);
                const disabledAnalysisArr = this.parseListSetting(settings.analysis_disabled_plugins);
                const enabledDecodeArr = this.parseListSetting(settings.decode_enabled_plugins);
                const disabledDecodeArr = this.parseListSetting(settings.decode_disabled_plugins);

                const enabledAnalysis = new Set(enabledAnalysisArr);
                const disabledAnalysis = new Set(disabledAnalysisArr);
                const enabledDecode = new Set(enabledDecodeArr);
                const disabledDecode = new Set(disabledDecodeArr);

                // Filtrer les plugins selon le mode (analysis/decode/both)
                let filteredPlugins = availablePlugins;
                if (mode === 'analysis') {
                    filteredPlugins = availablePlugins.filter(p => p.can_analyze);
                } else if (mode === 'decode') {
                    filteredPlugins = availablePlugins.filter(p => p.can_decode);
                }

                // Mettre à jour les compteurs d'aperçu avec la liste filtrée
                this.updateOverviewCounts(settings, filteredPlugins);

                // Générer le HTML pour la liste des plugins
                let html = '';

                filteredPlugins.forEach(plugin => {
                    const analysisEnabled = enabledAnalysis.has(plugin.name);
                    const analysisDisabled = disabledAnalysis.has(plugin.name);
                    const decodeEnabled = enabledDecode.has(plugin.name);
                    const decodeDisabled = disabledDecode.has(plugin.name);

                    // Déterminer l'état par défaut pour l'analyse
                    let analysisChecked = plugin.can_analyze;
                    if (analysisEnabled) analysisChecked = true;
                    else if (analysisDisabled) analysisChecked = false;
                    else analysisChecked = plugin.default_analysis;

                    // Déterminer l'état par défaut pour le décryptage
                    let decodeChecked = plugin.can_decode;
                    if (decodeEnabled) decodeChecked = true;
                    else if (decodeDisabled) decodeChecked = false;
                    else decodeChecked = plugin.default_decode;

                    html += `
                        <div class="plugin-item bg-gray-700 rounded-lg p-4 mb-3">
                            <div class="flex items-start justify-between">
                                <div class="flex-1">
                                    <h4 class="font-semibold text-white mb-1">${plugin.name}</h4>
                                    ${plugin.description ? `<p class="text-gray-300 text-sm mb-2">${plugin.description}</p>` : ''}
                                    <div class="flex flex-wrap gap-1 mb-2">
                                        ${plugin.kinds.map(kind => `<span class="px-2 py-1 bg-blue-600 text-white text-xs rounded">${kind}</span>`).join('')}
                                    </div>
                                </div>
                                <div class="flex flex-col gap-2 ml-4">
                                    ${plugin.can_analyze && mode !== 'decode' ? `
                                        <label class="flex items-center gap-2 text-sm">
                                            <input type="checkbox"
                                                   data-plugin="${plugin.name}"
                                                   data-type="analysis"
                                                   data-action="change->plugin-settings#settingChanged"
                                                   ${analysisChecked ? 'checked' : ''}
                                                   class="rounded">
                                            <span class="text-gray-300">Analyse</span>
                                        </label>
                                    ` : ''}
                                    ${plugin.can_decode && mode !== 'analysis' ? `
                                        <label class="flex items-center gap-2 text-sm">
                                            <input type="checkbox"
                                                   data-plugin="${plugin.name}"
                                                   data-type="decode"
                                                   data-action="change->plugin-settings#settingChanged"
                                                   ${decodeChecked ? 'checked' : ''}
                                                   class="rounded">
                                            <span class="text-gray-300">Décryptage</span>
                                        </label>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                });

                if (this.hasPluginListTarget) {
                    this.pluginListTarget.innerHTML = html;
                }
            }

            // Convertit une valeur de paramètre (array ou string) en array robuste
            parseListSetting(value) {
                if (Array.isArray(value)) return value;
                if (typeof value === 'string') {
                    const trimmed = value.trim();
                    if (!trimmed) return [];
                    // Essayer JSON.parse tel quel
                    try {
                        const parsed = JSON.parse(trimmed);
                        return Array.isArray(parsed) ? parsed : [];
                    } catch (e1) {
                        // Essayer en remplaçant les quotes simples par doubles (format Python-like)
                        try {
                            const normalized = trimmed.replace(/'/g, '"');
                            const parsed2 = JSON.parse(normalized);
                            return Array.isArray(parsed2) ? parsed2 : [];
                        } catch (e2) {
                            // Fallback: parser manuellement [a, b, c]
                            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                                const inner = trimmed.slice(1, -1).trim();
                                if (!inner) return [];
                                return inner.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
                            }
                            return [];
                        }
                    }
                }
                return [];
            }

            getDefaults() {
                return {
                    analysis_enabled_plugins: [],
                    analysis_disabled_plugins: [],
                    decode_enabled_plugins: [],
                    decode_disabled_plugins: []
                };
            }

            // Mettre à jour les compteurs d'aperçu
            updateOverviewCounts(settings, availablePlugins) {
                const enabledAnalysis = new Set(settings.analysis_enabled_plugins || []);
                const disabledAnalysis = new Set(settings.analysis_disabled_plugins || []);
                const enabledDecode = new Set(settings.decode_enabled_plugins || []);
                const disabledDecode = new Set(settings.decode_disabled_plugins || []);

                let analysisCount = 0;
                let decodeCount = 0;

                availablePlugins.forEach(plugin => {
                    // Compter pour l'analyse
                    const analysisEnabled = enabledAnalysis.has(plugin.name);
                    const analysisDisabled = disabledAnalysis.has(plugin.name);
                    let analysisChecked = plugin.can_analyze;
                    if (analysisEnabled) analysisChecked = true;
                    else if (analysisDisabled) analysisChecked = false;
                    else analysisChecked = plugin.default_analysis;

                    if (analysisChecked) analysisCount++;

                    // Compter pour le décryptage
                    const decodeEnabled = enabledDecode.has(plugin.name);
                    const decodeDisabled = disabledDecode.has(plugin.name);
                    let decodeChecked = plugin.can_decode;
                    if (decodeEnabled) decodeChecked = true;
                    else if (decodeDisabled) decodeChecked = false;
                    else decodeChecked = plugin.default_decode;

                    if (decodeChecked) decodeCount++;
                });

                if (this.hasAnalysisCountTarget) {
                    this.analysisCountTarget.textContent = analysisCount;
                }
                if (this.hasDecodeCountTarget) {
                    this.decodeCountTarget.textContent = decodeCount;
                }
            }

            // Ouvrir les paramètres détaillés dans GoldenLayout
            async openDetailedSettings() {
                try {
                    console.log('🔧 Ouverture des paramètres détaillés des plugins...');

                    // Utiliser TabOpenerService pour ouvrir dans GoldenLayout
                    if (window.TabOpenerService) {
                        const tabConfig = {
                            title: 'Configuration des Plugins',
                            type: 'component',
                            componentName: 'iframe',
                            componentState: {
                                url: '/api/settings/plugins_panel',
                                title: 'Configuration des Plugins'
                            }
                        };

                        await window.TabOpenerService.openTab(tabConfig);
                        this.showNotification('Panneau de configuration ouvert', 'success');
                    } else {
                        // Fallback: ouvrir dans une nouvelle fenêtre
                        console.warn('TabOpenerService non disponible, ouverture dans une nouvelle fenêtre');
                        window.open('/api/settings/plugins_panel', '_blank', 'width=1000,height=800');
                        this.showNotification('Ouverture dans une nouvelle fenêtre', 'info');
                    }
                } catch (error) {
                    console.error('Erreur lors de l\'ouverture des paramètres détaillés:', error);
                    this.showNotification('Erreur lors de l\'ouverture: ' + error.message, 'error');
                }
            }

            // Gestion des onglets
            showAnalysisTab() {
                this.currentTab = 'analysis';
                this.updateTabVisibility();
            }

            showDecodeTab() {
                this.currentTab = 'decode';
                this.updateTabVisibility();
            }

            updateTabVisibility() {
                if (this.hasAnalysisTabTarget && this.hasDecodeTabTarget) {
                    if (this.currentTab === 'analysis') {
                        this.analysisTabTarget.classList.remove('hidden');
                        this.decodeTabTarget.classList.add('hidden');
                    } else {
                        this.analysisTabTarget.classList.add('hidden');
                        this.decodeTabTarget.classList.remove('hidden');
                    }
                }
            }

            // Gestion des sélections multiples
            selectAllAnalysis() {
                this.setAllCheckboxes('analysis', true);
            }

            deselectAllAnalysis() {
                this.setAllCheckboxes('analysis', false);
            }

            selectAllDecode() {
                this.setAllCheckboxes('decode', true);
            }

            deselectAllDecode() {
                this.setAllCheckboxes('decode', false);
            }

            setAllCheckboxes(type, checked) {
                const checkboxes = this.element.querySelectorAll(`input[type="checkbox"][data-type="${type}"]`);
                checkboxes.forEach(checkbox => {
                    checkbox.checked = checked;
                });
                this.settingChanged();
            }

            // Override de loadInitialSettings pour stocker les plugins disponibles
            async loadInitialSettings() {
                try {
                    this.updateSyncStatus('Chargement...');

                    const response = await fetch(this.apiEndpoint);
                    const data = await response.json();

                    if (data.success) {
                        this.availablePlugins = data.available_plugins || [];
                        this.updateUI(data.settings);
                        this.updateSyncStatus('À jour');
                        this.showNotification('Paramètres des plugins chargés', 'success');
                    } else {
                        throw new Error(data.error || 'Erreur inconnue');
                    }
                } catch (error) {
                    console.error('Erreur chargement plugins:', error);
                    this.showNotification('Erreur: ' + error.message, 'error');
                    this.updateSyncStatus('Erreur');
                }
            }
        }

        app.register('plugin-settings', PluginSettingsController);
        console.log('✅ PluginSettingsController enregistré avec succès');

        // 5. Créer et enregistrer le contrôleur de configuration détaillée des plugins
        console.log('🔧 Création du contrôleur de configuration détaillée des plugins...');
        class PluginConfigController extends window.BaseSettingsController {
            static targets = [
                ...window.BaseSettingsController.targets,
                "pluginCheckbox", "selectedCount", "totalCount", "saveButton"
            ]

            mode = 'analysis' // analysis ou decode

            connect() {
                console.log('🔗 PluginConfigController connecté !');
                super.connect();
                this.mode = this.modeValue || 'analysis';
                this.updateCounts();
                this.attachCheckboxListeners();
            }

            // Écouter les changements des checkboxes
            attachCheckboxListeners() {
                this.pluginCheckboxTargets.forEach(checkbox => {
                    checkbox.addEventListener('change', () => {
                        this.updateCounts();
                        this.settingChanged();
                    });
                });
            }

            // Mettre à jour les compteurs
            updateCounts() {
                const checkedBoxes = this.pluginCheckboxTargets.filter(cb => cb.checked);
                const totalBoxes = this.pluginCheckboxTargets.length;

                if (this.hasSelectedCountTarget) {
                    this.selectedCountTarget.textContent = checkedBoxes.length;
                }
                if (this.hasTotalCountTarget) {
                    this.totalCountTarget.textContent = totalBoxes;
                }
            }

            // Collecter les paramètres actuels
            gatherSettings() {
                const settings = {
                    mode: this.mode,
                    enabled_plugins: [],
                    disabled_plugins: []
                };

                this.pluginCheckboxTargets.forEach(checkbox => {
                    const pluginName = checkbox.dataset.pluginName;
                    if (checkbox.checked) {
                        settings.enabled_plugins.push(pluginName);
                    } else {
                        settings.disabled_plugins.push(pluginName);
                    }
                });

                console.log('📤 PluginConfig gatherSettings:', settings);
                return settings;
            }

            // Mettre à jour l'interface
            updateUI(settings) {
                console.log('🔄 PluginConfig updateUI appelée avec:', settings);
                // L'interface est générée côté serveur, pas besoin de mise à jour côté client
            }

            // Valeurs par défaut
            getDefaults() {
                return {
                    mode: this.mode,
                    enabled_plugins: [],
                    disabled_plugins: []
                };
            }

            // Actions
            selectAll() {
                this.setAllCheckboxes(true);
            }

            deselectAll() {
                this.setAllCheckboxes(false);
            }

            setAllCheckboxes(checked) {
                this.pluginCheckboxTargets.forEach(checkbox => {
                    checkbox.checked = checked;
                });
                this.updateCounts();
                this.settingChanged();
            }

            resetToDefaults() {
                if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres aux valeurs par défaut ?')) {
                    // Réinitialiser côté serveur en rechargeant la page
                    window.location.reload();
                }
            }

            // Sauvegarde manuelle
            async saveConfiguration() {
                if (this.hasSaveButtonTarget) {
                    this.saveButtonTarget.disabled = true;
                    this.saveButtonTarget.textContent = 'Sauvegarde...';
                }

                try {
                    await this.manualSave();
                    this.showNotification('Configuration sauvegardée avec succès', 'success');
                } catch (error) {
                    this.showNotification('Erreur lors de la sauvegarde: ' + error.message, 'error');
                } finally {
                    if (this.hasSaveButtonTarget) {
                        this.saveButtonTarget.disabled = false;
                        this.saveButtonTarget.textContent = 'Enregistrer';
                    }
                }
            }

            // Override de manualSave pour gérer les routes spécifiques
            async manualSave() {
                try {
                    this.updateSyncStatus('Sauvegarde...');

                    const settings = this.gatherSettings();
                    const endpoint = this.mode === 'analysis'
                        ? '/api/plugins/analysis-config/save'
                        : '/api/plugins/decode-config/save';

                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(settings)
                    });

                    const data = await response.json();

                    if (data.success) {
                        this.updateSyncStatus('Sauvegardé');
                        return data;
                    } else {
                        throw new Error(data.error || 'Erreur inconnue');
                    }
                } catch (error) {
                    console.error('Erreur sauvegarde:', error);
                    this.updateSyncStatus('Erreur');
                    throw error;
                }
            }
        }

        app.register('plugin-config', PluginConfigController);
        console.log('✅ PluginConfigController enregistré avec succès');

        // 6. Déclencher l'événement global
        window.dispatchEvent(new CustomEvent('SettingsSystemReady', {
            detail: { 
                controllers: ['general-settings', 'formula-settings', 'plugin-settings', 'plugin-config'],
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
