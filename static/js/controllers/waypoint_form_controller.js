// Contrôleur Stimulus pour la gestion du formulaire d'ajout de waypoints
window.WaypointFormController = class extends Stimulus.Controller {
    static targets = ["formContainer"]
    
    connect() {
        console.log("Contrôleur WaypointForm connecté", {
            element: this.element,
            formContainer: this.formContainerTarget
        });
    }
    
    disconnect() {
        // Nettoyage si nécessaire
    }
    
    toggleForm(event) {
        // Affiche ou masque le formulaire
        const formContainer = this.formContainerTarget;
        
        if (formContainer.classList.contains('hidden')) {
            formContainer.classList.remove('hidden');
            console.log("Formulaire d'ajout de waypoint affiché");
        } else {
            formContainer.classList.add('hidden');
            console.log("Formulaire d'ajout de waypoint masqué");
        }
    }
};

// Enregistrer explicitement le contrôleur dans l'application Stimulus
if (window.application) {
    window.application.register('waypoint-form', window.WaypointFormController);
    console.log('Contrôleur WaypointForm enregistré dans l\'application Stimulus');
} else {
    console.error('L\'application Stimulus n\'est pas disponible. Le contrôleur WaypointForm n\'a pas pu être enregistré.');
    // Si l'application n'est pas encore disponible, attendre un peu et réessayer
    document.addEventListener('DOMContentLoaded', () => {
        if (window.application) {
            window.application.register('waypoint-form', window.WaypointFormController);
            console.log('Contrôleur WaypointForm enregistré dans l\'application Stimulus (delayed)');
        }
    });
}
