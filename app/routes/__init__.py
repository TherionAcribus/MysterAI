from .main import main
from .geocaches import geocaches_bp
from .zones import zones_bp
from .plugins import plugins_bp
from .alphabets import alphabets_bp
from .logs import logs_bp
from app.routes.ai_routes import ai_bp

blueprints = [
    main,
    geocaches_bp,
    zones_bp,
    plugins_bp,
    alphabets_bp,
    logs_bp,
    ai_bp
]

