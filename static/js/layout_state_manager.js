/**
 * Gestionnaire d'état pour le layout GoldenLayout
 * Permet de suivre les stacks et components actifs
 */
class LayoutStateManager {
    constructor() {
        this.activeStack = null;
        this.activeComponent = null;
        this.lastCreatedComponent = null;
        this.components = new Map(); // Stocke tous les components avec leurs métadonnées
        this.stacks = new Map();     // Stocke tous les stacks avec leurs components
        this.lastActiveStack = null; // Dernière stack qui était active
        this.stackActivityOrder = []; // Ordre d'activité des stacks (plus récent en premier)
        
        this.initialize();
    }

    /**
     * Initialise les écouteurs d'événements pour le layout
     */
    initialize() {
        console.log('=== LayoutStateManager: Initialisation ===');
        
        // Écouter l'événement d'initialisation de GoldenLayout
        document.addEventListener('goldenLayoutInitialized', (event) => {
            this.setupGoldenLayoutListeners(event.detail.layout);
        });
    }

    /**
     * Configure les écouteurs d'événements GoldenLayout
     */
    setupGoldenLayoutListeners(layout) {
        console.log('=== LayoutStateManager: Configuration des écouteurs GoldenLayout ===');
        
        // Écouter les changements de focus sur les stacks
        layout.on('stackCreated', (stack) => {
            console.log('🏗️ LayoutStateManager: Stack créée:', stack.id);
            this.registerStack(stack);
            
            // Écouter les changements d'onglet actif dans cette stack
            stack.on('activeContentItemChanged', (contentItem) => {
                if (contentItem && contentItem.isComponent) {
                    console.log('📋 LayoutStateManager: Changement d\'onglet actif dans stack:', stack.id, 'vers:', contentItem.id);
                    this.setActiveStack(stack);
                    this.setActiveComponentFromGoldenLayout(contentItem);
                }
            });
            
            // Écouter les clics sur les onglets pour détecter l'activité
            if (stack.header && stack.header.tabs) {
                stack.header.tabs.forEach(tab => {
                    tab.element.addEventListener('click', () => {
                        console.log('🖱️ LayoutStateManager: Clic sur onglet dans stack:', stack.id);
                        this.setActiveStack(stack);
                    });
                });
            }
            
            // Écouter l'ajout de nouveaux onglets à cette stack
            stack.on('itemCreated', (item) => {
                if (item.isComponent) {
                    console.log('➕ LayoutStateManager: Nouvel onglet ajouté à stack:', stack.id, 'onglet:', item.id);
                    // Mettre à jour les écouteurs de clics pour les nouveaux onglets
                    setTimeout(() => {
                        if (stack.header && stack.header.tabs) {
                            stack.header.tabs.forEach(tab => {
                                if (!tab.element.hasAttribute('data-click-listener')) {
                                    tab.element.setAttribute('data-click-listener', 'true');
                                    tab.element.addEventListener('click', () => {
                                        console.log('🖱️ LayoutStateManager: Clic sur nouvel onglet dans stack:', stack.id);
                                        this.setActiveStack(stack);
                                    });
                                }
                            });
                        }
                    }, 100);
                }
            });
        });
        
        // Écouter les changements globaux de component actif
        layout.on('activeContentItemChanged', (contentItem) => {
            if (contentItem && contentItem.isComponent && contentItem.parent && contentItem.parent.isStack) {
                console.log('🌐 LayoutStateManager: Changement global de component actif:', contentItem.id, 'dans stack:', contentItem.parent.id);
                this.setActiveStack(contentItem.parent);
                this.setActiveComponentFromGoldenLayout(contentItem);
            }
        });
        
        // Écouter les événements de focus pour détecter la stack active
        layout.on('focus', () => {
            const selectedItem = layout.selectedItem;
            if (selectedItem && selectedItem.parent && selectedItem.parent.isStack) {
                console.log('🎯 LayoutStateManager: Focus détecté sur stack:', selectedItem.parent.id);
                this.setActiveStack(selectedItem.parent);
            }
        });
        
        // Écouter les clics sur le conteneur du layout pour détecter l'activité
        const layoutContainer = document.getElementById('layoutContainer');
        if (layoutContainer) {
            layoutContainer.addEventListener('click', (event) => {
                // Trouver la stack la plus proche du clic
                const stackElement = event.target.closest('.lm_stack');
                if (stackElement) {
                    // Trouver l'objet stack correspondant
                    const stackId = stackElement.getAttribute('data-stack-id') || 
                                   stackElement.querySelector('.lm_header')?.getAttribute('data-stack-id');
                    
                    if (stackId) {
                        const stackInfo = this.stacks.get(stackId);
                        if (stackInfo && stackInfo.goldenLayoutStack) {
                            console.log('🖱️ LayoutStateManager: Clic détecté sur stack via DOM:', stackId);
                            this.setActiveStack(stackInfo.goldenLayoutStack);
                        }
                    }
                }
            });
        }
    }

    /**
     * Enregistre un nouveau component
     * @param {Object} component - Le component GoldenLayout
     * @param {Object} metadata - Métadonnées additionnelles du component
     */
    registerComponent(component, metadata = {}) {
        console.log('=== LayoutStateManager: Enregistrement component ===', {
            id: component.id,
            type: component.componentName,
            metadata
        });
        
        this.components.set(component.id, {
            id: component.id,
            type: component.componentName,
            metadata: metadata,
            stackId: component.parent ? component.parent.id : null,
            lastActive: new Date(),
            goldenLayoutComponent: component // Référence vers l'objet GoldenLayout
        });

        // Si le component est dans un stack, mettre à jour le stack
        if (component.parent && component.parent.isStack) {
            this.registerStack(component.parent);
        }

        this.lastCreatedComponent = component.id;
    }

    /**
     * Enregistre un nouveau stack
     * @param {Object} stack - Le stack GoldenLayout
     */
    registerStack(stack) {
        console.log('=== LayoutStateManager: Enregistrement stack ===', {
            id: stack.id,
            components: stack.contentItems.map(item => item.id)
        });
        
        this.stacks.set(stack.id, {
            id: stack.id,
            components: stack.contentItems.map(item => item.id),
            goldenLayoutStack: stack, // Référence vers l'objet GoldenLayout
            lastActive: new Date(),
            isActive: false
        });
        
        // Ajouter à l'ordre d'activité si pas déjà présent
        if (!this.stackActivityOrder.includes(stack.id)) {
            this.stackActivityOrder.unshift(stack.id);
        }
    }

    /**
     * Définit la stack active
     * @param {Object} stack - Le stack GoldenLayout actif
     */
    setActiveStack(stack) {
        if (!stack || !stack.id) return;
        
        console.log('=== LayoutStateManager: Mise à jour stack active ===', {
            stackId: stack.id,
            previousActive: this.activeStack
        });
        
        // Marquer l'ancienne stack comme inactive
        if (this.activeStack && this.stacks.has(this.activeStack)) {
            const oldStack = this.stacks.get(this.activeStack);
            oldStack.isActive = false;
        }
        
        // Mettre à jour la stack active
        this.lastActiveStack = this.activeStack;
        this.activeStack = stack.id;
        
        // Marquer la nouvelle stack comme active
        if (this.stacks.has(stack.id)) {
            const stackData = this.stacks.get(stack.id);
            stackData.isActive = true;
            stackData.lastActive = new Date();
        }
        
        // Mettre à jour l'ordre d'activité
        const index = this.stackActivityOrder.indexOf(stack.id);
        if (index > -1) {
            this.stackActivityOrder.splice(index, 1);
        }
        this.stackActivityOrder.unshift(stack.id);
        
        // Limiter l'historique à 10 stacks
        if (this.stackActivityOrder.length > 10) {
            this.stackActivityOrder = this.stackActivityOrder.slice(0, 10);
        }
    }

    /**
     * Met à jour le component actif à partir d'un component GoldenLayout
     * @param {Object} component - Le component GoldenLayout
     */
    setActiveComponentFromGoldenLayout(component) {
        if (!component) return;
        
        const componentInfo = {
            id: component.id,
            type: component.componentName,
            state: component.config.componentState || {},
            metadata: {
                gcCode: component.config.componentState?.gcCode,
                name: component.config.componentState?.name,
                geocacheId: component.config.componentState?.geocacheId
            },
            parent: component.parent
        };
        
        this.setActiveComponent(componentInfo);
    }

    /**
     * Met à jour le component actif
     * @param {Object} componentInfo - Informations sur le component actif
     */
    setActiveComponent(componentInfo) {
        if (!componentInfo) return;
        
        console.log('=== LayoutStateManager: Mise à jour component actif ===', componentInfo);
        
        // Mise à jour ou création des données du component
        const componentData = {
            id: componentInfo.id || `${componentInfo.type}-${Date.now()}`,
            type: componentInfo.type,
            metadata: {
                ...componentInfo.metadata,
                ...componentInfo.state
            },
            lastActive: new Date(),
            stackId: componentInfo.parent ? componentInfo.parent.id : null
        };
        
        // Enregistrer/mettre à jour le component dans la Map
        this.components.set(componentData.id, componentData);
        this.activeComponent = componentData.id;

        // Mise à jour du stack actif si disponible
        if (componentInfo.parent && componentInfo.parent.isStack) {
            this.setActiveStack(componentInfo.parent);
        }

        // Dispatch event for geocache selection
        if (componentInfo.type === 'geocache-details' && componentInfo.metadata.geocacheId) {
            document.dispatchEvent(new CustomEvent('geocacheSelected', {
                detail: {
                    geocacheId: componentInfo.metadata.geocacheId,
                    gcCode: componentInfo.metadata.gcCode
                }
            }));
        }
    }

    /**
     * Retourne les informations sur le component actif
     * @returns {Object|null} Les informations sur le component actif
     */
    getActiveComponentInfo() {
        if (!this.activeComponent) return null;
        return this.components.get(this.activeComponent);
    }

    /**
     * Retourne tous les components d'un type spécifique
     * @param {string} type - Le type de component à rechercher
     * @returns {Array} Liste des components du type spécifié
     */
    getComponentsByType(type) {
        return Array.from(this.components.values())
            .filter(comp => comp.type === type);
    }

    /**
     * Retourne les informations sur le stack actif
     * @returns {Object|null} Les informations sur le stack actif
     */
    getActiveStackInfo() {
        if (!this.activeStack) return null;
        return this.stacks.get(this.activeStack);
    }

    /**
     * Retourne la stack GoldenLayout active
     * @returns {Object|null} L'objet stack GoldenLayout actif
     */
    getActiveGoldenLayoutStack() {
        const stackInfo = this.getActiveStackInfo();
        return stackInfo ? stackInfo.goldenLayoutStack : null;
    }

    /**
     * Retourne la stack la plus récemment active (pour l'ajout d'onglets)
     * @returns {Object|null} L'objet stack GoldenLayout le plus récemment actif
     */
    getMostRecentActiveStack() {
        // Essayer d'abord la stack actuellement active
        const activeStack = this.getActiveGoldenLayoutStack();
        if (activeStack) {
            return activeStack;
        }
        
        // Sinon, parcourir l'ordre d'activité pour trouver une stack valide
        for (const stackId of this.stackActivityOrder) {
            const stackInfo = this.stacks.get(stackId);
            if (stackInfo && stackInfo.goldenLayoutStack) {
                return stackInfo.goldenLayoutStack;
            }
        }
        
        return null;
    }

    /**
     * Retourne toutes les stacks triées par activité récente
     * @returns {Array} Liste des stacks triées par activité
     */
    getStacksByActivity() {
        return this.stackActivityOrder
            .map(stackId => this.stacks.get(stackId))
            .filter(stack => stack && stack.goldenLayoutStack)
            .map(stack => stack.goldenLayoutStack);
    }

    /**
     * Debug: Affiche l'état actuel du gestionnaire
     */
    debugState() {
        console.log('=== LayoutStateManager: État actuel ===', {
            activeStack: this.activeStack,
            activeComponent: this.activeComponent,
            stackCount: this.stacks.size,
            componentCount: this.components.size,
            stackActivityOrder: this.stackActivityOrder
        });
    }
}

// Export de l'instance unique du gestionnaire
window.layoutStateManager = new LayoutStateManager();
