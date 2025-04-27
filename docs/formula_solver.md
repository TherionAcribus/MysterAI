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
   - Route `/geocaches/formula-questions` pour l'extraction des questions associées aux variables
   - Route `/geocaches/formula-solve-questions` pour la résolution automatique des questions par IA
   - Route `/geocaches/formula-solve-single-question` pour la résolution d'une question individuelle

3. **Services Dédiés**
   - `FormulaQuestionsService` pour l'extraction des questions liées aux variables et du contexte thématique
   - `FormulaSolverService` pour la résolution des questions avec l'IA
   - Support de deux méthodes d'extraction : Intelligence Artificielle et Expressions Régulières

4. **Contrôleur JavaScript**
   - `formula_solver_controller.js` pour la gestion des interactions utilisateur
   - Méthodes pour extraire les variables, résoudre les formules et afficher les résultats
   - Calcul dynamique des coordonnées à partir des formules mathématiques

5. **GoldenLayout**
   - Composant `FormulaSolver` pour l'intégration dans l'interface principale
   - Composant `WebSearch` pour la recherche web intégrée
   - Fonction `openFormulaSolverTab` pour ouvrir l'outil dans un nouvel onglet

## Fonctionnalités

### 1. Détection Automatique des Formules
- Analyse de la description HTML de la géocache
- Extraction des formules de coordonnées (ex: `N 47° 5E.FTN E 006° 5A.JVF`)
- Analyse des waypoints et leurs notes pour les formules additionnelles
- Choix entre deux méthodes de détection :
  - **Intelligence Artificielle** : utilise le service AI pour analyser le contenu et détecter des formules même dans des formats complexes
  - **Expressions Régulières** : utilise des patterns prédéfinis pour détecter les formats standards de coordonnées
- Affichage du mode d'extraction actuel (IA ou Regex)
- Boutons pour forcer la détection avec IA ou Regex

### 2. Détection de Formules avec Intelligence Artificielle
- Analyse complète de la description et des waypoints de la géocache
- Compréhension du contexte permettant de détecter des formules dans des formats variés
- Capacité à identifier des formules non standards ou dissimulées dans le texte
- Réécriture propre des formules détectées pour corriger les éventuelles erreurs de formatage
- Extraction intelligente des variables (lettres) à résoudre
- Prise en compte du contexte thématique pour mieux comprendre les formules
- Fonctionne particulièrement bien avec des formules complexes comme :
  - `N 48° 41.EDB E 006° 09.FC(A/2)` où les lettres peuvent apparaître après un point décimal ET dans une expression
  - `N 47° [A]C.D[H-3] E 006° [B]E.F[G*2]` avec des formats non conventionnels
- Logs détaillés dans la console pour faciliter le débogage

### 3. Extraction des Variables
- Détection automatique des lettres (A-Z) dans les formules entre parenthèses
- Génération dynamique de champs de saisie pour chaque lettre unique
- Préservation des lettres cardinales (N, S, E, W) utilisées comme directions

### 4. Extraction des Questions Associées aux Variables
- Extraction automatique des questions correspondant à chaque variable
- Analyse du contexte thématique de la géocache pour une meilleure compréhension
- Choix entre deux méthodes d'extraction :
  - **Intelligence Artificielle** : utilise le service AI configuré pour analyser le contenu de la géocache et identifier les questions pertinentes
  - **Expressions Régulières** : utilise des patterns prédéfinis pour extraire les questions selon différents formats courants
- Les questions extraites sont affichées sous chaque variable pour faciliter leur résolution

### 5. Résolution Automatique des Questions
- Bouton "Résoudre avec IA" pour obtenir des réponses automatiques aux questions
- Utilisation du contexte thématique extrait pour une meilleure précision des réponses
- Prise en compte des informations de la géocache (titre, difficulté, etc.)
- Remplissage automatique des réponses dans les champs correspondants

### 6. Traitement Avancé des Mots et Expressions
- Saisie de mots ou expressions pour chaque variable détectée
- Calcul automatique du checksum (somme des valeurs des lettres, A=1, B=2, etc.)
- Calcul du checksum réduit à un chiffre (ex: 123 → 1+2+3 = 6)
- Détermination de la longueur du mot ou de l'expression
- Sélection du type de valeur à utiliser via boutons radio (mot, checksum, checksum réduit, longueur)

### 7. Résolution Interactive de Formules
- Interface pour entrer manuellement des formules
- Mise à jour en temps réel de la formule avec substitution des variables
- Résolution mathématique des expressions (addition, soustraction, multiplication, division)
- Formatage des coordonnées avec préservation des formats standards (00.000)

### 8. Visualisation des Résultats
- Affichage de la formule détectée initiale
- Visualisation de la formule avec les substitutions des variables
- Affichage des coordonnées calculées en format GPS standard
- Formatage automatique des minutes (2 chiffres) et décimales (3 chiffres)

### 9. Consultation des Données de la Géocache
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

3. **Section d'Extraction et Résolution**
   - Boutons radio pour sélectionner la méthode d'extraction :
     - Intelligence Artificielle (utilise le service AI configuré)
     - Expressions Régulières (utilise des patterns prédéfinis)
   - Bouton "Extraire les Questions" pour déclencher l'extraction
   - Bouton "Résoudre avec IA" pour obtenir des réponses automatiques
   - Affichage du contexte thématique extrait pour une meilleure compréhension
   - Affichage d'un statut de réussite ou d'échec après l'extraction ou la résolution

4. **Options de Type de Valeur Global**
   - Sélection rapide du type de valeur à utiliser pour toutes les variables simultanément
   - Boutons radio pour choisir entre valeur directe, checksum, checksum réduit et longueur
   - Application instantanée à toutes les variables

5. **Champs de Variables**
   - Génération automatique de sections pour chaque variable détectée (A-Z)
   - Champ de saisie pour le mot ou l'expression
   - Affichage du checksum, checksum réduit et longueur calculés automatiquement
   - Boutons radio individuels pour sélectionner le type de valeur à utiliser pour cette variable
   - Champ de question éditable pour modifier les questions extraites
   - Interactions individuelles pour chaque question:
     - Bouton "Copier" pour copier le texte de la question dans le presse-papier
     - Bouton "Rechercher" pour ouvrir un onglet de recherche web avec la question (et le contexte thématique)
     - Bouton "Résoudre" pour obtenir la réponse à une question spécifique avec l'IA

6. **Formule avec Substitution**
   - Affichage de la formule avec les valeurs remplaçant les variables
   - Mise à jour en temps réel à chaque modification de variable ou changement de type
   - Substitution par valeurs numériques ou expressions entre guillemets selon le type

7. **Coordonnées Calculées**
   - Résultat final du calcul avec format standard GPS
   - Respect du format avec 2 chiffres pour les minutes et 3 pour les décimales

8. **Données de la Géocache**
   - Description complète
   - Liste des waypoints avec leurs coordonnées et notes

## Gestion des Questions et Réponses

### Édition des Questions
- Chaque variable dispose d'un champ de question éditable
- Possibilité de modifier manuellement les questions extraites
- Utile pour corriger les erreurs d'extraction ou améliorer la formulation

### Résolution d'une Question Individuelle
- Bouton "Résoudre" à côté de chaque question
- Résout uniquement la question sélectionnée avec l'IA
- Utilise le contexte thématique pour une meilleure précision
- Remplissage automatique du champ de réponse correspondant

### Recherche Web Intégrée
- Bouton "Rechercher" pour lancer une recherche sur le web
- Ouvre un nouvel onglet GoldenLayout avec les résultats Google
- Combine automatiquement la question avec des mots-clés du contexte thématique
- Permet de rester dans l'application sans ouvrir un navigateur externe

### Copie et Partage
- Bouton "Copier" pour copier rapidement la question
- Facilite le partage ou la recherche externe
- Notification visuelle confirmant la copie réussie

## Extraction du Contexte Thématique

Le système analyse automatiquement le titre et la description de la géocache pour en extraire le contexte thématique. Cette fonctionnalité est particulièrement utile pour résoudre des questions qui nécessitent une compréhension du thème de la géocache.

### Méthode d'Extraction
- Utilisation de l'intelligence artificielle pour analyser le contenu
- Analyse du titre et de la description de la géocache
- Génération d'un résumé concis du thème principal (max 3 phrases)
- Affichage du contexte dans l'interface utilisateur

### Avantages
- Amélioration significative de la précision des réponses générées
- Résolution correcte des questions ambiguës (ex: "le club vainqueur de la coupe de France" → nécessite de savoir quel sport)
- Compréhension globale du thème de la géocache

### Intégration
Le contexte thématique est :
- Extrait en même temps que les questions
- Affiché dans l'interface utilisateur au-dessus des variables
- Transmis au service de résolution pour générer des réponses plus précises

## Extraction des Questions

### Méthodes d'Extraction
1. **Intelligence Artificielle**
   - Utilise le service `ai_service` pour analyser le contenu de la géocache
   - Extrait également le contexte thématique pour une meilleure compréhension
   - Envoie des instructions spécifiques à l'IA pour identifier les questions
   - Fonctionne avec plusieurs formats de questions et détecte le contexte
   - Nécessite une configuration valide du service AI (clé API, etc.)
   - Permet d'extraire des questions même dans des formats complexes ou non standards

2. **Expressions Régulières**
   - Utilise des patterns optimisés pour détecter les formats courants de questions
   - Formats supportés :
     - `A. Question?` - Lettre suivie d'un point puis de la question
     - `Question A:` - Question suivie de la lettre et d'un symbole
     - `1. (A) Question?` - Numéro suivi de la lettre entre parenthèses puis de la question
   - Ne nécessite pas de service externe
   - Fonctionne même sans connexion internet

### Quand Utiliser Chaque Méthode

| Méthode | Avantages | Inconvénients | Cas d'utilisation idéal |
|---------|-----------|---------------|--------------------------|
| **IA** | • Comprend le contexte<br>• Gère des formats complexes<br>• Détecte les questions implicites<br>• Extrait le contexte thématique | • Nécessite une clé API<br>• Dépend d'un service externe<br>• Plus lent | Descriptions complexes avec formats de questions non standards ou ambigus |
| **Regex** | • Très rapide<br>• Fonctionne sans connexion<br>• Consommation de ressources minimale | • Limité aux formats prédéfinis<br>• Ne comprend pas le contexte<br>• N'extrait pas le contexte thématique | Descriptions bien structurées avec des questions clairement formatées |

## Résolution Automatique des Questions

Le système permet de résoudre automatiquement les questions associées aux variables en utilisant l'intelligence artificielle.

### Processus de Résolution
1. **Préparation des données**
   - Récupération des questions extraites pour chaque variable
   - Récupération du contexte thématique extrait
   - Collecte d'informations supplémentaires sur la géocache (nom, type, difficulté, etc.)

2. **Génération des réponses**
   - Envoi d'une requête au service AI avec les questions et le contexte
   - Traitement de la réponse pour extraire les réponses pour chaque variable
   - Analyse du format JSON retourné par l'IA

3. **Application des réponses**
   - Remplissage automatique des valeurs dans les champs de saisie
   - Déclenchement des calculs de checksum et longueur
   - Mise à jour des coordonnées calculées

### Avantages
- Gain de temps considérable pour l'utilisateur
- Amélioration de la précision grâce au contexte thématique
- Résolution de questions complexes ou nécessitant des recherches

## Format des Formules Supportées

Le système supporte principalement les formules de type:
```
N49°12.(A+B+C+D+E+F+G+H+I+J-317) E005°59.(A+B+C+D+E+F+G+H+I+J-197)
```

Où:
- Les lettres majuscules (A-Z) représentent des variables à remplir
- Les expressions entre parenthèses sont évaluées mathématiquement
- Les lettres N, S, E, W sont préservées car elles indiquent les directions
- Le format respecte la structure standard des coordonnées GPS

## Configuration du Mode d'Extraction des Formules

Le Formula Solver propose deux modes d'extraction de formules configurables:

### Configuration du Paramètre
- Le paramètre `formula_extraction_method` détermine la méthode d'extraction par défaut
- Les valeurs possibles sont:
  - `ia` : utilise l'IA pour analyser et détecter les formules dans la géocache
  - `regex` : utilise des expressions régulières (méthode traditionnelle)

### Modification du Mode d'Extraction
- Dans l'interface utilisateur, le mode d'extraction actuel est affiché
- Deux boutons permettent de basculer entre les modes:
  - **IA** : force l'utilisation de l'IA pour détecter les formules
  - **Regex** : force l'utilisation des expressions régulières

### Avantages du Mode IA
- Meilleure détection des formules complexes ou non standards
- Réécriture propre des formules détectées
- Extraction complète de toutes les variables
- Capacité à comprendre le contexte de la géocache

### Avantages du Mode Regex
- Très rapide et économe en ressources
- Fonctionne même sans connexion internet ou clé API
- Détection fiable des formats standards de coordonnées

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

```python
# Route pour détecter les formules avec IA ou Regex
@geocaches_bp.route('/geocaches/formula-detect', methods=['POST'])
def detect_formula():
    # Récupération des données et détection des formules selon la méthode choisie
    # Utilisation du service AI ou du plugin formula_parser
```

```python
# Route pour extraire les lettres d'une formule
@geocaches_bp.route('/geocaches/formula-extract-letters', methods=['POST'])
def extract_formula_letters():
    # Extraction des lettres variables dans une formule de coordonnées
    # Utilisation du service AI pour analyser et nettoyer la formule
```

```python
# Route pour extraire les questions
@geocaches_bp.route('/geocaches/formula-questions', methods=['POST'])
def extract_formula_questions():
    # Récupération de l'ID de géocache et des lettres
    # Extraction des questions et du contexte thématique
```

```python
# Route pour résoudre les questions
@geocaches_bp.route('/geocaches/formula-solve-questions', methods=['POST'])
def solve_formula_questions():
    # Récupération des questions et du contexte
    # Génération des réponses avec l'IA
```

```python
# Route pour résoudre une question individuelle
@geocaches_bp.route('/geocaches/formula-solve-single-question', methods=['POST'])
def solve_formula_single_question():
    # Récupération d'une question spécifique et du contexte
    # Génération d'une réponse ciblée avec l'IA
```

### GoldenLayout
```javascript
// Enregistrement du composant
mainLayout.registerComponent('FormulaSolver', function(container, state) {
    // Chargement de la page avec les paramètres
})

// Enregistrement du composant de recherche web
mainLayout.registerComponent('WebSearch', function(container, state) {
    // Chargement des résultats de recherche dans une iframe
})
```

## Algorithme de Résolution

### 1. Extraction des Variables
- Identification des lettres majuscules dans les expressions entre parenthèses
- Filtrage pour exclure les lettres de direction (N, S, E, W) 
- Génération dynamique de champs de saisie pour chaque variable

### 2. Extraction des Questions et du Contexte
- Analyse du contenu de la géocache pour extraire les questions pour chaque variable
- Extraction du contexte thématique pour une meilleure compréhension
- Affichage des questions sous chaque variable et du contexte général

### 3. Résolution Automatique (Optionnelle)
- Utilisation de l'IA pour générer des réponses aux questions en tenant compte du contexte
- Remplissage automatique des champs de saisie avec les réponses générées
- Mise à jour des calculs suite à l'ajout des réponses

### 4. Calcul des Propriétés des Mots/Expressions
- Conversion en majuscules et nettoyage pour la standardisation
- Calcul du checksum: somme des valeurs numériques des lettres (A=1, B=2, ...)
- Réduction récursive du checksum jusqu'à obtenir un chiffre (ex: 123 → 1+2+3=6)
- Détermination de la longueur du texte saisi

### 5. Substitution des Variables
- Sélection du type de valeur pour chaque variable (globalement ou individuellement)
- Remplacement des lettres par les valeurs numériques ou textuelles correspondantes
- Mise à jour en temps réel à chaque modification
- Traitement spécial pour préserver les lettres de direction

### 6. Calcul des Expressions
- Évaluation des opérations mathématiques (addition, soustraction, etc.)
- Traitement des expressions entre parenthèses
- Formatage des résultats avec le bon nombre de chiffres

### 7. Formatage des Coordonnées
- Respect du format standard GPS
- Affichage des minutes avec exactement 2 chiffres
- Affichage des décimales avec exactement 3 chiffres

## Conseils d'Utilisation
- **Commencez par l'extraction automatique des formules** : Le système peut détecter les formules dans la description et les waypoints
- **Pour les formules complexes, utilisez l'IA** : Le bouton "IA" permet une détection plus intelligente des formules inhabituelles
- **Pour les formules standards, gardez le mode Regex** : Plus rapide et économe en ressources
- **Si une formule n'est pas correctement détectée** : Essayez de changer de mode d'extraction
- **Utilisez l'extraction par IA pour les questions** : Elle fournit à la fois les questions et le contexte thématique
- **Essayez la résolution automatique** : Le bouton "Résoudre avec IA" peut vous faire gagner beaucoup de temps
- **Vérifiez les résultats** : Parfois, certaines questions peuvent être mal comprises ou les réponses incorrectes
- **Ajustez manuellement si nécessaire** : Vous pouvez toujours modifier les réponses générées ou les formules détectées

## Exemples d'Utilisation

1. **Détection Automatique des Formules**
   - Ouvrir les détails d'une géocache
   - Cliquer sur le bouton "Formula Solver"
   - Les formules détectées s'affichent automatiquement

2. **Détection avec IA pour Formules Complexes**
   - Dans la section "Formules détectées", noter le mode d'extraction actuel
   - Si des formules complexes ne sont pas détectées, cliquer sur le bouton "IA"
   - Attendre que l'IA analyse la géocache et détecte les formules
   - Les nouvelles formules détectées s'affichent, potentiellement avec un formatage amélioré

3. **Extraction et Résolution des Questions**
   - Sélectionner une formule détectée ou entrer une formule manuellement
   - Cliquer sur "Extraire les Questions" pour obtenir les questions et le contexte
   - Cliquer sur "Résoudre avec IA" pour générer des réponses automatiquement
   - Les réponses sont insérées dans les champs correspondants

4. **Modification Manuelle**
   - Pour chaque lettre, saisir ou ajuster le mot ou l'expression
   - Voir le checksum, le checksum réduit et la longueur se calculer automatiquement
   - Sélectionner le type de valeur à utiliser via les boutons radio

5. **Changement Global du Type de Valeur**
   - Cliquer sur l'un des boutons radio généraux en haut pour changer toutes les variables
   - Observer la mise à jour automatique de la formule et des coordonnées

6. **Gestion des Questions Individuelles**
   - Modifier le texte d'une question dans le champ éditable pour la corriger ou la préciser
   - Cliquer sur "Copier" pour copier rapidement une question dans le presse-papier
   - Cliquer sur "Rechercher" pour ouvrir un onglet de recherche Google dans l'application
   - Cliquer sur "Résoudre" sur une question spécifique pour obtenir uniquement sa réponse
   - La réponse est automatiquement insérée dans le champ correspondant

7. **Vérification des Résultats**
   - Les coordonnées sont calculées et formatées automatiquement
   - Le format respecte la norme avec 2 chiffres pour les minutes et 3 pour les décimales
   - Exemple: `N49° 12.086 E005° 59.209` 