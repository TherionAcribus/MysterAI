from typing import Optional, Dict
import re
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from app.database import db
from app.models.geocache import Geocache
import traceback
from pyproj import Geod

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

@coordinates_bp.route('/api/calculate_coordinates', methods=['POST'])
def calculate_coordinates():
    """
    Calcule les coordonnées à partir d'une formule.
    Peut calculer partiellement les coordonnées même si toutes les variables ne sont pas définies.
    
    Exemple de données attendues:
    {
        "formula": "N48° 39.(8/4)(27/9)(2x2x2) E06°11.(3x2)(16x2/4)(25/5)",
        "variables": {"A": 5, "B": 10, ...},  # optionnel
        "origin_lat": "N48° 40.123",  # optionnel
        "origin_lon": "E06° 10.456"   # optionnel
    }
    
    Retourne:
    {
        "coordinates": "N48° 39.286 E06°11.685",
        "latitude": "N48° 39.286",
        "longitude": "E06°11.685",
        "status": "complete" | "partial" | "error",
        "lat_status": {
            "status": "complete" | "partial" | "error",
            "message": "Message d'erreur détaillé si applicable"
        },
        "lon_status": {
            "status": "complete" | "partial" | "error",
            "message": "Message d'erreur détaillé si applicable"
        },
        "distance_from_origin": {
            "meters": 1234.56,
            "miles": 0.76,
            "status": "ok" | "warning" | "far"
        },  # optionnel, présent uniquement si origin_lat et origin_lon sont fournis
        "decimal_latitude": 48.586,
        "decimal_longitude": 6.195
    }
    """
    try:
        data = request.get_json()
        formula = data.get('formula', '')
        variables = data.get('variables', {})
        origin_lat = data.get('origin_lat')
        origin_lon = data.get('origin_lon')
        
        if not formula:
            return jsonify({"error": "Aucune formule fournie"}), 400
        
        print(f"[DEBUG] Calcul des coordonnées pour la formule: {formula}")
        print(f"[DEBUG] Variables fournies: {variables}")
        
        # Extraire les parties de latitude et longitude (accepte lettres et chiffres)
        lat_match = re.search(r'([NS])\s*([A-Z0-9]+)°\s*([A-Z0-9]+)\.([A-Z0-9()x*/+-]+)', formula)
        lon_match = re.search(r'([EW])\s*([A-Z0-9]+)°\s*([A-Z0-9]+)\.([A-Z0-9()x*/+-]+)', formula)
        
        if not lat_match or not lon_match:
            print(f"[ERROR] Format de formule invalide: lat_match={lat_match}, lon_match={lon_match}")
            return jsonify({"error": "Format de formule invalide"}), 400
        
        # Substitution et calcul pour chaque partie
        lat_dir, lat_deg_raw, lat_min_raw, lat_decimal_raw = lat_match.groups()
        lon_dir, lon_deg_raw, lon_min_raw, lon_decimal_raw = lon_match.groups()
        
        print(f"[DEBUG] Parties de latitude: dir={lat_dir}, deg={lat_deg_raw}, min={lat_min_raw}, decimal={lat_decimal_raw}")
        print(f"[DEBUG] Parties de longitude: dir={lon_dir}, deg={lon_deg_raw}, min={lon_min_raw}, decimal={lon_decimal_raw}")
        
        # Appliquer la substitution sur chaque partie
        lat_deg = _process_formula_part(lat_deg_raw, variables)
        lat_min = _process_formula_part(lat_min_raw, variables)
        lat_decimal = _process_formula_part(lat_decimal_raw, variables)
        lon_deg = _process_formula_part(lon_deg_raw, variables)
        lon_min = _process_formula_part(lon_min_raw, variables)
        lon_decimal = _process_formula_part(lon_decimal_raw, variables)
        
        print(f"[DEBUG] Valeurs calculées: lat_deg={lat_deg}, lat_min={lat_min}, lat_decimal={lat_decimal}")
        print(f"[DEBUG] Valeurs calculées: lon_deg={lon_deg}, lon_min={lon_min}, lon_decimal={lon_decimal}")
        
        # Statuts individuels
        def part_status(val, label):
            if isinstance(val, str) and re.search(r'[A-Z]', val):
                return ("partial", f"La partie {label} contient encore des lettres")
            if isinstance(val, (int, float)):
                if int(val) < 0:
                    return ("error", f"La partie {label} est négative")
            return ("complete", "")
        
        lat_deg_status, lat_deg_msg = part_status(lat_deg, "degrés latitude")
        lat_min_status, lat_min_msg = part_status(lat_min, "minutes latitude")
        lat_decimal_status, lat_decimal_msg = part_status(lat_decimal, "décimales latitude")
        lon_deg_status, lon_deg_msg = part_status(lon_deg, "degrés longitude")
        lon_min_status, lon_min_msg = part_status(lon_min, "minutes longitude")
        lon_decimal_status, lon_decimal_msg = part_status(lon_decimal, "décimales longitude")
        
        # Statut global pour chaque coordonnée
        lat_status = {"status": "complete", "message": ""}
        lon_status = {"status": "complete", "message": ""}
        
        for st, msg in [(lat_deg_status, lat_deg_msg), (lat_min_status, lat_min_msg), (lat_decimal_status, lat_decimal_msg)]:
            if st == "error":
                lat_status = {"status": "error", "message": msg}
                break
            elif st == "partial" and lat_status["status"] != "error":
                lat_status = {"status": "partial", "message": msg}
        for st, msg in [(lon_deg_status, lon_deg_msg), (lon_min_status, lon_min_msg), (lon_decimal_status, lon_decimal_msg)]:
            if st == "error":
                lon_status = {"status": "error", "message": msg}
                break
            elif st == "partial" and lon_status["status"] != "error":
                lon_status = {"status": "partial", "message": msg}
        
        # Statut global
        global_status = "complete"
        if lat_status["status"] != "complete" or lon_status["status"] != "complete":
            if lat_status["status"] == "error" or lon_status["status"] == "error":
                global_status = "error"
            else:
                global_status = "partial"
        
        # Formatage final
        def format_part(val, digits):
            if isinstance(val, (int, float)):
                return str(val).zfill(digits)
            return str(val)
        
        lat_formatted = f"{lat_dir}{format_part(lat_deg,2)}° {format_part(lat_min,2)}.{format_part(lat_decimal,3)}"
        lon_formatted = f"{lon_dir}{format_part(lon_deg,3)}° {format_part(lon_min,2)}.{format_part(lon_decimal,3)}"
        
        print(f"[DEBUG] Coordonnées formatées: {lat_formatted} {lon_formatted}")
        
        result = {
            "coordinates": f"{lat_formatted} {lon_formatted}",
            "latitude": lat_formatted,
            "longitude": lon_formatted,
            "status": global_status,
            "lat_status": lat_status,
            "lon_status": lon_status
        }
        
        # Ajouter les coordonnées décimales pour l'affichage automatique sur la carte
        if global_status == "complete":
            try:
                decimal_coords = convert_ddm_to_decimal(lat_formatted, lon_formatted)
                result["decimal_latitude"] = decimal_coords["latitude"]
                result["decimal_longitude"] = decimal_coords["longitude"]
                print(f"[DEBUG] Coordonnées décimales calculées: lat={decimal_coords['latitude']}, lon={decimal_coords['longitude']}")
            except Exception as e:
                print(f"[WARNING] Erreur lors de la conversion en coordonnées décimales: {str(e)}")
                # Ne pas faire échouer l'appel si la conversion échoue
        
        # Si nous avons des coordonnées d'origine et que les coordonnées calculées sont complètes, 
        # calculer la distance entre les deux
        print(f"[DEBUG] Vérification des conditions pour le calcul de distance:")
        print(f"[DEBUG] - origin_lat: {origin_lat} ({type(origin_lat).__name__ if origin_lat else 'None'})")
        print(f"[DEBUG] - origin_lon: {origin_lon} ({type(origin_lon).__name__ if origin_lon else 'None'})")
        print(f"[DEBUG] - global_status: {global_status}")
        print(f"[DEBUG] - lat_decimal_value: {lat_decimal} ({type(lat_decimal).__name__})")
        print(f"[DEBUG] - lon_decimal_value: {lon_decimal} ({type(lon_decimal).__name__})")
        
        if origin_lat and origin_lon and global_status == "complete" and isinstance(lat_decimal, (int, float)) and isinstance(lon_decimal, (int, float)):
            try:
                print(f"[DEBUG] Conditions remplies pour calculer la distance entre les coordonnées")
                print(f"[DEBUG] Origin lat: {origin_lat}, Origin lon: {origin_lon}")
                print(f"[DEBUG] Destination lat: {lat_formatted}, Destination lon: {lon_formatted}")
                distance_info = calculate_distance_between_coords(
                    origin_lat=origin_lat,
                    origin_lon=origin_lon,
                    dest_lat=lat_formatted,
                    dest_lon=lon_formatted
                )
                result["distance_from_origin"] = distance_info
                print(f"[DEBUG] Distance calculée: {distance_info}")
            except Exception as e:
                print(f"[ERROR] Erreur lors du calcul de la distance: {str(e)}")
                traceback.print_exc()
        else:
            print(f"[DEBUG] Calcul de distance impossible: origin_lat={origin_lat}, origin_lon={origin_lon}, global_status={global_status}")
            print(f"[DEBUG] lat_decimal_value est de type {type(lat_decimal).__name__}: {lat_decimal}")
            print(f"[DEBUG] lon_decimal_value est de type {type(lon_decimal).__name__}: {lon_decimal}")
        
        print(f"[DEBUG] Résultat final: {result}")
        return jsonify(result)
        
    except Exception as e:
        print(f"[ERROR] Erreur lors du calcul des coordonnées: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

def calculate_distance_between_coords(origin_lat, origin_lon, dest_lat, dest_lon):
    """
    Calcule la distance entre deux coordonnées au format DDM
    
    Args:
        origin_lat (str): Latitude d'origine au format DDM (ex: "N48° 40.123")
        origin_lon (str): Longitude d'origine au format DDM (ex: "E06° 10.456")
        dest_lat (str): Latitude de destination au format DDM (ex: "N48° 39.286")
        dest_lon (str): Longitude de destination au format DDM (ex: "E06°11.685")
        
    Returns:
        dict: Dictionnaire contenant la distance en mètres, en miles et un statut
    """
    print(f"[DEBUG] *** DÉBUT CALCUL DISTANCE ***")
    print(f"[DEBUG] Origine: {origin_lat} {origin_lon}")
    print(f"[DEBUG] Destination: {dest_lat} {dest_lon}")
    
    # Convertir les coordonnées DDM en format décimal
    origin_coords = convert_ddm_to_decimal(origin_lat, origin_lon)
    dest_coords = convert_ddm_to_decimal(dest_lat, dest_lon)
    
    print(f"[DEBUG] Origine (décimal): lat={origin_coords['latitude']}, lon={origin_coords['longitude']}")
    print(f"[DEBUG] Destination (décimal): lat={dest_coords['latitude']}, lon={dest_coords['longitude']}")
    
    if not origin_coords['latitude'] or not origin_coords['longitude'] or not dest_coords['latitude'] or not dest_coords['longitude']:
        print(f"[ERROR] Conversion des coordonnées en décimal impossible")
        raise ValueError("Impossible de convertir les coordonnées en format décimal")
    
    # Calculer la distance avec Geod
    geod = Geod(ellps="WGS84")
    _, _, distance_m = geod.inv(
        origin_coords['longitude'], origin_coords['latitude'],
        dest_coords['longitude'], dest_coords['latitude']
    )
    
    # Convertir en miles (1 mile = 1609.344 mètres)
    distance_miles = distance_m / 1609.344
    
    print(f"[DEBUG] Distance calculée: {distance_m} mètres ({distance_miles} miles)")
    
    # Déterminer le statut en fonction de la distance
    # Moins de 2 miles = ok
    # Entre 2 et 2.5 miles = warning
    # Plus de 2.5 miles = far
    status = "ok"
    if distance_miles > 2.5:
        status = "far"
        print(f"[DEBUG] Statut: FAR - Distance > 2.5 miles")
    elif distance_miles > 2.0:
        status = "warning"
        print(f"[DEBUG] Statut: WARNING - Distance entre 2.0 et 2.5 miles")
    else:
        print(f"[DEBUG] Statut: OK - Distance < 2.0 miles")
    
    print(f"[DEBUG] *** FIN CALCUL DISTANCE ***")
    
    return {
        "meters": round(distance_m, 2),
        "miles": round(distance_miles, 2),
        "status": status
    }

def _process_formula_part(formula_part, variables):
    """
    Traite une partie de formule (généralement la partie décimale des minutes)
    et remplace les variables par leurs valeurs si disponibles.
    
    Args:
        formula_part: Partie de la formule à traiter (peut être une expression entre parenthèses)
        variables: Dictionnaire des variables avec leurs valeurs
        
    Returns:
        Le résultat calculé ou l'expression partiellement résolue
    """
    print(f"[DEBUG] _process_formula_part: Traitement de '{formula_part}' avec variables {variables}")
    
    # Si ce n'est pas une expression entre parenthèses, mais contient peut-être des lettres
    if not formula_part.startswith('('):
        # Si c'est juste un chiffre, le retourner directement
        if formula_part.isdigit():
            return int(formula_part)
        
        # Si la formule contient des lettres majuscules, la traiter comme une expression
        if re.search(r'[A-Z]', formula_part):
            print(f"[DEBUG] Détection de lettres dans '{formula_part}', traitement comme expression")
            # Remplacer les lettres par leurs valeurs si disponibles
            expression = formula_part
            has_letters_with_values = False
            
            for var, value in variables.items():
                if var in expression:
                    has_letters_with_values = True
                    expression = expression.replace(var, str(value))
            
            # Si aucune lettre n'a été remplacée, retourner l'expression telle quelle
            if not has_letters_with_values:
                print(f"[DEBUG] Aucune variable disponible pour '{formula_part}', retour tel quel")
                return formula_part
            
            # Si l'expression contient encore des lettres majuscules, retourner l'expression partiellement résolue
            if re.search(r'[A-Z]', expression):
                print(f"[DEBUG] Expression partiellement résolue: '{expression}'")
                return expression
            
            # Sinon, essayer d'évaluer comme une expression mathématique
            try:
                result = eval(expression)
                print(f"[DEBUG] Expression évaluée: '{expression}' = {result}")
                return round(result) if isinstance(result, (int, float)) else result
            except Exception as e:
                print(f"[ERROR] Impossible d'évaluer l'expression '{expression}': {str(e)}")
                return expression
        
        # Sinon, retourner tel quel
        return formula_part
    
    # Extraire l'expression entre parenthèses
    expression = formula_part[1:-1] if formula_part.endswith(')') else formula_part[1:]
    
    # Remplacer les multiplications 'x' par '*' pour l'évaluation
    expression = expression.replace('x', '*')
    
    # Remplacer les variables par leurs valeurs
    original_expression = expression
    for var, value in variables.items():
        if var in expression:
            expression = expression.replace(var, str(value))
    
    # Vérifier si toutes les variables ont été remplacées
    # Si l'expression contient encore des lettres majuscules (sauf E pour notation scientifique)
    if re.search(r'[A-DF-Z]', expression):
        # Retourner l'expression partiellement résolue
        return f"({expression})"
    
    try:
        # Évaluer l'expression mathématique
        result = eval(expression)
        # Arrondir si c'est un nombre
        if isinstance(result, (int, float)):
            return round(result)
        return result
    except Exception as e:
        print(f"[ERROR] Impossible d'évaluer l'expression '{expression}': {str(e)}")
        # En cas d'erreur, retourner l'expression partiellement résolue
        return f"({expression})"

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

# ------------------------------------------------------------------------------
# Conversion DDM vers coordonnées décimales pour OpenLayers
# ------------------------------------------------------------------------------

def convert_ddm_to_decimal(ddm_lat: str, ddm_lon: str) -> Dict[str, float]:
    """
    Convertit des coordonnées au format DDM (N 48° 33.787' E 006° 38.803') 
    en coordonnées décimales utilisables par OpenLayers.
    
    :param ddm_lat: Latitude au format DDM (ex: "N 48° 33.787'")
    :param ddm_lon: Longitude au format DDM (ex: "E 006° 38.803'")
    :return: Dictionnaire avec les clés 'latitude' et 'longitude' en décimal
    """
    print(f"[DEBUG] convert_ddm_to_decimal: Conversion de {ddm_lat}, {ddm_lon}")
    
    result = {'latitude': None, 'longitude': None}
    
    try:
        # Extraction des composants de la latitude
        lat_pattern = r'([NS])\s*(\d+)\s*[°º]\s*(\d+(?:\.\d+)?)'
        lat_match = re.search(lat_pattern, ddm_lat)
        if lat_match:
            lat_dir, lat_deg, lat_min = lat_match.groups()
            lat_decimal = float(lat_deg) + float(lat_min) / 60
            if lat_dir == 'S':
                lat_decimal = -lat_decimal
            result['latitude'] = lat_decimal
            print(f"[DEBUG] Latitude convertie: {lat_dir}{lat_deg}° {lat_min} -> {lat_decimal}")
        else:
            print(f"[ERROR] Format de latitude non reconnu: {ddm_lat}")
            print(f"[DEBUG] Motif recherché: {lat_pattern}")
        
        # Extraction des composants de la longitude
        lon_pattern = r'([EW])\s*(\d+)\s*[°º]\s*(\d+(?:\.\d+)?)'
        lon_match = re.search(lon_pattern, ddm_lon)
        if lon_match:
            lon_dir, lon_deg, lon_min = lon_match.groups()
            lon_decimal = float(lon_deg) + float(lon_min) / 60
            if lon_dir == 'W':
                lon_decimal = -lon_decimal
            result['longitude'] = lon_decimal
            print(f"[DEBUG] Longitude convertie: {lon_dir}{lon_deg}° {lon_min} -> {lon_decimal}")
        else:
            print(f"[ERROR] Format de longitude non reconnu: {ddm_lon}")
            print(f"[DEBUG] Motif recherché: {lon_pattern}")
            
        print(f"[DEBUG] convert_ddm_to_decimal: Résultat de la conversion: {result}")
    except Exception as e:
        print(f"[ERROR] convert_ddm_to_decimal: Erreur lors de la conversion: {str(e)}")
        traceback.print_exc()
    
    return result
