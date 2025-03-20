// Zone Map Controller
console.log("=== DEBUG: Preparing Zone Map Controller ===");

(() => {
    // S'assurer que Stimulus est disponible globalement
    if (!window.Stimulus) {
        console.error("Stimulus n'est pas disponible globalement");
        return;
    }
    
    class ZoneMapController extends Stimulus.Controller {
        static targets = ["container"]
        static values = {
            zoneId: String
        }

        connect() {
            console.log('=== DEBUG: Zone Map Controller connecté ===');
            console.log('Container:', this.containerTarget);
            console.log('Zone ID:', this.zoneIdValue);
            this.initializeMap();
            this.initializeContextMenu();
        }

        initializeContextMenu() {
            // Créer le menu contextuel
            this.contextMenu = document.createElement('div');
            this.contextMenu.className = 'absolute z-50';
            this.contextMenu.style.cssText = `
                display: none;
                background-color: white;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                padding: 4px 0;
                min-width: 150px;
            `;
            document.body.appendChild(this.contextMenu);

            // Masquer le menu contextuel lors d'un clic ailleurs
            document.addEventListener('click', () => {
                this.contextMenu.style.display = 'none';
            });
        }

        async initializeMap() {
            console.log('=== DEBUG: Initialisation de la carte ===');
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

                // Créer la source de données pour les cercles
                this.circlesSource = new ol.source.Vector();

                // Créer la couche vectorielle pour les cercles
                this.circlesLayer = new ol.layer.Vector({
                    source: this.circlesSource,
                    style: new ol.style.Style({
                        stroke: new ol.style.Stroke({
                            color: 'rgba(255, 0, 0, 0.8)',
                            width: 1
                        }),
                        fill: new ol.style.Fill({
                            color: 'rgba(255, 0, 0, 0.1)'
                        })
                    })
                });

                // Créer la couche vectorielle pour les points
                this.vectorLayer = new ol.layer.Vector({
                    source: this.vectorSource,
                    style: new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: 6,
                            fill: new ol.style.Fill({
                                color: 'rgba(51, 136, 255, 0.8)'
                            }),
                            stroke: new ol.style.Stroke({
                                color: '#ffffff',
                                width: 1
                            })
                        })
                    })
                });

                // Initialiser la carte OpenLayers
                this.map = new ol.Map({
                    target: this.containerTarget,
                    layers: [
                        new ol.layer.Tile({
                            source: this.tileSources['OSM Standard']
                        }),
                        this.circlesLayer,
                        this.vectorLayer
                    ],
                    view: new ol.View({
                        center: ol.proj.fromLonLat([1.888334, 46.603354]),
                        zoom: 6
                    })
                });

                // Créer l'élément popup avec des styles
                const popupElement = document.createElement('div');
                popupElement.style.backgroundColor = 'white';
                popupElement.style.padding = '10px';
                popupElement.style.borderRadius = '4px';
                popupElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                popupElement.style.color = 'black';
                popupElement.style.minWidth = '200px';
                
                this.popup = new ol.Overlay({
                    element: popupElement,
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
                        
                        this.popup.getElement().innerHTML = `
                            <div>
                                <div style="font-weight: bold; margin-bottom: 4px;">${geocache.gc_code}</div>
                                <div style="margin-bottom: 4px;">${geocache.name}</div>
                                <div style="color: #666;">${geocache.cache_type}</div>
                                <div style="margin-top: 8px;">
                                    <span style="font-weight: bold;">D:</span> ${geocache.difficulty} 
                                    <span style="font-weight: bold; margin-left: 8px;">T:</span> ${geocache.terrain}
                                </div>
                            </div>
                        `;
                        this.popup.setPosition(coordinates);
                    } else {
                        this.popup.setPosition(undefined);
                    }
                });

                // Gérer le clic droit sur la carte
                this.map.getViewport().addEventListener('contextmenu', (evt) => {
                    evt.preventDefault();
                    const pixel = this.map.getEventPixel(evt);
                    const feature = this.map.forEachFeatureAtPixel(pixel, (feature) => feature);
                    
                    if (feature) {
                        const geocache = feature.get('geocache');
                        this.showContextMenu(evt.pageX, evt.pageY, geocache);
                    }
                });

                await this.loadZoneGeocaches();
            } catch (error) {
                console.error('Erreur lors de l\'initialisation de la carte:', error);
            }
        }

        createBaseLayerSelector() {
            const selector = document.createElement('div');
            selector.className = 'absolute top-2 right-2 bg-white shadow-lg rounded-lg p-2';
            selector.style.cssText = 'background-color: white; color: black; z-index: 1001;';

            const title = document.createElement('label');
            title.className = 'block text-sm font-medium mb-1';
            title.textContent = 'Fond de carte';
            selector.appendChild(title);

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

            // Ajouter une case à cocher pour les cercles
            const circleDiv = document.createElement('div');
            circleDiv.className = 'mt-2';

            const circleCheckbox = document.createElement('input');
            circleCheckbox.type = 'checkbox';
            circleCheckbox.id = 'show-circles';
            circleCheckbox.className = 'mr-2';
            circleCheckbox.addEventListener('change', (e) => this.toggleCircles(e.target.checked));

            const circleLabel = document.createElement('label');
            circleLabel.htmlFor = 'show-circles';
            circleLabel.className = 'text-sm';
            circleLabel.textContent = 'Cercles 161m (Traditional)';

            circleDiv.appendChild(circleCheckbox);
            circleDiv.appendChild(circleLabel);
            selector.appendChild(circleDiv);

            this.containerTarget.appendChild(selector);
        }

        changeBaseLayer(sourceName) {
            const tileLayer = this.map.getLayers().getArray().find(layer => layer instanceof ol.layer.Tile);
            tileLayer.setSource(this.tileSources[sourceName]);
        }

        toggleCircles(show) {
            console.log('Toggle circles:', show);
            if (show) {
                this.createCirclesForTraditionals();
            } else {
                this.circlesSource.clear();
            }
        }

        createCirclesForTraditionals() {
            console.log('Creating circles for traditional caches');
            // Effacer les cercles existants
            this.circlesSource.clear();
            
            // Parcourir toutes les features
            const features = this.vectorSource.getFeatures();
            console.log('Total features:', features.length);
            
            let traditionalCount = 0;
            
            features.forEach(feature => {
                const geocache = feature.get('geocache');
                
                // Vérifier si c'est une cache de type Traditional
                if (geocache && geocache.cache_type === 'Traditional') {
                    traditionalCount++;
                    console.log('Found Traditional cache:', geocache.gc_code);
                    
                    const center = feature.getGeometry().getCoordinates();
                    console.log('Center coordinates:', center);
                    
                    // Créer un cercle de 161m autour du point (convertir en mètres)
                    // Note: OpenLayers utilise les mètres pour les projections métriques
                    // 161m = 0.1 mile
                    const circleRadius = 161;
                    
                    // Créer un cercle polygone (plus compatible avec différentes projections)
                    const circlePolygon = this.createCirclePolygon(center, circleRadius);
                    
                    // Créer une feature pour le cercle
                    const circleFeature = new ol.Feature({
                        geometry: circlePolygon,
                        name: `Circle for ${geocache.gc_code}`
                    });
                    
                    // Ajouter la feature à la source
                    this.circlesSource.addFeature(circleFeature);
                    console.log('Added circle for:', geocache.gc_code);
                }
            });
            
            console.log('Traditional caches found:', traditionalCount);
            console.log('Circles created:', this.circlesSource.getFeatures().length);
        }
        
        // Créer un polygone circulaire (plus compatible avec différentes projections)
        createCirclePolygon(center, radius) {
            const points = 64; // Nombre de points pour approximer le cercle
            const circle = new ol.geom.Polygon([]);
            const coordinates = [];
            
            for (let i = 0; i < points; i++) {
                const angle = (i * 2 * Math.PI) / points;
                const x = center[0] + radius * Math.cos(angle);
                const y = center[1] + radius * Math.sin(angle);
                coordinates.push([x, y]);
            }
            
            // Fermer le polygone
            coordinates.push(coordinates[0]);
            
            circle.setCoordinates([coordinates]);
            return circle;
        }

        showContextMenu(x, y, geocache) {
            // Créer les éléments du menu
            this.contextMenu.innerHTML = `
                <div class="cursor-pointer hover:bg-gray-100 px-4 py-2 text-black" data-action="open-details">
                    <i class="fas fa-info-circle mr-2"></i>Ouvrir la Géocache
                </div>
            `;

            // Positionner le menu
            this.contextMenu.style.left = `${x}px`;
            this.contextMenu.style.top = `${y}px`;
            this.contextMenu.style.display = 'block';

            // Gérer les clics sur les éléments du menu
            const detailsButton = this.contextMenu.querySelector('[data-action="open-details"]');
            detailsButton.addEventListener('click', () => {
                // Ouvrir les détails dans un nouvel onglet
                fetch(`http://127.0.0.1:3000/geocaches/${geocache.id}/details-panel`)
                    .then(response => response.text())
                    .then(html => {
                        const newItemConfig = {
                            type: 'component',
                            componentName: 'geocache-details',
                            title: `${geocache.gc_code} - ${geocache.name}`,
                            componentState: { 
                                html: html,
                                geocacheId: geocache.id,
                                gcCode: geocache.gc_code,
                                name: geocache.name
                            }
                        };
                        
                        // Ajouter le composant à la première ligne
                        if (window.mainLayout.root.contentItems[0].type === 'row') {
                            window.mainLayout.root.contentItems[0].addChild(newItemConfig);
                        } else {
                            window.mainLayout.root.contentItems[0].addChild({
                                type: 'row',
                                content: [newItemConfig]
                            });
                        }
                    })
                    .catch(error => {
                        console.error("Erreur lors du chargement des détails:", error);
                        alert("Erreur lors du chargement des détails de la géocache");
                    });

                this.contextMenu.style.display = 'none';
            });
        }

        async loadZoneGeocaches() {
            try {
                console.log('=== DEBUG: Chargement des géocaches de la zone', this.zoneIdValue);
                const response = await fetch(`/api/zones/${this.zoneIdValue}/geocaches`);
                const geocaches = await response.json();
                console.log('Géocaches chargées:', geocaches);

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
            if (this.contextMenu) {
                this.contextMenu.remove();
            }
        }
    }

    // Enregistrer le contrôleur
    try {
        window.StimulusApp.register('zone-map', ZoneMapController);
        console.log('=== DEBUG: Zone Map Controller enregistré ===');
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement du contrôleur:', error);
    }
})();
