from typing import Optional, Any, Dict, List
from loguru import logger

try:
    # LangChain v0.2+
    from langchain_core.callbacks import BaseCallbackHandler
except Exception:
    try:
        from langchain.callbacks.base import BaseCallbackHandler  # type: ignore
    except Exception:
        BaseCallbackHandler = object  # type: ignore

from app.services.websocket_service import get_websocket_service


class WebSocketCallbackHandler(BaseCallbackHandler):
    """
    CallbackHandler LangChain/LangGraph qui émet des événements de progression via WebSocketService.
    Compatible avec LangChain (on_llm_start/end, on_tool_start/end, etc.).
    """

    def __init__(self, session_id: str, operation_type: str = "ai_chat", meta: Optional[Dict[str, Any]] = None, show_thinking: bool = False, stream: bool = False):
        self.session_id = session_id
        self.operation_type = operation_type
        self.meta = meta or {}
        self.show_thinking = bool(show_thinking)
        self.stream = bool(stream)
        self.ws = get_websocket_service()
        # État pour la détection des sections de réflexion (ex: <think>...</think>)
        self._in_think = False

    # LLM lifecycle
    def on_llm_start(self, serialized: Dict[str, Any], prompts: List[str], **kwargs: Any) -> None:
        model = (serialized or {}).get("name") or (serialized or {}).get("id") or "llm"
        message = f"Appel LLM démarré ({model})"
        data = {"model": model, "prompt_count": len(prompts or []), **self.meta}
        self.ws.emit_progress(self.session_id, "llm_start", message, None, data)

    def on_llm_end(self, response, **kwargs: Any) -> None:  # response: LLMResult
        try:
            generations = getattr(response, "generations", None)
            token_count = None
            if generations and len(generations) and len(generations[0]):
                text = getattr(generations[0][0], "text", "")
                token_count = len(text.split()) if text else 0
        except Exception:
            token_count = None
        data = {"tokens": token_count, **self.meta}
        self.ws.emit_progress(self.session_id, "llm_end", "Appel LLM terminé", 100, data)

    def on_llm_error(self, error: BaseException, **kwargs: Any) -> None:
        self.ws.emit_error(self.session_id, f"Erreur LLM: {error}")

    # Tool lifecycle
    def on_tool_start(self, serialized: Dict[str, Any], input_str: str, **kwargs: Any) -> None:
        name = (serialized or {}).get("name") or "tool"
        self.ws.emit_progress(self.session_id, "tool_start", f"Outil {name} démarré", None, {"tool": name, **self.meta})

    def on_tool_end(self, output: str, **kwargs: Any) -> None:
        self.ws.emit_progress(self.session_id, "tool_end", "Outil terminé", None, {"output_preview": (output or "")[:200], **self.meta})

    def on_tool_error(self, error: BaseException, **kwargs: Any) -> None:
        self.ws.emit_error(self.session_id, f"Erreur outil: {error}")

    # Chain/graph lifecycle (LangChain)
    def on_chain_start(self, serialized: Dict[str, Any], inputs: Dict[str, Any], **kwargs: Any) -> None:
        name = (serialized or {}).get("id", [None, None, "chain"]) [-1]
        self.ws.emit_progress(self.session_id, "chain_start", f"Chaîne {name} démarrée", None, {"inputs_keys": list((inputs or {}).keys()), **self.meta})

    def on_chain_end(self, outputs: Dict[str, Any], **kwargs: Any) -> None:
        self.ws.emit_progress(self.session_id, "chain_end", "Chaîne terminée", None, {"output_keys": list((outputs or {}).keys()), **self.meta})

    def on_chain_error(self, error: BaseException, **kwargs: Any) -> None:
        self.ws.emit_error(self.session_id, f"Erreur chaîne: {error}")

    # Arbitrary text events (helper)
    def note(self, step: str, message: str, progress: Optional[int] = None, data: Optional[Dict[str, Any]] = None):
        self.ws.emit_progress(self.session_id, step, message, progress, data or self.meta)

    # Token streaming
    def on_llm_new_token(self, token: str, **kwargs: Any) -> None:
        if not self.stream:
            return
        text = token or ""
        if not text:
            return
        # Détection simple des balises de réflexion
        if "<think>" in text:
            self._in_think = True
        if "</think>" in text:
            # émettre ce qui est avant la fermeture si présent
            pass
        is_thinking = self._in_think
        # Filtrage côté serveur si réflexion désactivée
        if is_thinking and not self.show_thinking:
            return
        self.ws.emit_progress(self.session_id, "token", text, None, {"is_thinking": is_thinking, **self.meta})
        if "</think>" in text:
            self._in_think = False


