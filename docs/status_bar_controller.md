# Contrôleur de la Barre de Statut

Ce document détaille le fonctionnement technique du contrôleur de la barre de statut (`StatusBarController`), qui gère notamment la sélection des modèles d'IA.

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Structure du code](#structure-du-code)
3. [Cycle de vie](#cycle-de-vie)
4. [Chargement des modèles d'IA](#chargement-des-modèles-dia)
5. [Organisation des modèles](#organisation-des-modèles)
6. [Gestion des événements](#gestion-des-événements)
7. [Communication avec le serveur](#communication-avec-le-serveur)
8. [Interaction avec les autres composants](#interaction-avec-les-autres-composants)
9. [Personnalisation et extension](#personnalisation-et-extension)

## Vue d'ensemble

Le contrôleur de la barre de statut (`StatusBarController`) est un composant Stimulus qui:
- Affiche le statut actuel de l'application
- Permet la sélection des modèles d'IA disponibles
- Gère les changements de modèle d'IA actif
- Affiche les notifications à l'utilisateur

## Structure du code

Le contrôleur est défini dans le fichier `static/js/controllers/status_bar_controller.js`.

```javascript
class StatusBarController extends Stimulus.Controller {
    static targets = ["aiModelSelector"];
    
    connect() { /* ... */ }
    loadAIModels() { /* ... */ }
    changeAIModel(event) { /* ... */ }
    updateSelectedModel(event) { /* ... */ }
    showNotification(message, isError = false) { /* ... */ }
}
```

### Éléments cibles

- `aiModelSelector` : Le sélecteur déroulant des modèles d'IA

## Cycle de vie

1. **Initialisation** : Lors du chargement de la page, le contrôleur s'initialise via la méthode `connect()`.
2. **Chargement des modèles** : Appel à `loadAIModels()` qui récupère la liste des modèles disponibles depuis le serveur.
3. **Interaction utilisateur** : L'utilisateur sélectionne un modèle, déclenchant `changeAIModel()`.
4. **Notification** : Le contrôleur notifie les autres composants du changement via un événement personnalisé.

## Chargement des modèles d'IA

Le chargement des modèles est effectué par la méthode `loadAIModels()` qui:

1. Appelle l'API `/api/ai/models` via fetch.
2. Traite la réponse JSON contenant la liste des modèles.
3. Sépare les modèles par type (en ligne/local).
4. Crée les groupes d'options dans le sélecteur.
5. Ajoute les modèles disponibles avec leurs attributs.

```javascript
loadAIModels() {
    fetch('/api/ai/models')
        .then(response => response.json())
        .then(data => {
            // Vider le sélecteur
            this.aiModelSelectorTarget.innerHTML = '';
            
            // Séparer les modèles par type
            const onlineModels = data.models.filter(model => model.type === 'online');
            const localModels = data.models.filter(model => model.type === 'local');
            
            // Créer les groupes d'options...
        })
}
```

### Log de débogage

Pour faciliter le débogage, les informations suivantes sont enregistrées dans la console:
- Succès de la réponse API
- Nombre total de modèles
- Nombre de modèles en ligne/locaux
- Mode actuel (en ligne/local)
- Présence d'une clé API

## Organisation des modèles

Les modèles sont organisés en deux groupes dans le sélecteur:

1. **Modèles en ligne** : Modèles des fournisseurs d'API comme OpenAI, Anthropic, etc.
   - Nécessitent une clé API valide
   - Regroupés sous le label "Modèles en ligne"
   - Marqués comme non utilisables si aucune clé API n'est configurée

2. **Modèles locaux** : Modèles exécutés localement via Ollama
   - Ne nécessitent pas de clé API
   - Regroupés sous le label "Modèles locaux"
   - Nécessitent une connexion valide au serveur Ollama

## Gestion des événements

### Changement de modèle

Lorsque l'utilisateur sélectionne un nouveau modèle dans le menu déroulant:

1. L'événement `change` déclenche la méthode `changeAIModel(event)`.
2. Le contrôleur vérifie si le modèle est utilisable (attribut `data-usable`).
3. Si le modèle n'est pas utilisable (clé API manquante), une notification est affichée.
4. Sinon, une requête est envoyée au serveur pour changer le modèle actif.

```javascript
changeAIModel(event) {
    const modelId = event.target.value;
    
    // Vérifier si l'option sélectionnée est utilisable
    const selectedOption = event.target.options[event.target.selectedIndex];
    const isUsable = selectedOption.getAttribute('data-usable') !== 'false';
    
    if (!isUsable) {
        // Afficher une notification et annuler le changement
        return;
    }
    
    // Envoyer la requête pour changer le modèle actif
    fetch('/api/ai/set_active_model', {/* ... */})
}
```

### Notification du changement

Lorsqu'un modèle est changé avec succès, le contrôleur:

1. Affiche une notification à l'utilisateur
2. Dispatche un événement personnalisé pour informer les autres composants:

```javascript
window.dispatchEvent(new CustomEvent('aiModelChanged', {
    detail: { modelId: modelId, modelName: data.model_name }
}));
```

## Communication avec le serveur

Le contrôleur communique avec le serveur via deux endpoints principaux:

1. **`/api/ai/models`** - GET
   - Récupère la liste complète des modèles disponibles
   - Fournit des informations sur chaque modèle (type, nom, disponibilité)

2. **`/api/ai/set_active_model`** - POST
   - Définit le modèle actif dans les paramètres système
   - Corps de la requête: `{ model_id: "..." }`
   - Réponse: Confirmation du changement et détails du modèle

## Interaction avec les autres composants

Le contrôleur communique avec d'autres composants de l'application via des événements personnalisés:

- Émet l'événement `aiModelChanged` lorsque le modèle actif change
- Écoute ce même événement pour maintenir la cohérence de l'interface:

```javascript
connect() {
    // ...
    window.addEventListener('aiModelChanged', this.updateSelectedModel.bind(this));
}

updateSelectedModel(event) {
    const modelId = event.detail.modelId;
    if (this.aiModelSelectorTarget.value !== modelId) {
        this.aiModelSelectorTarget.value = modelId;
    }
}
```

## Personnalisation et extension

Pour étendre les fonctionnalités du contrôleur:

### Ajout d'un nouveau type de modèle

1. Modifier la méthode `loadAIModels()` pour gérer le nouveau type
2. Ajouter une nouvelle section dans le HTML pour le groupe de modèles
3. Mettre à jour la route `/api/ai/models` pour inclure les nouveaux modèles

### Ajout d'informations dans la barre de statut

1. Ajouter une nouvelle cible dans `static targets`
2. Créer une méthode pour mettre à jour l'élément
3. Appeler cette méthode lors des changements pertinents 