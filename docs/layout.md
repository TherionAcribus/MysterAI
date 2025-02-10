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

#### Structure des Panneaux
- Chaque panneau suit une structure commune :
  ```html
  <div class="side-panel">
    <div class="resizer"></div>
    <div class="side-panel-content">
      <div class="panel-content">
        <div class="panel-header">
          <h2>Titre du Panneau</h2>
        </div>
        <div class="panel-body">
          <!-- Contenu spécifique -->
        </div>
      </div>
    </div>
  </div>
  ```

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
- Comportement :
  - S'ouvre automatiquement lors du premier clic sur un onglet
  - Un clic sur l'onglet actif bascule l'ouverture/fermeture
  - Conserve l'onglet actif lors de la réouverture

### 5. Barre d'État
- Hauteur fixe : 22px
- Affiche les informations système :
  - Encodage
  - Type de fichier
  - Position du curseur

## Classes CSS Importantes

### Conteneurs
- `.workspace-container` : Conteneur principal
- `.panel-container` : Conteneur des panneaux
- `.side-panel` : Panneau latéral
- `.side-panel-content` : Conteneur du contenu d'un panneau
- `.panel-content` : Section de contenu spécifique
- `.panel-header` : En-tête de section
- `.panel-body` : Corps de section
- `.bottom-panel-container` : Conteneur du panneau inférieur

### États
- `.visible` : Panneau latéral visible
- `.expanded` : Panneau inférieur ouvert
- `.active` : Bouton, onglet ou contenu actif
- `.shifted-left` : Contenu décalé par le panneau gauche
- `.shifted-right` : Contenu décalé par le panneau droit

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

### Basculement des Panneaux Latéraux
```javascript
function showSidePanel(panelId, isRight) {
    const panel = isRight ? rightPanel : leftPanel;
    const button = document.querySelector(`.sidebar-button[data-panel="${panelId}"]`);
    
    if ((isRight && activeRightButton === button) || (!isRight && activeLeftButton === button)) {
        // Fermeture du panneau actif
        button.classList.remove('active');
        panel.classList.remove('visible');
    } else {
        // Ouverture du nouveau panneau
        button.classList.add('active');
        panel.classList.add('visible');
        loadPanelContent(panelId, isRight);
    }
}
```

### Basculement du Panneau Inférieur
```javascript
function showPanel(panelId) {
    const selectedTab = document.querySelector(`.bottom-panel-tab[data-panel="${panelId}"]`);
    const selectedPanel = document.getElementById(panelId);
    
    if (selectedTab.classList.contains('active')) {
        // Basculer l'ouverture/fermeture si on clique sur l'onglet actif
        bottomPanelContainer.classList.toggle('expanded');
    } else {
        // Activer le nouvel onglet et ouvrir le panneau
        selectedTab.classList.add('active');
        selectedPanel.classList.add('active');
        bottomPanelContainer.classList.add('expanded');
    }
}
```

## Bonnes Pratiques

1. **Structure HTML**
   - Utiliser une structure cohérente pour tous les panneaux
   - Séparer le contenu en sections logiques (header/body)
   - Maintenir une hiérarchie claire des éléments

2. **Gestion du Contenu**
   - Charger le contenu dynamiquement via des fonctions dédiées
   - Utiliser des classes pour gérer la visibilité
   - Éviter de manipuler directement le HTML quand possible

3. **Performances**
   - Utiliser `transform` pour les animations
   - Éviter les calculs de layout fréquents
   - Regrouper les modifications DOM

4. **Accessibilité**
   - Maintenir un contraste suffisant
   - Fournir des raccourcis clavier
   - Utiliser des attributs ARIA appropriés

5. **Maintenance**
   - Garder les dimensions dans des variables CSS
   - Commenter les sections complexes
   - Utiliser des noms de classes explicites
   - Suivre une structure cohérente pour tous les panneaux

## Dépendances

- **Golden Layout** : Gestion des onglets et du layout principal
- **jQuery** : Requis par Golden Layout
- **Font Awesome** : Icônes de l'interface
- **Tailwind CSS** : Styles et utilitaires
