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
        processedResults: Array,
        multiSolverId: String
    }

    connect() {
        console.log("%c[MultiSolver] Connexion", "background:blue; color:white");
        
        // Vérifier les cibles nécessaires
        if (!this.hasPluginsTarget) {
          console.error("Cible plugins manquante");
          return;
        }
        
        if (!this.hasResultsTarget) {
          console.error("Cible results manquante");
          return;
        }
        
        // Initialiser le tableau de résultats vide
        this.processedResults = [];
        
        // Générer un ID unique pour ce Multi Solver s'il n'existe pas déjà
        if (!this.multiSolverIdValue) {
          const timestamp = new Date().getTime();
          const randomString = Math.random().toString(36).substring(2, 15);
          const uniqueId = `multi-solver-${timestamp}-${randomString}`;
          this.multiSolverIdValue = uniqueId;
          console.log("%c[MultiSolver] ID unique généré:", "background:blue; color:white", uniqueId);
        }
        
        // Stocker l'ID multi-solver dans sessionStorage pour que d'autres composants puissent y accéder
        sessionStorage.setItem('currentMultiSolverId', this.multiSolverIdValue);
        
        // Initialiser le tableau pour stocker les résultats
        window.multiSolverTableResults = [];
        
        // Initialisation du plugin sélectionné
        this.selectedPlugin = "formula_analyzer";
        
        // Initialiser les écouteurs d'événements
        this.initEventListeners();
        
        // Charger les géocaches à partir de l'URL si disponible
        this.loadGeocachesFromUrl();
        
        // Afficher les géocaches chargées
        this.displayGeocaches();
        
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
        
        // Attacher un écouteur direct au bouton d'exécution pour éviter les problèmes d'événements avec Stimulus
        const executeButton = document.getElementById('execute-plugin-button');
        if (executeButton) {
            console.log("%c[MultiSolver] Configuration du bouton d'exécution", "background:#222; color:lightgreen");
            executeButton.addEventListener('click', (event) => {
                console.log("%c[MultiSolver] Clic direct sur bouton d'exécution", "background:red; color:white; font-weight:bold");
                this.executePlugin(event);
            });
        } else {
            console.error("%c[MultiSolver] ERREUR: Bouton d'exécution non trouvé", "background:red; color:white; font-weight:bold");
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
            // Mettre à jour le compteur à 0
            if (typeof updateGeocachesCount === 'function') {
                updateGeocachesCount(0);
            }
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
        
        // Mettre à jour le compteur avec le nombre de géocaches
        if (typeof updateGeocachesCount === 'function') {
            updateGeocachesCount(this.geocachesValue.length);
        } else {
            console.log("%c[MultiSolver] La fonction updateGeocachesCount n'est pas disponible", "background:orange; color:black");
            // Fallback: mise à jour directe
            const countElement = document.getElementById('geocaches-count');
            if (countElement) {
                countElement.textContent = this.geocachesValue.length || '0';
            }
        }
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
        
        console.log("%c[MultiSolver] Sélection du plugin:", "background:#222; color:cyan; font-weight:bold", {
            pluginId, pluginName, pluginZoneId
        });
        
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
                const response = await fetch(`/api/plugins/${pluginName}/interface?context=solver&hide_buttons=true`);
                
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                
                const html = await response.text();
                
                // Mettre à jour le contenu du panneau des plugins
                if (pluginZone) {
                    // Insérer le HTML dans la zone
                    pluginZone.innerHTML = html;
                    
                    // Masquer les boutons d'exécution du plugin au cas où le serveur les génère quand même
                    this.hidePluginExecuteButtons(pluginZone);
                } else {
                    this.pluginListTarget.innerHTML = html;
                    
                    // Dans ce cas, nous sommes dans le panneau principal, créons un ID
                    const mainPanelId = `main-panel-${Date.now()}`;
                    this.pluginListTarget.id = mainPanelId;
                    this.pluginListTarget.setAttribute('data-plugin-selection-zone', 'true');
                    
                    // Masquer les boutons d'exécution du plugin au cas où le serveur les génère quand même
                    this.hidePluginExecuteButtons(this.pluginListTarget);
                }
                
                // Mettre à jour le plugin sélectionné
                this.selectedPluginValue = pluginName;
                
                // Mettre à jour le texte et l'état du bouton d'exécution principal
                const executeButton = document.getElementById('execute-plugin-button');
                if (executeButton) {
                    executeButton.textContent = `Exécuter ${pluginName} sur les géocaches`;
                    executeButton.classList.remove('bg-gray-500');
                    executeButton.classList.add('bg-purple-600', 'hover:bg-purple-700');
                    executeButton.dataset.pluginName = pluginName;
                    executeButton.dataset.pluginState = 'selected';
                }
                
                // Mettre à jour le message d'état
                const pluginStatus = document.getElementById('plugin-status');
                if (pluginStatus) {
                    pluginStatus.textContent = `Plugin ${pluginName} sélectionné`;
                    pluginStatus.classList.remove('text-amber-400');
                    pluginStatus.classList.add('text-green-400');
                }
                
            } catch (error) {
                console.error('%c[MultiSolver] Erreur lors du chargement de l\'interface du plugin:', "background:red; color:white", error);
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
    
    // Méthode pour masquer les boutons d'exécution dans l'interface du plugin
    hidePluginExecuteButtons(container) {
        if (!container) return;
        
        // Masquer les boutons d'exécution avec data-action pour geocache-solver#executePlugin
        const geocacheSolverButtons = container.querySelectorAll('[data-action="click->geocache-solver#executePlugin"], [data-action="submit->geocache-solver#executePlugin"]');
        geocacheSolverButtons.forEach(button => {
            button.style.display = 'none';
        });
        
        // Masquer les boutons d'exécution avec l'attribut onclick="executePlugin()"
        const onclickButtons = container.querySelectorAll('button[onclick*="executePlugin"]');
        onclickButtons.forEach(button => {
            button.style.display = 'none';
        });
        
        // Masquer les divs contenant les boutons d'exécution
        const buttonContainers = container.querySelectorAll('.flex.justify-end, .mt-6.flex.justify-end');
        buttonContainers.forEach(div => {
            // Vérifier si ce div contient des boutons d'exécution avant de le masquer
            const hasExecuteButtons = div.querySelector('button[onclick*="executePlugin"], [data-action*="executePlugin"]');
            if (hasExecuteButtons) {
                div.style.display = 'none';
            }
        });
        
        // Masquer les champs spécifiques d'ID de géocache pour certains plugins
        this.hideRedundantFields(container);
        
        console.log("%c[MultiSolver] Boutons d'exécution masqués dans l'interface du plugin", "background:#222; color:cyan");
    }
    
    // Méthode pour masquer les champs inutiles dans l'interface du plugin
    hideRedundantFields(container) {
        if (!container) return;
        
        // Rechercher le champ d'ID de géocache dans le plugin analysis_web_page
        const geocacheIdFields = container.querySelectorAll('input[name="geocache_id"], input[name="geocacheId"], input[id="geocache_id"], input[id="geocacheId"]');
        
        if (geocacheIdFields.length > 0) {
            console.log("%c[MultiSolver] Masquage des champs d'ID de géocache inutiles", "background:purple; color:white");
            
            geocacheIdFields.forEach(field => {
                // Trouver le conteneur parent du champ (généralement un div)
                const fieldContainer = field.closest('.form-group, .mb-4, .mb-3, .form-control');
                
                if (fieldContainer) {
                    // Masquer tout le groupe de formulaire
                    fieldContainer.style.display = 'none';
                    console.log("%c[MultiSolver] Champ d'ID de géocache masqué avec son conteneur", "background:purple; color:white");
                } else {
                    // Masquer uniquement le champ si on ne trouve pas de conteneur
                    field.style.display = 'none';
                    
                    // Si le champ a un label associé, le masquer aussi
                    const fieldId = field.id;
                    if (fieldId) {
                        const associatedLabel = container.querySelector(`label[for="${fieldId}"]`);
                        if (associatedLabel) {
                            associatedLabel.style.display = 'none';
                        }
                    }
                    
                    console.log("%c[MultiSolver] Champ d'ID de géocache masqué", "background:purple; color:white");
                }
            });
        }
    }

    // Méthode pour exécuter un plugin
    async executePlugin(event) {
        console.log("%c[MultiSolver] Execution du plugin:", "background:blue; color:white", this.selectedPlugin);
        
        if (!this.selectedPlugin) {
          console.error("%c[MultiSolver] Aucun plugin sélectionné", "background:red; color:white");
            return;
        }

        // Vérifier et attendre que le tableau Tabulator soit correctement initialisé
        const checkTabulatorInitialized = () => {
          if (window.tabulatorTable && window.tabulatorTable._initialized) {
            console.log("%c[MultiSolver] Tabulator est correctement initialisé", "background:blue; color:white");
            this.executePluginActual();
        } else {
            console.log("%c[MultiSolver] Attente de l'initialisation de Tabulator...", "background:orange; color:white");
            // Initialiser Tabulator si ce n'est pas déjà fait
            if (!window.tabulatorTable) {
              console.log("%c[MultiSolver] Initialisation forcée de Tabulator", "background:orange; color:white");
              window.initTabulatorTable();
            }
            // Réessayer dans 100ms
            setTimeout(checkTabulatorInitialized, 100);
          }
        };
        
        // Démarrer la vérification
        checkTabulatorInitialized();
    }
    
    executePluginActual() {
        // L'ancien code de executePlugin
        this.loadingValue = true;
        this.errorValue = '';
        
        // Vérifier si des geocaches sont sélectionnées
        if (!this.geocaches || this.geocaches.length === 0) {
          this.errorValue = "Aucune géocache sélectionnée. Ajoutez des géocaches avant d'exécuter le plugin.";
          this.loadingValue = false;
                return;
            }
            
        // Récupérer toutes les informations nécessaires
        const pluginData = {
          plugin: this.selectedPlugin,
          geocaches: this.geocaches
        };
        
        // Exécuter le plugin global
        if (window.executePlugin) {
          console.log("%c[MultiSolver] Utilisation de la fonction globale executePlugin", "background:blue; color:white");
          window.executePlugin(pluginData, this.processResults.bind(this));
                    } else {
          console.error("%c[MultiSolver] La fonction executePlugin n'est pas disponible", "background:red; color:white");
          this.errorValue = "Erreur: Plugin non disponible";
          this.loadingValue = false;
        }
    }

    // Nouvelle méthode pour mettre à jour spécifiquement les résultats de analysis_web_page
    updateAnalysisWebPageResults() {
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
        
        this.processedResultsValue.forEach(result => {
            const geocache = result.geocache;
            
            // Formater les détections
            let detections = '';
            if (result.error) {
                detections = `<span class="text-red-400">Erreur: ${result.error}</span>`;
            } else if (result.detectedPlugins && result.detectedPlugins.length > 0) {
                detections = `
                    <div class="space-y-4">
                        ${result.detectedPlugins.map(plugin => {
                            let content = '';
                            
                            // Traitement spécifique pour chaque type de plugin
                            if (plugin.name === 'color_text_detector' && plugin.result.findings) {
                                content = `
                                    <div class="space-y-2">
                                        ${plugin.result.findings.map(finding => `
                                            <div class="bg-gray-600 p-3 rounded">
                                                <div class="flex items-center gap-2">
                                                    <span class="text-xl">🎨</span>
                                                    <div class="text-gray-200">${finding.content}</div>
                                                </div>
                                                ${finding.description ? `
                                                    <div class="text-sm text-gray-400 mt-1">${finding.description}</div>
                                                ` : ''}
                                            </div>
                                        `).join('')}
                                    </div>
                                `;
                            } else if (plugin.name === 'html_comments_finder' && plugin.result.findings) {
                                content = `
                                    <div class="space-y-2">
                                        ${plugin.result.findings.map(comment => `
                                            <div class="bg-gray-600 p-3 rounded">
                                                <div class="flex items-center gap-2">
                                                    <span class="text-xl">💬</span>
                                                    <div class="text-gray-200">${comment}</div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                `;
                            } else if (plugin.name === 'image_alt_text_extractor' && plugin.result.findings) {
                                content = `
                                    <div class="space-y-2">
                                        ${plugin.result.findings.map(text => `
                                            <div class="bg-gray-600 p-3 rounded">
                                                <div class="flex items-center gap-2">
                                                    <span class="text-xl">🖼️</span>
                                                    <div class="text-gray-200">${text}</div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                `;
                            }
                            
                            return content ? `
                                <div class="bg-gray-700 p-4 rounded-lg">
                                    <h3 class="text-lg font-semibold text-blue-400 mb-3">${plugin.name}</h3>
                                    ${content}
                                </div>
                            ` : '';
                        }).filter(content => content !== '').join('')}
                    </div>
                `;
            } else {
                detections = '<span class="text-gray-400">Aucune détection</span>';
            }

            // Formater les coordonnées
            let coordinates = '';
            if (result.coordinates && result.coordinates.exist) {
                coordinates = `
                    <div class="text-green-400 font-mono">
                        ${result.coordinates.ddm || `${result.coordinates.ddm_lat} ${result.coordinates.ddm_lon}`}
                    </div>
                `;
            } else {
                coordinates = '<span class="text-gray-400">Aucune coordonnée</span>';
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
                        ${detections}
                    </td>
                    <td class="px-6 py-4">
                        ${coordinates}
                    </td>
                    <td class="px-6 py-4 text-right">
                        <button 
                            data-action="click->multi-solver#viewResultDetails"
                            data-geocache-id="${geocache.id}"
                            class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs">
                            Détails
                        </button>
                        ${result.coordinates ? `
                            <button 
                                data-action="click->multi-solver#saveCoordinates"
                                data-geocache-id="${geocache.id}"
                                class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs">
                                Sauvegarder
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });

        this.resultsTableTarget.innerHTML = tableHtml;
    }

    // Méthode pour mettre à jour le tableau des résultats
    updateResultsTable() {
        console.log("%c[MultiSolver] Mise à jour du tableau des résultats", "background:blue; color:white");
        
        // Générer un ID unique pour ce MultiSolver s'il n'existe pas déjà
        if (!this.multiSolverIdValue) {
          const timestamp = new Date().getTime();
          const randomString = Math.random().toString(36).substring(2, 15);
          const uniqueId = `multi-solver-${timestamp}-${randomString}`;
          this.multiSolverIdValue = uniqueId;
          console.log("%c[MultiSolver] ID unique généré:", "background:blue; color:white", uniqueId);
          
          // Mise à jour de l'attribut data-multi-solver-id sur l'élément
          this.element.dataset.multiSolverId = uniqueId;
        }
        
        // S'assurer que la variable multiSolverTableResults est initialisée
        if (!window.multiSolverTableResults) {
          window.multiSolverTableResults = [];
        }
        
        // Stocker les données actuelles des géocaches dans sessionStorage
        try {
          // Normaliser les données - s'assurer que toutes les géocaches ont les bonnes propriétés
          let geocachesForStorage = this.geocaches.map(geocache => {
            // Chercher si cette geocache a déjà des résultats
            const existingResult = window.multiSolverTableResults.find(result => result.id === geocache.id);
            
            const normalizedGeocache = {
              ...geocache,
              coordinates: existingResult?.coordinates || null,
              saved: existingResult?.saved || false
            };
            
            // Vérifier si les coordonnées existent et les normaliser
            if (normalizedGeocache.coordinates && 
                normalizedGeocache.coordinates.latitude && 
                normalizedGeocache.coordinates.longitude) {
              
              // S'assurer que latitude/longitude sont disponibles au niveau supérieur pour la carte
              normalizedGeocache.latitude = normalizedGeocache.coordinates.latitude;
              normalizedGeocache.longitude = normalizedGeocache.coordinates.longitude;
            }
            
            return normalizedGeocache;
          });
          
          // Mettre à jour sessionStorage
          sessionStorage.setItem('multiSolverGeocaches', JSON.stringify(geocachesForStorage));
          console.log("%c[MultiSolver] Données sauvegardées dans sessionStorage:", "background:blue; color:white", geocachesForStorage.length);
          
          // Mettre à jour window.multiSolverTableResults pour utilisation ultérieure
          window.multiSolverTableResults = geocachesForStorage;
        } catch (error) {
          console.error("%c[MultiSolver] Erreur lors de la sauvegarde dans sessionStorage:", "background:red; color:white", error);
        }
        
        // Émettre un événement pour informer la carte des mises à jour
        console.log("%c[MultiSolver] Émission de l'événement multiSolverDataUpdated", "background:blue; color:white");
        window.dispatchEvent(new CustomEvent('multiSolverDataUpdated', {
          detail: {
            multiSolverId: this.multiSolverIdValue,
            data: this.geocaches
          }
        }));
        
        // Mettre à jour le tableau Tabulator si nécessaire
        try {
          // Nettoyer le tableau existant s'il existe
          if (this.resultsTableTarget._tabulator) {
            console.log("%c[MultiSolver] Destruction du tableau Tabulator existant", "background:blue; color:white");
            this.resultsTableTarget._tabulator.destroy();
          }
          
          // Vérifier si on a des résultats à afficher
          if (this.processedResults && this.processedResults.length > 0) {
            console.log("%c[MultiSolver] Création d'un nouveau tableau Tabulator avec", "background:blue; color:white", this.processedResults.length, "résultats");
            
            // Initialiser Tabulator avec notre tableau de données
            if (window.tabulatorTable) {
              console.log("%c[MultiSolver] Utilisation du tableau Tabulator global", "background:blue; color:white");
              window.tabulatorTable.setData(this.processedResults);
            } else {
              console.log("%c[MultiSolver] Création d'un nouveau tableau Tabulator local", "background:blue; color:white");
              this.resultsTableTarget._tabulator = new Tabulator(this.resultsTableTarget, {
                data: this.processedResults,
                layout: "fitColumns",
                columns: [
                  // Configuration des colonnes selon vos besoins
                  { title: "GC Code", field: "geocache.gc_code", width: 100 },
                  { title: "Nom", field: "geocache.name", width: 200 },
                  { title: "Résultat", field: "result", formatter: "html" },
                  { 
                    title: "Coordonnées", 
                    field: "coordinates", 
                    formatter: function(cell) {
                      const value = cell.getValue();
                      if (!value) return "";
                      
                      // Différents formats possibles de coordonnées
                      if (value.ddm) return value.ddm;
                      if (value.latitude && value.longitude) return `${value.latitude} ${value.longitude}`;
                      if (typeof value === 'string') return value;
                      
                      return JSON.stringify(value);
                    } 
                  },
                  { 
                    title: "Actions", 
                    formatter: function(cell) {
                      const geocache = cell.getRow().getData().geocache;
                      const coordinates = cell.getRow().getData().coordinates;
                      
                      if (!coordinates) return "";
                      
                      return `<button 
                        class="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-xs save-coordinates" 
                        data-geocache-id="${geocache.id}">
                        Sauvegarder
                      </button>`;
                    },
                    cellClick: function(e, cell) {
                      if (e.target.classList.contains('save-coordinates')) {
                        const geocacheId = e.target.getAttribute('data-geocache-id');
                        const rowData = cell.getRow().getData();
                        const coordinates = rowData.coordinates;
                        
                        if (coordinates && (coordinates.latitude || coordinates.ddm_lat)) {
                          const lat = coordinates.latitude || coordinates.ddm_lat;
                          const lng = coordinates.longitude || coordinates.ddm_lon;
                          
                          // Appeler la fonction de sauvegarde
                          if (window.saveCoordinates) {
                            window.saveCoordinates(geocacheId, lat, lng, rowData.plugin);
                          }
                        }
                      }
                    }
                  }
                ]
              });
                }
            } else {
            console.warn("%c[MultiSolver] Aucun résultat à afficher dans le tableau", "background:orange; color:white");
          }
        } catch (error) {
          console.error("%c[MultiSolver] Erreur lors de la mise à jour du tableau:", "background:red; color:white", error);
        }
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

    get multiSolverIdValue() {
        return this.multiSolverIdTarget.value;
    }

    set multiSolverIdValue(value) {
        this.multiSolverIdTarget.value = value;
        // Mettre à jour également l'attribut data-multi-solver-id sur l'élément
        this.element.dataset.multiSolverId = value;
    }

    // Fonction pour extraire et formatter correctement les coordonnées depuis les résultats
    extractCoordinates(combinedResults) {
        console.log("%c[MultiSolver] Extraction des coordonnées depuis:", "background:purple; color:white", combinedResults);
        
        // Rechercher d'abord dans color_text_detector qui est généralement le plus fiable
        if (combinedResults.color_text_detector && 
            combinedResults.color_text_detector.coordinates && 
            combinedResults.color_text_detector.coordinates.exist) {
          
          const coords = combinedResults.color_text_detector.coordinates;
          console.log("%c[MultiSolver] Coordonnées trouvées dans color_text_detector:", "background:green; color:white", coords);
          
          // On a besoin de coordonnées numériques pour la carte
          const ddmLat = coords.ddm_lat;
          const ddmLon = coords.ddm_lon;
          
          // Convertir les coordonnées au format numérique
          const numericCoords = this.convertDDMToDecimal(ddmLat, ddmLon);
          
          if (numericCoords) {
            return {
              ddm: coords.ddm,
              ddm_lat: ddmLat,
              ddm_lon: ddmLon,
              latitude: numericCoords.latitude, 
              longitude: numericCoords.longitude,
              source: 'color_text_detector'
            };
          }
          
          // Si la conversion a échoué mais qu'on a quand même les coordonnées DDM
          return {
            ddm: coords.ddm,
            ddm_lat: ddmLat,
            ddm_lon: ddmLon,
            source: 'color_text_detector'
          };
        }
        
        // Vérifier aussi dans coordinates_finder
        if (combinedResults.coordinates_finder && 
            combinedResults.coordinates_finder.coordinates && 
            combinedResults.coordinates_finder.coordinates.exist) {
          
          const coords = combinedResults.coordinates_finder.coordinates;
          console.log("%c[MultiSolver] Coordonnées trouvées dans coordinates_finder:", "background:green; color:white", coords);
          
          const ddmLat = coords.ddm_lat;
          const ddmLon = coords.ddm_lon;
          
          // Convertir les coordonnées au format numérique
          const numericCoords = this.convertDDMToDecimal(ddmLat, ddmLon);
          
          if (numericCoords) {
            return {
              ddm: coords.ddm,
              ddm_lat: ddmLat,
              ddm_lon: ddmLon,
              latitude: numericCoords.latitude, 
              longitude: numericCoords.longitude,
              source: 'coordinates_finder'
            };
          }
          
          return {
            ddm: coords.ddm,
            ddm_lat: ddmLat,
            ddm_lon: ddmLon,
            source: 'coordinates_finder'
          };
        }
        
        console.log("%c[MultiSolver] Aucune coordonnée trouvée dans les résultats", "background:orange; color:white");
        return null;
    }
    
    // Convertir des coordonnées DDM (N 49° 46.587') en décimal (49.77645)
    convertDDMToDecimal(latDDM, lonDDM) {
        if (!latDDM || !lonDDM) return null;
        
        console.log("%c[MultiSolver] Conversion DDM -> Decimal:", "background:blue; color:white", {latDDM, lonDDM});
        
        try {
          // Regex pour extraire les parties des coordonnées
          const latRegex = /([NS])\s*(\d+)°\s*(\d+\.\d+)[']/i;
          const lonRegex = /([EW])\s*(\d+)°\s*(\d+\.\d+)[']/i;
          
          const latMatch = latDDM.match(latRegex);
          const lonMatch = lonDDM.match(lonRegex);
          
          if (!latMatch || !lonMatch) {
            console.error("%c[MultiSolver] Format de coordonnées non reconnu:", "background:red; color:white", {latDDM, lonDDM});
            return null;
          }
          
          // Extraire les composants
          const latDir = latMatch[1].toUpperCase();
          const latDeg = parseInt(latMatch[2], 10);
          const latMin = parseFloat(latMatch[3]);
          
          const lonDir = lonMatch[1].toUpperCase();
          const lonDeg = parseInt(lonMatch[2], 10);
          const lonMin = parseFloat(lonMatch[3]);
          
          // Calculer les valeurs décimales
          let latitude = latDeg + (latMin / 60);
          if (latDir === 'S') latitude = -latitude;
          
          let longitude = lonDeg + (lonMin / 60);
          if (lonDir === 'W') longitude = -longitude;
          
          console.log("%c[MultiSolver] Conversion réussie:", "background:green; color:white", {latitude, longitude});
          
          return {
            latitude: latitude,
            longitude: longitude
          };
        } catch (error) {
          console.error("%c[MultiSolver] Erreur lors de la conversion des coordonnées:", "background:red; color:white", error);
          return null;
        }
    }

    // Dans processResults(), remplacer la partie qui traite les coordonnées
    processResults(results) {
        console.log("%c[MultiSolver] Traitement des résultats reçus:", "background:blue; color:white", results);
        this.loadingValue = false;
        
        if (!results || results.length === 0) {
          console.warn("%c[MultiSolver] Aucun résultat reçu", "background:orange; color:white");
          this.errorValue = "Aucun résultat reçu";
          return;
        }
        
        // Traitement pour chaque géocache analysée
        for (const result of results) {
          console.log("%c[MultiSolver] Traitement du résultat:", "background:purple; color:white", result);
          
          // Si c'est un résultat de "analysis_web_page" (combined_results)
          if (result.combined_results) {
            console.log("%c[MultiSolver] Traitement des résultats combinés:", "background:purple; color:white", result.combined_results);
            
            // Utiliser notre fonction d'extraction des coordonnées
            const extractedCoords = this.extractCoordinates(result.combined_results);
            
            if (extractedCoords) {
              console.log("%c[MultiSolver] Coordonnées extraites:", "background:green; color:white", extractedCoords);
              
              // Ajouter le résultat au tableau des résultats
              this.addResultToTable({
                geocacheId: result.geocache_id,
                result: this.formatCombinedResultsHTML(result.combined_results),
                coordinates: extractedCoords,
                latitude: extractedCoords.latitude,
                longitude: extractedCoords.longitude,
                plugin: 'analysis_web_page'
              });
            } else {
              console.warn("%c[MultiSolver] Aucune coordonnée extraite des résultats combinés", "background:orange; color:white");
              
              // Ajouter quand même le résultat sans coordonnées
              this.addResultToTable({
                geocacheId: result.geocache_id,
                result: this.formatCombinedResultsHTML(result.combined_results),
                plugin: 'analysis_web_page'
              });
            }
          } 
          // Pour les autres types de résultats
          else {
            console.log("%c[MultiSolver] Résultat de plugin standard", "background:blue; color:white");
            
            // Extraire les coordonnées s'il y en a
            let coordinates = null;
            if (result.coordinates) {
              coordinates = result.coordinates;
              
              // Essayer de convertir en numérique si ce sont des coordonnées DDM
              if (coordinates.ddm_lat && coordinates.ddm_lon) {
                const numericCoords = this.convertDDMToDecimal(coordinates.ddm_lat, coordinates.ddm_lon);
                if (numericCoords) {
                  coordinates = {
                    ...coordinates,
                    ...numericCoords
                  };
                }
              }
            }
            
            // Ajouter le résultat au tableau
            this.addResultToTable({
              geocacheId: result.geocache_id,
              result: result.result || JSON.stringify(result),
              coordinates: coordinates,
              latitude: coordinates?.latitude,
              longitude: coordinates?.longitude,
              plugin: result.plugin
            });
          }
        }
        
        // Mise à jour de la table et de la carte
        this.updateResultsTable();
    }
    
    // Formater les résultats combinés en HTML pour affichage
    formatCombinedResultsHTML(combinedResults) {
        // Si cette fonction a été appelée avec un argument vide
        if (!combinedResults) return "Aucun résultat";
        
        let html = '<div class="bg-gray-700 p-2 rounded-lg">';
        
        // Parcourir tous les résultats des plugins
        for (const [pluginName, result] of Object.entries(combinedResults)) {
          // Ignorer les plugins sans résultat
          if (!result) continue;
          
          html += `<div class="mb-2 last:mb-0">`;
          html += `<div class="font-bold text-green-400">${this.formatPluginName(pluginName)}</div>`;
          
          // Coordonnées trouvées?
          if (result.coordinates && result.coordinates.exist) {
            html += `<div class="text-yellow-300 font-mono">${result.coordinates.ddm || ''}</div>`;
          }
          
          // Findings
          if (result.findings && result.findings.length > 0) {
            html += `<div class="pl-2 border-l-2 border-gray-500">`;
            
            for (const finding of result.findings) {
              const findingClass = finding.isInteresting ? 'text-yellow-300' : 'text-gray-300';
              
              html += `<div class="${findingClass} text-sm">
                <span class="font-bold">${finding.type || 'Trouvé'}</span>: 
                ${finding.content || finding.description || 'Non spécifié'}
              </div>`;
            }
            
            html += `</div>`;
          }
          
          html += `</div>`;
        }
        
        html += '</div>';
        return html;
    }
    
    // Formater le nom du plugin pour l'affichage
    formatPluginName(name) {
        // Convertir snake_case en title case avec espaces
        return name
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
    }

    // Dans addResultToTable(), s'assurer que les coordonnées sont bien préparées
    addResultToTable(data) {
        console.log("%c[MultiSolver] Résultat ajouté au tableau Tabulator", "background:blue; color:white");
        
        // Trouver la géocache correspondante
        const geocache = this.geocaches.find(gc => gc.id === data.geocacheId);
        
        if (!geocache) {
          console.error("%c[MultiSolver] Géocache non trouvée pour l'ID:", "background:red; color:white", data.geocacheId);
          return;
        }
        
        // Vérifier si ce résultat existe déjà
        const existingIndex = this.processedResults.findIndex(r => r.geocache.id === data.geocacheId);
        
        // Préparer l'objet de résultat
        const resultObject = {
          geocache: geocache,
          result: data.result,
          coordinates: data.coordinates,
          plugin: data.plugin,
          timestamp: new Date().toISOString()
        };
        
        // S'assurer que les coordonnées sont aussi au niveau supérieur pour la carte
        if (data.coordinates && (data.latitude || data.coordinates.latitude)) {
          // Priorité aux coordonnées numériques
          resultObject.latitude = data.latitude || data.coordinates.latitude;
          resultObject.longitude = data.longitude || data.coordinates.longitude;
          
          // Sauvegarder ces coordonnées dans la géocache aussi
          geocache.latitude = resultObject.latitude;
          geocache.longitude = resultObject.longitude;
          geocache.coordinates = data.coordinates;
        }
        
        // Mettre à jour ou ajouter le résultat
        if (existingIndex >= 0) {
          this.processedResults[existingIndex] = resultObject;
        } else {
          this.processedResults.push(resultObject);
        }
        
        // Si des coordonnées sont présentes, proposer de les sauvegarder
        if (data.coordinates && (data.coordinates.ddm || data.coordinates.latitude)) {
          this.saveCoordinates(
            data.geocacheId, 
            data.coordinates.latitude || data.coordinates.ddm_lat,
            data.coordinates.longitude || data.coordinates.ddm_lon,
            data.plugin
          );
        }
        
        // Vérifier le statut de sauvegarde pour cette géocache
        try {
          fetch(`/geocaches/${data.geocacheId}`)
            .then(response => response.json())
            .then(geocacheData => {
              if (geocacheData && geocacheData.saved_coordinates) {
                this.updateTableSavedStatus(data.geocacheId, this.processedResults.length);
              }
            })
            .catch(error => {
              console.warn("%c[MultiSolver] Erreur lors de la vérification du statut:", "background:orange; color:white", error);
            });
        } catch (error) {
          console.warn("%c[MultiSolver] Erreur lors de la vérification du statut:", "background:orange; color:white", error);
        }
    }
}

// Ajouter cette méthode globale à la fin du fichier
window.executePlugin = async function(pluginName) {
    console.log("%c[MultiSolver] window.executePlugin appelé pour le plugin:", "background:red; color:white; font-weight:bold", pluginName);
    
    // Vérifier si le plugin existe
    if (!pluginName) {
        console.error("%c[MultiSolver] Aucun nom de plugin fourni", "background:red; color:white");
        alert("Erreur: Aucun plugin n'a été spécifié pour l'exécution.");
        return;
    }
    
    try {
        console.log("%c[MultiSolver] Récupération des géocaches pour exécution", "background:green; color:white");
        
        // Récupérer les géocaches depuis le sessionStorage ou window.injectedGeocaches
        let geocaches = [];
        
        if (window.injectedGeocaches && Array.isArray(window.injectedGeocaches)) {
            geocaches = window.injectedGeocaches;
            console.log(`%c[MultiSolver] Utilisation de ${geocaches.length} géocaches depuis window.injectedGeocaches`, "background:green; color:white");
        } else {
            try {
                const storedGeocaches = sessionStorage.getItem('multiSolverGeocaches');
                if (storedGeocaches) {
                    geocaches = JSON.parse(storedGeocaches);
                    console.log(`%c[MultiSolver] Utilisation de ${geocaches.length} géocaches depuis sessionStorage`, "background:green; color:white");
                }
            } catch (error) {
                console.error("%c[MultiSolver] Erreur lors de la récupération des géocaches:", "background:red; color:white", error);
            }
        }
        
        // Vérifier si on a des géocaches
        if (!geocaches || geocaches.length === 0) {
            console.error("%c[MultiSolver] Aucune géocache disponible", "background:red; color:white");
            
            // Afficher un message dans le tableau des résultats
            const resultsTable = document.querySelector('[data-multi-solver-target="resultsTable"]');
            if (resultsTable) {
                resultsTable.innerHTML = `
                    <tr>
                        <td colspan="5" class="px-6 py-4">
                            <div class="text-center text-amber-400">
                                <p>Aucune géocache disponible pour appliquer le plugin ${pluginName}.</p>
                                <p class="text-sm mt-2">Pour utiliser ce plugin, vous devez d'abord sélectionner des géocaches depuis la liste principale.</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
            return;
        }
        
        // Récupérer les données du formulaire si disponible
        let formData = {};
        const formElement = document.querySelector('form');
        
        if (formElement) {
            const formDataObj = new FormData(formElement);
            for (const [key, value] of formDataObj.entries()) {
                formData[key] = value;
            }
            console.log("%c[MultiSolver] Données du formulaire:", "background:green; color:white", formData);
        }
        
        // Récupérer la case à cocher "Appliquer à toutes les géocaches"
        const applyToAllCheckbox = document.getElementById('apply-to-all-geocaches');
        const applyToAll = applyToAllCheckbox ? applyToAllCheckbox.checked : true;
        
        // Afficher un indicateur de chargement dans le tableau des résultats
        const resultsTable = document.querySelector('[data-multi-solver-target="resultsTable"]');
        if (resultsTable) {
            resultsTable.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-4">
                        <div class="flex justify-center">
                            <div class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                        <div class="text-center text-gray-400 mt-2">Application du plugin ${pluginName} sur ${geocaches.length} géocache(s)...</div>
                    </td>
                </tr>
            `;
        }
        
        // Traiter chaque géocache
        const results = [];
        
        for (const geocache of geocaches) {
            try {
                console.log("%c[MultiSolver] Traitement de la géocache:", "background:green; color:white", {
                    id: geocache.id,
                    gcCode: geocache.gc_code,
                    name: geocache.name
                });
                
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
                    // Ajouter systématiquement l'ID de la géocache pour les plugins qui en ont besoin
                    // notamment "analysis_web_page"
                    geocache_id: geocache.id,
                    ...formData
                };
                
                console.log("%c[MultiSolver] Appel du plugin avec les données:", "background:green; color:white", requestData);
                
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
                
                // Vérifier si la réponse est au format JSON
                let data;
                const contentType = response.headers.get("content-type");
                
                if (contentType && contentType.includes("application/json")) {
                    try {
                        data = await response.json();
                        console.log("%c[MultiSolver] Résultat du plugin (JSON):", "background:green; color:white", data);
                    } catch (jsonError) {
                        console.error("%c[MultiSolver] Erreur de parsing JSON:", "background:red; color:white", jsonError);
                        const responseText = await response.text();
                        console.warn("%c[MultiSolver] Réponse non-JSON reçue:", "background:orange; color:black", responseText.substring(0, 100));
                        data = {
                            result: "Erreur: La réponse n'est pas un JSON valide",
                            raw_html: responseText.includes('<') && responseText.includes('>')
                        };
                    }
                } else {
                    // Si la réponse n'est pas JSON, utiliser le texte brut
                    const responseText = await response.text();
                    console.warn("%c[MultiSolver] Réponse non-JSON reçue:", "background:orange; color:black", responseText.substring(0, 100));
                    data = {
                        result: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''),
                        raw_html: responseText.includes('<') && responseText.includes('>')
                    };
                }
                
                // Extraire le résultat du plugin et l'ajouter aux résultats
                let resultText = '';
                let coordinates = null;
                
                // Extraire le texte du résultat selon plusieurs formats possibles
                if (data.raw_html) {
                    try {
                        // Essayer d'extraire le texte du HTML avec une fonction utilitaire
                        const htmlContent = data.result;
                        const tempDiv = document.createElement('div');
                        
                        // Nettoyer le HTML pour éviter les erreurs d'analyse potentielles
                        const cleanHtml = htmlContent
                            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
                        
                        tempDiv.innerHTML = cleanHtml;
                        const extractedText = tempDiv.textContent || tempDiv.innerText || '';
                        
                        if (extractedText && extractedText.trim()) {
                            resultText = "📄 HTML: " + extractedText.substring(0, 300) + (extractedText.length > 300 ? '...' : '');
                        } else {
                            resultText = "⚠️ Réponse HTML reçue (non analysable)";
                        }
                    } catch (error) {
                        console.error("%c[MultiSolver] Erreur lors de l'extraction du texte HTML:", "background:red; color:white", error);
                        resultText = "⚠️ Réponse HTML reçue (non analysable)";
                    }
                } 
                // Cas spécial pour analysis_web_page qui retourne combined_results
                else if (data.combined_results) {
                    console.log("%c[MultiSolver] Résultat format combined_results détecté:", "background:purple; color:white", data.combined_results);
                    
                    // Si la fonction existe (définie dans le HTML), l'utiliser pour formater les résultats
                    if (window.formatCombinedResults) {
                        resultText = window.formatCombinedResults(data.combined_results);
                    } else {
                        resultText = `Analyse complète: ${Object.keys(data.combined_results).length} plugins exécutés`;
                    }
                    
                    // Extraire les coordonnées si disponibles
                    if (window.extractCoordinatesFromCombinedResults) {
                        coordinates = window.extractCoordinatesFromCombinedResults(data.combined_results);
                        console.log("%c[MultiSolver] Coordonnées extraites:", "background:green; color:white", coordinates);
                    }
                }
                else if (data.text_output) {
                    resultText = data.text_output;
                } else if (data.result?.text?.text_output) {
                    resultText = data.result.text.text_output;
                } else if (data.output) {
                    resultText = data.output;
                } else if (typeof data.result === 'string') {
                    resultText = data.result;
                } else if (data.result) {
                    resultText = JSON.stringify(data.result);
                } else {
                    resultText = JSON.stringify(data);
                }
                
                // Extraire les coordonnées si présentes
                if (data.coordinates) {
                    coordinates = data.coordinates;
                } else if (data.result?.coordinates) {
                    coordinates = data.result.coordinates;
                }
                
                // Ajouter le résultat à la liste
                results.push({
                    geocache: geocache,
                    result: resultText,
                    coordinates: coordinates,
                    // Format spécial pour les résultats des métaplugins (comme analysis_web_page)
                    isCombinedResult: !!data.combined_results,
                    rawData: data.combined_results || null,
                    plugin: pluginName,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                console.error("%c[MultiSolver] Erreur lors du traitement de la géocache:", "background:red; color:white", error);
                
                // Ajouter une entrée d'erreur aux résultats
                results.push({
                    geocache: geocache,
                    result: `Erreur: ${error.message}`,
                    error: true,
                    plugin: pluginName,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        // Mettre à jour les résultats dans sessionStorage
        try {
            sessionStorage.setItem('multiSolverResults', JSON.stringify(results));
        } catch (e) {
            console.warn("%c[MultiSolver] Impossible de stocker les résultats dans sessionStorage", "background:orange; color:black");
        }
        
        // Appeler notre propre fonction pour mettre à jour le tableau
        updateResultsTableWithData(results);
        
    } catch (error) {
        console.error("%c[MultiSolver] Erreur lors de l'exécution du plugin:", "background:red; color:white", error);
        
        // Afficher un message d'erreur
        const errorElement = document.querySelector('[data-multi-solver-target="error"]');
        if (errorElement) {
            errorElement.classList.remove('hidden');
            errorElement.querySelector('div').textContent = `Erreur lors de l'exécution du plugin: ${error.message}`;
        } else {
            alert(`Erreur lors de l'exécution du plugin: ${error.message}`);
        }
    }
};

// Fonction pour mettre à jour le tableau des résultats indépendamment du contrôleur Stimulus
window.updateResultsTableWithData = function(results) {
    console.log("%c[MultiSolver] Mise à jour du tableau des résultats avec les données", "background:green; color:white", results);
    
    const resultsTable = document.querySelector('[data-multi-solver-target="resultsTable"]');
    
    if (!resultsTable) {
        console.error("%c[MultiSolver] Élément tableau des résultats non trouvé", "background:red; color:white");
        return;
    }
    
    if (!results || results.length === 0) {
        resultsTable.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4">
                    <div class="text-center text-gray-400">Aucun résultat disponible</div>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const geocache = result.geocache;
        
        html += `
            <tr class="${i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="font-medium text-gray-200">${geocache.gc_code || 'N/A'}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="font-medium text-gray-200">${geocache.name || 'Géocache ' + (i + 1)}</div>
                    <div class="text-xs text-gray-400">ID: ${geocache.id}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="${result.error ? 'text-red-400' : 'text-gray-200'} max-w-xs truncate" title="${result.result}">
                        ${result.result}
                    </div>
                    <div class="text-xs text-gray-400">Plugin: ${result.plugin}</div>
                </td>
                <td class="px-6 py-4">
                    ${result.coordinates ? `
                        <div class="text-green-400">${result.coordinates}</div>
                    ` : `
                        <div class="text-gray-500">Aucune coordonnée</div>
                    `}
                </td>
                <td class="px-6 py-4 text-right">
                    <button 
                        onclick="viewResultDetails(${i})"
                        class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs">
                        Détails
                    </button>
                    ${result.coordinates ? `
                        <button 
                            onclick="saveCoordinates(${i})"
                            class="ml-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs">
                            Sauvegarder
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }
    
    resultsTable.innerHTML = html;
};

// Fonction pour afficher les détails d'un résultat
window.viewResultDetails = function(index) {
    try {
        const storedResults = sessionStorage.getItem('multiSolverResults');
        if (!storedResults) {
            alert("Aucun résultat disponible");
            return;
        }
        
        const results = JSON.parse(storedResults);
        if (!results || !results[index]) {
            alert("Résultat non trouvé");
            return;
        }
        
        const result = results[index];
        
        // Créer une boîte de dialogue modale
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
        modal.innerHTML = `
            <div class="relative bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto">
                <button class="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl" onclick="this.parentElement.parentElement.remove()">&times;</button>
                <h3 class="text-xl font-bold text-gray-100 mb-4">${result.geocache.gc_code} - ${result.geocache.name}</h3>
                
                <div class="mb-4">
                    <div class="text-sm font-medium text-gray-400 mb-1">Plugin utilisé</div>
                    <div class="text-gray-200">${result.plugin}</div>
                </div>
                
                <div class="mb-4">
                    <div class="text-sm font-medium text-gray-400 mb-1">Date d'exécution</div>
                    <div class="text-gray-200">${new Date(result.timestamp).toLocaleString()}</div>
                </div>
                
                ${result.coordinates ? `
                    <div class="mb-4 bg-gray-700/50 p-3 rounded">
                        <div class="text-sm font-medium text-gray-400 mb-1">Coordonnées détectées</div>
                        <div class="text-green-400 font-mono">${result.coordinates}</div>
                    </div>
                ` : ''}
                
                <div class="mb-4">
                    <div class="text-sm font-medium text-gray-400 mb-1">Résultat</div>
                    <pre class="text-gray-200 font-mono bg-gray-700/30 p-3 rounded overflow-x-auto whitespace-pre-wrap">${result.result}</pre>
                </div>
                
                <div class="mt-6 flex justify-end space-x-3">
                    ${result.coordinates ? `
                        <button 
                            onclick="saveCoordinates(${index}); this.parentElement.parentElement.parentElement.remove();"
                            class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium">
                            Sauvegarder les coordonnées
                        </button>
                    ` : ''}
                    <button 
                        onclick="this.parentElement.parentElement.parentElement.remove()"
                        class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium">
                        Fermer
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error("%c[MultiSolver] Erreur lors de l'affichage des détails:", "background:red; color:white", error);
        alert("Erreur lors de l'affichage des détails: " + error.message);
    }
};

// Fonction pour sauvegarder les coordonnées
window.saveCoordinates = async function(index) {
    try {
        const storedResults = sessionStorage.getItem('multiSolverResults');
        if (!storedResults) {
            alert("Aucun résultat disponible");
            return;
        }
        
        const results = JSON.parse(storedResults);
        if (!results || !results[index]) {
            alert("Résultat non trouvé");
            return;
        }
        
        const result = results[index];
        
        if (!result.coordinates) {
            alert("Aucune coordonnée disponible pour ce résultat");
            return;
        }
        
        // Envoyer les coordonnées à l'API
        const response = await fetch(`/api/geocaches/${result.geocache.id}/coordinates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                coordinates: result.coordinates,
                source: `Plugin: ${result.plugin}`
            }),
        });
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        // Afficher un message de succès
        alert(`Coordonnées sauvegardées avec succès pour ${result.geocache.gc_code} - ${result.geocache.name}`);
        
    } catch (error) {
        console.error("%c[MultiSolver] Erreur lors de la sauvegarde des coordonnées:", "background:red; color:white", error);
        alert("Erreur lors de la sauvegarde des coordonnées: " + error.message);
    }
}; 