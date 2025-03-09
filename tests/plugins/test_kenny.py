"""
Tests pour la fonctionnalité "Embedded" et "Non-Embedded" du plugin KennyCode.

Ce module teste le comportement du plugin KennyCode avec le paramètre embedded.
"""
import pytest
import sys
import os

# Ajouter le répertoire racine au chemin Python pour pouvoir importer les modules du projet
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from plugins.official.kenny_code.main import KennyCodePlugin

class TestKennyCodePlugin:
    """Tests pour le plugin KennyCode."""
    
    @pytest.fixture
    def kenny_plugin(self):
        """Fixture pour créer une instance du plugin KennyCode."""
        return KennyCodePlugin()
    
    # Tests pour les cas Embedded
    def test_check_code_strict_embedded_true(self, kenny_plugin):
        """Teste la vérification de code en mode strict avec embedded=True."""
        # Texte avec un code Kenny intégré
        text = "Voici un mot en code Kenny: mmm ppm ppp qui signifie 'amn' en clair."
        
        # Vérification avec embedded=True en mode strict
        result = kenny_plugin.check_code(text, strict=True, allowed_chars=None, embedded=True)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) > 0
        assert result["score"] > 0.0
        
    def test_check_code_strict_embedded_false_with_non_kenny_chars(self, kenny_plugin):
        """Teste la vérification de code en mode strict avec embedded=False sur un texte avec caractères non Kenny."""
        # Texte avec un code Kenny intégré
        text = "Voici un mot en code Kenny: mmm ppm ppp qui signifie 'amn' en clair."
        
        # Vérification avec embedded=False en mode strict
        result = kenny_plugin.check_code(text, strict=True, allowed_chars=None, embedded=False)
        
        # Vérifier que le code n'a pas été détecté (car le texte n'est pas entièrement un code Kenny)
        assert result["is_match"] == False
        assert len(result["fragments"]) == 0
        assert result["score"] == 0.0
    
    # Tests pour les cas Non-Embedded
    def test_check_code_strict_non_embedded_valid(self, kenny_plugin):
        """Teste la vérification de code en mode strict avec embedded=False sur un texte valide."""
        # Texte composé uniquement de code Kenny valide
        text = "mmmppp"  # 'an' en Kenny code
        
        # Vérification avec embedded=False en mode strict
        result = kenny_plugin.check_code(text, strict=True, allowed_chars=None, embedded=False)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) == 1
        assert result["score"] > 0.0
        
        # Vérifier que le fragment détecté est correct
        fragment = result["fragments"][0]
        assert fragment["value"] == "mmmppp"
        assert text[fragment["start"]:fragment["end"]] == "mmmppp"

    def test_check_code_strict_non_embedded_with_allowed_chars(self, kenny_plugin):
        """Teste la vérification de code en mode strict avec embedded=False et caractères autorisés."""
        # Texte avec code Kenny et caractères autorisés
        text = "mmm ppp."  # 'a n' en Kenny code avec espace et point
        
        # Vérification avec embedded=False en mode strict et caractères autorisés
        result = kenny_plugin.check_code(text, strict=True, allowed_chars=" .", embedded=False)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) == 1
        assert result["score"] > 0.0
        
        # Vérifier que le fragment détecté est correct
        fragment = result["fragments"][0]
        assert fragment["value"] == "mmm ppp"
        assert text[fragment["start"]:fragment["end"]] == "mmm ppp"

    def test_check_code_strict_non_embedded_invalid(self, kenny_plugin):
        """Teste la vérification de code en mode strict avec embedded=False sur un texte invalide."""
        # Texte avec caractères non Kenny
        text = "mmm ABC ppp"
        
        # Vérification avec embedded=False en mode strict
        result = kenny_plugin.check_code(text, strict=True, allowed_chars=None, embedded=False)
        
        # Vérifier que le code n'a pas été détecté (car le texte contient des caractères non Kenny)
        assert result["is_match"] == False
        assert len(result["fragments"]) == 0
        assert result["score"] == 0.0

    def test_check_code_smooth_non_embedded_valid(self, kenny_plugin):
        """Teste la vérification de code en mode smooth avec embedded=False sur un texte valide."""
        # Texte avec un code Kenny
        text = "mmmppp"  # 'an' en Kenny code
        
        # Vérification en mode smooth avec embedded=False
        result = kenny_plugin.check_code(text, strict=False, allowed_chars=None, embedded=False)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) == 1
        assert result["score"] > 0.0
        
        # Vérifier que le fragment détecté est correct
        fragment = result["fragments"][0]
        assert fragment["value"] == "mmmppp"
        assert text[fragment["start"]:fragment["end"]] == "mmmppp"

    def test_check_code_smooth_non_embedded_with_non_kenny_chars(self, kenny_plugin):
        """Teste la vérification de code en mode smooth avec embedded=False et caractères non Kenny."""
        # Texte avec un code Kenny et des caractères non Kenny
        text = "mmm ABC ppp"
        
        # Vérification en mode smooth avec embedded=False
        result = kenny_plugin.check_code(text, strict=False, allowed_chars=None, embedded=False)
        
        # Vérifier que le code a été détecté malgré la présence de caractères non Kenny
        assert result["is_match"] == True
        assert len(result["fragments"]) > 0
        assert result["score"] > 0.0
        
        # Vérifier que les fragments détectés sont corrects
        assert any(frag["value"] == "mmm" for frag in result["fragments"])
        assert any(frag["value"] == "ppp" for frag in result["fragments"])

    def test_execute_decode_strict_non_embedded_valid(self, kenny_plugin):
        """Teste la méthode execute en mode decode strict avec embedded=False sur un texte valide."""
        # Texte composé uniquement de code Kenny valide
        text = "mmmppp"  # 'an' en Kenny code
        
        # Exécution avec embedded=False en mode decode strict
        result = kenny_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "strict",
            "embedded": False
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        assert result["result"]["decoded_text"] == "an"

    def test_execute_decode_strict_non_embedded_with_allowed_chars(self, kenny_plugin):
        """Teste la méthode execute en mode decode strict avec embedded=False et caractères autorisés."""
        # Texte avec code Kenny et caractères autorisés
        text = "mmm ppp."  # 'a n' en Kenny code avec espace et point
        
        # Exécution avec embedded=False en mode decode strict et caractères autorisés
        result = kenny_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "strict",
            "embedded": False,
            "allowed_chars": " ."
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        assert "a n" in result["result"]["decoded_text"]

    def test_execute_decode_strict_non_embedded_invalid(self, kenny_plugin):
        """Teste la méthode execute en mode decode strict avec embedded=False sur un texte invalide."""
        # Texte avec caractères non Kenny
        text = "mmm ABC ppp"
        
        # Exécution avec embedded=False en mode decode strict
        result = kenny_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "strict",
            "embedded": False
        })
        
        # Vérifier que le décodage a échoué (car le texte contient des caractères non Kenny)
        assert "error" in result

    def test_execute_decode_smooth_non_embedded_valid(self, kenny_plugin):
        """Teste la méthode execute en mode decode smooth avec embedded=False sur un texte valide."""
        # Texte avec un code Kenny
        text = "mmmppp"  # 'an' en Kenny code
        
        # Exécution en mode decode smooth avec embedded=False
        result = kenny_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "smooth",
            "embedded": False
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        assert result["result"]["decoded_text"] == "an"

    def test_execute_decode_smooth_non_embedded_with_non_kenny_chars(self, kenny_plugin):
        """Teste la méthode execute en mode decode smooth avec embedded=False et caractères non Kenny."""
        # Texte avec un code Kenny et des caractères non Kenny
        text = "mmm ABC ppp"
        
        # Exécution en mode decode smooth avec embedded=False
        result = kenny_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "smooth",
            "embedded": False
        })
        
        # Vérifier que le décodage a réussi malgré la présence de caractères non Kenny
        assert "result" in result
        assert "decoded_text" in result["result"]
        assert "a" in result["result"]["decoded_text"]
        assert "n" in result["result"]["decoded_text"]

    def test_execute_decode_smooth_special_characters(self, kenny_plugin):
        """Teste la méthode execute en mode decode smooth avec des caractères spéciaux autorisés."""
        # Texte avec un code Kenny et des caractères spéciaux
        text = "N 45° mmm.32' E 005° ppp.18'"
        
        # Caractères spéciaux autorisés
        allowed_chars = " °'.NESW0123456789"
        
        # Exécution en mode decode smooth avec caractères spéciaux autorisés
        result = kenny_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "smooth",
            "embedded": False,
            "allowed_chars": allowed_chars
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        # Vérifier que les codes Kenny ont été décodés
        decoded_text = result["result"]["decoded_text"]
        assert "a" in decoded_text
        assert "n" in decoded_text

    def test_encode_simple(self, kenny_plugin):
        """Teste la méthode encode pour un texte simple."""
        # Texte à encoder
        text = "an"
        
        # Encodage
        encoded = kenny_plugin.encode(text)
        
        # Vérifier que l'encodage est correct
        assert encoded == "mmmppp"

    def test_encode_with_spaces(self, kenny_plugin):
        """Teste la méthode encode pour un texte avec espaces."""
        # Texte à encoder
        text = "a n"
        
        # Encodage
        encoded = kenny_plugin.encode(text)
        
        # Vérifier que l'encodage est correct
        assert encoded == "mmm ppp"

    def test_decode_simple(self, kenny_plugin):
        """Teste la méthode decode pour un code Kenny simple."""
        # Code Kenny à décoder
        text = "mmmppp"
        
        # Décodage
        decoded = kenny_plugin.decode(text)
        
        # Vérifier que le décodage est correct
        assert decoded == "an"

    def test_decode_with_spaces(self, kenny_plugin):
        """Teste la méthode decode pour un code Kenny avec espaces."""
        # Code Kenny à décoder
        text = "mmm ppp"
        
        # Décodage
        decoded = kenny_plugin.decode(text)
        
        # Vérifier que le décodage est correct
        assert decoded == "a n"

    def test_decode_partial_group(self, kenny_plugin):
        """Teste la méthode decode pour un code Kenny avec un groupe partiel."""
        # Code Kenny à décoder avec un groupe incomplet
        text = "mmmppp mm"  # 'an' suivi d'un groupe incomplet 'mm'
        
        # Décodage
        decoded = kenny_plugin.decode(text)
        
        # Vérifier que le décodage est correct (le groupe partiel est décodé comme '?')
        assert decoded == "an ?"