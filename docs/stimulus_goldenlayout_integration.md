# Intégration de Stimulus avec GoldenLayout

## Vue d'ensemble

L'intégration de Stimulus avec GoldenLayout nécessite une attention particulière en raison de la nature dynamique du chargement des composants GoldenLayout. Voici les points clés à considérer :

1. Chargement des contrôleurs
2. Cycle de vie des composants
3. Communication entre composants
4. Gestion des événements

## 1. Chargement des Contrôleurs

### Configuration dans index.html

```javascript
// Initialisation de Stimulus
const application = Stimulus.Application.start()

// Chargement dynamique des contrôleurs
fetch('/js/controllers/mon_controller.js')
    .then(response => response.text())
    .then(code => {
        // Création d'un élément script
        const script = document.createElement('script');
        script.textContent = code;
        document.head.appendChild(script);
        
        // Enregistrement du contrôleur
        if (typeof MonController !== 'undefined') {
            application.register('mon-controller', MonController);
        }
    });
```

### Structure du Contrôleur

```javascript
// Définition globale du contrôleur pour accessibilité
window.MonController = class extends Stimulus.Controller {
    static targets = ["container"]
    
    connect() {
        console.log("Contrôleur connecté");
    }
}
```

## 2. Cycle de Vie des Composants

### Enregistrement du Composant GoldenLayout

```javascript
layout.registerComponent('mon-composant', function(container, state) {
    // Chargement initial
    container.getElement().innerHTML = '<div class="loading">Chargement...</div>';
    
    // Chargement du contenu via HTMX
    htmx.ajax('GET', `/mon/endpoint/${state.id}`, {
        target: container.getElement(),
        swap: 'innerHTML'
    }).then(() => {
        // Réinitialisation des contrôleurs Stimulus
        const element = container.getElement();
        application.controllers.forEach(controller => {
            if (element.contains(controller.element)) {
                controller.disconnect();
            }
        });
        application.start();
    });
});
```

## 3. Communication entre Composants

### Événements Personnalisés

```javascript
// Émission d'un événement
window.dispatchEvent(new CustomEvent('monEvenement', {
    detail: { data: 'valeur' }
}));

// Écoute d'un événement
window.addEventListener('monEvenement', (event) => {
    console.log('Données reçues:', event.detail);
});
```

### Dans le Contrôleur Stimulus

```javascript
class MonController extends Stimulus.Controller {
    initialize() {
        // Écoute des événements GoldenLayout
        window.addEventListener('monEvenement', this.handleEvent.bind(this));
    }

    disconnect() {
        // Nettoyage des écouteurs
        window.removeEventListener('monEvenement', this.handleEvent.bind(this));
    }
}
```

## 4. Bonnes Pratiques

1. **Gestion de la Mémoire**
   - Toujours nettoyer les écouteurs d'événements dans `disconnect()`
   - Utiliser `this.element` pour limiter la portée des sélecteurs

2. **Débogage**
   - Ajouter des logs détaillés dans les méthodes clés
   - Utiliser les data attributes pour tracer les états

3. **Performance**
   - Éviter les sélecteurs globaux
   - Utiliser la délégation d'événements quand possible

## 5. Exemple Complet

```javascript
// Dans le contrôleur
window.MonController = class extends Stimulus.Controller {
    static targets = ["container"]

    connect() {
        console.log("Contrôleur connecté", {
            element: this.element,
            id: this.element.dataset.id
        });
        
        // Écoute des événements GoldenLayout
        this.boundHandleEvent = this.handleEvent.bind(this);
        window.addEventListener('monEvenement', this.boundHandleEvent);
    }

    disconnect() {
        // Nettoyage
        window.removeEventListener('monEvenement', this.boundHandleEvent);
    }

    handleEvent(event) {
        console.log('Événement reçu:', event.detail);
        this.containerTarget.innerHTML = event.detail.content;
    }
}

// Dans GoldenLayout
layout.registerComponent('mon-composant', function(container, state) {
    container.getElement().innerHTML = '<div data-controller="mon-controller"></div>';
    application.start();
});
```

## 6. Dépannage

### Problèmes Courants

1. **Contrôleur non défini**
   - Vérifier que le contrôleur est attaché à `window`
   - Vérifier l'ordre de chargement des scripts

2. **Événements non déclenchés**
   - Vérifier la portée des événements
   - Utiliser les logs pour tracer le flux d'événements

3. **Contrôleurs multiples**
   - Utiliser des identifiants uniques
   - Gérer correctement la déconnexion

### Solutions

1. Toujours utiliser `window.MonController` pour définir les contrôleurs
2. Ajouter des logs détaillés dans les méthodes clés
3. Nettoyer les écouteurs d'événements dans `disconnect()`
4. Utiliser les data attributes pour le passage de données
