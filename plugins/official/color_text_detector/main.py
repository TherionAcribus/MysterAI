import re
from bs4 import BeautifulSoup

class ColorTextDetectorPlugin:
    """
    Plugin pour détecter du texte dont la couleur (color) est la même
    que la couleur de fond (background ou background-color).
    Si aucune couleur de fond n'est trouvée, on considère #FFFFFF par défaut.
    """
    def __init__(self):
        self.name = "color_text_detector"
        self.description = "Détecte du texte invisible (couleur = fond), avec fond blanc par défaut"

    def execute(self, inputs):
        """
        Récupère le HTML depuis inputs["html"], parse avec BeautifulSoup,
        et recherche tous les éléments dont la color == background-color (inline style).
        
        Retourne les résultats dans le format standardisé:
        {
            "findings": [
                {
                    "type": str,
                    "content": str,
                    "isInteresting": bool,
                    "description": str (optional)
                }
            ],
            "coordinates": {  # optional, si des coordonnées sont trouvées
                "exist": bool,
                "ddm_lat": str,
                "ddm_lon": str,
                "ddm": str
            }
        }
        """
        html_content = inputs["text"]
        if not html_content:
            return {
                "findings": [],
                "coordinates": {"exist": False}
            }

        soup = BeautifulSoup(html_content, "html.parser")
        findings = []

        # Trouver tous les éléments avec un attribut 'style'
        all_styled_elements = soup.find_all(style=True)

        for elem in all_styled_elements:
            style_attr = elem["style"]
            style_dict = self._parse_inline_style(style_attr)

            # Extraire la color et background-color
            text_color = style_dict.get("color", "").lower().strip()
            bg_color = (
                style_dict.get("background", "") or 
                style_dict.get("background-color", "")
            ).lower().strip()

            # Si le background n'est pas défini, on le considère comme #FFFFFF
            if not bg_color:
                bg_color = "#FFFFFF"

            # Normaliser les deux couleurs
            norm_text_color = self._normalize_color(text_color)
            norm_bg_color = self._normalize_color(bg_color)

            # Si les couleurs sont identiques ou très proches
            if norm_text_color and norm_bg_color and self._colors_are_similar(norm_text_color, norm_bg_color):
                text_content = elem.get_text().strip()
                if text_content:  # On ne garde que les éléments avec du texte
                    findings.append({
                        "type": "hidden_text",
                        "content": text_content,
                        "isInteresting": True,
                        "description": f"Texte caché (couleur: {text_color}, fond: {bg_color})"
                    })

        # Vérifier si des coordonnées sont présentes dans les textes trouvés
        from app.routes.coordinates import detect_gps_coordinates
        coordinates_result = None
        
        for finding in findings:
            coords = detect_gps_coordinates(finding["content"])
            if coords and coords["exist"]:
                coordinates_result = coords
                break

        result = {
            "findings": findings
        }
        
        if coordinates_result:
            result["coordinates"] = coordinates_result

        return result

    # ----------------------------------------------------------------
    # Méthodes internes
    # ----------------------------------------------------------------

    def _parse_inline_style(self, style_str):
        """
        Transforme la chaîne style="color:#FFF; background:#FFFFFF;" 
        en dictionnaire : {"color": "#FFF", "background": "#FFFFFF"}
        """
        style_dict = {}
        # Chaque propriété est généralement séparée par ;
        properties = style_str.split(";")
        for prop in properties:
            prop = prop.strip()
            if ":" not in prop:
                continue
            key, value = prop.split(":", 1)
            key = key.strip().lower()        # ex: "color"
            value = value.strip().lower()    # ex: "#ffffff"
            style_dict[key] = value
        return style_dict

    def _normalize_color(self, color_str):
        """
        Convertit une couleur hex (ou nommée) en une forme normalisée pour comparer.
        - Gère #FFF => #FFFFFF
        - Gère #ffffff => #FFFFFF
        - Gère quelques noms de couleurs de base (white => #FFFFFF, black => #000000...)
        """
        named_colors = {
            "white": "#ffffff",
            "black": "#000000",
            "red": "#ff0000",
            "green": "#008000",
            "blue": "#0000ff",
            # Ajoutez d'autres si nécessaire
        }
        if color_str in named_colors:
            color_str = named_colors[color_str]

        # Regex pour un code hex #FFF ou #FFFFFF
        short_hex_match = re.match(r"^#([0-9a-f]{3})$", color_str)
        if short_hex_match:
            # #FFF => #FFFFFF
            short_hex = short_hex_match.group(1)  # ex: "fff"
            long_hex = "".join([ch*2 for ch in short_hex])  # "ff" "ff" "ff" => "ffffff"
            return f"#{long_hex}".upper()

        hex_match_6 = re.match(r"^#([0-9a-f]{6})$", color_str)
        if hex_match_6:
            return f"#{hex_match_6.group(1).upper()}"

        # Sinon on renvoie la chaîne brute, en majuscules
        return color_str.upper()

    def _colors_are_similar(self, color1, color2):
        """
        Vérifie si deux couleurs sont identiques ou très proches.
        """
        # Pour l'instant, on considère que les couleurs sont similaires si elles sont identiques
        # Vous pouvez ajouter des règles plus complexes ici si nécessaire
        return color1 == color2
