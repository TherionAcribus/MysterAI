// Multi-Solver Controller
window.MultiSolverController = class extends Stimulus.Controller {
    static targets = [
        "geocachesList",
        "error",
        "pluginList",
        "pluginInterface",
        "pluginFields",
        "resultsTable"
    ]
    
    static values = {
        geocaches: Array,
        selectedPlugin: String,
        processedResults: Array
    }

    connect() {
        console.log("%c[MultiSolver] Controller connecté", "background:#222; color:lightgreen; font-weight:bold", {
            element: this.element,
            targets: {
                pluginList: this.hasPluginListTarget ? "présent" : "manquant",
                geocachesList: this.hasGeocachesListTarget ? "présent" : "manquant",
                error: this.hasErrorTarget ? "présent" : "manquant",
                resultsTable: this.hasResultsTableTarget ? "présent" : "manquant"
            }
        });
        
        // Vérification initiale des cibles
        if (!this.hasPluginListTarget) {
            console.error("%c[MultiSolver] ERREUR CRITIQUE: Cible pluginList manquante!", "background:red; color:white; font-weight:bold");
        }
        
        // Initialiser le tableau des résultats
        this.processedResultsValue = [];
        
        // Ajouter un écouteur pour le changement de type de caractères autorisés
        this.setupAllowedCharsListener();

        // Planifier le chargement des plugins avec un petit délai pour éviter les problèmes de timing
        console.log("%c[MultiSolver] Planification du chargement des plugins", "background:#222; color:lightgreen");
        setTimeout(() => {
            this.loadPluginsList();
        }, 100);

        // Vérifier si des géocaches ont été passées via l'URL
        this.loadGeocachesFromUrl();
        
        // Attacher un écouteur direct au bouton de rafraîchissement pour éviter les problèmes d'événements
        const reloadButton = document.getElementById('reload-plugins-button');
        if (reloadButton) {
            console.log("%c[MultiSolver] Configuration du bouton de rafraîchissement", "background:#222; color:lightgreen");
            reloadButton.addEventListener('click', () => {
                console.log("%c[MultiSolver] Clic direct sur bouton de rafraîchissement", "background:#222; color:lightgreen");
                this.reloadPlugins();
            });
        }
    }
    
    // Méthode pour configurer l'écouteur de changement de type de caractères autorisés
    setupAllowedCharsListener() {
        const allowedCharsSelect = document.getElementById('metasolver-allowed-chars');
        const customCharsContainer = document.getElementById('metasolver-custom-chars-container');
        
        if (allowedCharsSelect && customCharsContainer) {
            console.log("%c[MultiSolver] Configuration des écouteurs pour les caractères autorisés", "background:#222; color:lightgreen");
            
            allowedCharsSelect.addEventListener('change', (event) => {
                console.log("%c[MultiSolver] Changement de type de caractères", "background:#222; color:lightgreen", event.target.value);
                if (event.target.value === 'custom') {
                    customCharsContainer.classList.remove('hidden');
                } else {
                    customCharsContainer.classList.add('hidden');
                }
            });
        } else {
            console.warn("%c[MultiSolver] Éléments pour les caractères autorisés non trouvés", "background:#222; color:yellow");
        }
    }
    
    // Méthode pour charger les géocaches depuis l'URL
    loadGeocachesFromUrl() {
        // Vérifier si des géocaches ont été passées via l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const geocachesParam = urlParams.get('geocaches');
        
        if (geocachesParam) {
            try {
                // Décoder et parser les données des géocaches
                const geocaches = JSON.parse(decodeURIComponent(geocachesParam));
                this.geocachesValue = geocaches;
                console.log(`%c[MultiSolver] ${geocaches.length} géocaches chargées depuis l'URL`, "background:#222; color:lightgreen");
                this.displayGeocachesList();
            } catch (error) {
                console.error("%c[MultiSolver] Erreur lors du décodage des géocaches:", "background:red; color:white", error);
                this.showError("Erreur lors du décodage des paramètres des géocaches.");
            }
        } else {
            console.log("%c[MultiSolver] Aucune géocache spécifiée dans l'URL", "background:#222; color:lightgreen");
            this.geocachesValue = [];
            if (this.hasGeocachesListTarget) {
                this.geocachesListTarget.innerHTML = '<div class="text-gray-400">Aucune géocache sélectionnée</div>';
                this.showError("Aucune géocache spécifiée. Vous pouvez quand même utiliser les plugins mais aucun traitement ne sera appliqué.");
            }
        }
    }

    // Méthode pour afficher la liste des géocaches
    displayGeocachesList() {
        if (!this.hasGeocachesListTarget) {
            console.error("%c[MultiSolver] Cible geocachesList non trouvée lors de l'affichage", "background:red; color:white");
            return;
        }
        
        if (!this.geocachesValue || this.geocachesValue.length === 0) {
            this.geocachesListTarget.innerHTML = '<div class="text-gray-400">Aucune géocache sélectionnée</div>';
            return;
        }

        let html = '';
        this.geocachesValue.forEach((geocache, index) => {
            html += `
                <div class="geocache-item flex justify-between items-center p-2 bg-gray-700 rounded">
                    <div>
                        <div class="font-medium text-gray-200">${geocache.gc_code || 'Sans code'} - ${geocache.name || 'Géocache ' + (index + 1)}</div>
                        <div class="text-xs text-gray-400">ID: ${geocache.id}</div>
                    </div>
                    <button 
                        data-action="click->multi-solver#loadGeocacheDetails"
                        data-geocache-id="${geocache.id}"
                        class="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs">
                        Détails
                    </button>
                </div>
            `;
        });
        
        this.geocachesListTarget.innerHTML = html;
    }

    // Méthode pour charger les détails d'une géocache
    async loadGeocacheDetails(event) {
        const geocacheId = event.currentTarget.dataset.geocacheId;
        
        if (!geocacheId) return;
        
        // Envoyer un message au parent pour ouvrir les détails de la géocache
        window.parent.postMessage({
            type: 'openGeocacheDetails',
            geocacheId: geocacheId,
            gcCode: this.geocachesValue.find(g => g.id.toString() === geocacheId.toString())?.gc_code || '',
            name: this.geocachesValue.find(g => g.id.toString() === geocacheId.toString())?.name || ''
        }, '*');
    }

    // Méthode pour charger la liste des plugins
    async loadPluginsList() {
        console.log("%c[MultiSolver] loadPluginsList appelé", "background:#222; color:cyan; font-weight:bold");
        
        try {
            // Vérification critique de la cible
            if (!this.hasPluginListTarget) {
                console.error("%c[MultiSolver] ERREUR CRITIQUE: Cible pluginList non trouvée lors du chargement!", "background:red; color:white; font-weight:bold");
                
                // Tentative de récupération de l'élément par ID
                const pluginListElement = document.getElementById('plugin-list-container');
                if (pluginListElement) {
                    console.log("%c[MultiSolver] Élément plugin-list-container trouvé par ID, tentative d'utilisation directe", "background:orange; color:black");
                    this.loadPluginsDirectly(pluginListElement);
                    return;
                } else {
                    console.error("%c[MultiSolver] Élément plugin-list-container introuvable par ID", "background:red; color:white");
                    return;
                }
            }
            
            console.log("%c[MultiSolver] État actuel de la cible pluginList:", "background:#222; color:cyan", {
                "data-loaded": this.pluginListTarget.getAttribute('data-loaded'),
                "children": this.pluginListTarget.children.length,
                "id": this.pluginListTarget.id
            });
            
            // Vérifier si les plugins sont déjà chargés
            if (this.pluginListTarget.getAttribute('data-loaded') === 'true' && !this.forceReload) {
                console.log("%c[MultiSolver] Les plugins sont déjà chargés", "background:#222; color:cyan");
                const pluginItems = this.pluginListTarget.querySelectorAll('.plugin-item');
                console.log("%c[MultiSolver] Nombre d'éléments plugin trouvés:", "background:#222; color:cyan", pluginItems.length);
                
                if (pluginItems.length > 0) {
                    console.log("%c[MultiSolver] Plugins déjà chargés, sortie de la fonction", "background:#222; color:cyan");
                    return;
                }
            }
            
            // Si forceReload est true ou si les plugins ne sont pas chargés
            if (this.forceReload) {
                console.log("%c[MultiSolver] Forçage du rechargement des plugins", "background:#222; color:cyan");
                this.pluginListTarget.removeAttribute('data-loaded');
                this.forceReload = false;
            }
            
            // Afficher un loader pendant le chargement
            console.log("%c[MultiSolver] Affichage du loader", "background:#222; color:cyan");
            this.pluginListTarget.innerHTML = `
                <div class="animate-pulse">
                    <div class="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div class="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                    <div class="h-4 bg-gray-700 rounded w-2/3"></div>
                </div>
            `;
            
            // Appeler l'API pour récupérer la liste des plugins
            console.log("%c[MultiSolver] Appel de l'API plugins", "background:#222; color:cyan");
            const response = await fetch('/api/plugins?context=solver');
            
            if (!response.ok) {
                console.error("%c[MultiSolver] Erreur HTTP:", "background:red; color:white", response.status);
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const plugins = await response.json();
            console.log(`%c[MultiSolver] ${plugins.length} plugins récupérés depuis l'API`, "background:#222; color:cyan", plugins);
            
            // Créer un ID unique pour cette zone de plugins
            const mainPluginZoneId = `main-plugin-zone-${Date.now()}`;
            console.log("%c[MultiSolver] ID de zone de plugins créé:", "background:#222; color:cyan", mainPluginZoneId);
            
            // Créer l'interface pour la liste des plugins
            let pluginsListHtml = '';
            
            // Ajouter chaque plugin à la liste
            plugins.forEach((plugin, index) => {
                console.log(`%c[MultiSolver] Ajout du plugin ${index+1}/${plugins.length}: ${plugin.name}`, "background:#222; color:cyan");
                pluginsListHtml += `
                    <div class="plugin-item flex items-center justify-between p-2 rounded-md hover:bg-gray-700 transition-colors" data-plugin-name="${plugin.name.toLowerCase()}">
                        <div>
                            <div class="font-medium text-gray-200">${plugin.name}</div>
                            <div class="text-xs text-gray-400">${plugin.description || 'Aucune description'}</div>
                        </div>
                        <button 
                            onclick="window.activatePlugin('${plugin.id}', '${plugin.name}', '${mainPluginZoneId}')"
                            data-plugin-id="${plugin.id}"
                            data-plugin-name="${plugin.name}"
                            data-plugin-zone-id="${mainPluginZoneId}"
                            class="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-medium transition-colors">
                            Sélectionner
                        </button>
                    </div>
                `;
            });
            
            console.log("%c[MultiSolver] HTML généré pour les plugins, longueur:", "background:#222; color:cyan", pluginsListHtml.length);
            
            // Créer une fonction globale pour activer les plugins (pour contourner les problèmes d'événements Stimulus)
            window.activatePlugin = (pluginId, pluginName, zoneId) => {
                console.log("%c[MultiSolver] Activation de plugin via fonction globale:", "background:purple; color:white", {
                    pluginId, pluginName, zoneId
                });
                
                // Tenter de trouver le contrôleur et appeler selectPlugin
                const container = document.getElementById('multi-solver-container');
                if (container && window.Stimulus) {
                    const app = window.Stimulus.application;
                    const controller = app.getControllerForElementAndIdentifier(container, 'multi-solver');
                    
                    if (controller && typeof controller.selectPlugin === 'function') {
                        // Simuler un événement avec les données nécessaires
                        controller.selectPlugin({
                            currentTarget: {
                                dataset: {
                                    pluginId: pluginId,
                                    pluginName: pluginName,
                                    pluginZoneId: zoneId
                                }
                            }
                        });
                    } else {
                        console.error("%c[MultiSolver] Impossible d'appeler selectPlugin via le contrôleur", "background:red; color:white");
                        // Fallback: rediriger vers l'API directement
                        window.location.href = `/api/plugins/${pluginName}/interface?context=solver`;
                    }
                }
            };
            
            // Mettre à jour le contenu du panneau des plugins
            if (this.hasPluginListTarget) {
                this.pluginListTarget.innerHTML = pluginsListHtml;
                this.pluginListTarget.setAttribute('data-loaded', 'true');
                console.log("%c[MultiSolver] Plugins chargés avec succès dans la cible", "background:#222; color:cyan");
            } else {
                // Si la cible n'est pas disponible, utiliser getElementById comme fallback
                const pluginListElement = document.getElementById('plugin-list-container');
                if (pluginListElement) {
                    pluginListElement.innerHTML = pluginsListHtml;
                    pluginListElement.setAttribute('data-loaded', 'true');
                    console.log("%c[MultiSolver] Plugins chargés avec succès via getElementById", "background:#222; color:cyan");
                } else {
                    console.error("%c[MultiSolver] Impossible de trouver un élément pour afficher les plugins", "background:red; color:white");
                }
            }
            
        } catch (error) {
            console.error('%c[MultiSolver] Erreur lors du chargement des plugins:', "background:red; color:white", error);
            const errorHtml = `
                <div class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                    Erreur lors du chargement des plugins: ${error.message}
                </div>
            `;
            
            if (this.hasPluginListTarget) {
                this.pluginListTarget.innerHTML = errorHtml;
            } else {
                const pluginListElement = document.getElementById('plugin-list-container');
                if (pluginListElement) {
                    pluginListElement.innerHTML = errorHtml;
                }
            }
        }
    }
    
    // Méthode de secours pour charger les plugins directement dans un élément
    async loadPluginsDirectly(element) {
        try {
            // Afficher un loader pendant le chargement
            element.innerHTML = `
                <div class="animate-pulse">
                    <div class="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div class="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                    <div class="h-4 bg-gray-700 rounded w-2/3"></div>
                </div>
            `;
            
            // Appeler l'API pour récupérer la liste des plugins
            console.log("%c[MultiSolver] Appel direct de l'API plugins", "background:orange; color:black");
            const response = await fetch('/api/plugins?context=solver');
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const plugins = await response.json();
            console.log(`%c[MultiSolver] ${plugins.length} plugins récupérés en mode direct`, "background:orange; color:black");
            
            const mainPluginZoneId = `main-plugin-zone-${Date.now()}`;
            let pluginsListHtml = '';
            
            // Ajouter chaque plugin à la liste
            plugins.forEach((plugin) => {
                pluginsListHtml += `
                    <div class="plugin-item flex items-center justify-between p-2 rounded-md hover:bg-gray-700 transition-colors" data-plugin-name="${plugin.name.toLowerCase()}">
                        <div>
                            <div class="font-medium text-gray-200">${plugin.name}</div>
                            <div class="text-xs text-gray-400">${plugin.description || 'Aucune description'}</div>
                        </div>
                        <button 
                            onclick="window.activatePlugin('${plugin.id}', '${plugin.name}', '${mainPluginZoneId}')"
                            class="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-medium transition-colors">
                            Sélectionner
                        </button>
                    </div>
                `;
            });
            
            // Créer une fonction globale pour activer les plugins si elle n'existe pas déjà
            if (!window.activatePlugin) {
                window.activatePlugin = (pluginId, pluginName, zoneId) => {
                    console.log("%c[MultiSolver] Activation de plugin via fonction globale:", "background:purple; color:white", {
                        pluginId, pluginName, zoneId
                    });
                    window.location.href = `/api/plugins/${pluginName}/interface?context=solver`;
                };
            }
            
            // Mettre à jour le contenu
            element.innerHTML = pluginsListHtml;
            element.setAttribute('data-loaded', 'true');
        } catch (error) {
            console.error('%c[MultiSolver] Erreur lors du chargement direct des plugins:', "background:red; color:white", error);
            element.innerHTML = `
                <div class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                    Erreur lors du chargement des plugins: ${error.message}
                </div>
            `;
        }
    }

    // Méthode pour forcer le rechargement des plugins
    reloadPlugins() {
        console.log("%c[MultiSolver] reloadPlugins appelé", "background:#222; color:cyan; font-weight:bold");
        this.forceReload = true;
        this.loadPluginsList();
    }

    // Méthode pour filtrer les plugins
    filterPlugins(event) {
        const searchTerm = event.target.value.toLowerCase();
        console.log("%c[MultiSolver] Filtrage des plugins avec le terme:", "background:#222; color:cyan", searchTerm);
        
        // Vérifier si la cible est disponible
        if (!this.hasPluginListTarget) {
            console.error("%c[MultiSolver] Cible pluginList non trouvée lors du filtrage", "background:red; color:white");
            return;
        }
        
        // Filtrer les éléments de la liste
        const pluginItems = this.pluginListTarget.querySelectorAll('.plugin-item');
        console.log("%c[MultiSolver] Nombre d'éléments à filtrer:", "background:#222; color:cyan", pluginItems.length);
        
        pluginItems.forEach(item => {
            const pluginName = item.dataset.pluginName;
            if (pluginName && pluginName.includes(searchTerm)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // Méthode pour afficher un message d'erreur
    showError(message) {
        if (this.hasErrorTarget) {
            this.errorTarget.classList.remove('hidden');
            this.errorTarget.querySelector('div').textContent = message;
        } else {
            console.error("%c[MultiSolver] Message d'erreur non affiché (cible manquante):", "background:red; color:white", message);
        }
    }

    // Cacher le message d'erreur
    hideError() {
        if (this.hasErrorTarget) {
            this.errorTarget.classList.add('hidden');
        }
    }

    // Méthode pour exécuter le MetaSolver
    async executeMetaSolver(event) {
        const mode = event.currentTarget.dataset.mode || document.getElementById('metasolver-mode').value;
        const strict = document.getElementById('metasolver-strict').value;
        const embedded = document.getElementById('metasolver-embedded').checked;
        const enableGpsDetection = document.getElementById('metasolver-gps-detection').checked;
        const applyToAll = document.getElementById('metasolver-apply-to-all').checked;
        
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
        
        try {
            // Vérifier s'il y a des géocaches à traiter
            if (!this.geocachesValue || this.geocachesValue.length === 0) {
                this.showError("Aucune géocache à traiter.");
                return;
            }
            
            // Déterminer quelles géocaches traiter
            const geocachesToProcess = applyToAll 
                ? this.geocachesValue 
                : this.geocachesValue.filter(g => document.querySelector(`input[name="geocache-${g.id}"]:checked`));
            
            if (geocachesToProcess.length === 0) {
                this.showError("Aucune géocache sélectionnée pour le traitement.");
                return;
            }
            
            // Afficher un indicateur de chargement
            this.resultsTableTarget.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-4">
                        <div class="flex justify-center">
                            <div class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                        <div class="text-center text-gray-400 mt-2">Traitement en cours...</div>
                    </td>
                </tr>
            `;
            
            // Traiter chaque géocache
            const results = [];
            
            for (const geocache of geocachesToProcess) {
                try {
                    // Récupérer le texte de la géocache
                    const descriptionResponse = await fetch(`/geocaches/${geocache.id}/text`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    });
                    
                    if (!descriptionResponse.ok) {
                        throw new Error(`Erreur lors de la récupération de la description: ${descriptionResponse.status}`);
                    }
                    
                    const descriptionData = await descriptionResponse.json();
                    const text = descriptionData.description;
                    
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
                    
                    // Appeler l'API pour exécuter le MetaSolver
                    const response = await fetch('/api/plugins/metadetection/execute', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Erreur HTTP: ${response.status}`);
                    }
                    
                    const result = await response.json();
                    
                    // Ajouter le résultat au tableau
                    results.push({
                        geocache: geocache,
                        result: result,
                        tool: 'MetaSolver',
                        toolMode: mode,
                        timestamp: new Date().toISOString()
                    });
                    
                } catch (error) {
                    console.error(`Erreur lors du traitement de la géocache ${geocache.id}:`, error);
                    
                    // Ajouter une entrée d'erreur
                    results.push({
                        geocache: geocache,
                        error: error.message,
                        tool: 'MetaSolver',
                        toolMode: mode,
                        timestamp: new Date().toISOString()
                    });
                }
            }
            
            // Mettre à jour le tableau des résultats
            this.processedResultsValue = [...this.processedResultsValue, ...results];
            this.updateResultsTable();
            
        } catch (error) {
            console.error("Erreur lors de l'exécution du MetaSolver:", error);
            this.showError(`Erreur lors de l'exécution du MetaSolver: ${error.message}`);
        }
    }
    
    // Méthode pour sélectionner un plugin et afficher son interface
    async selectPlugin(event) {
        const pluginId = event.currentTarget.dataset.pluginId;
        const pluginName = event.currentTarget.dataset.pluginName;
        const pluginZoneId = event.currentTarget.dataset.pluginZoneId;
        
        console.log("Sélection du plugin:", pluginName, "dans la zone:", pluginZoneId);
        
        if (pluginId && pluginName) {
            try {
                // Afficher un loader pendant le chargement
                const pluginZone = document.getElementById(pluginZoneId);
                if (pluginZone) {
                    pluginZone.innerHTML = `
                        <div class="animate-pulse">
                            <div class="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                            <div class="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                            <div class="h-4 bg-gray-700 rounded w-2/3"></div>
                        </div>
                    `;
                } else {
                    this.pluginListTarget.innerHTML = `
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
                if (pluginZone) {
                    // Insérer le HTML dans la zone
                    pluginZone.innerHTML = html;
                    
                    // Ajouter l'attribut data-plugin-zone-id au bouton d'exécution
                    const executeButton = pluginZone.querySelector('[data-action="click->geocache-solver#executePlugin"]');
                    if (executeButton) {
                        executeButton.setAttribute('data-action', 'click->multi-solver#executePlugin');
                        executeButton.setAttribute('data-plugin-zone-id', pluginZoneId);
                        console.log("Attribut data-plugin-zone-id ajouté au bouton d'exécution:", pluginZoneId);
                    }
                } else {
                    this.pluginListTarget.innerHTML = html;
                    
                    // Dans ce cas, nous sommes dans le panneau principal, créons un ID
                    const mainPanelId = `main-panel-${Date.now()}`;
                    this.pluginListTarget.id = mainPanelId;
                    this.pluginListTarget.setAttribute('data-plugin-selection-zone', 'true');
                    
                    // Ajouter l'attribut data-plugin-zone-id au bouton d'exécution
                    const executeButton = this.pluginListTarget.querySelector('[data-action="click->geocache-solver#executePlugin"]');
                    if (executeButton) {
                        executeButton.setAttribute('data-action', 'click->multi-solver#executePlugin');
                        executeButton.setAttribute('data-plugin-zone-id', mainPanelId);
                        console.log("Attribut data-plugin-zone-id ajouté au bouton d'exécution principal:", mainPanelId);
                    }
                }
                
                // Mettre à jour le plugin sélectionné
                this.selectedPluginValue = pluginId;
            } catch (error) {
                console.error('Erreur lors du chargement de l\'interface du plugin:', error);
                if (pluginZoneId) {
                    const pluginZone = document.getElementById(pluginZoneId);
                    if (pluginZone) {
                        pluginZone.innerHTML = `
                            <div class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                                Erreur lors du chargement de l'interface du plugin: ${error.message}
                            </div>
                        `;
                    }
                } else {
                    this.pluginListTarget.innerHTML = `
                        <div class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                            Erreur lors du chargement de l'interface du plugin: ${error.message}
                        </div>
                    `;
                }
            }
        }
    }
    
    // Méthode pour exécuter un plugin
    async executePlugin(event) {
        // Récupérer l'ID et le nom du plugin
        const pluginId = event.currentTarget.dataset.pluginId;
        const pluginName = event.currentTarget.dataset.pluginName;
        const pluginZoneId = event.currentTarget.dataset.pluginZoneId;
        
        console.log("Exécution du plugin:", pluginName, "dans la zone:", pluginZoneId);
        
        // Si on a un plugin sélectionné
        if (pluginId && pluginName) {
            // Récupérer le texte et les paramètres du plugin
            const formData = {};
            
            // Si le plugin est dans une zone spécifique, récupérer les éléments de formulaire de cette zone
            const pluginZone = pluginZoneId ? document.getElementById(pluginZoneId) : null;
            if (pluginZone) {
                const formInputs = pluginZone.querySelectorAll('input, textarea, select');
                formInputs.forEach(input => {
                    if (input.name) {
                        if (input.type === 'checkbox') {
                            formData[input.name] = input.checked;
                        } else if (input.type === 'radio') {
                            if (input.checked) {
                                formData[input.name] = input.value;
                            }
                        } else {
                            formData[input.name] = input.value;
                        }
                    }
                });
            }
            
            // Ajouter le mode decode par défaut si non spécifié
            if (!formData.mode) {
                formData.mode = 'decode';
            }
            
            // Récupérer si on applique à toutes les géocaches
            const applyToAll = document.getElementById('plugin-apply-to-all').checked;
            
            try {
                // Vérifier s'il y a des géocaches à traiter
                if (!this.geocachesValue || this.geocachesValue.length === 0) {
                    // Affichage à faire dans le tableau des résultats
                    this.resultsTableTarget.innerHTML = `
                        <tr>
                            <td colspan="5" class="px-6 py-4">
                                <div class="text-center text-amber-400">
                                    <p>Aucune géocache disponible pour appliquer le plugin ${pluginName}.</p>
                                    <p class="text-sm mt-2">Pour utiliser ce plugin, vous devez d'abord sélectionner des géocaches depuis la liste principale.</p>
                                </div>
                            </td>
                        </tr>
                    `;
                    return;
                }
                
                // Déterminer quelles géocaches traiter
                const geocachesToProcess = applyToAll 
                    ? this.geocachesValue 
                    : this.geocachesValue.filter(g => document.querySelector(`input[name="geocache-${g.id}"]:checked`));
                
                if (geocachesToProcess.length === 0) {
                    this.showError("Aucune géocache sélectionnée pour le traitement.");
                    return;
                }
                
                // Afficher un indicateur de chargement dans le tableau des résultats
                this.resultsTableTarget.innerHTML = `
                    <tr>
                        <td colspan="5" class="px-6 py-4">
                            <div class="flex justify-center">
                                <div class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                            </div>
                            <div class="text-center text-gray-400 mt-2">Application du plugin ${pluginName}...</div>
                        </td>
                    </tr>
                `;
                
                // Traiter chaque géocache
                const results = [];
                
                for (const geocache of geocachesToProcess) {
                    try {
                        // Récupérer le texte de la géocache
                        const descriptionResponse = await fetch(`/geocaches/${geocache.id}/text`, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                            }
                        });
                        
                        if (!descriptionResponse.ok) {
                            throw new Error(`Erreur lors de la récupération de la description: ${descriptionResponse.status}`);
                        }
                        
                        const descriptionData = await descriptionResponse.json();
                        const text = descriptionData.description;
                        
                        // Préparer les données pour l'API du plugin
                        const requestData = {
                            text: text,
                            ...formData
                        };
                        
                        // Appeler l'API pour exécuter le plugin
                        const response = await fetch(`/api/plugins/${pluginName}/execute`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(requestData),
                        });
                        
                        if (!response.ok) {
                            throw new Error(`Erreur HTTP: ${response.status}`);
                        }
                        
                        const data = await response.json();
                        
                        // Extraire le résultat du plugin
                        let resultText = '';
                        
                        // Cas 1: Réponse avec text_output
                        if (data.text_output) {
                            resultText = data.text_output;
                        }
                        // Cas 2: Réponse avec result.text.text_output
                        else if (data.result && data.result.text && data.result.text.text_output) {
                            resultText = data.result.text.text_output;
                        }
                        // Cas 3: Réponse avec output
                        else if (data.output) {
                            resultText = data.output;
                        }
                        // Cas 4: Réponse avec result direct
                        else if (data.result) {
                            resultText = typeof data.result === 'object' ? JSON.stringify(data.result) : data.result;
                        }
                        // Cas 5: Réponse est une chaîne de caractères
                        else if (typeof data === 'string') {
                            resultText = data;
                        }
                        // Cas par défaut: Afficher la réponse complète
                        else {
                            resultText = JSON.stringify(data, null, 2);
                        }
                        
                        // Ajouter le résultat au tableau
                        results.push({
                            geocache: geocache,
                            result: {
                                plugin_output: resultText,
                                raw_data: data
                            },
                            tool: pluginName,
                            timestamp: new Date().toISOString()
                        });
                        
                    } catch (error) {
                        console.error(`Erreur lors du traitement de la géocache ${geocache.id} avec le plugin ${pluginName}:`, error);
                        
                        // Ajouter une entrée d'erreur
                        results.push({
                            geocache: geocache,
                            error: error.message,
                            tool: pluginName,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
                
                // Mettre à jour le tableau des résultats
                this.processedResultsValue = [...this.processedResultsValue, ...results];
                this.updateResultsTable();
                
                // Recharger la liste des plugins
                this.loadPluginsList();
                
            } catch (error) {
                console.error(`Erreur lors de l'exécution du plugin ${pluginName}:`, error);
                this.showError(`Erreur lors de l'exécution du plugin ${pluginName}: ${error.message}`);
            }
        }
    }

    // Méthode pour mettre à jour le tableau des résultats
    updateResultsTable() {
        if (!this.processedResultsValue || this.processedResultsValue.length === 0) {
            this.resultsTableTarget.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-4">
                        <div class="text-center text-gray-400">Aucun résultat disponible</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        let tableHtml = '';
        
        // Regrouper les résultats par géocache
        const resultsByGeocache = {};
        
        this.processedResultsValue.forEach(result => {
            const geocacheId = result.geocache.id;
            if (!resultsByGeocache[geocacheId]) {
                resultsByGeocache[geocacheId] = [];
            }
            resultsByGeocache[geocacheId].push(result);
        });
        
        // Afficher une ligne pour chaque géocache avec ses résultats les plus récents
        for (const [geocacheId, results] of Object.entries(resultsByGeocache)) {
            // Trier les résultats par timestamp décroissant pour avoir les plus récents d'abord
            results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            const latestResult = results[0];
            const geocache = latestResult.geocache;
            
            // Extraire les détections ou coordonnées GPS
            let detections = '';
            let coordinates = '';
            
            if (latestResult.error) {
                detections = `<span class="text-red-400">Erreur: ${latestResult.error}</span>`;
            } else if (latestResult.tool === 'MetaSolver') {
                // Pour le MetaSolver, vérifier si des codes ont été détectés
                if (latestResult.result.result && latestResult.result.result.possible_codes) {
                    const codes = latestResult.result.result.possible_codes;
                    if (codes.length > 0) {
                        detections = `
                            <div class="text-green-400">
                                ${codes.length} code(s) détecté(s): 
                                ${codes.map(c => c.plugin_name).join(', ')}
                            </div>
                        `;
                    } else {
                        detections = '<span class="text-gray-400">Aucun code détecté</span>';
                    }
                } else if (latestResult.result.result && latestResult.result.result.decoded_results) {
                    const decoded = latestResult.result.result.decoded_results;
                    if (decoded.length > 0) {
                        detections = `
                            <div class="text-green-400">
                                ${decoded.length} décodage(s): 
                                ${decoded.map(d => d.plugin_name).join(', ')}
                            </div>
                        `;
                    } else {
                        detections = '<span class="text-gray-400">Aucun décodage réussi</span>';
                    }
                } else {
                    detections = '<span class="text-gray-400">Aucune détection</span>';
                }
                
                // Vérifier si des coordonnées GPS ont été détectées
                if (latestResult.result.coordinates && latestResult.result.coordinates.exist) {
                    coordinates = `
                        <div class="text-green-400 font-mono">
                            ${latestResult.result.coordinates.ddm || latestResult.result.coordinates.ddm_lat + ' ' + latestResult.result.coordinates.ddm_lon}
                        </div>
                    `;
                }
            } else {
                // Pour les autres plugins, afficher un extrait du résultat
                if (latestResult.result && latestResult.result.plugin_output) {
                    const output = latestResult.result.plugin_output;
                    detections = `
                        <div class="text-gray-300">
                            ${output.length > 50 ? output.substr(0, 50) + '...' : output}
                        </div>
                    `;
                }
            }
            
            tableHtml += `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-200">${geocache.gc_code || 'N/A'}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm text-gray-200">${geocache.name || 'Sans nom'}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-xs text-gray-400">Traité avec ${latestResult.tool} ${latestResult.toolMode ? `(${latestResult.toolMode})` : ''}</div>
                        ${detections}
                    </td>
                    <td class="px-6 py-4">
                        ${coordinates || '<span class="text-gray-400">Aucune coordonnée</span>'}
                    </td>
                    <td class="px-6 py-4 text-right">
                        <button 
                            data-action="click->multi-solver#viewResultDetails"
                            data-geocache-id="${geocache.id}"
                            class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs">
                            Détails
                        </button>
                        <button 
                            data-action="click->multi-solver#saveCoordinates"
                            data-geocache-id="${geocache.id}"
                            class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs ${!coordinates ? 'opacity-50 cursor-not-allowed' : ''}">
                            Sauvegarder
                        </button>
                    </td>
                </tr>
            `;
        }
        
        this.resultsTableTarget.innerHTML = tableHtml;
    }
    
    // Méthode pour voir les détails d'un résultat
    viewResultDetails(event) {
        const geocacheId = event.currentTarget.dataset.geocacheId;
        
        if (!geocacheId) return;
        
        // Trouver tous les résultats pour cette géocache
        const results = this.processedResultsValue.filter(r => r.geocache.id.toString() === geocacheId.toString());
        
        if (!results || results.length === 0) {
            alert("Aucun résultat trouvé pour cette géocache.");
            return;
        }
        
        // Afficher une modal avec les détails (pour simplifier, on utilise une alerte)
        alert(`Détails des résultats pour la géocache ${results[0].geocache.gc_code || 'N/A'} - ${results[0].geocache.name || 'Sans nom'}\n\n` + 
              results.map(r => `${r.tool} (${new Date(r.timestamp).toLocaleString()}): ${r.error || JSON.stringify(r.result, null, 2)}`).join('\n\n'));
    }
    
    // Méthode pour sauvegarder les coordonnées
    async saveCoordinates(event) {
        const geocacheId = event.currentTarget.dataset.geocacheId;
        
        if (!geocacheId) return;
        
        // Trouver le dernier résultat MetaSolver pour cette géocache
        const results = this.processedResultsValue.filter(
            r => r.geocache.id.toString() === geocacheId.toString() && 
            r.tool === 'MetaSolver' && 
            !r.error
        );
        
        if (!results || results.length === 0) {
            alert("Aucun résultat MetaSolver trouvé pour cette géocache.");
            return;
        }
        
        // Trier par timestamp décroissant
        results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        const latestResult = results[0];
        
        // Vérifier si des coordonnées ont été détectées
        if (!latestResult.result.coordinates || !latestResult.result.coordinates.exist) {
            alert("Aucune coordonnée GPS détectée pour cette géocache.");
            return;
        }
        
        // Demander confirmation
        if (!confirm(`Voulez-vous sauvegarder les coordonnées ${latestResult.result.coordinates.ddm || ''} pour la géocache ${latestResult.geocache.gc_code || 'N/A'} ?`)) {
            return;
        }
        
        try {
            // Envoyer les coordonnées à l'API
            const response = await fetch(`/api/geocaches/save/${geocacheId}/coordinates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    gc_lat: latestResult.result.coordinates.ddm_lat,
                    gc_lon: latestResult.result.coordinates.ddm_lon
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erreur lors de la sauvegarde des coordonnées');
            }
            
            alert("Coordonnées sauvegardées avec succès !");
            
        } catch (error) {
            console.error("Erreur lors de la sauvegarde des coordonnées:", error);
            alert(`Erreur lors de la sauvegarde des coordonnées: ${error.message}`);
        }
    }
} 