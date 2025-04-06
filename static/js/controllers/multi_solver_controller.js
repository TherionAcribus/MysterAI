
    // Script d'initialisation simplifié sans dépendance à Stimulus
    (function() {
        console.log("%c[MultiSolver] Initialisation du script pour GoldenLayout", "background:purple; color:white");
        
        // Définir la fonction displayGeocachesList utilisée par les scripts
        window.displayGeocachesList = function(geocaches) {
            console.log("%c[MultiSolver] Affichage de la liste des géocaches:", "background:orange; color:black", geocaches.length);
            
            const geocachesListElement = document.querySelector('[data-multi-solver-target="geocachesList"]');
            
            if (!geocachesListElement) {
                console.error("%c[MultiSolver] Élément liste des géocaches non trouvé", "background:red; color:white");
                return;
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
                
                // Masquer le message d'erreur s'il est affiché
                const errorElement = document.querySelector('[data-multi-solver-target="error"]');
                if (errorElement) {
                    errorElement.classList.add('hidden');
                }
            }
        });
        
        // Fonction pour charger les plugins manuellement
        async function fetchPluginsManually(container) {
            try {
                console.log("%c[MultiSolver] Chargement manuel des plugins via fetch API", "background:orange; color:black");
                
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
                        console.log("%c[MultiSolver] Rafraîchissement manuel des plugins", "background:orange; color:black");
                        fetchPluginsManually(container);
                    };
                }
                
                // Appel direct à l'API
                const response = await fetch('/api/plugins?context=solver');
                
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                
                const plugins = await response.json();
                console.log(`%c[MultiSolver] ${plugins.length} plugins récupérés en mode manuel`, "background:orange; color:black");
                
                // Créer une fonction globale pour activer les plugins
                window.activatePluginManually = function(pluginName) {
                    console.log("%c[MultiSolver] Activation manuelle du plugin:", "background:orange; color:black", pluginName);
                    
                    // Au lieu d'envoyer un message au parent, charger l'interface du plugin directement
                    const pluginContainer = document.getElementById('plugin-list-container');
                    if (pluginContainer) {
                        loadPluginInterface(pluginName, pluginContainer);
                    } else {
                        console.error("%c[MultiSolver] Container de plugins non trouvé lors de l'activation", "background:red; color:white");
                    }
                };
                
                // Générer le HTML pour la liste des plugins avec un style semblable à geocache_solver.html
                let pluginsHTML = '<div class="space-y-2 max-h-[400px] overflow-y-auto bg-gray-700/30 p-2 rounded">';
                plugins.forEach(plugin => {
                    pluginsHTML += `
                        <div class="plugin-item flex items-center justify-between p-2 rounded-md hover:bg-gray-700 transition-colors" data-plugin-name="${plugin.name.toLowerCase()}">
                            <div>
                                <div class="font-medium text-gray-200">${plugin.name}</div>
                                <div class="text-xs text-gray-400">${plugin.description || 'Aucune description'}</div>
                            </div>
                            <button 
                                onclick="window.activatePluginManually('${plugin.name}')"
                                class="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-medium transition-colors">
                                Sélectionner
                            </button>
                        </div>
                    `;
                });
                pluginsHTML += '</div>';
                
                // Mettre à jour le container
                container.innerHTML = pluginsHTML;
                container.setAttribute('data-loaded', 'true');
                
                // Ajouter la fonctionnalité de filtrage manuel
                setupSearchFunctionality(container);
                
            } catch (error) {
                console.error("%c[MultiSolver] Erreur lors du chargement manuel des plugins:", "background:red; color:white", error);
                container.innerHTML = `
                    <div class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                        Erreur lors du chargement des plugins: ${error.message}
                    </div>
                `;
            }
        }
        
        // Configurer la fonctionnalité de recherche
        function setupSearchFunctionality(pluginContainer) {
            const searchInput = document.getElementById('plugin-search-input');
            if (searchInput) {
                console.log("%c[MultiSolver] Configuration de la recherche de plugins", "background:orange; color:black");
                
                // Supprimer les écouteurs d'événements existants pour éviter les doublons
                const newSearchInput = searchInput.cloneNode(true);
                searchInput.parentNode.replaceChild(newSearchInput, searchInput);
                
                newSearchInput.addEventListener('input', function(event) {
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
        
        // Configurer les écouteurs pour les caractères autorisés
        function setupAllowedCharsListener() {
            const allowedCharsSelect = document.getElementById('metasolver-allowed-chars');
            const customCharsContainer = document.getElementById('metasolver-custom-chars-container');
            
            if (allowedCharsSelect && customCharsContainer) {
                console.log("%c[MultiSolver] Configuration des écouteurs pour les caractères autorisés", "background:orange; color:black");
                
                // Supprimer les écouteurs d'événements existants pour éviter les doublons
                const newAllowedCharsSelect = allowedCharsSelect.cloneNode(true);
                allowedCharsSelect.parentNode.replaceChild(newAllowedCharsSelect, allowedCharsSelect);
                
                newAllowedCharsSelect.addEventListener('change', function(event) {
                    console.log("%c[MultiSolver] Changement de type de caractères", "background:orange; color:black", event.target.value);
                    if (event.target.value === 'custom') {
                        customCharsContainer.classList.remove('hidden');
                    } else {
                        customCharsContainer.classList.add('hidden');
                    }
                });
            }
        }
        
        // Fonction principale d'initialisation
        function initialize() {
            console.log("%c[MultiSolver] Démarrage de l'initialisation", "background:orange; color:black");
            
            // Charger les géocaches depuis l'URL
            loadGeocachesFromUrl();
            
            // Configurer les caractères autorisés
            setupAllowedCharsListener();
            
            // Configurer les plugins
            const pluginContainer = document.getElementById('plugin-list-container');
            if (pluginContainer) {
                fetchPluginsManually(pluginContainer);
            } else {
                console.error("%c[MultiSolver] Container de plugins non trouvé", "background:red; color:white");
            }
            
            // Configurer les boutons du MetaSolver
            setupMetaSolverButtons();
        }
        
        // Charger les géocaches depuis l'URL
        function loadGeocachesFromUrl() {
            console.log("%c[MultiSolver] Chargement des géocaches depuis l'URL", "background:orange; color:black; font-weight:bold");
            
            // Vérifier d'abord si des géocaches ont déjà été injectées par l'événement
            if (window.injectedGeocaches && Array.isArray(window.injectedGeocaches) && window.injectedGeocaches.length > 0) {
                console.log(`%c[MultiSolver] Utilisation des ${window.injectedGeocaches.length} géocaches déjà injectées`, "background:green; color:white");
                displayGeocachesList(window.injectedGeocaches);
                return;
            }
            
            // Vérifier toutes les méthodes pour obtenir les géocaches
            
            // Méthode 1: Paramètre URL standard
            const geocachesParam = new URLSearchParams(window.location.search).get('geocaches');
            
            // Méthode 2: Vérifier les attributs GoldenLayout
            const layoutData = window.parent.goldenLayoutData || window.goldenLayoutData;
            const componentState = layoutData?.componentState || {};
            
            // Tenter d'accéder directement au componentState via le parent et GoldenLayout
            try {
                if (window.parent.mainLayout) {
                    const currentContainer = window.frameElement?.closest('.lm_content')?.parentElement;
                    const containerId = currentContainer?.id;
                    
                    if (containerId) {
                        const containerItem = window.parent.mainLayout.root.getItemsById(containerId)[0];
                        
                        if (containerItem && containerItem.config && containerItem.config.componentState) {
                            console.log(`%c[MultiSolver] Accès direct au componentState:`, "background:green; color:white", containerItem.config.componentState);
                            
                            if (containerItem.config.componentState.geocaches) {
                                const geocachesData = containerItem.config.componentState.geocaches;
                                
                                if (Array.isArray(geocachesData) && geocachesData.length > 0) {
                                    geocaches = geocachesData;
                                    console.log(`%c[MultiSolver] ${geocaches.length} géocaches chargées depuis GoldenLayout componentState direct`, "background:green; color:white");
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(`%c[MultiSolver] Erreur lors de l'accès direct au componentState:`, "background:red; color:white", error);
            }
            
            // Méthode 3: Vérifier les messages dans le sessionStorage
            const storedGeocaches = sessionStorage.getItem('multiSolverGeocaches');
            
            // Méthode 4: Vérifier l'attribut data-geocaches du conteneur
            const container = document.getElementById('multi-solver-container');
            const containerGeocaches = container?.dataset?.geocaches;
            
            console.log("%c[MultiSolver] Sources de données potentielles:", "background:orange; color:black", {
                "urlParam": geocachesParam ? "présent" : "absent",
                "layoutData": layoutData ? "présent" : "absent",
                "componentState": componentState ? "présent" : "absent",
                "sessionStorage": storedGeocaches ? "présent" : "absent",
                "containerData": containerGeocaches ? "présent" : "absent"
            });
            
            // Tenter d'obtenir les géocaches de toutes les sources possibles
            let geocaches = null;
            
            // Essayer d'abord l'attribut data-geocaches (passé par Flask)
            if (containerGeocaches) {
                try {
                    geocaches = JSON.parse(containerGeocaches);
                    console.log(`%c[MultiSolver] ${geocaches.length} géocaches chargées depuis data-geocaches`, "background:green; color:white");
                } catch (error) {
                    console.error("%c[MultiSolver] Erreur lors du décodage de data-geocaches:", "background:red; color:white", error);
                }
            }
            
            // Ensuite essayer le paramètre d'URL si nécessaire
            if (!geocaches && geocachesParam) {
                try {
                    geocaches = JSON.parse(decodeURIComponent(geocachesParam));
                    console.log(`%c[MultiSolver] ${geocaches.length} géocaches chargées depuis l'URL`, "background:green; color:white");
                } catch (error) {
                    console.error("%c[MultiSolver] Erreur lors du décodage du paramètre URL:", "background:red; color:white", error);
                }
            }
            
            // Si on n'a pas encore de géocaches, essayer les données de layout
            if (!geocaches && componentState.geocaches) {
                try {
                    geocaches = Array.isArray(componentState.geocaches) 
                        ? componentState.geocaches 
                        : JSON.parse(componentState.geocaches);
                    console.log(`%c[MultiSolver] ${geocaches.length} géocaches chargées depuis componentState`, "background:green; color:white");
                } catch (error) {
                    console.error("%c[MultiSolver] Erreur lors du décodage des données de layout:", "background:red; color:white", error);
                }
            }
            
            // Enfin, essayer le sessionStorage
            if (!geocaches && storedGeocaches) {
                try {
                    geocaches = JSON.parse(storedGeocaches);
                    console.log(`%c[MultiSolver] ${geocaches.length} géocaches chargées depuis sessionStorage`, "background:green; color:white");
                } catch (error) {
                    console.error("%c[MultiSolver] Erreur lors du décodage du sessionStorage:", "background:red; color:white", error);
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
                console.warn("%c[MultiSolver] Aucune géocache trouvée dans toutes les sources", "background:orange; color:black");
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
        
        // Configurer les boutons du MetaSolver
        function setupMetaSolverButtons() {
            const metaSolverButtons = document.querySelectorAll('[data-action="click->multi-solver#executeMetaSolver"]');
            
            metaSolverButtons.forEach(button => {
                console.log("%c[MultiSolver] Configuration du bouton MetaSolver:", "background:orange; color:black", button.dataset.mode);
                
                // Supprimer les écouteurs d'événements existants pour éviter les doublons
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                newButton.addEventListener('click', function() {
                    const mode = this.dataset.mode;
                    console.log("%c[MultiSolver] Exécution du MetaSolver en mode:", "background:orange; color:black", mode);
                    executeMetaSolver(mode);
                });
            });
        }
        
        // Exécuter le MetaSolver
        function executeMetaSolver(mode) {
            console.log("%c[MultiSolver] Préparation de l'exécution du MetaSolver", "background:orange; color:black");
            
            // Récupérer les paramètres du MetaSolver
            const metasolverMode = document.getElementById('metasolver-mode').value;
            const metasolverStrict = document.getElementById('metasolver-strict').value;
            const metasolverAllowedChars = document.getElementById('metasolver-allowed-chars').value;
            const metasolverCustomChars = document.getElementById('metasolver-custom-chars').value;
            const metasolverEmbedded = document.getElementById('metasolver-embedded').checked;
            const metasolverGpsDetection = document.getElementById('metasolver-gps-detection').checked;
            const metasolverApplyToAll = document.getElementById('metasolver-apply-to-all').checked;
            
            // Afficher les paramètres dans la console
            console.log("%c[MultiSolver] Paramètres du MetaSolver:", "background:orange; color:black", {
                mode: metasolverMode,
                strict: metasolverStrict,
                allowedChars: metasolverAllowedChars,
                customChars: metasolverCustomChars,
                embedded: metasolverEmbedded,
                gpsDetection: metasolverGpsDetection,
                applyToAll: metasolverApplyToAll
            });
            
            // TODO: Implémentation de l'API pour le MetaSolver
            showMessage("Fonctionnalité MetaSolver en cours de développement.");
        }
        
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
                fetchPluginsManually(pluginContainer);
            } else {
                console.error("%c[MultiSolver] Container de plugins non trouvé lors de la fermeture", "background:red; color:white");
            }
        };
        
        // Initialiser après un court délai pour s'assurer que le DOM est complètement chargé
        setTimeout(initialize, 200);
    })();