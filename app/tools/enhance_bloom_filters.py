#!/usr/bin/env python
"""
Script pour créer des filtres de mots enrichis pour le système de scoring.
Version compatible sans dépendance pybloom_live - utilise des sets Python natifs.
"""

import os
import sys
import pickle
import json
from typing import Set, Dict, List

# Ajouter le répertoire racine au PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Configuration des langues et capacités
LANGUAGE_CONFIGS = {
    'fr': {'capacity': 45000, 'name': 'french'},
    'en': {'capacity': 42000, 'name': 'english'},
    'de': {'capacity': 30000, 'name': 'german'},
    'es': {'capacity': 30000, 'name': 'spanish'},
    'it': {'capacity': 28000, 'name': 'italian'},
    'nl': {'capacity': 25000, 'name': 'dutch'},
    'pt': {'capacity': 25000, 'name': 'portuguese'}
}

def get_wordfreq_words(language: str, count: int) -> Set[str]:
    """Récupère les mots les plus fréquents d'une langue via wordfreq."""
    try:
        import wordfreq
        words = set()
        
        # Récupérer les mots par fréquence décroissante
        for word in wordfreq.available_languages().get(language, []):
            if len(words) >= count:
                break
                
        # Alternative : utiliser top_n_list si disponible
        if hasattr(wordfreq, 'top_n_list'):
            words.update(wordfreq.top_n_list(language, count))
        else:
            # Méthode alternative si top_n_list n'est pas disponible
            print(f"Utilisation de méthode alternative pour {language}")
            common_words = [
                'le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour',
                'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se', 'pas', 'tout', 'plus',
                'par', 'grand', 'premier', 'en', 'même', 'bien', 'où', 'sans', 'peut', 'sous'
            ]
            words.update(common_words[:min(count, len(common_words))])
            
        return words
    except ImportError:
        print(f"wordfreq non disponible, utilisation de mots de base pour {language}")
        return set()

def get_number_words() -> Dict[str, List[str]]:
    """Retourne les nombres écrits en lettres pour différentes langues."""
    return {
        'fr': [
            'zero', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
            'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept',
            'dix-huit', 'dix-neuf', 'vingt', 'vingt-et-un', 'trente', 'quarante',
            'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix', 'cent'
        ],
        'en': [
            'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
            'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
            'seventeen', 'eighteen', 'nineteen', 'twenty', 'twenty-one', 'thirty', 'forty',
            'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred'
        ]
    }

def get_geocaching_terms() -> Dict[str, List[str]]:
    """Retourne les termes spécifiques au géocaching."""
    return {
        'fr': [
            'cache', 'geocache', 'geocaching', 'tresor', 'trésor', 'coordonnees', 'coordonnées',
            'latitude', 'longitude', 'nord', 'sud', 'est', 'ouest', 'gps', 'waypoint',
            'mystery', 'mystère', 'enigme', 'énigme', 'indice', 'final', 'multi', 'puzzle',
            'moldu', 'moldus', 'muggle', 'muggles', 'container', 'logbook', 'micro', 'nano',
            'traditional', 'tradionnel', 'dnf', 'found', 'trouve', 'trouvé', 'chercher'
        ],
        'en': [
            'cache', 'geocache', 'geocaching', 'treasure', 'coordinates', 'latitude',
            'longitude', 'north', 'south', 'east', 'west', 'gps', 'waypoint', 'mystery',
            'puzzle', 'clue', 'hint', 'final', 'multi', 'traditional', 'muggle', 'muggles',
            'container', 'logbook', 'micro', 'nano', 'regular', 'large', 'dnf', 'found',
            'search', 'hidden', 'location'
        ]
    }

def create_simple_word_filter(words: Set[str], language: str, name: str) -> Set[str]:
    """Crée un filtre simple basé sur un set Python."""
    print(f"Création d'un filtre de mots pour {name} avec {len(words)} mots")
    
    # Normaliser tous les mots en minuscules
    normalized_words = {word.lower() for word in words if word and len(word.strip()) > 0}
    
    print(f"Filtre créé pour {name}: {len(normalized_words)} mots uniques")
    return normalized_words

def enhance_word_filters():
    """Améliore les filtres de mots avec des termes supplémentaires."""
    
    # Créer le répertoire des filtres s'il n'existe pas
    script_dir = os.path.dirname(os.path.abspath(__file__))
    resources_dir = os.path.join(script_dir, '..', 'resources', 'bloom_filters')
    os.makedirs(resources_dir, exist_ok=True)
    
    # Obtenir les termes spécifiques
    number_words = get_number_words()
    geocaching_terms = get_geocaching_terms()
    
    # Traiter chaque langue
    for lang_code, config in LANGUAGE_CONFIGS.items():
        language_name = config['name']
        capacity = config['capacity']
        
        print(f"\n=== Traitement de {language_name} ({lang_code}) ===")
        
        # Commencer avec un ensemble de base
        all_words = set()
        
        # Ajouter les mots fréquents de wordfreq
        frequent_words = get_wordfreq_words(lang_code, capacity - 200)  # Laisser de la place pour les termes spéciaux
        all_words.update(frequent_words)
        print(f"Mots fréquents ajoutés: {len(frequent_words)}")
        
        # Ajouter les nombres dans la langue cible
        if lang_code in number_words:
            numbers = number_words[lang_code]
            all_words.update(numbers)
            print(f"Nombres ajoutés: {len(numbers)}")
        
        # Ajouter les termes de géocaching dans la langue cible
        if lang_code in geocaching_terms:
            geo_terms = geocaching_terms[lang_code]
            all_words.update(geo_terms)
            print(f"Termes de géocaching ajoutés: {len(geo_terms)}")
        
        # Ajouter les nombres anglais comme fallback
        if lang_code != 'en' and 'en' in number_words:
            en_numbers = number_words['en']
            all_words.update(en_numbers)
            print(f"Nombres anglais ajoutés: {len(en_numbers)}")
        
        # Ajouter les termes de géocaching anglais comme fallback
        if lang_code != 'en' and 'en' in geocaching_terms:
            en_geo_terms = geocaching_terms['en']
            all_words.update(en_geo_terms)
            print(f"Termes de géocaching anglais ajoutés: {len(en_geo_terms)}")
        
        # Créer le filtre
        word_filter = create_simple_word_filter(all_words, lang_code, language_name)
        
        # Sauvegarder le filtre
        filter_path = os.path.join(resources_dir, f"{lang_code}_bloom.pkl")
        try:
            with open(filter_path, 'wb') as f:
                pickle.dump(word_filter, f)
            print(f"✅ Filtre sauvegardé: {filter_path}")
            print(f"   Taille finale: {len(word_filter)} mots")
        except Exception as e:
            print(f"❌ Erreur lors de la sauvegarde: {e}")
    
    # Créer le fichier de termes de géocaching
    geocaching_file_path = os.path.join(script_dir, '..', 'resources', 'geocaching_terms.json')
    try:
        geocaching_data = {
            "common": [],  # Termes communs à toutes les langues
            "fr": {
                "terms": geocaching_terms.get('fr', []),
                "phrases": []
            },
            "en": {
                "terms": geocaching_terms.get('en', []),
                "phrases": []
            }
        }
        
        with open(geocaching_file_path, 'w', encoding='utf-8') as f:
            json.dump(geocaching_data, f, ensure_ascii=False, indent=2)
        print(f"\n✅ Termes de géocaching sauvegardés: {geocaching_file_path}")
    except Exception as e:
        print(f"❌ Erreur lors de la sauvegarde des termes de géocaching: {e}")
    
    print(f"\n🎉 Amélioration des filtres terminée!")
    print(f"📁 Répertoire des filtres: {resources_dir}")

if __name__ == "__main__":
    enhance_word_filters() 