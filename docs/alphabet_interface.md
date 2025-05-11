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

5. **Intégration avec la Carte**
   - Communication inter-composants via événements personnalisés (`addCalculatedPointToMap`)
   - Conversion automatique des coordonnées DMM en format décimal
   - Partage du contrôleur de carte avec d'autres fonctionnalités (Formula Solver)
   - Gestion unifiée des points calculés sur la carte

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
- **Utilisation intelligente des coordonnées d'origine** pour déterminer les bonnes lettres cardinales (N/S pour latitude, E/W pour longitude)
- Affichage des coordonnées détectées en format DDM
- Indicateur visuel de l'état de la détection (analyse, trouvées, non trouvées)

### 5.1 Affichage sur la Carte

- **Affichage automatique** des coordonnées détectées sur la carte de la géocache associée
- Conversion automatique des coordonnées au format décimal pour l'affichage sur la carte
- Représentation visuelle sous forme de losange bleu avec un point d'interrogation au centre
- Feedback visuel avec un message de confirmation en dessous des coordonnées détectées
- Synchronisation automatique avec la carte de la géocache

### 5.2 Calcul de Distance

- **Vérification automatique** de la conformité aux règles de géocaching (distance < 2 miles)
- Calcul de la distance entre le point d'origine et les coordonnées détectées 
- Affichage colorisé selon le statut de conformité :
  - **Vert** : Distance conforme (< 2 miles) - Répondant aux règles du géocaching
  - **Jaune** : Distance proche de la limite (entre 2 et 2,5 miles) - Avertissement
  - **Rouge** : Distance non conforme (> 2,5 miles) - Indication claire de violation des règles
- Inclusion automatique des informations de distance dans les notes des waypoints créés
- Gestion intelligente de la mise en cache des coordonnées d'origine pour limiter les appels API
- Actualisation automatique lors de la détection de nouvelles coordonnées
- Suppression du message de distance lors de la dissociation d'une géocache
- Métriques affichées en mètres et en miles pour une meilleure lisibilité internationale

### 5.3 Détection Intelligente des Lettres Cardinales

- **Utilisation des coordonnées d'origine** de la géocache associée pour déterminer les bonnes lettres cardinales
- Configuration automatique des formats numériques purs pour utiliser N/S et E/W appropriés
- Lors de l'association d'une géocache, les coordonnées d'origine sont automatiquement mises en cache
- Lorsque des coordonnées numériques pures sont détectées (sans lettres cardinales), le système utilise celles de la géocache d'origine
- Avantages:
  - Plus besoin de saisir manuellement N/S ou E/W pour les coordonnées numériques
  - Fonctionnement correct dans l'hémisphère sud (S) et à l'ouest du méridien de Greenwich (W)
  - Meilleure précision dans la détection des coordonnées numériques pures
- Dégradation gracieuse: si aucune géocache n'est associée, utilise N et E par défaut (comme avant)
- Relance automatique de la détection lorsqu'une géocache est associée et que ses coordonnées sont chargées

### 5.4 Intégration avec Waypoints

- Ajout automatique des informations de distance dans les waypoints créés
- Indication visuelle claire du statut de conformité dans les notes du waypoint
- Messages d'avertissement spécifiques inclus selon le statut de la distance
- Cohérence de l'affichage entre l'interface et les waypoints créés
- Compatible avec les deux méthodes de création de waypoints :
  - Via le formulaire ("Ajouter WP")
  - Via la création automatique ("Créer WP auto")

### 6. Association avec une Géocache

- **Méthodes d'association**
  - Sélection parmi les géocaches ouvertes dans l'application
  - Saisie manuelle d'un code GC
  - Bouton d'actualisation pour rafraîchir la liste des géocaches ouvertes

- **Caractère temporaire de l'association**
  - Association valable uniquement pour la session en cours
  - Suppression automatique à la fermeture de l'onglet ou de l'application
  - Pas de persistance entre les sessions pour éviter les conflits
  - Nécessité de réassocier la géocache lors de la réouverture de l'alphabet

- **Affichage des informations**
  - Nom et code GC de la géocache associée
  - Affichage automatique des coordonnées d'origine de la géocache
  - Gestion des erreurs avec messages contextuels
  - Bouton pour ouvrir la page de détails de la géocache associée

- **Gestion de l'interface**
  - Affichage dynamique des boutons d'action en fonction de l'état d'association
  - Boutons relatifs aux géocaches (envoyer coordonnées, ajouter/créer waypoint, mettre à jour) sont masqués quand aucune géocache n'est associée
  - Réapparition automatique des boutons lors de l'association d'une géocache
  - Suppression des messages d'affichage sur la carte lors de la dissociation d'une géocache

- **Interactions**
  - Bouton pour envoyer les coordonnées détectées vers la géocache associée
  - Bouton pour créer automatiquement un waypoint avec les coordonnées détectées ("Créer WP auto")
  - Bouton pour ajouter un waypoint via le formulaire de la géocache ("Ajouter WP")
  - Bouton pour mettre à jour les coordonnées de la géocache avec les coordonnées détectées
  - Option pour supprimer l'association
  - Persistance temporaire de l'association via sessionStorage (uniquement durant la session)

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
  
- **Ajout de waypoints via formulaire**
  - Ouverture automatique de l'onglet de détails de la géocache si nécessaire
  - Préremplissage du formulaire de waypoint avec les coordonnées détectées
  - Ajout de métadonnées (préfixe "AL", notes avec référence à l'alphabet)
  - Feedback visuel sur l'état du processus

- **Mise à jour des coordonnées de géocache**
  - Mise à jour directe des coordonnées de la géocache associée
  - Utilisation des coordonnées détectées au format standard
  - Actualisation automatique des coordonnées d'origine affichées
  - Feedback visuel sur l'état de la mise à jour (chargement, succès, erreur)

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
    
    // Enregistrer l'association dans le sessionStorage pour la session actuelle
    this.saveGeocacheAssociation();
    
    // Charger automatiquement les coordonnées d'origine
    this.loadAndDisplayOriginalCoordinates();
}

// Sauvegarder l'association dans le sessionStorage (temporaire)
saveGeocacheAssociation() {
    if (this.associatedGeocache) {
        sessionStorage.setItem(`alphabet_${this.alphabetIdValue}_geocache`, 
            JSON.stringify({
                id: this.associatedGeocache.id,
                name: this.associatedGeocache.name,
                code: this.associatedGeocache.code,
                databaseId: this.associatedGeocache.databaseId || null
            })
        );
    }
}

// Charger l'association depuis le sessionStorage
loadGeocacheAssociation() {
    const saved = sessionStorage.getItem(`alphabet_${this.alphabetIdValue}_geocache`);
    if (saved) {
        try {
            const geocache = JSON.parse(saved);
            console.log("Association de géocache chargée depuis sessionStorage:", geocache);
            this.associateGeocache(geocache);
            
            // Mettre à jour le sélecteur si la géocache est ouverte
            if (geocache.id) {
                this.geocacheSelectTarget.value = geocache.id;
            }
        } catch (e) {
            console.error('Erreur lors du chargement de l\'association:', e);
        }
    }
}

// Méthode appelée lorsque le contrôleur est déconnecté
disconnect() {
    console.log('Alphabet Viewer Controller disconnected');
    
    // Supprimer l'association géocache
    if (this.associatedGeocache) {
        sessionStorage.removeItem(`alphabet_${this.alphabetIdValue}_geocache`);
        this.associatedGeocache = null;
    }
    
    // Supprimer les écouteurs d'événements
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    this.element.removeEventListener('coordinatesDetected', this.handleCoordinatesDetected);
}
```

### Ouverture de l'onglet Géocache
```javascript
openGeocacheDetails(event) {
    if (event) {
        event.preventDefault();
    }
    
    // Vérifier que nous avons une géocache associée
    if (!this.associatedGeocache || !this.associatedGeocache.code) {
        console.error("Aucune géocache associée à ouvrir");
        this.showErrorMessage("Veuillez d'abord associer une géocache");
        return;
    }
    
    // Si nous n'avons pas d'ID de base de données, le récupérer
    if (!this.associatedGeocache.databaseId) {
        // Récupérer l'ID et ouvrir l'onglet
    } else {
        // Ouvrir directement l'onglet
        this.openGeocacheTab();
    }
}

openGeocacheTab() {
    // Utiliser le système de messaging pour ouvrir l'onglet
    window.parent.postMessage({ 
        type: 'openGeocacheDetails',
        geocacheId: this.associatedGeocache.databaseId,
        gcCode: this.associatedGeocache.code,
        name: this.associatedGeocache.name || this.associatedGeocache.code
    }, '*');
}
```

### Ajout d'un Waypoint via Formulaire
```javascript
addAsWaypoint(event) {
    // Vérifier que nous avons une géocache associée
    if (!this.associatedGeocache || !this.associatedGeocache.code) {
        this.showAddWaypointError("Pas de géocache");
        return;
    }
    
    // Récupérer les coordonnées détectées
    const coordinates = this.detectedCoordinatesTarget.textContent.trim();
    if (!coordinates) {
        this.showAddWaypointError("Aucune coordonnée");
        return;
    }
    
    // Trouver le panneau de détails de la géocache et le formulaire de waypoint
    let waypointForm = document.querySelector('[data-controller="waypoint-form"]');
    
    if (!waypointForm) {
        // Ouvrir l'onglet de la géocache si nécessaire
        window.parent.postMessage({ 
            type: 'openGeocacheDetails',
            geocacheId: this.associatedGeocache.databaseId,
            gcCode: this.associatedGeocache.code,
            name: this.associatedGeocache.name || this.associatedGeocache.code
        }, '*');
        return;
    }
    
    // Remplir le formulaire avec les coordonnées et métadonnées
    const prefixInput = waypointForm.querySelector('[data-waypoint-form-target="prefixInput"]');
    const nameInput = waypointForm.querySelector('[data-waypoint-form-target="nameInput"]');
    const gcLatInput = waypointForm.querySelector('[data-waypoint-form-target="gcLatInput"]');
    const gcLonInput = waypointForm.querySelector('[data-waypoint-form-target="gcLonInput"]');
    const noteInput = waypointForm.querySelector('[data-waypoint-form-target="noteInput"]');
    
    if (prefixInput) prefixInput.value = "AL"; // Pour Alphabet
    if (nameInput) nameInput.value = "Alphabet: Point décodé";
    if (gcLatInput) gcLatInput.value = gcLat;
    if (gcLonInput) gcLonInput.value = gcLon;
    if (noteInput) noteInput.value = `Point décodé depuis l'alphabet "${document.querySelector('h1')?.textContent || 'inconnu'}".\nCoordonnées: ${originalCoordinates}`;
}
```

### Mise à jour des Coordonnées de la Géocache
```javascript
saveGeocacheCoordinates(event) {
    // Vérifier que nous avons une géocache associée
    if (!this.associatedGeocache || !this.associatedGeocache.code) {
        this.showSaveCoordinatesError("Pas de géocache");
        return;
    }
    
    // Récupérer les coordonnées détectées
    const coordinates = this.detectedCoordinatesTarget.textContent.trim();
    if (!coordinates) {
        this.showSaveCoordinatesError("Aucune coordonnée");
        return;
    }
    
    // Extraire la latitude et la longitude au format standard
    const regex = /([NS][\s]*\d+°[\s]*\d+\.\d+['']*)[\s]*([EW][\s]*\d+°[\s]*\d+\.\d+['']*)/ ;
    const match = coordinates.match(regex);
    
    if (!match || match.length < 3) {
        this.showSaveCoordinatesError("Format invalide");
        return;
    }
    
    const gcLat = match[1].trim();
    const gcLon = match[2].trim();
    
    // Appel à l'API pour sauvegarder les coordonnées
    fetch(`/geocaches/${this.associatedGeocache.databaseId}/coordinates`, {
        method: 'PUT',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        return response.text();
    })
    .then(html => {
        this.showSaveCoordinatesSuccess();
        // Mettre à jour l'affichage des coordonnées d'origine
        this.loadAndDisplayOriginalCoordinates();
    })
    .catch(error => {
        this.showSaveCoordinatesError("Erreur API");
    });
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

### Affichage du Point sur la Carte
```javascript
// Fonction pour ajouter un point calculé sur la carte
addCalculatedPointToMap(latitude, longitude) {
    // Vérifier si nous avons une géocache associée avec un ID
    if (!this.associatedGeocache || !this.associatedGeocache.databaseId) {
        console.error("Impossible d'afficher le point sur la carte: pas de géocache associée");
        return;
    }

    // Créer l'événement pour ajouter le point à la carte
    const pointData = {
        latitude: latitude,
        longitude: longitude,
        geocacheId: this.associatedGeocache.databaseId,
        source: 'alphabet'
    };

    const event = new CustomEvent('addCalculatedPointToMap', {
        detail: pointData,
        bubbles: true
    });

    // Déclencher l'événement
    window.dispatchEvent(event);
    
    // Ajouter un message de confirmation sous les coordonnées
    if (this.associatedGeocache && this.associatedGeocache.databaseId) {
        const confirmationMessage = document.createElement('div');
        confirmationMessage.className = 'text-xs text-blue-400 mt-1';
        confirmationMessage.textContent = 'Point affiché sur la carte';
        
        // Ajouter le message après les boutons
        const buttonsContainer = this.coordinatesContainerTarget.querySelector('.mt-2.flex.gap-2');
        if (buttonsContainer) {
            buttonsContainer.after(confirmationMessage);
        } else {
            this.coordinatesContainerTarget.appendChild(confirmationMessage);
        }
    }
}

// Conversion des coordonnées DMM en décimales
convertGCCoordsToDecimal(gcLat, gcLon) {
    try {
        // Extraire les composants pour la latitude
        const latMatch = gcLat.match(/([NS])\s*(\d+)°\s*(\d+\.\d+)['']/i);
        if (!latMatch) return null;
        
        const latDir = latMatch[1].toUpperCase();
        const latDeg = parseInt(latMatch[2], 10);
        const latMin = parseFloat(latMatch[3]);
        
        // Extraire les composants pour la longitude
        const lonMatch = gcLon.match(/([EW])\s*(\d+)°\s*(\d+\.\d+)['']/i);
        if (!lonMatch) return null;
        
        const lonDir = lonMatch[1].toUpperCase();
        const lonDeg = parseInt(lonMatch[2], 10);
        const lonMin = parseFloat(lonMatch[3]);
        
        // Calculer les coordonnées décimales
        let latitude = latDeg + (latMin / 60);
        if (latDir === 'S') latitude = -latitude;
        
        let longitude = lonDeg + (lonMin / 60);
        if (lonDir === 'W') longitude = -longitude;
        
        return { latitude, longitude };
    } catch (error) {
        console.error("Erreur lors de la conversion des coordonnées:", error);
        return null;
    }
}
```

### Gestion dynamique des boutons
```javascript
// Mettre à jour l'état des boutons selon qu'une géocache est associée ou non
updateSendCoordinatesButton() {
    const hasCoordinates = !this.coordinatesContainerTarget.classList.contains('hidden');
    const hasAssociatedGeocache = this.associatedGeocache && this.associatedGeocache.code;
    
    // Pour chaque bouton relatif aux géocaches
    if (this.hasSendCoordinatesBtnDetectedTarget) {
        if (hasAssociatedGeocache) {
            this.sendCoordinatesBtnDetectedTarget.classList.remove('hidden');
            this.sendCoordinatesBtnDetectedTarget.disabled = !hasCoordinates;
        } else {
            this.sendCoordinatesBtnDetectedTarget.classList.add('hidden');
        }
    }
    
    // Même logique pour les autres boutons
    if (this.hasCreateWaypointAutoBtnDetectedTarget) {
        if (hasAssociatedGeocache) {
            this.createWaypointAutoBtnDetectedTarget.classList.remove('hidden');
            this.createWaypointAutoBtnDetectedTarget.disabled = !hasCoordinates;
        } else {
            this.createWaypointAutoBtnDetectedTarget.classList.add('hidden');
        }
    }
    
    // etc. pour les autres boutons
}

// Supprimer l'association avec la géocache
removeGeocacheAssociation() {
    this.associatedGeocache = null;
    this.associatedGeocacheInfoTarget.classList.add('hidden');
    this.geocacheSelectTarget.value = "";
    
    // Réinitialiser l'affichage des coordonnées d'origine
    this.originalCoordinatesValueTarget.textContent = "";
    
    // Supprimer l'association du sessionStorage
    sessionStorage.removeItem(`alphabet_${this.alphabetIdValue}_geocache`);
    
    // Mettre à jour l'état des boutons pour les masquer
    this.updateSendCoordinatesButton();
    
    // Supprimer le message confirmant l'affichage sur la carte s'il existe
    const mapConfirmationMessage = this.coordinatesContainerTarget.querySelector('.text-blue-400');
    if (mapConfirmationMessage) {
        mapConfirmationMessage.remove();
    }
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
    
    // Afficher l'indicateur d'analyse
    this.coordinatesDetectionStatusTarget.textContent = 'Analyse...'
    this.coordinatesDetectionStatusTarget.classList.remove('hidden')
    this.coordinatesDetectionStatusTarget.classList.add('bg-yellow-600')
    
    // Préparer les données avec include_numeric_only=true pour l'interface alphabet
    const requestData = {
        text: text,
        include_numeric_only: true
    }

    // Ajouter les coordonnées d'origine si elles sont disponibles
    if (this.cachedOriginalCoords && this.cachedOriginalCoords.gc_lat && this.cachedOriginalCoords.gc_lon) {
        requestData.origin_coords = {
            ddm_lat: this.cachedOriginalCoords.gc_lat,
            ddm_lon: this.cachedOriginalCoords.gc_lon
        };
        console.log('Envoi des coordonnées d\'origine:', requestData.origin_coords);
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
            
            // Autres traitements...
        } else {
            // Aucune coordonnée trouvée
            this.resetCoordinatesDisplay()
        }
    })
}
```

#### API de Détection des Coordonnées

L'API `/api/detect_coordinates` accepte désormais un paramètre optionnel `origin_coords` qui permet de spécifier les coordonnées d'origine au format DDM. Ce paramètre est utilisé pour déterminer les bonnes lettres cardinales lors de la détection de coordonnées numériques pures.

**Paramètres de la requête :**
- `text` (obligatoire) : Le texte à analyser pour détecter des coordonnées
- `include_numeric_only` (optionnel) : Si true, active la détection de coordonnées au format numérique pur
- `origin_coords` (optionnel) : Objet contenant les coordonnées d'origine au format DDM
  - `ddm_lat` : Latitude en format DDM (ex: "N 49° 12.345'")
  - `ddm_lon` : Longitude en format DDM (ex: "E 006° 12.345'")

**Exemple de requête :**
```json
{
  "text": "4912123 00612123",
  "include_numeric_only": true,
  "origin_coords": {
    "ddm_lat": "N 49° 10.000'",
    "ddm_lon": "E 006° 10.000'"
  }
}
```

**Réponse :**
```json
{
  "exist": true,
  "ddm_lat": "N 49° 12.123'",
  "ddm_lon": "E 006° 12.123'",
  "ddm": "N 49° 12.123' E 006° 12.123'"
}
```

Si `origin_coords` n'est pas fourni, l'API utilise par défaut "N" pour la latitude et "E" pour la longitude lors de la détection de coordonnées numériques pures.

### Calcul et Affichage de la Distance
```javascript
// Calcule la distance entre les coordonnées détectées et l'origine de la géocache
calculateDistanceFromOrigin(detectedLat, detectedLon) {
    // Vérifier que nous avons les données nécessaires
    if (!this.associatedGeocache || !this.associatedGeocache.code) {
        console.log("Calcul de distance impossible: pas de géocache associée");
        return;
    }

    // Charger d'abord les coordonnées de la géocache si on ne les a pas déjà
    if (!this.cachedOriginalCoords) {
        // Afficher un état de chargement pour la distance
        this.addLoadingDistanceMessage();
        
        fetch(`/api/geocaches/by-code/${this.associatedGeocache.code}`)
            .then(response => response.json())
            .then(data => {
                // Mémoriser les coordonnées originales pour éviter des appels répétés
                this.cachedOriginalCoords = {
                    gc_lat: data.gc_lat,
                    gc_lon: data.gc_lon
                };
                
                // Une fois les coordonnées récupérées, calculer la distance
                this.requestDistanceCalculation(detectedLat, detectedLon);
            });
    } else {
        // Si on a déjà les coordonnées, calculer directement la distance
        this.requestDistanceCalculation(detectedLat, detectedLon);
    }
}

// Affiche la distance calculée avec un format et une couleur appropriés
displayDistance(distanceInfo) {
    // Déterminer la classe de couleur en fonction du statut
    let distanceClass = '';
    let distanceMessage = '';
    
    switch (distanceInfo.status) {
        case 'ok':
            distanceClass = 'text-green-400';
            distanceMessage = `Distance: ${distanceInfo.meters} m (${distanceInfo.miles} miles) - Conforme aux règles du géocaching`;
            break;
        case 'warning':
            distanceClass = 'text-amber-300';
            distanceMessage = `Distance: ${distanceInfo.meters} m (${distanceInfo.miles} miles) - Attention, proche de la limite de 2 miles!`;
            break;
        case 'far':
            distanceClass = 'text-red-500';
            distanceMessage = `Distance: ${distanceInfo.meters} m (${distanceInfo.miles} miles) - Trop éloigné! La géocache doit être à moins de 2 miles du point d'origine.`;
            break;
    }
    
    // Créer l'élément de message de distance et l'ajouter à l'interface
    const distanceElement = document.createElement('div');
    distanceElement.id = 'distance-message';
    distanceElement.className = `text-xs ${distanceClass} mt-2`;
    distanceElement.innerHTML = distanceMessage;
    
    // Ajouter aux coordonnées détectées
    this.coordinatesContainerTarget.appendChild(distanceElement);
    
    // Stocker la distance calculée pour les waypoints
    this.lastCalculatedDistance = distanceInfo;
}
```

### Intégration de la Distance dans les Waypoints
```javascript
/**
 * Méthode pour créer un waypoint en utilisant JSON (comme dans Formula Solver)
 */
createWaypointWithJSON(gcLat, gcLon, originalCoordinates) {
    console.log("=== Appel de createWaypointWithJSON ===");
    console.log("État actuel de la géocache:", this.associatedGeocache);
    
    // Générer un nom pour le waypoint
    const waypointName = "Coordonnées Alphabet";
    
    // Préparer la note avec les informations disponibles
    let note = `Point créé à partir des coordonnées détectées dans l'alphabet.\nSource: ${this.decodedTextTarget.value}\nCoordonnées: ${originalCoordinates}`;
    
    // Ajouter les informations de distance si disponibles
    if (this.lastCalculatedDistance) {
        const distance = this.lastCalculatedDistance;
        note += `\nDistance: ${distance.meters} m (${distance.miles} miles)`;
        
        // Ajouter un avertissement si la distance est problématique
        if (distance.status === 'warning') {
            note += " - Attention, proche de la limite de 2 miles!";
        } else if (distance.status === 'far') {
            note += " - Trop éloigné! La géocache doit être à moins de 2 miles du point d'origine.";
        }
    }
    
    // Utiliser l'ID numérique de la géocache
    const databaseId = this.associatedGeocache.databaseId;
    
    const waypointData = {
        name: waypointName,
        prefix: "AL", // Pour Alphabet
        gc_lat: gcLat,
        gc_lon: gcLon,
        note: note,
        geocache_id: databaseId
    };
    
    // Appeler l'API pour créer le waypoint
    fetch(`/api/geocaches/${databaseId}/waypoints`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(waypointData)
    })
    // Suite du traitement de la réponse...
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

### Architecture du Calcul de Distance

Le système de calcul de distance implémente une vérification complète des règles du géocaching en utilisant plusieurs composants interconnectés :

#### 1. Composants Frontend

- **Détection et Récupération des Données** 
  - Mécanisme de mise en cache des coordonnées d'origine (`cachedOriginalCoords`)
  - Fonction `calculateDistanceFromOrigin` pour initier le calcul
  - Fonctions d'affichage pour les états de chargement, erreur et succès

- **Gestion des Requêtes API**
  - Utilisation de l'API `/api/calculate_coordinates` pour externaliser le calcul
  - Transmission des coordonnées d'origine et détectées pour comparaison
  - Prise en charge des formats DMM standard pour la géolocalisation

- **Présentation Visuelle**
  - Représentation colorisée du statut (vert/jaune/rouge)
  - Gestion du cycle de vie des messages (affichage, suppression)
  - Intégration avec les autres informations des coordonnées

#### 2. Composants Backend

- **API de Calcul**
  - Endpoint REST `/api/calculate_coordinates`
  - Analyse des coordonnées au format DDM
  - Conversion en coordonnées décimales pour les calculs précis

- **Moteur de Calcul**
  - Fonction `calculate_distance_between_coords` pour le calcul de distance
  - Utilisation de `pyproj.Geod` pour des calculs géodésiques précis
  - Détermination dynamique du statut basée sur des seuils prédéfinis

- **Règles Métier**
  - Implémentation des règles de distance du géocaching (< 2 miles)
  - Seuils configurés pour les statuts (OK < 2 miles, warning entre 2 et 2,5 miles, far > 2,5 miles)
  - Double affichage en mètres et miles pour la compatibilité internationale

#### 3. Flux de Données

```
[Détection des coordonnées] → [Récupération des coordonnées d'origine] → [Requête API] 
→ [Calcul côté serveur] → [Classification du statut] → [Affichage dans l'interface] 
→ [Intégration dans les waypoints]
```

Cette architecture modulaire garantit une séparation claire des responsabilités entre le frontend (présentation) et le backend (calculs géodésiques précis), tout en assurant une expérience utilisateur fluide et des calculs conformes aux standards.