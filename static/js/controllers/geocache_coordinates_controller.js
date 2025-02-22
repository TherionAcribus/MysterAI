// Geocache coordinates controller
window.GeocacheCoordinatesController = class extends Stimulus.Controller {
    static targets = ["container"]

    connect() {
        console.log("Geocache Coordinates Controller connected", {
            element: this.element,
            geocacheId: this.element.dataset.geocacheId,
            hasContainer: this.hasContainerTarget,
            containerContent: this.containerTarget?.innerHTML
        })
    }

    edit(event) {
        console.log("Edit button clicked", {
            event,
            currentTarget: event.currentTarget,
            geocacheId: this.element.dataset.geocacheId
        })
        
        event.preventDefault()
        const geocacheId = this.element.dataset.geocacheId

        console.log("Sending edit request to:", `/geocaches/${geocacheId}/coordinates/edit`)

        fetch(`/geocaches/${geocacheId}/coordinates/edit`, {
            headers: {
                'X-Layout-Component': 'true',
                'Accept': 'text/html'
            }
        })
        .then(response => {
            console.log("Edit response received:", {
                status: response.status,
                headers: Object.fromEntries(response.headers.entries())
            })
            return response.text()
        })
        .then(html => {
            console.log("Received HTML content:", {
                length: html.length,
                preview: html.substring(0, 100)
            })
            this.containerTarget.innerHTML = html
            // Dispatch event for GoldenLayout
            window.dispatchEvent(new CustomEvent('coordinatesFormLoaded'))
        })
        .catch(error => {
            console.error("Edit request failed:", error)
        })
    }

    update(event) {
        console.log("Update form submitted", {
            event,
            form: event.target,
            formData: Object.fromEntries(new FormData(event.target))
        })
        
        event.preventDefault()
        const form = event.target
        const geocacheId = this.element.dataset.geocacheId
        const formData = new FormData(form)

        fetch(`/geocaches/${geocacheId}/coordinates`, {
            method: 'PUT',
            body: formData,
            headers: {
                'X-Layout-Component': 'true',
                'Accept': 'text/html'
            }
        })
        .then(response => {
            console.log("Update response received:", {
                status: response.status,
                headers: Object.fromEntries(response.headers.entries())
            })
            return response.text()
        })
        .then(html => {
            console.log("Received HTML content:", {
                length: html.length,
                preview: html.substring(0, 100)
            })
            this.containerTarget.innerHTML = html
            // Dispatch event for GoldenLayout
            window.dispatchEvent(new CustomEvent('coordinatesUpdated'))
        })
        .catch(error => {
            console.error("Update request failed:", error)
        })
    }

    cancel(event) {
        console.log("Cancel button clicked", {
            event,
            currentTarget: event.currentTarget,
            geocacheId: this.element.dataset.geocacheId
        })
        
        event.preventDefault()
        const geocacheId = this.element.dataset.geocacheId

        fetch(`/geocaches/${geocacheId}/coordinates/edit`, {
            headers: {
                'X-Layout-Component': 'true',
                'Accept': 'text/html'
            }
        })
        .then(response => {
            console.log("Cancel response received:", {
                status: response.status,
                headers: Object.fromEntries(response.headers.entries())
            })
            return response.text()
        })
        .then(html => {
            console.log("Received HTML content:", {
                length: html.length,
                preview: html.substring(0, 100)
            })
            this.containerTarget.innerHTML = html
            // Dispatch event for GoldenLayout
            window.dispatchEvent(new CustomEvent('coordinatesFormLoaded'))
        })
        .catch(error => {
            console.error("Cancel request failed:", error)
        })
    }

    // Event handlers for GoldenLayout events
    formLoaded() {
        console.log("Coordinates form loaded event received")
    }

    coordinatesUpdated() {
        console.log("Coordinates updated event received")
    }
}
