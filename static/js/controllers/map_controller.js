(() => {
    const application = Stimulus.Application.start()

    application.register("map", class extends Stimulus.Controller {
        static targets = ["container"]
        static values = {
            geocacheId: String,
            geocacheCode: String
        }

        connect() {
            if (this.hasContainerTarget && this.geocacheIdValue) {
                this.initMap()
            }
        }

        disconnect() {
            if (this.map) {
                this.map.remove()
                this.map = null
            }
        }

        async initMap() {
            // Initialize map
            this.map = L.map(this.containerTarget).setView([46.227638, 2.213749], 5)
            
            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: ' OpenStreetMap contributors'
            }).addTo(this.map)

            // Load geocache coordinates
            await this.loadGeocacheCoordinates()
        }

        async loadGeocacheCoordinates() {
            try {
                const response = await fetch(`/api/geocaches/${this.geocacheIdValue}/coordinates`)
                const coordinates = await response.json()
                
                // Clear existing markers
                this.clearMarkers()

                // Add markers for each coordinate type
                if (coordinates.original) {
                    this.addMarker('original', coordinates.original, 'Original', 'red')
                }
                
                if (coordinates.corrected) {
                    this.addMarker('corrected', coordinates.corrected, 'Corrected', 'green')
                }
                
                if (coordinates.waypoints) {
                    coordinates.waypoints.forEach(wp => {
                        this.addMarker(`wp-${wp.id}`, wp, `${wp.prefix}: ${wp.name}`, 'blue')
                    })
                }

                // Fit bounds to show all markers
                this.fitMapToMarkers()
            } catch (error) {
                console.error('Error loading geocache coordinates:', error)
            }
        }

        addMarker(id, coords, title, color) {
            const marker = L.marker([coords.latitude, coords.longitude], {
                title: title,
                icon: L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="background-color: ${color}; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white;"></div>`,
                    iconSize: [15, 15]
                })
            }).addTo(this.map)
            
            marker.bindPopup(`<b>${title}</b><br>Lat: ${coords.latitude}<br>Lon: ${coords.longitude}`)
            
            if (!this.markers) {
                this.markers = new Map()
            }
            this.markers.set(id, marker)
        }

        clearMarkers() {
            if (this.markers) {
                this.markers.forEach(marker => marker.remove())
                this.markers.clear()
            }
        }

        fitMapToMarkers() {
            if (this.markers && this.markers.size > 0) {
                const bounds = L.latLngBounds([...this.markers.values()].map(m => m.getLatLng()))
                this.map.fitBounds(bounds, { padding: [50, 50] })
            }
        }
    })
})()
