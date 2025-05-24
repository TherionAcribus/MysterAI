/**
 * Version de débogage de BaseSettingsController
 * Compatible avec l'architecture Stimulus globale existante
 */
(() => {
    console.log('🔧 [DEBUG] Début du script BaseSettingsController...');

    // Vérifier les prérequis
    console.log('🔧 [DEBUG] Vérification de window.Stimulus:', window.Stimulus ? '✅ Disponible' : '❌ Manquant');
    console.log('🔧 [DEBUG] Vérification de window.StimulusApp:', window.StimulusApp ? '✅ Disponible' : '❌ Manquant');
    console.log('🔧 [DEBUG] Vérification de window.application:', window.application ? '✅ Disponible' : '❌ Manquant');

    // S'assurer que Stimulus est disponible globalement
    if (!window.Stimulus && !window.StimulusApp) {
        console.error('🔧 [DEBUG] ❌ Ni window.Stimulus ni window.StimulusApp disponibles');
        return;
    }

    // Utiliser la première version de Stimulus trouvée
    const StimulusApp = window.Stimulus || window.StimulusApp;
    console.log('🔧 [DEBUG] ✅ Utilisation de Stimulus:', StimulusApp);

    try {
        console.log('🔧 [DEBUG] Début de définition de la classe BaseSettingsController...');

        class BaseSettingsController extends StimulusApp.Controller {
            static targets = [
                "loadingIndicator",
                "saveButton", 
                "notification",
                "cacheVersion",
                "syncStatus"
            ]

            // Configuration par défaut - à surcharger dans les classes filles
            autoSaveDelay = 2000
            apiEndpoint = null      // À définir dans la classe fille ex: '/api/settings/general'
            settingsKey = null      // À définir dans la classe fille ex: 'general'
            
            // État interne
            hasUnsavedChanges = false
            isLoading = false
            saveTimeout = null
            beforeUnloadHandler = null

            connect() {
                console.log(`🔧 [DEBUG] Contrôleur de settings connecté: ${this.constructor.name}`)
                
                if (!this.apiEndpoint) {
                    console.error('🔧 [DEBUG] ❌ apiEndpoint doit être défini dans la classe fille')
                    return
                }
                
                this.loadSettings()
                this.setupAutoSave()
                this.setupBeforeUnload()
            }

            disconnect() {
                console.log('🔧 [DEBUG] Contrôleur de settings déconnecté')
                this.cleanup()
            }

            // === MÉTHODES À SURCHARGER ===
            
            gatherSettings() {
                throw new Error('gatherSettings() doit être implémentée dans la classe fille')
            }
            
            updateUI(settings) {
                throw new Error('updateUI() doit être implémentée dans la classe fille')
            }
            
            getDefaults() {
                return {}
            }

            // === CHARGEMENT ===
            
            async loadSettings() {
                if (this.isLoading) return
                
                try {
                    this.isLoading = true
                    this.showLoading(true)
                    this.updateSyncStatus('Chargement...', 'loading')
                   
                    const response = await fetch(this.apiEndpoint, {
                        headers: { 'Content-Type': 'application/json' }
                    })
                   
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
                    }
                   
                    const data = await response.json()
                   
                    if (data.success) {
                        this.updateUI(data.settings || {})
                        this.updateCacheInfo(data.cache_version)
                        this.updateSyncStatus('À jour', 'success')
                        this.showNotification('Paramètres chargés avec succès', 'success')
                    } else {
                        throw new Error(data.error || 'Erreur inconnue')
                    }
                   
                } catch (error) {
                    console.error('🔧 [DEBUG] Erreur de chargement:', error)
                    this.updateSyncStatus('Erreur', 'error')
                    this.showNotification('Erreur de chargement: ' + error.message, 'error')
                    this.resetToDefaults()
                } finally {
                    this.isLoading = false
                    this.showLoading(false)
                }
            }

            // === SAUVEGARDE ===
            
            async saveSettings() {
                if (this.isLoading) return
                
                try {
                    this.isLoading = true
                    this.showLoading(true)
                    this.updateSyncStatus('Sauvegarde...', 'loading')
                   
                    const settings = this.gatherSettings()
                   
                    const response = await fetch(`${this.apiEndpoint}/save`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(settings)
                    })
                   
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
                    }
                   
                    const data = await response.json()
                   
                    if (data.success) {
                        this.hasUnsavedChanges = false
                        this.updateCacheInfo(data.cache_version)
                        this.updateSyncStatus('Sauvegardé', 'success')
                        this.showNotification('Paramètres sauvegardés', 'success')
                    } else {
                        throw new Error(data.error || 'Erreur de sauvegarde')
                    }
                   
                } catch (error) {
                    console.error('🔧 [DEBUG] Erreur de sauvegarde:', error)
                    this.updateSyncStatus('Erreur sauvegarde', 'error')
                    this.showNotification('Erreur de sauvegarde: ' + error.message, 'error')
                } finally {
                    this.isLoading = false
                    this.showLoading(false)
                }
            }

            // === GESTION DES CHANGEMENTS ===
            
            settingChanged() {
                this.hasUnsavedChanges = true
                this.updateSyncStatus('Modifications...', 'pending')
                this.debouncedSave()
            }

            setupAutoSave() {
                this.debouncedSave = () => {
                    if (this.saveTimeout) {
                        clearTimeout(this.saveTimeout)
                    }
                    this.saveTimeout = setTimeout(() => {
                        this.saveSettings()
                    }, this.autoSaveDelay)
                }
            }

            setupBeforeUnload() {
                this.beforeUnloadHandler = (event) => {
                    if (this.hasUnsavedChanges) {
                        event.preventDefault()
                        event.returnValue = 'Vous avez des modifications non sauvegardées.'
                        return 'Vous avez des modifications non sauvegardées.'
                    }
                }
                window.addEventListener('beforeunload', this.beforeUnloadHandler)
            }

            // === ACTIONS PUBLIQUES ===
            
            async manualSave() {
                await this.saveSettings()
            }

            async refreshSettings() {
                await this.loadSettings()
            }

            resetDefaults() {
                const defaults = this.getDefaults()
                this.updateUI(defaults)
                this.hasUnsavedChanges = true
                this.updateSyncStatus('À réinitialiser...', 'pending')
                this.debouncedSave()
                this.showNotification('Paramètres réinitialisés aux valeurs par défaut', 'info')
            }

            // === INTERFACE UTILISATEUR ===
            
            showLoading(isLoading) {
                if (this.hasLoadingIndicatorTarget) {
                    this.loadingIndicatorTarget.classList.toggle('hidden', !isLoading)
                }
                if (this.hasSaveButtonTarget) {
                    this.saveButtonTarget.disabled = isLoading
                }
            }

            showNotification(message, type = 'info') {
                if (this.hasNotificationTarget) {
                    this.notificationTarget.textContent = message
                    this.notificationTarget.className = `notification ${type}`
                    this.notificationTarget.classList.remove('hidden')
                   
                    setTimeout(() => {
                        this.notificationTarget.classList.add('hidden')
                    }, 4000)
                }
                console.log(`🔧 [DEBUG] [${type.toUpperCase()}] ${message}`)
            }

            updateCacheInfo(version) {
                if (this.hasCacheVersionTarget) {
                    this.cacheVersionTarget.textContent = version || '-'
                }
            }

            updateSyncStatus(status, type) {
                if (this.hasSyncStatusTarget) {
                    this.syncStatusTarget.textContent = status
                    this.syncStatusTarget.className = {
                        'success': 'text-green-400',
                        'error': 'text-red-400', 
                        'loading': 'text-blue-400',
                        'pending': 'text-yellow-400'
                    }[type] || 'text-gray-400'
                }
            }

            // === NETTOYAGE ===
            
            cleanup() {
                if (this.saveTimeout) {
                    clearTimeout(this.saveTimeout)
                }
                if (this.beforeUnloadHandler) {
                    window.removeEventListener('beforeunload', this.beforeUnloadHandler)
                }
            }

            // === UTILITAIRES ===
            
            resetToDefaults() {
                this.updateUI(this.getDefaults())
            }

            validateBoolean(value, defaultValue = false) {
                return typeof value === 'boolean' ? value : defaultValue
            }

            validateString(value, defaultValue = '') {
                return typeof value === 'string' ? value : defaultValue
            }

            validateNumber(value, defaultValue = 0) {
                return typeof value === 'number' && !isNaN(value) ? value : defaultValue
            }

            validateEnum(value, validOptions, defaultValue) {
                return validOptions.includes(value) ? value : defaultValue
            }
        }

        console.log('🔧 [DEBUG] ✅ Classe BaseSettingsController définie avec succès');

        // Rendre BaseSettingsController disponible globalement IMMÉDIATEMENT
        window.BaseSettingsController = BaseSettingsController;
        console.log('🔧 [DEBUG] ✅ BaseSettingsController assigné à window.BaseSettingsController');

        // Déclencher un événement personnalisé pour notifier que BaseSettingsController est prêt
        const event = new CustomEvent('BaseSettingsControllerReady', {
            detail: { BaseSettingsController }
        });
        window.dispatchEvent(event);
        console.log('🔧 [DEBUG] ✅ Événement BaseSettingsControllerReady déclenché');

        console.log('🔧 [DEBUG] 🎉 BaseSettingsController chargé et disponible globalement');

    } catch (error) {
        console.error('🔧 [DEBUG] ❌ Erreur lors de la définition de BaseSettingsController:', error);
        console.error('🔧 [DEBUG] ❌ Stack trace:', error.stack);
    }
})(); 