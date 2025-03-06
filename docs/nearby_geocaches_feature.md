# Fonctionnalité d'affichage des géocaches proches

Cette documentation décrit la fonctionnalité d'affichage des géocaches proches implémentée dans l'application MysteryAI.

## Aperçu

La fonctionnalité permet aux utilisateurs de visualiser les géocaches situées à proximité d'une géocache spécifique. Cette fonctionnalité est utile pour planifier des itinéraires de chasse aux géocaches et découvrir des caches proches qui pourraient être intéressantes.

## Implémentation

### Backend

Une nouvelle route API a été ajoutée dans `app/routes/geocaches.py` :

```python
@geocaches_bp.route('/api/geocaches/<int:geocache_id>/nearby', methods=['GET'])
def get_nearby_geocaches(geocache_id):
    """Récupère les géocaches proches d'une géocache donnée."""
    # Récupérer la géocache de référence
    geocache = Geocache.query.get_or_404(geocache_id)
    
    # Récupérer la distance maximale depuis les paramètres de requête (par défaut 5km)
    distance_km = float(request.args.get('distance', 5))
    
    # Utiliser la fonction ST_DWithin pour trouver les géocaches dans un rayon donné
    distance_degrees = distance_km / 111.0
    
    # Créer un point avec les coordonnées de la géocache
    point = Point(geocache.longitude, geocache.latitude)
    
    # Trouver les géocaches proches
    nearby_geocaches = Geocache.query.filter(
        Geocache.id != geocache_id,  # Exclure la géocache de référence
        db.func.ST_DWithin(
            Geocache.coordinates, 
            from_shape(point), 
            distance_degrees
        )
    ).all()
    
    # Retourner les géocaches proches au format JSON
    return jsonify([{
        'id': cache.id,
        'gc_code': cache.gc_code,
        'name': cache.name,
        'cache_type': cache.cache_type,
        'latitude': cache.latitude,
        'longitude': cache.longitude,
        'difficulty': cache.difficulty,
        'terrain': cache.terrain,
        'distance': None  # Calculé côté client
    } for cache in nearby_geocaches])
```

Cette route utilise la fonction spatiale `ST_DWithin` pour trouver toutes les géocaches situées dans un rayon donné autour de la géocache spécifiée.

### Frontend

#### Carte principale (map_controller.js)

Dans le contrôleur de carte principale, nous avons ajouté :

1. Une case à cocher dans le sélecteur de fond de carte pour activer/désactiver l'affichage des géocaches proches
2. Une méthode `createNearbyGeocachesLayer()` pour créer une couche dédiée aux géocaches proches
3. Une méthode `toggleNearbyGeocaches(show)` pour activer/désactiver l'affichage
4. Une méthode `loadNearbyGeocaches()` pour charger les données depuis l'API

Les géocaches proches sont affichées avec un style distinct (points violets) pour les différencier des autres points sur la carte.

#### Carte de zone (zone_map_controller.js)

Une implémentation similaire a été ajoutée au contrôleur de carte de zone, avec quelques différences :
- La géocache de référence est la première géocache de la zone
- L'affichage est synchronisé avec la couche de cercles de 161m

## Affichage des informations détaillées

Lorsque l'utilisateur clique sur une géocache proche (représentée par un point violet), une popup s'affiche avec les informations suivantes :

- **Code GC** : Le code unique de la géocache (ex: GC12345)
- **Nom** : Le nom de la géocache
- **Type** : Le type de géocache (Traditionnelle, Multi, Mystery, etc.)
- **Owner** : Le propriétaire de la géocache
- **Difficulté et Terrain** : Les cotations de difficulté et de terrain (échelle de 1 à 5)
- **Distance** : La distance en kilomètres par rapport à la géocache de référence

Cette fonctionnalité permet aux utilisateurs d'obtenir rapidement des informations essentielles sur les géocaches proches sans avoir à ouvrir la page détaillée de chaque géocache.

## Menu contextuel pour les géocaches proches

Un menu contextuel a été implémenté pour les géocaches proches, accessible par un clic droit sur un point violet. Ce menu offre les fonctionnalités suivantes :

- Affichage du code GC et du nom de la géocache
- Affichage des coordonnées au format N DD° MM.MMM E DD° MM.MMM
- Option pour copier les coordonnées dans le presse-papiers

Cette fonctionnalité facilite la planification d'itinéraires en permettant aux utilisateurs de copier rapidement les coordonnées des géocaches proches pour les utiliser dans d'autres applications (GPS, planificateurs d'itinéraires, etc.).

### Implémentation technique

Le menu contextuel est créé dynamiquement lors du clic droit sur une géocache proche. Il est implémenté à l'aide d'un élément HTML positionné aux coordonnées du clic et stylisé pour correspondre à l'interface utilisateur de l'application.

Le code gère également les interactions suivantes :
- Copie des coordonnées dans le presse-papiers via l'API Clipboard
- Confirmation visuelle de la copie (changement de texte et de couleur)
- Fermeture automatique du menu après la copie ou lors d'un clic ailleurs sur la page

### Exemple d'utilisation

1. Activez l'affichage des géocaches proches
2. Effectuez un clic droit sur une géocache proche (point violet)
3. Le menu contextuel apparaît avec les coordonnées de la géocache
4. Cliquez sur "Copier les coordonnées" pour les copier dans le presse-papiers
5. Le menu se ferme automatiquement après la copie

## Utilisation

1. Ouvrir une carte (carte principale ou carte de zone)
2. Cocher la case "Afficher géocaches proches" dans le menu en haut à droite
3. Les géocaches proches s'afficheront sur la carte avec un style distinct (points violets)
4. Interagir avec les géocaches proches :
   - **Clic gauche** : Affiche une popup avec les informations détaillées de la géocache
   - **Clic droit** : Affiche un menu contextuel permettant de copier les coordonnées
5. Décocher la case pour masquer les géocaches proches

## Tests

Pour tester cette fonctionnalité :

1. Ouvrir une géocache qui a d'autres géocaches à proximité
2. Activer l'option "Afficher géocaches proches"
3. Vérifier que des points violets apparaissent sur la carte
4. Vérifier que ces points correspondent bien à des géocaches proches
5. Tester le clic gauche pour afficher les informations détaillées
6. Tester le clic droit pour afficher le menu contextuel et copier les coordonnées
7. Désactiver l'option et vérifier que les points disparaissent

## Limitations actuelles et améliorations futures

- La distance est actuellement fixée à 5 km. Une amélioration future pourrait permettre à l'utilisateur de définir cette distance.
- Le calcul de la distance est approximatif (conversion degrés/km).
- Dans la carte de zone, la géocache de référence est toujours la première de la liste. Une amélioration future pourrait permettre de sélectionner la géocache de référence.
- Ajouter un indicateur de distance pour chaque géocache proche.
- Ajouter un filtre par type de cache.
