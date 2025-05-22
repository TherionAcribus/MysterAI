from datetime import datetime
import json
import logging
from app.models.app_config import AppConfig

# Configurer le logger
logger = logging.getLogger(__name__)

class ConfigManager:
    _instance = None
    _cache = {}
    _cache_timestamp = {}
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = ConfigManager()
        return cls._instance
    
    def get_value(self, key, default=None, max_age_seconds=300):
        """
        Récupère une valeur à partir du cache ou de la base de données
        
        Args:
            key: La clé du paramètre
            default: Valeur par défaut si le paramètre n'existe pas
            max_age_seconds: Durée de validité du cache en secondes
            
        Returns:
            La valeur du paramètre
        """
        now = datetime.utcnow()
        if key in self._cache and (now - self._cache_timestamp.get(key, datetime.min)).total_seconds() < max_age_seconds:
            logger.debug(f"=== DEBUG: Valeur récupérée du cache pour {key}: {self._cache[key]} ===")
            return self._cache[key]
        
        value = AppConfig.get_value(key, default)
        self._cache[key] = value
        self._cache_timestamp[key] = now
        logger.debug(f"=== DEBUG: Valeur récupérée de la BD et mise en cache pour {key}: {value} ===")
        return value
    
    def set_value(self, key, value, category='general', description=None, is_secret=False):
        """
        Définit une valeur dans la base de données et met à jour le cache
        
        Args:
            key: La clé du paramètre
            value: La valeur à définir
            category: La catégorie du paramètre
            description: Description du paramètre
            is_secret: Si le paramètre est sensible
            
        Returns:
            L'objet AppConfig créé ou mis à jour
        """
        result = AppConfig.set_value(key, value, category, description, is_secret)
        if result:
            self._cache[key] = value
            self._cache_timestamp[key] = datetime.utcnow()
            logger.debug(f"=== DEBUG: Valeur mise à jour dans le cache pour {key}: {value} ===")
        return result
    
    def load_category(self, category):
        """
        Charge tous les paramètres d'une catégorie spécifique
        
        Args:
            category: La catégorie à charger
            
        Returns:
            Un dictionnaire des paramètres chargés
        """
        logger.info(f"=== DEBUG: Chargement de la catégorie {category} dans le cache ===")
        configs = AppConfig.query.filter_by(category=category).all()
        category_configs = {}
        
        for config in configs:
            value = config.value
            if config.value_type == 'int':
                value = int(value)
            elif config.value_type == 'float':
                value = float(value)
            elif config.value_type == 'bool':
                value = value.lower() == 'true'
            elif config.value_type == 'json':
                value = json.loads(value)
            
            self._cache[config.key] = value
            self._cache_timestamp[config.key] = datetime.utcnow()
            category_configs[config.key] = value
            
        logger.info(f"=== DEBUG: {len(configs)} paramètres chargés pour la catégorie {category} ===")
        return category_configs
    
    def get_all_category_values(self, category):
        """
        Récupère tous les paramètres d'une catégorie, en utilisant le cache si possible
        
        Args:
            category: La catégorie à récupérer
            
        Returns:
            Un dictionnaire des paramètres de la catégorie
        """
        # Vérifier si nous avons déjà des paramètres en cache pour cette catégorie
        configs = AppConfig.query.filter_by(category=category).all()
        keys = [config.key for config in configs]
        
        # Vérifier si tous les paramètres sont en cache et valides
        now = datetime.utcnow()
        all_cached = True
        for key in keys:
            if key not in self._cache or (now - self._cache_timestamp.get(key, datetime.min)).total_seconds() > 300:
                all_cached = False
                break
        
        # Si tous les paramètres sont en cache et valides, retourner à partir du cache
        if all_cached and keys:
            result = {key: self._cache[key] for key in keys}
            logger.debug(f"=== DEBUG: Paramètres de catégorie {category} récupérés du cache ===")
            return result
        
        # Sinon, charger à partir de la base de données
        return self.load_category(category)
        
    def clear_cache(self):
        """
        Vide le cache
        """
        self._cache = {}
        self._cache_timestamp = {}
        logger.info("=== DEBUG: Cache vidé ===") 