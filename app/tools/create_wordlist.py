#!/usr/bin/env python
"""
Script pour créer des listes de mots à partir de wordfreq.
Utilise une approche différente en générant directement une liste de mots.
"""

import os
import pickle
import logging
import json
import wordfreq
from pybloom_live import BloomFilter

# Configuration du logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('wordlist_creator')

# Répertoire de sortie
OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'resources', 'bloom_filters'))

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
    'cs': 'tchèque',
    'da': 'danois',
    'fi': 'finnois',
}

# Liste des mots courants pour les langues principales
COMMON_WORDS = {
    'fr': [
        'le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'mais', 'donc',
        'car', 'ni', 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
        'être', 'avoir', 'faire', 'aller', 'venir', 'voir', 'dire', 'parler',
        'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par', 'en', 'de', 'du',
        'ce', 'cette', 'ces', 'mon', 'ton', 'son', 'notre', 'votre', 'leur',
        'bonjour', 'au revoir', 'merci', 'oui', 'non', 'peut-être'
    ],
    'en': [
        'the', 'a', 'an', 'and', 'or', 'but', 'for', 'of', 'in', 'on', 'at', 'to',
        'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these', 'those',
        'my', 'your', 'his', 'her', 'its', 'our', 'their', 'be', 'am', 'is', 'are',
        'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could',
        'will', 'would', 'should', 'may', 'might', 'must', 'hello', 'goodbye', 'yes',
        'no', 'maybe', 'thank', 'please'
    ],
    'de': [
        'der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'aber', 'ich', 'du',
        'er', 'sie', 'es', 'wir', 'ihr', 'sie', 'mein', 'dein', 'sein', 'ihr',
        'unser', 'euer', 'ihr', 'sein', 'haben', 'werden', 'können', 'müssen',
        'sollen', 'wollen', 'mögen', 'dürfen', 'in', 'auf', 'unter', 'über',
        'vor', 'hinter', 'neben', 'zwischen', 'ja', 'nein', 'vielleicht'
    ],
    'es': [
        'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'pero',
        'yo', 'tú', 'él', 'ella', 'nosotros', 'vosotros', 'ellos', 'ellas',
        'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
        'aquel', 'aquella', 'aquellos', 'aquellas', 'mi', 'tu', 'su', 'nuestro',
        'vuestro', 'su', 'ser', 'estar', 'haber', 'tener', 'hacer', 'ir', 'venir',
        'decir', 'en', 'de', 'con', 'por', 'para', 'sin', 'contra', 'sobre'
    ]
}

def load_geocaching_terms():
    """
    Charge les termes spécifiques au géocaching depuis le fichier JSON.
    
    Returns:
        Dictionnaire contenant les termes de géocaching par langue
    """
    geocaching_terms_path = os.path.join(os.path.dirname(__file__), '..', 'resources', 'geocaching_terms.json')
    try:
        with open(geocaching_terms_path, 'r', encoding='utf-8') as f:
            geocaching_terms = json.load(f)
        logger.info(f"Termes de géocaching chargés depuis {geocaching_terms_path}")
        return geocaching_terms
    except Exception as e:
        logger.error(f"Erreur lors du chargement des termes de géocaching: {e}")
        # Retourner un dictionnaire vide en cas d'erreur
        return {"common": [], "fr": {"terms": [], "phrases": []}, "en": {"terms": [], "phrases": []}}

def get_geocaching_words_for_language(lang_code, geocaching_terms):
    """
    Extrait les mots et phrases de géocaching pour une langue spécifique.
    
    Args:
        lang_code: Code de la langue
        geocaching_terms: Dictionnaire contenant tous les termes de géocaching
        
    Returns:
        Liste des termes de géocaching pour la langue spécifiée
    """
    # Commencer par les termes communs à toutes les langues
    geocaching_words = [term.lower() for term in geocaching_terms.get("common", [])]
    
    # Ajouter les termes spécifiques à la langue si disponibles
    if lang_code in geocaching_terms:
        # Ajouter les termes simples
        terms = [term.lower() for term in geocaching_terms[lang_code].get("terms", [])]
        geocaching_words.extend(terms)
        
        # Ajouter les phrases
        phrases = [phrase.lower() for phrase in geocaching_terms[lang_code].get("phrases", [])]
        geocaching_words.extend(phrases)
        
        # Ajouter également les termes dans leur forme singulier/pluriel
        terms_with_variations = []
        for term in geocaching_words:
            terms_with_variations.append(term)
            # Ajouter forme plurielle simple (ajouter 's' en anglais)
            if lang_code == 'en' and not term.endswith('s'):
                terms_with_variations.append(f"{term}s")
        
        geocaching_words = terms_with_variations
    
    # Si aucun terme n'est disponible pour cette langue, utiliser les termes anglais
    if not geocaching_words and 'en' in geocaching_terms:
        logger.info(f"Aucun terme de géocaching pour {lang_code}, utilisation des termes anglais")
        common_terms = [term.lower() for term in geocaching_terms.get("common", [])]
        en_terms = [term.lower() for term in geocaching_terms["en"].get("terms", [])]
        geocaching_words = common_terms + en_terms
    
    logger.info(f"Récupération de {len(geocaching_words)} termes de géocaching pour {lang_code}")
    return geocaching_words

def get_dictionary_words(lang_code, num_words=20000):
    """
    Génère une liste de mots à partir des dictionnaires intégrés de wordfreq.
    Cette approche fonctionne même si get_frequency_list() a des problèmes.
    """
    logger.info(f"Génération de la liste de mots pour {SUPPORTED_LANGUAGES.get(lang_code, lang_code)}")
    
    try:
        # Utiliser le dictionnaire de wordfreq de manière indirecte
        all_words = []
        
        # Ajouter les mots courants prédéfinis si disponibles
        base_words = COMMON_WORDS.get(lang_code, [])
        all_words.extend(base_words)
        logger.info(f"Ajout de {len(base_words)} mots communs prédéfinis")
        
        # Utiliser le corpus avec top_n_list
        corpus_words = wordfreq.top_n_list(lang_code, num_words)
        all_words.extend(corpus_words)
        logger.info(f"Ajout de {len(corpus_words)} mots depuis wordfreq.top_n_list")
        
        # Charger les termes de géocaching
        geocaching_terms = load_geocaching_terms()
        geocaching_words = get_geocaching_words_for_language(lang_code, geocaching_terms)
        all_words.extend(geocaching_words)
        logger.info(f"Ajout de {len(geocaching_words)} termes spécifiques au géocaching")
        
        # Supprimer les doublons
        unique_words = list(set(all_words))
        logger.info(f"Nombre total de mots uniques: {len(unique_words)}")
        
        return unique_words
    except Exception as e:
        logger.error(f"Erreur lors de la génération de la liste de mots pour {lang_code}: {e}")
        return []

def create_bloom_filter(words, error_rate=0.01):
    """Crée un filtre de Bloom à partir d'une liste de mots."""
    capacity = len(words) * 1.2  # Marge de 20%
    bloom = BloomFilter(capacity=capacity, error_rate=error_rate)
    
    for word in words:
        if isinstance(word, str):
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
    """Traite une langue: génération de la liste de mots, création et sauvegarde du filtre."""
    logger.info(f"Traitement de la langue: {SUPPORTED_LANGUAGES.get(lang_code, lang_code)}")
    
    # Générer la liste de mots
    words = get_dictionary_words(lang_code, num_words)
    
    if not words:
        logger.warning(f"Aucun mot généré pour {lang_code}, filtre non créé")
        return
    
    # Créer le filtre de Bloom
    bloom = create_bloom_filter(words)
    
    # Sauvegarder le filtre
    save_bloom_filter(bloom, lang_code)
    
    logger.info(f"Traitement terminé pour {lang_code}")

def main():
    """Fonction principale."""
    logger.info(f"Génération de filtres de Bloom dans {OUTPUT_DIR}")
    
    # Priorité aux langues principales
    priority_languages = ['fr', 'en', 'de', 'es', 'it']
    
    # Traiter d'abord les langues prioritaires
    for lang in priority_languages:
        process_language(lang, 20000)
    
    # Traiter les autres langues supportées
    for lang in set(SUPPORTED_LANGUAGES.keys()) - set(priority_languages):
        process_language(lang, 10000)
    
    logger.info("Génération des filtres de Bloom terminée")
    logger.info(f"Filtres générés pour {len(SUPPORTED_LANGUAGES)} langues")

if __name__ == "__main__":
    main() 