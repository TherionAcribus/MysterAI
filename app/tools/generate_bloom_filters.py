#!/usr/bin/env python
"""
Générateur de filtres de Bloom à partir des données wordfreq.

Ce script extrait les mots les plus fréquents de chaque langue supportée par wordfreq,
puis génère des filtres de Bloom optimisés pour une recherche rapide.
"""

import os
import pickle
import argparse
import logging
from typing import List, Dict, Set
import wordfreq
from pybloom_live import BloomFilter

# Configuration du logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('bloom_generator')

# Langues supportées
SUPPORTED_LANGUAGES = {
    'fr': 'français',
    'en': 'anglais',
    'de': 'allemand',
    'es': 'espagnol',
    'it': 'italien',
    'nl': 'néerlandais',
    'pt': 'portugais',
    'sv': 'suédois',
    'pl': 'polonais',
    'ca': 'catalan',
    'ro': 'roumain',
    'hu': 'hongrois',
    'fi': 'finnois',
    'id': 'indonésien',
    'tr': 'turc',
    'ru': 'russe',
    'ar': 'arabe',
    'cs': 'tchèque',
    'da': 'danois',
    'el': 'grec',
    'ja': 'japonais',
    'ko': 'coréen',
    'nb': 'norvégien',
    'vi': 'vietnamien',
    'zh': 'chinois',
}

def extract_top_words(lang_code: str, num_words: int = 20000) -> List[str]:
    """
    Extrait les mots les plus fréquents pour une langue donnée en utilisant wordfreq.
    
    Args:
        lang_code: Code de la langue (fr, en, etc.)
        num_words: Nombre de mots à extraire
        
    Returns:
        Liste des mots les plus fréquents
    """
    logger.info(f"Extraction des {num_words} mots les plus fréquents en {SUPPORTED_LANGUAGES.get(lang_code, lang_code)}")
    
    try:
        # Vérifier si la langue est supportée par wordfreq
        if lang_code not in wordfreq.available_languages():
            logger.warning(f"La langue '{lang_code}' n'est pas supportée par wordfreq.")
            return []
            
        # Obtenir les mots les plus fréquents
        words = wordfreq.get_frequency_list(lang_code, wordlist='large')
        
        # Limiter au nombre demandé
        top_words = words[:min(num_words, len(words))]
        
        logger.info(f"Extraction terminée: {len(top_words)} mots extraits")
        return top_words
        
    except Exception as e:
        logger.error(f"Erreur lors de l'extraction des mots pour {lang_code}: {e}")
        return []

def enrich_with_additional_words(words: List[str], lang_code: str) -> List[str]:
    """
    Enrichit la liste de mots avec des mots supplémentaires spécifiques au géocaching.
    
    Args:
        words: Liste de mots de base
        lang_code: Code de la langue
        
    Returns:
        Liste de mots enrichie
    """
    # Mots spécifiques au géocaching en plusieurs langues
    geocaching_words = {
        'fr': ['cache', 'geocache', 'indice', 'indices', 'mystère', 'trésor', 'coordonnées', 'nord', 'sud', 'est', 'ouest'],
        'en': ['cache', 'geocache', 'hint', 'hints', 'mystery', 'treasure', 'coordinates', 'north', 'south', 'east', 'west'],
        'de': ['cache', 'geocache', 'hinweis', 'hinweise', 'mysterium', 'schatz', 'koordinaten', 'nord', 'süd', 'ost', 'west'],
        # Ajouter d'autres langues au besoin
    }
    
    # Ajouter les mots spécifiques à la langue si disponibles
    additional_words = geocaching_words.get(lang_code, [])
    
    # Convertir en ensemble pour éliminer les doublons
    unique_words = set(words)
    unique_words.update(additional_words)
    
    logger.info(f"Ajout de {len(additional_words)} mots spécifiques au géocaching en {SUPPORTED_LANGUAGES.get(lang_code, lang_code)}")
    
    return list(unique_words)

def create_bloom_filter(words: List[str], error_rate: float = 0.01) -> BloomFilter:
    """
    Crée un filtre de Bloom à partir d'une liste de mots.
    
    Args:
        words: Liste de mots à ajouter au filtre
        error_rate: Taux d'erreur accepté (faux positifs)
        
    Returns:
        Filtre de Bloom contenant les mots
    """
    # Créer le filtre avec une capacité adéquate
    capacity = len(words) * 1.2  # Ajouter une marge de 20%
    bloom = BloomFilter(capacity=capacity, error_rate=error_rate)
    
    # Ajouter chaque mot au filtre
    for word in words:
        bloom.add(word.lower())  # Convertir en minuscules pour uniformité
    
    logger.info(f"Filtre de Bloom créé avec {len(words)} mots et un taux d'erreur de {error_rate}")
    return bloom

def save_bloom_filter(bloom: BloomFilter, lang_code: str, output_dir: str):
    """
    Sauvegarde un filtre de Bloom dans un fichier.
    
    Args:
        bloom: Filtre de Bloom à sauvegarder
        lang_code: Code de la langue
        output_dir: Répertoire de sortie
    """
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{lang_code}_bloom.pkl")
    
    try:
        with open(output_path, 'wb') as f:
            pickle.dump(bloom, f)
        logger.info(f"Filtre sauvegardé dans {output_path}")
    except Exception as e:
        logger.error(f"Erreur lors de la sauvegarde du filtre pour {lang_code}: {e}")

def process_language(lang_code: str, num_words: int, output_dir: str, error_rate: float):
    """
    Traite une langue: extraction des mots, création et sauvegarde du filtre.
    
    Args:
        lang_code: Code de la langue
        num_words: Nombre de mots à extraire
        output_dir: Répertoire de sortie
        error_rate: Taux d'erreur du filtre de Bloom
    """
    logger.info(f"Traitement de la langue: {SUPPORTED_LANGUAGES.get(lang_code, lang_code)}")
    
    # Extraire les mots les plus fréquents
    words = extract_top_words(lang_code, num_words)
    
    if not words:
        logger.warning(f"Aucun mot extrait pour {lang_code}, filtre non créé")
        return
    
    # Enrichir avec des mots spécifiques au géocaching
    enriched_words = enrich_with_additional_words(words, lang_code)
    
    # Créer le filtre de Bloom
    bloom = create_bloom_filter(enriched_words, error_rate)
    
    # Sauvegarder le filtre
    save_bloom_filter(bloom, lang_code, output_dir)
    
    logger.info(f"Traitement terminé pour {lang_code}")

def main():
    parser = argparse.ArgumentParser(description="Générateur de filtres de Bloom à partir des données wordfreq")
    parser.add_argument("--languages", "-l", type=str, default="fr,en,de,es,it",
                        help="Codes de langues séparés par des virgules (par défaut: fr,en,de,es,it)")
    parser.add_argument("--words", "-w", type=int, default=20000,
                        help="Nombre de mots à extraire par langue (défaut: 20000)")
    parser.add_argument("--output", "-o", type=str, default="../resources/bloom_filters",
                        help="Répertoire de sortie pour les filtres (défaut: ../resources/bloom_filters)")
    parser.add_argument("--error-rate", "-e", type=float, default=0.01,
                        help="Taux d'erreur des filtres de Bloom (défaut: 0.01)")
    
    args = parser.parse_args()
    
    # Convertir la chaîne de langues en liste
    languages = [lang.strip() for lang in args.languages.split(",")]
    
    # Vérifier que le répertoire de sortie est valide
    output_dir = os.path.abspath(args.output)
    os.makedirs(output_dir, exist_ok=True)
    
    logger.info(f"Génération de filtres de Bloom pour {len(languages)} langues dans {output_dir}")
    
    # Traiter chaque langue
    for lang in languages:
        if lang in SUPPORTED_LANGUAGES:
            process_language(lang, args.words, output_dir, args.error_rate)
        else:
            logger.warning(f"Langue non supportée: {lang}")
    
    logger.info("Génération des filtres de Bloom terminée")

if __name__ == "__main__":
    main() 