/**
 * BaseSettingsController - Version corrigée et compatible
 * Fonctionne avec toutes les variantes de Stimulus
 */
(() => {
    console.log('🔧 [FIXED] Début du chargement de BaseSettingsController...');

    // Fonction pour trouver la classe Controller de Stimulus
    function getStimulusController() {
        // Option 1: Stimulus global avec Controller
        if (window.Stimulus && window.Stimulus.Controller) {
            console.log('🔧 [FIXED] ✅ Utilisation de window.Stimulus.Controller');
            return window.Stimulus.Controller;
        }
        
        // Option 2: StimulusApp global avec Controller
        if (window.StimulusApp && window.StimulusApp.Controller) {
            console.log('🔧 [FIXED] ✅ Utilisation de window.StimulusApp.Controller');
            return window.StimulusApp.Controller;
        }
        
        // Option 3: application globale avec Controller
        if (window.application && window.application.Controller) {
            console.log('🔧 [FIXED] ✅ Utilisation de window.application.Controller');
            return window.application.Controller;
        }
        
        // Option 4: Stimulus UMD
        if (typeof Stimulus !== 'undefined' && Stimulus.Controller) {
            console.log('🔧 [FIXED] ✅ Utilisation de Stimulus.Controller (UMD)');
            return Stimulus.Controller;
        }
        
        // Option 5: Chercher dans les modules chargés
        const modules = [window.Stimulus, window.StimulusApp, window.application];
        for (const module of modules) {
            if (module) {
                // Vérifier si c'est une application Stimulus
                if (module.controllers || module.register) {
                    // Essayer d'accéder au Controller via l'application
                    try {
                        // Créer un contrôleur vide pour obtenir la classe de base
                        const testController = class extends (module.constructor?.Controller || Object) {};
                        if (testController.prototype) {
                            console.log('🔧 [FIXED] ✅ Controller trouvé via constructor');
                            return module.constructor.Controller;
                        }
                    } catch (e) {
                        console.log('🔧 [FIXED] ⚠️ Test constructor échoué:', e.message);
                    }
                }
            }
        }
        
        console.error('🔧 [FIXED] ❌ Impossible de trouver Stimulus.Controller');
        return null;
    }

    // Fonction pour obtenir l'application Stimulus
    function getStimulusApplication() {
        return window.application || window.StimulusApp || window.Stimulus;
    }

    // Attendre que Stimulus soit disponible
    function waitForStimulus() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 secondes max
            
            const checkStimulus = () => {
                attempts++;
                const Controller = getStimulusController();
                
                if (Controller) {
                    console.log('🔧 [FIXED] ✅ Stimulus Controller trouvé après', attempts, 'tentatives');
                    resolve(Controller);
                } else if (attempts >= maxAttempts) {
                    console.error('🔧 [FIXED] ❌ Stimulus Controller non trouvé après', maxAttempts, 'tentatives');
                    resolve(null);
                } else {
                    setTimeout(checkStimulus, 100);
                }
            };
            
            checkStimulus();
        });
    }

    // Initialiser quand Stimulus est prêt
    waitForStimulus().then((StimulusController) => {
        if (!StimulusController) {
            console.error('🔧 [FIXED] ❌ Impossible de continuer sans Stimulus Controller');
            return;
        }

        try {
            console.log('🔧 [FIXED] 📝 Définition de BaseSettingsController...');

            class BaseSettingsController extends StimulusController {
                static targets = [
                    "loadingIndicator",
                    "saveButton", 
                    "notification",
                    "cacheVersion",
                    "syncStatus"
                ]

                // Configuration par défaut
                autoSaveDelay = 2000
                apiEndpoint = null
                settingsKey = null
                
                // État interne
                hasUnsavedChanges = false
                isLoading = false
                saveTimeout = null
                beforeUnloadHandler = null

                connect() {
                    console.log(`🔧 [FIXED] Contrôleur connecté: ${this.constructor.name}`);
                    
                    if (!this.apiEndpoint) {
                        console.error('🔧 [FIXED] ❌ apiEndpoint requis');
                        return;
                    }
                    
                    this.loadSettings();
                    this.setupAutoSave();
                    this.setupBeforeUnload();
                }

                disconnect() {
                    console.log('🔧 [FIXED] Contrôleur déconnecté');
                    this.cleanup();
                }

                // Méthodes à surcharger
                gatherSettings() {
                    throw new Error('gatherSettings() doit être implémentée');
                }
                
                updateUI(settings) {
                    throw new Error('updateUI() doit être implémentée');
                }
                
                getDefaults() {
                    return {};
                }

                // Chargement des settings
                async loadSettings() {
                    if (this.isLoading) return;
                    
                    try {
                        this.isLoading = true;
                        this.showLoading(true);
                        this.updateSyncStatus('Chargement...', 'loading');
                       
                        const response = await fetch(this.apiEndpoint);
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}`);
                        }
                       
                        const data = await response.json();
                        if (data.success) {
                            this.updateUI(data.settings || {});
                            this.updateCacheInfo(data.cache_version);
                            this.updateSyncStatus('À jour', 'success');
                            this.showNotification('Paramètres chargés', 'success');
                        } else {
                            throw new Error(data.error || 'Erreur inconnue');
                        }
                       
                    } catch (error) {
                        console.error('🔧 [FIXED] Erreur chargement:', error);
                        this.updateSyncStatus('Erreur', 'error');
                        this.showNotification('Erreur: ' + error.message, 'error');
                        this.resetToDefaults();
                    } finally {
                        this.isLoading = false;
                        this.showLoading(false);
                    }
                }

                // Sauvegarde des settings
                async saveSettings() {
                    if (this.isLoading) return;
                    
                    try {
                        this.isLoading = true;
                        this.showLoading(true);
                        this.updateSyncStatus('Sauvegarde...', 'loading');
                       
                        const settings = this.gatherSettings();
                        const response = await fetch(`${this.apiEndpoint}/save`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(settings)
                        });
                       
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}`);
                        }
                       
                        const data = await response.json();
                        if (data.success) {
                            this.hasUnsavedChanges = false;
                            this.updateCacheInfo(data.cache_version);
                            this.updateSyncStatus('Sauvegardé', 'success');
                            this.showNotification('Sauvegardé', 'success');
                        } else {
                            throw new Error(data.error || 'Erreur sauvegarde');
                        }
                       
                    } catch (error) {
                        console.error('🔧 [FIXED] Erreur sauvegarde:', error);
                        this.updateSyncStatus('Erreur sauvegarde', 'error');
                        this.showNotification('Erreur: ' + error.message, 'error');
                    } finally {
                        this.isLoading = false;
                        this.showLoading(false);
                    }
                }

                // Gestion des changements
                settingChanged() {
                    this.hasUnsavedChanges = true;
                    this.updateSyncStatus('Modifications...', 'pending');
                    this.debouncedSave();
                }

                setupAutoSave() {
                    this.debouncedSave = () => {
                        if (this.saveTimeout) clearTimeout(this.saveTimeout);
                        this.saveTimeout = setTimeout(() => this.saveSettings(), this.autoSaveDelay);
                    };
                }

                setupBeforeUnload() {
                    this.beforeUnloadHandler = (event) => {
                        if (this.hasUnsavedChanges) {
                            event.preventDefault();
                            event.returnValue = 'Modifications non sauvegardées.';
                            return 'Modifications non sauvegardées.';
                        }
                    };
                    window.addEventListener('beforeunload', this.beforeUnloadHandler);
                }

                // Actions publiques
                async manualSave() {
                    await this.saveSettings();
                }

                async refreshSettings() {
                    await this.loadSettings();
                }

                resetDefaults() {
                    const defaults = this.getDefaults();
                    this.updateUI(defaults);
                    this.hasUnsavedChanges = true;
                    this.updateSyncStatus('À réinitialiser...', 'pending');
                    this.debouncedSave();
                    this.showNotification('Réinitialisé aux valeurs par défaut', 'info');
                }

                // Interface utilisateur
                showLoading(isLoading) {
                    if (this.hasLoadingIndicatorTarget) {
                        this.loadingIndicatorTarget.classList.toggle('hidden', !isLoading);
                    }
                    if (this.hasSaveButtonTarget) {
                        this.saveButtonTarget.disabled = isLoading;
                    }
                }

                showNotification(message, type = 'info') {
                    if (this.hasNotificationTarget) {
                        this.notificationTarget.textContent = message;
                        this.notificationTarget.className = `notification ${type}`;
                        this.notificationTarget.classList.remove('hidden');
                       
                        setTimeout(() => {
                            this.notificationTarget.classList.add('hidden');
                        }, 4000);
                    }
                    console.log(`🔧 [FIXED] [${type.toUpperCase()}] ${message}`);
                }

                updateCacheInfo(version) {
                    if (this.hasCacheVersionTarget) {
                        this.cacheVersionTarget.textContent = version || '-';
                    }
                }

                updateSyncStatus(status, type) {
                    if (this.hasSyncStatusTarget) {
                        this.syncStatusTarget.textContent = status;
                        this.syncStatusTarget.className = {
                            'success': 'text-green-400',
                            'error': 'text-red-400', 
                            'loading': 'text-blue-400',
                            'pending': 'text-yellow-400'
                        }[type] || 'text-gray-400';
                    }
                }

                // Nettoyage
                cleanup() {
                    if (this.saveTimeout) clearTimeout(this.saveTimeout);
                    if (this.beforeUnloadHandler) {
                        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
                    }
                }

                // Utilitaires
                resetToDefaults() {
                    this.updateUI(this.getDefaults());
                }

                validateBoolean(value, defaultValue = false) {
                    return typeof value === 'boolean' ? value : defaultValue;
                }

                validateString(value, defaultValue = '') {
                    return typeof value === 'string' ? value : defaultValue;
                }

                validateNumber(value, defaultValue = 0) {
                    return typeof value === 'number' && !isNaN(value) ? value : defaultValue;
                }

                validateEnum(value, validOptions, defaultValue) {
                    return validOptions.includes(value) ? value : defaultValue;
                }
            }

            console.log('🔧 [FIXED] ✅ BaseSettingsController défini avec succès');

            // Rendre disponible globalement
            window.BaseSettingsController = BaseSettingsController;
            console.log('🔧 [FIXED] ✅ Assigné à window.BaseSettingsController');

            // Déclencher l'événement
            const event = new CustomEvent('BaseSettingsControllerReady', {
                detail: { BaseSettingsController }
            });
            window.dispatchEvent(event);
            console.log('🔧 [FIXED] ✅ Événement BaseSettingsControllerReady déclenché');

            console.log('🔧 [FIXED] 🎉 BaseSettingsController complètement initialisé !');

        } catch (error) {
            console.error('🔧 [FIXED] ❌ Erreur lors de la définition:', error);
            console.error('🔧 [FIXED] ❌ Stack:', error.stack);
        }
    });

    console.log('🔧 [FIXED] Script BaseSettingsController chargé, attente de Stimulus...');
})(); 