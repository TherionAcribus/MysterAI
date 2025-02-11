import os
import json
import subprocess
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional
from loguru import logger

# Importer votre modèle SQLAlchemy et votre session DB
from app.models.plugin_model import Plugin
from app.routes.coordinates import detect_gps_coordinates
from app import db  # Utiliser l'instance de db de l'application


# ============================================================
# 1. Types de plugins et métadonnées
# ============================================================

class PluginType(Enum):
    PYTHON = "python"
    RUST = "rust"
    WEBASSEMBLY = "wasm"
    BINARY = "binary"

@dataclass
class PluginMetadata:
    name: str
    version: str
    description: str
    author: str
    plugin_type: PluginType
    entry_point: str
    dependencies: List[str]
    categories: List[str]
    input_types: Dict[str, Any]
    output_types: Dict[str, Any]

    @classmethod
    def from_json(cls, json_data: dict) -> 'PluginMetadata':
        return cls(
            name=json_data['name'],
            version=json_data['version'],
            description=json_data.get('description', ''),
            author=json_data.get('author', ''),
            plugin_type=PluginType(json_data['plugin_type']),
            entry_point=json_data['entry_point'],
            dependencies=json_data.get('dependencies', []),
            categories=json_data.get('categories', []),      # <-- gère la liste de catégories
            input_types=json_data.get('input_types', {}),    # <-- Dict[str, Any]
            output_types=json_data.get('output_types', {})   # <-- Dict[str, Any]
        )

# ============================================================
# 2. Interface de base pour tous les plugins
# ============================================================

class PluginInterface(ABC):
    @abstractmethod
    def initialize(self) -> bool:
        """Charge ou prépare les ressources nécessaires (ex: import dynamique, etc.)"""
        pass

    @abstractmethod
    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Exécute la logique principale du plugin."""
        pass

    @abstractmethod
    def cleanup(self) -> bool:
        """Libère les ressources si nécessaire."""
        pass


# ============================================================
# 3. Wrappers pour différents types de plugins
# ============================================================

class PythonPluginWrapper(PluginInterface):
    """
    Exemple de wrapper pour un plugin Python.
    On suppose que 'entry_point' est un nom de fichier (ex: main.py)
    ou un chemin complet, et qu'il contient une classe
    ou une fonction à invoquer.
    """
    def __init__(self, plugin_path: str, metadata: PluginMetadata, plugin_manager=None):
        self.plugin_path = plugin_path
        self.metadata = metadata
        self._module = None  # On stockera ici le module Python importé
        self._instance = None  # Si on a besoin d'instancier une classe
        self.plugin_manager = plugin_manager

    def initialize(self) -> bool:
        """
        Charge le module Python et instancie la classe du plugin.
        """
        try:
            entry_file = os.path.join(self.plugin_path, self.metadata.entry_point)
            if not os.path.exists(entry_file):
                logger.error(f"Entry point file not found: {entry_file}")
                return False

            # Importer le module dynamiquement
            import importlib.util
            spec = importlib.util.spec_from_file_location(
                self.metadata.name, entry_file
            )
            self._module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(self._module)  # Charge le module

            # Chercher la classe du plugin
            expected_class_name = f"{self.metadata.name.title().replace('_', '')}Plugin"
            if hasattr(self._module, expected_class_name):
                cls = getattr(self._module, expected_class_name)
                self._instance = cls()
            else:
                # Chercher n'importe quelle classe qui se termine par 'Plugin'
                for attr_name in dir(self._module):
                    if attr_name.endswith('Plugin'):
                        cls = getattr(self._module, attr_name)
                        if isinstance(cls, type):  # Vérifier que c'est bien une classe
                            self._instance = cls()
                            break

            if not self._instance:
                logger.error(f"No plugin class found in {entry_file}")
                return False

            # Injecter le plugin_manager si le plugin le supporte
            if hasattr(self._instance, 'set_plugin_manager') and self.plugin_manager:
                self._instance.set_plugin_manager(self.plugin_manager)

            return True
        except Exception as e:
            logger.error(f"Failed to initialize Python plugin {self.metadata.name}: {e}")
            return False

    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Exécute la méthode 'execute' du plugin.
        """
        if not self._instance:
            raise RuntimeError("Plugin not initialized or class not found.")

        if hasattr(self._instance, 'execute'):
            return self._instance.execute(inputs)
        else:
            raise NotImplementedError("Plugin class must implement 'execute' method.")

    def cleanup(self) -> bool:
        # Ici, on peut faire du nettoyage si besoin
        self._module = None
        self._instance = None
        return True


class BinaryPluginWrapper(PluginInterface):
    """
    Exemple d'implémentation d'un wrapper pour un plugin Binaire/Exécutable.
    """
    def __init__(self, binary_path: str, metadata: PluginMetadata):
        self.binary_path = binary_path
        self.metadata = metadata

    def initialize(self) -> bool:
        # Vérifier que le binaire existe et est exécutable
        return os.path.exists(self.binary_path) and os.access(self.binary_path, os.X_OK)

    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        process = subprocess.Popen(
            [self.binary_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        input_json = json.dumps(inputs).encode()
        stdout, stderr = process.communicate(input_json)

        if process.returncode != 0:
            raise RuntimeError(f"Plugin error: {stderr.decode()}")

        return json.loads(stdout.decode())

    def cleanup(self) -> bool:
        return True

# ============================================================
# 4. Le PluginManager
# ============================================================

class PluginManager:
    def __init__(self, plugins_dir: str, app=None):
        """
        :param plugins_dir: répertoire de base où chercher les plugins.
        :param app: l'application Flask
        """
        self.plugins_dir = plugins_dir
        self.app = app
        self.loaded_plugins: Dict[str, PluginInterface] = {}
        self._plugin_cache: Dict[str, Dict] = {}  # Cache des métadonnées
        self._loading_errors: Dict[str, str] = {}  # Stockage des erreurs
        
        if app:
            with app.app_context():
                self.discover_plugins()
                self.load_plugins()

    def discover_plugins(self):
        """
        Scanne le répertoire `self.plugins_dir` pour trouver
        tous les plugin.json et mettre à jour la base de données.
        Supprime également les plugins qui n'existent plus physiquement.
        Retourne la liste des dict infos plugin découverts.
        """
        discovered_plugins = []
        discovered_paths = set()  # Pour garder une trace des chemins de plugins valides
        logger.debug(f"Scanning for plugins in: {self.plugins_dir}")
        
        for root, _, files in os.walk(self.plugins_dir):
            if 'plugin.json' in files:
                plugin_json_path = os.path.join(root, 'plugin.json')
                plugin_dir = os.path.dirname(plugin_json_path)
                discovered_paths.add(plugin_dir)  # Ajoute le chemin aux chemins découverts
                logger.debug(f"Found plugin.json at: {plugin_json_path}")
                try:
                    with open(plugin_json_path, 'r', encoding='utf-8') as f:
                        plugin_info = json.load(f)
                        plugin_info['path'] = plugin_dir
                        logger.debug(f"Loading plugin: {plugin_info['name']} from {plugin_info['path']}")
                        self._update_plugin_in_db(plugin_info)
                        discovered_plugins.append(plugin_info)
                except Exception as e:
                    logger.error(f"Failed loading {plugin_json_path}: {e}")
        
        # Nettoyage des plugins qui n'existent plus
        try:
            all_plugins = Plugin.query.all()
            for plugin in all_plugins:
                if plugin.path not in discovered_paths:
                    logger.debug(f"Removing plugin {plugin.name} as its directory no longer exists: {plugin.path}")
                    db.session.delete(plugin)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to clean up deleted plugins: {e}")
                    
        logger.info(f"Total plugins discovered: {len(discovered_plugins)}")
        return discovered_plugins

    def _update_plugin_in_db(self, plugin_info: dict):
        """
        Met à jour ou crée un plugin dans la base de données.
        Ne crée une nouvelle entrée que si le plugin n'existe pas déjà.
        """
        try:
            # Vérifie si le plugin existe déjà avec le même nom
            existing_plugin = Plugin.query.filter_by(name=plugin_info['name']).first()

            if existing_plugin:
                logger.debug(f"Plugin {plugin_info['name']} already exists in DB")
                # On ne met à jour que si la version est différente
                if existing_plugin.version != plugin_info['version']:
                    logger.debug(f"Updating plugin version from {existing_plugin.version} to {plugin_info['version']}")
                    existing_plugin.version = plugin_info['version']
                    existing_plugin.description = plugin_info.get('description', '')
                    existing_plugin.author = plugin_info.get('author', '')
                    existing_plugin.plugin_type = plugin_info.get('plugin_type', '')
                    existing_plugin.path = plugin_info['path']
                    existing_plugin.entry_point = plugin_info.get('entry_point', '')
                    existing_plugin.bruteforce = plugin_info.get('bruteforce', False)
                    existing_plugin.metadata_json = json.dumps(plugin_info)
                    # Mise à jour des catégories
                    categories = plugin_info.get('categories', [])
                    existing_plugin.categories = json.dumps(categories)
                    db.session.commit()
            else:
                logger.debug(f"Creating new plugin in DB: {plugin_info['name']}")
                # Création d'un nouveau plugin
                new_plugin = Plugin(
                    name=plugin_info['name'],
                    version=plugin_info['version'],
                    description=plugin_info.get('description', ''),
                    author=plugin_info.get('author', ''),
                    plugin_type=plugin_info.get('plugin_type', ''),
                    path=plugin_info['path'],
                    entry_point=plugin_info.get('entry_point', ''),
                    bruteforce=plugin_info.get('bruteforce', False),
                    metadata_json=json.dumps(plugin_info),
                    categories=json.dumps(plugin_info.get('categories', []))
                )
                db.session.add(new_plugin)
                db.session.commit()
                logger.debug(f"Successfully created plugin {plugin_info['name']} in DB")

        except Exception as e:
            db.session.rollback()
            logger.error(f"Database error for plugin {plugin_info['name']}: {e}")

    def load_plugins(self, only_enabled: bool = True):
        """
        Charge en mémoire (initialize) tous les plugins présents en DB.
        Si only_enabled=True, ne charge que ceux qui sont enabled.
        """
        logger.debug(f"Loading plugins (only_enabled={only_enabled})")
        # Récupérer la liste depuis la BDD
        query = Plugin.query
        if only_enabled:
            query = query.filter_by(enabled=True)
        all_plugins = query.all()
        logger.debug(f"Found {len(all_plugins)} plugins in DB")

        for plugin in all_plugins:
            logger.debug(f"Attempting to load plugin: {plugin.name}")
            # Instancie le wrapper approprié en fonction du plugin_type
            wrapper = self._create_plugin_wrapper(plugin)
            if wrapper:
                logger.debug(f"Created wrapper for {plugin.name}, initializing...")
                if wrapper.initialize():
                    self.loaded_plugins[plugin.name] = wrapper
                    logger.info(f"Successfully loaded plugin: {plugin.name}")
                else:
                    logger.error(f"Failed to initialize plugin: {plugin.name}")
            else:
                logger.error(f"Failed to create wrapper for plugin: {plugin.name}")

    def get_plugin(self, plugin_name: str, force_reload: bool = False) -> Optional[PluginInterface]:
        """
        Récupère un plugin par son nom, le charge si nécessaire
        :param plugin_name: Nom du plugin
        :param force_reload: Force le rechargement même si déjà chargé
        :return: Instance du plugin ou None si erreur
        """
        if force_reload or plugin_name not in self.loaded_plugins:
            try:
                with self.app.app_context():
                    plugin_record = Plugin.query.filter_by(name=plugin_name).first()
                    if not plugin_record:
                        logger.error(f"Plugin {plugin_name} non trouvé en base")
                        return None
                    
                    if not plugin_record.enabled:
                        logger.warning(f"Plugin {plugin_name} est désactivé")
                        return None
                        
                    wrapper = self._create_plugin_wrapper(plugin_record)
                    if wrapper.initialize():
                        self.loaded_plugins[plugin_name] = wrapper
                        self._loading_errors.pop(plugin_name, None)
                    else:
                        self._loading_errors[plugin_name] = "Échec d'initialisation"
                        return None
            except Exception as e:
                logger.exception(f"Erreur lors du chargement du plugin {plugin_name}")
                self._loading_errors[plugin_name] = str(e)
                return None
                
        return self.loaded_plugins.get(plugin_name)

    def execute_plugin(self, plugin_name: str, inputs: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Exécute un plugin et ajoute une détection de coordonnées GPS si activée.
        """
        plugin = self.get_plugin(plugin_name)
        if not plugin:
            logger.error(f"Plugin {plugin_name} non disponible")
            return None

        # Exécute le plugin pour obtenir le texte décodé
        result = plugin.execute(inputs)
        print("RESULT", result)
        decoded_text = result.get("text_output")
        if not decoded_text:
            decoded_text = result.get("result", {}).get("text", {}).get("text_output")
        print(f"Decoded text: {decoded_text}")

        # Vérifie si la détection GPS est activée
        enable_gps = inputs.get("enable_gps_detection", True)
        print(f"GPS detection enabled: {enable_gps}")
        if enable_gps and decoded_text:
            gps_coordinates = detect_gps_coordinates(decoded_text)
            result["coordinates"] = gps_coordinates

        return result

    def get_plugin_status(self) -> Dict[str, Dict]:
        """
        Retourne l'état actuel de tous les plugins
        """
        status = {}
        with self.app.app_context():
            for plugin in Plugin.query.all():
                status[plugin.name] = {
                    "enabled": plugin.enabled,
                    "loaded": plugin.name in self.loaded_plugins,
                    "error": self._loading_errors.get(plugin.name),
                    "metadata": self._plugin_cache.get(plugin.name)
                }
        return status

    def reload_all_plugins(self) -> bool:
        """
        Recharge tous les plugins
        """
        try:
            self.unload_plugins()
            self.discover_plugins()
            return self.load_plugins()
        except Exception as e:
            logger.exception("Erreur lors du rechargement des plugins")
            return False

    def unload_plugins(self):
        """
        Appelle la méthode cleanup() sur tous les plugins chargés
        et vide le dictionnaire loaded_plugins.
        """
        for name, plugin_instance in self.loaded_plugins.items():
            plugin_instance.cleanup()
        self.loaded_plugins.clear()

    # ---------------------------------------------------------
    # Méthodes internes
    # ---------------------------------------------------------

    def _create_plugin_wrapper(self, plugin_record) -> Optional[PluginInterface]:
        """
        Fabrique le wrapper Python ou Binaire (ou autre) selon plugin_type.
        :param plugin_record: un objet Plugin (SQLAlchemy)
        """
        try:
            logger.debug(f"Creating wrapper for plugin: {plugin_record.name}")
            metadata_dict = json.loads(plugin_record.metadata_json)
            logger.debug(f"Plugin type: {metadata_dict['plugin_type']}")
            plugin_metadata = PluginMetadata.from_json(metadata_dict)

            if plugin_metadata.plugin_type == PluginType.PYTHON:
                logger.debug(f"Creating Python wrapper for: {plugin_record.name}")
                return PythonPluginWrapper(plugin_record.path, plugin_metadata, self)
            elif plugin_metadata.plugin_type in [PluginType.RUST, PluginType.BINARY]:
                logger.debug(f"Creating Binary wrapper for: {plugin_record.name}")
                binary_path = os.path.join(plugin_record.path, plugin_metadata.entry_point)
                return BinaryPluginWrapper(binary_path, plugin_metadata)
            elif plugin_metadata.plugin_type == PluginType.WEBASSEMBLY:
                logger.warning(f"WebAssembly not yet implemented for: {plugin_record.name}")
                return None
            else:
                logger.warning(f"Unknown plugin type {plugin_metadata.plugin_type}")
                return None
        except Exception as e:
            logger.error(f"Failed to create wrapper for {plugin_record.name}: {e}")
            return None
