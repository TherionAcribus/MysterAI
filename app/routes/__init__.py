from .main import main
from .geocaches import geocaches_bp, geocaches_api
from .zones import zones_bp

blueprints = [main, geocaches_bp, geocaches_api, zones_bp]
