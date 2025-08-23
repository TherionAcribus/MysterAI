## Système de notifications unifié (AppNotify)

Ce document décrit comment utiliser le système de notifications global (overlay) dans toute l’application, depuis du code client (JS/Stimulus), du serveur (HTMX) et via WebSocket.

### TL;DR
- Conteneur overlay injecté dans `templates/index.html` (layout principal) et disponible globalement comme `window.AppNotify`.
- API client: `AppNotify.push(payload)`, `AppNotify.update(id, patch)`, `AppNotify.remove(id)`.
- HTMX: envoyer un header `HX-Trigger` avec l’évènement `app:notify` et un payload JSON.
- WebSocket: envoyer des messages `{ kind: 'notification', ...payload }`.

---

## Où vit l’overlay

- Overlay et contrôleur sont ajoutés dans `templates/index.html` via:
  - un conteneur fixe: `<div id="notifications-root" ...>`
  - un script global définissant `window.AppNotify`
- `AppNotify` est disponible pour tout le contenu chargé via GoldenLayout/HTMX.

Note: `templates/base.html` peut aussi contenir un overlay pour d’autres pages classiques, mais le layout de référence pour l’app est `templates/index.html`.

---

## Schéma du payload de notification

```json
{
  "id": "optional-stable-id",     // String optionnel. Généré si absent
  "level": "info",               // info | success | warning | error
  "message": "Texte à afficher",  // String (affichage simple)
  "html": null,                   // HTML optionnel (alternative à message)
  "type": "toast",               // réservé pour extensibilité (toast|banner|modal|progress)
  "progress": { "pct": 0.0 },    // Optionnel: 0..1. Désactive l’auto-dismiss
  "ttl": 5000,                    // Durée en ms. null = sticky
  "actions": [                    // Optionnel: boutons locaux
    { "id": "cancel", "label": "Annuler" }
  ]
}
```

Niveaux et couleurs:
- info: bleu
- success: vert
- warning: orange
- error: rouge

Les notifications avec `progress` ne se ferment pas automatiquement (pas de `ttl` effectif) tant qu’elles sont en cours.

---

## API client (JavaScript)

Disponible globalement: `window.AppNotify`.

### Créer une notification
```javascript
const id = AppNotify.push({
  level: 'info',
  message: 'Traitement lancé...',
  ttl: 4000
});
```

### Mettre à jour (progrès / statut)
```javascript
const id = AppNotify.push({ id: 'job-123', level: 'info', message: 'Début', progress: { pct: 0 } });

// plus tard
AppNotify.update('job-123', { progress: { pct: 0.55 }, message: 'À moitié' });

// final
AppNotify.update('job-123', { level: 'success', message: 'Terminé', progress: null, ttl: 6000 });
```

### Supprimer
```javascript
AppNotify.remove(id);
```

### Depuis Stimulus / contrôleurs front
Exemple tiré de `static/js/controllers/geocache_coordinates_controller.js` (succès/erreur):
```javascript
if (data.success) {
  AppNotify.push({ level: 'success', message: `Coordonnées envoyées pour ${gcCode}`, ttl: 5000 });
} else {
  AppNotify.push({ level: 'error', message: `Échec d\'envoi: ${data.error || 'Erreur inconnue'}`, ttl: 7000 });
}
```

---

## Déclenchement via HTMX

Le client écoute un `CustomEvent` `app:notify` et pousse le payload tel quel.

### Côté serveur (Flask)
```python
from flask import jsonify, make_response
import json

def respond_with_notification(payload: dict, body: dict, status=200):
    response = make_response(jsonify(body), status)
    # HX-Trigger doit contenir un objet { "app:notify": <payload> }
    response.headers['HX-Trigger'] = json.dumps({ 'app:notify': payload })
    return response

# Exemple usage
return respond_with_notification(
    { 'level': 'success', 'message': 'Opération terminée', 'ttl': 4000 },
    { 'ok': True }
)
```

### Côté client (HTMX direct)
Vous pouvez aussi déclencher localement:
```javascript
document.dispatchEvent(new CustomEvent('app:notify', { detail: { level: 'info', message: 'Info locale' } }));
```

---

## Intégration WebSocket

Le client expose `window.handleWsMessage`. Envoyez des messages de forme:
```json
{ "kind": "notification", "id": "job-123", "level": "info", "message": "En cours", "progress": { "pct": 0.1 } }
```

La logique côté client:
- si un `id` est connu: `update(id, patch)`
- sinon: `push(payload)`

---

## Bonnes pratiques

- Utilisez un `id` stable pour les processus longs afin de recevoir des mises à jour incrémentales.
- Pour éviter le spam, limitez la durée (`ttl`) ou regroupez des notifications fréquentes sous un même `id`.
- Pour les erreurs: mettez un message actionnable (ex: « Réessayez ») et, côté client, ajoutez un bouton via `actions` si l’action est locale.
- Accessibilité: l’overlay est `aria-live="polite"`; gardez des messages concis.

---

## Thématisation / CSS

Les classes de base sont injectées dans `templates/index.html`:
- `.toast`, `.toast.info`, `.toast.success`, `.toast.warning`, `.toast.error`
- barre de progression: `.toast .bar > div`

Pour surcharger, ajoutez du CSS au layout ou à votre page.

---

## Migration depuis alert()/messages inline

Remplacer:
```javascript
alert('Action réussie');
```
par:
```javascript
AppNotify.push({ level: 'success', message: 'Action réussie', ttl: 4000 });
```

---

## Dépannage

- Vérifier la présence du conteneur: `document.getElementById('notifications-root')`
- Vérifier l’API: `!!window.AppNotify` doit être `true`
- Tester vite: `AppNotify.push({ level:'info', message:'Test' })`
- Z-index: si une UI recouvre l’overlay, augmenter le z-index dans `#notifications-root`

---

## Extensibilité (futur)

- Préférences utilisateur: position (haut-gauche/droite…), durée, filtres de niveaux, sons, DND
- Persistance: base « non lues » + ack côté client
- Types supplémentaires: bannière globale, modale d’action


