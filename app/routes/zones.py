from flask import Blueprint, jsonify, request, render_template, redirect, url_for, make_response
from app.models.geocache import Zone, Geocache
from app.database import db
from flask import current_app

zones_bp = Blueprint('zones', __name__)

@zones_bp.route('/api/zones', methods=['GET'])
def get_zones():
    """Get all zones."""
    try:
        print("\n=== Headers reçus ===")
        print(dict(request.headers))
        print("=== Paramètres de requête ===")
        print(request.args)
        
        zones = Zone.query.all()
        
        if request.headers.get('HX-Request'):
            print("\n=> Renvoi du template HTML")
            return render_template('zones_list.html', zones=zones)
            
        print("\n=> Renvoi du JSON")
        return jsonify([zone.to_dict() for zone in zones])
    
    except Exception as e:
        current_app.logger.error(f"Error: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@zones_bp.route('/api/zones/<int:zone_id>', methods=['GET'])
def get_zone(zone_id):
    """Get a specific zone."""
    try:
        zone = Zone.query.get_or_404(zone_id)
        return jsonify(zone.to_dict())
    except Exception as e:
        current_app.logger.error(f"Error fetching zone {zone_id}: {str(e)}")
        return jsonify({'error': f'Failed to fetch zone {zone_id}'}), 500

@zones_bp.route('/zones', methods=['GET'])
def zones_page():
    zones = Zone.query.order_by(Zone.created_at.desc()).all()
    return render_template('zones.html', zones=zones)

@zones_bp.route('/zones/add', methods=['POST'])
def add_zone():
    try:
        new_zone = Zone(
            name=request.form['name'],
            description=request.form.get('description', '')
        )
        db.session.add(new_zone)
        db.session.commit()
        
        # Si la requête est HTMX, renvoyer directement la liste des zones
        if request.headers.get('HX-Request'):
            zones = Zone.query.all()
            return render_template('zones_list.html', zones=zones)
            
        return redirect(url_for('zones.zones_page'))
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error adding zone: {str(e)}")
        return str(e), 400

@zones_bp.route('/zones/<int:zone_id>/delete', methods=['POST'])
def delete_zone(zone_id):
    """Supprime une zone existante."""
    try:
        zone = Zone.query.get_or_404(zone_id)
        
        # Vérifier si la zone contient des géocaches
        if zone.geocaches and len(zone.geocaches) > 0:
            # Pour chaque géocache associée à cette zone
            for geocache in list(zone.geocaches):  # Utiliser une copie de la liste pour éviter les problèmes de modification pendant l'itération
                # Vérifier si la géocache appartient uniquement à cette zone
                if len(geocache.zones) == 1 and geocache.zones[0] == zone:
                    # Si la géocache n'appartient qu'à cette zone, la supprimer
                    current_app.logger.info(f"Suppression de la géocache {geocache.id} qui n'appartient qu'à la zone {zone_id}")
                    db.session.delete(geocache)
                else:
                    # Si la géocache appartient à d'autres zones, supprimer seulement la référence à cette zone
                    current_app.logger.info(f"Suppression de la référence à la zone {zone_id} pour la géocache {geocache.id}")
                    geocache.zones.remove(zone)
            
            # Enregistrer les modifications
            db.session.commit()
        
        # Supprimer la zone
        db.session.delete(zone)
        db.session.commit()
        
        # Si la requête est HTMX, renvoyer la liste des zones
        if request.headers.get('HX-Request'):
            zones = Zone.query.all()
            return render_template('zones_list.html', zones=zones)
            
        # Rediriger vers la page d'accueil au lieu de l'API des zones
        return redirect(url_for('main.index'))
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting zone {zone_id}: {str(e)}")
        return str(e), 400

@zones_bp.route('/zones/<int:zone_id>/delete', methods=['GET'])
def delete_zone_get(zone_id):
    """Gère les requêtes GET sur l'URL de suppression d'une zone."""
    # Rediriger vers la page d'accueil
    return redirect(url_for('main.index'))

@zones_bp.route('/api/active-zone', methods=['GET'])
def get_active_zone():
    """Get the currently active zone."""
    active_zone_id = current_app.config.get('ACTIVE_ZONE_ID')
    if active_zone_id:
        zone = Zone.query.get(active_zone_id)
        if zone:
            return jsonify(zone.to_dict())
    return jsonify(None)

@zones_bp.route('/api/active-zone', methods=['POST'])
def set_active_zone():
    """Set the active zone."""
    try:
        zone_id = request.json.get('zone_id')
        if zone_id:
            zone = Zone.query.get_or_404(zone_id)
            current_app.config['ACTIVE_ZONE_ID'] = zone.id
            return jsonify(zone.to_dict())
        else:
            current_app.config['ACTIVE_ZONE_ID'] = None
            return jsonify(None)
    except Exception as e:
        current_app.logger.error(f"Error setting active zone: {str(e)}")
        return jsonify({'error': 'Failed to set active zone'}), 500

@zones_bp.route('/zones/new', methods=['GET'])
def new_zone_form():
    """Affiche le formulaire d'ajout d'une nouvelle zone."""
    form_action = url_for('zones.add_zone')
    return render_template('zone_form.html', form_action=form_action)

@zones_bp.route('/zones/<int:zone_id>/edit', methods=['GET'])
def edit_zone_form(zone_id):
    """Affiche le formulaire de modification d'une zone existante."""
    zone = Zone.query.get_or_404(zone_id)
    form_action = url_for('zones.update_zone', zone_id=zone.id)
    return render_template('zone_form.html', zone=zone, form_action=form_action)

@zones_bp.route('/zones/<int:zone_id>/update', methods=['POST'])
def update_zone(zone_id):
    """Met à jour une zone existante."""
    try:
        zone = Zone.query.get_or_404(zone_id)
        zone.name = request.form['name']
        zone.description = request.form.get('description', '')
        db.session.commit()
        
        # Si la requête est HTMX, renvoyer directement la liste des zones
        if request.headers.get('HX-Request'):
            zones = Zone.query.all()
            return render_template('zones_list.html', zones=zones)
            
        return redirect(url_for('zones.zones_page'))
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating zone {zone_id}: {str(e)}")
        return str(e), 400

@zones_bp.route('/api/geocaches/copy-to-zone', methods=['POST'])
def copy_geocaches_to_zone():
    """Copie des géocaches vers une zone spécifique."""
    try:
        data = request.get_json()
        if not data or 'geocache_ids' not in data or 'target_zone_id' not in data:
            return jsonify({'error': 'Données manquantes'}), 400

        geocache_ids = data['geocache_ids']
        target_zone_id = data['target_zone_id']

        # Vérifier que la zone cible existe
        target_zone = Zone.query.get_or_404(target_zone_id)

        # Récupérer toutes les géocaches à copier
        geocaches = Geocache.query.filter(Geocache.id.in_(geocache_ids)).all()

        # Ajouter chaque géocache à la zone cible si elle n'y est pas déjà
        for geocache in geocaches:
            if target_zone not in geocache.zones:
                geocache.zones.append(target_zone)

        db.session.commit()

        return jsonify({
            'message': f'{len(geocaches)} géocache(s) copiée(s) avec succès vers la zone {target_zone.name}',
            'copied_count': len(geocaches)
        })

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error copying geocaches to zone: {str(e)}")
        return jsonify({'error': str(e)}), 500

@zones_bp.route('/api/zones/<int:zone_id>/geocaches', methods=['DELETE'])
def remove_geocaches_from_zone(zone_id):
    """Supprime des géocaches d'une zone spécifique."""
    try:
        data = request.get_json()
        if not data or 'geocache_ids' not in data:
            return jsonify({'error': 'Liste des IDs de géocaches manquante'}), 400

        geocache_ids = data['geocache_ids']
        zone = Zone.query.get_or_404(zone_id)

        # Récupérer toutes les géocaches à supprimer de la zone
        geocaches = Geocache.query.filter(Geocache.id.in_(geocache_ids)).all()

        # Supprimer chaque géocache de la zone
        for geocache in geocaches:
            if zone in geocache.zones:
                geocache.zones.remove(zone)

        db.session.commit()

        return jsonify({
            'message': f'{len(geocaches)} géocache(s) supprimée(s) de la zone {zone.name}',
            'removed_count': len(geocaches)
        })

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error removing geocaches from zone: {str(e)}")
        return jsonify({'error': str(e)}), 500
