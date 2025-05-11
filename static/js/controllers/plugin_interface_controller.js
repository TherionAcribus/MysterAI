// Controller Stimulus pour l'interface du plugin
import { Controller } from "@hotwired/stimulus"

// Définition du contrôleur Stimulus
class PluginInterfaceController extends Controller {
    static targets = ["form", "output"]
    static values = { id: String }
    
    connect() {
        console.log("Plugin interface controller connected", this.element)
        // Si un ID de géocache est présent, exécuter automatiquement
        if (this.hasIdValue && this.idValue !== 'default') {
            this.execute()
        }
    }

    execute(event) {
        console.log("Executing plugin...")
        
        // Récupérer le formulaire et préparer les données
        const data = {}
        
        // Si on a un formulaire, récupérer ses données
        if (this.hasFormTarget) {
            const formData = new FormData(this.formTarget)
            
            // Convertir FormData en objet
            for (let [key, value] of formData.entries()) {
                data[key] = value
            }
            
            // Pour le mode, récupérer la valeur du select s'il existe
            const modeSelect = this.formTarget.querySelector('#mode')
            if (modeSelect) {
                data.mode = modeSelect.value
            }
            
            // Vérifier l'option brute_force s'il est présent
            const bruteForceCheckbox = this.formTarget.querySelector('#brute_force')
            if (bruteForceCheckbox) {
                data.brute_force = bruteForceCheckbox.checked
            }
            
            // Vérifier l'option enable_scoring s'il est présent
            const enableScoringCheckbox = this.formTarget.querySelector('#enable_scoring')
            if (enableScoringCheckbox) {
                data.enable_scoring = enableScoringCheckbox.checked
            }
        } else {
            // Si pas de formulaire, utiliser les paramètres passés au plugin
            data.geocache_id = this.idValue
        }
        
        // Montrer le chargement
        if (this.hasOutputTarget) {
            this.outputTarget.classList.remove('hidden')
            this.outputTarget.innerHTML = '<div class="flex items-center justify-center p-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>'
        }
        
        // Récupérer le nom du plugin depuis l'attribut data ou depuis le titre
        let pluginName = this.element.dataset.pluginName
        if (!pluginName) {
            const titleElement = this.element.querySelector('h1.text-2xl.font-bold.text-blue-400')
            if (titleElement) {
                pluginName = titleElement.textContent.trim()
            } else {
                console.error("Impossible de trouver le nom du plugin")
                return
            }
        }
        
        // Exécuter le plugin
        fetch(`/api/plugins/${pluginName}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok')
            }
            
            // Vérifier le type de contenu
            const contentType = response.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
                return response.json().then(data => ({
                    isJson: true,
                    content: data
                }))
            } else {
                return response.text().then(text => ({
                    isJson: false,
                    content: text
                }))
            }
        })
        .then(result => {
            if (!this.hasOutputTarget) return
            
            // Si c'est du HTML (ancien format)
            if (!result.isJson) {
                this.outputTarget.innerHTML = result.content
                return
            }
            
            // C'est du JSON, utiliser le contenu pour l'affichage formaté
            const data = result.content
            this.pluginResult = data // Sauvegarder le résultat pour l'édition
            
            // Nouveau format standardisé
            if (data.results && Array.isArray(data.results)) {
                this._renderStandardizedResults(data)
                return
            }
            
            // Gérer les formats de résultat variables des différents plugins (ancien format)
            let normalizedData = { ...data }
            
            // Gérer les formats de résultat variables des différents plugins
            if (data.result && data.result.text && data.result.text.text_output !== undefined) {
                normalizedData.text_output = data.result.text.text_output
            } else if (data.output !== undefined) {
                normalizedData.text_output = data.output
            }
            
            // Extraire le log s'il existe
            if (data.result && data.result.log !== undefined) {
                normalizedData.log = data.result.log
            } else if (data.original_result && data.original_result.result && data.original_result.result.log !== undefined) {
                normalizedData.log = data.original_result.result.log
            }
            
            // Toujours mettre normalizedData dans this.pluginResult
            this.pluginResult = normalizedData
            
            // Nouvelle façon d'afficher les résultats
            let outputHtml = '<div class="space-y-4">'
            
            // Afficher le texte output s'il existe
            if (normalizedData.text_output !== undefined) {
                outputHtml += `
                    <div class="bg-gray-700 rounded-lg p-4">
                        <h3 class="text-lg font-medium text-gray-300 mb-2">Résultat</h3>
                        <div class="bg-gray-800 p-4 rounded">
                            <textarea class="text-output-field w-full bg-gray-800 text-gray-300 border border-gray-700 focus:border-blue-500 p-2 rounded resize-y"
                            data-action="input->plugin-interface#updatePluginResult" data-key="text_output">${normalizedData.text_output || ''}</textarea>
                        </div>
                    </div>
                `
            } else if (normalizedData.output !== undefined) {
                // Compatibilité avec les plugins qui retournent "output" au lieu de "text_output"
                outputHtml += `
                    <div class="bg-gray-700 rounded-lg p-4">
                        <h3 class="text-lg font-medium text-gray-300 mb-2">Résultat</h3>
                        <div class="bg-gray-800 p-4 rounded">
                            <textarea class="text-output-field w-full bg-gray-800 text-gray-300 border border-gray-700 focus:border-blue-500 p-2 rounded resize-y"
                            data-action="input->plugin-interface#updatePluginResult" data-key="output">${normalizedData.output || ''}</textarea>
                        </div>
                    </div>
                `
                // Copier dans text_output pour uniformité
                normalizedData.text_output = normalizedData.output
                this.pluginResult.text_output = normalizedData.output
            }
            
            // Afficher le log s'il existe
            if (normalizedData.log) {
                outputHtml += `
                    <div class="bg-gray-700 rounded-lg p-4">
                        <h3 class="text-lg font-medium text-gray-300 mb-2">Détails de la projection</h3>
                        <div class="bg-gray-800 p-4 rounded">
                            <pre class="log-field w-full bg-gray-800 text-gray-300 font-mono text-sm whitespace-pre-wrap">${normalizedData.log || ''}</pre>
                        </div>
                    </div>
                `
            }
            
            // Afficher les coordonnées si elles existent
            if (normalizedData.coordinates) {
                const coords = normalizedData.coordinates
                const exists = coords.exist === true
                
                outputHtml += `
                    <div class="bg-gray-700 rounded-lg p-4">
                        <h3 class="text-lg font-medium text-gray-300 mb-2">Coordonnées détectées</h3>
                        
                        <div class="mb-3">
                            <label class="inline-flex items-center">
                                <input type="checkbox" class="coords-exist-checkbox form-checkbox h-5 w-5 text-blue-600" 
                                       ${exists ? 'checked' : ''}
                                       data-action="change->plugin-interface#updateCoordsExist">
                                <span class="ml-2 text-gray-300">Coordonnées présentes</span>
                            </label>
                        </div>
                        
                        <div class="bg-gray-800 p-4 rounded grid grid-cols-1 gap-4 ${exists ? '' : 'opacity-50'} coords-container">
                            <div>
                                <label for="coords-ddm" class="block text-sm font-medium text-gray-400 mb-1">Format DDM:</label>
                                <input type="text" class="coords-ddm w-full bg-gray-800 text-gray-300 border border-gray-700 focus:border-blue-500 p-2 rounded"
                                       value="${coords.ddm || ''}" ${exists ? '' : 'disabled'}
                                       data-action="input->plugin-interface#updatePluginResult"
                                       data-key="coordinates.ddm">
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label for="coords-lat" class="block text-sm font-medium text-gray-400 mb-1">Latitude:</label>
                                    <input type="text" class="coords-lat w-full bg-gray-800 text-gray-300 border border-gray-700 focus:border-blue-500 p-2 rounded"
                                           value="${coords.ddm_lat || ''}" ${exists ? '' : 'disabled'}
                                           data-action="input->plugin-interface#updatePluginResult"
                                           data-key="coordinates.ddm_lat">
                                </div>
                                <div>
                                    <label for="coords-lon" class="block text-sm font-medium text-gray-400 mb-1">Longitude:</label>
                                    <input type="text" class="coords-lon w-full bg-gray-800 text-gray-300 border border-gray-700 focus:border-blue-500 p-2 rounded"
                                           value="${coords.ddm_lon || ''}" ${exists ? '' : 'disabled'}
                                           data-action="input->plugin-interface#updatePluginResult"
                                           data-key="coordinates.ddm_lon">
                                </div>
                            </div>
                        </div>
                    </div>
                `
                
                // AJOUT: Émettre un événement pour informer le Geocache Solver des coordonnées détectées
                if (exists) {
                    console.log("Émission de l'événement coordinatesDetected avec les coordonnées:", coords);
                    document.dispatchEvent(new CustomEvent('coordinatesDetected', {
                        detail: coords
                    }));
                }
            }
            
            // Ajouter l'option pour afficher le format brut
            outputHtml += `
                <div class="mt-4">
                    <button data-action="plugin-interface#toggleRawOutput" class="text-sm text-blue-400 hover:text-blue-300">
                        Afficher le format brut
                    </button>
                    <div class="raw-output hidden mt-2 bg-gray-700 rounded-lg p-4">
                        <textarea class="raw-output-field w-full h-40 bg-gray-800 text-gray-300 border border-gray-700 focus:border-blue-500 p-2 rounded resize-y"
                                 data-action="input->plugin-interface#updateRawJson">${JSON.stringify(normalizedData, null, 2)}</textarea>
                    </div>
                </div>
            `
            
            // Ajouter le bouton pour copier la sortie
            outputHtml += `
                <div class="mt-4 flex justify-end">
                    <button data-action="plugin-interface#copyOutputToClipboard" class="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        Copier la sortie
                    </button>
                </div>
            `
            
            outputHtml += '</div>'
            this.outputTarget.innerHTML = outputHtml
        })
        .catch(error => {
            console.error('Error:', error)
            if (this.hasOutputTarget) {
                this.outputTarget.innerHTML = `<div class="bg-red-900 text-red-100 p-4 rounded-lg">Erreur: ${error.message}</div>`
            }
        })
    }

    // Rendu des résultats au format standardisé
    _renderStandardizedResults(data) {
        let resultsHtml = '<div class="space-y-4">'
        
        // Afficher d'abord le résumé s'il existe
        if (data.summary) {
            resultsHtml += `
            <div class="bg-gray-700 rounded-lg p-4 mb-4">
                <h3 class="text-lg font-medium text-blue-400 mb-2">Résumé</h3>
                <div class="bg-gray-800 p-4 rounded">
                    <p class="text-gray-300">${data.summary.message || `${data.summary.total_results} résultat(s)`}</p>
                    ${data.status === 'error' ? `<p class="text-red-400 mt-2">Erreur: ${data.summary.message || 'Une erreur est survenue'}</p>`