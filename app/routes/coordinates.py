from typing import Optional, Dict
import re
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from app.database import db
from app.models.geocache import Geocache

coordinates_bp = Blueprint('coordinates', __name__)

# ...

@coordinates_bp.route('/api/geocaches/save/<int:geocache_id>/coordinates', methods=['POST'])
def save_geocache_coordinates(geocache_id):
    """
    Sauvegarde les coordonnées corrigées d'une géocache.
    """
    try:
        data = request.get_json()
        
        geocache = Geocache.query.get_or_404(geocache_id)
        
        # Mise à jour des coordonnées
        if 'gc_lat_corrected' in data and 'gc_lon_corrected' in data:
            geocache.gc_lat_corrected = data['gc_lat_corrected']
            geocache.gc_lon_corrected = data['gc_lon_corrected']
        
        # Mise à jour du statut solved et de la date
        if 'solved' in data:
            geocache.solved = data['solved']
            geocache.solved_date = datetime.now(timezone.utc)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Coordonnées mises à jour avec succès',
            'gc_lat_corrected': geocache.gc_lat_corrected,
            'gc_lon_corrected': geocache.gc_lon_corrected,
            'solved': geocache.solved,
            'solved_date': geocache.solved_date.isoformat() if geocache.solved_date else None
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ------------------------------------------------------------------------------
# Configuration : listes/mappings pour les directions (Nord, Est, ...)
# ------------------------------------------------------------------------------

NORTH_VARIANTS = ["NORD", "Nord", "nord", "NORTH", "North", "north", "N"]
EAST_VARIANTS  = ["EST", "Est", "est", "EAST", "East", "east", "E"]

DIRECTION_MAP = {
    "NORD": "N", "Nord": "N", "nord": "N",
    "NORTH": "N", "North": "N", "north": "N",
    "N": "N",
    "EST": "E", "Est": "E", "est": "E",
    "EAST": "E", "East": "E", "east": "E",
    "E": "E"
}

# ------------------------------------------------------------------------------
# Fonction utilitaire pour formater une chaîne de chiffres en DDM
# ------------------------------------------------------------------------------

def _format_coordinate(coord_str: str, expected_deg_digits: int) -> str:
    """
    Transforme une chaîne de chiffres en une chaîne formatée en DDM.
    
    Exemple :
      - Pour la latitude "4833787" (expected_deg_digits=2), cela donne "48° 33.787'".
      - Pour la longitude "00638803" (expected_deg_digits=3), cela donne "006° 38.803'".
    
    :param coord_str: La chaîne de chiffres (sans séparateur).
    :param expected_deg_digits: Nombre de chiffres pour la partie degrés (2 pour la latitude, 3 pour la longitude).
    :return: La coordonnée formatée en DDM.
    :raises ValueError: Si la chaîne est trop courte.
    """
    if len(coord_str) < expected_deg_digits + 2:
        raise ValueError("Chaîne de coordonnées trop courte pour le format attendu.")
    
    # Les degrés sont les premiers chiffres
    deg = coord_str[:expected_deg_digits]
    # Les deux chiffres suivants correspondent à la partie entière des minutes
    minutes_int = coord_str[expected_deg_digits:expected_deg_digits+2]
    # Le reste (s'il existe) correspond à la partie décimale des minutes
    decimal_part = coord_str[expected_deg_digits+2:]
    if decimal_part:
        minutes = f"{minutes_int}.{decimal_part}"
    else:
        minutes = minutes_int
    return f"{deg}° {minutes}'"

# ------------------------------------------------------------------------------
# Détection du format DMM classique (par exemple "N 48° 33.787' E 006° 38.803'")
# ------------------------------------------------------------------------------

def _detect_dmm_coordinates(text: str) -> Optional[Dict[str, Optional[str]]]:
    dmm_regex = (
        r'([NS])\s*(\d{1,2})°\s*(\d{1,2}(?:\.\d+)?)[\'"]?\s*'
        r'([EW])\s*(\d{1,3})°\s*(\d{1,2}(?:\.\d+)?)[\'"]?'
    )
    match = re.search(dmm_regex, text)
    if match:
        lat_dir, lat_deg, lat_min, lon_dir, lon_deg, lon_min = match.groups()
        ddm_lat = f"{lat_dir} {lat_deg}° {lat_min}'"
        ddm_lon = f"{lon_dir} {lon_deg}° {lon_min}'"
        return {
            "exist": True,
            "ddm_lat": ddm_lat,
            "ddm_lon": ddm_lon,
            "ddm": f"{ddm_lat} {ddm_lon}"
        }
    return None

# ------------------------------------------------------------------------------
# Détection du format variant (ex : "NORD 4833787 EST 638803")
# ------------------------------------------------------------------------------

def _detect_variant_coordinates(text: str) -> Optional[Dict[str, Optional[str]]]:
    """
    Détecte les coordonnées au format variant, par exemple :
      - "NORD 4833787 EST 638803"
      - "NORD\n4833787\nEST\n638803"
      - "Nord / 4833787 / Est / 638803"
    
    On se base sur les listes NORTH_VARIANTS et EAST_VARIANTS.
    Pour la latitude, on attend une chaîne de 7 chiffres, et pour la longitude une chaîne de 6 à 8 chiffres.
    Si la longitude comporte moins de 8 chiffres, on la complète avec des zéros à gauche.
    """
    # Construction des patterns pour les directions
    north_pattern = '|'.join(NORTH_VARIANTS)
    east_pattern  = '|'.join(EAST_VARIANTS)
    
    # Le pattern autorise espaces, retours à la ligne ou "/" comme séparateurs
    pattern = rf"(?P<lat_dir>{north_pattern})\s*[/\n\s]*\s*(?P<lat>\d{{7}})\s*(?P<lon_dir>{east_pattern})\s*[/\n\s]*\s*(?P<lon>\d{{6,8}})"
    
    match = re.search(pattern, text)
    if match:
        lat_dir_raw = match.group("lat_dir")
        lon_dir_raw = match.group("lon_dir")
        lat_digits  = match.group("lat")
        lon_digits  = match.group("lon")
        
        # Normalisation des directions pour obtenir "N" et "E"
        lat_dir = DIRECTION_MAP.get(lat_dir_raw, lat_dir_raw[0].upper())
        lon_dir = DIRECTION_MAP.get(lon_dir_raw, lon_dir_raw[0].upper())
        
        try:
            # Pour la latitude, si nécessaire, compléter à 7 chiffres
            if len(lat_digits) < 7:
                lat_digits = lat_digits.zfill(7)
            ddm_lat = f"{lat_dir} " + _format_coordinate(lat_digits, expected_deg_digits=2)
        except ValueError:
            ddm_lat = None
        
        try:
            # Pour la longitude, compléter à 8 chiffres si nécessaire
            if len(lon_digits) < 8:
                lon_digits = lon_digits.zfill(8)
            ddm_lon = f"{lon_dir} " + _format_coordinate(lon_digits, expected_deg_digits=3)
        except ValueError:
            ddm_lon = None
        
        if ddm_lat and ddm_lon:
            return {
                "exist": True,
                "ddm_lat": ddm_lat,
                "ddm_lon": ddm_lon,
                "ddm": f"{ddm_lat} {ddm_lon}"
            }
    return None

# ------------------------------------------------------------------------------
# Fonction principale de détection multi-format
# ------------------------------------------------------------------------------

def detect_gps_coordinates(text: str) -> Dict[str, Optional[str]]:
    """
    Recherche des coordonnées GPS dans un texte en testant plusieurs formats.
    
    Le dictionnaire retourné contient :
      - 'exist': True si une coordonnée a été trouvée, sinon False.
      - 'ddm_lat': Latitude formatée en DDM.
      - 'ddm_lon': Longitude formatée en DDM.
      - 'ddm': Latitude et longitude combinées.
    """
    detection_functions = [
        _detect_dmm_coordinates,      # Format DMM standard
        _detect_variant_coordinates,  # Format variant
        # Vous pouvez ajouter d'autres fonctions ici.
    ]
    
    for detect_func in detection_functions:
        result = detect_func(text)
        if result and result.get("exist"):
            return result
    
    return {
        "exist": False,
        "ddm_lat": None,
        "ddm_lon": None,
        "ddm": None
    }
