import os
import secrets
import sqlite3
import sys
from sqlalchemy import event
from sqlalchemy.engine import Engine

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
    
    # Configuration de la base de données principale avec Spatialite
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(basedir, 'geocaches.db') + '?charset=utf8'
    SQLALCHEMY_ENGINE_OPTIONS = {
        'connect_args': {
            'detect_types': sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES,
            'check_same_thread': False
        }
    }
    SQLALCHEMY_BINDS = {
        'plugins': 'sqlite:///' + os.path.join(basedir, 'plugins.db') + '?charset=utf8',
        'config': 'sqlite:///' + os.path.join(basedir, 'app_config.db') + '?charset=utf8'
    }
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = secrets.token_hex(32)  # Génère une clé secrète aléatoire
    
    # Chargement de l'extension Spatialite
    # Initialisation des métadonnées spatiales

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
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
