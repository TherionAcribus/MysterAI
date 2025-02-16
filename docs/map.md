# Système de Carte pour les Géocaches

## Vue d'ensemble

Le système de carte permet de visualiser les coordonnées associées à chaque géocache. La carte s'affiche dans un panneau dédié dans l'interface principale et se met à jour automatiquement lors de la sélection d'une géocache.

## Types de Points

- **Point Original** (rouge) : Coordonnées originales de la géocache
- **Point Corrigé** (vert) : Coordonnées corrigées après résolution
- **Waypoints** (bleu) : Points additionnels liés à la géocache

## Interface Utilisateur

### Panneau de Carte

Le panneau de carte est accessible depuis la barre de navigation inférieure. Il affiche :
- Une carte OpenStreetMap centrée sur la France par défaut
- Les différents points associés à la géocache sélectionnée
- Des popups d'information pour chaque point

Chaque point affiche :
- Son type (original, corrigé, waypoint)
- Ses coordonnées précises
- Des informations supplémentaires (nom pour les waypoints)

## Architecture Technique

### Composants Frontend

- **Stimulus Controller** : `map_controller.js`
  - Gère l'initialisation de la carte Leaflet
  - Maintient la synchronisation avec la géocache sélectionnée
  - Gère les marqueurs et leurs styles

- **Templates** :
  - `map_panel.html` : Structure principale du panneau
  - Intégré dans `index.html` via le système de panneaux

### Routes API

- `GET /api/geocaches/<id>/coordinates`
  - Récupère toutes les coordonnées d'une géocache
  - Retourne les points original, corrigé et waypoints

- `POST /api/geocaches/save/<id>/coordinates`
  - Sauvegarde les coordonnées corrigées
  - Utilisé pour mettre à jour la position finale

### Structure des Données

```javascript
// Format des coordonnées retournées par l'API
{
    "original": {
        "latitude": number,
        "longitude": number,
        "gc_lat": string,
        "gc_lon": string,
        "type": "original"
    },
    "corrected": {
        "latitude": number,
        "longitude": number,
        "gc_lat": string,
        "gc_lon": string,
        "type": "corrected"
    },
    "waypoints": [
        {
            "id": number,
            "name": string,
            "prefix": string,
            "lookup": string,
            "latitude": number,
            "longitude": number,
            "gc_lat": string,
            "gc_lon": string,
            "type": "waypoint"
        }
    ]
}
```

### Intégration avec le Layout

Le système de carte s'intègre avec :
- **LayoutStateManager** : Détecte les changements de géocache active
- **GoldenLayout** : Gère l'affichage du panneau
- **HTMX** : Gère les mises à jour dynamiques du contenu

## Événements

Le système de carte réagit à plusieurs événements :

```javascript
// Sélection d'une géocache
document.addEventListener('geocacheSelected', (event) => {
    const { geocacheId, gcCode } = event.detail;
    // Mise à jour de la carte
});

// Activation du panneau
connect() {
    // Initialisation de la carte
}

// Désactivation du panneau
disconnect() {
    // Nettoyage des ressources
}
```

## Styles des Marqueurs

Les marqueurs sont stylisés selon leur type :
```css
/* Point Original */
background-color: red;
border: 2px solid white;

/* Point Corrigé */
background-color: green;
border: 2px solid white;

/* Waypoints */
background-color: blue;
border: 2px solid white;
```

## Exemples d'Utilisation

### Affichage d'une Géocache

1. Sélectionner une géocache dans la liste
2. Le panneau de carte se met à jour automatiquement
3. Les points associés s'affichent avec leurs couleurs respectives
4. Cliquer sur un point pour voir ses détails

### Navigation sur la Carte

1. Utiliser la molette pour zoomer/dézoomer
2. Cliquer-glisser pour se déplacer
3. Cliquer sur les marqueurs pour voir les popups d'information

## Dépendances

- **Leaflet** : Bibliothèque de cartographie
- **OpenStreetMap** : Fournisseur de tuiles cartographiques
- **Stimulus** : Gestion des contrôleurs JavaScript
- **HTMX** : Mises à jour dynamiques du contenu
