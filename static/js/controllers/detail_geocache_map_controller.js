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
            if (this.map) {
                this.map.setTarget(null);
                this.map = null;
            }
            // Nettoyer les écouteurs si nécessaire
            if (this.contextMenu) {
                document.body.removeChild(this.contextMenu);
                this.contextMenu = null;
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

                // Créer le menu de sélection des fonds de carte
                this.createBaseLayerSelector();

                // Créer la source et la couche vectorielle pour les points
                this.vectorSource = new ol.source.Vector();
                this.vectorLayer = new ol.layer.Vector({
                    source: this.vectorSource,
                    style: (feature) => this.styleFeature(feature) // Utiliser une fonction pour le style
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
            
            // Vérifier si un marqueur temporaire existe
            const hasTempMarker = this.vectorSource.getFeatures().some(feature => 
                feature.get('temp_marker') === true);
            
            // Formater les coordonnées au format geocaching (degrés, minutes, secondes)
            const formattedCoords = this.formatGeoCoords(lonLat[1], lonLat[0]);
            const decimalCoords = {
                latitude: lonLat[1].toFixed(6),
                longitude: lonLat[0].toFixed(6)
            };
            
            // Contenu du menu
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

        // Créer le sélecteur de fond de carte
        createBaseLayerSelector() {
            if (!this.hasContainerTarget) return;

            const selectorContainer = document.createElement('div');
            selectorContainer.className = 'absolute top-2 right-2 bg-white shadow-lg rounded-lg p-2 z-[1001]'; // Assurer un z-index élevé
            selectorContainer.style.cssText = 'background-color: white; color: black;';

            const select = document.createElement('select');
            select.className = 'block w-full p-1 border border-gray-300 rounded-md text-sm';
            select.addEventListener('change', (e) => this.changeBaseLayer(e.target.value));

            Object.keys(this.tileSources).forEach(sourceName => {
                const option = document.createElement('option');
                option.value = sourceName;
                option.textContent = sourceName;
                select.appendChild(option);
            });

            selectorContainer.appendChild(select);
            this.containerTarget.appendChild(selectorContainer);
        }

        // Changer le fond de carte
        changeBaseLayer(sourceName) {
            const tileLayer = this.map.getLayers().getArray().find(layer => layer instanceof ol.layer.Tile);
            if (tileLayer) {
                tileLayer.setSource(this.tileSources[sourceName]);
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

        // Gérer le clic sur la carte pour les popups
        handleMapClick(evt) {
            const feature = this.map.forEachFeatureAtPixel(evt.pixel,
                (feature) => feature, {
                    hitTolerance: 5 // Tolérance pour le clic
                });

            if (feature) {
                const coordinates = feature.getGeometry().getCoordinates();
                const properties = feature.getProperties();
                let popupHtml = '';

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
            let strokeColor = '#ffffff';
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
                strokeColor = '#ffffff';
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
                strokeColor = '#ffcc00'; // Bordure dorée
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

        // --- Futures méthodes pour interactions spécifiques --- 
        // exemple: addTemporaryPoint(lon, lat, options)
        // exemple: drawCircle(centerLon, centerLat, radiusMeters)
        // exemple: clearTemporaryGraphics()
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
