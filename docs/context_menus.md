# Guide d'Implémentation des Menus Contextuels dans MysteryAI

Ce guide explique comment implémenter des menus contextuels (clic droit) dans l'application MysteryAI. L'application utilise une approche web-first qui fonctionne de manière identique dans le navigateur et dans Electron.

## Architecture

L'implémentation des menus contextuels utilise une approche web centralisée :

1. **Fonction Centrale** : `showWebContextMenu` dans `context_menu.js`
2. **Style Unifié** : Utilisation de Tailwind CSS pour un style cohérent
3. **Support Multi-Plateforme** : Fonctionne dans le navigateur et dans Electron

## Utilisation

### 1. Importer le Script

Assurez-vous d'avoir importé le script dans votre fichier HTML :

```html
<script src="/js/context_menu.js"></script>
```

### 2. Créer un Menu Contextuel

```javascript
// Dans votre gestionnaire d'événements
element.addEventListener('contextmenu', (event) => {
    // 1. Empêcher le menu contextuel par défaut
    event.preventDefault();
    event.stopPropagation();
    
    // 2. Afficher le menu contextuel
    showWebContextMenu(
        event.clientX,  // Position X
        event.clientY,  // Position Y
        'element-id',   // ID unique (optionnel)
        'Titre',        // Titre du menu
        [              // Liste des éléments du menu
            {
                label: 'Option 1',
                icon: 'fas fa-edit',  // Icône FontAwesome (optionnel)
                click: () => {
                    // Action à effectuer
                }
            },
            {
                type: 'separator'  // Ligne de séparation
            },
            {
                label: 'Option désactivée',
                disabled: true,
                className: 'text-gray-500'  // Classes CSS additionnelles
            }
        ]
    );
});
```

## API de showWebContextMenu

### Paramètres

```javascript
showWebContextMenu(
    x,       // Position X du menu (nombre)
    y,       // Position Y du menu (nombre)
    id,      // Identifiant unique (chaîne, optionnel)
    title,   // Titre affiché en haut du menu (chaîne)
    items    // Tableau d'éléments du menu (tableau)
)
```

### Options des Éléments du Menu

Chaque élément du menu peut avoir les propriétés suivantes :

```javascript
{
    label: 'Texte de l\'option',     // Texte affiché
    icon: 'fas fa-icon',             // Classe d'icône FontAwesome
    click: () => {},                 // Fonction appelée au clic
    disabled: false,                 // Si true, l'option est désactivée
    className: '',                   // Classes CSS additionnelles
    type: 'separator'                // 'separator' pour une ligne de séparation
}
```

## Exemples

### 1. Menu Simple

```javascript
showWebContextMenu(
    event.clientX,
    event.clientY,
    'menu-1',
    'Actions',
    [
        {
            label: 'Éditer',
            icon: 'fas fa-edit',
            click: () => console.log('Édition')
        },
        {
            label: 'Supprimer',
            icon: 'fas fa-trash',
            click: () => console.log('Suppression')
        }
    ]
);
```

### 2. Menu avec Groupes

```javascript
showWebContextMenu(
    event.clientX,
    event.clientY,
    'menu-2',
    'Options Avancées',
    [
        {
            label: 'Informations',
            disabled: true,
            className: 'text-gray-500'
        },
        { type: 'separator' },
        {
            label: 'Action 1',
            click: () => console.log('Action 1')
        },
        {
            label: 'Action 2',
            click: () => console.log('Action 2')
        }
    ]
);
```

## Menu Contextuel des Boutons d'Action

MysteryAI implémente un menu contextuel spécial pour les boutons d'action (Analyser, Solver, Formula Solver) qui permet à l'utilisateur de choisir comment ouvrir le contenu :

### Fonctionnalités

- Activation par clic droit sur les boutons d'action
- Options pour ouvrir dans l'onglet actuel ou dans un nouvel onglet
- Gestion intelligente des onglets existants
- Compatibilité avec GoldenLayout

### Implémentation

1. **Script d'Interception** : Un script injecté au début de la page capture les clics droits sur les boutons d'action.

```javascript
// Script injecté au début du document
(function() {
    // Gestionnaire de clic droit pour les boutons d'action
    const originalContextMenu = function(event) {
        let target = event.target;
        while (target && target !== document) {
            if (target.classList && target.classList.contains('geocache-action-button')) {
                // Empêcher le menu contextuel par défaut
                event.preventDefault();
                event.stopPropagation();
                
                // Déclencher le menu contextuel personnalisé
                window.showActionButtonContextMenu(event.clientX, event.clientY, target);
                return false;
            }
            target = target.parentElement;
        }
    };
    
    // Ajouter le gestionnaire au plus tôt
    document.addEventListener('contextmenu', originalContextMenu, true);
})();
```

2. **Création du Menu Contextuel** : La fonction `showActionButtonContextMenu` crée et affiche le menu.

```javascript
window.showActionButtonContextMenu = function(clientX, clientY, button) {
    // Récupérer les informations du bouton
    const actionType = button.dataset.actionType;
    const geocacheId = button.dataset.geocacheId;
    const gcCode = button.dataset.gcCode;
    
    // Créer le menu contextuel
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
};
```

### Gestion des Onglets

Pour permettre l'ouverture dans l'onglet actuel ou dans un nouvel onglet, MysteryAI utilise une variable globale qui garde trace du dernier onglet actif :

```javascript
// Variable globale pour suivre l'onglet actif
window.lastActiveTab = null;

// Mise à jour de cette variable lors des changements d'onglet
window.mainLayout.on('activeContentItemChanged', function(component) {
    window.lastActiveTab = component;
});
```

Lors de l'ouverture d'un nouvel onglet, le système utilise cette référence pour déterminer où ajouter le nouveau contenu :

```javascript
// Utilisation de window.lastActiveTab pour déterminer le conteneur cible
let targetContainer;
if (openInSameTab && window.lastActiveTab && window.lastActiveTab.parent) {
    // Utiliser directement le parent de l'onglet actif
    targetContainer = window.lastActiveTab.parent;
} else {
    // Fallback sur la racine du layout
    targetContainer = window.mainLayout.root.contentItems[0];
}
```

## Style et Personnalisation

Le menu utilise Tailwind CSS pour le style. Les classes principales sont :

- Menu : `fixed z-50 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 min-w-[200px]`
- Titre : `px-4 py-2 text-gray-400 text-sm border-b border-gray-700`
- Option : `px-4 py-2 text-white hover:bg-gray-700 cursor-pointer flex items-center`
- Séparateur : `border-t border-gray-700 my-1`

Vous pouvez personnaliser l'apparence en ajoutant des classes via la propriété `className` des éléments du menu.
