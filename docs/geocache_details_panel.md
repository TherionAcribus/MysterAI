# Panneau de Détails des Géocaches

## Vue d'ensemble

Le panneau de détails des géocaches est un composant qui affiche les informations détaillées d'une géocache spécifique. Il est intégré dans l'interface principale via GoldenLayout et s'ouvre dans un nouvel onglet lorsqu'un utilisateur clique sur le bouton "Détails" dans le tableau des géocaches.

## Architecture

### Configuration de l'API

L'application utilise une variable globale `API_BASE_URL` pour gérer les URLs de l'API :
```javascript
window.API_BASE_URL = 'http://127.0.0.1:3000';
```
Cette configuration est particulièrement importante pour Electron où les URLs relatives ne fonctionnent pas de la même manière que dans un navigateur web.

### Communication entre Composants

1. **Tableau des Géocaches → Fenêtre Principale**
   - Le bouton "Détails" dans le tableau utilise `window.postMessage` pour communiquer avec la fenêtre principale
   - Un message de type `openGeocacheDetails` est envoyé avec :
     - L'ID de la géocache
     - L'ID du conteneur parent
     - L'URL complète pour les détails (`${API_BASE_URL}/geocaches/${id}/details-panel`)

2. **Fenêtre Principale → GoldenLayout**
   - La fenêtre principale intercepte le message via un écouteur d'événements
   - Elle fait une requête au serveur en utilisant l'URL fournie
   - Un nouvel onglet est créé dans GoldenLayout avec le contenu reçu
   - L'onglet est ajouté dans le même conteneur que le tableau d'origine

3. **Serveur → Client**
   - Le serveur récupère les données de la géocache depuis la base de données
   - Le template est rendu avec les données et renvoyé au client
   - Le contenu HTML est injecté dans le nouvel onglet

## Composants Techniques

### Route Backend (`geocaches.py`)
```python
@geocaches_bp.route('/geocaches/<int:geocache_id>/details-panel', methods=['GET'])
def get_geocache_details_panel(geocache_id):
    """Renvoie le panneau HTML des détails d'une géocache."""
    geocache = Geocache.query.get_or_404(geocache_id)
    return render_template('geocache_details.html', geocache=geocache)
```

### Template (`geocache_details.html`)
- Template Jinja2 qui affiche les détails de la géocache
- Sections principales :
  - En-tête (nom, code GC, propriétaire)
  - Coordonnées (latitude, longitude)
  - Description
  - Indices
  - Waypoints additionnels
  - Attributs
  - Checkers

### Intégration GoldenLayout (`index.html`)
```javascript
// Enregistrement du composant
layout.registerComponent('geocache-details', function(container, state) {
    container.getElement().html(state.html);
});

// Gestionnaire d'événements pour l'ouverture des détails
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'openGeocacheDetails') {
        const geocacheId = event.data.geocacheId;
        const containerId = event.data.containerId;
        const detailsUrl = event.data.detailsUrl;

        fetch(detailsUrl)
            .then(response => response.text())
            .then(html => {
                const container = layout.root.getItemsById(containerId)[0];
                if (container && container.parent) {
                    container.parent.addChild({
                        type: 'component',
                        componentName: 'geocache-details',
                        title: `Détails GC-${geocacheId}`,
                        componentState: { html: html }
                    });
                }
            });
    }
});
```

## Compatibilité Electron

Pour assurer le bon fonctionnement dans Electron :
1. Toutes les URLs sont construites en utilisant `API_BASE_URL`
2. Les URLs sont transmises complètes entre les composants
3. Le port 3000 est utilisé pour le serveur Flask au lieu du port par défaut
4. Les URLs relatives sont évitées pour la communication avec l'API

## Styles et Mise en Page

- Utilisation de Tailwind CSS pour le style
- Structure en sections distinctes avec des cartes (`bg-gray-800`)
- Thème sombre cohérent avec l'interface principale
- Espacement et marges uniformes entre les sections

## Sections de Données

1. **En-tête**
   - Nom de la géocache
   - Code GC
   - Propriétaire
   - Difficulté et terrain (avec icônes)
   - Taille du contenant

2. **Coordonnées**
   - Coordonnées d'origine
   - Coordonnées GC (si différentes)

3. **Description**
   - Description complète de la géocache
   - Support du HTML dans la description

4. **Indices**
   - Liste des indices fournis
   - Support du HTML pour le formatage

5. **Waypoints Additionnels** (si présents)
   - Nom et préfixe
   - Coordonnées
   - Notes associées

6. **Attributs** (si présents)
   - Icônes des attributs
   - Noms des attributs

7. **Checkers** (si présents)
   - Liens vers les outils de vérification
   - Ouverture dans un nouvel onglet

## Menus Contextuels pour les Boutons d'Action

Les boutons d'action dans le panneau de détails (Analyser, Solver, Formula Solver) sont équipés d'un système de menu contextuel permettant de choisir où ouvrir le contenu.

### Fonctionnalités

1. **Options d'ouverture**
   - Ouvrir dans l'onglet actuel (comportement par défaut)
   - Ouvrir dans un nouvel onglet

2. **Méthodes d'interaction**
   - Clic gauche : Exécute l'action avec le comportement par défaut (même onglet)
   - Clic droit : Affiche un menu contextuel avec les options d'ouverture
   - Ctrl+Clic (ou Cmd+Clic sur Mac) : Force l'ouverture dans un nouvel onglet

### Implémentation technique

1. **Marquage des boutons**
   ```html
   <button class="... geocache-action-button"
           data-geocache-id="{{ geocache.id }}"
           data-gc-code="{{ geocache.gc_code }}"
           data-action-type="solver">
       ...
   </button>
   ```

2. **Gestionnaire du menu contextuel**
   ```javascript
   function showContextMenu(event, button) {
       // Créer et afficher le menu contextuel
       const menu = document.createElement('div');
       menu.className = 'context-menu';
       menu.innerHTML = `
           <div class="context-menu-item" data-action="same">
               <i class="fas fa-exchange-alt"></i> Ouvrir dans l'onglet actuel
           </div>
           <div class="context-menu-item" data-action="new">
               <i class="fas fa-external-link-alt"></i> Ouvrir dans un nouvel onglet
           </div>
       `;
       // Positionnement et gestion des événements...
   }
   ```

3. **Exécution de l'action**
   ```javascript
   function executeButtonAction(button, tabMode) {
       const actionType = button.dataset.actionType;
       const geocacheId = button.dataset.geocacheId;
       const gcCode = button.dataset.gcCode;
       
       // Exécuter l'action en fonction du type et du mode d'ouverture
       switch (actionType) {
           case 'analyze':
               window.openPluginTab('analysis_web_page', `Analyse ${gcCode}`, {
                   geocacheId: geocacheId, 
                   gcCode: gcCode,
                   openInSameTab: tabMode === 'same'
               });
               break;
           // autres cas...
       }
   }
   ```

### Styles CSS

```css
.context-menu {
    position: fixed;
    z-index: 10000;
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 0.375rem;
    padding: 0.5rem 0;
    min-width: 160px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.context-menu-item {
    padding: 0.5rem 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    color: #e5e7eb;
    transition: background-color 0.2s;
}

.context-menu-item:hover {
    background-color: #374151;
}
```

### Avantages

1. Interface utilisateur cohérente et intuitive
2. Flexibilité dans l'organisation des onglets
3. Raccourcis clavier (Ctrl+Clic) pour les utilisateurs avancés
4. Architecture extensible pour ajouter d'autres options au menu contextuel
