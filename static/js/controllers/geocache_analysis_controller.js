// Geocache Analysis Controller
window.GeocacheAnalysisController = class extends Stimulus.Controller {
    static targets = ["loading", "results", "error"]
    static values = {
        geocacheId: String,
        gcCode: String
    }

    connect() {
        console.log("Analysis controller connected", {
            geocacheId: this.geocacheIdValue,
            gcCode: this.gcCodeValue
        });
        this.analyze()
    }

    async analyze() {
        try {
            this.showLoading()
            
            const response = await fetch(`/api/plugins/analysis_web_page/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: this.geocacheIdValue
                })
            })

            if (!response.ok) {
                throw new Error('Erreur lors de l\'analyse')
            }

            const data = await response.json()
            this.displayResults(data)
        } catch (error) {
            console.error('Erreur:', error)
            this.showError()
        }
    }

    displayResults(data) {
        this.hideLoading()
        this.errorTarget.classList.add('hidden')
        this.resultsTarget.classList.remove('hidden')

        // Créer le HTML pour les résultats
        let html = ''
        
        // Coordonnées détectées
        if (data.coordinates && data.coordinates.length > 0) {
            html += `
                <div class="bg-gray-800 rounded-lg p-4 mb-4">
                    <h2 class="text-lg font-semibold text-gray-100 mb-3">Coordonnées détectées</h2>
                    <div class="space-y-2">
                        ${data.coordinates.map(coord => `
                            <div class="bg-gray-700 rounded p-3">
                                <div class="text-gray-200">${coord.original_text}</div>
                                <div class="text-sm text-gray-400 mt-1">
                                    ${coord.lat}, ${coord.lng}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `
        }

        // Textes intéressants
        if (data.interesting_texts && data.interesting_texts.length > 0) {
            html += `
                <div class="bg-gray-800 rounded-lg p-4">
                    <h2 class="text-lg font-semibold text-gray-100 mb-3">Textes intéressants</h2>
                    <div class="space-y-2">
                        ${data.interesting_texts.map(text => `
                            <div class="bg-gray-700 rounded p-3">
                                <div class="text-gray-200">${text}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `
        }

        // Afficher les résultats
        this.resultsTarget.innerHTML = html || `
            <div class="bg-gray-800 rounded-lg p-4">
                <div class="text-gray-400">Aucun résultat intéressant trouvé dans l'analyse.</div>
            </div>
        `
    }

    showLoading() {
        this.loadingTarget.classList.remove('hidden')
        this.resultsTarget.classList.add('hidden')
        this.errorTarget.classList.add('hidden')
    }

    hideLoading() {
        this.loadingTarget.classList.add('hidden')
    }

    showError() {
        this.hideLoading()
        this.resultsTarget.classList.add('hidden')
        this.errorTarget.classList.remove('hidden')
    }
}
