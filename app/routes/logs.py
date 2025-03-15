from datetime import datetime, timezone
from flask import Blueprint, jsonify, request, render_template
from app.database import db
from app.models import Note, Geocache, GeocacheNote

logs_bp = Blueprint('logs', __name__, url_prefix='/api/logs')

@logs_bp.route('/notes_panel')
def get_notes_panel():
    """Renvoie le template du panneau de notes."""
    geocache_id = request.args.get('geocacheId')
    if geocache_id:
        geocache = Geocache.query.get_or_404(geocache_id)
        notes = geocache.notes
        return render_template('notes_panel.html', 
                            notes=notes,
                            geocache_id=geocache_id,
                            geocache_name=geocache.name)
    return render_template('notes_panel.html', notes=[], geocache_id=None)

@logs_bp.route('/map_panel')
def get_map_panel():
    """Render the map panel template"""
    geocache_id = request.args.get('geocacheId')
    
    if geocache_id:
        geocache = Geocache.query.get(geocache_id)
        if geocache:
            return render_template('map_panel.html', 
                                geocache=geocache,
                                geocache_id=geocache_id)
    
    return render_template('map_panel.html', 
                         geocache=None,
                         geocache_id=None)

@logs_bp.route('/geocache/<geocache_id>/notes', methods=['GET', 'POST'])
def geocache_notes(geocache_id):
    """Gère les notes d'une géocache."""
    geocache = Geocache.query.get_or_404(geocache_id)
    
    if request.method == 'POST':
        # Création d'une nouvelle note
        note_data = request.form
        new_note = Note(
            content=note_data.get('content'),
            note_type=note_data.get('note_type'),
            created_at=datetime.now(timezone.utc)
        )
        db.session.add(new_note)
        geocache.notes.append(new_note)  # Ajoute la note à la géocache
        db.session.commit()
        
        # Renvoie tout le panneau de notes mis à jour
        notes = Note.query.join(GeocacheNote).filter(GeocacheNote.geocache_id == geocache_id).order_by(Note.created_at.desc()).all()
        return render_template('notes_panel.html',
                            notes=notes,
                            geocache_id=geocache_id,
                            geocache_name=geocache.name)
        
    # GET: renvoie toutes les notes
    notes = Note.query.join(GeocacheNote).filter(GeocacheNote.geocache_id == geocache_id).order_by(Note.created_at.desc()).all()
    return render_template('notes_panel.html', 
                         notes=notes, 
                         geocache_id=geocache_id,
                         geocache_name=geocache.name)

@logs_bp.route('/note_form')
def get_note_form_template():
    """Renvoie le template du formulaire de note."""
    note_id = request.args.get('note_id')
    geocache_id = request.args.get('geocacheId')
    
    note = None
    if note_id:
        note = Note.query.get_or_404(note_id)
        # Récupérer l'ID de la géocache via la table d'association
        geocache_note = GeocacheNote.query.filter_by(note_id=note_id).first()
        if geocache_note:
            geocache_id = geocache_note.geocache_id
    
    return render_template('note_form.html', 
                         note=note,
                         geocache_id=geocache_id)

@logs_bp.route('/note/<note_id>', methods=['PUT', 'DELETE'])
def manage_note(note_id):
    """Gère la modification et la suppression d'une note."""
    note = Note.query.get_or_404(note_id)
    geocache_note = GeocacheNote.query.filter_by(note_id=note_id).first()
    geocache_id = geocache_note.geocache_id if geocache_note else None
    
    if request.method == 'DELETE':
        db.session.delete(note)
        db.session.commit()
        
        # Après la suppression, renvoyer le panneau de notes mis à jour
        if geocache_id:
            geocache = Geocache.query.get_or_404(geocache_id)
            notes = Note.query.join(GeocacheNote).filter(GeocacheNote.geocache_id == geocache_id).order_by(Note.created_at.desc()).all()
            return render_template('notes_panel.html',
                                notes=notes,
                                geocache_id=geocache_id,
                                geocache_name=geocache.name)
        return '', 204
        
    # PUT: modification de la note
    data = request.form
    note.content = data.get('content')
    note.note_type = data.get('note_type')
    note.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    
    # Renvoie tout le panneau de notes mis à jour
    geocache = Geocache.query.get_or_404(geocache_id)
    notes = Note.query.join(GeocacheNote).filter(GeocacheNote.geocache_id == geocache_id).order_by(Note.created_at.desc()).all()
    return render_template('notes_panel.html',
                        notes=notes,
                        geocache_id=geocache_id,
                        geocache_name=geocache.name)
