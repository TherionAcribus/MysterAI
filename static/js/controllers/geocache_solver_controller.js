// Geocache Solver Controller
window.GeocacheSolverController = class extends Stimulus.Controller {
    static targets = ["loading", "description", "descriptionText", "error"]
    static values = {
        geocacheId: String,
        gcCode: String
    }

    connect() {
        console.log("Solver controller connected", {
            geocacheId: this.geocacheIdValue,
            gcCode: this.gcCodeValue
        });
        this.loadGeocacheData();
    }

    async loadGeocacheData() {
        try {
            this.showLoading();
            
            // Obtenir les données textuelles de la géocache
            const response = await fetch(`/geocaches/${this.geocacheIdValue}/text`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des données');
            }

            const data = await response.json();
            this.displayDescription(data.description);
        } catch (error) {
            console.error('Erreur:', error);
            this.showError();
        }
    }

    displayDescription(description) {
        this.hideLoading();
        this.errorTarget.classList.add('hidden');
        this.descriptionTarget.classList.remove('hidden');
        
        // Afficher le texte dans le textarea
        this.descriptionTextTarget.value = description;
    }

    showLoading() {
        this.loadingTarget.classList.remove('hidden');
        this.descriptionTarget.classList.add('hidden');
        this.errorTarget.classList.add('hidden');
    }

    hideLoading() {
        this.loadingTarget.classList.add('hidden');
    }

    showError() {
        this.hideLoading();
        this.descriptionTarget.classList.add('hidden');
        this.errorTarget.classList.remove('hidden');
    }
}
