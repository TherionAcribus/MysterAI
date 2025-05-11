// Coordinates Display Controller - Pour afficher et interagir avec les coordonnées GPS détectées
(() => {
    // S'assurer que Stimulus est disponible globalement
    if (!window.Stimulus) {
        console.error("Stimulus n'est pas disponible globalement");
        return;
    }
    
    class CoordinatesDisplayController extends Stimulus.Controller {
        static targets = [
            "detectionStatus", 
            "coordinatesContainer", 
            "noCoordinatesMessage",
            "detectedCoordinates", 
            "detectedLatitude", 
            "detectedLongitude"
        ];
    
        connect() {
            console.log("Coordinates display controller connected");
            
            // Écouter l'événement quand des coordonnées sont détectées dans un résultat
            document.addEventListener('coordinatesDetected', this.handleCoordinatesDetected.bind(this));
            
            // Afficher par défaut le message "Aucune coordonnée"
            this.showNoCoordinates();
        }
        
        disconnect() {
            // Nettoyer les écouteurs d'événements
            document.removeEventListener('coordinatesDetected', this.handleCoordinatesDetected);
        }
        
        // Gérer les coordonnées détectées
        handleCoordinatesDetected(event) {
            const coordinates = event.detail;
            
            if (coordinates && coordinates.exist) {
                this.showCoordinates(coordinates);
            } else {
                this.showNoCoordinates();
            }
        }
        
        // Afficher les coordonnées trouvées
        showCoordinates(coordinates) {
            // Afficher les coordonnées détectées
            this.detectedCoordinatesTarget.textContent = coordinates.ddm || 'N/A';
            this.detectedLatitudeTarget.textContent = coordinates.ddm_lat || 'N/A';
            this.detectedLongitudeTarget.textContent = coordinates.ddm_lon || 'N/A';
            
            // Afficher le conteneur des coordonnées
            this.coordinatesContainerTarget.classList.remove('hidden');
            this.noCoordinatesMessageTarget.classList.add('hidden');
            
            // Mettre à jour le statut de détection
            this.updateDetectionStatus('Coordonnées trouvées', 'bg-green-600');
            
            // Rendre visible la section des coordonnées si elle était cachée
            const section = this.element.closest('[data-plugin-interface-target="coordinatesSection"]');
            if (section) {
                section.classList.remove('hidden');
            }
        }
        
        // Afficher le message "Aucune coordonnée"
        showNoCoordinates() {
            this.coordinatesContainerTarget.classList.add('hidden');
            this.noCoordinatesMessageTarget.classList.remove('hidden');
            
            // Mettre à jour le statut de détection
            this.updateDetectionStatus('Aucune coordonnée', 'bg-red-600');
        }
        
        // Mettre à jour l'indicateur de statut
        updateDetectionStatus(message, cssClass) {
            this.detectionStatusTarget.textContent = message;
            this.detectionStatusTarget.className = 'px-3 py-1 text-xs rounded-full ' + cssClass;
            this.detectionStatusTarget.classList.remove('hidden');
        }
        
        // Copier les coordonnées dans le presse-papier
        copyCoordinates() {
            const coords = this.detectedCoordinatesTarget.textContent;
            if (coords && coords !== 'N/A') {
                navigator.clipboard.writeText(coords).then(() => {
                    // Feedback visuel temporaire
                    const originalText = this.detectedCoordinatesTarget.textContent;
                    this.detectedCoordinatesTarget.innerHTML = '<span class="text-green-400">✓ Copié!</span>';
                    setTimeout(() => {
                        this.detectedCoordinatesTarget.textContent = originalText;
                    }, 1500);
                });
            }
        }
        
        // Créer un waypoint avec les coordonnées détectées
        createWaypoint() {
            const coords = {
                ddm: this.detectedCoordinatesTarget.textContent,
                ddm_lat: this.detectedLatitudeTarget.textContent,
                ddm_lon: this.detectedLongitudeTarget.textContent
            };
            
            // Déclencher un événement personnalisé pour la création du waypoint
            const event = new CustomEvent('createWaypointFromCoordinates', {
                detail: coords,
                bubbles: true
            });
            this.element.dispatchEvent(event);
            
            // Montrer une notification temporaire
            this.showNotification('Création de waypoint demandée', 'bg-blue-600');
        }
        
        // Affiche une notification temporaire
        showNotification(message, bgClass = 'bg-blue-600') {
            // Créer l'élément de notification s'il n'existe pas déjà
            let notif = this.element.querySelector('.coordinates-notification');
            if (!notif) {
                notif = document.createElement('div');
                notif.className = `coordinates-notification fixed bottom-5 right-5 p-3 rounded-lg text-white shadow-lg transition-opacity duration-300 ${bgClass}`;
                document.body.appendChild(notif);
            }
            
            // Définir le contenu et afficher
            notif.textContent = message;
            notif.style.opacity = '1';
            
            // Cacher après 3 secondes
            setTimeout(() => {
                notif.style.opacity = '0';
                setTimeout(() => {
                    if (notif.parentNode) {
                        notif.parentNode.removeChild(notif);
                    }
                }, 300);
            }, 3000);
        }
    }
    
    // Enregistrer le contrôleur
    window.StimulusApp.register("coordinates-display", CoordinatesDisplayController);
})(); 