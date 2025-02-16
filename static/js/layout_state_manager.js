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
        
        this.initialize();
    }

    /**
     * Initialise les écouteurs d'événements pour le layout
     */
    initialize() {
        console.log('=== LayoutStateManager: Initialisation ===');
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
            lastActive: new Date()
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
            components: stack.contentItems.map(item => item.id)
        });
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
            lastActive: new Date()
        };
        
        // Enregistrer/mettre à jour le component dans la Map
        this.components.set(componentData.id, componentData);
        this.activeComponent = componentData.id;

        // Mise à jour du stack actif si disponible
        if (componentInfo.parent && componentInfo.parent.isStack) {
            this.activeStack = componentInfo.parent.id;
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
}

// Export de l'instance unique du gestionnaire
window.layoutStateManager = new LayoutStateManager();
