# -*- coding: utf-8 -*-
"""
Service centralisé de gestion des dictionnaires pour les plugins MysteryAI.

Ce service fournit une interface unifiée pour :
- Validation de mots dans différentes langues
- Génération et validation d'anagrammes
- Calcul de scores de fréquence de mots
- Détection de mots valides dans des textes

Il réutilise l'infrastructure existante du système de scoring (Bloom filters, wordfreq)
pour assurer la cohérence et éviter la duplication de code.
"""

import itertools
import re
from typing import List, Dict, Set, Tuple, Optional, Any
from collections import defaultdict

try:
    from wordfreq import zipf_frequency
    wordfreq_available = True
except ImportError:
    wordfreq_available = False

try:
    from app.services.scoring_service import ScoringService
    scoring_service_available = True
except ImportError:
    scoring_service_available = False


class DictionaryService:
    """
    Service centralisé pour la gestion des dictionnaires et validation de mots.
    
    Ce service est conçu pour être utilisé par tous les plugins nécessitant
    une validation lexicale (Multitap, Anagrammes, T9, Scrabble, etc.).
    """
    
    def __init__(self):
        """Initialise le service de dictionnaire."""
        self.scoring_service = None
        self.scoring_service_available = False
        
        # Langues supportées par défaut
        self.supported_languages = ['fr', 'en', 'de', 'es', 'it', 'nl']
        self.default_language = 'fr'
        
        # Cache pour améliorer les performances
        self._word_cache = {}
        self._anagram_cache = {}
        
        # Mots de géocaching par langue
        self.geocaching_terms = {
            'fr': {
                'NORD', 'SUD', 'EST', 'OUEST', 'CACHE', 'TRESOR', 'COORDONNEES',
                'LATITUDE', 'LONGITUDE', 'DEGRES', 'MINUTES', 'SECONDES',
                'POINT', 'LIEU', 'ENDROIT', 'ICI', 'LA', 'CHERCHER', 'TROUVER',
                'BONJOUR', 'SALUT', 'MERCI', 'BRAVO', 'FELICITATIONS', 'ENIGME',
                'MESSAGE', 'TEXTE', 'PHRASE', 'MOT', 'LETTRE', 'CODE', 'CHIFFRE',
                'TELEPHONE', 'MOBILE', 'APPEL', 'NUMERO', 'CLAVIER', 'TOUCHE',
                # Mots techniques de cryptographie et décodage
                'MULTITAP', 'DECODE', 'ENCODE', 'CHIFFREMENT', 'DECHIFFREMENT',
                'CRYPTAGE', 'DECRYPTAGE', 'CIPHER', 'DECIPHER',
                # Mots courants utilisés en géocaching
                'MYSTERE', 'SECRET', 'SOLUTION', 'REPONSE', 'INDICE', 'PISTE',
                'FINAL', 'ETAPE', 'SUIVANT', 'FIN', 'DEBUT', 'DCODE', 'GCCODE',
                # Directions et positions
                'DROITE', 'GAUCHE', 'HAUT', 'BAS', 'CENTRE', 'MILIEU',
                # Nombres souvent utilisés
                'ZERO', 'UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ', 'SIX', 'SEPT', 'HUIT', 'NEUF'
            },
            'en': {
                'NORTH', 'SOUTH', 'EAST', 'WEST', 'CACHE', 'TREASURE', 'COORDINATES',
                'LATITUDE', 'LONGITUDE', 'DEGREES', 'MINUTES', 'SECONDS',
                'POINT', 'PLACE', 'LOCATION', 'HERE', 'THERE', 'SEARCH', 'FIND',
                'HELLO', 'WORLD', 'MESSAGE', 'TEXT', 'WORD', 'LETTER', 'NUMBER',
                'PHONE', 'TELEPHONE', 'MOBILE', 'CALL', 'GOODBYE',
                # Technical cryptography terms
                'MULTITAP', 'DECODE', 'ENCODE', 'CIPHER', 'DECIPHER',
                'ENCRYPT', 'DECRYPT', 'CRYPTOGRAPHY',
                # Common geocaching terms
                'MYSTERY', 'SECRET', 'SOLUTION', 'ANSWER', 'CLUE', 'HINT',
                'FINAL', 'STAGE', 'NEXT', 'END', 'START', 'DCODE', 'GCCODE',
                # Directions
                'RIGHT', 'LEFT', 'UP', 'DOWN', 'CENTER', 'MIDDLE',
                # Numbers
                'ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'
            }
        }
        
        # Initialiser le service de scoring si disponible
        self._init_scoring_service()
    
    def _init_scoring_service(self):
        """Initialise le service de scoring pour accéder aux dictionnaires."""
        if scoring_service_available:
            try:
                self.scoring_service = ScoringService()
                self.scoring_service_available = True
                print("DictionaryService: Service de scoring initialisé avec succès")
                
                # NOUVEAU : Obtenir un accès direct aux Bloom filters pour des performances optimales
                if hasattr(self.scoring_service, '_bloom_filters'):
                    self._bloom_filters = self.scoring_service._bloom_filters
                    print(f"DictionaryService: Accès direct aux Bloom filters - Langues disponibles: {list(self._bloom_filters.keys())}")
                    
                    # Afficher les statistiques des dictionnaires
                    for lang, bloom_filter in self._bloom_filters.items():
                        if hasattr(bloom_filter, '__len__'):
                            print(f"  - {lang}: {len(bloom_filter):,} mots")
                        else:
                            print(f"  - {lang}: filtre disponible")
                else:
                    self._bloom_filters = {}
                    print("DictionaryService: Pas d'accès direct aux Bloom filters")
                    
            except Exception as e:
                print(f"DictionaryService: Erreur lors de l'initialisation du scoring: {str(e)}")
                self.scoring_service_available = False
                self._bloom_filters = {}
        else:
            print("DictionaryService: Service de scoring non disponible")
            self._bloom_filters = {}
    
    def is_valid_word(self, word: str, language: str = None, strict: bool = False) -> bool:
        """
        Vérifie si un mot est valide dans le dictionnaire.
        
        Args:
            word: Mot à vérifier
            language: Langue à utiliser (par défaut: détection automatique)
            strict: Si True, exige un score élevé pour considérer le mot valide
            
        Returns:
            True si le mot est valide, False sinon
        """
        if not word or len(word) < 2:
            return False
        
        word_normalized = word.strip().lower()  # Normaliser en minuscules pour les Bloom filters
        word_upper = word.strip().upper()
        
        # Vérifier dans le cache
        cache_key = f"{word_upper}_{language}_{strict}"
        if cache_key in self._word_cache:
            return self._word_cache[cache_key]
        
        # Vérifier dans les termes de géocaching
        if self._is_geocaching_term(word_upper, language):
            self._word_cache[cache_key] = True
            return True
        
        # NOUVEAU : Accès direct aux Bloom filters pour une performance optimale
        if hasattr(self, '_bloom_filters') and self._bloom_filters:
            # Déterminer la langue à utiliser
            target_language = language or self.default_language
            
            # Vérifier dans le Bloom filter de la langue cible
            if target_language in self._bloom_filters:
                bloom_filter = self._bloom_filters[target_language]
                if word_normalized in bloom_filter:
                    # Si strict est demandé, vérifier aussi le score Zipf
                    if strict and wordfreq_available:
                        freq = zipf_frequency(word_normalized, target_language)
                        is_valid = freq >= 2.0  # Seuil strict
                    else:
                        is_valid = True
                    
                    self._word_cache[cache_key] = is_valid
                    return is_valid
            
            # Si pas trouvé dans la langue cible, essayer l'anglais comme fallback
            if target_language != 'en' and 'en' in self._bloom_filters:
                bloom_filter = self._bloom_filters['en']
                if word_normalized in bloom_filter:
                    # Mot trouvé en anglais, score réduit si strict
                    if strict and wordfreq_available:
                        freq = zipf_frequency(word_normalized, 'en')
                        is_valid = freq >= 2.5  # Seuil plus strict pour langue non-native
                    else:
                        is_valid = True
                    
                    self._word_cache[cache_key] = is_valid
                    return is_valid
        
        # Fallback vers l'ancien système si pas de Bloom filters
        if self.scoring_service_available and self.scoring_service:
            try:
                result = self.scoring_service.score_text(word_normalized)
                if result and 'score' in result:
                    threshold = 0.6 if strict else 0.3
                    is_valid = result['score'] >= threshold
                    self._word_cache[cache_key] = is_valid
                    return is_valid
            except Exception as e:
                # Ignorer les erreurs d'application context et continuer
                pass
        
        # Fallback: vérification basique avec wordfreq si disponible
        if wordfreq_available:
            lang = language or self.default_language
            freq = zipf_frequency(word_normalized, lang)
            threshold = 2.0 if strict else 1.0
            is_valid = freq >= threshold
            self._word_cache[cache_key] = is_valid
            return is_valid
        
        # Dernier fallback: mot reconnu s'il fait partie des termes de géocaching
        is_valid = self._is_geocaching_term(word_upper)
        self._word_cache[cache_key] = is_valid
        return is_valid
    
    def get_word_score(self, word: str, language: str = None) -> float:
        """
        Calcule le score de qualité d'un mot (0.0 à 1.0).
        
        Args:
            word: Mot à évaluer
            language: Langue à utiliser
            
        Returns:
            Score entre 0.0 (mot inexistant) et 1.0 (mot très courant)
        """
        if not word or len(word) < 2:
            return 0.0
        
        word = word.strip().upper()
        
        # Bonus pour les termes de géocaching
        if self._is_geocaching_term(word, language):
            return 0.9
        
        # Utiliser le service de scoring si disponible
        if self.scoring_service_available and self.scoring_service:
            try:
                result = self.scoring_service.score_text(word.lower())
                if result and 'score' in result:
                    return result['score']
            except Exception:
                pass
        
        # Fallback avec wordfreq
        if wordfreq_available:
            lang = language or self.default_language
            freq = zipf_frequency(word.lower(), lang)
            # Normaliser le score Zipf (0-7) vers 0-1
            return min(1.0, max(0.0, freq / 7.0))
        
        return 0.0
    
    def find_valid_words(self, text: str, min_length: int = 3, 
                        max_words: int = 100, language: str = None) -> List[Dict[str, Any]]:
        """
        Trouve tous les mots valides dans un texte.
        
        Args:
            text: Texte à analyser
            min_length: Longueur minimale des mots
            max_words: Nombre maximum de mots à retourner
            language: Langue à utiliser
            
        Returns:
            Liste de dictionnaires avec les mots trouvés et leurs scores
        """
        if not text:
            return []
        
        # Nettoyer et extraire les mots
        words = self._extract_words(text, min_length)
        valid_words = []
        
        for word in words:
            if self.is_valid_word(word, language):
                score = self.get_word_score(word, language)
                valid_words.append({
                    'word': word,
                    'score': score,
                    'length': len(word),
                    'language': language or self.default_language
                })
        
        # Trier par score décroissant et limiter le nombre
        valid_words.sort(key=lambda x: x['score'], reverse=True)
        return valid_words[:max_words]
    
    def generate_anagrams(self, letters: str, min_length: int = 3, 
                         max_length: int = None, max_results: int = 50) -> List[str]:
        """
        Génère toutes les anagrammes possibles d'un ensemble de lettres.
        
        Args:
            letters: Lettres à réorganiser
            min_length: Longueur minimale des anagrammes
            max_length: Longueur maximale (par défaut: longueur des lettres)
            max_results: Nombre maximum de résultats
            
        Returns:
            Liste des anagrammes possibles
        """
        if not letters:
            return []
        
        letters = letters.upper().replace(' ', '')
        max_length = max_length or len(letters)
        
        cache_key = f"{letters}_{min_length}_{max_length}"
        if cache_key in self._anagram_cache:
            return self._anagram_cache[cache_key][:max_results]
        
        anagrams = set()
        
        # Générer toutes les permutations de différentes longueurs
        for length in range(min_length, min(max_length + 1, len(letters) + 1)):
            for perm in itertools.permutations(letters, length):
                anagram = ''.join(perm)
                if len(anagrams) < max_results * 3:  # Générer plus pour filtrer
                    anagrams.add(anagram)
                else:
                    break
            
            if len(anagrams) >= max_results * 3:
                break
        
        result = list(anagrams)
        self._anagram_cache[cache_key] = result
        return result[:max_results]
    
    def find_valid_anagrams(self, letters: str, min_length: int = 3, 
                           max_results: int = 50, language: str = None) -> List[Dict[str, Any]]:
        """
        Trouve des anagrammes valides à partir d'un ensemble de lettres.
        NOUVEAU : Utilise l'accès direct aux Bloom filters pour une performance optimale.
        
        Args:
            letters: Lettres disponibles pour former des anagrammes
            min_length: Longueur minimale des mots
            max_results: Nombre maximum de résultats
            language: Langue à utiliser (par défaut: français)
            
        Returns:
            Liste d'anagrammes valides avec leurs scores
        """
        if not letters or len(letters) < min_length:
            return []
        
        target_language = language or self.default_language
        letters_normalized = letters.lower()
        valid_anagrams = []
        
        # Compter les lettres disponibles
        letter_count = {}
        for letter in letters_normalized:
            letter_count[letter] = letter_count.get(letter, 0) + 1
        
        # Fonction pour vérifier si un mot peut être formé avec les lettres disponibles
        def can_form_word(word):
            word_letters = {}
            for letter in word:
                word_letters[letter] = word_letters.get(letter, 0) + 1
            
            for letter, count in word_letters.items():
                if letter_count.get(letter, 0) < count:
                    return False
            return True
        
        # Si on a accès aux Bloom filters, on peut générer des permutations et les tester
        if hasattr(self, '_bloom_filters') and self._bloom_filters and target_language in self._bloom_filters:
            bloom_filter = self._bloom_filters[target_language]
            
            # Générer des permutations de différentes longueurs
            from itertools import permutations
            
            tested_words = set()
            
            for length in range(min_length, min(len(letters_normalized) + 1, 12)):  # Limite à 12 lettres max
                for perm in permutations(letters_normalized, length):
                    word = ''.join(perm)
                    
                    if word in tested_words:
                        continue
                    tested_words.add(word)
                    
                    # Vérifier si le mot peut être formé et s'il existe dans le dictionnaire
                    if can_form_word(word) and word in bloom_filter:
                        # Calculer le score
                        score = self.get_word_score(word.upper(), target_language)
                        
                        valid_anagrams.append({
                            'word': word.upper(),
                            'length': len(word),
                            'score': score,
                            'language': target_language
                        })
                        
                        if len(valid_anagrams) >= max_results:
                            break
                
                if len(valid_anagrams) >= max_results:
                    break
        
        # Trier par score décroissant
        valid_anagrams.sort(key=lambda x: x['score'], reverse=True)
        
        return valid_anagrams[:max_results]
    
    def suggest_best_segmentation(self, text: str, possible_segmentations: List[List[str]],
                                 language: str = None) -> List[str]:
        """
        Suggère la meilleure segmentation parmi plusieurs possibilités.
        
        Args:
            text: Texte original
            possible_segmentations: Liste des segmentations possibles
            language: Langue à utiliser
            
        Returns:
            Meilleure segmentation trouvée
        """
        if not possible_segmentations:
            return []
        
        if len(possible_segmentations) == 1:
            return possible_segmentations[0]
        
        best_segmentation = possible_segmentations[0]
        best_score = -1
        
        for segmentation in possible_segmentations:
            # Reconstituer le texte de cette segmentation
            reconstructed = ''.join(segmentation)
            
            # Calculer le score basé sur les mots valides
            total_score = 0
            valid_words_count = 0
            
            for word in segmentation:
                if self.is_valid_word(word, language):
                    word_score = self.get_word_score(word, language)
                    total_score += word_score
                    valid_words_count += 1
            
            # Score global = moyenne des scores + bonus pour le nombre de mots valides
            if len(segmentation) > 0:
                avg_score = total_score / len(segmentation)
                validity_ratio = valid_words_count / len(segmentation)
                global_score = avg_score * 0.7 + validity_ratio * 0.3
                
                if global_score > best_score:
                    best_score = global_score
                    best_segmentation = segmentation
        
        return best_segmentation
    
    def _is_geocaching_term(self, word: str, language: str = None) -> bool:
        """Vérifie si un mot est un terme spécialisé du géocaching."""
        word = word.upper()
        
        if language:
            return word in self.geocaching_terms.get(language, set())
        
        # Vérifier dans toutes les langues
        for terms in self.geocaching_terms.values():
            if word in terms:
                return True
        
        return False
    
    def _extract_words(self, text: str, min_length: int = 3) -> List[str]:
        """Extrait les mots d'un texte."""
        # Nettoyer le texte et séparer les mots
        cleaned_text = re.sub(r'[^A-Za-z\s]', ' ', text)
        words = cleaned_text.upper().split()
        
        # Filtrer par longueur minimale
        return [word for word in words if len(word) >= min_length]
    
    def get_supported_languages(self) -> List[str]:
        """Retourne la liste des langues supportées."""
        return self.supported_languages.copy()
    
    def clear_cache(self):
        """Vide le cache pour libérer la mémoire."""
        self._word_cache.clear()
        self._anagram_cache.clear()
    
    def get_cache_stats(self) -> Dict[str, int]:
        """Retourne des statistiques sur l'utilisation du cache."""
        return {
            'word_cache_size': len(self._word_cache),
            'anagram_cache_size': len(self._anagram_cache)
        }

    def get_available_languages(self) -> List[str]:
        """
        Retourne la liste des langues disponibles avec des dictionnaires complets.
        
        Returns:
            Liste des codes de langues disponibles
        """
        if hasattr(self, '_bloom_filters') and self._bloom_filters:
            return list(self._bloom_filters.keys())
        else:
            return self.supported_languages

    def get_dictionary_stats(self) -> Dict[str, Any]:
        """
        Retourne des statistiques sur les dictionnaires disponibles.
        
        Returns:
            Dictionnaire avec les statistiques par langue
        """
        stats = {
            'bloom_filters_available': hasattr(self, '_bloom_filters') and bool(self._bloom_filters),
            'languages': {}
        }
        
        if hasattr(self, '_bloom_filters') and self._bloom_filters:
            for lang, bloom_filter in self._bloom_filters.items():
                try:
                    size = len(bloom_filter) if hasattr(bloom_filter, '__len__') else "Inconnu"
                    stats['languages'][lang] = {
                        'estimated_words': size,
                        'type': 'bloom_filter',
                        'source': 'wordfreq + geocaching terms'
                    }
                except:
                    stats['languages'][lang] = {
                        'estimated_words': "Inconnu",
                        'type': 'bloom_filter',
                        'source': 'wordfreq + geocaching terms'
                    }
        else:
            # Fallback aux termes de géocaching seulement
            for lang in self.supported_languages:
                geocaching_count = len(self.geocaching_terms.get(lang, set()))
                stats['languages'][lang] = {
                    'estimated_words': geocaching_count,
                    'type': 'geocaching_terms_only',
                    'source': 'termes géocaching hardcodés'
                }
        
        return stats

    def is_word_in_language(self, word: str, language: str) -> bool:
        """
        Vérifie si un mot existe dans une langue spécifique (accès direct aux Bloom filters).
        Plus rapide que is_valid_word() car pas de fallbacks.
        
        Args:
            word: Mot à vérifier
            language: Code de la langue spécifique
            
        Returns:
            True si le mot existe dans cette langue, False sinon
        """
        if not word or not language or len(word) < 2:
            return False
        
        word_normalized = word.strip().lower()
        
        # Vérifier d'abord dans les termes de géocaching
        word_upper = word.strip().upper()
        if self._is_geocaching_term(word_upper, language):
            return True
        
        # Accès direct au Bloom filter de cette langue
        if hasattr(self, '_bloom_filters') and self._bloom_filters and language in self._bloom_filters:
            bloom_filter = self._bloom_filters[language]
            return word_normalized in bloom_filter
        
        # Fallback si pas de Bloom filter pour cette langue
        if wordfreq_available:
            freq = zipf_frequency(word_normalized, language)
            return freq >= 1.0  # Seuil bas pour existence simple
        
        return False


# Instance globale du service (pattern Singleton léger)
_dictionary_service_instance = None

def get_dictionary_service() -> DictionaryService:
    """
    Retourne l'instance globale du DictionaryService.
    
    Utilise le pattern Singleton pour s'assurer qu'une seule instance
    est créée et partagée entre tous les plugins.
    """
    global _dictionary_service_instance
    if _dictionary_service_instance is None:
        _dictionary_service_instance = DictionaryService()
    return _dictionary_service_instance 