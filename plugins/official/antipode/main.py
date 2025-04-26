import re

class AntipodePlugin:
    """
    Plugin permettant de :
      1. Parser des coordonnées au format 'Degrés, Minutes décimales' (N dd° mm.mmm E ddd° mm.mmm).
      2. Convertir en degrés décimaux (WGS84).
      3. Calculer les coordonnées de l'antipode.
    """

    def __init__(self):
        self.name = "antipode_plugin"
        self.description = (
            "Plugin pour calculer l'antipode de coordonnées 'Degrés, Minutes décimales'"
        )

    def parse_degrees_minutes(self, coord_str: str):
        """
        Parse une chaîne de type 'N 49° 12.469 E 005° 53.158'
        et renvoie (latitude, longitude) en degrés décimaux (WGS84).
        
        Exemple format attendu :
            "N 49° 12.469 E 005° 53.158"
         ou  "S 03° 12.123 W 043° 59.999"
        
        Retourne (lat, lon) en float
        """
        pattern = r"""
            ^\s*([NS])\s+(\d{1,2})°\s+(\d{1,2}\.\d+)\s+
            ([EW])\s+(\d{1,3})°\s+(\d{1,2}\.\d+)
            \s*$
        """
        regex = re.compile(pattern, re.VERBOSE | re.IGNORECASE)

        match = regex.match(coord_str.strip())
        if not match:
            raise ValueError(f"Format DDM invalide: '{coord_str}'")

        # Groups:
        # 1 = N ou S
        # 2 = degrés lat
        # 3 = minutes lat
        # 4 = E ou W
        # 5 = degrés lon
        # 6 = minutes lon
        ns, lat_deg_str, lat_min_str, ew, lon_deg_str, lon_min_str = match.groups()

        # Convertir en float
        lat_deg = float(lat_deg_str)
        lat_min = float(lat_min_str)
        lon_deg = float(lon_deg_str)
        lon_min = float(lon_min_str)

        # Convertir en degrés décimaux
        lat_dec = lat_deg + (lat_min / 60.0)
        lon_dec = lon_deg + (lon_min / 60.0)

        # Appliquer signe : S => lat négative, W => lon négative
        if ns.upper() == 'S':
            lat_dec = -lat_dec
        if ew.upper() == 'W':
            lon_dec = -lon_dec

        return lat_dec, lon_dec

    def calculate_antipode(self, lat: float, lon: float):
        """
        Calcule l'antipode d'un point.
        L'antipode est le point diamétralement opposé sur la Terre.
        
        Pour calculer l'antipode:
        - La latitude devient l'opposé (-lat)
        - La longitude est ajustée de 180° (lon ± 180°)
        
        Retourne (antipode_lat, antipode_lon) en degrés décimaux
        """
        # Inverser la latitude
        antipode_lat = -lat
        
        # Ajuster la longitude (lon ± 180°)
        if lon > 0:
            antipode_lon = lon - 180
        else:
            antipode_lon = lon + 180
            
        return antipode_lat, antipode_lon

    def format_degrees_minutes(self, lat: float, lon: float):
        """
        Convertit les coordonnées décimales en format 'Degrés, Minutes décimales'.
        
        Retourne une chaîne au format "N dd° mm.mmm E ddd° mm.mmm" ou équivalent
        """
        # Déterminer les directions
        lat_dir = "N" if lat >= 0 else "S"
        lon_dir = "E" if lon >= 0 else "W"
        
        # Valeurs absolues pour les calculs
        abs_lat = abs(lat)
        abs_lon = abs(lon)
        
        # Partie entière = degrés
        lat_deg = int(abs_lat)
        lon_deg = int(abs_lon)
        
        # Partie décimale convertie en minutes (× 60)
        lat_min = (abs_lat - lat_deg) * 60
        lon_min = (abs_lon - lon_deg) * 60
        
        # Formater la chaîne
        result = f"{lat_dir} {lat_deg:02d}° {lat_min:.3f} {lon_dir} {lon_deg:03d}° {lon_min:.3f}"
        
        return result

    def execute(self, inputs: dict):
        """
        Point d'entrée pour le PluginManager.
        
        Inputs attendus:
          - coordinates (str): coordonnées au format DDM (ex: "N 49° 12.469 E 005° 53.158")
        
        Retourne un dict avec:
        - les coordonnées d'origine
        - les coordonnées de l'antipode
        - l'antipode formaté en DDM
        """
        coord_str = inputs.get("coordinates", "")

        if not coord_str:
            raise ValueError("Coordonnées manquantes ou vides.")

        # 1. Parser => lat/lon en degrés décimaux (WGS84)
        try:
            lat_dec, lon_dec = self.parse_degrees_minutes(coord_str)
        except Exception as e:
            raise ValueError(f"Erreur de parsing: {str(e)}")

        # 2. Calculer l'antipode
        antipode_lat, antipode_lon = self.calculate_antipode(lat_dec, lon_dec)
        
        # 3. Formater l'antipode en DDM
        antipode_formatted = self.format_degrees_minutes(antipode_lat, antipode_lon)

        return {
            "latitude_deg": lat_dec,
            "longitude_deg": lon_dec,
            "antipode_latitude_deg": antipode_lat,
            "antipode_longitude_deg": antipode_lon,
            "antipode_formatted": antipode_formatted,
            "result": {
                "text": {
                    "text_output": antipode_formatted
                },
                "antipode_latitude_deg": antipode_lat,
                "antipode_longitude_deg": antipode_lon,
                "antipode_formatted": antipode_formatted
            }
        }