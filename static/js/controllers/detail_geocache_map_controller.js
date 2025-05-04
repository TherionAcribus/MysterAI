// Detail Geocache Map Controller
(() => {
    // Assurer la disponibilité globale de Stimulus et OpenLayers
    if (!window.Stimulus || !window.ol) {
        console.error("Stimulus ou OpenLayers n'est pas disponible globalement");
        return;
    }

    // Définition du contrôleur global
    window.DetailGeocacheMapController = class extends Stimulus.Controller {
        static targets = ["container", "popup", "popupContent"]
        static values = {
            geocacheId: String,
            geocacheCode: String
        }

        connect() {
            console.log('Detail Geocache Map Controller connected');
            
            // Définir des propriétés pour suivre l'état
            this.isMapInitialized = false;
            this.geocacheId = this.geocacheIdValue;
            this.geocacheCode = this.geocacheCodeValue;
            
            // Initialiser le tableau pour stocker les IDs des points calculés
            this.calculatedPoints = [];
            
            this.initializeMap()
                .then(() => {
                    console.log('Map initialized successfully');
                    this.isMapInitialized = true;
                })
                .catch(error => {
                    console.error('Failed to initialize map:', error);
                });
            
            // Écouter l'événement pour ajouter un point calculé
            document.addEventListener('addCalculatedPointToMap', this.addCalculatedPointToMap.bind(this));
            
            // Écouter l'événement pour ajouter plusieurs points calculés
            document.addEventListener('addMultipleCalculatedPointsToMap', this.addMultipleCalculatedPointsToMap.bind(this));
            
            // Écouter l'événement pour effacer tous les points calculés
            document.addEventListener('clearCalculatedPoints', this.clearCalculatedPoints.bind(this));
            
            // Écouter l'événement de waypoint sauvegardé
            this.waypointSavedHandler = this.handleWaypointSaved.bind(this);
            document.addEventListener('waypointSaved', this.waypointSavedHandler);

            // === AJOUT : écouteur pour point calculé ===
            this.addCalculatedPointHandler = this.handleAddCalculatedPoint.bind(this);
            document.addEventListener('addCalculatedPointToMap', this.addCalculatedPointHandler);
            
            // === NOUVEL AJOUT : écouteur pour plusieurs points calculés ===
            this.addMultipleCalculatedPointsHandler = this.handleAddMultipleCalculatedPoints.bind(this);
            document.addEventListener('addMultipleCalculatedPointsToMap', this.addMultipleCalculatedPointsHandler);
            
            // === NOUVEL AJOUT : écouteur pour effacer les points calculés ===
            this.clearCalculatedPointsHandler = this.handleClearCalculatedPoints.bind(this);
            document.addEventListener('clearCalculatedPoints', this.clearCalculatedPointsHandler);
            
            // Écouter l'événement d'ajout de point calculé depuis d'autres composants
            window.addEventListener('addCalculatedPointToMap', this.handleAddCalculatedPoint.bind(this));
            
            // Écouter l'événement pour ouvrir le formulaire de waypoint avec des données
            window.addEventListener('openWaypointFormWithData', this.handleOpenWaypointFormWithData.bind(this));
        }

        disconnect() {
            console.log('%c[DetailMapCtrl] Contrôleur déconnecté', "color:teal");
            
            // Nettoyer l'intervalle de vérification du sélecteur
            if (this.selectorCheckInterval) {
                clearInterval(this.selectorCheckInterval);
                this.selectorCheckInterval = null;
            }
            
            // Supprimer le gestionnaire d'événements de redimensionnement
            if (this.resizeHandler) {
                window.removeEventListener('resize', this.resizeHandler);
                this.resizeHandler = null;
            }
            
            if (this.map) {
                this.map.setTarget(null);
                this.map = null;
            }
            
            // Nettoyer les écouteurs si nécessaire
            if (this.contextMenu) {
                document.body.removeChild(this.contextMenu);
                this.contextMenu = null;
            }
            
            // Nettoyer le sélecteur de fond de carte
            if (this.baseLayerSelector && this.baseLayerSelector.parentNode) {
                this.baseLayerSelector.parentNode.removeChild(this.baseLayerSelector);
                this.baseLayerSelector = null;
            }

            // Nettoyer les écouteurs d'événements lors de la déconnexion
            document.removeEventListener('waypointSaved', this.waypointSavedHandler);
            
            // Nettoyer l'écouteur d'événement pour le menu contextuel
            if (this.contextMenuClickHandler) {
                document.removeEventListener('click', this.contextMenuClickHandler);
            }
            
            // Supprimer le menu contextuel du DOM si nécessaire
            if (this.contextMenu && document.body.contains(this.contextMenu)) {
                document.body.removeChild(this.contextMenu);
            }
            
            // Remettre les autres propriétés à null
            this.popup = null;
            this.vectorSource = null;
            this.vectorLayer = null;
            this.circleSource = null;
            this.circleLayer = null;
            this.baseLayerSelector = null;

            // === AJOUT : retire les écouteurs d'événements ===
            document.removeEventListener('addCalculatedPointToMap', this.addCalculatedPointHandler);
            // === NOUVEL AJOUT : supprimer les nouveaux écouteurs ===
            document.removeEventListener('addMultipleCalculatedPointsToMap', this.addMultipleCalculatedPointsHandler);
            document.removeEventListener('clearCalculatedPoints', this.clearCalculatedPointsHandler);
            window.removeEventListener('addCalculatedPointToMap', this.handleAddCalculatedPoint.bind(this));
            window.removeEventListener('openWaypointFormWithData', this.handleOpenWaypointFormWithData.bind(this));
        }

        async initializeMap() {
            try {
                if (!this.hasContainerTarget) {
                    console.error("%c[DetailMapCtrl] Erreur: Cible 'container' manquante", "background:red; color:white");
                    return;
                }

                // Sources de tuiles OSM (peut être partagé ou simplifié si nécessaire)
                this.tileSources = {
                    'OSM Standard': new ol.source.OSM(),
                    'OSM Cyclo': new ol.source.OSM({
                        url: 'https://{a-c}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png'
                    }),
                    'OSM Topo': new ol.source.OSM({
                        url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png'
                    })
                };

                // Créer la source et la couche vectorielle pour les points
                this.vectorSource = new ol.source.Vector();
                this.vectorLayer = new ol.layer.Vector({
                    source: this.vectorSource,
                    style: (feature) => this.styleFeature(feature) // Utiliser une fonction pour le style
                });
                
                // Créer la source et la couche pour les géocaches proches
                this.nearbySource = new ol.source.Vector();
                this.nearbyLayer = new ol.layer.Vector({
                    source: this.nearbySource,
                    style: (feature) => this.styleNearbyFeature(feature),
                    visible: false // Couche cachée par défaut
                });
                
                // Créer la source et la couche pour les cercles de 161m
                this.circleSource = new ol.source.Vector();
                this.circleLayer = new ol.layer.Vector({
                    source: this.circleSource,
                    style: new ol.style.Style({
                        stroke: new ol.style.Stroke({
                            color: 'rgba(255, 0, 0, 0.7)',
                            width: 2,
                            lineDash: [5, 5] // Ligne pointillée
                        }),
                        fill: new ol.style.Fill({
                            color: 'rgba(255, 0, 0, 0.1)'
                        })
                    }),
                    visible: false // Couche cachée par défaut
                });

                // Initialiser la carte OpenLayers
                this.map = new ol.Map({
                    target: this.containerTarget,
                    layers: [
                        new ol.layer.Tile({
                            source: this.tileSources['OSM Standard']
                        }),
                        this.circleLayer, // Ajouter la couche de cercles avant les points
                        this.vectorLayer,
                        this.nearbyLayer // Ajouter la couche des géocaches proches
                    ],
                    view: new ol.View({
                        center: ol.proj.fromLonLat([1.888334, 46.603354]), // Centre par défaut (France)
                        zoom: 6
                    }),
                    controls: new ol.Collection([
                        new ol.control.Zoom(),
                        new ol.control.FullScreen(),
                        new ol.control.ScaleLine(),
                        new ol.control.Attribution()
                    ])
                });

                // Configurer le popup
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

                // Gérer les clics sur la carte pour afficher/masquer les popups
                this.map.on('click', (evt) => this.handleMapClick(evt));
                
                // Initialiser le menu contextuel pour le clic droit
                this.initContextMenu();
                
                // Ajouter un gestionnaire pour le clic droit
                this.map.getViewport().addEventListener('contextmenu', (evt) => this.handleRightClick(evt));

                // Charger les données spécifiques à cette géocache
                await this.loadGeocacheData();
                
                // Créer le menu de sélection des fonds de carte APRÈS le chargement des données
                // pour s'assurer qu'il reste au-dessus
                this.createBaseLayerSelector();
                
                // Configurer une vérification périodique pour s'assurer que le sélecteur reste visible
                this.ensureBaseLayerSelectorVisibility();

            } catch (error) {
                console.error('%c[DetailMapCtrl] Erreur lors de l\'initialisation de la carte:', "background:red; color:white", error);
            }
        }

        // Initialiser le menu contextuel
        initContextMenu() {
            // Créer l'élément de menu contextuel s'il n'existe pas déjà
            if (!this.contextMenu) {
                this.contextMenu = document.createElement('div');
                this.contextMenu.className = 'absolute bg-white shadow-lg rounded-lg p-2 z-[1002]';
                this.contextMenu.style.cssText = 'display: none; background-color: white; color: black; min-width: 200px; border: 1px solid #ccc;';
                document.body.appendChild(this.contextMenu);
                
                // Définir le gestionnaire d'événement pour fermer le menu contextuel lors d'un clic ailleurs
                this.contextMenuClickHandler = () => {
                    if (this.contextMenu) {
                        this.contextMenu.style.display = 'none';
                    }
                };
                
                // Ajouter l'écouteur d'événement de manière propre pour pouvoir le supprimer lors de la déconnexion
                document.addEventListener('click', this.contextMenuClickHandler);
            }
            
            // Rendre la couche de cercles visible par défaut
            if (this.circleLayer) {
                this.circleLayer.setVisible(true);
            }
        }
        
        // Gérer le clic droit sur la carte
        handleRightClick(evt) {
            evt.preventDefault(); // Empêcher le menu contextuel du navigateur
            
            // S'assurer que le menu contextuel existe
            if (!this.contextMenu) {
                console.error('%c[DetailMapCtrl] Menu contextuel non initialisé', "background:red; color:white");
                this.initContextMenu(); // Essayer de le réinitialiser
                if (!this.contextMenu) return; // Si toujours pas disponible, abandonner
            }
            
            // Obtenir les coordonnées du clic
            const pixel = this.map.getEventPixel(evt);
            const coordinate = this.map.getCoordinateFromPixel(pixel);
            const lonLat = ol.proj.transform(coordinate, 'EPSG:3857', 'EPSG:4326');
            
            // Stocker les coordonnées pour utilisation ultérieure
            this.rightClickCoords = {
                coordinate: coordinate,
                lonLat: lonLat
            };
            
            // Vérifier si on a cliqué sur une feature
            let clickedFeature = null;
            this.map.forEachFeatureAtPixel(pixel, (feature) => {
                if (!clickedFeature) {
                    clickedFeature = feature;
                }
            }, { hitTolerance: 5 });
            
            // Vérifier si un marqueur temporaire existe
            const hasTempMarker = this.vectorSource.getFeatures().some(feature => 
                feature.get('temp_marker') === true);
            
            // Formater les coordonnées au format geocaching (degrés, minutes, secondes)
            const formattedCoords = this.formatGeoCoords(lonLat[1], lonLat[0]);
            const decimalCoords = {
                latitude: lonLat[1].toFixed(6),
                longitude: lonLat[0].toFixed(6)
            };
            
            // Contenu du menu - varie selon si on a cliqué sur une feature ou non
            if (clickedFeature) {
                const props = clickedFeature.getProperties();
                
                // Vérifier si on a déjà un cercle pour cette feature
                const hasCircle = this.circleSource.getFeatures().some(feature => {
                    const circleProps = feature.getProperties();
                    return circleProps.related_cache === props.gc_code;
                });
                
                this.contextMenu.innerHTML = `
                    <div class="p-2 font-bold border-b border-gray-200">Point: ${props.gc_code || 'Point'}</div>
                    <div class="p-2">
                        <div class="font-bold text-sm mb-1">Coordonnées:</div>
                        <div class="select-all cursor-pointer hover:bg-gray-100 p-1 rounded" data-action="copy-dms">
                            ${formattedCoords.latitude} ${formattedCoords.longitude}
                            <div class="text-xs text-gray-500 mt-1">Cliquer pour copier</div>
                        </div>
                    </div>
                    <div class="p-2 border-t border-gray-200">
                        <div class="font-bold text-sm mb-1">Format décimal:</div>
                        <div class="select-all cursor-pointer hover:bg-gray-100 p-1 rounded" data-action="copy-decimal">
                            ${decimalCoords.latitude}, ${decimalCoords.longitude}
                            <div class="text-xs text-gray-500 mt-1">Cliquer pour copier</div>
                        </div>
                    </div>
                    ${hasCircle ? `
                    <div class="p-2 cursor-pointer hover:bg-gray-100 border-t border-gray-200" data-action="remove-circle" data-gc-code="${props.gc_code}">
                        <i class="fas fa-times-circle mr-2"></i> Supprimer le cercle de 161m
                    </div>` : `
                    <div class="p-2 cursor-pointer hover:bg-gray-100 border-t border-gray-200" data-action="add-circle" data-gc-code="${props.gc_code}">
                        <i class="fas fa-circle mr-2"></i> Ajouter un cercle de 161m
                    </div>`}
                    <div class="p-2 cursor-pointer hover:bg-gray-100 border-t border-gray-200" data-action="add-waypoint-from-feature">
                        <i class="fas fa-map-pin mr-2"></i> Créer un Waypoint à ce point
                    </div>
                    <div class="p-2 cursor-pointer hover:bg-gray-100 border-t border-gray-200" data-action="close">
                        Fermer
                    </div>
                `;
            } else {
                // Menu standard pour un clic sur la carte (sans feature)
                this.contextMenu.innerHTML = `
                    <div class="p-2 font-bold border-b border-gray-200">Coordonnées</div>
                    <div class="p-2">
                        <div class="font-bold text-sm mb-1">Format DMS:</div>
                        <div class="select-all cursor-pointer hover:bg-gray-100 p-1 rounded" data-action="copy-dms">
                            ${formattedCoords.latitude} ${formattedCoords.longitude}
                            <div class="text-xs text-gray-500 mt-1">Cliquer pour copier</div>
                        </div>
                    </div>
                    <div class="p-2 border-t border-gray-200">
                        <div class="font-bold text-sm mb-1">Format décimal:</div>
                        <div class="select-all cursor-pointer hover:bg-gray-100 p-1 rounded" data-action="copy-decimal">
                            ${decimalCoords.latitude}, ${decimalCoords.longitude}
                            <div class="text-xs text-gray-500 mt-1">Cliquer pour copier</div>
                        </div>
                    </div>
                    <div class="p-2 cursor-pointer hover:bg-gray-100 border-t border-gray-200" data-action="add-marker">
                        <i class="fas fa-map-marker-alt mr-2"></i> Ajouter un marqueur temporaire
                    </div>
                    <div class="p-2 cursor-pointer hover:bg-gray-100 border-t border-gray-200" data-action="add-waypoint">
                        <i class="fas fa-map-pin mr-2"></i> Ajouter un Waypoint
                    </div>
                    ${hasTempMarker ? `
                    <div class="p-2 cursor-pointer hover:bg-gray-100 border-t border-gray-200" data-action="clear-temp-markers">
                        <i class="fas fa-trash mr-2"></i> Supprimer tous les marqueurs temporaires
                    </div>` : ''}
                    <div class="p-2 cursor-pointer hover:bg-gray-100 border-t border-gray-200" data-action="close">
                        Fermer
                    </div>
                `;
            }
            
            // Positionner le menu à l'emplacement du clic
            this.contextMenu.style.left = `${evt.clientX}px`;
            this.contextMenu.style.top = `${evt.clientY}px`;
            this.contextMenu.style.display = 'block';
            
            // Ajouter des gestionnaires d'événements pour les actions du menu
            this.contextMenu.querySelector('[data-action="copy-dms"]').addEventListener('click', () => {
                const coordText = `${formattedCoords.latitude} ${formattedCoords.longitude}`;
                this.copyToClipboard(coordText, this.contextMenu.querySelector('[data-action="copy-dms"]'));
            });
            
            this.contextMenu.querySelector('[data-action="copy-decimal"]').addEventListener('click', () => {
                const coordText = `${decimalCoords.latitude}, ${decimalCoords.longitude}`;
                this.copyToClipboard(coordText, this.contextMenu.querySelector('[data-action="copy-decimal"]'));
            });
            
            // Actions spécifiques selon le type de menu
            if (clickedFeature) {
                // Gestionnaires pour le menu sur un point existant
                if (this.contextMenu.querySelector('[data-action="add-circle"]')) {
                    this.contextMenu.querySelector('[data-action="add-circle"]').addEventListener('click', () => {
                        const gcCode = this.contextMenu.querySelector('[data-action="add-circle"]').getAttribute('data-gc-code');
                        this.addCircle161mToFeature(clickedFeature);
                        this.contextMenu.style.display = 'none';
                    });
                }
                
                if (this.contextMenu.querySelector('[data-action="remove-circle"]')) {
                    this.contextMenu.querySelector('[data-action="remove-circle"]').addEventListener('click', () => {
                        const gcCode = this.contextMenu.querySelector('[data-action="remove-circle"]').getAttribute('data-gc-code');
                        this.removeCircle161mFromFeature(gcCode);
                        this.contextMenu.style.display = 'none';
                    });
                }
                
                if (this.contextMenu.querySelector('[data-action="add-waypoint-from-feature"]')) {
                    this.contextMenu.querySelector('[data-action="add-waypoint-from-feature"]').addEventListener('click', () => {
                        const props = clickedFeature.getProperties();
                        const coordinates = clickedFeature.getGeometry().getCoordinates();
                        const lonLat = ol.proj.transform(coordinates, 'EPSG:3857', 'EPSG:4326');
                        
                        // Utiliser les propriétés de la feature pour pré-remplir le waypoint
                        this.openWaypointForm(lonLat[0], lonLat[1], props);
                        this.contextMenu.style.display = 'none';
                    });
                }
            } else {
                // Gestionnaires pour le menu standard (sans point)
                this.contextMenu.querySelector('[data-action="add-marker"]').addEventListener('click', () => {
                    this.addTemporaryMarker(this.rightClickCoords.lonLat[0], this.rightClickCoords.lonLat[1]);
                    this.contextMenu.style.display = 'none';
                });
                
                this.contextMenu.querySelector('[data-action="add-waypoint"]').addEventListener('click', () => {
                    this.openWaypointForm(this.rightClickCoords.lonLat[0], this.rightClickCoords.lonLat[1]);
                    this.contextMenu.style.display = 'none';
                });
                
                if (hasTempMarker) {
                    this.contextMenu.querySelector('[data-action="clear-temp-markers"]').addEventListener('click', () => {
                        this.clearTemporaryMarkers();
                        this.contextMenu.style.display = 'none';
                    });
                }
            }
            
            this.contextMenu.querySelector('[data-action="close"]').addEventListener('click', () => {
                this.contextMenu.style.display = 'none';
            });
        }
        
        // Fonction utilitaire pour copier dans le presse-papier
        copyToClipboard(text, element) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    // Feedback visuel temporaire
                    const originalText = element.innerHTML;
                    element.innerHTML = '<div class="text-green-600 font-bold">Copié !</div>';
                    setTimeout(() => {
                        element.innerHTML = originalText;
                    }, 1000);
                })
                .catch(err => {
                    console.error('Erreur lors de la copie: ', err);
                });
        }
        
        // Ajouter un marqueur temporaire sur la carte
        addTemporaryMarker(lon, lat, isWaypointMarker = false) {
            // Créer un ID unique pour ce marqueur temporaire
            const tempMarkerId = `temp-marker-${Date.now()}`;
            
            // Vérifier s'il y a déjà un marqueur temporaire et le supprimer
            // Mais uniquement si ce n'est pas un marqueur de waypoint
            if (!isWaypointMarker) {
                const existingFeatures = this.vectorSource.getFeatures();
                existingFeatures.forEach(feature => {
                    if (feature.get('temp_marker') === true && feature.get('waypoint_marker') !== true) {
                        this.vectorSource.removeFeature(feature);
                    }
                });
            }
            
            // Créer une nouvelle feature pour le marqueur temporaire
            const tempFeature = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
                name: isWaypointMarker ? 'Nouveau waypoint' : 'Point temporaire',
                temp_marker: true, // Marquer comme temporaire
                waypoint_marker: isWaypointMarker, // Marquer comme un marqueur de waypoint
                id: tempMarkerId,
                gc_code: isWaypointMarker ? 'WP' : 'TEMP',
                cache_type: isWaypointMarker ? 'Waypoint' : 'TempPoint',
                latitude: lat,
                longitude: lon
            });
            
            // Ajouter la feature à la source vectorielle
            this.vectorSource.addFeature(tempFeature);
            
            console.log(`%c[DetailMapCtrl] Marqueur ${isWaypointMarker ? 'waypoint' : 'temporaire'} ajouté (${lat.toFixed(6)}, ${lon.toFixed(6)})`, "color:green");
            
            return tempMarkerId;
        }

        // Formater les coordonnées au format géocaching
        formatGeoCoords(lat, lon) {
            // Formatter la latitude au format DDM (Degrés, Minutes décimales)
            const latDir = lat >= 0 ? 'N' : 'S';
            lat = Math.abs(lat);
            const latDeg = Math.floor(lat);
            let latMin = ((lat - latDeg) * 60).toFixed(3);
            
            // Ajouter un zéro devant si nécessaire (par ex. 8.123 -> 08.123)
            if (parseFloat(latMin) < 10) {
                latMin = '0' + latMin;
            }
            
            // Formatter la longitude au format DDM (Degrés, Minutes décimales)
            const lonDir = lon >= 0 ? 'E' : 'W';
            lon = Math.abs(lon);
            const lonDeg = Math.floor(lon);
            let lonMin = ((lon - lonDeg) * 60).toFixed(3);
            
            // Ajouter un zéro devant si nécessaire
            if (parseFloat(lonMin) < 10) {
                lonMin = '0' + lonMin;
            }
            
            return {
                latitude: `${latDir} ${latDeg}° ${latMin}`,
                longitude: `${lonDir} ${lonDeg}° ${lonMin}`
            };
        }

        // Créer le sélecteur de fond de carte avec option pour afficher les géocaches proches
        createBaseLayerSelector() {
            if (!this.hasContainerTarget) return;

            // Supprimer l'ancien sélecteur s'il existe
            if (this.baseLayerSelector) {
                try {
                    if (this.baseLayerSelector.parentNode) {
                        this.baseLayerSelector.parentNode.removeChild(this.baseLayerSelector);
                    }
                } catch(e) {
                    console.warn('%c[DetailMapCtrl] Impossible de supprimer l\'ancien sélecteur:', "color:orange", e);
                }
            }

            // Créer un conteneur compact
            const selectorContainer = document.createElement('div');
            
            // Positionner par rapport à la fenêtre mais calculer l'emplacement basé sur le conteneur
            const containerRect = this.containerTarget.getBoundingClientRect();
            const topOffset = containerRect.top + 10; // 10px de marge du haut
            const rightOffset = window.innerWidth - containerRect.right + 10; // 10px de marge de la droite
            
            selectorContainer.className = 'fixed bg-white shadow-lg rounded-lg p-2';
            selectorContainer.style.cssText = `
                background-color: white; 
                color: black; 
                top: ${topOffset}px; 
                right: ${rightOffset}px; 
                z-index: 9999; 
                pointer-events: auto;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                display: flex;
                flex-direction: column;
                gap: 6px;
            `;
            
            // Stocker une référence au sélecteur pour pouvoir le gérer plus tard
            this.baseLayerSelector = selectorContainer;
            
            // Créer un simple élément select
            const select = document.createElement('select');
            select.className = 'block p-1 text-sm rounded border border-gray-300 focus:border-blue-500 focus:outline-none';
            select.style.cssText = 'background-color: white; min-width: 120px;';
            
            // Définir les options de carte
            const mapOptions = [
                { id: 'OSM Standard', name: 'Standard (OSM)' },
                { id: 'OSM Cyclo', name: 'Cycliste' },
                { id: 'OSM Topo', name: 'Topographique' }
            ];
            
            // Ajouter les options au select
            mapOptions.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.id;
                optionElement.textContent = option.name;
                select.appendChild(optionElement);
            });
            
            // Ajouter l'événement de changement
            select.addEventListener('change', (e) => {
                this.changeBaseLayer(e.target.value);
            });

            selectorContainer.appendChild(select);
            
            // Ajouter une case à cocher pour les géocaches proches
            const nearbyCheckboxContainer = document.createElement('div');
            nearbyCheckboxContainer.className = 'flex items-center';
            
            const nearbyCheckbox = document.createElement('input');
            nearbyCheckbox.type = 'checkbox';
            nearbyCheckbox.id = 'show-nearby-geocaches';
            nearbyCheckbox.className = 'mr-2 form-checkbox h-4 w-4 text-blue-600';
            
            const nearbyLabel = document.createElement('label');
            nearbyLabel.htmlFor = 'show-nearby-geocaches';
            nearbyLabel.className = 'text-sm text-gray-700';
            nearbyLabel.textContent = 'Géocaches proches';
            
            // Ajouter une case à cocher pour les cercles de 161m
            const circlesCheckboxContainer = document.createElement('div');
            circlesCheckboxContainer.className = 'flex items-center ml-5';
            
            const circlesCheckbox = document.createElement('input');
            circlesCheckbox.type = 'checkbox';
            circlesCheckbox.id = 'show-circles-161m';
            circlesCheckbox.className = 'mr-2 form-checkbox h-4 w-4 text-blue-600';
            
            // Définir l'état initial en fonction de la visibilité de la couche de cercles
            const hasManualCircles = this.circleSource.getFeatures().length > 0;
            const isCircleLayerVisible = this.circleLayer.getVisible();
            
            // Si on a déjà des cercles et que la couche est visible, la case doit être cochée
            if (hasManualCircles && isCircleLayerVisible) {
                circlesCheckbox.checked = true;
            }
            
            // Désactiver la case à cocher si les géocaches proches ne sont pas visibles
            // et qu'il n'y a pas de cercles manuels
            const isNearbyLayerVisible = this.nearbyLayer.getVisible();
            circlesCheckbox.disabled = !isNearbyLayerVisible && !hasManualCircles;
            circlesCheckbox.style.opacity = (isNearbyLayerVisible || hasManualCircles) ? '1' : '0.5';
            
            const circlesLabel = document.createElement('label');
            circlesLabel.htmlFor = 'show-circles-161m';
            circlesLabel.className = (isNearbyLayerVisible || hasManualCircles) ? 'text-sm text-gray-700' : 'text-sm text-gray-500';
            circlesLabel.textContent = 'Cercles 161m';
            
            // Gestionnaire pour les géocaches proches
            nearbyCheckbox.addEventListener('change', () => {
                const showNearby = nearbyCheckbox.checked;
                this.toggleNearbyGeocaches(showNearby);
                
                // Vérifier s'il y a des cercles ajoutés manuellement
                const hasManualCircles = this.circleSource.getFeatures().length > 0;
                
                // Activer/désactiver l'option des cercles en fonction de l'état des géocaches proches
                // et des cercles manuels existants
                circlesCheckbox.disabled = !showNearby && !hasManualCircles;
                circlesCheckbox.style.opacity = (showNearby || hasManualCircles) ? '1' : '0.5';
                circlesLabel.className = (showNearby || hasManualCircles) ? 'text-sm text-gray-700' : 'text-sm text-gray-500';
                
                // Si on désactive les géocaches proches et qu'il n'y a pas de cercles manuels,
                // on désactive aussi les cercles
                if (!showNearby && circlesCheckbox.checked && !hasManualCircles) {
                    circlesCheckbox.checked = false;
                    this.toggleCircles161m(false);
                }
            });
            
            // Gestionnaire pour les cercles de 161m
            circlesCheckbox.addEventListener('change', () => {
                const showCircles = circlesCheckbox.checked;
                this.toggleCircles161m(showCircles);
            });
            
            nearbyCheckboxContainer.appendChild(nearbyCheckbox);
            nearbyCheckboxContainer.appendChild(nearbyLabel);
            
            circlesCheckboxContainer.appendChild(circlesCheckbox);
            circlesCheckboxContainer.appendChild(circlesLabel);
            
            selectorContainer.appendChild(nearbyCheckboxContainer);
            selectorContainer.appendChild(circlesCheckboxContainer);
            
            // Ajouter le sélecteur directement au body
            document.body.appendChild(selectorContainer);
            
            // Ajouter un gestionnaire d'événements pour adapter la position lors du redimensionnement
            this.resizeHandler = () => {
                if (this.baseLayerSelector) {
                    const newRect = this.containerTarget.getBoundingClientRect();
                    this.baseLayerSelector.style.top = (newRect.top + 10) + 'px';
                    this.baseLayerSelector.style.right = (window.innerWidth - newRect.right + 10) + 'px';
                }
            };
            
            window.addEventListener('resize', this.resizeHandler);
            
            console.log('%c[DetailMapCtrl] Sélecteur compact de fond de carte créé', "color:green");
        }
        
        // Afficher ou masquer les géocaches proches
        toggleNearbyGeocaches(show) {
            console.log(`%c[DetailMapCtrl] ${show ? 'Affichage' : 'Masquage'} des géocaches proches`, "color:teal");
            
            if (show && this.nearbySource.getFeatures().length === 0) {
                // Charger les géocaches proches si pas encore chargées
                this.loadNearbyGeocaches();
            }
            
            // Afficher ou masquer la couche
            this.nearbyLayer.setVisible(show);
        }
        
        // Charger les géocaches proches depuis l'API
        async loadNearbyGeocaches() {
            if (!this.hasGeocacheIdValue) return;

            try {
                console.log(`%c[DetailMapCtrl] Chargement des géocaches proches pour ${this.geocacheIdValue}...`, "color:teal");
                
                const response = await fetch(`/api/geocaches/${this.geocacheIdValue}/nearby?distance=5`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const nearbyGeocaches = await response.json();
                console.log(`%c[DetailMapCtrl] ${nearbyGeocaches.length} géocaches proches trouvées`, "color:green");
                
                // Vider la source
                this.nearbySource.clear();
                
                // Si la géocache actuelle a des coordonnées, calculer les distances
                let referenceCoords = null;
                const mainFeatures = this.vectorSource.getFeatures();
                for (const feature of mainFeatures) {
                    const props = feature.getProperties();
                    if (props.is_corrected) {
                        // Utiliser les coordonnées corrigées si disponibles
                        referenceCoords = {
                            latitude: props.latitude,
                            longitude: props.longitude
                        };
                        break;
                    } else if (!referenceCoords && props.latitude && props.longitude) {
                        // Sinon, utiliser les coordonnées originales
                        referenceCoords = {
                            latitude: props.latitude,
                            longitude: props.longitude
                        };
                    }
                }
                
                // Ajouter les features pour chaque géocache proche
                nearbyGeocaches.forEach(geocache => {
                    // Vérifier si on a des coordonnées corrigées et les utiliser si disponibles
                    let latitude = geocache.latitude;
                    let longitude = geocache.longitude;
                    let isCorrected = false;
                    
                    // Si des coordonnées corrigées sont disponibles, les utiliser
                    if (geocache.corrected_latitude && geocache.corrected_longitude) {
                        latitude = geocache.corrected_latitude;
                        longitude = geocache.corrected_longitude;
                        isCorrected = true;
                        console.log(`%c[DetailMapCtrl] Utilisation des coordonnées corrigées pour ${geocache.gc_code}`, "color:green");
                    }
                    
                    if (latitude && longitude) {
                        // Calculer la distance si on a des coordonnées de référence
                        if (referenceCoords) {
                            geocache.distance = this.calculateDistance(
                                referenceCoords.latitude, 
                                referenceCoords.longitude,
                                latitude,
                                longitude
                            );
                        }
                        
                        const feature = new ol.Feature({
                            geometry: new ol.geom.Point(
                                ol.proj.fromLonLat([longitude, latitude])
                            )
                        });
                        
                        // Définir les propriétés de la feature
                        feature.setProperties({
                            ...geocache,
                            type: 'nearby', // Marquer cette feature comme une "géocache proche"
                            is_corrected: isCorrected, // Indiquer si des coordonnées corrigées sont utilisées
                            // Stocker les coordonnées réellement utilisées pour l'affichage
                            latitude: latitude,
                            longitude: longitude,
                            // Conserver les coordonnées originales si des coordonnées corrigées sont utilisées
                            original_latitude: isCorrected ? geocache.latitude : undefined,
                            original_longitude: isCorrected ? geocache.longitude : undefined
                        });
                        
                        this.nearbySource.addFeature(feature);
                    }
                });
                
                // Ajuster la vue pour afficher tous les points si demandé
                if (this.nearbyLayer.getVisible() && this.nearbySource.getFeatures().length > 0) {
                    // Calculer l'étendue de toutes les features (principales + proches)
                    const allFeatures = [
                        ...this.vectorSource.getFeatures(),
                        ...this.nearbySource.getFeatures()
                    ];
                    
                    if (allFeatures.length > 0) {
                        // Créer une source temporaire avec toutes les features pour calculer l'étendue
                        const tempSource = new ol.source.Vector({
                            features: allFeatures
                        });
                        
                        const extent = tempSource.getExtent();
                        this.map.getView().fit(extent, {
                            padding: [50, 50, 50, 50],
                            duration: 500
                        });
                    }
                }

            } catch (error) {
                console.error('%c[DetailMapCtrl] Erreur lors du chargement des géocaches proches:', "background:red; color:white", error);
            }
        }
        
        // Calculer la distance en kilomètres entre deux points (formule de haversine)
        calculateDistance(lat1, lon1, lat2, lon2) {
            const R = 6371; // Rayon de la Terre en km
            const dLat = this.deg2rad(lat2 - lat1);
            const dLon = this.deg2rad(lon2 - lon1);
            const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
                Math.sin(dLon/2) * Math.sin(dLon/2); 
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
            const distance = R * c; // Distance en km
            return Math.round(distance * 100) / 100; // Arrondir à 2 décimales
        }
        
        deg2rad(deg) {
            return deg * (Math.PI/180);
        }
        
        // Style pour les géocaches proches
        styleNearbyFeature(feature) {
            const properties = feature.getProperties();
            let cacheColor = 'rgba(150, 150, 150, 0.8)'; // gris par défaut
            let cacheIcon = null;
            let cacheRadius = 6;
            let strokeColor = '#ffffff'; // Bordure blanche pour les géocaches proches
            let strokeWidth = 2;
            let shapePoints = null; // null pour cercle par défaut (par défaut)
            let shapeAngle = 0;

            const cacheType = properties.cache_type;
            const isCorrected = properties.is_corrected === true;
            
            // Appliquer les mêmes styles que les géocaches normales basés sur le type
            switch(cacheType) {
                case 'Traditional Cache': 
                    cacheColor = 'rgba(0, 160, 0, 0.8)'; // vert
                    break;
                case 'Unknown Cache': 
                case 'Mystery': 
                    cacheColor = 'rgba(0, 60, 200, 0.8)'; // bleu
                    cacheIcon = '?';
                    cacheRadius = 8;
                    break;
                case 'Letterbox Hybrid': 
                    cacheColor = 'rgba(0, 60, 200, 0.8)'; // bleu
                    cacheIcon = '✉'; // enveloppe
                    cacheRadius = 8;
                    break;
                case 'Multi-cache': 
                    cacheColor = 'rgba(255, 165, 0, 0.8)'; // orange
                    break;
                case 'Wherigo': 
                    cacheColor = 'rgba(0, 120, 255, 0.8)'; // bleu
                    break;
                case 'Earth Cache':
                    cacheColor = 'rgba(139, 69, 19, 0.8)'; // marron
                    break;
                case 'Virtual Cache':
                    cacheColor = 'rgba(255, 0, 255, 0.8)'; // magenta
                    break;
                default:
                    cacheColor = 'rgba(128, 0, 128, 0.8)'; // violet par défaut
            }
            
            // Si la géocache a des coordonnées corrigées, la représenter comme un carré
            if (isCorrected) {
                shapePoints = 4; // Carré
                shapeAngle = Math.PI / 4; // Rotation de 45 degrés (losange)
                cacheRadius = 8; // Légèrement plus grand
            }
            
            // Créer le style approprié
            let imageStyle;
            if (shapePoints) {
                imageStyle = new ol.style.RegularShape({
                    points: shapePoints,
                    radius: cacheRadius,
                    angle: shapeAngle,
                    fill: new ol.style.Fill({ color: cacheColor }),
                    stroke: new ol.style.Stroke({ color: strokeColor, width: strokeWidth })
                });
            } else {
                imageStyle = new ol.style.Circle({
                    radius: cacheRadius,
                    fill: new ol.style.Fill({ color: cacheColor }),
                    stroke: new ol.style.Stroke({ color: strokeColor, width: strokeWidth })
                });
            }

            const style = new ol.style.Style({
                image: imageStyle
            });

            // Ajouter le texte (icône) si défini
            if (cacheIcon) {
                style.setText(new ol.style.Text({
                    text: cacheIcon,
                    font: 'bold 12px sans-serif',
                    fill: new ol.style.Fill({ color: '#ffffff' }),
                    offsetY: -1
                }));
            }

            return style;
        }

        // Gérer le clic sur la carte
        handleMapClick(evt) {
            const feature = this.map.forEachFeatureAtPixel(evt.pixel,
                (feature) => feature, {
                    hitTolerance: 5 // Tolérance pour le clic
                });

            if (feature) {
                const coordinates = feature.getGeometry().getCoordinates();
                const properties = feature.getProperties();
                let popupHtml = '';

                // Vérifier si c'est une géocache proche ou normale
                if (properties.type === 'nearby') {
                    // Affichage spécifique pour une géocache proche
                    popupHtml = `
                        <div>
                            <div style="font-weight: bold; margin-bottom: 4px;">${properties.gc_code || 'Geocache'}</div>
                            <div style="margin-bottom: 4px;">${properties.name}</div>
                            <div style="color: #666;">${properties.cache_type}</div>
                            ${properties.difficulty ? `
                            <div style="margin-top: 8px;">
                                <span style="font-weight: bold;">D:</span> ${properties.difficulty} 
                                <span style="font-weight: bold; margin-left: 8px;">T:</span> ${properties.terrain}
                            </div>` : ''}
                            ${properties.distance ? `
                            <div style="margin-top: 4px; color: #800080; font-weight: bold;">
                                Distance: ${properties.distance} km
                            </div>` : ''}
                            <div style="margin-top: 8px; font-size: 0.9em;">
                                <i class="fas fa-map-marker-alt"></i> ${properties.latitude.toFixed(6)}, ${properties.longitude.toFixed(6)}
                            </div>
                        </div>
                    `;
                } else {
                    // Affichage pour une géocache normale (existant)

                    // Personnalisation de l'affichage pour les points calculés
                    if (properties.isCalculatedPoint === true) {
                        // Popup spéciale pour les points calculés (affiche uniquement les coordonnées DDM)
                        popupHtml = `
                            <div>
                                <div style="font-weight: bold; margin-bottom: 4px; color: #0066cc;">Point calculé</div>
                                <div style="font-family: monospace; font-size: 1em; color: #333; margin-top: 8px;">
                                    ${properties.gc_lat || ''}<br>
                                    ${properties.gc_lon || ''}
                                </div>
                                <div style="color: #888; margin-top: 4px; font-size: 0.9em;">
                                    Calculé à ${properties.calculatedAt || 'récemment'}
                                </div>
                            </div>
                        `;
                    } else {
                        // Popup standard pour les autres points
                        const coordInfo = properties.is_corrected
                            ? `<div style="color: #ff5555; font-weight: bold; margin-top: 4px;">⚠️ Coordonnées corrigées</div>`
                            : (properties.cache_type === 'Waypoint' ? '<div style="color: #4444ff; font-weight: bold; margin-top: 4px;">📍 Waypoint</div>' : '<div style="color: #55aa55; font-weight: bold; margin-top: 4px;">🎯 Coordonnées Originales</div>');

                        const originalCoordInfo = (properties.is_corrected && properties.original_latitude && properties.original_longitude)
                            ? `<div style="color: #999; margin-top: 4px; font-size: 0.9em;">Original: ${properties.original_latitude.toFixed(6)}, ${properties.original_longitude.toFixed(6)}</div>`
                            : '';

                        popupHtml = `
                            <div>
                                <div style="font-weight: bold; margin-bottom: 4px;">${properties.gc_code || 'Waypoint'}</div>
                                <div style="margin-bottom: 4px;">${properties.name}</div>
                                ${properties.cache_type !== 'Waypoint' ? `<div style="color: #666;">${properties.cache_type}</div>` : ''}
                                ${properties.cache_type !== 'Waypoint' ? `
                                <div style="margin-top: 8px;">
                                    <span style="font-weight: bold;">D:</span> ${properties.difficulty || '?'}
                                    <span style="font-weight: bold; margin-left: 8px;">T:</span> ${properties.terrain || '?'}
                                </div>` : ''}
                                <div style="margin-top: 4px; font-family: monospace; font-size: 0.9em;">
                                    ${properties.gc_lat || properties.latitude?.toFixed(6) || 'N/A'}<br>
                                    ${properties.gc_lon || properties.longitude?.toFixed(6) || 'N/A'}
                                </div>
                                ${coordInfo}
                                ${originalCoordInfo}
                                ${properties.note ? `<div style="color: #888; margin-top: 4px; font-size: 0.9em; max-height: 50px; overflow-y: auto;">Note: ${properties.note}</div>` : ''}
                            </div>
                        `;
                    }
                }

                this.popupContentTarget.innerHTML = popupHtml;
                this.popupTarget.style.display = 'block';
                this.popup.setPosition(coordinates);
                // Ajuster la position pour être sûr qu'il est visible
                this.map.getView().animate({ center: coordinates, duration: 250 });
            } else {
                // Clic en dehors d'une feature, masquer le popup
                this.popupTarget.style.display = 'none';
                this.popup.setPosition(undefined);
            }
        }

        // Fonction pour déterminer le style d'une feature
        styleFeature(feature) {
            const properties = feature.getProperties();
            let cacheColor = 'rgba(150, 150, 150, 0.8)'; // gris par défaut
            let cacheIcon = null;
            let cacheRadius = 6;
            let strokeColor = '#000000'; // Bordure noire pour les points de la géocache principale
            let strokeWidth = 1.5;
            let shapePoints = null; // null pour cercle par défaut
            let shapeAngle = 0;

            const cacheType = properties.cache_type;
            const isCorrected = properties.is_corrected;
            const isSaved = properties.is_saved; // is_saved n'est pas directement dans les données API, peut-être à ajouter ?
            const isTempMarker = properties.temp_marker === true;

            if (isTempMarker) {
                // Style spécifique pour les marqueurs temporaires
                cacheColor = 'rgba(255, 0, 0, 0.8)'; // Rouge vif
                strokeColor = '#000000'; // Bordure noire pour les marqueurs temporaires
                strokeWidth = 2;
                cacheRadius = 8;
                shapePoints = 4; // Carré
                shapeAngle = Math.PI / 4; // Rotation de 45 degrés (losange)
                cacheIcon = '✖'; // Icône X
                
                // Style spécial pour les points calculés (différent des marqueurs temporaires standards)
                if (properties.calculatedPoint === true) {
                    // Point calculé individuel (par défaut) - bleu
                    if (!properties.isMultiPoint) {
                        cacheColor = 'rgba(0, 90, 220, 0.8)'; // Bleu comme les points multiples
                        strokeColor = '#ffffff'; // Bordure blanche
                        strokeWidth = 2;
                        cacheRadius = 10; // Plus grand
                        shapePoints = 4; // Carré
                        shapeAngle = Math.PI / 4; // Rotation de 45 degrés (losange)
                        cacheIcon = '?'; // Point d'interrogation
                    } 
                    // Point calculé multiple - bleu
                    else {
                        cacheColor = 'rgba(0, 90, 220, 0.8)'; // Bleu
                        strokeColor = properties.strokeColor || '#ffffff'; // Bordure personnalisable
                        strokeWidth = 2;
                        cacheRadius = 10; // Plus grand
                        shapePoints = 4; // Carré
                        shapeAngle = Math.PI / 4; // Rotation de 45 degrés (losange)
                        cacheIcon = (properties.pointIndex || '').toString(); // Numéro du point
                    }
                }
            } else if (cacheType === 'Waypoint') {
                cacheColor = 'rgba(51, 136, 255, 0.8)'; // Bleu pour waypoint
                cacheIcon = '📍';
                cacheRadius = 7;
            } else {
                // Logique de couleur basée sur le type de cache principal
                switch(cacheType) {
                    case 'Traditional Cache': cacheColor = 'rgba(0, 160, 0, 0.8)'; break;
                    case 'Unknown Cache': case 'Mystery': cacheColor = 'rgba(0, 60, 200, 0.8)'; cacheIcon = '?'; cacheRadius = 8; break;
                    case 'Letterbox Hybrid': cacheColor = 'rgba(0, 60, 200, 0.8)'; cacheIcon = '✉'; cacheRadius = 8; break;
                    case 'Multi-cache': cacheColor = 'rgba(255, 165, 0, 0.8)'; break;
                    case 'Wherigo': cacheColor = 'rgba(0, 120, 255, 0.8)'; break;
                }
            }

            // Style spécifique pour les coordonnées corrigées
            if (isCorrected === true) {
                strokeColor = '#000000'; // Bordure noire pour les coordonnées corrigées
                strokeWidth = 2;
                // Utiliser un carré si les coordonnées sont sauvegardées (si l'info est disponible),
                // sinon un losange (carré non rotaté).
                // Si is_saved n'est pas dispo, on utilise un carré par défaut pour corrigé.
                shapePoints = 4;
                shapeAngle = isSaved === false ? 0 : Math.PI / 4; // Losange si non sauvegardé, carré sinon
                cacheColor = 'rgba(51, 136, 255, 0.8)'; // Couleur bleue spécifique pour corrigé
                cacheRadius = 8;
            }

            let imageStyle;
            if (shapePoints) {
                imageStyle = new ol.style.RegularShape({
                    points: shapePoints,
                    radius: cacheRadius,
                    angle: shapeAngle,
                    fill: new ol.style.Fill({ color: cacheColor }),
                    stroke: new ol.style.Stroke({ color: strokeColor, width: strokeWidth })
                });
            } else {
                imageStyle = new ol.style.Circle({
                    radius: cacheRadius,
                    fill: new ol.style.Fill({ color: cacheColor }),
                    stroke: new ol.style.Stroke({ color: strokeColor, width: strokeWidth })
                });
            }

            const style = new ol.style.Style({
                image: imageStyle
            });

            // Ajouter le texte (icône) si défini
            if (cacheIcon) {
                style.setText(new ol.style.Text({
                    text: cacheIcon,
                    font: 'bold 12px sans-serif',
                    fill: new ol.style.Fill({ color: '#ffffff' }),
                    offsetY: (cacheType === 'Waypoint') ? -1 : 0 // Ajustement spécifique pour pin waypoint
                }));
            }

            return style;
        }

        // Supprimer tous les marqueurs temporaires
        clearTemporaryMarkers() {
            const features = this.vectorSource.getFeatures();
            const tempFeatures = features.filter(feature => feature.get('temp_marker') === true);
            
            if (tempFeatures.length > 0) {
                tempFeatures.forEach(feature => {
                    this.vectorSource.removeFeature(feature);
                });
                console.log(`%c[DetailMapCtrl] ${tempFeatures.length} marqueur(s) temporaire(s) supprimé(s)`, "color:orange");
            }
        }

        // S'assurer que le sélecteur de fond de carte reste visible
        ensureBaseLayerSelectorVisibility() {
            // Vérifier si le sélecteur est toujours attaché au DOM
            const checkSelector = () => {
                if (!this.baseLayerSelector || !document.body.contains(this.baseLayerSelector)) {
                    console.warn('%c[DetailMapCtrl] Sélecteur détecté comme manquant, recréation...', "color:orange");
                    this.createBaseLayerSelector();
                }
                
                // Mettre à jour la position en cas de changement dans la page
                if (this.baseLayerSelector && this.containerTarget) {
                    const containerRect = this.containerTarget.getBoundingClientRect();
                    this.baseLayerSelector.style.top = (containerRect.top + 10) + 'px';
                    this.baseLayerSelector.style.right = (window.innerWidth - containerRect.right + 10) + 'px';
                }
            };
            
            // Vérifier immédiatement
            setTimeout(checkSelector, 500);
            
            // Puis vérifier périodiquement 
            this.selectorCheckInterval = setInterval(checkSelector, 2000);
        }
        
        // Changer le fond de carte
        changeBaseLayer(sourceName) {
            const tileLayer = this.map.getLayers().getArray().find(layer => layer instanceof ol.layer.Tile);
            if (tileLayer) {
                tileLayer.setSource(this.tileSources[sourceName]);
                console.log(`%c[DetailMapCtrl] Fond de carte changé pour: ${sourceName}`, "color:teal");
            }
        }
        
        // Charger les données de la géocache via l'API
        async loadGeocacheData() {
            if (!this.hasGeocacheIdValue) return;
            const geocacheId = this.geocacheIdValue;
            console.log(`%c[DetailMapCtrl] Chargement des données pour ${geocacheId}...`, "color:teal");
            
            try {
                const response = await fetch(`/api/geocaches/${geocacheId}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                console.log(`%c[DetailMapCtrl] Données reçues:`, "color:teal", data);

                this.vectorSource.clear(); // Vider les anciens points

                // Ajouter le point original
                if (data.original && data.original.latitude && data.original.longitude) {
                    this.addFeature(data.original.longitude, data.original.latitude, {
                        ...data, // Inclure les infos de base de la géocache
                        ...data.original, // Ajouter les infos spécifiques au point
                        is_corrected: false // Assurer que is_corrected est false
                    });
                }

                // Ajouter le point corrigé
                if (data.corrected && data.corrected.latitude && data.corrected.longitude) {
                    this.addFeature(data.corrected.longitude, data.corrected.latitude, {
                        ...data,
                        ...data.corrected,
                        is_corrected: true, // Assurer que is_corrected est true
                        original_latitude: data.original?.latitude,
                        original_longitude: data.original?.longitude
                    });
                }
                
                // Ajouter les waypoints
                if (data.waypoints && data.waypoints.length > 0) {
                    data.waypoints.forEach(wp => {
                        if (wp.latitude && wp.longitude) {
                            this.addFeature(wp.longitude, wp.latitude, {
                                id: wp.id, // Utiliser l'ID du waypoint
                                gc_code: wp.lookup || wp.prefix || 'WP', // Utiliser lookup ou prefix comme code
                                name: wp.name || 'Waypoint',
                                cache_type: 'Waypoint', // Type spécifique
                                difficulty: null, // Pas applicable
                                terrain: null,    // Pas applicable
                                size: null,       // Pas applicable
                                solved: null,     // Pas applicable
                                latitude: wp.latitude,
                                longitude: wp.longitude,
                                gc_lat: wp.gc_lat,
                                gc_lon: wp.gc_lon,
                                note: wp.note,
                                is_corrected: false // Waypoints ne sont pas "corrigés" au sens strict
                            });
                        }
                    });
                }

                // Ajuster la vue
                this.fitViewToFeatures();

            } catch (error) {
                console.error('%c[DetailMapCtrl] Erreur lors du chargement des données de la géocache:', "background:red; color:white", error);
            }
        }

        // Ajouter une feature à la carte
        addFeature(lon, lat, properties) {
            try {
                if (!this.vectorSource) return null;

                // Convertir les coordonnées en format OpenLayers
                const coordinates = ol.proj.fromLonLat([parseFloat(lon), parseFloat(lat)]);
                
                // Créer la feature
                const feature = new ol.Feature({
                    geometry: new ol.geom.Point(coordinates)
                });
                
                // Attribuer toutes les propriétés à la feature pour le style et le popup
                feature.setProperties(properties, true);
                
                // Définir explicitement l'ID de la feature si disponible (utile pour la mise à jour)
                if (properties.id) {
                    feature.setId(properties.id);
                }
                
                // Ajouter à la source
                this.vectorSource.addFeature(feature);
                console.log(`[MAP] Feature ajoutée: ${properties.gc_code || properties.name || 'Point'} à ${lon}, ${lat}`);
                
                // Retourner la feature pour pouvoir la modifier après création
                return feature;
            } catch (e) {
                console.error("Erreur lors de l'ajout de la feature", e, {lon, lat, properties});
                return null;
            }
        }
        
        // Ajuster la vue pour montrer toutes les features
        fitViewToFeatures() {
            const features = this.vectorSource.getFeatures();
            if (features.length === 0) {
                // Si pas de features, centrer sur la France par défaut ou coordonnées initiales si disponibles
                this.map.getView().setCenter(ol.proj.fromLonLat([1.888334, 46.603354]));
                this.map.getView().setZoom(6);
                return;
            }

            if (features.length === 1) {
                // Si une seule feature, centrer dessus avec un zoom raisonnable
                this.map.getView().setCenter(features[0].getGeometry().getCoordinates());
                this.map.getView().setZoom(14);
            } else {
                // Si plusieurs features, ajuster la vue pour les contenir toutes
                const extent = this.vectorSource.getExtent();
                // Vérifier que l'étendue est valide
                if (ol.extent.isEmpty(extent)) {
                    console.warn("[DetailMapCtrl] Extent is empty, cannot fit view.");
                    // Fallback: centrer sur la première feature
                    this.map.getView().setCenter(features[0].getGeometry().getCoordinates());
                    this.map.getView().setZoom(14);
                } else {
                     try {
                        this.map.getView().fit(extent, {
                            padding: [50, 50, 50, 50], // Marge autour des points
                            duration: 500, // Animation douce
                            maxZoom: 16 // Limiter le zoom maximal
                        });
                    } catch (e) {
                         console.error("[DetailMapCtrl] Error fitting view to extent:", e, extent);
                         // Fallback si fit échoue
                         this.map.getView().setCenter(features[0].getGeometry().getCoordinates());
                         this.map.getView().setZoom(14);
                    }
                }
            }
        }

        // Afficher ou masquer les cercles de 161m
        toggleCircles161m(show) {
            console.log(`%c[DetailMapCtrl] ${show ? 'Affichage' : 'Masquage'} des cercles de 161m`, "color:teal");
            
            if (show) {
                // Générer les cercles si ce n'est pas encore fait ou si la source n'a que des cercles ajoutés manuellement
                // On regénère tous les cercles même s'il y a déjà des cercles manuels dans la source
                this.generateCircles161m();
            }
            
            // Afficher ou masquer la couche
            this.circleLayer.setVisible(show);
        }
        
        // Générer les cercles de 161m autour des caches traditionnelles et des caches résolues
        generateCircles161m() {
            console.log(`%c[DetailMapCtrl] Génération des cercles de 161m...`, "color:teal");
            
            // Ne pas vider la source existante pour conserver les cercles ajoutés manuellement
            // Créer un Set des codes de géocaches qui ont déjà un cercle
            const existingCircleCodes = new Set();
            this.circleSource.getFeatures().forEach(feature => {
                const relatedCache = feature.get('related_cache');
                if (relatedCache) {
                    existingCircleCodes.add(relatedCache);
                }
            });
            
            // Ne générer les cercles que pour les géocaches proches (si elles sont visibles)
            if (this.nearbyLayer.getVisible()) {
                const nearbyFeatures = this.nearbySource.getFeatures();
                let newCirclesCount = 0;
                
                for (const feature of nearbyFeatures) {
                    const props = feature.getProperties();
                    const gcCode = props.gc_code || 'Unknown';
                    
                    // Vérifier si ce code a déjà un cercle
                    if (existingCircleCodes.has(gcCode)) {
                        console.log(`%c[DetailMapCtrl] Cercle déjà existant pour ${gcCode}, ignoré`, "color:orange");
                        continue;
                    }
                    
                    // Vérifier si c'est une cache traditionnelle, une cache corrigée ou si elle est marquée comme résolue
                    if (props.cache_type === 'Traditional Cache' || props.solved === true || props.is_corrected === true) {
                        const geometry = feature.getGeometry();
                        const center = geometry.getCoordinates();
                        
                        // Créer un cercle de 161m autour du point
                        this.addCircle161m(center, props);
                        newCirclesCount++;
                    }
                }
                
                console.log(`%c[DetailMapCtrl] ${newCirclesCount} nouveaux cercles de 161m générés pour les géocaches proches`, "color:green");
                console.log(`%c[DetailMapCtrl] Total: ${this.circleSource.getFeatures().length} cercles de 161m`, "color:green");
            } else {
                console.log(`%c[DetailMapCtrl] Aucun cercle généré - les géocaches proches ne sont pas visibles`, "color:orange");
            }
        }
        
        // Ajouter un cercle de 161m à une feature spécifique
        addCircle161mToFeature(feature) {
            const props = feature.getProperties();
            const gcCode = props.gc_code || 'Unknown';
            const geometry = feature.getGeometry();
            const center = geometry.getCoordinates();
            
            console.log(`%c[DetailMapCtrl] Ajout manuel d'un cercle de 161m pour ${gcCode}`, "color:green");
            
            // S'assurer que la couche de cercles est visible
            this.circleLayer.setVisible(true);
            
            // Mettre à jour l'état de la case à cocher si elle existe
            if (this.baseLayerSelector) {
                const circlesCheckbox = this.baseLayerSelector.querySelector('#show-circles-161m');
                if (circlesCheckbox) {
                    // Si nous sommes en train d'ajouter un cercle manuellement, la couche est visible
                    circlesCheckbox.checked = true;
                }
            }
            
            // Ajouter le cercle
            this.addCircle161m(center, props);
        }
        
        // Supprimer le cercle de 161m associé à une géocache spécifique
        removeCircle161mFromFeature(gcCode) {
            console.log(`%c[DetailMapCtrl] Suppression du cercle de 161m pour ${gcCode}`, "color:orange");
            
            // Trouver et supprimer le cercle correspondant
            const features = this.circleSource.getFeatures();
            const circleFeature = features.find(feature => 
                feature.get('related_cache') === gcCode
            );
            
            if (circleFeature) {
                this.circleSource.removeFeature(circleFeature);
                console.log(`%c[DetailMapCtrl] Cercle supprimé pour ${gcCode}`, "color:orange");
            } else {
                console.warn(`%c[DetailMapCtrl] Aucun cercle trouvé pour ${gcCode}`, "color:orange");
            }
        }
        
        // Ajouter un cercle de 161m autour d'un point
        addCircle161m(center, properties) {
            // Convertir les coordonnées en EPSG:4326 (WGS84, lat/lon) pour le calcul
            const centerLonLat = ol.proj.transform(center, 'EPSG:3857', 'EPSG:4326');
            
            // Utiliser la fonction de création d'un cercle géodésique
            const circle = this.createGeodesicCircle(centerLonLat[0], centerLonLat[1], 0.161); // 161m = 0.161km
            
            // Créer une feature avec le cercle
            const circleFeature = new ol.Feature({
                geometry: circle
            });
            
            // Ajouter des propriétés à la feature
            circleFeature.setProperties({
                type: '161m_circle',
                related_cache: properties.gc_code || 'Unknown',
                cache_type: properties.cache_type
            });
            
            // Ajouter la feature à la source
            this.circleSource.addFeature(circleFeature);
            
            console.log(`%c[DetailMapCtrl] Cercle de 161m ajouté pour ${properties.gc_code || 'Unknown'}`, "color:green");
        }
        
        // Créer un cercle géodésique (qui respecte la courbure de la Terre)
        createGeodesicCircle(lon, lat, radiusKm, sides = 64) {
            // Convertir le rayon en radians
            const earthRadiusKm = 6371;
            const radiusRad = radiusKm / earthRadiusKm;
            
            // Calculer les points du cercle
            const points = [];
            for (let i = 0; i <= sides; i++) {
                const angle = 2 * Math.PI * i / sides;
                
                // Formule pour calculer un point à une distance donnée sur une sphère
                const latPoint = Math.asin(
                    Math.sin(this.deg2rad(lat)) * Math.cos(radiusRad) +
                    Math.cos(this.deg2rad(lat)) * Math.sin(radiusRad) * Math.cos(angle)
                );
                
                const lonPoint = this.deg2rad(lon) + Math.atan2(
                    Math.sin(angle) * Math.sin(radiusRad) * Math.cos(this.deg2rad(lat)),
                    Math.cos(radiusRad) - Math.sin(this.deg2rad(lat)) * Math.sin(latPoint)
                );
                
                // Convertir en degrés et ajouter au tableau de points
                const pointLonLat = [this.rad2deg(lonPoint), this.rad2deg(latPoint)];
                // Convertir en coordonnées de la projection de la carte
                const pointCoords = ol.proj.fromLonLat(pointLonLat);
                points.push(pointCoords);
            }
            
            // Créer un polygone avec les points calculés
            return new ol.geom.Polygon([points]);
        }
        
        // Convertir des degrés en radians
        deg2rad(deg) {
            return deg * (Math.PI/180);
        }
        
        // Convertir des radians en degrés
        rad2deg(rad) {
            return rad * (180/Math.PI);
        }

        // Ouvrir le formulaire d'ajout de waypoint dans le composant de détails de la géocache active
        openWaypointForm(lon, lat, featureProps = null) {
            try {
                // Obtenir les informations sur le composant actif (la page détails de la géocache)
                const activeComponent = window.layoutStateManager.getActiveComponentInfo();
                
                if (!activeComponent || activeComponent.type !== 'geocache-details') {
                    console.error('%c[DetailMapCtrl] Impossible d\'ajouter un waypoint : aucun composant détail de géocache actif', "color:orange");
                    
                    // Vérifier s'il y a un composant de détail de géocache ouvert mais non actif
                    if (window.mainLayout) {
                        let detailsComponent = null;
                        // Parcourir tous les composants pour trouver un détail de géocache
                        const components = window.mainLayout.root.getItemsByType('component');
                        for (const comp of components) {
                            if (comp.config.componentName === 'geocache-details') {
                                detailsComponent = comp;
                                break;
                            }
                        }
                        
                        if (detailsComponent) {
                            // Activer ce composant
                            detailsComponent.parent.setActiveContentItem(detailsComponent);
                            console.log('%c[DetailMapCtrl] Composant de détail de géocache activé', "color:green");
                            
                            // Attendre que le composant soit activé et réessayer
                            setTimeout(() => {
                                this.openWaypointForm(lon, lat, featureProps);
                            }, 300);
                            return;
                        }
                    }
                    
                    // Notification pour informer l'utilisateur
                    const notification = document.createElement('div');
                    notification.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg z-50';
                    notification.textContent = 'Impossible d\'ajouter un waypoint : ouvrez d\'abord les détails de la géocache';
                    document.body.appendChild(notification);
                    setTimeout(() => notification.remove(), 3000);
                    
                    return;
                }
                
                // Obtenir l'ID de la géocache
                const geocacheId = activeComponent.metadata.geocacheId;
                
                if (!geocacheId) {
                    console.error('%c[DetailMapCtrl] Impossible d\'ajouter un waypoint : ID de géocache manquant', "background:red; color:white");
                    return;
                }
                
                // Ajouter un marqueur temporaire sur la carte
                const tempMarkerId = this.addTemporaryMarker(lon, lat, true); // true = waypointMarker

                // Formater les coordonnées au format geocaching
                const formattedCoords = this.formatGeoCoords(lat, lon);
                
                // Essayer d'abord la méthode par événement personnalisé
                console.log('%c[DetailMapCtrl] Tentative d\'ajout de waypoint via événement personnalisé', "color:blue");
                
                // Créer un événement personnalisé avec toutes les données nécessaires
                const waypointEvent = new CustomEvent('addWaypointFromMap', {
                    detail: {
                        geocacheId: geocacheId,
                        latitude: lat,
                        longitude: lon,
                        gcLat: formattedCoords.latitude,
                        gcLon: formattedCoords.longitude,
                        featureProps: featureProps || {},
                        tempMarkerId: tempMarkerId
                    },
                    bubbles: true
                });
                
                // Dispatcher l'événement pour que le contrôleur de formulaire puisse l'intercepter
                document.dispatchEvent(waypointEvent);
                
                // Attendre un peu pour voir si l'événement a été capturé (réponse attendue)
                setTimeout(() => {
                    // Si l'événement a été traité, il définira cette propriété globale
                    if (window.waypointEventProcessed) {
                        console.log('%c[DetailMapCtrl] Événement addWaypointFromMap traité avec succès', "color:green");
                        // Réinitialiser le flag
                        window.waypointEventProcessed = false;
                        return;
                    }
                    
                    // Si l'événement n'a pas été traité, utiliser la méthode DOM traditionnelle
                    console.log('%c[DetailMapCtrl] Événement non traité, utilisation de la méthode DOM', "color:orange");
                    this.openWaypointFormLegacy(geocacheId, lat, lon, formattedCoords, featureProps, tempMarkerId);
                }, 300); // Attendre 300ms pour voir si l'événement est traité
                
            } catch (error) {
                console.error('%c[DetailMapCtrl] Erreur lors de l\'ouverture du formulaire de waypoint:', "background:red; color:white", error);
            }
        }
        
        // Méthode traditionnelle (legacy) pour ouvrir le formulaire via manipulation DOM
        openWaypointFormLegacy(geocacheId, lat, lon, formattedCoords, featureProps = null, tempMarkerId = null) {
            try {
                console.log(`%c[DetailMapCtrl] Ouverture du formulaire legacy pour geocache ${geocacheId}`, "color:teal");
                
                // Rechercher le composant de détail de géocache contenant cette geocache
                let detailsContainer = null;
                const possibleContainers = document.querySelectorAll('.w-full.h-full');
                
                for (const container of possibleContainers) {
                    // Vérifier si ce conteneur contient un élément avec l'ID de geocache
                    const idElements = container.querySelectorAll(`[data-geocache-id="${geocacheId}"]`);
                    if (idElements.length > 0) {
                        detailsContainer = container;
                        console.log('%c[DetailMapCtrl] Conteneur de détails trouvé', "color:green");
                        break;
                    }
                }
                
                if (!detailsContainer) {
                    console.error('%c[DetailMapCtrl] Conteneur de détails non trouvé', "background:red; color:white");
                    return;
                }
                
                // Rechercher la section des waypoints
                const waypointSection = detailsContainer.querySelector('.waypoints-section');
                if (!waypointSection) {
                    console.error('%c[DetailMapCtrl] Section des waypoints non trouvée', "background:red; color:white");
                    return;
                }
                
                // Trouver le bouton "Ajouter un waypoint"
                const addButton = waypointSection.querySelector('button');
                if (!addButton) {
                    console.error('%c[DetailMapCtrl] Bouton d\'ajout de waypoint non trouvé', "background:red; color:white");
                    return;
                }
                
                // Trouver le contrôleur de formulaire
                const waypointController = waypointSection;
                if (!waypointController) {
                    console.error('%c[DetailMapCtrl] Contrôleur de formulaire non trouvé', "background:red; color:white");
                    return;
                }
                
                // Vérifier si le formulaire est déjà visible
                const form = waypointController.querySelector('[data-waypoint-form-target="form"]');
                const isFormHidden = form.classList.contains('hidden');
                
                console.log(`%c[DetailMapCtrl] État du formulaire: ${isFormHidden ? 'caché' : 'visible'}`, "color:teal");
                
                // Si le formulaire est caché, cliquer sur le bouton pour l'ouvrir
                if (isFormHidden) {
                    console.log('%c[DetailMapCtrl] Clic sur le bouton pour ouvrir le formulaire', "color:green");
                    addButton.click();
                    
                    // Attendre que le formulaire soit ouvert
                    setTimeout(() => {
                        this._fillWaypointForm(waypointController, formattedCoords, featureProps, tempMarkerId);
                    }, 300);
                } else {
                    // Le formulaire est déjà ouvert, remplir les champs directement
                    this._fillWaypointForm(waypointController, formattedCoords, featureProps, tempMarkerId);
                }
                
            } catch (error) {
                console.error('%c[DetailMapCtrl] Erreur lors de l\'ouverture du formulaire de waypoint via méthode legacy:', "background:red; color:white", error);
            }
        }
        
        // Méthode auxiliaire pour remplir le formulaire de waypoint
        _fillWaypointForm(waypointController, formattedCoords, featureProps, tempMarkerId) {
            try {
                // Obtenir les champs de lat/lon dans le formulaire
                const gcLatInput = waypointController.querySelector('[data-waypoint-form-target="gcLatInput"]');
                const gcLonInput = waypointController.querySelector('[data-waypoint-form-target="gcLonInput"]');
                const nameInput = waypointController.querySelector('[data-waypoint-form-target="nameInput"]');
                
                // Remplir les champs de coordonnées
                if (gcLatInput) {
                    gcLatInput.value = formattedCoords.latitude;
                }
                
                if (gcLonInput) {
                    gcLonInput.value = formattedCoords.longitude;
                }
                
                // Suggérer un nom de waypoint basé sur les coordonnées ou les propriétés de la feature
                if (nameInput && !nameInput.value) {
                    if (featureProps && featureProps.name && featureProps.name !== 'Point temporaire') {
                        nameInput.value = `Copie de ${featureProps.name}`;
                    } else {
                        nameInput.value = `Point à ${formattedCoords.latitude} ${formattedCoords.longitude}`;
                    }
                }
                
                // Si nous avons un waypoint existant, remplir également d'autres champs si disponibles
                if (featureProps) {
                    // Remplir le préfixe si disponible
                    const prefixInput = waypointController.querySelector('[data-waypoint-form-target="prefixInput"]');
                    if (prefixInput && featureProps.prefix) {
                        prefixInput.value = featureProps.prefix;
                    } else if (prefixInput && featureProps.gc_code && featureProps.gc_code !== 'TEMP') {
                        prefixInput.value = featureProps.gc_code;
                    }
                    
                    // Remplir la note si disponible
                    const noteInput = waypointController.querySelector('[data-waypoint-form-target="noteInput"]');
                    if (noteInput && featureProps.note) {
                        noteInput.value = featureProps.note;
                    }
                }
                
                // Faire défiler jusqu'au formulaire
                const form = waypointController.querySelector('[data-waypoint-form-target="form"]');
                if (form) {
                    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                
                // Notification pour informer l'utilisateur
                const notification = document.createElement('div');
                notification.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50';
                notification.textContent = 'Coordonnées ajoutées au formulaire de waypoint';
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 3000);
                
                console.log(`%c[DetailMapCtrl] Formulaire de waypoint rempli avec les coordonnées`, "color:green");

                // Vider le champ d'ID de waypoint (pour s'assurer qu'on crée un nouveau waypoint)
                const waypointIdInput = waypointController.querySelector('[data-waypoint-form-target="waypointIdInput"]');
                if (waypointIdInput) {
                    waypointIdInput.value = '';
                }
                
                // Stocker l'ID du marqueur temporaire si disponible
                if (tempMarkerId && window.WaypointFormController) {
                    const controller = window.application.getControllerForElementAndIdentifier(
                        waypointController, 'waypoint-form'
                    );
                    if (controller) {
                        controller.tempMarkerId = tempMarkerId;
                    }
                }
            } catch (error) {
                console.error('%c[DetailMapCtrl] Erreur lors du remplissage du formulaire de waypoint:', "background:red; color:white", error);
            }
        }

        // Gestionnaire d'événement quand un waypoint est sauvegardé
        handleWaypointSaved(event) {
            try {
                console.log('%c[DetailMapCtrl] Événement waypointSaved reçu', "color:blue", event.detail);
                
                const { waypoint, geocacheId, isNew } = event.detail;
                
                // Vérifier que c'est pour la bonne géocache
                if (geocacheId !== this.geocacheIdValue) {
                    console.log('%c[DetailMapCtrl] Événement ignoré - ID de géocache différent', "color:orange");
                    return;
                }
                
                // Vérifier que les coordonnées sont disponibles
                if (!waypoint.latitude || !waypoint.longitude) {
                    console.error('%c[DetailMapCtrl] Coordonnées manquantes pour le waypoint', "background:red; color:white");
                    return;
                }
                
                // Si un ID de marqueur temporaire est fourni, supprimer ce marqueur temporaire
                if (waypoint.tempMarkerId) {
                    const features = this.vectorSource.getFeatures();
                    const tempFeature = features.find(feature => feature.get('id') === waypoint.tempMarkerId);
                    
                    if (tempFeature) {
                        this.vectorSource.removeFeature(tempFeature);
                        console.log('%c[DetailMapCtrl] Marqueur temporaire supprimé', "color:orange");
                    }
                }
                
                // Définir les propriétés du waypoint
                const waypointProps = {
                    id: waypoint.id,
                    gc_code: waypoint.lookup || waypoint.prefix || 'WP',
                    name: waypoint.name || 'Waypoint',
                    cache_type: 'Waypoint',
                    difficulty: null,
                    terrain: null,
                    size: null,
                    solved: null,
                    latitude: waypoint.latitude,
                    longitude: waypoint.longitude,
                    gc_lat: waypoint.gc_lat,
                    gc_lon: waypoint.gc_lon,
                    note: waypoint.note,
                    is_corrected: false,
                    prefix: waypoint.prefix,
                    lookup: waypoint.lookup
                };
                
                // Ajouter ou mettre à jour le waypoint sur la carte
                if (isNew) {
                    // Ajouter un nouveau waypoint
                    this.addFeature(waypoint.longitude, waypoint.latitude, waypointProps);
                    console.log('%c[DetailMapCtrl] Nouveau waypoint ajouté à la carte', "color:green");
                } else {
                    // Mettre à jour un waypoint existant
                    // Chercher s'il existe déjà une feature pour ce waypoint
                    const features = this.vectorSource.getFeatures();
                    const existingFeature = features.find(feature => 
                        feature.get('id') === waypoint.id && 
                        feature.get('cache_type') === 'Waypoint'
                    );
                    
                    if (existingFeature) {
                        // Mettre à jour la position de la feature existante
                        existingFeature.setGeometry(new ol.geom.Point(
                            ol.proj.fromLonLat([waypoint.longitude, waypoint.latitude])
                        ));
                        
                        // Mettre à jour les propriétés
                        for (const [key, value] of Object.entries(waypointProps)) {
                            existingFeature.set(key, value);
                        }
                        
                        console.log('%c[DetailMapCtrl] Waypoint existant mis à jour sur la carte', "color:green");
                    } else {
                        // Créer une nouvelle feature car elle n'existe pas
                        this.addFeature(waypoint.longitude, waypoint.latitude, waypointProps);
                        console.log('%c[DetailMapCtrl] Waypoint ajouté à la carte (mise à jour non trouvée)', "color:green");
                    }
                }
                
                // Notification pour informer l'utilisateur
                const notification = document.createElement('div');
                notification.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50';
                notification.textContent = isNew ? 'Nouveau waypoint ajouté sur la carte' : 'Waypoint mis à jour sur la carte';
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 3000);
                
            } catch (error) {
                console.error('%c[DetailMapCtrl] Erreur lors du traitement de l\'événement waypointSaved:', "background:red; color:white", error);
            }
        }

        // === MÉTHODE AMÉLIORÉE : supprimer tous les points calculés ===
        clearCalculatedPoints() {
            console.log('[MAP] Tentative de suppression des points calculés précédents');
            
            if (!this.vectorSource || !this.map) {
                console.log('[MAP] Aucune source vectorielle ou carte disponible');
                return;
            }
            
            // Recherche toutes les features avec l'attribut "calculatedPoint" en utilisant un ID spécifique
            const calculatedFeatures = [];
            this.vectorSource.getFeatures().forEach(feature => {
                // Vérifier différentes façons dont la propriété pourrait être stockée
                const directProp = feature.get('calculatedPoint');
                const properties = feature.get('properties');
                const nestedProp = properties ? properties.calculatedPoint : false;
                
                console.log('[MAP] Feature trouvée:', {
                    id: feature.getId(),
                    directProp,
                    nestedProp,
                    properties
                });
                
                if (directProp === true || nestedProp === true) {
                    calculatedFeatures.push(feature);
                }
            });
            
            console.log(`[MAP] ${calculatedFeatures.length} point(s) calculé(s) trouvé(s) pour suppression`);
            
            // Supprimer chaque feature calculée
            calculatedFeatures.forEach(feature => {
                console.log('[MAP] Suppression de la feature:', feature.getId());
                this.vectorSource.removeFeature(feature);
            });
        }
        
        // Gestionnaire pour effacer explicitement les points calculés
        handleClearCalculatedPoints() {
            console.log('[MAP] Demande explicite de suppression des points calculés');
            this.clearCalculatedPoints();
        }

        // === MÉTHODE AMÉLIORÉE : gérer l'ajout d'un point calculé ===
        handleAddCalculatedPoint(event) {
            console.log('[MAP] Réception d\'un événement pour ajouter un point calculé');
            const { latitude, longitude, label, color } = event.detail;
            
            // Supprimer d'abord tous les points calculés précédents
            this.clearCalculatedPoints();
            
            // Convertir les coordonnées décimales en format DDM
            const ddmCoords = this.decimalToDDM(latitude, longitude);
            console.log('[MAP] Coordonnées converties:', ddmCoords);
            
            // Créer un ID unique pour ce point
            const pointId = `calculated-point-${Date.now()}`;
            
            // Ajouter le nouveau point avec un marqueur spécial et un ID unique
            const feature = this.addFeature(longitude, latitude, {
                name: "Coordonnées calculées",
                cache_type: "TempPoint",
                temp_marker: true,
                calculatedPoint: true, // Marqueur pour identifier ce point
                latitude,
                longitude,
                color: color || 'rgba(0, 90, 220, 0.8)', // Bleu par défaut
                // Coordonnées formatées pour l'infobulle
                gc_lat: ddmCoords.latitude,
                gc_lon: ddmCoords.longitude,
                // Spécifique au point calculé
                isCalculatedPoint: true,
                calculatedAt: new Date().toLocaleTimeString()
            });
            
            // Définir les propriétés directement sur la feature pour être sûr
            if (feature) {
                feature.setId(pointId);
                feature.set('calculatedPoint', true);
                feature.set('gc_lat', ddmCoords.latitude);
                feature.set('gc_lon', ddmCoords.longitude);
                feature.set('isCalculatedPoint', true);
                console.log('[MAP] Nouveau point calculé ajouté avec ID:', pointId);
            }
            
            // Centrer la carte sur ce point
            if (this.map) {
                this.map.getView().setCenter(ol.proj.fromLonLat([longitude, latitude]));
                this.map.getView().setZoom(15);
            }
        }
        
        // === NOUVELLE MÉTHODE : gérer l'ajout de plusieurs points calculés ===
        handleAddMultipleCalculatedPoints(event) {
            console.log('[MAP] Réception d\'un événement pour ajouter plusieurs points calculés');
            const { points, batchId } = event.detail;
            
            if (!points || points.length === 0) {
                console.log('[MAP] Aucun point valide à ajouter');
                return;
            }
            
            console.log(`[MAP] Préparation de l'ajout de ${points.length} points (batchId: ${batchId})`);
            
            // Supprimer d'abord tous les points calculés précédents
            this.clearCalculatedPoints();
            
            // Créer un marqueur invisible dans le DOM pour indiquer que les points de ce lot ont été ajoutés
            const marker = document.createElement('div');
            marker.style.display = 'none';
            marker.dataset.batchId = batchId;
            document.body.appendChild(marker);
            
            // Collecter toutes les coordonnées pour centrer la carte
            const allCoords = [];
            
            // Ajouter chaque point
            points.forEach((point, index) => {
                const { latitude, longitude, label, color, index: pointIndex } = point;
                
                // Convertir les coordonnées décimales en format DDM
                const ddmCoords = this.decimalToDDM(latitude, longitude);
                
                // Créer un ID unique pour ce point
                const pointId = `calculated-point-${batchId}-${index}`;
                
                // Collecter les coordonnées pour le centrage
                allCoords.push([longitude, latitude]);
                
                // Ajouter le nouveau point avec un marqueur spécial et un ID unique
                const feature = this.addFeature(longitude, latitude, {
                    name: label || `Point calculé ${pointIndex || (index + 1)}`,
                    cache_type: "TempPoint",
                    temp_marker: true,
                    calculatedPoint: true,
                    isMultiPoint: true, // Marquer comme faisant partie d'un ensemble de points
                    latitude,
                    longitude,
                    color: color || 'rgba(0, 90, 220, 0.8)', // Bleu pour les points multiples
                    gc_lat: ddmCoords.latitude,
                    gc_lon: ddmCoords.longitude,
                    isCalculatedPoint: true,
                    calculatedAt: new Date().toLocaleTimeString(),
                    batchId: batchId,
                    pointIndex: pointIndex || (index + 1),
                    strokeColor: point.strokeColor || this.getColorForIndex(index) // Couleur de bordure unique
                });
                
                // Définir les propriétés directement sur la feature
                if (feature) {
                    feature.setId(pointId);
                    feature.set('calculatedPoint', true);
                    feature.set('gc_lat', ddmCoords.latitude);
                    feature.set('gc_lon', ddmCoords.longitude);
                    feature.set('isCalculatedPoint', true);
                    feature.set('batchId', batchId);
                    console.log(`[MAP] Point calculé #${index + 1} ajouté avec ID: ${pointId}`);
                }
            });
            
            // Centrer et zoomer la carte pour montrer tous les points
            if (this.map && allCoords.length > 0) {
                // Si un seul point, centrer dessus
                if (allCoords.length === 1) {
                    this.map.getView().setCenter(ol.proj.fromLonLat(allCoords[0]));
                    this.map.getView().setZoom(15);
                } else {
                    // Créer une étendue englobant tous les points
                    const extent = ol.extent.createEmpty();
                    allCoords.forEach(coord => {
                        ol.extent.extend(extent, [
                            ...ol.proj.fromLonLat(coord),
                            ...ol.proj.fromLonLat(coord)
                        ]);
                    });
                    
                    // Ajouter une marge à l'étendue
                    const padding = [50, 50, 50, 50]; // Marge en pixels
                    this.map.getView().fit(extent, {
                        padding: padding,
                        maxZoom: 15
                    });
                }
            }
            
            console.log(`[MAP] ${points.length} points ajoutés avec succès (batchId: ${batchId})`);
        }
        
        // Convertir des coordonnées décimales en format DDM (degrés, minutes décimales)
        decimalToDDM(latitude, longitude) {
            // Fonction pour formater un nombre avec un nombre fixe de décimales
            const formatDec = (num, decimals) => {
                return num.toFixed(decimals);
            };
            
            // Fonction pour ajouter des zéros en préfixe
            const padZero = (num, length) => {
                return String(num).padStart(length, '0');
            };
            
            // Convertir la latitude
            const latAbs = Math.abs(latitude);
            const latDeg = Math.floor(latAbs);
            const latMin = (latAbs - latDeg) * 60;
            const latDir = latitude >= 0 ? 'N' : 'S';
            
            // Convertir la longitude
            const lonAbs = Math.abs(longitude);
            const lonDeg = Math.floor(lonAbs);
            const lonMin = (lonAbs - lonDeg) * 60;
            const lonDir = longitude >= 0 ? 'E' : 'W';
            
            // Formater selon le standard DD° MM.MMM
            return {
                latitude: `${latDir}${padZero(latDeg, 2)}° ${padZero(formatDec(latMin, 3), 2)}.${formatDec(latMin, 3).split('.')[1]}`,
                longitude: `${lonDir}${padZero(lonDeg, 3)}° ${padZero(formatDec(lonMin, 3), 2)}.${formatDec(lonMin, 3).split('.')[1]}`
            };
        }

        // Gérer l'ouverture du formulaire de waypoint avec des données externes
        handleOpenWaypointFormWithData(event) {
            const formData = event.detail;
            
            if (!formData || !formData.geocacheId || !formData.gcLat || !formData.gcLon) {
                console.error("Données du waypoint incomplètes:", formData);
                return;
            }
            
            // Vérifier que cette carte est associée à la même géocache
            if (this.geocacheIdValue && this.geocacheIdValue != formData.geocacheId) {
                console.log("Cette carte n'est pas associée à la géocache demandée");
                
                // Si nous avons un mainLayout, nous pouvons tenter d'ouvrir un nouveau composant
                if (window.mainLayout) {
                    // Chercher un composant de carte de géocache existant
                    let foundComponent = false;
                    const components = window.mainLayout.root.getItemsByType('component');
                    for (const comp of components) {
                        if (comp.config.componentName === 'geocache-map' && 
                            comp.config.componentState && 
                            comp.config.componentState.geocacheId == formData.geocacheId) {
                            
                            // Envoyer un événement à ce composant
                            const targetEvent = new CustomEvent('openWaypointFormWithData', {
                                detail: formData
                            });
                            window.dispatchEvent(targetEvent);
                            
                            // Activer cet onglet
                            comp.parent.setActiveContentItem(comp);
                            foundComponent = true;
                            break;
                        }
                    }
                    
                    // Si aucun composant n'est trouvé, ouvrir un nouvel onglet avec la carte
                    if (!foundComponent) {
                        console.log("Ouverture d'une nouvelle carte pour la géocache", formData.geocacheId);
                        // Logique pour ouvrir une nouvelle carte
                    }
                }
                return;
            }
            
            // Créer un objet temporaire pour stocker les propriétés du formulaire
            const featureProps = {
                name: formData.name || "Point calculé",
                prefix: formData.prefix || "FS",
                note: formData.note || "Point ajouté depuis Formula Solver"
            };
            
            // Extraire les coordonnées décimales si disponibles, sinon convertir depuis le format GC
            let lat, lon;
            
            if (formData.lat && formData.lon) {
                lat = parseFloat(formData.lat);
                lon = parseFloat(formData.lon);
            } else if (formData.gcLat && formData.gcLon) {
                // Convertir depuis le format GC vers décimal
                try {
                    const coords = this.convertGCCoordsToDecimal(formData.gcLat, formData.gcLon);
                    lat = coords.lat;
                    lon = coords.lon;
                } catch (error) {
                    console.error("Erreur de conversion des coordonnées:", error);
                    return;
                }
            } else {
                console.error("Aucune coordonnée valide fournie");
                return;
            }
            
            // Ouvrir le formulaire de waypoint avec ces coordonnées
            this.openWaypointForm(lon, lat, featureProps);
        }
        
        // Fonction pour convertir les coordonnées GC en décimal
        convertGCCoordsToDecimal(gcLat, gcLon) {
            try {
                // Traiter la latitude
                const latRegex = /([NS])[\s]*(\d+)°[\s]*(\d+\.\d+)/;
                const latMatch = gcLat.match(latRegex);
                
                if (!latMatch) {
                    throw new Error("Format de latitude non reconnu: " + gcLat);
                }
                
                const latDir = latMatch[1];
                const latDeg = parseInt(latMatch[2]);
                const latMin = parseFloat(latMatch[3]);
                
                // Traiter la longitude
                const lonRegex = /([EW])[\s]*(\d+)°[\s]*(\d+\.\d+)/;
                const lonMatch = gcLon.match(lonRegex);
                
                if (!lonMatch) {
                    throw new Error("Format de longitude non reconnu: " + gcLon);
                }
                
                const lonDir = lonMatch[1];
                const lonDeg = parseInt(lonMatch[2]);
                const lonMin = parseFloat(lonMatch[3]);
                
                // Convertir en decimal
                let lat = latDeg + (latMin / 60);
                if (latDir === 'S') lat = -lat;
                
                let lon = lonDeg + (lonMin / 60);
                if (lonDir === 'W') lon = -lon;
                
                return { lat, lon };
            } catch (error) {
                console.error("Erreur lors de la conversion des coordonnées:", error);
                throw error;
            }
        }

        addCalculatedPointToMap(event) {
            console.log('[MAP] Réception d\'un événement pour ajouter un point calculé');
            
            // Supprimer les points calculés précédents
            this.removeCalculatedPoints();
            
            const detail = event.detail;
            
            if (!detail || !detail.latitude || !detail.longitude) {
                console.error('[MAP] Erreur: Coordonnées calculées manquantes dans l\'événement');
                return;
            }
            
            // Convertir les coordonnées dans le format attendu par MapLibre
            const convertedCoords = this.convertLatLongToDMS(detail.latitude, detail.longitude);
            console.log('[MAP] Coordonnées converties:', convertedCoords);
            
            // Créer un ID unique pour ce point calculé
            const pointId = 'calculated-point-' + Date.now();
            
            // Ajouter une feature pour le point calculé
            this.map.addSource(pointId, {
                'type': 'geojson',
                'data': {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [detail.longitude, detail.latitude]
                    },
                    'properties': {
                        'id': pointId,
                        'label': detail.label || 'Coordonnées calculées'
                    }
                }
            });
            
            // Vérifier si nous avons des propriétés de style étendues
            const fillColor = detail.fillColor || detail.color || 'rgba(0, 90, 220, 0.7)'; // Bleu par défaut
            const strokeColor = detail.strokeColor || '#FFFFFF'; // Blanc par défaut
            const strokeWidth = detail.strokeWidth || 2; // Largeur par défaut
            
            // Ajouter une couche pour le point avec les styles personnalisés
            this.map.addLayer({
                'id': pointId,
                'type': 'circle',
                'source': pointId,
                'paint': {
                    'circle-radius': 12, // Rayon plus grand
                    'circle-color': fillColor,
                    'circle-stroke-width': strokeWidth,
                    'circle-stroke-color': strokeColor,
                    'circle-opacity': 0.8
                }
            });
            
            // Ajouter une couche de texte pour l'étiquette si elle existe
            if (detail.label) {
                this.map.addLayer({
                    'id': pointId + '-label',
                    'type': 'symbol',
                    'source': pointId,
                    'layout': {
                        'text-field': detail.label,
                        'text-font': ['Open Sans Regular'],
                        'text-size': 12,
                        'text-offset': [0, 1.5],
                        'text-anchor': 'top'
                    },
                    'paint': {
                        'text-color': '#000000',
                        'text-halo-color': '#FFFFFF',
                        'text-halo-width': 2
                    }
                });
            }
            
            // Enregistrer l'ID du point calculé
            this.calculatedPoints.push(pointId);
            if (detail.label) {
                this.calculatedPoints.push(pointId + '-label');
            }
            
            console.log('[MAP] Nouveau point calculé ajouté avec ID:', pointId);
            
            // Centrer la carte sur le nouveau point
            this.map.flyTo({
                center: [detail.longitude, detail.latitude],
                zoom: 15,
                duration: 1000
            });
        }
        
        // Gestionnaire pour ajouter plusieurs points calculés sans effacer les précédents
        addMultipleCalculatedPointsToMap(event) {
            console.log('[MAP] Réception d\'un événement pour ajouter plusieurs points calculés');
            
            const detail = event.detail;
            if (!detail || !detail.points || !Array.isArray(detail.points) || detail.points.length === 0) {
                console.error('[MAP] Erreur: Aucun point valide dans l\'événement');
                return;
            }
            
            // Récupérer les points et l'ID de lot
            const points = detail.points;
            const batchId = detail.batchId || Date.now();
            
            console.log(`[MAP] Ajout de ${points.length} points (batchId: ${batchId})`);
            
            // Nettoyer les points calculés précédents
            this.clearCalculatedPoints();
            
            // Créer une étendue vide pour le cadrage automatique
            const extent = ol.extent.createEmpty();
            
            // Pour chaque point, créer une feature OpenLayers
            points.forEach((point, index) => {
                if (!point.latitude || !point.longitude) {
                    console.warn(`[MAP] Point ${index} invalide, ignoré`);
                    return;
                }
                
                // Créer un ID unique pour ce point
                const pointId = `calculated-point-${batchId}-${index}`;
                
                // Convertir les coordonnées en format OpenLayers
                const coordinates = ol.proj.fromLonLat([point.longitude, point.latitude]);
                
                // Étendre les limites pour inclure ce point
                ol.extent.extend(extent, [...coordinates, ...coordinates]);
                
                // Créer la feature
                const feature = new ol.Feature({
                    geometry: new ol.geom.Point(coordinates)
                });
                
                // Ajouter les propriétés à la feature
                feature.setProperties({
                    id: pointId,
                    gc_code: `Point ${index + 1}`,
                    name: point.label || `Point ${index + 1}`,
                    cache_type: 'TempPoint',
                    difficulty: null,
                    terrain: null,
                    size: null,
                    solved: null,
                    latitude: point.latitude,
                    longitude: point.longitude,
                    temp_marker: true,
                    calculatedPoint: true,
                    isMultiPoint: true,
                    fillColor: point.fillColor,
                    strokeColor: point.strokeColor || this.getColorForIndex(index),
                    strokeWidth: point.strokeWidth,
                    pointIndex: point.index || (index + 1),
                    batchId: batchId,
                    label: point.label
                });
                
                // Définir un style personnalisé pour cette feature
                feature.setStyle(new ol.style.Style({
                    image: new ol.style.RegularShape({
                        radius: 10, // Plus grand rayon
                        points: 4, // Carré pour faire un losange avec l'angle
                        angle: Math.PI / 4, // 45 degrés pour faire un losange
                        fill: new ol.style.Fill({
                            color: point.fillColor || 'rgba(0, 90, 220, 0.8)' // Bleu pour les points multiples
                        }),
                        stroke: new ol.style.Stroke({
                            color: point.strokeColor || this.getColorForIndex(index),
                            width: point.strokeWidth || 2
                        })
                    }),
                    text: point.label ? new ol.style.Text({
                        text: (point.index || (index + 1)).toString(), // Numéro du point comme icône
                        font: 'bold 12px sans-serif',
                        fill: new ol.style.Fill({color: '#ffffff'}),
                        stroke: new ol.style.Stroke({color: '#000000', width: 1}),
                        offsetY: 0
                    }) : new ol.style.Text({
                        text: (point.index || (index + 1)).toString(), // Toujours afficher le numéro
                        font: 'bold 10px sans-serif',
                        fill: new ol.style.Fill({color: '#ffffff'}),
                        stroke: new ol.style.Stroke({color: '#000000', width: 1}),
                        offsetY: 0
                    })
                }));
                
                // Ajouter la feature à la source vectorielle
                this.vectorSource.addFeature(feature);
                console.log(`[MAP] Point calculé #${index + 1} ajouté avec ID: ${pointId}`);
                
                // Stocker l'ID pour la gestion future
                this.calculatedPoints.push(feature);
            });
            
            // Ajuster la vue pour voir tous les points si l'étendue n'est pas vide
            if (!ol.extent.isEmpty(extent)) {
                this.map.getView().fit(extent, {
                    padding: [50, 50, 50, 50],
                    duration: 1000
                });
            }
            
            console.log(`[MAP] ${points.length} points ajoutés avec succès (batchId: ${batchId})`);
        }
        
        // Nettoyer les points calculés
        clearCalculatedPoints() {
            console.log('[MAP] Nettoyage des points calculés');
            
            // Récupérer toutes les features
            const features = this.vectorSource.getFeatures();
            
            // Filtrer les features pour obtenir uniquement les points calculés
            const calculatedFeatures = features.filter(feature => 
                feature.get('calculatedPoint') === true
            );
            
            console.log(`[MAP] ${calculatedFeatures.length} points calculés trouvés pour suppression`);
            
            // Supprimer chaque feature calculée
            calculatedFeatures.forEach(feature => {
                this.vectorSource.removeFeature(feature);
            });
            
            // Vider le tableau des points calculés
            this.calculatedPoints = [];
        }

        // Méthode pour supprimer les points calculés précédents
        removeCalculatedPoints() {
            console.log('[MAP] Suppression des points calculés précédents');
            
            // Vérifier si la liste des points calculés existe
            if (!this.calculatedPoints) {
                this.calculatedPoints = [];
                return;
            }
            
            // Supprimer chaque couche et source associée aux points calculés
            this.calculatedPoints.forEach(id => {
                if (this.map.getLayer(id)) {
                    this.map.removeLayer(id);
                }
                if (this.map.getSource(id)) {
                    this.map.removeSource(id);
                }
            });
            
            // Vider la liste des points calculés
            this.calculatedPoints = [];
        }

        // Génère une couleur unique basée sur l'index du point
        getColorForIndex(index) {
            // Palette de couleurs pour différencier les points
            const colors = [
                '#FF0000', // Rouge
                '#00FF00', // Vert
                '#0000FF', // Bleu
                '#FFFF00', // Jaune
                '#FF00FF', // Magenta
                '#00FFFF', // Cyan
                '#FF8000', // Orange
                '#8000FF', // Violet
                '#0080FF', // Bleu clair
                '#FF0080', // Rose
            ];
            
            // Utiliser l'index pour sélectionner une couleur, avec bouclage si nécessaire
            return colors[index % colors.length];
        }
    }

    // Enregistrer le contrôleur Stimulus globalement
    if (window.StimulusApp) {
        try {
            window.StimulusApp.register('detail-geocache-map', window.DetailGeocacheMapController);
            console.log('%c[DetailMapCtrl] Contrôleur "detail-geocache-map" enregistré.', "color:teal");
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement du contrôleur Detail Geocache Map:', error);
        }
    } else {
        console.warn('StimulusApp non trouvé. Assurez-vous qu\'il est initialisé avant d\'enregistrer les contrôleurs.');
    }
})();
