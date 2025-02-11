from .main import main
from .geocaches import geocaches_bp
from .zones import zones_bp
from .plugins import plugins_bp

blueprints = [main, geocaches_bp, zones_bp, plugins_bp]
