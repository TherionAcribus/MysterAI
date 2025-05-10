# Interface des Alphabets - Documentation

## Vue d'ensemble

L'interface des Alphabets est un composant clé de l'application MysteryAI qui permet aux utilisateurs de visualiser, sélectionner et manipuler différents alphabets personnalisés. Cette interface est conçue pour être intuitive et s'intègre parfaitement dans l'environnement de type IDE de l'application.

## Architecture Technique

### Composants Principaux

1. **Composant GoldenLayout**
   - Intégré dans l'interface principale de l'application
   - S'ouvre dans un nouvel onglet via GoldenLayout
   - Permet la manipulation flexible de la disposition

2. **Contrôleur Stimulus**
   - Fichier : `static/js/controllers/alphabet_viewer_controller.js`
   - Gère toute l'interactivité de l'interface
   - Utilise le framework Stimulus pour une gestion d'état propre

3. **Template HTML**
   - Fichier : `templates/alphabet_viewer.html`
   - Structure responsive avec Tailwind CSS
   - Support des polices personnalisées et des images

4. **Détection de Coordonnées**
   - Intégration avec le module de coordonnées
   - Détection automatique des coordonnées GPS dans le texte décodé
   - Support de formats standards et numériques purs

### Structure des Données

```json
{
  "name": "Nom de l'Alphabet",
  "type": "alphabet",
  "alphabetConfig": {
    "type": "font|images",
    "fontFile": "chemin/vers/police",
    "hasUpperCase": boolean,
    "characters": {
      "letters": "all|specific",
      "numbers": "all|specific",
      "special": { ... }
    }
  }
}
```

## Fonctionnalités

### 1. Affichage des Symboles

- **Organisation**
  - Lettres minuscules
  - Lettres majuscules (si disponibles)
  - Chiffres
  - Caractères spéciaux

- **Présentation**
  - Grille responsive avec espacement uniforme
  - Taille de symbole : 96x96 pixels (w-24 h-24)
  - Fond gris foncé avec effets de survol
  - Police de caractères : 2.5rem
  - Affichage de la valeur sous chaque symbole

### 2. Interaction avec les Symboles

- **Sélection**
  - Clic gauche pour ajouter un symbole
  - Les symboles sont ajoutés séquentiellement
  - Effets visuels de survol et de clic

- **Glisser-Déposer**
  - Glisser-déposer pour réorganiser les symboles
  - Effet visuel d'opacité pendant le glissement
  - Mise à jour automatique du texte décodé
  - Conservation du style et de l'apparence des symboles originaux
  - Curseur "move" pour indiquer la possibilité de déplacement

- **Suppression**
  - Menu contextuel par clic droit
  - Option "Supprimer le symbole"
  - Raccourci clavier : Touche Retour arrière
  - Bouton "Effacer" pour supprimer le dernier symbole

### 3. Symboles pour les Coordonnées

- **Boutons dédiés**
  - Lettres cardinales (N, S, E, W)
  - Symboles spéciaux (°, ., ′, ″)
  - Bouton Espace
  - Bouton Effacer

- **Présentation**
  - Différenciation visuelle par couleur (bleu pour les lettres cardinales, vert pour les symboles)
  - Même comportement que les symboles de l'alphabet (déplaçables, avec menu contextuel)

### 4. Zone de Texte Décodé

- Affichage en temps réel du texte composé
- Mise à jour automatique lors du réordonnement des symboles
- **Saisie directe** permettant d'entrer du texte manuellement
- Synchronisation bidirectionnelle avec la zone des symboles entrés
- Mise à jour automatique à chaque modification

### 5. Détection de Coordonnées GPS

- **Analyse automatique** du texte décodé
- Détection de formats standards (DDM, DMS, etc.)
- Support de formats spéciaux sans symboles (ex: "4912123 00612123")
- Affichage des coordonnées détectées en format DDM
- Indicateur visuel de l'état de la détection (analyse, trouvées, non trouvées)

### 6. Association avec une Géocache

- **Méthodes d'association**
  - Sélection parmi les géocaches ouvertes dans l'application
  - Saisie manuelle d'un code GC
  - Bouton d'actualisation pour rafraîchir la liste des géocaches ouvertes

- **Affichage des informations**
  - Nom et code GC de la géocache associée
  - Affichage automatique des coordonnées d'origine de la géocache
  - Gestion des erreurs avec messages contextuels

- **Interactions**
  - Bouton pour envoyer les coordonnées détectées vers la géocache associée
  - Bouton pour créer automatiquement un waypoint avec les coordonnées détectées
  - Option pour supprimer l'association
  - Persistance de l'association via localStorage

- **Gestion des erreurs**
  - Affichage de messages d'erreur contextuels
  - Mise en évidence visuelle des champs en erreur
  - Auto-suppression des messages après un délai

- **Création automatique de waypoints**
  - Création de waypoints directement depuis les coordonnées détectées
  - Récupération automatique de l'ID de la géocache si nécessaire
  - Gestion des erreurs et des cas particuliers
  - Feedback visuel sur l'état de la création (chargement, succès, erreur)
  - Mise à jour automatique de la liste des waypoints après création

## Gestion des Polices

1. **Chargement**
   ```javascript
   @font-face {
       font-family: "NomAlphabet";
       src: url("/api/alphabets/[id]/font") format("truetype");
       font-display: block;
   }
   ```

2. **Vérification**
   - Surveillance du chargement des polices
   - Affichage des symboles une fois la police chargée
   - Gestion des erreurs de chargement

## Menu Contextuel

### Structure
```javascript
showWebContextMenu(
    x,          // Position X du curseur
    y,          // Position Y du curseur
    id,         // ID du symbole
    name,       // Nom du symbole
    [           // Actions personnalisées
        {
            label: 'Supprimer le symbole',
            click: () => removeSymbol(index)
        }
    ]
)
```

### Styles
- Fond sombre (gray-800)
- Bordures arrondies
- Effets de survol
- Ombre portée
- Animation de transition

## Intégration

### 1. Dans l'Interface Principale
```html
<div data-controller="alphabet-viewer"
     data-alphabet-viewer-alphabet-id-value="{{ alphabet.id }}"
     data-action="keydown@window->alphabet-viewer#keydown">
```

### 2. Avec GoldenLayout
- Ouverture dans un nouvel onglet
- Persistance de l'état
- Redimensionnement flexible

### 3. Avec le Module de Coordonnées
```javascript
// Appel à l'API de détection de coordonnées
fetch('/api/detect_coordinates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        text: text,
        include_numeric_only: true // Pour activer la détection de format numérique pur
    })
})
```

## Gestion des Événements

1. **Clavier**
   - Suppression avec Retour arrière
   - Support des raccourcis clavier
   - Saisie directe dans le champ texte

2. **Souris**
   - Clic gauche pour ajouter
   - Clic droit pour le menu contextuel
   - Glisser-déposer pour réorganiser
   - Effets de survol

3. **Glisser-Déposer**
   - `dragstart` : Début du glissement avec effet d'opacité
   - `dragover` : Indication visuelle de la zone de dépôt
   - `drop` : Réorganisation des symboles
   - Mise à jour automatique du texte décodé

4. **Saisie de Texte**
   - Événement `input` pour détecter les changements
   - Conversion du texte en symboles
   - Debouncing pour limiter les appels API

## Exemple de Code

### Gestion du Glisser-Déposer
```javascript
// Configuration du glisser-déposer
setupDragAndDrop() {
    this.enteredSymbolsTarget.addEventListener('dragstart', this.handleDragStart.bind(this))
    this.enteredSymbolsTarget.addEventListener('dragover', this.handleDragOver.bind(this))
    this.enteredSymbolsTarget.addEventListener('drop', this.handleDrop.bind(this))
}

// Début du glissement
handleDragStart(event) {
    const symbolElement = event.target.closest('[data-index]')
    if (symbolElement) {
        event.dataTransfer.setData('text/plain', symbolElement.dataset.index)
        event.dataTransfer.effectAllowed = 'move'
        
        // Ajouter l'effet d'opacité au conteneur parent
        const container = symbolElement.closest('.flex.flex-col')
        if (container) {
            container.classList.add('opacity-50')
        } else {
            symbolElement.classList.add('opacity-50')
        }
    }
}

// Gestion du dépôt
handleDrop(event) {
    event.preventDefault()
    const sourceIndex = parseInt(event.dataTransfer.getData('text/plain'))
    const targetElement = event.target.closest('[data-index]')
    
    if (targetElement) {
        const targetIndex = parseInt(targetElement.dataset.index)
        if (sourceIndex !== targetIndex) {
            // Réorganiser les caractères
            const char = this.enteredChars[sourceIndex]
            this.enteredChars.splice(sourceIndex, 1)
            this.enteredChars.splice(targetIndex, 0, char)
            this.updateDisplay()
        }
    }
}
```

### Gestion de la Saisie Directe
```javascript
handleTextInput(event) {
    const newText = event.target.value;
    
    // Convertir le texte en tableau de caractères
    this.isUpdatingFromTextInput = true;
    this.enteredChars = Array.from(newText);
    
    // Mettre à jour l'affichage (uniquement les symboles, pas le texte)
    this.updateDisplay();
    
    // Détecter les coordonnées
    this.detectCoordinatesDebounced(newText);
}
```

### Association de Géocache
```javascript
// Associer une géocache manuellement via son code GC
associateGcCode(event) {
    event.preventDefault();
    const gcCode = this.gcCodeInputTarget.value.trim();
    
    if (!gcCode) {
        // Afficher un message d'erreur si le champ est vide
        this.showErrorMessage("Veuillez saisir un code GC");
        return;
    }
    
    // Rechercher parmi les géocaches ouvertes
    const openGeocaches = window.layoutStateManager.getComponentsByType('geocache-details');
    const existingGeocache = openGeocaches.find(gc => 
        gc.metadata.code.toUpperCase() === gcCode.toUpperCase()
    );
    
    if (existingGeocache) {
        // La géocache est déjà ouverte, on l'associe directement
        this.associateGeocache({
            id: existingGeocache.id,
            name: existingGeocache.metadata.name,
            code: existingGeocache.metadata.code
        });
    } else {
        // La géocache n'est pas ouverte, il faut faire une requête API
        fetch(`/api/geocaches/by-code/${gcCode}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Géocache non trouvée: ${gcCode}`);
                }
                return response.json();
            })
            .then(data => {
                this.associateGeocache({
                    id: null, // Pas d'ID car non ouverte
                    name: data.name,
                    code: gcCode
                });
            })
            .catch(error => {
                // Afficher une notification d'erreur visible
                this.showErrorMessage(`Erreur: ${error.message}`);
            });
    }
}

// Associer une géocache (fonction commune)
associateGeocache(geocache) {
    this.associatedGeocache = geocache;
    
    // Mettre à jour l'affichage
    this.associatedGeocacheNameTarget.textContent = geocache.name;
    this.associatedGeocacheCodeTarget.textContent = geocache.code;
    this.associatedGeocacheInfoTarget.classList.remove('hidden');
    
    // Enregistrer l'association dans le localStorage
    this.saveGeocacheAssociation();
    
    // Charger automatiquement les coordonnées d'origine
    this.loadAndDisplayOriginalCoordinates();
    
    // Si nous avons le code GC mais pas d'ID numérique, récupérer l'ID
    if (geocache.code && !geocache.databaseId) {
        fetch(`/api/geocaches/by-code/${geocache.code}`)
            .then(response => response.json())
            .then(data => {
                // Mise à jour de l'objet associatedGeocache avec l'ID
                if (data.id) {
                    this.associatedGeocache.databaseId = parseInt(data.id);
                    // Sauvegarder l'association mise à jour
                    this.saveGeocacheAssociation();
                }
            })
            .catch(error => {
                console.error("Erreur lors de la récupération de l'ID:", error);
            });
    }
}
```

### Affichage des Coordonnées d'Origine
```javascript
// Charger et afficher les coordonnées d'origine
loadAndDisplayOriginalCoordinates() {
    if (!this.associatedGeocache || !this.associatedGeocache.code) {
        return;
    }
    
    // Afficher l'état de chargement
    this.originalCoordinatesValueTarget.textContent = "Chargement...";
    
    fetch(`/api/geocaches/by-code/${this.associatedGeocache.code}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Impossible de récupérer les coordonnées`);
            }
            return response.json();
        })
        .then(data => {
            // Afficher les coordonnées dans l'élément dédié
            const coordsStr = data.gc_lat && data.gc_lon ? 
                `${data.gc_lat} ${data.gc_lon}` : 'Non disponibles';
            this.originalCoordinatesValueTarget.textContent = coordsStr;
        })
        .catch(error => {
            this.originalCoordinatesValueTarget.textContent = "Erreur lors du chargement";
        });
}
```

### Gestion des Erreurs
```javascript
// Méthode pour afficher un message d'erreur directement dans l'interface
showErrorMessage(message) {
    // Créer un élément d'erreur s'il n'existe pas déjà
    let errorElement = document.getElementById('alphabet-error-message');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = 'alphabet-error-message';
        errorElement.className = 'bg-red-600 text-white px-4 py-2 rounded-lg mb-4 flex items-center justify-between';
        
        // Ajouter l'élément juste après la section d'association de géocache
        const associationSection = this.associatedGeocacheInfoTarget.parentNode;
        associationSection.parentNode.insertBefore(errorElement, associationSection.nextSibling);
    }
    
    // Mettre à jour le contenu
    errorElement.innerHTML = `
        <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <span>${message}</span>
        </div>
        <button class="text-white hover:text-gray-200" onclick="this.parentNode.remove()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>
    `;
    
    // Auto-supprimer après un délai
    setTimeout(() => {
        if (errorElement && errorElement.parentNode) {
            errorElement.remove();
        }
    }, 5000);
}
```

### Création des Éléments de Symbole
```javascript
createSymbolElement(char, index) {
    // Vérifier d'abord si c'est un symbole disponible dans la liste
    const symbol = this.availableSymbolTargets.find(s => s.dataset.char === char)
    
    // Contenu du symbole et classe de couleur de fond
    let symbolContent;
    let bgColorClass = 'bg-gray-800'; // Couleur par défaut pour les symboles normaux
    
    if (symbol) {
        // Cas d'un symbole disponible dans l'alphabet
        // ...
    } else {
        // Cas d'un symbole spécial (lettres cardinales, symboles de coordonnées)
        
        // Si c'est une lettre cardinale (N, S, E, W)
        if (['N', 'S', 'E', 'W'].includes(char)) {
            bgColorClass = 'bg-indigo-800'
            symbolContent = `<span class="text-white font-bold text-2xl">${char}</span>`
        } 
        // Si c'est un symbole de coordonnées (°, ., ′, ″)
        else if (['°', '.', '′', '″'].includes(char)) {
            bgColorClass = 'bg-teal-800'
            symbolContent = `<span class="text-white font-bold text-2xl">${char}</span>`
        }
        // ...
    }
    
    return `
        <div class="flex flex-col items-center">
            <div class="w-24 h-24 flex items-center justify-center ${bgColorClass} rounded-lg cursor-move group"
                 draggable="true"
                 data-index="${index}"
                 data-char="${char}">
                ${symbolContent}
            </div>
            <div class="text-center mt-1 px-2 py-1 bg-gray-600 border border-gray-500 rounded-md text-gray-200 font-medium text-sm min-w-10 flex items-center justify-center shadow-sm">
                ${char === ' ' ? 'espace' : char}
            </div>
        </div>
    `
}
```

### Détection des Coordonnées
```javascript
detectCoordinates(text) {
    if (!text || text.trim() === '') {
        this.resetCoordinatesDisplay()
        return
    }
    
    // Préparer les données avec include_numeric_only=true pour l'interface alphabet
    const requestData = {
        text: text,
        include_numeric_only: true
    }
    
    fetch('/api/detect_coordinates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.exist) {
            // Coordonnées trouvées !
            this.detectedCoordinatesTarget.textContent = data.ddm || 'N/A'
            this.detectedLatitudeTarget.textContent = data.ddm_lat || 'N/A'
            this.detectedLongitudeTarget.textContent = data.ddm_lon || 'N/A'
            
            // Afficher le conteneur des coordonnées
            this.coordinatesContainerTarget.classList.remove('hidden')
            this.noCoordinatesMessageTarget.classList.add('hidden')
        } else {
            // Aucune coordonnée trouvée
            this.resetCoordinatesDisplay()
        }
    })
}
```

## Bonnes Pratiques

1. **Performance**
   - Chargement asynchrone des polices
   - Utilisation de clonage pour les symboles
   - Optimisation des mises à jour DOM
   - Debouncing pour limiter les appels API

2. **Accessibilité**
   - Support du clavier
   - Contraste élevé
   - Taille de texte adaptative
   - Étiquettes visibles pour tous les symboles

3. **Maintenance**
   - Code modulaire
   - Documentation inline
   - Séparation des préoccupations
   - Factorisation du code commun

4. **Gestion des erreurs**
   - Messages d'erreur contextuels
   - Feedback visuel immédiat
   - Auto-suppression pour éviter l'encombrement
   - Fallbacks pour les fonctionnalités non disponibles

## Dépendances

- Stimulus.js pour la gestion d'état
- Tailwind CSS pour les styles
- GoldenLayout pour la disposition
- HTMX pour les requêtes dynamiques
- Module de coordonnées pour la détection GPS
- Layout State Manager pour la gestion des composants

## Personnalisation

L'interface peut être personnalisée via :
1. Les classes Tailwind
2. Les variables CSS personnalisées
3. La configuration de l'alphabet
4. Les options du contrôleur Stimulus
5. Les paramètres de détection des coordonnées
6. Les préférences d'association de géocaches