"""
Service de scoring pour les plugins MysteryAI

Ce module implémente le système de scoring pour évaluer la pertinence des résultats
de déchiffrement dans le contexte du géocaching.
"""

import re
import logging
import time
from typing import Dict, List, Tuple, Union, Optional, Set
from app.models.app_config import AppConfig

# Configurer le logger
logger = logging.getLogger(__name__)

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
    
    # Seuils pour les niveaux de confiance
    CONFIDENCE_THRESHOLD_HIGH = 0.65
    CONFIDENCE_THRESHOLD_MEDIUM = 0.40
    
    # Expression régulière pour les coordonnées GPS
    GPS_REGEX = r'([NS]\s*\d{1,2}[° ]\d{1,2}\.\d+)|([EW]\s*\d{1,3}[° ]\d{1,2}\.\d+)'
    
    # Liste des mots à exclure (stop words spécifiques au géocaching)
    GEOCACHING_STOP_WORDS = {
        'n', 's', 'e', 'w', 'o', 'est', 'nord', 'sud', 'ouest', 'east', 'north', 'south', 'west',
        'geocache', 'cache', 'treasure', 'tresor', 'trésor', 'mystery', 'mystère', 'multi', 'puzzle'
    }
    
    def __init__(self):
        """
        Initialise le service de scoring avec les ressources nécessaires.
        """
        self._language_detectors = {}
        self._segmenters = {}
        self._bloom_filters = {}
        self._zipf_frequencies = {}
        # Les modèles seront chargés à la demande
    
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
            "execution_time_ms": 0
        }
        
        # 3. Évaluer chaque candidat
        best_candidate = None
        best_score = -1
        
        for candidate_text in candidates:
            # 3.1 Détection de langue et segmentation si nécessaire
            lang, segments = self._detect_and_segment(candidate_text)
            
            # 3.2 Calculer le score lexical
            lexical_score, found_words = self._compute_lexical_score(segments, lang)
            
            # 3.3 Vérifier la présence de coordonnées GPS
            coord_bonus, coordinates = self._check_gps_coordinates(candidate_text)
            
            # 3.4 Calculer le score global
            final_score = (self.LEXICAL_WEIGHT * lexical_score) + (self.GPS_WEIGHT * coord_bonus)
            
            # Stocker les informations du candidat
            candidate_info = {
                "text": candidate_text,
                "score": final_score,
                "lexical_score": lexical_score,
                "gps_bonus": coord_bonus,
                "language": lang,
                "words_found": found_words[:10],  # Limiter à 10 mots pour la clarté
                "coordinates": coordinates
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
        # Implémentation simplifiée (à remplacer par fastText et des segmenteurs réels)
        # Pour le moment, on utilise une segmentation basique par espaces
        
        # TODO: Implémenter la détection de langue avec fastText
        lang = "fr"  # Par défaut français
        
        # Si le texte contient des espaces, utiliser ces espaces comme segmentation
        if ' ' in text:
            segments = text.split()
        else:
            # TODO: Implémenter une segmentation plus avancée
            # Pour le moment, segmentation naïve par groupes de caractères
            segments = [text[i:i+5] for i in range(0, len(text), 5)]
        
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
        # Implémentation simplifiée (à remplacer par filtres de Bloom et Zipf)
        
        # TODO: Implémenter des filtres de Bloom et Zipf réels
        # Pour le moment, utilisation d'une liste de mots commune en français
        common_fr_words = {'le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'mais', 'donc',
                          'car', 'ni', 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
                          'être', 'avoir', 'faire', 'aller', 'venir', 'voir', 'dire', 'parler',
                          'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par', 'en', 'de', 'du',
                          'ce', 'cette', 'ces', 'mon', 'ton', 'son', 'notre', 'votre', 'leur'}
        
        # Filtrer les mots d'arrêt spécifiques au géocaching
        filtered_segments = [s.lower() for s in segments if s.lower() not in self.GEOCACHING_STOP_WORDS]
        
        # Compter les mots reconnus
        found_words = []
        for segment in filtered_segments:
            if segment.lower() in common_fr_words:
                found_words.append(segment)
        
        # Calculer la couverture
        coverage = len(found_words) / max(1, len(filtered_segments))
        
        # Zipf moyen (simulé pour le moment)
        average_zipf = 3.5  # Valeur simulée entre 0 et 7
        
        # Score lexical combiné
        lexical_score = (0.7 * coverage) + (0.3 * (average_zipf / self.ZIPF_NORMALIZATION))
        
        return lexical_score, found_words
    
    def _check_gps_coordinates(self, text: str) -> Tuple[float, Dict]:
        """
        Vérifie la présence de coordonnées GPS dans le texte.
        
        Args:
            text: Le texte à analyser
            
        Returns:
            Un tuple contenant le bonus de coordonnées et les détails des coordonnées trouvées
        """
        # Recherche de motifs de coordonnées GPS
        matches = re.findall(self.GPS_REGEX, text)
        
        # Structure pour les coordonnées
        coordinates = {
            "exist": False,
            "ddm_lat": None,
            "ddm_lon": None,
            "ddm": None,
            "decimal": {"latitude": None, "longitude": None}
        }
        
        if matches:
            # Vérifier les faux positifs (séquence N E N E)
            if "N E N E" in text or "n e n e" in text:
                # Réduire le bonus pour ces cas suspects
                return 0.1, coordinates
            
            # TODO: Implémenter l'extraction et la validation des coordonnées
            # Pour le moment, simplement indiquer qu'elles existent
            coordinates["exist"] = True
            coordinates["patterns"] = [m[0] if m[0] else m[1] for m in matches if m[0] or m[1]]
            
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