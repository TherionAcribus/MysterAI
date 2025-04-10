// Map Controller
(() => {
    // Initialiser le pont d'événements global pour la communication cross-iframe
    (function initializeGlobalEventBridge() {
        // Créer un pont d'événements global
        window.MysteryAIEventBridge = window.MysteryAIEventBridge || {
            // Stockage pour les écouteurs d'événements enregistrés
            eventListeners: {},
            
            // Méthode pour dispatcher un événement global
            dispatchGlobalEvent: function(eventName, detail) {
                console.log(`%c[EventBridge] Envoi événement global ${eventName}:`, "color:purple", detail);
                
                // 1. Dispatcher dans la fenêtre actuelle
                window.dispatchEvent(new CustomEvent(eventName, { detail }));
                
                // 2. Dispatcher vers le parent si nous sommes dans une iframe
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({
                        type: 'mystery-event-bridge',
                        eventName: eventName,
                        detail: detail
                    }, '*');
                }
                
                // 3. Dispatcher vers toutes les iframes dans cette fenêtre
                try {
                    if (window.frames && window.frames.length > 0) {
                        for (let i = 0; i < window.frames.length; i++) {
                            window.frames[i].postMessage({
                                type: 'mystery-event-bridge',
                                eventName: eventName,
                                detail: detail
                            }, '*');
                        }
                    }
                } catch (e) {
                    console.error("[EventBridge] Erreur lors de l'envoi aux iframes:", e);
                }
                
                // 4. Appeler les écouteurs enregistrés directement
                if (this.eventListeners[eventName]) {
                    this.eventListeners[eventName].forEach(callback => {
                        try {
                            callback(detail);
                        } catch (err) {
                            console.error(`[EventBridge] Erreur lors de l'appel d'un écouteur pour ${eventName}:`, err);
                        }
                    });
                }
            },
            
            // Méthode pour ajouter un écouteur d'événement
            addEventListener: function(eventName, callback) {
                if (!this.eventListeners[eventName]) {
                    this.eventListeners[eventName] = [];
                }
                this.eventListeners[eventName].push(callback);
                console.log(`%c[EventBridge] Écouteur ajouté pour l'événement ${eventName}`, "color:purple");
            },
            
            // Méthode pour supprimer un écouteur d'événement
            removeEventListener: function(eventName, callback) {
                if (this.eventListeners[eventName]) {
                    this.eventListeners[eventName] = this.eventListeners[eventName].filter(
                        listener => listener !== callback
                    );
                }
            }
        };
        
        // Écouter les messages pour le pont d'événements
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'mystery-event-bridge') {
                console.log(`%c[EventBridge] Réception message ${event.data.eventName}:`, "color:purple", event.data.detail);
                window.dispatchEvent(new CustomEvent(event.data.eventName, { 
                    detail: event.data.detail 
                }));
            }
        });
        
        console.log("%c[EventBridge] Pont d'événements global initialisé dans map_controller", "color:green");
    })();

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
            
            // Ajouter l'écouteur d'événements pour la mise à jour des coordonnées
            this.setupCoordinatesUpdateListener();
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
                // Vérifier que la cible container existe
                if (!this.hasContainerTarget) {
                    console.error("%c[MapController] Erreur: Cible 'container' manquante", "background:red; color:white");
                    console.log("%c[MapController] Éléments disponibles:", "background:orange; color:black", this.element);
                    return;
                }
                
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
                        
                        if (!geocache) {
                            return new ol.style.Style({
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
                            });
                        }
                        
                        // Déterminer la couleur et l'icône en fonction du type de cache
                        let cacheColor = 'rgba(150, 150, 150, 0.8)'; // gris par défaut
                        let cacheIcon = null;
                        let cacheRadius = 6;
                        
                        switch(geocache.cache_type) {
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
                        }
                        
                        // Définir le style selon que le point est corrigé ou non
                        if (geocache.is_corrected === true) {
                            let strokeColor = '#ffffff';
                            let strokeWidth = 1.5;
                            let points = 4; // Carré par défaut (corrigé et sauvegardé)
                            let angle = Math.PI / 4; // 45 degrés pour carré incliné
                            
                            // Si coordonnées corrigées mais non sauvegardées, utiliser un losange
                            if (geocache.is_saved === false) {
                                points = 4;
                                angle = 0; // 0 degré pour losange
                                console.log(`Style: Losange pour coordonnées corrigées non sauvegardées (${geocache.id})`);
                            } else {
                                // Coordonnées corrigées et sauvegardées, utiliser un carré avec bordure spéciale
                                strokeColor = '#ffcc00'; // Bordure dorée
                                strokeWidth = 2;
                                console.log(`Style: Carré pour coordonnées corrigées sauvegardées (${geocache.id})`);
                            }
                            
                            const style = new ol.style.Style({
                                image: new ol.style.RegularShape({
                                    points: points,
                                    radius: cacheRadius + 2,
                                    angle: angle,
                                    fill: new ol.style.Fill({
                                        color: cacheColor
                                    }),
                                    stroke: new ol.style.Stroke({
                                        color: strokeColor,
                                        width: strokeWidth
                                    })
                                })
                            });
                            
                            // Ajouter l'icône si nécessaire
                            if (cacheIcon) {
                                style.setText(new ol.style.Text({
                                    text: cacheIcon,
                                    font: 'bold 12px sans-serif',
                                    fill: new ol.style.Fill({
                                        color: '#ffffff'
                                    }),
                                    offsetY: -1
                                }));
                            }
                            
                            return style;
                        } else {
                            // Sinon, utiliser un cercle
                            const style = new ol.style.Style({
                                image: new ol.style.Circle({
                                    radius: cacheRadius,
                                    fill: new ol.style.Fill({
                                        color: cacheColor
                                    }),
                                    stroke: new ol.style.Stroke({
                                        color: '#ffffff',
                                        width: 1
                                    })
                                })
                            });
                            
                            // Ajouter l'icône si nécessaire
                            if (cacheIcon) {
                                style.setText(new ol.style.Text({
                                    text: cacheIcon,
                                    font: 'bold 12px sans-serif',
                                    fill: new ol.style.Fill({
                                        color: '#ffffff'
                                    }),
                                    offsetY: -1
                                }));
                            }
                            
                            return style;
                        }
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
                        
                        // Info sur les coordonnées
                        const coordInfo = geocache.is_corrected 
                            ? `<div style="color: #ff5555; font-weight: bold; margin-top: 4px;">⚠️ Coordonnées corrigées</div>` 
                            : '';
                            
                        // Info sur les coordonnées originales si disponibles
                        const originalCoordInfo = (geocache.is_corrected && geocache.original_latitude && geocache.original_longitude) 
                            ? `<div style="color: #999; margin-top: 4px; font-size: 0.9em;">
                                Original: ${geocache.original_latitude.toFixed(6)}, ${geocache.original_longitude.toFixed(6)}
                               </div>` 
                            : '';
                        
                        this.popupContentTarget.innerHTML = `
                            <div>
                                <div style="font-weight: bold; margin-bottom: 4px;">${geocache.gc_code}</div>
                                <div style="margin-bottom: 4px;">${geocache.name}</div>
                                <div style="color: #666;">${geocache.cache_type}</div>
                                <div style="margin-top: 8px;">
                                    <span style="font-weight: bold;">D:</span> ${geocache.difficulty || '?'} 
                                    <span style="font-weight: bold; margin-left: 8px;">T:</span> ${geocache.terrain || '?'}
                                </div>
                                ${coordInfo}
                                ${originalCoordInfo}
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
                console.error('%c[MapController] Erreur lors de l\'initialisation de la carte:', "background:red; color:white", error);
            }
        }

        createBaseLayerSelector() {
            // Vérifier que la cible container existe
            if (!this.hasContainerTarget) {
                console.error("%c[MapController] Erreur: Cible 'container' manquante dans createBaseLayerSelector", "background:red; color:white");
                return;
            }
            
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
                
                // Charger les coordonnées (qui pourraient inclure les coordonnées corrigées)
                const coordResponse = await fetch(`/api/geocaches/${geocacheId}/coordinates`);
                const coordData = await coordResponse.json();
                
                // Créer les features pour les points originaux et corrigés
                if (coordData.original) {
                    const originalPoint = {
                        latitude: coordData.original.latitude,
                        longitude: coordData.original.longitude,
                        is_corrected: false
                    };
                    
                    // Si on a des coordonnées originales, les ajouter à la carte
                    if (originalPoint.latitude && originalPoint.longitude) {
                        const originalFeature = new ol.Feature({
                        geometry: new ol.geom.Point(
                                ol.proj.fromLonLat([originalPoint.longitude, originalPoint.latitude])
                            )
                        });
                        
                        // Ajouter les propriétés de la géocache à la feature
                        const originalGeoCache = {...geocache, ...originalPoint};
                        originalFeature.set('geocache', originalGeoCache);
                        this.vectorSource.addFeature(originalFeature);
                    }
                }
                
                // Si on a des coordonnées corrigées, les ajouter aussi
                if (coordData.corrected) {
                    const correctedPoint = {
                        latitude: coordData.corrected.latitude,
                        longitude: coordData.corrected.longitude,
                        is_corrected: true,
                        original_latitude: coordData.original?.latitude,
                        original_longitude: coordData.original?.longitude
                    };
                    
                    if (correctedPoint.latitude && correctedPoint.longitude) {
                        const correctedFeature = new ol.Feature({
                            geometry: new ol.geom.Point(
                                ol.proj.fromLonLat([correctedPoint.longitude, correctedPoint.latitude])
                            )
                        });
                        
                        // Ajouter les propriétés de la géocache à la feature
                        const correctedGeoCache = {...geocache, ...correctedPoint};
                        correctedFeature.set('geocache', correctedGeoCache);
                        this.vectorSource.addFeature(correctedFeature);
                    }
                }
                
                // Ajouter les waypoints si présents
                if (coordData.waypoints && coordData.waypoints.length > 0) {
                    coordData.waypoints.forEach(wp => {
                        if (wp.latitude && wp.longitude) {
                            const wpFeature = new ol.Feature({
                                geometry: new ol.geom.Point(
                                    ol.proj.fromLonLat([wp.longitude, wp.latitude])
                                )
                            });
                            const wpData = {
                                id: wp.id,
                                gc_code: wp.lookup || wp.prefix || 'WP',
                                name: wp.name || 'Waypoint',
                                cache_type: 'Waypoint',
                                latitude: wp.latitude,
                                longitude: wp.longitude,
                                is_corrected: false
                            };
                            wpFeature.set('geocache', wpData);
                            this.vectorSource.addFeature(wpFeature);
                        }
                    });
                }
                
                // Ajuster la vue pour voir tous les points
                if (this.vectorSource.getFeatures().length > 0) {
                    // Prioriser les coordonnées corrigées pour centrer la carte
                    let centerLat, centerLon;
                    if (coordData.corrected) {
                        centerLat = coordData.corrected.latitude;
                        centerLon = coordData.corrected.longitude;
                    } else if (coordData.original) {
                        centerLat = coordData.original.latitude;
                        centerLon = coordData.original.longitude;
                    }
                    
                    if (centerLat && centerLon) {
                        this.map.getView().setCenter(ol.proj.fromLonLat([centerLon, centerLat]));
                    this.map.getView().setZoom(14);
                    } else {
                        // Fallback: utiliser l'étendue de tous les points
                        const extent = this.vectorSource.getExtent();
                        this.map.getView().fit(extent, {
                            padding: [50, 50, 50, 50],
                            duration: 1000
                        });
                    }
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
                
                // LOGS DE DÉBOGAGE
                console.log(`Reçu ${geocaches.length} géocaches depuis l'API:`, geocaches);
                
                // Créer les features pour les géocaches
                const features = geocaches
                    .filter(geocache => {
                        const hasCoords = geocache.latitude && geocache.longitude;
                        if (!hasCoords) {
                            console.log(`Géocache ignorée (coordonnées manquantes): ID=${geocache.id}, GC=${geocache.gc_code}`);
                        }
                        return hasCoords;
                    })
                    .map(geocache => {
                        console.log(`Ajout sur la carte: ID=${geocache.id}, GC=${geocache.gc_code}, Type=${geocache.cache_type}, Coordonnées=(${geocache.latitude}, ${geocache.longitude}), Corrigées=${geocache.is_corrected}`);
                        const feature = new ol.Feature({
                            geometry: new ol.geom.Point(
                                ol.proj.fromLonLat([geocache.longitude, geocache.latitude])
                            )
                        });
                        feature.set('geocache', geocache);
                        return feature;
                    });
                
                console.log(`Nombre de features créées: ${features.length}`);
                
                // Ajouter les features à la source
                this.vectorSource.addFeatures(features);
                console.log(`Nombre de features dans la source: ${this.vectorSource.getFeatures().length}`);
                
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

        // Configure un listener pour les mises à jour de coordonnées
        setupCoordinatesUpdateListener() {
            console.log("%c[MapController] Configuration du listener pour les mises à jour de coordonnées", "background:blue; color:white");
            
            // 1. Écouter l'événement personnalisé
            window.addEventListener('map-coordinates-updated', (event) => {
                console.log("%c[MapController] 1. Événement map-coordinates-updated reçu:", "background:green; color:white", 
                    JSON.stringify(event.detail ? event.detail : 'Détail manquant'));
                
                if (event.detail && event.detail.geocacheId) {
                    console.log("%c[MapController] Appel de updateGeocacheCoordinates avec:", "background:blue; color:white", {
                        geocacheId: event.detail.geocacheId,
                        latitude: event.detail.latitude,
                        longitude: event.detail.longitude,
                        isSaved: event.detail.isSaved
                    });
                    
                    this.updateGeocacheCoordinates(
                        event.detail.geocacheId,
                        event.detail.latitude,
                        event.detail.longitude,
                        event.detail.isSaved,
                        event.detail.raw
                    );
                } else {
                    console.error("%c[MapController] Événement reçu mais détails manquants:", "background:red; color:white", event);
                }
            });
            
            // 2. Écouter les messages cross-origin
            window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'map-coordinates-updated') {
                    console.log("%c[MapController] 2. Message postMessage reçu:", "background:green; color:white", 
                        JSON.stringify(event.data.detail ? event.data.detail : 'Détail manquant'));
                    
                    const detail = event.data.detail;
                    if (detail && detail.geocacheId) {
                        console.log("%c[MapController] Appel de updateGeocacheCoordinates via postMessage avec:", "background:blue; color:white", {
                            geocacheId: detail.geocacheId,
                            latitude: detail.latitude,
                            longitude: detail.longitude,
                            isSaved: detail.isSaved
                        });
                        
                        this.updateGeocacheCoordinates(
                            detail.geocacheId,
                            detail.latitude,
                            detail.longitude,
                            detail.isSaved,
                            detail.raw
                        );
                    } else {
                        console.error("%c[MapController] Message reçu mais détails manquants:", "background:red; color:white", event.data);
                    }
                } else if (event.data && event.data.type === 'mystery-event-bridge') {
                    console.log("%c[MapController] Message test reçu:", "background:purple; color:white", event.data);
                    
                    // Répondre au message de test
                    if (event.source && event.source.postMessage) {
                        try {
                            event.source.postMessage({
                                type: 'mystery-event-response',
                                eventName: 'map-test-connection-response',
                                detail: { 
                                    timestamp: Date.now(),
                                    originalTimestamp: event.data.detail?.timestamp,
                                    controller: 'map_controller'
                                }
                            }, '*');
                        } catch (err) {
                            console.error("%c[MapController] Erreur lors de la réponse au test:", "background:red; color:white", err);
                        }
                    }
                }
            });
            
            // 3. Enregistrer pour les événements du pont global
            if (window.MysteryAIEventBridge) {
                console.log("%c[MapController] 3. Enregistrement auprès du pont d'événements global", "background:purple; color:white");
                
                window.MysteryAIEventBridge.addEventListener('map-coordinates-updated', (detail) => {
                    console.log("%c[MapController] Événement global reçu via le pont:", "background:green; color:white", 
                        JSON.stringify(detail ? detail : 'Détail manquant'));
                    
                    if (detail && detail.geocacheId) {
                        console.log("%c[MapController] Appel de updateGeocacheCoordinates via EventBridge avec:", "background:blue; color:white", {
                            geocacheId: detail.geocacheId,
                            latitude: detail.latitude,
                            longitude: detail.longitude,
                            isSaved: detail.isSaved
                        });
                        
                        this.updateGeocacheCoordinates(
                            detail.geocacheId,
                            detail.latitude,
                            detail.longitude,
                            detail.isSaved,
                            detail.raw
                        );
                    } else {
                        console.error("%c[MapController] Événement global reçu mais détails manquants:", "background:red; color:white", detail);
                    }
                });
                
                // Enregistrer sa disponibilité
                window.MysteryAIEventBridge.dispatchGlobalEvent('map-controller-ready', {
                    timestamp: Date.now(),
                    elementId: this.element.id
                });
            } else {
                console.warn("%c[MapController] Pont d'événements global non disponible", "background:orange; color:black");
            }
            
            // 4. S'annoncer comme disponible via un événement personnalisé
            const readyEvent = new CustomEvent('map-controller-ready', {
                detail: {
                    timestamp: Date.now(),
                    elementId: this.element.id
                }
            });
            window.dispatchEvent(readyEvent);
            
            console.log("%c[MapController] Tous les listeners pour les mises à jour de coordonnées configurés", "background:green; color:white");
        }
        
        // Méthode utilitaire pour déboguer les features
        debugFeatures() {
            if (!this.vectorSource) return;
            
            console.log('========== DÉBOGAGE DES FEATURES ==========');
            const features = this.vectorSource.getFeatures();
            console.log(`Nombre total de features: ${features.length}`);
            
            // Grouper les features par type
            const originalFeatures = [];
            const correctedFeatures = [];
            
            features.forEach(feature => {
                const geocache = feature.get('geocache');
                if (!geocache) return;
                
                if (geocache.is_corrected) {
                    correctedFeatures.push(geocache);
                } else {
                    originalFeatures.push(geocache);
                }
            });
            
            console.log(`Features originales: ${originalFeatures.length}`);
            console.log(`Features corrigées: ${correctedFeatures.length}`);
            
            // Afficher les détails des features corrigées
            if (correctedFeatures.length > 0) {
                console.log('Détails des features corrigées:');
                correctedFeatures.forEach(gc => {
                    console.log(`- ID: ${gc.id}, GC: ${gc.gc_code || 'N/A'}, Sauvegardé: ${gc.is_saved ? 'Oui' : 'Non'}`);
                });
            }
            
            console.log('=========================================');
        }

        // Méthode pour forcer le rafraîchissement de la carte
        forceRefreshMap() {
            console.log('%c[MapController] Forçage du rafraîchissement de la carte', "background:purple; color:white");
            
            if (!this.map) {
                console.error('%c[MapController] Impossible de rafraîchir - carte non initialisée', "background:red; color:white");
                return;
            }
            
            try {
                // 1. Forcer la mise à jour de la taille
                this.map.updateSize();
                
                // 2. Redessiner les couches
                this.map.renderSync();
                
                // 3. S'assurer que le vectorLayer est visible
                const vectorLayer = this.map.getLayers().getArray().find(
                    layer => layer instanceof ol.layer.Vector
                );
                
                if (vectorLayer) {
                    console.log('%c[MapController] Couche vectorielle trouvée, vérification visibilité', "background:green; color:white");
                    
                    // Vérifier si la couche est visible
                    if (!vectorLayer.getVisible()) {
                        console.log('%c[MapController] Forçage de la visibilité de la couche vectorielle', "background:orange; color:black");
                        vectorLayer.setVisible(true);
                    }
                    
                    // Vérifier si la source a des features
                    const source = vectorLayer.getSource();
                    if (source) {
                        const features = source.getFeatures();
                        console.log(`%c[MapController] Nombre de features dans la source: ${features.length}`, "background:blue; color:white");
                        
                        // Liste des géocaches présentes
                        if (features.length > 0) {
                            console.log('%c[MapController] Liste des géocaches présentes:', "background:blue; color:white");
                            features.forEach(f => {
                                const gc = f.get('geocache');
                                if (gc) {
                                    console.log(`   - ID: ${gc.id}, GC: ${gc.gc_code || 'N/A'}, Type: ${gc.is_corrected ? 'Corrigée' : 'Originale'}`);
                                }
                            });
                        }
                    }
                } else {
                    console.error('%c[MapController] Couche vectorielle introuvable', "background:red; color:white");
                }
                
                console.log('%c[MapController] Rafraîchissement forcé terminé', "background:green; color:white");
            } catch (error) {
                console.error('%c[MapController] Erreur lors du rafraîchissement forcé:', "background:red; color:white", error);
            }
        }
        
        // Méthode pour mettre à jour les coordonnées d'une géocache sur la carte
        updateGeocacheCoordinates(geocacheId, latitude, longitude, isSaved = false, rawCoordinates = null) {
            console.log(`%c[MapController] DÉBUT updateGeocacheCoordinates pour géocache ${geocacheId}:`, "background:blue; color:white", { 
                latitude, 
                longitude, 
                isSaved,
                rawCoordinates: rawCoordinates ? 'présent' : 'absent'
            });
            
            // Vérification supplémentaire des paramètres
            if (!geocacheId || geocacheId === 'undefined') {
                console.error('%c[MapController] Erreur: ID de géocache invalide', "background:red; color:white", geocacheId);
                return false;
            }
            
            if (isNaN(latitude) || isNaN(longitude)) {
                console.error('%c[MapController] Erreur: Coordonnées invalides', "background:red; color:white", { latitude, longitude });
                return false;
            }
            
            if (!this.map) {
                console.error('%c[MapController] Carte non initialisée - initialisation forcée', "background:red; color:white");
                // Tentative d'initialisation de la carte si elle n'existe pas encore
                try {
                    this.initializeMap();
                    
                    // Si la carte n'est toujours pas disponible après l'initialisation, abandonnons
                    if (!this.map) {
                        console.error('%c[MapController] Échec de l\'initialisation forcée de la carte', "background:red; color:white");
                        return false;
                    }
                } catch (error) {
                    console.error('%c[MapController] Erreur lors de l\'initialisation forcée de la carte', "background:red; color:white", error);
                    return false;
                }
            }
            
            if (!this.vectorSource) {
                console.error('%c[MapController] Source vectorielle non initialisée - création forcée', "background:red; color:white");
                // Tentative de création de la source vectorielle
                try {
                    this.vectorSource = new ol.source.Vector();
                    this.vectorLayer = new ol.layer.Vector({
                        source: this.vectorSource,
                        style: (feature) => {
                            // Style par défaut simplifié
                            return new ol.style.Style({
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
                            });
                        }
                    });
                    this.map.addLayer(this.vectorLayer);
                    console.log('%c[MapController] Source vectorielle et couche créées avec succès', "background:green; color:white");
                } catch (error) {
                    console.error('%c[MapController] Erreur lors de la création forcée de la source vectorielle', "background:red; color:white", error);
                    return false;
                }
            }
            
            // Déboguer les features existantes
            console.log('%c[MapController] Recherche de la feature pour la géocache:', "background:blue; color:white", geocacheId);
            
            // Chercher la feature existante pour cette géocache
            const features = this.vectorSource.getFeatures();
            console.log(`%c[MapController] Nombre total de features existantes: ${features.length}`, "background:blue; color:white");
            
            // Variable pour garder trace des features trouvées
            let originalFeature = null;
            let correctedFeature = null;
            
            // Recherche des features existantes pour cette géocache
            for (const feature of features) {
                const geocache = feature.get('geocache');
                if (!geocache) continue;
                
                console.log(`%c[MapController] Feature trouvée - ID: ${geocache.id}, Type: ${geocache.is_corrected ? 'Corrigée' : 'Originale'}`, "background:green; color:white");
                
                if (geocache.id == geocacheId) {
                    if (geocache.is_corrected) {
                        correctedFeature = feature;
                        console.log(`%c[MapController] Feature CORRIGÉE trouvée pour la géocache ${geocacheId}`, "background:green; color:white");
                    } else {
                        originalFeature = feature;
                        console.log(`%c[MapController] Feature ORIGINALE trouvée pour la géocache ${geocacheId}`, "background:green; color:white");
                    }
                }
            }
            
            // Si on n'a pas trouvé de feature originale, essayons de créer une géocache factice
            if (!originalFeature && !correctedFeature) {
                console.log(`%c[MapController] Aucune feature trouvée pour la géocache ${geocacheId}, création d'un point minimal`, "background:orange; color:black");
                
                // Créer une géocache minimale pour la carte
                const minimalGeocache = {
                    id: geocacheId,
                    latitude: latitude,
                    longitude: longitude,
                    is_corrected: false,
                    gc_code: `GC${geocacheId}`, // Génération d'un code GC minimal
                    name: `Géocache ${geocacheId}`,
                    cache_type: 'Unknown Cache'
                };
                
                // Créer une feature pour cette géocache
                try {
                    const newFeature = new ol.Feature({
                        geometry: new ol.geom.Point(
                            ol.proj.fromLonLat([longitude, latitude])
                        )
                    });
                    newFeature.set('geocache', minimalGeocache);
                    this.vectorSource.addFeature(newFeature);
                    originalFeature = newFeature;
                    console.log('%c[MapController] Feature originale créée avec succès', "background:green; color:white");
                } catch (error) {
                    console.error('%c[MapController] Erreur lors de la création de la feature originale', "background:red; color:white", error);
                    return false;
                }
            }
            
            // Maintenant, créons ou mettons à jour la feature corrigée
            const geocacheBase = originalFeature ? originalFeature.get('geocache') : {
                id: geocacheId,
                gc_code: `GC${geocacheId}`,
                name: `Géocache ${geocacheId}`,
                cache_type: 'Unknown Cache'
            };
            
            // Créer un nouvel objet géocache avec les coordonnées corrigées
            const updatedGeocache = {
                ...geocacheBase,
                latitude: latitude,
                longitude: longitude,
                is_corrected: true,
                original_latitude: geocacheBase.latitude,
                original_longitude: geocacheBase.longitude,
                is_saved: isSaved
            };
            
            console.log(`%c[MapController] Géocache mise à jour:`, "background:green; color:white", updatedGeocache);
            
            try {
                // Supprimer les features existantes pour cette géocache
                if (correctedFeature) {
                    console.log('%c[MapController] Suppression de la feature corrigée existante', "background:orange; color:black");
                    this.vectorSource.removeFeature(correctedFeature);
                }
                
                // Supprimer également la feature originale pour ne conserver que le point corrigé
                if (originalFeature) {
                    console.log('%c[MapController] Suppression de la feature originale', "background:orange; color:black");
                    this.vectorSource.removeFeature(originalFeature);
                }
                
                // Créer une nouvelle feature pour les coordonnées corrigées
                const newFeature = new ol.Feature({
                    geometry: new ol.geom.Point(
                        ol.proj.fromLonLat([longitude, latitude])
                    )
                });
                
                // Assigner les propriétés à la nouvelle feature
                newFeature.set('geocache', updatedGeocache);
                
                // Ajouter la nouvelle feature à la source
                this.vectorSource.addFeature(newFeature);
                console.log('%c[MapController] Feature mise à jour ajoutée à la carte', "background:green; color:white");
                
                // Vérifier si la feature a bien été ajoutée
                const featuresAfterAdd = this.vectorSource.getFeatures();
                console.log(`%c[MapController] Nombre de features après ajout: ${featuresAfterAdd.length}`, "background:blue; color:white");
                
                // Vérifier que la feature est bien présente
                const addedFeature = featuresAfterAdd.find(f => {
                    const gc = f.get('geocache');
                    return gc && gc.id == geocacheId && gc.is_corrected === true;
                });
                
                if (addedFeature) {
                    console.log('%c[MapController] Feature correctement ajoutée et retrouvée dans la source', "background:green; color:white");
                } else {
                    console.error('%c[MapController] Feature ajoutée mais impossible de la retrouver dans la source!', "background:red; color:white");
                }
                
                // Stocker l'état actuel du zoom et du centre pour éviter les mouvements constants
                const currentZoom = this.map.getView().getZoom();
                const currentCenter = this.map.getView().getCenter();
                
                // Forcer le rafraîchissement immédiat de la couche sans animation
                this.vectorLayer.changed();
                this.map.renderSync();
                
                // Ajuster la vue uniquement si c'est la première feature ou si explicitement demandé
                // Note: nous évitons ici le recentrage systématique sur chaque point
                if (featuresAfterAdd.length === 1) {
                    // S'il n'y a qu'une seule feature, centrer la vue sans animation
                    this.map.getView().setCenter(ol.proj.fromLonLat([longitude, latitude]));
                    this.map.getView().setZoom(14);
                    console.log('%c[MapController] Vue centrée sur la première feature', "background:blue; color:white");
                } else if (featuresAfterAdd.length > 1) {
                    // S'il y a plusieurs features, vérifier si le point est déjà visible dans la vue actuelle
                    const featureExtent = this.vectorSource.getExtentOfFeatures();
                    
                    // Si l'étendue est vide ou si le point est hors de la vue actuelle à plus de 30%, ajuster la vue
                    if (!this.map.getView().fit) {
                        console.log('%c[MapController] La méthode fit n\'est pas disponible', "background:orange; color:black");
                    } else {
                        const visibleExtent = this.map.getView().calculateExtent(this.map.getSize());
                        const isPointVisible = ol.extent.containsExtent(visibleExtent, featureExtent);
                        
                        if (!isPointVisible) {
                            // Seulement dans ce cas, ajuster la vue sans animation
                            this.map.getView().fit(featureExtent, {
                                padding: [50, 50, 50, 50],
                                duration: 0 // Pas d'animation
                            });
                            console.log('%c[MapController] Vue ajustée pour inclure tous les points', "background:blue; color:white");
                        } else {
                            console.log('%c[MapController] Le point est déjà visible, pas de changement de vue', "background:blue; color:white");
                        }
                    }
                }
                
                console.log(`%c[MapController] FIN updateGeocacheCoordinates - Succès`, "background:blue; color:white");
                return true;
            } catch (error) {
                console.error('%c[MapController] Erreur lors de la mise à jour des coordonnées:', "background:red; color:white", error);
                return false;
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
