// Contrôleur Stimulus pour le formulaire d'ajout de waypoint
window.WaypointFormController = class extends Stimulus.Controller {
  static targets = ["formContainer", "waypointsList", "indicator", "prefix", "lookup", "name", "latitude", "longitude", "note"];

  connect() {
    console.log("Waypoint form controller connected", {
      element: this.element,
      formContainer: this.hasFormContainerTarget ? this.formContainerTarget : "missing",
      waypointsList: this.hasWaypointsListTarget ? this.waypointsListTarget : "missing",
      indicator: this.hasIndicatorTarget ? this.indicatorTarget : "missing"
    });
  }

  toggleForm() {
    console.log("toggleForm called");
    this.formContainerTarget.classList.toggle("hidden");
  }

  submitForm(event) {
    console.log("submitForm called");
    event.preventDefault();
    
    // Afficher l'indicateur de chargement
    if (this.hasIndicatorTarget) {
      this.indicatorTarget.classList.remove("hidden");
    }
    
    // Récupérer les données du formulaire
    const formData = new FormData(event.target);
    const geocacheId = formData.get("geocache_id");
    
    console.log("Submitting form with data:", {
      geocacheId,
      name: formData.get("name"),
      prefix: formData.get("prefix"),
      lookup: formData.get("lookup"),
      latitude: formData.get("latitude"),
      longitude: formData.get("longitude"),
      note: formData.get("note")
    });
    
    // Envoyer les données au serveur via fetch
    fetch(`/api/geocaches/${geocacheId}/waypoints`, {
      method: "POST",
      body: formData,
      headers: {
        "X-Requested-With": "XMLHttpRequest"
      }
    })
    .then(response => {
      console.log("Response status:", response.status);
      if (!response.ok) {
        throw new Error(`Erreur lors de l'ajout du waypoint: ${response.status}`);
      }
      return response.text();
    })
    .then(html => {
      console.log("Response received, updating waypoints list");
      
      // Mettre à jour la liste des waypoints
      if (this.hasWaypointsListTarget) {
        this.waypointsListTarget.innerHTML = html;
      }
      
      // Masquer le formulaire
      this.toggleForm();
      
      // Réinitialiser le formulaire
      event.target.reset();
      
      // Remettre les valeurs par défaut pour les coordonnées
      if (this.hasLatitudeTarget && this.hasLongitudeTarget) {
        const defaultLat = this.latitudeTarget.getAttribute("placeholder");
        const defaultLon = this.longitudeTarget.getAttribute("placeholder");
        this.latitudeTarget.value = defaultLat;
        this.longitudeTarget.value = defaultLon;
      }
    })
    .catch(error => {
      console.error("Erreur:", error);
      alert(`Une erreur est survenue lors de l'ajout du waypoint: ${error.message}`);
    })
    .finally(() => {
      // Masquer l'indicateur de chargement
      if (this.hasIndicatorTarget) {
        this.indicatorTarget.classList.add("hidden");
      }
    });
  }
};

// Enregistrer le contrôleur dans l'application Stimulus
(function() {
  if (window.application) {
    window.application.register("waypoint-form", window.WaypointFormController);
    console.log("Contrôleur WaypointForm enregistré dans l'application Stimulus");
  } else if (window.StimulusApp) {
    window.StimulusApp.register("waypoint-form", window.WaypointFormController);
    console.log("Contrôleur WaypointForm enregistré dans StimulusApp");
  } else {
    console.error("Impossible d'enregistrer le contrôleur WaypointForm : application Stimulus non trouvée");
  }
})();
