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
            except Exception as e:
                print(f"DictionaryService: Erreur lors de l'initialisation du scoring: {str(e)}")
                self.scoring_service_available = False
        else:
            print("DictionaryService: Service de scoring non disponible")
    
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
        
        word = word.strip().upper()
        
        # Vérifier dans le cache
        cache_key = f"{word}_{language}_{strict}"
        if cache_key in self._word_cache:
            return self._word_cache[cache_key]
        
        # Vérifier dans les termes de géocaching
        if self._is_geocaching_term(word, language):
            self._word_cache[cache_key] = True
            return True
        
        # Utiliser le service de scoring si disponible
        if self.scoring_service_available and self.scoring_service:
            try:
                result = self.scoring_service.score_text(word.lower())
                if result and 'score' in result:
                    threshold = 0.6 if strict else 0.3
                    is_valid = result['score'] >= threshold
                    self._word_cache[cache_key] = is_valid
                    return is_valid
            except Exception as e:
                print(f"DictionaryService: Erreur lors de la validation de '{word}': {str(e)}")
        
        # Fallback: vérification basique avec wordfreq si disponible
        if wordfreq_available:
            lang = language or self.default_language
            freq = zipf_frequency(word.lower(), lang)
            threshold = 2.0 if strict else 1.0
            is_valid = freq >= threshold
            self._word_cache[cache_key] = is_valid
            return is_valid
        
        # Dernier fallback: mot reconnu s'il fait partie des termes de géocaching
        is_valid = self._is_geocaching_term(word)
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
                           max_length: int = None, max_results: int = 20,
                           language: str = None) -> List[Dict[str, Any]]:
        """
        Trouve toutes les anagrammes valides d'un ensemble de lettres.
        
        Args:
            letters: Lettres à réorganiser
            min_length: Longueur minimale des anagrammes
            max_length: Longueur maximale
            max_results: Nombre maximum de résultats
            language: Langue à utiliser
            
        Returns:
            Liste des anagrammes valides avec leurs scores
        """
        anagrams = self.generate_anagrams(letters, min_length, max_length, max_results * 5)
        valid_anagrams = []
        
        for anagram in anagrams:
            if self.is_valid_word(anagram, language):
                score = self.get_word_score(anagram, language)
                valid_anagrams.append({
                    'word': anagram,
                    'score': score,
                    'length': len(anagram),
                    'language': language or self.default_language,
                    'letters_used': len(anagram),
                    'letters_total': len(letters.replace(' ', ''))
                })
        
        # Trier par score décroissant puis par longueur décroissante
        valid_anagrams.sort(key=lambda x: (x['score'], x['length']), reverse=True)
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