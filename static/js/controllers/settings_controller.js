/**
 * Contrôleur Stimulus pour gérer les onglets de paramètres
 */
(() => {
    // S'assurer que Stimulus est disponible globalement
    if (!window.Stimulus) {
        console.error("Stimulus n'est pas disponible globalement");
        return;
    }
    
    class SettingsController extends Stimulus.Controller {
        static targets = ["tab", "section"];
        
        connect() {
            console.log('=== DEBUG: SettingsController connecté ===');
            
            // Initier les onglets seulement si le contenu est chargé
            if (document.querySelectorAll('.settings-tab').length > 0) {
                this.initTabs();
            } else {
                // Sinon attendre le chargement HTMX
                this.element.addEventListener('htmx:afterSwap', this.initTabs.bind(this));
            }
        }
        
        initTabs() {
            console.log('=== DEBUG: Initializing settings tabs ===');
            
            // Ajouter les écouteurs d'événements aux onglets
            document.querySelectorAll('.settings-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabId = tab.dataset.tab;
                    this.switchTab(tabId);
                });
            });
        }
        
        switchTab(tabId) {
            // Désactiver tous les onglets et sections
            document.querySelectorAll('.settings-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            document.querySelectorAll('.settings-section').forEach(section => {
                section.classList.remove('active');
            });
            
            // Activer l'onglet et la section sélectionnés
            document.querySelector(`.settings-tab[data-tab="${tabId}"]`).classList.add('active');
            document.getElementById(`${tabId}-settings`).classList.add('active');
        }
    }
    
    // Enregistrer le contrôleur avec Stimulus
    window.application.register('settings', SettingsController);
})(); 