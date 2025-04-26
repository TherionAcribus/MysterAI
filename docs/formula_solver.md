# Formula Solver

L'outil Formula Solver est un système intégré à MysteryAI qui permet de détecter et résoudre les coordonnées en format avec formules souvent présentes dans les géocaches mystery.

## Architecture

### Composants Principaux

1. **Interface Utilisateur**
   - Bouton "Formula Solver" dans la page de détails de la géocache
   - Interface dédiée pour l'analyse et la résolution des formules
   - Affichage des résultats et des formules détectées automatiquement

2. **Backend**
   - Route `/geocaches/formula-solver` dans `geocaches.py` 
   - Intégration avec le plugin `formula_parser` pour la détection des formules
   - Analyse de la description et des waypoints de la géocache

3. **Contrôleur JavaScript**
   - `formula_solver_controller.js` pour la gestion des interactions utilisateur
   - Méthodes pour résoudre les formules et afficher les résultats

4. **GoldenLayout**
   - Composant `FormulaSolver` pour l'intégration dans l'interface principale
   - Fonction `openFormulaSolverTab` pour ouvrir l'outil dans un nouvel onglet

## Fonctionnalités

### 1. Détection Automatique des Formules
- Analyse de la description HTML de la géocache
- Extraction des formules de coordonnées (ex: `N 47° 5E.FTN E 006° 5A.JVF`)
- Analyse des waypoints et leurs notes pour les formules additionnelles

### 2. Résolution de Formules
- Interface pour entrer manuellement des formules
- Affichage des résultats de résolution (à développer davantage)
- Utilisation directe des formules détectées via un bouton "Utiliser"

### 3. Consultation des Données de la Géocache
- Affichage de la description complète
- Liste des waypoints additionnels
- Accès facile aux coordonnées existantes

## Interface Utilisateur

### Organisation des Sections
1. **Formules Détectées**
   - Liste automatiquement générée des formules trouvées
   - Source de chaque formule (description ou waypoint spécifique)
   - Boutons pour utiliser directement les formules détectées

2. **Formulaire de Résolution**
   - Champ de saisie pour les coordonnées en format formule
   - Bouton pour lancer la résolution

3. **Résultats**
   - Affichage des coordonnées résolues
   - Messages d'erreur en cas de problème

4. **Données de la Géocache**
   - Description complète
   - Liste des waypoints avec leurs coordonnées et notes

## Intégration Technique

### Frontend
```javascript
// Ouverture du Formula Solver depuis la page de détails
window.openFormulaSolverTab('{{ geocache.id }}', '{{ geocache.gc_code }}')
```

### Backend
```python
# Route pour le Formula Solver
@geocaches_bp.route('/geocaches/formula-solver', methods=['GET', 'POST'])
def formula_solver_panel():
    # Récupération des données et détection des formules
    # Utilisation du plugin formula_parser
```

### GoldenLayout
```javascript
// Enregistrement du composant
mainLayout.registerComponent('FormulaSolver', function(container, state) {
    // Chargement de la page avec les paramètres
})
```

## Plugin Formula Parser

Le plugin `formula_parser` est utilisé pour détecter les formules de coordonnées. Il fonctionne ainsi:

1. **Détection des Coordonnées**
   - Recherche de patterns Nord/Sud (N/S) et Est/Ouest (E/W)
   - Support pour différents formats de coordonnées avec formules
   - Extraction des parties Nord et Est dans une structure cohérente

2. **Analyse du Texte**
   - Nettoyage du HTML pour extraire le texte brut
   - Application de différentes expressions régulières
   - Traitement des formules complexes avec opérations arithmétiques

## Maintenance et Évolution

### Ajout de Nouvelles Fonctionnalités
1. **Résolution Complète des Formules**
   - Implémenter l'algorithme de résolution des opérations dans les formules
   - Convertir les résultats en coordonnées décimales
   - Ajouter la validation des coordonnées calculées

2. **Amélioration de la Détection**
   - Étendre les expressions régulières pour capturer plus de formats
   - Ajouter la détection de formules multiniveaux (formules imbriquées)
   - Supporter les formules en plusieurs parties du texte

3. **Interface Utilisateur**
   - Ajouter des options de configuration pour le solveur
   - Implémenter l'historique des formules résolues
   - Ajouter la possibilité de sauvegarder les résultats comme waypoints

### Debugging
- Les résultats du plugin formula_parser sont loggés dans la console
- Les erreurs de résolution sont affichées dans l'interface utilisateur
- Le template inclut une section dédiée pour les messages d'erreur

## Exemples d'Utilisation

1. **Détection Automatique**
   - Ouvrir les détails d'une géocache
   - Cliquer sur le bouton "Formula Solver"
   - Les formules détectées s'affichent automatiquement

2. **Résolution Manuelle**
   - Entrer une formule manuellement dans le champ dédié
   - Cliquer sur "Résoudre"
   - Voir les résultats de la résolution

3. **Utilisation des Waypoints**
   - Consulter les waypoints affichés en bas de page
   - Cliquer sur "Utiliser" pour un waypoint particulier
   - La formule est automatiquement copiée dans le champ de résolution 