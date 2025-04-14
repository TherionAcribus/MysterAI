#!/usr/bin/env python
"""
Script pour corriger la table geocache_attribute
"""
from app import create_app
from app.database import db
from sqlalchemy import text
from app.utils.logger import setup_logger

logger = setup_logger()

def fix_geocache_attribute_table():
    """Recréer la table geocache_attribute avec la structure correcte"""
    try:
        # Créer le contexte d'application
        app = create_app()
        
        with app.app_context():
            # Sauvegarder les relations existantes
            logger.info("Récupération des relations existantes...")
            query = text("SELECT geocache_id, attribute_id, is_on FROM geocache_attribute")
            result = db.session.execute(query).fetchall()
            logger.info(f"Nombre de relations trouvées: {len(result)}")
            
            # Supprimer la table existante
            logger.info("Suppression de la table existante...")
            db.session.execute(text("DROP TABLE IF EXISTS geocache_attribute"))
            db.session.commit()
            
            # Créer la nouvelle table (sans la colonne id)
            logger.info("Création de la nouvelle table...")
            db.session.execute(text("""
                CREATE TABLE geocache_attribute (
                    geocache_id INTEGER NOT NULL,
                    attribute_id INTEGER NOT NULL,
                    is_on BOOLEAN,
                    PRIMARY KEY (geocache_id, attribute_id),
                    FOREIGN KEY(geocache_id) REFERENCES geocache (id),
                    FOREIGN KEY(attribute_id) REFERENCES attribute (id)
                )
            """))
            db.session.commit()
            
            # Restaurer les données
            if result:
                logger.info("Restauration des données...")
                for geocache_id, attribute_id, is_on in result:
                    db.session.execute(text(
                        "INSERT INTO geocache_attribute (geocache_id, attribute_id, is_on) VALUES (:g, :a, :i)"
                    ), {"g": geocache_id, "a": attribute_id, "i": is_on})
                db.session.commit()
                logger.info("Données restaurées avec succès")
            
            logger.info("Correction de la table geocache_attribute terminée avec succès")
            
    except Exception as e:
        logger.error(f"Erreur lors de la correction de la table: {str(e)}")
        raise

if __name__ == "__main__":
    fix_geocache_attribute_table() 