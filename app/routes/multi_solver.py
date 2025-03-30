from flask import Blueprint, render_template, request, jsonify
import logging
import json
import urllib.parse
from app.models.geocache import Geocache
from sqlalchemy import or_

logger = logging.getLogger(__name__)

multi_solver_bp = Blueprint('multi_solver', __name__)

@multi_solver_bp.route('/multi-solver', methods=['GET'])
def multi_solver_panel():
    """
    Affiche le panneau du multi-solver pour plusieurs géocaches
    """
    geocaches_param = request.args.get('geocaches')
    
    logger.debug(f"Paramètres de requête multi_solver: {dict(request.args)}")
    logger.debug(f"Paramètre geocaches: {geocaches_param}")
    
    geocaches = []
    if geocaches_param:
        try:
            # Essayer de décoder les géocaches depuis le paramètre URL
            geocaches = json.loads(urllib.parse.unquote(geocaches_param))
            logger.info(f"Multi-solver: {len(geocaches)} géocaches chargées depuis les paramètres")
        except Exception as e:
            logger.error(f"Erreur lors du décodage des géocaches: {str(e)}")
    
    # Passer les géocaches au template
    return render_template('multi_solver.html', geocaches=json.dumps(geocaches))

@multi_solver_bp.route('/api/multi-solver/bulk-coordinates', methods=['POST'])
def bulk_coordinates():
    """
    Récupère les coordonnées de plusieurs géocaches en une seule requête
    """
    # Récupérer le corps de la requête au format JSON
    data = request.get_json()
    if not data or not isinstance(data, dict) or 'ids' not in data:
        return jsonify({'error': 'Requête invalide, "ids" doit être fourni'}), 400
    
    # Extraire les IDs de géocaches
    geocache_ids = data.get('ids', [])
    if not geocache_ids or not isinstance(geocache_ids, list):
        return jsonify({'error': 'Liste d\'IDs invalide'}), 400
    
    # Limiter le nombre d'IDs pour éviter les abus
    if len(geocache_ids) > 500:
        return jsonify({'error': 'Trop de géocaches demandées (max 500)'}), 400
    
    logger.info(f"Requête bulk-coordinates pour {len(geocache_ids)} géocaches")
    
    try:
        # Récupérer les géocaches avec leurs coordonnées
        geocaches = Geocache.query.filter(Geocache.id.in_(geocache_ids)).all()
        
        # Construire le résultat
        result = []
        for geocache in geocaches:
            # Vérifier si des coordonnées corrigées existent
            has_corrected_coords = geocache.location_corrected is not None
            
            # Ajouter les informations de base de la géocache
            geocache_data = {
                'id': geocache.id,
                'gc_code': geocache.gc_code,
                'name': geocache.name,
                'latitude': geocache.latitude,
                'longitude': geocache.longitude,
                'cache_type': geocache.cache_type,
                'difficulty': geocache.difficulty,
                'terrain': geocache.terrain,
                'solved': geocache.solved,
                'location_corrected': geocache.location_corrected
            }
            
            # Ajouter les coordonnées corrigées si elles existent
            if has_corrected_coords:
                try:
                    lat_corrected = geocache.latitude_corrected
                    lon_corrected = geocache.longitude_corrected
                    
                    if lat_corrected is not None and lon_corrected is not None:
                        geocache_data['latitude_corrected'] = lat_corrected
                        geocache_data['longitude_corrected'] = lon_corrected
                        
                        # Ajouter également l'objet corrected_coordinates pour compatibilité
                        geocache_data['corrected_coordinates'] = {
                            'latitude': lat_corrected,
                            'longitude': lon_corrected
                        }
                        
                        logger.debug(f"Coordonnées corrigées trouvées pour {geocache.gc_code}: {lat_corrected}, {lon_corrected}")
                except Exception as e:
                    logger.error(f"Erreur lors de l'extraction des coordonnées corrigées pour {geocache.gc_code}: {str(e)}")
            
            # Ajouter également les coordonnées corrigées au format Geocaching.com si disponibles
            if geocache.gc_lat_corrected and geocache.gc_lon_corrected:
                geocache_data['gc_lat_corrected'] = geocache.gc_lat_corrected
                geocache_data['gc_lon_corrected'] = geocache.gc_lon_corrected
            
            result.append(geocache_data)
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des coordonnées en masse: {str(e)}")
        return jsonify({'error': f'Erreur de serveur: {str(e)}'}), 500 