// Zone Map Controller
(() => {
    console.log('=== DEBUG: Preparing Zone Map Controller ===');
    
    class ZoneMapController extends window.Stimulus.Controller {
        static targets = ["container"]
        static values = {
            zoneId: String
        }

        connect() {
            console.log('=== DEBUG: Zone Map Controller connecté ===');
            console.log('Container:', this.containerTarget);
            console.log('Zone ID:', this.zoneIdValue);
            this.initializeMap();
        }

        async initializeMap() {
            console.log('=== DEBUG: Initialisation de la carte ===');
            try {
                // Initialiser la carte
                this.map = L.map(this.containerTarget).setView([46.603354, 1.888334], 6);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(this.map);

                this.markers = [];
                await this.loadZoneGeocaches();
            } catch (error) {
                console.error('Erreur lors de l\'initialisation de la carte:', error);
            }
        }

        async loadZoneGeocaches() {
            try {
                console.log('=== DEBUG: Chargement des géocaches de la zone', this.zoneIdValue);
                const response = await fetch(`/api/zones/${this.zoneIdValue}/geocaches`);
                const geocaches = await response.json();
                console.log('Géocaches chargées:', geocaches);

                geocaches.forEach(geocache => {
                    if (geocache.latitude && geocache.longitude) {
                        // Créer un cercle au lieu d'un marqueur
                        const circle = L.circleMarker([geocache.latitude, geocache.longitude], {
                            radius: 8,
                            fillColor: '#3388ff',
                            color: '#fff',
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.8
                        });

                        // Ajouter un popup au clic
                        circle.bindPopup(`
                            <div class="text-sm">
                                <div class="font-bold">${geocache.gc_code}</div>
                                <div>${geocache.name}</div>
                                <div class="text-gray-600">${geocache.cache_type}</div>
                                <div class="mt-2">
                                    <span class="font-bold">D:</span> ${geocache.difficulty} 
                                    <span class="font-bold ml-2">T:</span> ${geocache.terrain}
                                </div>
                            </div>
                        `);

                        circle.addTo(this.map);
                        this.markers.push(circle);
                    }
                });

                // Ajuster la vue pour voir tous les marqueurs
                if (this.markers.length > 0) {
                    const group = L.featureGroup(this.markers);
                    this.map.fitBounds(group.getBounds());
                }
            } catch (error) {
                console.error('Erreur lors du chargement des géocaches:', error);
            }
        }

        disconnect() {
            if (this.map) {
                this.map.remove();
                this.map = null;
            }
        }
    }

    // Enregistrer le contrôleur
    try {
        window.Stimulus.register('zone-map', ZoneMapController);
        console.log('=== DEBUG: Zone Map Controller enregistré ===');
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement du contrôleur:', error);
    }
})();
