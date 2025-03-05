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

## Utilisation

1. Ouvrir une carte (carte principale ou carte de zone)
2. Cocher la case "Afficher géocaches proches" dans le menu en haut à droite
3. Les géocaches proches s'afficheront sur la carte avec un style distinct (points violets)
4. Décocher la case pour masquer les géocaches proches

## Limitations actuelles et améliorations futures

- La distance est actuellement fixée à 5 km. Une amélioration future pourrait permettre à l'utilisateur de définir cette distance.
- Le calcul de la distance est approximatif (conversion degrés/km).
- Dans la carte de zone, la géocache de référence est toujours la première de la liste. Une amélioration future pourrait permettre de sélectionner la géocache de référence.
- Ajouter un indicateur de distance pour chaque géocache proche.
- Ajouter un filtre par type de cache.

## Tests

Pour tester cette fonctionnalité :

1. Ouvrir une géocache qui a d'autres géocaches à proximité
2. Activer l'option "Afficher géocaches proches"
3. Vérifier que des points violets apparaissent sur la carte
4. Vérifier que ces points correspondent bien à des géocaches proches
5. Désactiver l'option et vérifier que les points disparaissent
