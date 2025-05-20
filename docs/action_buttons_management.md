# Documentation du Système de Gestion des Boutons d'Action dans MysteryAI

Ce document décrit en détail l'implémentation du système de gestion des boutons d'action (Analyser, Solver, Formula Solver) dans MysteryAI, avec un focus particulier sur la gestion du clic droit, du menu contextuel et de l'ouverture des onglets.

## Vue d'ensemble

Le système de gestion des boutons d'action permet aux utilisateurs d'interagir avec les principaux outils d'analyse et de résolution de géocaches de diverses manières :

1. **Clic gauche standard** : Ouvre l'outil dans l'onglet actuel par défaut
2. **Ctrl+Clic (ou Cmd+Clic)** : Ouvre l'outil dans un nouvel onglet
3. **Clic droit** : Affiche un menu contextuel offrant le choix entre "Ouvrir dans l'onglet actuel" et "Ouvrir dans un nouvel onglet"

Le système s'intègre avec GoldenLayout pour gérer les onglets et maintenir une expérience utilisateur cohérente.

## Identification des Boutons d'Action

Les boutons d'action sont identifiés par la classe CSS `geocache-action-button` et par l'attribut `data-action-type` qui peut prendre les valeurs suivantes :

- `analyze` : Bouton "Analyser" 
- `solver` : Bouton "Solver"
- `formula-solver` : Bouton "Formula Solver"

Exemple de bouton d'action :

```html
<button class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg geocache-action-button"
        data-action-type="analyze"
        data-geocache-id="{{ geocache.id }}"
        data-gc-code="{{ geocache.gc_code }}">
    <i class="fas fa-search"></i>
    Analyser
</button>
```

## Interception des Clics Droits

Le système utilise un script injecté au début du document pour intercepter les clics droits sur les boutons d'action avant que le menu contextuel par défaut du navigateur ne s'affiche.

```javascript
// Script injecté au début du document (dans geocache_details.html)
(function() {
    // Gestionnaire de clic droit pour les boutons d'action
    const originalContextMenu = function(event) {
        // Vérifier si c'est un de nos boutons d'action
        let target = event.target;
        while (target && target !== document) {
            if (target.classList && target.classList.contains('geocache-action-button')) {
                // C'est un de nos boutons, prévenir le comportement par défaut
                event.preventDefault();
                event.stopPropagation();
                
                // Stocker les données pour traitement ultérieur
                window.__contextMenuData = {
                    x: event.clientX,
                    y: event.clientY,
                    button: target
                };
                
                // Appeler directement la fonction ou créer un événement personnalisé
                if (typeof window.showActionButtonContextMenu === 'function') {
                    window.showActionButtonContextMenu(event.clientX, event.clientY, target);
                } else {
                    setTimeout(function() {
                        const customEvent = new CustomEvent('actionButtonContextMenu', {
                            detail: window.__contextMenuData
                        });
                        document.dispatchEvent(customEvent);
                    }, 0);
                }
                
                return false;
            }
            target = target.parentElement;
        }
    };
    
    // Ajouter notre gestionnaire le plus tôt possible avec capture:true
    document.addEventListener('contextmenu', originalContextMenu, true);
})();
```

Points importants :
- L'utilisation de `capture:true` permet d'intercepter l'événement avant qu'il n'atteigne les gestionnaires normaux
- Le système recherche récursivement dans les parents de l'élément cliqué pour trouver un bouton d'action
- Si un bouton est trouvé, le menu contextuel par défaut est empêché et notre menu personnalisé est affiché

## Création du Menu Contextuel

La fonction `showActionButtonContextMenu` crée et affiche le menu contextuel personnalisé :

```javascript
window.showActionButtonContextMenu = function(clientX, clientY, button) {
    // Supprimer tout menu contextuel existant
    const existingMenu = document.querySelector('.action-button-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // Récupérer les informations du bouton
    const actionType = button.dataset.actionType;
    const geocacheId = button.dataset.geocacheId;
    const gcCode = button.dataset.gcCode;
    
    // Créer le menu contextuel avec style Tailwind
    const menu = document.createElement('div');
    menu.className = 'action-button-context-menu fixed z-50 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 min-w-[200px]';
    menu.style.left = `${clientX}px`;
    menu.style.top = `${clientY}px`;
    
    // En-tête du menu
    const header = document.createElement('div');
    header.className = 'px-4 py-2 text-gray-400 text-sm border-b border-gray-700';
    header.textContent = `Action: ${getActionName(actionType)}`;
    menu.appendChild(header);
    
    // Option d'ouverture dans l'onglet actuel
    const sameTabOption = document.createElement('div');
    sameTabOption.className = 'px-4 py-2 text-white hover:bg-gray-700 cursor-pointer flex items-center';
    sameTabOption.innerHTML = '<i class="fas fa-exchange-alt mr-2"></i>Ouvrir dans l\'onglet actuel';
    sameTabOption.onclick = () => {
        executeButtonAction(button, 'same');
        menu.remove();
    };
    menu.appendChild(sameTabOption);
    
    // Option d'ouverture dans un nouvel onglet
    const newTabOption = document.createElement('div');
    newTabOption.className = 'px-4 py-2 text-white hover:bg-gray-700 cursor-pointer flex items-center';
    newTabOption.innerHTML = '<i class="fas fa-external-link-alt mr-2"></i>Ouvrir dans un nouvel onglet';
    newTabOption.onclick = () => {
        executeButtonAction(button, 'new');
        menu.remove();
    };
    menu.appendChild(newTabOption);
    
    // Ajouter le menu au document
    document.body.appendChild(menu);
    
    // Ajuster la position si le menu dépasse les limites de la fenêtre
    const menuRect = menu.getBoundingClientRect();
    if (menuRect.right > window.innerWidth) {
        menu.style.left = `${clientX - menuRect.width}px`;
    }
    if (menuRect.bottom > window.innerHeight) {
        menu.style.top = `${clientY - menuRect.height}px`;
    }
};
```

## Exécution des Actions

Lorsqu'une option est sélectionnée dans le menu contextuel, la fonction `executeButtonAction` est appelée pour exécuter l'action correspondante :

```javascript
function executeButtonAction(button, tabMode) {
    const actionType = button.dataset.actionType;
    const geocacheId = button.dataset.geocacheId;
    const gcCode = button.dataset.gcCode;
    
    console.log(`=== DEBUG: Exécution de l'action ${actionType} pour la géocache ${gcCode} en mode ${tabMode} ===`);
    
    // Exécuter l'action en fonction du type
    switch (actionType) {
        case 'analyze':
            const analyzeOptions = {
                geocacheId: geocacheId, 
                gcCode: gcCode,
                openInSameTab: tabMode === 'same'
            };
            window.openPluginTab('analysis_web_page', `Analyse ${gcCode}`, analyzeOptions);
            break;
            
        case 'solver':
            window.openSolverTab(geocacheId, gcCode, tabMode === 'same');
            break;
            
        case 'formula-solver':
            window.openFormulaSolverTab(geocacheId, gcCode, tabMode === 'same');
            break;
            
        default:
            console.error(`Type d'action inconnu: ${actionType}`);
    }
}
```

Cette fonction :
1. Récupère les informations du bouton via les attributs data-*
2. Détermine quelle fonction d'ouverture appeler en fonction du type d'action
3. Passe le paramètre `openInSameTab` pour indiquer où ouvrir le contenu

## Gestion des Onglets avec GoldenLayout

### Suivi de l'Onglet Actif

Pour permettre l'ouverture dans l'onglet actuel, le système maintient une référence au dernier onglet actif :

```javascript
// Variable globale pour suivre l'onglet actif
window.lastActiveTab = null;

// Mise à jour lors des changements d'onglet
window.mainLayout.on('activeContentItemChanged', function(component) {
    if (!component || !component.isComponent) return;
    
    // Mémoriser l'onglet actif
    window.lastActiveTab = component;
    console.log('=== DEBUG: Onglet actif mémorisé ===', component);
});
```

### Recherche d'Onglets Existants

Avant d'ouvrir un nouvel onglet, le système vérifie si un onglet correspondant existe déjà :

```javascript
function findExistingComponent(rootItem, criteria) {
    if (!rootItem) {
        console.log('=== DEBUG: Item racine null ou undefined ===');
        return null;
    }
    
    // Si c'est un composant qui correspond aux critères
    if (criteria(rootItem)) {
        return rootItem;
    }
    
    // Si l'item a des enfants, chercher récursivement
    if (rootItem.contentItems && rootItem.contentItems.length > 0) {
        for (let i = 0; i < rootItem.contentItems.length; i++) {
            const found = findExistingComponent(rootItem.contentItems[i], criteria);
            if (found) return found;
        }
    }
    
    return null;
}
```

### Ouverture dans l'Onglet Actuel ou Nouvel Onglet

Le système utilise `window.lastActiveTab` pour déterminer où ajouter le nouveau contenu :

```javascript
// Exemple pour openPluginTab, mais logique similaire pour openSolverTab et openFormulaSolverTab
let targetContainer;
            
if (openInSameSection && window.lastActiveTab && window.lastActiveTab.parent) {
    // Utiliser directement le parent de l'onglet actif
    targetContainer = window.lastActiveTab.parent;
} else {
    // Fallback sur la racine ou l'item sélectionné
    targetContainer = window.mainLayout.selectedItem || window.mainLayout.root.contentItems[0];
}

// Si le conteneur actif n'est pas un "stack" ou "row", remonter jusqu'à en trouver un
if (!window.lastActiveTab || !window.lastActiveTab.parent) {
    while (targetContainer && targetContainer.type !== 'stack' && targetContainer.type !== 'row' && targetContainer.parent) {
        targetContainer = targetContainer.parent;
    }
}

// Si on n'a pas trouvé de conteneur approprié, utiliser la racine
if (!targetContainer || (targetContainer.type !== 'stack' && targetContainer.type !== 'row')) {
    targetContainer = window.mainLayout.root.contentItems[0];
}

// Créer l'onglet dans le conteneur cible
targetContainer.addChild({
    type: 'component',
    componentName: 'ComposantCorrespondant',
    title: title,
    componentState: {
        // État du composant
    }
});
```

## Indicateur Visuel de l'Onglet Actif

Pour faciliter le débogage et améliorer l'expérience utilisateur, un indicateur visuel est ajouté à l'onglet actif :

```javascript
function updateActiveTabIndicator() {
    // Supprimer d'abord tous les indicateurs existants
    document.querySelectorAll('.active-tab-indicator').forEach(el => el.remove());
    
    // Ajouter un indicateur visuel pour l'onglet actif
    if (window.lastActiveTab) {
        try {
            // Trouver l'élément DOM de l'onglet
            let tabElement = null;
            if (window.lastActiveTab.tab && window.lastActiveTab.tab.element) {
                tabElement = window.lastActiveTab.tab.element;
            } else if (window.lastActiveTab.header && window.lastActiveTab.header.tabs) {
                const activeTab = window.lastActiveTab.header.tabs.find(tab => tab.isActive);
                if (activeTab && activeTab.element) {
                    tabElement = activeTab.element;
                }
            } else if (window.lastActiveTab.element) {
                tabElement = window.lastActiveTab.element;
            }
            
            // Ajouter l'indicateur si l'élément est valide
            if (tabElement && tabElement instanceof Element) {
                if (window.getComputedStyle(tabElement).position !== 'relative') {
                    tabElement.style.position = 'relative';
                }
                
                const indicator = document.createElement('div');
                indicator.className = 'active-tab-indicator bg-green-500 text-xs px-1 absolute top-0 right-0 rounded-bl';
                indicator.textContent = 'Actif';
                indicator.style.zIndex = '9999';
                tabElement.appendChild(indicator);
            }
        } catch (e) {
            console.error('Erreur lors de l\'ajout de l\'indicateur:', e);
        }
    }
}

// Mettre à jour l'indicateur périodiquement
setInterval(updateActiveTabIndicator, 2000);
```

## Initialisation et Configuration

Pour configurer les boutons d'action, la fonction `setupGeocacheActionButtons` est appelée au chargement du document :

```javascript
function setupGeocacheActionButtons() {
    // Sélectionner tous les boutons d'action
    const buttons = document.querySelectorAll('.geocache-action-button');
    
    buttons.forEach(button => {
        // Remplacer les gestionnaires de clics existants
        button.removeAttribute('onclick');
        
        // Configurer le clic gauche
        button.addEventListener('click', function(event) {
            if (!event.ctrlKey && !event.metaKey) {
                // Clic standard - exécuter l'action dans l'onglet actuel
                executeButtonAction(button, 'same');
            } else {
                // Ctrl+Clic ou Cmd+Clic - forcer l'ouverture dans un nouvel onglet
                executeButtonAction(button, 'new');
                event.preventDefault();
                event.stopPropagation();
            }
        });
    });
}

// Appeler la fonction au chargement du document
document.addEventListener('DOMContentLoaded', setupGeocacheActionButtons);
```

## Extension du Système

Pour ajouter un nouveau type de bouton d'action :

1. Ajouter la classe `geocache-action-button` au bouton
2. Ajouter les attributs `data-action-type`, `data-geocache-id`, et `data-gc-code`
3. Ajouter le nouveau type d'action dans la fonction `getActionName` :
   ```javascript
   function getActionName(actionType) {
       switch (actionType) {
           case 'analyze': return 'Analyser';
           case 'solver': return 'Solver';
           case 'formula-solver': return 'Formula Solver';
           case 'nouveau-type': return 'Nom du Nouveau Type'; // Ajouter ici
           default: return actionType;
       }
   }
   ```
4. Ajouter le traitement correspondant dans `executeButtonAction` :
   ```javascript
   function executeButtonAction(button, tabMode) {
       // ...
       switch (actionType) {
           // ...
           case 'nouveau-type':
               window.ouvrirNouveauType(geocacheId, gcCode, tabMode === 'same');
               break;
           // ...
       }
   }
   ```
5. Implémenter la fonction d'ouverture en suivant le même modèle que les fonctions existantes.

## Dépannage

### Problème courant 1 : Le menu contextuel ne s'affiche pas

- Vérifier que le bouton a bien la classe `geocache-action-button`
- Vérifier que les gestionnaires d'événements sont correctement attachés
- Consulter la console pour les erreurs possibles

### Problème courant 2 : Le contenu s'ouvre toujours dans un nouvel onglet

- Vérifier que `window.lastActiveTab` est correctement mis à jour
- Vérifier que la fonction d'ouverture utilise correctement le paramètre `openInSameTab`
- Vérifier si le conteneur cible est valide pour ajouter de nouveaux composants

### Problème courant 3 : Erreurs lors de l'ajout de l'indicateur de l'onglet actif

- S'assurer que `tabElement` est bien un élément DOM avant d'appeler `getComputedStyle`
- Vérifier la structure des objets GoldenLayout impliqués
- Ajouter des logs supplémentaires pour comprendre la structure de `window.lastActiveTab` 