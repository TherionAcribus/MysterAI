/**
 * Contrôleur Stimulus pour les paramètres généraux
 */
(() => {
    // S'assurer que Stimulus est disponible globalement
    if (!window.Stimulus) {
        console.error("Stimulus n'est pas disponible globalement");
        return;
    }
    
    class GeneralSettingsController extends Stimulus.Controller {
        static targets = [
            "autoMarkSolved", "autoCorrectCoordinates", "enableAutoScoring", "openTabsInSameSection"
        ];
        
        connect() {
            console.log('=== DEBUG: GeneralSettingsController connecté ===');
            console.log('=== DEBUG: Cibles disponibles ===', {
                autoMarkSolved: this.hasAutoMarkSolvedTarget,
                autoCorrectCoordinates: this.hasAutoCorrectCoordinatesTarget,
                enableAutoScoring: this.hasEnableAutoScoringTarget,
                openTabsInSameSection: this.hasOpenTabsInSameSectionTarget
            });
            
            // Attendre un instant pour s'assurer que le DOM est complètement chargé
            setTimeout(() => {
                this.loadSettings();
            }, 100);
            
            // Ajouter des écouteurs d'événements pour les changements en temps réel
            if (this.hasOpenTabsInSameSectionTarget) {
                this.openTabsInSameSectionTarget.addEventListener('change', this.handleTabSectionChange.bind(this));
            }
        }
        
        /**
         * Gérer le changement du paramètre d'ouverture des onglets en temps réel
         */
        handleTabSectionChange(event) {
            console.log('=== DEBUG: Changement du paramètre d\'ouverture des onglets ===', event.target.checked);
            
            // Émettre un événement personnalisé pour informer GoldenLayout du changement
            const settingChangeEvent = new CustomEvent('goldenLayoutSettingChange', {
                detail: {
                    setting: 'openTabsInSameSection',
                    value: event.target.checked
                },
                bubbles: true
            });
            
            // Émettre l'événement dans le document pour qu'il puisse être capturé globalement
            document.dispatchEvent(settingChangeEvent);
        }
        
        /**
         * Charger les paramètres depuis le gestionnaire de configuration
         */
        async loadSettings() {
            console.log('=== DEBUG: Chargement des paramètres généraux ===');
            
            // Vérifier que les cibles sont disponibles
            if (!this.hasAutoMarkSolvedTarget || !this.hasAutoCorrectCoordinatesTarget || 
                !this.hasEnableAutoScoringTarget || !this.hasOpenTabsInSameSectionTarget) {
                console.warn('=== WARN: Les cibles ne sont pas encore disponibles, réessai dans 100ms ===');
                setTimeout(() => this.loadSettings(), 100);
                return;
            }
            
            try {
                // Utiliser le ConfigManager pour récupérer les paramètres généraux
                const settings = await window.configManager.getCategory('general');
                
                if (settings) {
                    this.updateUI(settings);
                } else {
                    console.error('Erreur lors du chargement des paramètres: Aucune donnée reçue');
                    this.resetToDefaults();
                }
            } catch (error) {
                console.error('Erreur lors du chargement des paramètres:', error);
                this.resetToDefaults();
            }
        }
        
        /**
         * Mettre à jour l'interface utilisateur avec les paramètres
         */
        updateUI(settings) {
            console.log('=== DEBUG: Mise à jour de l\'UI avec les paramètres ===', settings);
            
            // Si settings est null ou undefined, utiliser un objet vide
            settings = settings || {};
            
            if (this.hasAutoMarkSolvedTarget) {
                // Utiliser true comme valeur par défaut si la propriété est absente
                this.autoMarkSolvedTarget.checked = settings.auto_mark_solved !== undefined ? 
                    settings.auto_mark_solved : true;
            } else {
                console.warn('=== WARN: Cible autoMarkSolved non disponible ===');
            }
            
            if (this.hasAutoCorrectCoordinatesTarget) {
                // Utiliser true comme valeur par défaut si la propriété est absente
                this.autoCorrectCoordinatesTarget.checked = settings.auto_correct_coordinates !== undefined ? 
                    settings.auto_correct_coordinates : true;
            } else {
                console.warn('=== WARN: Cible autoCorrectCoordinates non disponible ===');
            }
            
            if (this.hasEnableAutoScoringTarget) {
                // Utiliser true comme valeur par défaut si la propriété est absente
                this.enableAutoScoringTarget.checked = settings.enable_auto_scoring !== undefined ? 
                    settings.enable_auto_scoring : true;
            } else {
                console.warn('=== WARN: Cible enableAutoScoring non disponible ===');
            }
            
            if (this.hasOpenTabsInSameSectionTarget) {
                // Utiliser true comme valeur par défaut si la propriété est absente
                this.openTabsInSameSectionTarget.checked = settings.open_tabs_in_same_section !== undefined ? 
                    settings.open_tabs_in_same_section : true;
            } else {
                console.warn('=== WARN: Cible openTabsInSameSection non disponible ===');
            }
        }
        
        /**
         * Définir les valeurs par défaut (True)
         */
        resetToDefaults() {
            if (this.hasAutoMarkSolvedTarget) {
                this.autoMarkSolvedTarget.checked = true;
            }
            
            if (this.hasAutoCorrectCoordinatesTarget) {
                this.autoCorrectCoordinatesTarget.checked = true;
            }
            
            if (this.hasEnableAutoScoringTarget) {
                this.enableAutoScoringTarget.checked = true;
            }
            
            if (this.hasOpenTabsInSameSectionTarget) {
                this.openTabsInSameSectionTarget.checked = true;
            }
        }
        
        /**
         * Enregistrer les paramètres
         */
        async saveSettings() {
            console.log('=== DEBUG: Enregistrement des paramètres ===');
            
            if (!this.hasAutoMarkSolvedTarget || !this.hasAutoCorrectCoordinatesTarget || 
                !this.hasEnableAutoScoringTarget || !this.hasOpenTabsInSameSectionTarget) {
                console.error('=== ERREUR: Les cibles ne sont pas disponibles ===');
                this.showNotification('Erreur: Impossible d\'accéder aux paramètres', true);
                return;
            }
            
            const settings = {
                auto_mark_solved: this.autoMarkSolvedTarget.checked,
                auto_correct_coordinates: this.autoCorrectCoordinatesTarget.checked,
                enable_auto_scoring: this.enableAutoScoringTarget.checked,
                open_tabs_in_same_section: this.openTabsInSameSectionTarget.checked
            };
            
            console.log('=== DEBUG: Paramètres à enregistrer ===', settings);
            
            try {
                // Utiliser le ConfigManager pour sauvegarder les paramètres
                const success = await window.configManager.saveCategory('general', settings);
                
                if (success) {
                    this.showNotification('Paramètres enregistrés avec succès!');
                    
                    // Émettre des événements pour les paramètres modifiés
                    this.notifySettingsChanged(settings);
                } else {
                    this.showNotification('Erreur lors de l\'enregistrement des paramètres', true);
                }
            } catch (error) {
                console.error('=== ERREUR lors de l\'enregistrement ===', error);
                this.showNotification('Erreur: ' + error.message, true);
            }
        }
        
        /**
         * Notifier l'application des changements de paramètres
         */
        notifySettingsChanged(settings) {
            console.log('=== DEBUG: Notification des changements de paramètres ===');
            
            // Créer et émettre un événement pour le paramètre d'ouverture des onglets
            const tabSettingEvent = new CustomEvent('goldenLayoutSettingChange', {
                detail: {
                    setting: 'openTabsInSameSection',
                    value: settings.open_tabs_in_same_section
                },
                bubbles: true
            });
            
            document.dispatchEvent(tabSettingEvent);
        }
        
        /**
         * Réinitialiser les paramètres aux valeurs par défaut
         */
        async resetDefaults() {
            console.log('=== DEBUG: Réinitialisation des paramètres ===');
            
            if (!this.hasAutoMarkSolvedTarget || !this.hasAutoCorrectCoordinatesTarget || 
                !this.hasEnableAutoScoringTarget || !this.hasOpenTabsInSameSectionTarget) {
                console.error('=== ERREUR: Les cibles ne sont pas disponibles ===');
                this.showNotification('Erreur: Impossible d\'accéder aux paramètres', true);
                return;
            }
            
            // Définir les valeurs par défaut (True)
            this.autoMarkSolvedTarget.checked = true;
            this.autoCorrectCoordinatesTarget.checked = true;
            this.enableAutoScoringTarget.checked = true;
            this.openTabsInSameSectionTarget.checked = true;
            
            // Enregistrer les valeurs par défaut
            await this.saveSettings();
            
            // Effacer le cache pour cette catégorie pour forcer un rechargement
            window.configManager.clearCache('general');
            
            this.showNotification('Paramètres réinitialisés aux valeurs par défaut');
        }
        
        /**
         * Afficher une notification
         */
        showNotification(message, isError = false) {
            console.log(`=== DEBUG: Affichage d'une notification (${isError ? 'erreur' : 'succès'}) ===`, message);
            
            // Créer l'élément de notification
            const notification = document.createElement('div');
            notification.className = `notification ${isError ? 'error' : 'success'}`;
            notification.textContent = message;
            
            // Ajouter au DOM
            document.body.appendChild(notification);
            
            // Animer l'entrée
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);
            
            // Supprimer après un délai
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }, 3000);
        }
    }

    // Enregistrer le contrôleur avec Stimulus
    window.application.register('general-settings', GeneralSettingsController);
})(); 