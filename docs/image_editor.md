# Documentation de l'Éditeur d'Images MysteryAI

## Vue d'ensemble

L'éditeur d'images est un composant intégré à l'application MysteryAI qui permet aux utilisateurs de modifier les images des géocaches. Il est construit avec les technologies suivantes :
- Frontend : Electron + GoldenLayout
- Canvas : Fabric.js
- Styling : Tailwind CSS

## Architecture

### Composants Principaux

1. **Interface Utilisateur**
   - Barre d'outils avec les options d'édition
   - Zone de canvas pour l'édition d'image
   - Barre d'état avec informations et bouton de sauvegarde

2. **Outils d'Édition**
   - Outils de base :
     * Sélection
     * Déplacement
   - Outils de dessin :
     * Pinceau
     * Gomme
   - Formes géométriques :
     * Rectangle
     * Cercle
   - Texte :
     * Ajout de texte personnalisé

3. **Propriétés des Outils**
   - Couleur (sélecteur de couleur)
   - Taille (slider 1-100)
   - Opacité (slider 0-100%)

## Flux de Travail

### Ouverture de l'Éditeur

1. L'utilisateur fait un clic droit sur une image de géocache
2. Le menu contextuel Electron s'affiche
3. L'utilisateur sélectionne "Éditer"
4. Un nouvel onglet d'éditeur s'ouvre dans GoldenLayout

### Chargement de l'Image

1. L'image est chargée via une URL absolue
2. Le canvas est initialisé avec Fabric.js
3. L'image est redimensionnée proportionnellement pour s'adapter au canvas
4. L'image est centrée dans le canvas

### Sauvegarde

1. L'utilisateur clique sur le bouton "Enregistrer"
2. Le canvas est converti en base64
3. Les données sont envoyées au serveur
4. L'image est sauvegardée dans le dossier de la géocache

## Fichiers Clés

- `templates/image_editor.html` : Template principal de l'éditeur
- `static/js/layout_initialize.js` : Initialisation du canvas et des outils
- `static/js/contextual_menu.js` : Gestion du menu contextuel
- `app/routes/main.py` : Routes backend pour le chargement et la sauvegarde

## Communication Inter-Processus

### Événements Electron

1. `edit-image` : Déclenché par le menu contextuel
2. `request-open-image-editor` : Demande d'ouverture de l'éditeur
3. `save-image` : Sauvegarde de l'image modifiée

### Messages Window

- `type: 'request-open-image-editor'` : Communication entre les processus renderer

## Sécurité

- CORS configuré pour les ports 3000 et 8080
- Headers de sécurité pour le chargement des images
- Validation des types de fichiers
- Vérification des permissions utilisateur

## Gestion des Erreurs

1. Vérification de l'existence de l'image
2. Validation du format d'image
3. Gestion des erreurs de chargement
4. Feedback utilisateur en cas d'erreur

## Bonnes Pratiques

1. **Performance**
   - Redimensionnement optimal des images
   - Gestion efficace de la mémoire canvas

2. **UX**
   - Interface intuitive
   - Feedback visuel des actions
   - Raccourcis clavier (à venir)

3. **Maintenance**
   - Code modulaire
   - Logs détaillés
   - Gestion des doublons d'éditeurs

## Évolutions Futures

1. **Fonctionnalités**
   - Historique complet (undo/redo)
   - Filtres et effets
   - Recadrage d'image
   - Rotation et retournement

2. **Améliorations**
   - Raccourcis clavier
   - Préréglages d'outils
   - Export dans différents formats
   - Mode plein écran

3. **Optimisations**
   - Mise en cache des images
   - Chargement progressif
   - Compression intelligente
