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
    }

    onActivated(event) {
        // Récupérer l'état du composant actif
        const activeComponent = window.layoutStateManager.getActiveComponentInfo();
        if (activeComponent && activeComponent.state && activeComponent.state.geocacheId) {
            this.loadLogs(activeComponent.state.geocacheId);
        }
    }

    loadLogs(geocacheId) {
        htmx.ajax('GET', `/api/logs/logs_panel?geocacheId=${geocacheId}`, {
            target: '#logs-panel',
            swap: 'innerHTML'
        });
    }
} 