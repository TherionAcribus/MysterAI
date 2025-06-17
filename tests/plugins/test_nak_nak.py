"""
Tests pour le plugin NakNakCode.

Ce module teste le comportement du plugin NakNakCode avec différents paramètres
(embedded, strict/smooth, encodage/décodage).
"""
import pytest
import sys
import os

# Ajouter le répertoire racine au chemin Python pour pouvoir importer les modules du projet
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from plugins.official.nak_nak_code.main import NakNakCodePlugin

class TestNakNakCodePlugin:
    """Tests pour le plugin NakNakCode."""
    
    @pytest.fixture
    def nak_nak_plugin(self):
        """Fixture pour créer une instance du plugin NakNakCode."""
        return NakNakCodePlugin()
    
    # Tests pour les cas Embedded
    def test_check_code_strict_embedded_true(self, nak_nak_plugin):
        """Teste la vérification de code en mode strict avec embedded=True."""
        # Texte avec un code Nak Nak intégré
        text = "Voici un mot en code Nak Nak: Nak Nanak qui signifie 'A' en clair."
        
        # Vérification avec embedded=True en mode strict
        result = nak_nak_plugin.check_code(text, strict=True, allowed_chars=None, embedded=True)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) > 0
        assert result["score"] > 0.0
        
    def test_check_code_strict_embedded_false_with_non_nak_nak_chars(self, nak_nak_plugin):
        """Teste la vérification de code en mode strict avec embedded=False sur un texte avec caractères non Nak Nak."""
        # Texte avec un code Nak Nak intégré
        text = "Voici un mot en code Nak Nak: Nak Nanak qui signifie 'A' en clair."
        
        # Vérification avec embedded=False en mode strict
        result = nak_nak_plugin.check_code(text, strict=True, allowed_chars=None, embedded=False)
        
        # Vérifier que le code n'a pas été détecté (car le texte n'est pas entièrement un code Nak Nak)
        assert result["is_match"] == False
        assert len(result["fragments"]) == 0
        assert result["score"] == 0.0
    
    # Tests pour les cas Non-Embedded
    def test_check_code_strict_non_embedded_valid(self, nak_nak_plugin):
        """Teste la vérification de code en mode strict avec embedded=False sur un texte valide."""
        # Texte composé uniquement de code Nak Nak valide
        text = "Nak Nanak"  # '01' en code Nak Nak
        
        # Vérification avec embedded=False en mode strict
        result = nak_nak_plugin.check_code(text, strict=True, allowed_chars=None, embedded=False)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) == 1
        assert result["score"] > 0.0
        
        # Vérifier que le fragment détecté est correct
        fragment = result["fragments"][0]
        assert fragment["value"] == "Nak Nanak"
        assert text[fragment["start"]:fragment["end"]] == "Nak Nanak"

    def test_check_code_strict_non_embedded_with_allowed_chars(self, nak_nak_plugin):
        """Teste la vérification de code en mode strict avec embedded=False et caractères autorisés."""
        # Texte avec code Nak Nak et caractères autorisés
        text = "Nak Nanak."  # '01' en code Nak Nak avec un point
        
        # Vérification avec embedded=False en mode strict et caractères autorisés
        result = nak_nak_plugin.check_code(text, strict=True, allowed_chars=".", embedded=False)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) == 1
        assert result["score"] > 0.0
        
        # Vérifier que le fragment détecté est correct
        fragment = result["fragments"][0]
        assert fragment["value"] == "Nak Nanak"
        assert text[fragment["start"]:fragment["end"]] == "Nak Nanak"

    def test_check_code_strict_non_embedded_invalid(self, nak_nak_plugin):
        """Teste la vérification de code en mode strict avec embedded=False sur un texte invalide."""
        # Texte avec caractères non Nak Nak
        text = "Nak ABC Nanak"
        
        # Vérification avec embedded=False en mode strict
        result = nak_nak_plugin.check_code(text, strict=True, allowed_chars=None, embedded=False)
        
        # Vérifier que le code n'a pas été détecté (car le texte contient des caractères non Nak Nak)
        assert result["is_match"] == False
        assert len(result["fragments"]) == 0
        assert result["score"] == 0.0

    def test_check_code_smooth_non_embedded_valid(self, nak_nak_plugin):
        """Teste la vérification de code en mode smooth avec embedded=False sur un texte valide."""
        # Texte avec un code Nak Nak
        text = "NakNanak"  # '01' en code Nak Nak
        
        # Vérification en mode smooth avec embedded=False
        result = nak_nak_plugin.check_code(text, strict=False, allowed_chars=None, embedded=False)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) == 1
        assert result["score"] > 0.0
        
        # Vérifier que le fragment détecté est correct
        fragment = result["fragments"][0]
        assert fragment["value"] == "NakNanak"
        assert text[fragment["start"]:fragment["end"]] == "NakNanak"

    def test_check_code_smooth_non_embedded_with_non_nak_nak_chars(self, nak_nak_plugin):
        """Teste la vérification de code en mode smooth avec embedded=False et caractères non Nak Nak."""
        # Texte avec un code Nak Nak et des caractères non Nak Nak
        text = "Nak ABC Nanak"
        
        # Vérification en mode smooth avec embedded=False
        result = nak_nak_plugin.check_code(text, strict=False, allowed_chars=None, embedded=False)
        
        # Vérifier que le code a été détecté malgré la présence de caractères non Nak Nak
        assert result["is_match"] == True
        assert len(result["fragments"]) > 0
        assert result["score"] > 0.0
        
        # Vérifier que les fragments détectés sont corrects
        assert any(frag["value"] == "Nak" for frag in result["fragments"])
        assert any(frag["value"] == "Nanak" for frag in result["fragments"])

    def test_execute_decode_strict_non_embedded_valid(self, nak_nak_plugin):
        """Teste la méthode execute en mode decode strict avec embedded=False sur un texte valide."""
        # Texte composé uniquement de code Nak Nak valide
        text = "Nak Nanak"  # '01' en code Nak Nak
        
        # Exécution avec embedded=False en mode decode strict
        result = nak_nak_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "strict",
            "embedded": False
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        # Le résultat devrait contenir un caractère correspondant à la valeur ASCII hex 01
        assert len(result["result"]["decoded_text"]) > 0

    def test_execute_decode_strict_non_embedded_with_allowed_chars(self, nak_nak_plugin):
        """Teste la méthode execute en mode decode strict avec embedded=False et caractères autorisés."""
        # Texte avec code Nak Nak et caractères autorisés
        text = "Nak Nanak."  # '01' en code Nak Nak avec un point
        
        # Exécution avec embedded=False en mode decode strict et caractères autorisés
        result = nak_nak_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "strict",
            "embedded": False,
            "allowed_chars": "."
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        # Le résultat devrait contenir un caractère correspondant à la valeur ASCII hex 01
        assert len(result["result"]["decoded_text"]) > 0

    def test_execute_decode_strict_non_embedded_invalid(self, nak_nak_plugin):
        """Teste la méthode execute en mode decode strict avec embedded=False sur un texte invalide."""
        # Texte avec caractères non Nak Nak
        text = "Nak ABC Nanak"
        
        # Exécution avec embedded=False en mode decode strict
        result = nak_nak_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "strict",
            "embedded": False
        })
        
        # Vérifier que le décodage a échoué (car le texte contient des caractères non Nak Nak)
        assert "error" in result

    def test_execute_decode_smooth_non_embedded_valid(self, nak_nak_plugin):
        """Teste la méthode execute en mode decode smooth avec embedded=False sur un texte valide."""
        # Texte avec un code Nak Nak
        text = "NakNanak"  # '01' en code Nak Nak
        
        # Exécution en mode decode smooth avec embedded=False
        result = nak_nak_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "smooth",
            "embedded": False
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        # Le résultat devrait contenir un caractère correspondant à la valeur ASCII hex 01
        assert len(result["result"]["decoded_text"]) > 0

    def test_execute_decode_smooth_non_embedded_with_non_nak_nak_chars(self, nak_nak_plugin):
        """Teste la méthode execute en mode decode smooth avec embedded=False et caractères non Nak Nak."""
        # Texte avec un code Nak Nak et des caractères non Nak Nak
        text = "Nak ABC Nanak"
        
        # Exécution en mode decode smooth avec embedded=False
        result = nak_nak_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "smooth",
            "embedded": False
        })
        
        # Vérifier que le décodage a réussi malgré la présence de caractères non Nak Nak
        assert "result" in result
        assert "decoded_text" in result["result"]
        # Le résultat devrait contenir au moins un caractère décodé
        assert len(result["result"]["decoded_text"]) > 0

    def test_execute_decode_smooth_special_characters(self, nak_nak_plugin):
        """Teste la méthode execute en mode decode smooth avec des caractères spéciaux autorisés."""
        # Texte avec un code Nak Nak et des caractères spéciaux
        text = "N 45° Nak.32' E 005° Nanak.18'"
        
        # Caractères spéciaux autorisés
        allowed_chars = " °'.NESW0123456789"
        
        # Exécution en mode decode smooth avec caractères spéciaux autorisés
        result = nak_nak_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "smooth",
            "embedded": False,
            "allowed_chars": allowed_chars
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        # Vérifier que les codes Nak Nak ont été décodés
        assert len(result["result"]["decoded_text"]) > 0

    def test_encode_simple(self, nak_nak_plugin):
        """Teste la méthode encode pour un texte simple."""
        # Texte à encoder (caractère ASCII 'A')
        text = "A"
        
        # Encodage
        encoded = nak_nak_plugin.encode(text)
        
        # Vérifier que l'encodage est correct (doit contenir des syllabes Nak Nak)
        assert "Nak" in encoded

    def test_encode_with_spaces(self, nak_nak_plugin):
        """Teste la méthode encode pour un texte avec espaces."""
        # Texte à encoder
        text = "A B"
        
        # Encodage
        encoded = nak_nak_plugin.encode(text)
        
        # Vérifier que l'encodage est correct et contient un espace
        assert " " in encoded
        assert "Nak" in encoded

    def test_decode_simple(self, nak_nak_plugin):
        """Teste la méthode decode pour un code Nak Nak simple."""
        # Code Nak Nak à décoder (représentant '01' en hexadécimal)
        text = "Nak Nanak"
        
        # Décodage
        decoded = nak_nak_plugin.decode(text)
        
        # Vérifier que le décodage produit un résultat
        assert len(decoded) > 0

    def test_decode_with_spaces(self, nak_nak_plugin):
        """Teste la méthode decode pour un code Nak Nak avec espaces."""
        # Code Nak Nak à décoder avec espaces
        text = "Nak Nanak Nananak"  # '012' en code Nak Nak
        
        # Décodage
        decoded = nak_nak_plugin.decode(text)
        
        # Vérifier que le décodage produit un résultat
        assert len(decoded) > 0

    def test_decode_partial_group(self, nak_nak_plugin):
        """Teste la méthode decode pour un code Nak Nak avec un groupe partiel."""
        # Code Nak Nak à décoder avec un groupe incomplet
        text = "Nak Nanak Na"  # '01' suivi d'un groupe incomplet 'Na'
        
        # Décodage
        decoded = nak_nak_plugin.decode(text)
        
        # Vérifier que le décodage est correct (le groupe partiel est ignoré ou traité comme '?')
        assert len(decoded) > 0
        
    def test_decode_fragments(self, nak_nak_plugin):
        """Teste la méthode decode_fragments pour extraire et décoder des fragments de code Nak Nak."""
        # Texte avec des fragments de code Nak Nak
        text = "Voici un code: Nak Nanak et un autre: Nananak"
        
        # Détection des fragments
        check_result = nak_nak_plugin.check_code(text, strict=False, embedded=True)
        
        # Décodage des fragments
        decoded = nak_nak_plugin.decode_fragments(text, check_result["fragments"])
        
        # Vérifier que le décodage a conservé le texte original et remplacé les fragments
        assert "Voici un code:" in decoded
        assert "et un autre:" in decoded
        assert "Nak Nanak" not in decoded
        assert "Nananak" not in decoded
