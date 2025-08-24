import json
import os
from typing import Dict, Any, List, Optional
from app.models.app_config import AppConfig


class PipelineRegistry:
    """Registre des pipelines IA (merge defaults + user, avec cache DB)."""

    DEFAULTS_PATH = os.path.join('config', 'pipelines.defaults.json')
    USER_PATH = os.path.join('config', 'pipelines.user.json')
    CACHE_KEY = 'pipelines_cache'

    def __init__(self) -> None:
        self._cache: Dict[str, Any] = {}

    def _read_json_file(self, path: str) -> Dict[str, Any]:
        if not os.path.exists(path):
            return {"pipelines": []}
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {"pipelines": []}

    def _merge(self, defaults: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
        d_pipes = {p.get('id'): p for p in defaults.get('pipelines', [])}
        u_pipes = {p.get('id'): p for p in user.get('pipelines', [])}
        merged = {**d_pipes, **u_pipes}
        return {"pipelines": list(merged.values())}

    def refresh(self) -> Dict[str, Any]:
        defaults = self._read_json_file(self.DEFAULTS_PATH)
        user = self._read_json_file(self.USER_PATH)
        merged = self._merge(defaults, user)
        merged['refreshed_at'] = AppConfig.set_value('now_timestamp', '', category='general').updated_at.isoformat() if hasattr(AppConfig, 'set_value') else None
        # stocker en DB
        AppConfig.set_value(self.CACHE_KEY, merged, category='general')
        self._cache = merged
        return merged

    def get_cache(self) -> Dict[str, Any]:
        if self._cache:
            return self._cache
        cached = AppConfig.get_value(self.CACHE_KEY, None)
        if isinstance(cached, dict) and 'pipelines' in cached:
            self._cache = cached
            return cached
        return self.refresh()

    def get_pipelines(self) -> List[Dict[str, Any]]:
        return self.get_cache().get('pipelines', [])

    def get_pipeline(self, pipeline_id: str) -> Optional[Dict[str, Any]]:
        for p in self.get_pipelines():
            if p.get('id') == pipeline_id:
                return p
        return None

    def save_user_config(self, body: Dict[str, Any]) -> Dict[str, Any]:
        os.makedirs(os.path.dirname(self.USER_PATH), exist_ok=True)
        with open(self.USER_PATH, 'w', encoding='utf-8') as f:
            json.dump(body, f, ensure_ascii=False, indent=2)
        return self.refresh()


pipeline_registry = PipelineRegistry()


