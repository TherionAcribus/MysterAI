import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
    static targets = ["content"];

    connect() {
        console.log('Logs controller connected');
        
        // Écouter l'événement geocacheSelected
        window.addEventListener('geocacheSelected', (event) => {
            const geocacheId = event.detail;
            if (geocacheId) {
                this.loadLogs(geocacheId);
            }
        });
        
        console.log('Ajout des écouteurs d\'événements pour le bouton de rafraîchissement');
        
        // Vérifier si un bouton de rafraîchissement existe dans notre élément cible
        const refreshBtn = document.getElementById('refresh-logs-btn');
        if (refreshBtn) {
            console.log('Bouton de rafraîchissement trouvé dans le DOM:', refreshBtn);
        } else {
            console.log('Bouton de rafraîchissement non trouvé dans le DOM');
        }
        
        // Ajouter un écouteur global au niveau du document (solution de secours)
        if (!window._logsRefreshEventAttached) {
            document.addEventListener('click', (event) => {
                const button = event.target.closest('#refresh-logs-btn');
                if (button) {
                    console.log('Clic capturé par la délégation d\'événement sur le document');
                    const geocacheId = button.dataset.geocacheId;
                    if (geocacheId) {
                        console.log('GeoCache ID trouvé:', geocacheId);
                        event.preventDefault();
                        this.refreshLogsHandler(button, geocacheId);
                    }
                }
            });
            window._logsRefreshEventAttached = true;
            console.log('Écouteur global pour le rafraîchissement des logs ajouté');
        }
    }

    onActivated(event) {
        // Récupérer l'état du composant actif
        const activeComponent = window.layoutStateManager.getActiveComponentInfo();
        if (activeComponent && activeComponent.state && activeComponent.state.geocacheId) {
            this.loadLogs(activeComponent.state.geocacheId);
        }
    }

    loadLogs(geocacheId) {
        console.log('loadLogs appelé avec geocacheId:', geocacheId);
        htmx.ajax('GET', `/api/logs/logs_panel?geocacheId=${geocacheId}`, {
            target: '#logs-panel',
            swap: 'innerHTML'
        });
    }
    
    refreshLogs(event) {
        console.log('refreshLogs appelé via Stimulus data-action', event);
        const geocacheId = event.currentTarget.dataset.geocacheId;
        console.log('geocacheId récupéré:', geocacheId);
        this.refreshLogsHandler(event.currentTarget, geocacheId);
    }
    
    refreshLogsHandler(button, geocacheId) {
        if (!geocacheId) {
            console.error('Aucun ID de géocache fourni pour rafraîchir les logs');
            return;
        }
        
        console.log('Rafraîchissement des logs pour la géocache:', geocacheId);
        
        // Ajouter une classe de chargement et désactiver le bouton
        button.classList.add('opacity-50');
        button.disabled = true;
        
        // Ajouter une animation de rotation à l'icône
        const icon = button.querySelector('i');
        if (icon) {
            icon.classList.add('animate-spin');
        }
        
        // Appeler l'API pour rafraîchir les logs
        htmx.ajax('POST', `/api/logs/refresh?geocacheId=${geocacheId}`, {
            target: '#logs-panel',
            swap: 'innerHTML',
            complete: () => {
                // Restaurer le bouton après le chargement
                button.classList.remove('opacity-50');
                button.disabled = false;
                if (icon) {
                    icon.classList.remove('animate-spin');
                }
                console.log('Logs rafraîchis pour la géocache:', geocacheId);
            }
        });
    }
} 