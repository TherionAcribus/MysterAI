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

### 3. Zone de Texte Décodé

- Affichage en temps réel du texte composé
- Mise à jour automatique lors du réordonnement des symboles
- Champ en lecture seule
- Mise à jour automatique à chaque modification

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

## Gestion des Événements

1. **Clavier**
   - Suppression avec Retour arrière
   - Support des raccourcis clavier

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
        symbolElement.classList.add('opacity-50')
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

### Rendu des Symboles
```javascript
updateDisplay() {
    this.enteredSymbolsTarget.innerHTML = this.enteredChars
        .map((char, index) => {
            const symbol = this.availableSymbolTargets.find(s => s.dataset.char === char)
            if (!symbol) return ''

            const symbolContent = symbol.querySelector('span').cloneNode(true)
            symbolContent.classList.remove('group-hover:text-gray-200')

            return `
                <div class="w-24 h-24 flex items-center justify-center bg-gray-800 rounded-lg cursor-move group"
                     draggable="true"
                     data-index="${index}"
                     data-char="${char}">
                    ${symbolContent.outerHTML}
                </div>
            `
        }).join('')

    this.decodedTextTarget.value = this.enteredChars.join('')
}
```

## Bonnes Pratiques

1. **Performance**
   - Chargement asynchrone des polices
   - Utilisation de clonage pour les symboles
   - Optimisation des mises à jour DOM

2. **Accessibilité**
   - Support du clavier
   - Contraste élevé
   - Taille de texte adaptative

3. **Maintenance**
   - Code modulaire
   - Documentation inline
   - Séparation des préoccupations

## Dépendances

- Stimulus.js pour la gestion d'état
- Tailwind CSS pour les styles
- GoldenLayout pour la disposition
- HTMX pour les requêtes dynamiques

## Personnalisation

L'interface peut être personnalisée via :
1. Les classes Tailwind
2. Les variables CSS personnalisées
3. La configuration de l'alphabet
4. Les options du contrôleur Stimulus
