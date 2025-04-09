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
                        
                        // Si ce sont des coordonnées corrigées, utiliser un carré incliné
                        if (geocache.is_corrected === true) {
                            const style = new ol.style.Style({
                                image: new ol.style.RegularShape({
                                    points: 4,
                                    radius: cacheRadius + 2,
                                    angle: Math.PI / 4, // 45 degrés
                                    fill: new ol.style.Fill({
                                        color: cacheColor
                                    }),
                                    stroke: new ol.style.Stroke({
                                        color: '#ffffff',
                                        width: 1.5
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
                console.error('Erreur lors de l\'initialisation de la carte:', error);
            }
        }

        createBaseLayerSelector() {
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
    }

    // Enregistrer le contrôleur
    try {
        window.StimulusApp.register('map', MapController);
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement du contrôleur Map:', error);
    }
})();
