// Geocache coordinates controller
window.GeocacheCoordinatesController = class extends Stimulus.Controller {
    static targets = ["container", "analyzeButton"]
    static values = {
        geocacheId: String
    }

    connect() {
        console.log("Geocache Coordinates Controller connected", {
            element: this.element,
            geocacheId: this.geocacheIdValue,
            hasContainer: this.hasContainerTarget,
            containerContent: this.containerTarget?.innerHTML
        })
    }

    updateSolvedStatus(event) {
        const select = event.target;
        const status = select.value;
        
        console.log("Updating solved status", {
            geocacheId: this.geocacheIdValue,
            status: status
        });

        const formData = new FormData();
        formData.append('solved_status', status);

        fetch(`/geocaches/${this.geocacheIdValue}/solved-status`, {
            method: 'PUT',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            console.log("Status updated successfully");
            // Store current value after successful update
            select.setAttribute('data-previous-value', status);
        })
        .catch(error => {
            console.error("Error updating status:", error);
            // Revert the select to its previous value
            select.value = select.getAttribute('data-previous-value');
        });
    }

    sendToGeocaching(event) {
        console.log("Send to Geocaching button clicked", {
            event,
            currentTarget: event.currentTarget,
            geocacheId: this.geocacheIdValue,
            gcCode: event.currentTarget.dataset.gcCode
        })
        
        event.preventDefault()
        
        // Récupérer le GC code depuis le bouton
        const gcCode = event.currentTarget.dataset.gcCode
        const button = event.currentTarget
        
        if (!gcCode) {
            console.error("GC code non trouvé, impossible d'envoyer les coordonnées")
            return
        }
        
        // Afficher un message de confirmation
        if (!confirm(`Voulez-vous vraiment envoyer les coordonnées corrigées vers Geocaching.com pour ${gcCode}?`)) {
            return
        }
        
        // Désactiver le bouton pendant l'envoi
        button.disabled = true
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Envoi en cours...'
        
        console.log("Bouton désactivé et texte modifié", button.innerHTML)
        
        // Envoyer les coordonnées à l'API
        fetch(`/geocaches/${this.geocacheIdValue}/send_to_geocaching`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                gc_code: gcCode
            })
        })
        .then(response => {
            console.log("Réponse reçue du serveur", {
                status: response.status,
                ok: response.ok,
                statusText: response.statusText
            })
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`)
            }
            return response.json()
        })
        .then(data => {
            console.log("Données JSON reçues", data)
            
            // Réactiver le bouton
            button.disabled = false
            button.innerHTML = 'Envoyer sur Geocaching.com'
            
            console.log("Bouton réactivé et texte réinitialisé", button.innerHTML)
            
            if (data.success) {
                // Afficher un message de succès
                alert(`Les coordonnées ont été envoyées avec succès vers Geocaching.com pour ${gcCode}!`)
            } else {
                // Afficher un message d'erreur
                alert(`Erreur lors de l'envoi des coordonnées: ${data.error}`)
            }
        })
        .catch(error => {
            console.error("Erreur lors de l'envoi des coordonnées:", error)
            
            // Réactiver le bouton
            button.disabled = false
            button.innerHTML = 'Envoyer sur Geocaching.com'
            
            console.log("Bouton réactivé et texte réinitialisé après erreur", button.innerHTML)
            
            // Afficher un message d'erreur
            alert(`Erreur lors de l'envoi des coordonnées: ${error.message}`)
        })
        .finally(() => {
            // S'assurer que le bouton est bien réactivé et réinitialisé
            setTimeout(() => {
                if (button.disabled) {
                    console.log("Forçage de la réinitialisation du bouton après délai")
                    button.disabled = false
                    button.innerHTML = 'Envoyer sur Geocaching.com'
                }
            }, 5000) // 5 secondes de délai pour être sûr
        })
    }

    edit(event) {
        console.log("Edit button clicked", {
            event,
            currentTarget: event.currentTarget,
            geocacheId: this.geocacheIdValue
        })
        
        event.preventDefault()

        console.log("Sending edit request to:", `/geocaches/${this.geocacheIdValue}/coordinates/edit`)

        fetch(`/geocaches/${this.geocacheIdValue}/coordinates/edit`, {
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
        const formData = new FormData(form)

        fetch(`/geocaches/${this.geocacheIdValue}/coordinates`, {
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
            geocacheId: this.geocacheIdValue
        })
        
        event.preventDefault()

        fetch(`/geocaches/${this.geocacheIdValue}/coordinates`, {
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
            window.dispatchEvent(new CustomEvent('coordinatesUpdated'))
        })
        .catch(error => {
            console.error("Cancel request failed:", error)
        })
    }

    reset(event) {
        console.log("Reset button clicked", {
            event,
            currentTarget: event.currentTarget,
            geocacheId: this.geocacheIdValue
        })
        
        event.preventDefault()
        
        if (!confirm("Voulez-vous vraiment supprimer les coordonnées corrigées et revenir aux coordonnées d'origine?")) {
            return
        }

        fetch(`/geocaches/${this.geocacheIdValue}/coordinates/reset`, {
            method: 'POST',
            headers: {
                'X-Layout-Component': 'true',
                'Accept': 'text/html',
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            console.log("Reset response received:", {
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
            console.error("Reset request failed:", error)
        })
    }

    // Event handlers for GoldenLayout events
    formLoaded() {
        console.log("Coordinates form loaded event received")
    }

    coordinatesUpdated() {
        console.log("Coordinates updated event received");
    }

    openAnalysis(event) {
        console.log("openAnalysis method called");
        const button = event.currentTarget;
        const geocacheId = button.dataset.geocacheId;
        const gcCode = button.dataset.gcCode;
        
        console.log("Opening analysis for", {
            geocacheId: geocacheId,
            gcCode: gcCode
        });

        // Utiliser la nouvelle fonction openPluginTab avec l'ID de la géocache
        window.openPluginTab('analysis_web_page', `Analyse ${gcCode}`, {
            geocacheId: geocacheId,
            gcCode: gcCode
        });
    }

    openSolver(event) {
        console.log("openSolver method called");
        const button = event.currentTarget;
        const geocacheId = button.dataset.geocacheId;
        const gcCode = button.dataset.gcCode;
        
        console.log("Opening solver for", {
            geocacheId: geocacheId,
            gcCode: gcCode
        });

        // Ajouter un nouvel onglet avec le composant geocache-solver
        window.mainLayout.root.contentItems[0].addChild({
            type: 'component',
            componentName: 'geocache-solver',
            title: `Solver ${gcCode}`,
            componentState: { 
                geocacheId: geocacheId,
                gcCode: gcCode
            }
        });
    }
}
