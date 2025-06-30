#!/usr/bin/env python
"""
Script de test spécifique pour analyser le texte problématique qui obtient 26%.
"""

import sys
import os
import json
import logging
from typing import Dict, List
from unittest.mock import patch

# Configurer le logger pour plus de détails
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Ajouter le répertoire racine au PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

def mock_get_value(key, default=None):
    """Simuler la fonction AppConfig.get_value."""
    config = {
        'enable_auto_scoring': True
    }
    return config.get(key, default)

# Appliquer le patch avant d'importer
with patch('app.models.app_config.AppConfig.get_value', side_effect=mock_get_value):
    from app.services.scoring_service import get_scoring_service, ScoringService

def test_problematic_text():
    """Test spécifique pour le texte qui pose problème."""
    
    # Le texte problématique
    text = "DEUXZERO.TROISZEROCINQ UNHUIT.NEUFSIXSEPT"
    
    print(f"\n=== ANALYSE DÉTAILLÉE DU TEXTE PROBLÉMATIQUE ===")
    print(f"Texte: {text}")
    print(f"Longueur: {len(text)} caractères")
    
    with patch.object(ScoringService, 'is_scoring_enabled', return_value=True):
        scoring_service = get_scoring_service()
        
        # Test du pré-filtrage
        print(f"\n--- 1. PRÉ-FILTRAGE ---")
        prefilter_result = scoring_service._prefilter_text(text)
        print(f"Résultat: {prefilter_result}")
        
        # Test de la normalisation
        print(f"\n--- 2. NORMALISATION ---")
        candidates = scoring_service._normalize_text(text)
        print(f"Candidats générés ({len(candidates)}):")
        for i, candidate in enumerate(candidates):
            print(f"  {i+1}. '{candidate}'")
        
        # Test de la détection de langue et segmentation pour chaque candidat
        print(f"\n--- 3. DÉTECTION DE LANGUE ET SEGMENTATION ---")
        for i, candidate in enumerate(candidates):
            print(f"\nCandidat {i+1}: '{candidate}'")
            lang, segments = scoring_service._detect_and_segment(candidate)
            print(f"  Langue détectée: {lang}")
            print(f"  Segments: {segments}")
            
            # Test du scoring lexical
            print(f"  --- Test scoring lexical ---")
            lexical_score, found_words = scoring_service._compute_lexical_score(segments, lang)
            print(f"  Score lexical: {lexical_score:.3f}")
            print(f"  Mots trouvés: {found_words}")
            
            # Vérifier si les mots individuels sont dans le filtre
            if lang in scoring_service._bloom_filters:
                bloom_filter = scoring_service._bloom_filters[lang]
                print(f"  --- Vérification dans le filtre de Bloom {lang} ---")
                for segment in segments:
                    segment_lower = segment.lower()
                    in_bloom = segment_lower in bloom_filter
                    print(f"    '{segment_lower}' -> {in_bloom}")
            else:
                print(f"  Aucun filtre de Bloom pour {lang}")
        
        # Test de la détection GPS
        print(f"\n--- 4. DÉTECTION GPS ---")
        gps_score, coordinates = scoring_service._check_gps_coordinates(text)
        print(f"Score GPS: {gps_score}")
        print(f"Coordonnées: {coordinates}")
        
        # Test global
        print(f"\n--- 5. SCORE GLOBAL ---")
        result = scoring_service.score_text(text)
        print(f"Score final: {result.get('score', 0.0):.3f}")
        print(f"Niveau de confiance: {result.get('confidence_level')}")
        print(f"Langue: {result.get('language')}")
        print(f"Mots trouvés: {result.get('words_found')}")
        
        # Afficher les détails de tous les candidats
        print(f"\n--- DÉTAILS DES CANDIDATS ---")
        for i, candidate in enumerate(result.get('candidates', [])):
            print(f"\nCandidat {i+1}:")
            print(f"  Texte: '{candidate.get('text')}'")
            print(f"  Score: {candidate.get('score'):.3f}")
            print(f"  Score lexical: {candidate.get('lexical_score'):.3f}")
            print(f"  Score GPS: {candidate.get('gps_score'):.3f}")
            print(f"  Langue: {candidate.get('language')}")
            print(f"  Mots trouvés: {candidate.get('words_found')}")

def test_individual_words():
    """Test des mots individuels pour voir s'ils sont reconnus."""
    
    words_to_test = ["deux", "zero", "trois", "cinq", "un", "huit", "neuf", "six", "sept",
                     "deuxzero", "troiszerocinq", "unhuit", "neufsixsept"]
    
    print(f"\n=== TEST DES MOTS INDIVIDUELS ===")
    
    with patch.object(ScoringService, 'is_scoring_enabled', return_value=True):
        scoring_service = get_scoring_service()
        
        # Tester avec le filtre français
        if 'fr' in scoring_service._bloom_filters:
            bloom_filter = scoring_service._bloom_filters['fr']
            print(f"Test avec filtre de Bloom français:")
            for word in words_to_test:
                in_bloom = word in bloom_filter
                print(f"  '{word}' -> {in_bloom}")
        else:
            print("Aucun filtre de Bloom français disponible")

def test_without_punctuation():
    """Test du même texte sans ponctuation."""
    
    text_no_punct = "DEUXZERO TROISZEROCINQ UNHUIT NEUFSIXSEPT"
    
    print(f"\n=== TEST SANS PONCTUATION ===")
    print(f"Texte: {text_no_punct}")
    
    with patch.object(ScoringService, 'is_scoring_enabled', return_value=True):
        scoring_service = get_scoring_service()
        result = scoring_service.score_text(text_no_punct)
        
        print(f"Score: {result.get('score', 0.0):.3f}")
        print(f"Langue: {result.get('language')}")
        print(f"Mots trouvés: {result.get('words_found')}")

if __name__ == "__main__":
    test_problematic_text()
    test_individual_words() 
    test_without_punctuation() 