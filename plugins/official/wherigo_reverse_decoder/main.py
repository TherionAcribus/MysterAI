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
        :param inputs: dict contenant 'numbers' (chaîne de caractères).
        :return: dict avec les coordonnées ou un message d'erreur.
        """
        print('INPUTS', inputs)
        numbers_text = inputs.get("text", "").strip()
        if not numbers_text:
            return {"error": "Aucun texte fourni pour l'analyse."}

        # Extraire trois nombres de 6 chiffres avec une regex
        numbers = re.findall(r'\b\d{6}\b', numbers_text)
        if len(numbers) < 3:
            return {"error": "Impossible de trouver trois nombres de 6 chiffres dans l'entrée."}

        try:
            # Appliquer l'algorithme de décodage
            a, b, c = numbers[:3]
            latitude, longitude = self._decode_coordinates(a, b, c)

            # Conversion avec le plugin projection_plugin
            formatted_coords = self._convert_to_wgs84(latitude, longitude)

            print('FORMATTED_COORDS', formatted_coords)
            return {
                "text_output": formatted_coords
            }
        except Exception as e:
            return {"error": f"Erreur lors du décodage : {str(e)}"}

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
