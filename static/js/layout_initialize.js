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

        function initializeTools(canvas) {
            // État des outils
            let currentTool = null;
            let isDrawing = false;
            let startX = 0;
            startY = 0;
            let activeShape = null;

            const toolState = {
                brush: {
                    color: '#000000',
                    size: 5
                },
                shape: {
                    color: '#000000',
                    border: 2,
                    fill: false,
                    fillColor: '#000000'
                }
            };

            // Gestion des outils
            const tools = document.querySelectorAll('[data-tool]');
            const brushControls = document.querySelector('.brush-controls');
            const shapeControls = document.querySelector('.shape-controls');
            
            // Contrôles du pinceau
            const brushColor = document.querySelector('#brush-color');
            const brushSize = document.querySelector('#brush-size');
            const brushSizeValue = document.querySelector('#brush-size-value');

            // Contrôles des formes
            const shapeColor = document.querySelector('#shape-color');
            const shapeBorder = document.querySelector('#shape-border');
            const shapeBorderValue = document.querySelector('#shape-border-value');
            const shapeFill = document.querySelector('#shape-fill');
            const shapeFillColor = document.querySelector('#shape-fill-color');
            const shapeFillColorContainer = document.querySelector('.shape-fill-color');

            // Initialiser les contrôles
            if (brushColor) brushColor.value = toolState.brush.color;
            if (brushSize) brushSize.value = toolState.brush.size;
            if (brushSizeValue) brushSizeValue.textContent = `${toolState.brush.size}px`;
            if (shapeColor) shapeColor.value = toolState.shape.color;
            if (shapeBorder) shapeBorder.value = toolState.shape.border;
            if (shapeBorderValue) shapeBorderValue.textContent = `${toolState.shape.border}px`;
            if (shapeFillColor) shapeFillColor.value = toolState.shape.fillColor;

            // Gérer les contrôles des formes
            shapeColor?.addEventListener('change', (e) => {
                toolState.shape.color = e.target.value;
                if (activeShape) {
                    activeShape.set('stroke', e.target.value);
                    canvas.renderAll();
                }
            });

            shapeBorder?.addEventListener('input', (e) => {
                const size = parseInt(e.target.value);
                toolState.shape.border = size;
                shapeBorderValue.textContent = `${size}px`;
                if (activeShape) {
                    activeShape.set('strokeWidth', size);
                    canvas.renderAll();
                }
            });

            shapeFill?.addEventListener('change', (e) => {
                toolState.shape.fill = e.target.checked;
                shapeFillColorContainer?.classList.toggle('hidden', !e.target.checked);
                if (activeShape) {
                    activeShape.set('fill', e.target.checked ? toolState.shape.fillColor : 'transparent');
                    canvas.renderAll();
                }
            });

            shapeFillColor?.addEventListener('change', (e) => {
                toolState.shape.fillColor = e.target.value;
                if (activeShape && toolState.shape.fill) {
                    activeShape.set('fill', e.target.value);
                    canvas.renderAll();
                }
            });

            // Gérer les changements de couleur du pinceau
            brushColor?.addEventListener('change', (e) => {
                toolState.brush.color = e.target.value;
                if (currentTool === 'brush') {
                    canvas.freeDrawingBrush.color = e.target.value;
                }
            });

            // Gérer les changements de taille du pinceau
            brushSize?.addEventListener('input', (e) => {
                const size = parseInt(e.target.value);
                toolState.brush.size = size;
                brushSizeValue.textContent = `${size}px`;
                if (currentTool === 'brush') {
                    canvas.freeDrawingBrush.width = size;
                }
            });

            // Désactiver la sélection par défaut
            canvas.selection = false;

            // Gérer le dessin des formes
            canvas.on('mouse:down', (o) => {
                if (currentTool === 'rect' || currentTool === 'circle') {
                    isDrawing = true;
                    const pointer = canvas.getPointer(o.e);
                    startX = pointer.x;
                    startY = pointer.y;

                    // Désactiver la sélection pendant le dessin
                    canvas.selection = false;
                    canvas.discardActiveObject();
                    canvas.renderAll();

                    const shapeOptions = {
                        left: startX,
                        top: startY,
                        stroke: toolState.shape.color,
                        strokeWidth: toolState.shape.border,
                        fill: toolState.shape.fill ? toolState.shape.fillColor : 'transparent',
                        width: 0,
                        height: 0,
                        selectable: true,
                        evented: true
                    };

                    if (currentTool === 'rect') {
                        activeShape = new fabric.Rect(shapeOptions);
                    } else if (currentTool === 'circle') {
                        activeShape = new fabric.Circle({
                            ...shapeOptions,
                            radius: 0
                        });
                    }

                    if (activeShape) {
                        canvas.add(activeShape);
                        canvas.setActiveObject(activeShape);
                    }
                }
            });

            canvas.on('mouse:move', (o) => {
                if (!isDrawing) return;

                const pointer = canvas.getPointer(o.e);
                if (currentTool === 'rect' && activeShape) {
                    const width = Math.abs(pointer.x - startX);
                    const height = Math.abs(pointer.y - startY);
                    activeShape.set({
                        width: width,
                        height: height,
                        left: Math.min(startX, pointer.x),
                        top: Math.min(startY, pointer.y)
                    });
                } else if (currentTool === 'circle' && activeShape) {
                    const radius = Math.sqrt(
                        Math.pow(pointer.x - startX, 2) +
                        Math.pow(pointer.y - startY, 2)
                    ) / 2;
                    const center = {
                        x: (startX + pointer.x) / 2,
                        y: (startY + pointer.y) / 2
                    };
                    activeShape.set({
                        radius: radius,
                        left: center.x - radius,
                        top: center.y - radius
                    });
                }
                canvas.renderAll();
            });

            canvas.on('mouse:up', () => {
                isDrawing = false;
                if (activeShape) {
                    activeShape.setCoords();
                    canvas.setActiveObject(activeShape);
                }
                activeShape = null;
                // Réactiver la sélection après le dessin
                canvas.selection = true;
                canvas.renderAll();
            });

            // Gérer la sélection des outils
            tools.forEach(tool => {
                tool.addEventListener('click', () => {
                    const toolName = tool.dataset.tool;
                    
                    // Désactiver l'outil précédent
                    if (currentTool) {
                        tools.forEach(t => t.classList.remove('active'));
                        canvas.isDrawingMode = false;
                        brushControls?.classList.add('hidden');
                        shapeControls?.classList.add('hidden');
                    }

                    // Activer le nouvel outil
                    if (toolName === currentTool) {
                        currentTool = null;
                    } else {
                        currentTool = toolName;
                        tool.classList.add('active');

                        switch (toolName) {
                            case 'select':
                                canvas.isDrawingMode = false;
                                canvas.selection = true;
                                break;
                            case 'brush':
                                canvas.isDrawingMode = true;
                                canvas.freeDrawingBrush.color = toolState.brush.color;
                                canvas.freeDrawingBrush.width = toolState.brush.size;
                                brushControls?.classList.remove('hidden');
                                break;
                            case 'eraser':
                                canvas.isDrawingMode = true;
                                canvas.freeDrawingBrush.color = '#2D3748'; // bg-gray-700
                                canvas.freeDrawingBrush.width = 20;
                                break;
                            case 'rect':
                            case 'circle':
                                canvas.isDrawingMode = false;
                                canvas.selection = false;
                                shapeControls?.classList.remove('hidden');
                                break;
                        }
                    }
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

        // Fonction pour ouvrir les détails d'une géocache
        window.openGeocacheDetails = function(geocacheId, gcCode, name) {
            const componentId = `geocache-details-${geocacheId}`;
            
            // Vérifier si le composant existe déjà
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
                componentName: 'geocache-details',
                title: `${gcCode} - ${name}`,
                id: componentId,
                componentState: {
                    geocacheId: geocacheId,
                    gcCode: gcCode,
                    name: name
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

        // Exposer l'instance Golden Layout globalement
        window.goldenlayout = mainLayout;

        // Écouter l'événement openGeocacheDetails depuis les iframes
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'openGeocacheDetails') {
                const geocacheId = event.data.geocacheId;
                const gcCode = event.data.gcCode;
                const name = event.data.name;
                console.log("Réception de l'événement openGeocacheDetails", { geocacheId, gcCode, name });
                
                // Utiliser la fonction openGeocacheDetails
                window.openGeocacheDetails(geocacheId, gcCode, name);
            }
        });

        // Initialiser le layout
        mainLayout.init();

        // Ajuster la taille lors du redimensionnement de la fenêtre
        window.addEventListener('resize', () => {
            mainLayout.updateSize();
        });

        console.log('=== Layout: Initialisation terminée ===');

    } catch (error) {
        console.error('Erreur lors de l\'initialisation du layout:', error);
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