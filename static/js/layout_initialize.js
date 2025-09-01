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
                isStack: item.isStack,
                componentName: item.componentName,
                config: item.config
            });

            // FORCER l'ID s'il n'est pas défini
            if (item.isComponent && (!item.id || item.id === 'undefined')) {
                if (item.config && item.config.id) {
                    item.id = item.config.id;
                    console.log('🔧 Layout: ID forcé pour le composant:', item.id);
                } else if (item.componentName === 'geocache-details' && item.config?.componentState?.geocacheId) {
                    item.id = `geocache-details-${item.config.componentState.geocacheId}`;
                    console.log('🔧 Layout: ID généré pour geocache-details:', item.id);
                } else {
                    item.id = `${item.componentName || 'component'}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                    console.log('🔧 Layout: ID généré par défaut:', item.id);
                }
            }
            
            if (item.isStack && (!item.id || item.id === 'undefined')) {
                item.id = `stack-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                console.log('🔧 Layout: ID généré pour stack:', item.id);
            }

            if (item.isStack) {
                window.layoutStateManager.registerStack(item);
            } else if (item.isComponent) {
                // Enregistrer le composant avec ses métadonnées
                const metadata = {
                    ...(item.config.componentState || {}),
                    componentName: item.componentName
                };
                
                console.log('📝 Layout: Enregistrement du composant avec métadonnées:', {
                    id: item.id,
                    componentName: item.componentName,
                    metadata: metadata
                });
                
                window.layoutStateManager.registerComponent(item, metadata);
                
                // Si c'est un composant geocache-details, déclencher immédiatement la mise à jour
                if (item.componentName === 'geocache-details' && metadata.geocacheId && metadata.gcCode) {
                    console.log('🚀 Layout: Déclenchement immédiat de geocacheSelected pour le nouveau composant');
                    setTimeout(() => {
                        document.dispatchEvent(new CustomEvent('geocacheSelected', {
                            detail: {
                                geocacheId: metadata.geocacheId,
                                gcCode: metadata.gcCode
                            }
                        }));
                    }, 100); // Petit délai pour laisser le composant se finaliser
                }
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
            console.log('🔄 UpdateGeocacheCode appelé avec:', contentItem?.id, contentItem?.componentName);
            
            if (!contentItem) {
                console.log('⚠️ UpdateGeocacheCode: contentItem est null/undefined');
                return;
            }
            
            // Essayer plusieurs sources pour obtenir les données
            let state = null;
            let geocacheId = null;
            let gcCode = null;
            
            // Source 1: config.componentState
            if (contentItem.config && contentItem.config.componentState) {
                state = contentItem.config.componentState;
                console.log('📋 UpdateGeocacheCode: Données trouvées dans config.componentState:', state);
            }
            
            // Source 2: getState() method
            if (!state && contentItem.getState) {
                try {
                    state = contentItem.getState();
                    console.log('📋 UpdateGeocacheCode: Données trouvées dans getState():', state);
                } catch (e) {
                    console.log('⚠️ UpdateGeocacheCode: Erreur getState():', e);
                }
            }
            
            // Source 3: metadata depuis LayoutStateManager
            if (!state && window.layoutStateManager) {
                const componentInfo = window.layoutStateManager.getActiveComponentInfo();
                if (componentInfo && componentInfo.metadata) {
                    state = componentInfo.metadata;
                    console.log('📋 UpdateGeocacheCode: Données trouvées dans LayoutStateManager:', state);
                }
            }
            
            // Extraire les données
            if (state) {
                geocacheId = state.geocacheId;
                gcCode = state.gcCode;
                console.log('✅ UpdateGeocacheCode: Données extraites - ID:', geocacheId, 'Code:', gcCode);
            }
            
            if (gcCode) {
                // Mettre à jour le code GC
                const geocacheCodeElement = document.querySelector('.geocache-code');
                if (geocacheCodeElement) {
                    geocacheCodeElement.textContent = gcCode;
                    console.log('✅ UpdateGeocacheCode: Code GC mis à jour:', gcCode);
                } else {
                    console.log('⚠️ UpdateGeocacheCode: Élément .geocache-code non trouvé');
                }
                
                // NOTE: Ne pas déclencher geocacheSelected ici pour éviter la boucle infinie
                // L'événement est déjà déclenché dans itemCreated et LayoutStateManager
                
                // Mettre à jour les notes si le panneau est actif
                const notesPanel = document.getElementById('notes-panel');
                if (notesPanel && notesPanel.classList.contains('active') && geocacheId) {
                    const notesContent = document.getElementById('notes-content');
                    if (notesContent) {
                        console.log('🗒️ UpdateGeocacheCode: Chargement des notes pour ID:', geocacheId);
                        htmx.ajax('GET', `/api/logs/notes_panel?geocacheId=${geocacheId}`, {
                            target: '#notes-content',
                            swap: 'innerHTML'
                        });
                    }
                }
                
                // Mettre à jour les logs si le panneau est actif
                const logsPanel = document.getElementById('logs-panel');
                if (logsPanel && logsPanel.classList.contains('active') && geocacheId) {
                    const logsContent = document.getElementById('logs-content');
                    if (logsContent) {
                        console.log('📋 UpdateGeocacheCode: Chargement des logs pour ID:', geocacheId);
                        htmx.ajax('GET', `/api/logs/logs_panel?geocacheId=${geocacheId}`, {
                            target: '#logs-content',
                            swap: 'innerHTML'
                        });
                    }
                }
                
                // Mettre à jour la carte si le panneau est actif
                const mapPanel = document.getElementById('map-panel');
                if (mapPanel && mapPanel.classList.contains('active') && geocacheId) {
                    console.log('🗺️ UpdateGeocacheCode: Chargement de la carte pour ID:', geocacheId);
                    // Utiliser la bonne URL pour charger le panneau de carte
                    htmx.ajax('GET', `/api/logs/map_panel?geocacheId=${geocacheId}`, {
                        target: '#map-panel',
                        swap: 'innerHTML'
                    });
                }
            } else {
                console.log('⚠️ UpdateGeocacheCode: Aucun gcCode trouvé - pas de mise à jour du panel');
                
                // Réinitialiser l'affichage si aucune géocache n'est active
                const geocacheCodeElement = document.querySelector('.geocache-code');
                if (geocacheCodeElement) {
                    geocacheCodeElement.textContent = '';
                }
            }
        }

        // ------------------------------------------------------------------
        // Mettre à jour le panneau Informations selon l'onglet actif
        // ------------------------------------------------------------------
        function updateInformationPanel(contentItem) {
            try {
                if (!contentItem || !contentItem.config) return;

                const state = contentItem.config.componentState || {};

                // Si l'onglet actif est un plugin, afficher son README
                if (contentItem.componentName === 'plugin' && state.pluginName) {
                    const infoPanel = document.getElementById('informations-panel');
                    if (infoPanel) {
                        htmx.ajax('GET', `/api/plugins/${encodeURIComponent(state.pluginName)}/info_panel`, {
                            target: '#informations-panel',
                            swap: 'innerHTML'
                        });
                    }
                }
                // Si l'onglet actif est un alphabet, afficher son README
                else if (contentItem.componentName === 'alphabet-viewer' && state.alphabetId) {
                    const infoPanel = document.getElementById('informations-panel');
                    if (infoPanel) {
                        htmx.ajax('GET', `/api/alphabets/${encodeURIComponent(state.alphabetId)}/info_panel`, {
                            target: '#informations-panel',
                            swap: 'innerHTML'
                        });
                    }
                }
                // Si l'onglet n'est PAS un plugin, on rétablit l'affichage générique
                else {
                    const infoPanel = document.getElementById('informations-panel');
                    if (infoPanel) {
                        htmx.ajax('GET', '/api/informations_panel', {
                            target: '#informations-panel',
                            swap: 'innerHTML'
                        });
                    }
                }
            } catch (e) {
                console.error('Erreur updateInformationPanel:', e);
            }
        }

        // Gestionnaire pour le changement de composant actif dans une stack
        mainLayout.on('activeContentItemChanged', function(contentItem) {
            updateGeocacheCode(contentItem);
            updateInformationPanel(contentItem);
        });

        // Gestionnaire pour le focus d'une stack
        mainLayout.on('stackCreated', function(stack) {
            stack.on('activeContentItemChanged', function(contentItem) {
                updateGeocacheCode(contentItem);
                updateInformationPanel(contentItem);
            });

            // Gérer le clic sur les onglets de la stack
            stack.header.tabs.forEach(tab => {
                tab.element.addEventListener('click', () => {
                    updateGeocacheCode(tab.contentItem);
                    updateInformationPanel(tab.contentItem);
                });
            });
        });

        // Gestionnaire pour les nouveaux items créés
        mainLayout.on('itemCreated', function(item) {
            if (item.type === 'stack') {
                item.on('activeContentItemChanged', function(contentItem) {
                    updateGeocacheCode(contentItem);
                    updateInformationPanel(contentItem);
                });
            }
        });

        // Gestionnaire pour le focus global
        mainLayout.on('focus', function() {
            const activeContentItem = mainLayout.selectedItem;
            if (activeContentItem) {
                updateGeocacheCode(activeContentItem);
                updateInformationPanel(activeContentItem);
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
            console.log('🔧 Geocache-details: Initialisation avec:', { container, state });
            
            // Validation des paramètres d'entrée
            if (!container) {
                console.error('❌ Geocache-details: Container est undefined');
                return;
            }
            
            if (!state) {
                console.error('❌ Geocache-details: State est undefined');
                return;
            }
            
            const geocacheId = state.geocacheId;
            const gcCode = state.gcCode;
            const name = state.name;
            
            console.log('📋 Geocache-details: Données extraites:', { geocacheId, gcCode, name });
            
            // S'assurer que config existe
            if (!container.config) {
                console.log('⚠️ Geocache-details: container.config n\'existe pas, création');
                container.config = {};
            }
            
            // S'assurer que l'ID du composant est défini
            if (!container.config.id) {
                container.config.id = `geocache-details-${geocacheId}`;
                console.log('🆔 Geocache-details: ID assigné:', container.config.id);
            }
            
            // Mettre à jour immédiatement l'état du composant ET componentState
            const componentState = {
                geocacheId: geocacheId,
                gcCode: gcCode,
                name: name
            };
            
            console.log('💾 Geocache-details: Mise à jour de l\'état avec:', componentState);
            
            try {
                container.setState(componentState);
                console.log('✅ Geocache-details: setState réussi');
            } catch (error) {
                console.error('❌ Geocache-details: Erreur setState:', error);
            }
            
            // IMPORTANT: Aussi mettre à jour componentState dans config pour que updateGeocacheCode fonctionne
            if (!container.config.componentState) {
                container.config.componentState = {};
            }
            Object.assign(container.config.componentState, componentState);
            console.log('🔄 Geocache-details: ComponentState mis à jour dans config');
            
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
            console.log('🗺️ Composant geocaches-map initialisé avec componentState:', componentState);
            
            const { geocacheIds } = componentState;
            console.log('🗺️ geocacheIds extraits:', geocacheIds);
            
            if (!geocacheIds || !Array.isArray(geocacheIds) || geocacheIds.length === 0) {
                console.error('❌ Aucune géocache à afficher - geocacheIds:', geocacheIds);
                container.getElement().html(`
                    <div class="w-full h-full bg-gray-900 p-4">
                        <div class="text-red-500 mb-4">
                            <i class="fas fa-exclamation-triangle mr-2"></i>
                            Aucune géocache à afficher
                        </div>
                        <div class="text-gray-400 text-sm">
                            Debug: geocacheIds = ${JSON.stringify(geocacheIds)}
                        </div>
                    </div>
                `);
                return;
            }
            
            console.log(`✅ Initialisation de la carte avec ${geocacheIds.length} géocaches:`, geocacheIds);
            
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
            
            console.log('🗺️ HTML de la carte injecté avec geocacheIds:', geocacheIds);
            
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

        // Enregistrer un composant générique pour charger un panneau de settings interne
        mainLayout.registerComponent('settings-panel', function(container, state) {
            try {
                const url = (state && state.url) || '/api/settings/plugins_panel';
                container.getElement().load(url);
            } catch (e) {
                container.getElement().html(`
                    <div class="w-full h-full bg-gray-900 overflow-auto p-4">
                        <div class="flex items-center justify-center h-full">
                            <div class="text-red-500">Erreur lors du chargement du panneau: ${e && e.message ? e.message : 'inconnue'}</div>
                        </div>
                    </div>
                `);
            }
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

        // Enregistrer le composant pipelines-editor (charge une page HTML via URL)
        mainLayout.registerComponent('pipelines-editor', function(container, state) {
            try {
                const $el = container.getElement();
                $el.html(`
                    <div class="w-full h-full bg-gray-900 overflow-auto p-4">
                        <div class="flex items-center justify-center h-full">
                            <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                            <span class="ml-2 text-gray-300">Chargement de l'éditeur de pipelines…</span>
                        </div>
                    </div>
                `);

                const url = (state && (state.url || state.href || state.panelUrl)) || '/api/ai/pipelines/editor';

                fetch(url, { credentials: 'include' })
                    .then(resp => {
                        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                        return resp.text();
                    })
                    .then(html => {
                        $el.html(html);
                        // Exécuter les scripts inline du contenu injecté
                        const el = $el[0];
                        const scripts = el.querySelectorAll('script');
                        scripts.forEach(original => {
                            const s = document.createElement('script');
                            if (original.src) {
                                s.src = original.src;
                            } else {
                                s.textContent = original.textContent || '';
                            }
                            document.body.appendChild(s);
                            document.body.removeChild(s);
                        });
                        // Démarrer Stimulus si nécessaire
                        if (window.StimulusApp) {
                            window.StimulusApp.start();
                        }
                    })
                    .catch(err => {
                        $el.html(`
                            <div class="w-full h-full bg-gray-900 p-4">
                                <div class="text-red-500 mb-2"><i class="fas fa-exclamation-triangle mr-2"></i>Erreur de chargement</div>
                                <div class="text-gray-400 text-sm">${(err && err.message) || 'inconnue'}</div>
                            </div>
                        `);
                    });
            } catch (e) {
                console.error('pipelines-editor: erreur initialisation', e);
                container.getElement().html(`<div class="p-4 text-red-500">Erreur: ${e && e.message ? e.message : 'inconnue'}</div>`);
            }
        });

        // Enregistrer le composant models-editor (éditeur JSON models.user.json)
        mainLayout.registerComponent('models-editor', function(container, state) {
            try {
                const $el = container.getElement();
                $el.html(`
                    <div class="w-full h-full bg-gray-900 overflow-auto p-4">
                        <div class="flex items-center justify-center h-full">
                            <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                            <span class="ml-2 text-gray-300">Chargement de l'éditeur de modèles…</span>
                        </div>
                    </div>
                `);

                const url = (state && (state.url || state.href || state.panelUrl)) || '/api/ai/models/editor';

                fetch(url, { credentials: 'include' })
                    .then(resp => {
                        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                        return resp.text();
                    })
                    .then(html => {
                        $el.html(html);
                        // Exécuter les scripts inline du contenu injecté
                        const el = $el[0];
                        const scripts = el.querySelectorAll('script');
                        scripts.forEach(original => {
                            const s = document.createElement('script');
                            if (original.src) {
                                s.src = original.src;
                            } else {
                                s.textContent = original.textContent || '';
                            }
                            document.body.appendChild(s);
                            document.body.removeChild(s);
                        });
                        if (window.StimulusApp) {
                            window.StimulusApp.start();
                        }
                    })
                    .catch(err => {
                        $el.html(`
                            <div class="w-full h-full bg-gray-900 p-4">
                                <div class="text-red-500 mb-2"><i class="fas fa-exclamation-triangle mr-2"></i>Erreur de chargement</div>
                                <div class="text-gray-400 text-sm">${(err && err.message) || 'inconnue'}</div>
                            </div>
                        `);
                    });
            } catch (e) {
                console.error('models-editor: erreur initialisation', e);
                container.getElement().html(`<div class="p-4 text-red-500">Erreur: ${e && e.message ? e.message : 'inconnue'}</div>`);
            }
        });

        mainLayout.init();

        // Ajuster la taille lors du redimensionnement de la fenêtre
        window.addEventListener('resize', () => {
            mainLayout.updateSize();
        });

                // Variable pour éviter les déclenchements multiples de geocacheSelected
        let lastProcessedGeocache = null;
        let processingGeocacheEvent = false;
        
        // Écouter les événements de sélection de géocache pour mettre à jour les panels
        document.addEventListener('geocacheSelected', function(event) {
            const { geocacheId, gcCode } = event.detail;
            
            // Éviter le traitement multiple de la même géocache
            if (processingGeocacheEvent || lastProcessedGeocache === geocacheId) {
                console.log('⏭️ Layout: Événement geocacheSelected ignoré (déjà en cours de traitement):', { geocacheId, gcCode });
                return;
            }
            
            processingGeocacheEvent = true;
            lastProcessedGeocache = geocacheId;
            
            console.log('📢 Layout: Événement geocacheSelected reçu:', { geocacheId, gcCode });
            
            // Forcer la mise à jour de tous les panels actifs
            const panels = ['map-panel', 'notes-panel', 'logs-panel'];
            
            panels.forEach(panelId => {
                const panel = document.getElementById(panelId);
                if (panel && panel.classList.contains('active')) {
                    console.log(`🔄 Layout: Mise à jour du panel ${panelId} pour la géocache ${geocacheId}`);
                    
                    let url = '';
                    switch (panelId) {
                                            case 'map-panel':
                        url = `/api/logs/map_panel?geocacheId=${geocacheId}`;
                        break;
                        case 'notes-panel':
                            url = `/api/logs/notes_panel?geocacheId=${geocacheId}`;
                            break;
                        case 'logs-panel':
                            url = `/api/logs/logs_panel?geocacheId=${geocacheId}`;
                            break;
                    }
                    
                    if (url) {
                        htmx.ajax('GET', url, {
                            target: `#${panelId}`,
                            swap: 'innerHTML'
                        });
                    }
                }
            });
            
            // Libérer le flag après un délai
            setTimeout(() => {
                processingGeocacheEvent = false;
            }, 500);
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

// Fonction pour ouvrir un onglet de plugin
window.openPluginTab = function(pluginName, title, params = {}) {
    try {
        console.log('openPluginTab called with:', { pluginName, title, params });
        
        const componentState = {
            pluginName: pluginName,
            ...params  // Ajouter les paramètres supplémentaires
        };
        
        // Chercher si un onglet avec ce plugin existe déjà
        let existingComponent = null;
        window.mainLayout.root.contentItems.forEach(function(item) {
            item.contentItems.forEach(function(subItem) {
                if (subItem.config.componentName === 'plugin' && 
                    subItem.config.componentState.pluginName === pluginName) {
                    existingComponent = subItem;
                }
            });
        });

        if (existingComponent) {
            // Si l'onglet existe, le mettre en focus
            existingComponent.parent.setActiveContentItem(existingComponent);
        } else {
            // Pour le plugin analysis_web_page avec un geocacheId, utiliser le composant GeocacheAnalysis
            if (pluginName === 'analysis_web_page' && params.geocacheId) {
                window.mainLayout.root.contentItems[0].addChild({
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
                window.mainLayout.root.contentItems[0].addChild({
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
window.openSolverTab = function(geocacheId = null, gcCode = null) {
    try {
        console.log('openSolverTab called with:', { geocacheId, gcCode });
        
        // Titre par défaut si aucune géocache n'est spécifiée
        const title = geocacheId ? `Solver - ${gcCode}` : "Solver";
        
        // Chercher si un onglet Solver existe déjà (sans géocache spécifique)
        let existingComponent = null;
        window.mainLayout.root.contentItems.forEach(function(item) {
            item.contentItems.forEach(function(subItem) {
                if (subItem.config.componentName === 'geocache-solver' && 
                    !subItem.config.componentState.geocacheId) {
                    existingComponent = subItem;
                }
            });
        });

        if (existingComponent && !geocacheId) {
            // Si l'onglet existe et qu'on n'a pas spécifié de géocache, le mettre en focus
            existingComponent.parent.setActiveContentItem(existingComponent);
        } else {
            // Sinon, créer un nouvel onglet
            window.mainLayout.root.contentItems[0].addChild({
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
window.openFormulaSolverTab = function(geocacheId = null, gcCode = null) {
    try {
        console.log('openFormulaSolverTab called with:', { geocacheId, gcCode });
        
        // Titre par défaut si aucune géocache n'est spécifiée
        const title = geocacheId ? `Formula Solver - ${gcCode}` : "Formula Solver";
        
        // Chercher si un onglet Formula Solver existe déjà pour cette géocache
        let existingComponent = null;
        window.mainLayout.root.contentItems.forEach(function(item) {
            item.contentItems.forEach(function(subItem) {
                if (subItem.config.componentName === 'FormulaSolver' && 
                    subItem.config.componentState.geocacheId === geocacheId) {
                    existingComponent = subItem;
                }
            });
        });

        if (existingComponent) {
            // Si l'onglet existe, le mettre en focus
            existingComponent.parent.setActiveContentItem(existingComponent);
        } else {
            // Sinon, créer un nouvel onglet
            window.mainLayout.root.contentItems[0].addChild({
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