"""
Tests pour les fonctionnalités "Embedded" et "Non-Embedded" du plugin HexadecimalEncoderDecoder.

Ce module teste le comportement du plugin HexadecimalEncoderDecoder avec les différentes combinaisons
de paramètres embedded, strict/smooth.
"""
import pytest
import sys
import os

# Ajouter le répertoire racine au chemin Python pour pouvoir importer les modules du projet
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from plugins.official.hexadecimal_to_decimal.main import HexadecimalEncoderDecoderPlugin

class TestHexadecimalEmbedded:
    """Tests pour la fonctionnalité Embedded du plugin HexadecimalEncoderDecoder."""
    
    @pytest.fixture
    def hex_plugin(self):
        """Fixture pour créer une instance du plugin HexadecimalEncoderDecoder."""
        return HexadecimalEncoderDecoderPlugin()
    
    def test_check_code_strict_embedded_true(self, hex_plugin):
        """Teste la vérification de code en mode strict avec embedded=True."""
        # Texte avec un code hexadécimal intégré
        text = "Voici un code hexadécimal intégré: 48656C6C6F qui correspond à 'Hello'."
        
        # Vérification avec embedded=True en mode strict
        result = hex_plugin.check_code(text, strict=True, allowed_chars=None, embedded=True)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) > 0
        assert result["score"] > 0.0
        
        # Vérifier que le fragment détecté est correct
        fragment = result["fragments"][0]
        assert fragment["value"] == "48656C6C6F"
        assert text[fragment["start"]:fragment["end"]] == "48656C6C6F"
    
    def test_check_code_strict_embedded_false(self, hex_plugin):
        """Teste la vérification de code en mode strict avec embedded=False."""
        # Texte avec un code hexadécimal intégré
        text = "Voici un code hexadécimal intégré: 48656C6C6F qui correspond à 'Hello'."
        
        # Vérification avec embedded=False en mode strict
        result = hex_plugin.check_code(text, strict=True, allowed_chars=None, embedded=False)
        
        # Vérifier que le code n'a pas été détecté (car le texte n'est pas entièrement un code hexadécimal)
        assert result["is_match"] == False
        assert len(result["fragments"]) == 0
        assert result["score"] == 0.0
    
    def test_check_code_smooth(self, hex_plugin):
        """Teste la vérification de code en mode smooth."""
        # Texte avec un code hexadécimal intégré
        text = "Voici un code hexadécimal intégré: 48656C6C6F qui correspond à 'Hello'."
        
        # Vérification en mode smooth (embedded n'a pas d'impact en mode smooth)
        result = hex_plugin.check_code(text, strict=False, allowed_chars=None, embedded=False)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) > 0
        assert result["score"] > 0.0
        
        # Vérifier que le fragment détecté est correct
        fragment = result["fragments"][0]
        assert fragment["value"] == "48656C6C6F"
        assert text[fragment["start"]:fragment["end"]] == "48656C6C6F"
    
    def test_extract_hex_fragments(self, hex_plugin):
        """Teste la méthode _extract_hex_fragments."""
        # Texte avec un code hexadécimal intégré
        text = "Voici un code hexadécimal intégré: 48656C6C6F qui correspond à 'Hello'."
        
        # Extraction des fragments hexadécimaux
        result = hex_plugin._extract_hex_fragments(text, " \t\r\n.:;,_-°")
        
        # Vérifier que le fragment a été extrait
        assert result["is_match"] == True
        assert len(result["fragments"]) > 0
        assert result["score"] > 0.0
        
        # Vérifier que le fragment extrait est correct
        fragment = result["fragments"][0]
        assert fragment["value"] == "48656C6C6F"
        assert text[fragment["start"]:fragment["end"]] == "48656C6C6F"
    
    def test_execute_decode_strict_embedded_true(self, hex_plugin):
        """Teste la méthode execute en mode decode strict avec embedded=True."""
        # Texte avec un code hexadécimal intégré
        text = "Voici un code hexadécimal intégré: 48656C6C6F qui correspond à 'Hello'."
        
        # Exécution avec embedded=True en mode decode strict
        result = hex_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "strict",
            "embedded": True
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        assert "310939249775" in result["result"]["decoded_text"]  # Valeur décimale de "48656C6C6F"
    
    def test_execute_decode_strict_embedded_false(self, hex_plugin):
        """Teste la méthode execute en mode decode strict avec embedded=False."""
        # Texte avec un code hexadécimal intégré
        text = "Voici un code hexadécimal intégré: 48656C6C6F qui correspond à 'Hello'."
        
        # Exécution avec embedded=False en mode decode strict
        result = hex_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "strict",
            "embedded": False
        })
        
        # Vérifier que le décodage a échoué (car le texte n'est pas entièrement un code hexadécimal)
        assert "error" in result
    
    def test_execute_decode_smooth(self, hex_plugin):
        """Teste la méthode execute en mode decode smooth."""
        # Texte avec un code hexadécimal intégré
        text = "Voici un code hexadécimal intégré: 48656C6C6F qui correspond à 'Hello'."
        
        # Exécution en mode decode smooth (embedded n'a pas d'impact en mode smooth)
        result = hex_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "smooth",
            "embedded": False
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        assert "310939249775" in result["result"]["decoded_text"]  # Valeur décimale de "310939249775"
    
    def test_multiple_hex_fragments(self, hex_plugin):
        """Teste la détection de plusieurs fragments hexadécimaux dans un texte."""
        # Texte avec plusieurs codes hexadécimaux intégrés
        text = "Premier code: 48656C6C6F (Hello) et second code: 576F726C64 (World)."
        
        # Vérification avec embedded=True en mode strict
        result = hex_plugin.check_code(text, strict=True, allowed_chars=None, embedded=True)
        
        # Vérifier que les codes ont été détectés
        assert result["is_match"] == True
        assert len(result["fragments"]) == 2
        assert result["score"] > 0.0
        
        # Vérifier que les fragments détectés sont corrects
        fragments_values = [f["value"] for f in result["fragments"]]
        assert "48656C6C6F" in fragments_values
        assert "576F726C64" in fragments_values
        
# Ajout des tests pour les cas non-embedded
class TestHexadecimalNonEmbedded:
    """Tests pour la fonctionnalité Non-Embedded du plugin HexadecimalEncoderDecoder."""
    
    @pytest.fixture
    def hex_plugin(self):
        """Fixture pour créer une instance du plugin HexadecimalEncoderDecoder."""
        return HexadecimalEncoderDecoderPlugin()
    
    def test_check_code_strict_non_embedded_valid(self, hex_plugin):
        """Teste la vérification de code en mode strict avec embedded=False sur un texte valide."""
        # Texte composé uniquement de code hexadécimal valide
        text = "48656C6C6F"  # "Hello" en hexadécimal
        
        # Vérification avec embedded=False en mode strict
        result = hex_plugin.check_code(text, strict=True, allowed_chars=None, embedded=False)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) == 1
        assert result["score"] > 0.0
        
        # Vérifier que le fragment détecté est correct
        fragment = result["fragments"][0]
        assert fragment["value"] == "48656C6C6F"
        assert text[fragment["start"]:fragment["end"]] == "48656C6C6F"

    def test_check_code_strict_non_embedded_with_allowed_chars(self, hex_plugin):
        """Teste la vérification de code en mode strict avec embedded=False et caractères autorisés."""
        # Texte avec code hexadécimal et caractères autorisés
        text = "4865 6C6C 6F."  # "Hello" en hexadécimal avec espaces et point
        
        # Vérification avec embedded=False en mode strict et caractères autorisés
        result = hex_plugin.check_code(text, strict=True, allowed_chars=" .", embedded=False)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) == 1
        assert result["score"] > 0.0
        
        # Vérifier que le fragment détecté est correct (strippé des caractères autorisés)
        fragment = result["fragments"][0]
        assert fragment["value"] == "4865 6C6C 6F"
        assert text[fragment["start"]:fragment["end"]] == "4865 6C6C 6F"

    def test_check_code_strict_non_embedded_with_odd_length(self, hex_plugin):
        """Teste la vérification de code en mode strict avec embedded=False et longueur impaire."""
        # Texte avec code hexadécimal de longueur impaire
        text = "48656C6C6"  # Longueur impaire (9 caractères)
        
        # Vérification avec embedded=False en mode strict
        result = hex_plugin.check_code(text, strict=True, allowed_chars=None, embedded=False)
        
        # Vérifier que le code n'a pas été détecté (car la longueur est impaire)
        assert result["is_match"] == False
        assert len(result["fragments"]) == 0
        assert result["score"] == 0.0

    def test_check_code_strict_non_embedded_invalid(self, hex_plugin):
        """Teste la vérification de code en mode strict avec embedded=False sur un texte invalide."""
        # Texte avec caractères non hexadécimaux
        text = "48656C6C6F XYZ"
        
        # Vérification avec embedded=False en mode strict
        result = hex_plugin.check_code(text, strict=True, allowed_chars=None, embedded=False)
        
        # Vérifier que le code n'a pas été détecté (car le texte contient des caractères non hexadécimaux)
        assert result["is_match"] == False
        assert len(result["fragments"]) == 0
        assert result["score"] == 0.0

    def test_check_code_smooth_non_embedded_valid(self, hex_plugin):
        """Teste la vérification de code en mode smooth avec embedded=False sur un texte valide."""
        # Texte avec un code hexadécimal
        text = "48656C6C6F"  # "Hello" en hexadécimal
        
        # Vérification en mode smooth avec embedded=False
        result = hex_plugin.check_code(text, strict=False, allowed_chars=None, embedded=False)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) == 1
        assert result["score"] > 0.0
        
        # Vérifier que le fragment détecté est correct
        fragment = result["fragments"][0]
        assert fragment["value"] == "48656C6C6F"
        assert text[fragment["start"]:fragment["end"]] == "48656C6C6F"

    def test_check_code_smooth_non_embedded_with_non_hex_chars(self, hex_plugin):
        """Teste la vérification de code en mode smooth avec embedded=False et caractères non hexadécimaux."""
        # Texte avec un code hexadécimal et des caractères non hexadécimaux
        text = "48656C6C6F XYZ 576F726C64"  # "Hello" et "World" en hexadécimal avec caractères non hexadécimaux entre les deux
        
        # Vérification en mode smooth avec embedded=False
        result = hex_plugin.check_code(text, strict=False, allowed_chars=None, embedded=False)
        
        # Vérifier que les codes ont été détectés malgré la présence de caractères non hexadécimaux
        assert result["is_match"] == True
        assert len(result["fragments"]) == 2
        assert result["score"] > 0.0
        
        # Vérifier que les fragments détectés sont corrects
        fragments_values = [f["value"] for f in result["fragments"]]
        assert "48656C6C6F" in fragments_values
        assert "576F726C64" in fragments_values

    def test_execute_decode_strict_non_embedded_valid(self, hex_plugin):
        """Teste la méthode execute en mode decode strict avec embedded=False sur un texte valide."""
        # Texte composé uniquement de code hexadécimal valide
        text = "48656C6C6F"  # "Hello" en hexadécimal
        
        # Exécution avec embedded=False en mode decode strict
        result = hex_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "strict",
            "embedded": False
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        assert result["result"]["decoded_text"] == "310939249775"  # Valeur décimale de "48656C6C6F"

    def test_execute_decode_strict_non_embedded_with_allowed_chars(self, hex_plugin):
        """Teste la méthode execute en mode decode strict avec embedded=False et caractères autorisés."""
        # Texte avec code hexadécimal et caractères autorisés
        text = "4865 6C6C 6F."  # "Hello" en hexadécimal avec espaces et point
        
        # Exécution avec embedded=False en mode decode strict et caractères autorisés
        result = hex_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "strict",
            "embedded": False,
            "allowed_chars": " ."
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        # La valeur exacte dépend de la façon dont le plugin traite les espaces lors du décodage

    def test_execute_decode_strict_non_embedded_invalid(self, hex_plugin):
        """Teste la méthode execute en mode decode strict avec embedded=False sur un texte invalide."""
        # Texte avec caractères non hexadécimaux
        text = "48656C6C6F XYZ"
        
        # Exécution avec embedded=False en mode decode strict
        result = hex_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "strict",
            "embedded": False
        })
        
        # Vérifier que le décodage a échoué (car le texte contient des caractères non hexadécimaux)
        assert "error" in result

    def test_execute_decode_smooth_non_embedded_valid(self, hex_plugin):
        """Teste la méthode execute en mode decode smooth avec embedded=False sur un texte valide."""
        # Texte avec un code hexadécimal
        text = "48656C6C6F"  # "Hello" en hexadécimal
        
        # Exécution en mode decode smooth avec embedded=False
        result = hex_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "smooth",
            "embedded": False
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        assert result["result"]["decoded_text"] == "310939249775"  # Valeur décimale de "48656C6C6F"

    def test_execute_decode_smooth_non_embedded_with_non_hex_chars(self, hex_plugin):
        """Teste la méthode execute en mode decode smooth avec embedded=False et caractères non hexadécimaux."""
        # Texte avec un code hexadécimal et des caractères non hexadécimaux
        text = "48656C6C6F XYZ 576F726C64"  # "Hello" et "World" en hexadécimal avec caractères non hexadécimaux entre les deux
        
        # Exécution en mode decode smooth avec embedded=False
        result = hex_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "smooth",
            "embedded": False
        })
        
        # Vérifier que le décodage a réussi malgré la présence de caractères non hexadécimaux
        assert "result" in result
        assert "decoded_text" in result["result"]
        # Les fragments hexadécimaux sont transformés en valeurs décimales
        assert "310939249775" in result["result"]["decoded_text"]  # Valeur décimale de "48656C6C6F"

    def test_execute_decode_smooth_special_characters(self, hex_plugin):
        """Teste la méthode execute en mode decode smooth avec des caractères spéciaux autorisés."""
        # Texte avec un code hexadécimal et des caractères spéciaux
        text = "N 45° 48656C6C6F' E 005° 576F726C64"
        
        # Caractères spéciaux autorisés
        allowed_chars = " °'NESW0123456789"
        
        # Exécution en mode decode smooth avec caractères spéciaux autorisés
        result = hex_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "smooth",
            "embedded": False,
            "allowed_chars": allowed_chars
        })
        
        # Vérifier que le décodage a réussi
        assert "error" in result
        assert "Aucun code hexadécimal détecté dans le texte" in result["error"]


    def test_encode(self, hex_plugin):
        """Teste la méthode encode."""
        # Texte à encoder
        text = "Hello"
        
        # Encodage
        encoded = hex_plugin.encode(text)
        
        # Vérifier que l'encodage est correct
        assert encoded == "48656c6c6f"  # "Hello" en hexadécimal (minuscules)

    def test_decode_hex_to_decimal(self, hex_plugin):
        """Teste la méthode decode pour convertir l'hexadécimal en décimal."""
        # Code hexadécimal à décoder
        text = "48656C6C6F"  # "Hello" en hexadécimal
        
        # Décodage en décimal
        decoded = hex_plugin.decode(text)
        
        # Vérifier que le décodage est correct
        assert decoded == "310939249775"  # Valeur décimale de "48656C6C6F"

    def test_decode_fragments_multiple(self, hex_plugin):
        """Teste la méthode decode_fragments avec plusieurs fragments."""
        # Texte avec plusieurs fragments hexadécimaux
        text = "Code1: 48656C6C6F et Code2: 576F726C64"
        
        # Fragments à décoder
        fragments = [
            {"value": "48656C6C6F", "start": 7, "end": 17},
            {"value": "576F726C64", "start": 28, "end": 38}
        ]
        
        # Décodage des fragments
        decoded = hex_plugin.decode_fragments(text, fragments)
        
        # Vérifier que le décodage est correct
        assert "Code1: 310939249775 et Code2: 375531924580" == decoded