import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
    static targets = ["content"];

    connect() {
        console.log('Notes controller connected');
        // Récupérer l'ID de la géocache depuis le composant GoldenLayout
        const component = this.element.closest('.lm_item');
        if (component) {
            const geocacheId = component.getAttribute('data-geocache-id');
            if (geocacheId) {
                this.loadNotes(geocacheId);
            }
        }
    }

    loadNotes(geocacheId) {
        // Charger les notes pour la géocache
        fetch(`/api/logs/geocache/${geocacheId}/notes`)
            .then(response => response.text())
            .then(html => {
                this.element.innerHTML = html;
            })
            .catch(error => {
                console.error('Erreur lors du chargement des notes:', error);
            });
    }

    onActivated(event) {
        // Récupérer l'état du composant actif
        const activeComponent = window.layoutStateManager.getActiveComponentInfo();
        if (activeComponent && activeComponent.state && activeComponent.state.geocacheId) {
            htmx.ajax('GET', `/api/logs/geocache/${activeComponent.state.geocacheId}`, {
                target: this.element,
                swap: 'innerHTML'
            });
        }
    }

    // Gestionnaire pour l'ajout d'une note
    addNote(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        
        htmx.ajax('POST', form.action, {
            target: '#notes-list',
            swap: 'beforeend',
            values: {
                content: formData.get('content'),
                note_type: formData.get('note_type')
            }
        });

        // Fermer le formulaire après l'ajout
        document.getElementById('note-form-container').innerHTML = '';
    }

    // Gestionnaire pour l'édition d'une note
    editNote(noteId) {
        htmx.ajax('GET', `/templates/note_form.html?note_id=${noteId}`, {
            target: '#note-form-container',
            swap: 'innerHTML'
        });
    }

    // Gestionnaire pour la fermeture du formulaire
    closeNoteForm() {
        document.getElementById('note-form-container').innerHTML = '';
    }
}
