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

## 6. Gestion des Formulaires

### Selects et Formulaires

1. **Gestion des Selects avec État**
```javascript
// Dans le template
<select data-action="change->mon-controller#updateStatus"
        data-previous-value="{{ current_value }}"
        name="status">
    <option value="value1" {% if current_value == 'value1' %}selected{% endif %}>Option 1</option>
    <option value="value2" {% if current_value == 'value2' %}selected{% endif %}>Option 2</option>
</select>

// Dans le contrôleur
updateStatus(event) {
    const select = event.target;
    const formData = new FormData();
    formData.append('status', select.value);

    fetch('/update-endpoint', {
        method: 'PUT',
        body: formData
    })
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        // Mise à jour de la valeur précédente après succès
        select.setAttribute('data-previous-value', select.value);
    })
    .catch(error => {
        // Retour à la valeur précédente en cas d'erreur
        select.value = select.getAttribute('data-previous-value');
    });
}
```

2. **Bonnes Pratiques pour les Formulaires**
   - Utiliser `FormData` pour l'envoi de données de formulaire
   - Ne pas définir d'en-tête `Content-Type` avec `FormData` (il est automatiquement défini)
   - Stocker l'état précédent pour permettre un retour en arrière en cas d'erreur
   - Mettre à jour l'état uniquement après une réponse réussie du serveur

3. **Gestion des Erreurs**
   - Implémenter un mécanisme de rollback pour revenir à l'état précédent
   - Fournir un feedback visuel à l'utilisateur en cas d'erreur
   - Logger les erreurs pour le débogage

## 7. Dépannage

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

## 8. Stratégies de secours

Dans certains cas, les contrôleurs Stimulus peuvent ne pas se connecter correctement lors du chargement dynamique dans GoldenLayout. Il est recommandé d'implémenter une stratégie de secours pour assurer un fonctionnement fiable de l'application.

### Détection et gestion des contrôleurs non connectés

```javascript
(function() {
    // Permettre au DOM de se charger complètement
    setTimeout(function() {
        // Trouver les éléments concernés dans la page
        const elements = document.querySelectorAll('[data-controller="mon-controller"]');
        if (!elements || elements.length === 0) return;
        
        // Identifier l'élément spécifique (par exemple, le dernier ajouté au DOM)
        const targetElement = elements[elements.length - 1];
        
        // Ajouter un identifiant unique pour le débogage
        const uniqueId = 'el-' + Date.now().toString().slice(-4) + '-' + Math.floor(Math.random() * 1000);
        targetElement.dataset.debugId = uniqueId;
        
        console.log(`Élément [${targetElement.id || uniqueId}] détecté`);
        
        // Chercher l'élément interactif (bouton, etc.)
        const actionButton = targetElement.querySelector('.action-button');
        if (!actionButton) return;
        
        // Ajouter un gestionnaire d'événement alternatif
        actionButton.addEventListener('click', function(event) {
            event.preventDefault();
            
            // Tenter d'utiliser le contrôleur Stimulus si disponible
            if (window.StimulusApp && window.StimulusApp.controllers) {
                const controller = window.StimulusApp.controllers.find(
                    c => c.context.identifier === 'mon-controller' && c.element === targetElement
                );
                
                if (controller) {
                    console.log(`Utilisation du contrôleur Stimulus`);
                    controller.actionMethod(event);
                    return;
                }
            }
            
            // Si pas de contrôleur Stimulus, utiliser une solution alternative
            console.log(`Implémentation alternative activée`);
            
            // Exemple de solution alternative avec appel API direct
            fetch('/api/endpoint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    // Données nécessaires
                })
            })
            .then(response => response.json())
            .then(data => {
                // Traitement des données
            })
            .catch(error => {
                console.error('Erreur:', error);
            });
        });
    }, 100); // Délai court pour laisser le DOM se charger
})();
```

### Bonnes pratiques pour les stratégies de secours

1. **Implémenter la solution de secours comme code auto-exécuté**
   - Utiliser une fonction auto-exécutée pour isoler la portée
   - Ajouter un délai court pour permettre le chargement complet du DOM

2. **Tenter d'abord d'utiliser le contrôleur Stimulus**
   - Vérifier la présence de l'application Stimulus
   - Rechercher le contrôleur spécifique pour l'élément

3. **N'activer la solution de secours qu'en cas d'échec**
   - Éviter les conflits potentiels avec Stimulus
   - Consigner les cas d'utilisation de la solution de secours pour le débogage

4. **Maintenir la synchronisation entre les deux implémentations**
   - S'assurer que la solution de secours se comporte comme le contrôleur Stimulus
   - Centraliser la logique métier autant que possible

5. **Afficher des messages de débogage clairs**
   - Inclure des identifiants uniques pour suivre les instances
   - Consigner les étapes clés pour faciliter le débogage
