from .main import main
from .geocaches import geocaches_bp
from .coordinates import coordinates_bp
from .zones import zones_bp
from .plugins import plugins_bp
from .alphabets import alphabets_bp
from .logs import logs_bp
from app.routes.ai_routes import ai_bp
from .settings import settings_bp
from .multi_solver import multi_solver_bp

blueprints = [
    main,
    geocaches_bp,
    coordinates_bp,
    zones_bp,
    plugins_bp,
    alphabets_bp,
    logs_bp,
    ai_bp,
    settings_bp,
    multi_solver_bp
]

