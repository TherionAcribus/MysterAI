# Service de Dictionnaire Centralisé - MysteryAI

Ce document décrit le **DictionaryService**, un service centralisé pour la gestion des dictionnaires et la validation de mots, conçu pour être utilisé par tous les plugins de MysteryAI nécessitant une validation lexicale.

## Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture](#architecture)
- [Installation et utilisation](#installation-et-utilisation)
- [API Reference](#api-reference)
- [Exemples d'utilisation](#exemples-dutilisation)
- [Intégration dans les plugins](#intégration-dans-les-plugins)
- [Performance et cache](#performance-et-cache)
- [Langues supportées](#langues-supportées)
- [Migration depuis les implémentations existantes](#migration-depuis-les-implémentations-existantes)

## Vue d'ensemble

### Problématique

Avant la création de ce service, chaque plugin (Multitap, Anagrammes, etc.) implémentait sa propre logique de validation de mots, entraînant :

- **Duplication de code** : Chaque plugin réinventait les mêmes mécanismes
- **Incohérence** : Qualité de validation variable entre plugins
- **Performance** : Chargement multiple des mêmes dictionnaires
- **Maintenance** : Mise à jour difficile des dictionnaires

### Solution

Le **DictionaryService** centralise toute la logique de validation lexicale en :

- ✅ **Réutilisant l'infrastructure existante** (ScoringService, Bloom filters, wordfreq)
- ✅ **Fournissant une API unifiée** pour tous les plugins
- ✅ **Optimisant les performances** avec un cache intelligent
- ✅ **Supportant multiple langues** avec fallback automatique
- ✅ **Maintenant la cohérence** entre tous les plugins

## Architecture

### Diagramme d'architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Plugins MysteryAI                      │
├─────────────┬─────────────┬─────────────┬─────────────────┤
│ Multitap    │ Anagrammes  │     T9      │    Scrabble     │
└─────────────┴─────────────┴─────────────┴─────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│              DictionaryService (Nouveau)                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • is_valid_word()                                   │   │
│  │ • find_valid_anagrams()                            │   │
│  │ • suggest_best_segmentation()                      │   │
│  │ • get_word_score()                                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│            Infrastructure Existante                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ ScoringService  │  │ Bloom Filters   │  │  wordfreq   │ │
│  │ (Existant)      │  │ (Existant)      │  │ (Existant)  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Couches de fallback

Le service utilise une approche en cascade pour maximiser la fiabilité :

1. **Cache local** : Résultats précédemment calculés
2. **Termes de géocaching** : Dictionnaire spécialisé intégré
3. **ScoringService** : Service principal avec Bloom filters
4. **wordfreq** : Bibliothèque de fréquences de mots
5. **Fallback basique** : Reconnaissance minimale

## Installation et utilisation

### Import et initialisation

```python
# Import du service
from app.services.dictionary_service import get_dictionary_service

# Récupération de l'instance globale (Singleton)
dict_service = get_dictionary_service()
```

### Utilisation basique

```python
# Vérifier si un mot est valide
is_valid = dict_service.is_valid_word("TELEPHONE")  # True
is_valid = dict_service.is_valid_word("XZQWERTY")   # False

# Obtenir le score de qualité d'un mot
score = dict_service.get_word_score("TELEPHONE")    # 0.9
score = dict_service.get_word_score("XZQWERTY")     # 0.0

# Trouver des anagrammes valides
anagrams = dict_service.find_valid_anagrams("TELEPHONE")
# Retourne: [{'word': 'TELEPHONE', 'score': 0.9, ...}, ...]
```

## API Reference

### Méthodes principales

#### `is_valid_word(word, language=None, strict=False)`

Vérifie si un mot est valide dans le dictionnaire.

**Paramètres :**
- `word` (str) : Mot à vérifier
- `language` (str, optionnel) : Langue à utiliser ('fr', 'en', 'de', etc.)
- `strict` (bool) : Si True, exige un score élevé pour considérer le mot valide

**Retourne :**
- `bool` : True si le mot est valide

**Exemple :**
```python
dict_service.is_valid_word("TELEPHONE")                    # True
dict_service.is_valid_word("TELEPHONE", language="en")     # True
dict_service.is_valid_word("XZQWERTY", strict=True)        # False
```

#### `get_word_score(word, language=None)`

Calcule le score de qualité d'un mot (0.0 à 1.0).

**Paramètres :**
- `word` (str) : Mot à évaluer
- `language` (str, optionnel) : Langue à utiliser

**Retourne :**
- `float` : Score entre 0.0 (inexistant) et 1.0 (très courant)

**Exemple :**
```python
dict_service.get_word_score("TELEPHONE")    # 0.9
dict_service.get_word_score("MYSTIQUE")     # 0.7
dict_service.get_word_score("XZQWERTY")     # 0.0
```

#### `find_valid_anagrams(letters, min_length=3, max_length=None, max_results=20, language=None)`

Trouve toutes les anagrammes valides d'un ensemble de lettres.

**Paramètres :**
- `letters` (str) : Lettres à réorganiser
- `min_length` (int) : Longueur minimale des anagrammes
- `max_length` (int, optionnel) : Longueur maximale
- `max_results` (int) : Nombre maximum de résultats
- `language` (str, optionnel) : Langue à utiliser

**Retourne :**
- `List[Dict]` : Liste des anagrammes avec scores et métadonnées

**Exemple :**
```python
anagrams = dict_service.find_valid_anagrams("MARGEIANT")
# Retourne:
# [
#   {'word': 'MAGENTA', 'score': 0.8, 'length': 7, 'language': 'fr'},
#   {'word': 'TANGRAM', 'score': 0.7, 'length': 7, 'language': 'fr'},
#   ...
# ]
```

#### `suggest_best_segmentation(text, possible_segmentations, language=None)`

Suggère la meilleure segmentation parmi plusieurs possibilités.

**Paramètres :**
- `text` (str) : Texte original
- `possible_segmentations` (List[List[str]]) : Segmentations possibles
- `language` (str, optionnel) : Langue à utiliser

**Retourne :**
- `List[str]` : Meilleure segmentation trouvée

**Exemple :**
```python
segmentations = [
    ['8', '33', '555', '33', '7', '44', '666', '66', '33'],  # TELEPHONE
    ['8', '3', '3', '5', '5', '5', '3', '3', '7', '4', '4', '6', '6', '6', '6', '6', '3', '3']  # TDDJJJDDPGGMMMMMDD
]
best = dict_service.suggest_best_segmentation("833555337446666633", segmentations)
# Retourne: ['8', '33', '555', '33', '7', '44', '666', '66', '33']
```

### Méthodes utilitaires

#### `find_valid_words(text, min_length=3, max_words=100, language=None)`

Trouve tous les mots valides dans un texte.

#### `generate_anagrams(letters, min_length=3, max_length=None, max_results=50)`

Génère toutes les anagrammes possibles (sans validation).

#### `get_supported_languages()`

Retourne la liste des langues supportées.

#### `clear_cache()` et `get_cache_stats()`

Gestion du cache interne.

## Exemples d'utilisation

### Plugin Multitap - Validation de segmentations

```python
class MultitapCodePlugin:
    def __init__(self):
        from app.services.dictionary_service import get_dictionary_service
        self.dict_service = get_dictionary_service()
    
    def find_best_segmentation(self, segmentations):
        """Trouve la meilleure segmentation avec le dictionnaire."""
        best_segmentation = segmentations[0]
        best_score = -1
        
        for segmentation in segmentations:
            decoded_text = ''.join([self.multitap_decode[code] for code in segmentation])
            
            # Utiliser le service de dictionnaire centralisé
            if self.dict_service.is_valid_word(decoded_text):
                score = self.dict_service.get_word_score(decoded_text)
                if score > best_score:
                    best_score = score
                    best_segmentation = segmentation
        
        return best_segmentation
```

### Plugin Anagrammes - Résolution complète

```python
class AnagramPlugin:
    def __init__(self):
        from app.services.dictionary_service import get_dictionary_service
        self.dict_service = get_dictionary_service()
    
    def solve_anagram(self, letters, min_length=3):
        """Résout une anagramme en trouvant tous les mots valides."""
        # Utiliser directement le service centralisé
        anagrams = self.dict_service.find_valid_anagrams(
            letters=letters,
            min_length=min_length,
            max_results=20
        )
        
        # Formater les résultats selon le standard MysteryAI
        results = []
        for i, anagram in enumerate(anagrams):
            results.append({
                "id": f"result_{i+1}",
                "text_output": anagram['word'],
                "confidence": anagram['score'],
                "parameters": {
                    "letters_used": anagram['length'],
                    "letters_total": len(letters.replace(' ', ''))
                },
                "metadata": {
                    "language": anagram['language'],
                    "word_frequency": anagram['score']
                }
            })
        
        return results
```

### Plugin T9 - Résolution prédictive

```python
class T9Plugin:
    def __init__(self):
        from app.services.dictionary_service import get_dictionary_service
        self.dict_service = get_dictionary_service()
    
    def predict_words(self, sequence, max_predictions=10):
        """Prédit les mots possibles pour une séquence T9."""
        possible_words = self.generate_t9_possibilities(sequence)
        valid_predictions = []
        
        for word in possible_words:
            if self.dict_service.is_valid_word(word):
                score = self.dict_service.get_word_score(word)
                valid_predictions.append({
                    'word': word,
                    'score': score,
                    'sequence': sequence
                })
        
        # Trier par score décroissant
        valid_predictions.sort(key=lambda x: x['score'], reverse=True)
        return valid_predictions[:max_predictions]
```

## Intégration dans les plugins

### Template d'intégration

Voici le template standard pour intégrer le DictionaryService dans un plugin :

```python
# Template standard pour les plugins
class MyPlugin:
    def __init__(self):
        # Import et initialisation du service de dictionnaire
        try:
            from app.services.dictionary_service import get_dictionary_service
            self.dict_service = get_dictionary_service()
            self.dict_service_available = True
            print("DictionaryService disponible")
        except ImportError:
            self.dict_service_available = False
            print("DictionaryService non disponible, fallback désactivé")
    
    def validate_result(self, text, language=None):
        """Valide un résultat avec le service de dictionnaire."""
        if not self.dict_service_available:
            return 0.5  # Score par défaut si service non disponible
        
        try:
            return self.dict_service.get_word_score(text, language)
        except Exception as e:
            print(f"Erreur lors de la validation: {str(e)}")
            return 0.5  # Score par défaut en cas d'erreur
    
    def find_best_candidates(self, candidates, language=None):
        """Trouve les meilleurs candidats selon le dictionnaire."""
        if not self.dict_service_available:
            return candidates  # Retourner tel quel si service non disponible
        
        scored_candidates = []
        for candidate in candidates:
            score = self.validate_result(candidate, language)
            scored_candidates.append((candidate, score))
        
        # Trier par score décroissant
        scored_candidates.sort(key=lambda x: x[1], reverse=True)
        return [candidate for candidate, score in scored_candidates]
```

### Configuration plugin.json

Aucune configuration spéciale n'est requise dans `plugin.json`. Le service est automatiquement disponible pour tous les plugins.

```json
{
  "name": "my_plugin",
  "version": "1.0.0",
  "description": "Plugin utilisant le DictionaryService",
  "enable_scoring": true,
  "dependencies": []
}
```

## Performance et cache

### Système de cache

Le DictionaryService utilise un cache intelligent à deux niveaux :

1. **Cache de mots** (`_word_cache`) : Met en cache les résultats de validation
2. **Cache d'anagrammes** (`_anagram_cache`) : Met en cache les générations d'anagrammes

### Métriques de performance

```python
# Obtenir les statistiques du cache
stats = dict_service.get_cache_stats()
print(f"Cache de mots: {stats['word_cache_size']} entrées")
print(f"Cache d'anagrammes: {stats['anagram_cache_size']} entrées")

# Nettoyer le cache si nécessaire
dict_service.clear_cache()
```

### Benchmarks typiques

| Opération | Temps (cache vide) | Temps (cache chaud) |
|-----------|-------------------|-------------------|
| `is_valid_word()` | 1-5 ms | 0.1 ms |
| `get_word_score()` | 1-5 ms | 0.1 ms |
| `find_valid_anagrams()` (6 lettres) | 50-200 ms | 5-20 ms |
| `suggest_best_segmentation()` (10 options) | 10-50 ms | 1-5 ms |

## Langues supportées

### Langues principales

Le service supporte nativement les langues suivantes via le ScoringService :

- **fr** : Français (langue par défaut)
- **en** : Anglais
- **de** : Allemand
- **es** : Espagnol
- **it** : Italien
- **nl** : Néerlandais

### Termes de géocaching spécialisés

Le service inclut des dictionnaires spécialisés pour le géocaching :

#### Français
```
NORD, SUD, EST, OUEST, CACHE, TRESOR, COORDONNEES,
LATITUDE, LONGITUDE, DEGRES, MINUTES, SECONDES,
POINT, LIEU, ENDROIT, ICI, LA, CHERCHER, TROUVER,
BONJOUR, SALUT, MERCI, BRAVO, FELICITATIONS, ENIGME,
MESSAGE, TEXTE, PHRASE, MOT, LETTRE, CODE, CHIFFRE,
TELEPHONE, MOBILE, APPEL
```

#### Anglais
```
NORTH, SOUTH, EAST, WEST, CACHE, TREASURE, COORDINATES,
LATITUDE, LONGITUDE, DEGREES, MINUTES, SECONDS,
POINT, PLACE, LOCATION, HERE, THERE, SEARCH, FIND,
HELLO, WORLD, MESSAGE, TEXT, WORD, LETTER, NUMBER,
PHONE, TELEPHONE, MOBILE, CALL, GOODBYE
```

### Ajout de nouvelles langues

Pour ajouter une nouvelle langue :

```python
# Étendre les termes de géocaching
dict_service.geocaching_terms['de'] = {
    'NORD', 'SUD', 'OST', 'WEST', 'CACHE', 'SCHATZ', ...
}

# Ajouter à la liste des langues supportées
dict_service.supported_languages.append('de')
```

## Migration depuis les implémentations existantes

### Migration du plugin Multitap

**Avant (implémentation directe) :**
```python
def _looks_like_french_text(self, text):
    french_words = ['NORD', 'SUD', 'EST', 'OUEST', ...]
    text_upper = text.upper()
    for word in french_words:
        if word in text_upper:
            return True
    return False

def _find_best_segmentation_with_dictionary(self, segmentations):
    # Logique complexe de validation avec ScoringService...
    pass
```

**Après (avec DictionaryService) :**
```python
def _looks_like_french_text(self, text):
    # Déléguer au service centralisé
    return self.dict_service.is_valid_word(text)

def _find_best_segmentation_with_dictionary(self, segmentations):
    # Utiliser la méthode centralisée
    return self.dict_service.suggest_best_segmentation(
        text, segmentations, language='fr'
    )
```

### Checklist de migration

1. **✅ Importer le service** dans `__init__()`
2. **✅ Remplacer les validations locales** par `is_valid_word()`
3. **✅ Utiliser `get_word_score()`** au lieu de calculs maison
4. **✅ Déléguer les segmentations** à `suggest_best_segmentation()`
5. **✅ Supprimer le code dupliqué** de validation
6. **✅ Tester la compatibilité** avec les anciens cas de test

### Rétrocompatibilité

Le DictionaryService est conçu pour être **100% rétrocompatible** :

- **Graceful degradation** : Si le service n'est pas disponible, les plugins fonctionnent toujours
- **API non-intrusive** : Aucune modification requise des interfaces existantes
- **Performance équivalente** : Pas de dégradation de performance
- **Résultats cohérents** : Même qualité de validation qu'avant

## Maintenance et évolution

### Ajout de nouvelles fonctionnalités

Le service est extensible pour de nouvelles fonctionnalités :

```python
# Exemple : Ajout d'une méthode de validation phonétique
def sounds_like(self, word1, word2, language=None):
    """Vérifie si deux mots sonnent de manière similaire."""
    # Implémentation avec algorithme Soundex/Metaphone
    pass

# Exemple : Ajout d'une méthode de suggestion de corrections
def suggest_corrections(self, word, max_suggestions=5, language=None):
    """Suggère des corrections pour un mot mal orthographié."""
    # Implémentation avec distance de Levenshtein
    pass
```

### Contribution

Pour contribuer au DictionaryService :

1. **Ajouter des tests** dans `tests/services/test_dictionary_service.py`
2. **Documenter les nouvelles méthodes** dans ce fichier
3. **Vérifier la rétrocompatibilité** avec tous les plugins existants
4. **Optimiser les performances** si nécessaire

---

**Le DictionaryService centralise et optimise la validation lexicale pour tous les plugins MysteryAI, garantissant cohérence, performance et maintenabilité.** 🎯 