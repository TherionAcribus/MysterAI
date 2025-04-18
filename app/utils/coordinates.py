"""
Utilitaires pour la manipulation des coordonnées
"""

def convert_gc_coords_to_decimal(gc_lat, gc_lon):
    """Convertit des coordonnées au format Geocaching.com en coordonnées décimales
    
    Format attendu:
    - gc_lat: "N 48° 51.402" ou "S 48° 51.402"
    - gc_lon: "E 002° 21.048" ou "W 002° 21.048"
    
    Retourne:
    - (latitude_decimal, longitude_decimal) ou (None, None) en cas d'erreur
    """
    try:
        lat_decimal = None
        lon_decimal = None
        
        if gc_lat and gc_lon:
            # Latitude
            lat_parts = gc_lat.split('°')
            if len(lat_parts) == 2:
                lat_deg = float(lat_parts[0].replace('N', '').replace('S', '').strip())
                lat_min = float(lat_parts[1].strip())
                lat_decimal = lat_deg + (lat_min / 60)
                if 'S' in gc_lat:
                    lat_decimal = -lat_decimal
            
            # Longitude
            lon_parts = gc_lon.split('°')
            if len(lon_parts) == 2:
                lon_deg = float(lon_parts[0].replace('E', '').replace('W', '').strip())
                lon_min = float(lon_parts[1].strip())
                lon_decimal = lon_deg + (lon_min / 60)
                if 'W' in gc_lon:
                    lon_decimal = -lon_decimal
        
        return lat_decimal, lon_decimal
    except Exception:
        return None, None

def decimal_to_gc_coords(lat, lon):
    """Convertit des coordonnées décimales en format Geocaching.com
    
    Format de retour:
    - gc_lat: "N 48° 51.402" ou "S 48° 51.402"
    - gc_lon: "E 002° 21.048" ou "W 002° 21.048"
    """
    try:
        # Déterminer les hémisphères
        lat_hem = "N" if lat >= 0 else "S"
        lon_hem = "E" if lon >= 0 else "W"
        
        # Convertir en degrés et minutes
        lat_deg = int(abs(lat))
        lat_min = (abs(lat) - lat_deg) * 60
        lon_deg = int(abs(lon))
        lon_min = (abs(lon) - lon_deg) * 60
        
        # Formater les coordonnées
        gc_lat = f"{lat_hem} {lat_deg}° {lat_min:.3f}"
        gc_lon = f"{lon_hem} {lon_deg}° {lon_min:.3f}"
        
        return gc_lat, gc_lon
    except Exception:
        return None, None 