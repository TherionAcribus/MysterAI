# Système WebSocket pour MysteryAI

## Vue d'ensemble

Ce document décrit le système WebSocket intégré à MysteryAI pour fournir des mises à jour en temps réel lors d'opérations longues. Le système est conçu pour être robuste, extensible et facile à utiliser.

## Architecture

### Backend

#### Service WebSocket (`app/services/websocket_service.py`)

Le service WebSocket centralisé gère toutes les communications temps réel :

- **Sessions** : Chaque opération crée une session unique avec un UUID
- **Salles (Rooms)** : Organisation des clients par session et zone
- **Messages standardisés** : Format uniforme pour tous les types de messages
- **Gestion d'erreurs** : Robustesse avec timeout et reconnexion

```python
# Exemple d'utilisation côté backend
from app.services.websocket_service import get_websocket_service

ws_service = get_websocket_service()
session_id = ws_service.create_session('add_geocache', zone_id)

# Envoyer une mise à jour de progression
ws_service.emit_progress(session_id, 'scraping', 'Récupération des données...', 30)

# Envoyer un message de succès
ws_service.emit_success(session_id, 'Géocache ajoutée avec succès !', result_data)
```

#### Intégration Flask-SocketIO

L'initialisation est faite dans `app/__init__.py` :

```python
# Initialisation de SocketIO
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Initialisation du service WebSocket
from app.services.websocket_service import init_websocket_service
websocket_service = init_websocket_service(socketio)
```

### Frontend

#### Service WebSocket (`static/js/services/websocket_service.js`)

Service JavaScript pour la communication côté client :

- **Auto-connexion** : Connexion automatique au démarrage
- **Reconnexion automatique** : Gestion des déconnexions
- **Gestion des salles** : Jonction automatique aux zones et sessions
- **Événements typés** : Émission d'événements spécifiques par opération

```javascript
// Utilisation côté frontend
window.wsService.joinZone(zoneId);

window.wsService.on('progress_add_geocache', (data) => {
    console.log('Progression:', data.message, data.progress + '%');
});

window.wsService.on('complete_add_geocache', (data) => {
    if (data.status === 'success') {
        console.log('Succès:', data.message);
    }
});
```

#### Composant de Notification (`static/js/components/progress_notification.js`)

Interface utilisateur élégante pour afficher les notifications :

- **Notifications toast** : Affichage en coin d'écran
- **Barre de progression** : Suivi visuel du pourcentage
- **Animation fluide** : Entrée/sortie avec transitions CSS
- **Gestion automatique** : Auto-suppression et limitation du nombre

## Formats de Messages

### Message de Progression

```json
{
    "session_id": "uuid-unique",
    "operation_type": "add_geocache",
    "zone_id": 1,
    "step": "scraping",
    "message": "Récupération des données depuis geocaching.com...",
    "progress": 30,
    "data": {},
    "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Message de Fin d'Opération

```json
{
    "session_id": "uuid-unique",
    "operation_type": "add_geocache",
    "zone_id": 1,
    "status": "success",
    "message": "Géocache ajoutée avec succès !",
    "result": {
        "id": 123,
        "gc_code": "GC12345",
        "name": "Ma Géocache"
    },
    "timestamp": "2024-01-15T10:31:00.000Z"
}
```

## Implémentation : Ajout de Géocache

### Étapes Suivies

1. **Début** (`started`) - 0%
   - Création de la session
   - Validation des paramètres

2. **Validation de la zone** (`validate_zone`) - 10%
   - Vérification de l'existence de la zone

3. **Vérification de l'existant** (`check_existing`) - 20%
   - Recherche de géocache existante

4. **Scraping** (`scraping`) - 30%
   - Récupération des données depuis geocaching.com

5. **Traitement des données** (`parse_data`) - 40%
   - Conversion et validation des données

6. **Traitement du propriétaire** (`process_owner`) - 50%
   - Gestion des informations de propriétaire

7. **Création** (`create_geocache`) - 60%
   - Création de l'objet géocache

8. **Waypoints** (`process_waypoints`) - 70%
   - Traitement des waypoints additionnels

9. **Checkers** (`process_checkers`) - 75%
   - Traitement des checkers

10. **Attributs** (`process_attributes`) - 80%
    - Traitement des attributs

11. **Sauvegarde** (`save_database`) - 90%
    - Sauvegarde en base de données

12. **Terminé** (`completed`) - 100%
    - Opération terminée avec succès

### Code d'Intégration

#### Backend (Route)

```python
@geocaches_bp.route('/api/geocaches/add', methods=['POST'])
def add_geocache():
    from app.services.websocket_service import get_websocket_service
    ws_service = get_websocket_service()
    
    # Créer une session
    session_id = ws_service.create_session('add_geocache', int(zone_id))
    ws_service.emit_progress(session_id, 'started', 'Début de l\'ajout...', 0)
    
    try:
        # Étapes de traitement avec émission de progression
        ws_service.emit_progress(session_id, 'scraping', 'Récupération...', 30)
        geocache_data = scrape_geocache(code)
        
        # ... autres étapes ...
        
        ws_service.emit_success(session_id, 'Géocache ajoutée !', result)
        
    except Exception as e:
        ws_service.emit_error(session_id, f'Erreur : {str(e)}')
```

#### Frontend (Formulaire)

```javascript
form.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    // Rejoindre la zone pour recevoir les updates
    const zoneId = form.querySelector('input[name="zone_id"]').value;
    window.wsService.joinZone(parseInt(zoneId));
    
    // Configuration des gestionnaires
    const progressHandler = (data) => {
        if (data.operation_type === 'add_geocache' && data.zone_id == zoneId) {
            messageDiv.textContent = data.message;
            // Rejoindre la session spécifique
            window.wsService.joinSession(data.session_id);
        }
    };
    
    const completeHandler = (data) => {
        if (data.status === 'success') {
            // Succès - recharger le tableau
            reloadTable();
        } else {
            // Erreur - afficher le message
            showError(data.message);
        }
    };
    
    // Écouter les événements
    window.wsService.on('progress_add_geocache', progressHandler);
    window.wsService.on('complete_add_geocache', completeHandler);
    
    // Envoyer la requête
    await fetch('/api/geocaches/add', { method: 'POST', body: formData });
});
```

## Extensibilité

### Ajouter une Nouvelle Opération

1. **Backend** : Utiliser le service WebSocket dans votre route
```python
session_id = ws_service.create_session('mon_operation', zone_id)
ws_service.emit_progress(session_id, 'step1', 'Étape 1...', 25)
# ... traitement ...
ws_service.emit_success(session_id, 'Terminé !', result)
```

2. **Frontend** : Écouter les événements spécifiques
```javascript
window.wsService.on('progress_mon_operation', handleProgress);
window.wsService.on('complete_mon_operation', handleComplete);
```

3. **Notifications** : Le composant de notification s'adapte automatiquement

### Configuration des Notifications

```javascript
// Personnaliser les notifications
window.progressNotification = new ProgressNotification({
    position: 'top-right',        // Position des notifications
    maxNotifications: 5,          // Nombre maximum affiché
    autoRemove: true,            // Suppression automatique
    autoRemoveDelay: 5000,       // Délai de suppression (ms)
    showProgress: true,          // Afficher la barre de progression
    theme: 'dark'                // Thème (dark/light)
});
```

## Gestion des Erreurs

### Côté Backend

- **Timeout de session** : Sessions nettoyées automatiquement
- **Exceptions capturées** : Émission automatique d'erreurs WebSocket
- **Validation des données** : Vérification avant émission

### Côté Frontend

- **Reconnexion automatique** : Jusqu'à 5 tentatives
- **Timeout d'opération** : 60 secondes par défaut
- **Fallback gracieux** : Retour au mode HTTP classique si WebSocket indisponible

## Bonnes Pratiques

### Backend

1. **Toujours créer une session** avant de commencer une opération longue
2. **Émettre régulièrement** des mises à jour de progression
3. **Nettoyer les sessions** en cas d'erreur
4. **Utiliser des messages descriptifs** pour l'utilisateur

### Frontend

1. **Rejoindre la zone** concernée avant de démarrer l'opération
2. **Gérer les timeouts** pour éviter les attentes infinies
3. **Nettoyer les gestionnaires** après utilisation
4. **Prévoir un fallback** si WebSocket n'est pas disponible

## Débogage

### Logs Backend

```python
# Les logs sont automatiquement générés par le service
# Niveau DEBUG pour voir tous les détails
logger.setLevel(logging.DEBUG)
```

### Logs Frontend

```javascript
// Activer les logs de débogage
window.wsService.debug = true;

// Vérifier l'état de la connexion
console.log(window.wsService.getConnectionStatus());
```

### Outils de Développement

1. **Console du navigateur** : Voir les événements WebSocket en temps réel
2. **Onglet Network** : Vérifier les connexions WebSocket
3. **Logs serveur** : Suivre les sessions et messages côté backend

## Performances

- **Sessions légères** : UUID uniquement, pas de stockage lourd
- **Nettoyage automatique** : Sessions supprimées après utilisation
- **Limitation des notifications** : Maximum 5 notifications simultanées
- **Compression** : Messages JSON minifiés automatiquement

## Sécurité

- **CORS configuré** : Origines autorisées définies
- **Validation des sessions** : Vérification de l'existence avant émission
- **Nettoyage préventif** : Timeout pour éviter les fuites mémoire
- **Isolation des zones** : Chaque zone reçoit uniquement ses messages

---

Ce système WebSocket fournit une base solide pour l'amélioration de l'expérience utilisateur dans MysteryAI, avec la possibilité d'extension facile vers d'autres fonctionnalités nécessitant du temps réel. 