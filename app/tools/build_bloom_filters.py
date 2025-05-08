#!/usr/bin/env python
"""
Script pour générer des filtres de Bloom pour la reconnaissance de mots dans différentes langues.
Ce script crée des filtres de Bloom optimisés pour chaque langue supportée.
"""

import os
import argparse
import pickle
import logging
from pathlib import Path
import pybloom_live  # pip install pybloom-live

# Configurer le logger
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('build_bloom_filters')

# Capacités et taux de faux positifs par défaut pour les filtres
DEFAULT_CAPACITY = 100000  # Capacité du filtre (nombre de mots)
DEFAULT_ERROR_RATE = 0.01  # Taux de faux positifs (1%)

# Langues supportées
SUPPORTED_LANGUAGES = {
    'fr': 'french',
    'en': 'english',
    'de': 'german',
    'es': 'spanish',
    'it': 'italian',
    'nl': 'dutch',
    'pt': 'portuguese'
}

# Chemins par défaut
DEFAULT_RESOURCES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'resources')
DEFAULT_WORDLISTS_DIR = os.path.join(DEFAULT_RESOURCES_DIR, 'wordlists')
DEFAULT_OUTPUT_DIR = os.path.join(DEFAULT_RESOURCES_DIR, 'bloom_filters')


def ensure_dirs_exist(dirs):
    """Crée les répertoires s'ils n'existent pas."""
    for dir_path in dirs:
        Path(dir_path).mkdir(parents=True, exist_ok=True)
        logger.info(f"Répertoire vérifié: {dir_path}")


def get_word_count(file_path):
    """Compte le nombre de mots dans un fichier."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return sum(1 for _ in f)


def build_bloom_filter(wordlist_path, capacity, error_rate):
    """
    Construit un filtre de Bloom à partir d'une liste de mots.
    
    Args:
        wordlist_path: Chemin vers le fichier contenant la liste de mots
        capacity: Capacité du filtre (nombre maximum de mots)
        error_rate: Taux de faux positifs accepté
        
    Returns:
        Un filtre de Bloom contenant tous les mots de la liste
    """
    # Ajuster la capacité en fonction du nombre de mots dans le fichier
    word_count = get_word_count(wordlist_path)
    adjusted_capacity = max(capacity, int(word_count * 1.1))  # 10% de marge
    
    logger.info(f"Création du filtre de Bloom pour {wordlist_path}")
    logger.info(f"- Mots estimés: {word_count}")
    logger.info(f"- Capacité ajustée: {adjusted_capacity}")
    
    # Créer le filtre de Bloom
    bloom_filter = pybloom_live.ScalableBloomFilter(
        initial_capacity=adjusted_capacity,
        error_rate=error_rate,
        mode=pybloom_live.ScalableBloomFilter.SMALL_SET_GROWTH
    )
    
    # Ajouter les mots au filtre
    with open(wordlist_path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            word = line.strip().lower()
            if word and len(word) >= 2:  # Ignorer les mots vides ou trop courts
                bloom_filter.add(word)
            
            if (i + 1) % 10000 == 0:
                logger.info(f"- {i + 1} mots traités")
    
    logger.info(f"Filtre de Bloom créé avec {len(bloom_filter)} mots")
    return bloom_filter


def main():
    """Point d'entrée principal du script."""
    parser = argparse.ArgumentParser(description='Génère des filtres de Bloom pour la reconnaissance de mots')
    parser.add_argument('--resources', default=DEFAULT_RESOURCES_DIR, help='Répertoire des ressources')
    parser.add_argument('--wordlists', default=DEFAULT_WORDLISTS_DIR, help='Répertoire des listes de mots')
    parser.add_argument('--output', default=DEFAULT_OUTPUT_DIR, help='Répertoire de sortie pour les filtres')
    parser.add_argument('--capacity', type=int, default=DEFAULT_CAPACITY, help='Capacité des filtres')
    parser.add_argument('--error-rate', type=float, default=DEFAULT_ERROR_RATE, help='Taux de faux positifs')
    parser.add_argument('--languages', nargs='+', choices=SUPPORTED_LANGUAGES.keys(), default=SUPPORTED_LANGUAGES.keys(),
                        help='Langues à traiter (par défaut: toutes)')
    args = parser.parse_args()
    
    # Créer les répertoires nécessaires
    ensure_dirs_exist([args.resources, args.wordlists, args.output])
    
    # Créer un filtre de Bloom pour chaque langue
    for lang in args.languages:
        lang_name = SUPPORTED_LANGUAGES[lang]
        wordlist_path = os.path.join(args.wordlists, f"{lang}_words.txt")
        output_path = os.path.join(args.output, f"{lang}_bloom.pkl")
        
        # Vérifier si la liste de mots existe
        if not os.path.exists(wordlist_path):
            logger.warning(f"Liste de mots non trouvée pour {lang_name}: {wordlist_path}")
            logger.warning(f"Vous pouvez télécharger une liste de mots et la placer dans {args.wordlists}")
            continue
        
        # Construire le filtre de Bloom
        try:
            bloom_filter = build_bloom_filter(wordlist_path, args.capacity, args.error_rate)
            
            # Sauvegarder le filtre
            with open(output_path, 'wb') as f:
                pickle.dump(bloom_filter, f)
            
            logger.info(f"Filtre de Bloom sauvegardé pour {lang_name}: {output_path}")
        except Exception as e:
            logger.error(f"Erreur lors de la création du filtre pour {lang_name}: {e}")
    
    logger.info("Traitement terminé")


if __name__ == "__main__":
    main() 