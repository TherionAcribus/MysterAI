"""
Service de scoring pour les plugins MysteryAI

Ce module implémente le système de scoring pour évaluer la pertinence des résultats
de déchiffrement dans le contexte du géocaching.
"""

import re
import logging
import time
import json
import os
from typing import Dict, List, Tuple, Union, Optional, Set
from app.models.app_config import AppConfig
import langdetect
import wordninja
import pickle
from langdetect import DetectorFactory
from langdetect.detector import LangDetectException
import wordfreq

# Configurer le logger
logger = logging.getLogger(__name__)

# Configurer langdetect pour être déterministe
DetectorFactory.seed = 0

class ScoringService:
    """
    Service qui gère l'évaluation de confiance des textes déchiffrés dans le contexte du géocaching.
    Implémente le pipeline complet de scoring : pré-filtrage, normalisation, segmentation,
    détection GPS, et scoring lexical.
    """
    
    # Constantes pour les seuils et configurations
    MIN_TEXT_LENGTH = 20
    NON_ALPHA_THRESHOLD = 0.4
    COORD_BONUS_VALUE = 0.3
    LEXICAL_WEIGHT = 0.7
    GPS_WEIGHT = 0.3
    ZIPF_NORMALIZATION = 7.0
    ZIPF_MIN_VALUE = 0.5  # Valeur minimum pour les mots absents du dictionnaire Zipf
    GEOCACHING_TERM_BONUS = 1.5  # Bonus pour les termes de géocaching (multiplicateur de Zipf)
    
    # Seuils pour les niveaux de confiance
    CONFIDENCE_THRESHOLD_HIGH = 0.65
    CONFIDENCE_THRESHOLD_MEDIUM = 0.40
    
    # Expression régulière pour les coordonnées GPS
    GPS_REGEX = r'([NS]\s*\d{1,2}[° ]\d{1,2}\.\d+)|([EW]\s*\d{1,3}[° ]\d{1,2}\.\d+)'
    
    # Cache pour les termes de géocaching
    _geocaching_terms = None
    
    # Liste des mots à exclure (stop words spécifiques au géocaching)
    GEOCACHING_STOP_WORDS = {
        'n', 's', 'e', 'w', 'o', 'est', 'nord', 'sud', 'ouest', 'east', 'north', 'south', 'west',
        'geocache', 'cache', 'treasure', 'tresor', 'trésor', 'mystery', 'mystère', 'multi', 'puzzle'
    }
    
    # Langues supportées avec leurs dictionnaires respectifs
    SUPPORTED_LANGUAGES = {
        'fr': 'french',
        'en': 'english',
        'de': 'german',
        'es': 'spanish',
        'it': 'italian',
        'nl': 'dutch',
        'pt': 'portuguese'
    }
    
    # Liste des mots communs par langue (fallback si filtres de Bloom non disponibles)
    COMMON_WORDS = {
        'fr': {'le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'mais', 'donc',
               'car', 'ni', 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
               'être', 'avoir', 'faire', 'aller', 'venir', 'voir', 'dire', 'parler',
               'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par', 'en', 'de', 'du',
               'ce', 'cette', 'ces', 'mon', 'ton', 'son', 'notre', 'votre', 'leur'},
        'en': {'the', 'a', 'an', 'and', 'or', 'but', 'if', 'of', 'at', 'by', 'for',
               'with', 'about', 'against', 'between', 'into', 'through', 'during',
               'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in',
               'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
               'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both',
               'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
               'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't',
               'can', 'will', 'just', 'don', 'should', 'now', 'i', 'me', 'my',
               'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
               'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her',
               'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',
               'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that',
               'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been',
               'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
               'would', 'could', 'should', 'ought', 'im', 'youre', 'hes', 'shes', 'its',
               'were', 'theyre', 'ive', 'youve', 'weve', 'theyve', 'id', 'youd',
               'hed', 'shed', 'wed', 'theyd', 'ill', 'youll', 'hell', 'shell', 'well',
               'theyll', 'isnt', 'arent', 'wasnt', 'werent', 'hasnt', 'havent',
               'hadnt', 'doesnt', 'dont', 'didnt', 'wont', 'wouldnt', 'shant',
               'shouldnt', 'cant', 'cannot', 'couldnt', 'mustnt', 'lets'}
    }
    
    def __init__(self):
        """
        Initialise le service de scoring avec les ressources nécessaires.
        """
        self._language_detectors = {}
        self._segmenters = {}
        self._bloom_filters = {}
        self._zipf_frequencies = {}
        
        # Initialiser wordninja une fois pour éviter de recharger le modèle à chaque appel
        self._wordninja = wordninja
        
        # Les modèles seront chargés à la demande
        self._load_resources()
    
    def _load_resources(self):
        """
        Charge les ressources nécessaires pour le scoring (dictionnaires, modèles, etc.)
        """
        resources_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'resources')
        bloom_filters_dir = os.path.join(resources_dir, 'bloom_filters')
        
        # Créer le répertoire des ressources s'il n'existe pas
        os.makedirs(bloom_filters_dir, exist_ok=True)
        
        # Charger les filtres de Bloom existants
        for lang, name in self.SUPPORTED_LANGUAGES.items():
            bloom_filter_path = os.path.join(bloom_filters_dir, f"{lang}_bloom.pkl")
            if os.path.exists(bloom_filter_path):
                try:
                    with open(bloom_filter_path, 'rb') as f:
                        self._bloom_filters[lang] = pickle.load(f)
                        logger.info(f"Filtre de Bloom chargé pour {name}")
                except Exception as e:
                    logger.error(f"Erreur lors du chargement du filtre de Bloom pour {name}: {e}")
        
        # Charger les termes de géocaching
        geocaching_terms_path = os.path.join(resources_dir, 'geocaching_terms.json')
        if os.path.exists(geocaching_terms_path):
            try:
                with open(geocaching_terms_path, 'r', encoding='utf-8') as f:
                    self._geocaching_terms = json.load(f)
                logger.info("Termes de géocaching chargés avec succès")
            except Exception as e:
                logger.error(f"Erreur lors du chargement des termes de géocaching: {e}")
                self._geocaching_terms = None
        
        logger.info("Ressources chargées avec succès")
    
    def is_scoring_enabled(self) -> bool:
        """
        Vérifie si le scoring automatique est activé dans les paramètres de l'application.
        
        Returns:
            bool: True si le scoring est activé, False sinon
        """
        return AppConfig.get_value('enable_auto_scoring', True)
    
    def score_text(self, text: str, context: Optional[Dict] = None) -> Dict:
        """
        Évalue la pertinence d'un texte déchiffré en lui attribuant un score de confiance.
        
        Args:
            text: Le texte à évaluer
            context: Contexte optionnel (coordonnées de géocache, région, etc.)
            
        Returns:
            Dictionnaire contenant le score et les métadonnées d'évaluation
        """
        # Vérifier si le scoring est activé
        if not self.is_scoring_enabled():
            logger.info("Scoring automatique désactivé dans les paramètres")
            return {
                "score": None,
                "message": "Scoring automatique désactivé",
                "status": "disabled"
            }
        
        # Tracer le temps d'exécution
        start_time = time.time()
        
        # 1. Pré-filtrage
        prefilter_result = self._prefilter_text(text)
        if not prefilter_result["passed"]:
            return {
                "score": 0.0,
                "confidence_level": "low",
                "message": prefilter_result["reason"],
                "status": "rejected",
                "execution_time_ms": round((time.time() - start_time) * 1000, 2)
            }
        
        # 2. Normalisation
        candidates = self._normalize_text(text)
        
        # Préparer le résultat final
        result = {
            "score": 0.0,
            "confidence_level": "low",
            "candidates": [],
            "coordinates": {"exist": False},
            "language": None,
            "words_found": [],
            "zipf_info": {
                "average": 0.0,
                "max": 0.0,
                "min": 0.0,
                "word_frequencies": {}
            },
            "execution_time_ms": 0
        }
        
        # 3. Évaluer chaque candidat
        best_candidate = None
        best_score = -1
        
        for candidate_text in candidates:
            # 3.1 Détection de langue et segmentation si nécessaire
            lang, segments = self._detect_and_segment(candidate_text)
            
            # 3.2 Calculer le score lexical et collecter les fréquences Zipf
            lexical_score, found_words = self._compute_lexical_score(segments, lang)
            
            # Calculer les fréquences Zipf pour les métadonnées
            word_freqs = {}
            for word in found_words:
                word_freqs[word] = wordfreq.zipf_frequency(word, lang)
            
            # 3.3 Vérifier la présence de coordonnées GPS
            coord_bonus, coordinates = self._check_gps_coordinates(candidate_text)
            
            # 3.4 Calculer le score global
            final_score = (self.LEXICAL_WEIGHT * lexical_score) + (self.GPS_WEIGHT * coord_bonus)
            
            # Calculer les statistiques Zipf
            zipf_values = list(word_freqs.values())
            zipf_stats = {
                "average": sum(zipf_values) / max(len(zipf_values), 1),
                "max": max(zipf_values) if zipf_values else 0,
                "min": min(zipf_values) if zipf_values else 0,
                "word_frequencies": word_freqs
            }
            
            # Stocker les informations du candidat
            candidate_info = {
                "text": candidate_text,
                "score": final_score,
                "lexical_score": lexical_score,
                "gps_bonus": coord_bonus,
                "language": lang,
                "words_found": found_words[:10],  # Limiter à 10 mots pour la clarté
                "coordinates": coordinates,
                "zipf_info": zipf_stats
            }
            
            result["candidates"].append(candidate_info)
            
            # Mettre à jour le meilleur candidat si nécessaire
            if final_score > best_score:
                best_score = final_score
                best_candidate = candidate_info
        
        # Mise à jour du résultat avec les informations du meilleur candidat
        if best_candidate:
            result["score"] = best_candidate["score"]
            result["language"] = best_candidate["language"]
            result["words_found"] = best_candidate["words_found"]
            result["coordinates"] = best_candidate["coordinates"]
            result["zipf_info"] = best_candidate["zipf_info"]
            
            # Définir le niveau de confiance
            if result["score"] >= self.CONFIDENCE_THRESHOLD_HIGH:
                result["confidence_level"] = "high"
            elif result["score"] >= self.CONFIDENCE_THRESHOLD_MEDIUM:
                result["confidence_level"] = "medium"
            else:
                result["confidence_level"] = "low"
        
        # Finalisation
        execution_time = round((time.time() - start_time) * 1000, 2)
        result["execution_time_ms"] = execution_time
        result["status"] = "success"
        
        logger.info(f"Scoring terminé en {execution_time}ms avec score={result['score']}")
        return result
    
    def _prefilter_text(self, text: str) -> Dict:
        """
        Applique un pré-filtrage ultra-léger pour rejeter les textes peu prometteurs.
        
        Args:
            text: Le texte à filtrer
            
        Returns:
            Dictionnaire avec le résultat du filtrage et la raison éventuelle de rejet
        """
        # Pour le moment, implémentation simplifiée
        
        # 1. Vérifier la longueur minimale (sauf si contient des coordonnées GPS)
        if len(text) < self.MIN_TEXT_LENGTH and not re.search(self.GPS_REGEX, text):
            return {
                "passed": False,
                "reason": f"Texte trop court ({len(text)} caractères < {self.MIN_TEXT_LENGTH})"
            }
        
        # 2. Vérifier la proportion de caractères non-alphabétiques
        alpha_count = sum(1 for c in text if c.isalpha())
        if len(text) > 0:
            non_alpha_ratio = 1 - (alpha_count / len(text))
            if non_alpha_ratio > self.NON_ALPHA_THRESHOLD:
                # Exception pour les textes qui semblent avoir un format de coordonnées
                if not re.search(self.GPS_REGEX, text):
                    return {
                        "passed": False,
                        "reason": f"Trop de caractères non-alphabétiques ({non_alpha_ratio:.2f} > {self.NON_ALPHA_THRESHOLD})"
                    }
        
        # 3. Vérifier le ratio voyelles/consonnes (à implémenter)
        # TODO: Implémentation à compléter
        
        return {"passed": True}
    
    def _normalize_text(self, text: str) -> List[str]:
        """
        Normalise le texte et génère différentes variantes (candidats).
        
        Args:
            text: Le texte à normaliser
            
        Returns:
            Liste des candidats générés
        """
        candidates = []
        
        # Ajouter le texte original
        candidates.append(text)
        
        # Candidat sans doubles espaces
        no_double_spaces = re.sub(r'\s+', ' ', text).strip()
        if no_double_spaces != text:
            candidates.append(no_double_spaces)
        
        # Candidat sans espaces
        no_spaces = text.replace(' ', '')
        if no_spaces != text and no_spaces != no_double_spaces:
            candidates.append(no_spaces)
        
        # Candidat avec compression des espaces entre lettres (H E L L O -> HELLO)
        spaced_letters_pattern = r'(?<!\S)(\S)(?:\s+)(\S)(?:\s+)(\S)(?:\s+)(\S)(?:\s+)(\S)(?!\S)'
        compressed_spaces = re.sub(spaced_letters_pattern, r'\1\2\3\4\5', text)
        if compressed_spaces != text and compressed_spaces not in candidates:
            candidates.append(compressed_spaces)
        
        return candidates[:4]  # Limiter à 4 candidats maximum
    
    def _detect_and_segment(self, text: str) -> Tuple[str, List[str]]:
        """
        Détecte la langue du texte et le segmente si nécessaire.
        
        Args:
            text: Le texte à analyser
            
        Returns:
            Un tuple contenant la langue détectée et la liste des segments
        """
        # Normalisation du texte pour la détection de langue
        normalized_text = text.lower()
        
        # Détection de langue avec langdetect
        try:
            # Texte trop court pour une détection fiable
            if len(normalized_text) < 20:
                lang = "fr"  # Par défaut français
            else:
                # Tentative de détection de langue
                detected = langdetect.detect(normalized_text)
                
                # Vérifier si la langue détectée est supportée, sinon fallback sur 'fr'
                if detected in self.SUPPORTED_LANGUAGES:
                    lang = detected
                else:
                    lang = "fr"
                
                # Double vérification pour les cas ambigus français/anglais
                if detected in ['en', 'fr']:
                    # Liste de mots spécifiquement français
                    fr_specific = ['est', 'et', 'dans', 'avec', 'pour', 'vous', 'nous', 'ils', 'sont', 'mais', 'très']
                    
                    # Compter les mots spécifiquement français
                    fr_words_count = sum(1 for word in normalized_text.split() if word in fr_specific)
                    
                    # Si plusieurs mots spécifiquement français sont présents, forcer la langue à français
                    if fr_words_count >= 2 and detected == 'en':
                        lang = "fr"
                        logger.debug(f"Langue forcée à français en raison de {fr_words_count} mots spécifiques")
        except LangDetectException:
            lang = "fr"  # Par défaut français en cas d'erreur
        
        # Si le texte contient des espaces, utiliser ces espaces comme segmentation
        if ' ' in text:
            segments = text.split()
        else:
            # Utiliser wordninja pour segmenter le texte sans espaces
            segments = self._wordninja.split(text)
        
        return lang, segments
    
    def _compute_lexical_score(self, segments: List[str], language: str) -> Tuple[float, List[str]]:
        """
        Calcule le score lexical basé sur la reconnaissance de mots dans un dictionnaire.
        
        Args:
            segments: Liste des segments (mots potentiels)
            language: Code de la langue
            
        Returns:
            Un tuple contenant le score lexical et la liste des mots reconnus
        """
        # Normaliser les segments (minuscules)
        lower_segments = [s.lower() for s in segments]
        
        # Filtrer les mots d'arrêt spécifiques au géocaching
        filtered_segments = [s for s in lower_segments if s not in self.GEOCACHING_STOP_WORDS]
        
        # Identifier les mots reconnus
        found_words = []
        
        # Essayer la langue détectée d'abord
        primary_score, primary_words = self._compute_language_score(filtered_segments, language)
        
        # Si le score est très faible et la langue n'est pas française, essayer le français comme fallback
        if primary_score < 0.2 and language != 'fr':
            fallback_score, fallback_words = self._compute_language_score(filtered_segments, 'fr')
            
            # Si le score en français est significativement meilleur, l'utiliser
            if fallback_score > primary_score * 1.5:
                logger.debug(f"Langue corrigée: {language} → fr (score: {primary_score:.2f} → {fallback_score:.2f})")
                return fallback_score, fallback_words
        
        # Si le score est très faible et la langue n'est pas anglaise, essayer l'anglais comme fallback
        elif primary_score < 0.2 and language != 'en':
            fallback_score, fallback_words = self._compute_language_score(filtered_segments, 'en')
            
            # Si le score en anglais est significativement meilleur, l'utiliser
            if fallback_score > primary_score * 1.5:
                logger.debug(f"Langue corrigée: {language} → en (score: {primary_score:.2f} → {fallback_score:.2f})")
                return fallback_score, fallback_words
        
        return primary_score, primary_words
    
    def _adjust_zipf_score(self, zipf_score: float) -> float:
        """
        Ajuste le score Zipf pour éviter de survaloriser les mots très communs ou très rares.
        
        Les scores Zipf typiques vont de 0 à 7+, où:
        - 7+ = mots extrêmement courants (le, la, de, the, a, of...)
        - 4-6 = mots courants du langage quotidien
        - 2-4 = mots moins fréquents mais connus
        - 0-2 = mots rares
        
        Cette fonction applique une courbe en cloche pour favoriser les mots de fréquence moyenne.
        
        Args:
            zipf_score: Le score Zipf brut du mot
            
        Returns:
            Le score Zipf ajusté
        """
        # Appliquer une fonction de pondération en forme de cloche
        # Favoriser les mots entre 3 et 5.5 sur l'échelle Zipf
        if zipf_score > 6.5:
            # Mots extrêmement courants - réduire leur impact
            return 4.5  
        elif zipf_score > 5.5:
            # Mots très courants - réduire légèrement
            return 5.0
        elif zipf_score < 1.5:
            # Mots très rares - augmenter légèrement
            return 2.0
        else:
            # Mots de fréquence normale - conserver
            return zipf_score
            
    def _get_geocaching_terms(self, language: str) -> Set[str]:
        """
        Récupère l'ensemble des termes de géocaching pour une langue donnée.
        
        Args:
            language: Code de la langue
            
        Returns:
            Ensemble des termes de géocaching pour cette langue
        """
        if not self._geocaching_terms:
            return set()
        
        # Commencer par les termes communs
        geocaching_terms = set(term.lower() for term in self._geocaching_terms.get("common", []))
        
        # Ajouter les termes spécifiques à la langue
        if language in self._geocaching_terms:
            lang_terms = self._geocaching_terms[language]
            if "terms" in lang_terms:
                geocaching_terms.update(term.lower() for term in lang_terms["terms"])
            if "phrases" in lang_terms:
                geocaching_terms.update(phrase.lower() for phrase in lang_terms["phrases"])
        
        # Si la langue n'est pas disponible, utiliser l'anglais comme fallback
        elif language != 'en' and 'en' in self._geocaching_terms:
            en_terms = self._geocaching_terms['en']
            if "terms" in en_terms:
                geocaching_terms.update(term.lower() for term in en_terms["terms"])
        
        return geocaching_terms
    
    def _compute_language_score(self, segments: List[str], language: str) -> Tuple[float, List[str]]:
        """
        Calcule le score pour une langue spécifique.
        
        Args:
            segments: Liste des segments (mots potentiels) déjà filtrés et en minuscules
            language: Code de la langue
            
        Returns:
            Un tuple contenant le score lexical et la liste des mots reconnus
        """
        found_words = []
        zipf_scores = []
        geocaching_terms = self._get_geocaching_terms(language)
        geocaching_words_found = []
        
        # Convertir tous les segments en minuscules pour assurer une comparaison cohérente
        normalized_segments = [s.lower() for s in segments]
        
        # Utiliser le filtre de Bloom s'il est disponible, sinon utiliser le dictionnaire en mémoire
        if language in self._bloom_filters:
            bloom_filter = self._bloom_filters[language]
            
            for segment in normalized_segments:
                # Vérifier si le segment est dans le filtre de Bloom (toujours en minuscules)
                if segment in bloom_filter:
                    found_words.append(segment)
                    # Calculer le score Zipf pour le mot reconnu
                    zipf_score = wordfreq.zipf_frequency(segment, language)
                    
                    # Appliquer un bonus pour les termes de géocaching
                    if segment in geocaching_terms:
                        zipf_score *= self.GEOCACHING_TERM_BONUS
                        geocaching_words_found.append(segment)
                    
                    # Ajuster pour éviter de survaloriser les mots très communs
                    adjusted_zipf = self._adjust_zipf_score(zipf_score)
                    zipf_scores.append(adjusted_zipf)
                    
            logger.debug(f"Filtre de Bloom utilisé pour {language}, {len(found_words)}/{len(segments)} mots reconnus")
        else:
            # Fallback sur le dictionnaire en mémoire si pas de filtre de Bloom
            common_words = self.COMMON_WORDS.get(language, self.COMMON_WORDS['en'])
            
            for segment in normalized_segments:
                if segment in common_words:
                    found_words.append(segment)
                    # Calculer le score Zipf pour le mot reconnu
                    zipf_score = wordfreq.zipf_frequency(segment, language)
                    
                    # Appliquer un bonus pour les termes de géocaching
                    if segment in geocaching_terms:
                        zipf_score *= self.GEOCACHING_TERM_BONUS
                        geocaching_words_found.append(segment)
                    
                    # Ajuster pour éviter de survaloriser les mots très communs
                    adjusted_zipf = self._adjust_zipf_score(zipf_score)
                    zipf_scores.append(adjusted_zipf)
                    
            logger.debug(f"Dictionnaire en mémoire utilisé pour {language}, {len(found_words)}/{len(segments)} mots reconnus")
        
        # Calculer la couverture
        coverage = len(found_words) / max(1, len(segments))
        
        # Calculer la moyenne Zipf des mots reconnus
        if zipf_scores:
            average_zipf = sum(zipf_scores) / len(zipf_scores)
            logger.debug(f"Score Zipf moyen pour {language}: {average_zipf:.2f}")
        else:
            # Aucun mot reconnu, utiliser une valeur par défaut basse
            average_zipf = self.ZIPF_MIN_VALUE
        
        # Appliquer un bonus supplémentaire si des termes de géocaching ont été trouvés
        geocaching_bonus = min(0.2, len(geocaching_words_found) * 0.05)
        
        # Score lexical combiné
        lexical_score = (0.7 * coverage) + (0.3 * (average_zipf / self.ZIPF_NORMALIZATION)) + geocaching_bonus
        
        # Limiter le score à 1.0 maximum
        lexical_score = min(1.0, lexical_score)
        
        # Ajouter les termes de géocaching trouvés au début de la liste des mots reconnus
        # pour les mettre en évidence dans les métadonnées
        if geocaching_words_found:
            found_words = geocaching_words_found + [w for w in found_words if w not in geocaching_words_found]
        
        return lexical_score, found_words
    
    def _check_gps_coordinates(self, text: str) -> Tuple[float, Dict]:
        """
        Vérifie la présence de coordonnées GPS dans le texte.
        
        Args:
            text: Le texte à analyser
            
        Returns:
            Un tuple contenant le bonus de coordonnées et les détails des coordonnées trouvées
        """
        # Expression régulière améliorée pour les coordonnées GPS
        # Cette version est plus tolérante aux variations de format
        gps_patterns = [
            # Format standard N/S XX° YY.ZZZ E/W XX° YY.ZZZ
            r'([NS])\s*(\d{1,2})[°\s](\d{1,2}\.\d+)\s*([EW])\s*(\d{1,3})[°\s](\d{1,2}\.\d+)',
            
            # Format avec points cardinaux en texte
            r'(nord|nord|north|south|sud)\s*(\d{1,2})[°\s](\d{1,2}\.\d+)\s*(est|ouest|east|west)\s*(\d{1,3})[°\s](\d{1,2}\.\d+)',
            
            # Format sans espaces
            r'([NS])(\d{1,2})[°](\d{1,2}\.\d+)([EW])(\d{1,3})[°](\d{1,2}\.\d+)',
            
            # Format décimal
            r'([-+]?\d{1,2}\.\d+)[,\s]+([-+]?\d{1,3}\.\d+)'
        ]
        
        # Structure pour les coordonnées
        coordinates = {
            "exist": False,
            "ddm_lat": None,
            "ddm_lon": None,
            "ddm": None,
            "decimal": {"latitude": None, "longitude": None},
            "patterns": []
        }
        
        # Rechercher les différents formats de coordonnées
        found_coords = False
        
        for pattern in gps_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                found_coords = True
                for match in matches:
                    # Ajouter le motif complet à la liste des motifs trouvés
                    match_text = re.search(pattern, text, re.IGNORECASE).group(0)
                    if match_text not in coordinates["patterns"]:
                        coordinates["patterns"].append(match_text)
        
        # Vérifier si des coordonnées ont été trouvées
        if found_coords:
            # Vérifier les faux positifs (séquence N E N E)
            nene_patterns = ['N E N E', 'n e n e', 'NORD EST NORD EST', 'nord est nord est']
            for nene in nene_patterns:
                if nene in text.upper():
                    # Réduire le bonus pour ces cas suspects
                    return 0.1, coordinates
            
            # Mise à jour du statut des coordonnées
            coordinates["exist"] = True
            
            # TODO: Implémenter l'extraction et la validation complète des coordonnées
            # Pour le moment, simplement signaler leur présence
            
            return self.COORD_BONUS_VALUE, coordinates
        
        return 0.0, coordinates


# Singleton pour l'accès global au service
_scoring_service_instance = None

def get_scoring_service() -> ScoringService:
    """
    Retourne l'instance singleton du service de scoring.
    
    Returns:
        L'instance du ScoringService
    """
    global _scoring_service_instance
    if _scoring_service_instance is None:
        _scoring_service_instance = ScoringService()
    return _scoring_service_instance 