import browser_cookie3
import requests
from bs4 import BeautifulSoup
from typing import Optional, Dict, Any, Tuple, List
from app.utils.logger import setup_logger
import sys

# Configuration de l'encodage pour la sortie console
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

logger = setup_logger()

def extract_name(soup: BeautifulSoup) -> str:
    """Extrait le nom de la géocache"""
    nom_elem = soup.find('span', {'id': 'ctl00_ContentBody_CacheName'})
    if not nom_elem:
        raise Exception("Impossible de trouver le nom. Êtes-vous connecté sur geocaching.com ?")
    return nom_elem.text.strip()

def extract_coordinates(soup: BeautifulSoup) -> Tuple[float, float]:
    """Extrait les coordonnées de la géocache"""
    coords_elem = soup.find('span', {'id': 'uxLatLon'})
    if not coords_elem:
        raise Exception("Impossible de trouver les coordonnées. Êtes-vous connecté sur geocaching.com ?")
    return parse_coordinates(coords_elem.text.strip())

def extract_difficulty_terrain(soup: BeautifulSoup) -> Tuple[float, float]:
    """Extrait la difficulté et le terrain de la géocache"""
    difficulty_text = soup.find(text=lambda t: t and t.strip() == 'Difficulty:')
    terrain_text = soup.find(text=lambda t: t and t.strip() == 'Terrain:')
    
    logger.debug(f"Texte difficulté trouvé: {difficulty_text}")
    logger.debug(f"Texte terrain trouvé: {terrain_text}")
    
    if not difficulty_text or not terrain_text:
        raise Exception("Impossible de trouver les labels difficulté/terrain. Êtes-vous connecté sur geocaching.com ?")
    
    # Les valeurs sont dans l'attribut alt des images
    difficulty_img = difficulty_text.find_next('img')
    terrain_img = terrain_text.find_next('img')
    
    logger.debug(f"Image difficulté trouvée: {difficulty_img}")
    logger.debug(f"Image terrain trouvée: {terrain_img}")
    
    if not difficulty_img or not terrain_img:
        raise Exception("Impossible de trouver les images de difficulté/terrain")
    
    # Extraire les valeurs des attributs alt (format: "X out of 5" ou "X.5 out of 5")
    difficulty_value = difficulty_img['alt'].split()[0]
    terrain_value = terrain_img['alt'].split()[0]
    
    logger.debug(f"Valeur difficulté: '{difficulty_value}'")
    logger.debug(f"Valeur terrain: '{terrain_value}'")
    
    if not difficulty_value or not terrain_value:
        raise Exception("Les valeurs de difficulté/terrain sont vides")
    
    difficulty = float(difficulty_value)
    terrain = float(terrain_value)
    
    logger.debug(f"Difficulté: {difficulty}, Terrain: {terrain}")
    return difficulty, terrain

def extract_size(soup: BeautifulSoup) -> str:
    """Extrait la taille de la géocache"""
    size_div = soup.find('div', {'class': 'CacheSize'})
    if not size_div:
        raise Exception("Impossible de trouver la taille. Êtes-vous connecté sur geocaching.com ?")
    
    # La taille est dans l'attribut alt de l'image
    size_img = size_div.find('img')
    if not size_img:
        raise Exception("Impossible de trouver l'image de taille")
    
    # Format de l'alt : "Size: micro" ou similaire
    size_text = size_img['alt'].split(':')[-1].strip().lower()
    logger.debug(f"Taille trouvée: {size_text}")
    
    return convert_size(size_text)

def extract_description(soup: BeautifulSoup) -> str:
    """Extrait la description et les indices de la géocache"""
    desc_elem = soup.find('span', {'id': 'ctl00_ContentBody_LongDescription'})
    if not desc_elem:
        raise Exception("Impossible de trouver la description. Êtes-vous connecté sur geocaching.com ?")
       
    # Extrait le texte de la description en préservant le formatage HTML
    description = str(desc_elem)    
    
    logger.debug(f"Description trouvée: {description}")
    
    return description

def extract_hints(soup: BeautifulSoup) -> str:
    """Extrait les indices de la géocache"""
    hint_div = soup.find('div', {'id': 'div_hint'})
    print(hint_div.get_text(strip=True))
    if not hint_div:
        raise Exception("Impossible de trouver les indices. Êtes-vous connecté sur geocaching.com ?")
    return hint_div.get_text(strip=True)

def extract_owner(soup: BeautifulSoup) -> str:
    """Extrait le nom du propriétaire de la géocache"""
    owner_link = soup.find('div', {'id': 'ctl00_ContentBody_mcd1'}).find('a')
    if not owner_link:
        raise Exception("Impossible de trouver le propriétaire. Êtes-vous connecté sur geocaching.com ?")
    return owner_link.text.strip()

def extract_attributes(soup: BeautifulSoup) -> List[Dict]:
    """Extrait la liste des attributs de la géocache"""
    logger.debug("Début de l'extraction des attributs")
    
    # Rechercher le div conteneur des attributs
    attributes_div = soup.find('div', {'class': 'WidgetBody'})
    if not attributes_div:
        logger.debug("Div WidgetBody non trouvé, on cherche une autre div")
        # Essayons de trouver une autre div qui pourrait contenir les attributs
        attributes_div = soup.find('div', {'id': 'ctl00_ContentBody_detailWidget'})
        if not attributes_div:
            attributes_div = soup.find('div', {'id': 'ctl00_ContentBody_AttributesDiv'})
        
    if not attributes_div:
        logger.debug("Aucun conteneur d'attributs trouvé")
        return []
    
    # Récupère toutes les images d'attributs et leurs titres
    attributes = []
    
    # Trouver toutes les images
    img_tags = attributes_div.find_all('img')
    logger.debug(f"Nombre d'images trouvées: {len(img_tags)}")
    
    for img in img_tags:
        title = img.get('title', '').strip()
        alt = img.get('alt', '').strip()
        src = img.get('src', '').strip()
        
        # Les attributs ont généralement un titre et ne sont pas 'blank'
        if (title or alt) and title.lower() != 'blank' and alt.lower() != 'blank':
            attr_text = title or alt
            logger.debug(f"Attribut trouvé: {attr_text}, source: {src}")
            
            # Pour les attributs au format "Attribute Name: Yes/No", extraire nom et statut
            is_negative = False
            attr_name = attr_text
            
            if ':' in attr_text:
                parts = attr_text.split(':', 1)
                attr_name = parts[0].strip()
                attr_value = parts[1].strip().lower()
                is_negative = 'no' in attr_value
                logger.debug(f"Attribut formaté: nom='{attr_name}', valeur='{attr_value}', négatif={is_negative}")
            else:
                # Vérifier si le nom de l'attribut contient "yes" ou "no"
                lower_text = attr_text.lower()
                if ' - no' in lower_text or ' - non' in lower_text:
                    is_negative = True
                    # Extraire le nom sans le suffixe
                    attr_name = attr_text.split(' - ')[0].strip()
                
                logger.debug(f"Attribut simple: nom='{attr_name}', négatif={is_negative}")
            
            # Essayer d'extraire le nom de base du fichier depuis l'URL de l'image
            base_filename = None
            if src:
                try:
                    # Exemple: .../attributes/boat-yes.png
                    filename = src.split('/')[-1]
                    base_filename = filename.split('.')[0]  # Enlever l'extension
                    logger.debug(f"Nom de fichier extrait: {filename}, nom de base: {base_filename}")
                except:
                    logger.debug(f"Impossible d'extraire le nom de fichier de {src}")
            
            # Ajouter l'attribut formaté à la liste
            attribute = {
                'name': attr_name,
                'is_negative': is_negative
            }
            if base_filename:
                attribute['base_filename'] = base_filename
            
            attributes.append(attribute)
    
    logger.debug(f"Total des attributs trouvés: {len(attributes)}")
    
    # Dump les attributs en JSON pour les logs
    try:
        import json
        logger.debug(f"Liste des attributs JSON: {json.dumps(attributes)}")
    except:
        logger.debug("Impossible de convertir les attributs en JSON")
    
    return attributes

def extract_cache_type(soup: BeautifulSoup) -> str:
    """Extrait le type de géocache (Traditional, Multi, etc.)"""
    cache_type_link = soup.find('a', {'class': 'cacheImage'})
    if not cache_type_link:
        raise Exception("Impossible de trouver le type de cache")
    return cache_type_link.get('title', '').replace(' Cache', '').strip()

def extract_favorites(soup: BeautifulSoup) -> int:
    """Extrait le nombre de favoris de la géocache"""
    fav_span = soup.find('span', {'class': 'favorite-value'})
    if not fav_span:
        return 0
    try:
        return int(fav_span.text.strip())
    except (ValueError, TypeError):
        return 0

def extract_hidden_date(soup: BeautifulSoup) -> str:
    """Extrait la date de pose de la géocache"""
    date_div = soup.find('div', {'id': 'ctl00_ContentBody_mcd2'})
    if not date_div:
        raise Exception("Impossible de trouver la date de pose")
    # Nettoie le texte pour ne garder que la date
    date_text = date_div.get_text(strip=True)
    date = date_text.split(':')[1].strip()
    return date

def extract_logs_count(soup: BeautifulSoup) -> int:
    """Extrait le nombre total de logs de la géocache"""
    logs_link = soup.find('a', href=lambda x: x and 'geocache_logs.aspx' in x)
    if not logs_link:
        return 0
    try:
        # Extrait le nombre entre parenthèses
        count_text = logs_link.text
        count = int(''.join(filter(str.isdigit, count_text)))
        return count
    except (ValueError, TypeError, AttributeError):
        return 0

def extract_additional_waypoints(soup: BeautifulSoup) -> List[Dict[str, str]]:
    """Extrait les waypoints additionnels de la géocache"""
    waypoints = []
    waypoints_table = soup.find('table', {'id': 'ctl00_ContentBody_Waypoints'})
    if not waypoints_table:
        return waypoints
    
    rows = waypoints_table.find_all('tr', {'class': 'BorderBottom', 'ishidden': 'false'})
    for row in rows:
        # Récupère les cellules de la ligne
        cells = row.find_all('td')
        if len(cells) < 6:
            continue
            
        # Extrait le préfixe
        prefix_span = cells[2].find('span')
        prefix = prefix_span.text.strip() if prefix_span else ''
        
        # Extrait le lookup
        lookup = cells[3].text.strip()
        
        # Extrait le nom et le type
        name_cell = cells[4]
        name_link = name_cell.find('a')
        if name_link:
            name = name_link.text.strip()
            # Le type est entre parenthèses après le lien
            type_text = name_cell.text.split('(')[-1].rstrip(')')
        else:
            name = name_cell.text.strip()
            type_text = ''
            
        # Extrait les coordonnées
        coords_text = cells[5].text.strip()
        
        # Parse les coordonnées
        latitude = None
        longitude = None
        if coords_text:
            try:
                latitude, longitude = parse_coordinates(coords_text)
            except Exception as e:
                logger.warning(f"Erreur lors du parsing des coordonnées '{coords_text}': {str(e)}")
        
        # Extrait la note (dans la ligne suivante)
        note_row = row.find_next_sibling('tr', {'class': 'BorderBottom'})
        note = ''
        if note_row:
            note_cell = note_row.find('td', colspan=True)
            if note_cell:
                note = note_cell.text.strip()
        
        waypoint = {
            'prefix': prefix,
            'lookup': lookup,
            'name': name,
            'type': type_text,
            'latitude': latitude,
            'longitude': longitude,
            'gc_coords': coords_text,  # Garder aussi le format original
            'note': note
        }
        waypoints.append(waypoint)
    
    return waypoints

def extract_checkers(soup: BeautifulSoup) -> Dict[str, Any]:
    """
    Extrait les différents checkers présents sur la page de la géocache.
    
    Args:
        soup (BeautifulSoup): L'objet BeautifulSoup de la page
        
    Returns:
        dict: Dictionnaire contenant les informations sur les checkers trouvés
    """
    checkers = {
        'geocheck': [],
        'certitude': [],
        'geocaching': False
    }
    
    # Recherche des liens Geocheck et Certitude
    links = soup.find_all('a', href=True)
    for link in links:
        href = link['href']
        if 'geocheck.org' in href:
            checkers['geocheck'].append(href)
        elif 'certitudes.org' in href:
            checkers['certitude'].append(href)
            
    # Recherche du checker Geocaching.com
    geocaching_checker = soup.find('div', {'class': 'CoordChecker'})
    if geocaching_checker:
        checkers['geocaching'] = True
        
    return checkers

def extract_images(soup: BeautifulSoup) -> List[str]:
    """Extrait les URLs des images de la géocache"""
    images = []
    
    # Chercher dans la description longue
    desc_elem = soup.find('span', {'id': 'ctl00_ContentBody_LongDescription'})
    if desc_elem:
        for img in desc_elem.find_all('img'):
            if img.get('src'):
                # Filtrer les images du système (icônes, etc.)
                if not any(system_img in img['src'].lower() for system_img in ['wpttypes', 'icons', 'smilies']):
                    images.append(img['src'])
    
    # Chercher dans la galerie d'images
    gallery = soup.find('div', {'class': 'CachePageImages'})
    if gallery:
        for img in gallery.find_all('img'):
            if img.get('src'):
                images.append(img['src'])
    
    return images

def check_premium_page(soup: BeautifulSoup) -> None:
    """Vérifie si la page est une page Premium et lève une exception si c'est le cas"""
    premium_widget = soup.find('section', class_='premium-upgrade-widget')
    if premium_widget:
        logger.error("Cette géocache est réservée aux membres Premium")
        raise Exception("Cette géocache est réservée aux membres Premium. Connectez-vous avec un compte Premium sur Firefox.")

def scrape_geocache(gc_code: str) -> Optional[Dict[str, Any]]:
    """
    Scrape les informations d'une géocache depuis geocaching.com en utilisant les cookies du navigateur.
    
    Args:
        gc_code: Code de la géocache (ex: "GC12345")
        
    Returns:
        Dict contenant les informations de la géocache ou None si erreur
    """
    try:
        # Récupérer les cookies du navigateur
        cookies = browser_cookie3.firefox()
        
        # URL de la page de la géocache
        url = f"https://www.geocaching.com/geocache/{gc_code}"
        
        # Faire la requête HTTP
        response = requests.get(url, cookies=cookies)
        response.raise_for_status()
        
        # Parser le HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Vérifier si c'est une page Premium
        check_premium_page(soup)
        
        # Extraire les informations
        name = extract_name(soup)
        owner = extract_owner(soup)
        cache_type = extract_cache_type(soup)
        lat, lon = extract_coordinates(soup)
        difficulty, terrain = extract_difficulty_terrain(soup)
        size = extract_size(soup)
        description = extract_description(soup)
        hints = extract_hints(soup)
        attributes = extract_attributes(soup)
        favorites = extract_favorites(soup)
        hidden_date = extract_hidden_date(soup)
        logs_count = extract_logs_count(soup)
        additional_waypoints = extract_additional_waypoints(soup)
        checkers = extract_checkers(soup)
        images = extract_images(soup)
        
        # Construire le dictionnaire de retour
        cache_data = {
            'gc_code': gc_code,
            'name': name,
            'owner': owner,
            'cache_type': cache_type,
            'latitude': lat,
            'longitude': lon,
            'difficulty': difficulty,
            'terrain': terrain,
            'size': size,
            'description': description,
            'hints': hints,
            'attributes': attributes,
            'favorites_count': favorites,
            'logs_count': logs_count,
            'hidden_date': hidden_date,
            'additional_waypoints': additional_waypoints,
            'checkers': checkers,
            'images': [{'url': url} for url in images]
        }
        
        return cache_data
        
    except Exception as e:
        logger.error(f"Erreur lors du scraping de {gc_code}: {str(e)}")
        raise

def parse_coordinates(coords_text: str) -> tuple[float, float]:
    """
    Convertit les coordonnées textuelles en latitude/longitude
    Format attendu: "N 49° 13.123 E 002° 34.456" ou similaire
    """
    logger.debug(f"Parsing des coordonnées: {coords_text}")
    try:
        # Séparation des parties latitude et longitude
        parts = coords_text.split()
        
        # Traitement de la latitude
        lat_deg = float(parts[1].replace('°', ''))
        lat_min = float(parts[2])
        lat = lat_deg + (lat_min / 60)
        if parts[0] == 'S':
            lat = -lat
            
        # Traitement de la longitude
        lon_deg = float(parts[4].replace('°', ''))
        lon_min = float(parts[5])
        lon = lon_deg + (lon_min / 60)
        if parts[3] == 'W':
            lon = -lon
            
        logger.debug(f"Coordonnées parsées: {lat}, {lon}")
        return lat, lon
    except Exception as e:
        logger.error(f"Erreur lors du parsing des coordonnées '{coords_text}': {str(e)}")
        raise Exception(f"Format de coordonnées invalide: {coords_text}") from e

def convert_size(size_text: str) -> str:
    """Convertit la taille du texte en format standardisé"""
    logger.debug(f"Conversion de la taille: {size_text}")
    size_mapping = {
        'micro': 'micro',
        'small': 'small',
        'regular': 'regular',
        'large': 'large',
        'very large': 'very_large',
        'other': 'other',
        'not chosen': 'unknown',
        'virtual': 'virtual'
    }
    
    try:
        return size_mapping[size_text]
    except KeyError:
        logger.error(f"Taille inconnue: {size_text}")
        return 'unknown'
