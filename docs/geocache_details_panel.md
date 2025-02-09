# Panneau de Détails des Géocaches

## Vue d'ensemble

Le panneau de détails des géocaches est un composant qui affiche les informations détaillées d'une géocache spécifique. Il est intégré dans l'interface principale via GoldenLayout et s'ouvre dans un nouvel onglet lorsqu'un utilisateur clique sur le bouton "Détails" dans le tableau des géocaches.

## Architecture

### Communication entre Composants

1. **Tableau des Géocaches → Fenêtre Principale**
   - Le bouton "Détails" dans le tableau utilise `window.postMessage` pour communiquer avec la fenêtre principale
   - Un message de type `openGeocacheDetails` est envoyé avec l'ID de la géocache

2. **Fenêtre Principale → GoldenLayout**
   - La fenêtre principale intercepte le message via un écouteur d'événements
   - Elle fait une requête au serveur pour obtenir le contenu HTML du panneau
   - Un nouvel onglet est créé dans GoldenLayout avec le contenu reçu

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
        fetch(`/geocaches/${geocacheId}/details-panel`)
            .then(response => response.text())
            .then(html => {
                const root = layout.root;
                const newItemConfig = {
                    type: 'component',
                    componentName: 'geocache-details',
                    title: `Détails GC-${geocacheId}`,
                    componentState: { 
                        html: html,
                        geocacheId: geocacheId
                    }
                };
                root.contentItems[0].addChild(newItemConfig);
            });
    }
});
```

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
