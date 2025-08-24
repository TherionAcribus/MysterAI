import os
import json
import time
from typing import Dict, Any, List, Optional

import requests

from app.models.app_config import AppConfig


def _project_root_dir() -> str:
    """Retourne le chemin absolu du répertoire racine du projet."""
    # Ce fichier est dans app/services/, on remonte deux niveaux pour atteindre la racine
    return os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


class ModelRegistry:
    """Registre des modèles (fusion JSON + découverte dynamique + cache DB)."""

    def __init__(self, ollama_url: str = "http://localhost:11434"):
        root = _project_root_dir()
        self.defaults_path = os.path.join(root, 'config', 'models.defaults.json')
        self.user_path = os.path.join(root, 'config', 'models.user.json')
        self.ollama_url = ollama_url
        # S'assurer que le répertoire config existe
        os.makedirs(os.path.dirname(self.user_path), exist_ok=True)

    def _load_json(self, path: str) -> Dict[str, Any]:
        try:
            if not os.path.exists(path):
                return {"models": [], "use_case_models": {}}
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            # En cas d'erreur de lecture/JSON, retourner une structure vide
            return {"models": [], "use_case_models": {}}

    def _discover_ollama(self) -> List[str]:
        """Retourne les identifiants de modèles installés côté Ollama (ex: 'llama3:latest')."""
        try:
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get('models', [])
                return [m.get('name') for m in models if m.get('name')]
        except Exception:
            pass
        return []

    def _has_provider_key(self, provider: str) -> bool:
        # Vérifie la présence d'une clé provider spécifique, sinon clé générique
        specific = AppConfig.get_value(f"{provider}_api_key", '')
        generic = AppConfig.get_value('api_key', '')
        return bool(specific or generic)

    def refresh(self) -> Dict[str, Any]:
        """Recharge la configuration (fichiers JSON), découvre les modèles, et met en cache en DB."""
        defaults = self._load_json(self.defaults_path)
        user = self._load_json(self.user_path)

        # Fusion par id (les entrées de l'utilisateur surchargent les defaults)
        by_id: Dict[str, Dict[str, Any]] = {}
        for source_list in (defaults.get('models', []), user.get('models', [])):
            for model in source_list:
                model_id = model.get('id')
                if not model_id:
                    continue
                merged = {**by_id.get(model_id, {}), **model}
                by_id[model_id] = merged

        # Découverte locale (Ollama)
        installed_local = set(self._discover_ollama())
        now_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

        # Marquage des états
        for m in by_id.values():
            provider = m.get('provider')
            # Déterminer type si absent
            if not m.get('type'):
                m['type'] = 'local' if provider == 'ollama' else 'online'

            if m['type'] == 'local':
                model_id = m.get('model_id')
                m['installed'] = bool(model_id in installed_local)
                m['is_usable'] = m['installed']
            else:
                # Online: nécessitent une clé si requires_api_key=True (défaut vrai)
                requires_key = m.get('requires_api_key', True)
                m['is_usable'] = (not requires_key) or self._has_provider_key(provider or '')

            m['last_seen'] = now_iso

        cache = {
            'models': sorted(by_id.values(), key=lambda x: x.get('name', x.get('id'))),
            'use_case_models': {**defaults.get('use_case_models', {}), **user.get('use_case_models', {})},
            'refreshed_at': now_iso
        }

        # Persister en DB
        AppConfig.set_value('model_registry_cache', json.dumps(cache))
        return cache

    def get_cache(self) -> Dict[str, Any]:
        raw = AppConfig.get_value('model_registry_cache', '')
        if not raw:
            return self.refresh()
        try:
            return json.loads(raw)
        except Exception:
            return self.refresh()

    def get_models(self, type: Optional[str] = None, provider: Optional[str] = None,
                   capability: Optional[str] = None) -> List[Dict[str, Any]]:
        cache = self.get_cache()
        models = cache.get('models', [])
        if type:
            models = [m for m in models if m.get('type') == type]
        if provider:
            models = [m for m in models if m.get('provider') == provider]
        if capability:
            models = [m for m in models if capability in (m.get('capabilities') or [])]
        return models

    def assign_use_case(self, use_case: str, composite_id: str) -> None:
        cache = self.get_cache()
        mapping = cache.get('use_case_models', {})
        mapping[use_case] = composite_id
        cache['use_case_models'] = mapping
        AppConfig.set_value('model_registry_cache', json.dumps(cache))

    def get_model_for_use_case(self, use_case: str) -> Optional[str]:
        return self.get_cache().get('use_case_models', {}).get(use_case)

    # --- Gestion du fichier user JSON ---
    def get_user_config(self) -> Dict[str, Any]:
        """Retourne le contenu de config/models.user.json (crée par défaut si manquant)."""
        data = self._load_json(self.user_path)
        if 'models' not in data:
            data['models'] = []
        if 'use_case_models' not in data:
            data['use_case_models'] = {}
        return data

    def save_user_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Écrit la configuration utilisateur puis refresh le cache."""
        safe = {
            'models': config.get('models', []),
            'use_case_models': config.get('use_case_models', {})
        }
        with open(self.user_path, 'w', encoding='utf-8') as f:
            json.dump(safe, f, ensure_ascii=False, indent=2)
        return self.refresh()

    def set_use_case_model(self, use_case: str, composite_id: str) -> Dict[str, Any]:
        """Met à jour le mapping use_case → modèle dans le fichier user puis refresh."""
        user = self.get_user_config()
        ucm = user.get('use_case_models', {})
        ucm[use_case] = composite_id
        user['use_case_models'] = ucm
        return self.save_user_config(user)


# Instance singleton du registre
model_registry = ModelRegistry()


