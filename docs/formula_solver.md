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
- Utilisation d'un appel API dédié pour le calcul des coordonnées finales (`/api/calculate_coordinates`)

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
   - **Bouton "Copier"** permettant de copier rapidement les coordonnées dans le presse-papier avec confirmation visuelle
   - **Bouton "Ajouter WP"** pour ajouter les coordonnées calculées comme waypoint à la géocache
   - **Bouton "Créer WP auto"** pour créer directement un waypoint sans passer par le formulaire
   - **Bouton "Vérifier (GeoCheck)"** pour vérifier les coordonnées avec le service GeoCheck (affiché seulement si disponible)
   - **Bouton "Vérifier (Geocaching)"** pour vérifier les coordonnées sur le site Geocaching.com (affiché si GC Code disponible)
   - **Bouton "Vérifier (Certitude)"** pour vérifier les coordonnées avec le service Certitude (affiché seulement si disponible)
   - **Bouton "Mettre à jour coordonnées"** pour mettre à jour les coordonnées officielles de la géocache
   - Affichage de la distance par rapport aux coordonnées d'origine de la géocache (utile pour vérifier les règles de distance maximale de 2 miles)

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
# Route pour calculer les coordonnées finales
@geocaches_bp.route('/api/calculate_coordinates', methods=['POST'])
def calculate_coordinates():
    # Récupération de la formule et des variables
    # Calcul des coordonnées en substituant les variables par leurs valeurs
    # Formatage du résultat final en format GPS standard
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
- Calcul du checksum: somme des valeurs numériques des lettres (A=1, B=2, ...) et des chiffres (qui conservent leur valeur)
- Exemple: "ABC123" donne 1+2+3+1+2+3 = 12
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
- Traitement par le serveur via l'API `/api/calculate_coordinates` pour garantir la cohérence
- Retour des coordonnées finales avec indication du statut (complet ou partiel si certaines variables n'ont pas de valeur)

## Processus de Calcul des Coordonnées

### Étapes du Calcul
1. **Collecte des Variables**
   - Les lettres uniques sont extraites de la formule
   - Pour chaque lettre, sa valeur est récupérée selon le type sélectionné (valeur directe, checksum, etc.)
   - Seules les valeurs numériques sont incluses dans le calcul

2. **Appel à l'API de Calcul**
   - Les données sont envoyées à l'endpoint `/api/calculate_coordinates` sous format JSON
   - La requête inclut la formule originale et un dictionnaire des variables avec leurs valeurs
   - Un timestamp est ajouté pour éviter les problèmes de cache

3. **Traitement Côté Serveur**
   - La formule est analysée pour identifier les parties directionnelles (N, S, E, W)
   - Les expressions entre parenthèses sont évaluées
   - Les substitutions sont appliquées en remplaçant les variables par leurs valeurs
   - Les coordonnées sont calculées et formatées au format GPS standard

4. **Gestion des Réponses**
   - Succès : Les coordonnées complètes sont retournées et affichées
   - Partielles : Si certaines variables n'ont pas de valeur, les coordonnées sont marquées comme partielles
   - Erreur : Les messages d'erreur sont affichés de manière explicite

### Mise à Jour Automatique
- Les coordonnées sont recalculées en temps réel lorsque:
  - Une valeur de lettre est modifiée
  - Le type de valeur d'une lettre est changé
  - Le type de valeur global est changé
- Un délai court est appliqué après les modifications pour éviter des calculs excessifs

### Formatage Visuel des Résultats
- Les coordonnées complètes sont affichées en vert
- Les coordonnées partielles sont affichées en orange
- Les erreurs sont clairement indiquées en rouge

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

## Affichage automatique sur la carte

### Fonctionnement

1. **Conversion automatique des coordonnées**
   - Lorsque le Formula Solver calcule des coordonnées complètes (sans variable non résolue), le serveur les convertit automatiquement en format décimal via la bibliothèque pyproj.
   - Ces coordonnées décimales sont renvoyées au client dans la réponse JSON avec les clés `decimal_latitude` et `decimal_longitude`.

2. **Affichage sur la carte de la géocache**
   - Quand des coordonnées valides sont calculées, un point bleu est automatiquement affiché sur la carte de la fiche de la géocache (sans action utilisateur nécessaire).
   - Le point est centré sur la carte et mis en évidence sous forme de losange.
   - Un message de confirmation "Point affiché sur la carte" apparaît sous les coordonnées calculées.

3. **Intégration avec la carte existante**
   - Le point est ajouté à la carte via un événement personnalisé `addCalculatedPointToMap`.
   - Il est distingué des autres marqueurs (waypoints, géocaches) par sa forme de losange bleu avec bordure blanche et un point d'interrogation.
   - Le point est temporaire et disparaît si la page est actualisée.
   
4. **Distinction entre points individuels et points multiples**
   - **Point individuel** : Losange bleu avec bordure blanche et point d'interrogation au centre
   - **Points multiples** : Losanges bleus avec bordures de couleurs différentes pour chaque point et numéros affichés au centre
   - Cette différenciation permet de distinguer facilement un point calculé unique de plusieurs points calculés lors des analyses avancées.

### Exemple d'utilisation

1. Entrez une formule de coordonnées (ex: `N48°41.(A+B+C) E007°0(D+E).FGH`)
2. Remplissez les valeurs des variables A-H.
3. Les coordonnées se calculent automatiquement et s'affichent.
4. Simultanément, un losange bleu apparaît sur la carte de la géocache à la position calculée.
5. Le message "Point affiché sur la carte" confirme que l'opération a réussi.

### Points multiples

Le système permet également d'afficher plusieurs points calculés simultanément, ce qui est utile pour :
- Tester différentes hypothèses
- Visualiser plusieurs solutions possibles
- Analyser des patterns géographiques

Dans ce cas :
- Chaque point est représenté par un losange bleu
- Chaque point possède une bordure de couleur différente pour faciliter l'identification
- Un numéro est affiché au centre de chaque point
- La carte s'ajuste automatiquement pour montrer tous les points

### Avantages

- **Visualisation instantanée** : Pas besoin de chercher manuellement les coordonnées sur une carte externe.
- **Conversion précise** : Utilisation de pyproj côté serveur pour une conversion précise du format DMM au format décimal.
- **Sans action utilisateur** : Affichage automatique dès que les coordonnées sont complètes et valides.
- **Expérience unifiée** : Reste dans l'application sans ouvrir d'autres outils ou services.
- **Différenciation visuelle** : Distinction claire entre points individuels et multiples.

## Gestion des Coordonnées Calculées

### Copie des Coordonnées
- Bouton "Copier" à côté des coordonnées calculées
- Copie les coordonnées au format standard dans le presse-papier
- Feedback visuel indiquant la réussite de l'opération (animation et changement de texte temporaire)
- Facilite le transfert vers d'autres applications ou appareils GPS

### Ajout comme Waypoint
- Bouton "Ajouter WP" pour créer un waypoint à partir des coordonnées calculées
- Affiche un formulaire permettant de personnaliser le waypoint:
  - Préfixe
  - Nom
  - Note (incluant automatiquement les informations de distance si disponibles)
- Évite le rechargement complet de la page en utilisant la manipulation directe du DOM

### Création Automatique de Waypoints
- Bouton "Créer WP auto" pour créer instantanément un waypoint sans formulaire
- Utilise un appel API direct vers `/api/geocaches/{id}/waypoints`
- Crée un waypoint avec des valeurs par défaut:
  - Préfixe: "S" (pour Solved)
  - Nom: "Coordonnées calculées"
  - Note: Inclut les informations de distance si disponibles
- Affichage des états de chargement, succès et erreur avec feedback visuel
- Gestion des erreurs de parsing JSON lors des réponses non-attendues
- **Mise à jour automatique de l'interface**: La liste des waypoints dans l'onglet des détails de la géocache est automatiquement rafraîchie après la création du waypoint, sans nécessiter de rechargement de page

### Calcul de Distance
- Lorsque les coordonnées d'origine de la géocache sont disponibles, calcul automatique de la distance entre:
  - Les coordonnées d'origine de la géocache (listées)
  - Les coordonnées calculées par le Formula Solver
- Affichage de cette distance en kilomètres et miles pour vérifier la conformité avec les règles (limite de 2 miles)
- Inclusion automatique de ces informations dans les notes des waypoints créés

### Gestion des Erreurs de Parsing JSON
- Vérification du Content-Type des réponses API
- Gestion appropriée des réponses non-JSON (comme les pages HTML d'erreur)
- Conversion manuelle des coordonnées de format GC vers décimales en cas de besoin

## Avantages techniques

### Performance
- Utilisation optimisée des appels API
- Minimisation des rechargements de page
- Maintien de l'état de la carte entre les opérations

### Expérience utilisateur améliorée
- Feedback visuel pour toutes les actions (chargement, succès, erreur)
- Intégration fluide entre le Formula Solver et les autres composants de l'application
- Options multiples pour l'utilisation des coordonnées calculées (copie, ajout comme waypoint standard ou création automatique)

### Robustesse
- Gestion des erreurs de parsing JSON
- Vérification du format des coordonnées
- Conversion de formats entre différents systèmes de coordonnées
- Traitement approprié des réponses HTTP inattendues

## Traitement des Valeurs et Checksum

### Types de Valeurs Disponibles

Le Formula Solver offre quatre options pour traiter les valeurs associées à chaque lettre :

1. **Valeur** 
   - Si vous entrez une **valeur numérique** (ex: "400"), cette valeur sera utilisée directement dans les calculs de coordonnées.
   - Si vous entrez du texte (ex: "Eiffel"), cette valeur textuelle sera ignorée dans les calculs.
   - Cette option est idéale quand la réponse à une question est directement un nombre (date, année, quantité, etc.).

2. **Checksum**
   - Calcule la somme des valeurs des caractères (A=1, B=2, etc. et chiffres conservés tels quels).
   - Exemple: "ABC123" donne 1+2+3+1+2+3 = 12
   - Pour une valeur numérique comme "400", le checksum sera 4+0+0 = 4.
   - Utile quand la formule demande un calcul sur les caractères du mot.

3. **Checksum réduit**
   - Réduit récursivement le checksum à un seul chiffre.
   - Exemple: checksum 123 → 1+2+3 = 6
   - Pour une valeur numérique comme "400", le checksum réduit sera 4.
   - Pratique quand la formule nécessite un seul chiffre.

4. **Longueur**
   - Utilise simplement le nombre de caractères dans la valeur.
   - Exemple: "Eiffel" a une longueur de 6.
   - Une valeur comme "400" a une longueur de 3.
   - Utile quand la formule se base sur la longueur du mot.

### Processus de Calcul

1. **Saisie de la Valeur**
   - Vous entrez un mot, une expression ou un nombre dans le champ correspondant à une lettre.

2. **Calcul Automatique des Propriétés**
   - Le système calcule automatiquement le checksum, le checksum réduit et la longueur.
   - Ces valeurs sont affichées dans les champs à droite à titre informatif.

3. **Sélection du Type de Valeur**
   - Pour chaque lettre ou globalement, vous sélectionnez le type de valeur à utiliser.
   - Cette sélection détermine quelle valeur sera substituée dans la formule.

4. **Substitution dans la Formule**
   - Lorsque vous avez le type "Valeur" sélectionné :
     - Si c'est un nombre, il est directement inséré dans la formule.
     - Si c'est du texte, il n'est pas utilisé dans les calculs (mais reste visible dans l'interface).
   - Pour les autres types (Checksum, Checksum réduit, Longueur), les valeurs numériques calculées sont toujours insérées.

### Exemple de traitement avec "400"
| Type de valeur | Résultat pour "400" | Utilisation dans la formule |
|----------------|---------------------|----------------------------|
| Valeur         | 400                 | La valeur 400 est utilisée directement |
| Checksum       | 4                   | La somme 4+0+0 = 4 est utilisée |
| Checksum réduit| 4                   | Le checksum est déjà réduit (4) |
| Longueur       | 3                   | La longueur de "400" (3 caractères) est utilisée | 

## Vérification des coordonnées calculées

Le Formula Solver propose deux méthodes de vérification des coordonnées calculées, accessibles via des boutons dédiés dans l'interface utilisateur.

### Vérification avec GeoCheck

GeoCheck est un service externe couramment utilisé pour vérifier les coordonnées des géocaches de type Mystery.

#### Fonctionnement

1. **Bouton "Vérifier (GeoCheck)"**
   - Situé à côté du bouton "Mettre à jour coordonnées" dans la section des coordonnées calculées
   - Permet d'ouvrir rapidement le service GeoCheck associé à la géocache actuelle

2. **Ouverture dans un Nouvel Onglet du Navigateur**
   - Au clic sur le bouton, un nouvel onglet du navigateur s'ouvre (et non un onglet GoldenLayout)
   - Cette approche contourne les restrictions de sécurité associées aux iframes
   - Elle permet un fonctionnement correct des CAPTCHAs et autres éléments interactifs

3. **Pré-selection de la Géocache**
   - L'URL ouverte est celle spécifique à la géocache en cours d'analyse
   - Le système utilise automatiquement l'URL du checker stockée dans la base de données

#### Avantages

- **Compatibilité avec les CAPTCHAs** : Les CAPTCHAs de GeoCheck fonctionnent correctement dans un nouvel onglet navigateur
- **Expérience utilisateur améliorée** : Évite les erreurs 500 ou autres problèmes de chargement liés aux restrictions iframes
- **Interface complète** : Accès à toutes les fonctionnalités de GeoCheck sans limitations

### Vérification avec Geocaching.com

Vérificateur officiel de Geocaching.com, intégré à la page de la géocache.

#### Fonctionnement

1. **Bouton "Vérifier (Geocaching)"**
   - Situé à côté du bouton "Vérifier (GeoCheck)" dans la barre d'actions
   - De couleur orange pour se distinguer visuellement

2. **Ouverture du site Geocaching.com**
   - Ouvre directement la page de la géocache sur Geocaching.com dans un nouvel onglet
   - Utilise automatiquement le GC Code associé à la géocache courante
   - Permet d'accéder au checker intégré dans la page de la géocache

3. **Vérification sur le site Officiel**
   - Une fois sur la page de Geocaching.com, vous pouvez utiliser leur "Solution Checker" officiel
   - Ce système est généralement disponible sur les caches de type Mystery/Unknown

#### Avantages

- **Vérification officielle** : Utilise le système de vérification maintenu par Geocaching.com
- **Intégration complète** : Accès à toutes les fonctionnalités du site officiel (logs, gallery, etc.)
- **Compatibilité maximale** : Fonctionne avec toutes les Mystery caches qui utilisent le checker natif

#### Quand l'Utiliser

- Quand la géocache utilise le checker natif de Geocaching.com
- Si vous souhaitez accéder directement à d'autres fonctionnalités du site (comme consulter les logs)
- En cas de problème avec le checker GeoCheck

### Vérification avec Certitude

Certitude est un service tiers populaire qui offre une vérification fiable des solutions pour les géocaches mystery.

#### Fonctionnement

1. **Bouton "Vérifier (Certitude)"**
   - De couleur bleu-vert distinctive dans la barre d'actions
   - Placé entre les boutons GeoCheck et Geocaching.com

2. **Recherche de l'URL du Checker**
   - Le système récupère automatiquement l'URL du checker Certitude associée à la géocache
   - L'API interne identifie le checker par son nom ("Certitude") et l'URL qui contient "certitudes.org"

3. **Ouverture dans un Nouvel Onglet**
   - Comme pour les autres checkers, Certitude s'ouvre dans un nouvel onglet du navigateur
   - Cette approche garantit la compatibilité optimale avec les fonctionnalités du service

#### Avantages

- **Interface Moderne et Intuitive** : Le service Certitude offre une interface claire et facile à utiliser
- **Statistiques de Résolution** : Certitude affiche souvent le nombre de succès et d'échecs pour chaque puzzle
- **Multilingue** : Supporte de nombreuses langues et propose une interface traduite
- **Rapide et Fiable** : Validation instantanée sans nécessité de CAPTCHA dans la plupart des cas

#### Quand l'Utiliser

- Quand la géocache utilise spécifiquement Certitude pour la vérification
- Si vous préférez une interface plus moderne que GeoCheck
- Lorsque vous souhaitez voir les statistiques de résolution du puzzle

### Remarques Importantes

- Les trois types de checkers (GeoCheck, Geocaching.com et Certitude) s'ouvrent dans un nouvel onglet du navigateur (vous devrez les fermer manuellement)
- Cette approche garantit le fonctionnement avec tous les types de checkers, y compris ceux ayant des mesures de sécurité avancées
- Selon le type de géocache, un, deux ou les trois types de checkers peuvent être disponibles
- Chaque checker a une couleur distinctive pour faciliter son identification :
  - **GeoCheck** : couleur indigo (bleu foncé)
  - **Geocaching** : couleur orange
  - **Certitude** : couleur teal (bleu-vert)

### Affichage Conditionnel des Boutons de Vérification

Le Formula Solver optimise l'interface utilisateur en n'affichant que les boutons de vérification pertinents pour chaque géocache :

1. **Vérification Automatique des Checkers Disponibles**
   - L'application détecte automatiquement les checkers associés à la géocache courante
   - Seuls les boutons pour les checkers existants sont affichés
   - Cette détection se fait côté serveur lors du chargement de la page

2. **Conditions d'Affichage des Boutons**
   - **Bouton GeoCheck** : Affiché uniquement si un checker de type "GeoCheck" est associé à la géocache
   - **Bouton Geocaching** : Affiché uniquement si un GC Code valide est disponible pour la géocache
   - **Bouton Certitude** : Affiché uniquement si un checker de type "Certitude" est associé à la géocache

3. **Avantages de cette Approche**
   - **Interface Plus Claire** : Réduction de l'encombrement visuel en n'affichant que les options pertinentes
   - **Prévention des Erreurs** : Évite de proposer des checkers qui ne fonctionneraient pas pour cette géocache
   - **Expérience Personnalisée** : L'interface s'adapte automatiquement aux caractéristiques de chaque géocache

Cette fonctionnalité garantit une expérience utilisateur optimale en ne présentant que les options de vérification qui sont effectivement disponibles et fonctionnelles pour la géocache en cours d'analyse.

## Validation des Coordonnées et Calculs Mathématiques

### Format de Coordonnées en Géocaching

En géocaching, les coordonnées GPS doivent respecter un format précis:
- Exactement 3 chiffres après le point pour les décimales des minutes
- Si une coordonnée a plus de 3 chiffres, c'est généralement le signe d'une erreur dans les valeurs utilisées
- Si une coordonnée a moins de 3 chiffres, elle est complétée avec des zéros (par exemple "94" devient "094")

### Détection des Erreurs dans les Coordonnées

Le Formula Solver détecte et signale automatiquement deux types d'erreurs:

#### 1. Trop de Chiffres Décimaux
- Lorsqu'une coordonnée calculée contient plus de 3 chiffres après le point
- Exemple: `N48° 41.402121 E003° 48.323245`
- La coordonnée est affichée telle quelle (sans correction automatique)
- Un message d'erreur rouge apparaît pour informer l'utilisateur
- Les décimales trop nombreuses indiquent souvent une erreur dans les valeurs utilisées

#### 2. Expressions Mathématiques non Entières
- Les opérations dans les formules de géocaching doivent toujours donner des nombres entiers
- Exemple: une division comme `(4/2)` qui donne 2 est valide, mais `(3/2)` qui donne 1.5 ne l'est pas
- Lorsqu'une expression ne donne pas un entier exact, elle est affichée telle quelle dans la coordonnée
- Par exemple `N48° 41.222 E006° 09.FC(3/2)` avec l'expression problématique entre parenthèses
- Un message d'erreur rouge explique le problème

### Affichage des Erreurs dans l'Interface

Pour les deux types d'erreurs mentionnés ci-dessus:
- Les coordonnées sont affichées sans correction automatique pour montrer l'erreur
- La partie problématique est mise en évidence en rouge
- Un message d'erreur détaillé apparaît sous les coordonnées calculées
- Ce message explique la nature du problème et comment le résoudre

### Pourquoi ces Validations sont Importantes

1. **Respect des Normes du Géocaching**
   - Les coordonnées en géocaching suivent des règles strictes de formatage
   - Un format incorrect peut mener à des emplacements erronés

2. **Détection Précoce des Erreurs**
   - Permet d'identifier rapidement si les valeurs utilisées sont incorrectes
   - Évite de chercher au mauvais endroit à cause de coordonnées mal calculées

3. **Guidage pour la Correction**
   - L'affichage sans modification des erreurs aide à comprendre où se situe le problème
   - Les messages explicatifs guident l'utilisateur vers la solution

### Exemples de Messages d'Erreur

| Type d'Erreur | Exemple Affiché | Message d'Erreur |
|---------------|-----------------|------------------|
| Trop de décimales | `N48° 41.402121` | "Erreur de coordonnées : Les coordonnées affichées ont plus de 3 chiffres après le point. En géocaching, les coordonnées correctes doivent avoir exactement 3 chiffres après le point." |
| Expression non entière | `E006° 09.FC(3/2)` | "Erreur de calcul : Une ou plusieurs expressions mathématiques n'ont pas pu être évaluées correctement. Vérifiez les parties entre parenthèses dans les coordonnées affichées." |

### Comment Corriger ces Erreurs

1. **Pour les Trop de Décimales**
   - Vérifiez les valeurs numériques utilisées dans vos calculs
   - Assurez-vous que les expressions mathématiques sont correctes
   - Essayez des valeurs alternatives si vous n'êtes pas sûr

2. **Pour les Expressions Non Entières**
   - Identifiez les expressions entre parenthèses qui ne donnent pas un nombre entier
   - Vérifiez si vous avez utilisé les bonnes valeurs dans ces expressions
   - Ajustez les expressions pour qu'elles donnent des nombres entiers
   - Par exemple, remplacez (3/2) par (3*2) ou (6/2) selon le contexte