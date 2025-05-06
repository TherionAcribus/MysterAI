// Geocache Solver Controller
window.GeocacheSolverController = class extends Stimulus.Controller {
    static targets = [
        "loading", 
        "description", 
        "descriptionText", 
        "error", 
        "pluginsPanel", 
        "togglePluginsButton",
        "togglePluginsText",
        "pluginList",
        "pluginResult",
        "pluginResultText",
        "pluginInputText",
        "pluginsResults",
        "resultsContainer",
        "metaSolverPanel",
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
        
        // Ajouter un écouteur pour le changement de type de caractères autorisés
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
                            placeholder="Rechercher un plugin...2" 
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
                    const executeButton = pluginZone.querySelector('[data-action="click->geocache-solver#executePlugin"]');
                    if (executeButton) {
                        executeButton.setAttribute('data-plugin-zone-id', pluginZoneId);
                        console.log("Attribut data-plugin-zone-id ajouté au bouton d'exécution:", pluginZoneId);
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
                    const executeButton = this.pluginsPanelTarget.querySelector('[data-action="click->geocache-solver#executePlugin"]');
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
        // Récupérer l'ID et le nom du plugin
        const pluginId = event.currentTarget.dataset.pluginId;
        const pluginName = event.currentTarget.dataset.pluginName;
        const pluginZoneId = event.currentTarget.dataset.pluginZoneId;
        
        console.log("Exécution du plugin:", pluginName, "dans la zone:", pluginZoneId);
        
        // Si on a un plugin sélectionné
        if (pluginId && pluginName) {
            // Récupérer le texte à traiter
            let textToProcess = '';
            
            // Déterminer si le plugin est déjà exécuté dans cette zone (réexécution)
            const isReexecution = pluginZoneId && document.getElementById(`result-for-${pluginZoneId}`);
            
            // Trouver la source d'entrée actuelle - toujours prendre l'entrée la plus récente
            const pluginZone = pluginZoneId ? document.getElementById(pluginZoneId) : null;
            
            // Vérifier si une zone d'entrée de texte existe dans la zone du plugin
            const pluginInputTextarea = pluginZone ? 
                pluginZone.querySelector('textarea[data-plugin-input="true"]') : null;
            
            if (pluginInputTextarea) {
                // Utiliser le texte de la zone d'entrée du plugin (priorité absolue)
                textToProcess = pluginInputTextarea.value;
                console.log("Utilisation du texte saisi dans le plugin:", textToProcess);
            } else if (!this.lastPluginOutputValue || isReexecution) {
                // Si c'est la première exécution ou une réexécution sans zone d'entrée spécifique,
                // utiliser le texte de la description principale
                textToProcess = this.descriptionTextTarget.value;
                console.log("Utilisation du texte de la description principale:", textToProcess);
            } else {
                // Dans une chaîne de plugins, utiliser le résultat du plugin précédent
                textToProcess = this.lastPluginOutputValue;
                console.log("Utilisation du résultat du plugin précédent:", textToProcess);
            }
            
            // Normaliser le texte avant de l'envoyer au plugin
            textToProcess = this.normalizeText(textToProcess);
            
            try {
                // Créer ou récupérer la zone de résultat pour ce plugin
                let resultContainer;
                let resultTextContainer;
                
                if (pluginZoneId) {
                    // Cas d'un plugin dans une zone spécifique
                    if (!pluginZone) {
                        console.error("Zone de plugin non trouvée:", pluginZoneId);
                        throw new Error("Zone de plugin non trouvée");
                    }
                    
                    console.log("Zone de plugin trouvée:", pluginZone);
                    
                    // Mettre à jour l'entrée originale pour cette zone à chaque exécution
                    pluginZone.setAttribute('data-original-input', textToProcess);
                    console.log("Entrée mise à jour pour la zone:", textToProcess);
                    
                    // Supprimer tout résultat précédent associé à ce plugin
                    const existingResult = document.getElementById(`result-for-${pluginZoneId}`);
                    if (existingResult) {
                        existingResult.remove();
                    }
                    
                    // Créer une zone de résultat pour ce plugin
                    const resultZoneId = `result-for-${pluginZoneId}`;
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
                
                // Appeler l'API pour exécuter le plugin
                const response = await fetch(`/api/plugins/${pluginName}/execute`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: textToProcess,
                        mode: 'decode'
                    }),
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
    
    closePlugin() {
        // Réinitialiser le plugin sélectionné
        this.selectedPluginValue = '';
        
        // Recharger la liste des plugins
        this.loadPluginsList();
    }
    
    cancelPlugin() {
        // Réinitialiser l'état du plugin
        this.selectedPluginValue = '';
        this.lastPluginOutputValue = '';
        
        // Masquer le panneau des plugins
        this.pluginsPanelTarget.classList.add('hidden');
        this.togglePluginsButtonTarget.classList.remove('bg-purple-700');
        this.togglePluginsButtonTarget.classList.add('bg-purple-600');
        
        // Réinitialiser l'attribut data-loaded
        this.pluginsPanelTarget.removeAttribute('data-loaded');
        
        // Vider le contenu du panneau des plugins
        this.pluginsPanelTarget.innerHTML = '';
        
        // Masquer le résultat du plugin
        if (this.hasPluginResultTarget) {
            this.pluginResultTarget.classList.add('hidden');
            this.pluginResultTarget.innerHTML = '';
        }
        
        // Réinitialiser l'historique des plugins
        this.pluginsHistoryValue = [];
        this.displayPluginsHistory();
    }
    
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
    
    async addNewPluginZone() {
        console.log("addNewPluginZone appelé");
        
        try {
            // Créer une nouvelle zone de recherche de plugins
            const newPluginZoneId = `plugin-zone-${Date.now()}`;
            const newPluginZone = document.createElement('div');
            newPluginZone.id = newPluginZoneId;
            newPluginZone.className = 'bg-gray-800 rounded-lg p-4 mb-4 mt-4';
            newPluginZone.setAttribute('data-plugin-selection-zone', 'true');
            
            // Afficher un loader pendant le chargement
            newPluginZone.innerHTML = `
                <h2 class="text-lg font-semibold text-gray-100 mb-3">Appliquer un nouveau plugin</h2>
                <div class="animate-pulse">
                    <div class="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div class="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                    <div class="h-4 bg-gray-700 rounded w-2/3"></div>
                </div>
            `;
            
            // Ajouter la nouvelle zone à la fin du conteneur de résultats
            this.resultsContainerTarget.appendChild(newPluginZone);
            
            // Charger la liste des plugins dans cette nouvelle zone
            const response = await fetch('/api/plugins?context=solver');
            
            if (!response.ok) {
                throw new Error('Erreur lors du chargement des plugins');
            }
            
            const plugins = await response.json();
            
            // Générer le HTML pour la liste des plugins (similaire à loadPluginsList)
            let pluginsListHtml = `
                <h2 class="text-lg font-semibold text-gray-100 mb-3">Plugins disponibles</h2>
                
                <div class="mb-4">
                    <input 
                        type="text" 
                        placeholder="Rechercher un plugin...1" 
                        class="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded-md border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        data-action="input->geocache-solver#filterPlugins">
                </div>
                
                <div class="space-y-2 plugin-list">
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
                            data-plugin-zone-id="${newPluginZoneId}"
                            class="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-medium transition-colors">
                            Sélectionner
                        </button>
                    </div>
                `;
            });
            
            pluginsListHtml += `
                </div>
            `;
            
            // Mettre à jour le contenu de la nouvelle zone
            document.getElementById(newPluginZoneId).innerHTML = pluginsListHtml;
            
        } catch (error) {
            console.error('Erreur lors de l\'ajout d\'une nouvelle zone de plugin:', error);
        }
    }
    
    // Méthodes pour gérer le MetaSolver
    
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
            // Si le panneau MetaSolver est visible, le masquer
            console.log("Panneau MetaSolver visible, on le masque");
            this.metaSolverPanelTarget.classList.add('hidden');
            this.toggleMetaSolverButtonTarget.classList.remove('bg-blue-700');
            this.toggleMetaSolverButtonTarget.classList.add('bg-blue-600');
        }
    }
    
    async executeMetaSolver(event) {
        console.log("executeMetaSolver appelé");
        
        // Récupérer le mode depuis le bouton ou le select
        const mode = event.currentTarget.dataset.mode || document.getElementById('metasolver-mode').value;
        const strict = document.getElementById('metasolver-strict').value;
        const embedded = document.getElementById('metasolver-embedded').checked;
        const enableGpsDetection = document.getElementById('metasolver-gps-detection').checked;
        
        // Récupérer les informations sur les caractères autorisés
        const allowedCharsType = document.getElementById('metasolver-allowed-chars').value;
        let allowedChars = [];
        
        if (allowedCharsType === 'special') {
            allowedChars = ['°', '.', "'"];
        } else if (allowedCharsType === 'custom') {
            const customChars = document.getElementById('metasolver-custom-chars').value;
            if (customChars) {
                // Convertir la chaîne en tableau de caractères
                allowedChars = customChars.split('');
            }
        }
        
        // Récupérer le texte à analyser et le normaliser
        let text = this.descriptionTextTarget.value;
        text = this.normalizeText(text);
        
        if (!text.trim()) {
            alert("Veuillez entrer un texte à analyser");
            return;
        }
        
        try {
            // Afficher un indicateur de chargement
            const resultElement = document.getElementById('metasolver-result');
            const resultContentElement = document.getElementById('metasolver-result-content');
            
            resultElement.classList.remove('hidden');
            resultContentElement.innerHTML = `
                <div class="animate-pulse space-y-2">
                    <div class="h-4 bg-gray-600 rounded w-3/4"></div>
                    <div class="h-4 bg-gray-600 rounded w-1/2"></div>
                    <div class="h-4 bg-gray-600 rounded w-2/3"></div>
                </div>
            `;
            
            // Préparer les données pour l'API
            const formData = new FormData();
            formData.append('text', text);
            formData.append('mode', mode);
            formData.append('strict', strict);
            formData.append('embedded', embedded ? 'true' : 'false');
            formData.append('enable_gps_detection', enableGpsDetection ? 'true' : 'false');
            
            // Ajouter les caractères autorisés si nécessaire
            if (allowedCharsType !== 'all') {
                formData.append('allowed_chars', JSON.stringify(allowedChars));
            }
            
            console.log("Paramètres envoyés à l'API:", {
                text: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
                mode: mode,
                strict: strict,
                embedded: embedded,
                enable_gps_detection: enableGpsDetection,
                allowed_chars: allowedCharsType !== 'all' ? allowedChars : "all"
            });
            
            // Appeler l'API pour exécuter le MetaSolver
            const response = await fetch('/api/plugins/metadetection/execute', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const result = await response.json();
            console.log("Réponse brute de l'API MetaSolver:", result);
            console.log("Structure complète des résultats:", JSON.stringify(result, null, 2));
            console.log("Présence de 'results':", !!result.results);
            console.log("Type de 'results':", result.results ? typeof result.results : "non défini");
            console.log("Nombre d'éléments dans 'results':", result.results && Array.isArray(result.results) ? result.results.length : 0);
            console.log("Présence de 'combined_results':", !!result.combined_results);
            console.log("Présence de 'primary_coordinates':", !!result.primary_coordinates);
            
            // Formater et afficher les résultats
            resultContentElement.innerHTML = await this.formatMetaDetectionResults(result);
            
            // Ajouter à l'historique des plugins
            this.addToPluginsHistory({
                plugin: 'MetaSolver',
                action: mode === 'detect' ? 'Analyse' : 'Décodage',
                timestamp: new Date().toLocaleTimeString(),
                result: result
            });
            
        } catch (error) {
            console.error("Erreur lors de l'exécution du MetaSolver:", error);
            const resultElement = document.getElementById('metasolver-result');
            const resultContentElement = document.getElementById('metasolver-result-content');
            
            resultElement.classList.remove('hidden');
            resultContentElement.innerHTML = `
                <div class="bg-red-900 text-red-100 p-4 rounded-lg">
                    Erreur lors de l'exécution du MetaSolver: ${error.message}
                </div>
            `;
        }
    }
    
    async decodeWithPlugin(event) {
        const pluginName = event.currentTarget.dataset.plugin;
        const text = this.descriptionTextTarget.value;
        
        if (!text.trim()) {
            alert("Veuillez entrer un texte à décoder");
            return;
        }
        
        try {
            // Récupérer les options du MetaSolver
            const strict = document.getElementById('metasolver-strict').value;
            const embedded = document.getElementById('metasolver-embedded').checked;
            const enableGpsDetection = document.getElementById('metasolver-gps-detection').checked;
            
            // Récupérer les informations sur les caractères autorisés
            const allowedCharsType = document.getElementById('metasolver-allowed-chars').value;
            let allowedChars = [];
            
            if (allowedCharsType === 'special') {
                allowedChars = ['°', '.', "'"];
            } else if (allowedCharsType === 'custom') {
                const customChars = document.getElementById('metasolver-custom-chars').value;
                if (customChars) {
                    allowedChars = customChars.split('');
                }
            }
            
            // Afficher un indicateur de chargement
            const resultElement = document.getElementById('metasolver-result');
            const resultContentElement = document.getElementById('metasolver-result-content');
            
            resultElement.classList.remove('hidden');
            resultContentElement.innerHTML = `
                <div class="animate-pulse space-y-2">
                    <div class="h-4 bg-gray-600 rounded w-3/4"></div>
                    <div class="h-4 bg-gray-600 rounded w-1/2"></div>
                    <div class="h-4 bg-gray-600 rounded w-2/3"></div>
                </div>
            `;
            
            // Préparer les données pour l'API
            const formData = new FormData();
            formData.append('text', text);
            formData.append('mode', 'decode');
            formData.append('strict', strict);
            formData.append('embedded', embedded ? 'true' : 'false');
            formData.append('plugin_name', pluginName);
            formData.append('enable_gps_detection', enableGpsDetection ? 'true' : 'false');
            
            // Ajouter les caractères autorisés si nécessaire
            if (allowedCharsType !== 'all') {
                formData.append('allowed_chars', JSON.stringify(allowedChars));
            }
            
            console.log("decodeWithPlugin - Paramètres envoyés à l'API:", {
                text: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
                mode: "decode",
                strict: strict,
                embedded: embedded,
                plugin_name: pluginName,
                enable_gps_detection: enableGpsDetection,
                allowed_chars: allowedCharsType !== 'all' ? allowedChars : "all"
            });
            
            // Appeler l'API pour exécuter le MetaSolver avec le plugin spécifié
            const response = await fetch('/api/plugins/metadetection/execute', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const result = await response.json();
            console.log("decodeWithPlugin - Réponse brute de l'API MetaSolver:", result);
            console.log("decodeWithPlugin - Présence de 'results':", !!result.results);
            console.log("decodeWithPlugin - Type de 'results':", result.results ? typeof result.results : "non défini");
            console.log("decodeWithPlugin - Nombre d'éléments dans 'results':", result.results && Array.isArray(result.results) ? result.results.length : 0);
            
            // Afficher le résultat en utilisant la méthode de formatage
            resultContentElement.innerHTML = await this.formatMetaDetectionResults(result);
            
            // Ajouter à l'historique des plugins
            this.addToPluginsHistory({
                plugin: 'MetaSolver - ' + pluginName,
                action: 'Décodage',
                timestamp: new Date().toLocaleTimeString(),
                result: result
            });
            
        } catch (error) {
            console.error("Erreur lors du décodage:", error);
            const resultElement = document.getElementById('metasolver-result');
            const resultContentElement = document.getElementById('metasolver-result-content');
            
            resultElement.classList.remove('hidden');
            resultContentElement.innerHTML = `
                <div class="bg-red-900 text-red-100 p-4 rounded-lg">
                    Erreur lors du décodage: ${error.message}
                </div>
            `;
        }
    }
    
    async formatMetaDetectionResults(result) {
        console.log("formatMetaDetectionResults - Début du formatage des résultats");
        
        if (result.error) {
            console.log("formatMetaDetectionResults - Erreur détectée:", result.error);
            return `
                <div class="bg-red-900 text-red-100 p-4 rounded-lg">
                    ${result.error}
                </div>
            `;
        }
        
        // Vérifier si des coordonnées GPS ont été détectées dans primary_coordinates
        let gpsCoordinatesHtml = '';
        if (result.primary_coordinates) {
            console.log("formatMetaDetectionResults - Coordonnées primaires détectées:", result.primary_coordinates);
            // Stocker les coordonnées détectées pour une utilisation ultérieure
            this.lastDetectedCoordinatesValue = result.primary_coordinates;
            
            // Récupérer les coordonnées en format DDM si disponibles
            let ddmLat = "";
            let ddmLon = "";
            let ddmFull = "";
            
            // Parcourir les résultats combinés pour trouver les coordonnées DDM
            if (result.combined_results) {
                Object.entries(result.combined_results).forEach(([pluginName, pluginResult]) => {
                    if (pluginResult.coordinates && pluginResult.coordinates.exist) {
                        ddmLat = pluginResult.coordinates.ddm_lat || "";
                        ddmLon = pluginResult.coordinates.ddm_lon || "";
                        ddmFull = pluginResult.coordinates.ddm || "";
                    }
                });
            }
            
            // Utiliser les coordonnées décimales si on n'a pas trouvé de format DDM
            if (!ddmFull && result.primary_coordinates) {
                const lat = result.primary_coordinates.latitude;
                const lon = result.primary_coordinates.longitude;
                ddmFull = `${lat > 0 ? 'N' : 'S'} ${Math.abs(lat).toFixed(6)}°, ${lon > 0 ? 'E' : 'W'} ${Math.abs(lon).toFixed(6)}°`;
            }
            
            gpsCoordinatesHtml = `
                <div class="bg-gray-700 rounded-lg p-4 mt-4">
                    <h3 class="text-lg font-medium text-green-400 mb-2">Coordonnées GPS détectées</h3>
                    
                    <div class="bg-gray-800 p-4 rounded grid grid-cols-1 gap-4">
                        <div>
                            <label for="coords_ddm" class="block text-sm font-medium text-gray-400 mb-1">Coordonnées:</label>
                            <input type="text" id="coords_ddm" class="w-full bg-gray-800 text-green-300 border border-gray-700 focus:border-green-500 p-2 rounded font-mono"
                                   value="${ddmFull}" readonly>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label for="coords_lat" class="block text-sm font-medium text-gray-400 mb-1">Latitude:</label>
                                <input type="text" id="coords_lat" class="w-full bg-gray-800 text-green-300 border border-gray-700 focus:border-green-500 p-2 rounded font-mono"
                                       value="${ddmLat || result.primary_coordinates.latitude}" readonly>
                            </div>
                            <div>
                                <label for="coords_lon" class="block text-sm font-medium text-gray-400 mb-1">Longitude:</label>
                                <input type="text" id="coords_lon" class="w-full bg-gray-800 text-green-300 border border-gray-700 focus:border-green-500 p-2 rounded font-mono"
                                       value="${ddmLon || result.primary_coordinates.longitude}" readonly>
                            </div>
                        </div>
                        
                        <div class="mt-2">
                            <a href="https://www.google.com/maps?q=${result.primary_coordinates.latitude},${result.primary_coordinates.longitude}" 
                               target="_blank" 
                               class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm inline-flex items-center mr-2">
                               <i class="fas fa-map-marker-alt mr-1"></i> Google Maps
                            </a>
                            <button class="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md"
                                    onclick="navigator.clipboard.writeText('${ddmFull}').then(() => alert('Coordonnées copiées dans le presse-papier'))">
                                <i class="fas fa-copy mr-1"></i> Copier
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else if (result.coordinates && result.coordinates.exist) {
            console.log("formatMetaDetectionResults - Coordonnées anciennes détectées (format rétrocompatible)");
            // Ancien format pour rétrocompatibilité
            this.lastDetectedCoordinatesValue = result.coordinates;
            
            gpsCoordinatesHtml = `
                <div class="bg-gray-700 rounded-lg p-4 mt-4">
                    <h3 class="text-lg font-medium text-green-400 mb-2">Coordonnées GPS détectées</h3>
                    
                    <div class="bg-gray-800 p-4 rounded grid grid-cols-1 gap-4">
                        <div>
                            <label for="coords_ddm" class="block text-sm font-medium text-gray-400 mb-1">Format DDM:</label>
                            <input type="text" id="coords_ddm" class="w-full bg-gray-800 text-green-300 border border-gray-700 focus:border-green-500 p-2 rounded font-mono"
                                   value="${result.coordinates.ddm || ''}" readonly>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label for="coords_lat" class="block text-sm font-medium text-gray-400 mb-1">Latitude:</label>
                                <input type="text" id="coords_lat" class="w-full bg-gray-800 text-green-300 border border-gray-700 focus:border-green-500 p-2 rounded font-mono"
                                       value="${result.coordinates.ddm_lat || ''}" readonly>
                            </div>
                            <div>
                                <label for="coords_lon" class="block text-sm font-medium text-gray-400 mb-1">Longitude:</label>
                                <input type="text" id="coords_lon" class="w-full bg-gray-800 text-green-300 border border-gray-700 focus:border-green-500 p-2 rounded font-mono"
                                       value="${result.coordinates.ddm_lon || ''}" readonly>
                            </div>
                        </div>
                        
                        <div class="flex justify-between mt-2">
                            <button class="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                                    data-action="click->geocache-solver#useCoordinates">
                                Utiliser ces coordonnées
                            </button>
                            <button class="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md"
                                    onclick="navigator.clipboard.writeText('${result.coordinates.ddm}').then(() => alert('Coordonnées copiées dans le presse-papier'))">
                                Copier
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        // Vérifier si nous avons le nouveau format standardisé avec un tableau results
        if (result.results && Array.isArray(result.results) && result.results.length > 0) {
            console.log("formatMetaDetectionResults - Détecté format standardisé avec tableau results", result.results);
            let html = '';
            
            // Afficher le résumé si disponible
            if (result.summary) {
                console.log("formatMetaDetectionResults - Résumé disponible:", result.summary);
                html += `
                    <div class="bg-gray-700 rounded-lg p-4 mb-3">
                        <h3 class="text-md font-medium text-blue-400 mb-2">Résumé</h3>
                        <div class="bg-gray-800 p-3 rounded">
                            <p class="text-gray-300">${result.summary.message || `${result.summary.total_results} résultat(s)`}</p>
                            ${result.plugin_info ? `<p class="text-gray-400 text-xs mt-1">Temps d'exécution: ${result.plugin_info.execution_time || 0} ms</p>` : ''}
                        </div>
                    </div>`;
            }
            
            // Conteneur principal pour les résultats
            html += `
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-blue-400 mb-3">Résultats de l'analyse</h3>
                    <div class="space-y-3">
            `;
            
            // Traiter chaque résultat
            result.results.forEach((resultEntry, index) => {
                console.log("formatMetaDetectionResults - Traitement du résultat", index, resultEntry);
                const isBest = result.summary && result.summary.best_result_id === resultEntry.id;
                
                // Classe de couleur basée sur le niveau de confiance
                const confidenceColor = this.getConfidenceColor(resultEntry.confidence);
                const parameterPlugin = resultEntry.parameters?.plugin || "";
                
                // Déterminer si ce résultat peut être décodé
                const canDecode = resultEntry.metadata?.can_decode === true;
                const isDetectMode = resultEntry.parameters?.mode === "detect";
                const isNotMetadetection = !parameterPlugin.includes("metadetection");
                const showDecodeButton = isDetectMode && isNotMetadetection && canDecode;
                
                console.log(`Résultat ${index} - Plugin: ${parameterPlugin}, Mode: ${resultEntry.parameters?.mode}, CanDecode: ${canDecode}, ShowButton: ${showDecodeButton}`);
                
                html += `
                    <div class="bg-gray-600 p-3 rounded ${isBest ? 'border border-blue-500' : ''}">
                        <div class="flex justify-between items-center mb-2">
                            <div class="flex items-center">
                                <span class="text-gray-200 font-medium">${parameterPlugin}</span>
                                <div class="text-xs ${confidenceColor} ml-2">Confiance: ${Math.round((resultEntry.confidence || 0) * 100)}%</div>
                            </div>
                            ${showDecodeButton ? 
                                `<button 
                                    data-action="click->geocache-solver#decodeWithPlugin" 
                                    data-plugin="${parameterPlugin}" 
                                    class="bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-3 rounded">
                                    Décoder
                                </button>` : ''}
                        </div>
                        <div class="text-sm text-gray-300 whitespace-pre-wrap">${resultEntry.text_output || ''}</div>
                        
                        ${resultEntry.metadata?.fragments?.length > 0 ? 
                            `<div class="mt-2 text-xs text-gray-400">
                                Fragments: ${resultEntry.metadata.fragments.join(', ')}
                             </div>` : ''}
                    </div>`;
            });
            
            html += `</div></div>`;
            console.log("formatMetaDetectionResults - HTML généré pour le format standardisé (longueur):", html.length);
            return html + gpsCoordinatesHtml;
        }
        // Afficher les résultats des plugins combinés (nouveau format)
        else if (result.combined_results && Object.keys(result.combined_results).length > 0) {
            console.log("formatMetaDetectionResults - Utilisation du format combined_results", Object.keys(result.combined_results));
            let html = `
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-blue-400 mb-3">Résultats de l'analyse</h3>
                    <div class="space-y-3">
            `;
            
            // Parcourir tous les résultats combinés
            Object.entries(result.combined_results).forEach(([pluginName, pluginResult]) => {
                console.log("formatMetaDetectionResults - Plugin résultat:", pluginName, pluginResult);
                let resultText = "";
                let confidenceText = "";
                
                // Extraire le texte décodé s'il existe
                if (pluginResult.decoded_text) {
                    resultText = pluginResult.decoded_text;
                }
                
                // Ajouter l'indicateur de confiance si disponible
                if (pluginResult.confidence !== undefined) {
                    const confidence = pluginResult.confidence;
                    const confidenceColor = this.getConfidenceColor(confidence);
                    confidenceText = `<div class="text-xs ${confidenceColor} font-medium">Confiance: ${Math.round(confidence * 100)}%</div>`;
                }
                
                html += `
                    <div class="bg-gray-600 p-3 rounded">
                        <div class="flex justify-between items-center">
                            <span class="text-gray-200 font-medium">${pluginName}</span>
                            ${confidenceText}
                        </div>
                        <div class="text-gray-200 mt-1">${resultText}</div>
                    </div>
                `;
            });
            
            html += `</div></div>`;
            console.log("formatMetaDetectionResults - HTML généré pour le format combined_results (longueur):", html.length);
            return html + gpsCoordinatesHtml;
        }
        // Gérer l'ancien format (mode détection)
        else if (result.result && result.result.possible_codes && result.result.possible_codes.length > 0) {
            console.log("formatMetaDetectionResults - Utilisation du format possible_codes ancien", result.result.possible_codes);
            const codes = result.result.possible_codes;
            let html = `
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-blue-400 mb-3">Codes détectés</h3>
                    <div class="space-y-3">
            `;
            
            for (const code of codes) {
                const fragments = code.fragments || [];
                const fragmentsText = fragments.map(f => f.value).join(', ');
                
                // Ajouter l'indicateur de confiance si disponible
                let confidenceText = "";
                if (code.confidence !== undefined) {
                    const confidence = code.confidence;
                    const confidenceColor = this.getConfidenceColor(confidence);
                    confidenceText = `<div class="text-xs ${confidenceColor} ml-2">Confiance: ${Math.round(confidence * 100)}%</div>`;
                }
                
                html += `
                    <div class="bg-gray-600 p-3 rounded">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center">
                                <span class="text-gray-200 font-medium">${code.plugin_name}</span>
                                ${confidenceText}
                            </div>
                            ${code.can_decode ? `<button 
                                data-action="click->geocache-solver#decodeWithPlugin" 
                                data-plugin="${code.plugin_name}" 
                                class="bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-3 rounded">
                                Décoder
                            </button>` : ''}
                        </div>
                        <div class="text-sm text-gray-400 mt-1">${fragments.length} fragment(s): ${fragmentsText}</div>
                    </div>
                `;
            }
            
            html += `</div></div>`;
            console.log("formatMetaDetectionResults - HTML généré pour le format possible_codes (longueur):", html.length);
            return html + gpsCoordinatesHtml;
        }
        // Gérer l'ancien format (décodage spécifique)
        else if (result.result && result.result.decoded_results && result.result.decoded_results.length > 0) {
            console.log("formatMetaDetectionResults - Utilisation du format decoded_results ancien", result.result.decoded_results);
            const decodedResults = result.result.decoded_results;
            let html = `
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-blue-400 mb-3">Résultats du décodage</h3>
                    <div class="space-y-3">
            `;
            
            for (const decoded of decodedResults) {
                // Ajouter l'indicateur de confiance si disponible
                let confidenceText = "";
                if (decoded.confidence !== undefined) {
                    const confidence = decoded.confidence;
                    const confidenceColor = this.getConfidenceColor(confidence);
                    confidenceText = `<div class="text-xs ${confidenceColor} ml-2">Confiance: ${Math.round(confidence * 100)}%</div>`;
                }
                
                html += `
                    <div class="bg-gray-600 p-3 rounded">
                        <div class="flex items-center">
                            <div class="text-gray-300 font-medium">${decoded.plugin_name}</div>
                            ${confidenceText}
                        </div>
                        <div class="text-gray-200 mt-1">${decoded.decoded_text}</div>
                    </div>
                `;
            }
            
            html += `</div></div>`;
            console.log("formatMetaDetectionResults - HTML généré pour le format decoded_results (longueur):", html.length);
            return html + gpsCoordinatesHtml;
        } 
        // Gérer l'ancien format (décodage simple)
        else if (result.result && result.result.decoded_text) {
            console.log("formatMetaDetectionResults - Utilisation du format decoded_text ancien", result.result.decoded_text);
            return `
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-blue-400 mb-3">Résultat du décodage</h3>
                    <div class="text-gray-200">${result.result.decoded_text}</div>
                    ${gpsCoordinatesHtml}
                </div>
            `;
        } else {
            console.log("formatMetaDetectionResults - Aucun format reconnu, affichage du message par défaut", result);
            return `
                <div class="bg-gray-700 p-4 rounded-lg">
                    <div class="text-gray-400">Aucun code détecté dans le texte.</div>
                    ${gpsCoordinatesHtml}
                </div>
            `;
        }
    }
    
    addToPluginsHistory(entry) {
        this.pluginsHistoryValue.push(entry);
        this.displayPluginsHistory();
    }

    // Fonction utilitaire pour obtenir la couleur selon le niveau de confiance
    getConfidenceColor(confidence) {
        if (!confidence) return 'text-gray-300';
        if (confidence >= 0.8) return 'text-green-400';
        if (confidence >= 0.5) return 'text-yellow-400';
        if (confidence >= 0.3) return 'text-orange-400';
        return 'text-red-400';
    }

    // Méthode pour utiliser les coordonnées détectées
    useCoordinates(event) {
        event.preventDefault();
        
        if (!this.lastDetectedCoordinatesValue) {
            alert("Aucune coordonnée GPS détectée.");
            return;
        }
        
        const coords = this.lastDetectedCoordinatesValue;
        
        // Si nous sommes dans le contexte d'une géocache
        if (this.geocacheIdValue) {
            if (confirm("Voulez-vous utiliser ces coordonnées comme coordonnées corrigées pour cette géocache?")) {
                this.saveCoordinatesToGeocache(coords);
            }
        } else {
            // Sinon, proposer de copier les coordonnées ou de les ouvrir dans une carte
            const action = prompt(
                "Que souhaitez-vous faire avec ces coordonnées?\n" +
                "1: Copier dans le presse-papier\n" +
                "2: Ouvrir dans Google Maps\n" +
                "3: Ouvrir dans OpenStreetMap",
                "1"
            );
            
            switch (action) {
                case "1":
                    navigator.clipboard.writeText(coords.ddm)
                        .then(() => alert("Coordonnées copiées dans le presse-papier"))
                        .catch(err => alert("Erreur lors de la copie: " + err));
                    break;
                case "2":
                    // Extraire les valeurs numériques pour Google Maps
                    this.openInGoogleMaps(coords);
                    break;
                case "3":
                    // Extraire les valeurs numériques pour OpenStreetMap
                    this.openInOpenStreetMap(coords);
                    break;
                default:
                    alert("Action annulée ou non reconnue.");
            }
        }
    }
    
    // Méthode pour sauvegarder les coordonnées dans une géocache
    async saveCoordinatesToGeocache(coords) {
        try {
            const response = await fetch(`/api/geocaches/save/${this.geocacheIdValue}/coordinates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    gc_lat: coords.ddm_lat,
                    gc_lon: coords.ddm_lon
                })
            });
            
            if (response.ok) {
                alert("Coordonnées enregistrées avec succès!");
                // Déclencher un événement pour mettre à jour l'affichage des coordonnées
                document.dispatchEvent(new CustomEvent('coordinatesUpdated'));
            } else {
                const error = await response.json();
                alert(`Erreur lors de l'enregistrement des coordonnées: ${error.message || 'Erreur inconnue'}`);
            }
        } catch (error) {
            console.error("Erreur lors de l'enregistrement des coordonnées:", error);
            alert(`Erreur lors de l'enregistrement des coordonnées: ${error.message || 'Erreur inconnue'}`);
        }
    }
    
    // Méthode pour ouvrir les coordonnées dans Google Maps
    openInGoogleMaps(coords) {
        // Extraire les valeurs numériques des coordonnées
        const lat = this.extractNumericCoordinate(coords.ddm_lat);
        const lon = this.extractNumericCoordinate(coords.ddm_lon);
        
        if (lat && lon) {
            const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
            window.open(url, '_blank');
        } else {
            alert("Impossible d'extraire les valeurs numériques des coordonnées.");
        }
    }
    
    // Méthode pour ouvrir les coordonnées dans OpenStreetMap
    openInOpenStreetMap(coords) {
        // Extraire les valeurs numériques des coordonnées
        const lat = this.extractNumericCoordinate(coords.ddm_lat);
        const lon = this.extractNumericCoordinate(coords.ddm_lon);
        
        if (lat && lon) {
            const url = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=15`;
            window.open(url, '_blank');
        } else {
            alert("Impossible d'extraire les valeurs numériques des coordonnées.");
        }
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
}
