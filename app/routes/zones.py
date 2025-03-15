from flask import Blueprint, jsonify, request, render_template, redirect, url_for
from app.models.geocache import Zone
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
        return jsonify({
            'id': zone.id,
            'name': zone.name,
            'description': zone.description
        })
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
    except Exception as e:
        db.session.rollback()
        return str(e), 400
    return redirect(url_for('zones.zones_page'))

@zones_bp.route('/zones/<int:zone_id>/delete', methods=['POST'])
def delete_zone(zone_id):
    try:
        zone = Zone.query.get_or_404(zone_id)
        db.session.delete(zone)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return str(e), 400
    return redirect(url_for('zones.zones_page'))

@zones_bp.route('/api/active-zone', methods=['GET'])
def get_active_zone():
    """Get the currently active zone."""
    active_zone_id = current_app.config.get('ACTIVE_ZONE_ID')
    if active_zone_id:
        zone = Zone.query.get(active_zone_id)
        if zone:
            return jsonify({
                'id': zone.id,
                'name': zone.name,
                'description': zone.description
            })
    return jsonify(None)

@zones_bp.route('/api/active-zone', methods=['POST'])
def set_active_zone():
    """Set the active zone."""
    try:
        zone_id = request.json.get('zone_id')
        if zone_id:
            zone = Zone.query.get_or_404(zone_id)
            current_app.config['ACTIVE_ZONE_ID'] = zone.id
            return jsonify({
                'id': zone.id,
                'name': zone.name,
                'description': zone.description
            })
        else:
            current_app.config['ACTIVE_ZONE_ID'] = None
            return jsonify(None)
    except Exception as e:
        current_app.logger.error(f"Error setting active zone: {str(e)}")
        return jsonify({'error': 'Failed to set active zone'}), 500
