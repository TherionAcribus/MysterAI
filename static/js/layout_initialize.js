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

        // Enregistrer les composants avant l'initialisation
        mainLayout.registerComponent('welcome', function(container, state) {
            const welcomeHtml = `
                <div class="p-8 max-w-4xl mx-auto">
                    <h1 class="text-3xl font-bold mb-6">Bienvenue dans MysteryAI</h1>
                    <!-- ... reste du HTML ... -->
                </div>
            `;
            container.getElement().html(welcomeHtml);
        });

        // Initialiser le layout
        mainLayout.init();

        // Maintenant on peut logger l'état après initialisation
        console.log('=== DEBUG: État du layout après initialisation ===');
        console.log('mainLayout:', mainLayout);
        console.log('Root:', mainLayout.root);
        if (mainLayout.root) {
            console.log('ContentItems:', mainLayout.root.contentItems);
        } else {
            console.error('=== DEBUG: Root est null après initialisation ===');
        }

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
                            geocacheId: state.geocacheId
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

        mainLayout.registerComponent('geocache-details', function(container, state) {
            console.log("Création du composant geocache-details", state);
            
            const html = `
                <div class="w-full h-full bg-gray-900 overflow-auto p-4">
                    <div class="flex flex-col h-full">
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="text-xl text-white">Détails de la Géocache</h2>
                            <div class="flex space-x-2">
                                <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 save-button">
                                    <i class="fas fa-save mr-2"></i>Sauvegarder
                                </button>
                            </div>
                        </div>
                        <div class="flex-grow relative">
                            ${state.html}
                        </div>
                    </div>
                </div>
            `;
            
            container.getElement().html(html);
            
            // Initialiser les handlers
            container.getElement().find('.save-button').on('click', function() {
                console.log('=== DEBUG: Sauvegarde des détails ===', state);
                // TODO: Implémenter la sauvegarde
            });
        });

        mainLayout.registerComponent('image-editor', function(container, state) {
            console.log('=== DEBUG: Création du composant image-editor ===', state);
            
            // Récupérer l'image source originale
            const originalImage = document.querySelector(`img[data-image-id="${state.imageId}"]`);
            const imageUrl = originalImage ? originalImage.src : '';
            
            console.log('=== DEBUG: URL de l\'image source ===', imageUrl);
            
            container.getElement().html(`
                <div class="w-full h-full bg-gray-900 overflow-auto p-4">
                    <div class="flex flex-col h-full">
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="text-xl text-white">Éditeur d'Image</h2>
                            <div class="flex space-x-2">
                                <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 save-button">
                                    <i class="fas fa-save mr-2"></i>Sauvegarder
                                </button>
                            </div>
                        </div>
                        <div class="flex-grow relative">
                            <img src="${imageUrl}"
                                 class="max-w-full h-auto"
                                 alt="Image à éditer"
                                 data-image-id="${state.imageId}">
                        </div>
                    </div>
                </div>
            `);

            // Gérer le redimensionnement si nécessaire
            container.on('resize', function() {
                console.log('=== DEBUG: Redimensionnement de l\'éditeur d\'image ===');
            });
        });

        // Fonction pour ouvrir l'éditeur d'image
        window.exposeOpenImageEditor = function(imageId, imageName) {
            console.log('=== DEBUG: Exposition de openImageEditor appelée ===', { imageId, imageName });
            
            try {
                // Trouver le conteneur principal (row)
                const rootContentItem = mainLayout.root.contentItems[0];
                
                // Configuration du composant
                const componentConfig = {
                    type: 'component',
                    componentName: 'image-editor',
                    componentState: { 
                        imageId: imageId,
                        imageName: imageName
                    },
                    title: `Éditeur - ${imageName || `Image ${imageId}`}`,
                    id: `image-editor-${imageId}`
                };

                // Si c'est un stack, ajouter directement
                if (rootContentItem.isStack) {
                    rootContentItem.addChild(componentConfig);
                } else {
                    // Sinon, trouver ou créer un stack
                    let stack = rootContentItem.contentItems.find(item => item.isStack);
                    if (!stack) {
                        stack = mainLayout.createContentItem({
                            type: 'stack',
                            content: []
                        });
                        rootContentItem.addChild(stack);
                    }
                    stack.addChild(componentConfig);
                }

                console.log('=== DEBUG: Composant éditeur ajouté avec succès ===');
            } catch (error) {
                console.error('=== DEBUG: Erreur lors de l\'ajout du composant ===', error);
            }
        };

        // Exposer l'instance Golden Layout globalement
        window.goldenlayout = mainLayout;

        // Écouter l'événement openGeocacheDetails depuis les iframes
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'openGeocacheDetails') {
                const geocacheId = event.data.geocacheId;
                const containerId = event.data.containerId;
                const detailsUrl = event.data.detailsUrl;
                console.log("Réception de l'événement openGeocacheDetails pour la géocache", geocacheId);
                console.log("Container ID:", containerId);
                console.log("URL des détails:", detailsUrl);
                
                // Charger les détails et ouvrir l'onglet
                fetch(detailsUrl)
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
                            title: `Détails GC-${geocacheId}`,
                            componentState: { 
                                html: html,
                                geocacheId: geocacheId
                            }
                        };
                        
                        // Trouver le conteneur parent par son ID
                        const container = mainLayout.root.getItemsById(containerId)[0];
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
            }
        });

        mainLayout.init();
        window.mainLayout = mainLayout;

        window.addEventListener('resize', () => {
            mainLayout.updateSize();
        });
    } catch (error) {
        console.error('Golden Layout error:', error);
    }
}

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