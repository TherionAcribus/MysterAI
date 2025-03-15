"""
Tests pour les fonctions de détection de coordonnées GPS.

Ce module teste les différentes fonctions de détection de coordonnées GPS
dans différents formats.
"""
import pytest
import sys
import os

# Ajouter le répertoire racine au chemin Python pour pouvoir importer les modules du projet
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.routes.coordinates import (
    detect_gps_coordinates,
    _detect_dmm_coordinates,
    _detect_tabspace_coordinates,
    _detect_variant_coordinates,
    _detect_specific_tabpoint_coordinates,
    _detect_simplified_coordinates,
    _detect_flexible_coordinates,
    _detect_nord_est_format,
    _detect_nord_est_variations
)

class TestCoordinatesDetection:
    """Tests pour les fonctions de détection de coordonnées GPS."""
    
    def test_detect_dmm_coordinates(self):
        """Teste la détection de coordonnées au format DMM standard."""
        # Format DMM standard
        text = "N 48° 33.787' E 006° 38.803'"
        result = _detect_dmm_coordinates(text)
        
        assert result is not None
        assert result["exist"] == True
        assert result["ddm_lat"] == "N 48° 33.787'"
        assert result["ddm_lon"] == "E 006° 38.803'"
        assert result["ddm"] == "N 48° 33.787' E 006° 38.803'"
    
    def test_detect_dmm_coordinates_with_spaces(self):
        """Teste la détection de coordonnées au format DMM avec des espaces supplémentaires."""
        text = "N  48 °  33.787'  E  006 °  38.803'"
        result = _detect_dmm_coordinates(text)
        
        assert result is not None
        assert result["exist"] == True
        assert result["ddm_lat"] == "N 48° 33.787'"
        assert result["ddm_lon"] == "E 006° 38.803'"
    
    def test_detect_tabspace_coordinates(self):
        """Teste la détection de coordonnées au format avec tabulations et espaces."""
        text = "N 48 ° 32 . 296 E 6 ° 40 . 636"
        result = _detect_tabspace_coordinates(text)
        
        assert result is not None
        assert result["exist"] == True
        assert result["ddm_lat"] == "N 48° 32.296'"
        assert result["ddm_lon"] == "E 6° 40.636'"
    
    def test_detect_variant_coordinates(self):
        """Teste la détection de coordonnées au format variant (NORD/EST)."""
        text = "NORD 4833787 EST 00638803"
        result = _detect_variant_coordinates(text)
        
        assert result is not None
        assert result["exist"] == True
        assert result["ddm_lat"] == "N 48° 33.787'"
        assert result["ddm_lon"] == "E 006° 38.803'"
    
    def test_detect_specific_tabpoint_coordinates(self):
        """Teste la détection de coordonnées au format spécifique avec tabulations et points."""
        text = "N\t48 ° 32 . 296\r\nE\t6 ° 40 . 636"
        result = _detect_specific_tabpoint_coordinates(text)
        
        assert result is not None
        assert result["exist"] == True
        assert result["ddm_lat"] == "N 48° 32.296'"
        assert result["ddm_lon"] == "E 6° 40.636'"
    
    def test_detect_simplified_coordinates(self):
        """Teste la détection de coordonnées avec l'approche simplifiée."""
        text = "N 48 ° 32 . 296\nE 6 ° 40 . 636"
        result = _detect_simplified_coordinates(text)
        
        assert result is not None
        assert result["exist"] == True
        assert result["ddm_lat"] == "N 48° 32.296'"
        assert result["ddm_lon"] == "E 6° 40.636'"
    
    def test_detect_flexible_coordinates(self):
        """Teste la détection de coordonnées avec l'approche flexible."""
        text = "N 48° 32.296' E 6° 40.636'"
        result = _detect_flexible_coordinates(text)
        
        assert result is not None
        assert result["exist"] == True
        assert result["ddm_lat"] == "N 48° 32.296'"
        assert result["ddm_lon"] == "E 6° 40.636'"
    
    def test_detect_nord_est_format(self):
        """Teste la détection de coordonnées au format NORD/EST avec chiffres séparés."""
        text = "NORD 48 32 296 EST 6 40 636"
        result = _detect_nord_est_format(text)
        
        assert result is not None
        assert result["exist"] == True
        assert result["ddm_lat"] == "N 48° 32.296'"
        assert result["ddm_lon"] == "E 6° 40.636'"
    
    def test_detect_nord_est_variations(self):
        """Teste la détection de coordonnées au format NORD/EST avec variations."""
        text = "NORD48 32 296 EST6 40 636"
        result = _detect_nord_est_variations(text)
        
        assert result is not None
        assert result["exist"] == True
        assert result["ddm_lat"] == "N 48° 32.296'"
        assert result["ddm_lon"] == "E 6° 40.636'"
    
    def test_detect_gps_coordinates_main_function(self):
        """Teste la fonction principale de détection de coordonnées GPS."""
        # Tester différents formats
        formats = [
            "N 48° 33.787' E 006° 38.803'",  # Format DMM standard
            "N 48 ° 32 . 296 E 6 ° 40 . 636",  # Format avec tabulations et espaces
            "NORD 4833787 EST 00638803",  # Format variant
            "N\t48 ° 32 . 296\r\nE\t6 ° 40 . 636",  # Format spécifique
            "N 48 ° 32 . 296\nE 6 ° 40 . 636",  # Format simplifié
            "NORD 48 32 296 EST 6 40 636",  # Format NORD/EST
            "NORD48 32 296 EST6 40 636"  # Format NORD/EST avec variations
        ]
        
        for text in formats:
            result = detect_gps_coordinates(text)
            assert result is not None
            assert result["exist"] == True
            assert "ddm_lat" in result and result["ddm_lat"] is not None
            assert "ddm_lon" in result and result["ddm_lon"] is not None
            assert "ddm" in result and result["ddm"] is not None
    
    def test_detect_gps_coordinates_invalid_format(self):
        """Teste la détection de coordonnées GPS avec un format invalide."""
        text = "Ceci n'est pas une coordonnée GPS"
        result = detect_gps_coordinates(text)
        
        assert result is not None
        assert result["exist"] == False
        assert result["ddm_lat"] is None
        assert result["ddm_lon"] is None
        assert result["ddm"] is None
    
    def test_detect_gps_coordinates_embedded(self):
        """Teste la détection de coordonnées GPS intégrées dans un texte."""
        text = "Voici des coordonnées: N 48° 33.787' E 006° 38.803' à trouver."
        result = detect_gps_coordinates(text)
        
        assert result is not None
        assert result["exist"] == True
        assert result["ddm_lat"] == "N 48° 33.787'"
        assert result["ddm_lon"] == "E 006° 38.803'"
    
    def test_detect_gps_coordinates_roman_decoded(self):
        """Teste la détection de coordonnées GPS après décodage de chiffres romains."""
        text = "NORD XLVIII XXXII CCXCVI EST VI XL DCXXXVI"
        result = detect_gps_coordinates(text)
        
        assert result is not None
        assert result["exist"] == True
        assert result["ddm_lat"] == "N 48° 32.296'"
        assert result["ddm_lon"] == "E 6° 40.636'" 