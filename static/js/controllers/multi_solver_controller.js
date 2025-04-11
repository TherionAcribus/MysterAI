// Script d'initialisation simplifié sans dépendance à Stimulus
(function() {
    console.log("%c[MultiSolver] Initialisation du script pour GoldenLayout", "background:purple; color:white");
    
    // Initialiser le pont d'événements global pour la communication cross-iframe
    (function initializeGlobalEventBridge() {
        // Créer un pont d'événements global
        window.MysteryAIEventBridge = window.MysteryAIEventBridge || {
            dispatchGlobalEvent: function(eventName, detail) {
                console.log(`%c[EventBridge] Envoi événement global ${eventName}:`, "color:purple", detail);
                
                // 1. Dispatcher dans la fenêtre actuelle
                window.dispatchEvent(new CustomEvent(eventName, { detail }));
                
                // 2. Dispatcher vers le parent si nous sommes dans une iframe
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({
                        type: 'mystery-event-bridge',
                        eventName: eventName,
                        detail: detail
                    }, '*');
                }
                
                // 3. Dispatcher vers toutes les iframes dans cette fenêtre
                try {
                    if (window.frames && window.frames.length > 0) {
                        for (let i = 0; i < window.frames.length; i++) {
                            window.frames[i].postMessage({
                                type: 'mystery-event-bridge',
                                eventName: eventName,
                                detail: detail
                            }, '*');
                        }
                    }
                } catch (e) {
                    console.error("[EventBridge] Erreur lors de l'envoi aux iframes:", e);
                }
            }
        };
        
        // Écouter les messages pour le pont d'événements
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'mystery-event-bridge') {
                console.log(`%c[EventBridge] Réception message ${event.data.eventName}:`, "color:purple", event.data.detail);
                window.dispatchEvent(new CustomEvent(event.data.eventName, { 
                    detail: event.data.detail 
                }));
            }
        });
        
        console.log("%c[EventBridge] Pont d'événements global initialisé", "color:green");
    })();

    // Définir window.results s'il n'existe pas encore
    window.results = window.results || [];
    
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
    
    // Variable globale pour le tableau des résultats
    window.resultsTable = null;
    
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
            
            // Essayer d'abord l'endpoint principal
            console.log("%c[MultiSolver] Tentative avec l'endpoint principal: /api/plugins?context=solver", "background:blue; color:white");
            let response;
            let plugins = [];
            
            try {
                // Appel à l'API principale
                response = await fetch('/api/plugins?context=solver');
                
                if (!response.ok) {
                    console.warn("%c[MultiSolver] L'endpoint principal a échoué, code:", "background:orange; color:black", response.status);
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                
                plugins = await response.json();
                console.log("%c[MultiSolver] Données reçues de l'endpoint principal:", "background:blue; color:white", plugins);
                
            } catch (mainError) {
                console.warn("%c[MultiSolver] Erreur avec l'endpoint principal:", "background:orange; color:black", mainError);
                
                // Si ça échoue, essayer l'endpoint alternatif
                console.log("%c[MultiSolver] Tentative avec l'endpoint alternatif: /api/solver/plugins", "background:blue; color:white");
                try {
                    response = await fetch('/api/solver/plugins');
                    
                    if (!response.ok) {
                        console.warn("%c[MultiSolver] L'endpoint alternatif a également échoué, code:", "background:orange; color:black", response.status);
                        throw mainError; // Re-throw the original error
                    }
                    
                    // Traiter la réponse HTML
                    const html = await response.text();
                    console.log("%c[MultiSolver] Réponse HTML reçue, longueur:", "background:blue; color:white", html.length);
                    
                    // Créer un div temporaire pour parser le HTML
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = html;
                    
                    // Extraire les plugins des éléments avec des data attributes
                    const pluginElements = tempDiv.querySelectorAll('[data-plugin-id]');
                    plugins = Array.from(pluginElements).map(el => ({
                        id: el.dataset.pluginId,
                        name: el.dataset.pluginName,
                        description: el.dataset.pluginDescription || 'Aucune description'
                    }));
                    
                    console.log("%c[MultiSolver] Plugins extraits de l'HTML:", "background:blue; color:white", plugins);
                    
                } catch (altError) {
                    console.error("%c[MultiSolver] Les deux endpoints ont échoué:", "background:red; color:white", {
                        mainError,
                        altError
                    });
                    throw mainError; // Réutiliser l'erreur principale
                }
            }
            
            console.log(`%c[MultiSolver] ${plugins.length} plugins récupérés`, "background:orange; color:black", plugins);
            
            // Si aucun plugin trouvé, proposer des plugins de test
            if (!plugins || plugins.length === 0) {
                console.warn("%c[MultiSolver] Aucun plugin trouvé, ajout de plugins de test pour debug", "background:orange; color:black");
                plugins = [
                    {
                        id: 'test1',
                        name: 'coordinates_finder',
                        description: 'Détecteur de coordonnées GPS (DEBUG)'
                    },
                    {
                        id: 'test2',
                        name: 'formula_parser',
                        description: 'Analyseur de formules mathématiques (DEBUG)'
                    },
                    {
                        id: 'test3',
                        name: 'analysis_web_page',
                        description: 'Analyse complète de page (DEBUG)'
                    }
                ];
            }
            
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
                    <p class="mt-2 text-xs">Essayez de rafraîchir la page ou vérifiez que le serveur est bien démarré.</p>
                    <button 
                        onclick="window.location.reload()"
                        class="mt-3 px-3 py-1 bg-red-700 hover:bg-red-800 text-white rounded-md text-xs font-medium transition-colors">
                        Rafraîchir la page
                    </button>
                </div>
            `;
        }
    }
    
    // Exécution d'un plugin sur toutes les géocaches
    window.executePluginOnAllGeocaches = async function(pluginName) {
        console.log("%c[MultiSolver] Redirection vers la nouvelle implémentation pour l'exécution du plugin:", "background:green; color:white", pluginName);
        
        // Appeler directement la nouvelle implémentation qui utilise executePluginOnGeocache
        return await window.executePluginForAll(pluginName);
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
        
        // Préparer les données d'entrée en fonction du plugin
        let inputs = {
            text: geocache.name || '', // On utilise le nom de la géocache comme texte d'entrée par défaut
            geocache_id: geocache.id, // Toujours envoyer l'ID, certains plugins en ont besoin (comme analysis_web_page)
            gc_code: geocache.gc_code || '',
            enable_gps_detection: true
        };
        
        // Pour le plugin analysis_web_page, s'assurer que l'ID de la géocache est correctement transmis
        // et ajouter _format: 'json' pour s'assurer de recevoir une réponse JSON
        if (pluginName === "analysis_web_page") {
            console.log("%c[MultiSolver] Utilisation du plugin analysis_web_page avec l'ID de géocache", "background:orange; color:black", geocache.id);
            inputs._format = 'json';
        }
        
        try {
            console.log("%c[MultiSolver] Envoi des données:", "background:blue; color:white", inputs);
            
            // Pour le méta-plugin analysis_web_page, utiliser XMLHttpRequest au lieu de fetch
            // car il semble y avoir un problème avec la réponse fetch
            if (pluginName === "analysis_web_page") {
                return new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', `/api/plugins/${pluginName}/execute`);
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    xhr.setRequestHeader('Accept', 'application/json');
                    
                    xhr.onload = () => {
                        if (xhr.status === 200) {
                            try {
                                const data = JSON.parse(xhr.responseText);
                                console.log("%c[MultiSolver] Réponse XHR reçue:", "background:blue; color:white", data);
                                resolve(normalizePluginResults(pluginName, data));
                            } catch (e) {
                                console.error("%c[MultiSolver] Erreur de parsing JSON:", "background:red; color:white", e);
                                console.error("%c[MultiSolver] Texte brut reçu:", "background:red; color:white", xhr.responseText.substring(0, 500) + (xhr.responseText.length > 500 ? '...' : ''));
                                
                                // Créer un résultat d'erreur standardisé
                                resolve({
                                    mainDetection: {
                                        text: "Erreur: Impossible de parser la réponse JSON",
                                        coordinates: { exist: false }
                                    },
                                    detailedResults: [{
                                        source: `Erreur ${pluginName}`,
                                        sourceId: pluginName,
                                        details: {
                                            error: e.message,
                                            rawResponse: xhr.responseText.substring(0, 200) + (xhr.responseText.length > 200 ? '...' : '')
                                        }
                                    }]
                                });
                            }
                        } else {
                            console.error("%c[MultiSolver] Erreur HTTP:", "background:red; color:white", xhr.status, xhr.statusText);
                            resolve({
                                mainDetection: {
                                    text: `Erreur: ${xhr.status} ${xhr.statusText}`,
                                    coordinates: { exist: false }
                                },
                                detailedResults: [{
                                    source: `Erreur ${pluginName}`,
                                    sourceId: pluginName,
                                    details: {
                                        error: `Erreur HTTP: ${xhr.status}`,
                                        statusText: xhr.statusText
                                    }
                                }]
                            });
                        }
                    };
                    
                    xhr.onerror = (e) => {
                        console.error("%c[MultiSolver] Erreur réseau:", "background:red; color:white", e);
                        resolve({
                            mainDetection: {
                                text: "Erreur: Problème de connexion au serveur",
                                coordinates: { exist: false }
                            },
                            detailedResults: [{
                                source: `Erreur ${pluginName}`,
                                sourceId: pluginName,
                                details: {
                                    error: "Erreur réseau"
                                }
                            }]
                        });
                    };
                    
                    xhr.send(JSON.stringify(inputs));
                });
            }
            
            // Pour les autres plugins, continuer à utiliser fetch
            const response = await fetch(`/api/plugins/${pluginName}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(inputs)
            });
            
            if (!response.ok) {
                // Récupérer le texte brut de la réponse pour le diagnostic
                const responseText = await response.text();
                console.error("%c[MultiSolver] Erreur HTTP:", "background:red; color:white", {
                    status: response.status,
                    statusText: response.statusText,
                    responseText: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : '')
                });
                
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            // Récupérer la réponse sous forme de texte d'abord pour vérification
            const responseText = await response.text();
            
            // Vérifier si la réponse ressemble à du HTML au lieu du JSON
            if (responseText.trim().startsWith('<')) {
                console.error("%c[MultiSolver] Erreur: La réponse est du HTML au lieu du JSON attendu", "background:red; color:white");
                console.error("%c[MultiSolver] Réponse HTML:", "background:red; color:white", responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
                
                // Créer un résultat d'erreur standardisé
                return {
                    mainDetection: {
                        text: "Erreur: Réponse HTML inattendue",
                        coordinates: { exist: false }
                    },
                    detailedResults: [{
                        source: `Erreur ${pluginName}`,
                        sourceId: pluginName,
                        details: {
                            error: "Le serveur a renvoyé du HTML au lieu du JSON attendu",
                            htmlResponse: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '')
                        }
                    }]
                };
            }
            
            // Convertir en JSON
            let rawResult;
            try {
                rawResult = JSON.parse(responseText);
            } catch (e) {
                console.error("%c[MultiSolver] Erreur de parsing JSON:", "background:red; color:white", e);
                console.error("%c[MultiSolver] Texte brut reçu:", "background:red; color:white", responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
                
                // Créer un résultat d'erreur standardisé
                return {
                    mainDetection: {
                        text: "Erreur: Impossible de parser la réponse JSON",
                        coordinates: { exist: false }
                    },
                    detailedResults: [{
                        source: `Erreur ${pluginName}`,
                        sourceId: pluginName,
                        details: {
                            error: e.message,
                            rawResponse: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '')
                        }
                    }]
                };
            }
            
            // Log du résultat brut pour debug
            console.log("%c[MultiSolver] Résultat brut:", "background:blue; color:white", rawResult);
            
            // Normaliser le résultat pour un traitement uniforme
            return normalizePluginResults(pluginName, rawResult);
            
        } catch (error) {
            console.error("%c[MultiSolver] Erreur lors de l'exécution du plugin:", "background:red; color:white", error);
            
            // Retourner un résultat d'erreur standardisé
            return {
                mainDetection: {
                    text: `Erreur: ${error.message}`,
                    coordinates: { exist: false }
                },
                detailedResults: [{
                    source: `Erreur ${pluginName}`,
                    sourceId: pluginName,
                    details: {
                        error: error.message
                    }
                }]
            };
        }
    }
    
    // Fonction pour normaliser les résultats de plugins (simples ou méta)
    function normalizePluginResults(pluginName, result) {
        console.log("%c[MultiSolver] Normalisation des résultats:", "background:purple; color:white", { pluginName, result });
        
        // Structure standard pour tous les résultats
        const standardResult = {
            mainDetection: {
                text: "Aucun résultat",
                coordinates: { exist: false }
            },
            detailedResults: []
        };
        
        // En cas de résultat vide ou invalide
        if (!result || typeof result !== 'object') {
            console.warn("%c[MultiSolver] Résultat invalide ou vide:", "background:orange; color:black", result);
            return standardResult;
        }
        
        // Cas des méta-plugins (comme analysis_web_page)
        if (result.combined_results) {
            console.log("%c[MultiSolver] Traitement des résultats combinés:", "background:purple; color:white", result.combined_results);
            
            // Vérifier que combined_results est un objet et non une chaîne
            let combinedResults = result.combined_results;
            if (typeof combinedResults === 'string') {
                try {
                    combinedResults = JSON.parse(combinedResults);
                    console.log("%c[MultiSolver] combined_results parsé depuis string:", "background:purple; color:white", combinedResults);
                } catch (e) {
                    console.error("%c[MultiSolver] Erreur lors du parsing de combined_results en string:", "background:red; color:white", e);
                    return standardResult;
                }
            }
            
            // Si combinedResults est toujours pas un objet, traitement impossible
            if (typeof combinedResults !== 'object' || combinedResults === null) {
                console.error("%c[MultiSolver] combined_results n'est pas un objet valide après traitement:", "background:red; color:white", combinedResults);
                return standardResult;
            }
            
            // Récupérer les coordonnées principales si disponibles
            if (result.primary_coordinates) {
                console.log("%c[MultiSolver] Coordonnées principales trouvées:", "background:green; color:white", result.primary_coordinates);
                
                // Chercher les coordonnées DDM dans les sous-plugins
                let ddmCoordinates = null;
                for (const [subPluginName, subResult] of Object.entries(combinedResults)) {
                    if (subResult && subResult.coordinates && subResult.coordinates.exist) {
                        if (subResult.coordinates.ddm) {
                            ddmCoordinates = {
                                ddm: subResult.coordinates.ddm,
                                source: subPluginName
                            };
                            break;
                        } else if (subResult.coordinates.ddm_lat && subResult.coordinates.ddm_lon) {
                            ddmCoordinates = {
                                ddm: `${subResult.coordinates.ddm_lat} ${subResult.coordinates.ddm_lon}`,
                                source: subPluginName
                            };
                            break;
                        }
                    }
                }
                
                // Si on a des coordonnées DDM et des coordonnées décimales, les combiner
                if (ddmCoordinates) {
                    standardResult.mainDetection = {
                        text: `Coordonnées détectées par ${ddmCoordinates.source}`,
                        coordinates: {
                            exist: true,
                            ddm: ddmCoordinates.ddm,
                            decimal: result.primary_coordinates,
                            certitude: true,
                            source: ddmCoordinates.source
                        }
                    };
                    console.log("%c[MultiSolver] Coordonnées combinées:", "background:green; color:white", standardResult.mainDetection.coordinates);
                } else {
                    // Sinon, utiliser uniquement les coordonnées décimales
                    standardResult.mainDetection = {
                        text: "Coordonnées décimales détectées",
                        coordinates: {
                            exist: true,
                            ddm: "Format décimal uniquement",
                            decimal: result.primary_coordinates,
                            certitude: true,
                            source: "analysis_web_page"
                        }
                    };
                    console.log("%c[MultiSolver] Utilisation des coordonnées décimales uniquement:", "background:green; color:white", standardResult.mainDetection.coordinates);
                }
            }
            
            // Extraire les résultats principaux des sous-plugins et les ajouter comme détails
            for (const [subPluginName, subResult] of Object.entries(combinedResults)) {
                if (!subResult) continue;
                
                console.log("%c[MultiSolver] Résultat du sous-plugin:", "background:purple; color:white", { subPluginName, subResult });
                
                // Ajouter ce sous-résultat aux détails
                standardResult.detailedResults.push({
                    source: getPluginReadableName(subPluginName),
                    sourceId: subPluginName,
                    details: subResult
                });
                
                // Si on a déjà des coordonnées principales, ne pas les remplacer
                if (standardResult.mainDetection.coordinates.exist) continue;
                
                // Extraire les coordonnées si présentes
                const coordinates = extractCoordinates(subResult);
                
                // Si ce sous-plugin a détecté des coordonnées valides, les considérer
                // comme résultat principal si on n'en a pas déjà ou si elles sont plus fiables
                if (coordinates && coordinates.exist && 
                    (!standardResult.mainDetection.coordinates.exist || 
                     (coordinates.certitude && !standardResult.mainDetection.coordinates.certitude))) {
                    
                    standardResult.mainDetection = {
                        text: `${getPluginReadableName(subPluginName)}: détection réussie`,
                        coordinates: coordinates,
                        source: subPluginName
                    };
                }
            }
            
            // Si on a plusieurs sous-résultats, modifier légèrement le texte
            if (standardResult.detailedResults.length > 1 && standardResult.mainDetection.coordinates.exist) {
                standardResult.mainDetection.text = `${standardResult.mainDetection.text} (+ ${standardResult.detailedResults.length - 1} autres analyses)`;
            }
        } 
        // Cas des plugins standards
        else {
            standardResult.mainDetection = {
                text: result.result?.text?.text_output || "Aucun résultat",
                coordinates: result.coordinates || { exist: false },
                source: pluginName
            };
            
            standardResult.detailedResults.push({
                source: getPluginReadableName(pluginName),
                sourceId: pluginName,
                details: result
            });
        }
        
        console.log("%c[MultiSolver] Résultat normalisé:", "background:purple; color:white", standardResult);
        return standardResult;
    }
    
    // Fonction pour extraire les coordonnées d'un résultat de plugin
    function extractCoordinates(result) {
        console.log("%c[MultiSolver] Extraction des coordonnées du résultat:", "background:blue; color:white", result);
        
        // Cas direct: le résultat a un objet coordinates
        if (result.coordinates) {
            if (result.coordinates.exist) {
                console.log("%c[MultiSolver] Coordonnées trouvées directement dans result.coordinates:", "background:green; color:white", result.coordinates);
                
                // Vérifier si les coordonnées décimales sont manquantes, mais que nous avons des coordonnées DDM
                if (!result.coordinates.decimal && result.coordinates.ddm) {
                    console.log("%c[MultiSolver] Conversion DDM vers décimal pour:", "background:orange; color:black", result.coordinates.ddm);
                    const decimal = convertDDMToDecimal(result.coordinates.ddm);
                    if (decimal) {
                        result.coordinates.decimal = decimal;
                        console.log("%c[MultiSolver] Coordonnées converties en décimal:", "background:green; color:white", decimal);
                    }
                }
                return result.coordinates;
            }
        }
        
        // Cas particulier: formula_parser a un format différent
        if (result.coordinates && Array.isArray(result.coordinates) && result.coordinates.length > 0) {
            const firstCoord = result.coordinates[0];
            console.log("%c[MultiSolver] Coordonnées trouvées dans formula_parser format:", "background:green; color:white", firstCoord);
            
            // Construire le format DDM
            const ddm = `${firstCoord.north} ${firstCoord.east}`;
            
            // Convertir en décimal si possible
            const decimal = convertDDMToDecimal(ddm);
            
            return {
                exist: true,
                ddm: ddm,
                decimal: decimal,
                certitude: result.certitude || true,
                source: 'formula_parser'
            };
        }
        
        // Cas particulier: color_text_detector ou text_detector avec findings contenant des coordonnées
        if (result.findings && Array.isArray(result.findings) && result.findings.length > 0) {
            // Cherchons dans les findings si des coordonnées sont présentes
            for (const finding of result.findings) {
                if (finding.content) {
                    // Expression régulière pour les coordonnées au format N 12 34.567 E 089 12.345
                    const coordRegex = /[NS]\s*\d{1,2}\s*\d{1,2}\.\d{3}\s*[EW]\s*\d{1,3}\s*\d{1,2}\.\d{3}/i;
                    const match = finding.content.match(coordRegex);
                    
                    if (match) {
                        console.log("%c[MultiSolver] Coordonnées trouvées dans les findings:", "background:green; color:white", match[0]);
                        
                        // Convertir en décimal
                        const decimal = convertDDMToDecimal(match[0]);
                        
                        return {
                            exist: true,
                            ddm: match[0],
                            decimal: decimal,
                            certitude: finding.isInteresting || true,
                            source: 'finding'
                        };
                    }
                }
            }
        }
        
        // Cas particulier: html_comments_finder
        if (result.findings && Array.isArray(result.findings)) {
            for (const finding of result.findings) {
                if (finding.content) {
                    // Expression régulière pour les coordonnées au format N 12 34.567 E 089 12.345
                    const coordRegex = /[NS]\s*\d{1,2}\s*\d{1,2}\.\d{3}\s*[EW]\s*\d{1,3}\s*\d{1,2}\.\d{3}/i;
                    const match = finding.content.match(coordRegex);
                    
                    if (match) {
                        console.log("%c[MultiSolver] Coordonnées trouvées dans les commentaires HTML:", "background:green; color:white", match[0]);
                        
                        // Convertir en décimal
                        const decimal = convertDDMToDecimal(match[0]);
                        
                        return {
                            exist: true,
                            ddm: match[0],
                            decimal: decimal,
                            certitude: true,
                            source: 'html_comment'
                        };
                    }
                }
            }
        }
        
        // Cas spécial: résultat du méta-plugin analysis_web_page
        if (result.combined_results && result.primary_coordinates) {
            console.log("%c[MultiSolver] Coordonnées principales trouvées dans analysis_web_page:", "background:green; color:white", result.primary_coordinates);
            
            // Recherche des coordonnées complètes dans les sous-résultats
            for (const [pluginName, pluginResult] of Object.entries(result.combined_results)) {
                if (pluginResult && pluginResult.coordinates && pluginResult.coordinates.exist &&
                    pluginResult.coordinates.ddm_lat && pluginResult.coordinates.ddm_lon) {
                    
                    const ddm = `${pluginResult.coordinates.ddm_lat} ${pluginResult.coordinates.ddm_lon}`;
                    console.log("%c[MultiSolver] Coordonnées complètes trouvées dans sous-plugin:", "background:green; color:white", {
                        pluginName,
                        coordinates: pluginResult.coordinates
                    });
                    
                    return {
                        exist: true,
                        ddm: ddm,
                        certitude: true,
                        source: pluginName,
                        decimal: result.primary_coordinates
                    };
                }
            }
            
            // Si on n'a pas trouvé de coordonnées complètes mais qu'on a des coordonnées décimales,
            // on les utilise quand même
            return {
                exist: true,
                ddm: "Coordonnées décimales uniquement",
                certitude: true,
                source: 'analysis_web_page',
                decimal: result.primary_coordinates
            };
        }
        
        console.log("%c[MultiSolver] Aucune coordonnée trouvée dans le résultat", "background:orange; color:black");
        return { exist: false };
    }
    
    // Fonction pour convertir les coordonnées du format DDM au format décimal
    function convertDDMToDecimal(ddmString) {
        if (!ddmString) return null;
        
        // Amélioration de l'expression régulière pour capturer les coordonnées DDM
        // Format: N 49° 45.558 E 005° 58.554 ou N 49° 45.204' E 5° 56.226'
        const coordRegex = /([NS])\s*(\d{1,2})[°\s]+(\d{1,2}\.\d+)['"]?\s*([EW])\s*(\d{1,3})[°\s]+(\d{1,2}\.\d+)['"]?/i;
        const match = ddmString.match(coordRegex);
        
        if (!match) {
            console.warn("%c[MultiSolver] Impossible de parser les coordonnées DDM:", "background:orange; color:black", ddmString);
            return null;
        }
        
        try {
            // Extraire les parties des coordonnées
            const latDir = match[1].toUpperCase(); // N ou S
            const latDeg = parseInt(match[2], 10);
            const latMin = parseFloat(match[3]);
            
            const lonDir = match[4].toUpperCase(); // E ou W
            const lonDeg = parseInt(match[5], 10);
            const lonMin = parseFloat(match[6]);
            
            // Convertir en décimal
            let latitude = latDeg + (latMin / 60);
            if (latDir === 'S') latitude = -latitude;
            
            let longitude = lonDeg + (lonMin / 60);
            if (lonDir === 'W') longitude = -longitude;
            
            console.log("%c[MultiSolver] Conversion de coordonnées réussie:", "background:green; color:white", {
                ddm: ddmString,
                decimal: { latitude, longitude }
            });
            
            return { latitude, longitude };
        } catch (error) {
            console.error("%c[MultiSolver] Erreur lors de la conversion des coordonnées:", "background:red; color:white", {
                ddmString,
                error
            });
            return null;
        }
    }
    
    // Fonction pour extraire toutes les coordonnées des résultats détaillés
    function extractAllCoordinates(detailedResults) {
        const allCoordinates = [];
        
        detailedResults.forEach(result => {
            const coords = extractCoordinates(result.details);
            if (coords.exist) {
                allCoordinates.push({
                    ...coords,
                    source: result.source
                });
            }
            
            // Cas particulier pour formula_parser
            if (result.sourceId === 'formula_parser' && 
                result.details.coordinates && 
                Array.isArray(result.details.coordinates)) {
                
                result.details.coordinates.forEach((coord, index) => {
                    if (index === 0) return; // Skip the first one, already added above
                    
                    allCoordinates.push({
                        exist: true,
                        ddm: `${coord.north} ${coord.east}`,
                        certitude: result.details.certitude || true,
                        source: `${result.source} (solution ${index + 1})`
                    });
                });
            }
        });
        
        return allCoordinates;
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
    
    // Fonction pour obtenir un nom lisible pour un plugin
    function getPluginReadableName(pluginId) {
        const pluginNames = {
            'coordinates_finder': 'Détecteur de coordonnées',
            'color_text_detector': 'Détecteur de texte invisible',
            'formula_parser': 'Analyseur de formules',
            'html_comments_finder': 'Détecteur de commentaires HTML',
            'image_alt_text_extractor': 'Extracteur de texte alt d\'images',
            'additional_waypoints_analyzer': 'Analyseur de waypoints',
            'analysis_web_page': 'Analyse complète de page'
        };
        
        return pluginNames[pluginId] || pluginId;
    }
    
    // Fonction pour formater les détails d'un résultat de plugin
    function formatPluginResultDetails(result) {
        const details = result.details;
        let html = '<div class="plugin-details">';
        
        // Afficher les coordonnées si présentes
        const coords = extractCoordinates(details);
        if (coords.exist) {
            const iconClass = coords.certitude ? 'text-green-400 fas fa-check-circle' : 'text-yellow-400 fas fa-exclamation-circle';
            html += `
                <div class="flex items-center mb-2 p-1 bg-gray-700/50 rounded">
                    <span class="mr-2"><i class="${iconClass}"></i></span>
                    <span class="font-medium">${coords.ddm}</span>
                    <button class="ml-auto text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded copy-btn" 
                            data-coords="${coords.ddm}">
                        Copier
                    </button>
                </div>
            `;
        }
        
        // Afficher le texte détecté
        if (details.result && details.result.text && details.result.text.text_output) {
            html += `
                <div class="mb-2">
                    <div class="text-xs text-gray-400 mb-1">Texte détecté:</div>
                    <div class="p-1 bg-gray-700/50 rounded text-sm">${details.result.text.text_output}</div>
                </div>
            `;
        }
        
        // Cas particulier: html_comments_finder
        if (result.sourceId === 'html_comments_finder' && details.comments && details.comments.length > 0) {
            html += `
                <div class="mb-2">
                    <div class="text-xs text-gray-400 mb-1">Commentaires HTML (${details.comments.length}):</div>
                    <div class="space-y-1">
            `;
            
            details.comments.forEach(comment => {
                html += `<div class="p-1 bg-gray-700/50 rounded text-sm">${comment}</div>`;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        // Cas particulier: formula_parser
        if (result.sourceId === 'formula_parser' && details.coordinates && Array.isArray(details.coordinates) && details.coordinates.length > 0) {
            html += `
                <div class="mb-2">
                    <div class="text-xs text-gray-400 mb-1">Formules détectées (${details.coordinates.length}):</div>
                    <div class="space-y-1">
            `;
            
            details.coordinates.forEach(coord => {
                html += `
                    <div class="p-1 bg-gray-700/50 rounded text-sm flex justify-between">
                        <span>${coord.north} ${coord.east}</span>
                        <button class="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-0.5 rounded copy-btn" 
                                data-coords="${coord.north} ${coord.east}">
                            Copier
                        </button>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
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
        console.log("%c[MultiSolver] Initialisation...", "background:blue; color:white");
        
        // Charger les géocaches
        loadGeocaches();
        
        // Configurer la dropown des géocaches
        setupGeocachesDropdown();
        
        // Charger les plugins
        const pluginContainer = document.getElementById('plugin-list-container');
            fetchPlugins(pluginContainer);
        
        // Vérifier la présence de l'interface de la carte
        checkMapInterface();
        
        // Charger les préférences utilisateur
        loadAutoCorrectCoordinatesPreference();
    }
    
    // Fonction pour vérifier l'interface avec la carte
    function checkMapInterface() {
        console.log("%c[MultiSolver] Vérification de l'interface avec la carte...", "background:blue; color:white");
        
        // Vérifier si nous avons accès à la carte directement
        let mapControllerFound = false;
        
        // 1. Vérifier si un élément avec le contrôleur map est présent dans la page
        const mapElements = document.querySelectorAll('[data-controller="map"]');
        if (mapElements.length > 0) {
            console.log("%c[MultiSolver] Contrôleur de carte trouvé dans la page :", "background:green; color:white", mapElements);
            mapControllerFound = true;
        }
        
        // 2. Essayer de tester la communication avec un événement test
        try {
            const testEvent = new CustomEvent('map-test-connection', {
                detail: { test: true, timestamp: Date.now() }
            });
            console.log("%c[MultiSolver] Envoi d'un événement test à la carte", "background:orange; color:black");
            window.dispatchEvent(testEvent);
            
            // Si nous sommes dans une iframe, propager l'événement au parent
            if (window.parent && window.parent !== window) {
                console.log("%c[MultiSolver] Envoi d'un message test au parent", "background:orange; color:black");
                window.parent.postMessage({
                    type: 'map-test-connection',
                    detail: { test: true, timestamp: Date.now() }
                }, '*');
            }
        } catch (error) {
            console.error("%c[MultiSolver] Erreur lors du test de communication avec la carte:", "background:red; color:white", error);
        }
        
        if (!mapControllerFound) {
            console.warn("%c[MultiSolver] Aucun contrôleur de carte trouvé dans la page courante. La communication se fera via des événements.", "background:orange; color:black");
        }
        
        // Ajouter un écouteur d'événement pour détecter les mises à jour de la structure de la page (pour GoldenLayout)
        document.addEventListener('map-panel-added', () => {
            console.log("%c[MultiSolver] Panneau de carte ajouté à la page", "background:green; color:white");
        });
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

    // Initialisation du tableau Tabulator avec vue détaillée
    function initializeResultsTable() {
        const tableContainer = document.getElementById('results-table');
        
        if (!tableContainer) {
            console.error("%c[MultiSolver] Conteneur du tableau non trouvé", "background:red; color:white");
            return;
        }
        
        // Configuration des colonnes pour Tabulator
        const columns = [
            { title: "GC Code", field: "gc_code", sorter: "string", headerSort: true, width: 120 },
            { title: "Nom", field: "name", sorter: "string", headerSort: true },
            { 
                title: "Détection", 
                field: "detection", 
                sorter: "string", 
                headerSort: true,
                formatter: function(cell, formatterParams, onRendered) {
                    const value = cell.getValue();
                    const row = cell.getRow().getData();
                    
                    if (row.isError) {
                        return `<div class="text-red-300">Erreur: ${row.error}</div>`;
                    }
                    
                    // Si des détails sont disponibles avec des coordonnées, indiquer la détection
                    if (row.detailedResults && row.detailedResults.length > 0) {
                        for (const detail of row.detailedResults) {
                            const coords = extractCoordinates(detail.details);
                            if (coords.exist) {
                                return `${detail.source}: détection réussie`;
                            }
                        }
                    }
                    
                    // Tronquer les textes trop longs
                    const maxTextLength = 40;
                    if (value && value.length > maxTextLength) {
                        return value.substring(0, maxTextLength) + '...';
                    }
                    
                    return value || "Aucun résultat";
                }
            },
            { 
                title: "Coordonnées", 
                field: "coordinates", 
                sorter: "string", 
                headerSort: true,
                formatter: function(cell, formatterParams, onRendered) {
                    const value = cell.getValue();
                    const row = cell.getRow().getData();
                    
                    if (row.isError) {
                        return "";
                    }
                    
                    // Chercher des coordonnées dans les résultats détaillés
                    let bestCoords = null;
                    
                    if (row.detailedResults && row.detailedResults.length > 0) {
                        for (const detail of row.detailedResults) {
                            const coords = extractCoordinates(detail.details);
                            if (coords.exist && (!bestCoords || coords.certitude)) {
                                bestCoords = coords;
                            }
                        }
                    }
                    
                    if (bestCoords) {
                        const iconClass = bestCoords.certitude ? 'text-green-400 fas fa-check-circle' : 'text-yellow-400 fas fa-exclamation-circle';
                        let html = `
                            <div class="flex items-center">
                                <span class="mr-2"><i class="${iconClass}"></i></span>
                                <span>${bestCoords.ddm || 'Format inconnu'}</span>
                            </div>
                        `;
                        
                        // Ajouter le statut de sauvegarde s'il est disponible
                        if (row.coordsSaved !== undefined) {
                            if (row.coordsSaved) {
                                html += `
                                    <div class="mt-1 text-xs text-green-400">
                                        <i class="fas fa-save mr-1"></i> Coordonnées sauvegardées
                                    </div>
                                `;
                            } else {
                                html += `
                                    <div class="flex items-center mt-1">
                                        <span class="text-xs text-gray-400 mr-2">
                                            <i class="fas fa-save mr-1"></i> Non sauvegardées
                                        </span>
                                        <button 
                                            class="save-coords-btn px-2 py-0.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded" 
                                            data-geocache-id="${row.id}" 
                                            data-coords="${bestCoords.ddm || ''}">
                                            Sauvegarder
                                        </button>
                                    </div>
                                `;
                                
                                // Si une erreur de sauvegarde s'est produite, l'afficher
                                if (row.coordsSaveError) {
                                    html += `
                                        <div class="mt-1 text-xs text-red-400">
                                            Erreur: ${row.coordsSaveError}
                                        </div>
                                    `;
                                }
                            }
                        }
                        
                        return html;
                    }
                    
                    return value !== undefined && value !== "Non détecté" ? value : "Non détecté";
                }
            },
            { 
                title: "Actions", 
                headerSort: false,
                formatter: function(cell, formatterParams, onRendered) {
                    const row = cell.getRow().getData();
                    const hasDetails = row.detailedResults && row.detailedResults.length > 0;
                    
                    return `
                        <div class="flex space-x-2 justify-end">
                            ${hasDetails ? `
                                <button class="toggle-details-btn px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs">
                                    <i class="fas fa-chevron-down"></i> Détails
                                </button>
                            ` : ''}
                            <button class="open-details-btn px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs">
                                <i class="fas fa-external-link-alt"></i> Geocache
                            </button>
                        </div>
                    `;
                },
                cellClick: function(e, cell) {
                    const element = e.target;
                    const row = cell.getRow();
                    const rowData = row.getData();
                    
                    // Gérer le bouton de détails
                    if (element.classList.contains('toggle-details-btn') || element.closest('.toggle-details-btn')) {
                        const detailsRow = document.getElementById(`details-row-${rowData.id}`);
                        
                        if (detailsRow) {
                            // Si les détails existent déjà, les basculer
                            detailsRow.classList.toggle('hidden');
                            toggleChevron(element.classList.contains('toggle-details-btn') ? element : element.closest('.toggle-details-btn'));
                        } else {
                            // Sinon, créer les détails
                            createDetailsRow(row);
                        }
                    }
                    
                    // Gérer le bouton d'ouverture de géocache
                    if (element.classList.contains('open-details-btn') || element.closest('.open-details-btn')) {
                        window.openGeocacheDetails(rowData.id, rowData.gc_code, rowData.name);
                    }
                }
            }
        ];
        
        // Options Tabulator
        const options = {
            data: [],
            columns: columns,
            layout: "fitDataFill",
            height: "400px",
            pagination: false,
            movableColumns: true,
            resizableRows: true,
            resizableColumns: true,
            rowFormatter: function(row) {
                const data = row.getData();
                
                if (data.isError) {
                    row.getElement().style.backgroundColor = "rgba(185, 28, 28, 0.2)";
                }
            },
            rowClick: function(e, row) {
                // Si on clique sur la ligne (pas sur un bouton), basculer les détails
                if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                    const rowData = row.getData();
                    const detailsRow = document.getElementById(`details-row-${rowData.id}`);
                    
                    if (detailsRow) {
                        detailsRow.classList.toggle('hidden');
                        const btn = row.getElement().querySelector('.toggle-details-btn');
                        if (btn) toggleChevron(btn);
                    } else if (rowData.detailedResults && rowData.detailedResults.length > 0) {
                        createDetailsRow(row);
                    }
                }
            },
            placeholder: "Aucun résultat disponible"
        };
        
        // Créer l'instance Tabulator
        window.resultsTable = new Tabulator(tableContainer, options);
        
        // Après construction, ajouter l'event listener pour les boutons de copie
        tableContainer.addEventListener('click', function(e) {
            if (e.target.classList.contains('copy-btn') || e.target.closest('.copy-btn')) {
                const button = e.target.classList.contains('copy-btn') ? e.target : e.target.closest('.copy-btn');
                const coords = button.dataset.coords;
                if (coords) {
                    copyToClipboard(coords);
                    
                    // Feedback visuel
                    button.classList.add('bg-green-700');
                    button.innerHTML = '<i class="fas fa-check"></i> Copié !';
                    
                    setTimeout(() => {
                        button.classList.remove('bg-green-700');
                        button.innerHTML = '<i class="fas fa-copy"></i> Copier';
                    }, 2000);
                }
            }
            
            // Gestionnaire pour le bouton de sauvegarde des coordonnées
            if (e.target.classList.contains('save-coords-btn') || e.target.closest('.save-coords-btn')) {
                const button = e.target.classList.contains('save-coords-btn') ? e.target : e.target.closest('.save-coords-btn');
                const geocacheId = button.dataset.geocacheId;
                const coordsText = button.dataset.coords;
                
                if (geocacheId && coordsText) {
                    // Désactiver le bouton pendant la sauvegarde
                    button.disabled = true;
                    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sauvegarde...';
                    
                    // Sauvegarder les coordonnées
                    saveDetectedCoordinates(geocacheId, { exist: true, ddm: coordsText })
                        .then(result => {
                            if (result.success) {
                                // Remplacer le bouton par un message de succès
                                const parentContainer = button.parentElement;
                                parentContainer.innerHTML = `
                                    <span class="text-xs text-green-400">
                                        <i class="fas fa-check mr-1"></i> Coordonnées sauvegardées !
                                    </span>
                                `;
                                
                                // Mettre à jour le tableau
                                const row = window.resultsTable.getRow(geocacheId);
                                if (row) {
                                    const rowData = row.getData();
                                    rowData.coordsSaved = true;
                                    rowData.coordsSaveError = null;
                                    window.resultsTable.updateData([rowData]);
                                    
                                    // Mettre à jour la carte avec les coordonnées sauvegardées
                                    // Récupérer les coordonnées détaillées si disponibles
                                    const bestCoords = extractBestCoordinates(rowData);
                                    if (bestCoords && bestCoords.coordinates && bestCoords.coordinates.decimal) {
                                        updateMapCoordinates(geocacheId, bestCoords.coordinates, true);
                                    }
                                }
                            } else {
                                // Rétablir le bouton et afficher l'erreur
                                button.disabled = false;
                                button.innerHTML = 'Réessayer';
                                
                                // Ajouter un message d'erreur
                                const errorElement = document.createElement('div');
                                errorElement.className = 'mt-1 text-xs text-red-400';
                                errorElement.innerHTML = `Erreur: ${result.error}`;
                                button.parentElement.appendChild(errorElement);
                            }
                        })
                        .catch(error => {
                            console.error("%c[MultiSolver] Erreur lors de la sauvegarde manuelle:", "background:red; color:white", error);
                            
                            // Rétablir le bouton et afficher l'erreur
                            button.disabled = false;
                            button.innerHTML = 'Réessayer';
                            
                            // Ajouter un message d'erreur
                            const errorElement = document.createElement('div');
                            errorElement.className = 'mt-1 text-xs text-red-400';
                            errorElement.innerHTML = `Erreur: ${error.message}`;
                            button.parentElement.appendChild(errorElement);
                        });
                }
            }
        });
    }
    
    // Fonction pour créer la ligne de détails
    function createDetailsRow(row) {
        const rowData = row.getData();
        const rowElement = row.getElement();
        const detailedResults = rowData.detailedResults;
        
        if (!detailedResults || detailedResults.length === 0) return;
        
        // Créer l'élément pour les détails
        const detailsElement = document.createElement('tr');
        detailsElement.id = `details-row-${rowData.id}`;
        detailsElement.className = 'details-row';
        detailsElement.innerHTML = `
            <td colspan="5" class="details-container">
                <div class="p-3 bg-gray-800/80 rounded">
                    <div class="text-sm font-medium text-gray-300 mb-2">Résultats détaillés:</div>
                    <div class="detailed-results space-y-3">
                        ${detailedResults.map(result => `
                            <div class="p-2 bg-gray-700/30 rounded">
                                <div class="text-xs font-medium text-gray-200 mb-1">${result.source}</div>
                                <div>${formatPluginResultDetails(result)}</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    ${createCoordinatesSection(detailedResults)}
                </div>
            </td>
        `;
        
        // Insérer après la ligne
        rowElement.insertAdjacentElement('afterend', detailsElement);
        
        // Basculer l'icône du bouton
        const btn = rowElement.querySelector('.toggle-details-btn');
        if (btn) toggleChevron(btn);
    }
    
    // Fonction pour créer la section des coordonnées
    function createCoordinatesSection(detailedResults) {
        const allCoordinates = extractAllCoordinates(detailedResults);
        
        if (allCoordinates.length <= 1) return '';
        
        return `
            <div class="mt-3 p-2 bg-blue-900/30 rounded">
                <div class="text-sm font-medium text-gray-300 mb-2">Toutes les coordonnées détectées:</div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    ${allCoordinates.map(coords => `
                        <div class="p-2 border border-blue-700/50 rounded flex items-center">
                            <span class="mr-2"><i class="fas ${coords.certitude ? 'fa-check-circle text-green-400' : 'fa-exclamation-circle text-yellow-400'}"></i></span>
                            <div>
                                <div class="text-sm text-gray-200">${coords.ddm}</div>
                                <div class="text-xs text-gray-400">${coords.source}</div>
                            </div>
                            <button class="ml-auto text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded copy-btn" 
                                    data-coords="${coords.ddm}">
                                Copier
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Fonction pour basculer l'icône du chevron
    function toggleChevron(button) {
        const icon = button.querySelector('i');
        if (icon) {
            if (icon.classList.contains('fa-chevron-down')) {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
            } else {
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
            }
        }
    }
    
    // Fonction pour copier du texte dans le presse-papier
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            console.log("%c[MultiSolver] Texte copié dans le presse-papier:", "background:green; color:white", text);
            showMessage("Coordonnées copiées dans le presse-papier");
        }).catch(err => {
            console.error("%c[MultiSolver] Erreur lors de la copie:", "background:red; color:white", err);
            showMessage("Erreur lors de la copie");
        });
    }
    
    // Mise à jour du tableau des résultats
    function updateResultsTable(results) {
        console.log("%c[MultiSolver] Mise à jour du tableau des résultats:", "background:orange; color:black", results);
        
        // S'assurer que le tableau existe
        if (!window.resultsTable) {
            initializeResultsTable();
        }
        
        // Mettre à jour les données du tableau
        if (Array.isArray(results) && results.length > 0) {
            window.resultsTable.replaceData(results);
            
            // Supprimer toutes les lignes de détails
            document.querySelectorAll('.details-row').forEach(row => row.remove());
        }
    }
    
    // Fonction pour charger la préférence d'enregistrement automatique des coordonnées
    async function loadAutoCorrectCoordinatesPreference() {
        try {
            console.log("%c[MultiSolver] Chargement de la préférence auto_correct_coordinates", "background:orange; color:black");
            
            // Appel à l'API des paramètres
            const response = await fetch('/api/settings/param/auto_correct_coordinates');
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.value !== undefined) {
                console.log("%c[MultiSolver] Préférence auto_correct_coordinates chargée:", "background:green; color:white", data.value);
                // Vérifier si l'élément existe et le mettre à jour
                const autoSaveCheckbox = document.getElementById('plugin-auto-save-coords');
                if (autoSaveCheckbox) {
                    autoSaveCheckbox.checked = data.value;
                }
            } else {
                console.warn("%c[MultiSolver] Impossible de charger la préférence auto_correct_coordinates", "background:orange; color:black");
            }
            
        } catch (error) {
            console.error("%c[MultiSolver] Erreur lors du chargement de la préférence:", "background:red; color:white", error);
        }
    }

    // Fonction pour sauvegarder automatiquement les coordonnées détectées
    async function saveDetectedCoordinates(geocacheId, coordinates) {
        try {
            console.log("%c[MultiSolver] Sauvegarde des coordonnées pour la géocache:", "background:blue; color:white", {
                geocacheId, coordinates
            });
            
            if (!coordinates || !coordinates.exist || !coordinates.ddm) {
                console.warn("%c[MultiSolver] Coordonnées invalides pour la sauvegarde", "background:orange; color:black");
                return { success: false, error: "Coordonnées invalides" };
            }
            
            // Extraire lat et lon du format DDM
            const ddmCoords = coordinates.ddm;
            let gc_lat, gc_lon;
            
            // Expression régulière améliorée pour extraire lat/lon
            // Format: N 49° 45.558 E 005° 58.554 ou N 49° 45.204' E 5° 56.226'
            const coordRegex = /([NS])\s*(\d{1,2})[°\s]+(\d{1,2}\.\d+)['"]?\s*([EW])\s*(\d{1,3})[°\s]+(\d{1,2}\.\d+)['"]?/i;
            const match = ddmCoords.match(coordRegex);
            
            if (match) {
                gc_lat = `${match[1]} ${match[2]}° ${match[3]}`;
                gc_lon = `${match[4]} ${match[5]}° ${match[6]}`;
                console.log("%c[MultiSolver] Coordonnées extraites:", "background:green; color:white", { gc_lat, gc_lon });
            } else {
                console.warn("%c[MultiSolver] Format de coordonnées non reconnu:", "background:orange; color:black", ddmCoords);
                return { success: false, error: "Format de coordonnées non reconnu" };
            }
            
            // Créer un objet FormData pour envoyer les données au format form
            const formData = new FormData();
            formData.append('gc_lat', gc_lat);
            formData.append('gc_lon', gc_lon);
            
            // Envoyer les coordonnées à l'API - Utiliser l'URL correcte sans le préfixe 'api'
            const response = await fetch(`/geocaches/${geocacheId}/coordinates`, {
                method: 'PUT',
                body: formData
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Erreur HTTP: ${response.status}`);
            }
            
            // La réponse est du HTML, pas du JSON
            const result = await response.text();
            console.log("%c[MultiSolver] Coordonnées sauvegardées avec succès", "background:green; color:white");
            
            // Mettre à jour la carte avec les nouvelles coordonnées
            updateMapCoordinates(geocacheId, {
                ddm: ddmCoords,
                decimal: {
                    latitude: parseFloat(gc_lat.match(/(\d{1,2})[°\s]+(\d{1,2}\.\d+)/)[1]) + parseFloat(gc_lat.match(/(\d{1,2})[°\s]+(\d{1,2}\.\d+)/)[2])/60 * (gc_lat.startsWith('S') ? -1 : 1),
                    longitude: parseFloat(gc_lon.match(/(\d{1,3})[°\s]+(\d{1,2}\.\d+)/)[1]) + parseFloat(gc_lon.match(/(\d{1,3})[°\s]+(\d{1,2}\.\d+)/)[2])/60 * (gc_lon.startsWith('W') ? -1 : 1)
                }
            }, true);
            
            return { success: true, result };
            
        } catch (error) {
            console.error("%c[MultiSolver] Erreur lors de la sauvegarde des coordonnées:", "background:red; color:white", error);
            return { success: false, error: error.message };
        }
    }

    // Ajouter cette fonction dans la portée globale pour qu'elle soit accessible depuis le onClick
    window.showGeocachesMap = function() {
        console.log("%c[MultiSolver] Affichage de la carte des géocaches", "background:blue; color:white");
        
        // Récupérer les géocaches
        const geocaches = getGeocaches();
        
        if (!geocaches || geocaches.length === 0) {
            showError("Aucune géocache sélectionnée pour afficher sur la carte.");
            return;
        }
        
        // Récupérer uniquement les IDs
        const geocacheIds = geocaches.map(gc => gc.id);
        
        // Créer le composant de carte dans GoldenLayout
        const newItemConfig = {
            type: 'component',
            componentName: 'geocaches-map',
            title: `Carte (${geocaches.length} géocaches)`,
            componentState: { 
                geocacheIds: geocacheIds
            }
        };
        
        // Ajouter à la première ligne si elle existe, sinon créer une nouvelle ligne
        if (window.mainLayout && window.mainLayout.root) {
            if (window.mainLayout.root.contentItems[0].type === 'row') {
                window.mainLayout.root.contentItems[0].addChild(newItemConfig);
            } else {
                window.mainLayout.root.contentItems[0].addChild({
                    type: 'row',
                    content: [newItemConfig]
                });
            }
            
            // Attendre que le DOM soit mis à jour et s'assurer que le containerTarget existe
            setTimeout(() => {
                console.log("%c[MultiSolver] Vérification de l'initialisation de la carte...", "background:blue; color:white");
                const mapElements = document.querySelectorAll('[data-controller="map"]');
                console.log(`%c[MultiSolver] ${mapElements.length} contrôleurs map trouvés:`, "background:blue; color:white", mapElements);
                
                // Vérifier que les cibles sont bien définies
                mapElements.forEach((mapEl, index) => {
                    const containerTarget = mapEl.querySelector('[data-map-target="container"]');
                    if (!containerTarget) {
                        console.error(`%c[MultiSolver] Cible 'container' manquante pour le contrôleur map #${index+1}`, "background:red; color:white");
                    } else {
                        console.log(`%c[MultiSolver] Cible 'container' trouvée pour le contrôleur map #${index+1}`, "background:green; color:white");
                    }
                });
            }, 500);
        } else {
            console.error("%c[MultiSolver] Layout principal non trouvé", "background:red; color:white");
            showError("Impossible d'ouvrir la carte: le layout principal n'est pas accessible.");
        }
    };

    window.showGeocachesMapPanel = function() {
        console.log("%c[MultiSolver] Affichage de la mini carte des géocaches", "background:blue; color:white");
        
        // Récupérer les géocaches
        const geocaches = getGeocaches();
        
        if (!geocaches || geocaches.length === 0) {
            showError("Aucune géocache sélectionnée pour afficher sur la carte.");
            return;
        }
        
        // Récupérer uniquement les IDs
        const geocacheIds = geocaches.map(gc => gc.id);
        
        // Ouvrir la carte dans le panneau inférieur
        const bottomPanelContainer = document.querySelector('.bottom-panel-container');
        if (!bottomPanelContainer) {
            showError("Le panneau inférieur n'est pas disponible.");
            return;
        }
        
        // S'assurer que le panneau inférieur est visible
        bottomPanelContainer.classList.add('expanded');
        
        // Activer l'onglet "Map" dans le panneau inférieur
        const mapTab = document.querySelector('.bottom-panel-tab[data-panel="map-panel"]');
        if (mapTab) {
            // Simuler un clic sur l'onglet Map pour l'activer
            if (typeof switchTab === 'function') {
                switchTab(mapTab, 'map-panel');
            } else {
                // Fallback si la fonction switchTab n'est pas disponible
                document.querySelectorAll('.bottom-panel-tab').forEach(tab => {
                    tab.classList.remove('active');
                });
                mapTab.classList.add('active');
                
                document.querySelectorAll('.bottom-panel-container .panel-content').forEach(panel => {
                    panel.classList.remove('active');
                });
                const mapPanel = document.getElementById('map-panel');
                if (mapPanel) {
                    mapPanel.classList.add('active');
                }
                
                // Déclencher l'événement tab-activated
                window.dispatchEvent(new CustomEvent('tab-activated', {
                    detail: { panelId: 'map-panel' }
                }));
            }
            
            // Charger les données des géocaches dans le panneau de carte
            fetch('/geocaches/map_panel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    geocache_ids: geocacheIds
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                // Injecter le HTML dans le panneau Map
                const mapPanel = document.getElementById('map-panel');
                if (mapPanel) {
                    mapPanel.innerHTML = html;
                    
                    // Initialiser le contrôleur Stimulus
                    if (window.StimulusApp) {
                        window.StimulusApp.start();
                    }
                    
                    // Notification de succès
                    showMessage(`Carte chargée avec ${geocaches.length} géocaches`);
                } else {
                    showError("Panneau Map non trouvé.");
                }
            })
            .catch(error => {
                console.error('Erreur lors du chargement de la carte:', error);
                showError(`Erreur lors du chargement de la carte: ${error.message}`);
            });
        } else {
            showError("Onglet Map non trouvé dans le panneau inférieur.");
        }
    };

    // Fonction pour mettre à jour les coordonnées sur la carte
    function updateMapCoordinates(geocacheId, coordinates, isSaved = false) {
        console.log("%c[MultiSolver] Mise à jour des coordonnées sur la carte:", "background:green; color:white", {
            geocacheId,
            coordinates,
            isSaved: isSaved ? "Sauvegardées" : "Non sauvegardées"
        });
        
        // Validation de l'ID de géocache
        if (!geocacheId) {
            console.error("%c[MultiSolver] ID de géocache manquant pour la mise à jour de carte", "background:red; color:white");
            return false;
        }
        
        // Variable pour stocker les coordonnées décimales
        let decimalCoords = null;
        
        // Vérifier si les coordonnées décimales sont déjà disponibles
        if (coordinates && coordinates.decimal && 
            coordinates.decimal.latitude && coordinates.decimal.longitude) {
            console.log("%c[MultiSolver] Coordonnées décimales trouvées directement:", "background:green; color:white", coordinates.decimal);
            decimalCoords = coordinates.decimal;
        }
        // Sinon, essayer d'extraire à partir des coordonnées DDM
        else if (coordinates && coordinates.ddm) {
            console.log("%c[MultiSolver] Tentative de conversion DDM en décimal:", "background:orange; color:black", coordinates.ddm);
            
            // Fonction pour convertir DDM en décimal
            try {
                const ddm = coordinates.ddm;
                // Expression régulière améliorée pour capturer différents formats DDM
                const regex = /([NS])\s*(\d{1,2})[°\s]*(\d{1,2}\.\d+)['"]?\s*([EW])\s*(\d{1,3})[°\s]*(\d{1,2}\.\d+)['"]?/i;
                const match = ddm.match(regex);
                
                if (match) {
                    const latDir = match[1].toUpperCase();
                    const latDeg = parseInt(match[2], 10);
                    const latMin = parseFloat(match[3]);
                    
                    const lonDir = match[4].toUpperCase();
                    const lonDeg = parseInt(match[5], 10);
                    const lonMin = parseFloat(match[6]);
                    
                    let latitude = latDeg + (latMin / 60);
                    if (latDir === 'S') latitude = -latitude;
                    
                    let longitude = lonDeg + (lonMin / 60);
                    if (lonDir === 'W') longitude = -longitude;
                    
                    console.log("%c[MultiSolver] Conversion réussie:", "background:green; color:white", {
                        latitude, 
                        longitude
                    });
                    
                    decimalCoords = { latitude, longitude };
                } else {
                    console.warn("%c[MultiSolver] Format DDM non reconnu:", "background:orange; color:black", ddm);
                    // Essayer de convertir avec la fonction existante
                    try {
                        const converted = convertDDMToDecimal(ddm);
                        if (converted && converted.latitude && converted.longitude) {
                            console.log("%c[MultiSolver] Conversion secondaire réussie:", "background:green; color:white", converted);
                            decimalCoords = converted;
                        }
                    } catch (convErr) {
                        console.warn("%c[MultiSolver] Échec de la conversion secondaire:", "background:orange; color:black", convErr);
                    }
                }
            } catch (error) {
                console.error("%c[MultiSolver] Erreur lors de la conversion DDM:", "background:red; color:white", error);
            }
        }
        // Vérifier s'il s'agit directement d'un objet avec latitude/longitude
        else if (coordinates && typeof coordinates.latitude === 'number' && typeof coordinates.longitude === 'number') {
            console.log("%c[MultiSolver] Coordonnées décimales trouvées directement dans l'objet:", "background:green; color:white", coordinates);
            decimalCoords = {
                latitude: coordinates.latitude,
                longitude: coordinates.longitude
            };
        }
        // Vérifier s'il y a un ddm_lat et ddm_lon séparés
        else if (coordinates && coordinates.ddm_lat && coordinates.ddm_lon) {
            console.log("%c[MultiSolver] Tentative de conversion DDM séparés:", "background:orange; color:black", {
                ddm_lat: coordinates.ddm_lat,
                ddm_lon: coordinates.ddm_lon
            });
            
            try {
                // Combiner en un seul DDM et essayer de convertir
                const combinedDDM = `${coordinates.ddm_lat} ${coordinates.ddm_lon}`;
                const converted = convertDDMToDecimal(combinedDDM);
                if (converted && converted.latitude && converted.longitude) {
                    console.log("%c[MultiSolver] Conversion DDM séparés réussie:", "background:green; color:white", converted);
                    decimalCoords = converted;
                }
            } catch (error) {
                console.error("%c[MultiSolver] Erreur lors de la conversion DDM séparés:", "background:red; color:white", error);
            }
        }
        
        // Si aucune coordonnée décimale n'a pu être extraite, impossible de continuer
        if (!decimalCoords) {
            console.error("%c[MultiSolver] Impossible d'extraire des coordonnées décimales valides", "background:red; color:white", coordinates);
            return false;
        }
        
        // Préparer les détails de l'événement
        const eventDetail = {
            geocacheId: geocacheId,
            latitude: decimalCoords.latitude,
            longitude: decimalCoords.longitude,
            isSaved: isSaved,
            raw: coordinates
        };
        
        console.log("%c[MultiSolver] Détails de l'événement prêts:", "background:blue; color:white", JSON.stringify(eventDetail));
        
        // Tester toutes les méthodes de communication disponibles
        // 1. Utiliser le pont d'événements global
        if (window.MysteryAIEventBridge && typeof window.MysteryAIEventBridge.dispatchGlobalEvent === 'function') {
            console.log("%c[MultiSolver] 1. Utilisation du pont d'événements global", "background:purple; color:white");
            window.MysteryAIEventBridge.dispatchGlobalEvent('map-coordinates-updated', eventDetail);
            console.log("%c[MultiSolver] Événement envoyé via MysteryAIEventBridge", "background:green; color:white");
        } else {
            console.warn("%c[MultiSolver] MysteryAIEventBridge non disponible ou méthode manquante", "background:orange; color:black");
        }
        
        // 2. Utiliser l'événement personnalisé standard
        console.log("%c[MultiSolver] 2. Envoi direct de l'événement", "background:orange; color:black");
        const mapUpdateEvent = new CustomEvent('map-coordinates-updated', {
            detail: eventDetail
        });
        window.dispatchEvent(mapUpdateEvent);
        console.log("%c[MultiSolver] CustomEvent dispatché directement sur window", "background:green; color:white");
        
        // 3. Envoyer un message au parent
        if (window.parent && window.parent !== window) {
            console.log("%c[MultiSolver] 3. Envoi du message au parent", "background:blue; color:white");
            window.parent.postMessage({
                type: 'map-coordinates-updated',
                detail: eventDetail
            }, '*');
            console.log("%c[MultiSolver] Message envoyé au parent", "background:green; color:white");
            
            // Test de connexion
            window.parent.postMessage({
                type: 'mystery-event-bridge',
                eventName: 'map-test-connection',
                detail: { timestamp: Date.now() }
            }, '*');
        } else {
            console.log("%c[MultiSolver] Pas de fenêtre parent distincte", "background:orange; color:black");
        }
        
        // 4. Rechercher et utiliser le contrôleur map directement (si dans la même fenêtre)
        console.log("%c[MultiSolver] 4. Recherche d'un contrôleur map dans le DOM", "background:blue; color:white");
        try {
            // Chercher tous les éléments contrôlés par le contrôleur map
            const mapControllers = document.querySelectorAll('[data-controller~="map"]');
            console.log(`%c[MultiSolver] ${mapControllers.length} contrôleurs map trouvés dans le DOM`, 
                         mapControllers.length > 0 ? "background:green; color:white" : "background:orange; color:black");
            
            let directAccessSuccessful = false;
            
            mapControllers.forEach((el, i) => {
                console.log(`%c[MultiSolver] Tentative d'accès au contrôleur map #${i+1}`, "background:purple; color:white");
                
                // Si l'API Stimulus est disponible, essayer d'accéder au contrôleur
                if (window.StimulusApp && window.StimulusApp.getControllerForElementAndIdentifier) {
                    const mapController = window.StimulusApp.getControllerForElementAndIdentifier(el, 'map');
                    if (mapController && typeof mapController.updateGeocacheCoordinates === 'function') {
                        console.log(`%c[MultiSolver] Appel direct de updateGeocacheCoordinates sur le contrôleur #${i+1}`, 
                                     "background:green; color:white");
                        try {
                            mapController.updateGeocacheCoordinates(
                                geocacheId, 
                                decimalCoords.latitude, 
                                decimalCoords.longitude, 
                                isSaved,
                                coordinates
                            );
                            directAccessSuccessful = true;
                            console.log(`%c[MultiSolver] Appel direct réussi sur le contrôleur #${i+1}`, "background:green; color:white");
                        } catch (callError) {
                            console.error(`%c[MultiSolver] Erreur lors de l'appel direct sur le contrôleur #${i+1}:`, "background:red; color:white", callError);
                        }
                    } else {
                        console.log(`%c[MultiSolver] Contrôleur map #${i+1} trouvé mais méthode updateGeocacheCoordinates non disponible`, 
                                     "background:orange; color:black", mapController);
                    }
                } else {
                    console.warn("%c[MultiSolver] API Stimulus non disponible pour accès direct", "background:orange; color:black");
                }
            });
            
            if (!directAccessSuccessful) {
                console.warn("%c[MultiSolver] Aucun accès direct au contrôleur map n'a réussi", "background:orange; color:black");
            }
        } catch (error) {
            console.error("%c[MultiSolver] Erreur lors de l'accès direct au contrôleur map:", "background:red; color:white", error);
        }
        
        // 5. Chercher dans les iframes
        console.log("%c[MultiSolver] 5. Recherche de contrôleurs map dans les iframes", "background:blue; color:white");
        try {
            if (window.frames && window.frames.length > 0) {
                for (let i = 0; i < window.frames.length; i++) {
                    try {
                        console.log(`%c[MultiSolver] Envoi du message à l'iframe #${i+1}`, "background:purple; color:white");
                        window.frames[i].postMessage({
                            type: 'map-coordinates-updated',
                            detail: eventDetail
                        }, '*');
                        console.log(`%c[MultiSolver] Message envoyé à l'iframe #${i+1}`, "background:green; color:white");
                    } catch (frameErr) {
                        console.warn(`%c[MultiSolver] Impossible d'envoyer à l'iframe #${i+1}:`, "background:orange; color:black", frameErr);
                    }
                }
            } else {
                console.log("%c[MultiSolver] Aucune iframe trouvée", "background:orange; color:black");
            }
        } catch (iframeErr) {
            console.error("%c[MultiSolver] Erreur lors de l'accès aux iframes:", "background:red; color:white", iframeErr);
        }
        
        console.log("%c[MultiSolver] Toutes les méthodes de communication testées pour les coordonnées", "background:green; color:white");
        return true;
    }

    // Fonction pour extraire les meilleures coordonnées d'un résultat
    function extractBestCoordinates(rowData) {
        if (!rowData || !rowData.detailedResults || rowData.detailedResults.length === 0) {
            return null;
        }
        
        // Chercher des coordonnées dans les résultats détaillés
        let bestResult = null;
        
        for (const detail of rowData.detailedResults) {
            const coords = extractCoordinates(detail.details);
            if (coords.exist && (!bestResult || coords.certitude)) {
                bestResult = { source: detail.source, coordinates: coords };
            }
        }
        
        return bestResult;
    }

    // Ajouter un appel dans la fonction qui traite les résultats de plugin
    async function executePluginOnGeocache(plugin, geocache) {
        try {
            console.log("%c[MultiSolver] Traitement de", "background:blue; color:white", geocache.gc_code);
            
            // Vérifier que l'ID de la géocache est disponible
            if (!geocache.id) {
                console.error("%c[MultiSolver] ID de géocache manquant", "background:red; color:white", geocache);
                throw new Error("ID de géocache manquant");
            }
            
            // Exécuter le plugin sur la géocache
            const result = await executePlugin(plugin, geocache);
            console.log("%c[MultiSolver] Résultat:", "background:blue; color:white", result);
            
            if (result) {
                // Vérifier s'il y a des coordonnées principales 
                if (result.mainDetection && result.mainDetection.coordinates && 
                    result.mainDetection.coordinates.exist) {
                    
                    console.log("%c[MultiSolver] Coordonnées détectées:", "background:green; color:white", result.mainDetection.coordinates);
                    
                    // Enregistrement automatique des coordonnées si l'option est activée
                    const autoSaveCoords = document.getElementById('plugin-auto-save-coords').checked;
                    let coordsSaved = false;
                    let coordsSaveError = null;
                    
                    if (autoSaveCoords) {
                        console.log("%c[MultiSolver] Enregistrement automatique des coordonnées activée", "background:orange; color:black");
                        try {
                            console.log("%c[MultiSolver] Enregistrement automatique des coordonnées...", "background:orange; color:black");
                            const saveResult = await saveDetectedCoordinates(geocache.id, result.mainDetection.coordinates);
                            coordsSaved = saveResult.success;
                            if (!saveResult.success) {
                                coordsSaveError = saveResult.error;
                            }
                        } catch (saveError) {
                            console.error("%c[MultiSolver] Erreur lors de l'enregistrement auto:", "background:red; color:white", saveError);
                            coordsSaved = false;
                            coordsSaveError = saveError.message;
                        }
                    } else {
                        console.log("%c[MultiSolver] Enregistrement automatique des coordonnées désactivée, mais mise à jour de la carte quand même", "background:orange; color:black");
                    }
                    
                    // Mise à jour de la carte avec les coordonnées détectées dans tous les cas
                    // que les coordonnées soient sauvegardées ou non
                    console.log("%c[MultiSolver] Tentative de mise à jour de la carte avec les coordonnées:", "background:green; color:white", result.mainDetection.coordinates);
                    const mapUpdated = updateMapCoordinates(geocache.id, result.mainDetection.coordinates, coordsSaved);
                    console.log("%c[MultiSolver] Résultat de la mise à jour de la carte:", "background:green; color:white", mapUpdated ? "Réussie" : "Échouée");
                    
                    // Créer les données de résultat
                    window.results = window.results || [];
                    window.results.push({
                        id: geocache.id,
                        gc_code: geocache.gc_code || 'N/A',
                        name: geocache.name || 'Sans nom',
                        detection: result.mainDetection.text || 'Détection réussie',
                        coordinates: result.mainDetection.coordinates.ddm || 'Format inconnu',
                        certitude: result.mainDetection.coordinates.certitude || false,
                        detailedResults: result.detailedResults || [],
                        coordsSaved: coordsSaved,
                        coordsSaveError: coordsSaveError
                    });
                } else {
                    console.warn("%c[MultiSolver] Pas de coordonnées détectées", "background:orange; color:black");
                    
                    // Pas de coordonnées détectées, mais peut-être des résultats partiels
                    window.results = window.results || [];
                    window.results.push({
                        id: geocache.id,
                        gc_code: geocache.gc_code || 'N/A',
                        name: geocache.name || 'Sans nom',
                        detection: result.mainDetection?.text || 'Détection sans coordonnées',
                        coordinates: 'Non détecté',
                        certitude: false,
                        detailedResults: result.detailedResults || []
                    });
                }
                
                // Mettre à jour le tableau avec le nouveau résultat
                updateResultsTable(window.results);
            }
        } catch (error) {
            // Gérer les erreurs
            console.error("%c[MultiSolver] Erreur lors du traitement:", "background:red; color:white", {
                geocache: geocache,
                error: error
            });
            
            // Ajouter une entrée d'erreur au tableau
            window.results = window.results || [];
            window.results.push({
                id: geocache.id,
                gc_code: geocache.gc_code || 'N/A',
                name: geocache.name || 'Sans nom',
                isError: true,
                error: error.message,
                stack: error.stack
            });
            
            // Mettre à jour le tableau avec l'erreur
            updateResultsTable(window.results);
        }
    }

    // Variable globale pour stocker les résultats
    window.results = [];

    // Fonction pour exécuter le plugin sélectionné sur toutes les géocaches
    window.executePluginForAll = async function(pluginName) {
        if (window.isPluginExecutionRunning) {
            console.warn("%c[MultiSolver] Une exécution est déjà en cours", "background:orange; color:black");
            return;
        }
        
        console.log("%c[MultiSolver] Exécution du plugin pour toutes les géocaches:", "background:blue; color:white", pluginName);
        
        try {
            // Marquer le début du traitement
            window.isPluginExecutionRunning = true;
            
            // Afficher la barre de progression
            document.getElementById('progress-container').classList.remove('hidden');
            
            // Récupérer les géocaches
            const geocaches = getGeocaches();
            
            if (!geocaches || geocaches.length === 0) {
                showError("Aucune géocache à traiter");
                window.isPluginExecutionRunning = false;
                return;
            }
            
            console.log("%c[MultiSolver] Nombre de géocaches à traiter:", "background:orange; color:black", geocaches.length);
            
            // Initialiser la progression
            const progressTotal = document.getElementById('progress-total');
            const progressCount = document.getElementById('progress-count');
            const progressBar = document.getElementById('progress-bar');
            
            progressTotal.textContent = geocaches.length;
            progressCount.textContent = 0;
            progressBar.style.width = '0%';
            
            // Réinitialiser le tableau des résultats
            window.results = [];
            
            // Initialiser le tableau si nécessaire
            const resultsTableContainer = document.querySelector('[data-multi-solver-target="resultsTableContainer"]');
            if (resultsTableContainer && !window.resultsTable) {
                initializeResultsTable();
            } else if (window.resultsTable) {
                // Effacer les données existantes
                window.resultsTable.clearData();
            }
            
            // Vérifier si on traite toutes les géocaches ou seulement une sélection
            const applyToAll = document.getElementById('plugin-apply-to-all');
            const geocachesToProcess = applyToAll && applyToAll.checked ? geocaches : [geocaches[0]];
            
            console.log("%c[MultiSolver] Géocaches sélectionnées pour le traitement:", "background:orange; color:black", geocachesToProcess.length);
            
            // Variables pour suivre la progression
            let processedCount = 0;
            
            // Traiter chaque géocache
            for (const geocache of geocachesToProcess) {
                // Vérifier si l'arrêt a été demandé
                if (!window.isPluginExecutionRunning) {
                    console.log("%c[MultiSolver] Arrêt du traitement demandé", "background:orange; color:black");
                    break;
                }
                
                // Utiliser notre nouvelle fonction d'exécution de plugin
                await executePluginOnGeocache(pluginName, geocache);
                
                // Mettre à jour la progression
                processedCount++;
                document.getElementById('progress-count').textContent = processedCount;
                const progressPercent = (processedCount / geocachesToProcess.length) * 100;
                document.getElementById('progress-bar').style.width = `${progressPercent}%`;
            }
            
        } catch (error) {
            console.error("%c[MultiSolver] Erreur lors de l'exécution du plugin:", "background:red; color:white", error);
            showError(`Erreur lors de l'exécution du plugin: ${error.message}`);
        } finally {
            // Marquer la fin du traitement
            window.isPluginExecutionRunning = false;
        }
    };
})();