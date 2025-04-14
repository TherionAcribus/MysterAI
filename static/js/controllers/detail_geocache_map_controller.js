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
            console.log('%c[DetailMapCtrl] Contrôleur connecté pour la géocache:', "color:teal", this.geocacheIdValue);
            if (this.hasGeocacheIdValue) {
                this.initializeMap();
            } else {
                console.error('%c[DetailMapCtrl] Erreur: geocacheIdValue manquant', "background:red; color:white");
            }
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
            this.contextMenu = document.createElement('div');
            this.contextMenu.className = 'absolute bg-white shadow-lg rounded-lg p-2 z-[1002]';
            this.contextMenu.style.cssText = 'display: none; background-color: white; color: black; min-width: 200px; border: 1px solid #ccc;';
            document.body.appendChild(this.contextMenu);
            
            // Fermer le menu contextuel lors d'un clic ailleurs
            document.addEventListener('click', () => {
                this.contextMenu.style.display = 'none';
            });
            
            // Rendre la couche de cercles visible par défaut
            this.circleLayer.setVisible(true);
        }
        
        // Gérer le clic droit sur la carte
        handleRightClick(evt) {
            evt.preventDefault(); // Empêcher le menu contextuel du navigateur
            
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
                    ${hasCircle ? 
                        `<div class="p-2 cursor-pointer hover:bg-gray-100 border-t border-gray-200" data-action="remove-circle" data-gc-code="${props.gc_code}">
                            <i class="fas fa-circle-minus mr-2"></i> Supprimer le cercle de 161m
                        </div>` : 
                        `<div class="p-2 cursor-pointer hover:bg-gray-100 border-t border-gray-200" data-action="add-circle" data-gc-code="${props.gc_code}">
                            <i class="fas fa-circle-plus mr-2"></i> Ajouter un cercle de 161m
                        </div>`
                    }
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
            } else {
                // Gestionnaires pour le menu standard (sans point)
                this.contextMenu.querySelector('[data-action="add-marker"]').addEventListener('click', () => {
                    this.addTemporaryMarker(this.rightClickCoords.lonLat[0], this.rightClickCoords.lonLat[1]);
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
        addTemporaryMarker(lon, lat) {
            // Créer un ID unique pour ce marqueur temporaire
            const tempMarkerId = `temp-marker-${Date.now()}`;
            
            // Vérifier s'il y a déjà un marqueur temporaire et le supprimer
            const existingFeatures = this.vectorSource.getFeatures();
            existingFeatures.forEach(feature => {
                if (feature.get('temp_marker') === true) {
                    this.vectorSource.removeFeature(feature);
                }
            });
            
            // Créer une nouvelle feature pour le marqueur temporaire
            const tempFeature = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
                name: 'Point temporaire',
                temp_marker: true, // Marquer comme temporaire
                id: tempMarkerId,
                gc_code: 'TEMP',
                cache_type: 'TempPoint',
                latitude: lat,
                longitude: lon
            });
            
            // Ajouter la feature à la source vectorielle
            this.vectorSource.addFeature(tempFeature);
            
            console.log(`%c[DetailMapCtrl] Marqueur temporaire ajouté (${lat.toFixed(6)}, ${lon.toFixed(6)})`, "color:green");
            
            return tempMarkerId;
        }

        // Formater les coordonnées au format géocaching
        formatGeoCoords(lat, lon) {
            // Formatter la latitude
            const latDir = lat >= 0 ? 'N' : 'S';
            lat = Math.abs(lat);
            const latDeg = Math.floor(lat);
            const latMinDec = (lat - latDeg) * 60;
            const latMin = Math.floor(latMinDec);
            const latSec = ((latMinDec - latMin) * 60).toFixed(3);
            
            // Formatter la longitude
            const lonDir = lon >= 0 ? 'E' : 'W';
            lon = Math.abs(lon);
            const lonDeg = Math.floor(lon);
            const lonMinDec = (lon - lonDeg) * 60;
            const lonMin = Math.floor(lonMinDec);
            const lonSec = ((lonMinDec - lonMin) * 60).toFixed(3);
            
            return {
                latitude: `${latDir} ${latDeg}° ${latMin}' ${latSec}"`,
                longitude: `${lonDir} ${lonDeg}° ${lonMin}' ${lonSec}"`
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
                const feature = new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat]))
                });
                // Attribuer toutes les propriétés à la feature pour le style et le popup
                feature.setProperties(properties, true);
                // Définir explicitement l'ID de la feature si disponible (utile pour la mise à jour)
                if (properties.id) {
                    feature.setId(properties.id);
                }
                this.vectorSource.addFeature(feature);
                console.log(`%c[DetailMapCtrl] Feature ajoutée: ${properties.gc_code || properties.name || 'Point'}`, "color:green", properties);
            } catch (e) {
                console.error("Erreur lors de l'ajout de la feature", e, {lon, lat, properties});
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
