import re
from plugins.official.projection_calculation.main import ProjectionPlugin

class WherigoReverseDecoderPlugin:
    """
    Plugin pour décoder les coordonnées d'un Wherigo Reverse
    et les convertir en format WGS84 compatible avec Geocaching.
    """

    def __init__(self, projection_plugin=None):
        """
        :param projection_plugin: Une instance du plugin `projection_plugin`
        pour effectuer la conversion des coordonnées.
        """
        if projection_plugin is None:
            projection_plugin = ProjectionPlugin()  

        self.projection_plugin = projection_plugin
        self.name = "wherigo_reverse_decoder"
        self.description = ("Décodage des coordonnées d'un Wherigo Reverse "
                            "et conversion en format WGS84.")
        self.projection_plugin = projection_plugin

    def execute(self, inputs):
        """
        Exécute le décodage.
        :param inputs: dict contenant les paramètres d'entrée.
        :return: dict avec les coordonnées ou un message d'erreur.
        """
        print('INPUTS WHERIGO REVERSE DECODER', inputs)
        numbers_text = inputs.get("text", "").strip()
        strict_mode = inputs.get("strict", True)
        embedded_mode = inputs.get("embedded", False)
        
        if not numbers_text:
            return {
                "result": {
                    "error": "Aucun texte fourni pour l'analyse.",
                    "decoded_text": "Erreur: Aucun texte fourni pour l'analyse."
                }
            }

        try:
            # En fonction du mode, on cherche différemment les nombres
            if embedded_mode:
                # Mode embedded: on cherche 3 nombres de 6 chiffres dans le texte
                fragments = self.find_fragments(numbers_text, strict_mode)
                if not fragments or len(fragments) < 3:
                    return {
                        "result": {
                            "error": "Impossible de trouver trois nombres de 6 chiffres dans l'entrée.",
                            "decoded_text": "Erreur: Impossible de trouver trois nombres de 6 chiffres dans l'entrée."
                        }
                    }
                
                # Utiliser les 3 premiers nombres trouvés
                a, b, c = fragments[:3]
                latitude, longitude = self._decode_coordinates(a, b, c)
                formatted_coords = self._convert_to_wgs84(latitude, longitude)
                
                # Retourner les résultats avec les fragments identifiés dans le format attendu par metadetection
                return {
                    "result": {
                        "decoded_text": formatted_coords,
                        "text": {
                            "text_output": formatted_coords,
                            "text_input": numbers_text,
                            "mode": "decode"
                        },
                        "fragments": fragments,
                        "is_match": True,
                        "score": 1.0
                    }
                }
            else:
                # Mode non-embedded: analyser tout le texte
                if strict_mode:
                    # En mode strict, on vérifie exactement 3 nombres de 6 chiffres
                    numbers = re.findall(r'\b\d{6}\b', numbers_text)
                    if len(numbers) != 3:
                        return {
                            "result": {
                                "error": "Le texte doit contenir exactement trois nombres de 6 chiffres.",
                                "decoded_text": "Erreur: Le texte doit contenir exactement trois nombres de 6 chiffres."
                            }
                        }
                else:
                    # En mode smooth, on extrait au moins 3 nombres de 6 chiffres si possible
                    numbers = re.findall(r'\b\d{6}\b', numbers_text)
                    if len(numbers) < 3:
                        return {
                            "result": {
                                "error": "Impossible de trouver trois nombres de 6 chiffres dans l'entrée.",
                                "decoded_text": "Erreur: Impossible de trouver trois nombres de 6 chiffres dans l'entrée."
                            }
                        }
                
                # Appliquer l'algorithme de décodage
                a, b, c = numbers[:3]
                latitude, longitude = self._decode_coordinates(a, b, c)
                formatted_coords = self._convert_to_wgs84(latitude, longitude)
                
                print('FORMATTED COORDS WIG', formatted_coords)
                
                # Format de retour compatible avec metadetection
                return {
                    "result": {
                        "decoded_text": formatted_coords,
                        "text": {
                            "text_output": formatted_coords,
                            "text_input": numbers_text,
                            "mode": "decode"
                        }
                    }
                }
                
        except Exception as e:
            return {
                "result": {
                    "error": f"Erreur lors du décodage : {str(e)}",
                    "decoded_text": f"Erreur lors du décodage : {str(e)}"
                }
            }

    def find_fragments(self, text, strict=True):
        """
        Cherche des fragments de texte qui pourraient être des nombres de 6 chiffres.
        
        Args:
            text: Texte à analyser
            strict: Mode strict (True) ou smooth (False)
            
        Returns:
            Liste des fragments trouvés (nombres de 6 chiffres)
        """
        if strict:
            # En mode strict, on cherche uniquement des nombres de exactement 6 chiffres
            return re.findall(r'\b\d{6}\b', text)
        else:
            # En mode smooth, on est plus flexible sur les caractères autour
            return re.findall(r'\d{6}', text)

    def check_code(self, text, strict=True, allowed_chars=None, embedded=False):
        """
        Vérifie si le texte contient du code Wherigo Reverse valide.
        
        Args:
            text: Texte à analyser
            strict: Mode strict (True) ou smooth (False)
            allowed_chars: Liste de caractères autorisés en plus des caractères du code
            embedded: True si le texte peut contenir du code intégré
            
        Returns:
            Un dictionnaire contenant:
            - is_match: True si du code valide a été trouvé
            - fragments: Liste des fragments de code trouvés
            - score: Score de confiance (0.0 à 1.0)
        """
        fragments = self.find_fragments(text, strict)
        
        if embedded:
            # En mode embedded, on cherche au moins 3 nombres dans le texte
            is_match = len(fragments) >= 3
            score = min(1.0, len(fragments) / 3.0) if is_match else 0.0
        else:
            # En mode non-embedded, tout le texte doit être des nombres
            if strict:
                # En mode strict, on doit avoir exactement 3 nombres
                pattern = r'^\s*(\d{6})\s+(\d{6})\s+(\d{6})\s*$'
                match = re.search(pattern, text)
                is_match = bool(match)
                score = 1.0 if is_match else 0.0
            else:
                # En mode smooth, on cherche au moins 3 nombres dans le texte
                is_match = len(fragments) >= 3
                # Score basé sur le ratio de chiffres dans le texte
                total_digits = sum(len(frag) for frag in fragments)
                total_chars = len(''.join(c for c in text if c.isdigit() or c.isalpha()))
                score = total_digits / max(1, total_chars) if total_chars > 0 else 0.0
        
        return {
            "is_match": is_match,
            "fragments": fragments[:3] if len(fragments) >= 3 else fragments,
            "score": score
        }

    def decode_fragments(self, text, fragments):
        """
        Décode uniquement les fragments valides dans leur contexte original.
        
        Args:
            text: Texte original contenant les fragments
            fragments: Liste des fragments à décoder
            
        Returns:
            Texte avec les fragments décodés
        """
        if len(fragments) >= 3:
            a, b, c = fragments[:3]
            latitude, longitude = self._decode_coordinates(a, b, c)
            formatted_coords = self._convert_to_wgs84(latitude, longitude)
            return formatted_coords
        return "Pas assez de fragments pour décoder"

    def _decode_coordinates(self, a, b, c):
        """
        Transforme trois nombres en coordonnées géographiques.
        :param a: Premier nombre (str)
        :param b: Deuxième nombre (str)
        :param c: Troisième nombre (str)
        :return: Tuple (latitude, longitude)
        """
        a = int(a)
        b = int(b)
        c = int(c)

        # Déterminer les signes pour lat et lon
        sign_map = {
            1: (1, 1),
            2: (-1, 1),
            3: (1, -1),
            4: (-1, -1)
        }
        lat_sign, lon_sign = sign_map.get((a % 1000 - a % 100) // 100, (0, 0))

        if lat_sign == 0 or lon_sign == 0:
            return 0, 0

        # Calculer la latitude
        if ((c % 100000 - c % 10000) // 10000 + (c % 100 - c % 10) // 10) % 2 == 0:
            lat = lat_sign * (
                (a % 10000 - a % 1000) / 100 +
                (b % 100 - b % 10) / 10 +
                (b % 100000 - b % 10000) / 100000 +
                (c % 1000 - c % 100) / 10000 +
                (a % 1000000 - a % 100000) / 100000000 +
                (c % 100 - c % 10) / 100000 +
                a % 10 * 1.0E-5
            )
        else:
            lat = lat_sign * (
                (b % 1000000 - b % 100000) / 10000 +
                a % 10 +
                (a % 10000 - a % 1000) / 10000 +
                (c % 1000000 - c % 100000) / 10000000 +
                (c % 1000 - c % 100) / 100000 +
                (c % 100 - c % 10) / 100000 +
                (a % 1000000 - a % 100000) / 10000000000
            )

        # Calculer la longitude
        if ((c % 100000 - c % 10000) // 10000 + (c % 100 - c % 10) // 10) % 2 == 0:
            lon = lon_sign * (
                (a % 100000 - a % 10000) / 100 +
                (c % 1000000 - c % 100000) / 10000 +
                c % 10 +
                (b % 1000 - b % 100) / 1000 +
                (b % 1000000 - b % 100000) / 10000000 +
                (a % 100 - a % 10) / 10000 +
                (c % 100000 - c % 10000) / 100000000 +
                b % 10 * 1.0E-5
            )
        else:
            lon = lon_sign * (
                (b % 100 - b % 10) * 10 +
                c % 10 * 10 +
                (a % 100 - a % 10) / 10 +
                (a % 100000 - a % 10000) / 100000 +
                (b % 1000 - b % 100) / 10000 +
                b % 10 * 0.001 +
                (c % 100000 - c % 10000) / 100000000 +
                (b % 100000 - b % 10000) / 1000000000
            )

        return lat, lon

    def _convert_to_wgs84(self, lat, lon):
        """
        Utilise le plugin projection_plugin pour convertir les coordonnées en WGS84.
        :param lat: Latitude brute en degrés décimaux
        :param lon: Longitude brute en degrés décimaux
        :return: dict avec les coordonnées formatées au format Geocaching
        """
        # Convertir les degrés décimaux en format degrés et minutes décimales
        lat_deg = int(abs(lat))
        lat_min = (abs(lat) - lat_deg) * 60
        lon_deg = int(abs(lon))
        lon_min = (abs(lon) - lon_deg) * 60
        
        # Déterminer les hémisphères
        lat_hem = "N" if lat >= 0 else "S"
        lon_hem = "E" if lon >= 0 else "W"
        
        # Formater la chaîne au format attendu: "N dd° mm.mmm E ddd° mm.mmm"
        coordinate_str = f"{lat_hem} {lat_deg:02d}° {lat_min:06.3f} {lon_hem} {lon_deg:03d}° {lon_min:06.3f}"
        
        projection_inputs = {
            "coordinate_str": coordinate_str,
            "target_projection": "WGS84"
        }
        
        # Obtenir les coordonnées projetées
        result = self.projection_plugin.execute(projection_inputs)
        
        # Formater les coordonnées au format Geocaching
        return coordinate_str  # Format Geocaching: N dd° mm.mmm E ddd° mm.mmm
