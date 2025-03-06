from flask import Blueprint, jsonify, request, render_template, redirect, url_for, flash, session
import json
from app.models.geocache import Geocache, Zone, AdditionalWaypoint, Checker, GeocacheImage, gc_coords_to_decimal
from app.database import db
from app.utils.geocache_scraper import scrape_geocache
from shapely.geometry import Point
from geoalchemy2.shape import from_shape
from app.utils.logger import setup_logger
from datetime import datetime
from werkzeug.utils import secure_filename
import os
from flask import current_app
import requests
import secrets
import base64
import time
from flask import make_response, send_from_directory
import math

logger = setup_logger()

# Un seul blueprint pour toutes les routes
geocaches_bp = Blueprint('geocaches', __name__)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

@geocaches_bp.route('/api/zones/<int:zone_id>/geocaches', methods=['GET'])
def get_geocaches(zone_id):
    """Recupere les geocaches d'une zone."""
    geocaches = Geocache.query.filter_by(zone_id=zone_id).all()
    logger.debug(f"Geocaches for zone {zone_id}: {geocaches}")
    return jsonify([{
        'id': cache.id,
        'gc_code': cache.gc_code,
        'name': cache.name,
        'owner': cache.owner,
        'cache_type': cache.cache_type,
        'latitude': cache.latitude,
        'longitude': cache.longitude,
        'description': cache.description_text,
        'difficulty': cache.difficulty,
        'terrain': cache.terrain,
        'size': cache.size,
        'hints': cache.hints,
        'favorites_count': cache.favorites_count,
        'logs_count': cache.logs_count,
        'hidden_date': cache.hidden_date.isoformat() if cache.hidden_date else None,
        'created_at': cache.created_at.isoformat() if cache.created_at else None,
        'solved': cache.solved
    } for cache in geocaches])


@geocaches_bp.route('/geocaches/fetch', methods=['POST'])
def fetch_gc_data():
    """Recupere les donnees d'une geocache via son code GC."""
    gc_code = request.form.get('gc_code', '').strip().upper()
    if not gc_code.startswith('GC'):
        session['error'] = "Le code doit commencer par GC"
        return redirect(url_for('geocaches.add_geocache'))

    try:
        cache_data = scrape_geocache(gc_code)
        session['cache_data'] = cache_data
    except Exception as e:
        session['error'] = str(e)

    return redirect(url_for('geocaches.add_geocache'))

# Plus utilisé !!!!
@geocaches_bp.route('/geocaches/<int:geocache_id>', methods=['GET'])
def get_geocache(geocache_id):
    """Recupere une geocache via son ID."""
    logger.debug(f"Recherche de la geocache via API {geocache_id}")
    geocache = Geocache.query.options(
        db.joinedload(Geocache.additional_waypoints),
        db.joinedload(Geocache.attributes),
        db.joinedload(Geocache.checkers),
        db.joinedload(Geocache.zone),
        db.joinedload(Geocache.images)
    ).get_or_404(geocache_id)

    logger.debug(f"Waypoints for geocache {geocache.gc_code}:", [
        {'id': wp.id, 'name': wp.name, 'prefix': wp.prefix} 
        for wp in geocache.additional_waypoints
    ])
    
    return jsonify({
        'id': geocache.id,
        'gc_code': geocache.gc_code,
        'name': geocache.name,
        'owner': geocache.owner,
        'cache_type': geocache.cache_type,
        'latitude': geocache.latitude,
        'longitude': geocache.longitude,
        'gc_lat': geocache.gc_lat,
        'gc_lon': geocache.gc_lon,
        'latitude_corrected': geocache.latitude_corrected,
        'longitude_corrected': geocache.longitude_corrected,
        'gc_lat_corrected': geocache.gc_lat_corrected,
        'gc_lon_corrected': geocache.gc_lon_corrected,
        'description': geocache.description,
        'difficulty': geocache.difficulty,
        'terrain': geocache.terrain,
        'size': geocache.size,
        'hints': geocache.hints,
        'favorites_count': geocache.favorites_count,
        'logs_count': geocache.logs_count,
        'hidden_date': geocache.hidden_date.isoformat() if geocache.hidden_date else None,
        'created_at': geocache.created_at.isoformat() if geocache.created_at else None,
        'solved': geocache.solved,
        'additional_waypoints': [{
            'id': wp.id,
            'name': wp.name,
            'prefix': wp.prefix,
            'lookup': wp.lookup,
            'latitude': wp.latitude,
            'longitude': wp.longitude,
            'gc_lat': wp.gc_lat,
            'gc_lon': wp.gc_lon,
            'type': 'waypoint',
            'note': wp.note
        } for wp in geocache.additional_waypoints if wp.latitude is not None and wp.longitude is not None],
        'attributes': [{
            'id': attr.id,
            'name': attr.name,
            'icon_url': attr.icon_url,
            'is_on': next((ga.is_on for ga in geocache.geocache_attributes if ga.attribute_id == attr.id), True)
        } for attr in geocache.attributes],
        'checkers': [{
            'id': checker.id,
            'name': checker.name,
            'url': checker.url
        } for checker in (geocache.checkers or [])],
        'zone': {
            'id': geocache.zone.id,
            'name': geocache.zone.name,
            'description': geocache.zone.description
        } if geocache.zone else None,
        'images': [{
            'id': image.id,
            'url': image.url,
            'filename': image.filename,
            'is_original': image.is_original
        } for image in geocache.images]
    })


@geocaches_bp.route('/geocaches/<int:geocache_id>/text', methods=['GET'])
def get_geocache_text(geocache_id):
    """Recupere le texte brut d'une geocache."""
    logger.debug(f"Recherche du texte de la geocache {geocache_id}")
    geocache = Geocache.query.get_or_404(geocache_id)
    
    return jsonify({
        'description': geocache.description_text
    })


@geocaches_bp.route('/api/geocaches/<int:geocache_id>/coordinates', methods=['GET'])
def get_geocache_coordinates(geocache_id):
    """Recupere toutes les coordonnees associees a une geocache (point d'origine, point corrige, waypoints)"""
    logger.debug(f"Recuperation des coordonnees pour la geocache {geocache_id}")
    
    geocache = Geocache.query.options(
        db.joinedload(Geocache.additional_waypoints)
    ).get_or_404(geocache_id)

    coordinates = {
        'original': {
            'latitude': geocache.latitude,
            'longitude': geocache.longitude,
            'gc_lat': geocache.gc_lat,
            'gc_lon': geocache.gc_lon,
            'type': 'original'
        }
    }

    # Ajout des coordonnees corrigees si elles existent
    if geocache.latitude_corrected is not None and geocache.longitude_corrected is not None:
        coordinates['corrected'] = {
            'latitude': geocache.latitude_corrected,
            'longitude': geocache.longitude_corrected,
            'gc_lat': geocache.gc_lat_corrected,
            'gc_lon': geocache.gc_lon_corrected,
            'type': 'corrected'
        }

    # Ajout des waypoints additionnels
    coordinates['waypoints'] = [{
        'id': wp.id,
        'name': wp.name,
        'prefix': wp.prefix,
        'lookup': wp.lookup,
        'latitude': wp.latitude,
        'longitude': wp.longitude,
        'gc_lat': wp.gc_lat,
        'gc_lon': wp.gc_lon,
        'type': 'waypoint'
    } for wp in geocache.additional_waypoints if wp.latitude is not None and wp.longitude is not None]

    logger.debug(f"Coordonnees recuperees pour la geocache {geocache.gc_code}")
    return jsonify(coordinates)


@geocaches_bp.route('/geocaches/<int:geocache_id>/details', methods=['GET'])
def get_geocache_details(geocache_id):
    """Recupere les details d'une geocache."""
    logger.debug(f"Recherche de la geocache {geocache_id}")
    try:
        geocache = Geocache.query.options(
            db.joinedload(Geocache.additional_waypoints),
            db.joinedload(Geocache.attributes),
            db.joinedload(Geocache.checkers),
            db.joinedload(Geocache.zone),
            db.joinedload(Geocache.images)
        ).get_or_404(geocache_id)
        
        return jsonify({
            'id': geocache.id,
            'gc_code': geocache.gc_code,
            'name': geocache.name,
            'owner': geocache.owner,
            'cache_type': geocache.cache_type,
            'latitude': geocache.latitude,
            'longitude': geocache.longitude,
            'gc_lat': geocache.gc_lat,
            'gc_lon': geocache.gc_lon,
            'description': geocache.description,
            'difficulty': geocache.difficulty,
            'terrain': geocache.terrain,
            'size': geocache.size,
            'hints': geocache.hints,
            'favorites_count': geocache.favorites_count,
            'logs_count': geocache.logs_count,
            'hidden_date': geocache.hidden_date.isoformat() if geocache.hidden_date else None,
            'created_at': geocache.created_at.isoformat() if geocache.created_at else None,
            'solved': geocache.solved,
            'zone_id': geocache.zone_id,
            'zone': {
                'id': geocache.zone.id,
                'name': geocache.zone.name,
                'description': geocache.zone.description
            } if geocache.zone else None,
            'additional_waypoints': [{
                'id': wp.id,
                'name': wp.name,
                'prefix': wp.prefix,
                'lookup': wp.lookup,
                'latitude': wp.latitude,
                'longitude': wp.longitude,
                'gc_lat': wp.gc_lat,
                'gc_lon': wp.gc_lon,
                'note': wp.note
            } for wp in (geocache.additional_waypoints or [])],
            'attributes': [{
                'id': attr.id,
                'name': attr.name,
                'icon_url': attr.icon_url,
                'is_on': next((ga.is_on for ga in geocache.geocache_attributes if ga.attribute_id == attr.id), True)
            } for attr in geocache.attributes],
            'checkers': [{
                'id': checker.id,
                'name': checker.name,
                'url': checker.url
            } for checker in (geocache.checkers or [])],
            'images': [{
                'id': image.id,
                'url': image.url,
                'filename': image.filename,
                'is_original': image.is_original
            } for image in geocache.images],
        })
    except Exception as e:
        logger.error(f"Error getting geocache {geocache_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500


@geocaches_bp.route('/api/geocaches/<int:geocache_id>', methods=['DELETE'])
def delete_geocache(geocache_id):
    """Supprime une geocache."""
    try:
        geocache = Geocache.query.get_or_404(geocache_id)
        db.session.delete(geocache)
        db.session.commit()
        return jsonify({'message': f'Geocache {geocache.gc_code} deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting geocache {geocache_id}: {str(e)}")
        return jsonify({'error': 'Failed to delete geocache'}), 500


@geocaches_bp.route('/api/geocaches/add', methods=['POST'])
def add_geocache():
    """Ajoute une nouvelle geocache."""
    try:
        # Log des headers de la requête
        logger.debug(f"Headers de la requête : {dict(request.headers)}")
        logger.debug(f"Content-Type : {request.content_type}")
        logger.debug(f"Données reçues : {request.get_json() if request.is_json else request.form}")

        # Accepter à la fois JSON et form-data
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form.to_dict()  # Convertir en dict pour uniformiser le traitement

        code = data.get('code')
        zone_id = data.get('zone_id')

        logger.debug(f"Tentative d'ajout de la géocache {code} pour la zone {zone_id}")

        if not code or not zone_id:
            return jsonify({'error': 'Missing required fields'}), 400

        # Verifier si la geocache existe deja
        existing = db.session.query(Geocache).filter_by(gc_code=code).first()
        if existing:
            logger.debug(f"La géocache {code} existe déjà avec l'ID {existing.id}")
            return jsonify({
                'error': 'Geocache already exists',
                'id': existing.id,
                'gc_code': existing.gc_code,
                'name': existing.name
            }), 409

        # Recuperer les informations via le scraper
        logger.debug(f"Récupération des données pour la géocache {code}")
        geocache_data = scrape_geocache(code)
        
        if not geocache_data:
            return jsonify({'error': 'Failed to fetch geocache data'}), 404

        # Convertir la date si elle existe
        hidden_date = None
        if geocache_data.get('hidden_date'):
            try:
                hidden_date = datetime.strptime(geocache_data['hidden_date'], '%m/%d/%Y')
            except ValueError as e:
                logger.warning(f"Impossible de parser la date: {geocache_data['hidden_date']} - {str(e)}")

        # Creer la nouvelle geocache
        geocache = Geocache(
            gc_code=code,
            name=geocache_data.get('name', ''),
            owner=geocache_data.get('owner', ''),
            cache_type=geocache_data.get('cache_type', ''),
            description=geocache_data.get('description', ''),
            difficulty=float(geocache_data.get('difficulty', 1.0)),
            terrain=float(geocache_data.get('terrain', 1.0)),
            size=geocache_data.get('size', ''),
            hints=geocache_data.get('hint', ''),
            favorites_count=int(geocache_data.get('favorites', 0)),
            logs_count=int(geocache_data.get('logs_count', 0)),
            hidden_date=hidden_date,
            zone_id=zone_id
        )
        
        # Definir la position
        if 'latitude' in geocache_data and 'longitude' in geocache_data:
            lat = float(geocache_data['latitude'])
            lon = float(geocache_data['longitude'])
            
            # Convertir en format Geocaching.com
            lat_deg = int(lat)
            lat_min = abs(lat - lat_deg) * 60
            lon_deg = int(lon)
            lon_min = abs(lon - lon_deg) * 60
            
            gc_lat = f"N {abs(lat_deg)}° {lat_min:.3f}"
            gc_lon = f"E {abs(lon_deg)}° {lon_min:.3f}"
            
            geocache.set_location(lat, lon, gc_lat=gc_lat, gc_lon=gc_lon)

        # Ajouter les waypoints additionnels
        if geocache_data.get('additional_waypoints'):
            for wp_data in geocache_data['additional_waypoints']:
                if isinstance(wp_data, dict):
                    waypoint = AdditionalWaypoint(
                        name=wp_data.get('name', ''),
                        prefix=wp_data.get('prefix', ''),
                        lookup=wp_data.get('lookup', ''),
                        note=wp_data.get('note', '')
                    )
                    if wp_data.get('latitude') and wp_data.get('longitude'):
                        lat = float(wp_data['latitude'])
                        lon = float(wp_data['longitude'])
                        
                        # Les coordonnees au format GC sont deja dans gc_coords
                        gc_coords = wp_data.get('gc_coords', '')
                        if gc_coords:
                            # Extraire lat et lon du format GC
                            parts = gc_coords.split()
                            if len(parts) == 4:  # Format: "N 48° 51.402 E 002° 21.048"
                                gc_lat = f"{parts[0]} {parts[1]}"  # "N 48° 51.402"
                                gc_lon = f"{parts[2]} {parts[3]}"  # "E 002° 21.048"
                                waypoint.set_location(lat, lon, gc_lat=gc_lat, gc_lon=gc_lon)
                            else:
                                # Fallback : convertir les coordonnees decimales
                                lat_deg = int(lat)
                                lat_min = abs(lat - lat_deg) * 60
                                lon_deg = int(lon)
                                lon_min = abs(lon - lon_deg) * 60
                                
                                gc_lat = f"N {abs(lat_deg)}° {lat_min:.3f}"
                                gc_lon = f"E {abs(lon_deg)}° {lon_min:.3f}"
                                waypoint.set_location(lat, lon, gc_lat=gc_lat, gc_lon=gc_lon)
                        else:
                            # Pas de format GC, on convertit les coordonnees decimales
                            lat_deg = int(lat)
                            lat_min = abs(lat - lat_deg) * 60
                            lon_deg = int(lon)
                            lon_min = abs(lon - lon_deg) * 60
                            
                            gc_lat = f"N {abs(lat_deg)}° {lat_min:.3f}"
                            gc_lon = f"E {abs(lon_deg)}° {lon_min:.3f}"
                            waypoint.set_location(lat, lon, gc_lat=gc_lat, gc_lon=gc_lon)
                    geocache.additional_waypoints.append(waypoint)

        # Ajouter les checkers
        if geocache_data.get('checkers'):
            for checker_data in geocache_data['checkers']:
                if isinstance(checker_data, dict):
                    checker = Checker(
                        name=checker_data.get('name', ''),
                        url=checker_data.get('url', '')
                    )
                    geocache.checkers.append(checker)

        # Ajouter les images
        if geocache_data.get('images'):
            for img_data in geocache_data['images']:
                if isinstance(img_data, dict):
                    # Si l'image a une URL, on la télécharge
                    img_url = img_data.get('url')
                    if img_url:
                        try:
                            response = requests.get(img_url)
                            if response.status_code == 200:
                                # Créer le dossier de la geocache si nécessaire
                                geocache_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], code)
                                os.makedirs(geocache_folder, exist_ok=True)
                                
                                # Générer un nom de fichier unique
                                ext = img_url.split('.')[-1].lower()
                                if ext not in current_app.config['ALLOWED_EXTENSIONS']:
                                    ext = 'jpg'  # Extension par défaut
                                filename = f"{secrets.token_hex(8)}.{ext}"
                                
                                # Sauvegarder l'image dans le dossier de la geocache
                                img_path = os.path.join(geocache_folder, filename)
                                with open(img_path, 'wb') as f:
                                    f.write(response.content)
                                
                                # Créer l'entrée dans la base de données
                                image = GeocacheImage(
                                    filename=filename,
                                    original_url=img_url
                                )
                                geocache.images.append(image)
                        except Exception as e:
                            logger.error(f"Erreur lors du téléchargement de l'image {img_url}: {str(e)}")

        logger.debug(f"Ajout de la géocache {code} à la base de données")
        
        # S'assurer qu'aucune transaction n'est active
        if db.session.is_active:
            db.session.rollback()
            
        # Utiliser une transaction atomique pour l'insertion
        try:
            # Vérifier une dernière fois que la géocache n'existe pas
            existing = db.session.query(Geocache).filter_by(gc_code=code).with_for_update().first()
            if existing:
                return jsonify({
                    'error': 'Geocache already exists',
                    'id': existing.id,
                    'gc_code': existing.gc_code,
                    'name': existing.name
                }), 409
                
            db.session.add(geocache)
            db.session.commit()
            
            logger.debug(f"Géocache {code} ajoutée avec succès, ID: {geocache.id}")
            return jsonify({
                'message': 'Geocache added successfully',
                'id': geocache.id,
                'gc_code': geocache.gc_code,
                'name': geocache.name
            }), 201
        except Exception as e:
            db.session.rollback()
            raise e
            
    except Exception as e:
        logger.error(f"Error adding geocache: {str(e)}")
        return jsonify({'error': str(e)}), 500


@geocaches_bp.route('/geocaches/<int:geocache_id>/solved-status', methods=['PUT'])
def update_solved_status(geocache_id):
    """Met à jour le statut de résolution d'une geocache."""
    try:
        solved_status = request.form.get('solved_status')
        logger.info(f"Updating solved status for geocache {geocache_id}. Form data: {request.form}")
        
        if solved_status not in ['solved', 'not_solved', 'in_progress']:
            logger.error(f"Invalid status received: {solved_status}")
            return jsonify({'error': 'Invalid status'}), 400
            
        geocache = Geocache.query.get_or_404(geocache_id)
        logger.info(f"Found geocache {geocache_id}. Current status: {geocache.solved}")
        
        geocache.solved = solved_status
        
        if solved_status == 'solved':
            geocache.solved_date = datetime.now()
        elif solved_status == 'not_solved':
            geocache.solved_date = None
            
        db.session.commit()
        logger.info(f"Successfully updated geocache {geocache_id} status to {solved_status}")
        
        return '', 204  # No content needed for HTMX
        
    except Exception as e:
        logger.error(f"Error updating solved status: {str(e)}")
        return jsonify({'error': str(e)}), 500


@geocaches_bp.route('/api/geocaches/images/save', methods=['POST'])
def save_modified_image():
    """Sauvegarde une image modifiée."""
    try:
        data = request.get_json()
        parent_image_id = data.get('parent_image_id')
        image_data = data.get('image_data')  # Base64 encoded image data

        if not parent_image_id or not image_data:
            return jsonify({'error': 'Missing required fields'}), 400

        # Récupérer l'image parent
        parent_image = GeocacheImage.query.get(parent_image_id)
        if not parent_image:
            return jsonify({'error': 'Parent image not found'}), 404

        # Créer le dossier de la geocache si nécessaire
        geocache_folder = os.path.join('geocaches_images', parent_image.geocache.gc_code)
        os.makedirs(geocache_folder, exist_ok=True)

        # Générer un nom de fichier unique
        filename = f"modified_{int(time.time())}_{secure_filename(os.path.basename(parent_image.filename))}"
        file_path = os.path.join(geocache_folder, filename)

        # Décoder et sauvegarder l'image
        image_data = image_data.split(',')[1]  # Enlever le préfixe data:image/...
        image_bytes = base64.b64decode(image_data)
        
        with open(file_path, 'wb') as f:
            f.write(image_bytes)

        # Créer une nouvelle entrée dans la base de données
        new_image = GeocacheImage(
            geocache_id=parent_image.geocache_id,
            filename=filename,  # Stocker uniquement le nom du fichier, pas le chemin complet
            original_url=parent_image.original_url,
            is_original=False,
            parent_image_id=parent_image_id
        )
        
        db.session.add(new_image)
        db.session.commit()

        return jsonify({
            'message': 'Image saved successfully',
            'image': {
                'id': new_image.id,
                'url': new_image.url,
                'filename': new_image.filename
            }
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error saving modified image: {str(e)}")
        return jsonify({'error': 'Failed to save image'}), 500


@geocaches_bp.route('/geocaches/<int:geocache_id>/details-panel', methods=['GET'])
def get_geocache_details_panel(geocache_id):
    """Renvoie le panneau HTML des détails d'une géocache."""
    print("GCID", geocache_id)
    # Utiliser joinedload pour s'assurer que toutes les relations nécessaires sont chargées
    geocache = Geocache.query.options(
        db.joinedload(Geocache.additional_waypoints),
        db.joinedload(Geocache.attributes),
        db.joinedload(Geocache.checkers),
        db.joinedload(Geocache.zone),
        db.joinedload(Geocache.images)
    ).get_or_404(geocache_id)
    return render_template('geocache_details.html', geocache=geocache)


@geocaches_bp.route('/geocaches/table/<int:zone_id>', methods=['GET'])
def get_geocaches_table(zone_id):
    """Renvoie le template du tableau des geocaches."""
    logger.debug(f"Chargement du template du tableau pour la zone {zone_id}")
    logger.debug(f"Headers de la requête : {dict(request.headers)}")
    logger.debug(f"URL de la requête : {request.url}")
    logger.debug(f"Méthode de la requête : {request.method}")
    
    try:
        # Vérifier que la zone existe
        zone = Zone.query.get(zone_id)
        if not zone:
            logger.error(f"Zone {zone_id} non trouvée")
            return jsonify({
                "error": "Zone non trouvée",
                "zone_id": zone_id
            }), 404

        # Rendre le template
        logger.debug("Rendu du template geocaches_table.html")
        html = render_template('geocaches_table.html', zone_id=zone_id)
        logger.debug("Template rendu avec succès")
        
        # Créer la réponse avec les en-têtes appropriés
        response = make_response(html)
        response.headers.update({
            'Content-Type': 'text/html; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With, HX-Request, HX-Current-URL, HX-Target, HX-Trigger',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        })
        
        return response
        
    except Exception as e:
        logger.exception("Erreur lors du rendu du template")
        return jsonify({
            "error": str(e),
            "zone_id": zone_id
        }), 500


@geocaches_bp.route('/geocaches/table/<int:zone_id>/content', methods=['GET'])
def get_geocaches_table_content(zone_id):
    """Renvoie uniquement le contenu du tableau des geocaches."""
    geocaches = Geocache.query.filter_by(zone_id=zone_id).all()
    return render_template('geocaches_table_content.html', geocaches=geocaches, zone_id=zone_id)


@geocaches_bp.route('/geocaches/<int:geocache_id>/coordinates/edit', methods=['GET'])
def edit_coordinates_form(geocache_id):
    """Renvoie le formulaire d'édition des coordonnées."""
    logger.debug(f"Edit coordinates form requested for geocache {geocache_id}")
    logger.debug(f"Request headers: {dict(request.headers)}")
    
    geocache = Geocache.query.get_or_404(geocache_id)
    response = make_response(render_template('partials/coordinate_edit_form.html', geocache=geocache))
    response.headers['HX-Trigger'] = 'coordinatesFormLoaded'
    
    logger.debug(f"Sending response with headers: {dict(response.headers)}")
    return response


@geocaches_bp.route('/geocaches/<int:geocache_id>/coordinates', methods=['PUT'])
def update_coordinates(geocache_id):
    """Met à jour les coordonnées corrigées d'une géocache."""
    logger.debug(f"Update coordinates requested for geocache {geocache_id}")
    logger.debug(f"Request headers: {dict(request.headers)}")
    logger.debug(f"Form data: {dict(request.form)}")
    
    geocache = Geocache.query.get_or_404(geocache_id)
    
    gc_lat = request.form.get('gc_lat')
    gc_lon = request.form.get('gc_lon')
    
    logger.debug(f"Updating coordinates to: {gc_lat}, {gc_lon}")
    
    # Mise à jour des coordonnées
    geocache.gc_lat_corrected = gc_lat
    geocache.gc_lon_corrected = gc_lon
    
    # TODO: Implémenter la conversion des coordonnées GC en décimales
    # Pour l'instant, on ne met à jour que le format GC
    
    db.session.commit()
    logger.debug("Database updated successfully")
    
    response = make_response(render_template('partials/coordinates_display.html', geocache=geocache))
    response.headers['HX-Trigger'] = 'coordinatesUpdated'
    
    logger.debug(f"Sending response with headers: {dict(response.headers)}")
    return response


@geocaches_bp.route('/map_panel/<int:zone_id>')
def get_map_panel(zone_id):
    """Renvoie le template du panneau de carte pour une zone."""
    zone = Zone.query.get_or_404(zone_id)
    return render_template('map_panel.html', zone=zone)


@geocaches_bp.route('/zone_map/<int:zone_id>')
def get_zone_map(zone_id):
    """Renvoie le template de la carte d'une zone."""
    logger.debug(f"=== DEBUG: Chargement de la carte pour la zone {zone_id} ===")
    zone = Zone.query.get_or_404(zone_id)
    logger.debug(f"=== DEBUG: Zone trouvée: {zone.id} - {zone.name} ===")
    return render_template('zone_map.html', zone=zone)


@geocaches_bp.route('/geocaches/image-editor/<int:image_id>')
def get_image_editor(image_id):
    """Renvoie le template de l'éditeur d'image."""
    # Récupérer l'image depuis la base de données
    image = GeocacheImage.query.get_or_404(image_id)
    
    # Utiliser la même URL que celle générée par la propriété url de GeocacheImage
    image_url = url_for('geocaches.serve_image', filename=f'{image.geocache.gc_code}/{image.filename}')
    
    return render_template('image_editor.html', image_url=image_url)


@geocaches_bp.route('/geocaches_images/<path:filename>')
def serve_image(filename):
    """Sert une image depuis le dossier geocaches_images."""
    return send_from_directory('../geocaches_images', filename, as_attachment=False)


@geocaches_bp.route('/api/geocaches/images/<int:image_id>/delete', methods=['DELETE'])
def delete_image(image_id):
    """Supprime une image non originale d'une géocache."""
    try:
        # Récupérer l'image
        image = GeocacheImage.query.get_or_404(image_id)
        
        # Vérifier que l'image n'est pas une image originale
        if image.is_original:
            return jsonify({'error': 'Cannot delete original images'}), 403
        
        # Chemin du fichier à supprimer
        file_path = os.path.join('../geocaches_images', image.geocache.gc_code, image.filename)
        
        # Supprimer le fichier si il existe
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Supprimer l'entrée de la base de données
        db.session.delete(image)
        db.session.commit()
        
        return jsonify({'message': 'Image deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting image: {str(e)}")
        return jsonify({'error': 'Failed to delete image'}), 500


@geocaches_bp.route('/api/geocaches/<int:geocache_id>/gallery', methods=['GET'])
def get_geocache_gallery(geocache_id):
    """Renvoie uniquement le HTML de la galerie d'images pour un géocache."""
    geocache = Geocache.query.options(db.joinedload(Geocache.images)).get_or_404(geocache_id)
    
    return render_template('partials/geocache_gallery.html', geocache=geocache)


@geocaches_bp.route('/geocaches/<int:geocache_id>/solver/panel', methods=['GET'])
def get_geocache_solver_panel(geocache_id):
    """Renvoie le panneau HTML du solver d'une géocache."""
    try:
        geocache = Geocache.query.get_or_404(geocache_id)
        return render_template('geocache_solver.html',
                             geocache_id=geocache.id,
                             gc_code=geocache.gc_code)
    except Exception as e:
        logger.error(f"Error getting geocache solver panel for {geocache_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500


@geocaches_bp.route('/api/geocaches/<int:geocache_id>/waypoints', methods=['POST'])
def add_waypoint(geocache_id):
    """Ajoute un nouveau waypoint à une géocache."""
    logger.info(f"Route /api/geocaches/{geocache_id}/waypoints appelée avec méthode {request.method}")
    logger.info(f"Headers: {request.headers}")
    
    try:
        # Vérifier si la géocache existe
        geocache = Geocache.query.get_or_404(geocache_id)
        logger.info(f"Geocache trouvée: {geocache.gc_code} - {geocache.name}")
        
        # Récupérer les données JSON ou du formulaire selon le Content-Type
        if request.is_json:
            data = request.json
            logger.info(f"JSON data: {data}")
        else:
            data = request.form
            logger.info(f"Form data: {data}")
        
        # Créer un nouveau waypoint
        waypoint = AdditionalWaypoint(
            geocache_id=geocache_id,
            name=data.get('name', ''),
            prefix=data.get('prefix', ''),
            lookup=data.get('lookup', ''),
            note=data.get('note', '')
        )
        
        # Définir les coordonnées
        gc_lat = data.get('gc_lat')
        gc_lon = data.get('gc_lon')
        
        logger.info(f"Coordonnées reçues: {gc_lat}, {gc_lon}")
        
        # Convertir les coordonnées au format GC en coordonnées décimales
        try:
            # Utiliser la fonction utilitaire pour convertir les coordonnées
            from app.models.geocache import gc_coords_to_decimal
            lat_decimal, lon_decimal = gc_coords_to_decimal(gc_lat, gc_lon)
            
            logger.info(f"Coordonnées converties: {lat_decimal}, {lon_decimal}")
            
            # Définir les coordonnées
            waypoint.set_location(lat_decimal, lon_decimal, gc_lat, gc_lon)
        except Exception as e:
            logger.error(f"Erreur lors de la conversion des coordonnées: {e}")
            # En cas d'erreur de conversion, on utilise quand même les coordonnées GC
            waypoint.gc_lat = gc_lat
            waypoint.gc_lon = gc_lon
        
        # Ajouter et sauvegarder le waypoint
        db.session.add(waypoint)
        db.session.commit()
        
        # Journaliser l'ajout du waypoint
        logger.info(f"Waypoint ajouté avec succès: {waypoint.name} pour geocache {geocache_id}")
        
        # Renvoyer le HTML mis à jour pour la section des waypoints
        return render_template('partials/waypoints_list.html', geocache=geocache)
        
    except Exception as e:
        logger.error(f"Erreur lors de l'ajout d'un waypoint: {e}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@geocaches_bp.route('/api/geocaches/<int:geocache_id>/waypoints/<int:waypoint_id>', methods=['DELETE'])
def delete_waypoint(geocache_id, waypoint_id):
    """Supprime un waypoint d'une géocache."""
    logger.info(f"Route /api/geocaches/{geocache_id}/waypoints/{waypoint_id} appelée avec méthode {request.method}")
    
    try:
        # Vérifier si la géocache existe
        geocache = Geocache.query.get_or_404(geocache_id)
        
        # Vérifier si le waypoint existe et appartient à la géocache
        waypoint = AdditionalWaypoint.query.filter_by(id=waypoint_id, geocache_id=geocache_id).first_or_404()
        
        # Supprimer le waypoint
        db.session.delete(waypoint)
        db.session.commit()
        
        # Journaliser la suppression du waypoint
        logger.info(f"Waypoint {waypoint_id} supprimé avec succès de la geocache {geocache_id}")
        
        # Renvoyer le HTML mis à jour pour la section des waypoints
        return render_template('partials/waypoints_list.html', geocache=geocache)
        
    except Exception as e:
        logger.error(f"Erreur lors de la suppression du waypoint: {e}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@geocaches_bp.route('/api/geocaches/<int:geocache_id>/waypoints/<int:waypoint_id>', methods=['GET'])
def get_waypoint(geocache_id, waypoint_id):
    """Récupère les détails d'un waypoint."""
    logger.info(f"Route GET /api/geocaches/{geocache_id}/waypoints/{waypoint_id} appelée")
    
    try:
        # Vérifier si la géocache existe
        geocache = Geocache.query.get_or_404(geocache_id)
        
        # Vérifier si le waypoint existe et appartient à la géocache
        waypoint = AdditionalWaypoint.query.filter_by(id=waypoint_id, geocache_id=geocache_id).first_or_404()
        
        # Renvoyer les détails du waypoint au format JSON
        return jsonify({
            'id': waypoint.id,
            'geocache_id': waypoint.geocache_id,
            'name': waypoint.name,
            'prefix': waypoint.prefix,
            'lookup': waypoint.lookup,
            'gc_lat': waypoint.gc_lat,
            'gc_lon': waypoint.gc_lon,
            'note': waypoint.note
        })
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du waypoint: {e}")
        return jsonify({'error': str(e)}), 500


@geocaches_bp.route('/api/geocaches/<int:geocache_id>/waypoints/<int:waypoint_id>', methods=['PUT'])
def update_waypoint(geocache_id, waypoint_id):
    """Met à jour un waypoint existant."""
    logger.info(f"Route PUT /api/geocaches/{geocache_id}/waypoints/{waypoint_id} appelée")
    
    try:
        # Vérifier si la géocache existe
        geocache = Geocache.query.get_or_404(geocache_id)
        
        # Vérifier si le waypoint existe et appartient à la géocache
        waypoint = AdditionalWaypoint.query.filter_by(id=waypoint_id, geocache_id=geocache_id).first_or_404()
        
        # Récupérer les données du formulaire
        data = request.json
        
        # Mettre à jour les champs du waypoint
        waypoint.name = data.get('name', waypoint.name)
        waypoint.prefix = data.get('prefix', waypoint.prefix)
        waypoint.lookup = data.get('lookup', waypoint.lookup)
        waypoint.note = data.get('note', waypoint.note)
        
        # Traiter les coordonnées
        gc_lat = data.get('gc_lat')
        gc_lon = data.get('gc_lon')
        
        if gc_lat and gc_lon:
            # Convertir les coordonnées GC en coordonnées décimales
            try:
                # Importer la fonction de conversion
                from app.models.geocache import gc_coords_to_decimal
                lat_decimal, lon_decimal = gc_coords_to_decimal(gc_lat, gc_lon)
                
                # Utiliser la méthode set_location du modèle
                waypoint.set_location(lat_decimal, lon_decimal, gc_lat, gc_lon)
                
                logger.info(f"Coordonnées converties: {gc_lat}, {gc_lon} -> {lat_decimal}, {lon_decimal}")
            except Exception as e:
                logger.error(f"Erreur lors de la conversion des coordonnées: {e}")
                return jsonify({'error': f"Erreur lors de la conversion des coordonnées: {e}"}), 400
        
        # Enregistrer les modifications
        db.session.commit()
        
        # Récupérer la liste mise à jour des waypoints
        return render_template('partials/waypoints_list.html', geocache=geocache)
        
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour du waypoint: {e}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@geocaches_bp.route('/api/geocaches/<int:geocache_id>/nearby', methods=['GET'])
def get_nearby_geocaches(geocache_id):
    """Récupère les géocaches proches d'une géocache donnée."""
    logger.debug(f"Récupération des géocaches proches de {geocache_id}")
    
    # Récupérer la géocache de référence
    geocache = Geocache.query.get_or_404(geocache_id)
    
    # Récupérer la distance maximale depuis les paramètres de requête (par défaut 5km)
    distance_km = float(request.args.get('distance', 5))
    
    # Convertir les km en degrés (approximation: 1 degré = 111km à l'équateur)
    distance_degrees = distance_km / 111.0
    
    # Calculer les limites de la boîte englobante (bounding box)
    min_lat = geocache.latitude - distance_degrees
    max_lat = geocache.latitude + distance_degrees
    # Ajuster la longitude en fonction de la latitude (la distance en longitude varie selon la latitude)
    # cos(latitude) donne le facteur de correction
    lon_correction = math.cos(math.radians(geocache.latitude))
    min_lon = geocache.longitude - (distance_degrees / lon_correction)
    max_lon = geocache.longitude + (distance_degrees / lon_correction)
    
    # Trouver les géocaches dans la boîte englobante
    # Nous utilisons les propriétés latitude et longitude qui sont calculées à partir du champ location
    nearby_geocaches = []
    
    # Récupérer toutes les géocaches (sauf celle de référence)
    all_geocaches = Geocache.query.filter(Geocache.id != geocache_id).all()
    
    # Filtrer manuellement les géocaches qui sont dans la boîte englobante
    for cache in all_geocaches:
        if (cache.latitude and cache.longitude and 
            min_lat <= cache.latitude <= max_lat and 
            min_lon <= cache.longitude <= max_lon):
            
            # Calculer la distance approximative en km (formule de la distance euclidienne)
            # Pour une précision accrue, on pourrait utiliser la formule de Haversine
            lat_diff = cache.latitude - geocache.latitude
            lon_diff = (cache.longitude - geocache.longitude) * lon_correction
            distance = math.sqrt(lat_diff**2 + lon_diff**2) * 111.0
            
            # Ne garder que les géocaches dans le rayon spécifié
            if distance <= distance_km:
                # Ajouter la distance au dictionnaire de la géocache
                cache_dict = {
                    'id': cache.id,
                    'gc_code': cache.gc_code,
                    'name': cache.name,
                    'owner': cache.owner,
                    'cache_type': cache.cache_type,
                    'latitude': cache.latitude,
                    'longitude': cache.longitude,
                    'gc_lat': cache.gc_lat,
                    'gc_lon': cache.gc_lon,
                    'difficulty': cache.difficulty,
                    'terrain': cache.terrain,
                    'distance': round(distance, 2)  # Distance en km, arrondie à 2 décimales
                }
                nearby_geocaches.append(cache_dict)
    
    # Trier par distance
    nearby_geocaches.sort(key=lambda x: x['distance'])
    
    logger.debug(f"Nombre de géocaches proches trouvées: {len(nearby_geocaches)}")
    
    return jsonify(nearby_geocaches)
