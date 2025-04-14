import os
from loguru import logger

def setup_logger():
    # Configuration de base de Loguru
    logger.remove()  # Retire le handler par défaut
    
    # Format des logs
    log_format = "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
    
    # Créer le dossier logs s'il n'existe pas
    if not os.path.exists('logs'):
        os.makedirs('logs')
        
    # Configuration pour la sortie fichier
    logger.add(
        'logs/mystery_flask.log',
        rotation="1 MB",
        retention="10 days",
        format=log_format,
        encoding='utf-8',
        level="DEBUG",  # Assurer que le niveau est DEBUG pour voir tous les messages
        enqueue=True,  # Rend le logging thread-safe
        mode="w",      # Mode d'écriture du fichier
        backtrace=True,
        diagnose=True
    )
    
    # Configuration pour la sortie console
    logger.add(
        lambda msg: print(msg, flush=True),
        format=log_format,
        level="DEBUG"  # Assurer que le niveau est DEBUG pour voir tous les messages
    )
    
    return logger
