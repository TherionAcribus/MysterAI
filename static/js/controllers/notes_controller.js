import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
    static targets = ["content"];

    connect() {
        console.log('Notes controller connected');
        
        // Écouter l'événement geocacheSelected
        window.addEventListener('geocacheSelected', (event) => {
            const geocacheId = event.detail;
            if (geocacheId) {
                this.loadNotesPanel(geocacheId);
            }
        });
    }

    loadNotesPanel(geocacheId) {
        htmx.ajax('GET', `/api/logs/notes_panel?geocacheId=${geocacheId}`, {
            target: this.element,
            swap: 'innerHTML'
        });
    }

    onActivated(event) {
        // Récupérer l'état du composant actif
        const activeComponent = window.layoutStateManager.getActiveComponentInfo();
        if (activeComponent && activeComponent.state && activeComponent.state.geocacheId) {
            this.loadNotesPanel(activeComponent.state.geocacheId);
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
        this.closeNoteForm();
    }

    editNote(noteId) {
        const geocacheId = this.element.getAttribute('data-geocache-id');
        htmx.ajax('GET', `/api/logs/note/${noteId}/edit?geocacheId=${geocacheId}`, {
            target: '#note-form-container',
            swap: 'innerHTML'
        });
    }

    closeNoteForm() {
        const formContainer = document.getElementById('note-form-container');
        if (formContainer) {
            formContainer.innerHTML = '';
        }
    }
}
