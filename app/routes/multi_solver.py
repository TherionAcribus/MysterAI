from flask import Blueprint, render_template, request, jsonify, current_app, session
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
            # Vérifier si la géocache a des coordonnées corrigées
            has_corrected_coords = geocache.gc_lat_corrected is not None and geocache.gc_lon_corrected is not None
            
            # Construire les données de base
            geocache_data = {
                'id': geocache.id,
                'gc_code': geocache.gc_code,
                'name': geocache.name,
                'latitude': geocache.latitude,
                'longitude': geocache.longitude,
                'cache_type': geocache.cache_type,
                'difficulty': geocache.difficulty,
                'terrain': geocache.terrain,
                'solved': geocache.solved
            }
            
            # Ajouter les coordonnées corrigées si disponibles
            if has_corrected_coords:
                geocache_data['corrected_coordinates'] = {
                    'latitude': geocache.gc_lat_corrected,
                    'longitude': geocache.gc_lon_corrected
                }
                
                # Ajouter les coordonnées originales dans un format standard pour comparaison
                geocache_data['coordinates'] = {
                    'latitude': geocache.latitude,
                    'longitude': geocache.longitude
                }
                
                # Ajouter les formats Geocaching.com si disponibles
                if geocache.gc_coords_corrected:
                    geocache_data['corrected_coordinates']['gc_coords'] = geocache.gc_coords_corrected
                    geocache_data['corrected_coordinates']['gc_lat'] = geocache.gc_lat_corrected
                    geocache_data['corrected_coordinates']['gc_lon'] = geocache.gc_lon_corrected
                
                if geocache.gc_coords:
                    geocache_data['coordinates']['gc_coords'] = geocache.gc_coords
                    geocache_data['coordinates']['gc_lat'] = geocache.gc_lat
                    geocache_data['coordinates']['gc_lon'] = geocache.gc_lon
            
            result.append(geocache_data)
            print('bulk-coordinates', geocache_data)
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des coordonnées en masse: {str(e)}")
        return jsonify({'error': f'Erreur serveur: {str(e)}'}), 500 

@multi_solver_bp.route('/api/multi-solvers/<string:solver_id>/geocaches', methods=['GET'])
def get_multi_solver_geocaches(solver_id):
    """
    Récupère les géocaches associées à un multi-solver spécifique.
    Cette route est utilisée par le composant carte pour afficher les géocaches.
    """
    logger.info(f"Récupération des géocaches pour le multi-solver: {solver_id}")
    
    try:
        # Extraire les IDs des géocaches depuis la session si disponible
        geocache_ids = []
        if 'multiSolverResults' in session:
            try:
                stored_data = session['multiSolverResults']
                if isinstance(stored_data, list):
                    geocache_ids = [item.get('id') for item in stored_data if item.get('id')]
                    logger.info(f"Récupéré {len(geocache_ids)} IDs depuis la session")
            except Exception as e:
                logger.error(f"Erreur lors de la lecture des données de session: {str(e)}")
        
        # Si pas d'IDs dans la session, essayer de les récupérer d'une autre façon
        # Par exemple, depuis une base de données temporaire ou un cache
        if not geocache_ids:
            logger.warning(f"Aucun ID de géocache trouvé pour {solver_id}. Tentative de récupération alternative.")
            # Logique supplémentaire pour récupérer les IDs si nécessaire...
        
        if not geocache_ids:
            return jsonify([]), 200  # Retourner un tableau vide plutôt qu'une erreur
        
        # Récupérer les géocaches avec leurs coordonnées
        geocaches = Geocache.query.filter(Geocache.id.in_(geocache_ids)).all()
        
        # Construire le résultat
        result = []
        for geocache in geocaches:
            # Vérifier si la géocache a des coordonnées corrigées
            has_corrected_coords = geocache.latitude_corrected is not None and geocache.longitude_corrected is not None
            
            # Construire les données de base
            geocache_data = {
                'id': geocache.id,
                'gc_code': geocache.gc_code,
                'name': geocache.name,
                'latitude': geocache.latitude,
                'longitude': geocache.longitude,
                'cache_type': geocache.cache_type,
                'difficulty': geocache.difficulty,
                'terrain': geocache.terrain,
                'solved': geocache.solved
            }
            
            # Ajouter les coordonnées corrigées si disponibles
            if has_corrected_coords:
                geocache_data['corrected_coordinates'] = {
                    'latitude': geocache.latitude_corrected,
                    'longitude': geocache.longitude_corrected
                }
                
                # Ajouter les coordonnées originales dans un format standard pour comparaison
                geocache_data['coordinates'] = {
                    'latitude': geocache.latitude,
                    'longitude': geocache.longitude
                }
                
                # Ajouter les formats Geocaching.com si disponibles
                if geocache.gc_coords_corrected:
                    geocache_data['corrected_coordinates']['gc_coords'] = geocache.gc_coords_corrected
                    geocache_data['corrected_coordinates']['gc_lat'] = geocache.gc_lat_corrected
                    geocache_data['corrected_coordinates']['gc_lon'] = geocache.gc_lon_corrected
                
                if geocache.gc_coords:
                    geocache_data['coordinates']['gc_coords'] = geocache.gc_coords
                    geocache_data['coordinates']['gc_lat'] = geocache.gc_lat
                    geocache_data['coordinates']['gc_lon'] = geocache.gc_lon
            
            result.append(geocache_data)
            print('get_multi_solver_geocaches', geocache_data)
        
        logger.info(f"Renvoi de {len(result)} géocaches pour le multi-solver {solver_id}")
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des géocaches pour le multi-solver {solver_id}: {str(e)}")
        return jsonify({'error': f'Erreur serveur: {str(e)}'}), 500 