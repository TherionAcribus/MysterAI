// Enhanced Zone Map Controller avec support Multi Solver
console.log("=== DEBUG: Preparing Enhanced Zone Map Controller ===");

(() => {
    // S'assurer que Stimulus est disponible globalement
    if (!window.Stimulus) {
        console.error("Stimulus n'est pas disponible globalement");
        return;
    }
    
    class EnhancedZoneMapController extends Stimulus.Controller {
        static targets = ["container"]
        static values = {
            zoneId: String,
            geocacheId: String,
            isMultiSolver: Boolean,
            multiSolverId: String
        }

        connect() {
            console.log('=== DEBUG: Enhanced Zone Map Controller connecté ===');
            console.log('Container:', this.hasContainerTarget ? 'présent' : 'manquant');
            console.log('Zone ID:', this.zoneIdValue || 'non défini');
            console.log('Geocache ID:', this.geocacheIdValue || 'non défini');
            console.log('Multi Solver:', this.isMultiSolverValue ? 'oui' : 'non');
            console.log('Multi Solver ID:', this.multiSolverIdValue || 'non défini');
            
            if (this.hasContainerTarget) {
                this.initializeMap();
                this.initializeContextMenu();
                
                // Écouter les événements du Multi Solver si nécessaire
                if (this.isMultiSolverValue) {
                    console.log("Ajout de l'écouteur d'événements multiSolverDataUpdated");
                    window.addEventListener('multiSolverDataUpdated', this.handleMultiSolverUpdate.bind(this));
                }
            } else {
                console.error("Conteneur cible manquant pour la carte");
            }
        }

        disconnect() {
            console.log("Déconnexion du contrôleur Enhanced Zone Map");
            if (this.map) {
                this.map.setTarget(null);
                this.map = null;
            }
            if (this.contextMenu) {
                this.contextMenu.remove();
            }
            
            // Supprimer l'écouteur d'événements du Multi Solver
            if (this.isMultiSolverValue) {
                window.removeEventListener('multiSolverDataUpdated', this.handleMultiSolverUpdate.bind(this));
            }
        }
        
        onActivated(event) {
            console.log("Zone Map panel activated", event);
            
            // Si on a un layoutStateManager, on peut l'utiliser pour obtenir des informations
            if (window.layoutStateManager) {
                const activeComponent = window.layoutStateManager.getActiveComponentInfo();
                if (activeComponent && activeComponent.state) {
                    if (activeComponent.state.geocacheId) {
                        this.geocacheIdValue = activeComponent.state.geocacheId;
                        if (this.map) {
                            this.loadGeocacheCoordinates();
                        }
                    } else if (activeComponent.state.multiSolverId) {
                        this.multiSolverIdValue = activeComponent.state.multiSolverId;
                        this.isMultiSolverValue = true;
                        if (this.map) {
                            this.loadMultiSolverGeocaches(this.multiSolverIdValue);
                        }
                    } else if (activeComponent.state.zoneId) {
                        this.zoneIdValue = activeComponent.state.zoneId;
                        if (this.map) {
                            this.loadZoneGeocaches();
                        }
                    }
                }
            }
            
            // Si des paramètres sont définis dans l'URL, les utiliser
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('geocacheId')) {
                this.geocacheIdValue = urlParams.get('geocacheId');
                if (this.map) {
                    this.loadGeocacheCoordinates();
                }
            } else if (urlParams.has('multiSolverId')) {
                this.multiSolverIdValue = urlParams.get('multiSolverId');
                this.isMultiSolverValue = urlParams.get('isMultiSolver') === 'true';
                if (this.map && this.isMultiSolverValue) {
                    this.loadMultiSolverGeocaches(this.multiSolverIdValue);
                }
            } else if (urlParams.has('zoneId')) {
                this.zoneIdValue = urlParams.get('zoneId');
                if (this.map) {
                    this.loadZoneGeocaches();
                }
            }
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
                z-index: 1001;
                color: black;
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
                
                // Définir la préférence par défaut pour les coordonnées (corrigées si disponibles)
                this.coordsDisplayMode = 'corrected';

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
                    style: (feature) => {
                        const color = feature.get('color') || 'rgba(51, 136, 255, 0.8)';
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
                popupElement.id = 'map-popup';
                popupElement.style.cssText = `
                    background-color: white;
                    padding: 10px;
                    border-radius: 4px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    color: black;
                    min-width: 200px;
                    display: none;
                    position: absolute;
                    z-index: 1000;
                `;
                
                this.containerTarget.appendChild(popupElement);
                this.popupElement = popupElement;

                // Gérer les clics sur la carte
                this.map.on('click', (evt) => {
                    const feature = this.map.forEachFeatureAtPixel(evt.pixel, (feature) => feature);
                    if (feature) {
                        const coordinates = feature.getGeometry().getCoordinates();
                        const title = feature.get('title') || 'Point';
                        const content = feature.get('content') || '';
                        
                        this.showPopup(coordinates, title, content);
                    } else {
                        this.hidePopup();
                    }
                });

                // Gérer le clic droit sur la carte
                this.map.getViewport().addEventListener('contextmenu', (evt) => {
                    evt.preventDefault();
                    const pixel = this.map.getEventPixel(evt);
                    const feature = this.map.forEachFeatureAtPixel(pixel, (feature) => feature);
                    
                    if (feature) {
                        const geocache = feature.get('geocache');
                        if (geocache) {
                            this.showContextMenu(evt.pageX, evt.pageY, geocache);
                        } else {
                            // Si ce n'est pas une géocache, montrer le menu de coordonnées
                            const coordinates = feature.getGeometry().getCoordinates();
                            this.showCoordinateContextMenu(evt, coordinates);
                        }
                    } else {
                        // Pour un clic droit ailleurs sur la carte
                        const coordinates = this.map.getCoordinateFromPixel(pixel);
                        this.showCoordinateContextMenu(evt, coordinates);
                    }
                });

                // Charger les données appropriées
                if (this.geocacheIdValue) {
                    await this.loadGeocacheCoordinates();
                } else if (this.isMultiSolverValue && this.multiSolverIdValue) {
                    await this.loadMultiSolverGeocaches(this.multiSolverIdValue);
                } else if (this.zoneIdValue) {
                    await this.loadZoneGeocaches();
                }
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
            
            // Ajouter un sélecteur pour les coordonnées à afficher
            const coordsDiv = document.createElement('div');
            coordsDiv.className = 'mt-2';
            
            const coordsLabel = document.createElement('label');
            coordsLabel.className = 'block text-sm font-medium mb-1';
            coordsLabel.textContent = 'Coordonnées';
            coordsDiv.appendChild(coordsLabel);
            
            const coordsSelect = document.createElement('select');
            coordsSelect.id = 'coords-display-mode';
            coordsSelect.className = 'block w-full p-1 border border-gray-300 rounded-md text-sm';
            coordsSelect.addEventListener('change', (e) => this.changeCoordinatesMode(e.target.value));
            
            // Stocker une référence pour pouvoir mettre à jour le sélecteur plus tard
            this.coordsSelect = coordsSelect;
            
            const options = [
                { value: 'corrected', text: 'Corrigées (si disponibles)' },
                { value: 'original', text: 'Originales' },
                { value: 'both', text: 'Les deux' }
            ];
            
            options.forEach(option => {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.text;
                coordsSelect.appendChild(optionEl);
            });
            
            // Sélectionner "Corrigées" par défaut et définir la valeur interne
            coordsSelect.value = 'corrected';
            this.coordsDisplayMode = 'corrected';
            
            coordsDiv.appendChild(coordsSelect);
            selector.appendChild(coordsDiv);

            this.containerTarget.appendChild(selector);
            
            // Stocker la référence au sélecteur de coordonnées
            this.coordsSelect = coordsSelect;
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
                    const circleRadius = 161;
                    
                    // Créer un cercle polygone
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
        
        // Créer un polygone circulaire
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
                if (window.mainLayout) {
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
                    
                    console.log("Ouverture de la géocache:", geocache.gc_code);
                } else {
                    console.error("GoldenLayout n'est pas disponible");
                    
                    // Alternative: ouvrir les détails via HTMX si disponible
                    if (window.htmx) {
                        window.htmx.ajax('GET', `/geocaches/${geocache.id}`, {
                            target: 'body',
                            swap: 'innerHTML'
                        });
                    }
                }

                this.contextMenu.style.display = 'none';
            });
        }
        
        showCoordinateContextMenu(event, coordinates) {
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
            if (!this.popupElement) return;
            
            // Récupérer le conteneur de la carte
            const mapContainer = this.map.getTargetElement();
            const mapRect = mapContainer.getBoundingClientRect();
            
            // Convertir les coordonnées en pixels
            const pixel = this.map.getPixelFromCoordinate(coordinates);
            if (!pixel) return;
            
            // Calcul des positions absolues en tenant compte du scroll
            const absoluteX = mapRect.left + window.pageXOffset;
            const absoluteY = mapRect.top + window.pageYOffset;
            
            // Préparer le contenu de la popup
            this.popupElement.innerHTML = `
                <div class="font-bold mb-1 text-black">${title}</div>
                <div class="font-mono text-sm text-black">${content}</div>
            `;
            
            // Réinitialiser le style pour éviter les effets de calculs précédents
            this.popupElement.style.position = 'fixed';
            this.popupElement.style.transform = 'none';
            this.popupElement.style.transition = 'none';
            
            // Rendre visible pour mesurer les dimensions
            this.popupElement.style.display = 'block';
            this.popupElement.style.visibility = 'hidden'; // Caché mais mesurable
            
            // Obtenir les dimensions de la popup
            const popupWidth = this.popupElement.offsetWidth;
            const popupHeight = this.popupElement.offsetHeight;
            
            // Position du point sur l'écran
            const pointX = mapRect.left + pixel[0];
            const pointY = mapRect.top + pixel[1];
            
            // Décalage pour centrer la popup au-dessus du point
            // Position préférée : centrée au-dessus du point
            let popupLeft = pointX - (popupWidth / 2);
            let popupTop = pointY - popupHeight - 15; // 15px au-dessus du point
            
            // Ajustements pour éviter de sortir de l'écran
            // Horizontalement
            if (popupLeft < 0) {
                popupLeft = 5; // Marge de 5px du bord gauche
            } else if (popupLeft + popupWidth > window.innerWidth) {
                popupLeft = window.innerWidth - popupWidth - 5; // Marge de 5px du bord droit
            }
            
            // Verticalement
            if (popupTop < 0) {
                // Si pas assez de place au-dessus, afficher en dessous
                popupTop = pointY + 15; // 15px en dessous du point
            }
            
            // Appliquer la position finale
            this.popupElement.style.left = `${popupLeft}px`;
            this.popupElement.style.top = `${popupTop}px`;
            this.popupElement.style.visibility = 'visible';
            
            // Ajouter une flèche qui pointe vers le point
            const existingArrow = this.popupElement.querySelector('.popup-arrow');
            if (existingArrow) {
                existingArrow.remove();
            }
            
            const arrow = document.createElement('div');
            arrow.className = 'popup-arrow';
            
            // Déterminer la position et l'orientation de la flèche
            let arrowStyle;
            
            if (popupTop < pointY) {
                // Popup au-dessus du point, flèche en bas
                arrowStyle = `
                    position: absolute;
                    left: ${Math.max(0, Math.min(popupWidth - 16, (pointX - popupLeft) - 8))}px;
                    bottom: -8px;
                    width: 0;
                    height: 0;
                    border-left: 8px solid transparent;
                    border-right: 8px solid transparent;
                    border-top: 8px solid white;
                `;
            } else {
                // Popup en dessous du point, flèche en haut
                arrowStyle = `
                    position: absolute;
                    left: ${Math.max(0, Math.min(popupWidth - 16, (pointX - popupLeft) - 8))}px;
                    top: -8px;
                    width: 0;
                    height: 0;
                    border-left: 8px solid transparent;
                    border-right: 8px solid transparent;
                    border-bottom: 8px solid white;
                `;
            }
            
            arrow.style.cssText = arrowStyle;
            this.popupElement.appendChild(arrow);
            
            // Ajouter un bouton de fermeture
            const closeButton = document.createElement('div');
            closeButton.className = 'popup-close';
            closeButton.style.cssText = `
                position: absolute;
                top: 2px;
                right: 2px;
                cursor: pointer;
                width: 20px;
                height: 20px;
                text-align: center;
                line-height: 20px;
                color: #999;
                font-size: 16px;
                font-weight: bold;
            `;
            closeButton.innerHTML = '×';
            closeButton.addEventListener('click', () => this.hidePopup());
            
            this.popupElement.appendChild(closeButton);
            
            // Ajouter un léger effet de fondu
            this.popupElement.style.opacity = '0';
            this.popupElement.style.transition = 'opacity 0.2s ease-in-out';
            
            // Animation de fade-in
            setTimeout(() => {
                this.popupElement.style.opacity = '1';
            }, 10);
        }

        hidePopup() {
            if (this.popupElement) {
                this.popupElement.style.display = 'none';
            }
        }

        clearMarkers() {
            if (this.vectorSource) {
                this.vectorSource.clear();
            }
        }

        fitMapToMarkers() {
            if (!this.map || !this.vectorSource) {
                console.error("Impossible d'ajuster la carte aux marqueurs: carte ou source non initialisée");
                return;
            }
            
            const features = this.vectorSource.getFeatures();
            if (features.length === 0) {
                console.warn("Aucun marqueur à afficher sur la carte");
                return;
            }
            
            try {
                const extent = this.vectorSource.getExtent();
                // Vérifier si l'étendue est valide (non infinie)
                if (extent[0] !== Infinity && extent[1] !== Infinity && 
                    extent[2] !== -Infinity && extent[3] !== -Infinity) {
                    this.map.getView().fit(extent, {
                        padding: [50, 50, 50, 50],
                        maxZoom: 15
                    });
                } else {
                    console.warn("Étendue invalide pour l'ajustement de la carte");
                }
            } catch (error) {
                console.error("Erreur lors de l'ajustement de la carte:", error);
            }
        }

        async loadGeocacheCoordinates() {
            try {
                console.log('Loading coordinates for geocache:', this.geocacheIdValue);
                const response = await fetch(`/api/geocaches/${this.geocacheIdValue}/coordinates`);
                const coordinates = await response.json();
                console.log("Loaded coordinates:", coordinates);
                
                // Clear existing markers
                this.clearMarkers();
                
                // Récupérer le mode d'affichage des coordonnées
                const coordsMode = this.coordsDisplayMode || 'corrected';
                
                // Ajouter les marqueurs selon le mode sélectionné
                if (coordsMode === 'original' || coordsMode === 'both') {
                    if (coordinates.original) {
                        this.addMarker('original', coordinates.original, 'Original', 'rgba(255, 0, 0, 0.8)');
                    }
                }
                
                if (coordsMode === 'corrected' || coordsMode === 'both') {
                    if (coordinates.corrected) {
                        this.addMarker('corrected', coordinates.corrected, 'Corrected', 'rgba(0, 128, 0, 0.8)');
                    } else if (coordinates.original && coordsMode === 'corrected') {
                        // Si on veut voir les coordonnées corrigées mais qu'elles n'existent pas,
                        // on affiche les originales quand même
                        this.addMarker('original', coordinates.original, 'Original', 'rgba(255, 0, 0, 0.8)');
                    }
                }
                
                // Toujours afficher les waypoints
                if (coordinates.waypoints) {
                    coordinates.waypoints.forEach(wp => {
                        this.addMarker(`wp-${wp.id}`, wp, `${wp.prefix}: ${wp.name}`, 'rgba(255, 165, 0, 0.8)');
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
                console.log('=== DEBUG: Chargement des géocaches de la zone', this.zoneIdValue);
                const response = await fetch(`/api/zones/${this.zoneIdValue}/geocaches`);
                const geocaches = await response.json();
                console.log('Géocaches chargées:', geocaches);

                // Clear existing markers
                this.clearMarkers();
                
                // Récupérer le mode d'affichage des coordonnées
                const coordsMode = this.coordsDisplayMode || 'corrected';

                // Ajouter les marqueurs pour chaque géocache selon le mode sélectionné
                let pointsAdded = 0;
                geocaches.forEach(geocache => {
                    if (this.addGeocacheBasedOnCoordinateMode(geocache, coordsMode)) {
                        pointsAdded++;
                    }
                });
                
                console.log(`${pointsAdded} points ajoutés à la carte pour la zone`);

                // Fit view to show all markers
                this.fitMapToMarkers();
            } catch (error) {
                console.error('Erreur lors du chargement des géocaches:', error);
            }
        }
        
        addGeocacheBasedOnCoordinateMode(geocache, mode) {
            if (!geocache) return false;
            
            // Si aucun mode n'est spécifié, utiliser le mode stocké ou 'corrected' par défaut
            mode = mode || this.coordsDisplayMode || 'corrected';
            
            console.log(`Ajout de la géocache ${geocache.gc_code} en mode ${mode}`);
            
            // Vérifier si la géocache a des coordonnées corrigées - plusieurs formats possibles
            const hasCorrectedCoords = (
                // Format 1: objet corrected_coordinates avec lat/lon
                (geocache.corrected_coordinates && 
                 geocache.corrected_coordinates.latitude && 
                 geocache.corrected_coordinates.longitude) ||
                // Format 2: propriétés latitude_corrected/longitude_corrected directement sur l'objet
                (geocache.latitude_corrected !== undefined && 
                 geocache.longitude_corrected !== undefined) ||
                // Format 3: propriétés latitude_corrected/longitude_corrected dans l'objet coordinates
                (geocache.coordinates && 
                 geocache.coordinates.latitude_corrected !== undefined && 
                 geocache.coordinates.longitude_corrected !== undefined) ||
                // Format 4: gc_lat_corrected/gc_lon_corrected présent
                (geocache.gc_lat_corrected && geocache.gc_lon_corrected)
            );
            
            // Vérifier si la géocache a des coordonnées originales - plusieurs formats possibles
            const hasOriginalCoords = (
                // Format 1: propriétés latitude/longitude directement sur l'objet
                (typeof geocache.latitude === 'number' && typeof geocache.longitude === 'number') ||
                (typeof geocache.latitude === 'string' && typeof geocache.longitude === 'string') ||
                // Format 2: propriétés lat/lon dans l'objet coordinates
                (geocache.coordinates && (
                    (geocache.coordinates.latitude !== undefined && geocache.coordinates.longitude !== undefined) ||
                    (geocache.coordinates.ddm_lat && geocache.coordinates.ddm_lon) ||
                    (geocache.coordinates.lat && geocache.coordinates.lon)
                )) ||
                // Format 3: propriétés gc_lat/gc_lon présentes
                (geocache.gc_lat && geocache.gc_lon)
            );
            
            console.log(`Géocache ${geocache.gc_code} - Coords corrigées: ${hasCorrectedCoords}, Coords originales: ${hasOriginalCoords}`);
            
            // Si les coordonnées existent, ajoutons plus de détails pour le débogage
            if (geocache.latitude_corrected !== undefined) {
                console.log(`latitude_corrected: ${geocache.latitude_corrected}, longitude_corrected: ${geocache.longitude_corrected}`);
            }
            if (geocache.gc_lat_corrected) {
                console.log(`gc_lat_corrected: ${geocache.gc_lat_corrected}, gc_lon_corrected: ${geocache.gc_lon_corrected}`);
            }
            
            let added = false;
            
            // Gestion des cas selon le mode d'affichage
            if (mode === 'corrected') {
                if (hasCorrectedCoords) {
                    // Ajouter les coordonnées corrigées
                    const geocacheWithCorrectedCoords = { ...geocache, isCorrected: true };
                    
                    // Déterminer les coordonnées corrigées à utiliser
                    if (geocache.corrected_coordinates && 
                        geocache.corrected_coordinates.latitude !== undefined) {
                        // Format 1: objet corrected_coordinates
                        geocacheWithCorrectedCoords.latitude = geocache.corrected_coordinates.latitude;
                        geocacheWithCorrectedCoords.longitude = geocache.corrected_coordinates.longitude;
                    } else if (geocache.latitude_corrected !== undefined) {
                        // Format 2: propriétés sur l'objet principal
                        geocacheWithCorrectedCoords.latitude = geocache.latitude_corrected;
                        geocacheWithCorrectedCoords.longitude = geocache.longitude_corrected;
                    } else if (geocache.coordinates && 
                              geocache.coordinates.latitude_corrected !== undefined) {
                        // Format 3: propriétés dans l'objet coordinates
                        geocacheWithCorrectedCoords.latitude = geocache.coordinates.latitude_corrected;
                        geocacheWithCorrectedCoords.longitude = geocache.coordinates.longitude_corrected;
                    } else if (geocache.gc_lat_corrected) {
                        // Format 4: format GC - essayer de convertir
                        geocacheWithCorrectedCoords.latitude = geocache.gc_lat_corrected;
                        geocacheWithCorrectedCoords.longitude = geocache.gc_lon_corrected;
                    }
                    
                    // Utiliser un ID différent pour les coordonnées corrigées
                    geocacheWithCorrectedCoords.id = geocache.id + '_corrected';
                    
                    this.addMarkerWithGeocache(geocacheWithCorrectedCoords);
                    console.log(`Point corrigé ajouté pour ${geocache.gc_code}:`, 
                              geocacheWithCorrectedCoords.latitude, 
                              geocacheWithCorrectedCoords.longitude);
                    added = true;
                } else if (hasOriginalCoords) {
                    // Utiliser les coordonnées originales si aucune corrigée n'est disponible
                    this.addMarkerWithGeocache(geocache);
                    console.log(`Point original ajouté pour ${geocache.gc_code} (pas de coordonnées corrigées)`);
                    added = true;
                } else {
                    console.warn(`Aucune coordonnée valide pour la géocache ${geocache.gc_code}`);
                }
            } else if (mode === 'original') {
                if (hasOriginalCoords) {
                    // Ajouter uniquement les coordonnées originales
                    this.addMarkerWithGeocache(geocache);
                    console.log(`Point original ajouté pour ${geocache.gc_code}`);
                    added = true;
                } else {
                    console.warn(`Pas de coordonnées originales pour ${geocache.gc_code}`);
                }
            } else if (mode === 'both') {
                if (hasOriginalCoords) {
                    // Ajouter les coordonnées originales
                    this.addMarkerWithGeocache(geocache);
                    console.log(`Point original ajouté pour ${geocache.gc_code} (mode both)`);
                    added = true;
                }
                
                if (hasCorrectedCoords) {
                    // Ajouter aussi les coordonnées corrigées
                    const geocacheWithCorrectedCoords = { ...geocache, isCorrected: true };
                    
                    // Déterminer les coordonnées corrigées à utiliser (même logique que ci-dessus)
                    if (geocache.corrected_coordinates && 
                        geocache.corrected_coordinates.latitude !== undefined) {
                        geocacheWithCorrectedCoords.latitude = geocache.corrected_coordinates.latitude;
                        geocacheWithCorrectedCoords.longitude = geocache.corrected_coordinates.longitude;
                    } else if (geocache.latitude_corrected !== undefined) {
                        geocacheWithCorrectedCoords.latitude = geocache.latitude_corrected;
                        geocacheWithCorrectedCoords.longitude = geocache.longitude_corrected;
                    } else if (geocache.coordinates && 
                              geocache.coordinates.latitude_corrected !== undefined) {
                        geocacheWithCorrectedCoords.latitude = geocache.coordinates.latitude_corrected;
                        geocacheWithCorrectedCoords.longitude = geocache.coordinates.longitude_corrected;
                    } else if (geocache.gc_lat_corrected) {
                        geocacheWithCorrectedCoords.latitude = geocache.gc_lat_corrected;
                        geocacheWithCorrectedCoords.longitude = geocache.gc_lon_corrected;
                    }
                    
                    // Utiliser un ID différent pour les coordonnées corrigées
                    geocacheWithCorrectedCoords.id = geocache.id + '_corrected';
                    
                    this.addMarkerWithGeocache(geocacheWithCorrectedCoords);
                    console.log(`Point corrigé ajouté pour ${geocache.gc_code} (mode both)`);
                    added = true;
                }
                
                if (!hasOriginalCoords && !hasCorrectedCoords) {
                    console.warn(`Aucune coordonnée valide pour la géocache ${geocache.gc_code} (mode both)`);
                }
            } else {
                console.warn(`Mode d'affichage non reconnu: ${mode}`);
            }
            
            return added;
        }
        
        addMarker(id, coords, title, color) {
            if (!coords || !coords.latitude || !coords.longitude) {
                console.warn("Coordonnées invalides:", coords);
                return;
            }
            
            console.log("Adding marker:", { id, coords, title, color });
            const feature = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([parseFloat(coords.longitude), parseFloat(coords.latitude)])),
                id: id,
                title: title,
                content: `${coords.gc_lat ? coords.gc_lat : coords.latitude}<br>${coords.gc_lon ? coords.gc_lon : coords.longitude}`,
                color: color
            });

            this.vectorSource.addFeature(feature);
        }
        
        addMarkerWithGeocache(geocache) {
            if (!geocache) {
                console.warn("Géocache invalide (null ou undefined)");
                return;
            }
            
            console.log("Adding geocache marker:", geocache.gc_code, "isCorrected:", geocache.isCorrected);
            
            // Extraction des coordonnées (plusieurs formats possibles)
            let latitude, longitude;
            
            // Cas spécial pour les points corrigés déjà préparés
            if (geocache.isCorrected === true && 
                typeof geocache.latitude === 'number' && 
                typeof geocache.longitude === 'number') {
                latitude = geocache.latitude;
                longitude = geocache.longitude;
                console.log("Utilisation des coordonnées corrigées pré-traitées:", latitude, longitude);
            }
            // Cas 1: Coordonnées numériques directement sur l'objet geocache
            else if (typeof geocache.latitude === 'number' && typeof geocache.longitude === 'number') {
                latitude = geocache.latitude;
                longitude = geocache.longitude;
                console.log("Utilisation des coordonnées numériques:", latitude, longitude);
            }
            // Cas 2: Coordonnées sous forme de chaîne (format DDM)
            else if (typeof geocache.latitude === 'string' && typeof geocache.longitude === 'string') {
                // Essayer de convertir les coordonnées
                console.log("Tentative de conversion des coordonnées format chaîne:", geocache.latitude, geocache.longitude);
                try {
                    // Exemple de conversion simple pour les coordonnées au format "N 49° 46.406'" et "E 5° 57.365'"
                    const latMatch = geocache.latitude.match(/([NS])\s*(\d+)°\s*(\d+\.\d+)/i);
                    const lonMatch = geocache.longitude.match(/([EW])\s*(\d+)°\s*(\d+\.\d+)/i);
                    
                    if (latMatch && lonMatch) {
                        const latDir = latMatch[1].toUpperCase();
                        const latDeg = parseInt(latMatch[2], 10);
                        const latMin = parseFloat(latMatch[3]);
                        
                        const lonDir = lonMatch[1].toUpperCase();
                        const lonDeg = parseInt(lonMatch[2], 10);
                        const lonMin = parseFloat(lonMatch[3]);
                        
                        // Calculer les valeurs décimales
                        let lat = latDeg + (latMin / 60);
                        if (latDir === 'S') lat = -lat;
                        
                        let lon = lonDeg + (lonMin / 60);
                        if (lonDir === 'W') lon = -lon;
                        
                        latitude = lat;
                        longitude = lon;
                        console.log("Conversion réussie:", latitude, longitude);
                    } else {
                        console.warn("Format de coordonnées non reconnu:", geocache.latitude, geocache.longitude);
                        return; // Ne pas ajouter le marqueur si on ne peut pas convertir
                    }
                } catch (error) {
                    console.error("Erreur lors de la conversion des coordonnées:", error);
                    return; // Ne pas ajouter le marqueur en cas d'erreur
                }
            }
            // Cas 3: Coordonnées dans un sous-objet coordinates
            else if (geocache.coordinates) {
                // Sous-cas 3.1: Coordonnées numériques dans l'objet coordinates
                if (typeof geocache.coordinates.latitude === 'number' && typeof geocache.coordinates.longitude === 'number') {
                    latitude = geocache.coordinates.latitude;
                    longitude = geocache.coordinates.longitude;
                    console.log("Utilisation des coordonnées numériques depuis l'objet coordinates:", latitude, longitude);
                }
                // Sous-cas 3.2: Coordonnées en chaîne dans l'objet coordinates
                else if (typeof geocache.coordinates.latitude === 'string' && typeof geocache.coordinates.longitude === 'string') {
                    // Même logique de conversion que pour le cas 2
                    console.log("Tentative de conversion des coordonnées format chaîne depuis coordinates:", 
                               geocache.coordinates.latitude, geocache.coordinates.longitude);
                    try {
                        const latMatch = geocache.coordinates.latitude.match(/([NS])\s*(\d+)°\s*(\d+\.\d+)/i);
                        const lonMatch = geocache.coordinates.longitude.match(/([EW])\s*(\d+)°\s*(\d+\.\d+)/i);
                        
                        if (latMatch && lonMatch) {
                            const latDir = latMatch[1].toUpperCase();
                            const latDeg = parseInt(latMatch[2], 10);
                            const latMin = parseFloat(latMatch[3]);
                            
                            const lonDir = lonMatch[1].toUpperCase();
                            const lonDeg = parseInt(lonMatch[2], 10);
                            const lonMin = parseFloat(lonMatch[3]);
                            
                            // Calculer les valeurs décimales
                            let lat = latDeg + (latMin / 60);
                            if (latDir === 'S') lat = -lat;
                            
                            let lon = lonDeg + (lonMin / 60);
                            if (lonDir === 'W') lon = -lon;
                            
                            latitude = lat;
                            longitude = lon;
                            console.log("Conversion depuis coordinates réussie:", latitude, longitude);
                        } else {
                            console.warn("Format de coordonnées dans coordinates non reconnu:", 
                                        geocache.coordinates.latitude, geocache.coordinates.longitude);
                            return; // Ne pas ajouter le marqueur si on ne peut pas convertir
                        }
                    } catch (error) {
                        console.error("Erreur lors de la conversion des coordonnées depuis coordinates:", error);
                        return; // Ne pas ajouter le marqueur en cas d'erreur
                    }
                }
                // Sous-cas 3.3: Coordonnées au format DDM lat/lon dans l'objet coordinates
                else if (geocache.coordinates.ddm_lat && geocache.coordinates.ddm_lon) {
                    console.log("Tentative de conversion des coordonnées format DDM:", 
                               geocache.coordinates.ddm_lat, geocache.coordinates.ddm_lon);
                    try {
                        const latMatch = geocache.coordinates.ddm_lat.match(/([NS])\s*(\d+)°\s*(\d+\.\d+)/i);
                        const lonMatch = geocache.coordinates.ddm_lon.match(/([EW])\s*(\d+)°\s*(\d+\.\d+)/i);
                        
                        if (latMatch && lonMatch) {
                            const latDir = latMatch[1].toUpperCase();
                            const latDeg = parseInt(latMatch[2], 10);
                            const latMin = parseFloat(latMatch[3]);
                            
                            const lonDir = lonMatch[1].toUpperCase();
                            const lonDeg = parseInt(lonMatch[2], 10);
                            const lonMin = parseFloat(lonMatch[3]);
                            
                            // Calculer les valeurs décimales
                            let lat = latDeg + (latMin / 60);
                            if (latDir === 'S') lat = -lat;
                            
                            let lon = lonDeg + (lonMin / 60);
                            if (lonDir === 'W') lon = -lon;
                            
                            latitude = lat;
                            longitude = lon;
                            console.log("Conversion depuis ddm_lat/ddm_lon réussie:", latitude, longitude);
                        } else {
                            console.warn("Format de coordonnées ddm_lat/ddm_lon non reconnu:", 
                                        geocache.coordinates.ddm_lat, geocache.coordinates.ddm_lon);
                            return; // Ne pas ajouter le marqueur si on ne peut pas convertir
                        }
                    } catch (error) {
                        console.error("Erreur lors de la conversion des coordonnées ddm_lat/ddm_lon:", error);
                        return; // Ne pas ajouter le marqueur en cas d'erreur
                    }
                }
                else {
                    console.warn("Format de coordonnées non supporté dans l'objet geocache:", geocache);
                    return; // Ne pas ajouter le marqueur si le format n'est pas supporté
                }
            }
            else {
                console.warn("Aucune coordonnée valide trouvée dans l'objet geocache:", geocache);
                return; // Ne pas ajouter le marqueur si aucune coordonnée n'est trouvée
            }
            
            // Vérifier une dernière fois que les coordonnées sont valides
            if (!isFinite(latitude) || !isFinite(longitude) || 
                Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
                console.error("Coordonnées invalides après conversion:", latitude, longitude);
                return;
            }
            
            // Déterminer la couleur en fonction du statut
            let color;
            if (geocache.solved === 'solved') {
                color = 'rgba(0, 128, 0, 0.8)'; // Vert
            } else if (geocache.solved === 'in_progress') {
                color = 'rgba(255, 165, 0, 0.8)'; // Orange
            } else {
                color = 'rgba(51, 136, 255, 0.8)'; // Bleu
            }
            
            // Créer le point avec les coordonnées converties
            try {
                // Vérifier si c'est une coordonnée corrigée
                const isCorrected = geocache.isCorrected === true;
                
                // Créer un style personnalisé pour les coordonnées corrigées
                const styleFunction = (feature) => {
                    const baseColor = feature.get('color') || color;
                    const cacheType = geocache.cache_type || 'Traditional';
                    
                    // Définir les couleurs selon les standards de géocaching.com
                    let cacheColor;
                    let cacheSymbol = null;
                    
                    // Codes couleurs standards de Geocaching.com
                    const cacheColors = {
                        'Traditional': 'rgba(0, 175, 80, 0.8)',      // Vert
                        'Mystery': 'rgba(0, 60, 255, 0.8)',         // Bleu foncé
                        'Unknown': 'rgba(0, 60, 255, 0.8)',         // Bleu foncé (alias de Mystery)
                        'Multi-cache': 'rgba(255, 200, 0, 0.8)',    // Jaune/Orange
                        'Letterbox': 'rgba(0, 60, 255, 0.8)',       // Bleu foncé (comme Mystery)
                        'Letterbox Hybrid': 'rgba(0, 60, 255, 0.8)', // Bleu foncé (comme Mystery)
                        'Wherigo': 'rgba(0, 60, 255, 0.8)',         // Bleu foncé (comme Mystery)
                        'Event': 'rgba(235, 0, 130, 0.8)',          // Rose
                        'Virtual': 'rgba(120, 180, 215, 0.8)',      // Bleu pâle
                        'Earthcache': 'rgba(170, 100, 45, 0.8)',    // Marron
                        'Webcam': 'rgba(100, 100, 100, 0.8)'        // Gris
                    };
                    
                    // Utiliser la couleur spécifique au type de cache si disponible
                    if (cacheType in cacheColors) {
                        cacheColor = cacheColors[cacheType];
                    } else {
                        // Couleur par défaut bleue pour les types non reconnus
                        cacheColor = 'rgba(51, 136, 255, 0.8)'; // Bleu
                    }
                    
                    // Ne plus remplacer la couleur en fonction du statut
                    // Conserver uniquement le carré pour indiquer les coordonnées corrigées
                    
                    // Créer le style de base
                    const baseStyle = new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: 6,
                            fill: new ol.style.Fill({
                                color: cacheColor
                            }),
                            stroke: new ol.style.Stroke({
                                color: '#ffffff',
                                width: isCorrected ? 2 : 1 // Contour plus épais pour les coordonnées corrigées
                            })
                        })
                    });
                    
                    // Styles spécifiques pour certains types de caches
                    const specialStyles = [];
                    
                    // Ajouter un symbole spécifique pour les types de caches demandés
                    if (cacheType === 'Mystery' || cacheType === 'Unknown') {
                        // Point d'interrogation blanc pour les Mystery/Unknown
                        specialStyles.push(new ol.style.Style({
                            text: new ol.style.Text({
                                text: '?',
                                font: 'bold 12px sans-serif',
                                fill: new ol.style.Fill({
                                    color: '#ffffff'
                                }),
                                offsetY: 1
                            })
                        }));
                    } else if (cacheType === 'Letterbox' || cacheType === 'Letterbox Hybrid') {
                        // Symbole d'enveloppe pour les Letterbox
                        specialStyles.push(new ol.style.Style({
                            text: new ol.style.Text({
                                text: '✉',
                                font: '10px sans-serif',
                                fill: new ol.style.Fill({
                                    color: '#ffffff'
                                }),
                                offsetY: 1
                            })
                        }));
                    } else if (cacheType === 'Wherigo') {
                        // Symbole de triangle pour les Wherigo
                        specialStyles.push(new ol.style.Style({
                            text: new ol.style.Text({
                                text: '▲',
                                font: '10px sans-serif',
                                fill: new ol.style.Fill({
                                    color: '#ffffff'
                                }),
                                offsetY: 1
                            })
                        }));
                    }
                    
                    // Combinaison des styles
                    let styles = [baseStyle, ...specialStyles];
                    
                    // Si c'est une coordonnée corrigée, ajouter un symbole supplémentaire
                    if (isCorrected) {
                        styles.push(new ol.style.Style({
                            image: new ol.style.RegularShape({
                                points: 4, // Carré
                                radius: 9,
                                stroke: new ol.style.Stroke({
                                    color: 'rgba(0, 128, 0, 0.8)', // Vert pour les coordonnées corrigées
                                    width: 2
                                }),
                                fill: null
                            })
                        }));
                    }
                    
                    return styles;
                };
                
                // Texte supplémentaire pour indiquer si ce sont des coordonnées corrigées
                const correctedText = isCorrected ? ' (Corrigées)' : '';
                
                const feature = new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([longitude, latitude])),
                    id: geocache.id,
                    title: `${geocache.gc_code} - ${geocache.name || 'Sans nom'}${correctedText}`,
                    content: `Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}<br>` +
                             `Type: ${geocache.cache_type || 'Non spécifié'}<br>` +
                             `Difficulté: ${geocache.difficulty || '?'}, Terrain: ${geocache.terrain || '?'}` +
                             (isCorrected ? '<br><strong>Coordonnées corrigées</strong>' : ''),
                    color: color,
                    geocache: geocache,
                    isCorrected: isCorrected
                });
                
                // Appliquer le style personnalisé
                feature.setStyle(styleFunction);
                
                this.vectorSource.addFeature(feature);
                console.log("Marqueur ajouté avec succès:", geocache.gc_code, isCorrected ? "(Corrigé)" : "");
            } catch (error) {
                console.error("Erreur lors de l'ajout du marqueur:", error);
            }
        }
        
        // Fonction pour extraire les coordonnées d'un objet Point SQL
        extractCoordinatesFromSQLPoint(point) {
            if (!point) return null;
            
            console.log("Extraction de coordonnées depuis un objet SQL Point:", point);
            
            // Différents formats possibles
            try {
                // Format 1: Chaîne SQL Point
                if (typeof point === 'string') {
                    // Exemple: "SRID=4326;POINT(5.962917 50.3046)"
                    const match = point.match(/POINT\(([0-9.-]+) ([0-9.-]+)\)/i);
                    if (match) {
                        // Attention: dans POINT(lon lat), longitude est en premier
                        const longitude = parseFloat(match[1]);
                        const latitude = parseFloat(match[2]);
                        
                        if (!isNaN(latitude) && !isNaN(longitude)) {
                            console.log("Coordonnées extraites de la chaîne SQL Point:", latitude, longitude);
                            return { latitude, longitude };
                        }
                    }
                }
                // Format 2: Objet JSON avec lon/lat ou x/y
                else if (typeof point === 'object') {
                    if (point.coordinates) {
                        // Format GeoJSON: { type: "Point", coordinates: [lon, lat] }
                        if (Array.isArray(point.coordinates) && point.coordinates.length >= 2) {
                            // GeoJSON stocke les coordonnées comme [longitude, latitude]
                            const longitude = point.coordinates[0];
                            const latitude = point.coordinates[1];
                            
                            if (!isNaN(latitude) && !isNaN(longitude)) {
                                console.log("Coordonnées extraites de GeoJSON:", latitude, longitude);
                                return { latitude, longitude };
                            }
                        }
                    }
                    // Format PostGIS: { x: lon, y: lat }
                    else if (point.x !== undefined && point.y !== undefined) {
                        const longitude = point.x;
                        const latitude = point.y;
                        
                        if (!isNaN(latitude) && !isNaN(longitude)) {
                            console.log("Coordonnées extraites de l'objet PostGIS:", latitude, longitude);
                            return { latitude, longitude };
                        }
                    }
                }
            } catch (error) {
                console.error("Erreur lors de l'extraction des coordonnées:", error);
            }
            
            return null;
        }

        // Fonction pour préparer les données de géocache en ajoutant les coordonnées normalisées
        prepareGeocacheCoordinates(geocache) {
            if (!geocache) return geocache;
            
            // Créer une copie pour ne pas modifier l'original
            const prepared = { ...geocache };
            
            // 1. Traiter les coordonnées originales (si pas déjà définies)
            if (!prepared.latitude || !prepared.longitude) {
                // Essayer d'extraire les coordonnées originales de location si disponible
                if (prepared.location) {
                    const coords = this.extractCoordinatesFromSQLPoint(prepared.location);
                    if (coords) {
                        prepared.latitude = coords.latitude;
                        prepared.longitude = coords.longitude;
                        console.log(`Coordonnées originales extraites pour ${prepared.gc_code}:`, coords);
                    }
                }
            }
            
            // 2. Traiter les coordonnées corrigées (si pas déjà définies)
            // Vérifier d'abord si les propriétés latitude_corrected et longitude_corrected existent
            if (prepared.latitude_corrected !== undefined && prepared.longitude_corrected !== undefined) {
                // Utiliser directement les propriétés latitude_corrected et longitude_corrected
                // Créer l'objet corrected_coordinates pour compatibilité
                prepared.corrected_coordinates = {
                    latitude: prepared.latitude_corrected,
                    longitude: prepared.longitude_corrected
                };
                console.log(`Coordonnées corrigées utilisées pour ${prepared.gc_code}:`, prepared.corrected_coordinates);
            }
            // Sinon, essayer d'extraire les coordonnées corrigées de location_corrected si disponible
            else if (prepared.location_corrected) {
                const coords = this.extractCoordinatesFromSQLPoint(prepared.location_corrected);
                if (coords) {
                    prepared.latitude_corrected = coords.latitude;
                    prepared.longitude_corrected = coords.longitude;
                    
                    // Créer également l'objet corrected_coordinates pour compatibilité
                    prepared.corrected_coordinates = {
                        latitude: coords.latitude,
                        longitude: coords.longitude
                    };
                    
                    console.log(`Coordonnées corrigées extraites pour ${prepared.gc_code}:`, coords);
                }
            }
            // Vérifier aussi si l'objet corrected_coordinates existe déjà
            else if (prepared.corrected_coordinates && 
                     prepared.corrected_coordinates.latitude !== undefined && 
                     prepared.corrected_coordinates.longitude !== undefined) {
                // Synchroniser avec latitude_corrected et longitude_corrected pour cohérence
                prepared.latitude_corrected = prepared.corrected_coordinates.latitude;
                prepared.longitude_corrected = prepared.corrected_coordinates.longitude;
                console.log(`Objet corrected_coordinates utilisé pour ${prepared.gc_code}:`, prepared.corrected_coordinates);
            }
            
            return prepared;
        }

        // Mettre à jour la méthode handleMultiSolverUpdate pour utiliser prepareGeocacheCoordinates
        handleMultiSolverUpdate(event) {
            console.log("Événement multiSolverDataUpdated reçu:", event.detail);
            
            if (!event.detail || !event.detail.multiSolverId) {
                console.error("Événement multiSolverDataUpdated invalide");
                return;
            }
            
            // Vérifier si l'événement correspond à notre Multi Solver
            if (this.multiSolverIdValue === event.detail.multiSolverId) {
                // Vérifier si la carte est initialisée
                if (!this.map) {
                    console.error("La carte n'est pas initialisée, impossible de mettre à jour les marqueurs");
                    return;
                }
                
                // Récupérer le mode d'affichage des coordonnées
                const coordsMode = this.coordsDisplayMode || 'corrected';
                console.log("Mode d'affichage des coordonnées pour la mise à jour:", coordsMode);
                
                console.log("Mise à jour des données du Multi Solver:", 
                            event.detail.data && Array.isArray(event.detail.data) ? event.detail.data.length : 0, "géocaches");
                
                // Examiner la structure d'un échantillon pour le débogage
                if (event.detail.data && Array.isArray(event.detail.data) && event.detail.data.length > 0) {
                    const sample = event.detail.data[0];
                    console.log("=== STRUCTURE DÉTAILLÉE D'UN ÉCHANTILLON DE DONNÉES ===");
                    console.log("Clés de premier niveau:", Object.keys(sample));
                    
                    // Vérifier si des coordonnées corrigées sont présentes sous différentes formes
                    console.log("location_corrected présent:", sample.location_corrected !== undefined);
                    console.log("latitude_corrected présent:", sample.latitude_corrected !== undefined);
                    console.log("longitude_corrected présent:", sample.longitude_corrected !== undefined);
                    console.log("gc_lat_corrected présent:", sample.gc_lat_corrected !== undefined);
                    console.log("gc_lon_corrected présent:", sample.gc_lon_corrected !== undefined);
                    
                    // Vérifier l'objet corrected_coordinates
                    console.log("corrected_coordinates présent:", sample.corrected_coordinates !== undefined);
                    if (sample.corrected_coordinates) {
                        console.log("corrected_coordinates structure:", sample.corrected_coordinates);
                    }
                    
                    // Vérifier l'objet coordinates
                    console.log("coordinates présent:", sample.coordinates !== undefined);
                    if (sample.coordinates) {
                        console.log("coordinates structure:", sample.coordinates);
                        console.log("coordinates.latitude_corrected présent:", sample.coordinates.latitude_corrected !== undefined);
                    }
                    
                    // Vérifier les objets location et location_corrected
                    console.log("location:", sample.location);
                    if (sample.location) {
                        const coords = this.extractCoordinatesFromSQLPoint(sample.location);
                        console.log("Coordonnées extraites de location:", coords);
                    }
                    
                    // Teste de la présence de location_corrected (peut avoir été supprimé dans le backend)
                    if (sample.location_corrected) {
                        const coords = this.extractCoordinatesFromSQLPoint(sample.location_corrected);
                        console.log("Coordonnées extraites de location_corrected:", coords);
                    } else {
                        console.log("location_corrected n'est pas présent dans les données");
                    }
                }
                
                // Préparer les données avec les coordonnées normalisées
                // Vérifier si event.detail.data est un tableau avant d'appliquer map()
                const preparedData = (event.detail.data && Array.isArray(event.detail.data)) ? 
                    event.detail.data.map(gc => this.prepareGeocacheCoordinates(gc)) : [];
                
                if (preparedData.length > 0) {
                    console.log("Premier élément après préparation:", preparedData[0]);
                    
                    // Mettre à jour les données dans sessionStorage
                    try {
                        sessionStorage.setItem('multiSolverGeocaches', JSON.stringify(preparedData));
                    } catch (error) {
                        console.warn("Impossible de sauvegarder les données dans sessionStorage:", error);
                    }
                    
                    // Si aucun point n'est encore présent sur la carte, simplement ajouter tous les points
                    if (this.vectorSource.getFeatures().length === 0) {
                        console.log("Aucun point sur la carte, ajout de tous les points selon le mode:", coordsMode);
                        let pointsAdded = 0;
                        
                        preparedData.forEach(geocache => {
                            if (this.addGeocacheBasedOnCoordinateMode(geocache, coordsMode)) {
                                pointsAdded++;
                            }
                        });
                        
                        console.log(`${pointsAdded} points ajoutés à la carte`);
                        
                        // Ajuster la vue pour montrer tous les marqueurs si des points ont été ajoutés
                        if (pointsAdded > 0) {
                            setTimeout(() => {
                                this.fitMapToMarkers();
                            }, 100);
                        }
                        
                        return; // Sortir de la méthode, nous avons fini
                    }
                    
                    // Compteur pour suivre les points ajoutés ou mis à jour
                    let pointsAdded = 0;
                    let pointsUpdated = 0;
                    
                    // Récupérer les features actuelles pour les comparer
                    const currentFeatures = this.vectorSource.getFeatures();
                    const currentIds = new Set(currentFeatures.map(f => f.get('id')));
                    
                    // Ajouter ou mettre à jour les marqueurs pour chaque géocache avec des coordonnées valides
                    preparedData.forEach(geocache => {
                        // Vérifier si la géocache a des coordonnées corrigées - après préparation des données
                        const hasCorrectedCoords = (
                            // Format 1: objet corrected_coordinates
                            (geocache.corrected_coordinates && 
                            geocache.corrected_coordinates.latitude && 
                            geocache.corrected_coordinates.longitude) ||
                            // Format 2: propriétés latitude_corrected/longitude_corrected
                            (geocache.latitude_corrected !== undefined && 
                            geocache.longitude_corrected !== undefined)
                        );
                        
                        // Vérifier si la géocache a des coordonnées originales - après préparation des données
                        const hasOriginalCoords = (
                            // Format 1: propriétés latitude/longitude
                            (geocache.latitude !== undefined && geocache.longitude !== undefined) ||
                            // Format 2: objet coordinates avec lat/lon
                            (geocache.coordinates && 
                            ((geocache.coordinates.latitude !== undefined && geocache.coordinates.longitude !== undefined) ||
                            (geocache.coordinates.lat !== undefined && geocache.coordinates.lon !== undefined)))
                        );
                        
                        console.log(`Géocache ${geocache.gc_code} - Coords corrigées: ${hasCorrectedCoords}, Coords originales: ${hasOriginalCoords}`);
                        
                        // Continuer avec la logique existante...
                        // Appliquer la logique selon le mode d'affichage des coordonnées
                        
                        // 1. Mode "originales" uniquement
                        if (coordsMode === 'original') {
                            if (hasOriginalCoords) {
                                const existingFeature = currentIds.has(geocache.id) ? 
                                    currentFeatures.find(f => f.get('id') === geocache.id) : null;
                                
                                if (existingFeature) {
                                    this.updateExistingMarker(existingFeature, geocache);
                                    pointsUpdated++;
                                } else {
                                    this.addMarkerWithGeocache(geocache);
                                    pointsAdded++;
                                }
                            }
                            
                            // Supprimer les points corrigés si présents
                            const correctedId = geocache.id + '_corrected';
                            const existingCorrectedFeature = currentIds.has(correctedId) ? 
                                currentFeatures.find(f => f.get('id') === correctedId) : null;
                            
                            if (existingCorrectedFeature) {
                                this.vectorSource.removeFeature(existingCorrectedFeature);
                            }
                        }
                        
                        // 2. Mode "corrigées" (ou corrigées si disponibles, sinon originales)
                        else if (coordsMode === 'corrected') {
                            if (hasCorrectedCoords) {
                                // Utiliser les coordonnées corrigées
                                const correctedId = geocache.id + '_corrected';
                                const existingCorrectedFeature = currentIds.has(correctedId) ? 
                                    currentFeatures.find(f => f.get('id') === correctedId) : null;
                                
                                const geocacheWithCorrectedCoords = {
                                    ...geocache,
                                    id: correctedId,
                                    latitude: geocache.corrected_coordinates.latitude,
                                    longitude: geocache.corrected_coordinates.longitude,
                                    isCorrected: true
                                };
                                
                                if (existingCorrectedFeature) {
                                    this.updateExistingMarker(existingCorrectedFeature, geocacheWithCorrectedCoords);
                                    pointsUpdated++;
                                } else {
                                    this.addMarkerWithGeocache(geocacheWithCorrectedCoords);
                                    pointsAdded++;
                                }
                                
                                // Supprimer le point original si présent
                                const existingOriginalFeature = currentIds.has(geocache.id) ? 
                                    currentFeatures.find(f => f.get('id') === geocache.id) : null;
                                
                                if (existingOriginalFeature) {
                                    this.vectorSource.removeFeature(existingOriginalFeature);
                                }
                            } 
                            else if (hasOriginalCoords) {
                                // Pas de coordonnées corrigées, utiliser les originales
                                const existingFeature = currentIds.has(geocache.id) ? 
                                    currentFeatures.find(f => f.get('id') === geocache.id) : null;
                                
                                if (existingFeature) {
                                    this.updateExistingMarker(existingFeature, geocache);
                                    pointsUpdated++;
                                } else {
                                    this.addMarkerWithGeocache(geocache);
                                    pointsAdded++;
                                }
                            }
                        }
                        
                        // 3. Mode "les deux" (afficher originales et corrigées)
                        else if (coordsMode === 'both') {
                            // Gérer les coordonnées originales
                            if (hasOriginalCoords) {
                                const existingFeature = currentIds.has(geocache.id) ? 
                                    currentFeatures.find(f => f.get('id') === geocache.id) : null;
                                
                                if (existingFeature) {
                                    this.updateExistingMarker(existingFeature, geocache);
                                    pointsUpdated++;
                                } else {
                                    this.addMarkerWithGeocache(geocache);
                                    pointsAdded++;
                                }
                            }
                            
                            // Gérer les coordonnées corrigées
                            if (hasCorrectedCoords) {
                                const correctedId = geocache.id + '_corrected';
                                const existingCorrectedFeature = currentIds.has(correctedId) ? 
                                    currentFeatures.find(f => f.get('id') === correctedId) : null;
                                
                                const geocacheWithCorrectedCoords = {
                                    ...geocache,
                                    id: correctedId,
                                    latitude: geocache.corrected_coordinates.latitude,
                                    longitude: geocache.corrected_coordinates.longitude,
                                    isCorrected: true
                                };
                                
                                if (existingCorrectedFeature) {
                                    this.updateExistingMarker(existingCorrectedFeature, geocacheWithCorrectedCoords);
                                    pointsUpdated++;
                                } else {
                                    this.addMarkerWithGeocache(geocacheWithCorrectedCoords);
                                    pointsAdded++;
                                }
                            }
                        }
                    });
                    
                    console.log(`${pointsAdded} nouveaux points ajoutés, ${pointsUpdated} points mis à jour sur la carte`);
                    
                    // Ajuster la vue pour montrer tous les marqueurs seulement si de nouveaux points ont été ajoutés
                    if (pointsAdded > 0) {
                        // Attendre que les marqueurs soient rendus
                        setTimeout(() => {
                            this.fitMapToMarkers();
                        }, 100);
                    }
                } else {
                    console.warn("Aucune donnée valide dans l'événement multiSolverDataUpdated");
                }
            }
        }

        // Méthode pour mettre à jour un marqueur existant plutôt que de le recréer
        updateExistingMarker(feature, geocache) {
            console.log("Mise à jour du marqueur existant pour:", geocache.gc_code);
            
            try {
                // Extraire et convertir les coordonnées
                let latitude, longitude;
                let coordsChanged = false;
                
                // Vérifier si c'est une coordonnée corrigée
                const isCorrected = geocache.isCorrected === true;
                
                // Si c'est une coordonnée corrigée, vérifier tous les formats possibles
                if (isCorrected) {
                    // Format 1: latitude/longitude directement sur l'objet (déjà préparé)
                    if (typeof geocache.latitude === 'number' && typeof geocache.longitude === 'number') {
                        latitude = geocache.latitude;
                        longitude = geocache.longitude;
                        coordsChanged = true;
                    }
                    // Format 2: propriétés sur l'objet principal (non préparé)
                    else if (geocache.latitude_corrected !== undefined) {
                        latitude = geocache.latitude_corrected;
                        longitude = geocache.longitude_corrected;
                        coordsChanged = true;
                    }
                    // Format 3: dans l'objet corrected_coordinates
                    else if (geocache.corrected_coordinates && 
                            geocache.corrected_coordinates.latitude !== undefined) {
                        latitude = geocache.corrected_coordinates.latitude;
                        longitude = geocache.corrected_coordinates.longitude;
                        coordsChanged = true;
                    }
                    // Format 4: dans l'objet coordinates
                    else if (geocache.coordinates && 
                            geocache.coordinates.latitude_corrected !== undefined) {
                        latitude = geocache.coordinates.latitude_corrected;
                        longitude = geocache.coordinates.longitude_corrected;
                        coordsChanged = true;
                    }
                    // Format 5: gc_lat_corrected/gc_lon_corrected - besoin de conversion
                    else if (geocache.gc_lat_corrected && geocache.gc_lon_corrected) {
                        try {
                            const latMatch = geocache.gc_lat_corrected.match(/([NS])\s*(\d+)°\s*(\d+\.\d+)/i);
                            const lonMatch = geocache.gc_lon_corrected.match(/([EW])\s*(\d+)°\s*(\d+\.\d+)/i);
                            
                            if (latMatch && lonMatch) {
                                const latDir = latMatch[1].toUpperCase();
                                const latDeg = parseInt(latMatch[2], 10);
                                const latMin = parseFloat(latMatch[3]);
                                
                                const lonDir = lonMatch[1].toUpperCase();
                                const lonDeg = parseInt(lonMatch[2], 10);
                                const lonMin = parseFloat(lonMatch[3]);
                                
                                let lat = latDeg + (latMin / 60);
                                if (latDir === 'S') lat = -lat;
                                
                                let lon = lonDeg + (lonMin / 60);
                                if (lonDir === 'W') lon = -lon;
                                
                                latitude = lat;
                                longitude = lon;
                                coordsChanged = true;
                            }
                        } catch (error) {
                            console.warn("Erreur lors de la conversion des coordonnées corrigées:", error);
                        }
                    }
                } 
                // Coordonnées originales
                else {
                    // Cas 1: Coordonnées numériques directement sur l'objet geocache
                    if (typeof geocache.latitude === 'number' && typeof geocache.longitude === 'number') {
                        latitude = geocache.latitude;
                        longitude = geocache.longitude;
                        coordsChanged = true;
                    }
                    // Cas 2: Coordonnées sous forme de chaîne (format DDM)
                    else if (typeof geocache.latitude === 'string' && typeof geocache.longitude === 'string') {
                        try {
                            const latMatch = geocache.latitude.match(/([NS])\s*(\d+)°\s*(\d+\.\d+)/i);
                            const lonMatch = geocache.longitude.match(/([EW])\s*(\d+)°\s*(\d+\.\d+)/i);
                            
                            if (latMatch && lonMatch) {
                                const latDir = latMatch[1].toUpperCase();
                                const latDeg = parseInt(latMatch[2], 10);
                                const latMin = parseFloat(latMatch[3]);
                                
                                const lonDir = lonMatch[1].toUpperCase();
                                const lonDeg = parseInt(lonMatch[2], 10);
                                const lonMin = parseFloat(lonMatch[3]);
                                
                                let lat = latDeg + (latMin / 60);
                                if (latDir === 'S') lat = -lat;
                                
                                let lon = lonDeg + (lonMin / 60);
                                if (lonDir === 'W') lon = -lon;
                                
                                latitude = lat;
                                longitude = lon;
                                coordsChanged = true;
                            }
                        } catch (error) {
                            console.warn("Erreur lors de la conversion des coordonnées pour la mise à jour:", error);
                        }
                    }
                    // Cas 3: Coordonnées dans un sous-objet coordinates
                    else if (geocache.coordinates) {
                        if (typeof geocache.coordinates.latitude === 'number' && typeof geocache.coordinates.longitude === 'number') {
                            latitude = geocache.coordinates.latitude;
                            longitude = geocache.coordinates.longitude;
                            coordsChanged = true;
                        }
                        else if (typeof geocache.coordinates.latitude === 'string' && typeof geocache.coordinates.longitude === 'string') {
                            try {
                                const latMatch = geocache.coordinates.latitude.match(/([NS])\s*(\d+)°\s*(\d+\.\d+)/i);
                                const lonMatch = geocache.coordinates.longitude.match(/([EW])\s*(\d+)°\s*(\d+\.\d+)/i);
                                
                                if (latMatch && lonMatch) {
                                    const latDir = latMatch[1].toUpperCase();
                                    const latDeg = parseInt(latMatch[2], 10);
                                    const latMin = parseFloat(latMatch[3]);
                                    
                                    const lonDir = lonMatch[1].toUpperCase();
                                    const lonDeg = parseInt(lonMatch[2], 10);
                                    const lonMin = parseFloat(lonMatch[3]);
                                    
                                    let lat = latDeg + (latMin / 60);
                                    if (latDir === 'S') lat = -lat;
                                    
                                    let lon = lonDeg + (lonMin / 60);
                                    if (lonDir === 'W') lon = -lon;
                                    
                                    latitude = lat;
                                    longitude = lon;
                                    coordsChanged = true;
                                }
                            } catch (error) {
                                console.warn("Erreur lors de la conversion des coordonnées pour la mise à jour:", error);
                            }
                        }
                        else if (geocache.coordinates.ddm_lat && geocache.coordinates.ddm_lon) {
                            try {
                                const latMatch = geocache.coordinates.ddm_lat.match(/([NS])\s*(\d+)°\s*(\d+\.\d+)/i);
                                const lonMatch = geocache.coordinates.ddm_lon.match(/([EW])\s*(\d+)°\s*(\d+\.\d+)/i);
                                
                                if (latMatch && lonMatch) {
                                    const latDir = latMatch[1].toUpperCase();
                                    const latDeg = parseInt(latMatch[2], 10);
                                    const latMin = parseFloat(latMatch[3]);
                                    
                                    const lonDir = lonMatch[1].toUpperCase();
                                    const lonDeg = parseInt(lonMatch[2], 10);
                                    const lonMin = parseFloat(lonMatch[3]);
                                    
                                    let lat = latDeg + (latMin / 60);
                                    if (latDir === 'S') lat = -lat;
                                    
                                    let lon = lonDeg + (lonMin / 60);
                                    if (lonDir === 'W') lon = -lon;
                                    
                                    latitude = lat;
                                    longitude = lon;
                                    coordsChanged = true;
                                }
                            } catch (error) {
                                console.warn("Erreur lors de la conversion des coordonnées pour la mise à jour:", error);
                            }
                        }
                    }
                    // Cas 4: gc_lat/gc_lon présents
                    else if (geocache.gc_lat && geocache.gc_lon) {
                        try {
                            const latMatch = geocache.gc_lat.match(/([NS])\s*(\d+)°\s*(\d+\.\d+)/i);
                            const lonMatch = geocache.gc_lon.match(/([EW])\s*(\d+)°\s*(\d+\.\d+)/i);
                            
                            if (latMatch && lonMatch) {
                                const latDir = latMatch[1].toUpperCase();
                                const latDeg = parseInt(latMatch[2], 10);
                                const latMin = parseFloat(latMatch[3]);
                                
                                const lonDir = lonMatch[1].toUpperCase();
                                const lonDeg = parseInt(lonMatch[2], 10);
                                const lonMin = parseFloat(lonMatch[3]);
                                
                                let lat = latDeg + (latMin / 60);
                                if (latDir === 'S') lat = -lat;
                                
                                let lon = lonDeg + (lonMin / 60);
                                if (lonDir === 'W') lon = -lon;
                                
                                latitude = lat;
                                longitude = lon;
                                coordsChanged = true;
                            }
                        } catch (error) {
                            console.warn("Erreur lors de la conversion des coordonnées GC:", error);
                        }
                    }
                }
                
                // Si les coordonnées ont changé, mettre à jour la géométrie
                if (coordsChanged && isFinite(latitude) && isFinite(longitude)) {
                    console.log("Mise à jour des coordonnées du point:", latitude, longitude);
                    
                    // Mettre à jour la géométrie du point
                    feature.setGeometry(new ol.geom.Point(ol.proj.fromLonLat([longitude, latitude])));
                    
                    // Texte supplémentaire pour les coordonnées corrigées
                    const correctedText = isCorrected ? ' (Corrigées)' : '';
                    
                    // Mettre à jour le contenu de la popup
                    feature.set('content', `Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}<br>` +
                                          `Type: ${geocache.cache_type || 'Non spécifié'}<br>` +
                                          `Difficulté: ${geocache.difficulty || '?'}, Terrain: ${geocache.terrain || '?'}` +
                                          (isCorrected ? '<br><strong>Coordonnées corrigées</strong>' : ''));
                                          
                    // Mettre à jour le titre
                    feature.set('title', `${geocache.gc_code} - ${geocache.name || 'Sans nom'}${correctedText}`);
                }
                
                // Mettre à jour d'autres attributs si nécessaire
                feature.set('geocache', geocache);
                feature.set('isCorrected', isCorrected);
                
                // Mettre à jour la couleur si le statut a changé
                let color;
                if (geocache.solved === 'solved') {
                    color = 'rgba(0, 128, 0, 0.8)'; // Vert
                } else if (geocache.solved === 'in_progress') {
                    color = 'rgba(255, 165, 0, 0.8)'; // Orange
                } else {
                    color = 'rgba(51, 136, 255, 0.8)'; // Bleu
                }
                feature.set('color', color);
                
                // Mettre à jour le style en fonction du statut de coordonnée corrigée
                const styleFunction = (feature) => {
                    const baseColor = feature.get('color') || color;
                    const cacheType = geocache.cache_type || 'Traditional';
                    
                    // Définir les couleurs selon les standards de géocaching.com
                    let cacheColor;
                    let cacheSymbol = null;
                    
                    // Codes couleurs standards de Geocaching.com
                    const cacheColors = {
                        'Traditional': 'rgba(0, 175, 80, 0.8)',      // Vert
                        'Mystery': 'rgba(0, 60, 255, 0.8)',         // Bleu foncé
                        'Unknown': 'rgba(0, 60, 255, 0.8)',         // Bleu foncé (alias de Mystery)
                        'Multi-cache': 'rgba(255, 200, 0, 0.8)',    // Jaune/Orange
                        'Letterbox': 'rgba(0, 60, 255, 0.8)',       // Bleu foncé (comme Mystery)
                        'Letterbox Hybrid': 'rgba(0, 60, 255, 0.8)', // Bleu foncé (comme Mystery)
                        'Wherigo': 'rgba(0, 60, 255, 0.8)',         // Bleu foncé (comme Mystery)
                        'Event': 'rgba(235, 0, 130, 0.8)',          // Rose
                        'Virtual': 'rgba(120, 180, 215, 0.8)',      // Bleu pâle
                        'Earthcache': 'rgba(170, 100, 45, 0.8)',    // Marron
                        'Webcam': 'rgba(100, 100, 100, 0.8)'        // Gris
                    };
                    
                    // Utiliser la couleur spécifique au type de cache si disponible
                    if (cacheType in cacheColors) {
                        cacheColor = cacheColors[cacheType];
                    } else {
                        // Couleur par défaut bleue pour les types non reconnus
                        cacheColor = 'rgba(51, 136, 255, 0.8)'; // Bleu
                    }
                    
                    // Ne plus remplacer la couleur en fonction du statut
                    // Conserver uniquement le carré pour indiquer les coordonnées corrigées
                    
                    // Créer le style de base
                    const baseStyle = new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: 6,
                            fill: new ol.style.Fill({
                                color: cacheColor
                            }),
                            stroke: new ol.style.Stroke({
                                color: '#ffffff',
                                width: isCorrected ? 2 : 1 // Contour plus épais pour les coordonnées corrigées
                            })
                        })
                    });
                    
                    // Styles spécifiques pour certains types de caches
                    const specialStyles = [];
                    
                    // Ajouter un symbole spécifique pour les types de caches demandés
                    if (cacheType === 'Mystery' || cacheType === 'Unknown') {
                        // Point d'interrogation blanc pour les Mystery/Unknown
                        specialStyles.push(new ol.style.Style({
                            text: new ol.style.Text({
                                text: '?',
                                font: 'bold 12px sans-serif',
                                fill: new ol.style.Fill({
                                    color: '#ffffff'
                                }),
                                offsetY: 1
                            })
                        }));
                    } else if (cacheType === 'Letterbox' || cacheType === 'Letterbox Hybrid') {
                        // Symbole d'enveloppe pour les Letterbox
                        specialStyles.push(new ol.style.Style({
                            text: new ol.style.Text({
                                text: '✉',
                                font: '10px sans-serif',
                                fill: new ol.style.Fill({
                                    color: '#ffffff'
                                }),
                                offsetY: 1
                            })
                        }));
                    } else if (cacheType === 'Wherigo') {
                        // Symbole de triangle pour les Wherigo
                        specialStyles.push(new ol.style.Style({
                            text: new ol.style.Text({
                                text: '▲',
                                font: '10px sans-serif',
                                fill: new ol.style.Fill({
                                    color: '#ffffff'
                                }),
                                offsetY: 1
                            })
                        }));
                    }
                    
                    // Combinaison des styles
                    let styles = [baseStyle, ...specialStyles];
                    
                    // Si c'est une coordonnée corrigée, ajouter un symbole supplémentaire
                    if (isCorrected) {
                        styles.push(new ol.style.Style({
                            image: new ol.style.RegularShape({
                                points: 4, // Carré
                                radius: 9,
                                stroke: new ol.style.Stroke({
                                    color: 'rgba(0, 128, 0, 0.8)', // Vert pour les coordonnées corrigées
                                    width: 2
                                }),
                                fill: null
                            })
                        }));
                    }
                    
                    return styles;
                };
                
                // Appliquer le nouveau style
                feature.setStyle(styleFunction);
                
                // Forcer le rafraîchissement de la couche vectorielle
                this.vectorSource.changed();
                
                console.log("Marqueur mis à jour avec succès:", geocache.gc_code, isCorrected ? "(Corrigé)" : "");
            } catch (error) {
                console.error("Erreur lors de la mise à jour du marqueur:", error);
            }
        }

        // Simplifier la méthode de chargement des géocaches du MultiSolver
        async loadMultiSolverGeocaches(multiSolverId) {
            console.log("Chargement des geocaches pour le Multi Solver ID:", multiSolverId);
            
            if (!this.map) {
                console.error("La carte n'est pas initialisée");
                return;
            }
            
            // Mémoriser l'ID pour les événements futurs
            this.multiSolverIdValue = multiSolverId;
            this.isMultiSolverValue = true;
            
            // Effacer les marqueurs existants
            this.clearMarkers();
            
            // Récupérer le mode d'affichage des coordonnées actuel 
            const coordsMode = this.coordsDisplayMode || 'corrected';
            console.log("Mode d'affichage des coordonnées pour le chargement:", coordsMode);
            
            // Essayer de récupérer immédiatement les données depuis sessionStorage
            try {
                const storedGeocaches = sessionStorage.getItem('multiSolverGeocaches');
                if (storedGeocaches) {
                    let parsedGeocaches;
                    try {
                        parsedGeocaches = JSON.parse(storedGeocaches);
                        console.log("Récupération initiale des données depuis sessionStorage:", 
                                   Array.isArray(parsedGeocaches) ? parsedGeocaches.length : "Non-tableau");
                    } catch (parseError) {
                        console.error("Erreur de parsing JSON:", parseError);
                        parsedGeocaches = null;
                    }
                    
                    let pointsAdded = 0;
                    
                    // Vérifier que les données sont valides avant de procéder
                    if (Array.isArray(parsedGeocaches) && parsedGeocaches.length > 0) {
                        // Préparer les coordonnées des géocaches pour s'assurer que location_corrected est traité
                        const preparedGeocaches = parsedGeocaches.map(gc => this.prepareGeocacheCoordinates(gc));
                        
                        // Examiner un échantillon pour le débogage
                        if (preparedGeocaches.length > 0) {
                            console.log("Exemple d'élément préparé:", preparedGeocaches[0]);
                            // Vérifier la présence des coordonnées corrigées après préparation
                            const sample = preparedGeocaches[0];
                            
                            // Vérifier les différentes formes de coordonnées corrigées
                            console.log("corrected_coordinates présent après préparation:", 
                                sample.corrected_coordinates !== undefined);
                            console.log("latitude_corrected présent après préparation:", 
                                sample.latitude_corrected !== undefined);
                        }
                        
                        // Ajouter les points depuis sessionStorage selon le mode sélectionné
                        preparedGeocaches.forEach(geocache => {
                            if (this.addGeocacheBasedOnCoordinateMode(geocache, coordsMode)) {
                                pointsAdded++;
                            }
                        });
                        
                        console.log(`${pointsAdded} points ajoutés à la carte depuis sessionStorage lors du chargement initial`);
                        
                        if (pointsAdded > 0) {
                            setTimeout(() => {
                                this.fitMapToMarkers();
                            }, 100);
                        } else {
                            console.warn("Aucun point ajouté malgré des données disponibles. Mode:", coordsMode);
                            
                            // Examiner un échantillon de données pour le débogage
                            if (preparedGeocaches.length > 0) {
                                const sample = preparedGeocaches[0];
                                console.log("Échantillon de données:", sample);
                                
                                // Détection des coordonnées
                                const hasCorrectedCoords = (
                                    (sample.corrected_coordinates && 
                                     sample.corrected_coordinates.latitude && 
                                     sample.corrected_coordinates.longitude) ||
                                    (sample.latitude_corrected !== undefined && 
                                     sample.longitude_corrected !== undefined)
                                );
                                
                                const hasOriginalCoords = (
                                    (sample.latitude !== undefined && sample.longitude !== undefined) ||
                                    (sample.coordinates && 
                                     ((sample.coordinates.latitude !== undefined && sample.coordinates.longitude !== undefined) ||
                                     (sample.coordinates.lat !== undefined && sample.coordinates.lon !== undefined)))
                                );
                                
                                console.log("A des coords corrigées après détection:", hasCorrectedCoords);
                                console.log("A des coords originales après détection:", hasOriginalCoords);
                            }
                        }
                    } else {
                        console.warn("Les données récupérées depuis sessionStorage ne sont pas un tableau valide ou sont vides");
                    }
                } else {
                    console.log("Pas de données dans sessionStorage pour ce Multi Solver");
                }
            } catch (error) {
                console.error("Erreur lors de la récupération initiale des données depuis sessionStorage:", error);
            }
            
            // L'API bulk_coordinates sera appelée par le template multi_solver.html
            // Nous n'avons rien d'autre à faire ici, les données arriveront via 
            // l'événement multiSolverDataUpdated que nous écoutons déjà
            console.log("En attente des données du Multi Solver via l'événement multiSolverDataUpdated");
        }

        // Nouvelle méthode pour gérer le changement de mode d'affichage des coordonnées
        changeCoordinatesMode(mode) {
            console.log("Changement du mode d'affichage des coordonnées:", mode);
            this.coordsDisplayMode = mode;
            
            // S'assurer que le sélecteur est mis à jour également
            if (this.coordsSelect && this.coordsSelect.value !== mode) {
                this.coordsSelect.value = mode;
            }
            
            // Recharger les données en fonction du contexte
            if (this.geocacheIdValue) {
                this.loadGeocacheCoordinates();
            } else if (this.isMultiSolverValue && this.multiSolverIdValue) {
                // Pour le MultiSolver, nous avons deux options:
                // 1. Si nous avons déjà des données dans le vectorSource, nous pouvons simplement les retraiter
                if (this.vectorSource && this.vectorSource.getFeatures().length > 0) {
                    // Récupérer les données depuis sessionStorage
                    try {
                        const storedGeocaches = sessionStorage.getItem('multiSolverGeocaches');
                        if (storedGeocaches) {
                            const parsedGeocaches = JSON.parse(storedGeocaches);
                            
                            // Préparer les géocaches (normaliser les coordonnées)
                            const preparedGeocaches = parsedGeocaches.map(gc => this.prepareGeocacheCoordinates(gc));
                            
                            // Effacer les marqueurs existants
                            this.clearMarkers();
                            
                            // Ajouter les nouveaux marqueurs selon le mode sélectionné
                            let pointsAdded = 0;
                            preparedGeocaches.forEach(geocache => {
                                if (this.addGeocacheBasedOnCoordinateMode(geocache, mode)) {
                                    pointsAdded++;
                                }
                            });
                            console.log(`${pointsAdded} points ajoutés à la carte après changement de mode`);
                            
                            // Ajuster la vue
                            if (pointsAdded > 0) {
                                setTimeout(() => {
                                    this.fitMapToMarkers();
                                }, 100);
                            }
                        } else {
                            console.log("Aucune donnée en cache pour le MultiSolver, rechargement complet");
                            this.loadMultiSolverGeocaches(this.multiSolverIdValue);
                        }
                    } catch (error) {
                        console.error("Erreur lors du retraitement des données:", error);
                        // En cas d'erreur, recharger complètement
                        this.loadMultiSolverGeocaches(this.multiSolverIdValue);
                    }
                } else {
                    // 2. Sinon, recharger complètement
                    this.loadMultiSolverGeocaches(this.multiSolverIdValue);
                }
            } else if (this.zoneIdValue) {
                this.loadZoneGeocaches();
            }
        }
    }

    // Enregistrer le contrôleur sous le nom 'zone-map'
    try {
        window.StimulusApp.register('zone-map', EnhancedZoneMapController);
        console.log('=== DEBUG: Enhanced Zone Map Controller enregistré ===');
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement du contrôleur:', error);
    }
})(); 