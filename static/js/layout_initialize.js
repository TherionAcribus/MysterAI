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
        
        mainLayout = new GoldenLayout(config, document.getElementById('layoutContainer'));
        window.mainLayout = mainLayout;

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
                console.log('=== Layout: Message reçu ===', event.data);
                
                const { geocacheId, gcCode, name } = event.data;
                
                // Trouver le conteneur parent
                const containerId = event.source.frameElement?.closest('.lm_content')?.parentElement?.id;
                
                // Charger les détails de la géocache
                fetch(`http://127.0.0.1:3000/geocaches/${geocacheId}/details-panel`)
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
                                return;
                            }
                        }
                        root.contentItems[0].addChild(newItemConfig);
                    })
                    .catch(error => {
                        console.error("Erreur lors du chargement des détails:", error);
                        alert("Erreur lors du chargement des détails de la géocache");
                    });
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
            fetch(`http://127.0.0.1:3000/geocaches/${geocacheId}/details-panel`)
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

        // Enregistrer le composant geocachesMap
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

        // Enregistrer le composant Plugin
        mainLayout.registerComponent('plugin', function(container, state) {
            // Construire l'URL avec les paramètres
            const params = new URLSearchParams(state);
            const url = `/api/plugins/${state.pluginName}/interface?${params.toString()}`;
            container.getElement().load(url);
        });

        mainLayout.init();

        // Ajuster la taille lors du redimensionnement de la fenêtre
        window.addEventListener('resize', () => {
            mainLayout.updateSize();
        });

        console.log('=== Layout: Initialisation terminée ===');

        // Ajouter le gestionnaire d'événements pour le bouton Map dans geocaches_table.html
        document.addEventListener('click', function(event) {
            const mapButton = event.target.closest('#openMapButton');
            if (!mapButton) return;

            const zoneId = mapButton.dataset.zoneId;
            const title = `Map - Zone ${zoneId}`;

            // Créer un nouvel onglet avec la carte
            mainLayout.root.contentItems[0].addChild({
                type: 'component',
                componentName: 'geocachesMap',
                title: title,
                componentState: {
                    zoneId: zoneId,
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
        mainLayout.root.contentItems.forEach(function(item) {
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
            // Sinon, créer un nouvel onglet
            mainLayout.root.contentItems[0].addChild({
                type: 'component',
                componentName: 'plugin',
                title: title || pluginName,
                componentState: componentState
            });
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
        mainLayout.root.contentItems.forEach(function(item) {
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
            mainLayout.root.contentItems[0].addChild({
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

// Fonction pour ouvrir un onglet de géocaches
window.openGeocachesTab = function(zoneId, zoneName) {
    const componentId = `geocaches-${zoneId}`;
    
    let existingComponent = null;
    mainLayout.root.contentItems.forEach(item => {
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

    if (mainLayout.root.contentItems[0].type === 'row') {
        mainLayout.root.contentItems[0].addChild(componentConfig);
    } else {
        mainLayout.root.contentItems[0].addChild({
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