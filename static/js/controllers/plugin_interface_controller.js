// Controller Stimulus pour l'interface du plugin
import { Controller } from "@hotwired/stimulus"

// Définition du contrôleur Stimulus
class PluginInterfaceController extends Controller {
    static targets = [
        "form", 
        "output", 
        "geocacheSelect", 
        "gcCodeInput", 
        "associatedGeocacheInfo", 
        "associatedGeocacheName", 
        "associatedGeocacheCode",
        "originalCoordinatesValue",
        "geocacheAssociation"
    ]
    
    static values = { id: String }
    
    connect() {
        console.log("Plugin interface controller connected", this.element)
        // Si un ID de géocache est présent, exécuter automatiquement
        if (this.hasIdValue && this.idValue !== 'default') {
            this.execute()
        }

        // Charger la liste des géocaches ouvertes
        this.loadOpenGeocaches()
        
        // Charger l'association de géocache depuis le sessionStorage si elle existe
        this.loadGeocacheAssociation()
        
        // Gestionnaire d'événement pour beforeunload
        this.beforeUnloadHandler = this.handleBeforeUnload.bind(this)
        window.addEventListener('beforeunload', this.beforeUnloadHandler)
    }
    
    disconnect() {
        console.log('Plugin interface controller disconnected');
        
        // Supprimer le gestionnaire d'événement beforeunload
        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
        
        // La suppression de l'association n'est pas nécessaire ici car elle est 
        // gérée via sessionStorage et sera chargée au reconnect
    }
    
    handleBeforeUnload() {
        // Rien de spécial à faire ici, l'association est déjà sauvegardée dans sessionStorage
    }
    
    // Méthode pour charger la liste des géocaches ouvertes
    loadOpenGeocaches() {
        console.log("Chargement des géocaches ouvertes");
        
        if (!this.hasGeocacheSelectTarget) return;
        
        // Récupérer les géocaches ouvertes via le gestionnaire d'état de layout
        try {
            if (window.layoutStateManager) {
                const openGeocaches = window.layoutStateManager.getComponentsByType('geocache-details');
                
                // Vider le sélecteur actuel
                this.geocacheSelectTarget.innerHTML = '<option value="">Sélectionner une géocache...</option>';
                
                // Ajouter chaque géocache au sélecteur
                openGeocaches.forEach(gc => {
                    const option = document.createElement('option');
                    option.value = gc.id;
                    option.textContent = `${gc.metadata.name} (${gc.metadata.code})`;
                    this.geocacheSelectTarget.appendChild(option);
                });
                
                console.log(`${openGeocaches.length} géocaches chargées dans le sélecteur`);
            } else {
                console.warn("layoutStateManager non disponible");
            }
        } catch (error) {
            console.error("Erreur lors du chargement des géocaches ouvertes:", error);
        }
    }
    
    // Méthode appelée lorsqu'une géocache est sélectionnée dans le dropdown
    selectGeocache(event) {
        const selectedId = event.target.value;
        if (!selectedId) return;
        
        try {
            if (window.layoutStateManager) {
                const openGeocaches = window.layoutStateManager.getComponentsByType('geocache-details');
                const selectedGeocache = openGeocaches.find(gc => gc.id === selectedId);
                
                if (selectedGeocache) {
                    this.associateGeocache({
                        id: selectedId,
                        name: selectedGeocache.metadata.name,
                        code: selectedGeocache.metadata.code,
                        databaseId: selectedGeocache.metadata.databaseId || null
                    });
                }
            }
        } catch (error) {
            console.error("Erreur lors de la sélection de la géocache:", error);
        }
    }
    
    // Méthode pour associer une géocache à partir du code GC
    associateGcCode(event) {
        event.preventDefault();
        const gcCode = this.gcCodeInputTarget.value.trim();
        
        if (!gcCode) {
            this.showErrorMessage("Veuillez saisir un code GC");
            return;
        }
        
        // Rechercher parmi les géocaches ouvertes
        try {
            if (window.layoutStateManager) {
                const openGeocaches = window.layoutStateManager.getComponentsByType('geocache-details');
                const existingGeocache = openGeocaches.find(gc => 
                    gc.metadata.code.toUpperCase() === gcCode.toUpperCase()
                );
                
                if (existingGeocache) {
                    // La géocache est déjà ouverte, on l'associe directement
                    this.associateGeocache({
                        id: existingGeocache.id,
                        name: existingGeocache.metadata.name,
                        code: existingGeocache.metadata.code,
                        databaseId: existingGeocache.metadata.databaseId || null
                    });
                } else {
                    // La géocache n'est pas ouverte, il faut faire une requête API
                    fetch(`/api/geocaches/by-code/${gcCode}`)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`Géocache non trouvée: ${gcCode}`);
                            }
                            return response.json();
                        })
                        .then(data => {
                            this.associateGeocache({
                                id: null, // Pas d'ID car non ouverte
                                name: data.name,
                                code: gcCode,
                                databaseId: data.id || null
                            });
                        })
                        .catch(error => {
                            // Afficher une notification d'erreur visible
                            this.showErrorMessage(`Erreur: ${error.message}`);
                        });
                }
            }
        } catch (error) {
            console.error("Erreur lors de l'association de la géocache:", error);
            this.showErrorMessage(`Erreur: ${error.message}`);
        }
    }
    
    // Méthode commune pour associer une géocache
    associateGeocache(geocache) {
        this.associatedGeocache = geocache;
        
        // Mettre à jour l'affichage
        this.associatedGeocacheNameTarget.textContent = geocache.name;
        this.associatedGeocacheCodeTarget.textContent = geocache.code;
        this.associatedGeocacheInfoTarget.classList.remove('hidden');
        
        // Enregistrer l'association dans le sessionStorage pour la session actuelle
        this.saveGeocacheAssociation();
        
        // Charger automatiquement les coordonnées d'origine
        this.loadAndDisplayOriginalCoordinates();
    }
    
    // Méthode pour sauvegarder l'association dans le sessionStorage
    saveGeocacheAssociation() {
        if (this.associatedGeocache) {
            const pluginName = this.element.querySelector('h1.text-2xl.font-bold.text-blue-400')?.textContent.trim();
            sessionStorage.setItem(`plugin_${pluginName}_geocache`, 
                JSON.stringify({
                    id: this.associatedGeocache.id,
                    name: this.associatedGeocache.name,
                    code: this.associatedGeocache.code,
                    databaseId: this.associatedGeocache.databaseId || null
                })
            );
        }
    }
    
    // Méthode pour charger l'association depuis le sessionStorage
    loadGeocacheAssociation() {
        const pluginName = this.element.querySelector('h1.text-2xl.font-bold.text-blue-400')?.textContent.trim();
        if (!pluginName) return;
        
        const saved = sessionStorage.getItem(`plugin_${pluginName}_geocache`);
        if (saved) {
            try {
                const geocache = JSON.parse(saved);
                console.log("Association de géocache chargée depuis sessionStorage:", geocache);
                this.associateGeocache(geocache);
                
                // Mettre à jour le sélecteur si la géocache est ouverte
                if (geocache.id && this.hasGeocacheSelectTarget) {
                    this.geocacheSelectTarget.value = geocache.id;
                }
            } catch (e) {
                console.error('Erreur lors du chargement de l\'association:', e);
            }
        }
    }
    
    // Méthode pour charger et afficher les coordonnées d'origine
    loadAndDisplayOriginalCoordinates() {
        if (!this.associatedGeocache || !this.associatedGeocache.code) {
            return;
        }
        
        // Afficher l'état de chargement
        this.originalCoordinatesValueTarget.textContent = "Chargement...";
        
        fetch(`/api/geocaches/by-code/${this.associatedGeocache.code}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Impossible de récupérer les coordonnées`);
                }
                return response.json();
            })
            .then(data => {
                // Afficher les coordonnées dans l'élément dédié
                const coordsStr = data.gc_lat && data.gc_lon ? 
                    `${data.gc_lat} ${data.gc_lon}` : 'Non disponibles';
                this.originalCoordinatesValueTarget.textContent = coordsStr;
                
                // Stocker les coordonnées pour une utilisation ultérieure
                this.cachedOriginalCoords = {
                    gc_lat: data.gc_lat,
                    gc_lon: data.gc_lon
                };
            })
            .catch(error => {
                this.originalCoordinatesValueTarget.textContent = "Erreur lors du chargement";
                console.error("Erreur lors du chargement des coordonnées:", error);
            });
    }
    
    // Méthode pour ouvrir les détails de la géocache
    openGeocacheDetails(event) {
        if (event) {
            event.preventDefault();
        }
        
        // Vérifier que nous avons une géocache associée
        if (!this.associatedGeocache || !this.associatedGeocache.code) {
            console.error("Aucune géocache associée à ouvrir");
            this.showErrorMessage("Veuillez d'abord associer une géocache");
            return;
        }
        
        // Si nous n'avons pas d'ID de base de données, le récupérer
        if (!this.associatedGeocache.databaseId) {
            fetch(`/api/geocaches/by-code/${this.associatedGeocache.code}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Impossible de récupérer les détails de la géocache`);
                    }
                    return response.json();
                })
                .then(data => {
                    this.associatedGeocache.databaseId = data.id;
                    this.saveGeocacheAssociation(); // Mettre à jour avec l'ID
                    this.openGeocacheTab();
                })
                .catch(error => {
                    this.showErrorMessage(`Erreur: ${error.message}`);
                });
        } else {
            // Ouvrir directement l'onglet
            this.openGeocacheTab();
        }
    }
    
    // Méthode pour ouvrir l'onglet de la géocache
    openGeocacheTab() {
        // Utiliser le système de messaging pour ouvrir l'onglet
        window.parent.postMessage({ 
            type: 'openGeocacheDetails',
            geocacheId: this.associatedGeocache.databaseId,
            gcCode: this.associatedGeocache.code,
            name: this.associatedGeocache.name || this.associatedGeocache.code
        }, '*');
    }
    
    // Méthode pour supprimer l'association avec la géocache
    removeGeocacheAssociation() {
        this.associatedGeocache = null;
        this.associatedGeocacheInfoTarget.classList.add('hidden');
        
        if (this.hasGeocacheSelectTarget) {
            this.geocacheSelectTarget.value = "";
        }
        
        // Réinitialiser l'affichage des coordonnées d'origine
        this.originalCoordinatesValueTarget.textContent = "";
        
        // Supprimer l'association du sessionStorage
        const pluginName = this.element.querySelector('h1.text-2xl.font-bold.text-blue-400')?.textContent.trim();
        if (pluginName) {
            sessionStorage.removeItem(`plugin_${pluginName}_geocache`);
        }
    }
    
    // Méthode pour afficher un message d'erreur
    showErrorMessage(message) {
        // Créer un élément d'erreur s'il n'existe pas déjà
        let errorElement = document.getElementById('plugin-error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'plugin-error-message';
            errorElement.className = 'bg-red-600 text-white px-4 py-2 rounded-lg mb-4 flex items-center justify-between';
            
            // Ajouter l'élément juste après la section d'association de géocache
            if (this.hasGeocacheAssociationTarget) {
                this.geocacheAssociationTarget.parentNode.insertBefore(errorElement, this.geocacheAssociationTarget.nextSibling);
            } else {
                // Fallback si la cible n'est pas disponible
                const formElement = this.hasFormTarget ? this.formTarget : this.element.querySelector('form');
                if (formElement) {
                    formElement.parentNode.insertBefore(errorElement, formElement);
                }
            }
        }
        
        // Mettre à jour le contenu
        errorElement.innerHTML = `
            <div class="flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <span>${message}</span>
            </div>
            <button class="text-white hover:text-gray-200" onclick="this.parentNode.remove()">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        `;
        
        // Auto-supprimer après un délai
        setTimeout(() => {
            if (errorElement && errorElement.parentNode) {
                errorElement.remove();
            }
        }, 5000);
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
                    ${data.status === 'error' ? `<p class="text-red-400 mt-2">Erreur: ${data.summary.message || 'Une erreur est survenue'}</p>` : ''}
                    ${data.plugin_info ? `<p class="text-gray-400 text-sm mt-2">Temps d'exécution: ${data.plugin_info.execution_time || 0} ms</p>` : ''}
                </div>
            </div>
        `
        }
        
        // Afficher les résultats
        if (data.results && Array.isArray(data.results)) {
            resultsHtml += '<div class="space-y-4">'
            data.results.forEach((result, index) => {
                resultsHtml += `
                    <div class="bg-gray-700 rounded-lg p-4">
                        <h3 class="text-lg font-medium text-gray-300 mb-2">Résultat ${index + 1}</h3>
                        <div class="bg-gray-800 p-4 rounded">
                            <textarea class="text-output-field w-full bg-gray-800 text-gray-300 border border-gray-700 focus:border-blue-500 p-2 rounded resize-y"
                                      data-action="input->plugin-interface#updatePluginResult" data-key="results.${index}.text_output">${result.text_output || ''}</textarea>
                        </div>
                    </div>
                `
            })
            resultsHtml += '</div>'
        }
        
        // Afficher le log s'il existe
        if (data.log) {
            resultsHtml += `
                <div class="bg-gray-700 rounded-lg p-4">
                    <h3 class="text-lg font-medium text-gray-300 mb-2">Détails de la projection</h3>
                    <div class="bg-gray-800 p-4 rounded">
                        <pre class="log-field w-full bg-gray-800 text-gray-300 font-mono text-sm whitespace-pre-wrap">${data.log || ''}</pre>
                    </div>
                </div>
            `
        }
        
        // Afficher les coordonnées si elles existent
        if (data.coordinates) {
            const coords = data.coordinates
            const exists = coords.exist === true
            
            resultsHtml += `
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
        }
        
        // Ajouter l'option pour afficher le format brut
        resultsHtml += `
            <div class="mt-4">
                <button data-action="plugin-interface#toggleRawOutput" class="text-sm text-blue-400 hover:text-blue-300">
                    Afficher le format brut
                </button>
                <div class="raw-output hidden mt-2 bg-gray-700 rounded-lg p-4">
                    <textarea class="raw-output-field w-full h-40 bg-gray-800 text-gray-300 border border-gray-700 focus:border-blue-500 p-2 rounded resize-y"
                             data-action="input->plugin-interface#updateRawJson">${JSON.stringify(data, null, 2)}</textarea>
                </div>
            </div>
        `
        
        // Ajouter le bouton pour copier la sortie
        resultsHtml += `
            <div class="mt-4 flex justify-end">
                <button data-action="plugin-interface#copyOutputToClipboard" class="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    Copier la sortie
                </button>
            </div>
        `
        
        resultsHtml += '</div>'
        this.outputTarget.innerHTML = resultsHtml
    }
}