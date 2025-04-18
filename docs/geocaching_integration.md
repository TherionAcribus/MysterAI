# Intégration avec Geocaching.com

Ce document décrit le fonctionnement de notre système d'intégration avec Geocaching.com, permettant d'interagir avec le site sans passer par une API officielle (qui n'existe pas ou est très limitée).

## Vue d'ensemble

L'application utilise une approche basée sur les cookies de navigateur pour se connecter à Geocaching.com. Ce choix a été fait pour plusieurs raisons :

1. **Absence d'API officielle complète** - Geocaching.com ne propose pas d'API publique pour toutes les fonctionnalités dont nous avons besoin
2. **Simplicité pour l'utilisateur** - Les utilisateurs n'ont pas besoin de saisir leurs identifiants dans notre application
3. **Sécurité** - Les identifiants restent dans le navigateur et ne transitent jamais par notre application

Cette approche utilise la bibliothèque `browser_cookie3` pour récupérer les cookies de Firefox et les utiliser pour authentifier les requêtes vers Geocaching.com.

## Structure du module

Le module principal `geocaching_client.py` contient les classes suivantes :

- `GeocachingClient` : Classe principale qui gère la connexion et les requêtes vers Geocaching.com
- `PersonalNotes` : Classe pour gérer les notes personnelles des géocaches
- `Coordinates` : Classe pour gérer les coordonnées des géocaches

### Classe GeocachingClient

Cette classe est responsable de la connexion à Geocaching.com et de l'envoi des requêtes au site.

#### Initialisation

```python
client = GeocachingClient()
```

Lors de l'initialisation, la classe récupère automatiquement les cookies de Firefox et vérifie si l'utilisateur est connecté à Geocaching.com.

#### Méthodes principales

- `ensure_login()` : Vérifie que l'utilisateur est connecté à Geocaching.com
- `get_user_token(geocode)` : Récupère le token utilisateur pour une géocache spécifique
- `make_api_request(url, data, method="POST")` : Envoie une requête à l'API de Geocaching.com

### Classe Coordinates

Cette classe permet de manipuler les coordonnées des géocaches sur Geocaching.com.

#### Initialisation

```python
coordinates = Coordinates(client)
```

#### Méthodes principales

- `update(geocode, latitude, longitude)` : Met à jour les coordonnées d'une géocache
- `reset(geocode)` : Réinitialise les coordonnées d'une géocache

### Classe PersonalNotes

Cette classe permet de gérer les notes personnelles des géocaches.

#### Initialisation

```python
notes = PersonalNotes(client)
```

#### Méthodes principales

- `update(geocode, note)` : Met à jour la note personnelle d'une géocache

## Fonctionnement détaillé

### Connexion via cookies Firefox

1. L'utilisateur se connecte à Geocaching.com via Firefox
2. Lorsque l'application démarre, `GeocachingClient` récupère les cookies de Firefox
3. Ces cookies sont utilisés pour authentifier les requêtes vers Geocaching.com

#### Mécanisme de vérification

Le client vérifie si la connexion est active en tentant d'accéder à une page qui nécessite une authentification (`/my/default.aspx`). Si la page est accessible, l'utilisateur est considéré comme connecté.

```python
def _check_login_status(self):
    """Vérifie si les cookies permettent d'être connecté"""
    try:
        # Essayer d'accéder à une page qui nécessite une connexion
        response = requests.get('https://www.geocaching.com/my/default.aspx', cookies=self.cookies)
        
        # Si pas de redirection vers la page de login, nous sommes connectés
        return 'geocaching.com/account/signin' not in response.url and response.status_code == 200
    except Exception:
        return False
```

### Récupération du token utilisateur

Pour de nombreuses interactions avec Geocaching.com, un token utilisateur spécifique à chaque géocache est nécessaire. Le client extrait ce token à partir de la page web de la géocache.

```python
def get_user_token(self, geocode, force_refresh=False):
    # Récupérer la page du cache
    cache_page = requests.get(
        f'https://www.geocaching.com/seek/cache_details.aspx?wp={geocode}', 
        cookies=self.cookies
    )
    
    # Extraire le userToken avec regex
    token_match = re.search(r'userToken = \'([^\']+)\'', cache_page.text)
    if token_match:
        return token_match.group(1)
```

### Mise à jour des coordonnées

Pour mettre à jour les coordonnées personnelles d'une géocache, la classe `Coordinates` envoie une requête au point d'API approprié :

```python
def update(self, geocode, latitude, longitude):
    user_token = self.client.get_user_token(geocode)
    
    # Format attendu par l'API de Geocaching.com
    data = {
        "dto": {
            "data": {
                "lat": latitude,
                "lng": longitude
            },
            "ut": user_token
        }
    }
    
    url = "https://www.geocaching.com/seek/cache_details.aspx/SetUserCoordinate"
    
    result = self.client.make_api_request(url, data)
```

## Exemple d'utilisation

Voici un exemple complet pour mettre à jour les coordonnées d'une géocache :

```python
from app.geocaching_client import GeocachingClient, Coordinates
from app.utils.coordinates import convert_gc_coords_to_decimal

# Créer une instance du client
client = GeocachingClient()

# Vérifier si l'utilisateur est connecté
if client.ensure_login():
    # Créer une instance de la classe Coordinates
    coordinates = Coordinates(client)
    
    # Code de la géocache
    gc_code = "GC12345"
    
    # Coordonnées à mettre à jour (format Geocaching)
    gc_lat = "N 48° 51.402"
    gc_lon = "E 002° 21.048"
    
    # Convertir en coordonnées décimales
    lat, lon = convert_gc_coords_to_decimal(gc_lat, gc_lon)
    
    # Mettre à jour les coordonnées
    if coordinates.update(gc_code, lat, lon):
        print("Coordonnées mises à jour avec succès!")
    else:
        print("Échec de la mise à jour des coordonnées")
else:
    print("Vous devez être connecté sur Firefox à Geocaching.com")
```

## Intégration dans l'application web

L'intégration dans l'application web se fait via une route Flask et un contrôleur JavaScript Stimulus :

### Route Flask

```python
@geocaches_bp.route('/geocaches/<int:geocache_id>/send_to_geocaching', methods=['POST'])
def send_to_geocaching(geocache_id):
    try:
        # Récupérer les données
        data = request.get_json()
        gc_code = data['gc_code']
        
        # Récupérer la géocache
        geocache = Geocache.query.get_or_404(geocache_id)
        
        # Créer une instance du client Geocaching
        client = GeocachingClient()
        
        # Vérifier si les cookies permettent l'accès
        if not client.ensure_login():
            return jsonify({
                'success': False, 
                'error': 'Impossible de se connecter à Geocaching.com. Assurez-vous d\'être connecté dans Firefox.'
            }), 401
        
        # Convertir et envoyer les coordonnées
        lat, lon = convert_gc_coords_to_decimal(geocache.gc_lat_corrected, geocache.gc_lon_corrected)
        coordinates = Coordinates(client)
        
        if coordinates.update(gc_code, lat, lon):
            return jsonify({
                'success': True,
                'message': 'Coordonnées envoyées avec succès'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Échec de l\'envoi des coordonnées'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
```

### Contrôleur JavaScript

Le contrôleur Stimulus `GeocacheCoordinatesController` contient une méthode `sendToGeocaching` qui envoie les coordonnées via une requête AJAX :

```javascript
sendToGeocaching(event) {
    const gcCode = event.currentTarget.dataset.gcCode;
    const button = event.currentTarget;
    
    // Afficher confirmation et désactiver le bouton
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Envoi en cours...';
    
    // Envoyer la requête
    fetch(`/geocaches/${this.geocacheIdValue}/send_to_geocaching`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
            gc_code: gcCode
        })
    })
    .then(response => response.json())
    .then(data => {
        // Réactiver le bouton
        button.disabled = false;
        button.innerHTML = 'Envoyer sur Geocaching.com';
        
        if (data.success) {
            alert(`Coordonnées envoyées avec succès pour ${gcCode}!`);
        } else {
            alert(`Erreur: ${data.error}`);
        }
    })
    .catch(error => {
        button.disabled = false;
        button.innerHTML = 'Envoyer sur Geocaching.com';
        alert(`Erreur: ${error.message}`);
    });
}
```

## Avantages et limitations

### Avantages

- **Simplicité pour l'utilisateur** - Pas besoin de saisir les identifiants dans l'application
- **Sécurité** - Les identifiants restent dans le navigateur
- **Flexibilité** - Possibilité d'accéder à toutes les fonctionnalités disponibles sur le site

### Limitations

- **Dépendance à Firefox** - L'utilisateur doit utiliser Firefox et être connecté à Geocaching.com
- **Fragilité** - Si Geocaching.com change sa structure HTML ou son API, notre code peut cesser de fonctionner
- **Performance** - Le scraping de pages web est moins efficace qu'une API officielle

## Extensions possibles

Le système actuel pourrait être étendu avec les fonctionnalités suivantes :

1. **Support de plusieurs navigateurs** - Ajouter la prise en charge des cookies de Chrome, Edge, etc.
2. **Mise en cache des tokens** - Améliorer la gestion du cache des tokens utilisateur
3. **Nouveaux endpoints** - Ajouter le support pour d'autres actions comme :
   - Marquer une géocache comme trouvée
   - Ajouter une géocache aux favoris
   - Télécharger des géocaches pour une utilisation hors ligne
4. **Interface de configuration** - Permettre à l'utilisateur de choisir son navigateur préféré

## Conclusion

L'intégration avec Geocaching.com via les cookies de Firefox offre une solution pratique pour interagir avec le site sans API officielle. Cette approche permet d'ajouter facilement de nouvelles fonctionnalités tout en maintenant une expérience utilisateur fluide.

Pour ajouter de nouvelles interactions avec Geocaching.com, il suffit de suivre le modèle existant : identifier l'endpoint approprié, créer une classe ou méthode dédiée, et l'intégrer dans l'application web via des routes Flask et des contrôleurs JavaScript. 