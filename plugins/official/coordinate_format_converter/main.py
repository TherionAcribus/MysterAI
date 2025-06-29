import re
import time
from typing import Tuple, Dict

# Tentative d'import pour bénéficier d'un utilitaire déjà présent dans le projet
try:
    from app.utils.coordinates import decimal_to_gc_coords  # type: ignore
except Exception:
    decimal_to_gc_coords = None  # Fallback si le module n'est pas accessible


class CoordinateFormatConverterPlugin:
    """Plugin pour convertir des coordonnées géographiques entre les formats
    DD (degrés décimaux), DMM (degrés + minutes décimales) et DMS
    (degrés + minutes + secondes).
    """

    SUPPORTED_FORMATS = {"dd", "dmm", "dms", "utm"}

    def __init__(self):
        self.name = "coordinate_format_converter"
        self.description = (
            "Convertit des coordonnées entre DD, DMM et DMS. "
            "Prévu pour être étendu à d'autres formats ultérieurement."
        )

    # ------------------------------------------------------------------
    # 1) Fonctions privées : parsing des différents formats
    # ------------------------------------------------------------------
    def _parse_dd(self, text: str) -> Tuple[float, float]:
        """Analyse un texte contenant des coordonnées DD et renvoie
        (latitude, longitude) en degrés décimaux.
        Exemples acceptés :
            - "49.60117 5.35098"
            - "49.60117,5.35098"
            - "N 49.60117 E 5.35098"
            - "49.60117N 5.35098E"
        """
        # Normaliser la chaîne
        txt = text.replace(",", " ")
        # Extraire tous les nombres décimaux
        numbers = re.findall(r"[-+]?[0-9]*\.?[0-9]+", txt)
        if len(numbers) < 2:
            raise ValueError("Impossible de détecter deux valeurs décimales dans le texte fourni")
        lat = float(numbers[0])
        lon = float(numbers[1])

        # Déterminer les orientations éventuelles
        if re.search(r"[Ss]", txt) and not re.search(r"[Nn]", txt):
            lat = -abs(lat)
        if re.search(r"[Ww]", txt) and not re.search(r"[Ee]", txt):
            lon = -abs(lon)

        # Validation des intervalles plausibles pour des coordonnées DD
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError("Valeurs hors plage DD")

        return lat, lon

    def _parse_dmm(self, text: str) -> Tuple[float, float]:
        """Parse le format DMM (degrés + minutes décimales) et renvoie
        (lat, lon) en décimal.

        Exemple : "N 49° 36.070' E 005° 21.059'"
        """
        # Regex pour latitude puis longitude
        pattern = (
            r"([NS])\s*(\d{1,2})[°\s]+([0-9]+(?:\.[0-9]+)?)'?.*?"  # latitude
            r"([EW])\s*(\d{1,3})[°\s]+([0-9]+(?:\.[0-9]+)?)'?"       # longitude
        )
        m = re.search(pattern, text, re.IGNORECASE)
        if not m:
            raise ValueError("Format DMM non reconnu")

        lat_dir, lat_deg, lat_min, lon_dir, lon_deg, lon_min = m.groups()
        lat = int(lat_deg) + float(lat_min) / 60.0
        lon = int(lon_deg) + float(lon_min) / 60.0
        if lat_dir.upper() == "S":
            lat = -lat
        if lon_dir.upper() == "W":
            lon = -lon
        return lat, lon

    def _parse_dms(self, text: str) -> Tuple[float, float]:
        """Parse le format DMS (degrés, minutes, secondes) et renvoie (lat, lon) en décimal.

        Exemple : "N 49° 36' 04.2\" E 005° 21' 03.5\""
        """
        pattern = (
            r"([NS])\s*(\d{1,2})[°\s]+(\d{1,2})[']+\s*([0-9]+(?:\.[0-9]+)?)\"?\s*"  # lat
            r"([EW])\s*(\d{1,3})[°\s]+(\d{1,2})[']+\s*([0-9]+(?:\.[0-9]+)?)\"?"     # lon
        )
        m = re.search(pattern, text, re.IGNORECASE)
        if not m:
            raise ValueError("Format DMS non reconnu")
        (
            lat_dir,
            lat_deg,
            lat_min,
            lat_sec,
            lon_dir,
            lon_deg,
            lon_min,
            lon_sec,
        ) = m.groups()
        lat = int(lat_deg) + int(lat_min) / 60.0 + float(lat_sec) / 3600.0
        lon = int(lon_deg) + int(lon_min) / 60.0 + float(lon_sec) / 3600.0
        if lat_dir.upper() == "S":
            lat = -lat
        if lon_dir.upper() == "W":
            lon = -lon
        return lat, lon

    def _parse_utm(self, text: str) -> Tuple[float, float]:
        """Analyse une chaîne UTM comme '31U 334785 5499708' et renvoie (lat, lon) décimaux."""
        cleaned = re.sub(r"[,;]", " ", text).strip()
        parts = cleaned.split()
        if len(parts) < 3:
            raise ValueError(
                "Format UTM attendu: <zone><lettre> easting northing ou <zone> <lettre> easting northing"
            )

        # Cas 1 : zone et lettre collées (31U)
        zone_number = None
        zone_letter = None
        easting_idx = 1  # index du easting dans parts par défaut

        first_token = parts[0]
        m = re.match(r"^(\d{1,2})([A-Z])$", first_token, re.IGNORECASE)
        if m:
            # Format compact (31U ...)
            zone_number = int(m.group(1))
            zone_letter = m.group(2).upper()
        else:
            # Format avec espace entre nombre et lettre (31 U ...)
            if len(parts) < 4:
                raise ValueError("Format UTM incomplet, il manque des éléments")
            if not first_token.isdigit() or len(parts[1]) != 1 or not parts[1].isalpha():
                raise ValueError("Format UTM invalide")
            zone_number = int(first_token)
            zone_letter = parts[1].upper()
            easting_idx = 2  # easting et northing décalés d'un index

        # Extraction des valeurs numériques
        easting = float(parts[easting_idx])
        northing = float(parts[easting_idx + 1])

        # Vérifier pyproj
        try:
            import pyproj  # type: ignore
        except ImportError:  # pragma: no cover
            raise ValueError("pyproj n'est pas installé, conversion UTM impossible")

        hemisphere_north = zone_letter >= "N"
        epsg_code = 32600 + zone_number if hemisphere_north else 32700 + zone_number
        transformer = pyproj.Transformer.from_crs(f"EPSG:{epsg_code}", 4326, always_xy=True)
        lon, lat = transformer.transform(easting, northing)
        return lat, lon

    def _parse(self, text: str, fmt: str) -> Tuple[float, float]:
        fmt = fmt.lower()
        if fmt == "dd":
            return self._parse_dd(text)
        if fmt == "dmm":
            return self._parse_dmm(text)
        if fmt == "dms":
            return self._parse_dms(text)
        if fmt == "utm":
            return self._parse_utm(text)
        raise ValueError(f"Format source non supporté: {fmt}")

    # ------------------------------------------------------------------
    # 2) Fonctions privées : formatage vers différents formats
    # ------------------------------------------------------------------
    def _format_dd(self, lat: float, lon: float) -> str:
        lat_dir = "N" if lat >= 0 else "S"
        lon_dir = "E" if lon >= 0 else "W"
        return f"{lat_dir} {abs(lat):.5f}° {lon_dir} {abs(lon):.5f}°"

    def _format_dmm(self, lat: float, lon: float) -> str:
        lat_dir = "N" if lat >= 0 else "S"
        lon_dir = "E" if lon >= 0 else "W"
        lat_deg = int(abs(lat))
        lon_deg = int(abs(lon))
        lat_min = (abs(lat) - lat_deg) * 60.0
        lon_min = (abs(lon) - lon_deg) * 60.0
        return (
            f"{lat_dir} {lat_deg:02d}° {lat_min:06.3f}' "
            f"{lon_dir} {lon_deg:03d}° {lon_min:06.3f}'"
        )

    def _format_dms(self, lat: float, lon: float) -> str:
        lat_dir = "N" if lat >= 0 else "S"
        lon_dir = "E" if lon >= 0 else "W"
        lat_deg = int(abs(lat))
        lon_deg = int(abs(lon))
        lat_min_full = (abs(lat) - lat_deg) * 60.0
        lon_min_full = (abs(lon) - lon_deg) * 60.0
        lat_min = int(lat_min_full)
        lon_min = int(lon_min_full)
        lat_sec = (lat_min_full - lat_min) * 60.0
        lon_sec = (lon_min_full - lon_min) * 60.0
        return (
            f"{lat_dir} {lat_deg:02d}° {lat_min:02d}' {lat_sec:04.1f}\" "
            f"{lon_dir} {lon_deg:03d}° {lon_min:02d}' {lon_sec:04.1f}\""
        )

    def _format_utm(self, lat: float, lon: float) -> str:
        """Formate un couple (lat, lon) décimaux en chaîne UTM."""
        try:
            import pyproj  # type: ignore
        except ImportError:  # pragma: no cover
            raise ValueError("pyproj n'est pas installé, conversion UTM impossible")

        zone_number = int((lon + 180) / 6) + 1
        hemisphere_north = lat >= 0
        epsg_code = 32600 + zone_number if hemisphere_north else 32700 + zone_number
        transformer = pyproj.Transformer.from_crs(4326, f"EPSG:{epsg_code}", always_xy=True)
        easting, northing = transformer.transform(lon, lat)
        zone_letter = self._latitude_to_zone_letter(lat)
        hemisphere_letter = zone_letter  # already indicates hemisphere
        return f"{zone_number}{hemisphere_letter} {int(easting)} {int(northing)}"

    def _format(self, lat: float, lon: float, fmt: str) -> str:
        fmt = fmt.lower()
        if fmt == "dd":
            return self._format_dd(lat, lon)
        if fmt == "dmm":
            return self._format_dmm(lat, lon)
        if fmt == "dms":
            return self._format_dms(lat, lon)
        if fmt == "utm":
            return self._format_utm(lat, lon)
        raise ValueError(f"Format cible non supporté: {fmt}")

    def _latitude_to_zone_letter(self, lat: float) -> str:
        """Convertit la latitude en lettre de zone UTM (C..X, sans I ni O)"""
        if -80 <= lat <= 84:
            zone_letters = "CDEFGHJKLMNPQRSTUVWXX"
            idx = int((lat + 80) // 8)
            return zone_letters[idx]
        raise ValueError("Latitude hors des limites UTM")

    # ------------------------------------------------------------------
    # 3) Point d'entrée principal
    # ------------------------------------------------------------------
    def execute(self, inputs: Dict) -> Dict:
        """Méthode appelée par le PluginManager.
        Paramètres attendus :
            - coordinates: str  → les coordonnées à convertir
            - source_format: str → dd | dmm | dms | utm | auto
            - target_format: str → dd | dmm | dms | utm
        """
        start_time = time.time()

        coord_text = inputs.get("coordinates", "")
        src_fmt = inputs.get("source_format", "dmm").lower()
        tgt_fmt = inputs.get("target_format", "dd").lower()
        embedded = inputs.get("embedded", False)
        auto_detect = src_fmt == "auto"

        # Réponse standardisée
        response = {
            "status": "success",
            "plugin_info": {
                "name": self.name,
                "version": "1.0.0",
                "execution_time": 0,
            },
            "inputs": inputs.copy(),
            "results": [],
            "summary": {
                "best_result_id": None,
                "total_results": 0,
                "message": "",
            },
        }

        # Validation des formats demandés
        if (not auto_detect and src_fmt not in self.SUPPORTED_FORMATS) or tgt_fmt not in self.SUPPORTED_FORMATS:
            response["status"] = "error"
            response["summary"]["message"] = "Format source ou cible non supporté"
            return response

        try:
            results = []

            # Détection automatique : tenter chaque format et collecter les réussites
            candidate_formats = self.SUPPORTED_FORMATS if auto_detect else [src_fmt]

            for fmt in candidate_formats:
                try:
                    lat, lon = self._parse(coord_text, fmt)
                except ValueError:
                    continue  # Essai suivant si échec

                converted = self._format(lat, lon, tgt_fmt)

                if decimal_to_gc_coords:
                    ddm_lat, ddm_lon = decimal_to_gc_coords(lat, lon)
                else:
                    ddm_lat = ddm_lon = None

                coordinates_info = {
                    "exist": True,
                    "ddm_lat": ddm_lat,
                    "ddm_lon": ddm_lon,
                    "ddm": f"{ddm_lat} {ddm_lon}" if ddm_lat and ddm_lon else None,
                    "decimal": {"latitude": lat, "longitude": lon},
                }

                result = {
                    "id": f"result_{len(results)+1}",
                    "text_output": converted,
                    "confidence": 1.0,
                    "parameters": {
                        "source_format": fmt,
                        "target_format": tgt_fmt,
                    },
                    "coordinates": coordinates_info,
                }
                results.append(result)

            if not results:
                raise ValueError("Aucun format source reconnu")

            # Ajouter tous les résultats
            response["results"].extend(results)
            response["summary"]["best_result_id"] = results[0]["id"]
            response["summary"]["total_results"] = len(results)
            response["summary"]["message"] = (
                "Conversion réalisée avec succès" if len(results) == 1 else "Plusieurs formats possibles"
            )
        except ValueError as exc:
            response["status"] = "error"
            response["summary"]["message"] = str(exc)
        except Exception as exc:
            response["status"] = "error"
            response["summary"]["message"] = f"Erreur inattendue : {str(exc)}"

        # Temps d'exécution
        response["plugin_info"]["execution_time"] = int((time.time() - start_time) * 1000)
        return response 