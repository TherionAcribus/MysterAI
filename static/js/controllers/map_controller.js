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
            isGoldenLayout: Boolean,
            zoneId: String,
            showAllPoints: Boolean,
            showNames: Boolean
        }

        connect() {
            console.log("Map controller connected");
            console.log("Targets available:", {
                container: this.hasContainerTarget,
                popup: this.hasPopupTarget,
                popupContent: this.hasPopupContentTarget
            });
            
            if (this.hasContainerTarget && this.geocacheIdValue) {
                this.initMap()
            }

            // Créer le menu contextuel
            this.contextMenu = document.createElement('div');
            this.contextMenu.className = 'absolute bg-white shadow-lg rounded-lg z-[1001] py-1';
            this.contextMenu.style.cssText = 'display: none; background-color: white; color: black;';
            document.body.appendChild(this.contextMenu);

            // Masquer le menu contextuel lors d'un clic ailleurs
            document.addEventListener('click', () => {
                this.contextMenu.style.display = 'none';
            });
        }

        disconnect() {
            if (this.map) {
                this.map.setTarget(null)
                this.map = null
            }
            if (this.contextMenu) {
                this.contextMenu.remove();
            }
        }

        onActivated(event) {
            console.log("Map panel activated", event);
            const activeComponent = window.layoutStateManager.getActiveComponentInfo();
            if (activeComponent && activeComponent.state && activeComponent.state.geocacheId) {
                htmx.ajax('GET', `/api/logs/map_panel?geocacheId=${activeComponent.state.geocacheId}`, {
                    target: this.element,
                    swap: 'innerHTML'
                });
            }
        }

        async initMap() {
            console.log("Initializing map...");
            
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

            // Create vector source for markers
            this.vectorSource = new ol.source.Vector();

            // Create vector layer for markers
            const vectorLayer = new ol.layer.Vector({
                source: this.vectorSource,
                style: (feature) => this.createMarkerStyle(feature),
                zIndex: 2  // S'assurer que les points sont au-dessus du cercle
            });

            // Create vector source and layer for the circle
            this.circleSource = new ol.source.Vector();
            this.circleLayer = new ol.layer.Vector({
                source: this.circleSource,
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: 'rgba(0, 0, 255, 0.8)',
                        width: 2
                    }),
                    fill: new ol.style.Fill({
                        color: 'rgba(0, 0, 255, 0.1)'
                    })
                }),
                zIndex: 1  // S'assurer que le cercle est en dessous des points
            });

            // Initialize map
            this.map = new ol.Map({
                target: this.containerTarget,
                layers: [
                    new ol.layer.Tile({
                        source: this.tileSources['OSM Standard'],
                        zIndex: 0  // La carte en arrière-plan
                    }),
                    this.circleLayer,
                    vectorLayer
                ],
                view: new ol.View({
                    center: ol.proj.fromLonLat([2.213749, 46.227638]),
                    zoom: 5
                })
            });

            // Add click handler
            this.map.on('singleclick', (evt) => {
                const feature = this.map.forEachFeatureAtPixel(evt.pixel, 
                    (feature) => feature,
                    {
                        hitTolerance: 5,
                        layerFilter: (layer) => layer === vectorLayer // Ne considérer que les points, pas le cercle
                    }
                );
                
                if (feature) {
                    const coordinates = feature.getGeometry().getCoordinates();
                    const properties = feature.getProperties();
                    this.showPopup(coordinates, properties.title, properties.content);
                } else {
                    this.hidePopup();
                }
            });

            // Add context menu handler
            this.map.getViewport().addEventListener('contextmenu', (evt) => {
                evt.preventDefault();
                const pixel = this.map.getEventPixel(evt);
                const feature = this.map.forEachFeatureAtPixel(pixel, 
                    (feature) => feature,
                    {
                        hitTolerance: 5,
                        layerFilter: (layer) => layer === vectorLayer // Ne considérer que les points, pas le cercle
                    }
                );

                if (feature) {
                    this.showPointContextMenu(evt, feature);
                } else {
                    // Obtenir les coordonnées du clic
                    const coordinates = this.map.getCoordinateFromPixel(pixel);
                    this.showMapContextMenu(evt, coordinates);
                }
            });

            // Add pointer cursor when hovering features
            this.map.on('pointermove', (evt) => {
                const pixel = this.map.getEventPixel(evt.originalEvent);
                const hit = this.map.hasFeatureAtPixel(pixel, {
                    hitTolerance: 5,
                    layerFilter: (layer) => layer === vectorLayer // Ne considérer que les points, pas le cercle
                });
                this.map.getViewport().style.cursor = hit ? 'pointer' : '';
            });

            // Load geocache coordinates
            this.loadGeocacheCoordinates();

            // Si on est dans GoldenLayout et qu'on a un zoneId, charger tous les points
            if (this.isGoldenLayoutValue && this.zoneIdValue) {
                this.loadZoneGeocaches();
            }
        }

        showPointContextMenu(event, feature) {
            // Récupérer les coordonnées transformées
            const coordinates = feature.getGeometry().getCoordinates();
            const [longitude, latitude] = ol.proj.transform(coordinates, 'EPSG:3857', 'EPSG:4326');
            
            // Formater les coordonnées
            const coords = this.formatCoordinates(latitude, longitude);

            const menuItem = document.createElement('div');
            menuItem.className = 'px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer';
            menuItem.style.cssText = 'color: black; background-color: white;';
            menuItem.setAttribute('data-coords', coords);

            // Vérifier si un cercle existe déjà
            const hasCircle = this.circleSource.getFeatures().length > 0;

            menuItem.innerHTML = `
                <div class="font-bold text-black copy-text" style="color: black;">
                    Copier les coordonnées
                </div>
                <div class="font-mono text-sm text-black" style="color: black;">
                    ${coords}
                </div>
                <hr class="my-2">
                <div class="text-sm text-black circle-action" style="color: black; cursor: pointer;">
                    ${hasCircle ? 'Supprimer le cercle de 2 miles' : 'Ajouter un cercle de 2 miles'}
                </div>
            `;

            const copyHandler = (event) => {
                if (!event.target.closest('.copy-text')) return;
                
                const element = event.currentTarget;
                const coords = element.getAttribute('data-coords');
                const copyText = element.querySelector('.copy-text');
                
                if (!copyText) return;
                
                navigator.clipboard.writeText(coords).then(() => {
                    // Stocker les styles originaux
                    const originalBgColor = element.style.backgroundColor;
                    const originalColor = element.style.color;
                    const originalText = copyText.textContent;
                    
                    // Appliquer le feedback visuel
                    element.style.backgroundColor = '#4CAF50';
                    element.style.color = 'white';
                    copyText.textContent = 'Copié !';
                    
                    // Attendre avant de cacher le menu
                    setTimeout(() => {
                        // Restaurer les styles originaux au cas où le menu est encore visible
                        element.style.backgroundColor = originalBgColor;
                        element.style.color = originalColor;
                        copyText.textContent = originalText;
                        
                        // Cacher le menu s'il existe encore
                        if (this.contextMenu && this.contextMenu.style) {
                            this.contextMenu.style.display = 'none';
                        }
                    }, 500);
                }).catch(error => {
                    console.error('Erreur lors de la copie:', error);
                });
            };

            const circleHandler = (event) => {
                if (!event.target.closest('.circle-action')) return;

                if (hasCircle) {
                    this.circleSource.clear();
                } else {
                    // Convertir 2 miles en mètres (1 mile = 1609.34 mètres)
                    const radius = 2 * 1609.34;
                    
                    // Créer un cercle en utilisant les coordonnées du point
                    const circleFeature = new ol.Feature({
                        geometry: new ol.geom.Circle(
                            feature.getGeometry().getCoordinates(),
                            radius
                        )
                    });
                    
                    this.circleSource.addFeature(circleFeature);
                }
                
                this.contextMenu.style.display = 'none';
            };

            menuItem.addEventListener('click', copyHandler);
            menuItem.addEventListener('click', circleHandler);

            this.contextMenu.innerHTML = '';
            this.contextMenu.appendChild(menuItem);

            // Positionner le menu
            this.contextMenu.style.left = (event.clientX) + 'px';
            this.contextMenu.style.top = (event.clientY) + 'px';
            this.contextMenu.style.display = 'block';
        }

        showMapContextMenu(event, coordinates) {
            // Convertir les coordonnées de la projection de la carte (EPSG:3857) vers lat/lon (EPSG:4326)
            const [longitude, latitude] = ol.proj.transform(coordinates, 'EPSG:3857', 'EPSG:4326');
            const coords = this.formatCoordinates(latitude, longitude);

            const menuItem = document.createElement('div');
            menuItem.className = 'px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer';
            menuItem.style.cssText = 'color: black; background-color: white;';
            menuItem.setAttribute('data-coords', coords);

            menuItem.innerHTML = `
                <div class="font-bold text-black copy-text" style="color: black;">
                    Copier les coordonnées
                </div>
                <div class="font-mono text-sm text-black" style="color: black;">
                    ${coords}
                </div>
            `;

            const copyHandler = (event) => {
                const element = event.currentTarget;
                const coords = element.getAttribute('data-coords');
                const copyText = element.querySelector('.copy-text');
                
                if (!copyText) return;
                
                navigator.clipboard.writeText(coords).then(() => {
                    const originalBgColor = element.style.backgroundColor;
                    const originalColor = element.style.color;
                    const originalText = copyText.textContent;
                    
                    element.style.backgroundColor = '#4CAF50';
                    element.style.color = 'white';
                    copyText.textContent = 'Copié !';
                    
                    setTimeout(() => {
                        element.style.backgroundColor = originalBgColor;
                        element.style.color = originalColor;
                        copyText.textContent = originalText;
                        
                        if (this.contextMenu && this.contextMenu.style) {
                            this.contextMenu.style.display = 'none';
                        }
                    }, 500);
                }).catch(error => {
                    console.error('Erreur lors de la copie:', error);
                });
            };

            menuItem.addEventListener('click', copyHandler);

            this.contextMenu.innerHTML = '';
            this.contextMenu.appendChild(menuItem);

            // Positionner le menu
            this.contextMenu.style.left = (event.clientX) + 'px';
            this.contextMenu.style.top = (event.clientY) + 'px';
            this.contextMenu.style.display = 'block';
        }

        formatCoordinates(latitude, longitude) {
            // Format N DD° MM.MMM E DD° MM.MMM
            const latDeg = Math.abs(Math.floor(latitude));
            const latMin = Math.abs((latitude - latDeg) * 60).toFixed(3);
            const latDir = latitude >= 0 ? 'N' : 'S';

            const lonDeg = Math.abs(Math.floor(longitude));
            const lonMin = Math.abs((longitude - lonDeg) * 60).toFixed(3);
            const lonDir = longitude >= 0 ? 'E' : 'W';

            return `${latDir} ${latDeg}° ${latMin} ${lonDir} ${lonDeg}° ${lonMin}`;
        }

        showPopup(coordinates, title, content) {
            console.log("Showing popup:", { coordinates, title, content });
            console.log("Popup targets:", {
                popup: this.popupTarget,
                content: this.popupContentTarget
            });
            
            const element = this.popupTarget;
            this.popupContentTarget.innerHTML = `<div style="color: black;">
                <div class="font-bold mb-1 text-black" style="color: black;">${title}</div>
                <div class="font-mono text-sm text-black" style="color: black;">${content}</div>
            </div>`;
            
            const pixel = this.map.getPixelFromCoordinate(coordinates);
            console.log("Popup pixel position:", pixel);
            
            if (pixel) {
                const mapElement = this.map.getTargetElement();
                const rect = mapElement.getBoundingClientRect();
                const x = rect.left + pixel[0];
                const y = rect.top + pixel[1] - 10; // Décalage vers le haut pour éviter de chevaucher le point
                
                element.style.left = `${x}px`;
                element.style.top = `${y}px`;
                element.style.display = 'block';
            }
        }

        hidePopup() {
            console.log("Hiding popup");
            this.popupTarget.style.display = 'none';
        }

        clearMarkers() {
            if (this.vectorSource) {
                this.vectorSource.clear();
            }
        }

        fitMapToMarkers() {
            if (this.vectorSource && this.vectorSource.getFeatures().length > 0) {
                const extent = this.vectorSource.getExtent();
                this.map.getView().fit(extent, {
                    padding: [50, 50, 50, 50],
                    maxZoom: 15
                });
            }
        }

        async loadGeocacheCoordinates() {
            try {
                const response = await fetch(`/api/geocaches/${this.geocacheIdValue}/coordinates`);
                const coordinates = await response.json();
                console.log("Loaded coordinates:", coordinates);
                
                // Clear existing markers
                this.clearMarkers();

                // Add markers for each coordinate type
                if (coordinates.original) {
                    this.addMarker('original', coordinates.original, 'Original', 'red');
                }
                
                if (coordinates.corrected) {
                    this.addMarker('corrected', coordinates.corrected, 'Corrected', 'green');
                }
                
                if (coordinates.waypoints) {
                    coordinates.waypoints.forEach(wp => {
                        this.addMarker(`wp-${wp.id}`, wp, `${wp.prefix}: ${wp.name}`, 'blue');
                    });
                }

                // Fit view to show all markers
                this.fitMapToMarkers();
            } catch (error) {
                console.error('Error loading geocache coordinates:', error);
            }
        }

        async loadZoneGeocaches() {
            try {
                const response = await fetch(`/api/zones/${this.zoneIdValue}/geocaches`);
                const geocaches = await response.json();

                geocaches.forEach(geocache => {
                    if (geocache.latitude && geocache.longitude) {
                        this.addMarker(geocache.id, geocache, geocache.name, 'black');
                    }
                });

                // Fit view to show all markers
                this.fitMapToMarkers();
            } catch (error) {
                console.error('Error loading zone geocaches:', error);
            }
        }

        addMarker(id, coords, title, color) {
            console.log("Adding marker:", { id, coords, title, color });
            const feature = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([coords.longitude, coords.latitude])),
                id: id,
                title: title,
                content: `${coords.gc_lat ? coords.gc_lat : coords.latitude}<br>${coords.gc_lon ? coords.gc_lon : coords.longitude}`,
                color: color
            });

            this.vectorSource.addFeature(feature);
        }

        createMarkerStyle(feature) {
            const color = feature.get('color');
            return new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 5,
                    fill: new ol.style.Fill({
                        color: color
                    }),
                    stroke: new ol.style.Stroke({
                        color: 'white',
                        width: 2
                    })
                })
            });
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
            
            // Ajouter une case à cocher pour afficher les géocaches proches
            const nearbyDiv = document.createElement('div');
            nearbyDiv.className = 'mt-2';

            const nearbyCheckbox = document.createElement('input');
            nearbyCheckbox.type = 'checkbox';
            nearbyCheckbox.id = 'show-nearby';
            nearbyCheckbox.className = 'mr-2';
            nearbyCheckbox.addEventListener('change', (e) => this.toggleNearbyGeocaches(e.target.checked));

            const nearbyLabel = document.createElement('label');
            nearbyLabel.htmlFor = 'show-nearby';
            nearbyLabel.className = 'text-sm';
            nearbyLabel.textContent = 'Afficher géocaches proches';

            nearbyDiv.appendChild(nearbyCheckbox);
            nearbyDiv.appendChild(nearbyLabel);
            selector.appendChild(nearbyDiv);
            
            this.containerTarget.appendChild(selector);
        }

        changeBaseLayer(sourceName) {
            const tileLayer = this.map.getLayers().getArray().find(layer => layer instanceof ol.layer.Tile);
            tileLayer.setSource(this.tileSources[sourceName]);
        }
        
        // Création d'une source et d'une couche pour les géocaches proches
        createNearbyGeocachesLayer() {
            // Créer la source de données pour les géocaches proches
            this.nearbySource = new ol.source.Vector();
            
            // Créer la couche vectorielle pour les géocaches proches
            this.nearbyLayer = new ol.layer.Vector({
                source: this.nearbySource,
                style: (feature) => {
                    return new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: 5,
                            fill: new ol.style.Fill({
                                color: 'rgba(128, 0, 128, 0.8)' // Violet
                            }),
                            stroke: new ol.style.Stroke({
                                color: 'white',
                                width: 2
                            })
                        })
                    });
                },
                zIndex: 3 // Au-dessus des autres couches
            });
            
            // Ajouter la couche à la carte
            this.map.addLayer(this.nearbyLayer);
        }
        
        async toggleNearbyGeocaches(show) {
            console.log("Toggle nearby geocaches:", show);
            
            // Créer la couche si elle n'existe pas encore
            if (!this.nearbyLayer) {
                this.createNearbyGeocachesLayer();
            }
            
            if (show) {
                await this.loadNearbyGeocaches();
            } else {
                // Effacer les géocaches proches
                if (this.nearbySource) {
                    this.nearbySource.clear();
                }
            }
        }
        
        async loadNearbyGeocaches() {
            try {
                console.log("Loading nearby geocaches for geocache ID:", this.geocacheIdValue);
                
                // Effacer les géocaches proches existants
                this.nearbySource.clear();
                
                // Charger les géocaches proches depuis l'API
                const response = await fetch(`/api/geocaches/${this.geocacheIdValue}/nearby?distance=5`);
                const geocaches = await response.json();
                
                console.log("Loaded nearby geocaches:", geocaches);
                
                // Ajouter chaque géocache comme un point sur la carte
                geocaches.forEach(geocache => {
                    if (geocache.latitude && geocache.longitude) {
                        const feature = new ol.Feature({
                            geometry: new ol.geom.Point(ol.proj.fromLonLat([geocache.longitude, geocache.latitude])),
                            id: geocache.id,
                            title: `${geocache.gc_code} - ${geocache.name}`,
                            content: `Type: ${geocache.cache_type}<br>Owner: ${geocache.owner || 'Non spécifié'}<br>D: ${geocache.difficulty} / T: ${geocache.terrain}<br>Distance: ${geocache.distance} km`,
                            geocache: geocache
                        });
                        
                        this.nearbySource.addFeature(feature);
                    }
                });
                
                console.log("Added nearby geocaches to map:", this.nearbySource.getFeatures().length);
                
                // Ajouter un gestionnaire de clic pour les géocaches proches si ce n'est pas déjà fait
                if (!this.nearbyClickHandlerAdded) {
                    this.addNearbyGeocachesClickHandler();
                    this.nearbyClickHandlerAdded = true;
                }
            } catch (error) {
                console.error("Error loading nearby geocaches:", error);
            }
        }
        
        // Ajouter un gestionnaire de clic pour les géocaches proches
        addNearbyGeocachesClickHandler() {
            // Créer l'élément popup s'il n'existe pas déjà
            if (!this.nearbyPopupElement) {
                this.nearbyPopupElement = document.createElement('div');
                this.nearbyPopupElement.className = 'ol-popup';
                this.nearbyPopupElement.style.cssText = `
                    position: absolute;
                    background-color: white;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
                    padding: 15px;
                    border-radius: 10px;
                    border: 1px solid #cccccc;
                    bottom: 12px;
                    left: -50px;
                    min-width: 250px;
                    z-index: 1000;
                    color: black;
                `;
                
                // Ajouter un bouton de fermeture
                const closeButton = document.createElement('a');
                closeButton.className = 'ol-popup-closer';
                closeButton.style.cssText = `
                    text-decoration: none;
                    position: absolute;
                    top: 2px;
                    right: 8px;
                    color: #666;
                    font-size: 16px;
                `;
                closeButton.innerHTML = '&times;';
                closeButton.href = '#';
                closeButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.nearbyPopup.setPosition(undefined);
                    return false;
                });
                
                this.nearbyPopupElement.appendChild(closeButton);
                
                // Créer un élément pour le contenu
                this.nearbyPopupContent = document.createElement('div');
                this.nearbyPopupElement.appendChild(this.nearbyPopupContent);
                
                // Créer l'overlay pour la popup
                this.nearbyPopup = new ol.Overlay({
                    element: this.nearbyPopupElement,
                    positioning: 'bottom-center',
                    stopEvent: false,
                    offset: [0, -10]
                });
                
                this.map.addOverlay(this.nearbyPopup);
            }
            
            // Ajouter un gestionnaire de clic sur la carte
            this.map.on('click', (evt) => {
                const feature = this.map.forEachFeatureAtPixel(evt.pixel, (feature) => {
                    // Vérifier si la feature appartient à la source des géocaches proches
                    if (this.nearbySource.getFeatures().includes(feature)) {
                        return feature;
                    }
                    return null;
                });
                
                if (feature) {
                    const coordinates = feature.getGeometry().getCoordinates();
                    const geocache = feature.get('geocache');
                    
                    // Mettre à jour le contenu de la popup
                    this.nearbyPopupContent.innerHTML = `
                        <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px; color: #333;">
                            ${geocache.gc_code}
                        </div>
                        <div style="font-size: 14px; margin-bottom: 10px; color: #333;">
                            ${geocache.name}
                        </div>
                        <div style="font-size: 13px; color: #666; margin-bottom: 5px;">
                            <strong>Type:</strong> ${geocache.cache_type}
                        </div>
                        <div style="font-size: 13px; color: #666; margin-bottom: 5px;">
                            <strong>Owner:</strong> ${geocache.owner || 'Non spécifié'}
                        </div>
                        <div style="font-size: 13px; color: #666; margin-bottom: 5px;">
                            <strong>Difficulté:</strong> ${geocache.difficulty} / <strong>Terrain:</strong> ${geocache.terrain}
                        </div>
                        <div style="font-size: 13px; color: #666;">
                            <strong>Distance:</strong> ${geocache.distance} km
                        </div>
                    `;
                    
                    // Positionner la popup
                    this.nearbyPopup.setPosition(coordinates);
                } else {
                    // Ne pas fermer la popup si on clique ailleurs
                    // La popup se ferme uniquement avec le bouton de fermeture
                }
            });
            
            // Ajouter un gestionnaire de clic droit pour les géocaches proches
            this.map.getViewport().addEventListener('contextmenu', (evt) => {
                evt.preventDefault();
                const pixel = this.map.getEventPixel(evt);
                const feature = this.map.forEachFeatureAtPixel(pixel, (feature) => {
                    // Vérifier si la feature appartient à la source des géocaches proches
                    if (this.nearbySource && this.nearbySource.getFeatures().includes(feature)) {
                        return feature;
                    }
                    return null;
                });
                
                if (feature) {
                    this.showNearbyGeocacheContextMenu(evt, feature);
                }
            });
        }
        
        // Afficher le menu contextuel pour une géocache proche
        showNearbyGeocacheContextMenu(event, feature) {
            const geocache = feature.get('geocache');
            const coordinates = feature.getGeometry().getCoordinates();
            const [longitude, latitude] = ol.proj.transform(coordinates, 'EPSG:3857', 'EPSG:4326');
            
            // Formater les coordonnées
            const coords = this.formatCoordinates(latitude, longitude);
            
            const menuItem = document.createElement('div');
            menuItem.className = 'px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer';
            menuItem.style.cssText = 'color: black; background-color: white;';
            menuItem.setAttribute('data-coords', coords);
            
            menuItem.innerHTML = `
                <div class="font-bold text-black" style="color: black; margin-bottom: 5px;">
                    ${geocache.gc_code} - ${geocache.name}
                </div>
                <div class="text-sm text-black copy-text" style="color: black; cursor: pointer; margin-bottom: 8px;">
                    Copier les coordonnées
                </div>
                <div class="font-mono text-sm text-black" style="color: black; margin-bottom: 8px;">
                    ${coords}
                </div>
                <div class="text-sm text-black view-details" style="color: black; cursor: pointer; margin-bottom: 5px;">
                    <i class="fas fa-info-circle mr-1"></i> Voir les détails
                </div>
            `;
            
            const copyHandler = (event) => {
                if (!event.target.closest('.copy-text')) return;
                
                const element = event.currentTarget;
                const coords = element.getAttribute('data-coords');
                const copyText = element.querySelector('.copy-text');
                
                if (!copyText) return;
                
                navigator.clipboard.writeText(coords).then(() => {
                    // Stocker les styles originaux
                    const originalBgColor = element.style.backgroundColor;
                    const originalColor = element.style.color;
                    const originalText = copyText.textContent;
                    
                    // Appliquer le feedback visuel
                    element.style.backgroundColor = '#4CAF50';
                    element.style.color = 'white';
                    copyText.textContent = 'Copié !';
                    
                    // Attendre avant de cacher le menu
                    setTimeout(() => {
                        // Restaurer les styles originaux au cas où le menu est encore visible
                        element.style.backgroundColor = originalBgColor;
                        element.style.color = originalColor;
                        copyText.textContent = originalText;
                        
                        // Cacher le menu s'il existe encore
                        if (this.contextMenu && this.contextMenu.style) {
                            this.contextMenu.style.display = 'none';
                        }
                    }, 500);
                }).catch(error => {
                    console.error('Erreur lors de la copie:', error);
                });
            };
            
            // Gestionnaire pour ouvrir les détails de la géocache
            const viewDetailsHandler = (event) => {
                if (!event.target.closest('.view-details')) return;
                
                // Cacher le menu contextuel
                this.contextMenu.style.display = 'none';
                
                // Ouvrir un nouvel onglet avec les détails de la géocache
                if (window.mainLayout) {
                    // Créer un nouvel onglet avec les détails de la géocache
                    window.mainLayout.root.contentItems[0].addChild({
                        type: 'component',
                        componentName: 'geocache-details',
                        title: `${geocache.gc_code} - ${geocache.name}`,
                        componentState: { 
                            geocacheId: geocache.id,
                            gcCode: geocache.gc_code,
                            name: geocache.name
                        }
                    });
                } else {
                    console.error("GoldenLayout n'est pas initialisé");
                }
            };
            
            menuItem.addEventListener('click', copyHandler);
            menuItem.addEventListener('click', viewDetailsHandler);
            
            this.contextMenu.innerHTML = '';
            this.contextMenu.appendChild(menuItem);
            
            // Positionner le menu
            this.contextMenu.style.left = (event.clientX) + 'px';
            this.contextMenu.style.top = (event.clientY) + 'px';
            this.contextMenu.style.display = 'block';
        }
    }

    // Register the controller
    try {
        window.StimulusApp.register('map', MapController);
    } catch (error) {
        console.error('Error registering map controller:', error);
    }
})();
