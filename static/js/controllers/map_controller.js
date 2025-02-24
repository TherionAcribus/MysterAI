(() => {
    const application = Stimulus.Application.start()

    application.register("map", class extends Stimulus.Controller {
        static targets = ["container", "popup", "popupContent"]
        static values = {
            geocacheId: String,
            geocacheCode: String
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
        }

        disconnect() {
            if (this.map) {
                this.map.setTarget(null)
                this.map = null
            }
        }

        async initMap() {
            console.log("Initializing map...");
            
            // Create vector source for markers
            this.vectorSource = new ol.source.Vector();

            // Create vector layer for markers
            const vectorLayer = new ol.layer.Vector({
                source: this.vectorSource,
                style: (feature) => this.createMarkerStyle(feature)
            });

            // Initialize map
            this.map = new ol.Map({
                target: this.containerTarget,
                layers: [
                    new ol.layer.Tile({
                        source: new ol.source.OSM()
                    }),
                    vectorLayer
                ],
                view: new ol.View({
                    center: ol.proj.fromLonLat([2.213749, 46.227638]),
                    zoom: 5
                })
            });

            // Add click handler
            this.map.on('singleclick', (evt) => {
                console.log("Map clicked at pixel:", evt.pixel);
                
                const feature = this.map.forEachFeatureAtPixel(evt.pixel, 
                    (feature) => feature,
                    {
                        hitTolerance: 5
                    }
                );
                
                console.log("Feature found:", feature);
                
                if (feature) {
                    const properties = feature.getProperties();
                    const coordinates = feature.getGeometry().getCoordinates();
                    console.log("Feature properties:", properties);
                    console.log("Feature coordinates:", coordinates);
                    this.showPopup(coordinates, properties.title, properties.content);
                } else {
                    this.hidePopup();
                }
            });

            // Add pointer cursor when hovering features
            this.map.on('pointermove', (evt) => {
                const pixel = this.map.getEventPixel(evt.originalEvent);
                const hit = this.map.hasFeatureAtPixel(pixel, {
                    hitTolerance: 5
                });
                this.map.getViewport().style.cursor = hit ? 'pointer' : '';
            });

            // Load geocache coordinates
            await this.loadGeocacheCoordinates();
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
    })
})()
