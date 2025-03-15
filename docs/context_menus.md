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

## Style et Personnalisation

Le menu utilise Tailwind CSS pour le style. Les classes principales sont :

- Menu : `fixed z-50 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 min-w-[200px]`
- Titre : `px-4 py-2 text-gray-400 text-sm border-b border-gray-700`
- Option : `px-4 py-2 text-white hover:bg-gray-700 cursor-pointer flex items-center`
- Séparateur : `border-t border-gray-700 my-1`

Vous pouvez personnaliser l'apparence en ajoutant des classes via la propriété `className` des éléments du menu.
