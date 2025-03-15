# Layout State Manager

## Vue d'ensemble

Le Layout State Manager est un système centralisé de gestion d'état pour l'interface utilisateur de MysteryAI. Il suit et gère l'état des components GoldenLayout, des stacks, et des panels.

## Structure de Données

### État Global
```typescript
interface LayoutState {
    activeStack: string | null;
    activeComponent: string | null;
    lastCreatedComponent: string | null;
    components: Map<string, ComponentState>;
    stacks: Map<string, StackState>;
}
```

### État des Components
```typescript
interface ComponentState {
    id: string;
    type: string;           // 'geocache' | 'tool' | 'alphabet' | etc.
    metadata: {
        name: string;
        code?: string;      // Pour les géocaches
        toolId?: string;    // Pour les outils
        alphabetId?: string;// Pour les alphabets
        [key: string]: any; // Autres métadonnées
    };
    stackId: string;
    lastActive: Date;
}
```

### État des Stacks
```typescript
interface StackState {
    id: string;
    components: string[];   // IDs des components dans ce stack
    isActive: boolean;
    position: {
        x: number;
        y: number;
    };
}
```

## API Publique

### Gestion des Components

```javascript
// Enregistrer un nouveau component
layoutStateManager.registerComponent(component, metadata);

// Obtenir les infos d'un component
const componentInfo = layoutStateManager.getComponentInfo(componentId);

// Obtenir le component actif
const activeComponent = layoutStateManager.getActiveComponentInfo();

// Obtenir tous les components d'un type
const geocaches = layoutStateManager.getComponentsByType('geocache');

// Mettre à jour le component actif
layoutStateManager.setActiveComponent(component);
```

### Gestion des Stacks

```javascript
// Enregistrer un nouveau stack
layoutStateManager.registerStack(stack);

// Obtenir les infos d'un stack
const stackInfo = layoutStateManager.getStackInfo(stackId);

// Obtenir le stack actif
const activeStack = layoutStateManager.getActiveStackInfo();

// Obtenir tous les components d'un stack
const stackComponents = layoutStateManager.getStackComponents(stackId);
```

## Événements

Le gestionnaire d'état émet plusieurs événements que vous pouvez écouter :

```javascript
// Changement de component actif
layoutStateManager.on('activeComponentChanged', (newComponent, oldComponent) => {
    console.log('Component actif changé:', newComponent.id);
});

// Création de nouveau component
layoutStateManager.on('componentRegistered', (component) => {
    console.log('Nouveau component:', component.id);
});

// Changement de stack actif
layoutStateManager.on('activeStackChanged', (newStack, oldStack) => {
    console.log('Stack actif changé:', newStack.id);
});
```

## Logging et Debugging

Le gestionnaire d'état inclut un système de logging détaillé pour faciliter le debugging :

```javascript
// Exemple de logs
=== LayoutStateManager: Initialisation ===
=== LayoutStateManager: Enregistrement component === {id: "comp1", type: "geocache"}
=== LayoutStateManager: Mise à jour component actif === {id: "comp1", type: "geocache"}
=== LayoutStateManager: Enregistrement stack === {id: "stack1", components: ["comp1"]}
```

## Intégration avec GoldenLayout

Le gestionnaire d'état s'intègre étroitement avec GoldenLayout :

```javascript
// Dans layout_initialize.js
mainLayout.on('itemCreated', function(item) {
    if (item.isComponent) {
        layoutStateManager.registerComponent(item);
    } else if (item.isStack) {
        layoutStateManager.registerStack(item);
    }
});

mainLayout.on('activeContentItemChanged', function(component) {
    layoutStateManager.setActiveComponent(component);
});
```

## Gestion des Erreurs

Le gestionnaire inclut une gestion robuste des erreurs :

```javascript
try {
    layoutStateManager.registerComponent(component);
} catch (error) {
    console.error('=== LayoutStateManager: Erreur ===', error);
    // Gestion spécifique des erreurs
    switch (error.code) {
        case 'DUPLICATE_COMPONENT':
            // Gestion des doublons
            break;
        case 'INVALID_COMPONENT':
            // Gestion des components invalides
            break;
        default:
            // Autres erreurs
            break;
    }
}
```

## Bonnes Pratiques

1. **Toujours utiliser l'API publique**
   ```javascript
   // BON
   layoutStateManager.setActiveComponent(component);
   
   // MAUVAIS
   window.activeComponent = component;
   ```

2. **Écouter les événements plutôt que de poller**
   ```javascript
   // BON
   layoutStateManager.on('activeComponentChanged', handleChange);
   
   // MAUVAIS
   setInterval(() => checkActiveComponent(), 1000);
   ```

3. **Utiliser le logging pour le debugging**
   ```javascript
   // Activer le mode debug
   layoutStateManager.setDebugMode(true);
   ```

## Exemples d'Utilisation

### 1. Création d'un Nouvel Onglet Géocache

```javascript
function createGeocacheTab(geocacheData) {
    const component = {
        type: 'component',
        componentName: 'geocache',
        title: geocacheData.name,
        componentState: geocacheData
    };
    
    // GoldenLayout crée le component
    const newComponent = mainLayout.root.contentItems[0].addChild(component);
    
    // Le gestionnaire d'état est automatiquement mis à jour via les événements
}
```

### 2. Suivi des Components Ouverts

```javascript
function getOpenGeocaches() {
    const geocaches = layoutStateManager.getComponentsByType('geocache');
    return geocaches.map(gc => ({
        id: gc.id,
        name: gc.metadata.name,
        code: gc.metadata.code
    }));
}
```

### 3. Mise à Jour du Panel Inférieur

```javascript
layoutStateManager.on('activeComponentChanged', (component) => {
    if (component.type === 'geocache') {
        updateBottomPanel('map', component.metadata.coordinates);
        updateBottomPanel('info', component.metadata);
    }
});
```

## Dépannage

### Problèmes Courants

1. **Component Non Enregistré**
   ```javascript
   // Vérifier si le component existe
   if (!layoutStateManager.hasComponent(componentId)) {
       console.error('Component non trouvé:', componentId);
   }
   ```

2. **État Incohérent**
   ```javascript
   // Réinitialiser l'état
   layoutStateManager.reset();
   // Recharger depuis GoldenLayout
   layoutStateManager.syncWithLayout(mainLayout);
   ```

3. **Performances**
   ```javascript
   // Optimiser les mises à jour
   layoutStateManager.batchUpdates(() => {
       // Multiples mises à jour
   });
   ```

## Maintenance

### 1. Nettoyage Périodique
```javascript
// Nettoyer les components inactifs
layoutStateManager.cleanupInactiveComponents(30 * 60 * 1000); // 30 minutes
```

### 2. Sauvegarde d'État
```javascript
// Sauvegarder l'état
const state = layoutStateManager.serialize();
localStorage.setItem('layoutState', JSON.stringify(state));

// Restaurer l'état
const savedState = JSON.parse(localStorage.getItem('layoutState'));
layoutStateManager.deserialize(savedState);
```
