// Contrôleur Stimulus pour le formulaire de waypoint
(() => {
  // S'assurer que Stimulus est disponible globalement
  if (!window.Stimulus) {
    console.error("Stimulus n'est pas disponible globalement");
    return;
  }
  
  window.WaypointFormController = class extends Stimulus.Controller {
    static targets = [
      "form", "formToggle", "waypointsList", "nameInput", "prefixInput", 
      "lookupInput", "gcLatInput", "gcLonInput", "noteInput", "geocacheIdInput",
      "waypointIdInput", "submitButton", "formTitle", "projectionSection",
      "distanceInput", "distanceUnitInput", "bearingInput", "projectedCoordsInput",
      "createNewButton", "addToNotesCheckbox", "useAsCorrectCoordsButton"
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
      
      // Vider le champ de coordonnées projetées
      if (this.hasProjectedCoordsInputTarget) {
        this.projectedCoordsInputTarget.value = '';
      }
      
      // Cacher le bouton "Créer un nouveau point"
      if (this.hasCreateNewButtonTarget) {
        this.createNewButtonTarget.classList.add('hidden');
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
        this.submitButtonTarget.textContent = "Mettre à jour";
        
        // Changer le titre du formulaire
        if (this.hasFormTitleTarget) {
          this.formTitleTarget.textContent = "Modifier Waypoint";
        }
        
        // Afficher le bouton "Créer un nouveau point"
        if (this.hasCreateNewButtonTarget) {
          this.createNewButtonTarget.classList.remove('hidden');
        }
        
        // Afficher le formulaire
        this.formTarget.classList.remove('hidden');
        
      } catch (error) {
        console.error('Error:', error);
        alert(`Erreur: ${error.message}`);
      }
    }
    
    /**
     * Crée un nouveau waypoint à partir des données actuelles du formulaire
     * en mode édition, sans modifier le waypoint existant
     */
    createNewFromCurrent(event) {
      event.preventDefault();
      
      // Conserver les données du formulaire actuel
      const currentData = {
        name: this.nameInputTarget.value,
        prefix: this.prefixInputTarget.value,
        lookup: this.lookupInputTarget.value,
        gc_lat: this.gcLatInputTarget.value,
        gc_lon: this.gcLonInputTarget.value,
        note: this.noteInputTarget.value
      };
      
      // Modifier légèrement le nom pour indiquer qu'il s'agit d'une copie
      if (currentData.name) {
        currentData.name = `${currentData.name} (copie)`;
      }
      
      // Réinitialiser le formulaire pour passer en mode création
      this.resetForm();
      
      // Remplir le formulaire avec les données conservées
      this.nameInputTarget.value = currentData.name;
      this.prefixInputTarget.value = currentData.prefix;
      this.lookupInputTarget.value = currentData.lookup;
      this.gcLatInputTarget.value = currentData.gc_lat;
      this.gcLonInputTarget.value = currentData.gc_lon;
      this.noteInputTarget.value = currentData.note;
      
      // Changer le titre du formulaire pour indiquer qu'on crée un nouveau waypoint
      if (this.hasFormTitleTarget) {
        this.formTitleTarget.textContent = "Nouveau Waypoint (à partir d'une copie)";
      }
      
      // Notification pour informer l'utilisateur
      const notification = document.createElement('div');
      notification.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-50';
      notification.textContent = 'Création d\'un nouveau waypoint à partir des données actuelles';
      document.body.appendChild(notification);
      
      // Supprimer la notification après 3 secondes
      setTimeout(() => {
        notification.remove();
      }, 3000);
    }
    
    /**
     * Calcule les nouvelles coordonnées en utilisant la projection
     * basée sur la distance et l'angle fournis
     */
    async calculateProjection(event) {
      event.preventDefault();
      
      // Récupérer les valeurs des champs de projection
      const gc_lat = this.gcLatInputTarget.value;
      const gc_lon = this.gcLonInputTarget.value;
      const distance = this.distanceInputTarget.value;
      const distance_unit = this.distanceUnitInputTarget.value;
      const bearing_deg = this.bearingInputTarget.value;
      
      // Vérifier que toutes les valeurs nécessaires sont présentes
      if (!gc_lat || !gc_lon || !distance || !bearing_deg) {
        alert('Veuillez remplir tous les champs de coordonnées, distance et angle.');
        return;
      }
      
      try {
        // Appeler l'API de projection
        const response = await fetch('/api/waypoints/project', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gc_lat,
            gc_lon,
            distance,
            distance_unit,
            bearing_deg
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Une erreur est survenue lors de la projection');
        }
        
        // Extraire les nouvelles coordonnées
        const result = await response.json();
        
        // Afficher les coordonnées complètes dans le champ dédié
        if (this.hasProjectedCoordsInputTarget && result.full_coords) {
          this.projectedCoordsInputTarget.value = result.full_coords;
        }
        
        // Ajouter les informations de projection dans les notes si la case est cochée
        if (this.hasAddToNotesCheckboxTarget && this.addToNotesCheckboxTarget.checked) {
          const currentDate = new Date().toLocaleDateString('fr-FR');
          const currentTime = new Date().toLocaleTimeString('fr-FR');
          const projectionInfo = `\n\n--- Projection (${currentDate} à ${currentTime}) ---\nDepuis: ${gc_lat} ${gc_lon}\nDistance: ${distance} ${distance_unit}\nAzimut: ${bearing_deg}°\nRésultat: ${result.full_coords}`;
          
          // Ajouter les informations à la fin des notes existantes
          this.noteInputTarget.value = (this.noteInputTarget.value || '').trim() + projectionInfo;
          
          // Ajuster la hauteur du textarea pour afficher tout le contenu
          this.noteInputTarget.style.height = 'auto';
          this.noteInputTarget.style.height = (this.noteInputTarget.scrollHeight) + 'px';
        }
        
        // Créer un bouton pour appliquer les coordonnées projetées
        const applyButton = document.createElement('button');
        applyButton.className = 'bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1 px-3 rounded ml-2 focus:outline-none focus:shadow-outline';
        applyButton.textContent = 'Appliquer';
        applyButton.addEventListener('click', () => {
          // Appliquer les coordonnées projetées aux champs de coordonnées
          this.gcLatInputTarget.value = result.gc_lat;
          this.gcLonInputTarget.value = result.gc_lon;
          // Supprimer le bouton après utilisation
          applyButton.remove();
        });
        
        // Ajouter le bouton à côté du champ de coordonnées projetées
        const projectionField = this.projectedCoordsInputTarget.parentElement;
        
        // Supprimer l'ancien bouton s'il existe
        const existingApplyButton = projectionField.querySelector('.apply-projection-button');
        if (existingApplyButton) {
          existingApplyButton.remove();
        }
        
        // Ajouter le nouveau bouton
        applyButton.classList.add('apply-projection-button');
        projectionField.appendChild(applyButton);
        
        // Notification de succès
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50';
        notification.textContent = 'Coordonnées projetées avec succès !';
        document.body.appendChild(notification);
        
        // Supprimer la notification après 3 secondes
        setTimeout(() => {
          notification.remove();
        }, 3000);
        
      } catch (error) {
        console.error('Error:', error);
        alert(`Erreur: ${error.message}`);
      }
    }

    /**
     * Utilise les coordonnées du waypoint actuel comme coordonnées corrigées pour la géocache
     */
    async useAsCorrectCoordinates(event) {
      event.preventDefault();
      
      // Récupérer les coordonnées actuelles du waypoint
      const gc_lat = this.gcLatInputTarget.value;
      const gc_lon = this.gcLonInputTarget.value;
      
      // Vérifier que les coordonnées sont valides
      if (!gc_lat || !gc_lon) {
        alert('Les coordonnées du waypoint sont incomplètes ou invalides.');
        return;
      }
      
      // Récupérer l'ID de la géocache
      const geocacheId = this.geocacheIdInputTarget.value;
      if (!geocacheId) {
        alert('ID de géocache non trouvé.');
        return;
      }
      
      // Demander confirmation
      if (!confirm('Êtes-vous sûr de vouloir utiliser les coordonnées de ce waypoint comme coordonnées corrigées pour cette géocache ?')) {
        return;
      }
      
      try {
        // Créer un objet FormData pour envoyer les données au format form
        const formData = new FormData();
        formData.append('gc_lat', gc_lat);
        formData.append('gc_lon', gc_lon);
        
        // Envoyer la requête pour mettre à jour les coordonnées corrigées
        const response = await fetch(`/geocaches/${geocacheId}/coordinates`, {
          method: 'PUT',
          body: formData
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Une erreur est survenue lors de la mise à jour des coordonnées');
        }
        
        // Récupérer le HTML mis à jour
        const updatedHTML = await response.text();
        
        // Trouver l'élément à mettre à jour (le conteneur des coordonnées)
        const coordsContainer = document.querySelector('[data-geocache-coordinates-target="container"]');
        if (coordsContainer) {
          // Mettre à jour le contenu
          coordsContainer.innerHTML = updatedHTML;
          
          // Déclencher un événement personnalisé pour notifier que les coordonnées ont été mises à jour
          document.dispatchEvent(new CustomEvent('coordinatesUpdated'));
        } else {
          console.error("Conteneur de coordonnées non trouvé");
        }
        
        // Fermer le formulaire
        this.formTarget.classList.add('hidden');
        
        // Réinitialiser le formulaire
        this.resetForm();
        
        // Notification de succès
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50';
        notification.textContent = 'Coordonnées corrigées mises à jour avec succès !';
        document.body.appendChild(notification);
        
        // Supprimer la notification après 3 secondes
        setTimeout(() => {
          notification.remove();
        }, 3000);
        
      } catch (error) {
        console.error('Error:', error);
        alert(`Erreur: ${error.message}`);
      }
    }
  };

  // Enregistrer le contrôleur dans l'application Stimulus
  if (window.application) {
    window.application.register('waypoint-form', WaypointFormController);
  } else {
    console.error("Stimulus application not found");
  }
})();
