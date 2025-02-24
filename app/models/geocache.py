from datetime import datetime, timezone
from app.database import db
from geoalchemy2 import Geometry
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import Point
from bs4 import BeautifulSoup
from flask import url_for, current_app

def decimal_to_dm(decimal_degrees):
    """Convertit des degrés décimaux en degrés et minutes décimales"""
    degrees = int(decimal_degrees)
    minutes = abs(decimal_degrees - degrees) * 60
    return degrees, minutes

def dm_to_decimal(degrees, minutes):
    """Convertit des degrés et minutes décimales en degrés décimaux"""
    return degrees + (minutes / 60) * (1 if degrees >= 0 else -1)

class Zone(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    geocaches = db.relationship('Geocache', back_populates='zone')

class AdditionalWaypoint(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    geocache_id = db.Column(db.Integer, db.ForeignKey('geocache.id'), nullable=False)
    name = db.Column(db.String(100))
    prefix = db.Column(db.String(10))
    lookup = db.Column(db.String(10))
    location = db.Column(Geometry('POINT', srid=4326))
    note = db.Column(db.Text)
    # Coordonnées au format Geocaching.com
    gc_lat = db.Column(db.String(20))  # ex: "N 48° 51.402"
    gc_lon = db.Column(db.String(20))  # ex: "E 002° 21.048"
    
    geocache = db.relationship('Geocache', back_populates='additional_waypoints')
    
    @property
    def latitude(self):
        """Retourne la latitude en degrés décimaux"""
        if self.location is not None:
            point = to_shape(self.location)
            return point.y
        return None
        
    @property
    def longitude(self):
        """Retourne la longitude en degrés décimaux"""
        if self.location is not None:
            point = to_shape(self.location)
            return point.x
        return None
    
    @property
    def gc_coords(self):
        """Retourne les coordonnées complètes au format Geocaching.com"""
        if self.gc_lat and self.gc_lon:
            return f"{self.gc_lat} {self.gc_lon}"
        return None
        
    def set_location(self, lat, lon, gc_lat=None, gc_lon=None):
        """Définit la position du waypoint"""
        if lat is not None and lon is not None:
            self.location = from_shape(Point(lon, lat), srid=4326)
            if gc_lat:
                self.gc_lat = gc_lat
            if gc_lon:
                self.gc_lon = gc_lon

class Attribute(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    icon_url = db.Column(db.String(200))
    
    geocaches = db.relationship('Geocache', secondary='geocache_attribute', back_populates='attributes')

class GeocacheAttribute(db.Model):
    __table_args__ = {'extend_existing': True}
    geocache_id = db.Column(db.Integer, db.ForeignKey('geocache.id'), primary_key=True)
    attribute_id = db.Column(db.Integer, db.ForeignKey('attribute.id'), primary_key=True)
    is_on = db.Column(db.Boolean, default=True)

class Checker(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    geocache_id = db.Column(db.Integer, db.ForeignKey('geocache.id'), nullable=False)
    name = db.Column(db.String(100))
    url = db.Column(db.String(500))
    
    geocache = db.relationship('Geocache', back_populates='checkers')

class Note(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    note_type = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    geocaches = db.relationship('Geocache', secondary='geocache_note', back_populates='notes')

class GeocacheNote(db.Model):
    __table_args__ = {'extend_existing': True}
    geocache_id = db.Column(db.Integer, db.ForeignKey('geocache.id'), primary_key=True)
    note_id = db.Column(db.Integer, db.ForeignKey('note.id'), primary_key=True)
    added_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class GeocacheImage(db.Model):
    __table_args__ = (
        db.Index('ix_parent_image_id', 'parent_image_id'),
        {'extend_existing': True}
    )
    id = db.Column(db.Integer, primary_key=True)
    geocache_id = db.Column(db.Integer, db.ForeignKey('geocache.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    original_url = db.Column(db.String(500))
    is_original = db.Column(db.Boolean, default=True, nullable=False)
    parent_image_id = db.Column(db.Integer, db.ForeignKey('geocache_image.id'))
    modified_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relations
    geocache = db.relationship('Geocache', back_populates='images')
    parent_image = db.relationship('GeocacheImage', remote_side=[id], backref='derived_images')
    
    @property
    def url(self):
        # Utiliser la route pour servir l'image avec le code GC
        return url_for('geocaches.serve_image', filename=f'{self.geocache.gc_code}/{self.filename}')

class Geocache(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    gc_code = db.Column(db.String(10), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    owner = db.Column(db.String(100))
    cache_type = db.Column(db.String(50))
    location = db.Column(Geometry('POINT', srid=4326), nullable=False)
    location_corrected = db.Column(Geometry('POINT', srid=4326))
    # Coordonnées au format Geocaching.com
    gc_lat = db.Column(db.String(20))  # ex: "N 48° 51.402"
    gc_lon = db.Column(db.String(20))  # ex: "E 002° 21.048"
    gc_lat_corrected = db.Column(db.String(20))
    gc_lon_corrected = db.Column(db.String(20))
    description = db.Column(db.Text)
    description_modified = db.Column(db.Text)  # for translation or personal changes
    difficulty = db.Column(db.Float)
    terrain = db.Column(db.Float)
    size = db.Column(db.String(20))
    hints = db.Column(db.Text)
    favorites_count = db.Column(db.Integer, default=0)
    logs_count = db.Column(db.Integer, default=0)
    hidden_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    zone_id = db.Column(db.Integer, db.ForeignKey('zone.id'), nullable=False)
    solved = db.Column(db.String(20), default='not_solved')  # "not_solved", "solved", "ongoing"
    solved_date = db.Column(db.DateTime)
    found = db.Column(db.Boolean, default=False)
    found_date = db.Column(db.DateTime)
    last_found_date = db.Column(db.DateTime)
    gc_personnal_note = db.Column(db.Text)


    zone = db.relationship('Zone', back_populates='geocaches')
    additional_waypoints = db.relationship('AdditionalWaypoint', back_populates='geocache', cascade='all, delete-orphan')
    attributes = db.relationship('Attribute', secondary='geocache_attribute', back_populates='geocaches')
    checkers = db.relationship('Checker', back_populates='geocache', cascade='all, delete-orphan')
    notes = db.relationship('Note', secondary='geocache_note', back_populates='geocaches')
    images = db.relationship('GeocacheImage', back_populates='geocache', cascade='all, delete-orphan')
    
    @property
    def latitude(self):
        """Retourne la latitude en degrés décimaux"""
        if self.location is not None:
            point = to_shape(self.location)
            return point.y
        return None
        
    @property
    def longitude(self):
        """Retourne la longitude en degrés décimaux"""
        if self.location is not None:
            point = to_shape(self.location)
            return point.x
        return None
    
    @property
    def gc_coords(self):
        """Retourne les coordonnées complètes au format Geocaching.com"""
        if self.gc_lat and self.gc_lon:
            return f"{self.gc_lat} {self.gc_lon}"
        return None

    @property
    def latitude_corrected(self):
        """Retourne la latitude corrigée en degrés décimaux"""
        if self.location_corrected is not None:
            point = to_shape(self.location_corrected)
            return point.y
        return None
        
    @property
    def longitude_corrected(self):
        """Retourne la longitude corrigée en degrés décimaux"""
        if self.location_corrected is not None:
            point = to_shape(self.location_corrected)
            return point.x
        return None
    
    @property
    def gc_coords_corrected(self):
        """Retourne les coordonnées corrigées complètes au format Geocaching.com"""
        if self.gc_lat_corrected and self.gc_lon_corrected:
            return f"{self.gc_lat_corrected} {self.gc_lon_corrected}"
        return None
        
    def set_location(self, lat, lon, gc_lat=None, gc_lon=None):
        """Définit la position de la géocache"""
        if lat is not None and lon is not None:
            self.location = from_shape(Point(lon, lat), srid=4326)
            if gc_lat:
                self.gc_lat = gc_lat
            if gc_lon:
                self.gc_lon = gc_lon

    def set_location_corrected(self, lat, lon, gc_lat=None, gc_lon=None):
        """Définit la position corrigée de la géocache"""
        if lat is not None and lon is not None:
            self.location_corrected = from_shape(Point(lon, lat), srid=4326)
            if gc_lat:
                self.gc_lat_corrected = gc_lat
            if gc_lon:
                self.gc_lon_corrected = gc_lon

    @property
    def description_text(self):
        """Convertit la description HTML en texte brut en préservant la mise en forme."""
        if not self.description:
            return ""
            
        soup = BeautifulSoup(self.description, 'html.parser')
        
        # Remplacer les balises <br> par des sauts de ligne
        for br in soup.find_all('br'):
            br.replace_with('\n')
            
        # Gérer les paragraphes
        for p in soup.find_all('p'):
            # Ajouter deux sauts de ligne après chaque paragraphe
            p.append('\n\n')
            
        # Gérer les div
        for div in soup.find_all('div'):
            # Ajouter un saut de ligne après chaque div
            div.append('\n')
            
        # Gérer les listes
        for ul in soup.find_all(['ul', 'ol']):
            # Ajouter un saut de ligne avant et après la liste
            ul.insert_before('\n')
            ul.append('\n')
            
        for li in soup.find_all('li'):
            # Ajouter un tiret et un saut de ligne pour chaque élément de liste
            li.insert_before('- ')
            li.append('\n')
            
        # Obtenir le texte et nettoyer les sauts de ligne multiples
        text = soup.get_text()
        text = '\n'.join(line.strip() for line in text.splitlines() if line.strip())
        
        return text

    @staticmethod
    def get_image_by_id(image_id):
        """Récupère une image par son ID."""
        try:
            # Convertir l'ID en entier
            image_id = int(image_id)
            
            # Chercher l'image directement dans la base de données
            image = GeocacheImage.query.get(image_id)
            if image:
                return {
                    'id': image.id,
                    'filename': image.filename,
                    'gc_code': image.geocache.gc_code
                }
            return None
            
        except Exception as e:
            current_app.logger.error(f"Erreur lors de la récupération de l'image {image_id}: {str(e)}")
            return None

    @staticmethod
    def get_by_image_id(image_id):
        """Récupère une géocache par l'ID d'une de ses images."""
        try:
            # Convertir l'ID en entier
            image_id = int(image_id)
            
            # Chercher l'image directement
            image = GeocacheImage.query.get(image_id)
            if image:
                return image.geocache
            return None
            
        except Exception as e:
            current_app.logger.error(f"Erreur lors de la récupération de la géocache par image {image_id}: {str(e)}")
            return None
