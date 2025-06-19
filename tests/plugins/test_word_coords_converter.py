import sys
import os
import pytest

# Ajouter la racine du projet au path pour les imports directs
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from plugins.official.word_coords_converter.main import WordCoordsConverterPlugin


@pytest.fixture
def converter_plugin():
    """Fixture retournant une instance du plugin."""
    return WordCoordsConverterPlugin()


def test_english_conversion(converter_plugin):
    text = (
        "north thirty nine degrees zeros point two six nine by "
        "west seventy six degrees forty five point seven seven four"
    )
    result = converter_plugin.execute({
        "text": text,
        "language_override": "auto",
        "enable_scoring": False
    })

    assert result["status"] in {"success", "partial_success"}
    assert result["results"], "Aucun résultat retourné"
    output = result["results"][0]["text_output"]
    assert output.startswith("N 39° 00.269"), f"Sortie inattendue: {output}"
    assert "W 76° 45.774" in output, f"Sortie inattendue: {output}"


def test_french_conversion(converter_plugin):
    text = (
        "nord quarante neuf degrés zéro point deux six neuf ouest soixante dix degrés quarante cinq point sept sept quatre"
    )
    result = converter_plugin.execute({
        "text": text,
        "language_override": "auto",
        "enable_scoring": False
    })

    assert result["status"] in {"success", "partial_success"}
    assert result["results"], "Aucun résultat retourné"
    output = result["results"][0]["text_output"]
    assert output.startswith("N 49° 00.269"), f"Sortie inattendue: {output}"
    assert "W 70° 45.774" in output, f"Sortie inattendue: {output}" 