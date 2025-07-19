# Guide d'Intégration - DictionaryService pour Plugins

Ce guide explique comment intégrer le **DictionaryService** dans vos plugins MysteryAI pour bénéficier de fonctionnalités de validation lexicale centralisées et optimisées.

## Table des matières

- [Introduction](#introduction)
- [Mise en place rapide](#mise-en-place-rapide)
- [Patterns d'intégration](#patterns-dintégration)
- [Exemples concrets](#exemples-concrets)
- [Gestion des erreurs](#gestion-des-erreurs)
- [Tests et validation](#tests-et-validation)
- [Bonnes pratiques](#bonnes-pratiques)
- [FAQ](#faq)

## Introduction

### Pourquoi utiliser le DictionaryService ?

✅ **Cohérence** : Tous les plugins utilisent la même base de validation  
✅ **Performance** : Cache partagé et optimisations centralisées  
✅ **Maintenabilité** : Une seule source pour les mises à jour de dictionnaires  
✅ **Robustesse** : Fallback automatique en cas d'indisponibilité  
✅ **Simplicité** : API unifiée et intuitive  

### Plugins concernés

Le DictionaryService est particulièrement utile pour :

- **Codes de substitution** (Multitap, T9, téléphones)
- **Jeux de lettres** (Anagrammes, Scrabble, mots-croisés)
- **Cryptographie** (substitutions, transpositions)
- **Analyse textuelle** (détection de langue, qualité)

## Mise en place rapide

### 1. Configuration minimale

```python
class MonPlugin:
    def __init__(self):
        # Import et initialisation du service
        try:
            from app.services.dictionary_service import get_dictionary_service
            self.dict_service = get_dictionary_service()
            self.dict_service_available = True
        except ImportError:
            self.dict_service_available = False
            # Prévoir un fallback si nécessaire
```

### 2. Utilisation basique

```python
def validate_result(self, text):
    """Valide un résultat avec le dictionnaire."""
    if self.dict_service_available:
        return self.dict_service.is_valid_word(text)
    else:
        # Fallback basique
        return len(text) >= 3
```

### 3. Plugin.json

Aucune configuration spéciale requise :

```json
{
  "name": "mon_plugin",
  "version": "1.0.0",
  "description": "Plugin utilisant le DictionaryService",
  "enable_scoring": true
}
```

## Patterns d'intégration

### Pattern 1 : Validation simple

**Cas d'usage :** Vérifier qu'un résultat est un mot valide

```python
class ValidationPlugin:
    def __init__(self):
        self._init_dictionary_service()
    
    def _init_dictionary_service(self):
        """Initialise le service de dictionnaire avec gestion d'erreur."""
        try:
            from app.services.dictionary_service import get_dictionary_service
            self.dict_service = get_dictionary_service()
            self.dict_service_available = True
            print("DictionaryService disponible")
        except ImportError:
            self.dict_service_available = False
            print("DictionaryService non disponible")
    
    def decode(self, input_text, **options):
        """Décode et valide le résultat."""
        # Logique de décodage spécifique au plugin
        decoded = self._decode_logic(input_text)
        
        # Validation avec le dictionnaire
        confidence = self._get_confidence(decoded)
        
        return {
            "text_output": decoded,
            "confidence": confidence,
            "metadata": {"validated": confidence > 0.5}
        }
    
    def _get_confidence(self, text):
        """Calcule la confiance basée sur la validation."""
        if not self.dict_service_available:
            return 0.5  # Confiance par défaut
        
        try:
            return self.dict_service.get_word_score(text)
        except Exception:
            return 0.5
```

### Pattern 2 : Choix entre multiples possibilités

**Cas d'usage :** Sélectionner la meilleure option parmi plusieurs résultats

```python
class MultiChoicePlugin:
    def __init__(self):
        self._init_dictionary_service()
    
    def decode(self, input_text, **options):
        """Décode en choisissant la meilleure option."""
        # Générer plusieurs possibilités
        candidates = self._generate_candidates(input_text)
        
        # Trouver la meilleure
        best_candidate = self._find_best_candidate(candidates)
        
        return {
            "text_output": best_candidate['text'],
            "confidence": best_candidate['score'],
            "alternatives": candidates[:5]  # Top 5
        }
    
    def _find_best_candidate(self, candidates):
        """Trouve le meilleur candidat selon le dictionnaire."""
        if not self.dict_service_available:
            return candidates[0] if candidates else {"text": "", "score": 0}
        
        scored_candidates = []
        for candidate in candidates:
            try:
                score = self.dict_service.get_word_score(candidate)
                scored_candidates.append({"text": candidate, "score": score})
            except Exception:
                scored_candidates.append({"text": candidate, "score": 0.5})
        
        # Trier par score décroissant
        scored_candidates.sort(key=lambda x: x['score'], reverse=True)
        return scored_candidates[0] if scored_candidates else {"text": "", "score": 0}
```

### Pattern 3 : Génération d'anagrammes

**Cas d'usage :** Plugin spécialisé dans les anagrammes

```python
class AnagramPlugin:
    def __init__(self):
        self._init_dictionary_service()
    
    def decode(self, input_text, **options):
        """Trouve les anagrammes d'un ensemble de lettres."""
        min_length = options.get('min_length', 3)
        max_results = options.get('max_results', 10)
        
        if self.dict_service_available:
            # Utiliser le service centralisé
            anagrams = self.dict_service.find_valid_anagrams(
                letters=input_text,
                min_length=min_length,
                max_results=max_results
            )
            
            results = []
            for i, anagram in enumerate(anagrams):
                results.append({
                    "id": f"anagram_{i+1}",
                    "text_output": anagram['word'],
                    "confidence": anagram['score'],
                    "metadata": {
                        "length": anagram['length'],
                        "language": anagram['language']
                    }
                })
            
            return {"results": results}
        else:
            # Fallback simple
            return {"results": [{"text_output": input_text, "confidence": 0.5}]}
```

### Pattern 4 : Segmentation optimisée

**Cas d'usage :** Codes ambigus nécessitant une segmentation (comme Multitap)

```python
class SegmentationPlugin:
    def __init__(self):
        self._init_dictionary_service()
    
    def decode(self, input_text, **options):
        """Décode en trouvant la meilleure segmentation."""
        # Générer toutes les segmentations possibles
        segmentations = self._generate_segmentations(input_text)
        
        # Trouver la meilleure avec le dictionnaire
        best_segmentation = self._find_best_segmentation(segmentations)
        
        # Décoder la meilleure segmentation
        decoded = self._decode_segmentation(best_segmentation)
        confidence = self._get_segmentation_confidence(best_segmentation)
        
        return {
            "text_output": decoded,
            "confidence": confidence,
            "metadata": {
                "segmentation": best_segmentation,
                "alternatives": len(segmentations)
            }
        }
    
    def _find_best_segmentation(self, segmentations):
        """Trouve la meilleure segmentation."""
        if not self.dict_service_available or not segmentations:
            return segmentations[0] if segmentations else []
        
        try:
            # Utiliser le service centralisé
            return self.dict_service.suggest_best_segmentation(
                text="",  # Pas nécessaire pour cette méthode
                possible_segmentations=segmentations
            )
        except Exception:
            # Fallback : retourner la première
            return segmentations[0] if segmentations else []
```

## Exemples concrets

### Exemple 1 : Plugin T9 (prédiction de texte)

```python
class T9Plugin:
    """Plugin pour décoder les séquences T9 (prédiction de texte des anciens téléphones)."""
    
    def __init__(self):
        self._init_dictionary_service()
        
        # Table T9 : 2=ABC, 3=DEF, 4=GHI, 5=JKL, 6=MNO, 7=PQRS, 8=TUV, 9=WXYZ
        self.t9_mapping = {
            '2': 'ABC', '3': 'DEF', '4': 'GHI', '5': 'JKL',
            '6': 'MNO', '7': 'PQRS', '8': 'TUV', '9': 'WXYZ'
        }
    
    def decode(self, input_text, **options):
        """Décode une séquence T9."""
        max_words = options.get('max_words', 10)
        
        # Générer toutes les combinaisons possibles
        combinations = self._generate_combinations(input_text)
        
        # Filtrer avec le dictionnaire
        valid_words = self._filter_valid_words(combinations, max_words)
        
        return {"results": valid_words}
    
    def _generate_combinations(self, sequence):
        """Génère toutes les combinaisons de lettres possibles."""
        if not sequence:
            return [""]
        
        combinations = [""]
        for digit in sequence:
            if digit in self.t9_mapping:
                letters = self.t9_mapping[digit]
                new_combinations = []
                for combo in combinations:
                    for letter in letters:
                        new_combinations.append(combo + letter)
                combinations = new_combinations
        
        return combinations
    
    def _filter_valid_words(self, combinations, max_results):
        """Filtre les combinaisons valides avec le dictionnaire."""
        valid_words = []
        
        for word in combinations:
            if len(word) < 2:
                continue
            
            # Utiliser le service de dictionnaire
            if self.dict_service_available:
                try:
                    if self.dict_service.is_valid_word(word):
                        score = self.dict_service.get_word_score(word)
                        valid_words.append({
                            "text_output": word,
                            "confidence": score,
                            "metadata": {"t9_sequence": True}
                        })
                except Exception:
                    # En cas d'erreur, ajouter avec score par défaut
                    valid_words.append({
                        "text_output": word,
                        "confidence": 0.5
                    })
            else:
                # Fallback : accepter tous les mots de plus de 2 lettres
                valid_words.append({
                    "text_output": word,
                    "confidence": 0.5
                })
        
        # Trier par confiance décroissante
        valid_words.sort(key=lambda x: x['confidence'], reverse=True)
        return valid_words[:max_results]
```

### Exemple 2 : Plugin Scrabble (recherche de mots)

```python
class ScrabblePlugin:
    """Plugin pour trouver des mots Scrabble à partir de lettres disponibles."""
    
    def __init__(self):
        self._init_dictionary_service()
        
        # Valeurs des lettres au Scrabble
        self.letter_values = {
            'A': 1, 'E': 1, 'I': 1, 'L': 1, 'N': 1, 'O': 1, 'R': 1, 'S': 1, 'T': 1, 'U': 1,
            'D': 2, 'G': 2, 'M': 2,
            'B': 3, 'C': 3, 'P': 3,
            'F': 4, 'H': 4, 'V': 4,
            'J': 8, 'Q': 8,
            'K': 10, 'W': 10, 'X': 10, 'Y': 10, 'Z': 10
        }
    
    def decode(self, input_text, **options):
        """Trouve les meilleurs mots Scrabble."""
        min_length = options.get('min_length', 3)
        max_results = options.get('max_results', 15)
        
        if self.dict_service_available:
            # Utiliser le service d'anagrammes
            try:
                anagrams = self.dict_service.find_valid_anagrams(
                    letters=input_text,
                    min_length=min_length,
                    max_results=max_results * 2  # Générer plus pour calculer les scores
                )
                
                # Calculer les scores Scrabble
                scored_words = []
                for anagram in anagrams:
                    scrabble_score = self._calculate_scrabble_score(anagram['word'])
                    scored_words.append({
                        "text_output": anagram['word'],
                        "confidence": anagram['score'],
                        "metadata": {
                            "scrabble_points": scrabble_score,
                            "length": anagram['length'],
                            "efficiency": scrabble_score / anagram['length']
                        }
                    })
                
                # Trier par points Scrabble décroissants
                scored_words.sort(key=lambda x: x['metadata']['scrabble_points'], reverse=True)
                return {"results": scored_words[:max_results]}
                
            except Exception as e:
                print(f"Erreur lors de la génération d'anagrammes: {str(e)}")
        
        # Fallback simple
        return {
            "results": [{
                "text_output": input_text,
                "confidence": 0.5,
                "metadata": {"scrabble_points": self._calculate_scrabble_score(input_text)}
            }]
        }
    
    def _calculate_scrabble_score(self, word):
        """Calcule le score Scrabble d'un mot."""
        return sum(self.letter_values.get(letter.upper(), 0) for letter in word)
```

## Gestion des erreurs

### Stratégie de fallback

Le DictionaryService est conçu pour être robuste, mais il est important de prévoir des fallbacks :

```python
def robust_validation(self, text):
    """Validation robuste avec plusieurs niveaux de fallback."""
    
    # Niveau 1 : Service de dictionnaire centralisé
    if self.dict_service_available:
        try:
            return self.dict_service.is_valid_word(text)
        except Exception as e:
            print(f"Erreur DictionaryService: {str(e)}")
            # Continuer au niveau suivant
    
    # Niveau 2 : Liste de mots codés en dur (critique)
    critical_words = ['NORD', 'SUD', 'EST', 'OUEST', 'CACHE', 'TREASURE']
    if text.upper() in critical_words:
        return True
    
    # Niveau 3 : Heuristiques basiques
    if len(text) >= 3 and text.isalpha():
        return True
    
    return False
```

### Gestion des timeouts

```python
import signal
from contextlib import contextmanager

@contextmanager
def timeout(seconds):
    """Context manager pour gérer les timeouts."""
    def signal_handler(signum, frame):
        raise TimeoutError("Timeout dépassé")
    
    signal.signal(signal.SIGALRM, signal_handler)
    signal.alarm(seconds)
    try:
        yield
    finally:
        signal.alarm(0)

def safe_dictionary_call(self, func, *args, **kwargs):
    """Appel sécurisé avec timeout."""
    try:
        with timeout(5):  # 5 secondes max
            return func(*args, **kwargs)
    except (TimeoutError, Exception) as e:
        print(f"Erreur lors de l'appel au dictionnaire: {str(e)}")
        return None
```

### Logging d'erreurs

```python
import logging

def setup_plugin_logging(self):
    """Configure le logging pour le plugin."""
    self.logger = logging.getLogger(f"MysteryAI.Plugin.{self.__class__.__name__}")
    self.logger.setLevel(logging.INFO)

def safe_dict_call(self, method_name, *args, **kwargs):
    """Appel sécurisé avec logging."""
    if not self.dict_service_available:
        self.logger.warning(f"DictionaryService non disponible pour {method_name}")
        return None
    
    try:
        method = getattr(self.dict_service, method_name)
        result = method(*args, **kwargs)
        self.logger.debug(f"Succès {method_name}: {result}")
        return result
    except Exception as e:
        self.logger.error(f"Erreur {method_name}: {str(e)}")
        return None
```

## Tests et validation

### Tests unitaires

```python
import unittest
from unittest.mock import Mock, patch

class TestMonPlugin(unittest.TestCase):
    
    def setUp(self):
        """Configuration des tests."""
        self.plugin = MonPlugin()
        
        # Mock du DictionaryService pour les tests
        self.mock_dict_service = Mock()
        self.plugin.dict_service = self.mock_dict_service
        self.plugin.dict_service_available = True
    
    def test_validation_success(self):
        """Test de validation réussie."""
        # Configuration du mock
        self.mock_dict_service.is_valid_word.return_value = True
        self.mock_dict_service.get_word_score.return_value = 0.9
        
        # Test
        result = self.plugin.decode("TELEPHONE")
        
        # Vérifications
        self.assertEqual(result["text_output"], "TELEPHONE")
        self.assertEqual(result["confidence"], 0.9)
        self.mock_dict_service.is_valid_word.assert_called_with("TELEPHONE")
    
    def test_service_unavailable(self):
        """Test quand le service n'est pas disponible."""
        self.plugin.dict_service_available = False
        
        result = self.plugin.decode("TELEPHONE")
        
        # Doit fonctionner même sans le service
        self.assertIsNotNone(result)
        self.assertIn("text_output", result)
    
    @patch('app.services.dictionary_service.get_dictionary_service')
    def test_service_exception(self, mock_get_service):
        """Test de gestion d'exception du service."""
        mock_get_service.side_effect = Exception("Service indisponible")
        
        # Réinitialiser le plugin
        plugin = MonPlugin()
        
        # Le plugin doit fonctionner même si l'initialisation échoue
        self.assertFalse(plugin.dict_service_available)
```

### Tests d'intégration

```python
def test_integration_with_real_service():
    """Test d'intégration avec le vrai service."""
    plugin = MonPlugin()
    
    if plugin.dict_service_available:
        # Tester avec des mots connus
        result = plugin.decode("TELEPHONE")
        assert result["confidence"] > 0.5
        
        # Tester avec des non-mots
        result = plugin.decode("XZQWERTY")
        assert result["confidence"] < 0.5
    else:
        print("Service non disponible, test d'intégration ignoré")
```

## Bonnes pratiques

### ✅ À faire

1. **Toujours vérifier la disponibilité** avant utilisation
2. **Prévoir des fallbacks** pour chaque fonctionnalité critique
3. **Gérer les exceptions** de manière gracieuse
4. **Logger les erreurs** pour le débogage
5. **Tester avec et sans** le service disponible
6. **Utiliser le cache** quand possible (déjà fait par le service)
7. **Documenter les comportements** de fallback

### ❌ À éviter

1. **Ne pas assumer** que le service est toujours disponible
2. **Ne pas ignorer** les exceptions sans fallback
3. **Ne pas dupliquer** la logique de dictionnaire
4. **Ne pas faire** d'appels répétitifs sans cache
5. **Ne pas oublier** de tester les cas d'erreur

### Exemple de bonne structure

```python
class BonPlugin:
    def __init__(self):
        """Initialisation avec gestion d'erreur."""
        self.setup_logging()
        self.init_dictionary_service()
        self.init_fallback_data()
    
    def setup_logging(self):
        """Configure le logging."""
        self.logger = logging.getLogger(f"MysteryAI.{self.__class__.__name__}")
    
    def init_dictionary_service(self):
        """Initialise le service de dictionnaire."""
        try:
            from app.services.dictionary_service import get_dictionary_service
            self.dict_service = get_dictionary_service()
            self.dict_service_available = True
            self.logger.info("DictionaryService initialisé")
        except ImportError as e:
            self.dict_service_available = False
            self.logger.warning(f"DictionaryService non disponible: {str(e)}")
    
    def init_fallback_data(self):
        """Initialise les données de fallback."""
        self.critical_words = ['CACHE', 'TRESOR', 'NORD', 'SUD']  # Mots critiques
    
    def validate_word(self, word):
        """Valide un mot avec fallback."""
        # Première tentative : service centralisé
        if self.dict_service_available:
            try:
                return self.dict_service.is_valid_word(word)
            except Exception as e:
                self.logger.error(f"Erreur validation '{word}': {str(e)}")
        
        # Fallback : mots critiques
        return word.upper() in self.critical_words
    
    def get_confidence(self, word):
        """Calcule la confiance avec fallback."""
        # Première tentative : service centralisé
        if self.dict_service_available:
            try:
                return self.dict_service.get_word_score(word)
            except Exception as e:
                self.logger.error(f"Erreur score '{word}': {str(e)}")
        
        # Fallback : score basique
        if word.upper() in self.critical_words:
            return 0.9
        elif len(word) >= 3 and word.isalpha():
            return 0.5
        else:
            return 0.1
```

## FAQ

### Q : Le DictionaryService remplace-t-il complètement le ScoringService ?

**R :** Non, le DictionaryService **utilise** le ScoringService comme backend. Il fournit une interface plus simple et spécialisée pour la validation de mots, mais le ScoringService reste le moteur sous-jacent.

### Q : Que se passe-t-il si le service n'est pas disponible ?

**R :** Le plugin doit continuer à fonctionner avec des méthodes de fallback. Le DictionaryService est une amélioration, pas une dépendance critique.

### Q : Comment gérer les différentes langues ?

**R :** Utilisez le paramètre `language` dans les méthodes du service :

```python
# Français (par défaut)
self.dict_service.is_valid_word("BONJOUR")

# Anglais
self.dict_service.is_valid_word("HELLO", language="en")

# Auto-détection
self.dict_service.is_valid_word("HOLA")  # Détectera l'espagnol
```

### Q : Comment optimiser les performances ?

**R :** Le cache est automatique, mais vous pouvez :

1. **Grouper les appels** quand possible
2. **Réutiliser les résultats** dans votre plugin
3. **Éviter les appels redondants** 

```python
# Bon : un seul appel
words = self.dict_service.find_valid_words(text)

# Moins bon : appels multiples
for word in text.split():
    self.dict_service.is_valid_word(word)
```

### Q : Comment déboguer les problèmes de validation ?

**R :** Utilisez les méthodes de diagnostic :

```python
# Vérifier l'état du service
print(f"Service disponible: {self.dict_service_available}")

# Statistiques du cache
if self.dict_service_available:
    stats = self.dict_service.get_cache_stats()
    print(f"Cache stats: {stats}")

# Tester manuellement
score = self.dict_service.get_word_score("TELEPHONE")
print(f"Score TELEPHONE: {score}")
```

### Q : Puis-je ajouter mes propres mots au dictionnaire ?

**R :** Pas directement, mais vous pouvez :

1. **Étendre les termes de géocaching** dans votre plugin
2. **Combiner** les résultats du service avec vos propres validations
3. **Proposer des ajouts** aux termes de géocaching centralisés

```python
def enhanced_validation(self, word):
    """Validation enrichie avec mots personnalisés."""
    # Vérifier d'abord avec le service
    if self.dict_service_available:
        if self.dict_service.is_valid_word(word):
            return True
    
    # Ajouter vos propres mots
    custom_words = ['MYSTERYAI', 'GEOCACHE', 'PLUGIN']
    return word.upper() in custom_words
```

---

**Avec ce guide, vous disposez de tous les éléments pour intégrer efficacement le DictionaryService dans vos plugins MysteryAI !** 🚀 