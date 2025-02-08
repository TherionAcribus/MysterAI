from flask import Blueprint, jsonify, request, render_template, redirect, url_for, flash, session
import json
from app.models.geocache import Geocache, Zone, AdditionalWaypoint, Checker, GeocacheImage
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

logger = setup_logger()

geocaches_bp = Blueprint('geocaches', __name__)
geocaches_api = Blueprint('geocaches_api', __name__, url_prefix='/api')

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


@geocaches_api.route('/geocaches/<int:geocache_id>', methods=['GET'])
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
        'zone': {
            'id': geocache.zone.id,
            'name': geocache.zone.name,
            'description': geocache.zone.description
        } if geocache.zone else None,
        'images': [{
            'id': image.id,
            'url': image.url
        } for image in geocache.images]
    })


@geocaches_api.route('/geocaches/<int:geocache_id>/text', methods=['GET'])
def get_geocache_text(geocache_id):
    """Recupere le texte brut d'une geocache."""
    logger.debug(f"Recherche du texte de la geocache {geocache_id}")
    geocache = Geocache.query.get_or_404(geocache_id)
    
    return jsonify({
        'description': geocache.description_text
    })


@geocaches_api.route('/geocaches/<int:geocache_id>/coordinates', methods=['GET'])
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


@geocaches_api.route('/geocaches/<int:geocache_id>/details', methods=['GET'])
def get_geocache_details(geocache_id):
    """Recupere les details d'une geocache."""
    logger.debug(f"Recherche de la geocache {geocache_id}")
    try:
        geocache = Geocache.query.options(
            db.joinedload(Geocache.additional_waypoints),
            db.joinedload(Geocache.attributes),
            db.joinedload(Geocache.checkers),
            db.joinedload(Geocache.zone)
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
            } for checker in (geocache.checkers or [])]
        })
    except Exception as e:
        logger.error(f"Error getting geocache {geocache_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500


@geocaches_api.route('/geocaches/<int:geocache_id>', methods=['DELETE'])
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


@geocaches_api.route('/geocaches/add', methods=['POST'])
def add_geocache():
    """Ajoute une nouvelle geocache."""
    try:
        data = request.get_json()
        code = data.get('code')
        zone_id = data.get('zone_id')

        if not code or not zone_id:
            return jsonify({'error': 'Missing required fields'}), 400

        # Verifier si la geocache existe deja
        existing = Geocache.query.filter_by(gc_code=code).first()
        if existing:
            return jsonify({'error': 'Geocache already exists'}), 409

        # Recuperer les informations via le scraper
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

        db.session.add(geocache)
        db.session.commit()

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
            } for wp in geocache.additional_waypoints],
            'checkers': [{
                'id': checker.id,
                'name': checker.name,
                'url': checker.url
            } for checker in geocache.checkers],
            'images': [{
                'id': image.id,
                'url': image.url
            } for image in geocache.images]
        }), 201

    except Exception as e:
        logger.error(f"Error adding geocache: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@geocaches_api.route('/geocaches/<int:geocache_id>/solved-status', methods=['PUT'])
def update_solved_status(geocache_id):
    """Met à jour le statut de résolution d'une geocache."""
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status not in ['solved', 'not_solved', 'ongoing']:
            return jsonify({'error': 'Invalid status'}), 400
            
        geocache = Geocache.query.get_or_404(geocache_id)
        geocache.solved = new_status
        
        if new_status == 'solved':
            geocache.solved_date = datetime.now()
        elif new_status == 'not_solved':
            geocache.solved_date = None
            
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'solved': geocache.solved,
            'solved_date': geocache.solved_date.isoformat() if geocache.solved_date else None
        })
        
    except Exception as e:
        logger.error(f"Error updating solved status: {str(e)}")
        return jsonify({'error': str(e)}), 500


@geocaches_api.route('/geocaches/images/save', methods=['POST'])
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
        geocache_folder = os.path.join('uploads', parent_image.geocache.gc_code)
        os.makedirs(os.path.join('static', geocache_folder), exist_ok=True)

        # Générer un nom de fichier unique
        filename = f"modified_{int(time.time())}_{secure_filename(os.path.basename(parent_image.filename))}"
        file_path = os.path.join(geocache_folder, filename)

        # Décoder et sauvegarder l'image
        image_data = image_data.split(',')[1]  # Enlever le préfixe data:image/...
        image_bytes = base64.b64decode(image_data)
        
        with open(os.path.join('static', file_path), 'wb') as f:
            f.write(image_bytes)

        # Créer une nouvelle entrée dans la base de données
        new_image = GeocacheImage(
            geocache_id=parent_image.geocache_id,
            filename=file_path,
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
