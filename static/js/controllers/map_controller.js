// Map Controller
(() => {
    // S'assurer que Stimulus est disponible globalement
    if (!window.Stimulus) {
        console.error("Stimulus n'est pas disponible globalement");
        return;
    }
    
    class MapController extends Stimulus.Controller {
        static targets = ["container", "popup", "popupContent"]
        static values = {
            geocacheId: String,
            geocacheCode: String,
            geocacheIds: Array,
            isMultiView: Boolean,
            isGoldenLayout: Boolean,
            zoneId: String,
            showAllPoints: Boolean,
            showNames: Boolean
        }

        connect() {
            console.log('Map Controller connecté');
            
            if (this.hasGeocacheIdValue) {
                console.log('Affichage de la carte pour la géocache:', this.geocacheIdValue);
            } else if (this.hasGeocacheIdsValue) {
                console.log('Affichage de la carte pour', this.geocacheIdsValue.length, 'géocaches');
            } else {
                console.log('Pas de géocache spécifiée');
            }
            
            this.initializeMap();
        }
        
        // Méthode appelée quand l'onglet de carte est activé
        onActivated(event) {
            console.log('Onglet map activé', event.detail);
            // Rafraîchir la carte si elle existe déjà
            if (this.map) {
                this.map.updateSize();
            }
        }

        async initializeMap() {
            try {
                // Sources de tuiles OSM
                this.tileSources = {
                    'OSM Standard': new ol.source.OSM(),
                    'OSM Cyclo': new ol.source.OSM({
                        url: 'https://{a-c}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png'
                    }),
                    'OSM Topo': new ol.source.OSM({
                        url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png'
                    })
                };

                // Créer le menu de sélection des fonds de carte
                this.createBaseLayerSelector();

                // Créer la source de données pour les points
                this.vectorSource = new ol.source.Vector();

                // Créer la couche vectorielle pour les points
                this.vectorLayer = new ol.layer.Vector({
                    source: this.vectorSource,
                    style: (feature) => {
                        // Définir le style en fonction du type de cache ou de son statut
                        const geocache = feature.get('geocache');
                        let color = 'rgba(51, 136, 255, 0.8)'; // Couleur par défaut
                        
                        if (geocache) {
                            // Si c'est une géocache résolue, utiliser une couleur verte
                            if (geocache.solved === 'solved') {
                                color = 'rgba(0, 200, 0, 0.8)';
                            }
                            // Pour les Mystery caches, utiliser une couleur spécifique
                            else if (geocache.cache_type === 'Mystery') {
                                color = 'rgba(255, 165, 0, 0.8)'; // Orange
                            }
                        }
                        
                        return new ol.style.Style({
                            image: new ol.style.Circle({
                                radius: 6,
                                fill: new ol.style.Fill({
                                    color: color
                                }),
                                stroke: new ol.style.Stroke({
                                    color: '#ffffff',
                                    width: 1
                                })
                            })
                        });
                    }
                });

                // Initialiser la carte OpenLayers
                this.map = new ol.Map({
                    target: this.containerTarget,
                    layers: [
                        new ol.layer.Tile({
                            source: this.tileSources['OSM Standard']
                        }),
                        this.vectorLayer
                    ],
                    view: new ol.View({
                        center: ol.proj.fromLonLat([1.888334, 46.603354]),
                        zoom: 6
                    }),
                    controls: new ol.Collection([
                        new ol.control.Zoom(),
                        new ol.control.FullScreen(),
                        new ol.control.ScaleLine(),
                        new ol.control.Attribution()
                    ])
                });

                // Gérer le popup
                this.popup = new ol.Overlay({
                    element: this.popupTarget,
                    positioning: 'bottom-center',
                    offset: [0, -10],
                    autoPan: true,
                    autoPanAnimation: {
                        duration: 250
                    }
                });
                this.map.addOverlay(this.popup);

                // Gérer les clics sur la carte
                this.map.on('click', (evt) => {
                    const feature = this.map.forEachFeatureAtPixel(evt.pixel, (feature) => feature);
                    if (feature) {
                        const geocache = feature.get('geocache');
                        const coordinates = feature.getGeometry().getCoordinates();
                        
                        this.popupContentTarget.innerHTML = `
                            <div>
                                <div style="font-weight: bold; margin-bottom: 4px;">${geocache.gc_code}</div>
                                <div style="margin-bottom: 4px;">${geocache.name}</div>
                                <div style="color: #666;">${geocache.cache_type}</div>
                                <div style="margin-top: 8px;">
                                    <span style="font-weight: bold;">D:</span> ${geocache.difficulty || '?'} 
                                    <span style="font-weight: bold; margin-left: 8px;">T:</span> ${geocache.terrain || '?'}
                                </div>
                                ${this.hasIsMultiViewValue ? `
                                <div style="margin-top: 8px;">
                                    <button class="open-details-btn px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                                            onclick="openGeocacheDetails(${geocache.id}, '${geocache.gc_code}', '${geocache.name.replace(/'/g, "\\'")}')">
                                        <i class="fas fa-external-link-alt"></i> Détails
                                    </button>
                                </div>` : ''}
                            </div>
                        `;
                        this.popupTarget.style.display = 'block';
                        this.popup.setPosition(coordinates);
                    } else {
                        this.popupTarget.style.display = 'none';
                        this.popup.setPosition(undefined);
                    }
                });

                // Charger les données
                if (this.hasGeocacheIdValue) {
                    // Mode individuel : charger une seule géocache
                    await this.loadGeocache(this.geocacheIdValue);
                } else if (this.hasGeocacheIdsValue && this.geocacheIdsValue.length > 0) {
                    // Mode multi : charger plusieurs géocaches
                    await this.loadMultipleGeocaches(this.geocacheIdsValue);
                }
            } catch (error) {
                console.error('Erreur lors de l\'initialisation de la carte:', error);
            }
        }

        createBaseLayerSelector() {
            const selector = document.createElement('div');
            selector.className = 'absolute top-2 right-2 bg-white shadow-lg rounded-lg p-2';
            selector.style.cssText = 'background-color: white; color: black; z-index: 1001;';

            const select = document.createElement('select');
            select.className = 'block w-full p-1 border border-gray-300 rounded-md text-sm';
            select.addEventListener('change', (e) => this.changeBaseLayer(e.target.value));

            Object.keys(this.tileSources).forEach(sourceName => {
                const option = document.createElement('option');
                option.value = sourceName;
                option.textContent = sourceName;
                select.appendChild(option);
            });

            selector.appendChild(select);
            this.containerTarget.appendChild(selector);
        }

        changeBaseLayer(sourceName) {
            const tileLayer = this.map.getLayers().getArray().find(layer => layer instanceof ol.layer.Tile);
            tileLayer.setSource(this.tileSources[sourceName]);
        }

        async loadGeocache(geocacheId) {
            try {
                // Charger les détails de la géocache
                const response = await fetch(`/api/geocaches/${geocacheId}`);
                const geocache = await response.json();
                
                if (geocache.latitude && geocache.longitude) {
                    // Créer une feature pour la géocache
                    const feature = new ol.Feature({
                        geometry: new ol.geom.Point(
                            ol.proj.fromLonLat([geocache.longitude, geocache.latitude])
                        )
                    });
                    feature.set('geocache', geocache);
                    
                    // Ajouter la feature à la source
                    this.vectorSource.addFeature(feature);
                    
                    // Centrer la carte sur la géocache
                    this.map.getView().setCenter(ol.proj.fromLonLat([geocache.longitude, geocache.latitude]));
                    this.map.getView().setZoom(14);
                }
            } catch (error) {
                console.error('Erreur lors du chargement de la géocache:', error);
            }
        }

        async loadMultipleGeocaches(geocacheIds) {
            try {
                // Utiliser l'API pour récupérer les coordonnées des géocaches
                const response = await fetch('/api/geocaches/coordinates', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        geocache_ids: geocacheIds
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const geocaches = await response.json();
                
                // Créer les features pour les géocaches
                const features = geocaches
                    .filter(geocache => geocache.latitude && geocache.longitude)
                    .map(geocache => {
                        const feature = new ol.Feature({
                            geometry: new ol.geom.Point(
                                ol.proj.fromLonLat([geocache.longitude, geocache.latitude])
                            )
                        });
                        feature.set('geocache', geocache);
                        return feature;
                    });
                
                // Ajouter les features à la source
                this.vectorSource.addFeatures(features);
                
                // Ajuster la vue pour voir tous les points
                if (features.length > 0) {
                    const extent = this.vectorSource.getExtent();
                    this.map.getView().fit(extent, {
                        padding: [50, 50, 50, 50],
                        duration: 1000
                    });
                }
            } catch (error) {
                console.error('Erreur lors du chargement des géocaches:', error);
            }
        }

        disconnect() {
            if (this.map) {
                this.map.setTarget(null);
                this.map = null;
            }
        }
    }

    // Enregistrer le contrôleur
    try {
        window.StimulusApp.register('map', MapController);
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement du contrôleur Map:', error);
    }
})();
