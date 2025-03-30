// Enhanced Zone Map Controller avec support Multi Solver
console.log("=== DEBUG: Preparing Enhanced Zone Map Controller ===");

(() => {
    // S'assurer que Stimulus est disponible globalement
    if (!window.Stimulus) {
        console.error("Stimulus n'est pas disponible globalement");
        return;
    }
    
    class EnhancedZoneMapController extends Stimulus.Controller {
        // Définir les cibles et valeurs pour correspondre aux attributs dans le HTML
        // qui utilise le format data-zone-map-target="..." et data-zone-map-*-value="..."
        static targets = ["container", "popup", "popupContent"]
        static values = {
            zoneId: String,
            geocacheId: String,
            geocacheCode: String,  // Ajouté pour correspondre à data-zone-map-geocache-code-value
            isMultiSolver: Boolean,
            multiSolverId: String
        }

        connect() {
            console.log('=== DEBUG: Enhanced Zone Map Controller connecté ===');
            console.log('Container:', this.hasContainerTarget ? 'présent' : 'manquant');
            console.log('Zone ID:', this.zoneIdValue || 'non défini');
            console.log('Geocache ID:', this.geocacheIdValue || 'non défini');
            console.log('Geocache Code:', this.geocacheCodeValue || 'non défini');  // Nouvelle valeur ajoutée
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
                // Recherche additionnelle pour le débogage
                console.log("Recherche d'alternatives...");
                const potentialContainers = document.querySelectorAll('[data-zone-map-target="container"]');
                if (potentialContainers.length > 0) {
                    console.log(`Trouvé ${potentialContainers.length} conteneurs potentiels avec l'attribut data-zone-map-target="container"`);
                    console.log("HTML du premier conteneur trouvé:", potentialContainers[0].outerHTML);
                    
                    // Tenter d'utiliser directement ce conteneur
                    try {
                        console.log("Tentative d'utilisation directe du conteneur trouvé");
                        this.containerTarget = potentialContainers[0];
                        this.initializeMap();
                        this.initializeContextMenu();
                        
                        if (this.isMultiSolverValue) {
                            console.log("Ajout de l'écouteur d'événements multiSolverDataUpdated (mode de secours)");
                            window.addEventListener('multiSolverDataUpdated', this.handleMultiSolverUpdate.bind(this));
                        }
                    } catch (error) {
                        console.error("Erreur lors de la tentative d'utilisation directe:", error);
                    }
                } else {
                    console.log("Aucun conteneur trouvé avec data-zone-map-target='container'");
                    
                    // Vérifier si le contrôleur est correctement attaché à un élément
                    const controllers = document.querySelectorAll('[data-controller="zone-map"]');
                    console.log(`Trouvé ${controllers.length} éléments avec data-controller="zone-map"`);
                    if (controllers.length > 0) {
                        console.log("HTML du premier élément contrôleur trouvé:", controllers[0].outerHTML);
                        
                        // Rechercher le conteneur à l'intérieur de l'élément contrôleur
                        const nestedContainers = controllers[0].querySelectorAll('.map-container');
                        if (nestedContainers.length > 0) {
                            console.log(`Trouvé ${nestedContainers.length} conteneurs .map-container imbriqués`);
                            try {
                                console.log("Tentative d'utilisation du conteneur imbriqué");
                                this.containerTarget = nestedContainers[0];
                                this.initializeMap();
                                this.initializeContextMenu();
                                
                                if (this.isMultiSolverValue) {
                                    window.addEventListener('multiSolverDataUpdated', this.handleMultiSolverUpdate.bind(this));
                                }
                            } catch (error) {
                                console.error("Erreur lors de la tentative d'utilisation du conteneur imbriqué:", error);
                            }
                        }
                    }
                }
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
                // Extraire l'ID numérique original (sans le suffixe _corrected)
                let geocacheId = geocache.id;
                if (typeof geocacheId === 'string' && geocacheId.endsWith('_corrected')) {
                    geocacheId = geocacheId.replace('_corrected', '');
                    console.log("ID corrigé détecté, utilisation de l'ID original:", geocacheId);
                }
                
                // Ouvrir les détails dans un nouvel onglet
                if (window.mainLayout) {
                    window.mainLayout.root.contentItems[0].addChild({
                        type: 'component',
                        componentName: 'geocache-details',
                        title: `${geocache.gc_code} - ${geocache.name}`,
                        componentState: { 
                            geocacheId: geocacheId,
                            gcCode: geocache.gc_code,
                            name: geocache.name
                        }
                    });
                    
                    console.log("Ouverture de la géocache:", geocache.gc_code);
                } else {
                    console.error("GoldenLayout n'est pas disponible");
                    
                    // Alternative: ouvrir les détails via HTMX si disponible
                    if (window.htmx) {
                        window.htmx.ajax('GET', `/geocaches/${geocacheId}`, {
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
                    
                    // Assurons-nous que le type de cache est préservé 
                    geocacheWithCorrectedCoords.cache_type = geocache.cache_type || 'Traditional';
                    
                    // Vérifier si le type est correctement défini
                    if (!geocache.cache_type) {
                        console.warn(`Type de cache non défini pour ${geocache.gc_code || geocache.id}. Utilisation du type par défaut.`);
                    }
                    
                    // Journaliser pour débogage
                    console.log(`Ajout de point corrigé pour ${geocache.gc_code || geocache.id}, type: ${geocacheWithCorrectedCoords.cache_type}`);
                    
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
                    
                    // Assurons-nous que le type de cache est préservé
                    geocacheWithCorrectedCoords.cache_type = geocache.cache_type || 'Traditional';
                    
                    // Vérifier si le type est correctement défini
                    if (!geocache.cache_type) {
                        console.warn(`Type de cache non défini pour ${geocache.gc_code || geocache.id}. Utilisation du type par défaut.`);
                    }
                    
                    // Journaliser pour débogage
                    console.log(`Ajout de point corrigé pour ${geocache.gc_code || geocache.id}, type: ${geocacheWithCorrectedCoords.cache_type}`);
                    
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
                
                // Si c'est une coordonnée corrigée et que le cache_type n'est pas défini, 
                // tenter de le récupérer depuis l'ID original
                let cacheType = geocache.cache_type;
                
                if (isCorrected && (!cacheType || cacheType === 'undefined')) {
                    console.log(`Point corrigé sans type de cache défini: ${geocache.id}`);
                    
                    // Essayer de trouver le point original correspondant dans les sources de données
                    let originalId = geocache.id;
                    if (typeof originalId === 'string' && originalId.endsWith('_corrected')) {
                        originalId = originalId.replace('_corrected', '');
                        
                        // Chercher dans les features existantes
                        const existingFeatures = this.vectorSource.getFeatures();
                        const originalFeature = existingFeatures.find(f => f.get('id') === originalId);
                        
                        if (originalFeature) {
                            const originalGeocache = originalFeature.get('geocache');
                            if (originalGeocache && originalGeocache.cache_type) {
                                cacheType = originalGeocache.cache_type;
                                console.log(`Type de cache récupéré depuis la feature originale: ${cacheType}`);
                            }
                        }
                        
                        // Si toujours pas trouvé, chercher dans sessionStorage
                        if (!cacheType || cacheType === 'undefined') {
                            try {
                                const storedGeocaches = JSON.parse(sessionStorage.getItem('multiSolverGeocaches') || '[]');
                                const originalGeocache = storedGeocaches.find(g => g.id == originalId);
                                if (originalGeocache && originalGeocache.cache_type) {
                                    cacheType = originalGeocache.cache_type;
                                    console.log(`Type de cache récupéré depuis sessionStorage: ${cacheType}`);
                                }
                            } catch (e) {
                                console.error("Erreur lors de la récupération des données depuis sessionStorage:", e);
                            }
                        }
                    } else if (typeof originalId !== 'string') {
                        // Si l'ID n'est pas une chaîne, on peut essayer de le convertir et vérifier
                        const stringId = String(originalId);
                        if (stringId.endsWith('_corrected')) {
                            const baseId = stringId.replace('_corrected', '');
                            
                            // Chercher dans les features existantes
                            const existingFeatures = this.vectorSource.getFeatures();
                            const originalFeature = existingFeatures.find(f => f.get('id') == baseId);
                            
                            if (originalFeature) {
                                const originalGeocache = originalFeature.get('geocache');
                                if (originalGeocache && originalGeocache.cache_type) {
                                    cacheType = originalGeocache.cache_type;
                                    console.log(`Type de cache récupéré depuis la feature originale: ${cacheType}`);
                                }
                            }
                        }
                    }
                }
                
                // Définir un type par défaut si toujours pas trouvé
                if (!cacheType || cacheType === 'undefined') {
                    cacheType = 'Traditional';
                    console.log(`Type de cache non trouvé, utilisation de la valeur par défaut: ${cacheType}`);
                }
                
                // S'assurer que geocache.cache_type est correctement défini pour les fonctions de style
                geocache.cache_type = cacheType;
                
                // Journaliser pour débogage
                console.log(`Création marqueur pour ${geocache.gc_code || geocache.id}:`, {
                    isCorrected,
                    cacheType,
                    latitude,
                    longitude
                });
                
                // Créer un style personnalisé pour les coordonnées corrigées
                const styleFunction = (feature) => {
                    // S'assurer que cache_type est défini correctement
                    const cacheType = geocache.cache_type || 'Traditional';
                    console.log(`Définition du style pour ${geocache.gc_code || geocache.id}, type: ${cacheType}, corrigé: ${isCorrected}`);
                    
                    // Définir les couleurs selon les standards de géocaching.com
                    let cacheColor;
                    
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
                
                // S'assurer que la propriété isCorrected est correctement définie après la création
                if (isCorrected) {
                    feature.set('isCorrected', true);
                    console.log(`Marqueur explicitement défini comme corrigé: ${geocache.gc_code || geocache.id}`);
                }
                
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
            
            // Fonction utilitaire pour convertir une valeur en nombre si possible
            const toNumber = (value) => {
                if (typeof value === 'number') return value;
                if (typeof value === 'string') {
                    // Essayer d'extraire des nombres à partir des formats DMS
                    if (value.includes('°')) {
                        // Latitude: N 49° 44.746'
                        const matchLat = value.match(/([NS])\s*(\d+)°\s*(\d+[\.,]\d+)\'?/);
                        if (matchLat) {
                            const hemisphere = matchLat[1];
                            const degrees = parseFloat(matchLat[2]);
                            // Remplacer la virgule par un point si nécessaire
                            const minutes = parseFloat(matchLat[3].replace(',', '.'));
                            
                            // Convertir en degrés décimaux
                            let decimalDegrees = degrees + (minutes / 60);
                            
                            // Ajuster le signe selon l'hémisphère
                            if (hemisphere === 'S') {
                                decimalDegrees = -decimalDegrees;
                            }
                            
                            console.log(`Conversion de coordonnée latitude: ${value} -> ${decimalDegrees}`);
                            return decimalDegrees;
                        }
                        
                        // Longitude: E 5° 57.083'
                        const matchLon = value.match(/([EW])\s*(\d+)°\s*(\d+[\.,]\d+)\'?/);
                        if (matchLon) {
                            const hemisphere = matchLon[1];
                            const degrees = parseFloat(matchLon[2]);
                            // Remplacer la virgule par un point si nécessaire
                            const minutes = parseFloat(matchLon[3].replace(',', '.'));
                            
                            // Convertir en degrés décimaux
                            let decimalDegrees = degrees + (minutes / 60);
                            
                            // Ajuster le signe selon l'hémisphère
                            if (hemisphere === 'W') {
                                decimalDegrees = -decimalDegrees;
                            }
                            
                            console.log(`Conversion de coordonnée longitude: ${value} -> ${decimalDegrees}`);
                            return decimalDegrees;
                        }
                    }
                    
                    // Essayer de convertir directement en nombre
                    const numericValue = parseFloat(value);
                    if (!isNaN(numericValue)) {
                        return numericValue;
                    }
                }
                return null;
            };
            
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
            
            // Convertir les coordonnées originales en nombres si ce sont des chaînes
            if (prepared.latitude !== undefined && prepared.longitude !== undefined) {
                if (typeof prepared.latitude !== 'number' || typeof prepared.longitude !== 'number') {
                    const numLat = toNumber(prepared.latitude);
                    const numLon = toNumber(prepared.longitude);
                    
                    if (numLat !== null && numLon !== null) {
                        prepared.latitude = numLat;
                        prepared.longitude = numLon;
                        console.log(`Coordonnées originales converties en nombres pour ${prepared.gc_code}:`, { lat: numLat, lon: numLon });
                    }
                }
            }
            
            // 2. Traiter les coordonnées dans l'objet coordinates (Multi Solver)
            if (prepared.coordinates) {
                // Convertir les coordonnées de l'objet coordinates en nombres
                if (prepared.coordinates.latitude !== undefined && prepared.coordinates.longitude !== undefined) {
                    const numLat = toNumber(prepared.coordinates.latitude);
                    const numLon = toNumber(prepared.coordinates.longitude);
                    
                    if (numLat !== null && numLon !== null) {
                        prepared.coordinates.latitude = numLat;
                        prepared.coordinates.longitude = numLon;
                        
                        // S'assurer que les coordonnées principales sont également définies
                        if (prepared.latitude === undefined || prepared.longitude === undefined) {
                            prepared.latitude = numLat;
                            prepared.longitude = numLon;
                        }
                        
                        console.log(`Coordonnées (dans l'objet coordinates) converties en nombres pour ${prepared.gc_code}:`, { lat: numLat, lon: numLon });
                    }
                }
            }
            
            // 3. Traiter les coordonnées corrigées
            // Vérifier d'abord si les propriétés latitude_corrected et longitude_corrected existent
            if (prepared.latitude_corrected !== undefined && prepared.longitude_corrected !== undefined) {
                // Convertir en nombres si ce sont des chaînes
                const numLat = toNumber(prepared.latitude_corrected);
                const numLon = toNumber(prepared.longitude_corrected);
                
                if (numLat !== null && numLon !== null) {
                    prepared.latitude_corrected = numLat;
                    prepared.longitude_corrected = numLon;
                    
                // Créer l'objet corrected_coordinates pour compatibilité
                prepared.corrected_coordinates = {
                        latitude: numLat,
                        longitude: numLon
                };
                    
                    console.log(`Coordonnées corrigées converties en nombres pour ${prepared.gc_code}:`, { lat: numLat, lon: numLon });
                }
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
                // Convertir en nombres si ce sont des chaînes
                const numLat = toNumber(prepared.corrected_coordinates.latitude);
                const numLon = toNumber(prepared.corrected_coordinates.longitude);
                
                if (numLat !== null && numLon !== null) {
                    // Mettre à jour les valeurs converties en nombres
                    prepared.corrected_coordinates.latitude = numLat;
                    prepared.corrected_coordinates.longitude = numLon;
                    
                // Synchroniser avec latitude_corrected et longitude_corrected pour cohérence
                    prepared.latitude_corrected = numLat;
                    prepared.longitude_corrected = numLon;
                    
                    console.log(`Objet corrected_coordinates converti en nombres pour ${prepared.gc_code}:`, { lat: numLat, lon: numLon });
                }
            }
            
            // 4. Si la géocache est sauvegardée (saved=true), s'assurer que les coordonnées sont marquées comme corrigées
            if (prepared.saved === true) {
                prepared.isCorrected = true;
                console.log(`Géocache ${prepared.gc_code} marquée comme corrigée car saved=true`);
                
                // Si coordinates existe mais pas corrected_coordinates, utiliser coordinates comme coordonnées corrigées
                if (prepared.coordinates && 
                    prepared.coordinates.latitude !== undefined && 
                    prepared.coordinates.longitude !== undefined && 
                    (!prepared.corrected_coordinates || 
                     prepared.corrected_coordinates.latitude === undefined || 
                     prepared.corrected_coordinates.longitude === undefined)) {
                    
                    prepared.corrected_coordinates = {
                        latitude: prepared.coordinates.latitude,
                        longitude: prepared.coordinates.longitude
                    };
                    
                    prepared.latitude_corrected = prepared.coordinates.latitude;
                    prepared.longitude_corrected = prepared.coordinates.longitude;
                    
                    console.log(`Création de corrected_coordinates à partir de coordinates pour ${prepared.gc_code}:`, prepared.corrected_coordinates);
                }
            }
            
            return prepared;
        }

        // Fonction intermédiaire pour vérifier le contenu de l'événement MultiSolver
        logEventDetail(event) {
            if (event && event.detail && event.detail.data) {
                // Examiner le premier objet des données pour comprendre sa structure
                if (Array.isArray(event.detail.data) && event.detail.data.length > 0) {
                    const sample = event.detail.data[0];
                    console.log("Détail de l'événement MultiSolver - exemple de données:", {
                        id: sample.id,
                        gc_code: sample.gc_code,
                        cache_type: sample.cache_type,
                        corrected_coordinates: sample.corrected_coordinates,
                        coordinates: sample.coordinates
                    });
                }
            }
        }

        // Mettre à jour la méthode handleMultiSolverUpdate pour utiliser prepareGeocacheCoordinates
        handleMultiSolverUpdate(event) {
            console.log("Événement multiSolverDataUpdated reçu:", event.detail);
            
            if (!event.detail || !event.detail.multiSolverId) {
                console.error("Événement multiSolverDataUpdated invalide");
                return;
            }
            
            // Vérifier s'il s'agit d'une mise à jour après sauvegarde de coordonnées
            const isCoordsUpdateEvent = event.detail.coordsUpdated === true;
            if (isCoordsUpdateEvent) {
                console.log("Détection d'une mise à jour après sauvegarde de coordonnées");
                
                // Si l'ID de la géocache mise à jour est présent, l'ajouter au log
                if (event.detail.updatedGeocacheId) {
                    console.log(`ID de la géocache mise à jour: ${event.detail.updatedGeocacheId}`);
                }
            }
            
            // Vérifier si l'événement correspond à notre Multi Solver
            if (this.multiSolverIdValue === event.detail.multiSolverId) {
                // Vérifier si la carte est initialisée
                if (!this.map) {
                    console.error("La carte n'est pas initialisée, impossible de mettre à jour les marqueurs");
                    return;
                }
                
                // Examiner la structure des données de l'événement pour le débogage
                this.logEventDetail(event);
                
                // Récupérer le mode d'affichage des coordonnées
                const coordsMode = this.coordsDisplayMode || 'corrected';
                console.log("Mode d'affichage des coordonnées pour la mise à jour:", coordsMode);
                
                console.log("Mise à jour des données du Multi Solver:", 
                            event.detail.data && Array.isArray(event.detail.data) ? event.detail.data.length : 0, "géocaches");
                
                // IMPORTANT: Récupérer d'abord les types de cache actuels à partir des features existantes
                const currentFeatures = this.vectorSource.getFeatures();
                const existingCacheTypes = {};
                
                currentFeatures.forEach(feature => {
                    const id = feature.get('id');
                    const geocache = feature.get('geocache');
                    if (id && geocache && geocache.cache_type) {
                        // Stocker le type de cache pour l'ID normal et l'ID corrigé (sans le suffixe)
                        existingCacheTypes[id] = geocache.cache_type;
                        
                        // S'assurer que id est une chaîne de caractères avant d'utiliser endsWith
                        if (typeof id === 'string') {
                            // Si c'est un ID corrigé, stocker aussi pour l'ID de base
                            if (id.endsWith('_corrected')) {
                                const baseId = id.replace('_corrected', '');
                                existingCacheTypes[baseId] = geocache.cache_type;
                            } else {
                                // Si c'est un ID de base, stocker aussi pour l'ID corrigé potentiel
                                existingCacheTypes[id + '_corrected'] = geocache.cache_type;
                            }
                        } else {
                            // Pour les ID numériques, convertir en chaîne
                            const stringId = String(id);
                            existingCacheTypes[stringId + '_corrected'] = geocache.cache_type;
                        }
                    }
                });
                
                console.log("Types de cache existants:", existingCacheTypes);
                
                // IMPORTANT: Conserver les coordonnées au format original pour l'affichage
                // Créer une copie des données pour éviter de modifier l'original
                let preparedData = [];
                if (event.detail.data && Array.isArray(event.detail.data)) {
                    // Faire une copie profonde des données
                    preparedData = JSON.parse(JSON.stringify(event.detail.data));
                    
                    // IMPORTANT: Préserver les coordonnées originales pour l'affichage et les types de cache
                    preparedData.forEach(geocache => {
                        // 1. Conserver le format original des coordonnées pour l'affichage
                        if (geocache.coordinates) {
                            geocache.coordinates_display = JSON.parse(JSON.stringify(geocache.coordinates));
                        }
                        
                        // 2. IMPORTANT: Vérifier et restaurer le type de cache s'il est manquant
                        if (!geocache.cache_type || geocache.cache_type === 'undefined') {
                            // Chercher dans notre dictionnaire des types existants
                            if (existingCacheTypes[geocache.id]) {
                                geocache.cache_type = existingCacheTypes[geocache.id];
                                console.log(`Type de cache restauré pour ${geocache.gc_code}: ${geocache.cache_type}`);
                            }
                            // Sinon, chercher dans sessionStorage
                            else {
                                try {
                                    const storedGeocaches = JSON.parse(sessionStorage.getItem('multiSolverGeocaches') || '[]');
                                    const storedGeocache = storedGeocaches.find(g => g.id == geocache.id);
                                    if (storedGeocache && storedGeocache.cache_type) {
                                        geocache.cache_type = storedGeocache.cache_type;
                                        console.log(`Type de cache récupéré depuis sessionStorage pour ${geocache.gc_code}: ${geocache.cache_type}`);
                                    }
                                } catch (e) {
                                    console.error("Erreur lors de la récupération des données depuis sessionStorage:", e);
                                }
                            }
                        }
                        
                        console.log(`Préservation du type de cache: ${geocache.gc_code} - ${geocache.cache_type}`);
                    });
                    
                    // Appliquer la préparation des coordonnées pour la carte
                    preparedData = preparedData.map(gc => this.prepareGeocacheCoordinates(gc));
                }
                
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
                        
                        // Détecter les coordonnées sauvegardées qui ont été mises à jour
                        if (geocache.saved === true) {
                            console.log(`Géocache avec coordonnées sauvegardées: ${geocache.gc_code}, sera marquée comme corrigée`);
                            geocache.isCorrected = true;
                            
                            // Si nous avons un événement de mise à jour après sauvegarde
                            if (isCoordsUpdateEvent) {
                                console.log(`Mise à jour après sauvegarde pour ${geocache.gc_code}`);
                            }
                        }
                        
                        console.log(`Géocache ${geocache.gc_code} - Coords corrigées: ${hasCorrectedCoords}, Coords originales: ${hasOriginalCoords}, isCorrected: ${geocache.isCorrected}`);
                        
                        // 1. Mode "originales" uniquement
                        if (coordsMode === 'original') {
                            if (hasOriginalCoords) {
                                const existingFeature = currentIds.has(geocache.id) ? 
                                    currentFeatures.find(f => f.get('id') === geocache.id) : null;
                                
                                if (existingFeature) {
                                    // Assurer le type de cache est préservé
                                    const currentGeocache = existingFeature.get('geocache');
                                    if (currentGeocache && currentGeocache.cache_type && !geocache.cache_type) {
                                        geocache.cache_type = currentGeocache.cache_type;
                                    }
                                    
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
                                
                                // IMPORTANT: S'assurer que le type de cache est correctement préservé
                                console.log(`AVANT - Type de cache pour ${geocache.gc_code}: ${geocache.cache_type}`);
                                
                                // Vérifier d'abord dans la feature existante
                                if (existingCorrectedFeature) {
                                    const currentGeocache = existingCorrectedFeature.get('geocache');
                                    if (currentGeocache && currentGeocache.cache_type) {
                                        console.log(`Type de cache trouvé dans la feature existante: ${currentGeocache.cache_type}`);
                                        if (!geocache.cache_type || geocache.cache_type === 'undefined') {
                                            geocache.cache_type = currentGeocache.cache_type;
                                        }
                                    }
                                }
                                
                                // Ensuite, chercher dans la feature originale si nécessaire
                                if (!geocache.cache_type || geocache.cache_type === 'undefined') {
                                    const originalFeature = currentIds.has(geocache.id) ? 
                                        currentFeatures.find(f => f.get('id') === geocache.id) : null;
                                        
                                    if (originalFeature) {
                                        const originalGeocache = originalFeature.get('geocache');
                                        if (originalGeocache && originalGeocache.cache_type) {
                                            console.log(`Type de cache trouvé dans la feature originale: ${originalGeocache.cache_type}`);
                                            geocache.cache_type = originalGeocache.cache_type;
                                        }
                                    }
                                }
                                
                                // Enfin, chercher dans notre dictionnaire préparé plus tôt
                                if (!geocache.cache_type || geocache.cache_type === 'undefined') {
                                    if (existingCacheTypes[geocache.id]) {
                                        console.log(`Type de cache trouvé dans le dictionnaire: ${existingCacheTypes[geocache.id]}`);
                                        geocache.cache_type = existingCacheTypes[geocache.id];
                                    }
                                }
                                
                                // Créer une copie avec les coordonnées corrigées
                                const geocacheWithCorrectedCoords = {
                                    ...geocache,
                                    id: correctedId,
                                    isCorrected: true
                                };
                                
                                // S'assurer que les coordonnées corrigées sont utilisées
                                if (geocache.corrected_coordinates) {
                                    geocacheWithCorrectedCoords.latitude = geocache.corrected_coordinates.latitude;
                                    geocacheWithCorrectedCoords.longitude = geocache.corrected_coordinates.longitude;
                                } else if (geocache.latitude_corrected !== undefined) {
                                    geocacheWithCorrectedCoords.latitude = geocache.latitude_corrected;
                                    geocacheWithCorrectedCoords.longitude = geocache.longitude_corrected;
                                }
                                
                                console.log(`APRÈS - Type de cache utilisé pour ${geocache.gc_code}: ${geocacheWithCorrectedCoords.cache_type}`);
                                
                                // Log explicite pour confirmer que le type de cache est préservé
                                console.log(`MultiSolver: Type de cache préservé pour ${geocache.gc_code || geocache.id} - ${geocacheWithCorrectedCoords.cache_type}`);
                                
                                if (existingCorrectedFeature) {
                                    // Définir explicitement la propriété isCorrected du feature existant
                                    existingCorrectedFeature.set('isCorrected', true);
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
                            // [Code non modifié pour ce mode]
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
                let latitude = null, longitude = null;
                let coordsChanged = false;
                
                // Déterminer si c'est une coordonnée corrigée
                let isCorrected = geocache.isCorrected === true;
                
                // Vérifier l'ID si isCorrected n'est pas défini explicitement
                if (!isCorrected && geocache.id && typeof geocache.id === 'string' && geocache.id.endsWith('_corrected')) {
                    console.log(`Détection de coordonnée corrigée basée sur l'ID: ${geocache.id}`);
                    isCorrected = true;
                }
                
                // Vérifier la propriété du feature si toujours pas détecté
                if (!isCorrected && feature.get('isCorrected') === true) {
                    console.log(`Détection de coordonnée corrigée basée sur le feature: ${feature.get('id')}`);
                    isCorrected = true;
                }
                
                // Vérifier également si saved est vrai, ce qui indique aussi que c'est une coordonnée corrigée
                if (!isCorrected && geocache.saved === true) {
                    console.log(`Détection de coordonnée corrigée basée sur saved=true: ${geocache.gc_code}`);
                    isCorrected = true;
                }
                
                console.log(`État isCorrected pour ${geocache.gc_code}: ${isCorrected}`);
                
                // IMPORTANT: Récupérer l'objet geocache actuel pour préserver des informations
                const currentGeocache = feature.get('geocache') || {};
                
                // Mettre à jour la propriété isCorrected sur le feature
                feature.set('isCorrected', isCorrected);
                
                // Fonction utilitaire pour convertir une valeur en nombre si possible
                const toNumber = (value) => {
                    if (typeof value === 'number') return value;
                    if (typeof value === 'string') {
                        const num = parseFloat(value);
                        if (!isNaN(num)) return num;
                    }
                    return null;
                };
                
                // Extraire les coordonnées en privilégiant les coordonnées numériques
                if (isCorrected) {
                    // Version 1: latitude/longitude_corrected (format numérique direct)
                    if (typeof geocache.latitude_corrected === 'number' && typeof geocache.longitude_corrected === 'number') {
                        latitude = geocache.latitude_corrected;
                        longitude = geocache.longitude_corrected;
                        console.log("Utilisation des coordonnées numériques latitude_corrected:", latitude, longitude);
                    }
                    // Version 2: coordinates.latitude/longitude (format numérique direct du multi-solver)
                    else if (geocache.coordinates && 
                             typeof geocache.coordinates.latitude === 'number' && 
                             typeof geocache.coordinates.longitude === 'number') {
                        latitude = geocache.coordinates.latitude;
                        longitude = geocache.coordinates.longitude;
                        console.log("Utilisation des coordonnées numériques coordinates:", latitude, longitude);
                    }
                    // Version 3: latitude/longitude directs (si marqué comme corrigé)
                    else if (typeof geocache.latitude === 'number' && typeof geocache.longitude === 'number') {
                        latitude = geocache.latitude;
                        longitude = geocache.longitude;
                        console.log("Utilisation des coordonnées numériques directes:", latitude, longitude);
                    }
                    // Version 4: essayer de convertir les valeurs textuelles en nombre
                    else if (geocache.coordinates) {
                        const lat = toNumber(geocache.coordinates.latitude);
                        const lon = toNumber(geocache.coordinates.longitude);
                        if (lat !== null && lon !== null) {
                                latitude = lat;
                                longitude = lon;
                            console.log("Coordonnées converties en nombres:", latitude, longitude);
                        }
                    }
                } else {
                    // Coordonnées originales: essayer d'abord en format numérique direct
                    if (typeof geocache.latitude === 'number' && typeof geocache.longitude === 'number') {
                        latitude = geocache.latitude;
                        longitude = geocache.longitude;
                        console.log("Utilisation des coordonnées originales numériques:", latitude, longitude);
                    }
                    // Sinon essayer les coordonnées dans l'objet coordinates
                    else if (geocache.coordinates && 
                             typeof geocache.coordinates.latitude === 'number' && 
                             typeof geocache.coordinates.longitude === 'number') {
                            latitude = geocache.coordinates.latitude;
                            longitude = geocache.coordinates.longitude;
                        console.log("Utilisation des coordonnées numériques dans coordinates:", latitude, longitude);
                    }
                    // Ou dans l'objet lat/lon
                    else if (geocache.coordinates && 
                             typeof geocache.coordinates.lat === 'number' && 
                             typeof geocache.coordinates.lon === 'number') {
                        latitude = geocache.coordinates.lat;
                        longitude = geocache.coordinates.lon;
                        console.log("Utilisation des coordonnées numériques lat/lon:", latitude, longitude);
                    }
                    // Essayer de convertir en nombres
                    else if (geocache.coordinates) {
                        const lat = toNumber(geocache.coordinates.latitude);
                        const lon = toNumber(geocache.coordinates.longitude);
                        if (lat !== null && lon !== null) {
                            latitude = lat;
                            longitude = lon;
                            console.log("Coordonnées converties en nombres:", latitude, longitude);
                        }
                    }
                }
                
                // Dernière tentative: récupérer les coordonnées à partir de l'API
                if (latitude === null || longitude === null) {
                    console.warn(`Coordonnées non trouvées pour ${geocache.gc_code}, on garde les coordonnées actuelles`);
                    
                    // Si le feature a déjà une géométrie, on garde ses coordonnées actuelles
                    const geometry = feature.getGeometry();
                    if (geometry) {
                        const coords = geometry.getCoordinates();
                        const [lon, lat] = ol.proj.transform(coords, 'EPSG:3857', 'EPSG:4326');
                                    latitude = lat;
                                    longitude = lon;
                        console.log("Utilisation des coordonnées actuelles du feature:", latitude, longitude);
                    }
                }
                
                // Si toujours pas de coordonnées, impossible de continuer
                if (latitude === null || longitude === null || !isFinite(latitude) || !isFinite(longitude)) {
                    console.error(`Impossible de trouver des coordonnées valides pour ${geocache.gc_code}`);
                    return false;
                }
                
                // Vérifier si les coordonnées ont changé
                const geometry = feature.getGeometry();
                const currentCoords = geometry ? geometry.getCoordinates() : null;
                
                if (currentCoords) {
                    const [currentLon, currentLat] = ol.proj.transform(currentCoords, 'EPSG:3857', 'EPSG:4326');
                    coordsChanged = Math.abs(currentLat - latitude) > 0.00001 || Math.abs(currentLon - longitude) > 0.00001;
                    
                    console.log("Comparaison des coordonnées:");
                    console.log("  Actuelles:", currentLat, currentLon);
                    console.log("  Nouvelles:", latitude, longitude);
                    console.log("  Changement détecté:", coordsChanged);
                } else {
                    coordsChanged = true;
                }
                
                // Log explicite des valeurs clés avant de mettre à jour le feature
                console.log(`Informations du feature avant mise à jour - ID: ${feature.get('id')}, Type: ${currentGeocache.cache_type || 'inconnu'}, isCorrected: ${feature.get('isCorrected')}`);
                
                // IMPORTANT: s'assurer que le type de cache est préservé
                if (!geocache.cache_type && currentGeocache.cache_type) {
                    console.log(`Conservation du type de cache: ${currentGeocache.cache_type}`);
                    geocache.cache_type = currentGeocache.cache_type;
                }
                
                // IMPORTANT: Préserver le format des coordonnées original pour l'affichage si disponible
                let coordsDisplay = "";
                
                // Utiliser les coordonnées textuelles originales pour l'affichage si disponibles
                if (geocache.coordinates_display) {
                    if (typeof geocache.coordinates_display === 'object') {
                        if (geocache.coordinates_display.ddm) {
                            coordsDisplay = geocache.coordinates_display.ddm;
                        } else if (geocache.coordinates_display.ddm_lat && geocache.coordinates_display.ddm_lon) {
                            coordsDisplay = `${geocache.coordinates_display.ddm_lat} ${geocache.coordinates_display.ddm_lon}`;
                        }
                    }
                }
                
                // Si pas de format textuel, utiliser le format numérique
                if (!coordsDisplay) {
                    coordsDisplay = `Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`;
                }
                
                // Mettre à jour les propriétés du point
                feature.set('title', `${geocache.gc_code} - ${geocache.name || 'Sans nom'}${isCorrected ? ' (Corrigées)' : ''}`);
                feature.set('content', `${coordsDisplay}<br>` +
                                      `Type: ${geocache.cache_type || currentGeocache.cache_type || 'Non spécifié'}<br>` +
                                      `Difficulté: ${geocache.difficulty || currentGeocache.difficulty || '?'}, Terrain: ${geocache.terrain || currentGeocache.terrain || '?'}` +
                                      (isCorrected ? '<br><strong>Coordonnées corrigées</strong>' : ''));
                
                // Assurer que isCorrected est correctement défini dans l'objet geocache
                geocache.isCorrected = isCorrected;
                
                // Fusionner le geocache actuel avec les nouvelles informations pour préserver toutes les propriétés importantes
                const mergedGeocache = {
                    ...currentGeocache,
                    ...geocache,
                    isCorrected: isCorrected
                };
                
                // S'assurer que cache_type est préservé spécifiquement (priorité au type existant)
                if (currentGeocache.cache_type && !geocache.cache_type) {
                    mergedGeocache.cache_type = currentGeocache.cache_type;
                }
                
                // Mettre à jour l'objet geocache du feature
                feature.set('geocache', mergedGeocache);
                
                // IMPORTANT: Pour les coordonnées corrigées, TOUJOURS mettre à jour la géométrie
                // Ne pas tenir compte de coordsChanged pour les points corrigés pour forcer le déplacement
                if (isCorrected && isFinite(latitude) && isFinite(longitude)) {
                    console.log("FORCE: Mise à jour FORCÉE des coordonnées du point corrigé:", latitude, longitude);
                    
                    try {
                        // Mettre à jour la géométrie du point - FORCER pour les points corrigés
                        const newPoint = ol.proj.fromLonLat([longitude, latitude]);
                        console.log("Nouvelles coordonnées transformées (EPSG:3857):", newPoint);
                        feature.setGeometry(new ol.geom.Point(newPoint));
                        
                        // Détecter si les coordonnées ont été corrigées récemment
                        if (geocache.saved === true) {
                            console.log(`Détection de coordonnées sauvegardées pour ${geocache.gc_code}, marquage comme corrigées`);
                            isCorrected = true;
                            feature.set('isCorrected', true);
                        }
                    } catch (geometryError) {
                        console.error("Erreur lors de la mise à jour de la géométrie:", geometryError);
                    }
                }
                // Pour les points non corrigés, mettre à jour seulement si les coordonnées ont changé
                else if (coordsChanged && isFinite(latitude) && isFinite(longitude)) {
                    console.log("Mise à jour des coordonnées du point (non corrigé):", latitude, longitude);
                    
                    try {
                        const newPoint = ol.proj.fromLonLat([longitude, latitude]);
                        feature.setGeometry(new ol.geom.Point(newPoint));
                    } catch (geometryError) {
                        console.error("Erreur lors de la mise à jour de la géométrie:", geometryError);
                    }
                }
                
                // Forcer la mise à jour du style en fonction du statut corrigé
                const that = this;
                feature.setStyle(function(resolution) {
                    // Récupérer les propriétés du point
                    const properties = feature.getProperties();
                    if (!properties) return null;
                    
                    // Vérifier de multiples façons si c'est un point corrigé
                    const isPointCorrected = (
                        // Vérifier la propriété isCorrected explicite
                        properties.isCorrected === true || 
                        // Alternative: vérifier si l'ID se termine par _corrected
                        (properties.id && typeof properties.id === 'string' && properties.id.endsWith('_corrected')) ||
                        // Alternative: vérifier si saved est vrai
                        (properties.geocache && properties.geocache.saved === true)
                    );
                    
                    console.log(`Style mis à jour pour ${properties.geocache ? properties.geocache.gc_code : 'inconnu'} - isPointCorrected: ${isPointCorrected}`);
                    
                    // Utiliser le type de cache pour déterminer l'icône
                    const geocacheObj = properties.geocache || {};
                    const cacheType = geocacheObj.cache_type || 'Traditional';
                    
                    console.log(`Type de cache utilisé pour le style: ${cacheType}`);
                    
                    // Codes couleurs standards de Geocaching.com
                    const cacheColors = {
                        'Traditional': 'rgba(0, 175, 80, 0.8)',    // Vert
                        'Mystery': 'rgba(0, 60, 255, 0.8)',        // Bleu foncé
                        'Unknown': 'rgba(0, 60, 255, 0.8)',        // Bleu foncé (alias de Mystery)
                        'Multi-cache': 'rgba(255, 200, 0, 0.8)',   // Jaune/Orange
                        'Letterbox': 'rgba(0, 60, 255, 0.8)',      // Bleu foncé (comme Mystery)
                        'Letterbox Hybrid': 'rgba(0, 60, 255, 0.8)', // Bleu foncé (comme Mystery)
                        'Wherigo': 'rgba(0, 60, 255, 0.8)',        // Bleu foncé (comme Mystery)
                        'Event': 'rgba(235, 0, 130, 0.8)',         // Rose
                        'Virtual': 'rgba(120, 180, 215, 0.8)',      // Bleu pâle
                        'Earthcache': 'rgba(170, 100, 45, 0.8)',    // Marron
                        'Webcam': 'rgba(100, 100, 100, 0.8)'        // Gris
                    };
                    
                    // Utiliser la couleur spécifique au type de cache si disponible
                    let cacheColor;
                    if (cacheType in cacheColors) {
                        cacheColor = cacheColors[cacheType];
                } else {
                        // Couleur par défaut bleue pour les types non reconnus
                        cacheColor = 'rgba(51, 136, 255, 0.8)'; // Bleu
                    }
                    
                    // Créer le style de base
                    const baseStyle = new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: 6,
                            fill: new ol.style.Fill({
                                color: cacheColor
                            }),
                            stroke: new ol.style.Stroke({
                                color: '#ffffff',
                                width: isPointCorrected ? 2 : 1 // Contour plus épais pour les coordonnées corrigées
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
                    if (isPointCorrected) {
                        console.log(`Application du style 'corrigé' pour ${properties.geocache ? properties.geocache.gc_code : 'inconnu'}`);
                        
                        styles.push(
                            new ol.style.Style({
                                image: new ol.style.RegularShape({
                                    points: 4, // Carré
                                    radius: 10,
                                    angle: 0, // Pas de rotation pour avoir un carré droit
                                    stroke: new ol.style.Stroke({
                                        color: 'rgba(0, 128, 0, 0.8)', // Vert pour les coordonnées corrigées
                                        width: 2
                                    }),
                                    fill: new ol.style.Fill({
                                        color: 'rgba(0, 255, 0, 0.2)' // Carré vert semi-transparent
                                    })
                                })
                            })
                        );
                    }
                    
                    return styles;
                });
                
                console.log("Mise à jour du marqueur terminée pour:", geocache.gc_code);
                return true;
            } catch (error) {
                console.error("Erreur lors de la mise à jour du marqueur:", error, "pour", geocache.gc_code);
                return false;
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