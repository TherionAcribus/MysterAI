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
            "autoMarkSolved", "autoCorrectCoordinates", "enableAutoScoring"
        ];
        
        connect() {
            console.log('=== DEBUG: GeneralSettingsController connecté ===');
            console.log('=== DEBUG: Cibles disponibles ===', {
                autoMarkSolved: this.hasAutoMarkSolvedTarget,
                autoCorrectCoordinates: this.hasAutoCorrectCoordinatesTarget,
                enableAutoScoring: this.hasEnableAutoScoringTarget
            });
            
            // Attendre un instant pour s'assurer que le DOM est complètement chargé
            setTimeout(() => {
                this.loadSettings();
            }, 100);
        }
        
        /**
         * Charger les paramètres depuis le serveur
         */
        loadSettings() {
            console.log('=== DEBUG: Chargement des paramètres généraux ===');
            
            // Vérifier que les cibles sont disponibles
            if (!this.hasAutoMarkSolvedTarget || !this.hasAutoCorrectCoordinatesTarget || !this.hasEnableAutoScoringTarget) {
                console.warn('=== WARN: Les cibles ne sont pas encore disponibles, réessai dans 100ms ===');
                setTimeout(() => this.loadSettings(), 100);
                return;
            }
            
            fetch('/api/settings/general')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erreur HTTP: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('=== DEBUG: Réponse du serveur ===', data);
                    
                    if (data.success) {
                        this.updateUI(data.settings);
                    } else {
                        console.error('Erreur lors du chargement des paramètres:', data.error);
                        // En cas d'erreur, définir les valeurs par défaut
                        this.resetToDefaults();
                    }
                })
                .catch(error => {
                    console.error('Erreur lors du chargement des paramètres:', error);
                    // En cas d'erreur, définir les valeurs par défaut
                    this.resetToDefaults();
                });
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
        }
        
        /**
         * Enregistrer les paramètres
         */
        saveSettings() {
            console.log('=== DEBUG: Enregistrement des paramètres ===');
            
            if (!this.hasAutoMarkSolvedTarget || !this.hasAutoCorrectCoordinatesTarget || !this.hasEnableAutoScoringTarget) {
                console.error('=== ERREUR: Les cibles ne sont pas disponibles ===');
                this.showNotification('Erreur: Impossible d\'accéder aux paramètres', true);
                return;
            }
            
            const settings = {
                auto_mark_solved: this.autoMarkSolvedTarget.checked,
                auto_correct_coordinates: this.autoCorrectCoordinatesTarget.checked,
                enable_auto_scoring: this.enableAutoScoringTarget.checked
            };
            
            console.log('=== DEBUG: Paramètres à enregistrer ===', settings);
            
            fetch('/api/settings/general/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('=== DEBUG: Réponse après enregistrement ===', data);
                
                if (data.success) {
                    this.showNotification('Paramètres enregistrés avec succès!');
                } else {
                    this.showNotification('Erreur: ' + data.error, true);
                }
            })
            .catch(error => {
                console.error('=== ERREUR lors de l\'enregistrement ===', error);
                this.showNotification('Erreur: ' + error.message, true);
            });
        }
        
        /**
         * Réinitialiser les paramètres aux valeurs par défaut
         */
        resetDefaults() {
            console.log('=== DEBUG: Réinitialisation des paramètres ===');
            
            if (!this.hasAutoMarkSolvedTarget || !this.hasAutoCorrectCoordinatesTarget || !this.hasEnableAutoScoringTarget) {
                console.error('=== ERREUR: Les cibles ne sont pas disponibles ===');
                this.showNotification('Erreur: Impossible d\'accéder aux paramètres', true);
                return;
            }
            
            // Définir les valeurs par défaut (True)
            this.autoMarkSolvedTarget.checked = true;
            this.autoCorrectCoordinatesTarget.checked = true;
            this.enableAutoScoringTarget.checked = true;
            
            // Enregistrer les valeurs par défaut
            this.saveSettings();
            
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