function initializeLayout() {
    const config = {
        settings: {
            showPopoutIcon: false,
            showMaximiseIcon: false,
            showCloseIcon: false
        },
        content: [{
            type: 'row',
            content: [{
                type: 'component',
                componentName: 'welcome',
                title: 'Bienvenue'
            }]
        }]
    };

    try {
        // S'assurer qu'il n'y a qu'une seule instance
        if (window.mainLayout) {
            window.mainLayout.destroy();
        }
        
        let mainLayout = new GoldenLayout(config, document.getElementById('layoutContainer'));
        window.mainLayout = mainLayout;
        // Variable globale pour suivre l'onglet actif de façon fiable
        window.lastActiveTab = null;

        // Ajouter un écouteur pour l'état global
        window.mainLayout.on('stateChanged', function() {
            console.log('=== DEBUG: État de GoldenLayout changé ===');
            console.log('selectedItem:', window.mainLayout.selectedItem);
            console.log('Root content items:', window.mainLayout.root.contentItems.map(item => ({
                type: item.type,
                id: item.id,
                isActive: item.isActive
            })));
        });

        // Déclencher un événement pour indiquer que GoldenLayout est initialisé
        document.dispatchEvent(new CustomEvent('goldenLayoutInitialized', {
            detail: { layout: mainLayout }
        }));

        // Écouteurs d'événements pour le gestionnaire d'état
        mainLayout.on('itemCreated', function(item) {
            console.log('=== Layout: Item créé ===', {
                id: item.id,
                type: item.type,
                isComponent: item.isComponent,
                isStack: item.isStack
            });

            if (item.isStack) {
                window.layoutStateManager.registerStack(item);
            }
        });

        mainLayout.on('stackCreated', function(stack) {
            console.log('=== Layout: Stack créé ===', {
                id: stack.id,
                components: stack.contentItems.map(item => item.id)
            });
            window.layoutStateManager.registerStack(stack);
        });

        mainLayout.on('activeContentItemChanged', function(component) {
            if (!component || !component.isComponent) return;
            
            // Mémoriser explicitement l'onglet actif
            window.lastActiveTab = component;
            console.log('=== DEBUG: Onglet actif mémorisé ===', component);
            
            const componentInfo = {
                id: component.id,
                type: component.componentName,
                state: component.config.componentState || {},
                metadata: {
                    gcCode: component.config.componentState?.gcCode,
                    name: component.config.componentState?.name,
                    geocacheId: component.config.componentState?.geocacheId
                }
            };
            
            console.log('=== Layout: Component actif changé ===', componentInfo);
            window.layoutStateManager.setActiveComponent(componentInfo);
        });

        // Fonction pour mettre à jour le code GC et les notes
        function updateGeocacheCode(contentItem) {
            if (contentItem && contentItem.config && contentItem.config.componentState) {
                const state = contentItem.config.componentState;
                if (state.gcCode) {
                    // Mettre à jour le code GC
                    const geocacheCodeElement = document.querySelector('.geocache-code');
                    if (geocacheCodeElement) {
                        geocacheCodeElement.textContent = state.gcCode;
                    }
                    
                    // Mettre à jour les notes si le panneau est actif
                    const notesPanel = document.getElementById('notes-panel');
                    if (notesPanel && notesPanel.classList.contains('active') && state.geocacheId) {
                        const notesContent = document.getElementById('notes-content');
                        if (notesContent) {
                            // Charger le template notes_panel.html d'abord
                            htmx.ajax('GET', `/api/logs/notes_panel?geocacheId=${state.geocacheId}`, {
                                target: '#notes-content',
                                swap: 'innerHTML'
                            });
                        }
                    }
                    
                    // Mettre à jour les logs si le panneau est actif
                    const logsPanel = document.getElementById('logs-panel');
                    if (logsPanel && logsPanel.classList.contains('active') && state.geocacheId) {
                        const logsContent = document.getElementById('logs-content');
                        if (logsContent) {
                            // Charger le template logs_panel.html
                            htmx.ajax('GET', `/api/logs/logs_panel?geocacheId=${state.geocacheId}`, {
                                target: '#logs-content',
                                swap: 'innerHTML'
                            });
                        }
                    }
                }
            }
        }

        // Gestionnaire pour le changement de composant actif dans une stack
        mainLayout.on('activeContentItemChanged', function(contentItem) {
            updateGeocacheCode(contentItem);
        });

        // Gestionnaire pour le focus d'une stack
        mainLayout.on('stackCreated', function(stack) {
            stack.on('activeContentItemChanged', function(contentItem) {
                updateGeocacheCode(contentItem);
            });

            // Gérer le clic sur les onglets de la stack
            stack.header.tabs.forEach(tab => {
                tab.element.addEventListener('click', () => {
                    updateGeocacheCode(tab.contentItem);
                });
            });
        });

        // Gestionnaire pour les nouveaux items créés
        mainLayout.on('itemCreated', function(item) {
            if (item.type === 'stack') {
                item.on('activeContentItemChanged', function(contentItem) {
                    updateGeocacheCode(contentItem);
                });
            }
        });

        // Gestionnaire pour le focus global
        mainLayout.on('focus', function() {
            const activeContentItem = mainLayout.selectedItem;
            if (activeContentItem) {
                updateGeocacheCode(activeContentItem);
            }
        });

        mainLayout.on('activeContentItemChanged', function(contentItem) {
            if (contentItem && contentItem.config && contentItem.config.componentState) {
                const state = contentItem.config.componentState;
                if (state.gcCode) {
                    // Mettre à jour le code GC dans le panneau inférieur
                    const geocacheCodeElement = document.querySelector('.geocache-code');
                    if (geocacheCodeElement) {
                        geocacheCodeElement.textContent = state.gcCode;
                    }
                }
            }
        });

        // Gestionnaire d'événements pour les messages postMessage
        window.addEventListener('message', function(event) {
            // Ignorer les messages de React DevTools
            if (event.data.source === 'react-devtools-content-script') {
                return;
            }
            
            // Ne logger que les messages pertinents
            if (event.data.type === 'openGeocacheDetails') {
                console.log('=== Layout: Message openGeocacheDetails reçu ===', event.data);
                
                const { geocacheId, gcCode, name } = event.data;
                
                // Trouver le conteneur parent
                const containerId = event.source.frameElement?.closest('.lm_content')?.parentElement?.id;
                
                // Charger les détails de la géocache
                fetch(`/geocaches/${geocacheId}/details-panel`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        return response.text();
                    })
                    .then(html => {
                        const root = mainLayout.root;
                        const newItemConfig = {
                            type: 'component',
                            componentName: 'geocache-details',
                            title: `${gcCode} - ${name}`,
                            componentState: { 
                                html: html,
                                geocacheId: geocacheId,
                                gcCode: gcCode,
                                name: name
                            }
                        };
                        
                        // Ajouter le composant au parent ou à la racine
                        if (containerId) {
                            const container = mainLayout.root.getItemsById(containerId)[0];
                            if (container && container.parent) {
                                container.parent.addChild(newItemConfig);
                            } else {
                                root.contentItems[0].addChild(newItemConfig);
                            }
                        } else {
                            root.contentItems[0].addChild(newItemConfig);
                        }
                    })
                    .catch(error => {
                        console.error('Erreur lors du chargement des détails de la géocache:', error);
                    });
            }
            
            // Gestionnaire pour le message openPluginInterface
            if (event.data.type === 'openPluginInterface') {
                console.log('=== Layout: Message openPluginInterface reçu ===', event.data);
                
                const { pluginName } = event.data;
                
                // Trouver le conteneur parent
                const containerId = event.source.frameElement?.closest('.lm_content')?.parentElement?.id;
                
                // Utiliser la fonction existante pour ouvrir l'onglet du plugin
                if (typeof window.openPluginTab === 'function') {
                    window.openPluginTab(pluginName, pluginName);
                } else {
                    console.error('La fonction openPluginTab n\'est pas disponible');
                }
            }
            
            // Gestionnaire pour le message openMultiSolver
            else if (event.data.type === 'openMultiSolver') {
                console.log('=== Layout: Message openMultiSolver reçu ===', event.data);
                
                const { geocaches, component } = event.data;
                
                // S'assurer que les geocaches sont correctement passées au composant
                if (geocaches && component && component.componentState) {
                    // S'assurer que geocaches est présent dans component.componentState
                    component.componentState.geocaches = geocaches;
                    
                    console.log('=== Layout: Component state après modification ===', component.componentState);
                }
                
                // Trouver le conteneur parent
                const containerId = event.source.frameElement?.closest('.lm_content')?.parentElement?.id;
                
                const root = mainLayout.root;
                
                // Ajouter le composant au parent ou à la racine
                if (containerId) {
                    const container = mainLayout.root.getItemsById(containerId)[0];
                    if (container && container.parent) {
                        container.parent.addChild(component);
                        return;
                    }
                }
                root.contentItems[0].addChild(component);
            }
        });

        // Enregistrer les composants
        mainLayout.registerComponent('welcome', function(container, state) {
            const welcomeHtml = `
                <div class="p-8 max-w-4xl mx-auto">
                    <h1 class="text-3xl font-bold mb-6">Bienvenue dans MysteryAI</h1>
                    <!-- ... reste du HTML ... -->
                </div>
            `;
            container.getElement().html(welcomeHtml);
        });

        
        // Enregistrer le composant Analyse
        mainLayout.registerComponent('GeocacheAnalysis', function(container, state) {
            container.getElement().load('/geocache-analysis', {
                geocache_id: state.geocacheId,
                gc_code: state.gcCode
            });
        });
        
        // Enregistrer le composant Formula Solver
        mainLayout.registerComponent('FormulaSolver', function(container, state) {
            // Afficher un état de chargement
            container.getElement().html(`
                <div class="w-full h-full bg-gray-900 overflow-auto p-4">
                    <div class="flex items-center justify-center h-full">
                        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        <span class="ml-2 text-gray-300">Chargement...</span>
                    </div>
                </div>
            `);
            
            // Construire l'URL avec les paramètres dans la query string
            const url = `/geocaches/formula-solver?geocache_id=${encodeURIComponent(state.geocacheId || '')}&gc_code=${encodeURIComponent(state.gcCode || '')}`;
            
            // Utiliser fetch avec GET au lieu de load
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.text();
                })
                .then(html => {
                    container.getElement().html(html);
                    
                    // Démarrer Stimulus pour initialiser le contrôleur
                    if (window.StimulusApp) {
                        window.StimulusApp.start();
                    }
                })
                .catch(error => {
                    console.error('Erreur lors du chargement du Formula Solver:', error);
                    container.getElement().html(`
                        <div class="w-full h-full bg-gray-900 p-4">
                            <div class="text-red-500 mb-4">
                                <i class="fas fa-exclamation-triangle mr-2"></i>
                                Erreur lors du chargement du Formula Solver
                            </div>
                            <div class="text-gray-400 text-sm">
                                ${error.message}
                            </div>
                        </div>
                    `);
                });
        });

        // Enregistrer le composant Alphabets
        mainLayout.registerComponent('alphabets', function(container, state) {
            container.getElement().html(`
                <div class="p-4">
                    <h2 class="text-xl font-bold mb-4">Alphabets</h2>
                    <div id="alphabets-list" class="space-y-4">
                        <div class="animate-pulse">Chargement des alphabets...</div>
                    </div>
                </div>
            `);
            
            // Charger la liste des alphabets
            fetch('/api/alphabets')
                .then(response => response.json())
                .then(alphabets => {
                    const alphabetsList = container.getElement().find('#alphabets-list');
                    alphabetsList.empty();
                    
                    alphabets.forEach(alphabet => {
                        const alphabetCard = $(`
                            <div class="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 cursor-pointer">
                                <h3 class="font-semibold">${alphabet.name}</h3>
                                <p class="text-sm text-gray-300">${alphabet.description}</p>
                                <div class="text-xs text-gray-400 mt-2">Type: ${alphabet.alphabetConfig.type}</div>
                            </div>
                        `);
                        
                        alphabetsList.append(alphabetCard);
                    });
                })
                .catch(error => {
                    container.getElement().find('#alphabets-list').html(`
                        <div class="text-red-500">
                            Erreur lors du chargement des alphabets: ${error.message}
                        </div>
                    `);
                });
        });

        // Enregistrer le composant Alphabet Viewer
        mainLayout.registerComponent('alphabet-viewer', function(container, state) {
            container.getElement().load(`/api/alphabets/${state.alphabetId}/view`, function() {
                // Attendre que le DOM soit chargé
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', initializeAlphabetViewer);
                } else {
                    initializeAlphabetViewer();
                }

                function initializeAlphabetViewer() {
                    // Forcer Stimulus à scanner et initialiser les contrôleurs
                    const element = container.getElement()[0];
                    if (window.Stimulus) {
                        window.Stimulus.Application.start();
                    }
                }
            });
        });

        // Enregistrer le composant image-editor
        mainLayout.registerComponent('image-editor', function(container, state) {
            console.log('=== DEBUG: Initialisation du composant image-editor ===', state);
            
            // Charger le template de l'éditeur d'image
            fetch(`/geocaches/image-editor/${state.imageId}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.text();
                })
                .then(html => {
                    // Injecter le HTML dans le conteneur
                    container.getElement().html(html);
                    console.log('=== DEBUG: HTML injecté dans le conteneur ===');
                    
                    // Passer l'ID de l'image au template
                    const canvas = container.getElement().find('#editor-canvas')[0];
                    if (canvas) {
                        canvas.dataset.imageId = state.imageId;
                    }
                })
                .catch(error => {
                    console.error('Erreur lors du chargement du template:', error);
                    container.getElement().html(`
                        <div class="p-4 text-red-500">
                            Erreur lors du chargement de l'éditeur: ${error.message}
                        </div>
                    `);
                });
        });

        // Enregistrer le composant geocaches-table
        mainLayout.registerComponent('geocaches-table', function(container, state) {
            const containerId = container.parent.config.id;
            container.getElement().attr('data-container-id', containerId);
            
            // Utiliser l'URL de base de l'API
            const apiUrl = `${window.API_BASE_URL}/geocaches/table/${state.zoneId}`;
            console.log("Chargement du tableau depuis:", apiUrl);
            
            fetch(apiUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.text();
                })
                .then(html => {
                    container.getElement().html(html);
                    // Stocker l'ID du conteneur et l'URL de base dans des variables globales du tableau
                    const tableScript = document.createElement('script');
                    tableScript.textContent = `
                        window.currentContainerId = "${containerId}";
                        window.API_BASE_URL = "${window.API_BASE_URL}";
                    `;
                    container.getElement().append(tableScript);
                })
                .catch(error => {
                    console.error("Erreur lors du chargement du tableau:", error);
                    container.getElement().html(`
                        <div class="flex items-center justify-center h-full">
                            <div class="text-red-500">
                                Erreur lors du chargement du tableau: ${error.message}
                            </div>
                        </div>
                    `);
                });
        });

        // Enregistrer le composant openGeocacheDetails
        mainLayout.registerComponent('openGeocacheDetails', function(container, state) {
            console.log("Création du composant openGeocacheDetails pour la zone", state.zoneId);
            
            // Charger les détails et ouvrir l'onglet
            fetch(state.detailsUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.text();
                })
                .then(html => {
                    const root = mainLayout.root;
                    const newItemConfig = {
                        type: 'component',
                        componentName: 'geocache-details',
                        title: `Détails GC-${state.geocacheId}`,
                        componentState: { 
                            html: html,
                            geocacheId: state.geocacheId,
                            gcCode: state.gcCode,
                            name: state.name
                        }
                    };
                    
                    // Trouver le conteneur parent par son ID
                    const container = mainLayout.root.getItemsById(state.containerId)[0];
                    if (container && container.parent) {
                        // Ajouter le composant au parent du conteneur trouvé
                        container.parent.addChild(newItemConfig);
                    } else {
                        // Fallback : ajouter à la racine si le conteneur n'est pas trouvé
                        root.contentItems[0].addChild(newItemConfig);
                    }
                })
                .catch(error => {
                    console.error("Erreur lors du chargement des détails:", error);
                    alert("Erreur lors du chargement des détails de la géocache");
                });
        });

        // Enregistrer le composant geocache-details
        mainLayout.registerComponent('geocache-details', function(container, state) {
            const geocacheId = state.geocacheId;
            const gcCode = state.gcCode;
            const name = state.name;
            
            // Mettre à jour immédiatement l'état du composant
            container.setState({
                geocacheId: geocacheId,
                gcCode: gcCode,
                name: name
            });
            
            // Mettre à jour le titre
            container.setTitle(`${gcCode} - ${name}`);
            
            // Afficher un état de chargement
            container.getElement().html(`
                <div class="w-full h-full bg-gray-900 overflow-auto p-4">
                    <div class="flex items-center justify-center h-full">
                        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        <span class="ml-2 text-gray-300">Chargement...</span>
                    </div>
                </div>
            `);
            
            // Charger les détails de la géocache
            fetch(`/geocaches/${geocacheId}/details-panel`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.text();
                })
                .then(html => {
                    // Afficher le HTML avec les métadonnées
                    container.getElement().html(`
                        <div class="w-full h-full bg-gray-900 overflow-auto p-4">
                            <div class="flex flex-col h-full">
                                <div class="flex justify-between items-center mb-4">
                                    <h2 class="text-xl text-white">
                                        ${gcCode} - ${name}
                                    </h2>
                                    <div class="flex space-x-2">
                                        <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 save-button">
                                            <i class="fas fa-save mr-2"></i>Sauvegarder
                                        </button>
                                    </div>
                                </div>
                                <div class="flex-grow relative">
                                    ${html}
                                </div>
                            </div>
                        </div>
                    `);

                    // Initialiser les handlers
                    container.getElement().find('.save-button').on('click', function() {
                        const currentState = container.getState();
                        console.log('=== DEBUG: Sauvegarde des détails ===', currentState);
                    });
                })
                .catch(error => {
                    console.error('Erreur lors du chargement de la géocache:', error);
                    container.getElement().html(`
                        <div class="w-full h-full bg-gray-900 p-4">
                            <div class="text-red-500 mb-4">
                                <i class="fas fa-exclamation-triangle mr-2"></i>
                                Erreur lors du chargement de la géocache
                            </div>
                            <div class="text-gray-400 text-sm">
                                ${error.message}
                            </div>
                        </div>
                    `);
                });
        });

        // Enregistrer le composant geocachesMap (pour une zone)
        mainLayout.registerComponent('geocachesMap', function(container, componentState) {
            const { zoneId, title } = componentState;
            
            // Charger le contenu de la carte
            fetch(`/zone_map/${zoneId}`)
                .then(response => response.text())
                .then(html => {
                    container.getElement().html(html);
                })
                .catch(error => {
                    console.error('Erreur lors du chargement de la carte:', error);
                    container.getElement().html(`
                        <div class="w-full h-full bg-gray-900 p-4">
                            <div class="text-red-500 mb-4">
                                <i class="fas fa-exclamation-triangle mr-2"></i>
                                Erreur lors du chargement de la carte
                            </div>
                            <div class="text-gray-400 text-sm">
                                ${error.message}
                            </div>
                        </div>
                    `);
                });
        });
        
        // Enregistrer le composant geocaches-map (pour une liste de géocaches)
        mainLayout.registerComponent('geocaches-map', function(container, componentState) {
            const { geocacheIds } = componentState;
            
            if (!geocacheIds || !Array.isArray(geocacheIds) || geocacheIds.length === 0) {
                container.getElement().html(`
                    <div class="w-full h-full bg-gray-900 p-4">
                        <div class="text-red-500 mb-4">
                            <i class="fas fa-exclamation-triangle mr-2"></i>
                            Aucune géocache à afficher
                        </div>
                    </div>
                `);
                return;
            }
            
            // Afficher un état de chargement
            container.getElement().html(`
                <div class="w-full h-full bg-gray-900 p-4">
                    <div class="flex items-center justify-center h-full">
                        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        <span class="ml-2 text-gray-300">Chargement de la carte...</span>
                    </div>
                </div>
            `);
            
            // Utiliser directement le template map_panel_multi.html au lieu de l'API
            container.getElement().html(`
                <div id="map-panel" 
                     data-controller="map"
                     data-map-geocache-ids-value='${JSON.stringify(geocacheIds)}'
                     data-map-is-multi-view-value="true"
                     class="h-full">
                    <div class="map-container h-full relative" data-map-target="container">
                        <div id="base-layer-selector"></div>
                    </div>
                    <div id="popup" 
                         data-map-target="popup"
                         class="fixed bg-white shadow-lg rounded-lg z-[1000] transform -translate-x-1/2 -translate-y-full text-black" 
                         style="display: none; pointer-events: none; background-color: white; color: black;">
                        <div data-map-target="popupContent" class="p-3 bg-white" style="color: black;"></div>
                        <div class="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
                            <div class="w-3 h-3 bg-white transform rotate-45 -translate-y-1.5 shadow-lg"></div>
                        </div>
                    </div>
                </div>
            `);
            
            // Démarrer Stimulus pour initialiser le contrôleur
            if (window.StimulusApp) {
                setTimeout(() => {
                    console.log("%c[MapController] Démarrage de Stimulus pour initialiser le contrôleur map", "background:blue; color:white");
                    window.StimulusApp.start();
                }, 100);
            }
        });

        // Enregistrer le composant geocaches-map-panel (avec le format map_panel)
        mainLayout.registerComponent('geocaches-map-panel', function(container, componentState) {
            const { geocacheIds } = componentState;
            
            if (!geocacheIds || !Array.isArray(geocacheIds) || geocacheIds.length === 0) {
                container.getElement().html(`
                    <div class="w-full h-full bg-gray-900 p-4">
                        <div class="text-red-500 mb-4">
                            <i class="fas fa-exclamation-triangle mr-2"></i>
                            Aucune géocache à afficher
                        </div>
                    </div>
                `);
                return;
            }
            
            console.log('Chargement de la mini carte pour', geocacheIds.length, 'géocaches');
            
            // Afficher un état de chargement
            container.getElement().html(`
                <div class="w-full h-full bg-gray-900 p-4">
                    <div class="flex items-center justify-center h-full">
                        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        <span class="ml-2 text-gray-300">Chargement de la carte...</span>
                    </div>
                </div>
            `);
            
            // Charger le template du panneau de carte
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
                // Injecter le HTML dans le conteneur
                container.getElement().html(html);
                
                // Initialiser le contrôleur Stimulus
                if (window.StimulusApp) {
                    window.StimulusApp.start();
                }
            })
            .catch(error => {
                console.error('Erreur lors du chargement de la carte:', error);
                container.getElement().html(`
                    <div class="w-full h-full bg-gray-900 p-4">
                        <div class="text-red-500 mb-4">
                            <i class="fas fa-exclamation-triangle mr-2"></i>
                            Erreur lors du chargement de la carte
                        </div>
                        <div class="text-gray-400 text-sm">
                            ${error.message}
                        </div>
                    </div>
                `);
            });
        });

        // Enregistrer le composant geocache-solver
        mainLayout.registerComponent('geocache-solver', function(container, state) {
            container.getElement().html('<div class="loading">Loading...</div>');
            
            // Déterminer l'URL en fonction de la présence d'un ID de géocache
            const url = state.geocacheId ? 
                `/geocaches/${state.geocacheId}/solver/panel` : 
                '/geocaches/solver/panel';
            
            // Charger le contenu du solver via HTMX
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.text();
                })
                .then(html => {
                    container.getElement().html(html);
                    
                    // Réinitialiser les contrôleurs Stimulus dans le composant
                    const $element = container.getElement();
                    const domElement = $element[0]; // Obtenir l'élément DOM à partir de jQuery
                    
                    if (window.StimulusApp && window.StimulusApp.controllers) {
                        window.StimulusApp.controllers.forEach(controller => {
                            if (controller.element && domElement.contains(controller.element)) {
                                controller.disconnect();
                            }
                        });
                    }
                    
                    // Démarrer Stimulus
                    if (window.StimulusApp) {
                        window.StimulusApp.start();
                    }
                })
                .catch(error => {
                    console.error('Erreur de chargement du solver:', error);
                    container.getElement().html(`<div class="error">Erreur: ${error.message}</div>`);
                });
        });

        // Enregistrer le composant map pour afficher des géocaches filtrées
        mainLayout.registerComponent('map', function(container, componentState) {
            const { geocacheIds } = componentState;
            
            if (!geocacheIds || !Array.isArray(geocacheIds) || geocacheIds.length === 0) {
                container.getElement().html(`
                    <div class="w-full h-full bg-gray-900 p-4">
                        <div class="text-red-500 mb-4">
                            <i class="fas fa-exclamation-triangle mr-2"></i>
                            Aucune géocache à afficher
                        </div>
                    </div>
                `);
                return;
            }
            
            // Afficher un état de chargement
            container.getElement().html(`
                <div class="w-full h-full bg-gray-900 p-4 relative">
                    <div class="flex items-center justify-center h-full">
                        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        <span class="ml-2 text-gray-300">Chargement de la carte...</span>
                    </div>
                </div>
            `);

            // Créer la structure HTML pour le contrôleur map
            const mapHtml = `
                <div class="h-full w-full bg-gray-900" 
                     data-controller="map"
                     data-action="map-controller-ready@window->map#loadFilteredGeocaches"
                     data-map-filtered-geocache-ids-value='${JSON.stringify(geocacheIds)}'>
                    <div class="map-container h-full relative" data-map-target="container">
                        <div id="base-layer-selector"></div>
                    </div>
                    <div id="popup" 
                         data-map-target="popup"
                         class="fixed bg-white shadow-lg rounded-lg z-[1000] transform -translate-x-1/2 -translate-y-full text-black" 
                         style="display: none; pointer-events: none; background-color: white; color: black;">
                        <div data-map-target="popupContent" class="p-3 bg-white" style="color: black;"></div>
                        <div class="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
                            <div class="w-3 h-3 bg-white transform rotate-45 -translate-y-1.5 shadow-lg"></div>
                        </div>
                    </div>
                </div>
            `;
            
            // Injecter le HTML et initialiser Stimulus
            container.getElement().html(mapHtml);
            
            // Démarrer Stimulus
            if (window.StimulusApp) {
                setTimeout(() => {
                    console.log("Initialisation du contrôleur map...");
                    window.StimulusApp.start();
                }, 100);
            }
        });

        // Enregistrer le composant Plugin
        mainLayout.registerComponent('plugin', function(container, state) {
            // Construire l'URL avec les paramètres
            const params = new URLSearchParams(state);
            const url = `/api/plugins/${state.pluginName}/interface?${params.toString()}`;
            container.getElement().load(url);
        });

        // Enregistrer le composant multi-solver
        mainLayout.registerComponent('multi-solver', function(container, state) {
            console.log("Création du composant multi-solver", state);
            
            // Définir une URL par défaut
            let url = '/multi-solver';
            
            // S'assurer que les geocaches sont correctement formatées et disponibles
            if (state.geocaches) {
                try {
                    let geocachesData = Array.isArray(state.geocaches) ? state.geocaches : JSON.parse(state.geocaches);
                    console.log('Geocaches disponibles dans le component state:', {
                        count: geocachesData.length,
                        sample: geocachesData.slice(0, 3)
                    });
                    
                    // Mettre à jour l'état pour s'assurer qu'il contient le tableau complet
                    state.geocaches = geocachesData;
                    
                    // Encoder les geocaches dans l'URL
                    const geocachesParam = encodeURIComponent(JSON.stringify(geocachesData));
                    console.log('URL finale du multi-solver:', `/multi-solver?geocaches=${geocachesParam}`);
                    
                    // Construire l'URL complète
                    url = `/multi-solver?geocaches=${geocachesParam}`;
                    
                    // Stocker temporairement pour l'utiliser après le chargement
                    window.currentMultiSolverGeocaches = geocachesData;
                } catch (e) {
                    console.error('Erreur lors du traitement des geocaches pour multi-solver:', e);
                }
            }
            
            // Afficher un état de chargement
            container.getElement().html(`
                <div class="w-full h-full bg-gray-900 overflow-auto p-4">
                    <div class="flex items-center justify-center h-full">
                        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        <span class="ml-2 text-gray-300">Chargement du multi-solver...</span>
                    </div>
                </div>
            `);
            
            console.log("Chargement du multi-solver depuis l'URL:", url);
            
            // Charger le contenu du multi-solver depuis l'URL
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.text();
                })
                .then(html => {
                    // Avant d'injecter le HTML, s'assurer que les données sont préservées
                    const currentState = container.getState() || {};
                    
                    // Injecter le HTML dans le conteneur
                    container.getElement().html(html);
                    
                    // S'il s'agit d'un multi-solver, injecter les géocaches après le chargement
                    if (state.geocaches) {
                        const geocaches = window.currentMultiSolverGeocaches || [];
                        
                        // Rechercher ou créer l'iframe du contenu
                        setTimeout(function() {
                            const iframe = container.getElement().find('iframe')[0] || 
                                          container.getElement()[0].querySelector('iframe');
                            
                            if (iframe) {
                                console.log('Transmission des geocaches après chargement HTML:', geocaches.length);
                                
                                // Méthode 1: Stocker directement dans l'objet iframe
                                try {
                                    iframe.contentWindow.injectedGeocaches = geocaches;
                                    console.log("%c[GoldenLayout] Injection directe des géocaches", "background:green; color:white");
                                } catch (e) {
                                    console.error('Erreur lors de l\'injection directe des geocaches:', e);
                                }
                                
                                // Méthode 2: Envoyer un événement
                                try {
                                    const event = new CustomEvent('geocachesInjected', {
                                        detail: { geocaches: geocaches }
                                    });
                                    iframe.contentDocument.dispatchEvent(event);
                                } catch (e) {
                                    console.error('Erreur lors de l\'envoi de l\'événement geocachesInjected:', e);
                                }
                            } else {
                                console.error('Iframe non trouvé pour injecter les géocaches');
                                
                                // Méthode alternative: ajouter un script directement au container
                                try {
                                    const script = document.createElement('script');
                                    script.textContent = `
                                        (function() {
                                            console.log("%c[GoldenLayout] Injection via script des géocaches", "background:purple; color:white");
                                            window.injectedGeocaches = ${JSON.stringify(geocaches)};
                                            
                                            // Déclencher un événement personnalisé pour notifier le script
                                            document.dispatchEvent(new CustomEvent('geocachesInjected', {
                                                detail: { geocaches: window.injectedGeocaches }
                                            }));
                                        })();
                                    `;
                                    container.getElement()[0].appendChild(script);
                                } catch (e) {
                                    console.error('Erreur lors de l\'injection via script:', e);
                                }
                            }
                        }, 500); // Délai pour s'assurer que le contenu est chargé
                    }
                })
                .catch(error => {
                    console.error("Erreur lors du chargement du multi-solver:", error);
                    container.getElement().html(`
                        <div class="w-full h-full bg-gray-900 overflow-auto p-4">
                            <div class="flex items-center justify-center h-full">
                                <div class="text-red-500">
                                    Erreur lors du chargement du multi-solver: ${error.message}
                                </div>
                            </div>
                        </div>
                    `);
                });
        });

        // Enregistrer le composant WebSearch
        mainLayout.registerComponent('WebSearch', function(container, state) {
            // Afficher un état de chargement
            container.getElement().html(`
                <div class="w-full h-full bg-gray-900 overflow-auto p-4">
                    <div class="flex items-center justify-center h-full">
                        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        <span class="ml-2 text-gray-300">Chargement...</span>
                    </div>
                </div>
            `);
            
            // Construire l'URL avec les paramètres
            const searchTerm = state.searchTerm;
            if (!searchTerm) {
                container.getElement().html(`
                    <div class="w-full h-full bg-gray-900 overflow-auto p-4">
                        <div class="flex items-center justify-center h-full">
                            <div class="text-red-500">Erreur: Terme de recherche manquant</div>
                        </div>
                    </div>
                `);
                return;
            }
            
            // Créer une iframe qui charge Google Search
            const encodedSearch = encodeURIComponent(searchTerm);
            const iframeHtml = `
                <div class="w-full h-full bg-gray-900 overflow-auto">
                    <iframe 
                        src="https://www.google.com/search?q=${encodedSearch}&igu=1" 
                        class="w-full h-full border-none"
                        sandbox="allow-scripts allow-same-origin allow-forms">
                    </iframe>
                </div>
            `;
            
            container.getElement().html(iframeHtml);
        });

        // Enregistrer le composant external-url pour afficher des pages web externes dans un iframe
        mainLayout.registerComponent('external-url', function(container, componentState) {
            const { url, autoFillScript, icon } = componentState;
            
            // Utiliser l'icône spécifiée si disponible, sinon utiliser une icône par défaut
            if (icon) {
                container.setTitle(`<i class="fas fa-${icon}"></i> ${container.title}`);
            }
            
            // Afficher un état de chargement
            container.getElement().html(`
                <div class="w-full h-full bg-gray-900 p-4">
                    <div class="flex items-center justify-center h-full">
                        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        <span class="ml-2 text-gray-300">Chargement de la page externe...</span>
                    </div>
                </div>
            `);
            
            // Générer un ID unique pour l'iframe
            const iframeId = `iframe-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            
            // Créer l'iframe
            const iframeHtml = `
                <div class="w-full h-full bg-white overflow-hidden">
                    <iframe 
                        id="${iframeId}" 
                        src="${url}" 
                        class="w-full h-full border-0" 
                        allowfullscreen
                    ></iframe>
                </div>
            `;
            
            container.getElement().html(iframeHtml);
            
            // Si un script d'auto-remplissage est fourni, l'injecter dans l'iframe après chargement
            if (autoFillScript) {
                const iframe = document.getElementById(iframeId);
                
                if (iframe) {
                    iframe.addEventListener('load', function() {
                        try {
                            // Accéder au document de l'iframe
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                            
                            // Créer un élément script
                            const scriptElement = iframeDoc.createElement('script');
                            scriptElement.textContent = autoFillScript;
                            
                            // Ajouter le script au document de l'iframe
                            iframeDoc.body.appendChild(scriptElement);
                            
                            console.log('Script auto-remplissage injecté dans l\'iframe');
                        } catch (error) {
                            console.error('Erreur lors de l\'injection du script dans l\'iframe:', error);
                        }
                    });
                }
            }
        });

        mainLayout.init();

        // Ajuster la taille lors du redimensionnement de la fenêtre
        window.addEventListener('resize', () => {
            mainLayout.updateSize();
        });

        console.log('=== Layout: Initialisation terminée ===');

        // Ajouter le gestionnaire d'événements pour le bouton Map dans geocaches_table.html
        document.addEventListener('click', function(event) {
            const mapButton = event.target.closest('[id^="openMapButton"]');
            if (!mapButton) return;

            // Récupérer zoneId depuis l'attribut data-zone-id
            const zoneId = mapButton.dataset.zoneId;
            const title = `Map - Zone ${zoneId}`;

            // Récupérer les IDs des géocaches filtrées directement via Tabulator
            // au lieu d'utiliser getFilteredGeocacheIds
            const tableId = `geocaches-table-${zoneId}`;
            
            // Obtenir l'instance Tabulator 
            let filteredGeocacheIds = [];
            const tabulatorInstance = Tabulator.findTable(`#${tableId}`)[0];
            
            if (tabulatorInstance) {
                // Récupérer les données filtrées directement depuis l'instance Tabulator
                const filteredData = tabulatorInstance.getData("active");
                console.log(`${filteredData.length} géocaches filtrées trouvées pour la carte`);
                filteredGeocacheIds = filteredData.map(row => row.id);
            } else {
                console.error("Impossible de trouver l'instance Tabulator pour la table:", tableId);
                
                // Essayer de récupérer l'instance Tabulator via la variable globale
                const table = window[`tabulator_${tableId}`];
                if (table) {
                    const allData = window[`allGeocachesData_${tableId}`] || table.getData();
                    // Comme nous ne pouvons pas accéder à getFilteredGeocaches, utiliser toutes les données
                    filteredGeocacheIds = allData.map(row => row.id);
                    console.log(`Utilisation de toutes les données (${filteredGeocacheIds.length} géocaches)`);
                } else {
                    console.error("Impossible de trouver la variable globale pour la table:", tableId);
                }
            }
            
            if (!filteredGeocacheIds || filteredGeocacheIds.length === 0) {
                // Afficher un message si aucune géocache n'est filtrée
                alert('Aucune géocache à afficher sur la carte.');
                return;
            }

            // Créer un nouvel onglet avec le contrôleur map
            mainLayout.root.contentItems[0].addChild({
                type: 'component',
                componentName: 'map',  // Utiliser le contrôleur map
                title: `Carte (${filteredGeocacheIds.length} géocaches)`,
                componentState: {
                    geocacheIds: filteredGeocacheIds,  // Passer les IDs des géocaches filtrées
                    title: title
                }
            });
        });

    } catch (error) {
        console.error('Erreur lors de l\'initialisation du layout:', error);
    }
}

// Fonction utilitaire pour rechercher un composant existant de manière récursive
function findExistingComponent(rootItem, criteria) {
    if (!rootItem) {
        console.log('=== DEBUG: Item racine null ou undefined ===');
        return null;
    }
    
    console.log('=== DEBUG: Recherche dans:', rootItem.type, rootItem.id);
    
    // Si c'est un composant qui correspond aux critères
    if (criteria(rootItem)) {
        console.log('=== DEBUG: Composant correspondant trouvé! ===', rootItem.id);
        return rootItem;
    }
    
    // Si l'item a des enfants, chercher récursivement
    if (rootItem.contentItems && rootItem.contentItems.length > 0) {
        console.log(`=== DEBUG: Examen des ${rootItem.contentItems.length} enfants de ${rootItem.id || rootItem.type} ===`);
        for (let i = 0; i < rootItem.contentItems.length; i++) {
            const childItem = rootItem.contentItems[i];
            const found = findExistingComponent(childItem, criteria);
            if (found) return found;
        }
    }
    
    // Rien trouvé dans cette branche
    return null;
}

// Fonction pour ouvrir un onglet de plugin
window.openPluginTab = function(pluginName, title, params = {}) {
    try {
        console.log('openPluginTab called with:', { pluginName, title, params });
        console.log('Type de params.geocacheId:', typeof params.geocacheId);
        
        const componentState = {
            pluginName: pluginName,
            ...params  // Ajouter les paramètres supplémentaires
        };
        
        // Chercher si un onglet avec ce plugin existe déjà
        let existingComponent = null;
        
        // Pour le plugin analysis_web_page avec un geocacheId, chercher un composant GeocacheAnalysis
        if (pluginName === 'analysis_web_page' && params.geocacheId) {
            console.log('=== DEBUG: Début de recherche des onglets GeocacheAnalysis existants (récursive) ===');
            
            // Critère de recherche pour GeocacheAnalysis
            const criteria = function(item) {
                if (item.config && item.config.componentName === 'GeocacheAnalysis') {
                    const state = item.config.componentState || {};
                    const itemGeocacheId = state.geocacheId;
                    
                    console.log(`Vérification GeocacheAnalysis:`, {
                        itemGeocacheId: itemGeocacheId,
                        providedGeocacheId: params.geocacheId,
                        itemGeocacheIdType: typeof itemGeocacheId,
                        providedGeocacheIdType: typeof params.geocacheId,
                        areEqual: String(itemGeocacheId) === String(params.geocacheId)
                    });
                    
                    return String(itemGeocacheId) === String(params.geocacheId);
                }
                return false;
            };
            
            // Recherche récursive à partir de la racine
            for (let i = 0; i < window.mainLayout.root.contentItems.length; i++) {
                existingComponent = findExistingComponent(window.mainLayout.root.contentItems[i], criteria);
                if (existingComponent) break;
            }
            
            console.log('=== DEBUG: Fin de recherche récursive, existingComponent:', existingComponent ? 'trouvé' : 'non trouvé');
        } else {
            // Sinon, chercher un composant plugin standard
            console.log('=== DEBUG: Début de recherche des onglets plugin standard (récursive) ===');
            
            // Critère de recherche pour plugin standard
            const criteria = function(item) {
                if (item.config && item.config.componentName === 'plugin') {
                    const state = item.config.componentState || {};
                    return state.pluginName === pluginName;
                }
                return false;
            };
            
            // Recherche récursive à partir de la racine
            for (let i = 0; i < window.mainLayout.root.contentItems.length; i++) {
                existingComponent = findExistingComponent(window.mainLayout.root.contentItems[i], criteria);
                if (existingComponent) break;
            }
            
            console.log('=== DEBUG: Fin de recherche récursive, existingComponent:', existingComponent ? 'trouvé' : 'non trouvé');
        }

        if (existingComponent) {
            // Si l'onglet existe, le mettre en focus
            console.log('=== DEBUG: Onglet existant trouvé, focus ===');
            existingComponent.parent.setActiveContentItem(existingComponent);
        } else {
            // Vérifier si les onglets doivent s'ouvrir dans la même section
            // MODIFICATION: Utiliser prioritairement le paramètre openInSameTab s'il est fourni
            let openInSameSection = params.openInSameTab !== undefined ? params.openInSameTab : true;
            
            // Si openInSameTab n'est pas défini, utiliser la configuration globale
            if (params.openInSameTab === undefined && window.PluginGoldenLayoutIntegration && 
                typeof window.PluginGoldenLayoutIntegration.shouldOpenInSameSection === 'function') {
                openInSameSection = window.PluginGoldenLayoutIntegration.shouldOpenInSameSection();
            }
            
            console.log(`=== DEBUG: openPluginTab: Utilisation du paramètre openInSameSection = ${openInSameSection} ===`);
            
            // Pour le plugin analysis_web_page avec un geocacheId, utiliser le composant GeocacheAnalysis
            if (pluginName === 'analysis_web_page' && params.geocacheId) {
                // Trouver le conteneur actif où ajouter le composant
                let targetContainer;
                
                if (openInSameSection && window.lastActiveTab && window.lastActiveTab.parent) {
                    // Utiliser directement le parent de l'onglet actif mémorisé
                    targetContainer = window.lastActiveTab.parent;
                    console.log('=== DEBUG: Utilisation du parent direct du dernier onglet actif ===', {
                        parentType: targetContainer.type,
                        parentId: targetContainer.id
                    });
                } else {
                    // Fallback sur la racine ou l'item sélectionné
                    targetContainer = window.mainLayout.selectedItem || window.mainLayout.root.contentItems[0];
                    console.log('=== DEBUG: Fallback sur selectedItem ou la racine ===');
                }
                
                // Si le conteneur actif n'est pas un "stack" ou "row", remonter jusqu'à en trouver un
                // Mais seulement si on n'a pas déjà un parent direct fiable
                if (!window.lastActiveTab || !window.lastActiveTab.parent) {
                    while (targetContainer && targetContainer.type !== 'stack' && targetContainer.type !== 'row' && targetContainer.parent) {
                        targetContainer = targetContainer.parent;
                    }
                }
                
                // Si on n'a pas trouvé de conteneur approprié, utiliser le root
                if (!targetContainer || (targetContainer.type !== 'stack' && targetContainer.type !== 'row')) {
                    targetContainer = window.mainLayout.root.contentItems[0];
                    console.log('=== DEBUG: Fallback ultime sur la racine ===');
                }
                
                console.log('=== DEBUG: Création d\'un nouveau composant GeocacheAnalysis ===');
                targetContainer.addChild({
                    type: 'component',
                    componentName: 'GeocacheAnalysis',
                    title: title || pluginName,
                    componentState: {
                        geocacheId: params.geocacheId,
                        gcCode: params.gcCode
                    }
                });
            } else {
                // Sinon, créer un nouvel onglet de plugin standard
                // Trouver le conteneur actif où ajouter le composant
                let targetContainer;
                
                if (openInSameSection && window.lastActiveTab && window.lastActiveTab.parent) {
                    // Utiliser directement le parent de l'onglet actif mémorisé
                    targetContainer = window.lastActiveTab.parent;
                    console.log('=== DEBUG: Utilisation du parent direct du dernier onglet actif ===', {
                        parentType: targetContainer.type,
                        parentId: targetContainer.id
                    });
                } else {
                    // Fallback sur la racine ou l'item sélectionné
                    targetContainer = window.mainLayout.selectedItem || window.mainLayout.root.contentItems[0];
                    console.log('=== DEBUG: Fallback sur selectedItem ou la racine ===');
                }
                
                // Si le conteneur actif n'est pas un "stack" ou "row", remonter jusqu'à en trouver un
                // Mais seulement si on n'a pas déjà un parent direct fiable
                if (!window.lastActiveTab || !window.lastActiveTab.parent) {
                    while (targetContainer && targetContainer.type !== 'stack' && targetContainer.type !== 'row' && targetContainer.parent) {
                        targetContainer = targetContainer.parent;
                    }
                }
                
                // Si on n'a pas trouvé de conteneur approprié, utiliser le root
                if (!targetContainer || (targetContainer.type !== 'stack' && targetContainer.type !== 'row')) {
                    targetContainer = window.mainLayout.root.contentItems[0];
                    console.log('=== DEBUG: Fallback ultime sur la racine ===');
                }
                
                console.log('=== DEBUG: Création d\'un nouveau composant plugin standard ===');
                targetContainer.addChild({
                    type: 'component',
                    componentName: 'plugin',
                    title: title || pluginName,
                    componentState: componentState
                });
            }
        }
    } catch (error) {
        console.error('Erreur lors de l\'ouverture du plugin:', error);
    }
};

// Fonction pour ouvrir le Solver dans un nouvel onglet
window.openSolverTab = function(geocacheId = null, gcCode = null, openInSameTab = true) {
    try {
        console.log('openSolverTab called with:', { geocacheId, gcCode, openInSameTab });
        console.log('Type de geocacheId:', typeof geocacheId);
        
        // Titre par défaut si aucune géocache n'est spécifiée
        const title = geocacheId ? `Solver - ${gcCode}` : "Solver";
        
        // Chercher si un onglet Solver existe déjà avec ce geocacheId spécifique
        let existingComponent = null;
        
        console.log('=== DEBUG: Début de recherche des onglets Solver existants (récursive) ===');
        
        // Critère de recherche pour geocache-solver
        const criteria = function(item) {
            if (item.config && item.config.componentName === 'geocache-solver') {
                const state = item.config.componentState || {};
                const itemGeocacheId = state.geocacheId;
                
                console.log(`Vérification geocache-solver:`, {
                    itemGeocacheId: itemGeocacheId,
                    providedGeocacheId: geocacheId,
                    itemGeocacheIdType: typeof itemGeocacheId,
                    providedGeocacheIdType: typeof geocacheId,
                    areEqual: geocacheId ? (String(itemGeocacheId) === String(geocacheId)) : !itemGeocacheId
                });
                
                // Soit un onglet sans geocacheId si on n'en a pas fourni
                // Soit un onglet avec le même geocacheId si on en a fourni un
                return geocacheId ? 
                    (String(itemGeocacheId) === String(geocacheId)) : 
                    !itemGeocacheId;
            }
            return false;
        };
        
        // Recherche récursive à partir de la racine
        for (let i = 0; i < window.mainLayout.root.contentItems.length; i++) {
            existingComponent = findExistingComponent(window.mainLayout.root.contentItems[i], criteria);
            if (existingComponent) break;
        }
        
        console.log('=== DEBUG: Fin de recherche récursive, existingComponent:', existingComponent ? 'trouvé' : 'non trouvé');

        if (existingComponent) {
            // Si l'onglet existe, le mettre en focus
            console.log('=== DEBUG: Onglet Solver existant trouvé, focus ===');
            existingComponent.parent.setActiveContentItem(existingComponent);
        } else {
            // Vérifier si les onglets doivent s'ouvrir dans la même section
            // MODIFICATION: Utiliser prioritairement le paramètre openInSameTab s'il est fourni
            let openInSameSection = openInSameTab; // Utiliser directement le paramètre
            
            // Si le paramètre n'est pas défini explicitement, utiliser la configuration globale
            if (openInSameTab === undefined && window.PluginGoldenLayoutIntegration && 
                typeof window.PluginGoldenLayoutIntegration.shouldOpenInSameSection === 'function') {
                openInSameSection = window.PluginGoldenLayoutIntegration.shouldOpenInSameSection();
            }
            
            console.log(`=== DEBUG: openSolverTab: Utilisation du paramètre openInSameSection = ${openInSameSection} ===`);
            
            // Trouver le conteneur actif où ajouter le composant
            let targetContainer;
                
            if (openInSameSection && window.lastActiveTab && window.lastActiveTab.parent) {
                // Utiliser directement le parent de l'onglet actif mémorisé
                targetContainer = window.lastActiveTab.parent;
                console.log('=== DEBUG: Utilisation du parent direct du dernier onglet actif ===', {
                    parentType: targetContainer.type,
                    parentId: targetContainer.id
                });
            } else {
                // Fallback sur la racine ou l'item sélectionné
                targetContainer = window.mainLayout.selectedItem || window.mainLayout.root.contentItems[0];
                console.log('=== DEBUG: Fallback sur selectedItem ou la racine ===');
            }
            
            // Si le conteneur actif n'est pas un "stack" ou "row", remonter jusqu'à en trouver un
            // Mais seulement si on n'a pas déjà un parent direct fiable
            if (!window.lastActiveTab || !window.lastActiveTab.parent) {
                while (targetContainer && targetContainer.type !== 'stack' && targetContainer.type !== 'row' && targetContainer.parent) {
                    targetContainer = targetContainer.parent;
                }
            }
            
            // Si on n'a pas trouvé de conteneur approprié, utiliser le root
            if (!targetContainer || (targetContainer.type !== 'stack' && targetContainer.type !== 'row')) {
                targetContainer = window.mainLayout.root.contentItems[0];
                console.log('=== DEBUG: Fallback ultime sur la racine ===');
            }
            
            // Créer un nouvel onglet
            console.log('=== DEBUG: Création d\'un nouveau composant Solver ===');
            targetContainer.addChild({
                type: 'component',
                componentName: 'geocache-solver',
                title: title,
                componentState: { 
                    geocacheId: geocacheId,
                    gcCode: gcCode
                }
            });
        }
    } catch (error) {
        console.error('Erreur lors de l\'ouverture du Solver:', error);
    }
};

// Fonction pour ouvrir le Formula Solver dans un nouvel onglet
window.openFormulaSolverTab = function(geocacheId = null, gcCode = null, openInSameTab = true) {
    try {
        console.log('openFormulaSolverTab called with:', { geocacheId, gcCode, openInSameTab });
        console.log('Type de geocacheId:', typeof geocacheId);
        
        // Titre par défaut si aucune géocache n'est spécifiée
        const title = geocacheId ? `Formula Solver - ${gcCode}` : "Formula Solver";
        
        // Chercher si un onglet Formula Solver existe déjà pour cette géocache
        let existingComponent = null;
        
        console.log('=== DEBUG: Début de recherche des onglets FormulaSolver existants (récursive) ===');
        
        // Critère de recherche pour FormulaSolver
        const criteria = function(item) {
            if (item.config && item.config.componentName === 'FormulaSolver') {
                const state = item.config.componentState || {};
                const itemGeocacheId = state.geocacheId;
                
                console.log(`Vérification FormulaSolver:`, {
                    itemGeocacheId: itemGeocacheId,
                    providedGeocacheId: geocacheId,
                    itemGeocacheIdType: typeof itemGeocacheId,
                    providedGeocacheIdType: typeof geocacheId,
                    areEqual: geocacheId ? (String(itemGeocacheId) === String(geocacheId)) : !itemGeocacheId
                });
                
                // Soit un onglet sans geocacheId si on n'en a pas fourni
                // Soit un onglet avec le même geocacheId si on en a fourni un
                return geocacheId ? 
                    (String(itemGeocacheId) === String(geocacheId)) : 
                    !itemGeocacheId;
            }
            return false;
        };
        
        // Recherche récursive à partir de la racine
        for (let i = 0; i < window.mainLayout.root.contentItems.length; i++) {
            existingComponent = findExistingComponent(window.mainLayout.root.contentItems[i], criteria);
            if (existingComponent) break;
        }
        
        console.log('=== DEBUG: Fin de recherche récursive, existingComponent:', existingComponent ? 'trouvé' : 'non trouvé');

        if (existingComponent) {
            // Si l'onglet existe, le mettre en focus
            console.log('=== DEBUG: Onglet Formula Solver existant trouvé, focus ===');
            existingComponent.parent.setActiveContentItem(existingComponent);
        } else {
            // Vérifier si les onglets doivent s'ouvrir dans la même section
            // MODIFICATION: Utiliser prioritairement le paramètre openInSameTab s'il est fourni
            let openInSameSection = openInSameTab; // Utiliser directement le paramètre
            
            // Si le paramètre n'est pas défini explicitement, utiliser la configuration globale
            if (openInSameTab === undefined && window.PluginGoldenLayoutIntegration && 
                typeof window.PluginGoldenLayoutIntegration.shouldOpenInSameSection === 'function') {
                openInSameSection = window.PluginGoldenLayoutIntegration.shouldOpenInSameSection();
            }
            
            console.log(`=== DEBUG: openFormulaSolverTab: Utilisation du paramètre openInSameSection = ${openInSameSection} ===`);
            
            // Trouver le conteneur actif où ajouter le composant
            let targetContainer;
                
            if (openInSameSection && window.lastActiveTab && window.lastActiveTab.parent) {
                // Utiliser directement le parent de l'onglet actif mémorisé
                targetContainer = window.lastActiveTab.parent;
                console.log('=== DEBUG: Utilisation du parent direct du dernier onglet actif ===', {
                    parentType: targetContainer.type,
                    parentId: targetContainer.id
                });
            } else {
                // Fallback sur la racine ou l'item sélectionné
                targetContainer = window.mainLayout.selectedItem || window.mainLayout.root.contentItems[0];
                console.log('=== DEBUG: Fallback sur selectedItem ou la racine ===');
            }
            
            // Si le conteneur actif n'est pas un "stack" ou "row", remonter jusqu'à en trouver un
            // Mais seulement si on n'a pas déjà un parent direct fiable
            if (!window.lastActiveTab || !window.lastActiveTab.parent) {
                while (targetContainer && targetContainer.type !== 'stack' && targetContainer.type !== 'row' && targetContainer.parent) {
                    targetContainer = targetContainer.parent;
                }
            }
            
            // Si on n'a pas trouvé de conteneur approprié, utiliser le root
            if (!targetContainer || (targetContainer.type !== 'stack' && targetContainer.type !== 'row')) {
                targetContainer = window.mainLayout.root.contentItems[0];
                console.log('=== DEBUG: Fallback ultime sur la racine ===');
            }
            
            // Créer un nouvel onglet
            console.log('=== DEBUG: Création d\'un nouveau composant Formula Solver ===');
            targetContainer.addChild({
                type: 'component',
                componentName: 'FormulaSolver',
                title: title,
                componentState: { 
                    geocacheId: geocacheId,
                    gcCode: gcCode
                }
            });
        }
    } catch (error) {
        console.error('Erreur lors de l\'ouverture du Formula Solver:', error);
    }
};

// Fonction pour ouvrir un onglet de géocaches
window.openGeocachesTab = function(zoneId, zoneName) {
    const componentId = `geocaches-${zoneId}`;
    
    let existingComponent = null;
    window.mainLayout.root.contentItems.forEach(item => {
        item.contentItems.forEach(subItem => {
            if (subItem.config.id === componentId) {
                existingComponent = subItem;
            }
        });
    });

    if (existingComponent) {
        existingComponent.parent.setActiveContentItem(existingComponent);
        return;
    }

    const componentConfig = {
        type: 'component',
        componentName: 'geocaches-table',
        title: `Géocaches - ${zoneName}`,
        id: `geocaches-table-${zoneId}`,
        componentState: { 
            zoneId: zoneId,
            zoneName: zoneName
        }
    };

    if (window.mainLayout.root.contentItems[0].type === 'row') {
        window.mainLayout.root.contentItems[0].addChild(componentConfig);
    } else {
        window.mainLayout.root.contentItems[0].addChild({
            type: 'row',
            content: [componentConfig]
        });
    }
};

function updateGeocacheCode(geocacheId) {
    // Mettre à jour le panneau de notes
    const notesPanel = document.querySelector('.notes-panel');
    if (notesPanel) {
        notesPanel.setAttribute('data-geocache-id', geocacheId);
        const notesController = application.getControllerForElementAndIdentifier(notesPanel, 'notes');
        if (notesController) {
            notesController.loadNotes(geocacheId);
        }
    }
}

// Fonction pour ouvrir une recherche web dans un nouvel onglet GoldenLayout
window.openWebSearchTab = function(searchTerm, title = null) {
    try {
        console.log('openWebSearchTab called with:', { searchTerm });
        
        if (!searchTerm) {
            console.error('Terme de recherche manquant');
            return;
        }
        
        // Titre par défaut si aucun titre n'est spécifié
        const searchTitle = title || `Recherche: ${searchTerm.substring(0, 30)}${searchTerm.length > 30 ? '...' : ''}`;
        
        // Créer un nouvel onglet
        window.mainLayout.root.contentItems[0].addChild({
            type: 'component',
            componentName: 'WebSearch',
            title: searchTitle,
            componentState: { 
                searchTerm: searchTerm
            }
        });
    } catch (error) {
        console.error('Erreur lors de l\'ouverture de la recherche web:', error);
    }
};