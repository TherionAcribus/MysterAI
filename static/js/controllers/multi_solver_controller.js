// Script d'initialisation simplifié sans dépendance à Stimulus
(function() {
    console.log("%c[MultiSolver] Initialisation du script pour GoldenLayout", "background:purple; color:white");
    
    // Définir la fonction displayGeocachesList utilisée par les scripts
    window.displayGeocachesList = function(geocaches) {
        console.log("%c[MultiSolver] Affichage de la liste des géocaches:", "background:orange; color:black", geocaches.length);
        
        const geocachesListElement = document.querySelector('[data-multi-solver-target="geocachesList"]');
        const geocachesCountElement = document.querySelector('[data-multi-solver-target="geocachesCount"]');
        const geocachesDropdownButton = document.querySelector('[data-multi-solver-target="geocachesDropdownButton"]');
        
        if (!geocachesListElement) {
            console.error("%c[MultiSolver] Élément liste des géocaches non trouvé", "background:red; color:white");
            return;
        }
        
        // Mettre à jour le compteur de géocaches
        if (geocachesCountElement) {
            geocachesCountElement.textContent = geocaches && geocaches.length ? geocaches.length : 0;
        }
        
        // Mettre à jour le texte du bouton
        if (geocachesDropdownButton) {
            const cacheText = geocaches && geocaches.length > 1 ? "géocaches" : "géocache";
            geocachesDropdownButton.innerHTML = `
                <span class="mr-1">${geocaches && geocaches.length ? geocaches.length : 0} ${cacheText}</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform transform" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
            `;
        }
        
        if (!geocaches || geocaches.length === 0) {
            geocachesListElement.innerHTML = '<div class="text-gray-400">Aucune géocache sélectionnée</div>';
            return;
        }
        
        let html = '';
        geocaches.forEach((geocache, index) => {
            html += `
                <div class="geocache-item flex justify-between items-center p-2 bg-gray-700 rounded mb-2">
                    <div>
                        <div class="font-medium text-gray-200">${geocache.gc_code || 'Sans code'} - ${geocache.name || 'Géocache ' + (index + 1)}</div>
                        <div class="text-xs text-gray-400">ID: ${geocache.id}</div>
                    </div>
                    <button 
                        onclick="openGeocacheDetails(${geocache.id}, '${geocache.gc_code || ''}', '${geocache.name || ''}')"
                        class="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs">
                        Détails
                    </button>
                </div>
            `;
        });
        
        geocachesListElement.innerHTML = html;
        
        // Masquer le message d'erreur s'il est affiché
        const errorElement = document.querySelector('[data-multi-solver-target="error"]');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    };
    
    // Configurer le bouton dropdown des géocaches
    function setupGeocachesDropdown() {
        const dropdownButton = document.querySelector('[data-multi-solver-target="geocachesDropdownButton"]');
        const dropdownContent = document.querySelector('[data-multi-solver-target="geocachesList"]');
        
        if (dropdownButton && dropdownContent) {
            console.log("%c[MultiSolver] Configuration du dropdown des géocaches", "background:orange; color:black");
            
            // Masquer le contenu par défaut
            dropdownContent.classList.add('hidden');
            
            // Ajouter l'écouteur d'événement pour le basculement
            dropdownButton.addEventListener('click', function() {
                dropdownContent.classList.toggle('hidden');
                
                // Faire tourner la flèche
                const arrow = this.querySelector('svg');
                if (arrow) {
                    if (dropdownContent.classList.contains('hidden')) {
                        arrow.classList.remove('rotate-180');
                    } else {
                        arrow.classList.add('rotate-180');
                    }
                }
            });
        }
    }
    
    // Écouter l'événement d'injection de géocaches
    document.addEventListener('geocachesInjected', function(event) {
        console.log("%c[MultiSolver] Événement geocachesInjected reçu:", "background:purple; color:white", event.detail);
        
        if (event.detail && event.detail.geocaches && Array.isArray(event.detail.geocaches)) {
            console.log(`%c[MultiSolver] ${event.detail.geocaches.length} géocaches reçues via événement`, "background:green; color:white");
            // Stocker les géocaches pour une utilisation ultérieure
            window.injectedGeocaches = event.detail.geocaches;
            displayGeocachesList(event.detail.geocaches);
            
            // Stocker pour une utilisation future
            try {
                sessionStorage.setItem('multiSolverGeocaches', JSON.stringify(event.detail.geocaches));
            } catch (e) {
                console.warn("%c[MultiSolver] Impossible de stocker les géocaches dans sessionStorage", "background:orange; color:black");
            }
        }
    });
    
    // Variable pour suivre l'état de traitement
    window.isPluginExecutionRunning = false;
    
    // Fonction pour charger les plugins
    async function fetchPlugins(container) {
        try {
            console.log("%c[MultiSolver] Chargement des plugins via fetch API", "background:orange; color:black");
            
            // Afficher un loader
            container.innerHTML = `
                <div class="animate-pulse">
                    <div class="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div class="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                    <div class="h-4 bg-gray-700 rounded w-2/3"></div>
                </div>
            `;
            
            // Rendre la barre de recherche visible
            const searchContainer = document.getElementById('plugin-search-container');
            if (searchContainer) {
                searchContainer.style.display = 'block';
            }
            
            // Modifier le bouton de rafraîchissement
            const reloadButton = document.getElementById('reload-plugins-button');
            if (reloadButton) {
                reloadButton.innerHTML = '<i class="fas fa-sync-alt mr-1"></i> Rafraîchir';
                reloadButton.onclick = function() {
                    console.log("%c[MultiSolver] Rafraîchissement des plugins", "background:orange; color:black");
                    fetchPlugins(container);
                };
            }
            
            // Appel à l'API
            const response = await fetch('/api/plugins?context=solver');
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const plugins = await response.json();
            console.log(`%c[MultiSolver] ${plugins.length} plugins récupérés`, "background:orange; color:black");
            
            // Fonction globale pour activer les plugins
            window.activatePluginManually = function(pluginName) {
                console.log("%c[MultiSolver] Activation du plugin:", "background:orange; color:black", pluginName);
                
                const pluginContainer = document.getElementById('plugin-list-container');
                if (pluginContainer) {
                    loadPluginInterface(pluginName, pluginContainer);
                } else {
                    console.error("%c[MultiSolver] Container de plugins non trouvé lors de l'activation", "background:red; color:white");
                }
            };
            
            // Générer le HTML pour la liste des plugins
            let pluginsHTML = '<div class="space-y-2 max-h-[400px] overflow-y-auto bg-gray-700/30 p-2 rounded">';
            plugins.forEach(plugin => {
                pluginsHTML += `
                    <div class="plugin-item flex items-center justify-between p-2 rounded-md hover:bg-gray-700 transition-colors" data-plugin-name="${plugin.name.toLowerCase()}">
                        <div>
                            <div class="font-medium text-gray-200">${plugin.name}</div>
                            <div class="text-xs text-gray-400">${plugin.description || 'Aucune description'}</div>
                        </div>
                        <div class="flex space-x-2">
                            <button 
                                onclick="window.executePluginOnAllGeocaches('${plugin.name}')"
                                class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-medium transition-colors">
                                Exécuter
                            </button>
                            <button 
                                onclick="window.activatePluginManually('${plugin.name}')"
                                class="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-medium transition-colors">
                                Configurer
                            </button>
                        </div>
                    </div>
                `;
            });
            pluginsHTML += '</div>';
            
            // Mettre à jour le container
            container.innerHTML = pluginsHTML;
            container.setAttribute('data-loaded', 'true');
            
            // Configurer la recherche
            setupSearchFunctionality(container);
            
        } catch (error) {
            console.error("%c[MultiSolver] Erreur lors du chargement des plugins:", "background:red; color:white", error);
            container.innerHTML = `
                <div class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                    Erreur lors du chargement des plugins: ${error.message}
                </div>
            `;
        }
    }
    
    // Exécution d'un plugin sur toutes les géocaches
    window.executePluginOnAllGeocaches = async function(pluginName) {
        console.log("%c[MultiSolver] Exécution du plugin sur toutes les géocaches:", "background:green; color:white", pluginName);
        
        // Si un traitement est déjà en cours, éviter de le relancer
        if (window.isPluginExecutionRunning) {
            showMessage("Un traitement est déjà en cours. Veuillez patienter ou l'arrêter.");
            return;
        }
        
        // Récupérer les géocaches
        const geocaches = getGeocaches();
        
        if (!geocaches || geocaches.length === 0) {
            showError("Aucune géocache sélectionnée pour l'exécution du plugin.");
            return;
        }
        
        // Marquer le début du traitement
        window.isPluginExecutionRunning = true;
        
        // Vérifier si on doit appliquer à toutes les géocaches
        const applyToAll = document.getElementById('plugin-apply-to-all').checked;
        
        // Préparation du tableau de résultats
        const resultsTable = document.querySelector('[data-multi-solver-target="resultsTable"]');
        const geocachesToProcess = applyToAll ? geocaches : [geocaches[0]];
        
        if (resultsTable) {
            // Créer la barre de progression et le bouton d'arrêt
            let progressHTML = `
                <tr class="bg-gray-900">
                    <td colspan="5" class="px-6 py-3">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center">
                                <div class="mr-4">
                                    <span id="progress-count">0</span> / <span id="progress-total">${geocachesToProcess.length}</span>
                                </div>
                                <div class="w-64 bg-gray-700 rounded-full h-2.5">
                                    <div id="progress-bar" class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
                                </div>
                            </div>
                            <button 
                                id="stop-execution-button"
                                class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs flex items-center"
                                onclick="window.stopPluginExecution()">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Arrêter
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            
            // Tableau vide pour les résultats
            resultsTable.innerHTML = progressHTML;
        }
        
        // Préparer le tableau de résultats
        let results = [];
        
        try {
            let processedCount = 0;
            
            // Traitement des géocaches
            for (const geocache of geocachesToProcess) {
                // Vérifier si le traitement a été arrêté
                if (!window.isPluginExecutionRunning) {
                    console.log("%c[MultiSolver] Traitement arrêté par l'utilisateur", "background:orange; color:black");
                    showMessage("Traitement arrêté");
                    break;
                }
                
                // Exécuter le plugin pour cette géocache
                try {
                    const result = await executePlugin(pluginName, geocache);
                    
                    // Ajouter le résultat à notre tableau de résultats
                    results.push({
                        geocache: geocache,
                        result: result
                    });
                    
                    // Mettre à jour le tableau progressivement
                    updateResultsTable(results, true);
                    
                    // Mettre à jour la progression
                    processedCount++;
                    document.getElementById('progress-count').textContent = processedCount;
                    
                    // Mettre à jour la barre de progression
                    const progressPercent = (processedCount / geocachesToProcess.length) * 100;
                    document.getElementById('progress-bar').style.width = `${progressPercent}%`;
                    
                } catch (error) {
                    console.error("%c[MultiSolver] Erreur lors de l'exécution du plugin sur la géocache:", "background:red; color:white", {
                        plugin: pluginName,
                        geocache: geocache,
                        error: error
                    });
                    
                    // Ajouter une entrée d'erreur au tableau
                    results.push({
                        geocache: geocache,
                        error: error.message
                    });
                    
                    // Mettre à jour le tableau avec l'erreur
                    updateResultsTable(results, true);
                    
                    // Mettre à jour la progression même en cas d'erreur
                    processedCount++;
                    document.getElementById('progress-count').textContent = processedCount;
                    const progressPercent = (processedCount / geocachesToProcess.length) * 100;
                    document.getElementById('progress-bar').style.width = `${progressPercent}%`;
                }
            }
            
            // Finaliser le tableau des résultats
            updateResultsTable(results, false);
            
        } catch (error) {
            console.error("%c[MultiSolver] Erreur lors de l'exécution du plugin:", "background:red; color:white", error);
            showError(`Erreur lors de l'exécution du plugin: ${error.message}`);
        } finally {
            // Marquer la fin du traitement
            window.isPluginExecutionRunning = false;
        }
    };
    
    // Fonction pour arrêter l'exécution en cours
    window.stopPluginExecution = function() {
        if (window.isPluginExecutionRunning) {
            window.isPluginExecutionRunning = false;
            console.log("%c[MultiSolver] Arrêt du traitement demandé", "background:orange; color:black");
        }
    };
    
    // Exécution d'un plugin sur une géocache spécifique
    async function executePlugin(pluginName, geocache) {
        console.log("%c[MultiSolver] Exécution du plugin sur la géocache:", "background:orange; color:black", {
            plugin: pluginName,
            geocache: geocache
        });
        
        // Pour l'instant, un exemple de données d'entrée
        const inputs = {
            text: geocache.name || '', // On utilise le nom de la géocache comme texte d'entrée
            geocache_id: geocache.id,
            gc_code: geocache.gc_code || '',
            enable_gps_detection: true
        };
        
        // Appel à l'API pour exécuter le plugin
        const response = await fetch(`/api/plugins/${pluginName}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(inputs)
        });
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        return await response.json();
    }
    
    // Mise à jour du tableau des résultats
    function updateResultsTable(results, keepProgressBar = false) {
        console.log("%c[MultiSolver] Mise à jour du tableau des résultats:", "background:orange; color:black", results);
        
        const resultsTable = document.querySelector('[data-multi-solver-target="resultsTable"]');
        
        if (!resultsTable) {
            console.error("%c[MultiSolver] Tableau des résultats non trouvé", "background:red; color:white");
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
        
        // Si on veut garder la barre de progression, l'extraire d'abord
        if (keepProgressBar) {
            const progressRow = resultsTable.querySelector('tr:first-child');
            if (progressRow && progressRow.classList.contains('bg-gray-900')) {
                html = progressRow.outerHTML;
            }
        }
        
        results.forEach(item => {
            const geocache = item.geocache;
            
            // Vérifier si c'est une erreur
            if (item.error) {
                html += `
                    <tr class="hover:bg-gray-700/50 bg-red-900/30">
                        <td class="px-6 py-4 whitespace-nowrap">
                            ${geocache.gc_code || 'N/A'}
                        </td>
                        <td class="px-6 py-4">
                            ${geocache.name || 'N/A'}
                        </td>
                        <td class="px-6 py-4 text-red-300" colspan="2">
                            <div class="text-sm">Erreur: ${item.error}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button 
                                onclick="window.openGeocacheDetails(${geocache.id}, '${geocache.gc_code || ''}', '${geocache.name || ''}')"
                                class="text-blue-400 hover:text-blue-300">
                                Détails
                            </button>
                        </td>
                    </tr>
                `;
                return;
            }
            
            const result = item.result;
            
            // Récupérer les coordonnées si disponibles
            let coordsText = 'Non détecté';
            let certitude = false;
            
            if (result.coordinates && result.coordinates.exist) {
                coordsText = result.coordinates.ddm || 'Format inconnu';
                certitude = result.coordinates.certitude || false;
            }
            
            // Récupérer le texte de sortie
            let detectionText = 'Aucun résultat';
            
            if (result.result && result.result.text && result.result.text.text_output) {
                detectionText = result.result.text.text_output;
            }
            
            // Tronquer les textes trop longs
            const maxTextLength = 50;
            if (detectionText.length > maxTextLength) {
                detectionText = detectionText.substring(0, maxTextLength) + '...';
            }
            
            html += `
                <tr class="hover:bg-gray-700/50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        ${geocache.gc_code || 'N/A'}
                    </td>
                    <td class="px-6 py-4">
                        ${geocache.name || 'N/A'}
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm text-gray-300">${detectionText}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex items-center">
                            <span class="mr-2 ${certitude ? 'text-green-400' : 'text-yellow-400'}">
                                <i class="fas ${certitude ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                            </span>
                            <span>${coordsText}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                            onclick="window.openGeocacheDetails(${geocache.id}, '${geocache.gc_code || ''}', '${geocache.name || ''}')"
                            class="text-blue-400 hover:text-blue-300">
                            Détails
                        </button>
                    </td>
                </tr>
            `;
        });
        
        resultsTable.innerHTML = html;
    }
    
    // Récupérer les géocaches depuis toutes les sources possibles
    function getGeocaches() {
        // Vérifier d'abord si des géocaches ont déjà été injectées
        if (window.injectedGeocaches && Array.isArray(window.injectedGeocaches) && window.injectedGeocaches.length > 0) {
            return window.injectedGeocaches;
        }
        
        // Sinon, essayer de récupérer depuis le sessionStorage
        const storedGeocaches = sessionStorage.getItem('multiSolverGeocaches');
        if (storedGeocaches) {
            try {
                return JSON.parse(storedGeocaches);
            } catch (error) {
                console.error("%c[MultiSolver] Erreur lors du décodage du sessionStorage:", "background:red; color:white", error);
            }
        }
        
        // En dernier recours, essayer l'attribut data
        const container = document.getElementById('multi-solver-container');
        if (container && container.dataset.geocaches) {
            try {
                return JSON.parse(container.dataset.geocaches);
            } catch (error) {
                console.error("%c[MultiSolver] Erreur lors du décodage de data-geocaches:", "background:red; color:white", error);
            }
        }
        
        return [];
    }
    
    // Configurer la fonctionnalité de recherche
    function setupSearchFunctionality(pluginContainer) {
        const searchInput = document.getElementById('plugin-search-input');
        if (searchInput) {
            console.log("%c[MultiSolver] Configuration de la recherche de plugins", "background:orange; color:black");
            
            searchInput.addEventListener('input', function(event) {
                const searchTerm = event.target.value.toLowerCase();
                console.log("%c[MultiSolver] Recherche de plugins avec terme:", "background:orange; color:black", searchTerm);
                const pluginItems = document.querySelectorAll('.plugin-item');
                
                pluginItems.forEach(item => {
                    const pluginName = item.dataset.pluginName;
                    if (pluginName && pluginName.includes(searchTerm)) {
                        item.style.display = '';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        }
    }
    
    // Fonction principale d'initialisation
    function initialize() {
        console.log("%c[MultiSolver] Démarrage de l'initialisation", "background:orange; color:black");
        
        // Configurer le dropdown des géocaches
        setupGeocachesDropdown();
        
        // Charger les géocaches
        loadGeocaches();
        
        // Configurer les plugins
        const pluginContainer = document.getElementById('plugin-list-container');
        if (pluginContainer) {
            fetchPlugins(pluginContainer);
        } else {
            console.error("%c[MultiSolver] Container de plugins non trouvé", "background:red; color:white");
        }
    }
    
    // Charger les géocaches depuis toutes les sources disponibles
    function loadGeocaches() {
        console.log("%c[MultiSolver] Chargement des géocaches", "background:orange; color:black; font-weight:bold");
        
        // Vérifier d'abord si des géocaches ont déjà été injectées par l'événement
        if (window.injectedGeocaches && Array.isArray(window.injectedGeocaches) && window.injectedGeocaches.length > 0) {
            console.log(`%c[MultiSolver] Utilisation des ${window.injectedGeocaches.length} géocaches déjà injectées`, "background:green; color:white");
            displayGeocachesList(window.injectedGeocaches);
            return;
        }
        
        // Essayer de récupérer les géocaches du sessionStorage
        let geocaches = null;
        const storedGeocaches = sessionStorage.getItem('multiSolverGeocaches');
        
        if (storedGeocaches) {
            try {
                geocaches = JSON.parse(storedGeocaches);
                console.log(`%c[MultiSolver] ${geocaches.length} géocaches chargées depuis sessionStorage`, "background:green; color:white");
            } catch (error) {
                console.error("%c[MultiSolver] Erreur lors du décodage du sessionStorage:", "background:red; color:white", error);
            }
        }
        
        // Chercher dans l'attribut data du container
        if (!geocaches) {
            const container = document.getElementById('multi-solver-container');
            if (container && container.dataset.geocaches) {
                try {
                    geocaches = JSON.parse(container.dataset.geocaches);
                    console.log(`%c[MultiSolver] ${geocaches.length} géocaches chargées depuis data-geocaches`, "background:green; color:white");
                } catch (error) {
                    console.error("%c[MultiSolver] Erreur lors du décodage de data-geocaches:", "background:red; color:white", error);
                }
            }
        }
        
        // Vérifier si on a trouvé des géocaches
        if (geocaches && Array.isArray(geocaches) && geocaches.length > 0) {
            console.log("%c[MultiSolver] Géocaches trouvées:", "background:green; color:white", geocaches);
            displayGeocachesList(geocaches);
            
            // Stocker pour une utilisation future
            try {
                sessionStorage.setItem('multiSolverGeocaches', JSON.stringify(geocaches));
            } catch (e) {
                console.warn("%c[MultiSolver] Impossible de stocker les géocaches dans sessionStorage", "background:orange; color:black");
            }
        } else {
            console.warn("%c[MultiSolver] Aucune géocache trouvée", "background:orange; color:black");
            const geocachesListElement = document.querySelector('[data-multi-solver-target="geocachesList"]');
            if (geocachesListElement) {
                geocachesListElement.innerHTML = '<div class="text-gray-400">Aucune géocache sélectionnée</div>';
                showError("Aucune géocache spécifiée. Vous pouvez quand même utiliser les plugins mais aucun traitement ne sera appliqué.");
            }
        }
    }
    
    // Fonction pour ouvrir les détails d'une géocache
    window.openGeocacheDetails = function(geocacheId, gcCode, name) {
        console.log("%c[MultiSolver] Ouverture des détails de la géocache:", "background:orange; color:black", {
            geocacheId, gcCode, name
        });
        
        // Envoyer un message au parent pour ouvrir les détails de la géocache
        window.parent.postMessage({
            type: 'openGeocacheDetails',
            geocacheId: geocacheId,
            gcCode: gcCode,
            name: name
        }, '*');
    };
    
    // Afficher un message d'erreur
    function showError(message) {
        const errorElement = document.querySelector('[data-multi-solver-target="error"]');
        if (errorElement) {
            errorElement.classList.remove('hidden');
            errorElement.querySelector('div').textContent = message;
        } else {
            console.error("%c[MultiSolver] Message d'erreur non affiché (élément manquant):", "background:red; color:white", message);
        }
    }
    
    // Afficher un message temporaire
    function showMessage(message) {
        console.log("%c[MultiSolver] Message:", "background:orange; color:black", message);
        
        // Créer un élément de message s'il n'existe pas
        let messageElement = document.getElementById('multi-solver-message');
        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.id = 'multi-solver-message';
            messageElement.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-50 transform transition-transform duration-300 translate-y-0';
            document.body.appendChild(messageElement);
        }
        
        // Afficher le message
        messageElement.textContent = message;
        messageElement.classList.remove('translate-y-[-100px]');
        
        // Masquer le message après 3 secondes
        setTimeout(() => {
            messageElement.classList.add('translate-y-[-100px]');
        }, 3000);
    }
    
    // Fonction pour charger l'interface du plugin
    window.loadPluginInterface = async function(pluginName, container) {
        try {
            console.log("%c[MultiSolver] Chargement de l'interface du plugin:", "background:orange; color:black", pluginName);
            
            // Cacher la barre de recherche
            const searchContainer = document.getElementById('plugin-search-container');
            if (searchContainer) {
                searchContainer.style.display = 'none';
            }
            
            // Modifier le bouton de rafraîchissement pour un bouton Retour
            const reloadButton = document.getElementById('reload-plugins-button');
            if (reloadButton) {
                reloadButton.innerHTML = '<i class="fas fa-arrow-left mr-1"></i> Retour';
                reloadButton.onclick = window.closePluginInterface;
            }
            
            // Afficher un loader
            container.innerHTML = `
                <div class="animate-pulse">
                    <div class="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div class="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                    <div class="h-4 bg-gray-700 rounded w-2/3"></div>
                </div>
            `;
            
            // Charger l'interface du plugin
            const response = await fetch(`/api/plugins/${pluginName}/interface?context=solver`);
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const pluginInterface = await response.text();
            
            // Préparer le conteneur pour l'interface du plugin
            container.innerHTML = `
                <div class="plugin-interface bg-gray-700/30 p-4 rounded">
                    <h3 class="text-lg font-semibold text-gray-100 mb-3">${pluginName}</h3>
                    <div class="plugin-content">${pluginInterface}</div>
                </div>
            `;
            
            // Initialiser les scripts du plugin
            const scripts = container.querySelectorAll('script');
            scripts.forEach(script => {
                if (script.src) {
                    const newScript = document.createElement('script');
                    newScript.src = script.src;
                    document.body.appendChild(newScript);
                } else {
                    eval(script.innerText);
                }
            });
            
        } catch (error) {
            console.error("%c[MultiSolver] Erreur lors du chargement de l'interface du plugin:", "background:red; color:white", error);
            container.innerHTML = `
                <div class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-3">
                    Erreur lors du chargement de l'interface du plugin: ${error.message}
                </div>
            `;
        }
    };
    
    // Fonction pour fermer l'interface du plugin et revenir à la liste
    window.closePluginInterface = function() {
        console.log("%c[MultiSolver] Fermeture de l'interface du plugin", "background:orange; color:black");
        
        const pluginContainer = document.getElementById('plugin-list-container');
        if (pluginContainer) {
            // Recharger la liste des plugins
            fetchPlugins(pluginContainer);
        } else {
            console.error("%c[MultiSolver] Container de plugins non trouvé lors de la fermeture", "background:red; color:white");
        }
    };
    
    // Initialiser après un court délai pour s'assurer que le DOM est complètement chargé
    setTimeout(initialize, 200);
})();