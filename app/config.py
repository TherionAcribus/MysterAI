import os
import secrets
import sqlite3
import sys
from sqlalchemy import event
from sqlalchemy.engine import Engine
from dotenv import load_dotenv
from pathlib import Path

# Charger les variables d'environnement depuis .env
load_dotenv()

class Config:
    basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    BASEDIR = basedir  # Accessible comme config
    
    # Configuration du chemin vers les modules Spatialite
    SPATIALITE_PATH = os.path.join(basedir, 'modules', 'mod_spatialite')
    
    # Liste des DLL requises dans l'ordre de dépendance
    # REQUIRED_DLLS = [
    #     'libgcc_s_seh-1.dll',
    #     'libwinpthread-1.dll',
    #     'zlib1.dll',
    #     'libstdc++-6.dll',
    #     'libsqlite3-0.dll',
    #     'libfreexl-1.dll',
    #     'libiconv-2.dll',
    #     'libproj_9_2.dll',
    #     'libgeos_c.dll',
    #     'libgeos.dll',
    #     'mod_spatialite.dll'
    # ]
    
    # Ajout du chemin au PATH système
    if sys.platform == 'win32' and SPATIALITE_PATH not in os.environ['PATH']:
        os.environ['PATH'] = SPATIALITE_PATH + os.pathsep + os.environ['PATH']
    
    # Configuration des connexions SQLite
    sqlite_connect_args = {
        'check_same_thread': False,
        'detect_types': sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES
    }
    
    # Temporairement, utiliser SQLite pour la base principale
    # pour contourner les problèmes de connexion PostgreSQL
    USE_SQLITE_MAIN = True
    
    # Configuration de la base de données principale
    if USE_SQLITE_MAIN:
        SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(basedir, 'mysteryai.db')
        SQLALCHEMY_ENGINE_OPTIONS = {
            'connect_args': sqlite_connect_args
        }
    else:
        SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/mysteryai')
        SQLALCHEMY_ENGINE_OPTIONS = {}
    
    SQLALCHEMY_BINDS = {
        'plugins': {
            'url': 'sqlite:///' + os.path.join(basedir, 'plugins.db') + '?charset=utf8',
            'connect_args': sqlite_connect_args
        },
        'config': {
            'url': 'sqlite:///' + os.path.join(basedir, 'app_config.db') + '?charset=utf8',
            'connect_args': sqlite_connect_args
        }
    }
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev_key_change_in_production')
    
    # Chargement de l'extension Spatialite
    # Initialisation des métadonnées spatiales

    # Configuration des chemins du projet
    BASE_DIR = Path(__file__).parent.parent  # Dossier racine du projet
    PLUGINS_DIR = os.path.join(BASE_DIR, 'plugins')
    OFFICIAL_PLUGINS_DIR = os.path.join(PLUGINS_DIR, 'official')
    CUSTOM_PLUGINS_DIR = os.path.join(PLUGINS_DIR, 'custom')
    UPLOADS_DIR = os.path.join(BASE_DIR, 'uploads')
    TEMP_DIR = os.path.join(BASE_DIR, 'temp')
    GEOCACHE_IMAGES_DIR = os.path.join(UPLOADS_DIR, 'geocache_images')
    GEOCACHE_THUMBS_DIR = os.path.join(GEOCACHE_IMAGES_DIR, 'thumbnails')

    # S'assurer que les dossiers existent
    for directory in [PLUGINS_DIR, OFFICIAL_PLUGINS_DIR, CUSTOM_PLUGINS_DIR, 
                      UPLOADS_DIR, TEMP_DIR, GEOCACHE_IMAGES_DIR, GEOCACHE_THUMBS_DIR]:
        os.makedirs(directory, exist_ok=True)

    # Configuration du logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

    # Configuration de l'API OpenAI
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
    OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-4o')

    # Configuration de l'upload de fichiers
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max

    # Configuration du serveur HTMX
    HTMX_CONFIG = {
        'ws_protocol': os.getenv('WS_PROTOCOL', 'ws'),
        'ws_host': os.getenv('WS_HOST', 'localhost:5000')
    }

    # Identifiants pour Geocaching.com
    GEOCACHING_USERNAME = os.getenv('GEOCACHING_USERNAME', '')
    GEOCACHING_PASSWORD = os.getenv('GEOCACHING_PASSWORD', '')

# Écouteur d'événement pour SQLite uniquement
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if not hasattr(dbapi_connection, 'enable_load_extension'):
        # Ce n'est pas une connexion SQLite, on ignore
        return
        
    cursor = dbapi_connection.cursor()
    
    # Activation du chargement des extensions
    cursor.execute("PRAGMA foreign_keys=ON")
    dbapi_connection.enable_load_extension(True)
    
    # Chargement de l'extension Spatialite en utilisant le chemin absolu
    spatialite_dll = os.path.join(Config.SPATIALITE_PATH, 'mod_spatialite.dll')
    try:
        cursor.execute('SELECT load_extension(?)', (spatialite_dll,))
        cursor.execute("SELECT InitSpatialMetaData(1);")
    except sqlite3.OperationalError as e:
        print(f"Erreur lors du chargement de l'extension Spatialite : {e}")
        print(f"Chemin de l'extension : {spatialite_dll}")
        print(f"PATH système : {os.environ['PATH']}")
        raise
    finally:
        # Désactivation du chargement des extensions
        dbapi_connection.enable_load_extension(False)
        cursor.close()
