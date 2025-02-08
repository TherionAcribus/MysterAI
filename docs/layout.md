# Documentation du Layout MysteryAI

## Vue d'ensemble

MysteryAI utilise une interface inspirée de Visual Studio Code, avec une disposition flexible et modulaire. L'interface est composée de plusieurs zones principales :

- Barres latérales (gauche et droite)
- Panneaux extensibles
- Zone de contenu principale
- Panneau inférieur
- Barre d'état

## Structure du Layout

```
+------------------+-------------------+------------------+
|                 |                   |                  |
| Barre latérale  |  Zone principale  | Barre latérale  |
|    gauche       |                   |    droite       |
|    (48px)       |                   |    (48px)       |
|                 |                   |                  |
|                 |                   |                  |
+--------+--------+-------------------+--------+--------+
|        |                                    |        |
| Panel  |                                    | Panel  |
| gauche |                                    | droit  |
|(250px) |                                    |(250px) |
|        |                                    |        |
+--------+------------------------------------+--------+
|                 Panel inférieur                      |
|                 (35px - 800px)                       |
+--------------------------------------------------+
|                  Barre d'état                     |
|                    (22px)                         |
+--------------------------------------------------+
```

## Composants du Layout

### 1. Barres Latérales

#### Barre Latérale Gauche
- Largeur fixe : 48px
- Contient les boutons d'action principaux :
  - Geocaches
  - Search
  - Git
  - Settings
- Chaque bouton peut afficher/masquer un panneau correspondant

#### Barre Latérale Droite
- Largeur fixe : 48px
- Contient les boutons d'action secondaires :
  - Chat IA

### 2. Panneaux Extensibles

#### Panneau Gauche
- Largeur par défaut : 250px
- Largeur minimale : 100px
- Largeur maximale : 800px
- Redimensionnable via une poignée à droite
- Contient différentes vues selon le bouton actif :
  - Geocaches : Navigation les "Zones" et les "Geocaches"
  - Search : Recherche globale
  - Git : Contrôle de version
  - Settings : Configuration

#### Panneau Droit
- Largeur par défaut : 250px
- Largeur minimale : 100px
- Largeur maximale : 800px
- Redimensionnable via une poignée à gauche
- Contient :
  - Chat IA : Interface de chat avec l'IA

### 3. Zone de Contenu Principale
- Utilise Golden Layout pour la gestion des onglets
- S'adapte automatiquement à l'ouverture/fermeture des panneaux
- Supporte le redimensionnement dynamique

### 4. Panneau Inférieur
- Hauteur par défaut : 300px
- Hauteur minimale : 35px (barre d'onglets)
- Hauteur maximale : 800px
- Redimensionnable via une poignée en haut
- Contient trois onglets :
  - Map : Carte interactive
  - Notes : Éditeur de notes
  - Informations : Détails sur la cache actuelle

### 5. Barre d'État
- Hauteur fixe : 22px
- Affiche les informations système :
  - Encodage
  - Type de fichier
  - Position du curseur

## Comportements

### Redimensionnement
- Tous les panneaux sont redimensionnables
- Les transitions sont animées (durée : 150ms)
- Le contenu principal s'adapte automatiquement

### Panneaux Latéraux
- Peuvent être ouverts/fermés indépendamment
- Conservent leur taille lors de la réouverture
- Poussent le contenu principal lors de l'ouverture

### Panneau Inférieur
- Peut être réduit à la hauteur des onglets
- S'ouvre automatiquement lors du clic sur un onglet
- Conserve l'onglet actif lors de la réouverture

## Classes CSS Importantes

### Conteneurs
- `.workspace-container` : Conteneur principal
- `.panel-container` : Conteneur des panneaux
- `.bottom-panel-container` : Conteneur du panneau inférieur

### États
- `.visible` : Panneau visible
- `.active` : Bouton ou onglet actif
- `.shifted-left` : Contenu décalé par le panneau gauche
- `.shifted-right` : Contenu décalé par le panneau droit
- `.shifted-bottom` : Contenu décalé par le panneau inférieur

### Éléments Interactifs
- `.resizer` : Poignées de redimensionnement
- `.sidebar-button` : Boutons des barres latérales
- `.bottom-panel-tab` : Onglets du panneau inférieur

## Gestion des Événements

### Redimensionnement
```javascript
// Début du redimensionnement
element.addEventListener('mousedown', (e) => {
    isResizing = true;
    // ...
});

// Pendant le redimensionnement
document.addEventListener('mousemove', (e) => {
    if (isResizing) {
        // Calcul et application de la nouvelle taille
    }
});

// Fin du redimensionnement
document.addEventListener('mouseup', () => {
    isResizing = false;
    // ...
});
```

### Basculement des Panneaux
```javascript
button.addEventListener('click', () => {
    if (isVisible) {
        // Masquer le panneau
        panel.classList.remove('visible');
    } else {
        // Afficher le panneau
        panel.classList.add('visible');
    }
});
```

## Bonnes Pratiques

1. **Performances**
   - Utiliser `transform` pour les animations
   - Éviter les calculs de layout fréquents
   - Regrouper les modifications DOM

2. **Accessibilité**
   - Maintenir un contraste suffisant
   - Fournir des raccourcis clavier
   - Utiliser des attributs ARIA appropriés

3. **Maintenance**
   - Garder les dimensions dans des variables CSS
   - Commenter les sections complexes
   - Utiliser des noms de classes explicites

## Dépendances

- **Golden Layout** : Gestion des onglets et du layout principal
- **jQuery** : Requis par Golden Layout
- **Font Awesome** : Icônes de l'interface
- **Tailwind CSS** : Styles et utilitaires
