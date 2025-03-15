"""
Tests pour les cas spécifiques de coordonnées GPS.

Ce module teste la détection de coordonnées GPS dans des formats spécifiques
qui ont posé problème dans l'application.
"""
import pytest
import sys
import os

# Ajouter le répertoire racine au chemin Python pour pouvoir importer les modules du projet
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.routes.coordinates import (
    detect_gps_coordinates,
    _detect_nord_est_format,
    _detect_nord_est_variations
)

class TestSpecificCoordinates:
    """Tests pour les cas spécifiques de coordonnées GPS."""
    
    def test_nord_est_format_basic(self):
        """Teste la détection du format NORD/EST basique."""
        text = "NORD 48 32 296 EST 6 40 636"
        result = _detect_nord_est_format(text)
        
        assert result is not None
        assert result["exist"] == True
        assert result["ddm_lat"] == "N 48° 32.296'"
        assert result["ddm_lon"] == "E 6° 40.636'"
    
    def test_nord_est_format_with_tabs(self):
        """Teste la détection du format NORD/EST avec tabulations."""
        text = "NORD\t48\t32\t296\tEST\t6\t40\t636"
        result = _detect_nord_est_format(text)
        
        assert result is not None
        assert result["exist"] == True
        assert result["ddm_lat"] == "N 48° 32.296'"
        assert result["ddm_lon"] == "E 6° 40.636'"
    
    def test_nord_est_format_with_newlines(self):
        """Teste la détection du format NORD/EST avec sauts de ligne."""
        text = "NORD\n48\n32\n296\nEST\n6\n40\n636"
        result = _detect_nord_est_format(text)
        
        assert result is not None
        assert result["exist"] == True
        assert result["ddm_lat"] == "N 48° 32.296'"
        assert result["ddm_lon"] == "E 6° 40.636'"
    
    def test_nord_est_variations_no_spaces(self):
        """Teste la détection du format NORD/EST sans espaces."""
        text = "NORD48 32 296EST6 40 636"
        result = _detect_nord_est_variations(text)
        
        assert result is not None
        assert result["exist"] == True
        assert result["ddm_lat"] == "N 48° 32.296'"
        assert result["ddm_lon"] == "E 6° 40.636'"
    
    def test_nord_est_variations_with_dots(self):
        """Teste la détection du format NORD/EST avec points."""
        text = "NORD 48.32.296 EST 6.40.636"
        result = _detect_nord_est_variations(text)
        
        assert result is not None
        assert result["exist"] == True
        assert result["ddm_lat"] == "N 48° 32.296'"
        assert result["ddm_lon"] == "E 6° 40.636'"
    
    def test_nord_est_variations_mixed_format(self):
        """Teste la détection du format NORD/EST avec format mixte."""
        text = "NORD48.32.296 EST 6 40 636"
        result = _detect_nord_est_variations(text)
        
        assert result is not None
        assert result["exist"] == True
        assert result["ddm_lat"] == "N 48° 32.296'"
        assert result["ddm_lon"] == "E 6° 40.636'"
    
    def test_nord_est_in_text(self):
        """Teste la détection du format NORD/EST dans un texte."""
        text = """
        Voici les coordonnées décodées:
        NORD 48 32 296 EST 6 40 636
        Bonne chance pour trouver la cache!
        """
        result = detect_gps_coordinates(text)
        
        assert result is not None
        assert result["exist"] == True
        assert result["ddm_lat"] == "N 48° 32.296'"
        assert result["ddm_lon"] == "E 6° 40.636'"
    
    def test_roman_numerals_decoded(self):
        """Teste la détection de coordonnées après décodage de chiffres romains."""
        text = "NORD XLVIII XXXII CCXCVI EST VI XL DCXXXVI"
        result = detect_gps_coordinates(text)
        
        assert result is not None
        assert result["exist"] == True
        assert result["ddm_lat"] == "N 48° 32.296'"
        assert result["ddm_lon"] == "E 6° 40.636'"
    
    def test_normalized_text(self):
        """Teste la détection de coordonnées dans un texte normalisé."""
        # Texte normalisé (sans tabulations ni sauts de ligne)
        text = "NORD 48 32 296 EST 6 40 636"
        result = detect_gps_coordinates(text)
        
        assert result is not None
        assert result["exist"] == True
        assert result["ddm_lat"] == "N 48° 32.296'"
        assert result["ddm_lon"] == "E 6° 40.636'"
    
    def test_with_special_characters(self):
        """Teste la détection de coordonnées avec caractères spéciaux."""
        text = "NORD 48°32'296\" EST 6°40'636\""
        result = detect_gps_coordinates(text)
        
        assert result is not None
        assert result["exist"] == True
    
    def test_with_lowercase(self):
        """Teste la détection de coordonnées en minuscules."""
        text = "nord 48 32 296 est 6 40 636"
        result = detect_gps_coordinates(text)
        
        assert result is not None
        assert result["exist"] == True
        assert result["ddm_lat"] == "N 48° 32.296'"
        assert result["ddm_lon"] == "E 6° 40.636'" 