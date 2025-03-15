"""
Tests pour la fonctionnalité "Embedded" du plugin RomanNumerals.

Ce module teste le comportement du plugin RomanNumerals avec le paramètre embedded.
"""
import pytest
import sys
import os

# Ajouter le répertoire racine au chemin Python pour pouvoir importer les modules du projet
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from plugins.official.roman_code.main import RomanNumeralsPlugin

class TestRomanNumeralsEmbedded:
    """Tests pour la fonctionnalité Embedded du plugin RomanNumerals."""
    
    @pytest.fixture
    def roman_plugin(self):
        """Fixture pour créer une instance du plugin RomanNumerals."""
        return RomanNumeralsPlugin()
    
    def test_check_code_strict_embedded_true(self, roman_plugin):
        """Teste la vérification de code en mode strict avec embedded=True."""
        # Texte avec un code romain intégré
        text = "Voici un nombre romain intégré: XVI qui vaut 16 en décimal."
        
        # Vérification avec embedded=True en mode strict
        result = roman_plugin.check_code(text, strict=True, allowed_chars=None, embedded=True)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) > 0
        assert result["score"] > 0.0
        
        # Vérifier que le fragment détecté est correct
        fragment = result["fragments"][0]
        assert fragment["value"] == "XVI"
        assert text[fragment["start"]:fragment["end"]] == "XVI"
    
    def test_check_code_strict_embedded_false(self, roman_plugin):
        """Teste la vérification de code en mode strict avec embedded=False."""
        # Texte avec un code romain intégré
        text = "Voici un nombre romain intégré: XVI qui vaut 16 en décimal."
        
        # Vérification avec embedded=False en mode strict
        result = roman_plugin.check_code(text, strict=True, allowed_chars=None, embedded=False)
        
        # Vérifier que le code n'a pas été détecté (car le texte n'est pas entièrement un code romain)
        assert result["is_match"] == False
        assert len(result["fragments"]) == 0
        assert result["score"] == 0.0
    
    def test_check_code_smooth(self, roman_plugin):
        """Teste la vérification de code en mode smooth."""
        # Texte avec un code romain intégré
        text = "Voici un nombre romain intégré: XVI qui vaut 16 en décimal."
        
        # Vérification en mode smooth (embedded n'a pas d'impact en mode smooth)
        result = roman_plugin.check_code(text, strict=False, allowed_chars=None, embedded=False)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) > 0
        assert result["score"] > 0.0
        
        # Vérifier que le fragment détecté est correct
        fragment = result["fragments"][0]
        assert fragment["value"] == "XVI"
        assert text[fragment["start"]:fragment["end"]] == "XVI"
    
    def test_extract_roman_fragments(self, roman_plugin):
        """Teste la méthode _extract_roman_fragments."""
        # Texte avec un code romain intégré
        text = "Voici un nombre romain intégré: XVI qui vaut 16 en décimal."
        
        # Extraction des fragments romains
        result = roman_plugin._extract_roman_fragments(text, " \t\r\n.:;,_-°")
        
        # Vérifier que le fragment a été extrait
        assert result["is_match"] == True
        assert len(result["fragments"]) > 0
        assert result["score"] > 0.0
        
        # Vérifier que le fragment extrait est correct
        fragment = result["fragments"][0]
        assert fragment["value"] == "XVI"
        assert text[fragment["start"]:fragment["end"]] == "XVI"
    
    def test_execute_decode_strict_embedded_true(self, roman_plugin):
        """Teste la méthode execute en mode decode strict avec embedded=True."""
        # Texte avec un code romain intégré
        text = "Voici un nombre romain intégré: XVI qui vaut 16 en décimal."
        
        # Exécution avec embedded=True en mode decode strict
        result = roman_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "strict",
            "embedded": True
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        assert "16" in result["result"]["decoded_text"]
    
    def test_execute_decode_strict_embedded_false(self, roman_plugin):
        """Teste la méthode execute en mode decode strict avec embedded=False."""
        # Texte avec un code romain intégré
        text = "Voici un nombre romain intégré: XVI qui vaut 16 en décimal."
        
        # Exécution avec embedded=False en mode decode strict
        result = roman_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "strict",
            "embedded": False
        })
        
        # Vérifier que le décodage a échoué (car le texte n'est pas entièrement un code romain)
        assert "error" in result
    
    def test_execute_decode_smooth(self, roman_plugin):
        """Teste la méthode execute en mode decode smooth."""
        # Texte avec un code romain intégré
        text = "Voici un nombre romain intégré: XVI qui vaut 16 en décimal."
        
        # Exécution en mode decode smooth (embedded n'a pas d'impact en mode smooth)
        result = roman_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "smooth",
            "embedded": False
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        assert "16" in result["result"]["decoded_text"]
    
    def test_multiple_roman_fragments(self, roman_plugin):
        """Teste la détection de plusieurs fragments romains dans un texte."""
        # Texte avec plusieurs codes romains intégrés
        text = "Premier nombre: XVI (16) et second nombre: XLII (42)."
        
        # Vérification avec embedded=True en mode strict
        result = roman_plugin.check_code(text, strict=True, allowed_chars=None, embedded=True)
        
        # Vérifier que les codes ont été détectés
        assert result["is_match"] == True
        assert len(result["fragments"]) == 2
        assert result["score"] > 0.0
        
        # Vérifier que les fragments détectés sont corrects
        assert result["fragments"][0]["value"] == "XVI"
        assert result["fragments"][1]["value"] == "XLII"
    
    def test_decode_fragments(self, roman_plugin):
        """Teste la méthode decode_fragments."""
        # Texte avec un code romain intégré
        text = "Voici un nombre romain intégré: XVI qui vaut 16 en décimal."
        
        # Extraction des fragments romains
        check_result = roman_plugin.check_code(text, strict=True, allowed_chars=None, embedded=True)
        
        # Décodage des fragments
        decoded = roman_plugin.decode_fragments(text, check_result["fragments"])
        
        # Vérifier que le décodage est correct
        assert "16" in decoded

    # Tests pour le cas Non-Embedded à ajouter à la classe TestRomanNumeralsEmbedded

    def test_check_code_strict_non_embedded_valid(self, roman_plugin):
        """Teste la vérification de code en mode strict avec embedded=False sur un texte valide."""
        # Texte composé uniquement de chiffres romains valides
        text = "XVI"
        
        # Vérification avec embedded=False en mode strict
        result = roman_plugin.check_code(text, strict=True, allowed_chars=None, embedded=False)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) == 1
        assert result["score"] > 0.0
        
        # Vérifier que le fragment détecté est correct
        fragment = result["fragments"][0]
        assert fragment["value"] == "XVI"
        assert text[fragment["start"]:fragment["end"]] == "XVI"

    def test_check_code_strict_non_embedded_with_allowed_chars(self, roman_plugin):
        """Teste la vérification de code en mode strict avec embedded=False et caractères autorisés."""
        # Texte avec chiffres romains et caractères autorisés
        text = "XVI.  "
        
        # Vérification avec embedded=False en mode strict et caractères autorisés
        result = roman_plugin.check_code(text, strict=True, allowed_chars=" .", embedded=False)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) == 1
        assert result["score"] > 0.0
        
        # Vérifier que le fragment détecté est correct (sans les points et espaces)
        fragment = result["fragments"][0]
        assert fragment["value"] == "XVI"

    def test_check_code_strict_non_embedded_invalid(self, roman_plugin):
        """Teste la vérification de code en mode strict avec embedded=False sur un texte invalide."""
        # Texte avec caractères non romains
        text = "XVI ABC"
        
        # Vérification avec embedded=False en mode strict
        result = roman_plugin.check_code(text, strict=True, allowed_chars=None, embedded=False)
        
        # Vérifier que le code n'a pas été détecté (car le texte contient des caractères non romains)
        assert result["is_match"] == False
        assert len(result["fragments"]) == 0
        assert result["score"] == 0.0

    def test_check_code_smooth_non_embedded_valid(self, roman_plugin):
        """Teste la vérification de code en mode smooth avec embedded=False sur un texte valide."""
        # Texte avec un code romain
        text = "XVI"
        
        # Vérification en mode smooth avec embedded=False
        result = roman_plugin.check_code(text, strict=False, allowed_chars=None, embedded=False)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) == 1
        assert result["score"] > 0.0
        
        # Vérifier que le fragment détecté est correct
        fragment = result["fragments"][0]
        assert fragment["value"] == "XVI"
        assert text[fragment["start"]:fragment["end"]] == "XVI"

    def test_check_code_smooth_non_embedded_with_non_roman_chars(self, roman_plugin):
        """Teste la vérification de code en mode smooth avec embedded=False et caractères non romains."""
        # Texte avec un code romain et des caractères non romains
        text = "XVI ABC"
        
        # Vérification en mode smooth avec embedded=False
        result = roman_plugin.check_code(text, strict=False, allowed_chars=None, embedded=False)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) > 0
        assert result["score"] > 0.0
        
        # Vérifier que le fragment détecté est correct
        fragment = result["fragments"][0]
        assert fragment["value"] == "XVI"
        assert text[fragment["start"]:fragment["end"]] == "XVI"

    def test_execute_decode_strict_non_embedded_valid(self, roman_plugin):
        """Teste la méthode execute en mode decode strict avec embedded=False sur un texte valide."""
        # Texte composé uniquement de chiffres romains valides
        text = "XVI"
        
        # Exécution avec embedded=False en mode decode strict
        result = roman_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "strict",
            "embedded": False
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        assert result["result"]["decoded_text"] == "16"

    def test_execute_decode_strict_non_embedded_with_allowed_chars(self, roman_plugin):
        """Teste la méthode execute en mode decode strict avec embedded=False et caractères autorisés."""
        # Texte avec chiffres romains et caractères autorisés
        text = "XVI.  "
        
        # Exécution avec embedded=False en mode decode strict et caractères autorisés
        result = roman_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "strict",
            "embedded": False,
            "allowed_chars": " ."
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        assert "16" in result["result"]["decoded_text"]

    def test_execute_decode_strict_non_embedded_invalid(self, roman_plugin):
        """Teste la méthode execute en mode decode strict avec embedded=False sur un texte invalide."""
        # Texte avec caractères non romains
        text = "XVI ABC"
        
        # Exécution avec embedded=False en mode decode strict
        result = roman_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "strict",
            "embedded": False
        })
        
        # Vérifier que le décodage a échoué (car le texte contient des caractères non romains)
        assert "error" in result

    def test_execute_decode_smooth_non_embedded_valid(self, roman_plugin):
        """Teste la méthode execute en mode decode smooth avec embedded=False sur un texte valide."""
        # Texte avec un code romain
        text = "XVI"
        
        # Exécution en mode decode smooth avec embedded=False
        result = roman_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "smooth",
            "embedded": False
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        assert result["result"]["decoded_text"] == "16"

    def test_execute_decode_smooth_non_embedded_with_non_roman_chars(self, roman_plugin):
        """Teste la méthode execute en mode decode smooth avec embedded=False et caractères non romains."""
        # Texte avec un code romain et des caractères non romains
        text = "XVI ABC"
        
        # Exécution en mode decode smooth avec embedded=False
        result = roman_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "smooth",
            "embedded": False
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        assert "16" in result["result"]["decoded_text"]

    def test_execute_decode_smooth_special_characters(self, roman_plugin):
        """Teste la méthode execute en mode decode smooth avec des caractères spéciaux autorisés."""
        # Texte avec un code romain et des caractères spéciaux
        text = "N 45° XVI.32' E 005° XLII.18'"
        
        # Caractères spéciaux autorisés
        allowed_chars = " °'.NESW"
        
        # Exécution en mode decode smooth avec caractères spéciaux autorisés
        result = roman_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "smooth",
            "embedded": False,
            "allowed_chars": allowed_chars
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        # Vérifier que les nombres romains ont été décodés
        decoded_text = result["result"]["decoded_text"]
        assert "16" in decoded_text
        assert "42" in decoded_text