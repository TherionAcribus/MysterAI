# Guide d'Implémentation des Menus Contextuels dans MysteryAI

Ce guide explique comment implémenter des menus contextuels (clic droit) dans l'application MysteryAI en utilisant Electron.

## Architecture

L'implémentation des menus contextuels se fait en trois parties :

1. **Frontend (HTML/JS)** : Capture l'événement de clic droit et envoie les informations nécessaires
2. **Preload Script** : Fait le pont entre le frontend et le backend de manière sécurisée
3. **Main Process** : Crée et affiche le menu contextuel

## 1. Côté Frontend

### Template de Base

```javascript
// Dans votre fichier HTML ou JS
document.querySelector('.votre-selecteur').addEventListener('contextmenu', function(e) {
    // 1. Empêcher le menu contextuel par défaut
    e.preventDefault();
    e.stopPropagation();

    // 2. Récupérer les données nécessaires
    const elementData = {
        id: e.target.dataset.id,
        type: e.target.dataset.type,
        // ... autres données
    };

    // 3. Récupérer la position du clic
    const position = {
        x: e.clientX,
        y: e.clientY
    };

    // 4. Appeler la fonction du preload script
    if (window.electron) {
        window.electron.showContextMenu(elementData, position);
    }
});
```

## 2. Preload Script

### Template de Base

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    showContextMenu: (data, position) => {
        try {
            // Envoyer les données au main process
            ipcRenderer.send('show-context-menu', { data, position });
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'événement IPC :', error);
        }
    }
});

// Écouter les actions du menu
ipcRenderer.on('menu-action', (event, action) => {
    // Gérer l'action ici
    console.log('Action reçue :', action);
});
```

## 3. Main Process

### Template de Base

```javascript
const { ipcMain, Menu } = require('electron');

// Créer le menu contextuel
function createContextMenu(data, window) {
    return Menu.buildFromTemplate([
        {
            label: 'Action 1',
            click: () => {
                window.webContents.send('menu-action', {
                    type: 'action1',
                    data: data
                });
            }
        },
        { type: 'separator' },
        {
            label: 'Action 2',
            click: () => {
                window.webContents.send('menu-action', {
                    type: 'action2',
                    data: data
                });
            }
        }
    ]);
}

// Gérer l'événement du menu contextuel
ipcMain.on('show-context-menu', (event, { data, position }) => {
    try {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (!window) return;

        const menu = createContextMenu(data, window);
        
        menu.popup({
            window,
            positioningItem: 0,
            callback: () => {
                console.log('Menu fermé');
            }
        });
    } catch (error) {
        console.error('Erreur lors de l\'affichage du menu :', error);
    }
});
```

## Exemples d'Utilisation

### 1. Menu Contextuel pour les Images

```javascript
// Dans le main process
function createImageContextMenu(window) {
    return Menu.buildFromTemplate([
        {
            label: 'Éditer l\'image',
            click: () => {
                window.webContents.send('edit-image-requested');
            }
        },
        { type: 'separator' },
        {
            label: 'Copier',
            click: () => {
                window.webContents.send('copy-image-requested');
            }
        }
    ]);
}
```

### 2. Menu Contextuel pour les Textes

```javascript
// Dans le main process
function createTextContextMenu(window) {
    return Menu.buildFromTemplate([
        {
            label: 'Copier',
            role: 'copy'
        },
        {
            label: 'Couper',
            role: 'cut'
        },
        {
            label: 'Coller',
            role: 'paste'
        }
    ]);
}
```

## Bonnes Pratiques

1. **Sécurité**
   - Toujours utiliser le preload script pour la communication IPC
   - Valider les données reçues avant de créer le menu
   - Ne pas exposer de fonctionnalités sensibles dans le menu

2. **Performance**
   - Créer les templates de menu une seule fois si possible
   - Éviter les opérations lourdes dans les handlers de clic

3. **UX**
   - Utiliser des séparateurs pour grouper les actions logiquement
   - Ajouter des raccourcis clavier pour les actions communes
   - Désactiver les options non disponibles plutôt que de les cacher

4. **Maintenance**
   - Centraliser la création des menus dans des fichiers dédiés
   - Documenter le rôle de chaque option de menu
   - Utiliser des constantes pour les types d'actions

## API du Menu Contextuel

### Options de Menu.buildFromTemplate

```javascript
{
    label: 'Nom de l\'option',          // Texte affiché
    click: () => {},                    // Handler de clic
    type: 'normal',                     // Type: normal, separator, submenu, checkbox, radio
    enabled: true,                      // Active/désactive l'option
    visible: true,                      // Affiche/cache l'option
    accelerator: 'CommandOrControl+C',  // Raccourci clavier
    role: 'copy',                       // Rôle prédéfini (copy, paste, etc.)
    submenu: [],                        // Sous-menu
    checked: false                      // Pour checkbox/radio
}
```

### Options de popup()

```javascript
menu.popup({
    window,                 // Fenêtre parente
    positioningItem: 0,    // Index de l'item à positionner près du curseur
    callback: () => {},    // Appelé quand le menu est fermé
    x: 100,               // Position X (optionnel)
    y: 100                // Position Y (optionnel)
});
```

## Débogage

Pour déboguer les menus contextuels :

1. Activer les outils de développement :
```javascript
window.webContents.openDevTools();
```

2. Ajouter des logs :
```javascript
console.log('=== DEBUG: Menu contextuel ===', {
    window: bounds,
    click: { x, y },
    display: currentDisplay
});
```

3. Écouter les événements de fermeture :
```javascript
menu.popup({
    callback: () => console.log('Menu fermé')
});
```
