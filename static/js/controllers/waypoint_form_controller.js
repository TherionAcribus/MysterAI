// Contrôleur Stimulus pour le formulaire de waypoint
window.WaypointFormController = class extends Stimulus.Controller {
  static targets = [
    "form", "formToggle", "waypointsList", "nameInput", "prefixInput", 
    "lookupInput", "gcLatInput", "gcLonInput", "noteInput", "geocacheIdInput",
    "waypointIdInput", "submitButton", "formTitle"
  ];

  connect() {
    console.log("Waypoint Form Controller connected");
    this.isEditMode = false;
    this.originalButtonText = this.submitButtonTarget.textContent;
    this.originalFormTitle = "Nouveau Waypoint";
    
    // Ajouter un champ caché pour l'ID du waypoint s'il n'existe pas déjà
    if (!this.hasWaypointIdInputTarget) {
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.name = 'waypoint_id';
      hiddenInput.id = 'waypoint_id';
      hiddenInput.setAttribute('data-waypoint-form-target', 'waypointIdInput');
      this.formTarget.appendChild(hiddenInput);
    }
  }

  toggleForm(event) {
    if (event) event.preventDefault();
    this.formTarget.classList.toggle('hidden');
    
    // Si on ferme le formulaire et qu'on était en mode édition, réinitialiser le formulaire
    if (this.formTarget.classList.contains('hidden') && this.isEditMode) {
      this.resetForm();
    }
  }

  resetForm() {
    // Réinitialiser le formulaire
    // Trouver l'élément form à l'intérieur du conteneur
    const formElement = this.formTarget.querySelector('form');
    if (formElement) {
      formElement.reset();
    }
    
    // Réinitialiser le mode d'édition
    this.isEditMode = false;
    
    // Réinitialiser le texte du bouton
    this.submitButtonTarget.textContent = this.originalButtonText;
    
    // Réinitialiser le titre du formulaire
    if (this.hasFormTitleTarget) {
      this.formTitleTarget.textContent = this.originalFormTitle;
    }
    
    // Vider le champ d'ID de waypoint
    if (this.hasWaypointIdInputTarget) {
      this.waypointIdInputTarget.value = '';
    }
  }

  async submitForm(event) {
    event.preventDefault();
    console.log("Form submitted");

    // Récupérer les valeurs du formulaire
    const formData = {
      name: this.nameInputTarget.value,
      prefix: this.prefixInputTarget.value,
      lookup: this.lookupInputTarget.value,
      gc_lat: this.gcLatInputTarget.value,
      gc_lon: this.gcLonInputTarget.value,
      note: this.noteInputTarget.value,
    };

    // Récupérer l'ID de la géocache
    const geocacheId = this.geocacheIdInputTarget.value;

    try {
      let response;
      
      if (this.isEditMode && this.waypointIdInputTarget.value) {
        // Mode édition - PUT request
        const waypointId = this.waypointIdInputTarget.value;
        console.log(`Updating waypoint ${waypointId} for geocache ${geocacheId}`);
        
        response = await fetch(`/api/geocaches/${geocacheId}/waypoints/${waypointId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      } else {
        // Mode création - POST request
        console.log(`Adding waypoint for geocache ${geocacheId}`);
        
        response = await fetch(`/api/geocaches/${geocacheId}/waypoints`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Une erreur est survenue');
      }

      // Mettre à jour la liste des waypoints
      const html = await response.text();
      this.waypointsListTarget.innerHTML = html;

      // Réinitialiser le formulaire
      this.resetForm();

      // Cacher le formulaire
      this.formTarget.classList.add('hidden');

    } catch (error) {
      console.error('Error:', error);
      alert(`Erreur: ${error.message}`);
    }
  }

  async deleteWaypoint(event) {
    event.preventDefault();
    
    // Récupérer les IDs depuis les attributs data
    const waypointId = event.currentTarget.dataset.waypointId;
    const geocacheId = event.currentTarget.dataset.geocacheId;
    
    console.log(`Deleting waypoint ${waypointId} for geocache ${geocacheId}`);
    
    // Demander confirmation
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce waypoint ?')) {
      return;
    }
    
    try {
      // Envoyer la requête DELETE
      const response = await fetch(`/api/geocaches/${geocacheId}/waypoints/${waypointId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Une erreur est survenue lors de la suppression');
      }
      
      // Mettre à jour la liste des waypoints
      const html = await response.text();
      this.waypointsListTarget.innerHTML = html;
      
    } catch (error) {
      console.error('Error:', error);
      alert(`Erreur: ${error.message}`);
    }
  }

  async editWaypoint(event) {
    event.preventDefault();
    
    // Récupérer les IDs depuis les attributs data
    const waypointId = event.currentTarget.dataset.waypointId;
    const geocacheId = event.currentTarget.dataset.geocacheId;
    
    console.log(`Editing waypoint ${waypointId} for geocache ${geocacheId}`);
    
    try {
      // Récupérer les détails du waypoint
      const response = await fetch(`/api/geocaches/${geocacheId}/waypoints/${waypointId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Une erreur est survenue lors de la récupération des données');
      }
      
      // Extraire les données du waypoint
      const waypoint = await response.json();
      
      // Remplir le formulaire avec les données du waypoint
      this.nameInputTarget.value = waypoint.name || '';
      this.prefixInputTarget.value = waypoint.prefix || '';
      this.lookupInputTarget.value = waypoint.lookup || '';
      this.gcLatInputTarget.value = waypoint.gc_lat || '';
      this.gcLonInputTarget.value = waypoint.gc_lon || '';
      this.noteInputTarget.value = waypoint.note || '';
      
      // Définir l'ID du waypoint dans un champ caché
      if (this.hasWaypointIdInputTarget) {
        this.waypointIdInputTarget.value = waypoint.id;
      } else {
        console.error("Waypoint ID input target not found");
      }
      
      // Passer en mode édition
      this.isEditMode = true;
      
      // Changer le texte du bouton
      this.submitButtonTarget.textContent = 'Mettre à jour le waypoint';
      
      // Changer le titre du formulaire
      if (this.hasFormTitleTarget) {
        this.formTitleTarget.textContent = 'Modifier le Waypoint';
      }
      
      // Afficher le formulaire s'il est caché
      if (this.formTarget.classList.contains('hidden')) {
        this.formTarget.classList.remove('hidden');
      }
      
    } catch (error) {
      console.error('Error:', error);
      alert(`Erreur: ${error.message}`);
    }
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
