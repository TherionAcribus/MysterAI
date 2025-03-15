import re
from pyproj import Geod

class MovePointPlugin:
    """
    Plugin pour :
      - Parse une coordonnée au format 'N dd° mm.mmm E dd° mm.mmm'
      - Appliquer un déplacement d'une distance donnée (m, km, miles) à un azimut
      - Renvoyer la nouvelle coordonnée dans le même format.
    """

    def __init__(self):
        self.name = "move_point_plugin"
        self.description = (
            "Déplace un point de 'distance' (en m, km, miles) selon un 'bearing_deg'"
            " et renvoie la nouvelle coordonnée au format 'N dd° mm.mmm E dd° mm.mmm'."
        )

        # Objet Geod pour les calculs sur ellipsoïde WGS84
        self.geod = Geod(ellps="WGS84")

    def parse_coord(self, coord_str: str):
        """
        Parse une coordonnée du type :
          "N 49° 12.374 E 5° 52.727"
        ou  "S 03° 12.123 W 043° 59.999"
        
        Retourne (lat_dec, lon_dec) en degrés décimaux.
        """
        pattern = r"""
            ^\s*([NS])\s+(\d{1,2})°\s+(\d{1,2}\.\d+)\s+
            ([EW])\s+(\d{1,3})°\s+(\d{1,2}\.\d+)
            \s*$
        """
        regex = re.compile(pattern, re.VERBOSE | re.IGNORECASE)
        match = regex.match(coord_str.strip())
        if not match:
            raise ValueError(f"Format de coordonnées invalide: '{coord_str}'")

        ns, lat_deg_str, lat_min_str, ew, lon_deg_str, lon_min_str = match.groups()

        lat_deg = float(lat_deg_str)
        lat_min = float(lat_min_str)
        lon_deg = float(lon_deg_str)
        lon_min = float(lon_min_str)

        # Conversion en degrés décimaux
        lat_dec = lat_deg + (lat_min / 60.0)
        lon_dec = lon_deg + (lon_min / 60.0)

        # Appliquer signe
        if ns.upper() == 'S':
            lat_dec = -lat_dec
        if ew.upper() == 'W':
            lon_dec = -lon_dec

        return lat_dec, lon_dec

    def format_coord(self, lat_dec: float, lon_dec: float):
        """
        Convertit lat_dec, lon_dec (degrés décimaux) au format :
          'N dd° mm.mmm E dd° mm.mmm'
        ou  'S dd° mm.mmm W dd° mm.mmm'
        """
        # Déterminer N/S
        if lat_dec < 0:
            ns = 'S'
            lat_dec = -lat_dec
        else:
            ns = 'N'

        # Déterminer E/W
        if lon_dec < 0:
            ew = 'W'
            lon_dec = -lon_dec
        else:
            ew = 'E'

        # Extraire partie degrés et minutes
        lat_deg_int = int(lat_dec)  # partie entière
        lat_min = (lat_dec - lat_deg_int) * 60.0

        lon_deg_int = int(lon_dec)
        lon_min = (lon_dec - lon_deg_int) * 60.0

        # Formater avec 3 décimales pour les minutes
        # Ex: N 49° 12.374 E 5° 52.727
        return f"{ns} {lat_deg_int}° {lat_min:.3f} {ew} {lon_deg_int}° {lon_min:.3f}"

    def convert_distance_to_meters(self, distance: float, unit: str) -> float:
        """
        Convertit la distance en mètres selon l'unité (m, km, miles).
        """
        unit = unit.lower()
        if unit == 'm':
            return distance
        elif unit == 'km':
            return distance * 1000.0
        elif unit in ['mile', 'miles']:
            return distance * 1609.344  # 1 mile ~ 1609.344 m
        else:
            raise ValueError(f"Unité de distance inconnue: '{unit}'")

    def move_point(self, lat, lon, distance_m, bearing_deg):
        """
        Déplace le point (lat, lon) de 'distance_m' mètres
        selon un azimut 'bearing_deg' (0° = Nord).
        Retourne (new_lat, new_lon) en degrés décimaux.
        """
        # Geod.fwd prend (lon, lat, azimut, distance) en entrée
        lon2, lat2, _ = self.geod.fwd(lon, lat, bearing_deg, distance_m, radians=False)
        return lat2, lon2

    def execute(self, inputs: dict):
        """
        Point d'entrée PluginManager.
        Inputs:
          - coord_str (str) : ex "N 49° 12.374 E 5° 52.727"
          - bearing_deg (float) : ex 59.0
          - distance (float)
          - distance_unit (str) : "m", "km", "miles"
        
        Output:
          {
            "new_coord_str": "N 49° 12.XXX E 5° 52.XXX"
          }
        """
        print(inputs)
        coord_str = inputs.get("text", "")
        bearing_deg = float(inputs.get("bearing_deg", 0.0))
        distance_val = float(inputs.get("distance", 0.0))
        distance_unit = inputs.get("distance_unit", "m")

        if not coord_str:
            raise ValueError("coord_str manquant ou vide")

        # 1. Parser la coordonnée => lat/lon (degrés décimaux)
        lat_dec, lon_dec = self.parse_coord(coord_str)

        # 2. Convertir la distance en mètres
        dist_m = self.convert_distance_to_meters(distance_val, distance_unit)

        # 3. Calculer la nouvelle position
        new_lat, new_lon = self.move_point(lat_dec, lon_dec, dist_m, bearing_deg)
        print(lat_dec, lon_dec, dist_m, bearing_deg)
        print(new_lat, new_lon)

        # 4. Reformater la sortie => 'N 49° 12.XXX E 5° 52.XXX'
        new_coord_str = self.format_coord(new_lat, new_lon)

        print('new_coord_str', new_coord_str)
        
        # Séparer la latitude et la longitude pour faciliter l'utilisation
        parts = new_coord_str.split()
        if len(parts) >= 6:
            gc_lat = f"{parts[0]} {parts[1]} {parts[2]}"
            gc_lon = f"{parts[3]} {parts[4]} {parts[5]}"
        else:
            gc_lat = ""
            gc_lon = ""

        return {
            "text_output": new_coord_str,
            "gc_lat": gc_lat,
            "gc_lon": gc_lon
        }