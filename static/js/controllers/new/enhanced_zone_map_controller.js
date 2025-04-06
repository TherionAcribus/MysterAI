// Enhanced Zone Map Controller avec support Multi Solver
console.log("=== DEBUG: Preparing Enhanced Zone Map Controller ===");

(() => {
    // S'assurer que Stimulus est disponible globalement
    if (!window.Stimulus) {
        console.error("Stimulus n'est pas disponible globalement");
        return;
    }
    
    class EnhancedZoneMapController extends Stimulus.Controller {
        static targets = ["container", "popup", "popupContent"]
        static values = {
            zoneId: String,
            geocacheId: String,
            isMultiSolver: Boolean,
            multiSolverId: String
        }

        // Méthode de débogage - Affiche les informations importantes sur le contrôleur
        debug(message = "Debug Info") {
            console.group(`🔍 ${message} - EnhancedZoneMapController`);
            
            // Informations sur l'élément du contrôleur
            console.log("Élément:", this.element);
            console.log("ID de l'élément:", this.element?.id || "non défini");
            console.log("Dimensions:", {
                width: this.element?.clientWidth,
                height: this.element?.clientHeight
            });
            
            // Informations sur les cibles
            console.log("Cible container:", this.hasContainerTarget ? "présente" : "absente");
            console.log("Cible popup:", this.hasPopupTarget ? "présente" : "absente");
            console.log("Cible popupContent:", this.hasPopupContentTarget ? "présente" : "absente");
            
            // Informations sur les valeurs
            console.log("Zone ID:", this.zoneIdValue || "non définie");
            console.log("Geocache ID:", this.geocacheIdValue || "non définie");
            console.log("Is Multi Solver:", this.isMultiSolverValue || false);
            console.log("Multi Solver ID:", this.multiSolverIdValue || "non définie");
            
            // État actuel
            console.log("Carte initialisée:", this.map ? "oui" : "non");
            console.log("Marqueurs:", this.markers?.length || 0);
            
            console.groupEnd();
        }

        connect() {
            try {
                console.log("Initialisation de la carte améliorée");
                
                // Déboguer l'état initial
                this.debug("Connexion initiale");
                
                // Vérifier que l'élément du contrôleur existe
                if (!this.element) {
                    console.error("Élément du contrôleur 'zone-map' introuvable");
                    return;
                }
                
                // Vérifier que la bibliothèque OpenLayers est disponible
                if (typeof ol === 'undefined') {
                    console.error("La bibliothèque OpenLayers (ol) n'est pas chargée");
                    
                    // Ajouter un message d'erreur directement dans l'élément
                    this.element.innerHTML = `
                        <div class="p-4 bg-red-100 text-red-800 rounded">
                            <p class="font-bold">Erreur de chargement de la carte</p>
                            <p>La bibliothèque OpenLayers (ol) n'est pas chargée.</p>
                        </div>
                    `;
                    return;
                }
                
                // S'assurer que l'élément a une taille suffisante
                if (this.element.clientWidth === 0 || this.element.clientHeight === 0) {
                    console.warn("L'élément du contrôleur a une taille nulle, définition d'une hauteur minimale");
                    this.element.style.minHeight = '300px';
                }
                
                // Initialiser les tableaux pour stocker les marqueurs et les popups
                this.markers = [];
                this.popups = [];
                
                // Créer la carte OpenLayers
                this.initMap();
                
                // Configurer la gestion des événements de la carte
                this.setupEventListeners();
                
                // Si un ID de Multi Solver est défini, charger ses géocaches
                if (this.multiSolverIdValue) {
                    this.loadMultiSolverGeocaches(this.multiSolverIdValue);
                }
                
                // Indiquer que la carte est prête
                this.mapReady = true;
                console.log("Carte améliorée initialisée avec succès");
            } catch (error) {
                console.error("Erreur lors de l'initialisation de la carte améliorée:", error);
                this.notifyError("Erreur lors de l'initialisation de la carte");
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
        
        initMap() {
            try {
                // Vérifier si la bibliothèque OpenLayers est disponible
                if (typeof ol === 'undefined') {
                    throw new Error("La bibliothèque OpenLayers (ol) n'est pas chargée");
                }
                
                // Vérifier si nous avons un élément conteneur valide
                let targetElement = null;
                
                // Essayer d'abord d'utiliser la cible définie par Stimulus
                if (this.hasContainerTarget) {
                    targetElement = this.containerTarget;
                }
                // Sinon, utiliser l'élément du contrôleur lui-même
                else {
                    targetElement = this.element;
                    console.warn("Cible 'container' non trouvée, utilisation de l'élément du contrôleur à la place");
                }
                
                // Créer les contrôles de base en fonction de la version d'OpenLayers
                let defaultControls = [];
                let additionalControls = [];
                
                // Vérifier la syntaxe à utiliser pour les contrôles selon la version
                if (ol.control && typeof ol.control.defaults === 'function') {
                    // Version plus récente d'OpenLayers
                    defaultControls = ol.control.defaults();
                    
                    // Ajouter des contrôles supplémentaires si disponibles
                    if (ol.control.ScaleLine) additionalControls.push(new ol.control.ScaleLine());
                    if (ol.control.FullScreen) additionalControls.push(new ol.control.FullScreen());
                    if (ol.control.ZoomToExtent) additionalControls.push(new ol.control.ZoomToExtent());
                } else {
                    // Version plus ancienne ou différente
                    if (ol.control && ol.control.Zoom) additionalControls.push(new ol.control.Zoom());
                    if (ol.control && ol.control.Attribution) additionalControls.push(new ol.control.Attribution());
                    if (ol.control && ol.control.ScaleLine) additionalControls.push(new ol.control.ScaleLine());
                }
                
                // Créer la carte OpenLayers
                this.map = new ol.Map({
                    target: targetElement,
                    controls: [...defaultControls, ...additionalControls],
                    layers: [
                        // Couche de base OSM
                        new ol.layer.Tile({
                            source: new ol.source.OSM(),
                            name: 'osm-base'
                        })
                    ],
                    view: new ol.View({
                        center: ol.proj.fromLonLat([2.3522, 48.8566]), // Paris par défaut
                        zoom: 10
                    })
                });

                // Créer la source vectorielle et la couche pour les marqueurs
                this.initVectorLayer();
                
                // Ajouter des interactions pour la sélection des marqueurs
                this.addSelectInteraction();
                
                console.log("Carte OpenLayers créée");
            } catch (error) {
                console.error("Erreur lors de la création de la carte:", error);
                throw error;
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
            
            const pixel = this.map.getPixelFromCoordinate(coordinates);
            if (!pixel) return;
            
            this.popupElement.innerHTML = `
                <div class="font-bold mb-1 text-black">${title}</div>
                <div class="font-mono text-sm text-black">${content}</div>
            `;
            
            const mapElement = this.map.getTargetElement();
            const rect = mapElement.getBoundingClientRect();
            const x = rect.left + pixel[0];
            const y = rect.top + pixel[1] - 10; // Décalage vers le haut pour éviter de chevaucher le point
            
            this.popupElement.style.left = `${x}px`;
            this.popupElement.style.top = `${y}px`;
            this.popupElement.style.display = 'block';
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
                console.log('Loading coordinates for geocache:', this.geocacheIdValue);
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
                console.log('=== DEBUG: Chargement des géocaches de la zone', this.zoneIdValue);
                const response = await fetch(`/api/zones/${this.zoneIdValue}/geocaches`);
                const geocaches = await response.json();
                console.log('Géocaches chargées:', geocaches);

                // Clear existing markers
                this.clearMarkers();

                // Add markers for each geocache
                geocaches.forEach(geocache => {
                    if (geocache.latitude && geocache.longitude) {
                        this.addMarkerWithGeocache(geocache);
                    }
                });

                // Fit view to show all markers
                this.fitMapToMarkers();
            } catch (error) {
                console.error('Erreur lors du chargement des géocaches:', error);
            }
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
            try {
                if (!geocache || !geocache.gc_code) {
                    console.error("Données de géocache invalides pour l'ajout du marqueur");
                    return null;
                }
                
                // Vérifier que nous avons des coordonnées valides
                const latitude = parseFloat(geocache.latitude);
                const longitude = parseFloat(geocache.longitude);
                
                if (isNaN(latitude) || isNaN(longitude)) {
                    console.error("Coordonnées invalides pour la géocache:", geocache.gc_code);
                    return null;
                }
                
                // Déterminer si c'est un point corrigé et/ou sauvegardé
                let corrected = geocache.corrected === true;
                let saved = geocache.saved === true;
                
                // Log détaillé pour débogage
                console.log(`Ajout de marqueur pour ${geocache.gc_code}: ${corrected ? 
                    (saved ? 'Marqueur avec coordonnées corrigées (sauvegardées)' : 'Marqueur avec coordonnées corrigées (non sauvegardées)') : 
                    'Marqueur avec coordonnées originales'}`, {
                    latitude, 
                    longitude,
                    corrected,
                    saved,
                    originalCoordinates: geocache.original_coordinates || 'aucune',
                    type: geocache.cache_type
                });
                
                // Convertir en format OpenLayers
                const coordinates = ol.proj.fromLonLat([longitude, latitude]);
                
                // Créer la feature avec propriétés étendues
            const feature = new ol.Feature({
                    geometry: new ol.geom.Point(coordinates),
                    name: geocache.name || 'Sans nom',
                    gc_code: geocache.gc_code,
                    cache_type: geocache.cache_type || 'Unknown',
                    difficulty: geocache.difficulty || '?',
                    terrain: geocache.terrain || '?',
                id: geocache.id,
                    // Attributs pour la forme du marqueur
                    corrected: corrected,
                    saved: saved,
                    original_coordinates: geocache.original_coordinates,
                    // Coordonnées pour le popup
                    latitude: latitude,
                    longitude: longitude
                });
                
                // Assigner un ID spécifique pour cette feature
                feature.setId(`gc-${geocache.gc_code}`);
                
                // Ajouter au layer de vecteur
                if (this.vectorSource) {
            this.vectorSource.addFeature(feature);
                } else {
                    console.error("Source du vecteur non initialisée");
                    return null;
                }
                
                // Ajouter aux marqueurs pour référence
                this.markers.push({ feature, geocache });
                
                return feature;
            } catch (error) {
                console.error("Erreur lors de l'ajout du marqueur:", error);
                return null;
            }
        }
        
        // Fonction pour obtenir une couleur en fonction du type de géocache
        getColorForCacheType(cacheType) {
            // Retourne une couleur en fonction du type de cache
            if (!cacheType) return '#999999'; // Gris par défaut
            
            const cacheTypeColors = {
                'Traditional Cache': '#00aa00', // Vert
                'Mystery Cache': '#ffff00', // Jaune
                'Unknown Cache': '#ffff00', // Jaune
                'Multi-cache': '#ff6600', // Orange
                'Letterbox Hybrid': '#aa00aa', // Violet
                'Event Cache': '#0099ff', // Bleu clair
                'Earthcache': '#ff9900', // Orange doré
                'Webcam Cache': '#0066ff', // Bleu foncé
                'Virtual Cache': '#0099ff', // Bleu clair
                'Wherigo Cache': '#00ccff', // Bleu clair
                'Cache In Trash Out Event': '#00aa66', // Vert turquoise
                'Mega-Event Cache': '#0099ff', // Bleu clair
                'Giga-Event Cache': '#0099ff', // Bleu clair
                'Geocaching HQ Celebration': '#0099ff', // Bleu clair
                'Project APE Cache': '#ff0000', // Rouge
                'Groundspeak HQ': '#0099ff', // Bleu clair
                'GPS Adventures Exhibit': '#0099ff', // Bleu clair
                'Lab Cache': '#ffffff' // Blanc
            };
            
            return cacheTypeColors[cacheType] || '#999999'; // Gris si type non reconnu
        }
        
        // Initialisation de la couche vectorielle pour les marqueurs
        initVectorLayer() {
            try {
                // Créer une source vecteur vide
                this.vectorSource = new ol.source.Vector();
                
                // Cache pour les styles (utiliser une Map pour de meilleures performances)
                this.styleCache = new Map();
                this.loggedStyles = new Set(); // Pour éviter de logger plusieurs fois le même style
                
                // Définir le style par défaut basé sur l'état de la sélection et les attributs du marqueur
                const styleFunction = (feature, resolution) => {
                    try {
                        // Style par défaut en cas d'erreur
                        const defaultStyle = this.createDefaultStyle();
                        
                        // Extraire les attributs du point
                        const gc_code = feature.get('gc_code');
                        const cacheType = feature.get('cache_type') || 'Unknown';
                        const corrected = feature.get('corrected') === true;
                        const saved = feature.get('saved') === true;
                        
                        // Créer une clé de cache unique pour ce style
                        const cacheKey = `${gc_code}_${cacheType}_${corrected}_${saved}_${resolution}`;
                        
                        // Utiliser un style en cache si disponible
                        if (this.styleCache.has(cacheKey)) {
                            return this.styleCache.get(cacheKey);
                        }
                        
                        // Log limité (uniquement la première fois qu'on crée le style pour un gc_code)
                        if (!this.loggedStyles.has(gc_code)) {
                            console.log(`Style pour ${gc_code}:`, {
                                cacheType,
                                corrected,
                                saved
                            });
                            this.loggedStyles.add(gc_code); // Marquer comme loggé
                        }
                        
                        // Déterminer la couleur en fonction du type de cache
                        let color;
                        switch(cacheType) {
                            case 'Traditional Cache':
                                color = '#1bcc23'; // Vert
                                break;
                            case 'Mystery Cache':
                            case 'Unknown Cache':
                                color = '#0037cf'; // Bleu
                                break;
                            case 'Multi-cache':
                                color = '#ffbf00'; // Orange
                                break;
                            case 'Letterbox Hybrid':
                                color = '#0037cf'; // Bleu (comme Mystery)
                                break;
                            case 'EarthCache':
                                color = '#aa7a00'; // Marron
                                break;
                            case 'Wherigo Cache':
                                color = '#00cccc'; // Cyan
                                break;
                            default:
                                color = '#989898'; // Gris pour les autres
                        }
                        
                        // Déterminer la forme en fonction des attributs corrected et saved
                        let markerShape;
                        
                        if (corrected && saved) {
                            // Coordonnées corrigées et sauvegardées => Losange
                            markerShape = 'diamond';
                        } else if (corrected) {
                            // Coordonnées corrigées mais pas sauvegardées => Carré
                            markerShape = 'square';
                        } else {
                            // Coordonnées originales => Cercle
                            markerShape = 'circle';
                        }
                        
                        // Créer le style approprié pour ce type de cache
                        const style = this.createMarkerStyleWithIcon(markerShape, color, cacheType, false);
                        
                        // Mettre en cache le style pour les appels futurs
                        this.styleCache.set(cacheKey, style);
                        
                        return style;
                    } catch (error) {
                        console.error("Erreur dans la fonction de style:", error);
                        return defaultStyle;
                    }
                };
                
                // Créer la couche vectorielle avec le style personnalisé
                this.vectorLayer = new ol.layer.Vector({
                    source: this.vectorSource,
                    style: styleFunction,
                    updateWhileAnimating: true,
                    updateWhileInteracting: true
                });
                
                // Définir un nom pour la couche (utile pour le débogage)
                this.vectorLayer.set('name', 'markers');
                
                // Ajouter la couche à la carte
                this.map.addLayer(this.vectorLayer);
                
                console.log("Couche vectorielle initialisée");
            } catch (error) {
                console.error("Erreur lors de l'initialisation de la couche vectorielle:", error);
            }
        }
        
        // Méthode pour créer un style de marqueur avec icône et symbole
        createMarkerStyleWithIcon(markerShape, color, cacheType, selected = false) {
            try {
                // Augmenter légèrement la taille de base
                const baseRadius = 7;
                const radius = selected ? baseRadius + 2 : baseRadius;
                let style;
                
                // Créer une clé de cache pour ce style
                const styleKey = `${markerShape}_${color}_${cacheType}_${selected}`;
                
                // Initialiser le cache interne si nécessaire
                if (!this._iconStyleCache) {
                    this._iconStyleCache = new Map();
                }
                
                // Vérifier si nous avons déjà ce style en cache
                if (this._iconStyleCache.has(styleKey)) {
                    return this._iconStyleCache.get(styleKey);
                }
                
                // Log des paramètres pour débogage - uniquement en mode développement
                if (window.devMode) {
                    console.log(`Création de style pour ${cacheType}:`, {
                        markerShape,
                        color,
                        selected
                    });
                }
                
                // Vérifier les paramètres
                if (!markerShape) markerShape = 'circle';
                if (!color) color = '#999999';
                
                // Définir le style en fonction de la forme demandée
                if (markerShape === 'circle') {
                    // Forme de base - cercle pour les coordonnées originales
                    style = new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: radius,
                            fill: new ol.style.Fill({
                                color: color
                            }),
                            stroke: new ol.style.Stroke({
                                color: '#000000',
                                width: 1
                            })
                        })
                    });
                    
                    // Ajouter un symbole pour certains types de caches
                    if (cacheType === 'Mystery Cache' || cacheType === 'Unknown Cache') {
                        // Ajouter un point d'interrogation
                        const textStyle = new ol.style.Text({
                            text: '?',
                            fill: new ol.style.Fill({
                                color: 'white'
                            }),
                            font: `bold ${selected ? 12 : 10}px Arial`,
                            offsetY: 1, // Centrage vertical
                            textAlign: 'center',
                            textBaseline: 'middle'
                        });
                        
                        style.setText(textStyle);
                    } else if (cacheType === 'Letterbox Hybrid') {
                        // Ajouter un symbole d'enveloppe
                        const textStyle = new ol.style.Text({
                            text: '✉',
                            fill: new ol.style.Fill({
                                color: 'white'
                            }),
                            font: `${selected ? 10 : 8}px Arial`,
                            offsetY: 1, // Centrage vertical
                            textAlign: 'center',
                            textBaseline: 'middle'
                        });
                        
                        style.setText(textStyle);
                    }
                } else if (markerShape === 'square') {
                    // Forme carrée - pour coordonnées corrigées mais non sauvegardées
                    if (ol.style.RegularShape) {
                        style = new ol.style.Style({
                            image: new ol.style.RegularShape({
                                points: 4,
                                radius: radius + 1,
                                angle: Math.PI / 4, // 45 degrés pour un carré droit
                                fill: new ol.style.Fill({
                                    color: color
                                }),
                                stroke: new ol.style.Stroke({
                                    color: '#000000',
                                    width: 1
                                })
                            })
                        });
                        
                        // Ajouter des symboles spécifiques aux types de caches
                        if (cacheType === 'Mystery Cache' || cacheType === 'Unknown Cache') {
                            const textStyle = new ol.style.Text({
                                text: '?',
                                fill: new ol.style.Fill({
                                    color: 'white'
                                }),
                                font: `bold ${selected ? 12 : 10}px Arial`,
                                offsetY: 1,
                                textAlign: 'center',
                                textBaseline: 'middle'
                            });
                            
                            style.setText(textStyle);
                        } else if (cacheType === 'Letterbox Hybrid') {
                            const textStyle = new ol.style.Text({
                                text: '✉',
                                fill: new ol.style.Fill({
                                    color: 'white'
                                }),
                                font: `${selected ? 10 : 8}px Arial`,
                                offsetY: 1,
                                textAlign: 'center',
                                textBaseline: 'middle'
                            });
                            
                            style.setText(textStyle);
                        }
                    } else {
                        // Fallback si RegularShape n'est pas disponible
                        console.warn("ol.style.RegularShape n'est pas disponible, utilisation du cercle comme fallback");
                        style = new ol.style.Style({
                            image: new ol.style.Circle({
                                radius: radius,
                                fill: new ol.style.Fill({
                                    color: color
                                }),
                                stroke: new ol.style.Stroke({
                                    color: '#000000',
                                    width: 1
                                })
                            })
                        });
                    }
                } else if (markerShape === 'diamond') {
                    // Forme losange - pour coordonnées corrigées et sauvegardées
                    if (ol.style.RegularShape) {
                        style = new ol.style.Style({
                            image: new ol.style.RegularShape({
                                points: 4,
                                radius: radius + 2, // Légèrement plus grand pour distinguer
                                angle: 0, // 0 degrés pour un losange
                                fill: new ol.style.Fill({
                                    color: color
                                }),
                                stroke: new ol.style.Stroke({
                                    color: '#000000',
                                    width: 1
                                })
                            })
                        });
                        
                        // Ajouter des symboles pour les types de caches
                        if (cacheType === 'Mystery Cache' || cacheType === 'Unknown Cache') {
                            const textStyle = new ol.style.Text({
                                text: '?',
                                fill: new ol.style.Fill({
                                    color: 'white'
                                }),
                                font: `bold ${selected ? 12 : 10}px Arial`,
                                offsetY: 1,
                                textAlign: 'center',
                                textBaseline: 'middle'
                            });
                            
                            style.setText(textStyle);
                        } else if (cacheType === 'Letterbox Hybrid') {
                            const textStyle = new ol.style.Text({
                                text: '✉',
                                fill: new ol.style.Fill({
                                    color: 'white'
                                }),
                                font: `${selected ? 10 : 8}px Arial`,
                                offsetY: 1,
                                textAlign: 'center',
                                textBaseline: 'middle'
                            });
                            
                            style.setText(textStyle);
                        }
                    } else {
                        // Fallback
                        console.warn("ol.style.RegularShape n'est pas disponible, utilisation du cercle comme fallback");
                        style = new ol.style.Style({
                            image: new ol.style.Circle({
                                radius: radius,
                                fill: new ol.style.Fill({
                                    color: color
                                }),
                                stroke: new ol.style.Stroke({
                                    color: '#000000',
                                    width: 1
                                })
                            })
                        });
                    }
                } else {
                    // Fallback pour les formes non reconnues
                    console.warn(`Forme de marqueur non reconnue: ${markerShape}, utilisation du cercle comme fallback`);
                    style = new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: radius,
                            fill: new ol.style.Fill({
                                color: color
                            }),
                            stroke: new ol.style.Stroke({
                                color: '#000000',
                                width: 1
                            })
                        })
                    });
                }
                
                // Mettre en cache le style
                this._iconStyleCache.set(styleKey, style);
                
                return style;
            } catch (error) {
                console.error("Erreur lors de la création du style de marqueur:", error);
                // Style minimal de secours
                return new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: 5,
                        fill: new ol.style.Fill({
                            color: '#ff0000'
                        }),
                        stroke: new ol.style.Stroke({
                            color: '#000000',
                            width: 1
                        })
                    })
                });
            }
        }
        
        // Créer un style par défaut simple
        createDefaultStyle() {
            try {
                return this.createMarkerStyleWithIcon('circle', '#888888', 'Unknown', false);
            } catch (error) {
                console.error("Erreur lors de la création du style par défaut:", error);
                // Style de secours vraiment minimal
                return new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: 5,
                        fill: new ol.style.Fill({
                            color: '#888888'
                        }),
                        stroke: new ol.style.Stroke({
                            color: '#000000',
                            width: 1
                        })
                    })
                });
            }
        }
        
        // Méthode pour gérer les mises à jour MultiSolver
        handleMultiSolverUpdate(event) {
            try {
                // Vérifier que nous avons les données nécessaires
                if (!event || !event.detail) {
                    console.error("Événement invalide reçu par handleMultiSolverUpdate");
                    return;
                }

                const detail = event.detail;
                const multiSolverId = detail.multiSolverId;
                const forceUpdate = detail.forceUpdate === true;
                const repairsApplied = detail.repairsApplied === true;
                
                // Stocker l'état de forceUpdate pour les fonctions de diagnostic
                this.forceUpdateActive = forceUpdate;
                
                // Si forceUpdate est true, le log est plus visible
                if (forceUpdate) {
                    console.log("%c[EnhancedZoneMap] Mise à jour forcée des marqueurs (analyse de page web)", 
                        "background:purple; color:white; font-weight:bold", {
                            repairsApplied
                        });
                }
                
                // Extraire et valider les géocaches - vérifier tous les formats possibles
                let geocaches = [];
                if (Array.isArray(detail.geocaches)) {
                    geocaches = detail.geocaches;
                    console.log("Données trouvées dans detail.geocaches");
                } else if (Array.isArray(detail.data)) {
                    geocaches = detail.data;
                    console.log("Données trouvées dans detail.data");
                } else if (detail.results && Array.isArray(detail.results.geocaches)) {
                    geocaches = detail.results.geocaches;
                    console.log("Données trouvées dans detail.results.geocaches");
                } else {
                    console.warn("Format de données non reconnu dans l'événement multiSolverDataUpdated:", Object.keys(detail));
                    // Essayons de reconstruire à partir des données de session
                    try {
                        if (sessionStorage && sessionStorage.getItem('multiSolverResults')) {
                            const storedData = JSON.parse(sessionStorage.getItem('multiSolverResults'));
                            if (Array.isArray(storedData) && storedData.length > 0) {
                                geocaches = storedData;
                                console.log("Données récupérées depuis sessionStorage comme fallback");
                            }
                        }
                    } catch (e) {
                        console.error("Erreur lors de la récupération des données de session:", e);
                    }
                }
                
                // Si nous n'avons aucune donnée, quitter
                if (!geocaches || geocaches.length === 0) {
                    console.warn("Aucune géocache trouvée dans l'événement ou dans sessionStorage");
                return;
            }
            
                // Si l'ID ne correspond pas, ignorer
                if (this.multiSolverIdValue && multiSolverId && this.multiSolverIdValue !== multiSolverId) {
                    console.warn(`ID Multi Solver différent: Actuel=${this.multiSolverIdValue}, Événement=${multiSolverId}`);
                    return;
                }
                
                // Analyser le format des données pour débogage
                const firstItem = geocaches[0];
                console.log("Format des données MultiSolver:", {
                    nombreGéocaches: geocaches.length,
                    premierÉlément: firstItem ? {
                        hasGcCode: !!firstItem.gc_code,
                        hasCoordinates: !!firstItem.coordinates,
                        hasCorrectedCoordinates: !!firstItem.corrected_coordinates,
                        hasResults: !!firstItem.results, 
                        hasOriginalData: !!firstItem.original_data,
                        hasRawCombinedResults: firstItem.original_data && firstItem.original_data.combined_results ? 
                            Object.keys(firstItem.original_data.combined_results) : null
                    } : 'aucune',
                    clés: firstItem ? Object.keys(firstItem) : [],
                    exempleCoordonnées: firstItem && firstItem.coordinates ? 
                        (firstItem.coordinates.ddm ? 'format DDM' : 
                        (firstItem.coordinates.latitude ? 'format décimal' : 'format inconnu')) : 'pas de coordonnées',
                    exempleCorrection: firstItem && firstItem.corrected_coordinates ? 
                        (firstItem.corrected_coordinates.exist ? 'coordination corrigée existe' : 'pas d\'info de correction') : 'pas de correction',
                    exempleRésultat: firstItem && firstItem.results ? 
                        (firstItem.results.coordinates ? 
                        'coordinates: ' + JSON.stringify(firstItem.results.coordinates) : 'pas de coordonnées') : 'aucune'
                });
                
                // Vérifier si des données de débogage sont disponibles
                const hasOriginalData = geocaches.some(gc => gc.original_data);
                const hasCorrectedCoordinates = geocaches.some(gc => 
                    gc.corrected_coordinates && 
                    gc.corrected_coordinates.exist);
                
                console.log("Analyse des données:", {
                    nombreGéocaches: geocaches.length,
                    contientDonnéesOriginales: hasOriginalData,
                    contientCoordonnéesCorrigées: hasCorrectedCoordinates,
                    miseÀJourForcée: forceUpdate
                });
                
                // *** IMPORTANT: Ne pas effacer tous les marqueurs - modification pour éviter la régression
                // this.clearMarkers();
                // console.log("Marqueurs existants effacés pour intégrer les nouvelles données");
                    
                    // Paramètres pour l'auto-correction
                    const autoCorrectEnabled = document.getElementById('auto-correct-coordinates')?.checked || false;
                    console.log("Auto-correction activée:", autoCorrectEnabled);
                    
                    // Compteurs pour le suivi
                    let markersAdded = 0; 
                let markersUpdated = 0;
                    let markersSkipped = 0;
                    let coordinatesCorrected = 0;
                
                // Créer un dictionnaire des marqueurs existants (pour une mise à jour rapide)
                const existingMarkers = new Map();
                if (this.markers && this.markers.length > 0) {
                    this.markers.forEach(marker => {
                        if (marker.geocache && marker.geocache.gc_code) {
                            existingMarkers.set(marker.geocache.gc_code, marker);
                        }
                    });
                }
                
                console.log(`Marqueurs existants: ${existingMarkers.size}`);
                    
                    // Traiter chaque géocache
                    for (let i = 0; i < geocaches.length; i++) {
                        const geocache = geocaches[i];
                        
                        // Vérifier que nous avons un code GC valide
                        if (!geocache || !geocache.gc_code) {
                            console.warn(`Géocache ${i}: Données invalides, ignorée`);
                            markersSkipped++;
                            continue;
                        }
                        
                        // Journalisation détaillée pour chaque géocache en cas de mise à jour forcée
                        const isDebugCache = geocache.gc_code === 'GCAPF4B' || forceUpdate;
                        
                        if (isDebugCache) {
                            console.log(`%c[EnhancedZoneMap] Analyse détaillée: ${geocache.gc_code}`, "background:purple; color:white", {
                                hasCoordinates: !!geocache.coordinates,
                                hasCorrectedCoordinates: !!geocache.corrected_coordinates,
                                hasResults: !!geocache.results,
                                hasOriginalData: !!geocache.original_data,
                                coordFormat: geocache.coordinates ? Object.keys(geocache.coordinates) : null,
                                correctedFormat: geocache.corrected_coordinates ? Object.keys(geocache.corrected_coordinates) : null,
                                resultsKeys: geocache.results ? Object.keys(geocache.results) : null,
                                originalDataKeys: geocache.original_data ? Object.keys(geocache.original_data) : null,
                                forceUpdate: forceUpdate,
                                isCorrected: geocache.corrected === true,
                                isSaved: geocache.saved === true,
                                rawCoordinates: geocache.coordinates
                            });
                        }
                        
                        // Initialiser les attributs pour le marqueur
                        let corrected = geocache.corrected === true;  // Utiliser directement l'attribut corrected s'il existe
                        let saved = geocache.saved === true;          // Utiliser directement l'attribut saved s'il existe
                        let latitude = null;
                        let longitude = null;
                        let originalCoordinates = null;
                        
                    // Vérifier d'abord si c'est déjà une géocache avec coordonnées sauvegardées
                        if (geocache.corrected_coordinates) {
                            try {
                                let hasValidCoordinates = false;
                                
                                // Première tentative: utiliser latitude/longitude numériques
                                if (geocache.corrected_coordinates.latitude && geocache.corrected_coordinates.longitude) {
                                    latitude = parseFloat(geocache.corrected_coordinates.latitude);
                                    longitude = parseFloat(geocache.corrected_coordinates.longitude);
                                    
                                    if (!isNaN(latitude) && !isNaN(longitude)) {
                                        hasValidCoordinates = true;
                                        console.log(`Géocache ${i} (${geocache.gc_code}): Coordonnées corrigées numériques valides trouvées:`, {
                                            latitude,
                                            longitude
                                        });
                                    } else {
                                        console.warn(`Géocache ${i} (${geocache.gc_code}): Échec du parsing numérique:`, {
                                            raw_latitude: geocache.corrected_coordinates.latitude,
                                            raw_longitude: geocache.corrected_coordinates.longitude
                                        });
                                    }
                                }
                                
                                // Deuxième tentative: essayer gc_lat/gc_lon qui pourraient être au format DDM
                                if (!hasValidCoordinates && geocache.corrected_coordinates.gc_lat && geocache.corrected_coordinates.gc_lon) {
                                    const lat = this.parseCoordinateString(geocache.corrected_coordinates.gc_lat);
                                    const lon = this.parseCoordinateString(geocache.corrected_coordinates.gc_lon);
                                    
                                    if (lat !== null && lon !== null) {
                                        latitude = lat;
                                        longitude = lon;
                                        hasValidCoordinates = true;
                                        console.log(`Géocache ${i} (${geocache.gc_code}): Coordonnées corrigées parsées depuis gc_lat/gc_lon:`, {
                                            gc_lat: geocache.corrected_coordinates.gc_lat,
                                            gc_lon: geocache.corrected_coordinates.gc_lon,
                                            latitude,
                                            longitude
                                        });
                                    } else {
                                        console.warn(`Géocache ${i} (${geocache.gc_code}): Échec du parsing DDM:`, {
                                            gc_lat: geocache.corrected_coordinates.gc_lat,
                                            gc_lon: geocache.corrected_coordinates.gc_lon
                                        });
                                    }
                                }
                                
                                // Si nous avons des coordonnées valides, procéder avec les coordonnées corrigées
                                if (hasValidCoordinates) {
                            // Stocker les coordonnées originales si disponibles
                            if (geocache.coordinates && 
                                geocache.coordinates.latitude && 
                                geocache.coordinates.longitude) {
                                originalCoordinates = {
                                    latitude: parseFloat(geocache.coordinates.latitude),
                                    longitude: parseFloat(geocache.coordinates.longitude)
                                };
                            }
                            
                            // Marquer comme corrigées et sauvegardées (ou utiliser les attributs existants)
                            corrected = true;
                            saved = saved || true; // Conserver la valeur existante ou utiliser true par défaut
                            coordinatesCorrected++;
                            
                                    console.log(`Géocache ${i} (${geocache.gc_code}): Coordonnées corrigées sauvegardées utilisées`);
                                } else {
                                    // Solution de secours: essayer d'utiliser les coordonnées standards
                                    if (geocache.coordinates && 
                                        geocache.coordinates.latitude && 
                                        geocache.coordinates.longitude) {
                                        try {
                                            const stdLat = parseFloat(geocache.coordinates.latitude);
                                            const stdLon = parseFloat(geocache.coordinates.longitude);
                                            
                                            if (!isNaN(stdLat) && !isNaN(stdLon)) {
                                                latitude = stdLat;
                                                longitude = stdLon;
                                                corrected = corrected || false; // Utiliser l'attribut existant ou false par défaut
                                                saved = saved || false;        // Utiliser l'attribut existant ou false par défaut
                                                console.log(`Géocache ${i} (${geocache.gc_code}): Utilisation des coordonnées standards comme solution de secours`);
                                            }
                                        } catch (fallbackError) {
                                            console.error(`Géocache ${i} (${geocache.gc_code}): Erreur lors de la solution de secours:`, fallbackError);
                                        }
                                    }
                                }
                            } catch (error) {
                                console.error(`Géocache ${i} (${geocache.gc_code}): Exception lors du traitement des coordonnées corrigées:`, error);
                            }
                        }
                    // Sinon, si l'attribut corrected est true mais qu'il n'y a pas de corrected_coordinates,
                    // utiliser directement les coordonnées dans geocache.coordinates
                    else if (corrected === true && geocache.coordinates) {
                        if (geocache.coordinates.latitude && geocache.coordinates.longitude) {
                            try {
                                latitude = parseFloat(geocache.coordinates.latitude);
                                longitude = parseFloat(geocache.coordinates.longitude);
                                
                                if (!isNaN(latitude) && !isNaN(longitude)) {
                                    // Les coordonnées sont déjà marquées comme corrigées par l'attribut corrected
                                    coordinatesCorrected++;
                                    
                                    console.log(`Géocache ${i} (${geocache.gc_code}): Coordonnées corrigées trouvées directement dans l'objet coordinates:`, {
                                        latitude,
                                        longitude,
                                        corrected,
                                        saved
                                    });
                                }
                            } catch (e) {
                                console.error(`Géocache ${i} (${geocache.gc_code}): Erreur lors du parsing des coordonnées directes:`, e);
                            }
                        }
                    }
                    // Sinon, essayer d'extraire des coordonnées corrigées du original_data
                    else if (geocache.original_data && geocache.original_data.corrected_coordinates &&
                            geocache.original_data.corrected_coordinates.exist) {
                        
                        let coordsSuccess = false;
                        
                        // Si latitude/longitude sont disponibles directement
                        if (geocache.original_data.corrected_coordinates.latitude &&
                            geocache.original_data.corrected_coordinates.longitude) {
                            
                            try {
                                latitude = parseFloat(geocache.original_data.corrected_coordinates.latitude);
                                longitude = parseFloat(geocache.original_data.corrected_coordinates.longitude);
                                coordsSuccess = !isNaN(latitude) && !isNaN(longitude);
                                
                                if (coordsSuccess) {
                                    console.log(`Géocache ${i} (${geocache.gc_code}): Coordonnées extraites du nouveau format corrected_coordinates (latitude/longitude):`, {
                                        latitude,
                                        longitude,
                                        source: geocache.original_data.corrected_coordinates.source_plugin
                                    });
                                }
                            } catch (e) {
                                console.warn(`Erreur lors du parsing des coordonnées décimales:`, e);
                            }
                        }
                        
                        // Si on n'a pas réussi avec lat/lon directs, essayer de parser le format DDM
                        if (!coordsSuccess && geocache.original_data.corrected_coordinates.formatted) {
                            try {
                                const formattedCoords = geocache.original_data.corrected_coordinates.formatted;
                                const regex = /([NS])\s*(\d+)°\s*([0-9.]+)'?\s*([EW])\s*(\d+)°\s*([0-9.]+)'?/i;
                                const match = formattedCoords.match(regex);
                                
                                if (match) {
                                    const northDir = match[1].toUpperCase();
                                    const northDeg = parseInt(match[2]);
                                    const northMin = parseFloat(match[3]);
                                    const eastDir = match[4].toUpperCase();
                                    const eastDeg = parseInt(match[5]);
                                    const eastMin = parseFloat(match[6]);
                                    
                                    // Convertir en décimal
                                    latitude = northDeg + (northMin / 60);
                                    if (northDir === 'S') latitude = -latitude;
                                    
                                    longitude = eastDeg + (eastMin / 60);
                                    if (eastDir === 'W') longitude = -longitude;
                                    
                                    coordsSuccess = true;
                                    console.log(`Géocache ${i} (${geocache.gc_code}): Coordonnées extraites du nouveau format corrected_coordinates (DDM parsé):`, {
                                        formatted: formattedCoords,
                                        latitude,
                                        longitude
                                    });
                                } else {
                                    console.warn(`Format DDM non reconnu:`, formattedCoords);
                                }
                            } catch (e) {
                                console.warn(`Erreur lors du parsing du format DDM:`, e);
                            }
                        }
                        
                        if (coordsSuccess) {
                            // Stocker les coordonnées originales si disponibles
                            if (geocache.coordinates && 
                                geocache.coordinates.latitude && 
                                geocache.coordinates.longitude) {
                                originalCoordinates = {
                                    latitude: parseFloat(geocache.coordinates.latitude),
                                    longitude: parseFloat(geocache.coordinates.longitude)
                                };
                            }
                            
                            corrected = true;
                            saved = autoCorrectEnabled; // Sauvegarder si l'auto-correction est activée
                            coordinatesCorrected++;
                            
                            // Sauvegarder automatiquement si l'option est activée
                            if (autoCorrectEnabled && geocache.id) {
                                this.saveCoordinates(geocache.id, latitude, longitude)
                                    .then(success => console.log(`Auto-sauvegarde pour ${geocache.gc_code}: ${success ? 'réussie' : 'échouée'}`));
                        }
                        }
                    }
                    // Vérifier si les coordonnées sont dans results
                        else if (geocache.results && geocache.results.coordinates) {
                            const coords = geocache.results.coordinates;
                            if (coords.latitude && coords.longitude) {
                                latitude = parseFloat(coords.latitude);
                                longitude = parseFloat(coords.longitude);
                                
                                // Stocker les coordonnées originales si disponibles
                                if (geocache.coordinates && 
                                    geocache.coordinates.latitude && 
                                    geocache.coordinates.longitude) {
                                    originalCoordinates = {
                                        latitude: parseFloat(geocache.coordinates.latitude),
                                        longitude: parseFloat(geocache.coordinates.longitude)
                                    };
                                }
                                
                                corrected = true;
                                saved = false; // Ces coordonnées viennent du serveur mais ne sont pas sauvegardées
                                coordinatesCorrected++;
                                console.log(`Géocache ${i} (${geocache.gc_code}): Coordonnées trouvées dans results.coordinates`);
                            }
                        }
                    // Coordonnées extraites des données brutes combined_results
                        else if (geocache.original_data && geocache.original_data.combined_results) {
                            if (isDebugCache) {
                                console.log(`Tentative d'extraction de coordonnées pour ${geocache.gc_code}:`, 
                                    JSON.stringify(geocache.original_data.combined_results));
                            }
                            
                            const result = this.extractCoordinatesFromCombinedResults(
                                geocache.original_data.combined_results,
                                geocache.gc_code,
                                i
                            );
                            
                            if (result.success) {
                                latitude = result.latitude;
                                longitude = result.longitude;
                                
                                // Stocker les coordonnées originales si disponibles
                                if (geocache.coordinates && 
                                    geocache.coordinates.latitude && 
                                    geocache.coordinates.longitude) {
                                    originalCoordinates = {
                                        latitude: parseFloat(geocache.coordinates.latitude),
                                        longitude: parseFloat(geocache.coordinates.longitude)
                                    };
                                }
                                
                                // Marquer comme corrigées et utiliser même si autoCorrect est désactivé
                                corrected = true;
                                saved = autoCorrectEnabled; // Sauvegarder si l'auto-correction est activée
                                coordinatesCorrected++;
                                
                                // Sauvegarder automatiquement si l'option est activée
                                if (autoCorrectEnabled && geocache.id) {
                                    this.saveCoordinates(geocache.id, latitude, longitude)
                                        .then(success => console.log(`Auto-sauvegarde pour ${geocache.gc_code}: ${success ? 'réussie' : 'échouée'}`));
                                }
                            } else if (isDebugCache) {
                                console.log(`Échec de l'extraction de coordonnées pour ${geocache.gc_code}`);
                            }
                        }
                        
                    // Utiliser les coordonnées standards si aucune correction n'est disponible
                    // MODIFICATION: Ne pas réinitialiser les coordonnées corrigées même sans autoCorrectEnabled
                    if ((!latitude || !longitude) && geocache.coordinates) {
                            // Essayer d'abord geocache.coordinates
                        if (geocache.coordinates.latitude && 
                                geocache.coordinates.longitude) {
                            
                            // On utilise les coordonnées standards uniquement si on n'a pas déjà des coordonnées corrigées
                            if (!corrected) {
                                latitude = parseFloat(geocache.coordinates.latitude);
                                longitude = parseFloat(geocache.coordinates.longitude);
                                
                                // Important: ne pas marquer comme corrigé s'il s'agit des coordonnées d'origine
                                corrected = false;
                                saved = false;
                                
                                console.log(`Géocache ${i} (${geocache.gc_code}): Utilisation des coordonnées standards`);
                            } else {
                                console.log(`Géocache ${i} (${geocache.gc_code}): Coordonnées standards ignorées car déjà des coordonnées corrigées`);
                            }
                        }
                            }
                            // Sinon, essayer les propriétés directes
                    else if ((!latitude || !longitude) && geocache.latitude && geocache.longitude) {
                        // On utilise les coordonnées directes uniquement si on n'a pas déjà des coordonnées corrigées
                        if (!corrected) {
                                latitude = parseFloat(geocache.latitude);
                                longitude = parseFloat(geocache.longitude);
                        
                            // Important: ne pas marquer comme corrigé s'il s'agit des coordonnées d'origine
                            corrected = false;
                            saved = false;
                            
                                console.log(`Géocache ${i} (${geocache.gc_code}): Utilisation des coordonnées directes`);
                        } else {
                            console.log(`Géocache ${i} (${geocache.gc_code}): Coordonnées directes ignorées car déjà des coordonnées corrigées`);
                            }
                        }
                        
                    // Ajouter ou mettre à jour le marqueur si nous avons des coordonnées valides
                        if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
                            // Préparer les données complètes pour le marqueur
                            const markerData = {
                                ...geocache,
                                latitude,
                                longitude,
                                gc_code: geocache.gc_code,
                                name: geocache.name || 'Sans nom',
                                id: geocache.id || `temp-${geocache.gc_code}`,
                                cache_type: geocache.cache_type || 'Unknown',
                                difficulty: geocache.difficulty || '?',
                                terrain: geocache.terrain || '?',
                                corrected,
                                saved,
                                original_coordinates: originalCoordinates
                            };
                            
                            // Appeler notre méthode de diagnostic pour tracer les coordonnées et flags
                            this.debugCoordinatesUpdate(geocache, latitude, longitude, corrected, saved, false);
                            
                            // Journalisation détaillée des attributs du marqueur pour le diagnostic
                            console.log(`%c[EnhancedZoneMap] Marqueur prêt: ${geocache.gc_code}`, "background:blue; color:white", {
                                latitude, 
                                longitude, 
                                corrected, 
                                saved, 
                                hasOriginalCoords: !!originalCoordinates
                            });
                            
                            // Vérifier si ce marqueur existe déjà
                            const existingMarker = existingMarkers.get(geocache.gc_code);
                            
                            if (existingMarker) {
                                // Si le marqueur existe, mettre à jour sa position et ses attributs
                                try {
                                    // Récupérer la feature OpenLayers
                                    const feature = existingMarker.feature;
                                    if (feature) {
                                        // Journaliser l'état avant mise à jour pour diagnostic
                                        const oldCoords = feature.getGeometry().getCoordinates();
                                        const oldProj = ol.proj.transform(oldCoords, 'EPSG:3857', 'EPSG:4326');
                                        console.log(`%c[EnhancedZoneMap] Mise à jour du marqueur: ${geocache.gc_code}`, "background:purple; color:white", {
                                            oldPosition: {longitude: oldProj[0], latitude: oldProj[1]},
                                            newPosition: {longitude, latitude},
                                            oldCorrected: feature.get('corrected'),
                                            newCorrected: corrected,
                                            oldSaved: feature.get('saved'),
                                            newSaved: saved,
                                            delta: {
                                                longitude: longitude - oldProj[0],
                                                latitude: latitude - oldProj[1]
                                            }
                                        });
                                        
                                        // Mettre à jour la position
                                        const newCoords = ol.proj.fromLonLat([longitude, latitude]);
                                        feature.getGeometry().setCoordinates(newCoords);
                                        
                                        // Mettre à jour les attributs
                                        feature.set('corrected', corrected);
                                        feature.set('saved', saved);
                                        feature.set('latitude', latitude);
                                        feature.set('longitude', longitude);
                                        feature.set('original_coordinates', originalCoordinates);
                                        
                                        // Mettre à jour les données dans le marqueur
                                        existingMarker.geocache = markerData;
                                        
                                        // Appeler notre méthode de diagnostic pour la mise à jour
                                        this.debugCoordinatesUpdate(geocache, latitude, longitude, corrected, saved, true);
                                        
                                        markersUpdated++;
                                        console.log(`Géocache ${i} (${geocache.gc_code}): Marqueur mis à jour`);
                                    } else {
                                        console.warn(`Géocache ${i} (${geocache.gc_code}): Feature non trouvée pour marqueur existant`);
                                    }
                                } catch (error) {
                                    console.error(`Erreur lors de la mise à jour du marqueur ${geocache.gc_code}:`, error);
                                }
                            } else {
                                // Si le marqueur n'existe pas, l'ajouter
                                console.log(`%c[EnhancedZoneMap] Création d'un nouveau marqueur: ${geocache.gc_code}`, "background:green; color:white", {
                                    latitude,
                                    longitude,
                                    corrected,
                                    saved
                                });
                                
                            const marker = this.addMarkerWithGeocache(markerData);
                            
                            if (marker) {
                                    // Appeler notre méthode de diagnostic pour la création
                                    this.debugCoordinatesUpdate(geocache, latitude, longitude, corrected, saved, false);
                                    
                                markersAdded++;
                                
                                // Loguer les détails si c'est un point corrigé
                                if (corrected) {
                                        console.log(`Géocache ${i} (${geocache.gc_code}): Nouveau marqueur ajouté comme ${corrected && saved ? 'losange' : 'carré'}`);
                                    }
                                }
                            }
                        } else {
                            console.warn(`%c[EnhancedZoneMap] Géocache ${i} (${geocache.gc_code}): Pas de coordonnées valides (lat=${latitude}, lon=${longitude}), marqueur ignoré`, "background:red; color:white");
                            markersSkipped++;
                        }
                    }
                    
                    // Log des résultats finaux
                console.log(`Marqueurs ajoutés: ${markersAdded}, mis à jour: ${markersUpdated}, ignorés: ${markersSkipped}, coordonnées corrigées: ${coordinatesCorrected}`);
                    
                // Ajuster la vue de la carte seulement si de nouveaux marqueurs ont été ajoutés
                    if (markersAdded > 0) {
                    this.fitMapToMarkers();
                }
            } catch (error) {
                console.error("Erreur lors de la gestion de la mise à jour du Multi Solver:", error);
            }
        }
        
        // Méthode utilitaire pour extraire les coordonnées des résultats combinés
        extractCoordinatesFromCombinedResults(combinedResults, gcCode, index) {
            const result = { success: false, latitude: null, longitude: null };
            
            try {
                if (!combinedResults) return result;
                
                console.log(`Tentative d'extraction des coordonnées pour ${gcCode}:`, {
                    hasCorrectedCoordinates: !!combinedResults.corrected_coordinates,
                    hasColorTextDetector: !!combinedResults.color_text_detector,
                    hasFormulaParser: !!combinedResults.formula_parser
                });
                
                // Vérifier d'abord le nouveau format corrected_coordinates
                if (combinedResults.corrected_coordinates && 
                    combinedResults.corrected_coordinates.exist && 
                    combinedResults.corrected_coordinates.formatted) {
                    
                    // Si on a directement latitude/longitude en décimal
                    if (combinedResults.corrected_coordinates.latitude && 
                        combinedResults.corrected_coordinates.longitude) {
                        
                        try {
                            const lat = parseFloat(combinedResults.corrected_coordinates.latitude);
                            const lon = parseFloat(combinedResults.corrected_coordinates.longitude);
                            
                            if (!isNaN(lat) && !isNaN(lon)) {
                                result.success = true;
                                result.latitude = lat;
                                result.longitude = lon;
                                result.source = combinedResults.corrected_coordinates.source_plugin;
                                
                                console.log(`Géocache ${index} (${gcCode}): Coordonnées trouvées dans corrected_coordinates décimales:`, {
                                    latitude: result.latitude,
                                    longitude: result.longitude,
                                    source: result.source
                                });
                                
                                return result;
                            }
                        } catch (e) {
                            console.warn(`Géocache ${index} (${gcCode}): Erreur lors du parsing des coordonnées décimales:`, e);
                        }
                    }
                    
                    // Essayer de convertir le format DDM en décimal
                    try {
                        const formattedCoords = combinedResults.corrected_coordinates.formatted;
                        // Extraire les parties Nord et Est
                        const regex = /([NS])\s*(\d+)°\s*([0-9.]+)'?\s*([EW])\s*(\d+)°\s*([0-9.]+)'?/i;
                        const match = formattedCoords.match(regex);
                        
                        if (match) {
                            const northDir = match[1].toUpperCase();
                            const northDeg = parseInt(match[2]);
                            const northMin = parseFloat(match[3]);
                            const eastDir = match[4].toUpperCase();
                            const eastDeg = parseInt(match[5]);
                            const eastMin = parseFloat(match[6]);
                            
                            // Convertir en décimal
                            let latitude = northDeg + (northMin / 60);
                            if (northDir === 'S') latitude = -latitude;
                            
                            let longitude = eastDeg + (eastMin / 60);
                            if (eastDir === 'W') longitude = -longitude;
                            
                            result.success = true;
                            result.latitude = latitude;
                            result.longitude = longitude;
                            result.source = combinedResults.corrected_coordinates.source_plugin;
                            
                            console.log(`Géocache ${index} (${gcCode}): Coordonnées DDM converties depuis corrected_coordinates:`, {
                                formatted: formattedCoords,
                                latitude: result.latitude,
                                longitude: result.longitude,
                                source: result.source
                            });
                            
                            return result;
                        } else {
                            console.warn(`Géocache ${index} (${gcCode}): Format DDM non reconnu:`, formattedCoords);
                        }
                    } catch (e) {
                        console.warn(`Géocache ${index} (${gcCode}): Erreur lors de la conversion du format DDM:`, e);
                    }
                }
                
                // Ensuite, vérifier formula_parser
                if (combinedResults.formula_parser && 
                    combinedResults.formula_parser.coordinates && 
                    combinedResults.formula_parser.coordinates.length > 0) {
                    
                    // Prendre le premier résultat
                    const coords = combinedResults.formula_parser.coordinates[0];
                    
                    if (coords) {
                        // Si on a des coordonnées décimales directement
                        if (coords.latitude !== undefined && coords.longitude !== undefined) {
                            try {
                                const lat = parseFloat(coords.latitude);
                                const lon = parseFloat(coords.longitude);
                                
                                if (!isNaN(lat) && !isNaN(lon)) {
                            result.success = true;
                                    result.latitude = lat;
                                    result.longitude = lon;
                                    result.source = "formula_parser";
                                    console.log(`Géocache ${index} (${gcCode}): Coordonnées décimales formula_parser:`, result);
                            return result;
                                }
                            } catch (e) {
                                console.warn(`Géocache ${index} (${gcCode}): Erreur de parsing des coordonnées formula_parser:`, e);
                            }
                        }
                        // Si on a format DDM
                        else if (coords.north && coords.east) {
                            try {
                                const coordinates = this.convertDDMToDecimal(coords.north, coords.east);
                                if (coordinates && !isNaN(coordinates.latitude) && !isNaN(coordinates.longitude)) {
                                    result.success = true;
                                    result.latitude = parseFloat(coordinates.latitude);
                                    result.longitude = parseFloat(coordinates.longitude);
                                    result.source = "formula_parser";
                                    console.log(`Géocache ${index} (${gcCode}): Conversion DDM formula_parser réussie:`, result);
                                    return result;
                                }
                            } catch (e) {
                                console.warn(`Géocache ${index} (${gcCode}): Erreur de conversion DDM formula_parser:`, e);
                            }
                        }
                    }
                }
                
                // Enfin vérifier coordinates_finder
                if (combinedResults.coordinates_finder && 
                    combinedResults.coordinates_finder.coordinates) {
                    
                    // Parcourir les coordonnées trouvées
                    const coordsList = combinedResults.coordinates_finder.coordinates;
                    
                    if (Array.isArray(coordsList) && coordsList.length > 0) {
                        const firstCoord = coordsList[0];
                        
                        if (firstCoord && firstCoord.latitude && firstCoord.longitude) {
                            try {
                                const lat = parseFloat(firstCoord.latitude);
                                const lon = parseFloat(firstCoord.longitude);
                                
                                if (!isNaN(lat) && !isNaN(lon)) {
                    result.success = true;
                                    result.latitude = lat;
                                    result.longitude = lon;
                                    result.source = "coordinates_finder";
                                    console.log(`Géocache ${index} (${gcCode}): Coordonnées depuis coordinates_finder:`, result);
                    return result;
                                }
                            } catch (e) {
                                console.warn(`Géocache ${index} (${gcCode}): Erreur de parsing des coordonnées coordinates_finder:`, e);
                            }
                        }
                    }
                }
                
                console.log(`Géocache ${index} (${gcCode}): Aucune coordonnée trouvée dans les résultats combinés.`);
                return result;
                
            } catch (error) {
                console.error(`Erreur lors de l'extraction des coordonnées pour ${gcCode}:`, error);
                return result;
            }
        }
        
        // Méthode utilitaire pour afficher une erreur sur la carte
        notifyError(message) {
            if (this.containerTarget) {
                const errorElement = document.createElement('div');
                errorElement.className = 'absolute top-12 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
                errorElement.textContent = message;
                this.containerTarget.appendChild(errorElement);
                
                // Supprimer le message d'erreur après 5 secondes
                setTimeout(() => {
                    if (errorElement.parentNode) {
                        errorElement.parentNode.removeChild(errorElement);
                    }
                }, 5000);
            }
        }

        // Configuration des écouteurs d'événements
        setupEventListeners() {
            try {
                // Écouter les événements du Multi Solver si nécessaire
                if (this.isMultiSolverValue) {
                    console.log("Configuration de l'écouteur d'événements multiSolverDataUpdated");
                    window.addEventListener('multiSolverDataUpdated', this.handleMultiSolverUpdate.bind(this));
                }
                
                // Ajouter l'écouteur pour le clic droit (menu contextuel)
                this.map.getViewport().addEventListener('contextmenu', (event) => {
                    event.preventDefault();
                    
                    // Obtenir la position du clic et la feature correspondante
                    const pixel = this.map.getEventPixel(event);
                    const feature = this.map.forEachFeatureAtPixel(pixel, feature => feature);
                    
                    if (feature) {
                        // Si un marqueur a été cliqué
                        const id = feature.get('id');
                        const gc_code = feature.get('gc_code');
                        const coords = feature.getGeometry().getCoordinates();
                        const lonLat = ol.proj.transform(coords, 'EPSG:3857', 'EPSG:4326');
                        
                        // Afficher le menu contextuel pour le marqueur
                        this.showMarkerContextMenu(event, {
                            id,
                            gc_code,
                            longitude: lonLat[0],
                            latitude: lonLat[1],
                            corrected: feature.get('corrected'),
                            saved: feature.get('saved')
                        });
                    } else {
                        // Si un point vide de la carte a été cliqué
                        const coords = this.map.getCoordinateFromPixel(pixel);
                        const lonLat = ol.proj.transform(coords, 'EPSG:3857', 'EPSG:4326');
                        
                        // Afficher le menu contextuel pour le point de la carte
                        this.showMapContextMenu(event, {
                            longitude: lonLat[0],
                            latitude: lonLat[1]
                        });
                    }
                });
                
                // Ajouter un écouteur pour les changements de taille de fenêtre
                window.addEventListener('resize', () => {
                    this.map.updateSize();
                });
                
                console.log("Écouteurs d'événements configurés");
            } catch (error) {
                console.error("Erreur lors de la configuration des écouteurs d'événements:", error);
            }
        }
        
        // Ajout de l'interaction de sélection pour les marqueurs
        addSelectInteraction() {
            try {
                // Vérifier que les classes nécessaires existent
                if (!ol.interaction || !ol.interaction.Select) {
                    console.warn("La classe ol.interaction.Select n'est pas disponible, l'interaction de sélection ne sera pas ajoutée");
                    return;
                }
                
                // Vérifier si les événements sont disponibles
                const clickCondition = ol.events && ol.events.condition ? 
                                       ol.events.condition.click : null;
                
                // Créer l'interaction de sélection avec un style personnalisé
                this.selectInteraction = new ol.interaction.Select({
                    condition: clickCondition || function(evt) {
                        return evt.type === 'click' || evt.type === 'singleclick';
                    },
                    layers: [this.vectorLayer],
                    style: (feature) => {
                        // Récupérer les mêmes informations que pour le style normal
                        const cacheType = feature.get('cache_type') || 'Unknown';
                        const corrected = feature.get('corrected') || false;
                        const saved = feature.get('saved') || false;
                        
                        // Obtenir la même couleur que pour le style normal
                        const color = this.getColorForCacheType(cacheType);
                        
                        // Déterminer la forme du marqueur en fonction du statut
                        let markerShape;
                        if (corrected && saved) {
                            markerShape = 'diamond';
                        } else if (corrected) {
                            markerShape = 'square';
                        } else {
                            markerShape = 'circle';
                        }
                        
                        // Créer le style avec l'icône mais en plus grand pour indiquer la sélection
                        return this.createMarkerStyleWithIcon(markerShape, color, cacheType, true);
                    }
                });
                
                // Ajouter l'interaction à la carte
                this.map.addInteraction(this.selectInteraction);
                
                // Écouter les événements de sélection
                this.selectInteraction.on('select', (event) => {
                    // Vérifier que nous avons bien un événement avec des features sélectionnées
                    if (!event || !event.selected) {
                        return;
                    }
                    
                    const selected = event.selected[0];
                    
                    if (selected) {
                        // Un marqueur a été sélectionné
                        const gc_code = selected.get('gc_code') || 'GC????';
                        const name = selected.get('name') || 'Sans nom';
                        const cacheType = selected.get('cache_type') || 'Unknown';
                        const difficulty = selected.get('difficulty') || '?';
                        const terrain = selected.get('terrain') || '?';
                        const corrected = selected.get('corrected') || false;
                        const saved = selected.get('saved') || false;
                        const originalCoordinates = selected.get('original_coordinates');
                        
                        try {
                            // Obtenir les coordonnées de la géométrie
                            const coords = selected.getGeometry().getCoordinates();
                            
                            // Convertir en coordonnées géographiques si la projection est disponible
                            let longitude = 0, latitude = 0;
                            
                            if (ol.proj && typeof ol.proj.transform === 'function') {
                                const lonLat = ol.proj.transform(coords, 'EPSG:3857', 'EPSG:4326');
                                longitude = lonLat[0];
                                latitude = lonLat[1];
                            }
                            
                            // Afficher les informations dans une popup
                            this.showInfoPopup(coords, {
                                gc_code,
                                name,
                                cache_type: cacheType,
                                difficulty,
                                terrain,
                                longitude: longitude.toFixed(6),
                                latitude: latitude.toFixed(6),
                                corrected,
                                saved,
                                original_coordinates: originalCoordinates
                            });
                        } catch (error) {
                            console.error("Erreur lors de la récupération des coordonnées:", error);
                        }
                    } else {
                        // Cacher la popup si aucun marqueur n'est sélectionné
                        this.hideInfoPopup();
                    }
                });
                
                console.log("Interaction de sélection ajoutée");
            } catch (error) {
                console.error("Erreur lors de l'ajout de l'interaction de sélection:", error);
            }
        }
        
        // Afficher une popup d'information pour un marqueur
        showInfoPopup(coordinates, data) {
            try {
                // Vérifier si l'élément de popup existe déjà
                let popupElement = document.getElementById('map-info-popup');
                
                // Créer l'élément s'il n'existe pas
                if (!popupElement) {
                    popupElement = document.createElement('div');
                    popupElement.id = 'map-info-popup';
                    popupElement.className = 'ol-popup';
                    
                    // Ajouter les styles CSS
                    popupElement.style.position = 'absolute';
                    popupElement.style.backgroundColor = 'white';
                    popupElement.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)';
                    popupElement.style.padding = '15px';
                    popupElement.style.borderRadius = '10px';
                    popupElement.style.border = '1px solid #cccccc';
                    popupElement.style.bottom = '12px';
                    popupElement.style.left = '-50px';
                    popupElement.style.minWidth = '280px';
                    popupElement.style.maxWidth = '350px';
                    
                    // Ajouter un bouton de fermeture
                    const closeButton = document.createElement('a');
                    closeButton.className = 'ol-popup-closer';
                    closeButton.href = '#';
                    closeButton.innerHTML = '&times;';
                    closeButton.style.position = 'absolute';
                    closeButton.style.top = '2px';
                    closeButton.style.right = '8px';
                    closeButton.style.textDecoration = 'none';
                    closeButton.style.color = '#333';
                    closeButton.style.fontSize = '20px';
                    
                    // Ajouter un contenu
                    const contentElement = document.createElement('div');
                    contentElement.className = 'ol-popup-content';
                    
                    // Ajouter les éléments à la popup
                    popupElement.appendChild(closeButton);
                    popupElement.appendChild(contentElement);
                    
                    // Obtenir l'élément cible pour ajouter la popup
                    let targetElement = this.map.getTargetElement();
                    if (!targetElement) {
                        targetElement = this.element; // Fallback sur l'élément du contrôleur
                    }
                    
                    // Ajouter la popup au DOM
                    targetElement.appendChild(popupElement);
                    
                    // Ajouter un gestionnaire d'événements pour le bouton de fermeture
                    closeButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.hideInfoPopup();
                        this.selectInteraction.getFeatures().clear();
                        return false;
                    });
                }
                
                // Récupérer l'élément de contenu
                const contentElement = popupElement.querySelector('.ol-popup-content');
                
                // Préparer les informations de coordonnées
                let coordsHTML = '';
                if (data.corrected) {
                    coordsHTML = `
                        <div style="color: #008800; font-weight: bold;">
                            Coordonnées corrigées: ${data.latitude}, ${data.longitude}
                        </div>
                    `;
                    
                    if (data.original_coordinates) {
                        coordsHTML += `
                            <div style="color: #888888; font-size: 0.9em;">
                                Coordonnées d'origine: ${data.original_coordinates.latitude}, ${data.original_coordinates.longitude}
                            </div>
                        `;
                    }
                } else {
                    coordsHTML = `
                        <div>
                            Coordonnées: ${data.latitude}, ${data.longitude}
                        </div>
                    `;
                }
                
                // Mettre à jour le contenu
                contentElement.innerHTML = `
                    <h3 style="margin: 0 0 10px 0;">${data.gc_code} - ${data.name}</h3>
                    <p style="margin: 0;">
                        <b>Type:</b> ${data.cache_type}<br>
                        <b>Difficulté:</b> ${data.difficulty}, <b>Terrain:</b> ${data.terrain}<br>
                        ${coordsHTML}
                    </p>
                `;
                
                // Créer une superposition pour la popup
                if (!this.popupOverlay) {
                    this.popupOverlay = new ol.Overlay({
                        element: popupElement,
                        positioning: 'bottom-center',
                        stopEvent: false,
                        offset: [0, -10]
                    });
                    this.map.addOverlay(this.popupOverlay);
                }
                
                // Positionner la popup
                this.popupOverlay.setPosition(coordinates);
                
                // Afficher la popup
                popupElement.style.display = 'block';
                
                // Enregistrer cette popup dans notre collection
                this.popups.push({
                    overlay: this.popupOverlay,
                    element: popupElement
                });
            } catch (error) {
                console.error("Erreur lors de l'affichage de la popup d'information:", error);
            }
        }
        
        // Cacher la popup d'information
        hideInfoPopup() {
            try {
                const popupElement = document.getElementById('map-info-popup');
                if (popupElement) {
                    popupElement.style.display = 'none';
                }
            } catch (error) {
                console.error("Erreur lors de la fermeture de la popup d'information:", error);
            }
        }
        
        // Afficher un menu contextuel pour un marqueur
        showMarkerContextMenu(event, data) {
            try {
                // Créer ou récupérer l'élément de menu contextuel
                let contextMenu = document.getElementById('marker-context-menu');
                
                if (!contextMenu) {
                    contextMenu = document.createElement('div');
                    contextMenu.id = 'marker-context-menu';
                    contextMenu.className = 'context-menu';
                    
                    // Styles de base pour le menu
                    contextMenu.style.position = 'absolute';
                    contextMenu.style.backgroundColor = 'white';
                    contextMenu.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                    contextMenu.style.padding = '5px 0';
                    contextMenu.style.borderRadius = '4px';
                    contextMenu.style.minWidth = '150px';
                    contextMenu.style.zIndex = '1000';
                    
                    // Ajouter au DOM
                    document.body.appendChild(contextMenu);
                    
                    // Fermer le menu au clic ailleurs
                    document.addEventListener('click', (e) => {
                        if (!contextMenu.contains(e.target)) {
                            contextMenu.style.display = 'none';
                        }
                    });
                }
                
                // Options disponibles selon le statut
                let menuHTML = `
                    <div class="menu-header" style="padding: 5px 10px; font-weight: bold; border-bottom: 1px solid #eee;">
                        ${data.gc_code}
                    </div>
                `;
                
                // Option de copie de coordonnées
                menuHTML += `
                    <div class="menu-item" style="padding: 5px 10px; cursor: pointer;" 
                         onclick="navigator.clipboard.writeText('${data.latitude}, ${data.longitude}'); document.getElementById('marker-context-menu').style.display = 'none';">
                        Copier les coordonnées
                    </div>
                `;
                
                // Option de sauvegarde si corrigé mais pas sauvegardé
                if (data.corrected && !data.saved) {
                    menuHTML += `
                        <div class="menu-item" style="padding: 5px 10px; cursor: pointer;" 
                             onclick="document.dispatchEvent(new CustomEvent('saveMarkerCoordinates', {detail: {id: ${data.id}, lat: ${data.latitude}, lon: ${data.longitude}}})); document.getElementById('marker-context-menu').style.display = 'none';">
                            Sauvegarder les coordonnées
                        </div>
                    `;
                }
                
                // Option pour ouvrir la page de la géocache
                menuHTML += `
                    <div class="menu-item" style="padding: 5px 10px; cursor: pointer;" 
                         onclick="window.open('/geocaches/${data.id}', '_blank'); document.getElementById('marker-context-menu').style.display = 'none';">
                        Voir la géocache
                    </div>
                `;
                
                // Mettre à jour le contenu
                contextMenu.innerHTML = menuHTML;
                
                // Positionner le menu
                contextMenu.style.left = event.pageX + 'px';
                contextMenu.style.top = event.pageY + 'px';
                contextMenu.style.display = 'block';
                
                // Écouter l'événement de sauvegarde
                document.addEventListener('saveMarkerCoordinates', this.handleSaveCoordinates.bind(this));
            } catch (error) {
                console.error("Erreur lors de l'affichage du menu contextuel de marqueur:", error);
            }
        }
        
        // Afficher un menu contextuel pour un point de la carte
        showMapContextMenu(event, data) {
            try {
                // Créer ou récupérer l'élément de menu contextuel
                let contextMenu = document.getElementById('map-context-menu');
                
                if (!contextMenu) {
                    contextMenu = document.createElement('div');
                    contextMenu.id = 'map-context-menu';
                    contextMenu.className = 'context-menu';
                    
                    // Styles de base pour le menu
                    contextMenu.style.position = 'absolute';
                    contextMenu.style.backgroundColor = 'white';
                    contextMenu.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                    contextMenu.style.padding = '5px 0';
                    contextMenu.style.borderRadius = '4px';
                    contextMenu.style.minWidth = '150px';
                    contextMenu.style.zIndex = '1000';
                    
                    // Ajouter au DOM
                    document.body.appendChild(contextMenu);
                    
                    // Fermer le menu au clic ailleurs
                    document.addEventListener('click', (e) => {
                        if (!contextMenu.contains(e.target)) {
                            contextMenu.style.display = 'none';
                        }
                    });
                }
                
                // Options du menu
                let menuHTML = `
                    <div class="menu-header" style="padding: 5px 10px; font-weight: bold; border-bottom: 1px solid #eee;">
                        Position sur la carte
                    </div>
                    <div class="menu-item" style="padding: 5px 10px; cursor: pointer;" 
                         onclick="navigator.clipboard.writeText('${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}'); document.getElementById('map-context-menu').style.display = 'none';">
                        Copier les coordonnées
                    </div>
                `;
                
                // Mettre à jour le contenu
                contextMenu.innerHTML = menuHTML;
                
                // Positionner le menu
                contextMenu.style.left = event.pageX + 'px';
                contextMenu.style.top = event.pageY + 'px';
                contextMenu.style.display = 'block';
            } catch (error) {
                console.error("Erreur lors de l'affichage du menu contextuel de carte:", error);
            }
        }
        
        // Gérer la sauvegarde des coordonnées
        handleSaveCoordinates(event) {
            try {
                const { id, lat, lon } = event.detail;
                
                if (id && lat && lon) {
                    this.saveCoordinates(id, lat, lon)
                        .then(success => {
                            if (success) {
                                // Mettre à jour le statut du marqueur
                                this.markers.forEach(marker => {
                                    if (marker.geocache.id === id) {
                                        marker.feature.set('saved', true);
                                        
                                        // Réappliquer le style
                                        this.vectorLayer.changed();
                                        
                                        // Notification de succès
                                        this.notifySuccess(`Coordonnées sauvegardées pour ${marker.geocache.gc_code}`);
                                    }
                                });
                            }
                        });
                }
            } catch (error) {
                console.error("Erreur lors de la sauvegarde des coordonnées depuis le menu:", error);
            }
        }
        
        // Afficher une notification de succès
        notifySuccess(message) {
            try {
                // Créer un élément de notification
                const notification = document.createElement('div');
                notification.className = 'map-notification success';
                notification.textContent = message;
                
                // Styles pour la notification
                notification.style.position = 'fixed';
                notification.style.top = '20px';
                notification.style.right = '20px';
                notification.style.backgroundColor = '#4CAF50';
                notification.style.color = 'white';
                notification.style.padding = '10px 15px';
                notification.style.borderRadius = '4px';
                notification.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                notification.style.zIndex = '10000';
                notification.style.transition = 'opacity 0.3s ease-in-out';
                
                // Ajouter au DOM
                document.body.appendChild(notification);
                
                // Supprimer après un délai
                setTimeout(() => {
                    notification.style.opacity = '0';
                    setTimeout(() => {
                        notification.remove();
                    }, 300);
                }, 3000);
            } catch (error) {
                console.error("Erreur lors de l'affichage de la notification de succès:", error);
            }
        }
        
        // Afficher une notification d'erreur
        notifyError(message) {
            try {
                // Créer un élément de notification
                const notification = document.createElement('div');
                notification.className = 'map-notification error';
                notification.textContent = message;
                
                // Styles pour la notification
                notification.style.position = 'fixed';
                notification.style.top = '20px';
                notification.style.right = '20px';
                notification.style.backgroundColor = '#F44336';
                notification.style.color = 'white';
                notification.style.padding = '10px 15px';
                notification.style.borderRadius = '4px';
                notification.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                notification.style.zIndex = '10000';
                notification.style.transition = 'opacity 0.3s ease-in-out';
                
                // Ajouter au DOM
                document.body.appendChild(notification);
                
                // Supprimer après un délai
                setTimeout(() => {
                    notification.style.opacity = '0';
                    setTimeout(() => {
                        notification.remove();
                    }, 5000);
                }, 5000);
            } catch (error) {
                console.error("Erreur lors de l'affichage de la notification d'erreur:", error);
            }
        }
        
        // Adapter la vue pour montrer tous les marqueurs
        fitMapToMarkers() {
            try {
                if (this.markers.length === 0) {
                    console.warn("Aucun marqueur à afficher");
                    return;
                }
                
                // Créer une étendue pour tous les marqueurs
                const extent = this.vectorSource.getExtent();
                
                // Vérifier que l'étendue est valide
                if (extent && extent.some(c => isFinite(c))) {
                    // Adapter la vue avec une petite marge
                    this.map.getView().fit(extent, {
                        padding: [50, 50, 50, 50],
                        maxZoom: 14
                    });
                    
                    console.log("Vue adaptée aux marqueurs");
                } else {
                    console.warn("Impossible d'adapter la vue - étendue invalide");
                }
            } catch (error) {
                console.error("Erreur lors de l'adaptation de la vue aux marqueurs:", error);
            }
        }
        
        // Effacer tous les marqueurs de la carte
        clearMarkers() {
            try {
                // Vider la source vectorielle
                if (this.vectorSource) {
                    this.vectorSource.clear();
                }
                
                // Réinitialiser le tableau des marqueurs
                this.markers = [];
                
                // Cacher les popups
                this.hideInfoPopup();
                
                console.log("Tous les marqueurs ont été effacés");
            } catch (error) {
                console.error("Erreur lors de l'effacement des marqueurs:", error);
            }
        }

        // Méthode améliorée de chargement des géocaches du MultiSolver
        async loadMultiSolverGeocaches(multiSolverId) {
            if (!multiSolverId) {
                console.error("ID Multi Solver manquant - impossible de charger les géocaches");
                return;
            }
            
            console.log(`Chargement des géocaches pour Multi Solver: ${multiSolverId}`);
            
            if (!this.map) {
                console.error("La carte n'est pas initialisée - impossible de charger les géocaches");
                return;
            }
            
            // Effacer les marqueurs existants
            this.clearMarkers();
            
            try {
                // Stratégie de récupération des données par ordre de priorité
                let geocaches = [];
                let dataSource = '';
                
                // Fonction pour vérifier si le tableau de géocaches est valide
                const isValidGeocachesArray = (data) => {
                    return Array.isArray(data) && data.length > 0 && data[0].gc_code;
                };
                
                // 1. Essayer de récupérer depuis le tableau global
                if (typeof window.multiSolverTableResults !== 'undefined' && 
                    isValidGeocachesArray(window.multiSolverTableResults)) {
                    geocaches = window.multiSolverTableResults;
                    dataSource = 'window.multiSolverTableResults';
                    console.log("Données récupérées depuis la variable globale multiSolverTableResults");
                }
                
                // 2. Essayer de récupérer depuis le localStorage ou sessionStorage
                if (geocaches.length === 0) {
                    try {
                        // Essayer d'abord sessionStorage puis localStorage
                        let storedData = null;
                        
                        if (sessionStorage && sessionStorage.getItem('multiSolverResults')) {
                            storedData = JSON.parse(sessionStorage.getItem('multiSolverResults'));
                            dataSource = 'sessionStorage';
                        } else if (localStorage && localStorage.getItem('multiSolverResults')) {
                            storedData = JSON.parse(localStorage.getItem('multiSolverResults'));
                            dataSource = 'localStorage';
                        }
                        
                        if (isValidGeocachesArray(storedData)) {
                            geocaches = storedData;
                            console.log(`Données récupérées depuis ${dataSource}`);
                        }
                    } catch (storageError) {
                        console.warn("Erreur lors de la récupération depuis le stockage:", storageError);
                    }
                }
                
                // 3. Essayer de récupérer depuis le DOM via Tabulator
                if (geocaches.length === 0) {
                    const multiSolverTable = document.getElementById('multi-solver-results-table');
                    if (multiSolverTable && typeof multiSolverTable._tabulator !== 'undefined') {
                        try {
                            const tabulatorData = multiSolverTable._tabulator.getData();
                            if (isValidGeocachesArray(tabulatorData)) {
                                geocaches = tabulatorData;
                                dataSource = 'Tabulator';
                                console.log("Données récupérées depuis Tabulator");
                            }
                        } catch (tabulatorError) {
                            console.warn("Erreur lors de la récupération depuis Tabulator:", tabulatorError);
                        }
                    }
                }
                
                // 4. Demander les données via l'API REST directement si nécessaire
                if (geocaches.length === 0 && multiSolverId) {
                    try {
                        console.log("Tentative de récupération des données via API REST directe");
                        const response = await fetch(`/api/multi-solvers/${multiSolverId}/geocaches`);
                        if (response.ok) {
                            const apiData = await response.json();
                            if (isValidGeocachesArray(apiData)) {
                                geocaches = apiData;
                                dataSource = 'API REST';
                                console.log("Données récupérées depuis l'API REST");
                                
                                // Afficher les 2 premiers éléments pour analyse
                                console.log("Échantillon des données de l'API:");
                                if (apiData.length > 0) {
                                    console.log("Premier élément:", JSON.stringify(apiData[0], null, 2));
                                    if (apiData.length > 1) {
                                        console.log("Deuxième élément:", JSON.stringify(apiData[1], null, 2));
                                    }
                                    
                                    // Vérifier spécifiquement les coordonnées corrigées
                                    const withCorrectedCoords = apiData.filter(gc => 
                                        gc.corrected_coordinates && 
                                        gc.corrected_coordinates.latitude && 
                                        gc.corrected_coordinates.longitude);
                                    
                                    console.log(`Géocaches avec coordonnées corrigées: ${withCorrectedCoords.length}/${apiData.length}`);
                                    
                                    if (withCorrectedCoords.length > 0) {
                                        console.log("Exemple de géocache avec coordonnées corrigées:", 
                                            JSON.stringify(withCorrectedCoords[0].corrected_coordinates, null, 2));
                                    } else {
                                        console.warn("Aucune géocache ne contient de coordonnées corrigées!");
                                    }
                                }
                            } else {
                                console.warn("Les données de l'API ne sont pas un tableau valide de géocaches", apiData);
                            }
                        } else {
                            console.warn(`API a retourné une erreur: ${response.status} ${response.statusText}`);
                            // Essayer de lire le corps de l'erreur si disponible
                            try {
                                const errorBody = await response.text();
                                console.warn("Détails de l'erreur API:", errorBody);
                            } catch (e) {
                                console.warn("Impossible de lire les détails de l'erreur API");
                            }
                        }
                    } catch (apiError) {
                        console.warn("Erreur lors de la récupération via API:", apiError);
                    }
                }
                
                // Si nous avons trouvé des données valides, les traiter
                if (geocaches.length > 0) {
                    console.log(`${geocaches.length} géocaches trouvées depuis ${dataSource}`);
                    
                    // Afficher un échantillon pour le débogage
                    console.log("Échantillon des données:", {
                        premier: geocaches[0],
                        structureClés: Object.keys(geocaches[0]),
                        hasCorrectCoordinates: geocaches.some(g => g.corrected_coordinates),
                        hasOriginalData: geocaches.some(g => g.original_data)
                    });
                    
                    // Compteurs pour le reporting
                    let markersAdded = 0;
                    let markersSkipped = 0;
                    let coordinatesCorrected = 0;
                    
                    // Récupérer l'état de l'auto-correction
                    const autoCorrectEnabled = document.getElementById('auto-correct-coordinates')?.checked || false;
                    console.log("Auto-correction activée:", autoCorrectEnabled);
                    
                    // Traitement spécial pour forceUpdate - Forcer une mise à jour quelles que soient les données
                    if (forceUpdate) {
                        console.log("%c[EnhancedZoneMap] Force Update activé: traitement spécial", "background:red; color:white; font-weight:bold");
                        
                        // Pour chaque géocache, créer une copie et s'assurer que les attributs nécessaires sont définis
                        for (let i = 0; i < geocaches.length; i++) {
                            const geocache = Object.assign({}, geocaches[i]);
                            
                            // Si l'objet a des coordonnées original_data.corrected_coordinates mais pas dans l'objet principal
                            if (geocache.original_data && geocache.original_data.corrected_coordinates && 
                                geocache.original_data.corrected_coordinates.exist === true) {
                                
                                // S'assurer que l'objet coordinates existe
                                if (!geocache.coordinates) {
                                    geocache.coordinates = {};
                                }
                                
                                // Copier les valeurs depuis corrected_coordinates si elles existent
                                if (geocache.original_data.corrected_coordinates.latitude && 
                                    geocache.original_data.corrected_coordinates.longitude) {
                                    
                                    geocache.coordinates.latitude = geocache.original_data.corrected_coordinates.latitude;
                                    geocache.coordinates.longitude = geocache.original_data.corrected_coordinates.longitude;
                                    geocache.corrected = true;
                                    geocache.saved = false;
                                    
                                    // Mettre à jour la géocache dans le tableau
                                    geocaches[i] = geocache;
                                    
                                    console.log(`%c[EnhancedZoneMap] Géocache ${i} (${geocache.gc_code}): Coordonnées corrigées propagées`, 
                                        "background:green; color:white", {
                                            lat: geocache.coordinates.latitude,
                                            lon: geocache.coordinates.longitude
                                        });
                                }
                            }
                        }
                    }
                    
                    // Vérifier quelles caches sont dans le tableau multiSolverTableResults (côté multi_solver.html)
                    // par rapport à celles reçues dans l'événement (côté carte)
                    console.group("%c[EnhancedZoneMap] Analyse des données reçues vs attendues", "background:yellow; color:black; font-weight:bold");

                    // Récupérer les GC codes des géocaches
                    const receivedGcCodes = geocaches.map(gc => gc.gc_code);

                    // Vérifier si certaines caches ont des coordonnées corrigées mais ne sont pas traitées
                    let countWithCoordinates = 0;
                    geocaches.forEach((gc, idx) => {
                        // Vérifier si la géocache a des coordonnées corrigées
                        const hasCoords = (gc.coordinates && gc.corrected === true) ||
                                         (gc.original_data && gc.original_data.corrected_coordinates && 
                                          gc.original_data.corrected_coordinates.exist === true);
                        
                        if (hasCoords) {
                            countWithCoordinates++;
                            // Pour les géocaches avec coordonnées, vérifier si elles ont des valeurs valides
                            if (gc.coordinates) {
                                console.log(`%c[EnhancedZoneMap] Géocache ${idx} (${gc.gc_code}) avec coordonnées:`, 
                                    "background:green; color:white", {
                                        lat: gc.coordinates.latitude,
                                        lon: gc.coordinates.longitude,
                                        corrected: gc.corrected,
                                        saved: gc.saved
                                    });
                            } else if (gc.original_data && gc.original_data.corrected_coordinates) {
                                console.log(`%c[EnhancedZoneMap] Géocache ${idx} (${gc.gc_code}) avec corrected_coordinates:`, 
                                    "background:orange; color:black", {
                                        lat: gc.original_data.corrected_coordinates.latitude,
                                        lon: gc.original_data.corrected_coordinates.longitude,
                                        exist: gc.original_data.corrected_coordinates.exist
                                    });
                            }
                        }
                    });

                    console.log("%c[EnhancedZoneMap] Résumé des données:", "background:yellow; color:black", {
                        totalReceived: geocaches.length,
                        withCoordinates: countWithCoordinates,
                        receivedGcCodes: receivedGcCodes
                    });
                    console.groupEnd();
                    
                    // Traiter chaque géocache
                    for (let i = 0; i < geocaches.length; i++) {
                        const geocache = geocaches[i];
                        
                        // Skip les entrées invalides
                        if (!geocache || !geocache.gc_code) {
                            console.warn(`Géocache ${i}: Données invalides, ignorée`);
                            markersSkipped++;
                            continue;
                        }
                        
                        // Initialiser les attributs
                        let corrected = false;
                        let saved = false;
                        let latitude = null;
                        let longitude = null;
                        let originalCoordinates = null;
                        
                        // 1. Priorité: Coordonnées corrigées déjà sauvegardées
                        if (geocache.corrected_coordinates) {
                            try {
                                let hasValidCoordinates = false;
                                
                                // Première tentative: utiliser latitude/longitude numériques
                                if (geocache.corrected_coordinates.latitude && geocache.corrected_coordinates.longitude) {
                            latitude = parseFloat(geocache.corrected_coordinates.latitude);
                            longitude = parseFloat(geocache.corrected_coordinates.longitude);
                            
                                    if (!isNaN(latitude) && !isNaN(longitude)) {
                                        hasValidCoordinates = true;
                                        console.log(`Géocache ${i} (${geocache.gc_code}): Coordonnées corrigées numériques valides trouvées:`, {
                                            latitude,
                                            longitude
                                        });
                                    } else {
                                        console.warn(`Géocache ${i} (${geocache.gc_code}): Échec du parsing numérique:`, {
                                            raw_latitude: geocache.corrected_coordinates.latitude,
                                            raw_longitude: geocache.corrected_coordinates.longitude
                                        });
                                    }
                                }
                                
                                // Deuxième tentative: essayer gc_lat/gc_lon qui pourraient être au format DDM
                                if (!hasValidCoordinates && geocache.corrected_coordinates.gc_lat && geocache.corrected_coordinates.gc_lon) {
                                    const lat = this.parseCoordinateString(geocache.corrected_coordinates.gc_lat);
                                    const lon = this.parseCoordinateString(geocache.corrected_coordinates.gc_lon);
                                    
                                    if (lat !== null && lon !== null) {
                                        latitude = lat;
                                        longitude = lon;
                                        hasValidCoordinates = true;
                                        console.log(`Géocache ${i} (${geocache.gc_code}): Coordonnées corrigées parsées depuis gc_lat/gc_lon:`, {
                                            gc_lat: geocache.corrected_coordinates.gc_lat,
                                            gc_lon: geocache.corrected_coordinates.gc_lon,
                                            latitude,
                                            longitude
                                        });
                                    } else {
                                        console.warn(`Géocache ${i} (${geocache.gc_code}): Échec du parsing DDM:`, {
                                            gc_lat: geocache.corrected_coordinates.gc_lat,
                                            gc_lon: geocache.corrected_coordinates.gc_lon
                                        });
                                    }
                                }
                                
                                // Si nous avons des coordonnées valides, procéder avec les coordonnées corrigées
                                if (hasValidCoordinates) {
                            // Stocker les coordonnées originales si disponibles
                            if (geocache.coordinates && 
                                geocache.coordinates.latitude && 
                                geocache.coordinates.longitude) {
                                originalCoordinates = {
                                    latitude: parseFloat(geocache.coordinates.latitude),
                                    longitude: parseFloat(geocache.coordinates.longitude)
                                };
                            }
                            
                            // Marquer comme corrigées et sauvegardées (ou utiliser les attributs existants)
                            corrected = true;
                            saved = saved || true; // Conserver la valeur existante ou utiliser true par défaut
                            coordinatesCorrected++;
                            
                                    console.log(`Géocache ${i} (${geocache.gc_code}): Coordonnées corrigées sauvegardées utilisées`);
                                } else {
                                    // Solution de secours: essayer d'utiliser les coordonnées standards
                                    if (geocache.coordinates && 
                                        geocache.coordinates.latitude && 
                                        geocache.coordinates.longitude) {
                                        try {
                                            const stdLat = parseFloat(geocache.coordinates.latitude);
                                            const stdLon = parseFloat(geocache.coordinates.longitude);
                                            
                                            if (!isNaN(stdLat) && !isNaN(stdLon)) {
                                                latitude = stdLat;
                                                longitude = stdLon;
                                                corrected = corrected || false; // Utiliser l'attribut existant ou false par défaut
                                                saved = saved || false;        // Utiliser l'attribut existant ou false par défaut
                                                console.log(`Géocache ${i} (${geocache.gc_code}): Utilisation des coordonnées standards comme solution de secours`);
                                            }
                                        } catch (fallbackError) {
                                            console.error(`Géocache ${i} (${geocache.gc_code}): Erreur lors de la solution de secours:`, fallbackError);
                                        }
                                    }
                                }
                            } catch (error) {
                                console.error(`Géocache ${i} (${geocache.gc_code}): Exception lors du traitement des coordonnées corrigées:`, error);
                            }
                        }
                        // 2. Coordonnées extraites des données brutes
                        else if (geocache.original_data && geocache.original_data.combined_results) {
                            const result = this.extractCoordinatesFromCombinedResults(
                                geocache.original_data.combined_results,
                                geocache.gc_code,
                                i
                            );
                            
                            if (result.success) {
                                latitude = result.latitude;
                                longitude = result.longitude;
                                
                                // Stocker les coordonnées originales
                                if (geocache.coordinates && 
                                    geocache.coordinates.latitude && 
                                    geocache.coordinates.longitude) {
                                    originalCoordinates = {
                                        latitude: parseFloat(geocache.coordinates.latitude),
                                        longitude: parseFloat(geocache.coordinates.longitude)
                                    };
                                }
                                
                                // Marquer comme corrigées
                                corrected = true;
                                saved = autoCorrectEnabled; // Sauvegarder si l'auto-correction est activée
                                coordinatesCorrected++;
                                
                                // Sauvegarder automatiquement si l'option est activée
                                if (autoCorrectEnabled && geocache.id) {
                                    this.saveCoordinates(geocache.id, latitude, longitude)
                                        .then(success => console.log(`Auto-sauvegarde pour ${geocache.gc_code}: ${success ? 'réussie' : 'échouée'}`));
                                }
                            }
                        }
                        
                        // 3. Utiliser les coordonnées standards si aucune correction n'est disponible
                        if (!latitude || !longitude) {
                            // Essayer d'abord geocache.coordinates
                            if (geocache.coordinates && 
                                geocache.coordinates.latitude && 
                                geocache.coordinates.longitude) {
                                latitude = parseFloat(geocache.coordinates.latitude);
                                longitude = parseFloat(geocache.coordinates.longitude);
                                // Important: ne pas modifier les flags corrected/saved ici
                                // On utilise les coordonnées standards seulement si aucune coordonnée corrigée n'a été trouvée
                                console.log(`Géocache ${i} (${geocache.gc_code}): Utilisation des coordonnées standards`);
                            }
                            // Sinon, essayer les propriétés directes
                            else if (geocache.latitude && geocache.longitude) {
                                latitude = parseFloat(geocache.latitude);
                                longitude = parseFloat(geocache.longitude);
                                // Important: ne pas modifier les flags corrected/saved ici
                                // On utilise les coordonnées standards seulement si aucune coordonnée corrigée n'a été trouvée
                                console.log(`Géocache ${i} (${geocache.gc_code}): Utilisation des coordonnées directes`);
                            }
                        }
                        
                        // Ajouter le marqueur si nous avons des coordonnées valides
                        if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
                            // Préparer les données complètes pour le marqueur
                            const markerData = {
                                ...geocache,
                                latitude,
                                longitude,
                                gc_code: geocache.gc_code,
                                name: geocache.name || 'Sans nom',
                                id: geocache.id || `temp-${geocache.gc_code}`,
                                cache_type: geocache.cache_type || 'Unknown',
                                difficulty: geocache.difficulty || '?',
                                terrain: geocache.terrain || '?',
                                corrected,
                                saved,
                                original_coordinates: originalCoordinates
                            };
                            
                            // Ajouter le marqueur
                            const marker = this.addMarkerWithGeocache(markerData);
                            
                            if (marker) {
                                markersAdded++;
                                
                                // Loguer les détails si c'est un point corrigé
                                if (corrected) {
                                    console.log(`Géocache ${i} (${geocache.gc_code}): Marqueur ajouté comme ${corrected && saved ? 'losange' : 'carré'}`);
                                }
                            }
                        } else {
                            console.warn(`Géocache ${i} (${geocache.gc_code}): Pas de coordonnées valides, marqueur ignoré`);
                            markersSkipped++;
                        }
                    }
                    
                    // Log des résultats finaux
                    console.log(`Marqueurs ajoutés: ${markersAdded}, ignorés: ${markersSkipped}, coordonnées corrigées: ${coordinatesCorrected}`);
                    
                    // Ajuster la vue pour montrer tous les marqueurs
                    if (markersAdded > 0) {
                        this.fitMapToMarkers();
                        return; // Sortir de la fonction si le traitement est réussi
                    }
                } else {
                    console.warn("Aucune géocache trouvée dans les sources disponibles");
                }
                
                // Si nous arrivons ici, c'est que nous n'avons pas pu charger de données - demander via un événement
                console.log("Demande de données via événement multiSolverDataRequested");
                window.dispatchEvent(new CustomEvent('multiSolverDataRequested', {
                    detail: {
                        multiSolverId: multiSolverId,
                        requesterId: this.element?.id || 'enhanced-zone-map'
                    }
                }));
                
            console.log("En attente des données du Multi Solver via l'événement multiSolverDataUpdated");
            } catch (error) {
                console.error("Erreur lors du chargement des géocaches du Multi Solver:", error);
                this.notifyError("Erreur lors du chargement des géocaches");
            }
        }
        
        // Fonction utilitaire pour convertir les coordonnées DDM en coordonnées décimales
        convertDDMToDecimal(north, east) {
            if (!north || !east) {
                console.warn("Coordonnées DDM incomplètes:", north, east);
                return { lat: null, lon: null };
            }
            
            try {
                // Nettoyer les chaînes
                north = north.trim();
                east = east.trim();
                
                // Extraire les parties des coordonnées
                const northMatch = north.match(/([NS])\s*(\d+)°\s*([\d.]+)/i);
                const eastMatch = east.match(/([EW])\s*(\d+)°\s*([\d.]+)/i);
                
                if (!northMatch || !eastMatch) {
                    console.warn("Format DDM non reconnu:", north, east);
                    return { lat: null, lon: null };
                }
                
                // Extraire les composants
                const northDir = northMatch[1].toUpperCase();
                const northDeg = parseInt(northMatch[2]);
                const northMin = parseFloat(northMatch[3]);
                
                const eastDir = eastMatch[1].toUpperCase();
                const eastDeg = parseInt(eastMatch[2]);
                const eastMin = parseFloat(eastMatch[3]);
                
                // Convertir en décimal
                let lat = northDeg + (northMin / 60);
                if (northDir === 'S') lat = -lat;
                
                let lon = eastDeg + (eastMin / 60);
                if (eastDir === 'W') lon = -lon;
                
                console.log("Conversion DDM réussie:", { original: { north, east }, converted: { lat, lon } });
                return { lat, lon };
            } catch (error) {
                console.error("Erreur lors de la conversion DDM:", error);
                return { lat: null, lon: null };
            }
        }
        
        // Fonction pour sauvegarder les coordonnées sur le serveur
        async saveCoordinates(geocacheId, lat, lon) {
            try {
                if (!geocacheId) {
                    console.error("ID de géocache manquant pour la sauvegarde");
                    return false;
                }
                
                // Vérifier si lat et lon sont des nombres
                let latitude = lat;
                let longitude = lon;
                
                // Si ce sont des chaînes de caractères au format DDM, essayer de les convertir
                if (typeof lat === 'string' && typeof lon === 'string') {
                    // Vérifier si le format semble être du DDM
                    const latRegex = /([NS])\s*(\d+)°\s*([0-9.]+)/i;
                    const lonRegex = /([EW])\s*(\d+)°\s*([0-9.]+)/i;
                    
                    if (latRegex.test(lat) && lonRegex.test(lon)) {
                        console.log("Coordonnées au format DDM détectées, tentative de conversion...");
                        const latMatch = lat.match(latRegex);
                        const lonMatch = lon.match(lonRegex);
                        
                        if (latMatch && lonMatch) {
                            const latDir = latMatch[1].toUpperCase();
                            const latDeg = parseInt(latMatch[2]);
                            const latMin = parseFloat(latMatch[3]);
                            
                            const lonDir = lonMatch[1].toUpperCase();
                            const lonDeg = parseInt(lonMatch[2]);
                            const lonMin = parseFloat(lonMatch[3]);
                            
                            // Conversion en décimal
                            latitude = latDeg + (latMin / 60);
                            if (latDir === 'S') latitude = -latitude;
                            
                            longitude = lonDeg + (lonMin / 60);
                            if (lonDir === 'W') longitude = -longitude;
                            
                            console.log("Coordonnées converties:", { latitude, longitude });
                        }
                    } else {
                        // Si lat et lon sont des chaînes mais pas au format DDM, essayer de les parser en flottants
                        const parsedLat = parseFloat(lat);
                        const parsedLon = parseFloat(lon);
                        
                        if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
                            latitude = parsedLat;
                            longitude = parsedLon;
                } else {
                            console.error("Format de coordonnées non reconnu:", { lat, lon });
                    return false;
                }
                    }
                }
                
                // À ce stade, latitude et longitude devraient être des nombres décimaux
                if (isNaN(latitude) || isNaN(longitude)) {
                    console.error("Coordonnées invalides après conversion:", { latitude, longitude });
                    return false;
                }
                
                console.log(`Sauvegarde des coordonnées pour ${geocacheId}: ${latitude}, ${longitude}`);
                
                // Récupérer le token CSRF si présent
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
                
                // Construire les données de la requête
                const requestData = {
                    geocache_id: geocacheId,
                    latitude: latitude,
                    longitude: longitude
                };
                
                // Appeler l'API pour sauvegarder les coordonnées
                const response = await fetch('/api/geocaches/coordinates', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRFToken': csrfToken || ''
                    },
                    body: JSON.stringify(requestData)
                });
                
                if (!response.ok) {
                    console.error(`Erreur HTTP lors de la sauvegarde: ${response.status} ${response.statusText}`);
                    return false;
                }
                
                const result = await response.json();
                console.log("Résultat de la sauvegarde:", result);
                
                return true;
            } catch (error) {
                console.error("Erreur lors de la sauvegarde des coordonnées:", error);
                return false;
            }
        }
        
        // Méthode pour injecter manuellement des coordonnées corrigées (pour tests)
        injectCorrectedCoordinates() {
            console.group("💉 Injection manuelle de coordonnées corrigées");
            
            try {
                // Vérifier si nous avons des marqueurs
                if (!this.vectorSource || this.vectorSource.getFeatures().length === 0) {
                    console.warn("Aucun marqueur disponible pour l'injection");
                    return false;
                }
                
                const features = this.vectorSource.getFeatures();
                console.log(`Injection sur ${features.length} marqueurs existants`);
                
                let injectedCount = 0;
                
                // Pour chaque feature, injecter des coordonnées corrigées
                features.forEach((feature, index) => {
                    // Récupérer les coordonnées actuelles
                    const geometry = feature.getGeometry();
                    const coords = geometry.getCoordinates();
                    const [longitude, latitude] = ol.proj.transform(coords, 'EPSG:3857', 'EPSG:4326');
                    
                    // Créer un léger décalage pour simuler des coordonnées corrigées
                    // Varier le décalage en fonction de l'index pour différencier visuellement
                    const offset = 0.001 * (1 + (index % 3));
                    const correctedLat = latitude + offset;
                    const correctedLon = longitude + offset;
                    
                    // Définir les attributs corrected et saved
                    const isSaved = index % 2 === 0; // Alterner entre sauvegardé et non-sauvegardé
                    feature.set('corrected', true);
                    feature.set('saved', isSaved);
                    
                    // Stocker les coordonnées originales
                    feature.set('original_coordinates', {
                        latitude: latitude,
                        longitude: longitude
                    });
                    
                    // Modifier la géométrie pour utiliser les coordonnées corrigées
                    // Note: Ne pas faire ça dans un cas réel, seulement pour le test
                    if (index % 4 !== 0) { // Garder quelques marqueurs inchangés
                        const newCoords = ol.proj.fromLonLat([correctedLon, correctedLat]);
                        geometry.setCoordinates(newCoords);
                    }
                    
                    console.log(`Marqueur ${index} (${feature.get('gc_code')}): Coordonnées ${isSaved ? 'corrigées et sauvegardées' : 'corrigées mais non sauvegardées'}`);
                    injectedCount++;
                });
                
                // Forcer un rafraîchissement de la couche
                this.vectorLayer.changed();
                
                // Nettoyer le cache de style pour forcer sa reconstruction
                this.styleCache.clear();
                this.loggedStyles.clear();
                
                console.log(`${injectedCount} marqueurs ont été modifiés avec des coordonnées corrigées injectées`);
                return true;
            } catch (error) {
                console.error("Erreur lors de l'injection des coordonnées:", error);
                return false;
            } finally {
                console.groupEnd();
            }
        }
        
        // Méthode utilitaire pour effectuer des diagnostics
        runDiagnostics() {
            try {
                console.group("== DIAGNOSTICS DU CONTRÔLEUR ENHANCED ZONE MAP ==");
                
                // 1. Vérifier l'état global
                console.log("État du contrôleur:", {
                    mapInitialized: !!this.map,
                    markersCount: this.markers?.length || 0,
                    vectorSourceFeatures: this.vectorSource?.getFeatures()?.length || 0,
                    multiSolverId: this.multiSolverIdValue
                });
                
                // 2. Vérifier la structure des données de géocaches
                if (this.markers && this.markers.length > 0) {
                    const sampleMarker = this.markers[0];
                    console.log("Structure d'un marqueur:", sampleMarker);
                    console.log("Structure d'une géocache:", sampleMarker.geocache);
                    
                    // Analyser les attributs importants
                    const correctedMarkers = this.markers.filter(m => m.geocache.corrected === true);
                    const savedMarkers = this.markers.filter(m => m.geocache.saved === true);
                    
                    console.log("Analyse des marqueurs:", {
                        total: this.markers.length,
                        corrected: correctedMarkers.length,
                        saved: savedMarkers.length,
                        exempleCorrected: correctedMarkers.length > 0 ? correctedMarkers[0].geocache.gc_code : 'aucun'
                    });
                    
                    // Vérifier les attributs des features
                    const correctedFeatures = this.vectorSource.getFeatures().filter(f => f.get('corrected') === true);
                    const savedFeatures = this.vectorSource.getFeatures().filter(f => f.get('saved') === true);
                    
                    console.log("Analyse des features:", {
                        total: this.vectorSource.getFeatures().length,
                        corrected: correctedFeatures.length,
                        saved: savedFeatures.length
                    });
                } else {
                    console.warn("Aucun marqueur pour analyser la structure des données");
                }
                
                // 3. Vérifier si les données session sont disponibles
                if (window.sessionStorage) {
                    try {
                        const storedData = sessionStorage.getItem('multiSolverResults');
                        if (storedData) {
                            const parsedData = JSON.parse(storedData);
                            console.log("Données dans sessionStorage:", {
                                count: parsedData.length,
                                hasCorrectedCoordinates: parsedData.some(g => 
                                    g.corrected_coordinates && 
                                    g.corrected_coordinates.latitude && 
                                    g.corrected_coordinates.longitude
                                ),
                                hasOriginalData: parsedData.some(g => g.original_data)
                            });
                        } else {
                            console.warn("Aucune donnée dans sessionStorage");
                        }
                    } catch (e) {
                        console.error("Erreur lors de la lecture des données session:", e);
                    }
                }
                
                console.groupEnd();
                
                // Retourner un résumé des diagnostics
                return {
                    mapInitialized: !!this.map,
                    markersCount: this.markers?.length || 0,
                    hasMarkers: this.markers?.length > 0,
                    styleCacheEntries: Object.keys(this.styleCache || {}).length
                };
            } catch (error) {
                console.error("Erreur lors de l'exécution des diagnostics:", error);
                return { error: error.message };
            }
        }

        // Fonction de débogage pour analyser le contenu de sessionStorage
        debugStorage() {
            console.group("🔍 Diagnostic du stockage pour EnhancedZoneMapController");
            
            try {
                // 1. Vérifier sessionStorage
                console.log("=== Analyse de sessionStorage ===");
                if (sessionStorage && sessionStorage.getItem('multiSolverResults')) {
                    try {
                        const storedData = JSON.parse(sessionStorage.getItem('multiSolverResults'));
                        console.log(`multiSolverResults: ${storedData.length} géocaches trouvées`);
                        
                        // Rechercher les géocaches avec coordonnées corrigées
                        const withCorrectedCoords = storedData.filter(gc => 
                            gc.corrected_coordinates && 
                            gc.corrected_coordinates.latitude && 
                            gc.corrected_coordinates.longitude);
                        
                        if (withCorrectedCoords.length > 0) {
                            console.log(`✅ ${withCorrectedCoords.length} géocaches avec coordonnées corrigées trouvées`);
                            console.log("Exemple de géocache avec coordonnées corrigées:", withCorrectedCoords[0]);
                        } else {
                            console.warn("❌ Aucune géocache avec corrected_coordinates trouvée");
                            
                            // Chercher d'autres champs qui pourraient contenir des coordonnées corrigées
                            const potentialFields = ['corrected', 'modified_coordinates', 'detected_coordinates'];
                            
                            for (const field of potentialFields) {
                                const withField = storedData.filter(gc => gc[field]);
                                if (withField.length > 0) {
                                    console.log(`Champ potentiel trouvé: ${field} (${withField.length} géocaches)`);
                                    console.log("Exemple:", withField[0]);
                                }
                            }
                        }
                        
                        // Analyse de la première géocache
                        if (storedData.length > 0) {
                            console.log("Structure complète de la première géocache:", JSON.stringify(storedData[0], null, 2));
                        }
                    } catch (e) {
                        console.error("Erreur lors de l'analyse de sessionStorage:", e);
                    }
                } else {
                    console.warn("Aucune donnée multiSolverResults dans sessionStorage");
                }
                
                // 2. Vérifier les marqueurs sur la carte
                console.log("=== Analyse des marqueurs sur la carte ===");
                if (this.markers && this.markers.length > 0) {
                    console.log(`${this.markers.length} marqueurs sur la carte`);
                    
                    // Rechercher les marqueurs avec corrected=true
                    const correctedMarkers = this.markers.filter(m => m.feature.get('corrected') === true);
                    if (correctedMarkers.length > 0) {
                        console.log(`✅ ${correctedMarkers.length} marqueurs avec corrected=true`);
                        console.log("Exemple de marqueur avec coordonnées corrigées:", correctedMarkers[0]);
                    } else {
                        console.warn("❌ Aucun marqueur avec corrected=true");
                    }
                } else if (this.vectorSource) {
                    const features = this.vectorSource.getFeatures();
                    console.log(`${features.length} features dans la source vectorielle`);
                    
                    // Analyser les features
                    if (features.length > 0) {
                        const correctedFeatures = features.filter(f => f.get('corrected') === true);
                        if (correctedFeatures.length > 0) {
                            console.log(`✅ ${correctedFeatures.length} features avec corrected=true`);
                            console.log("Exemple de feature avec coordonnées corrigées:", correctedFeatures[0]);
                        } else {
                            console.warn("❌ Aucune feature avec corrected=true");
                        }
                    }
                } else {
                    console.warn("Aucun marqueur ou source vectorielle disponible");
                }
                
                // 3. Vérifier l'état actuel du contrôleur
                console.log("=== État du contrôleur ===");
                console.log("multiSolverIdValue:", this.multiSolverIdValue);
                console.log("isMultiSolverValue:", this.isMultiSolverValue);
                console.log("Carte initialisée:", !!this.map);
                
                // 4. Vérifier si l'API répond correctement
                console.log("=== Test de l'API ===");
                console.log("Pour tester l'API, exécutez cette commande en console:");
                console.log(`fetch('/api/multi-solvers/${this.multiSolverIdValue}/geocaches').then(r => r.json()).then(console.log)`);
                
            } catch (error) {
                console.error("Erreur lors du diagnostic:", error);
            }
            
            console.groupEnd();
        }

        // Fonction utilitaire pour convertir une chaîne de coordonnées au format DMS/DDM en décimal
        parseCoordinateString(coordString) {
            if (!coordString || typeof coordString !== 'string') {
                return null;
            }
            
            // Essayer d'abord de parser directement comme un nombre décimal
            const directParse = parseFloat(coordString);
            if (!isNaN(directParse)) {
                return directParse;
            }
            
            // Essayer de parser le format DDM (Degrés, Minutes Décimales)
            // Exemple: "N 49° 45.269'" ou "E 5° 56.356'"
            const ddmPattern = /^([NSEW])\s*(\d+)°\s*(\d+\.\d+)['′]?$/i;
            const ddmMatch = coordString.match(ddmPattern);
            
            if (ddmMatch) {
                const direction = ddmMatch[1].toUpperCase();
                const degrees = parseFloat(ddmMatch[2]);
                const minutes = parseFloat(ddmMatch[3]);
                
                if (isNaN(degrees) || isNaN(minutes)) {
                    console.warn(`Échec du parsing DDM pour: "${coordString}" - valeurs non numériques`);
                    return null;
                }
                
                // Convertir en décimal
                let decimal = degrees + (minutes / 60);
                
                // Appliquer le signe selon la direction
                if (direction === 'S' || direction === 'W') {
                    decimal = -decimal;
                }
                
                return decimal;
            }
            
            console.warn(`Format de coordonnées non reconnu: "${coordString}"`);
            return null;
        }

        getColorForCacheType(type) {
            // ... existing code ...
        }

        // Ajouter une nouvelle méthode de diagnostic pour tracer précisément comment les coordonnées sont appliquées
        debugCoordinatesUpdate(geocache, latitude, longitude, corrected, saved, isUpdate = false) {
            // Uniquement actif si forceUpdate ou geocache est marquée pour debug
            const shouldLog = geocache.gc_code === 'GCAPF4B' || this.forceUpdateActive === true;
            
            if (shouldLog) {
                const markerType = corrected ? (saved ? "losange" : "carré") : "cercle";
                const actionType = isUpdate ? "mise à jour" : "création";
                
                console.log(`%c[EnhancedZoneMap] ${actionType.toUpperCase()} du marqueur ${geocache.gc_code} (${markerType})`, 
                    "background:purple; color:white; font-weight:bold", {
                        latitude, 
                        longitude,
                        corrected,
                        saved,
                        source: geocache.coordinates ? (geocache.coordinates.source || "unknown") : "no-coords-object",
                        fromOriginalData: !!(geocache.original_data && geocache.original_data.corrected_coordinates),
                        allFlags: {
                            hasCoords: !!geocache.coordinates,
                            hasCorrectedCoords: !!geocache.corrected_coordinates,
                            isExplicitlyCorrected: geocache.corrected === true,
                            existFlag: geocache.coordinates && geocache.coordinates.exist === true
                        }
                    });
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