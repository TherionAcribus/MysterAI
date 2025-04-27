from flask import Blueprint, jsonify, request, render_template, redirect, url_for, flash, session, send_file, make_response, abort, Response, stream_with_context
import json
from app.models.geocache import Geocache, Zone, AdditionalWaypoint, Checker, GeocacheImage, gc_coords_to_decimal, GeocacheZone, Owner, Log, Attribute
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
import xml.etree.ElementTree as ET
import re
from flask import Response, stream_with_context
import zipfile
import io
import tempfile
import os.path
from app.routes.settings import get_specific_param
from flask_login import login_required, current_user
from typing import Optional, Dict, Any
import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy import or_, and_, func, text, cast, Integer, String, asc, desc
from sqlalchemy.orm import aliased
import psycopg2
import pytz
from bs4 import BeautifulSoup
from app.geocaching_client import GeocachingClient, Coordinates
from app.utils.coordinates import convert_gc_coords_to_decimal
from app.gpx_generator import create_gpx_file, generate_filename, create_gpx_zip
from app.utils.tools import rot13
from app.services.formula_questions_service import formula_questions_service
from app.services.formula_solver_service import formula_solver_service

logger = setup_logger()

# Un seul blueprint pour toutes les routes
geocaches_bp = Blueprint('geocaches', __name__)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

@geocaches_bp.route('/api/zones/<int:zone_id>/geocaches', methods=['GET'])
def get_geocaches(zone_id):
    """Recupere les geocaches d'une zone."""
    # Récupérer la zone
    zone = Zone.query.get_or_404(zone_id)
    
    # Récupérer toutes les géocaches associées à cette zone
    geocaches = Geocache.query.join(GeocacheZone).filter(GeocacheZone.zone_id == zone_id).all()
    
    logger.debug(f"Geocaches for zone {zone_id}: {geocaches}")
    return jsonify([{
        'id': cache.id,
        'gc_code': cache.gc_code,
        'name': cache.name,
        'owner': cache.owner.name if cache.owner else None,
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
        'solved': cache.solved,
        'found': cache.found,
        'found_date': cache.found_date.isoformat() if cache.found_date else None
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
        db.joinedload(Geocache.images),
        db.joinedload(Geocache.owner)
    ).get_or_404(geocache_id)

    logger.debug(f"Waypoints for geocache {geocache.gc_code}:", [
        {'id': wp.id, 'name': wp.name, 'prefix': wp.prefix} 
        for wp in geocache.additional_waypoints
    ])
    
    return jsonify({
        'id': geocache.id,
        'gc_code': geocache.gc_code,
        'name': geocache.name,
        'owner': geocache.owner.name if geocache.owner else None,
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


@geocaches_bp.route('/api/geocaches/<int:geocache_id>/coordinates', methods=['GET', 'PUT'])
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
            'type': 'original',
            'is_corrected': False
        }
    }

    # Ajout des coordonnees corrigees si elles existent
    if geocache.latitude_corrected is not None and geocache.longitude_corrected is not None:
        coordinates['corrected'] = {
            'latitude': geocache.latitude_corrected,
            'longitude': geocache.longitude_corrected,
            'gc_lat': geocache.gc_lat_corrected,
            'gc_lon': geocache.gc_lon_corrected,
            'type': 'corrected',
            'is_corrected': True
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
        'type': 'waypoint',
        'is_corrected': False
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
            db.joinedload(Geocache.images),
            db.joinedload(Geocache.owner)
        ).get_or_404(geocache_id)
        
        return jsonify({
            'id': geocache.id,
            'gc_code': geocache.gc_code,
            'name': geocache.name,
            'owner': geocache.owner.name if geocache.owner else None,
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

        # Récupérer la zone
        zone = Zone.query.get(zone_id)
        if not zone:
            return jsonify({'error': f'Zone with ID {zone_id} not found'}), 404

        # Vérifier si la géocache existe déjà
        existing_geocache = Geocache.query.filter_by(gc_code=code).first()
        
        if existing_geocache:
            # Vérifier si la zone est déjà associée à la géocache
            if zone in existing_geocache.zones:
                logger.debug(f"La géocache {code} est déjà associée à la zone {zone_id}")
                return jsonify({
                    'error': 'Geocache already exists in this zone',
                    'id': existing_geocache.id,
                    'gc_code': existing_geocache.gc_code,
                    'name': existing_geocache.name,
                    'zone_id': zone_id
                }), 409
            
            # Ajouter la zone à la géocache existante
            existing_geocache.zones.append(zone)
            db.session.commit()
            
            logger.debug(f"Zone {zone_id} ajoutée à la géocache {code} existante")
            return jsonify({
                'message': 'Zone added to existing geocache',
                'id': existing_geocache.id,
                'gc_code': existing_geocache.gc_code,
                'name': existing_geocache.name
            }), 200
        
        # Si la géocache n'existe pas, récupérer les informations via le scraper
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

        # Gérer l'owner
        owner_name = geocache_data.get('owner', '')
        owner = None
        if owner_name:
            # Utiliser session.no_autoflush pour éviter les problèmes de contrainte d'unicité
            with db.session.no_autoflush:
                # Rechercher l'owner existant ou en créer un nouveau
                owner = Owner.query.filter_by(name=owner_name).first()
                if not owner:
                    owner = Owner(name=owner_name)
                    db.session.add(owner)
        
        # Décoder les hints (ROT13)
        decoded_hints = rot13(geocache_data.get('hints', ''))
        logger.debug(f"Hints originaux: {geocache_data.get('hints', '')}")
        logger.debug(f"Hints décodés: {decoded_hints}")
        
        # Traiter les informations de statut "trouvé"
        found = geocache_data.get('found', False)
        found_date = None
        if found and geocache_data.get('found_date'):
            try:
                # Convertir la date au format américain (MM/DD/YYYY) en objet datetime
                found_date = datetime.strptime(geocache_data['found_date'], '%m/%d/%Y')
                logger.debug(f"Date de trouvaille convertie: {found_date}")
            except ValueError as e:
                logger.warning(f"Impossible de parser la date de trouvaille: {geocache_data['found_date']} - {str(e)}")
                
        # Creer la nouvelle geocache
        geocache = Geocache(
            gc_code=code,
            name=geocache_data.get('name', ''),
            owner=owner,
            cache_type=geocache_data.get('cache_type', ''),
            description=geocache_data.get('description', ''),
            difficulty=float(geocache_data.get('difficulty', 1.0)),
            terrain=float(geocache_data.get('terrain', 1.0)),
            size=geocache_data.get('size', ''),
            hints=decoded_hints,
            favorites_count=int(geocache_data.get('favorites', 0)),
            logs_count=int(geocache_data.get('logs_count', 0)),
            hidden_date=hidden_date,
            found=found,
            found_date=found_date
        )
        
        # Associer la géocache à la zone
        geocache.zones.append(zone)
        
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

        # Debug: afficher tous les attributs disponibles dans la base
        logger.debug("Liste des attributs disponibles en base de données:")
        Attribute.debug_all_attributes()

        # Ajouter les attributes
        if geocache_data.get('attributes'):
            logger.debug(f"Données d'attributs reçues: {geocache_data.get('attributes')}")
            logger.debug(f"Nombre d'attributs trouvés dans les données: {len(geocache_data.get('attributes', []))}")
            
            for attr_data in geocache_data['attributes']:
                if isinstance(attr_data, dict):
                    base_name = attr_data.get('name', '')
                    is_negative = attr_data.get('is_negative', False)
                    base_filename = attr_data.get('base_filename', '')
                    
                    logger.debug(f"Traitement de l'attribut: '{base_name}' (négatif: {is_negative}, fichier: {base_filename})")
                    
                    # Rechercher l'attribut dans la base de données
                    attribute = None
                    
                    # Étape 1: Essayer de trouver par base_filename si disponible
                    if base_filename:
                        # Extraire la partie principale du nom de fichier (avant le -yes/-no)
                        main_filename = base_filename
                        if '-yes' in base_filename:
                            main_filename = base_filename.replace('-yes', '')
                            is_negative = False
                        elif '-no' in base_filename:
                            main_filename = base_filename.replace('-no', '')
                            is_negative = True
                            
                        logger.debug(f"Recherche par nom de fichier principal: '{main_filename}', négatif: {is_negative}")
                        
                        # Rechercher tous les attributs et filtrer par icon_url
                        attributes = Attribute.query.all()
                        for attr in attributes:
                            # Extraire le nom de fichier de l'icône
                            if attr.icon_url and main_filename in attr.icon_url:
                                # Vérifier aussi la correspondance positif/négatif
                                if (is_negative and '-no' in attr.icon_url) or (not is_negative and '-yes' in attr.icon_url):
                                    attribute = attr
                                    logger.debug(f"Attribut trouvé par nom de fichier: {attr.name} (ID: {attr.id}, icon: {attr.icon_url})")
                                    break
                    
                    # Étape 2: Si non trouvé, essayer par nom de base avec les nouvelles colonnes
                    if not attribute and Attribute.has_new_columns():
                        logger.debug("Recherche par nom de base et statut positif/négatif")
                        
                        # Essayons plusieurs variantes de noms
                        potential_names = [
                            base_name,  # Nom complet
                            base_name.split(' ')[0],  # Premier mot
                            base_name.replace(' allowed', ''),  # Sans "allowed"
                            base_name.replace(' nearby', ''),   # Sans "nearby"
                            base_name.replace('No ', '')        # Sans "No "
                        ]
                        
                        for potential_name in potential_names:
                            attribute = Attribute.query.filter(
                                Attribute.base_name.like(f"%{potential_name}%"),
                                Attribute.is_negative == is_negative
                            ).first()
                            
                            if attribute:
                                logger.debug(f"Attribut trouvé par nom de base partiel '{potential_name}': {attribute.name}")
                                break
                    
                    # Étape 3: Si toujours non trouvé, essayer par nom simple
                    if not attribute:
                        logger.debug("Recherche par nom")
                        
                        # Essayons avec une recherche partielle
                        attribute = Attribute.query.filter(
                            Attribute.name.like(f"%{base_name}%")
                        ).first()
                        
                        if attribute:
                            logger.debug(f"Attribut trouvé par nom partiel: {attribute.name}")
                    
                    # Si l'attribut existe, l'associer à la géocache
                    if attribute:
                        logger.debug(f"Association de l'attribut '{attribute.name}' à la géocache {code}")
                        geocache.attributes.append(attribute)
                    else:
                        logger.warning(f"Attribut '{base_name}' (négatif: {is_negative}, fichier: {base_filename}) non trouvé dans la base de données")
                elif isinstance(attr_data, str):
                    # Si l'attribut est une simple chaîne, essayer de le trouver par nom
                    logger.debug(f"Attribut sous forme de chaîne: '{attr_data}'")
                    attribute = Attribute.query.filter_by(name=attr_data).first()
                    if attribute:
                        logger.debug(f"Attribut trouvé par nom exact: {attribute.name} (ID: {attribute.id})")
                        geocache.attributes.append(attribute)
                    else:
                        # Essayons de le trouver par nom partiel
                        attribute = Attribute.query.filter(Attribute.name.like(f"%{attr_data}%")).first()
                        if attribute:
                            logger.debug(f"Attribut trouvé par nom partiel: {attribute.name} (ID: {attribute.id})")
                            geocache.attributes.append(attribute)
                        else:
                            logger.warning(f"Attribut '{attr_data}' non trouvé dans la base de données")
                else:
                    logger.warning(f"Format d'attribut non reconnu: {type(attr_data)}")
            
            logger.debug(f"Nombre d'attributs associés à la géocache: {len(geocache.attributes)}")
        else:
            logger.debug("Aucun attribut reçu du scraper pour cette géocache")

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
            existing_geocache = Geocache.query.filter_by(gc_code=code).with_for_update().first()
            if existing_geocache:
                # Vérifier si la zone est déjà associée à la géocache
                if zone in existing_geocache.zones:
                    return jsonify({
                        'error': 'Geocache already exists in this zone',
                        'id': existing_geocache.id,
                        'gc_code': existing_geocache.gc_code,
                        'name': existing_geocache.name,
                        'zone_id': zone_id
                    }), 409
                
                # Ajouter la zone à la géocache existante
                existing_geocache.zones.append(zone)
                db.session.commit()
                
                return jsonify({
                    'message': 'Zone added to existing geocache',
                    'id': existing_geocache.id,
                    'gc_code': existing_geocache.gc_code,
                    'name': existing_geocache.name
                }), 200
                
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
        db.joinedload(Geocache.zones),
        db.joinedload(Geocache.images),
        db.joinedload(Geocache.owner)
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
    # Récupérer la zone
    zone = Zone.query.get_or_404(zone_id)
    
    # Récupérer toutes les géocaches associées à cette zone
    geocaches = Geocache.query.join(GeocacheZone).filter(GeocacheZone.zone_id == zone_id).all()
    
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
    
    # Mise à jour des coordonnées au format GC
    geocache.gc_lat_corrected = gc_lat
    geocache.gc_lon_corrected = gc_lon
    
    # Conversion des coordonnées GC en décimales
    try:
        from app.models.geocache import gc_coords_to_decimal
        lat_decimal, lon_decimal = gc_coords_to_decimal(gc_lat, gc_lon)
        
        if lat_decimal is not None and lon_decimal is not None:
            # Utilisation de la méthode set_location_corrected pour mettre à jour location_corrected
            geocache.set_location_corrected(lat_decimal, lon_decimal, gc_lat, gc_lon)
            logger.debug(f"Coordonnées converties et mises à jour: {lat_decimal}, {lon_decimal}")
        else:
            logger.error(f"Échec de conversion des coordonnées: {gc_lat}, {gc_lon}")
    except Exception as e:
        logger.error(f"Erreur lors de la conversion des coordonnées: {str(e)}")
    
    # Récupération du paramètre auto_mark_solved
    try:
        response = get_specific_param('auto_mark_solved')
        auto_mark_solved = response.json.get('value', False)
        
        # Mise à jour du statut en fonction du paramètre
        new_status = 'solved' if auto_mark_solved else 'in_progress'
        geocache.solved = new_status
        
        if new_status == 'solved':
            geocache.solved_date = datetime.now()
        
        logger.debug(f"Updated solved status to {new_status} based on auto_mark_solved={auto_mark_solved}")
    except Exception as e:
        logger.error(f"Error while updating solved status: {str(e)}")
    
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


@geocaches_bp.route('/geocaches/solver/panel', methods=['GET'])
def get_standalone_solver_panel():
    """Renvoie le panneau HTML du solver sans géocache associée."""
    try:
        return render_template('geocache_solver.html',
                               geocache_id=None,
                               gc_code=None)
    except Exception as e:
        logger.error(f"Error getting standalone solver panel: {str(e)}")
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
                # Vérifier si la cache a des coordonnées corrigées
                has_corrected_coords = cache.location_corrected is not None
                
                # Ajouter la distance au dictionnaire de la géocache
                cache_dict = {
                    'id': cache.id,
                    'gc_code': cache.gc_code,
                    'name': cache.name,
                    'owner': cache.owner.name if cache.owner else None,
                    'cache_type': cache.cache_type,
                    'latitude': cache.latitude,
                    'longitude': cache.longitude,
                    'gc_lat': cache.gc_lat,
                    'gc_lon': cache.gc_lon,
                    'difficulty': cache.difficulty,
                    'terrain': cache.terrain,
                    'distance': round(distance, 2),  # Distance en km, arrondie à 2 décimales
                    'is_corrected': has_corrected_coords
                }
                
                # Ajouter les coordonnées corrigées si elles existent
                if has_corrected_coords:
                    cache_dict.update({
                        'corrected_latitude': cache.latitude_corrected,
                        'corrected_longitude': cache.longitude_corrected,
                        'gc_lat_corrected': cache.gc_lat_corrected,
                        'gc_lon_corrected': cache.gc_lon_corrected
                    })
                    
                    # Si on a des coordonnées corrigées, recalculer la distance sur la base de ces coordonnées
                    if cache.latitude_corrected and cache.longitude_corrected:
                        lat_diff_corrected = cache.latitude_corrected - geocache.latitude
                        lon_diff_corrected = (cache.longitude_corrected - geocache.longitude) * lon_correction
                        distance_corrected = math.sqrt(lat_diff_corrected**2 + lon_diff_corrected**2) * 111.0
                        cache_dict['distance_corrected'] = round(distance_corrected, 2)
                
                nearby_geocaches.append(cache_dict)
    
    # Trier par distance (utiliser distance_corrected si disponible, sinon distance)
    nearby_geocaches.sort(key=lambda x: x.get('distance_corrected', x['distance']))
    
    logger.debug(f"Nombre de géocaches proches trouvées: {len(nearby_geocaches)}")
    
    return jsonify(nearby_geocaches)


@geocaches_bp.route('/api/waypoints/project', methods=['POST'])
def project_waypoint():
    """
    Projette un waypoint en utilisant le plugin d'orientation
    """
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'Données JSON manquantes'}), 400
        
        # Récupérer les données nécessaires
        gc_lat = data.get('gc_lat')
        gc_lon = data.get('gc_lon')
        distance = data.get('distance')
        distance_unit = data.get('distance_unit', 'm')
        bearing_deg = data.get('bearing_deg')
        
        # Vérifier que toutes les données nécessaires sont présentes
        if not all([gc_lat, gc_lon, distance, bearing_deg]):
            return jsonify({'error': 'Paramètres manquants'}), 400
        
        # Préparer les entrées pour le plugin
        coord_str = f"{gc_lat} {gc_lon}"
        
        # Récupérer le plugin d'orientation
        from app import get_plugin_manager
        plugin_manager = get_plugin_manager()
        
        orientation_calculation = plugin_manager.get_plugin('orientation_calculation')
        
        if not orientation_calculation:
            return jsonify({'error': 'Plugin de projection non disponible'}), 500
        
        # Exécuter le plugin
        result = orientation_calculation.execute({
            'text': coord_str,
            'bearing_deg': float(bearing_deg),
            'distance': float(distance),
            'distance_unit': distance_unit
        })
        
        # Extraire les nouvelles coordonnées
        new_coord_str = result.get('text_output', '')
        new_gc_lat = result.get('gc_lat', '')
        new_gc_lon = result.get('gc_lon', '')
        
        # Vérifier que les coordonnées ont été correctement extraites
        if new_gc_lat and new_gc_lon:
            return jsonify({
                'success': True,
                'gc_lat': new_gc_lat,
                'gc_lon': new_gc_lon,
                'full_coords': new_coord_str
            }), 200
        else:
            # Fallback: essayer de séparer manuellement la chaîne complète
            parts = new_coord_str.split()
            if len(parts) >= 6:
                new_gc_lat = f"{parts[0]} {parts[1]} {parts[2]}"
                new_gc_lon = f"{parts[3]} {parts[4]} {parts[5]}"
                return jsonify({
                    'success': True,
                    'gc_lat': new_gc_lat,
                    'gc_lon': new_gc_lon,
                    'full_coords': new_coord_str
                }), 200
            else:
                return jsonify({'error': 'Format de coordonnées invalide'}), 500
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la projection du waypoint: {str(e)}")
        return jsonify({'error': str(e)}), 500


@geocaches_bp.route('/api/geocaches/import-gpx', methods=['POST'])
def import_gpx():
    """Importe des géocaches depuis un fichier GPX (Pocket Query) ou ZIP."""
    try:
        # Vérifier si un fichier a été envoyé
        if 'gpxFile' not in request.files:
            return jsonify({'error': 'Aucun fichier sélectionné'}), 400
            
        uploaded_file = request.files['gpxFile']
        
        # Vérifier si le fichier est vide
        if uploaded_file.filename == '':
            return jsonify({'error': 'Aucun fichier sélectionné'}), 400
            
        # Récupérer l'ID de la zone
        zone_id = request.form.get('zone_id')
        if not zone_id:
            return jsonify({'error': 'ID de zone manquant'}), 400
            
        # Vérifier que la zone existe
        zone = Zone.query.get(zone_id)
        if not zone:
            return jsonify({'error': f'Zone avec ID {zone_id} introuvable'}), 404
            
        # Vérifier si l'option de mise à jour des waypoints est activée
        update_existing = request.form.get('updateExisting') == 'on'
        
        # Utiliser stream_with_context pour envoyer des mises à jour de progression
        def generate():
            try:
                # Statistiques globales
                total_geocaches_added = 0
                total_geocaches_skipped = 0
                total_waypoints_added = 0
                total_errors = 0
                total_files = 0
                processed_files = 0
                
                # Vérifier le type de fichier
                current_app.logger.info(f"Traitement du fichier: {uploaded_file.filename}, type: {uploaded_file.content_type}")
                
                if uploaded_file.filename.lower().endswith('.zip'):
                    yield json.dumps({'message': 'Extraction du fichier ZIP...', 'progress': 5}) + '\n'
                    
                    # Créer un fichier temporaire pour le ZIP
                    with tempfile.TemporaryDirectory() as temp_dir:
                        zip_path = os.path.join(temp_dir, 'upload.zip')
                        uploaded_file.save(zip_path)
                        
                        # Variables pour stocker les fichiers GPX
                        gpx_files = []
                        waypoints_files = []
                        
                        # Extraire les fichiers GPX du ZIP
                        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                            file_list = zip_ref.namelist()
                            current_app.logger.info(f"Contenu du ZIP: {file_list}")
                            
                            # Identifier les fichiers GPX et les fichiers de waypoints
                            for filename in file_list:
                                if filename.lower().endswith('.gpx'):
                                    # Extraire le fichier
                                    extracted_path = os.path.join(temp_dir, filename)
                                    with open(extracted_path, 'wb') as f:
                                        f.write(zip_ref.read(filename))
                                    
                                    # Déterminer si c'est un fichier de waypoints
                                    if '-wpts' in filename.lower():
                                        current_app.logger.info(f"Fichier de waypoints détecté: {filename}")
                                        waypoints_files.append(extracted_path)
                                    else:
                                        current_app.logger.info(f"Fichier GPX principal détecté: {filename}")
                                        gpx_files.append(extracted_path)
                        
                        total_files = len(gpx_files) + len(waypoints_files)
                        
                        if not gpx_files and not waypoints_files:
                            current_app.logger.warning("Aucun fichier GPX trouvé dans l'archive ZIP")
                            yield json.dumps({'error': True, 'message': 'Aucun fichier GPX trouvé dans l\'archive ZIP'}) + '\n'
                            return
                            
                        yield json.dumps({
                            'message': f'Fichiers trouvés: {len(gpx_files)} fichiers GPX, {len(waypoints_files)} fichiers de waypoints',
                            'progress': 10
                        }) + '\n'
                        
                        # Traiter d'abord les fichiers GPX principaux
                        for i, gpx_file_path in enumerate(gpx_files):
                            try:
                                # Calculer la progression en fonction du nombre total de fichiers
                                progress = 10 + int((i / total_files) * 85) if total_files > 0 else 10
                                
                                yield json.dumps({
                                    'message': f'Traitement du fichier {os.path.basename(gpx_file_path)}...',
                                    'progress': progress
                                }) + '\n'
                                
                                # Traiter le fichier GPX
                                file_stats = process_gpx_file(gpx_file_path, zone_id, update_existing)
                                processed_files += 1
                                
                                # Mettre à jour les statistiques globales
                                total_geocaches_added += file_stats['added']
                                total_geocaches_skipped += file_stats['skipped']
                                total_waypoints_added += file_stats['waypoints']
                                total_errors += file_stats['errors']
                                
                                # Calculer la progression mise à jour
                                progress = 10 + int((processed_files / total_files) * 85) if total_files > 0 else 50
                                
                                # Envoyer un message de progression
                                yield json.dumps({
                                    'progress': progress,
                                    'message': f"Fichier {os.path.basename(gpx_file_path)} traité: {file_stats['added']} géocaches ajoutées, {file_stats['waypoints']} waypoints"
                                }) + '\n'
                                
                            except Exception as e:
                                current_app.logger.error(f"Erreur lors du traitement du fichier GPX {gpx_file_path}: {str(e)}")
                                yield json.dumps({'error': True, 'message': f'Erreur lors du traitement du fichier {os.path.basename(gpx_file_path)}: {str(e)}'}) + '\n'
                                total_errors += 1
                                processed_files += 1
                        
                        # Traiter ensuite les fichiers de waypoints additionnels
                        for i, wp_file_path in enumerate(waypoints_files):
                            try:
                                # Calculer la progression en fonction du nombre total de fichiers
                                progress = 10 + int(((len(gpx_files) + i) / total_files) * 85) if total_files > 0 else 75
                                
                                yield json.dumps({
                                    'message': f'Traitement du fichier de waypoints {os.path.basename(wp_file_path)}...',
                                    'progress': progress
                                }) + '\n'
                                
                                current_app.logger.info(f"Début du traitement du fichier de waypoints: {wp_file_path}")
                                
                                # Traiter le fichier de waypoints
                                file_stats = process_waypoints_file(wp_file_path, zone_id)
                                processed_files += 1
                                
                                current_app.logger.info(f"Résultat du traitement: {file_stats}")
                                
                                # Mettre à jour les statistiques globales
                                total_waypoints_added += file_stats['waypoints']
                                total_errors += file_stats['errors']
                                
                                # Calculer la progression mise à jour
                                progress = 10 + int((processed_files / total_files) * 85) if total_files > 0 else 85
                                
                                # Envoyer un message de progression
                                yield json.dumps({
                                    'progress': progress,
                                    'message': f"Fichier {os.path.basename(wp_file_path)} traité: {file_stats['waypoints']} waypoints ajoutés"
                                }) + '\n'
                                
                            except Exception as e:
                                current_app.logger.error(f"Erreur lors du traitement du fichier de waypoints {wp_file_path}: {str(e)}")
                                import traceback
                                current_app.logger.error(traceback.format_exc())
                                yield json.dumps({'error': True, 'message': f'Erreur lors du traitement du fichier {os.path.basename(wp_file_path)}: {str(e)}'}) + '\n'
                                total_errors += 1
                                processed_files += 1
                
                elif uploaded_file.filename.lower().endswith('.gpx'):
                    # Variables pour stocker les fichiers GPX
                    gpx_files = []
                    waypoints_files = []
                    
                    # Créer un fichier temporaire pour le GPX
                    with tempfile.TemporaryDirectory() as temp_dir:
                        gpx_path = os.path.join(temp_dir, 'upload.gpx')
                        uploaded_file.save(gpx_path)
                        
                        # Déterminer si c'est un fichier de waypoints
                        if '-wpts' in uploaded_file.filename.lower():
                            current_app.logger.info(f"Fichier GPX de waypoints détecté: {uploaded_file.filename}")
                            waypoints_files.append(gpx_path)
                        else:
                            current_app.logger.info(f"Fichier GPX principal détecté: {uploaded_file.filename}")
                            gpx_files.append(gpx_path)
                        
                        total_files = len(gpx_files) + len(waypoints_files)
                            
                        # Traiter d'abord les fichiers GPX principaux
                        for i, gpx_file_path in enumerate(gpx_files):
                            try:
                                # Calculer la progression en fonction du nombre total de fichiers
                                progress = 10 + int((i / total_files) * 85) if total_files > 0 else 25
                                
                                yield json.dumps({
                                    'message': f'Traitement du fichier {os.path.basename(gpx_file_path)}...',
                                    'progress': progress
                                }) + '\n'
                                
                                # Traiter le fichier GPX
                                file_stats = process_gpx_file(gpx_file_path, zone_id, update_existing)
                                processed_files += 1
                                
                                # Mettre à jour les statistiques globales
                                total_geocaches_added += file_stats['added']
                                total_geocaches_skipped += file_stats['skipped']
                                total_waypoints_added += file_stats['waypoints']
                                total_errors += file_stats['errors']
                                
                                # Calculer la progression mise à jour
                                progress = 10 + int((processed_files / total_files) * 85) if total_files > 0 else 60
                                
                                # Envoyer un message de progression
                                yield json.dumps({
                                    'progress': progress,
                                    'message': f"Fichier {os.path.basename(gpx_file_path)} traité: {file_stats['added']} géocaches ajoutées, {file_stats['waypoints']} waypoints"
                                }) + '\n'
                                
                            except Exception as e:
                                current_app.logger.error(f"Erreur lors du traitement du fichier GPX {gpx_file_path}: {str(e)}")
                                yield json.dumps({'error': True, 'message': f'Erreur lors du traitement du fichier {os.path.basename(gpx_file_path)}: {str(e)}'}) + '\n'
                                total_errors += 1
                                processed_files += 1
                        
                        # Traiter ensuite les fichiers de waypoints additionnels
                        for i, wp_file_path in enumerate(waypoints_files):
                            try:
                                # Calculer la progression en fonction du nombre total de fichiers
                                progress = 10 + int(((len(gpx_files) + i) / total_files) * 85) if total_files > 0 else 75
                                
                                yield json.dumps({
                                    'message': f'Traitement du fichier de waypoints {os.path.basename(wp_file_path)}...',
                                    'progress': progress
                                }) + '\n'
                                
                                current_app.logger.info(f"Début du traitement du fichier de waypoints: {wp_file_path}")
                                
                                # Traiter le fichier de waypoints
                                file_stats = process_waypoints_file(wp_file_path, zone_id)
                                processed_files += 1
                                
                                current_app.logger.info(f"Résultat du traitement: {file_stats}")
                                
                                # Mettre à jour les statistiques globales
                                total_waypoints_added += file_stats['waypoints']
                                total_errors += file_stats['errors']
                                
                                # Calculer la progression mise à jour
                                progress = 10 + int((processed_files / total_files) * 85) if total_files > 0 else 85
                                
                                # Envoyer un message de progression
                                yield json.dumps({
                                    'progress': progress,
                                    'message': f"Fichier {os.path.basename(wp_file_path)} traité: {file_stats['waypoints']} waypoints ajoutés"
                                }) + '\n'
                                
                            except Exception as e:
                                current_app.logger.error(f"Erreur lors du traitement du fichier de waypoints {wp_file_path}: {str(e)}")
                                import traceback
                                current_app.logger.error(traceback.format_exc())
                                yield json.dumps({'error': True, 'message': f'Erreur lors du traitement du fichier {os.path.basename(wp_file_path)}: {str(e)}'}) + '\n'
                                total_errors += 1
                                processed_files += 1
                else:
                    current_app.logger.warning(f"Format de fichier non pris en charge: {uploaded_file.filename}")
                    yield json.dumps({'error': True, 'message': 'Format de fichier non pris en charge. Utilisez .gpx ou .zip'}) + '\n'
                    return
                
                # Construire le message de résumé
                summary_message = f'Importation terminée: {total_geocaches_added} géocaches ajoutées, {total_waypoints_added} waypoints additionnels'
                if total_geocaches_skipped > 0:
                    summary_message += f', {total_geocaches_skipped} géocaches ignorées'
                if total_errors > 0:
                    summary_message += f', {total_errors} erreurs'
                
                # Envoyer un résumé final avec un flag spécial pour indiquer que c'est le dernier message
                current_app.logger.info(f"Importation terminée: {total_geocaches_added} géocaches ajoutées, {total_waypoints_added} waypoints additionnels")
                yield json.dumps({
                    'progress': 100,
                    'message': summary_message,
                    'final_summary': True,  # Ce flag permet au frontend de savoir que c'est le résumé final à conserver
                    'stats': {
                        'geocaches_added': total_geocaches_added,
                        'geocaches_skipped': total_geocaches_skipped,
                        'waypoints_added': total_waypoints_added,
                        'errors': total_errors
                    }
                }) + '\n'
                
            except Exception as e:
                current_app.logger.error(f"Erreur lors de l'importation: {str(e)}")
                import traceback
                current_app.logger.error(traceback.format_exc())
                yield json.dumps({'error': True, 'message': f'Erreur: {str(e)}'}) + '\n'
        
        # Retourner la réponse en streaming
        return Response(stream_with_context(generate()), 
                       content_type='application/json')
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de l'importation: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


def process_gpx_file(gpx_file_path, zone_id, update_existing):
    """Traite un fichier GPX principal et retourne des statistiques."""
    # Statistiques
    stats = {
        'added': 0,
        'skipped': 0,
        'waypoints': 0,
        'logs': 0,
        'errors': 0
    }
    
    try:
        # Récupérer la zone
        zone = Zone.query.get(zone_id)
        if not zone:
            current_app.logger.error(f"Zone {zone_id} non trouvée")
            return stats
            
        # Parser le fichier GPX
        tree = ET.parse(gpx_file_path)
        root = tree.getroot()
        
        # Définir les namespaces
        ns = {
            'default': 'http://www.topografix.com/GPX/1/0',
            'groundspeak': 'http://www.groundspeak.com/cache/1/0/1'
        }
        
        # Compter le nombre total de waypoints
        waypoints = root.findall('default:wpt', ns)
        total_waypoints = len(waypoints)
        
        if total_waypoints == 0:
            current_app.logger.info('Aucune géocache trouvée dans le fichier GPX')
            return stats
        
        # Dictionnaire pour stocker les waypoints additionnels par code GC
        additional_waypoints = {}
        
        # Premier passage: identifier les géocaches principales et les waypoints additionnels
        for waypoint in waypoints:
            try:
                # Extraire le code du waypoint
                name_elem = waypoint.find('default:name', ns)
                if name_elem is None or not name_elem.text:
                    continue
                    
                waypoint_code = name_elem.text.strip()
                
                # Vérifier si c'est un waypoint additionnel
                # Format typique: GC12345-1, GC12345-PARKING, etc.
                if re.match(r'GC[A-Z0-9]+-\w+', waypoint_code):
                    # Extraire le code GC principal
                    gc_code = waypoint_code.split('-')[0]
                    
                    # Stocker le waypoint additionnel
                    if gc_code not in additional_waypoints:
                        additional_waypoints[gc_code] = []
                        
                    additional_waypoints[gc_code].append(waypoint)
            except Exception as e:
                current_app.logger.error(f"Erreur lors de l'analyse des waypoints: {str(e)}")
                stats['errors'] += 1
        
        # Deuxième passage: traiter les géocaches principales
        for index, waypoint in enumerate(waypoints):
            try:
                # Extraire les données de base du waypoint
                lat = float(waypoint.attrib.get('lat', 0))
                lon = float(waypoint.attrib.get('lon', 0))
                
                # Extraire le code GC
                name_elem = waypoint.find('default:name', ns)
                if name_elem is None or not name_elem.text:
                    continue
                    
                gc_code = name_elem.text.strip()
                
                # Ignorer les waypoints additionnels dans ce passage
                if not gc_code.startswith('GC') or re.match(r'GC[A-Z0-9]+-\w+', gc_code):
                    continue
                
                # Vérifier si la géocache existe déjà dans la base de données
                existing_geocache = Geocache.query.filter_by(gc_code=gc_code).first()
                
                # Vérifier si la géocache est déjà associée à cette zone
                if existing_geocache:
                    # Vérifier si la zone est déjà associée à la géocache
                    zone_already_associated = zone in existing_geocache.zones
                    
                    if zone_already_associated and not update_existing:
                        stats['skipped'] += 1
                        current_app.logger.info(f'Géocache {gc_code} déjà associée à la zone {zone_id}, ignorée')
                        continue
                    
                    if not zone_already_associated:
                        # Ajouter la zone à la géocache existante
                        existing_geocache.zones.append(zone)
                        db.session.commit()
                        stats['added'] += 1
                        current_app.logger.info(f'Zone {zone_id} ajoutée à la géocache {gc_code}')
                    
                    # Si update_existing est True, on traite les waypoints et les logs même si la géocache existe déjà
                    if update_existing:
                        # Vérifier si la cache a été trouvée et mettre à jour le statut
                        sym_elem = waypoint.find('default:sym', ns)
                        if sym_elem is not None and sym_elem.text:
                            is_found = 'Found' in sym_elem.text
                            current_app.logger.debug(f"Mise à jour du statut trouvé pour {gc_code}: {sym_elem.text} -> {is_found}")
                            existing_geocache.found = is_found
                        
                        # Traiter les waypoints additionnels pour cette géocache
                        if gc_code in additional_waypoints:
                            waypoints_added = process_additional_waypoints(existing_geocache, additional_waypoints[gc_code], ns)
                            stats['waypoints'] += waypoints_added
                        
                        # Traiter les attributs de la géocache existante
                        attributes_elem = cache_data.find('groundspeak:attributes', ns)
                        if attributes_elem is not None:
                            current_app.logger.debug(f"Mise à jour des attributs pour la géocache existante {gc_code}")
                            # Commencer par effacer les attributs existants si demandé
                            # existing_geocache.attributes.clear()
                            
                            attr_elements = attributes_elem.findall('groundspeak:attribute', ns)
                            for attr_elem in attr_elements:
                                try:
                                    attr_id = attr_elem.get('id', '')
                                    attr_inc = attr_elem.get('inc', '1')  # '1' = attribut positif, '0' = attribut négatif
                                    is_negative = attr_inc == '0'
                                    attr_text = attr_elem.text.strip() if attr_elem.text else ''
                                    
                                    current_app.logger.debug(f"Attribut trouvé: id={attr_id}, inc={attr_inc}, text={attr_text}")
                                    
                                    # Vérifier si cet attribut existe déjà pour cette géocache
                                    existing_attr = False
                                    for existing_attribute in existing_geocache.attributes:
                                        # Simplifier les noms pour la comparaison
                                        existing_name = existing_attribute.name.lower()
                                        current_name = attr_text.lower()
                                        
                                        # Comparer les noms simplifiés
                                        if (existing_name in current_name or current_name in existing_name or
                                            (existing_attribute.base_name and 
                                             existing_attribute.base_name.lower() in current_name)):
                                            existing_attr = True
                                            current_app.logger.debug(f"Attribut déjà présent: {existing_attribute.name}")
                                            break
                                    
                                    if existing_attr:
                                        continue
                                    
                                    # Chercher l'attribut dans la base de données
                                    attribute = None
                                    
                                    # 1. Rechercher par nom
                                    if attr_text:
                                        # Essayer plusieurs variantes de noms
                                        potential_names = [
                                            attr_text,  # Nom complet
                                            attr_text.split(' ')[0],  # Premier mot
                                            attr_text.replace(' allowed', ''),  # Sans "allowed"
                                            attr_text.replace(' nearby', ''),   # Sans "nearby"
                                            attr_text.replace('No ', '')        # Sans "No "
                                        ]
                                        
                                        for potential_name in potential_names:
                                            attribute = Attribute.query.filter(
                                                Attribute.name.like(f"%{potential_name}%")
                                            ).first()
                                            
                                            if attribute:
                                                # Vérifier si c'est le bon état (positif/négatif)
                                                if Attribute.has_new_columns() and attribute.is_negative != is_negative:
                                                    # Chercher l'attribut opposé
                                                    opposite = attribute.opposite_attribute
                                                    if opposite:
                                                        attribute = opposite
                                                break
                                    
                                    # 2. Si non trouvé, rechercher par icon_url
                                    if not attribute and attr_id:
                                        # Construire un nom de fichier probable
                                        base_name = attr_text.lower().replace(' ', '_')
                                        suffix = 'no' if is_negative else 'yes'
                                        filename_pattern = f"{base_name}-{suffix}"
                                        
                                        # Rechercher tous les attributs et filtrer par icon_url
                                        all_attributes = Attribute.query.all()
                                        for attr in all_attributes:
                                            if attr.icon_url and filename_pattern in attr.icon_url.lower():
                                                attribute = attr
                                                break
                                    
                                    # Si l'attribut existe, l'associer à la géocache
                                    if attribute:
                                        current_app.logger.debug(f"Ajout de l'attribut à la géocache existante: {attribute.name}")
                                        existing_geocache.attributes.append(attribute)
                                    else:
                                        current_app.logger.warning(f"Attribut non trouvé dans la base: {attr_text}")
                                        
                                except Exception as e:
                                    current_app.logger.error(f"Erreur lors du traitement de l'attribut existant: {str(e)}")
                        
                        # Traiter les logs de cette géocache
                        cache_data = waypoint.find('groundspeak:cache', ns)
                        if cache_data is not None:
                            logs_added = process_logs(existing_geocache, cache_data, ns)
                            stats['logs'] += logs_added
                    
                    continue
                
                # Si la géocache n'existe pas, on la crée
                # Extraire les données de la cache
                cache_data = waypoint.find('groundspeak:cache', ns)
                if cache_data is None:
                    continue
                
                # Nom de la cache
                cache_name = cache_data.find('groundspeak:name', ns)
                name = cache_name.text if cache_name is not None else ""
                
                # Propriétaire
                owner = cache_data.find('groundspeak:owner', ns)
                owner_name = owner.text if owner is not None else ""
                
                # Type de cache
                cache_type = cache_data.find('groundspeak:type', ns)
                type_name = cache_type.text if cache_type is not None else ""
                
                # Difficulté et terrain
                difficulty = cache_data.find('groundspeak:difficulty', ns)
                difficulty_value = float(difficulty.text) if difficulty is not None else 1.0
                
                terrain = cache_data.find('groundspeak:terrain', ns)
                terrain_value = float(terrain.text) if terrain is not None else 1.0
                
                # Taille
                container = cache_data.find('groundspeak:container', ns)
                size = container.text if container is not None else ""
                
                # Indices
                hints_elem = cache_data.find('groundspeak:encoded_hints', ns)
                hints = hints_elem.text if hints_elem is not None else ""
                
                # Description
                long_desc = cache_data.find('groundspeak:long_description', ns)
                description = long_desc.text if long_desc is not None and long_desc.text else ""
                
                # Attributs HTML de la description
                is_html = False
                if long_desc is not None and 'html' in long_desc.attrib:
                    is_html = long_desc.attrib['html'].lower() == 'true'
                
                # Si la description n'est pas en HTML, la convertir en HTML basique
                if not is_html and description:
                    description = "<p>" + description.replace('\n', '<br>') + "</p>"
                
                # Date de création
                time_elem = waypoint.find('default:time', ns)
                hidden_date = None
                if time_elem is not None and time_elem.text:
                    try:
                        # Format ISO: 2024-04-19T00:00:00
                        hidden_date = datetime.fromisoformat(time_elem.text.replace('Z', '+00:00'))
                    except ValueError:
                        pass
                
                # Vérifier si la cache a été trouvée
                is_found = False
                sym_elem = waypoint.find('default:sym', ns)
                if sym_elem is not None and sym_elem.text:
                    is_found = 'Found' in sym_elem.text
                    current_app.logger.debug(f"Statut trouvé pour {gc_code}: {sym_elem.text} -> {is_found}")

                # Logs et favoris
                logs_count = 0
                favorites_count = 0
                
                logs_elem = cache_data.find('groundspeak:logs', ns)
                if logs_elem is not None:
                    logs = logs_elem.findall('groundspeak:log', ns)
                    logs_count = len(logs)
                    
                    # Compter les favoris (logs de type "Found it")
                    for log in logs:
                        log_type = log.find('groundspeak:type', ns)
                        if log_type is not None and log_type.text == 'Found it':
                            # Vérifier si le log contient un favori
                            if 'favorite_points' in log.attrib and int(log.attrib['favorite_points']) > 0:
                                favorites_count += 1
            
                # Convertir les coordonnées en format GC
                lat_deg = int(lat)
                lat_min = abs(lat - lat_deg) * 60
                lon_deg = int(lon)
                lon_min = abs(lon - lon_deg) * 60
                
                gc_lat = f"N {abs(lat_deg)}° {lat_min:.3f}" if lat >= 0 else f"S {abs(lat_deg)}° {lat_min:.3f}"
                gc_lon = f"E {abs(lon_deg)}° {lon_min:.3f}" if lon >= 0 else f"W {abs(lon_deg)}° {lon_min:.3f}"
                
                # Gérer l'owner
                owner_obj = None
                if owner_name:
                    # Rechercher l'owner existant ou en créer un nouveau
                    owner_obj = Owner.query.filter_by(name=owner_name).first()
                    if not owner_obj:
                        owner_obj = Owner(name=owner_name)
                        db.session.add(owner_obj)
                        # On doit faire un flush pour obtenir l'ID avant de l'utiliser
                        db.session.flush()
                
                # Créer la nouvelle géocache avec l'objet owner (peut être None)
                geocache = Geocache(
                    gc_code=gc_code,
                    name=name,
                    owner=owner_obj,  # Utilisation de l'objet Owner, pas de la chaîne
                    cache_type=type_name,
                    description=description,
                    difficulty=difficulty_value,
                    terrain=terrain_value,
                    size=size,
                    hints=hints,
                    favorites_count=favorites_count,
                    logs_count=logs_count,
                    hidden_date=hidden_date,
                    found=is_found
                )
                
                # Définir la position
                geocache.set_location(lat, lon, gc_lat=gc_lat, gc_lon=gc_lon)
                
                # Associer la géocache à la zone
                geocache.zones.append(zone)
                
                # Traiter les attributs de la géocache
                attributes_elem = cache_data.find('groundspeak:attributes', ns)
                if attributes_elem is not None:
                    current_app.logger.debug(f"Traitement des attributs pour {gc_code}")
                    attr_elements = attributes_elem.findall('groundspeak:attribute', ns)
                    
                    for attr_elem in attr_elements:
                        try:
                            attr_id = attr_elem.get('id', '')
                            attr_inc = attr_elem.get('inc', '1')  # '1' = attribut positif, '0' = attribut négatif
                            is_negative = attr_inc == '0'
                            attr_text = attr_elem.text.strip() if attr_elem.text else ''
                            
                            current_app.logger.debug(f"Attribut trouvé: id={attr_id}, inc={attr_inc}, text={attr_text}")
                            
                            # Chercher l'attribut dans la base de données
                            attribute = None
                            
                            # 1. Rechercher par nom
                            if attr_text:
                                # Essayer plusieurs variantes de noms
                                potential_names = [
                                    attr_text,  # Nom complet
                                    attr_text.split(' ')[0],  # Premier mot
                                    attr_text.replace(' allowed', ''),  # Sans "allowed"
                                    attr_text.replace(' nearby', ''),   # Sans "nearby"
                                    attr_text.replace('No ', '')        # Sans "No "
                                ]
                                
                                for potential_name in potential_names:
                                    attribute = Attribute.query.filter(
                                        Attribute.name.like(f"%{potential_name}%")
                                    ).first()
                                    
                                    if attribute:
                                        # Vérifier si c'est le bon état (positif/négatif)
                                        if Attribute.has_new_columns() and attribute.is_negative != is_negative:
                                            # Chercher l'attribut opposé
                                            opposite = attribute.opposite_attribute
                                            if opposite:
                                                attribute = opposite
                                        break
                            
                            # 2. Si non trouvé, rechercher par icon_url
                            if not attribute and attr_id:
                                # Construire un nom de fichier probable
                                base_name = attr_text.lower().replace(' ', '_')
                                suffix = 'no' if is_negative else 'yes'
                                filename_pattern = f"{base_name}-{suffix}"
                                
                                # Rechercher tous les attributs et filtrer par icon_url
                                all_attributes = Attribute.query.all()
                                for attr in all_attributes:
                                    if attr.icon_url and filename_pattern in attr.icon_url.lower():
                                        attribute = attr
                                        break
                            
                            # Si l'attribut existe, l'associer à la géocache
                            if attribute:
                                current_app.logger.debug(f"Attribut trouvé dans la base: {attribute.name}")
                                geocache.attributes.append(attribute)
                            else:
                                current_app.logger.warning(f"Attribut non trouvé dans la base: {attr_text}")
                                
                        except Exception as e:
                            current_app.logger.error(f"Erreur lors du traitement de l'attribut: {str(e)}")
                
                # Ajouter la géocache à la base de données
                db.session.add(geocache)
                db.session.commit()
                stats['added'] += 1
                current_app.logger.info(f'Géocache {gc_code} ajoutée avec succès dans la zone {zone_id}')
                
                # Traiter les waypoints additionnels pour cette géocache
                if gc_code in additional_waypoints:
                    waypoints_added = process_additional_waypoints(geocache, additional_waypoints[gc_code], ns)
                    stats['waypoints'] += waypoints_added
                
                # Traiter les logs pour cette géocache
                logs_added = process_logs(geocache, cache_data, ns)
                stats['logs'] += logs_added
                    
            except Exception as e:
                current_app.logger.error(f"Erreur lors du traitement de la géocache {index}: {str(e)}")
                stats['errors'] += 1
                # Annuler la transaction en cours
                db.session.rollback()
        
        return stats
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors du traitement du fichier GPX: {str(e)}")
        raise

def process_logs(geocache, cache_data, ns):
    """Traite les logs pour une géocache à partir des données GPX."""
    logs_added = 0
    
    try:
        # Récupérer les logs existants pour cette géocache
        existing_log_dates = {log.date.strftime('%Y-%m-%d'): log for log in geocache.logs}
        
        # Rechercher les logs dans les données de la cache
        logs_elem = cache_data.find('groundspeak:logs', ns)
        if logs_elem is None:
            return logs_added
            
        logs = logs_elem.findall('groundspeak:log', ns)
        
        for log in logs:
            try:
                # Extraire la date du log
                date_elem = log.find('groundspeak:date', ns)
                if date_elem is None or not date_elem.text:
                    continue
                    
                # Format de date ISO: 2025-03-08T20:00:00Z
                log_date_str = date_elem.text
                log_date = datetime.fromisoformat(log_date_str.replace('Z', '+00:00'))
                log_date_key = log_date.strftime('%Y-%m-%d')
                
                # Extraire le type de log (Found it, DNF, etc.)
                type_elem = log.find('groundspeak:type', ns)
                log_type = type_elem.text if type_elem is not None else "Unknown"
                
                # Extraire l'auteur du log
                finder_elem = log.find('groundspeak:finder', ns)
                if finder_elem is None:
                    continue
                    
                author_name = finder_elem.text
                
                # Extraire le texte du log
                text_elem = log.find('groundspeak:text', ns)
                log_text = text_elem.text if text_elem is not None else ""
                
                # Vérifier si ce log a un favori
                is_favorite = False
                if 'favorite_points' in log.attrib and int(log.attrib.get('favorite_points', '0')) > 0:
                    is_favorite = True
                
                # Vérifier si ce log existe déjà (même date et auteur)
                if log_date_key in existing_log_dates:
                    # Le log existe déjà, on ne fait rien
                    continue
                
                # Trouver ou créer l'auteur
                author = Owner.query.filter_by(name=author_name).first()
                if not author:
                    author = Owner(name=author_name)
                    db.session.add(author)
                    db.session.flush()
                
                # Créer le nouveau log
                new_log = Log(
                    geocache_id=geocache.id,
                    author_id=author.id,
                    text=log_text,
                    date=log_date,
                    log_type=log_type,
                    favorite=is_favorite
                )
                
                # Ajouter le log à la base de données
                db.session.add(new_log)
                logs_added += 1
                
            except Exception as e:
                current_app.logger.error(f"Erreur lors du traitement d'un log: {str(e)}")
        
        # Committer tous les logs ajoutés
        if logs_added > 0:
            db.session.commit()
            current_app.logger.info(f"{logs_added} logs ajoutés pour la géocache {geocache.gc_code}")
        
        return logs_added
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erreur lors du traitement des logs pour la géocache {geocache.gc_code}: {str(e)}")
        return 0


def process_waypoints_file(wp_file_path, zone_id):
    """Traite un fichier GPX de waypoints additionnels et retourne des statistiques."""
    # Statistiques
    stats = {
        'waypoints': 0,
        'errors': 0
    }
    
    try:
        # Parser le fichier GPX
        tree = ET.parse(wp_file_path)
        root = tree.getroot()
        
        # Définir les namespaces
        ns = {
            'default': 'http://www.topografix.com/GPX/1/0',
            'groundspeak': 'http://www.groundspeak.com/cache/1/0/1'
        }
        
        # Compter le nombre total de waypoints
        waypoints = root.findall('default:wpt', ns)
        total_waypoints = len(waypoints)
        
        if total_waypoints == 0:
            current_app.logger.info('Aucun waypoint trouvé dans le fichier')
            return stats
            
        current_app.logger.info(f'Traitement de {total_waypoints} waypoints additionnels...')
        
        # Dictionnaire pour regrouper les waypoints par code GC
        waypoints_by_gc = {}
        
        # Regrouper les waypoints par code GC
        for waypoint in waypoints:
            try:
                # Extraire le code du waypoint
                name_elem = waypoint.find('default:name', ns)
                if name_elem is None or not name_elem.text:
                    continue
                    
                waypoint_code = name_elem.text.strip()
                current_app.logger.debug(f"Analyse du waypoint: {waypoint_code}")
                
                # Vérifier si le code a le bon format (au moins 2 caractères)
                if len(waypoint_code) >= 2:
                    gc_code = None
                    
                    # Méthode 1: Convertir les codes au format Pxxxx ou autres en GCxxxx
                    # En remplaçant simplement les deux premiers caractères par "GC"
                    if not waypoint_code.startswith('GC'):
                        gc_code = "GC" + waypoint_code[2:]
                        current_app.logger.debug(f"Conversion du code {waypoint_code} en {gc_code}")
                    
                    # Méthode 2: Les codes qui commencent déjà par GC sont gardés tels quels
                    elif waypoint_code.startswith('GC'):
                        gc_code = waypoint_code
                        
                        # Si c'est un waypoint additionnel (format GC12345-suffix), extraire le code GC principal
                        if '-' in gc_code:
                            gc_code = gc_code.split('-')[0]
                    
                    # Méthode 3 (fallback): Chercher dans la description ou les commentaires
                    if not gc_code:
                        desc_elem = waypoint.find('default:desc', ns)
                        if desc_elem is not None and desc_elem.text:
                            # Chercher un pattern GC suivi de lettres/chiffres
                            match = re.search(r'GC[A-Z0-9]+', desc_elem.text)
                            if match:
                                gc_code = match.group(0)
                    
                    # Méthode 4 (fallback): Chercher dans les commentaires
                    if not gc_code:
                        cmt_elem = waypoint.find('default:cmt', ns)
                        if cmt_elem is not None and cmt_elem.text:
                            match = re.search(r'GC[A-Z0-9]+', cmt_elem.text)
                            if match:
                                gc_code = match.group(0)
                    
                    # Si on a trouvé un code GC, ajouter le waypoint au dictionnaire
                    if gc_code:
                        current_app.logger.debug(f"Waypoint {waypoint_code} associé à la géocache {gc_code}")
                        if gc_code not in waypoints_by_gc:
                            waypoints_by_gc[gc_code] = []
                        waypoints_by_gc[gc_code].append(waypoint)
                    else:
                        current_app.logger.warning(f"Impossible de trouver le code GC pour le waypoint {waypoint_code}")
            except Exception as e:
                current_app.logger.error(f"Erreur lors de l'analyse du waypoint {waypoint_code if 'waypoint_code' in locals() else 'inconnu'}: {str(e)}")
                stats['errors'] += 1
        
        current_app.logger.info(f"Waypoints regroupés: {len(waypoints_by_gc)} codes GC différents")
        for gc, wps in waypoints_by_gc.items():
            current_app.logger.info(f"  - {gc}: {len(wps)} waypoints")
        
        # Récupérer la zone
        zone = Zone.query.get(zone_id)
        if not zone:
            current_app.logger.error(f"Zone {zone_id} non trouvée")
            return stats
        
        # Traiter les waypoints pour chaque géocache
        for gc_code, wpts in waypoints_by_gc.items():
            try:
                # Debug: Vérifier si la géocache existe dans la base de données
                existing_geocache_check = Geocache.query.filter_by(gc_code=gc_code).first()
                if existing_geocache_check:
                    current_app.logger.info(f"Géocache {gc_code} existe dans la base de données (ID: {existing_geocache_check.id})")
                    
                    # Debug: Vérifier les zones associées
                    associated_zones = [z.id for z in existing_geocache_check.zones]
                    current_app.logger.info(f"Zones associées à {gc_code}: {associated_zones}")
                else:
                    current_app.logger.warning(f"Géocache {gc_code} n'existe pas dans la base de données")
                
                # Vérifier si la géocache existe et est associée à la zone spécifiée
                geocache = Geocache.query.filter_by(gc_code=gc_code).filter(
                    Geocache.zones.any(id=zone_id)
                ).first()
                
                if not geocache:
                    current_app.logger.warning(f'Géocache {gc_code} non trouvée dans la zone {zone_id}, waypoints ignorés')
                    
                    # Option de fallback: vérifier si la géocache existe même sans être associée à cette zone
                    geocache_anywhere = Geocache.query.filter_by(gc_code=gc_code).first()
                    if geocache_anywhere:
                        current_app.logger.info(f'Géocache {gc_code} trouvée mais pas associée à la zone {zone_id}, ajout de la relation...')
                        # Associer la géocache à la zone actuelle
                        geocache_anywhere.zones.append(zone)
                        db.session.commit()
                        geocache = geocache_anywhere
                    else:
                        continue
                
                current_app.logger.info(f"Traitement de {len(wpts)} waypoints pour {gc_code}")
                
                # Traiter les waypoints pour cette géocache
                waypoints_added = process_additional_waypoints(geocache, wpts, ns)
                stats['waypoints'] += waypoints_added
                
                current_app.logger.info(f'{waypoints_added} waypoints ajoutés pour {gc_code} dans la zone {zone_id}')
                
            except Exception as e:
                current_app.logger.error(f"Erreur lors du traitement des waypoints pour {gc_code}: {str(e)}")
                stats['errors'] += 1
                db.session.rollback()
        
        return stats
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors du traitement du fichier de waypoints: {str(e)}")
        raise


def process_additional_waypoints(geocache, waypoints, ns):
    """Traite les waypoints additionnels pour une géocache et retourne le nombre ajouté."""
    waypoints_added = 0
    
    try:
        current_app.logger.info(f"Traitement de {len(waypoints)} waypoints additionnels pour {geocache.gc_code}")
        
        for wp in waypoints:
            try:
                wp_lat = float(wp.attrib.get('lat', 0))
                wp_lon = float(wp.attrib.get('lon', 0))
                
                # Extraire le code et le nom du waypoint
                wp_code = wp.find('default:name', ns).text
                wp_desc = wp.find('default:desc', ns)
                wp_name = wp_desc.text if wp_desc is not None else wp_code
                
                current_app.logger.debug(f"Waypoint: {wp_code}, Nom: {wp_name}, Coords: {wp_lat},{wp_lon}")
                
                # Extraire le préfixe (les deux premiers caractères du code)
                prefix = wp_code[:2] if len(wp_code) >= 2 else ""
                
                # Si c'est au format GCxxxx-SUFFIX, extraire le suffixe après le tiret
                if wp_code.startswith('GC') and '-' in wp_code:
                    prefix = wp_code.split('-')[1]
                
                current_app.logger.debug(f"Préfixe extrait: {prefix}")
                
                # Extraire la note (commentaire)
                wp_cmt = wp.find('default:cmt', ns)
                note = wp_cmt.text if wp_cmt is not None else ""
                
                # Vérifier si ce waypoint existe déjà
                existing_wp = AdditionalWaypoint.query.filter_by(
                    geocache_id=geocache.id, 
                    lookup=wp_code
                ).first()
                
                if existing_wp:
                    current_app.logger.debug(f"Mise à jour du waypoint existant {wp_code}")
                    # Mettre à jour le waypoint existant
                    existing_wp.name = wp_name
                    existing_wp.note = note
                    existing_wp.prefix = prefix
                    
                    # Convertir les coordonnées en format GC
                    wp_lat_deg = int(wp_lat)
                    wp_lat_min = abs(wp_lat - wp_lat_deg) * 60
                    wp_lon_deg = int(wp_lon)
                    wp_lon_min = abs(wp_lon - wp_lon_deg) * 60
                    
                    wp_gc_lat = f"N {abs(wp_lat_deg)}° {wp_lat_min:.3f}" if wp_lat >= 0 else f"S {abs(wp_lat_deg)}° {wp_lat_min:.3f}"
                    wp_gc_lon = f"E {abs(wp_lon_deg)}° {wp_lon_min:.3f}" if wp_lon >= 0 else f"W {abs(wp_lon_deg)}° {wp_lon_min:.3f}"
                    
                    # Mettre à jour la position
                    existing_wp.set_location(wp_lat, wp_lon, gc_lat=wp_gc_lat, gc_lon=wp_gc_lon)
                else:
                    current_app.logger.debug(f"Création d'un nouveau waypoint {wp_code}")
                    # Convertir les coordonnées en format GC
                    wp_lat_deg = int(wp_lat)
                    wp_lat_min = abs(wp_lat - wp_lat_deg) * 60
                    wp_lon_deg = int(wp_lon)
                    wp_lon_min = abs(wp_lon - wp_lon_deg) * 60
                    
                    wp_gc_lat = f"N {abs(wp_lat_deg)}° {wp_lat_min:.3f}" if wp_lat >= 0 else f"S {abs(wp_lat_deg)}° {wp_lat_min:.3f}"
                    wp_gc_lon = f"E {abs(wp_lon_deg)}° {wp_lon_min:.3f}" if wp_lon >= 0 else f"W {abs(wp_lon_deg)}° {wp_lon_min:.3f}"
                    
                    # Créer le waypoint additionnel
                    waypoint = AdditionalWaypoint(
                        geocache_id=geocache.id,
                        name=wp_name,
                        prefix=prefix,
                        lookup=wp_code,
                        note=note
                    )
                    
                    # Définir la position
                    waypoint.set_location(wp_lat, wp_lon, gc_lat=wp_gc_lat, gc_lon=wp_gc_lon)
                    
                    # Ajouter le waypoint à la base de données
                    db.session.add(waypoint)
                    current_app.logger.debug(f"Waypoint {wp_code} ajouté à la base de données")
                
                waypoints_added += 1
                
            except Exception as e:
                current_app.logger.error(f"Erreur lors du traitement du waypoint additionnel {wp_code if 'wp_code' in locals() else 'inconnu'}: {str(e)}")
                # Ajouter la traceback complète pour un meilleur diagnostic
                import traceback
                current_app.logger.error(traceback.format_exc())
        
        # Commit après avoir ajouté tous les waypoints
        if waypoints_added > 0:
            current_app.logger.info(f"Commit de {waypoints_added} waypoints pour {geocache.gc_code}")
            db.session.commit()
        else:
            current_app.logger.warning(f"Aucun waypoint ajouté pour {geocache.gc_code}")
        
        return waypoints_added
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors du traitement des waypoints additionnels: {str(e)}")
        # Ajouter la traceback complète pour un meilleur diagnostic
        import traceback
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        raise

@geocaches_bp.route('/geocaches/solver/panel', methods=['GET'])
def geocache_solver_panel():
    """
    Affiche le panneau du solver pour une géocache spécifiée par son ID
    """
    geocache_id = request.args.get('geocache_id')
    gc_code = request.args.get('gc_code')
    
    return render_template('geocache_solver.html', geocache_id=geocache_id, gc_code=gc_code)

@geocaches_bp.route('/geocaches/formula-solver', methods=['GET', 'POST'])
def formula_solver_panel():
    """
    Affiche le panneau du Formula Solver pour résoudre des coordonnées avec des formules
    """
    # Récupérer les paramètres de GET ou POST
    geocache_id = request.args.get('geocache_id') or request.form.get('geocache_id')
    gc_code = request.args.get('gc_code') or request.form.get('gc_code')
    
    # Récupérer les données de la géocache si un ID est fourni
    geocache = None
    detected_formulas = []
    
    if geocache_id:
        geocache = Geocache.query.options(
            db.joinedload(Geocache.additional_waypoints)
        ).get(geocache_id)
        
        if geocache:
            # Importer et initialiser le plugin formula_parser
            from plugins.official.formula_parser.main import FormulaParserPlugin
            formula_parser = FormulaParserPlugin()
            
            # Analyser la description pour trouver des formules
            if geocache.description:
                # Nettoyer le HTML pour extraire le texte
                description_text = re.sub(r'<[^>]*>', ' ', geocache.description)
                result = formula_parser.execute({'text': description_text})
                
                for coord in result.get('coordinates', []):
                    if coord.get('north') and coord.get('east'):
                        detected_formulas.append({
                            'formula': f"{coord['north']} {coord['east']}",
                            'source': 'Description'
                        })
            
            # Analyser les waypoints
            if geocache.additional_waypoints:
                for wp in geocache.additional_waypoints:
                    wp_text = f"{wp.name} {wp.note or ''}"
                    result = formula_parser.execute({'text': wp_text})
                    
                    for coord in result.get('coordinates', []):
                        if coord.get('north') and coord.get('east'):
                            detected_formulas.append({
                                'formula': f"{coord['north']} {coord['east']}",
                                'source': f"Waypoint {wp.prefix} - {wp.name}"
                            })
    
    return render_template('formula_solver.html', 
                           geocache_id=geocache_id, 
                           gc_code=gc_code,
                           geocache=geocache,
                           detected_formulas=detected_formulas)

@geocaches_bp.route('/multi-solver', methods=['GET'])
def multi_solver_panel():
    """
    Affiche le panneau du multi-solver pour plusieurs géocaches
    """
    return render_template('multi_solver.html')

@geocaches_bp.route('/api/geocaches/coordinates', methods=['POST'])
def get_geocaches_coordinates():
    """
    Récupère les coordonnées d'une liste de géocaches à partir de leurs IDs.
    Utilisé principalement par le Multi Solver pour afficher la carte.
    """
    try:
        data = request.get_json()
        if not data or 'geocache_ids' not in data:
            return jsonify({'error': 'Liste des IDs de géocaches manquante'}), 400
            
        geocache_ids = data['geocache_ids']
        if not isinstance(geocache_ids, list):
            return jsonify({'error': 'Le format attendu est une liste d\'IDs'}), 400
            
        # Récupérer les géocaches correspondantes
        geocaches = Geocache.query.filter(Geocache.id.in_(geocache_ids)).all()
        
        logger.debug(f"API coordinates: Récupération de {len(geocaches)} géocaches sur {len(geocache_ids)} IDs demandés")
        
        # Préparer les données
        geocaches_data = []
        for gc in geocaches:
            if gc.latitude is None and gc.longitude is None:
                logger.debug(f"API coordinates: Géocache {gc.gc_code} (ID={gc.id}) ignorée - pas de coordonnées")
                continue  # Ne pas inclure les géocaches sans coordonnées
                
            # Coordonnées de base
            geocache_data = {
                'id': gc.id,
                'gc_code': gc.gc_code,
                'name': gc.name,
                'cache_type': gc.cache_type,
                'difficulty': gc.difficulty,
                'terrain': gc.terrain,
                'solved': gc.solved,
                'has_corrected': gc.location_corrected is not None
            }
            
            # Toujours inclure les coordonnées d'origine
            geocache_data['latitude'] = gc.latitude
            geocache_data['longitude'] = gc.longitude
            geocache_data['is_corrected'] = False
            
            # Si des coordonnées corrigées existent, les utiliser comme position principale
            if gc.location_corrected is not None:
                # On utilise les propriétés latitude_corrected et longitude_corrected qui sont calculées à partir de location_corrected
                geocache_data['latitude'] = gc.latitude_corrected
                geocache_data['longitude'] = gc.longitude_corrected
                geocache_data['is_corrected'] = True
                
                # Ajouter les coordonnées originales dans un champ séparé
                geocache_data['original_latitude'] = gc.latitude
                geocache_data['original_longitude'] = gc.longitude
                
                logger.debug(f"API coordinates: Géocache {gc.gc_code} (ID={gc.id}) - utilisation coordonnées corrigées ({gc.latitude_corrected}, {gc.longitude_corrected})")
            else:
                logger.debug(f"API coordinates: Géocache {gc.gc_code} (ID={gc.id}) - coordonnées originales ({gc.latitude}, {gc.longitude})")
            
            geocaches_data.append(geocache_data)
        
        logger.debug(f"API coordinates: Envoi de {len(geocaches_data)} géocaches avec coordonnées valides")
        return jsonify(geocaches_data)
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des coordonnées: {str(e)}")
        return jsonify({'error': str(e)}), 500

@geocaches_bp.route('/geocaches/map_panel', methods=['POST'])
def get_geocaches_map_panel():
    """
    Génère un panneau de carte pour plusieurs géocaches.
    Reçoit une liste d'IDs de géocaches et renvoie un template map_panel adapté.
    """
    try:
        data = request.get_json()
        if not data or 'geocache_ids' not in data:
            return jsonify({'error': 'Liste des IDs de géocaches manquante'}), 400
            
        geocache_ids = data['geocache_ids']
        if not isinstance(geocache_ids, list):
            return jsonify({'error': 'Le format attendu est une liste d\'IDs'}), 400
        
        # Juste passer les IDs au template - les coordonnées seront récupérées côté client
        return render_template('map_panel_multi.html', geocache_ids=geocache_ids)
        
    except Exception as e:
        logger.error(f"Erreur lors de la génération du panneau de carte: {str(e)}")
        return jsonify({'error': str(e)}), 500

@geocaches_bp.route('/api/geocaches/reset-coordinates', methods=['POST'])
def reset_coordinates():
    """Réinitialise les coordonnées corrigées d'une liste de géocaches."""
    logger.debug(f"Réinitialisation des coordonnées demandée")
    logger.debug(f"Request headers: {dict(request.headers)}")
    
    try:
        data = request.get_json()
        geocache_ids = data.get('geocache_ids', [])
        
        logger.debug(f"Réinitialisation des coordonnées pour {len(geocache_ids)} géocaches")
        
        # Compteurs pour le suivi
        success_count = 0
        error_count = 0
        
        for geocache_id in geocache_ids:
            try:
                geocache = Geocache.query.get(geocache_id)
                if geocache:
                    # Réinitialisation des coordonnées corrigées
                    geocache.gc_lat_corrected = None
                    geocache.gc_lon_corrected = None
                    geocache.location_corrected = None
                    
                    # Réinitialisation du statut et de la date de résolution
                    geocache.solved = 'not_solved'
                    geocache.solved_date = None
                    
                    success_count += 1
                else:
                    logger.warning(f"Géocache {geocache_id} non trouvée")
                    error_count += 1
            except Exception as e:
                logger.error(f"Erreur lors de la réinitialisation des coordonnées pour la géocache {geocache_id}: {str(e)}")
                error_count += 1
        
        # Commit des changements
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f"{success_count} géocache(s) réinitialisée(s) avec succès.",
            'success_count': success_count,
            'error_count': error_count
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erreur lors de la réinitialisation des coordonnées: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Erreur lors de la réinitialisation des coordonnées: {str(e)}",
            'error': str(e)
        }), 500


@geocaches_bp.route('/api/geocaches/<int:geocache_id>', methods=['GET'])
def get_geocache_map_data(geocache_id):
    """
    Récupère toutes les données d'une géocache pour l'affichage sur la carte.
    Combine les informations de base avec les coordonnées et les waypoints.
    """
    logger.debug(f"Récupération des données de la géocache {geocache_id} pour la carte")
    
    geocache = Geocache.query.options(
        db.joinedload(Geocache.additional_waypoints),
        db.joinedload(Geocache.owner) # Ajouter le chargement de l'owner
    ).get_or_404(geocache_id)
    
    # Préparer les données de base de la géocache
    geocache_data = {
        'id': geocache.id,
        'gc_code': geocache.gc_code,
        'name': geocache.name,
        'cache_type': geocache.cache_type,
        'difficulty': geocache.difficulty,
        'terrain': geocache.terrain,
        'size': geocache.size,
        'solved': geocache.solved,
        'owner_name': geocache.owner.name if geocache.owner else None
    }
    
    # Ajouter le retour de la fonction get_geocache_coordinates
    coordinates = {}
    
    # Coordonnées originales
    coordinates['original'] = {
        'latitude': geocache.latitude,
        'longitude': geocache.longitude,
        'gc_lat': geocache.gc_lat,
        'gc_lon': geocache.gc_lon,
        'type': 'original',
        'is_corrected': False
    }
    
    # Ajouter les coordonnées corrigées si elles existent
    if geocache.latitude_corrected is not None and geocache.longitude_corrected is not None:
        coordinates['corrected'] = {
            'latitude': geocache.latitude_corrected,
            'longitude': geocache.longitude_corrected,
            'gc_lat': geocache.gc_lat_corrected,
            'gc_lon': geocache.gc_lon_corrected,
            'type': 'corrected',
            'is_corrected': True
        }
    
    # Ajouter les waypoints additionnels
    coordinates['waypoints'] = [
        {
            'id': wp.id,
            'name': wp.name,
            'prefix': wp.prefix,
            'lookup': wp.lookup,
            'latitude': wp.latitude,
            'longitude': wp.longitude,
            'gc_lat': wp.gc_lat,
            'gc_lon': wp.gc_lon,
            'type': 'waypoint',
            'is_corrected': False,
            'note': wp.note
        } 
        for wp in geocache.additional_waypoints 
        if wp.latitude is not None and wp.longitude is not None
    ]
    
    # Combiner les données
    geocache_data.update(coordinates)
    
    logger.debug(f"Données récupérées pour la géocache {geocache.gc_code}")
    return jsonify(geocache_data)

@geocaches_bp.route('/api/geocaches/<int:geocache_id>/waypoints/list', methods=['GET'])
def get_waypoints_list(geocache_id):
    """Récupère le HTML pour la liste des waypoints d'une géocache."""
    logger.info(f"Route GET /api/geocaches/{geocache_id}/waypoints/list appelée")
    
    try:
        # Vérifier si la géocache existe
        geocache = Geocache.query.get_or_404(geocache_id)
        
        # Renvoyer le HTML mis à jour pour la section des waypoints
        return render_template('partials/waypoints_list.html', geocache=geocache)
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de la liste des waypoints: {e}")
        return jsonify({'error': str(e)}), 500

@geocaches_bp.route('/geocaches/<int:geocache_id>/mark-as-found', methods=['POST'])
def mark_as_found(geocache_id):
    """Marque une géocache comme trouvée."""
    try:
        geocache = Geocache.query.get_or_404(geocache_id)
        geocache.is_found = True
        geocache.found_date = datetime.now()
        db.session.commit()
        flash('Géocache marquée comme trouvée avec succès.', 'success')
        return redirect(url_for('geocaches.get_geocache_details', geocache_id=geocache_id))
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erreur lors du marquage de la géocache comme trouvée: {str(e)}")
        flash('Une erreur est survenue lors du marquage de la géocache comme trouvée.', 'error')
        return redirect(url_for('geocaches.get_geocache_details', geocache_id=geocache_id))

@geocaches_bp.route('/geocaches/<int:geocache_id>/send_to_geocaching', methods=['POST'])
def send_to_geocaching(geocache_id):
    """
    Envoie les coordonnées corrigées d'une géocache vers geocaching.com
    en utilisant les cookies Firefox du navigateur
    """
    try:
        # Vérifier que l'utilisateur a fourni un code GC
        data = request.get_json()
        if not data or 'gc_code' not in data:
            return jsonify({'success': False, 'error': 'Code GC manquant'}), 400
        
        gc_code = data['gc_code']
        
        # Récupérer la géocache dans la base de données
        geocache = Geocache.query.get_or_404(geocache_id)
        
        # Vérifier que la géocache a des coordonnées corrigées
        if not geocache.gc_lat_corrected or not geocache.gc_lon_corrected:
            return jsonify({
                'success': False, 
                'error': 'Aucune coordonnée corrigée disponible pour cette géocache'
            }), 400
        
        # Créer une instance du client Geocaching avec les cookies Firefox
        client = GeocachingClient()
        
        # Vérifier si les cookies permettent l'accès à Geocaching.com
        if not client.ensure_login():
            return jsonify({
                'success': False, 
                'error': 'Impossible de se connecter à Geocaching.com. Assurez-vous d\'être connecté dans Firefox.'
            }), 401
        
        # Convertir les coordonnées GC en décimales
        lat, lon = convert_gc_coords_to_decimal(geocache.gc_lat_corrected, geocache.gc_lon_corrected)
        
        # Créer une instance de la classe Coordinates de geocaching_client
        from app.geocaching_client import Coordinates
        coordinates = Coordinates(client)
        
        # Envoyer les coordonnées
        if coordinates.update(gc_code, lat, lon):
            return jsonify({
                'success': True,
                'message': 'Coordonnées envoyées avec succès vers Geocaching.com'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Échec de l\'envoi des coordonnées à Geocaching.com'
            }), 500
        
    except Exception as e:
        logging.error(f"Erreur lors de l'envoi des coordonnées vers Geocaching.com: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@geocaches_bp.route('/api/geocaches/export-gpx', methods=['POST'])
def export_geocaches_as_gpx():
    """
    Génère des fichiers GPX contenant les géocaches filtrées et leurs waypoints,
    puis les combine dans un fichier ZIP
    
    Query params:
        - geocache_ids: liste d'IDs de géocaches à inclure dans le fichier GPX
        - format: 'gpx' pour un fichier GPX unique, 'zip' pour un ZIP avec tous les fichiers (par défaut)
    
    Returns:
        Response: Le fichier GPX ou ZIP à télécharger
    """
    try:
        data = request.json
        geocache_ids = data.get('geocache_ids', [])
        export_format = data.get('format', 'zip')
        
        if not geocache_ids:
            return jsonify({'error': 'Aucun ID de géocache fourni'}), 400
        
        # Format GPX simple (uniquement les géocaches, pas les waypoints)
        if export_format == 'gpx':
            # Générer le contenu GPX
            gpx_content = create_gpx_file(geocache_ids)
            
            if not gpx_content:
                return jsonify({'error': 'Erreur lors de la génération du fichier GPX'}), 500
            
            # Créer une réponse avec le fichier GPX
            response = make_response(gpx_content)
            response.headers['Content-Type'] = 'application/gpx+xml'
            filename = generate_filename(filtered=True)
            response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
        
        # Format ZIP (géocaches + waypoints)
        else:
            # Générer le contenu ZIP
            zip_buffer = create_gpx_zip(geocache_ids)
            
            if not zip_buffer:
                return jsonify({'error': 'Erreur lors de la génération du fichier ZIP'}), 500
            
            # Créer une réponse avec le fichier ZIP
            response = make_response(zip_buffer.getvalue())
            response.headers['Content-Type'] = 'application/zip'
            filename = generate_filename(filtered=True).replace('.gpx', '.zip')
            response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
        
    except Exception as e:
        current_app.logger.error(f"Erreur lors de l'export GPX: {str(e)}")
        return jsonify({'error': str(e)}), 500

@geocaches_bp.route('/geocaches/<int:geocache_id>/hint', methods=['GET'])
def get_geocache_hint(geocache_id):
    """Récupère l'indice (hint) d'une géocache."""
    logger.debug(f"Récupération du hint pour la géocache {geocache_id}")
    try:
        # Récupérer la géocache depuis la base de données
        geocache = Geocache.query.get_or_404(geocache_id)
        
        # Retourner l'indice au format JSON
        print(geocache.hints)
        return jsonify({
            "hint": geocache.hints or ""
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du hint pour la géocache {geocache_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@geocaches_bp.route('/api/tools/antipode', methods=['POST'])
def calculate_antipode():
    """
    Calcule l'antipode d'un point à partir de coordonnées au format GC.
    """
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'Données JSON manquantes'}), 400
        
        # Récupérer les coordonnées
        gc_lat = data.get('gc_lat')
        gc_lon = data.get('gc_lon')
        
        # Vérifier que les coordonnées sont présentes
        if not gc_lat or not gc_lon:
            return jsonify({'error': 'Coordonnées manquantes'}), 400
        
        # Préparer les entrées pour le plugin
        coord_str = f"{gc_lat} {gc_lon}"
        
        # Récupérer le plugin antipode
        from app import get_plugin_manager
        plugin_manager = get_plugin_manager()
        
        antipode_plugin = plugin_manager.get_plugin('antipode_plugin')
        
        if not antipode_plugin:
            return jsonify({'error': 'Plugin antipode non disponible'}), 500
        
        # Exécuter le plugin
        result = antipode_plugin.execute({
            'coordinates': coord_str
        })
        
        # Extraire les coordonnées de l'antipode
        antipode_lat_deg = result.get('antipode_latitude_deg')
        antipode_lon_deg = result.get('antipode_longitude_deg')
        antipode_formatted = result.get('antipode_formatted')
        
        logger.info(f"Antipode calculé: {antipode_formatted}")
        
        # Retourner les coordonnées de l'antipode
        return jsonify({
            'antipode_latitude_deg': antipode_lat_deg,
            'antipode_longitude_deg': antipode_lon_deg,
            'antipode_formatted': antipode_formatted,
            'original_coordinates': coord_str
        })
        
    except Exception as e:
        logger.error(f"Erreur lors du calcul de l'antipode: {e}")
        return jsonify({'error': str(e)}), 500

@geocaches_bp.route('/geocaches/formula-questions', methods=['POST'])
def extract_formula_questions():
    """
    Extrait les questions correspondant aux variables dans une formule de coordonnées
    """
    # Récupérer les données de la requête
    data = request.json
    geocache_id = data.get('geocache_id')
    letters = data.get('letters', [])
    method = data.get('method', 'ai')  # 'ai' ou 'regex'
    
    # Vérifier les paramètres
    if not geocache_id:
        return jsonify({'success': False, 'error': 'ID de géocache manquant'}), 400
        
    if not letters:
        return jsonify({'success': False, 'error': 'Liste de lettres vide'}), 400
    
    try:
        # Récupérer la géocache
        geocache = Geocache.query.get(geocache_id)
        if not geocache:
            return jsonify({'success': False, 'error': f'Géocache avec ID {geocache_id} introuvable'}), 404
        
        # Extraire les questions selon la méthode choisie
        if method == 'regex':
            questions = formula_questions_service.extract_questions_with_regex(geocache, letters)
        else:
            questions = formula_questions_service.extract_questions_with_ai(geocache, letters)
        
        # Si une erreur est retournée
        if isinstance(questions, dict) and 'error' in questions:
            return jsonify({'success': False, 'error': questions['error']}), 500
        
        # Retourner les questions extraites
        return jsonify({
            'success': True,
            'questions': questions
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@geocaches_bp.route('/geocaches/formula-solve-questions', methods=['POST'])
def solve_formula_questions():
    """
    Résout les questions associées aux variables dans une formule de coordonnées en utilisant l'IA
    """
    # Récupérer les données de la requête
    data = request.json
    geocache_id = data.get('geocache_id')
    questions = data.get('questions', {})
    gc_code = data.get('gc_code')
    
    # Vérifier les paramètres
    if not geocache_id:
        return jsonify({'success': False, 'error': 'ID de géocache manquant'}), 400
        
    if not questions:
        return jsonify({'success': False, 'error': 'Aucune question fournie'}), 400
    
    try:
        # Récupérer la géocache
        geocache = Geocache.query.get(geocache_id)
        if not geocache:
            return jsonify({'success': False, 'error': f'Géocache avec ID {geocache_id} introuvable'}), 404
        
        # Résoudre les questions avec l'IA
        answers = formula_solver_service.solve_questions_with_ai(questions, geocache_id, gc_code)
        
        # Si une erreur est retournée
        if isinstance(answers, dict) and 'error' in answers:
            return jsonify({'success': False, 'error': answers['error']}), 500
        
        # Retourner les réponses générées
        return jsonify({
            'success': True,
            'answers': answers
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500