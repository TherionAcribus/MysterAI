// Geocache Solver Controller
window.GeocacheSolverController = class extends Stimulus.Controller {
    static targets = [
        "loading", "description", "descriptionText", "error", 
        "pluginsPanel", "togglePluginsButton", "togglePluginsText",
        "pluginList", "pluginResult", "pluginResultText", "pluginInputText",
        "pluginsResults", "resultsContainer", "metaSolverPanel",
        "toggleMetaSolverButton"
    ]
    
    static values = {
        geocacheId: String,
        gcCode: String,
        selectedPlugin: String,
        lastPluginOutput: String,
        pluginsHistory: Array,
        lastDetectedCoordinates: Object
    }

    connect() {
        console.log("Solver controller connected", {
            geocacheId: this.geocacheIdValue,
            gcCode: this.gcCodeValue
        });
        
        // Initialiser l'historique des plugins
        this.pluginsHistoryValue = [];
        
        // Vérifier si une géocache est spécifiée
        if (this.geocacheIdValue && this.geocacheIdValue.trim() !== '') {
            this.loadGeocacheData();
        } else {
            // Aucune géocache spécifiée, initialiser un panneau vide
            console.log("Aucune géocache spécifiée, initialisation d'un panneau vide");
            this.hideLoading();
            this.descriptionTarget.classList.remove('hidden');
            this.descriptionTextTarget.value = '';
        }
        
        // Ajouter un écouteur d'événement pour le changement de type de caractères autorisés
        document.addEventListener('DOMContentLoaded', () => {
            const allowedCharsSelect = document.getElementById('metasolver-allowed-chars');
            const customCharsContainer = document.getElementById('metasolver-custom-chars-container');
            
            if (allowedCharsSelect && customCharsContainer) {
                allowedCharsSelect.addEventListener('change', (event) => {
                    if (event.target.value === 'custom') {
                        customCharsContainer.classList.remove('hidden');
                    } else {
                        customCharsContainer.classList.add('hidden');
                    }
                });
            }
        });
        
        // Écouter les changements dans le champ de description
        if (this.hasDescriptionTextTarget) {
            this.descriptionTextTarget.addEventListener('input', (event) => {
                console.log("Mise à jour du champ de description détectée:", event.target.value);
                // Forcer une mise à jour du modèle
                this._currentDescriptionValue = event.target.value;
            });
        }

        // Écouter les événements de détection de coordonnées GPS
        console.log("Configuration de l'écouteur d'événements pour coordinatesDetected");
        document.addEventListener('coordinatesDetected', this.handleCoordinatesDetected.bind(this));
        
        // Vérification immédiate des cibles Stimulus
        console.log("Vérification des cibles Stimulus pour les coordonnées:", {
            hasCoordinatesContainerTarget: this.hasCoordinatesContainerTarget,
            hasCoordinatesContentTarget: this.hasCoordinatesContentTarget
        });
        
        // Écouter l'événement directement sur le document
        document.addEventListener('coordinatesDetected', function(event) {
            console.log("Événement coordinatesDetected reçu directement par le document:", event.detail);
        });
    }

    // Méthode pour gérer l'événement de détection de coordonnées GPS
    handleCoordinatesDetected(event) {
        console.log("Coordonnées GPS détectées dans Geocache Solver:", event.detail);
        
        // Vérifier si des coordonnées ont été détectées
        if (event.detail && event.detail.exist) {
            console.log("Coordonnées valides détectées, stockage uniquement");
            
            // Stocker les coordonnées détectées sans mise à jour de l'affichage
            this.lastDetectedCoordinatesValue = event.detail;
        } else {
            console.log("Coordonnées non valides ou inexistantes dans l'événement");
        }
    }

    // Méthode simplifiée pour displayDetectedCoordinates (garde l'interface compatible)
    displayDetectedCoordinates(coordinates) {
        console.log("Méthode displayDetectedCoordinates désactivée - fonctionalité intégrée directement dans l'affichage des résultats");
        // Ne fait rien - cette méthode est conservée pour compatibilité
    }

    async loadGeocacheData() {
        try {
            this.showLoading();
            
            // Obtenir les données textuelles de la géocache
            const response = await fetch(`/geocaches/${this.geocacheIdValue}/text`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des données');
            }

            const data = await response.json();
            this.displayDescription(data.description);
        } catch (error) {
            console.error('Erreur:', error);
            this.showError();
        }
    }

    displayDescription(description) {
        this.hideLoading();
        this.errorTarget.classList.add('hidden');
        this.descriptionTarget.classList.remove('hidden');
        
        // Afficher le texte dans le textarea
        this.descriptionTextTarget.value = description;
    }

    showLoading() {
        this.loadingTarget.classList.remove('hidden');
        this.descriptionTarget.classList.add('hidden');
        this.errorTarget.classList.add('hidden');
    }

    hideLoading() {
        this.loadingTarget.classList.add('hidden');
    }

    showError() {
        this.hideLoading();
        this.descriptionTarget.classList.add('hidden');
        this.errorTarget.classList.remove('hidden');
    }
    
    // Méthodes pour gérer les plugins
    
    togglePluginsPanel() {
        console.log("togglePluginsPanel appelé");
        
        // Masquer le panneau MetaSolver s'il est visible
        if (!this.metaSolverPanelTarget.classList.contains('hidden')) {
            this.metaSolverPanelTarget.classList.add('hidden');
            this.toggleMetaSolverButtonTarget.classList.remove('bg-blue-700');
            this.toggleMetaSolverButtonTarget.classList.add('bg-blue-600');
        }
        
        // Si le panneau est masqué, l'afficher et charger les plugins
        if (this.pluginsPanelTarget.classList.contains('hidden')) {
            console.log("Panneau masqué, on l'affiche");
            this.pluginsPanelTarget.classList.remove('hidden');
            this.togglePluginsButtonTarget.classList.remove('bg-purple-600');
            this.togglePluginsButtonTarget.classList.add('bg-purple-700');
            
            // Charger les plugins si ce n'est pas déjà fait
            if (!this.pluginsPanelTarget.hasAttribute('data-loaded')) {
                console.log("Plugins non chargés, on les charge");
                this.loadPluginsList();
            }
        } else {
            // Si le panneau est visible, le masquer
            console.log("Panneau visible, on le masque");
            this.pluginsPanelTarget.classList.add('hidden');
            this.togglePluginsButtonTarget.classList.remove('bg-purple-700');
            this.togglePluginsButtonTarget.classList.add('bg-purple-600');
        }
    }
    
    toggleMetaSolverPanel() {
        console.log("toggleMetaSolverPanel appelé");
        
        // Masquer le panneau des plugins s'il est visible
        if (!this.pluginsPanelTarget.classList.contains('hidden')) {
            this.pluginsPanelTarget.classList.add('hidden');
            this.togglePluginsButtonTarget.classList.remove('bg-purple-700');
            this.togglePluginsButtonTarget.classList.add('bg-purple-600');
        }
        
        // Si le panneau MetaSolver est masqué, l'afficher
        if (this.metaSolverPanelTarget.classList.contains('hidden')) {
            console.log("Panneau MetaSolver masqué, on l'affiche");
            this.metaSolverPanelTarget.classList.remove('hidden');
            this.toggleMetaSolverButtonTarget.classList.remove('bg-blue-600');
            this.toggleMetaSolverButtonTarget.classList.add('bg-blue-700');
        } else {
            // Si le panneau est visible, le masquer
            console.log("Panneau MetaSolver visible, on le masque");
            this.metaSolverPanelTarget.classList.add('hidden');
            this.toggleMetaSolverButtonTarget.classList.remove('bg-blue-700');
            this.toggleMetaSolverButtonTarget.classList.add('bg-blue-600');
        }
    }
    
    async executeMetaSolver(event) {
        console.log("executeMetaSolver appelé");
        
        // Récupérer le mode (detect ou decode) depuis l'attribut data-mode du bouton
        const mode = event.currentTarget.dataset.mode || 'detect';
        console.log("Mode MetaSolver:", mode);
        
        // Récupérer le texte à analyser
        const textToProcess = this._currentDescriptionValue || this.descriptionTextTarget.value;
        if (!textToProcess || textToProcess.trim() === '') {
            alert("Veuillez entrer du texte à analyser");
            return;
        }
        
        // Récupérer les autres paramètres du MetaSolver
        const strict = document.getElementById('metasolver-strict').value;
        const allowedChars = document.getElementById('metasolver-allowed-chars').value;
        const customChars = document.getElementById('metasolver-custom-chars').value;
        const embedded = document.getElementById('metasolver-embedded').checked;
        const gpsDetection = document.getElementById('metasolver-gps-detection').checked;
        
        // Préparer les paramètres pour l'API
        const formData = new FormData();
        formData.append('text', textToProcess);
        formData.append('mode', mode);
        formData.append('strict', strict);
        formData.append('embedded', embedded ? 'true' : 'false');
        
        // Ajouter les caractères autorisés selon la sélection
        if (allowedChars === 'special') {
            formData.append('allowed_chars', JSON.stringify("°.'"));
        } else if (allowedChars === 'custom' && customChars) {
            formData.append('allowed_chars', JSON.stringify(customChars));
        }
        
        // Afficher un indicateur de chargement
        const resultContainer = document.getElementById('metasolver-result');
        const resultContent = document.getElementById('metasolver-result-content');
        
        resultContainer.classList.remove('hidden');
        resultContent.innerHTML = `
            <div class="animate-pulse">
                <div class="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
                <div class="h-4 bg-gray-600 rounded w-1/2 mb-2"></div>
                <div class="h-4 bg-gray-600 rounded w-2/3"></div>
            </div>
        `;
        
        try {
            // Appeler l'API MetaSolver
            const response = await fetch('/api/plugins/metadetection/execute', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Réponse du MetaSolver:", data);
            
            // Afficher les résultats
            let resultHtml = '';
            
            // Si nous avons des résultats
            if (data.results && Array.isArray(data.results) && data.results.length > 0) {
                // Afficher les résultats avec leur score
                resultHtml += `<h3 class="text-md font-medium text-blue-400 mb-2">Résultats (${data.results.length})</h3>`;
                
                // Trier les résultats par score décroissant
                const sortedResults = [...data.results].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
                
                // Afficher les résultats
                sortedResults.forEach((result, index) => {
                    const confidenceColor = this.getConfidenceColor(result.confidence);
                    const confidencePercent = result.confidence ? Math.round(result.confidence * 100) : '?';
                    
                    resultHtml += `
                        <div class="bg-gray-700 rounded-lg p-3 mb-3">
                            <div class="flex justify-between items-start mb-2">
                                <h4 class="text-md font-medium text-gray-300">Résultat ${index + 1}</h4>
                                <div class="bg-gray-900 px-2 py-1 rounded text-xs">
                                    Confiance: <span class="font-bold ${confidenceColor}">${confidencePercent}%</span>
                                </div>
                            </div>
                            
                            <div class="bg-gray-800 p-3 rounded mb-2">
                                <div class="text-sm text-gray-300 whitespace-pre-wrap">${result.text || ''}</div>
                            </div>
                    `;
                    
                    // Afficher les coordonnées GPS si présentes
                    if (result.coordinates && result.coordinates.exist) {
                        resultHtml += `
                            <div class="mt-2 p-2 bg-gray-800 rounded">
                                <h5 class="text-xs font-medium text-gray-400 mb-1">Coordonnées GPS:</h5>
                                <div class="text-xs text-gray-300">
                                    <div class="mb-1"><span class="text-gray-500">Format DDM:</span> ${result.coordinates.ddm || ''}</div>
                                    <div class="grid grid-cols-2 gap-1">
                                        <div><span class="text-gray-500">Latitude:</span> ${result.coordinates.ddm_lat || ''}</div>
                                        <div><span class="text-gray-500">Longitude:</span> ${result.coordinates.ddm_lon || ''}</div>
                                    </div>
                                </div>
                            </div>
                        `;
                        
                        // Émettre un événement pour les coordonnées détectées
                        if (result.coordinates.ddm) {
                            const event = new CustomEvent('coordinatesDetected', {
                                detail: result.coordinates,
                                bubbles: true
                            });
                            document.dispatchEvent(event);
                        }
                    }
                    
                    // Ajouter un bouton pour utiliser ce résultat dans un plugin
                    resultHtml += `
                        <div class="mt-2 flex justify-end">
                            <button 
                                class="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded"
                                data-action="click->geocache-solver#useMetaSolverResult"
                                data-result-index="${index}">
                                Utiliser ce résultat
                            </button>
                        </div>
                    </div>`;
                });
                
                // Stocker les résultats pour une utilisation ultérieure
                this._metaSolverResults = sortedResults;
                
            } else {
                // Aucun résultat
                resultHtml = `<div class="text-gray-300">Aucun résultat trouvé</div>`;
            }
            
            // Mettre à jour le contenu
            resultContent.innerHTML = resultHtml;
            
        } catch (error) {
            console.error('Erreur lors de l\'exécution du MetaSolver:', error);
            resultContent.innerHTML = `
                <div class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                    Erreur lors de l'exécution du MetaSolver: ${error.message}
                </div>
            `;
        }
    }
    
    useMetaSolverResult(event) {
        console.log("useMetaSolverResult appelé");
        
        // Récupérer l'index du résultat à utiliser
        const resultIndex = parseInt(event.currentTarget.dataset.resultIndex, 10);
        
        // Vérifier que les résultats du MetaSolver sont disponibles
        if (!this._metaSolverResults || !this._metaSolverResults[resultIndex]) {
            console.error("Résultat du MetaSolver non disponible");
            alert("Impossible de récupérer le résultat");
            return;
        }
        
        // Récupérer le résultat
        const result = this._metaSolverResults[resultIndex];
        console.log("Résultat sélectionné:", result);
        
        // Mettre à jour la valeur du plugin output avec le texte du résultat
        if (result.text) {
            this.lastPluginOutputValue = result.text;
            
            // Mise à jour de l'interface utilisateur pour indiquer que le résultat a été sélectionné
            // Mettre tous les boutons "Utiliser ce résultat" en état normal
            const buttons = document.querySelectorAll('button[data-action="click->geocache-solver#useMetaSolverResult"]');
            buttons.forEach(btn => {
                btn.classList.remove('bg-green-600', 'hover:bg-green-700');
                btn.classList.add('bg-purple-600', 'hover:bg-purple-700');
                btn.textContent = 'Utiliser ce résultat';
            });
            
            // Mettre le bouton actuel en vert avec texte "Sélectionné"
            event.currentTarget.classList.remove('bg-purple-600', 'hover:bg-purple-700');
            event.currentTarget.classList.add('bg-green-600', 'hover:bg-green-700');
            event.currentTarget.textContent = 'Sélectionné';
            
            // Notification de succès
            const notification = document.createElement('div');
            notification.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50';
            notification.textContent = 'Résultat sélectionné pour utilisation dans les plugins';
            document.body.appendChild(notification);
            
            // Supprimer la notification après 3 secondes
            setTimeout(() => notification.remove(), 3000);
        }
    }
    
    async loadPluginsList() {
        try {
            console.log("loadPluginsList appelé");
            
            // Afficher le panneau des plugins
            console.log("État du panneau avant:", this.pluginsPanelTarget.classList.contains('hidden') ? "caché" : "visible");
            this.pluginsPanelTarget.classList.remove('hidden');
            console.log("État du panneau après:", this.pluginsPanelTarget.classList.contains('hidden') ? "caché" : "visible");
            
            this.togglePluginsButtonTarget.classList.remove('bg-purple-600');
            this.togglePluginsButtonTarget.classList.add('bg-purple-700');
            
            // Vérifier si les plugins sont déjà chargés
            if (this.pluginsPanelTarget.hasAttribute('data-loaded')) {
                console.log("Plugins déjà chargés, sortie de la fonction");
                return;
            }
            
            // Afficher un loader pendant le chargement
            this.pluginsPanelTarget.innerHTML = `
                <div class="animate-pulse">
                    <div class="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div class="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                    <div class="h-4 bg-gray-700 rounded w-2/3"></div>
                </div>
            `;
            
            // Appeler l'API pour récupérer la liste des plugins
            const response = await fetch('/api/plugins?context=solver');
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const plugins = await response.json();
            
            // Créer un ID unique pour cette zone de plugins
            const mainPluginZoneId = `main-plugin-zone-${Date.now()}`;
            
            // Créer l'interface pour la liste des plugins
            let pluginsListHtml = `
                <div id="${mainPluginZoneId}" class="bg-gray-800 rounded-lg p-4" data-plugin-selection-zone="true">
                    <h2 class="text-lg font-semibold text-gray-100 mb-3">Plugins disponibles</h2>
                    
                    <div class="mb-4">
                        <input 
                            type="text" 
                            placeholder="Rechercher un plugin..." 
                            class="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded-md border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            data-action="input->geocache-solver#filterPlugins">
                    </div>
                    
                    <div class="space-y-2" data-geocache-solver-target="pluginList">
            `;
            
            // Ajouter chaque plugin à la liste
            plugins.forEach(plugin => {
                pluginsListHtml += `
                    <div class="plugin-item flex items-center justify-between p-2 rounded-md hover:bg-gray-700 transition-colors" data-plugin-name="${plugin.name.toLowerCase()}">
                        <div>
                            <div class="font-medium text-gray-200">${plugin.name}</div>
                            <div class="text-xs text-gray-400">${plugin.description || 'Aucune description'}</div>
                        </div>
                        <button 
                            data-action="click->geocache-solver#selectPlugin" 
                            data-plugin-id="${plugin.id}"
                            data-plugin-name="${plugin.name}"
                            data-plugin-zone-id="${mainPluginZoneId}"
                            class="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-medium transition-colors">
                            Sélectionner
                        </button>
                    </div>
                `;
            });
            
            pluginsListHtml += `
                    </div>
                </div>
            `;
            
            // Mettre à jour le contenu du panneau des plugins
            this.pluginsPanelTarget.innerHTML = pluginsListHtml;
            
            // Marquer les plugins comme chargés
            this.pluginsPanelTarget.setAttribute('data-loaded', 'true');
            console.log("Plugins marqués comme chargés");
            
        } catch (error) {
            console.error('Erreur lors du chargement des plugins:', error);
            this.pluginsPanelTarget.innerHTML = `
                <div class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                    Erreur lors du chargement des plugins: ${error.message}
                </div>
            `;
        }
    }

    // Méthode pour sélectionner un plugin
    async selectPlugin(event) {
        const pluginId = event.currentTarget.dataset.pluginId;
        const pluginName = event.currentTarget.dataset.pluginName;
        const pluginZoneId = event.currentTarget.dataset.pluginZoneId;
        
        console.log("Sélection du plugin:", pluginName, "dans la zone:", pluginZoneId);
        
        if (pluginId && pluginName) {
            try {
                // Afficher un loader pendant le chargement
                if (pluginZoneId) {
                    const pluginZone = document.getElementById(pluginZoneId);
                    pluginZone.innerHTML = `
                        <div class="animate-pulse">
                            <div class="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                            <div class="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                            <div class="h-4 bg-gray-700 rounded w-2/3"></div>
                        </div>
                    `;
                } else {
                    this.pluginsPanelTarget.innerHTML = `
                        <div class="animate-pulse">
                            <div class="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                            <div class="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                            <div class="h-4 bg-gray-700 rounded w-2/3"></div>
                        </div>
                    `;
                }
                
                // Appeler l'API pour récupérer l'interface du plugin
                const response = await fetch(`/api/plugins/${pluginName}/interface?context=solver`);
                
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                
                const html = await response.text();
                
                // Mettre à jour le contenu du panneau des plugins
                if (pluginZoneId) {
                    const pluginZone = document.getElementById(pluginZoneId);
                    
                    // Insérer le HTML dans la zone
                    pluginZone.innerHTML = html;
                    
                    // Ajouter l'attribut data-plugin-zone-id au bouton d'exécution
                    const executeButton = 
pluginZone.querySelector('[data-action="click->geocache-solver#executePlugin"]');
                    if (executeButton) {
                        executeButton.setAttribute('data-plugin-zone-id', pluginZoneId);
                        console.log("Attribut data-plugin-zone-id ajouté au bouton d'exécution:", 
pluginZoneId);
                    }
                    
                    // Ajouter l'attribut data-plugin-input="true" à tous les textareas du plugin
                    const textareas = pluginZone.querySelectorAll('textarea');
                    textareas.forEach(textarea => {
                        textarea.setAttribute('data-plugin-input', 'true');
                        console.log("Attribut data-plugin-input ajouté à un textarea");
                    });
                } else {
                    this.pluginsPanelTarget.innerHTML = html;
                    
                    // Dans ce cas, nous sommes dans le panneau principal, créons un ID
                    const mainPanelId = `main-panel-${Date.now()}`;
                    this.pluginsPanelTarget.id = mainPanelId;
                    this.pluginsPanelTarget.setAttribute('data-plugin-selection-zone', 'true');
                    
                    // Ajouter l'attribut data-plugin-zone-id au bouton d'exécution
                    const executeButton = 
this.pluginsPanelTarget.querySelector('[data-action="click->geocache-solver#executePlugin"]');
                    if (executeButton) {
                        executeButton.setAttribute('data-plugin-zone-id', mainPanelId);
                        console.log("Attribut data-plugin-zone-id ajouté au bouton d'exécution principal:", mainPanelId);
                    }
                    
                    // Ajouter l'attribut data-plugin-input="true" à tous les textareas du plugin
                    const textareas = this.pluginsPanelTarget.querySelectorAll('textarea');
                    textareas.forEach(textarea => {
                        textarea.setAttribute('data-plugin-input', 'true');
                        console.log("Attribut data-plugin-input ajouté à un textarea");
                    });
                }
                
                // Mettre à jour le plugin sélectionné
                this.selectedPluginValue = pluginId;
                
                // Préparer le texte à traiter (soit le résultat du plugin précédent, soit le texte de la description)
                if (this.hasPluginInputTextTarget) {
                    if (this.lastPluginOutputValue) {
                        this.pluginInputTextTarget.value = this.lastPluginOutputValue;
                    } else {
                        this.pluginInputTextTarget.value = this.descriptionTextTarget.value;
                    }
                }
                
            } catch (error) {
                console.error('Erreur lors du chargement de l\'interface du plugin:', error);
                if (pluginZoneId) {
                    const pluginZone = document.getElementById(pluginZoneId);
                    pluginZone.innerHTML = `
                        <div class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                            Erreur lors du chargement de l'interface du plugin: ${error.message}
                        </div>
                    `;
                } else {
                    this.pluginsPanelTarget.innerHTML = `
                        <div class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                            Erreur lors du chargement de l'interface du plugin: ${error.message}
                        </div>
                    `;
                }
            }
        }
    }

    // Méthode pour filtrer la liste des plugins
    filterPlugins(event) {
        const searchTerm = event.target.value.toLowerCase();
        console.log("Filtrage des plugins avec le terme:", searchTerm);
        
        // Trouver la liste des plugins la plus proche de l'input de recherche
        const pluginList = event.target.closest('div').nextElementSibling;
        
        if (!pluginList) {
            console.error("Liste de plugins non trouvée");
            return;
        }
        
        // Filtrer les éléments de la liste
        const pluginItems = pluginList.querySelectorAll('.plugin-item');
        
        pluginItems.forEach(item => {
            const pluginName = item.dataset.pluginName;
            if (pluginName.includes(searchTerm)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // Méthode pour extraire les valeurs numériques des coordonnées
    extractNumericCoordinate(coordStr) {
        try {
            // Format attendu: "N 48° 32.296'" ou "E 6° 40.636'"
            const direction = coordStr.charAt(0);
            const parts = coordStr.substring(1).trim().split('°');
            
            if (parts.length !== 2) return null;
            
            const degrees = parseFloat(parts[0].trim());
            const minutes = parseFloat(parts[1].replace("'", "").trim());
            
            let decimal = degrees + (minutes / 60);
            
            // Ajuster selon la direction
            if (direction === 'S' || direction === 'W') {
                decimal = -decimal;
            }
            
            return decimal;
        } catch (error) {
            console.error("Erreur lors de l'extraction des coordonnées numériques:", error);
            return null;
        }
    }

    // Méthode pour réinitialiser l'affichage des coordonnées
    resetCoordinatesDisplay() {
        console.log("Réinitialisation des coordonnées détectées");
        // Réinitialiser les coordonnées stockées
        this.lastDetectedCoordinatesValue = null;
    }

    // Méthode pour forcer l'affichage des coordonnées à partir des données du log
    forceCoordinatesDisplay() {
        console.log("Forçage de l'affichage des coordonnées à partir des données du log");
        
        // Coordonnées extraites du log
        const coordinates = {
            exist: true,
            ddm_lat: "N 49° 12.123'",
            ddm_lon: "E 006° 12.123'",
            ddm: "N 49° 12.123' E 006° 12.123'",
            decimal: {
                latitude: 49.20205,
                longitude: 6.20205
            },
            patterns: ["N 49° 12.123' E 006° 12.123'"]
        };
        
        // Stocker les coordonnées
        this.lastDetectedCoordinatesValue = coordinates;
    }

    // Fonction pour normaliser le texte avant de l'envoyer aux plugins
    normalizeText(text) {
        if (!text) return '';
        
        // Remplacer les espaces insécables par des espaces normaux
        let normalized = text.replace(/\xa0/g, ' ');
        
        // Normaliser les retours à la ligne
        normalized = normalized.replace(/\r\n/g, '\n');
        
        // Supprimer les espaces multiples
        normalized = normalized.replace(/\s+/g, ' ');
        
        // Supprimer les espaces en début et fin de chaîne
        normalized = normalized.trim();
        
        console.log("Texte normalisé:", normalized);
        return normalized;
    }
    
    async executePlugin(event) {
        // Réinitialiser l'affichage des coordonnées
        this.resetCoordinatesDisplay();
        
        // Code existant pour exécuter le plugin
        const button = event.currentTarget;
        const pluginId = button.dataset.pluginId;
        const pluginName = button.dataset.pluginName;
        
        console.log("Exécution du plugin:", pluginName, "dans la zone:", button.dataset.pluginZoneId);
        
        // Si on a un plugin sélectionné
        if (pluginId && pluginName) {
            // Log pour le débogage - valeur actuelle du champ de description
            console.log("Valeur actuelle dans descriptionTextTarget:", this.descriptionTextTarget.value);
            console.log("Valeur dans _currentDescriptionValue:", this._currentDescriptionValue || "non définie");
            
            // Récupérer le texte à traiter en privilégiant toujours la saisie la plus récente
            let textToProcess = '';
            
            // Déterminer si le plugin est déjà exécuté dans cette zone (réexécution)
            const isReexecution = button.dataset.pluginZoneId && 
document.getElementById(`result-for-${button.dataset.pluginZoneId}`);
            
            // Trouver la source d'entrée actuelle - toujours prendre l'entrée la plus récente
            const pluginZone = button.dataset.pluginZoneId ? 
document.getElementById(button.dataset.pluginZoneId) : null;
            
            // Vérifier si une zone d'entrée de texte existe dans la zone du plugin
            const pluginInputTextarea = pluginZone ? 
                pluginZone.querySelector('textarea[data-plugin-input="true"]') : null;
            
            if (pluginInputTextarea && pluginInputTextarea.value.trim() !== '') {
                // Utiliser le texte du plugin si disponible et non vide
                textToProcess = pluginInputTextarea.value;
                console.log("Texte saisi dans le plugin utilisé:", textToProcess);
            } else {
                // Essayer d'utiliser la valeur mise en cache si elle existe
                if (this._currentDescriptionValue) {
                    textToProcess = this._currentDescriptionValue;
                    console.log("Utilisation de la valeur mise en cache:", textToProcess);
                } else {
                    // Sinon utiliser le texte de la description principale
                    textToProcess = this.descriptionTextTarget.value;
                    console.log("Texte de la description principale utilisé:", textToProcess);
                }
                
                // Si c'est une réexécution et que la description principale est vide, 
                // utiliser le résultat du plugin précédent comme fallback
                if (textToProcess.trim() === '' && this.lastPluginOutputValue) {
                    textToProcess = this.lastPluginOutputValue;
                    console.log("Description vide, utilisation du résultat du plugin précédent:", 
textToProcess);
                }
            }
            
            // Normaliser le texte avant de l'envoyer au plugin
            textToProcess = this.normalizeText(textToProcess);
            console.log("Texte final qui sera envoyé au plugin:", textToProcess);
            
            try {
                // Créer ou récupérer la zone de résultat pour ce plugin
                let resultContainer;
                let resultTextContainer;
                
                if (button.dataset.pluginZoneId) {
                    // Cas d'un plugin dans une zone spécifique
                    if (!pluginZone) {
                        console.error("Zone de plugin non trouvée:", button.dataset.pluginZoneId);
                        throw new Error("Zone de plugin non trouvée");
                    }
                    
                    console.log("Zone de plugin trouvée:", pluginZone);
                    
                    // Mettre à jour l'entrée originale pour cette zone à chaque exécution
                    pluginZone.setAttribute('data-original-input', textToProcess);
                    console.log("Entrée mise à jour pour la zone:", textToProcess);
                    
                    // Supprimer tout résultat précédent associé à ce plugin
                    const existingResult = 
document.getElementById(`result-for-${button.dataset.pluginZoneId}`);
                    if (existingResult) {
                        existingResult.remove();
                    }
                    
                    // Créer une zone de résultat pour ce plugin
                    const resultZoneId = `result-for-${button.dataset.pluginZoneId}`;
                    resultContainer = document.createElement('div');
                    resultContainer.id = resultZoneId;
                    resultContainer.className = 'bg-gray-800 rounded-lg p-4 mb-4 mt-4';
                    resultContainer.innerHTML = `
                        <h2 class="text-lg font-semibold text-gray-100 mb-3">Résultat du plugin ${pluginName}</h2>
                        <div id="${resultZoneId}-text" class="w-full min-h-[100px] bg-gray-700 text-gray-200 p-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 space-y-3 overflow-auto">
                            <div class="animate-pulse">
                                <div class="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                                <div class="h-4 bg-gray-700 rounded w-1/2"></div>
                            </div>
                        </div>
                    `;
                    
                    // Insérer la zone de résultat après la zone du plugin
                    pluginZone.parentNode.insertBefore(resultContainer, pluginZone.nextSibling);
                    resultTextContainer = document.getElementById(`${resultZoneId}-text`);
                    
                    console.log("Zone de résultat créée:", resultContainer);
                } else {
                    // Cas du premier plugin (utiliser la zone de résultat existante)
                    this.pluginResultTarget.classList.remove('hidden');
                    this.pluginResultTextTarget.value = ''; // Vider le textarea
                    resultContainer = this.pluginResultTarget;
                    resultTextContainer = this.pluginResultTextTarget;
                    
                    console.log("Utilisation de la zone de résultat par défaut");
                }
                
                // Afficher un indicateur de chargement
                if (resultTextContainer) {
                    if (resultTextContainer.tagName === 'TEXTAREA') {
                        resultTextContainer.value = 'Chargement...';
                    } else {
                        resultTextContainer.innerHTML = '<div class="animate-pulse"><div class="h-4 bg-gray-700 rounded w-3/4 mb-2"></div><div class="h-4 bg-gray-700 rounded w-1/2"></div></div>';
                    }
                }
                
                // Collecter tous les paramètres du plugin
                const pluginInputs = {};
                
                // IMPORTANT: Utiliser le texte à traiter qui a été normalisé
                pluginInputs.text = textToProcess;
                console.log("Texte utilisé pour les paramètres du plugin:", textToProcess);
                
                // Mode par défaut
                pluginInputs.mode = 'decode';
                
                // Récupérer tous les champs de formulaire du plugin s'ils existent
                if (pluginZone) {
                    // Récupérer tous les inputs, selects et checkboxes
                    const inputs = pluginZone.querySelectorAll('input, select');
                    
                    inputs.forEach(input => {
                        const inputName = input.name || input.id;
                        
                        if (!inputName) return; // Ignorer les éléments sans nom
                        
                        // IMPORTANT: Ne pas écraser le texte d'entrée
                        if (inputName === 'text') {
                            console.log("Champ 'text' trouvé dans le formulaire, ignoré pour ne pas écraser l'entrée");
                            return;
                        }
                        
                        // Traiter différemment selon le type d'input
                        if (input.type === 'checkbox' || input.type === 'radio') {
                            pluginInputs[inputName] = input.checked;
                        } else if (input.type === 'number') {
                            pluginInputs[inputName] = parseFloat(input.value);
                        } else {
                            pluginInputs[inputName] = input.value;
                        }
                    });
                }
                
                // Option brute-force si disponible
                const bruteForceCheckbox = pluginZone ? pluginZone.querySelector('#brute_force') : null;
                if (bruteForceCheckbox) {
                    pluginInputs.brute_force = bruteForceCheckbox.checked;
                }
                
                console.log("Paramètres collectés pour l'exécution du plugin:", pluginInputs);
                
                // Vérification finale pour s'assurer que le texte est bien défini
                if (pluginInputs.text !== textToProcess) {
                    console.error("ANOMALIE: Le texte dans les paramètres a été modifié, correction...");
                    pluginInputs.text = textToProcess;
                }
                
                // Appeler l'API pour exécuter le plugin
                const response = await fetch(`/api/plugins/${pluginName}/execute`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(pluginInputs),
                });
                
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                
                const data = await response.json();
                console.log("Réponse du plugin:", data);
                
                // Extraire le résultat du plugin en fonction de la structure de la réponse
                let resultText = '';
                let resultHtml = '';
                let coordinates = null;
                
                // Vérifier si nous avons le nouveau format standardisé avec un tableau results
                if (data.results && Array.isArray(data.results) && data.results.length > 0) {
                    console.log("Format standardisé détecté avec tableau results");
                    
                    // Entête avec le résumé si disponible
                    if (data.summary) {
                        resultHtml += `
                            <div class="bg-gray-700 rounded-lg p-4 mb-3">
                                <h3 class="text-md font-medium text-blue-400 mb-2">Résumé</h3>
                                <div class="bg-gray-800 p-3 rounded">
                                    <p class="text-gray-300">${data.summary.message || `${data.summary.total_results} résultat(s)`}</p>
                                    ${data.plugin_info ? `<p class="text-gray-400 text-xs mt-1">Temps d'exécution: ${data.plugin_info.execution_time || 0} ms</p>` : ''}
                                </div>
                            </div>`;
                    }
                    
                    // Traiter chaque résultat
                    data.results.forEach((result, index) => {
                        const isBest = data.summary && data.summary.best_result_id === result.id;
                        
                        // Classe de couleur basée sur le niveau de confiance
                        const confidenceColor = this.getConfidenceColor(result.confidence);
                        
                        resultHtml += `
                            <div class="bg-gray-700 rounded-lg p-3 mb-3 ${isBest ? 'border border-blue-500' : ''}">
                                <div class="flex justify-between items-start mb-2">
                                    <h4 class="text-md font-medium ${isBest ? 'text-blue-400' : 'text-gray-300'}">
                                        Résultat ${index + 1} ${isBest ? '(Meilleur résultat)' : ''}
                                    </h4>
                                    <div class="bg-gray-900 px-2 py-1 rounded text-xs">
                                        Confiance: <span class="font-bold ${confidenceColor}">${Math.round((result.confidence || 0) * 100)}%</span>
                                    </div>
                                </div>
                                
                                <div class="bg-gray-800 p-3 rounded mb-2">
                                    <div class="text-sm text-gray-300 whitespace-pre-wrap">${result.text_output || ''}</div>
                                </div>`;
                        
                        // Afficher les paramètres utilisés si présents
                        if (result.parameters && Object.keys(result.parameters).length > 0) {
                            resultHtml += `
                                <div class="mt-2 p-2 bg-gray-800 rounded">
                                    <h5 class="text-xs font-medium text-gray-400 mb-1">Paramètres utilisés:</h5>
                                    <div class="text-xs text-gray-300 grid grid-cols-2 gap-1">
                                        ${Object.entries(result.parameters).map(([key, value]) => 
                                            `<div><span class="text-gray-500">${key}:</span> ${value}</div>`
                                        ).join('')}
                                    </div>
                                </div>`;
                        }
                        
                        // Afficher les coordonnées GPS si présentes
                        if (result.coordinates && result.coordinates.exist) {
                            coordinates = result.coordinates;
                            resultHtml += `
                                <div class="mt-2 p-2 bg-gray-800 rounded">
                                    <h5 class="text-xs font-medium text-gray-400 mb-1">Coordonnées GPS:</h5>
                                    <div class="text-xs text-gray-300">
                                        <div class="mb-1"><span class="text-gray-500">Format DDM:</span> ${result.coordinates.ddm || ''}</div>
                                        <div class="grid grid-cols-2 gap-1">
                                            <div><span class="text-gray-500">Latitude:</span> ${result.coordinates.ddm_lat || ''}</div>
                                            <div><span class="text-gray-500">Longitude:</span> ${result.coordinates.ddm_lon || ''}</div>
                                        </div>
                                    </div>
                                </div>`;
                        }
                        
                        resultHtml += `</div>`;
                        
                        // Conserver le texte du meilleur résultat pour la chaîne de plugins
                        if (isBest) {
                            resultText = result.text_output || '';
                        }
                    });
                    
                    // Si aucun meilleur résultat n'a été défini, prendre le premier
                    if (!resultText && data.results.length > 0) {
                        resultText = data.results[0].text_output || '';
                    }
                    
                } else {
                    // Ancien format - maintenir la rétrocompatibilité
                    console.log("Format ancien détecté, utilisation de la rétrocompatibilité");
                    
                    // Cas 1: Réponse avec text_output
                    if (data.text_output) {
                        resultText = data.text_output;
                        console.log("Cas 1: text_output trouvé:", resultText);
                    }
                    // Cas 2: Réponse avec result.text.text_output
                    else if (data.result && data.result.text && data.result.text.text_output) {
                        resultText = data.result.text.text_output;
                        console.log("Cas 2: result.text.text_output trouvé:", resultText);
                    }
                    // Cas 3: Réponse avec output
                    else if (data.output) {
                        resultText = data.output;
                        console.log("Cas 3: output trouvé:", resultText);
                    }
                    // Cas 4: Réponse avec result direct
                    else if (data.result) {
                        resultText = typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2);
                        console.log("Cas 4: result direct trouvé:", resultText);
                    }
                    // Cas 5: Réponse est une chaîne de caractères
                    else if (typeof data === 'string') {
                        resultText = data;
                        console.log("Cas 5: réponse est une chaîne:", resultText);
                    }
                    // Cas par défaut: Afficher la réponse complète
                    else {
                        resultText = JSON.stringify(data, null, 2);
                        console.log("Cas par défaut: affichage de la réponse complète");
                    }
                    
                    // Vérifier si des coordonnées sont présentes dans l'ancien format
                    if (data.coordinates && data.coordinates.exist) {
                        coordinates = data.coordinates;
                    } else if (data.result && data.result.coordinates && data.result.coordinates.exist) {
                        coordinates = data.result.coordinates;
                    }
                    
                    // Générer HTML pour l'affichage simple
                    resultHtml = `
                        <div class="bg-gray-900 rounded-lg p-3 border border-gray-700 mb-3">
                            <div class="text-sm text-gray-300 whitespace-pre-wrap">${resultText}</div>
                        </div>`;
                        
                    // Ajouter les coordonnées si présentes
                    if (coordinates) {
                        resultHtml += `
                            <div class="bg-gray-900 rounded-lg p-3 border border-gray-700 mb-3">
                                <h4 class="text-md font-medium text-green-400 mb-2">Coordonnées GPS détectées</h4>
                                <div class="text-sm text-gray-300">
                                    <div class="mb-1">Format DDM: ${coordinates.ddm || ''}</div>
                                    <div class="grid grid-cols-2 gap-1">
                                        <div>Latitude: ${coordinates.ddm_lat || ''}</div>
                                        <div>Longitude: ${coordinates.ddm_lon || ''}</div>
                                    </div>
                                </div>
                            </div>`;
                    }
                }
                
                // Si le résultat est vide, afficher un message
                if (!resultText) {
                    resultText = 'Aucun résultat';
                    console.log("Résultat vide, affichage du message par défaut");
                }
                
                console.log("Résultat final à afficher:", resultText);
                
                // Afficher le résultat dans un conteneur formaté
                if (resultTextContainer) {
                    if (resultTextContainer.tagName === 'TEXTAREA') {
                        // Pour les textareas, on utilise simplement le texte
                        resultTextContainer.value = resultText;
                    } else {
                        // Pour les éléments HTML, on utilise l'affichage riche
                        resultTextContainer.innerHTML = resultHtml;
                    }
                    console.log("Résultat affiché dans le conteneur");
                    
                    // Ajouter un écouteur d'événement pour mettre à jour lastPluginOutputValue lorsque le texte est modifié
                    if (resultTextContainer.tagName === 'TEXTAREA') {
                        resultTextContainer.addEventListener('input', (e) => {
                            this.lastPluginOutputValue = e.target.value;
                            console.log("Valeur mise à jour après modification:", this.lastPluginOutputValue);
                        });
                    }
                } else {
                    console.error("Le conteneur de résultat n'existe pas!");
                }
                
                // Rendre visible le conteneur de résultat s'il est masqué
                if (resultContainer) {
                    resultContainer.classList.remove('hidden');
                    console.log("Conteneur de résultat rendu visible");
                } else {
                    console.error("Le conteneur de résultat n'existe pas!");
                }
                
                // Stocker le résultat pour le prochain plugin (uniquement si ce n'est pas une réexécution)
                if (!isReexecution) {
                    this.lastPluginOutputValue = resultText;
                }
                
                // Détecter le format spécifique avec espaces entre chiffres pour les coordonnées GPS
                if (!coordinates) {
                    // Expression régulière pour détecter le format "N 4 9 1 2 1 2 3 E 0 0 6 1 2 1 2 3"
                    const spacedFormatRegex = /([NS])\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+([EW])\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)/i;
                    const match = resultText.match(spacedFormatRegex);
                    
                    if (match) {
                        console.log("Format de coordonnées avec espaces détecté:", match[0]);
                        
                        // Assembler les chiffres séparés pour obtenir le format compact
                        const latDir = match[1];
                        const latDigits = match[2] + match[3] + match[4] + match[5] + match[6] + match[7] + match[8];
                        const lonDir = match[9];
                        const lonDigits = match[10] + match[11] + match[12] + match[13] + match[14] + match[15] + match[16];
                        
                        console.log(`Format compact: ${latDir}${latDigits}${lonDir}${lonDigits}`);
                        
                        // Convertir au format DDM
                        try {
                            // Extraire composants de latitude
                            const latDeg = latDigits.substring(0, 2);
                            const latMin = latDigits.substring(2, 4);
                            const latDec = latDigits.substring(4);
                            
                            // Extraire composants de longitude
                            // Pour la longitude, préfixer avec des 0 pour avoir 3 chiffres pour les degrés
                            const paddedLonDigits = lonDigits.padStart(8, '0');
                            const lonDeg = paddedLonDigits.substring(0, 3);
                            const lonMin = paddedLonDigits.substring(3, 5);
                            const lonDec = paddedLonDigits.substring(5);
                            
                            // Formater en DDM
                            const ddmLat = `${latDir} ${latDeg}° ${latMin}.${latDec}'`;
                            const ddmLon = `${lonDir} ${lonDeg}° ${lonMin}.${lonDec}'`;
                            const ddm = `${ddmLat} ${ddmLon}`;
                            
                            console.log(`Coordonnées converties: ${ddm}`);
                            
                            // Créer l'objet de coordonnées
                            const convertedCoords = {
                                exist: true,
                                ddm_lat: ddmLat,
                                ddm_lon: ddmLon,
                                ddm: ddm,
                                decimal: {
                                    latitude: parseFloat(latDir === 'N' ? 1 : -1) * (parseFloat(latDeg) + parseFloat(`${latMin}.${latDec}`) / 60),
                                    longitude: parseFloat(lonDir === 'E' ? 1 : -1) * (parseFloat(lonDeg) + parseFloat(`${lonMin}.${lonDec}`) / 60)
                                },
                                patterns: [match[0]]
                            };
                            
                            // Au lieu d'afficher les coordonnées séparément, les inclure directement dans le HTML du résultat
                            if (resultTextContainer && resultTextContainer.tagName !== 'TEXTAREA') {
                                // Pour les conteneurs HTML, ajouter la section de coordonnées au HTML existant
                                const coordsHtml = `
                                    <div class="mt-3 p-3 bg-gray-800 rounded">
                                        <div class="flex items-center justify-between mb-2">
                                            <h4 class="text-sm font-medium text-blue-400">Coordonnées GPS détectées</h4>
                                            <span class="px-3 py-1 text-xs rounded-full bg-green-600">Format avec espaces</span>
                                        </div>
                                        <div class="grid grid-cols-1 gap-2">
                                            <div class="flex items-center">
                                                <span class="text-gray-400 text-sm w-20">Format DDM:</span>
                                                <span class="text-white font-medium">${ddm}</span>
                                            </div>
                                            <div class="grid grid-cols-2 gap-2">
                                                <div class="flex items-center">
                                                    <span class="text-gray-400 text-sm w-20">Latitude:</span>
                                                    <span class="text-white">${ddmLat}</span>
                                                </div>
                                                <div class="flex items-center">
                                                    <span class="text-gray-400 text-sm w-20">Longitude:</span>
                                                    <span class="text-white">${ddmLon}</span>
                                                </div>
                                            </div>
                                            <div class="mt-2 flex gap-2">
                                                <button type="button" 
                                                        class="text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded cursor-pointer copy-coords" 
                                                        data-coords="${ddm}"
                                                        onclick="navigator.clipboard.writeText('${ddm}')">
                                                    Copier
                                                </button>
                                                <button type="button" 
                                                        class="text-xs bg-purple-700 hover:bg-purple-600 text-white px-3 py-1 rounded cursor-pointer create-waypoint"
                                                        data-ddm="${ddm}" 
                                                        data-lat="${ddmLat}" 
                                                        data-lon="${ddmLon}"
                                                        data-action="click->geocache-solver#useCoordinates">
                                                    Utiliser coordonnées
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `;
                                
                                // Ajouter les coordonnées au HTML existant
                                resultTextContainer.innerHTML += coordsHtml;
                            }
                            
                            // Émettre également l'événement pour que d'autres composants puissent réagir
                            const event = new CustomEvent('coordinatesDetected', {
                                detail: convertedCoords,
                                bubbles: true
                            });
                            document.dispatchEvent(event);
                        } catch (error) {
                            console.error("Erreur lors de la conversion des coordonnées espacées:", error);
                        }
                    }
                }
                
                // Ajouter le résultat à l'historique des plugins
                this.pluginsHistoryValue.push({
                    pluginName: pluginName,
                    result: resultText
                });
                
                // Afficher l'historique des plugins
                this.displayPluginsHistory();
                
                // Ajouter un bouton pour appliquer un autre plugin sur ce résultat
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'flex flex-col md:flex-row justify-center gap-3 mt-4';
                buttonContainer.innerHTML = `
                    <button 
                        id="apply-new-plugin-btn"
                        class="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors"
                        data-action="click->geocache-solver#addNewPluginZone">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
                        </svg>
                        Appliquer un nouveau plugin
                    </button>
                `;
                
                if (resultContainer.querySelector('button#apply-new-plugin-btn')) {
                    resultContainer.querySelector('button#apply-new-plugin-btn').parentNode.remove();
                }
                resultContainer.appendChild(buttonContainer);
            } catch (error) {
                console.error('Erreur lors de l\'exécution du plugin:', error);
                if (resultTextContainer) {
                    if (resultTextContainer.tagName === 'TEXTAREA') {
                        resultTextContainer.value = `Erreur: ${error.message}`;
                    } else {
                        resultTextContainer.innerHTML = `
                            <div class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                                Erreur lors de l'exécution du plugin: ${error.message}
                            </div>
                        `;
                    }
                }
            }
        }
    }

    // Méthode pour afficher l'historique des plugins
    displayPluginsHistory() {
        if (this.hasPluginsResultsTarget) {
            const historyHtml = this.pluginsHistoryValue.map((entry, index) => {
                return `
                    <div class="bg-gray-900 rounded-lg p-3 border border-gray-700 mb-3">
                        <div class="text-sm text-gray-300 whitespace-pre-wrap">
                            <strong>Plugin ${index + 1} : ${entry.pluginName}</strong>
                            <br>
                            ${entry.result}
                        </div>
                    </div>
                `;
            }).join('');
            
            this.pluginsResultsTarget.innerHTML = historyHtml;
        }
    }
    
    // Fonction utilitaire pour obtenir la couleur selon le niveau de confiance
    getConfidenceColor(confidence) {
        if (!confidence) return 'text-gray-300';
        if (confidence >= 0.8) return 'text-green-400';
        if (confidence >= 0.5) return 'text-yellow-400';
        if (confidence >= 0.3) return 'text-orange-400';
        return 'text-red-400';
    }
} 