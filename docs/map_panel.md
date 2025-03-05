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
- Des popups d'information pour chaque point au clic

Chaque point affiche dans sa popup :
- Son type (original, corrigé, waypoint)
- Ses coordonnées au format géocaching (ex: N 48° 44.976 E 6° 4.051)
- Des informations supplémentaires (nom pour les waypoints)

## Changer le fond de carte

Le panneau de carte propose un menu permettant de sélectionner différents fonds de carte OpenStreetMap :

- **OSM Standard** : La carte OpenStreetMap classique
- **OSM Cyclo** : Carte orientée cyclisme
- **OSM Topo** : Carte topographique

Le menu est accessible en haut à droite de la carte.

## Architecture Technique

### Composants Frontend

- **Stimulus Controller** : `map_controller.js`
  - Gère l'initialisation de la carte OpenLayers
  - Maintient la synchronisation avec la géocache sélectionnée
  - Gère les features et leurs styles
  - Implémente l'interaction avec les popups

- **Templates** :
  - `map_panel.html` : Structure principale du panneau et popup
  - Intégré dans `index.html` via le système de panneaux GoldenLayout

### Implémentation OpenLayers

#### Initialisation de la Carte
```javascript
this.map = new ol.Map({
    target: this.containerTarget,
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        }),
        vectorLayer
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([2.213749, 46.227638]),
        zoom: 5
    })
});
```

#### Gestion des Points
Les points sont gérés comme des Features OpenLayers dans une VectorLayer :
```javascript
const feature = new ol.Feature({
    geometry: new ol.geom.Point(ol.proj.fromLonLat([coords.longitude, coords.latitude])),
    id: id,
    title: title,
    content: `${coords.gc_lat}<br>${coords.gc_lon}`,
    color: color
});
```

#### Style des Points
```javascript
new ol.style.Style({
    image: new ol.style.Circle({
        radius: 5,
        fill: new ol.style.Fill({
            color: color
        }),
        stroke: new ol.style.Stroke({
            color: 'white',
            width: 2
        })
    })
});
```

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
        "gc_lat": string,    // Format géocaching (N/S DD° MM.MMM)
        "gc_lon": string,    // Format géocaching (E/W DDD° MM.MMM)
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
- **GoldenLayout** : Gère l'affichage du panneau
- **Stimulus** : Gère la logique et les interactions
- **HTMX** : Gère les mises à jour dynamiques du contenu

## Interactions Utilisateur

- **Survol d'un point** : Le curseur devient un pointeur
- **Clic sur un point** : Affiche une popup avec :
  - Le type du point
  - Les coordonnées au format géocaching
  - Le nom pour les waypoints
- **Clic ailleurs** : Ferme la popup active

## Dépendances

- **OpenLayers** : Bibliothèque de cartographie (v8.2.0)
- **OpenStreetMap** : Fournisseur de tuiles cartographiques
- **Stimulus** : Gestion des contrôleurs JavaScript
- **HTMX** : Mises à jour dynamiques du contenu
- **Tailwind CSS** : Styles et mise en page
