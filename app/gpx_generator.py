"""
Module pour la génération de fichiers GPX pour les géocaches
"""
from datetime import datetime
import xml.etree.ElementTree as ET
from xml.dom import minidom
from flask import current_app
from app.models.geocache import Geocache

def create_gpx_file(geocache_ids):
    """
    Crée un fichier GPX contenant les géocaches spécifiées par leurs IDs
    
    Args:
        geocache_ids (list): Liste des IDs de géocaches à inclure dans le fichier GPX
        
    Returns:
        str: Contenu du fichier GPX formaté
    """
    # Récupérer les géocaches depuis la base de données
    geocaches = Geocache.query.filter(Geocache.id.in_(geocache_ids)).all()
    
    if not geocaches:
        return None
    
    # Créer la structure XML GPX
    gpx = ET.Element('gpx')
    gpx.set('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
    gpx.set('xmlns:xsd', 'http://www.w3.org/2001/XMLSchema')
    gpx.set('version', '1.0')
    gpx.set('creator', 'MysteryAI')
    gpx.set('xmlns', 'http://www.topografix.com/GPX/1/0')
    gpx.set('xsi:schemaLocation', 'http://www.topografix.com/GPX/1/0 http://www.topografix.com/GPX/1/0/gpx.xsd http://www.groundspeak.com/cache/1/0/1 http://www.groundspeak.com/cache/1/0/1/cache.xsd')
    
    # Ajouter les métadonnées
    name = ET.SubElement(gpx, 'name')
    name.text = f"MysteryAI Export {datetime.now().strftime('%Y-%m-%d')}"
    
    desc = ET.SubElement(gpx, 'desc')
    desc.text = f"Fichier GPX généré par MysteryAI contenant {len(geocaches)} géocaches"
    
    author = ET.SubElement(gpx, 'author')
    author.text = "MysteryAI"
    
    time = ET.SubElement(gpx, 'time')
    time.text = datetime.now().strftime('%Y-%m-%dT%H:%M:%SZ')
    
    keywords = ET.SubElement(gpx, 'keywords')
    keywords.text = "cache, geocache, mysteryai"
    
    # Calculer les limites (bounds) du GPX
    if geocaches:
        lats = [gc.latitude for gc in geocaches if gc.latitude is not None]
        lons = [gc.longitude for gc in geocaches if gc.longitude is not None]
        
        if lats and lons:
            bounds = ET.SubElement(gpx, 'bounds')
            bounds.set('minlat', str(min(lats)))
            bounds.set('minlon', str(min(lons)))
            bounds.set('maxlat', str(max(lats)))
            bounds.set('maxlon', str(max(lons)))
    
    # Ajouter chaque géocache comme waypoint
    for geocache in geocaches:
        # Utiliser les coordonnées corrigées si disponibles, sinon les originales
        lat = geocache.latitude_corrected if geocache.latitude_corrected is not None else geocache.latitude
        lon = geocache.longitude_corrected if geocache.longitude_corrected is not None else geocache.longitude
        
        if lat is None or lon is None:
            continue
        
        wpt = ET.SubElement(gpx, 'wpt')
        wpt.set('lat', str(lat))
        wpt.set('lon', str(lon))
        
        time_tag = ET.SubElement(wpt, 'time')
        if geocache.created_at:
            time_tag.text = geocache.created_at.strftime('%Y-%m-%dT%H:%M:%SZ')
        else:
            time_tag.text = datetime.now().strftime('%Y-%m-%dT%H:%M:%SZ')
        
        name_tag = ET.SubElement(wpt, 'name')
        name_tag.text = geocache.gc_code
        
        desc_tag = ET.SubElement(wpt, 'desc')
        cache_desc = f"{geocache.name}"
        if geocache.cache_type:
            cache_desc += f", {geocache.cache_type}"
        if geocache.difficulty and geocache.terrain:
            cache_desc += f" ({geocache.difficulty}/{geocache.terrain})"
        desc_tag.text = cache_desc
        
        url_tag = ET.SubElement(wpt, 'url')
        url_tag.text = f"https://coord.info/{geocache.gc_code}"
        
        urlname_tag = ET.SubElement(wpt, 'urlname')
        urlname_tag.text = geocache.name
        
        sym_tag = ET.SubElement(wpt, 'sym')
        sym_tag.text = "Geocache"
        
        type_tag = ET.SubElement(wpt, 'type')
        if geocache.cache_type:
            type_tag.text = f"Geocache|{geocache.cache_type}"
        else:
            type_tag.text = "Geocache"
        
        # Ajout des informations Groundspeak (compatibilité avec Geocaching.com)
        gs_cache = ET.SubElement(wpt, 'groundspeak:cache')
        gs_cache.set('xmlns:groundspeak', 'http://www.groundspeak.com/cache/1/0/1')
        gs_cache.set('id', str(geocache.id))
        gs_cache.set('available', 'True')
        gs_cache.set('archived', 'False')
        
        gs_name = ET.SubElement(gs_cache, 'groundspeak:name')
        gs_name.text = geocache.name
        
        if geocache.owner:
            gs_placed_by = ET.SubElement(gs_cache, 'groundspeak:placed_by')
            gs_placed_by.text = geocache.owner.name
            
            gs_owner = ET.SubElement(gs_cache, 'groundspeak:owner')
            gs_owner.text = geocache.owner.name
            gs_owner.set('id', str(geocache.owner.id))
        
        if geocache.cache_type:
            gs_type = ET.SubElement(gs_cache, 'groundspeak:type')
            gs_type.text = geocache.cache_type
        
        if geocache.size:
            gs_container = ET.SubElement(gs_cache, 'groundspeak:container')
            gs_container.text = geocache.size
        
        # Attributs
        if geocache.attributes:
            gs_attributes = ET.SubElement(gs_cache, 'groundspeak:attributes')
            for attr in geocache.attributes:
                gs_attr = ET.SubElement(gs_attributes, 'groundspeak:attribute')
                gs_attr.set('id', str(attr.id))
                gs_attr.set('inc', '1')
                gs_attr.text = attr.name
        
        if geocache.difficulty:
            gs_difficulty = ET.SubElement(gs_cache, 'groundspeak:difficulty')
            gs_difficulty.text = str(geocache.difficulty)
        
        if geocache.terrain:
            gs_terrain = ET.SubElement(gs_cache, 'groundspeak:terrain')
            gs_terrain.text = str(geocache.terrain)
        
        # Description
        gs_short_desc = ET.SubElement(gs_cache, 'groundspeak:short_description')
        gs_short_desc.set('html', 'True')
        gs_short_desc.text = ""
        
        gs_long_desc = ET.SubElement(gs_cache, 'groundspeak:long_description')
        gs_long_desc.set('html', 'True')
        gs_long_desc.text = geocache.description or ""
        
        # Hints
        gs_hints = ET.SubElement(gs_cache, 'groundspeak:encoded_hints')
        gs_hints.text = geocache.hints or ""
        
        # Logs
        if geocache.logs:
            gs_logs = ET.SubElement(gs_cache, 'groundspeak:logs')
            for log in geocache.logs[:5]:  # Limiter à 5 logs
                gs_log = ET.SubElement(gs_logs, 'groundspeak:log')
                gs_log.set('id', str(log.id))
                
                gs_log_date = ET.SubElement(gs_log, 'groundspeak:date')
                gs_log_date.text = log.date.strftime('%Y-%m-%dT%H:%M:%SZ') if log.date else datetime.now().strftime('%Y-%m-%dT%H:%M:%SZ')
                
                gs_log_type = ET.SubElement(gs_log, 'groundspeak:type')
                gs_log_type.text = log.log_type or "Write note"
                
                gs_log_finder = ET.SubElement(gs_log, 'groundspeak:finder')
                gs_log_finder.text = log.author.name if log.author else "Unknown"
                gs_log_finder.set('id', str(log.author.id) if log.author else "0")
                
                gs_log_text = ET.SubElement(gs_log, 'groundspeak:text')
                gs_log_text.set('encoded', 'False')
                gs_log_text.text = log.text or ""
    
    # Convertir l'arbre XML en chaîne de caractères formatée
    xml_string = ET.tostring(gpx, encoding='utf-8')
    pretty_xml = minidom.parseString(xml_string).toprettyxml(indent="  ")
    
    return pretty_xml

def generate_filename(filtered=False):
    """
    Génère un nom de fichier pour le GPX
    
    Args:
        filtered (bool): Indique si le fichier contient des géocaches filtrées
        
    Returns:
        str: Nom du fichier GPX
    """
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    if filtered:
        return f"mysteryai_filtered_geocaches_{timestamp}.gpx"
    else:
        return f"mysteryai_geocaches_{timestamp}.gpx" 