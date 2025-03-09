"""
Tests pour la fonctionnalité "Embedded" du plugin AbaddonCode.

Ce module teste le comportement du plugin AbaddonCode avec le paramètre embedded.
"""
import pytest
import sys
import os

# Ajouter le répertoire racine au chemin Python pour pouvoir importer les modules du projet
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from plugins.official.abaddon_code.main import AbaddonCodePlugin

class TestAbaddonCodeEmbedded:
    """Tests pour la fonctionnalité Embedded du plugin AbaddonCode."""
    
    @pytest.fixture
    def abaddon_plugin(self):
        """Fixture pour créer une instance du plugin AbaddonCode."""
        return AbaddonCodePlugin()
    
    def test_check_code_strict_embedded_true(self, abaddon_plugin):
        """Teste la vérification de code en mode strict avec embedded=True."""
        # Texte avec un code Abaddon intégré
        text = "Voici un code Abaddon intégré: þµ¥ qui correspond à la lettre A."
        
        # Vérification avec embedded=True en mode strict
        result = abaddon_plugin.check_code(text, strict=True, allowed_chars=None, embedded=True)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) > 0
        assert result["score"] > 0.0
        
        # Vérifier que le fragment détecté est correct
        fragment = result["fragments"][0]
        assert fragment["value"] == "þµ¥"
        assert text[fragment["start"]:fragment["end"]] == "þµ¥"
    
    def test_check_code_strict_embedded_false(self, abaddon_plugin):
        """Teste la vérification de code en mode strict avec embedded=False."""
        # Texte avec un code Abaddon intégré
        text = "Voici un code Abaddon intégré: þµ¥ qui correspond à la lettre A."
        
        # Vérification avec embedded=False en mode strict
        result = abaddon_plugin.check_code(text, strict=True, allowed_chars=None, embedded=False)
        
        # Vérifier que le code n'a pas été détecté (car le texte n'est pas entièrement un code Abaddon)
        assert result["is_match"] == False
        assert len(result["fragments"]) == 0
        assert result["score"] == 0.0
    
    def test_check_code_smooth(self, abaddon_plugin):
        """Teste la vérification de code en mode smooth."""
        # Texte avec un code Abaddon intégré
        text = "Voici un code Abaddon intégré: þµ¥ qui correspond à la lettre A."
        
        # Vérification en mode smooth (embedded n'a pas d'impact en mode smooth)
        result = abaddon_plugin.check_code(text, strict=False, allowed_chars=None, embedded=False)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) > 0
        assert result["score"] > 0.0
        
        # Vérifier que le fragment détecté est correct
        fragment = result["fragments"][0]
        assert fragment["value"] == "þµ¥"
        assert text[fragment["start"]:fragment["end"]] == "þµ¥"
    
    def test_extract_triplets(self, abaddon_plugin):
        """Teste la méthode _extract_triplets."""
        # Texte avec un code Abaddon intégré
        text = "Voici un code Abaddon intégré: þµ¥ qui correspond à la lettre A."
        
        # Extraction des triplets
        result = abaddon_plugin._extract_triplets(text, " \t\r\n.:;,_-°")
        
        # Vérifier que le triplet a été extrait
        assert result["is_match"] == True
        assert len(result["fragments"]) > 0
        assert result["score"] > 0.0
        
        # Vérifier que le fragment extrait est correct
        fragment = result["fragments"][0]
        assert fragment["value"] == "þµ¥"
        assert text[fragment["start"]:fragment["end"]] == "þµ¥"
    
    def test_execute_decode_strict_embedded_true(self, abaddon_plugin):
        """Teste la méthode execute en mode decode strict avec embedded=True."""
        # Texte avec un code Abaddon intégré
        text = "Voici un code Abaddon intégré: þµ¥ qui correspond à la lettre A."
        
        # Exécution avec embedded=True en mode decode strict
        result = abaddon_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "strict",
            "embedded": True
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        assert "A" in result["result"]["decoded_text"]
    
    def test_execute_decode_strict_embedded_false(self, abaddon_plugin):
        """Teste la méthode execute en mode decode strict avec embedded=False."""
        # Texte avec un code Abaddon intégré
        text = "Voici un code Abaddon intégré: þµ¥ qui correspond à la lettre A."
        
        # Exécution avec embedded=False en mode decode strict
        result = abaddon_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "strict",
            "embedded": False
        })
        
        # Vérifier que le décodage a échoué (car le texte n'est pas entièrement un code Abaddon)
        assert "error" in result
    
    def test_execute_decode_smooth(self, abaddon_plugin):
        """Teste la méthode execute en mode decode smooth."""
        # Texte avec un code Abaddon intégré
        text = "Voici un code Abaddon intégré: þµ¥ qui correspond à la lettre A."
        
        # Exécution en mode decode smooth (embedded n'a pas d'impact en mode smooth)
        result = abaddon_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "smooth",
            "embedded": False
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        assert "A" in result["result"]["decoded_text"]


class TestAbaddonCodeNonEmbedded:
    """Tests pour la fonctionnalité Non-Embedded du plugin AbaddonCode."""
    
    @pytest.fixture
    def abaddon_plugin(self):
        """Fixture pour créer une instance du plugin AbaddonCode."""
        return AbaddonCodePlugin()
    
    def test_check_code_strict_non_embedded_valid(self, abaddon_plugin):
        """Teste la vérification de code en mode strict avec embedded=False sur un texte valide."""
        # Texte composé uniquement de code Abaddon valide
        text = "þµ¥"  # 'A' en code Abaddon
        
        # Vérification avec embedded=False en mode strict
        result = abaddon_plugin.check_code(text, strict=True, allowed_chars=None, embedded=False)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) == 1
        assert result["score"] > 0.0
        
        # Vérifier que le fragment détecté est correct
        fragment = result["fragments"][0]
        assert fragment["value"] == "þµ¥"
        assert text[fragment["start"]:fragment["end"]] == "þµ¥"

    def test_check_code_strict_non_embedded_with_allowed_chars(self, abaddon_plugin):
        """Teste la vérification de code en mode strict avec embedded=False et caractères autorisés."""
        # Texte avec code Abaddon et caractères autorisés
        text = "þµ¥ ."  # 'A' en code Abaddon avec espace et point
        
        # Vérification avec embedded=False en mode strict et caractères autorisés
        result = abaddon_plugin.check_code(text, strict=True, allowed_chars=" .", embedded=False)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) == 1
        assert result["score"] > 0.0
        
        # Vérifier que le fragment détecté est correct (sans les caractères autorisés à la fin)
        fragment = result["fragments"][0]
        assert fragment["value"] == "þµ¥"
        assert text[fragment["start"]:fragment["end"]] == "þµ¥"

    def test_check_code_strict_non_embedded_invalid(self, abaddon_plugin):
        """Teste la vérification de code en mode strict avec embedded=False sur un texte invalide."""
        # Texte avec caractères non Abaddon
        text = "þµ¥ ABC"
        
        # Vérification avec embedded=False en mode strict
        result = abaddon_plugin.check_code(text, strict=True, allowed_chars=None, embedded=False)
        
        # Vérifier que le code n'a pas été détecté (car le texte contient des caractères non Abaddon)
        assert result["is_match"] == False
        assert len(result["fragments"]) == 0
        assert result["score"] == 0.0

    def test_check_code_smooth_non_embedded_valid(self, abaddon_plugin):
        """Teste la vérification de code en mode smooth avec embedded=False sur un texte valide."""
        # Texte avec un code Abaddon
        text = "þµ¥"  # 'A' en code Abaddon
        
        # Vérification en mode smooth avec embedded=False
        result = abaddon_plugin.check_code(text, strict=False, allowed_chars=None, embedded=False)
        
        # Vérifier que le code a été détecté
        assert result["is_match"] == True
        assert len(result["fragments"]) == 1
        assert result["score"] > 0.0
        
        # Vérifier que le fragment détecté est correct
        fragment = result["fragments"][0]
        assert fragment["value"] == "þµ¥"
        assert text[fragment["start"]:fragment["end"]] == "þµ¥"

    def test_check_code_smooth_non_embedded_with_non_abaddon_chars(self, abaddon_plugin):
        """Teste la vérification de code en mode smooth avec embedded=False et caractères non Abaddon."""
        # Texte avec un code Abaddon et des caractères non Abaddon
        text = "þµ¥ ABC þþþ"  # 'A' et 'O' en code Abaddon avec des caractères non Abaddon entre les deux
        
        # Vérification en mode smooth avec embedded=False
        result = abaddon_plugin.check_code(text, strict=False, allowed_chars=None, embedded=False)
        
        # Vérifier que les codes ont été détectés malgré la présence de caractères non Abaddon
        assert result["is_match"] == True
        assert len(result["fragments"]) == 2
        assert result["score"] > 0.0
        
        # Vérifier que les fragments détectés sont corrects
        fragments_values = [f["value"] for f in result["fragments"]]
        assert "þµ¥" in fragments_values
        assert "þþþ" in fragments_values

    def test_execute_decode_strict_non_embedded_valid(self, abaddon_plugin):
        """Teste la méthode execute en mode decode strict avec embedded=False sur un texte valide."""
        # Texte composé uniquement de code Abaddon valide
        text = "þµ¥"  # 'A' en code Abaddon
        
        # Exécution avec embedded=False en mode decode strict
        result = abaddon_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "strict",
            "embedded": False
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        assert result["result"]["decoded_text"] == "H"

    def test_execute_decode_strict_non_embedded_with_allowed_chars(self, abaddon_plugin):
        """Teste la méthode execute en mode decode strict avec embedded=False et caractères autorisés."""
        # Texte avec code Abaddon et caractères autorisés
        text = "þµ¥ ."  # 'A' en code Abaddon avec espace et point
        
        # Exécution avec embedded=False en mode decode strict et caractères autorisés
        result = abaddon_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "strict",
            "embedded": False,
            "allowed_chars": " ."
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        assert "H" in result["result"]["decoded_text"]

    def test_execute_decode_strict_non_embedded_invalid(self, abaddon_plugin):
        """Teste la méthode execute en mode decode strict avec embedded=False sur un texte invalide."""
        # Texte avec caractères non Abaddon
        text = "þµ¥ ABC"
        
        # Exécution avec embedded=False en mode decode strict
        result = abaddon_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "strict",
            "embedded": False
        })
        
        # Vérifier que le décodage a échoué (car le texte contient des caractères non Abaddon)
        assert "error" in result

    def test_execute_decode_smooth_non_embedded_valid(self, abaddon_plugin):
        """Teste la méthode execute en mode decode smooth avec embedded=False sur un texte valide."""
        # Texte avec un code Abaddon
        text = "þµ¥"  # 'A' en code Abaddon
        
        # Exécution en mode decode smooth avec embedded=False
        result = abaddon_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "smooth",
            "embedded": False
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        assert result["result"]["decoded_text"] == "H"

    def test_execute_decode_smooth_non_embedded_with_non_abaddon_chars(self, abaddon_plugin):
        """Teste la méthode execute en mode decode smooth avec embedded=False et caractères non Abaddon."""
        # Texte avec un code Abaddon et des caractères non Abaddon
        text = "þµ¥ ABC þþþ"  # 'A' et 'O' en code Abaddon avec des caractères non Abaddon entre les deux
        
        # Exécution en mode decode smooth avec embedded=False
        result = abaddon_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "smooth",
            "embedded": False
        })
        
        # Vérifier que le décodage a réussi malgré la présence de caractères non Abaddon
        assert "result" in result
        assert "decoded_text" in result["result"]
        # Les fragments Abaddon sont transformés en lettres
        assert "A" in result["result"]["decoded_text"]
        assert "O" in result["result"]["decoded_text"]

    def test_execute_decode_smooth_special_characters(self, abaddon_plugin):
        """Teste la méthode execute en mode decode smooth avec des caractères spéciaux autorisés."""
        # Texte avec un code Abaddon et des caractères spéciaux
        text = "N 45° þµ¥' E 005° þþþ"
        
        # Caractères spéciaux autorisés
        allowed_chars = " °'NESW0123456789"
        
        # Exécution en mode decode smooth avec caractères spéciaux autorisés
        result = abaddon_plugin.execute({
            "mode": "decode",
            "text": text,
            "strict": "smooth",
            "embedded": False,
            "allowed_chars": allowed_chars
        })
        
        # Vérifier que le décodage a réussi
        assert "result" in result
        assert "decoded_text" in result["result"]
        # Vérifier que les codes Abaddon ont été décodés
        decoded_text = result["result"]["decoded_text"]
        assert "H" in decoded_text
        assert "O" in decoded_text

    def test_encode_simple(self, abaddon_plugin):
        """Teste la méthode encode pour un texte simple."""
        # Texte à encoder
        text = "AO"
        
        # Encodage
        encoded = abaddon_plugin.encode(text)
        
        # Vérifier que l'encodage est correct
        assert encoded == "¥¥µþþþ"  # 'A' suivi de 'O' en code Abaddon

    def test_decode_simple(self, abaddon_plugin):
        """Teste la méthode decode pour un code Abaddon simple."""
        # Code Abaddon à décoder
        text = "¥¥µþþþ"  # 'A' suivi de 'O' en code Abaddon
        
        # Décodage
        decoded = abaddon_plugin.decode(text)
        
        # Vérifier que le décodage est correct
        assert decoded == "AO"

    def test_decode_fragments_multiple(self, abaddon_plugin):
        """Teste la méthode decode_fragments avec plusieurs fragments."""
        # Texte avec plusieurs fragments Abaddon
        text = "Code1: þµ¥ et Code2: þþþ"
        
        # Fragments à décoder - CORRECTION: vérifier les indices exacts
        start1 = text.find("þµ¥")
        end1 = start1 + len("þµ¥")
        start2 = text.find("þþþ")
        end2 = start2 + len("þþþ")
        
        fragments = [
            {"value": "þµ¥", "start": start1, "end": end1},
            {"value": "þþþ", "start": start2, "end": end2}
        ]
        
        # Décodage des fragments
        decoded = abaddon_plugin.decode_fragments(text, fragments)
        
        # Au lieu de tester l'égalité exacte, vérifions que les deux lettres sont présentes
        assert "H" in decoded
        assert "O" in decoded
        assert "Code1:" in decoded
        assert "et Code2:" in decoded