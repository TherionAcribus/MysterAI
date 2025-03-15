"""
Configuration de l'application MysteryAI.
Copiez ce fichier vers config.py et ajustez les valeurs selon votre environnement.
"""

class Config:
    # Configuration Flask
    SECRET_KEY = 'votre-clé-secrète'  # À changer en production
    DEBUG = False
    
    # Configuration de la base de données
    SQLALCHEMY_DATABASE_URI = 'sqlite:///mysteryai.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Configuration du serveur
    HOST = '127.0.0.1'
    PORT = 3000  # Port utilisé par l'application Flask
    
    # Configuration Electron
    ELECTRON_DEV_URL = f'http://{HOST}:{PORT}'  # URL de développement pour Electron
    
    # Configuration des chemins
    UPLOAD_FOLDER = 'uploads'  # Dossier pour les fichiers uploadés
    
    # Configuration des API externes
    GEOCACHING_API_KEY = ''  # Votre clé API Geocaching.com
    
    # Configuration de logging
    LOG_LEVEL = 'INFO'
    LOG_FILE = 'mysteryai.log'

class DevelopmentConfig(Config):
    DEBUG = True
    LOG_LEVEL = 'DEBUG'

class ProductionConfig(Config):
    # En production, utilisez des valeurs sécurisées
    SECRET_KEY = 'à-changer-en-production'
    DEBUG = False
    
    # En production, utilisez une base de données plus robuste
    # SQLALCHEMY_DATABASE_URI = 'postgresql://user:pass@localhost/mysteryai'
    
    # Configuration du serveur en production
    HOST = '0.0.0.0'  # Écoute sur toutes les interfaces
    
    # Logging en production
    LOG_LEVEL = 'WARNING'
    LOG_FILE = '/var/log/mysteryai/app.log'

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False
