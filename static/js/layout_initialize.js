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
            fetch(`http://127.0.0.1:3000/geocaches/image-editor/${state.imageId}`)
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
                    
                    // Attendre que le DOM et Fabric.js soient chargés
                    const waitForFabric = () => {
                        if (typeof fabric === 'undefined') {
                            console.log('=== DEBUG: Fabric.js pas encore chargé, réessai dans 100ms ===');
                            setTimeout(waitForFabric, 100);
                            return;
                        }
                        
                        console.log('=== DEBUG: Fabric.js chargé, initialisation de l\'éditeur ===');
                        initializeEditor();
                    };

                    const initializeEditor = () => {
                        const canvas = container.getElement().find('#canvas')[0];
                        if (!canvas) {
                            console.error('=== DEBUG: Canvas non trouvé, réessai dans 100ms ===');
                            setTimeout(initializeEditor, 100);
                            return;
                        }

                        const imageUrl = canvas.dataset.imageUrl;
                        if (!imageUrl) {
                            console.error('=== DEBUG: URL de l\'image non trouvée ===');
                            return;
                        }

                        console.log('=== DEBUG: Canvas trouvé ===', canvas);
                        console.log('=== DEBUG: URL de l\'image ===', imageUrl);

                        // Vérifier que l'URL est accessible
                        fetch(imageUrl)
                            .then(response => {
                                console.log('=== DEBUG: Réponse de l\'image ===', response.status, response.statusText);
                                if (!response.ok) {
                                    throw new Error(`HTTP error! status: ${response.status}`);
                                }
                                return response.blob();
                            })
                            .then(() => {
                                // L'image est accessible, on peut l'utiliser avec Fabric
                                const containerWidth = container.width;
                                const containerHeight = container.height;
                                console.log('=== DEBUG: Dimensions du conteneur ===', containerWidth, containerHeight);

                                // Créer le canvas avec les dimensions du conteneur
                                const fabricCanvas = new fabric.Canvas('canvas', {
                                    width: containerWidth,
                                    height: containerHeight,
                                    backgroundColor: '#2D3748' // bg-gray-700
                                });

                                // Charger l'image
                                fabric.Image.fromURL(imageUrl, function(img) {
                                    if (!img) {
                                        console.error('Erreur lors du chargement de l\'image');
                                        return;
                                    }
                                    console.log('=== DEBUG: Image Fabric.js créée ===', img.width, img.height);
                                    
                                    // Calculer le ratio pour ajuster l'image au canvas
                                    const scaleX = containerWidth / img.width;
                                    const scaleY = containerHeight / img.height;
                                    const scale = Math.min(scaleX, scaleY);
                                    
                                    // Appliquer l'échelle et centrer l'image
                                    img.set({
                                        scaleX: scale,
                                        scaleY: scale,
                                        left: (containerWidth - img.width * scale) / 2,
                                        top: (containerHeight - img.height * scale) / 2,
                                        selectable: false,
                                        evented: false
                                    });

                                    // Ajouter l'image au canvas
                                    fabricCanvas.add(img);
                                    fabricCanvas.renderAll();
                                    
                                    console.log('=== DEBUG: Image chargée avec succès ===');
                                    console.log('=== DEBUG: Dimensions finales ===', {
                                        canvas: { width: containerWidth, height: containerHeight },
                                        image: { 
                                            width: img.width * scale, 
                                            height: img.height * scale,
                                            scale: scale,
                                            position: { left: img.left, top: img.top }
                                        }
                                    });

                                    // Initialiser les outils
                                    initializeTools(fabricCanvas);
                                }, {
                                    crossOrigin: 'anonymous'
                                });
                            })
                            .catch(error => {
                                console.error('=== DEBUG: Erreur lors de la vérification de l\'image ===', error);
                                container.getElement().html(`
                                    <div class="p-4 text-red-500">
                                        Erreur lors du chargement de l'image: ${error.message}
                                    </div>
                                `);
                            });
                    };

                    // Démarrer l'initialisation
                    waitForFabric();
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

        // Enregistrer le composant geocache-details
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

        function initializeTools(canvas) {
            // Gestion des outils
            const tools = document.querySelectorAll('[data-tool]');
            tools.forEach(tool => {
                tool.addEventListener('click', function() {
                    const toolName = this.dataset.tool;
                    tools.forEach(t => t.classList.remove('active'));
                    this.classList.add('active');

                    switch(toolName) {
                        case 'select':
                            canvas.isDrawingMode = false;
                            break;
                        case 'brush':
                            canvas.isDrawingMode = true;
                            canvas.freeDrawingBrush.width = 5;
                            break;
                        case 'text':
                            const text = new fabric.IText('Double-cliquez pour éditer', {
                                left: 100,
                                top: 100,
                                fontFamily: 'Arial',
                                fill: '#ffffff'
                            });
                            canvas.add(text);
                            break;
                    }
                });
            });

            // Gestion des actions
            const actions = document.querySelectorAll('[data-action]');
            actions.forEach(action => {
                action.addEventListener('click', function() {
                    const actionName = this.dataset.action;
                    switch(actionName) {
                        case 'undo':
                            if (canvas._objects.length > 0) {
                                canvas.remove(canvas._objects[canvas._objects.length - 1]);
                            }
                            break;
                        case 'redo':
                            // À implémenter
                            break;
                    }
                });
            });

            // Gestion des propriétés
            const colorPicker = document.querySelector('input[type="color"]');
            colorPicker.addEventListener('change', function() {
                if (canvas.isDrawingMode) {
                    canvas.freeDrawingBrush.color = this.value;
                } else if (canvas.getActiveObject()) {
                    canvas.getActiveObject().set('fill', this.value);
                    canvas.renderAll();
                }
            });

            const sizeSlider = document.querySelector('input[type="range"]');
            sizeSlider.addEventListener('input', function() {
                if (canvas.isDrawingMode) {
                    canvas.freeDrawingBrush.width = parseInt(this.value);
                }
            });

            // Gestion de la sauvegarde
            document.getElementById('save-btn').addEventListener('click', function() {
                const dataUrl = canvas.toDataURL({
                    format: 'png',
                    quality: 1
                });

                const saveUrl = document.getElementById('save-btn').dataset.saveUrl;
                fetch(saveUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        image_data: dataUrl
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Image sauvegardée avec succès!');
                    } else {
                        alert('Erreur lors de la sauvegarde: ' + data.error);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Erreur lors de la sauvegarde');
                });
            });
        }

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