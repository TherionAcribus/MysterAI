from typing import Optional, Dict
import re
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from app.database import db
from app.models.geocache import Geocache

coordinates_bp = Blueprint('coordinates', __name__)

@coordinates_bp.route('/api/geocaches/save/<int:geocache_id>/coordinates', methods=['POST'])
def save_geocache_coordinates(geocache_id):
    """
    Sauvegarde les coordonnées corrigées d'une géocache.
    """
    print(f"[DEBUG] Sauvegarde des coordonnées pour la géocache {geocache_id}")
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
    print(f"[DEBUG] _format_coordinate: Formatage de '{coord_str}' avec {expected_deg_digits} chiffres pour les degrés")
    
    if len(coord_str) < expected_deg_digits + 2:
        print(f"[DEBUG] _format_coordinate: Erreur - Chaîne trop courte ({len(coord_str)} < {expected_deg_digits + 2})")
        raise ValueError("Chaîne de coordonnées trop courte pour le format attendu.")
    
    # Les degrés sont les premiers chiffres
    deg = coord_str[:expected_deg_digits]
    # Les deux chiffres suivants correspondent à la partie entière des minutes
    minutes_int = coord_str[expected_deg_digits:expected_deg_digits+2]
    # Le reste (s'il existe) correspond à la partie décimale des minutes
    decimal_part = coord_str[expected_deg_digits+2:]
    
    print(f"[DEBUG] _format_coordinate: Décomposition - degrés={deg}, minutes_int={minutes_int}, decimal_part={decimal_part}")
    
    if decimal_part:
        minutes = f"{minutes_int}.{decimal_part}"
    else:
        minutes = minutes_int
        
    result = f"{deg}° {minutes}'"
    print(f"[DEBUG] _format_coordinate: Résultat formaté: {result}")
    return result

# ------------------------------------------------------------------------------
# Détection du format DMM classique (par exemple "N 48° 33.787' E 006° 38.803'")
# ------------------------------------------------------------------------------

def _detect_dmm_coordinates(text: str) -> Optional[Dict[str, Optional[str]]]:
    print(f"[DEBUG] _detect_dmm_coordinates: Analyse du texte: '{text[:100]}...' (tronqué)")
    dmm_regex = (
        r'([NS])\s*(\d{1,2})\s*[°º]\s*(\d{1,2}(?:\.\d+)?)[\'"]?\s*'
        r'([EW])\s*(\d{1,3})\s*[°º]\s*(\d{1,2}(?:\.\d+)?)[\'"]?'
    )
    print(f"[DEBUG] _detect_dmm_coordinates: Regex utilisée: {dmm_regex}")
    match = re.search(dmm_regex, text)
    if match:
        print(f"[DEBUG] _detect_dmm_coordinates: Match trouvé! Groupes: {match.groups()}")
        lat_dir, lat_deg, lat_min, lon_dir, lon_deg, lon_min = match.groups()
        ddm_lat = f"{lat_dir} {lat_deg}° {lat_min}'"
        ddm_lon = f"{lon_dir} {lon_deg}° {lon_min}'"
        print(f"[DEBUG] _detect_dmm_coordinates: Coordonnées formatées: {ddm_lat} {ddm_lon}")
        return {
            "exist": True,
            "ddm_lat": ddm_lat,
            "ddm_lon": ddm_lon,
            "ddm": f"{ddm_lat} {ddm_lon}"
        }
    print("[DEBUG] _detect_dmm_coordinates: Aucun match trouvé")
    return None

# ------------------------------------------------------------------------------
# Détection du format avec tabulations et espaces (ex: "N 48 ° 32 . 296 E 6 ° 40 . 636")
# ------------------------------------------------------------------------------

def _detect_tabspace_coordinates(text: str) -> Optional[Dict[str, Optional[str]]]:
    """
    Détecte les coordonnées au format avec tabulations et espaces, par exemple :
      - "N    48 ° 32 .  296\nE    6  ° 40 .  636"
      - "N\t48 ° 32 . 296\r\nE\t6 ° 40 . 636"
    
    Ce format est plus souple et accepte des variations dans les espaces et la ponctuation.
    """
    print(f"[DEBUG] _detect_tabspace_coordinates: Analyse du texte: '{text[:100]}...' (tronqué)")
    
    # Pattern plus souple qui accepte des variations dans les espaces et la ponctuation
    tabspace_regex = (
        r'([NS])\s*(\d{1,2})\s*°\s*(\d{1,2})\s*[.,]\s*(\d{1,3})\s*'
        r'([EW])\s*(\d{1,3})\s*°\s*(\d{1,2})\s*[.,]\s*(\d{1,3})'
    )
    
    print(f"[DEBUG] _detect_tabspace_coordinates: Regex utilisée: {tabspace_regex}")
    
    match = re.search(tabspace_regex, text, re.DOTALL)
    if match:
        print(f"[DEBUG] _detect_tabspace_coordinates: Match trouvé! Groupes: {match.groups()}")
        lat_dir, lat_deg, lat_min, lat_sec, lon_dir, lon_deg, lon_min, lon_sec = match.groups()
        
        # Formatage des coordonnées
        ddm_lat = f"{lat_dir} {lat_deg}° {lat_min}.{lat_sec}'"
        ddm_lon = f"{lon_dir} {lon_deg}° {lon_min}.{lon_sec}'"
        
        print(f"[DEBUG] _detect_tabspace_coordinates: Coordonnées formatées: {ddm_lat} {ddm_lon}")
        
        return {
            "exist": True,
            "ddm_lat": ddm_lat,
            "ddm_lon": ddm_lon,
            "ddm": f"{ddm_lat} {ddm_lon}"
        }
    
    print("[DEBUG] _detect_tabspace_coordinates: Aucun match trouvé")
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
    print(f"[DEBUG] _detect_variant_coordinates: Analyse du texte: '{text[:100]}...' (tronqué)")
    
    # Construction des patterns pour les directions
    north_pattern = '|'.join(NORTH_VARIANTS)
    east_pattern  = '|'.join(EAST_VARIANTS)
    
    # Le pattern autorise espaces, retours à la ligne ou "/" comme séparateurs
    pattern = rf"(?P<lat_dir>{north_pattern})\s*[/\n\s]*\s*(?P<lat>\d{{7}})\s*(?P<lon_dir>{east_pattern})\s*[/\n\s]*\s*(?P<lon>\d{{6,8}})"
    
    print(f"[DEBUG] _detect_variant_coordinates: Pattern utilisé: {pattern}")
    
    match = re.search(pattern, text)
    if match:
        print(f"[DEBUG] _detect_variant_coordinates: Match trouvé! Groupes: {match.groupdict()}")
        lat_dir_raw = match.group("lat_dir")
        lon_dir_raw = match.group("lon_dir")
        lat_digits  = match.group("lat")
        lon_digits  = match.group("lon")
        
        print(f"[DEBUG] _detect_variant_coordinates: Directions brutes: lat={lat_dir_raw}, lon={lon_dir_raw}")
        print(f"[DEBUG] _detect_variant_coordinates: Digits: lat={lat_digits}, lon={lon_digits}")
        
        # Normalisation des directions pour obtenir "N" et "E"
        lat_dir = DIRECTION_MAP.get(lat_dir_raw, lat_dir_raw[0].upper())
        lon_dir = DIRECTION_MAP.get(lon_dir_raw, lon_dir_raw[0].upper())
        
        print(f"[DEBUG] _detect_variant_coordinates: Directions normalisées: lat={lat_dir}, lon={lon_dir}")
        
        try:
            # Pour la latitude, si nécessaire, compléter à 7 chiffres
            if len(lat_digits) < 7:
                lat_digits = lat_digits.zfill(7)
            ddm_lat = f"{lat_dir} " + _format_coordinate(lat_digits, expected_deg_digits=2)
            print(f"[DEBUG] _detect_variant_coordinates: Latitude formatée: {ddm_lat}")
        except ValueError as e:
            print(f"[DEBUG] _detect_variant_coordinates: Erreur lors du formatage de la latitude: {e}")
            ddm_lat = None
        
        try:
            # Pour la longitude, compléter à 8 chiffres si nécessaire
            if len(lon_digits) < 8:
                lon_digits = lon_digits.zfill(8)
            ddm_lon = f"{lon_dir} " + _format_coordinate(lon_digits, expected_deg_digits=3)
            print(f"[DEBUG] _detect_variant_coordinates: Longitude formatée: {ddm_lon}")
        except ValueError as e:
            print(f"[DEBUG] _detect_variant_coordinates: Erreur lors du formatage de la longitude: {e}")
            ddm_lon = None
        
        if ddm_lat and ddm_lon:
            print(f"[DEBUG] _detect_variant_coordinates: Coordonnées complètes détectées: {ddm_lat} {ddm_lon}")
            return {
                "exist": True,
                "ddm_lat": ddm_lat,
                "ddm_lon": ddm_lon,
                "ddm": f"{ddm_lat} {ddm_lon}"
            }
    print("[DEBUG] _detect_variant_coordinates: Aucun match trouvé ou coordonnées incomplètes")
    return None

# ------------------------------------------------------------------------------
# Détection du format spécifique avec tabulations et points (ex: "N\t48 ° 32 . 296\nE\t6 ° 40 . 636")
# ------------------------------------------------------------------------------

def _detect_specific_tabpoint_coordinates(text: str) -> Optional[Dict[str, Optional[str]]]:
    """
    Détecte les coordonnées au format très spécifique avec tabulations et points, comme dans l'exemple :
      - "N\t48 ° 32 .  296\r\nE\t6  ° 40 .  636"
    
    Cette fonction est optimisée pour ce format particulier.
    """
    print(f"[DEBUG] _detect_specific_tabpoint_coordinates: Analyse du texte: '{text[:100]}...' (tronqué)")
    
    # Essayons d'abord avec un pattern très spécifique
    specific_regex = r'N\s*(\d{1,2})\s*°\s*(\d{1,2})\s*\.\s*(\d{1,3}).*?E\s*(\d{1,3})\s*°\s*(\d{1,2})\s*\.\s*(\d{1,3})'
    
    print(f"[DEBUG] _detect_specific_tabpoint_coordinates: Regex utilisée: {specific_regex}")
    
    match = re.search(specific_regex, text, re.DOTALL)
    if match:
        print(f"[DEBUG] _detect_specific_tabpoint_coordinates: Match trouvé! Groupes: {match.groups()}")
        lat_deg, lat_min, lat_sec, lon_deg, lon_min, lon_sec = match.groups()
        
        # Formatage des coordonnées
        ddm_lat = f"N {lat_deg}° {lat_min}.{lat_sec}'"
        ddm_lon = f"E {lon_deg}° {lon_min}.{lon_sec}'"
        
        print(f"[DEBUG] _detect_specific_tabpoint_coordinates: Coordonnées formatées: {ddm_lat} {ddm_lon}")
        
        return {
            "exist": True,
            "ddm_lat": ddm_lat,
            "ddm_lon": ddm_lon,
            "ddm": f"{ddm_lat} {ddm_lon}"
        }
    
    print("[DEBUG] _detect_specific_tabpoint_coordinates: Aucun match trouvé")
    return None

# ------------------------------------------------------------------------------
# Détection simplifiée pour le format exact de l'exemple
# ------------------------------------------------------------------------------

def _detect_simplified_coordinates(text: str) -> Optional[Dict[str, Optional[str]]]:
    """
    Détection simplifiée pour le format exact de l'exemple.
    Cette fonction utilise une approche plus directe pour détecter les coordonnées.
    """
    print(f"[DEBUG] _detect_simplified_coordinates: Analyse du texte: '{text}'")
    
    # Extraction des lignes
    lines = text.strip().split('\n')
    print(f"[DEBUG] _detect_simplified_coordinates: Lignes extraites: {lines}")
    
    if len(lines) >= 2:
        # Vérifier si la première ligne commence par N et la deuxième par E
        lat_line = lines[0].strip()
        lon_line = lines[1].strip()
        
        print(f"[DEBUG] _detect_simplified_coordinates: Ligne latitude: '{lat_line}'")
        print(f"[DEBUG] _detect_simplified_coordinates: Ligne longitude: '{lon_line}'")
        
        if lat_line.startswith('N') and lon_line.startswith('E'):
            # Extraction des nombres de la latitude
            lat_parts = re.findall(r'\d+', lat_line)
            lon_parts = re.findall(r'\d+', lon_line)
            
            print(f"[DEBUG] _detect_simplified_coordinates: Parties latitude: {lat_parts}")
            print(f"[DEBUG] _detect_simplified_coordinates: Parties longitude: {lon_parts}")
            
            if len(lat_parts) >= 3 and len(lon_parts) >= 3:
                lat_deg, lat_min, lat_sec = lat_parts[0], lat_parts[1], lat_parts[2]
                lon_deg, lon_min, lon_sec = lon_parts[0], lon_parts[1], lon_parts[2]
                
                # Formatage des coordonnées
                ddm_lat = f"N {lat_deg}° {lat_min}.{lat_sec}'"
                ddm_lon = f"E {lon_deg}° {lon_min}.{lon_sec}'"
                
                print(f"[DEBUG] _detect_simplified_coordinates: Coordonnées formatées: {ddm_lat} {ddm_lon}")
                
                return {
                    "exist": True,
                    "ddm_lat": ddm_lat,
                    "ddm_lon": ddm_lon,
                    "ddm": f"{ddm_lat} {ddm_lon}"
                }
    
    print("[DEBUG] _detect_simplified_coordinates: Aucune coordonnée détectée")
    return None

# ------------------------------------------------------------------------------
# Détection ultra-flexible pour tout format avec N/E et degrés
# ------------------------------------------------------------------------------

def _detect_flexible_coordinates(text: str) -> Optional[Dict[str, Optional[str]]]:
    """
    Détection ultra-flexible pour tout format contenant N/E et des degrés.
    Cette fonction est conçue pour être très tolérante aux variations de format.
    """
    print(f"[DEBUG] _detect_flexible_coordinates: Analyse du texte: '{text}'")
    
    # Recherche de N suivi de nombres et de degrés
    lat_match = re.search(r'N\s*(\d{1,2})(?:\s*[°º]|\s+deg|\s+degrees)\s*(\d{1,2})(?:[.,]\s*|\s+)(\d{1,3})', text, re.IGNORECASE)
    # Recherche de E suivi de nombres et de degrés
    lon_match = re.search(r'E\s*(\d{1,3})(?:\s*[°º]|\s+deg|\s+degrees)\s*(\d{1,2})(?:[.,]\s*|\s+)(\d{1,3})', text, re.IGNORECASE)
    
    print(f"[DEBUG] _detect_flexible_coordinates: Match latitude: {lat_match.groups() if lat_match else None}")
    print(f"[DEBUG] _detect_flexible_coordinates: Match longitude: {lon_match.groups() if lon_match else None}")
    
    if lat_match and lon_match:
        lat_deg, lat_min, lat_sec = lat_match.groups()
        lon_deg, lon_min, lon_sec = lon_match.groups()
        
        # Formatage des coordonnées
        ddm_lat = f"N {lat_deg}° {lat_min}.{lat_sec}'"
        ddm_lon = f"E {lon_deg}° {lon_min}.{lon_sec}'"
        
        print(f"[DEBUG] _detect_flexible_coordinates: Coordonnées formatées: {ddm_lat} {ddm_lon}")
        
        return {
            "exist": True,
            "ddm_lat": ddm_lat,
            "ddm_lon": ddm_lon,
            "ddm": f"{ddm_lat} {ddm_lon}"
        }
    
    print("[DEBUG] _detect_flexible_coordinates: Aucune coordonnée détectée")
    return None

# ------------------------------------------------------------------------------
# Détection du format NORD/EST avec chiffres séparés par des espaces
# ------------------------------------------------------------------------------

def _detect_nord_est_format(text: str) -> Optional[Dict[str, Optional[str]]]:
    """
    Détecte les coordonnées au format NORD/EST avec chiffres séparés par des espaces, par exemple :
      - "NORD 48 32 296 EST 6 40 636"
      - "Nord 48 32 296 Est 6 40 636"
    
    Ce format est spécifique aux coordonnées normalisées après décodage.
    """
    print(f"[DEBUG] _detect_nord_est_format: Analyse du texte: '{text}'")
    
    # Pattern pour détecter NORD/EST suivi de chiffres séparés par des espaces
    nord_est_regex = r'(?:NORD|Nord|nord)\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,3})(?:\s+|\s*[/\n]\s*)(?:EST|Est|est)\s+(\d{1,3})\s+(\d{1,2})\s+(\d{1,3})'
    
    print(f"[DEBUG] _detect_nord_est_format: Regex utilisée: {nord_est_regex}")
    
    match = re.search(nord_est_regex, text, re.IGNORECASE)
    if match:
        print(f"[DEBUG] _detect_nord_est_format: Match trouvé! Groupes: {match.groups()}")
        lat_deg, lat_min, lat_sec, lon_deg, lon_min, lon_sec = match.groups()
        
        # Formatage des coordonnées
        ddm_lat = f"N {lat_deg}° {lat_min}.{lat_sec}'"
        ddm_lon = f"E {lon_deg}° {lon_min}.{lon_sec}'"
        
        print(f"[DEBUG] _detect_nord_est_format: Coordonnées formatées: {ddm_lat} {ddm_lon}")
        
        return {
            "exist": True,
            "ddm_lat": ddm_lat,
            "ddm_lon": ddm_lon,
            "ddm": f"{ddm_lat} {ddm_lon}"
        }
    
    print("[DEBUG] _detect_nord_est_format: Aucun match trouvé")
    return None

# ------------------------------------------------------------------------------
# Détection du format NORD/EST avec variations
# ------------------------------------------------------------------------------

def _detect_nord_est_variations(text: str) -> Optional[Dict[str, Optional[str]]]:
    """
    Détecte les coordonnées au format NORD/EST avec diverses variations possibles, par exemple :
      - "NORD 48 32 296 EST 6 40 636"
      - "NORD48 32 296EST6 40 636"
      - "NORD48.32.296 EST6.40.636"
    
    Cette fonction est très flexible et tolérante aux variations de format.
    """
    print(f"[DEBUG] _detect_nord_est_variations: Analyse du texte: '{text}'")
    
    # Extraction des nombres après NORD et EST
    nord_match = re.search(r'(?:NORD|Nord|nord)[^\d]*(\d{1,2})[^\d]*(\d{1,2})[^\d]*(\d{1,3})', text, re.IGNORECASE)
    est_match = re.search(r'(?:EST|Est|est)[^\d]*(\d{1,3})[^\d]*(\d{1,2})[^\d]*(\d{1,3})', text, re.IGNORECASE)
    
    print(f"[DEBUG] _detect_nord_est_variations: Match NORD: {nord_match.groups() if nord_match else None}")
    print(f"[DEBUG] _detect_nord_est_variations: Match EST: {est_match.groups() if est_match else None}")
    
    if nord_match and est_match:
        lat_deg, lat_min, lat_sec = nord_match.groups()
        lon_deg, lon_min, lon_sec = est_match.groups()
        
        # Formatage des coordonnées
        ddm_lat = f"N {lat_deg}° {lat_min}.{lat_sec}'"
        ddm_lon = f"E {lon_deg}° {lon_min}.{lon_sec}'"
        
        print(f"[DEBUG] _detect_nord_est_variations: Coordonnées formatées: {ddm_lat} {ddm_lon}")
        
        return {
            "exist": True,
            "ddm_lat": ddm_lat,
            "ddm_lon": ddm_lon,
            "ddm": f"{ddm_lat} {ddm_lon}"
        }
    
    print("[DEBUG] _detect_nord_est_variations: Aucun match trouvé")
    return None

# ------------------------------------------------------------------------------
# Détection du format DMS (degrés, minutes, secondes)
# ------------------------------------------------------------------------------

def _detect_dms_coordinates(text: str) -> Optional[Dict[str, Optional[str]]]:
    """
    Détecte les coordonnées au format DMS (degrés, minutes, secondes), par exemple :
      - "N 48° 51' 24.12\" E 002° 17' 26.1\""
    
    Ce format est couramment utilisé dans le géocaching.
    """
    print(f"[DEBUG] _detect_dms_coordinates: Analyse du texte: '{text[:100]}...' (tronqué)")
    
    # Pattern pour détecter le format DMS
    dms_regex = (
        r'([NS])\s*(\d{1,2})\s*[°º]\s*(\d{1,2})\s*[\']\s*(\d{1,2}(?:\.\d+)?)[\"\']*\s*'
        r'([EW])\s*(\d{1,3})\s*[°º]\s*(\d{1,2})\s*[\']\s*(\d{1,2}(?:\.\d+)?)[\"\']*'
    )
    
    print(f"[DEBUG] _detect_dms_coordinates: Regex utilisée: {dms_regex}")
    
    match = re.search(dms_regex, text)
    if match:
        print(f"[DEBUG] _detect_dms_coordinates: Match trouvé! Groupes: {match.groups()}")
        lat_dir, lat_deg, lat_min, lat_sec, lon_dir, lon_deg, lon_min, lon_sec = match.groups()
        
        # Convertir DMS en DDM
        lat_min_decimal = float(lat_min) + float(lat_sec) / 60
        lon_min_decimal = float(lon_min) + float(lon_sec) / 60
        
        # Formatage des coordonnées
        ddm_lat = f"{lat_dir} {lat_deg}° {lat_min_decimal:.3f}'"
        ddm_lon = f"{lon_dir} {lon_deg}° {lon_min_decimal:.3f}'"
        
        print(f"[DEBUG] _detect_dms_coordinates: Coordonnées formatées: {ddm_lat} {ddm_lon}")
        
        return {
            "exist": True,
            "ddm_lat": ddm_lat,
            "ddm_lon": ddm_lon,
            "ddm": f"{ddm_lat} {ddm_lon}"
        }
    
    print("[DEBUG] _detect_dms_coordinates: Aucun match trouvé")
    return None

# ------------------------------------------------------------------------------
# Détection du format avec chiffres romains
# ------------------------------------------------------------------------------

def _detect_roman_numerals_coordinates(text: str) -> Optional[Dict[str, Optional[str]]]:
    """
    Détecte les coordonnées avec des chiffres romains, par exemple :
      - "NORD XLVIII XXXII CCXCVI EST VI XL DCXXXVI"
      - "N XLVIII° XXXII.CCXCVI' E VI° XL.DCXXXVI'"
    
    Cette fonction convertit d'abord les chiffres romains en chiffres arabes.
    """
    print(f"[DEBUG] _detect_roman_numerals_coordinates: Analyse du texte: '{text[:100]}...' (tronqué)")
    
    # Dictionnaire de conversion des chiffres romains
    roman_to_arabic = {
        'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000,
        'IV': 4, 'IX': 9, 'XL': 40, 'XC': 90, 'CD': 400, 'CM': 900
    }
    
    # Fonction pour convertir un nombre romain en nombre arabe
    def roman_to_int(roman: str) -> int:
        i, result = 0, 0
        while i < len(roman):
            # Vérifier les sous-chaînes de 2 caractères
            if i + 1 < len(roman) and roman[i:i+2] in roman_to_arabic:
                result += roman_to_arabic[roman[i:i+2]]
                i += 2
            else:
                # Vérifier les caractères individuels
                if roman[i] in roman_to_arabic:
                    result += roman_to_arabic[roman[i]]
                i += 1
        return result
    
    # Rechercher les motifs de chiffres romains
    roman_pattern = r'(NORD|Nord|nord|N)\s+((?:[IVXLCDM]+)\s+(?:[IVXLCDM]+)\s+(?:[IVXLCDM]+))\s+(EST|Est|est|E)\s+((?:[IVXLCDM]+)\s+(?:[IVXLCDM]+)\s+(?:[IVXLCDM]+))'
    
    print(f"[DEBUG] _detect_roman_numerals_coordinates: Pattern utilisé: {roman_pattern}")
    
    match = re.search(roman_pattern, text, re.IGNORECASE)
    if match:
        print(f"[DEBUG] _detect_roman_numerals_coordinates: Match trouvé! Groupes: {match.groups()}")
        lat_dir, lat_romans, lon_dir, lon_romans = match.groups()
        
        # Extraire les chiffres romains individuels
        lat_parts = lat_romans.split()
        lon_parts = lon_romans.split()
        
        if len(lat_parts) >= 3 and len(lon_parts) >= 3:
            try:
                # Convertir les chiffres romains en chiffres arabes
                lat_deg = roman_to_int(lat_parts[0])
                lat_min = roman_to_int(lat_parts[1])
                lat_sec = roman_to_int(lat_parts[2])
                
                lon_deg = roman_to_int(lon_parts[0])
                lon_min = roman_to_int(lon_parts[1])
                lon_sec = roman_to_int(lon_parts[2])
                
                print(f"[DEBUG] _detect_roman_numerals_coordinates: Conversion - lat: {lat_deg} {lat_min} {lat_sec}, lon: {lon_deg} {lon_min} {lon_sec}")
                
                # Formatage des coordonnées
                ddm_lat = f"N {lat_deg}° {lat_min}.{lat_sec}'"
                ddm_lon = f"E {lon_deg}° {lon_min}.{lon_sec}'"
                
                print(f"[DEBUG] _detect_roman_numerals_coordinates: Coordonnées formatées: {ddm_lat} {ddm_lon}")
                
                return {
                    "exist": True,
                    "ddm_lat": ddm_lat,
                    "ddm_lon": ddm_lon,
                    "ddm": f"{ddm_lat} {ddm_lon}"
                }
            except Exception as e:
                print(f"[DEBUG] _detect_roman_numerals_coordinates: Erreur lors de la conversion: {e}")
    
    print("[DEBUG] _detect_roman_numerals_coordinates: Aucun match trouvé ou erreur de conversion")
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
    print(f"[DEBUG] detect_gps_coordinates: Début de la détection sur texte de {len(text)} caractères")
    print(f"[DEBUG] detect_gps_coordinates: Extrait du texte: '{text[:100]}...' (tronqué)")
    
    detection_functions = [
        _detect_roman_numerals_coordinates,  # Format avec chiffres romains
        _detect_dms_coordinates,      # Format DMS (degrés, minutes, secondes)
        _detect_nord_est_variations,  # Format NORD/EST avec variations
        _detect_nord_est_format,      # Format NORD/EST avec chiffres séparés
        _detect_flexible_coordinates,   # Approche ultra-flexible
        _detect_simplified_coordinates,  # Approche simplifiée pour l'exemple exact
        _detect_specific_tabpoint_coordinates, # Format très spécifique pour l'exemple
        _detect_dmm_coordinates,      # Format DMM standard
        _detect_tabspace_coordinates, # Format avec tabulations et espaces
        _detect_variant_coordinates,  # Format variant
        # Vous pouvez ajouter d'autres fonctions ici.
    ]
    
    for i, detect_func in enumerate(detection_functions):
        print(f"[DEBUG] detect_gps_coordinates: Essai de la fonction de détection #{i+1}: {detect_func.__name__}")
        result = detect_func(text)
        if result and result.get("exist"):
            print(f"[DEBUG] detect_gps_coordinates: Coordonnées trouvées par {detect_func.__name__}: {result}")
            return result
    
    print("[DEBUG] detect_gps_coordinates: Aucune coordonnée GPS détectée")
    return {
        "exist": False,
        "ddm_lat": None,
        "ddm_lon": None,
        "ddm": None
    }
