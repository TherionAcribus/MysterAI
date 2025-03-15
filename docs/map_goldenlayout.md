# Documentation de la carte dans GoldenLayout

## Fonctionnalités principales
- Affichage des géocaches d'une zone sous forme de points sur une carte OpenLayers
- Clic gauche : affiche les informations basiques de la géocache dans un popup
- Clic droit : ouvre un menu contextuel avec l'option "Ouvrir la Géocache"
- Affichage des géocaches proches d'une géocache sélectionnée

## Structure du code

### Fichiers impliqués
1. [zone_map_controller.js](cci:7://file:///c:/Users/Utilisateur/PycharmProjects/MysteryAI_good/static/js/controllers/zone_map_controller.js:0:0-0:0) - Contrôleur Stimulus pour la carte
2. [layout_initialize.js](cci:7://file:///c:/Users/Utilisateur/PycharmProjects/MysteryAI_good/static/js/layout_initialize.js:0:0-0:0) - Initialisation de GoldenLayout
3. `zone_map.html` - Template HTML pour la carte
4. `geocaches.py` - Route Flask pour les données des géocaches

### Initialisation de la carte
La carte est initialisée dans la méthode [initializeMap()](cci:1://file:///c:/Users/Utilisateur/PycharmProjects/MysteryAI_good/static/js/controllers/zone_map_controller.js:39:8-137:9) du contrôleur :
```javascript
this.map = new ol.Map({
    target: this.containerTarget,
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        }),
        this.vectorLayer
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([1.888334, 46.603354]),
        zoom: 6
    })
});


### Gestion des interactions

#### Clic gauche
Affiche un popup avec les informations de la géocache :

this.map.on('click', (evt) => {
    const feature = this.map.forEachFeatureAtPixel(evt.pixel, (feature) => feature);
    if (feature) {
        const geocache = feature.get('geocache');
        // Afficher les informations dans le popup
    }
});


#### Clic droit
Ouvre un menu contextuel avec l'option "Ouvrir la Géocache" :

this.map.getViewport().addEventListener('contextmenu', (evt) => {
    evt.preventDefault();
    const feature = this.map.forEachFeatureAtPixel(pixel, (feature) => feature);
    if (feature) {
        this.showContextMenu(evt.pageX, evt.pageY, geocache);
    }
});


### Menu contextuel
Le menu contextuel permet d'ouvrir la géocache dans un nouvel onglet :

showContextMenu(x, y, geocache) {
    this.contextMenu.innerHTML = `
        <div class="cursor-pointer hover:bg-gray-100 px-4 py-2 text-black" data-action="open-details">
            <i class="fas fa-info-circle mr-2"></i>Ouvrir la Géocache
        </div>
    `;
    // Gestion du clic sur l'option
}

## Fonctionnalités de la carte

### Changement de fond de carte

La carte permet de changer le fond de carte (base layer) en utilisant un sélecteur dans le coin supérieur droit. Les options disponibles sont :

- OSM Standard : Fond de carte OpenStreetMap standard
- OSM Cyclo : Fond de carte optimisé pour le cyclisme
- OSM Topo : Fond de carte topographique

Le changement de fond de carte est implémenté dans les deux contrôleurs de carte :
- `map_controller.js` pour la carte principale
- `zone_map_controller.js` pour la carte de zone

### Affichage des cercles de 161m

Pour les géocaches de type "Traditional", il est possible d'afficher un cercle de 161m (0.1 mile) autour de chaque point. Cette fonctionnalité est utile pour visualiser la zone de recherche potentielle.

Une case à cocher dans le menu de sélection permet d'activer/désactiver cette fonctionnalité.

### Affichage des géocaches proches

Il est possible d'afficher les géocaches proches d'une géocache sélectionnée. Cette fonctionnalité est disponible via une case à cocher dans le menu de sélection.

Lorsque cette option est activée :
- Dans la carte principale : les géocaches proches de la géocache actuellement affichée sont chargées et affichées
- Dans la carte de zone : les géocaches proches de la première géocache de la zone sont chargées et affichées

Les géocaches proches sont affichées avec un style différent (points violets) pour les distinguer des géocaches de la zone.

Par défaut, la distance utilisée pour déterminer les géocaches "proches" est de 5 km.

## Styles
Les styles principaux incluent :

Points bleus avec bordure blanche
Popup blanc avec texte noir
Menu contextuel avec ombre portée
Points d'amélioration possibles
Ajouter plus d'options dans le menu contextuel
Personnaliser les styles des points selon le type de géocache
Ajouter des contrôles de zoom et de navigation