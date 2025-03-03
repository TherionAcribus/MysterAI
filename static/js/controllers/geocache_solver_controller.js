// Geocache Solver Controller
window.GeocacheSolverController = class extends Stimulus.Controller {
    static targets = [
        "loading", 
        "description", 
        "descriptionText", 
        "error", 
        "pluginsPanel", 
        "togglePluginsButton",
        "pluginList",
        "pluginResult",
        "pluginResultText",
        "pluginInputText",
        "pluginsResults",
        "resultsContainer"
    ]
    
    static values = {
        geocacheId: String,
        gcCode: String,
        selectedPlugin: String,
        lastPluginOutput: String,
        pluginsHistory: Array
    }

    connect() {
        console.log("Solver controller connected", {
            geocacheId: this.geocacheIdValue,
            gcCode: this.gcCodeValue
        });
        
        // Initialiser l'historique des plugins
        this.pluginsHistoryValue = [];
        
        this.loadGeocacheData();
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
    
    async executePlugin(event) {
        // Récupérer l'ID et le nom du plugin
        const pluginId = event.currentTarget.dataset.pluginId;
        const pluginName = event.currentTarget.dataset.pluginName;
        const useDescription = event.currentTarget.hasAttribute('data-use-description');
        const pluginZoneId = event.currentTarget.dataset.pluginZoneId;
        
        console.log("Exécution du plugin:", pluginName, "dans la zone:", pluginZoneId);
        
        // Si on a un plugin sélectionné
        if (pluginId && pluginName) {
            // Récupérer le texte à traiter (soit le résultat du plugin précédent, soit le texte de la description)
            let textToProcess = '';
            
            if (useDescription || !this.lastPluginOutputValue) {
                // Utiliser le texte de la description
                textToProcess = this.descriptionTextTarget.value;
                console.log("Utilisation du texte de la description:", textToProcess);
            } else {
                // Utiliser le résultat du plugin précédent
                textToProcess = this.lastPluginOutputValue;
                console.log("Utilisation du résultat du plugin précédent:", textToProcess);
            }
            
            try {
                // Créer ou récupérer la zone de résultat pour ce plugin
                let resultContainer;
                let resultTextContainer;
                
                if (pluginZoneId) {
                    // Cas d'un plugin dans une zone spécifique
                    const pluginZone = document.getElementById(pluginZoneId);
                    
                    if (!pluginZone) {
                        console.error("Zone de plugin non trouvée:", pluginZoneId);
                        throw new Error("Zone de plugin non trouvée");
                    }
                    
                    console.log("Zone de plugin trouvée:", pluginZone);
                    
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
                        <div id="${resultZoneId}-text" class="bg-gray-900 rounded-lg p-3 border border-gray-700 text-sm text-gray-300 whitespace-pre-wrap">
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
                    this.pluginResultTextTarget.innerHTML = '<div class="animate-pulse"><div class="h-4 bg-gray-700 rounded w-3/4 mb-2"></div><div class="h-4 bg-gray-700 rounded w-1/2"></div></div>';
                    resultContainer = this.pluginResultTarget;
                    resultTextContainer = this.pluginResultTextTarget;
                    
                    console.log("Utilisation de la zone de résultat par défaut");
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
                    resultText = data.result;
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
                
                // Si le résultat est vide, afficher un message
                if (!resultText) {
                    resultText = 'Aucun résultat';
                    console.log("Résultat vide, affichage du message par défaut");
                }
                
                console.log("Résultat final à afficher:", resultText);
                
                // Afficher le résultat dans un conteneur formaté
                if (resultTextContainer) {
                    resultTextContainer.innerHTML = `
                        <div class="bg-gray-900 rounded-lg p-3 border border-gray-700 mb-3">
                            <div class="text-sm text-gray-300 whitespace-pre-wrap">${resultText}</div>
                        </div>
                    `;
                    console.log("Résultat affiché dans le conteneur");
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
                
                // Stocker le résultat pour le prochain plugin
                this.lastPluginOutputValue = resultText;
                
                // Ajouter le résultat à l'historique des plugins
                this.pluginsHistoryValue.push({
                    pluginName: pluginName,
                    result: resultText
                });
                
                // Afficher l'historique des plugins
                this.displayPluginsHistory();
                
                // Ajouter un bouton pour appliquer un autre plugin sur ce résultat
                resultTextContainer.innerHTML += `
                    <div class="flex flex-col md:flex-row justify-center gap-3 mt-4">
                        <button 
                            id="apply-new-plugin-btn"
                            class="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors"
                            data-action="click->geocache-solver#addNewPluginZone">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
                            </svg>
                            Appliquer un nouveau plugin
                        </button>
                        <button 
                            id="use-description-btn"
                            class="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                            data-action="click->geocache-solver#addNewPluginZoneWithDescription">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" />
                            </svg>
                            Utiliser la description
                        </button>
                    </div>
                `;
                
            } catch (error) {
                console.error('Erreur lors de l\'exécution du plugin:', error);
                if (resultTextContainer) {
                    resultTextContainer.innerHTML = `<div class="text-red-400">Erreur: ${error.message}</div>`;
                } else if (this.hasPluginResultTextTarget) {
                    this.pluginResultTextTarget.innerHTML = `<div class="text-red-400">Erreur: ${error.message}</div>`;
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
                        placeholder="Rechercher un plugin..." 
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
    
    async addNewPluginZoneWithDescription() {
        console.log("addNewPluginZoneWithDescription appelé");
        
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
                        placeholder="Rechercher un plugin..." 
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
                            data-use-description
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
}
