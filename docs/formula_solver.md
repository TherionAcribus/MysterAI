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

3. **Services Dédiés**
   - `FormulaQuestionsService` pour l'extraction des questions liées aux variables
   - Support de deux méthodes d'extraction : Intelligence Artificielle et Expressions Régulières

4. **Contrôleur JavaScript**
   - `formula_solver_controller.js` pour la gestion des interactions utilisateur
   - Méthodes pour extraire les variables, résoudre les formules et afficher les résultats
   - Calcul dynamique des coordonnées à partir des formules mathématiques

5. **GoldenLayout**
   - Composant `FormulaSolver` pour l'intégration dans l'interface principale
   - Fonction `openFormulaSolverTab` pour ouvrir l'outil dans un nouvel onglet

## Fonctionnalités

### 1. Détection Automatique des Formules
- Analyse de la description HTML de la géocache
- Extraction des formules de coordonnées (ex: `N 47° 5E.FTN E 006° 5A.JVF`)
- Analyse des waypoints et leurs notes pour les formules additionnelles

### 2. Extraction des Variables
- Détection automatique des lettres (A-Z) dans les formules entre parenthèses
- Génération dynamique de champs de saisie pour chaque lettre unique
- Préservation des lettres cardinales (N, S, E, W) utilisées comme directions

### 3. Extraction des Questions Associées aux Variables
- Extraction automatique des questions correspondant à chaque variable
- Choix entre deux méthodes d'extraction :
  - **Intelligence Artificielle** : utilise le service AI configuré pour analyser le contenu de la géocache et identifier les questions pertinentes
  - **Expressions Régulières** : utilise des patterns prédéfinis pour extraire les questions selon différents formats courants
- Les questions extraites sont affichées sous chaque variable pour faciliter leur résolution

### 4. Traitement Avancé des Mots et Expressions
- Saisie de mots ou expressions pour chaque variable détectée
- Calcul automatique du checksum (somme des valeurs des lettres, A=1, B=2, etc.)
- Calcul du checksum réduit à un chiffre (ex: 123 → 1+2+3 = 6)
- Détermination de la longueur du mot ou de l'expression
- Sélection du type de valeur à utiliser via boutons radio (mot, checksum, checksum réduit, longueur)

### 5. Résolution Interactive de Formules
- Interface pour entrer manuellement des formules
- Mise à jour en temps réel de la formule avec substitution des variables
- Résolution mathématique des expressions (addition, soustraction, multiplication, division)
- Formatage des coordonnées avec préservation des formats standards (00.000)

### 6. Visualisation des Résultats
- Affichage de la formule détectée initiale
- Visualisation de la formule avec les substitutions des variables
- Affichage des coordonnées calculées en format GPS standard
- Formatage automatique des minutes (2 chiffres) et décimales (3 chiffres)

### 7. Consultation des Données de la Géocache
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

3. **Section d'Extraction des Questions**
   - Boutons radio pour sélectionner la méthode d'extraction :
     - Intelligence Artificielle (utilise le service AI configuré)
     - Expressions Régulières (utilise des patterns prédéfinis)
   - Bouton "Extraire les Questions" pour déclencher l'extraction
   - Affichage d'un statut de réussite ou d'échec après l'extraction

4. **Options de Type de Valeur Global**
   - Sélection rapide du type de valeur à utiliser pour toutes les variables simultanément
   - Boutons radio pour choisir entre valeur directe, checksum, checksum réduit et longueur
   - Application instantanée à toutes les variables

5. **Champs de Variables**
   - Génération automatique de sections pour chaque variable détectée (A-Z)
   - Champ de saisie pour le mot ou l'expression
   - Affichage du checksum, checksum réduit et longueur calculés automatiquement
   - Boutons radio individuels pour sélectionner le type de valeur à utiliser pour cette variable

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

## Algorithme de Résolution

### 1. Extraction des Variables
- Identification des lettres majuscules dans les expressions entre parenthèses
- Filtrage pour exclure les lettres de direction (N, S, E, W) 
- Génération dynamique de champs de saisie pour chaque variable

### 2. Calcul des Propriétés des Mots/Expressions
- Conversion en majuscules et nettoyage pour la standardisation
- Calcul du checksum: somme des valeurs numériques des lettres (A=1, B=2, ...)
- Réduction récursive du checksum jusqu'à obtenir un chiffre (ex: 123 → 1+2+3=6)
- Détermination de la longueur du texte saisi

### 3. Substitution des Variables
- Sélection du type de valeur pour chaque variable (globalement ou individuellement)
- Remplacement des lettres par les valeurs numériques ou textuelles correspondantes
- Mise à jour en temps réel à chaque modification
- Traitement spécial pour préserver les lettres de direction

### 4. Calcul des Expressions
- Évaluation des opérations mathématiques (addition, soustraction, etc.)
- Traitement des expressions entre parenthèses
- Formatage des résultats avec le bon nombre de chiffres

### 5. Formatage des Coordonnées
- Respect du format standard GPS
- Affichage des minutes avec exactement 2 chiffres
- Affichage des décimales avec exactement 3 chiffres

## Extraction des Questions

### Méthodes d'Extraction
1. **Intelligence Artificielle**
   - Utilise le service `ai_service` pour analyser le contenu de la géocache
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
| **IA** | • Comprend le contexte<br>• Gère des formats complexes<br>• Détecte les questions implicites | • Nécessite une clé API<br>• Dépend d'un service externe<br>• Plus lent | Descriptions complexes avec formats de questions non standards ou ambigus |
| **Regex** | • Très rapide<br>• Fonctionne sans connexion<br>• Consommation de ressources minimale | • Limité aux formats prédéfinis<br>• Ne comprend pas le contexte | Descriptions bien structurées avec des questions clairement formatées |

### Conseils d'Utilisation
- **Commencez par l'extraction Regex** : C'est plus rapide et fonctionne souvent bien pour les formats standards
- **Utilisez l'IA si** :
  - Les questions ne sont pas trouvées avec l'extraction par regex
  - La description contient des formats de questions complexes ou non standards
  - Les questions sont implicites ou nécessitent une compréhension du contexte
- **Vérifiez toujours les résultats** : Parfois, certaines questions peuvent être incorrectement extraites ou manquées

### Exemples de Formats Détectés

**Formats bien détectés par les deux méthodes :**
```
A. Combien y a-t-il d'arbres sur la place?
B. Quelle est la couleur du banc?
```

**Formats mieux détectés par l'IA :**
```
Trouvez le nombre d'arbres sur la place (A).
Pour résoudre B, comptez les bancs dans le parc.
Indice pour C: regardez derrière l'église.
```

### Traitement des Résultats
- Les questions extraites sont affichées directement sous chaque variable
- Affichage d'un message de statut (succès/échec) après l'extraction
- Message d'erreur détaillé en cas de problème (service AI non disponible, etc.)
- Les questions extraites peuvent être modifiées manuellement si nécessaire

### Intégration Technique
```javascript
// Extraction des questions avec la méthode sélectionnée
extractQuestionsManually() {
    // Récupération de l'ID de la géocache
    const geocacheId = this.geocacheIdTarget.value;
    
    // Vérification des paramètres nécessaires
    if (!geocacheId) {
        alert('ID Géocache Manquant');
        return;
    }
    
    // Récupération des lettres de la formule
    const letters = this.extractUniqueLetters(this.formulaInputTarget.value);
    
    // Détermine la méthode d'extraction choisie (AI ou regex)
    const method = this.extractionMethodAITarget.checked ? 'ai' : 'regex';
    
    // Appel au service d'extraction
    this.extractQuestions(geocacheId, letters, method);
}
```

```python
# Côté serveur - Route d'extraction des questions
@geocaches_bp.route('/geocaches/formula-questions', methods=['POST'])
def extract_formula_questions():
    # Récupérer les données de la requête
    data = request.json
    geocache_id = data.get('geocache_id')
    letters = data.get('letters', [])
    method = data.get('method', 'ai')  # 'ai' ou 'regex'
    
    # Récupérer la géocache
    geocache = Geocache.query.get(geocache_id)
    
    # Extraire les questions selon la méthode choisie
    if method == 'regex':
        questions = formula_questions_service.extract_questions_with_regex(geocache, letters)
    else:
        questions = formula_questions_service.extract_questions_with_ai(geocache, letters)
    
    # Retourner les questions extraites
    return jsonify({
        'success': True,
        'questions': questions
    })
```

## Utilisation du Plugin Formula Parser

Le plugin `formula_parser` est utilisé pour détecter les formules de coordonnées. Il fonctionne ainsi:

1. **Détection des Coordonnées**
   - Recherche de patterns Nord/Sud (N/S) et Est/Ouest (E/W)
   - Support pour différents formats de coordonnées avec formules
   - Extraction des parties Nord et Est dans une structure cohérente

2. **Analyse du Texte**
   - Nettoyage du HTML pour extraire le texte brut
   - Application de différentes expressions régulières
   - Traitement des formules complexes avec opérations arithmétiques

## Exemples d'Utilisation

1. **Détection Automatique**
   - Ouvrir les détails d'une géocache
   - Cliquer sur le bouton "Formula Solver"
   - Les formules détectées s'affichent automatiquement

2. **Saisie des Mots-Clés**
   - Entrer une formule comme `N49°12.(A+B+C+D+E+F+G+H+I+J-317) E005°59.(A+B+C+D+E+F+G+H+I+J-197)`
   - Pour chaque lettre, saisir un mot ou une expression (ex: "GEOCACHING" pour A)
   - Voir le checksum (73), le checksum réduit (1) et la longueur (10) se calculer automatiquement
   - Sélectionner le type de valeur à utiliser via les boutons radio

3. **Changement Global du Type de Valeur**
   - Cliquer sur l'un des boutons radio généraux en haut (ex: "Checksum réduit")
   - Observer la mise à jour automatique de toutes les sélections individuelles
   - Voir la formule et les coordonnées se recalculer immédiatement

4. **Vérification des Résultats**
   - Les coordonnées sont calculées et formatées automatiquement
   - Le format respecte la norme avec 2 chiffres pour les minutes (ex: 12) et 3 pour les décimales (ex: 086)
   - Exemple: `N49° 12.086 E005° 59.209`

5. **Utilisation des Waypoints**
   - Consulter les waypoints affichés en bas de page
   - Cliquer sur "Utiliser" pour un waypoint particulier
   - La formule est automatiquement copiée dans le champ de résolution et les variables sont extraites 