# Système WebSocket pour MysteryAI

## Vue d'ensemble

Ce document décrit le système WebSocket intégré à MysteryAI pour fournir des mises à jour en temps réel lors d'opérations longues. Le système est conçu pour être robuste, extensible et facile à utiliser avec une **progression intégrée directement dans la page**.

## Architecture

### Backend

#### Service WebSocket (`app/services/websocket_service.py`)

Le service WebSocket centralisé gère toutes les communications temps réel :

- **Sessions** : Chaque opération crée une session unique avec un UUID
- **Salles (Rooms)** : Organisation des clients par session et zone
- **Messages standardisés** : Format uniforme pour tous les types de messages
- **Gestion d'erreurs** : Robustesse avec timeout et reconnexion
 - **Contrôles d'orchestration** : Drapeaux par session (pause/reprise/annulation) via `set_control/get_control`

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
 - **Rooms persistantes** : Rejoint automatiquement les sessions actives après reconnexion

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

#### Interface de Progression Intégrée

L'affichage de progression se fait directement dans la page via des éléments HTML dédiés :

- **Barre de progression** : Barre animée avec dégradé de couleurs
- **Messages d'étapes** : Affichage de l'étape actuelle en cours
- **Pourcentage** : Affichage du pourcentage de completion
- **Animation de brillance** : Effet visuel pour montrer l'activité
- **Transitions fluides** : Changement de couleurs selon l'état (progression/succès/erreur)

```html
<!-- Zone de progression intégrée -->
<div id="progress-container" class="mt-4 hidden">
    <div class="bg-gray-800 rounded-lg p-4 border border-gray-600">
        <div class="flex items-center justify-between mb-2">
            <span id="progress-title" class="text-sm font-medium text-blue-400">
                <i class="fas fa-plus-circle mr-2"></i>
                Ajout de géocache
            </span>
            <span id="progress-percentage" class="text-sm text-gray-400">0%</span>
        </div>
        
        <div id="progress-step" class="text-xs text-gray-500 mb-2 uppercase tracking-wide">
            Préparation...
        </div>
        
        <div id="progress-message" class="text-sm text-gray-300 mb-3">
            Initialisation...
        </div>
        
        <!-- Barre de progression -->
        <div class="bg-gray-700 rounded-full h-2 overflow-hidden">
            <div id="progress-bar" class="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300 ease-out relative overflow-hidden" style="width: 0%">
                <!-- Effet de brillance animé -->
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-shimmer"></div>
            </div>
        </div>
    </div>
</div>
```

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

#### Frontend (Formulaire avec Progression Intégrée)

```javascript
// Fonctions de gestion de la progression intégrée
function showProgress() {
    progressContainer.classList.remove('hidden');
    progressContainer.classList.add('show');
}

function updateProgress(step, message, percentage, sessionId = null) {
    if (step) progressStep.textContent = step.toUpperCase();
    if (message) progressMessage.textContent = message;
    if (percentage !== null) {
        progressPercentage.textContent = `${percentage}%`;
        progressBar.style.width = `${percentage}%`;
    }
}

function showProgressSuccess(message) {
    progressBar.className = 'bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-300 ease-out relative overflow-hidden';
    progressStep.textContent = 'TERMINÉ';
    progressMessage.textContent = message;
    progressPercentage.textContent = '✅';
}

// Gestionnaire d'événements du formulaire
form.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    // Afficher la progression intégrée
    showProgress();
    updateProgress('connexion', 'Connexion au serveur WebSocket...', 0);
    
    // Configuration des gestionnaires WebSocket
    const progressHandler = (data) => {
        if (data.operation_type === 'add_geocache' && data.zone_id == zoneId) {
            updateProgress(data.step, data.message, data.progress, data.session_id);
            window.wsService.joinSession(data.session_id);
        }
    };
    
    const completeHandler = (data) => {
        if (data.status === 'success') {
            showProgressSuccess(data.message);
            // Recharger le tableau et ouvrir les détails
            reloadTable().then(() => {
                if (data.result && data.result.id) {
                    handleGeocacheDetailsClick(data.result.id, data.result.gc_code, data.result.name, null);
                }
            });
        } else {
            showProgressError(data.message);
        }
    };
    
    // Écouter les événements WebSocket
    window.wsService.on('progress_add_geocache', progressHandler);
    window.wsService.on('complete_add_geocache', completeHandler);
    
    // Envoyer la requête
    await fetch('/api/geocaches/add', { method: 'POST', body: formData });
});
```

## Interface Utilisateur

### Couleurs et États

- **Progression normale** : Dégradé bleu vers vert (`from-blue-500 to-green-500`)
- **Fin de progression** : Dégradé vert (`from-green-500 to-blue-500` puis `from-green-500 to-green-400`)
- **Erreur** : Dégradé rouge (`from-red-500 to-red-400`)
- **Animation de brillance** : Effet shimmer continu pour montrer l'activité

### Animations et Transitions

- **Apparition** : Transition de opacité et translation Y
- **Barre de progression** : Transition fluide de la largeur (300ms)
- **Changement de couleurs** : Transitions automatiques selon l'état
- **Masquage automatique** : Disparition après 3 secondes en cas de succès

## Extensibilité

### Ajouter une Nouvelle Opération

1. **Backend** : Utiliser le service WebSocket dans votre route
```python
session_id = ws_service.create_session('mon_operation', zone_id)
ws_service.emit_progress(session_id, 'step1', 'Étape 1...', 25)
# ... traitement ...
ws_service.emit_success(session_id, 'Terminé !', result)
```

2. **Frontend** : Écouter les événements spécifiques et mettre à jour la progression
```javascript
window.wsService.on('progress_mon_operation', (data) => {
    updateProgress(data.step, data.message, data.progress);
});

window.wsService.on('complete_mon_operation', (data) => {
    if (data.status === 'success') {
        showProgressSuccess(data.message);
    } else {
        showProgressError(data.message);
    }
});
```

3. **Interface** : Adapter les titres et icônes selon l'opération
```javascript
// Personnaliser le titre selon l'opération
if (data.operation_type === 'import_gpx') {
    progressTitle.innerHTML = '<i class="fas fa-file-import mr-2"></i>Import GPX';
} else if (data.operation_type === 'refresh_batch') {
    progressTitle.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Rafraîchissement';
}
```

## Avantages de cette Approche

### Intégration Native
- **Pas de pop-ups** : Progression directement dans le flux de la page
- **Contextuel** : L'utilisateur reste dans le contexte de son action
- **Responsive** : S'adapte à la largeur de la page

### Expérience Utilisateur
- **Feedback immédiat** : L'utilisateur voit instantanément que quelque chose se passe
- **Information détaillée** : Étape actuelle + message descriptif + pourcentage
- **État final clair** : Couleurs et icônes différentes pour succès/erreur

### Performance
- **Léger** : Pas de composant de notification supplémentaire
- **Efficace** : Mise à jour directe des éléments DOM existants
- **Fluide** : Transitions CSS optimisées

## Bonnes Pratiques

### Backend

1. **Toujours créer une session** avant de commencer une opération longue
2. **Émettre régulièrement** des mises à jour de progression (tous les 10% environ)
3. **Messages descriptifs** : Indiquer clairement ce qui se passe
4. **Gestion d'erreurs robuste** : Toujours émettre un message d'erreur explicite

### Frontend

1. **Afficher la progression dès le début** : Même pour la connexion WebSocket
2. **Gérer les timeouts** : Ne pas laisser l'utilisateur attendre indéfiniment
3. **Feedback visuel** : Couleurs différentes selon l'état
4. **Nettoyage automatique** : Masquer la progression après succès

## Débogage

### Mode Debug

Pour activer le mode debug et voir des informations techniques supplémentaires, ajouter `#debug` à l'URL :
```
http://localhost:3000/geocaches/table/1#debug
```

Cela affichera l'ID de session et d'autres détails techniques.

### Logs Frontend

```javascript
// Activer les logs de débogage WebSocket
window.wsService.debug = true;

// Vérifier l'état de la connexion
console.log(window.wsService.getConnectionStatus());
```

### Logs Backend

```python
# Les logs sont automatiquement générés par le service
# Niveau DEBUG pour voir tous les détails
logger.setLevel(logging.DEBUG)
```

---

Ce système WebSocket avec progression intégrée offre une expérience utilisateur fluide et informative, directement intégrée dans le flux naturel de l'interface, sans interruption par des pop-ups. 