#!/usr/bin/env python
"""
Script simplifié pour générer des filtres de Bloom à partir de wordfreq.
Version de test limitée au français et à l'anglais.
"""

import os
import pickle
import logging
import wordfreq
from pybloom_live import BloomFilter

# Configuration du logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('bloom_generator_test')

# Répertoire de sortie pour les filtres
OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'resources', 'bloom_filters'))

# Mots spécifiques au géocaching par langue
GEOCACHING_WORDS = {
    'fr': ['cache', 'geocache', 'indice', 'indices', 'mystère', 'trésor', 'coordonnées', 'nord', 'sud', 'est', 'ouest'],
    'en': ['cache', 'geocache', 'hint', 'hints', 'mystery', 'treasure', 'coordinates', 'north', 'south', 'east', 'west'],
}

def extract_top_words(lang_code, num_words=5000):
    """Extrait les mots les plus fréquents d'une langue donnée."""
    logger.info(f"Extraction des {num_words} mots les plus fréquents en {lang_code}")
    
    try:
        # Obtenir les mots les plus fréquents - wordfreq renvoie directement une liste de mots
        words = wordfreq.get_frequency_list(lang_code, wordlist='large')
        
        # Vérifier le format des données retournées
        if words and len(words) > 0:
            first_word = words[0]
            logger.info(f"Premier mot: '{first_word}', type: {type(first_word)}")
        
        # Limiter au nombre demandé
        top_words = words[:min(num_words, len(words))]
        
        logger.info(f"Extraction terminée: {len(top_words)} mots extraits")
        return top_words
    except Exception as e:
        logger.error(f"Erreur lors de l'extraction des mots pour {lang_code}: {e}")
        return []

def create_bloom_filter(words, error_rate=0.01):
    """Crée un filtre de Bloom à partir d'une liste de mots."""
    capacity = len(words) * 1.2  # Marge de 20%
    bloom = BloomFilter(capacity=capacity, error_rate=error_rate)
    
    for word in words:
        bloom.add(word.lower())
    
    logger.info(f"Filtre de Bloom créé avec {len(words)} mots")
    return bloom

def save_bloom_filter(bloom, lang_code):
    """Sauvegarde un filtre de Bloom dans un fichier."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_path = os.path.join(OUTPUT_DIR, f"{lang_code}_bloom.pkl")
    
    try:
        with open(output_path, 'wb') as f:
            pickle.dump(bloom, f)
        logger.info(f"Filtre sauvegardé dans {output_path}")
    except Exception as e:
        logger.error(f"Erreur lors de la sauvegarde du filtre pour {lang_code}: {e}")

def process_language(lang_code, num_words):
    """Traite une langue: extraction des mots, création et sauvegarde du filtre."""
    logger.info(f"Traitement de la langue: {lang_code}")
    
    # Extraire les mots les plus fréquents
    words = extract_top_words(lang_code, num_words)
    
    if not words:
        logger.warning(f"Aucun mot extrait pour {lang_code}, filtre non créé")
        return
    
    # Ajouter les mots spécifiques au géocaching
    geocaching_words = GEOCACHING_WORDS.get(lang_code, [])
    
    # S'assurer que tous les mots sont des chaînes et non des listes
    all_words = []
    for word in words:
        if isinstance(word, str):
            all_words.append(word)
    
    # Ajouter les mots spécifiques au géocaching
    all_words.extend(geocaching_words)
    
    # Éliminer les doublons
    unique_words = list(set(all_words))
    
    logger.info(f"Ajout de {len(geocaching_words)} mots spécifiques au géocaching")
    logger.info(f"Nombre total de mots uniques: {len(unique_words)}")
    
    # Créer le filtre de Bloom
    bloom = create_bloom_filter(unique_words)
    
    # Sauvegarder le filtre
    save_bloom_filter(bloom, lang_code)
    
    logger.info(f"Traitement terminé pour {lang_code}")

def main():
    """Fonction principale."""
    logger.info(f"Génération de filtres de Bloom dans {OUTPUT_DIR}")
    
    # Générer pour le français et l'anglais
    process_language('fr', 5000)
    process_language('en', 5000)
    
    logger.info("Génération des filtres de Bloom terminée")

if __name__ == "__main__":
    main() 