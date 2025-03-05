// Map Controller
(() => {
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
            this.containerTarget.appendChild(selector);
        }

        changeBaseLayer(sourceName) {
            const tileLayer = this.map.getLayers().getArray().find(layer => layer instanceof ol.layer.Tile);
            tileLayer.setSource(this.tileSources[sourceName]);
        }
    }

    // Register the controller
    try {
        window.StimulusApp.register('map', MapController);
    } catch (error) {
        console.error('Error registering map controller:', error);
    }
})();
