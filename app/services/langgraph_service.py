"""
Service LangGraph pour l'application MysteryAI

Ce service fournit une implémentation avancée du chat IA utilisant LangGraph,
qui permet d'intégrer les plugins de l'application comme des outils (tools)
que l'IA peut utiliser pour résoudre des énigmes de géocaching.

Contrairement à l'implémentation LangChain dans AIService, cette implémentation :
1. Supporte l'utilisation des plugins comme outils
2. Utilise un graphe d'exécution pour gérer le flux de conversation
3. Est spécialement conçue pour la résolution d'énigmes de géocaching

Cette implémentation est utilisée lorsque les paramètres 'use_langgraph' et 'use_tools'
sont tous deux activés dans les paramètres de l'application.
"""

import json
from typing import Dict, List, Any, Optional, TypedDict, Annotated, Sequence, Union, Callable
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage, ToolMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
import operator
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
try:
    # Préférer le paquet dédié si disponible
    from langchain_ollama import ChatOllama  # type: ignore
except Exception:
    # Fallback pour compatibilité
    from langchain_community.chat_models import ChatOllama
from app.models.app_config import AppConfig
from app.services.pipeline_registry import pipeline_registry
from langchain_core.tools import tool
from langchain_core.tools import BaseTool

# Prompt système par défaut pour le chat IA
DEFAULT_SYSTEM_PROMPT = """Tu es un assistant spécialisé dans la résolution d'énigmes de géocaching. 
Tu as accès à plusieurs outils de déchiffrement qui peuvent t'aider à résoudre des codes secrets.

Voici comment tu dois procéder pour aider l'utilisateur :
1. Analyse attentivement l'énigme ou le texte fourni par l'utilisateur
2. Identifie les potentiels codes secrets ou chiffrements (César, Vigenère, binaire, morse, etc.)
3. Utilise les outils appropriés pour tenter de déchiffrer ces codes
4. Explique ton raisonnement et présente les résultats de manière claire

Si tu identifies des coordonnées GPS dans le texte déchiffré, mets-les en évidence.

N'hésite pas à essayer plusieurs outils si nécessaire, et à combiner leurs résultats pour résoudre des énigmes complexes.
"""

class ChatState(TypedDict):
    """État du graphe de conversation"""
    messages: Annotated[Sequence[BaseMessage], operator.add]
    system_prompt: Optional[str]
    next: Optional[str]
    session_id: Optional[str]
    context: Dict[str, Any]

class LangGraphService:
    """Service pour gérer les interactions avec les modèles d'IA via LangGraph"""

    # Mapping des noms génériques vers les vrais noms de plugins
    TOOL_NAME_MAPPING = {
        "ocr": ["html_text_extractor", "image_alt_text_extractor"],
        "exif": ["metadetection"],
        "qr": ["qr_code_detector"],
        "cipher": [
            "caesar_code", "vigenere_cipher", "atbash", "bacon_code", "polybius_square",
            "bifid_delastelle", "beaufort_cipher", "gronsfeld_cipher", "nihilist_cipher",
            "rail_fence_cipher", "redefence_cipher", "tap_code", "tom_tom", "wolseley_cipher",
            "gold_bug", "multiplicative_code", "modulo_cipher", "abaddon_code", "fox_code",
            "houdini_code", "kenny_code", "morse_code", "t9_code", "multitap_code"
        ],
        "formula": ["formula_parser"],
        "coordinates": ["coordinate_format_converter", "coordinates_finder"],
        "analysis": ["additional_waypoints_analyzer", "analysis_web_page", "orientation_calculation", "projection_calculation"],
        "text": ["alpha_decoder", "color_text_detector", "consonants_vowels_rank", "html_comments_finder", "letter_value"],
        "numbers": ["base_converter", "chemical_elements", "hexadecimal_to_decimal", "prime_numbers", "roman_code", "shadok_numbers"],
        "other": ["antipode", "checksum", "postnet_barcode", "what3words", "word_coords_converter", "wherigo_reverse_decoder"]
    }
    
    def __init__(self):
        """Initialise le service LangGraph avec des valeurs par défaut"""
        self.mode = 'online'
        self.temperature = 0.7
        self.provider = 'openai'
        self.api_key = ''
        self.model_name = 'gpt-3.5-turbo'
        self.ollama_url = 'http://localhost:11434'
        
        # Les paramètres seront chargés lors de la première utilisation
        self._initialized = False
        self._graph = None
        self._graphs_by_pipeline: Dict[str, Any] = {}
        self._plugin_manager = None
        self._tools = []
    
    def _ensure_initialized(self):
        """Charge les paramètres depuis la base de données si ce n'est pas déjà fait"""
        if not self._initialized:
            try:
                # Charger les paramètres communs
                self.mode = AppConfig.get_value('ai_mode', 'online')
                self.temperature = float(AppConfig.get_value('temperature', 0.7))
                
                # Paramètres spécifiques au mode
                if self.mode == 'online':
                    self.provider = AppConfig.get_value('ai_provider', 'openai')
                    self.api_key = AppConfig.get_value('api_key', '')
                    self.model_name = AppConfig.get_value('ai_model', 'gpt-3.5-turbo')
                    
                    # Log pour le débogage
                    print(f"=== DEBUG: LangGraph - Mode en ligne chargé - Provider: {self.provider}, Model: {self.model_name} ===")
                else:
                    self.ollama_url = AppConfig.get_value('ollama_url', 'http://localhost:11434')
                    self.model_name = AppConfig.get_value('local_model', 'deepseek-coder:latest')
                    
                    # Log pour le débogage
                    print(f"=== DEBUG: LangGraph - Mode local chargé - URL: {self.ollama_url}, Model: {self.model_name} ===")
                
                # Utiliser le PluginManager global de l'application
                try:
                    from flask import current_app
                    flask_app = None
                    try:
                        flask_app = current_app._get_current_object()
                    except Exception:
                        flask_app = None

                    if flask_app is not None and hasattr(flask_app, 'plugin_manager'):
                        self._plugin_manager = flask_app.plugin_manager
                        print("=== DEBUG: LangGraph - PluginManager récupéré depuis l'application ===")
                        # Vérifier que les plugins sont chargés
                        if hasattr(self._plugin_manager, 'loaded_plugins'):
                            loaded_count = len(self._plugin_manager.loaded_plugins)
                            print(f"=== DEBUG: LangGraph - {loaded_count} plugins chargés dans PluginManager ===")
                        else:
                            print("=== WARNING: LangGraph - PluginManager n'a pas de loaded_plugins ===")
                    else:
                        print("=== WARNING: LangGraph - PluginManager non disponible dans l'application ===")
                        self._plugin_manager = None
                except Exception as e_init:
                    print(f"=== ERROR: Récupération du PluginManager échouée: {str(e_init)} ===")
                    self._plugin_manager = None
                
                # Créer les outils à partir des plugins
                self._create_tools_from_plugins()
                
                self._initialized = True
                
                # Log pour confirmer l'initialisation
                print(f"=== DEBUG: Service LangGraph initialisé - Mode: {self.mode}, Modèle: {self.model_name} ===")
            except Exception as e:
                # Si nous sommes toujours en dehors du contexte de l'application,
                # nous utiliserons les valeurs par défaut
                print(f"=== ERROR: Erreur lors de l'initialisation du service LangGraph: {str(e)} ===")
                pass
    
    def _create_tools_from_plugins(self):
        """Crée des outils LangChain à partir des plugins disponibles"""
        if not self._plugin_manager:
            print("=== ERROR: Plugin Manager non initialisé ===")
            return

        loaded_count = len(self._plugin_manager.loaded_plugins) if hasattr(self._plugin_manager, 'loaded_plugins') else 'N/A'
        print(f"=== DEBUG: Création des outils depuis PluginManager (loaded_plugins: {loaded_count}) ===")

        if not hasattr(self._plugin_manager, 'loaded_plugins'):
            return

        for plugin_name, plugin_wrapper in self._plugin_manager.loaded_plugins.items():
            try:
                # Créer une fonction de wrapper pour le plugin
                def create_plugin_tool(p_name, p_wrapper):
                    import json
                    from langchain_core.tools import tool

                    @tool
                    def plugin_tool(text: str = "", **kwargs) -> str:
                        """Utilise le plugin p_name pour traiter le texte."""
                        inputs = {"text": text}
                        inputs.update(kwargs or {})
                        result = self._plugin_manager.execute_plugin(p_name, inputs)
                        if result:
                            if "text_output" in result:
                                return f"Résultat de {p_name}: {result['text_output']}"
                            return f"Résultat de {p_name}: {json.dumps(result, ensure_ascii=False)}"
                        return f"Erreur lors de l'exécution du plugin {p_name}"

                    # Métadonnées
                    plugin_tool.__name__ = p_name
                    plugin_tool.name = p_name
                    if hasattr(p_wrapper, 'metadata') and getattr(p_wrapper, 'metadata'):
                        plugin_tool.description = f"{getattr(p_wrapper.metadata, 'description', p_name) or p_name}. Utilisez ce plugin pour {p_name.replace('_', ' ')}."
                    else:
                        plugin_tool.description = f"Plugin {p_name}. Utilisez ce plugin pour {p_name.replace('_', ' ')}."
                    return plugin_tool

                tool_fn = create_plugin_tool(plugin_name, plugin_wrapper)
                self._tools.append(tool_fn)
                print(f"=== DEBUG: Outil créé pour le plugin {plugin_name} ===")
            except Exception as e:
                print(f"=== ERROR: Erreur lors de la création de l'outil pour le plugin {plugin_name}: {str(e)} ===")

        print(f"=== DEBUG: Total outils créés: {len(self._tools)} ===")
        for t in self._tools:
            print(f"=== DEBUG: Outil disponible: {getattr(t, 'name', getattr(t, '__name__', 'inconnu'))} ===")
    
    def _get_llm(self):
        """Retourne le modèle de langage approprié en fonction de la configuration"""
        self._ensure_initialized()
        
        if self.mode == 'online':
            if self.provider == 'openai':
                return ChatOpenAI(
                    model_name=self.model_name,
                    temperature=self.temperature,
                    openai_api_key=self.api_key
                )
            else:
                raise ValueError(f"Fournisseur non pris en charge pour LangGraph: {self.provider}")
        else:
            return ChatOllama(
                model=self.model_name,
                temperature=self.temperature,
                base_url=self.ollama_url
            )

    def _format_with_context(self, template: str, ctx: Dict[str, Any]) -> str:
        if not template:
            return ""
        out = template
        try:
            for k, v in (ctx or {}).items():
                out = out.replace("{" + str(k) + "}", str(v))
        except Exception:
            pass
        return out

    def _invoke_llm(self, llm, messages: List[BaseMessage], session_id: Optional[str]) -> AIMessage:
        response_msg: Optional[AIMessage] = None
        try:
            if hasattr(llm, 'stream') and session_id:
                content_parts: List[str] = []
                try:
                    from app.services.websocket_service import get_websocket_service
                    ws = get_websocket_service()
                except Exception:
                    ws = None
                try:
                    for chunk in llm.stream(messages):
                        try:
                            txt = getattr(chunk, 'content', None)
                            if txt:
                                content_parts.append(txt)
                        except Exception:
                            pass
                        try:
                            if ws:
                                ctl = ws.get_control(session_id)
                                if ctl and ctl.get('canceled'):
                                    return AIMessage(content="(Génération annulée)")
                        except Exception:
                            pass
                except Exception:
                    resp = llm.invoke(messages)
                    return resp if isinstance(resp, AIMessage) else AIMessage(content=str(resp))
                return AIMessage(content=''.join(content_parts))
            else:
                resp = llm.invoke(messages)
                return resp if isinstance(resp, AIMessage) else AIMessage(content=str(resp))
        except Exception as _e:
            return AIMessage(content=f"Erreur: {str(_e)}")

    def _emit_ws(self, session_id: Optional[str], step: str, message: str, data: Optional[Dict[str, Any]] = None):
        if not session_id:
            return
        try:
            from app.services.websocket_service import get_websocket_service
            ws = get_websocket_service()
            ws.emit_progress(session_id, step, message, None, data or {})
        except Exception:
            pass
    
    def _build_graph(self):
        """Construit un graphe simple (fallback)"""
        llm = self._get_llm()
        
        def llm_node(state: ChatState) -> ChatState:
            messages = state["messages"]
            system_prompt = state.get("system_prompt")
            session_id = state.get("session_id")
            if system_prompt and not any(isinstance(msg, SystemMessage) for msg in messages):
                messages = [SystemMessage(content=system_prompt)] + list(messages)
            ai = self._invoke_llm(llm, messages, session_id)
            return {"messages": [ai], "next": None}

        builder = StateGraph(ChatState)
        builder.add_node("llm", llm_node)
        if self._tools:
            tool_node = ToolNode(self._tools)
            builder.add_node("tools", tool_node)
            builder.set_entry_point("llm")
            def should_use_tools(state: ChatState) -> str:
                messages = state["messages"]
                if messages and isinstance(messages[-1], AIMessage) and messages[-1].tool_calls:
                    return "tools"
                return "end"
            builder.add_conditional_edges("llm", should_use_tools)
            builder.add_edge("tools", "llm")
        else:
            builder.set_entry_point("llm")
            builder.add_edge("llm", END)
        
        self._graph = builder.compile()
        return self._graph
    
    def _build_graph_for_pipeline(self, pipeline: Dict[str, Any]):
        llm = self._get_llm()
        steps = pipeline.get('steps', []) or []
        builder = StateGraph(ChatState)

        # Index outils par nom
        all_tools = self._tools or []
        tool_by_name: Dict[str, Any] = {}
        for t in all_tools:
            nm = getattr(t, 'name', getattr(t, '__name__', None))
            if nm:
                tool_by_name[nm] = t

        node_names: List[str] = []

        def make_llm_step_node(step: Dict[str, Any]):
            step_id = step.get('id', 'step')
            prompt_tpl = step.get('prompt', '')
            out_key = step.get('output_key')
            node_name = f"llm__{step_id}"

            def node(state: ChatState) -> ChatState:
                messages = list(state["messages"])
                system_prompt = state.get("system_prompt")
                session_id = state.get("session_id")
                ctx = dict(state.get("context") or {})
                if system_prompt and not any(isinstance(m, SystemMessage) for m in messages):
                    messages = [SystemMessage(content=system_prompt)] + messages
                step_prompt = self._format_with_context(prompt_tpl, ctx)
                self._emit_ws(session_id, 'step_start', f"Étape {step_id} (LLM) — exécution", {"prompt_preview": step_prompt[:240]})
                messages2 = messages + [SystemMessage(content=f"[{step_id}] {step_prompt}")]
                ai = self._invoke_llm(llm, messages2, session_id)
                if out_key:
                    ctx[out_key] = ai.content
                self._emit_ws(session_id, 'step_end', f"Étape {step_id} terminée", {"output_key": out_key or None, "output_preview": (ai.content or '')[:240]})
                return {"messages": [ai], "context": ctx, "next": None}

            builder.add_node(node_name, node)
            return node_name

        def make_tools_step_nodes(step: Dict[str, Any]):
            step_id = step.get('id', 'tools')
            allowed = step.get('allowed_tools', []) or []
            selection_from = step.get('selection_from')
            node_llm = f"llm_tools__{step_id}"
            node_tools = f"tools__{step_id}"

            # Résoudre les noms génériques vers les vrais noms de plugins
            resolved_tool_names = set()
            if allowed:
                for generic_name in allowed:
                    if generic_name in self.TOOL_NAME_MAPPING:
                        resolved_tool_names.update(self.TOOL_NAME_MAPPING[generic_name])
                    else:
                        # Si ce n'est pas un nom générique, l'ajouter tel quel
                        resolved_tool_names.add(generic_name)
            else:
                # Si aucun outil spécifié, utiliser tous les outils disponibles
                resolved_tool_names = set(tool_by_name.keys())

            # Filtrer les outils disponibles
            filtered_tools = [tool_by_name[name] for name in resolved_tool_names if name in tool_by_name]

            # Debug: afficher les outils disponibles et filtrés
            print(f"=== DEBUG: Étape {step_id} - Outils demandés (génériques): {allowed}")
            print(f"=== DEBUG: Étape {step_id} - Outils résolus: {resolved_tool_names}")
            print(f"=== DEBUG: Étape {step_id} - Outils disponibles: {list(tool_by_name.keys())}")
            print(f"=== DEBUG: Étape {step_id} - Outils filtrés: {[getattr(t, 'name', getattr(t, '__name__', 'outil')) for t in filtered_tools]}")

            # Créer un wrapper pour ToolNode qui émet des événements
            class ToolNodeWithEvents:
                def __init__(self, tools, session_id_getter, emit_ws_func):
                    self.tools = tools
                    self.session_id_getter = session_id_getter
                    self.emit_ws = emit_ws_func
                    # Par défaut, ces outils doivent décoder si le LLM n'a pas précisé le mode
                    self.default_decode_tools = {
                        "kenny_code", "caesar_code", "vigenere_cipher", "atbash", "morse_code",
                        "rail_fence_cipher", "polybius_square", "bacon_code", "gronsfeld_cipher",
                        "nihilist_cipher", "wolseley_cipher", "multitap_code", "t9_code",
                        "bifid_delastelle", "gold_bug", "modulo_cipher", "multiplicative_code",
                        "ubchi_cipher"
                    }

                def __call__(self, state: ChatState):
                    messages = []
                    session_id = self.session_id_getter(state)
                    for msg in state["messages"]:
                        if isinstance(msg, AIMessage) and getattr(msg, 'tool_calls', None):
                            for tool_call in msg.tool_calls:
                                tool_name = tool_call["name"]
                                tool_args = tool_call.get("args", {})

                                # Émettre événement tool_start
                                self.emit_ws(
                                    session_id,
                                    'tool_start',
                                    f"Exécution de l'outil {tool_name}",
                                    {"tool": tool_name, "args": str(tool_args)[:100]}
                                )

                                # Forcer le mode decode par défaut pour les outils de chiffrement si non précisé
                                try:
                                    if isinstance(tool_args, str):
                                        import json as _json
                                        parsed_args = _json.loads(tool_args)
                                    else:
                                        parsed_args = dict(tool_args or {})
                                except Exception:
                                    parsed_args = {"text": str(tool_args)}

                                if tool_name in self.default_decode_tools and not any(k in parsed_args for k in ("mode", "action", "operation")):
                                    parsed_args["mode"] = "decode"

                                # Trouver et exécuter l'outil
                                for tool in self.tools:
                                    if getattr(tool, 'name', getattr(tool, '__name__', '')) == tool_name:
                                        try:
                                            # Exécuter en privilégiant l'appel direct à la fonction si disponible
                                            if hasattr(tool, 'func') and callable(getattr(tool, 'func')):
                                                result = tool.func(**parsed_args)
                                            else:
                                                result = tool.invoke(parsed_args)

                                            # Si le plugin a encodé au lieu de décoder, relancer en mode decode
                                            try:
                                                needs_retry_decode = False
                                                if isinstance(result, dict):
                                                    # Vérifier indication de mode = encode
                                                    if result.get('results'):
                                                        first = result['results'][0] or {}
                                                        params = first.get('parameters') or {}
                                                        if str(params.get('mode', '')).lower() == 'encode':
                                                            needs_retry_decode = True
                                                    summary = (result.get('summary') or {}).get('message', '')
                                                    if 'encodage' in summary.lower() or 'encode' in summary.lower():
                                                        needs_retry_decode = True
                                                if needs_retry_decode:
                                                    parsed_args_retry = dict(parsed_args)
                                                    parsed_args_retry['mode'] = 'decode'
                                                    if hasattr(tool, 'func') and callable(getattr(tool, 'func')):
                                                        result = tool.func(**parsed_args_retry)
                                                    else:
                                                        result = tool.invoke(parsed_args_retry)
                                            except Exception:
                                                pass
                                            result_content = str(result) if hasattr(result, '__str__') else repr(result)

                                            # Émettre événement tool_end avec succès
                                            self.emit_ws(
                                                session_id,
                                                'tool_end',
                                                f"✅ {tool_name} exécuté avec succès",
                                                {
                                                    "tool": tool_name,
                                                    "success": True,
                                                    "result_preview": result_content[:200],
                                                    "full_result": result_content
                                                }
                                            )

                                            # Créer ToolMessage
                                            tool_msg = ToolMessage(
                                                content=result_content,
                                                name=tool_name,
                                                tool_call_id=tool_call.get("id", "")
                                            )
                                            messages.append(tool_msg)
                                            break
                                        except Exception as e:
                                            error_msg = f"Erreur lors de l'exécution de {tool_name}: {str(e)}"

                                            # Émettre événement tool_end avec erreur
                                            self.emit_ws(
                                                session_id,
                                                'tool_end',
                                                f"❌ Erreur {tool_name}: {str(e)[:100]}",
                                                {
                                                    "tool": tool_name,
                                                    "success": False,
                                                    "error": str(e),
                                                    "error_preview": str(e)[:100]
                                                }
                                            )

                                            # Créer ToolMessage avec erreur
                                            tool_msg = ToolMessage(
                                                content=error_msg,
                                                name=tool_name,
                                                tool_call_id=tool_call.get("id", "")
                                            )
                                            messages.append(tool_msg)
                                            break
                                else:
                                    # Outil non trouvé
                                    error_msg = f"Outil {tool_name} non trouvé"
                                    self.emit_ws(
                                        session_id,
                                        'tool_end',
                                        error_msg,
                                        {
                                            "tool": tool_name,
                                            "success": False,
                                            "error": "Outil non trouvé"
                                        }
                                    )

                                    tool_msg = ToolMessage(
                                        content=error_msg,
                                        name=tool_name,
                                        tool_call_id=tool_call.get("id", "")
                                    )
                                    messages.append(tool_msg)

                    # Retourner uniquement les ToolMessage; ils seront ajoutés après l'AIMessage par l'agrégateur
                    return {"messages": messages}

            # Utiliser le wrapper au lieu de ToolNode standard
            def get_session_id(state):
                return state.get("session_id")

            tool_node = ToolNodeWithEvents(filtered_tools, get_session_id, self._emit_ws)
            builder.add_node(node_tools, tool_node)

            def llm_for_tools(state: ChatState) -> ChatState:
                messages = list(state["messages"])
                system_prompt = state.get("system_prompt")
                session_id = state.get("session_id")
                ctx = dict(state.get("context") or {})
                if system_prompt and not any(isinstance(m, SystemMessage) for m in messages):
                    messages = [SystemMessage(content=system_prompt)] + messages

                # Créer une liste des noms d'outils pour l'affichage
                tool_names_list = [getattr(t, 'name', getattr(t, '__name__', 'outil')) for t in filtered_tools]
                tools_names = ", ".join(tool_names_list) if tool_names_list else "(aucun)"

                # Utiliser le prompt personnalisé de l'étape s'il existe, sinon le prompt par défaut
                step_prompt = step.get('prompt', '')
                if step_prompt:
                    directive = self._format_with_context(step_prompt, ctx)
                else:
                    hint = ""
                    if selection_from and selection_from in ctx:
                        hint = f"\nContexte de sélection ({selection_from}):\n{ctx[selection_from]}"
                    directive = f"[{step_id}] Tu peux utiliser des outils si nécessaire. Outils autorisés: {tools_names}.{hint}\nDécide et appelle les outils, puis résume."

                self._emit_ws(session_id, 'step_start', f"Étape {step_id} (TOOLS) — décision et appels d’outils", {"allowed_tools": tools_names})

                # Si nous venons d'exécuter des outils, NE PAS insérer de nouveau message système
                # OpenAI exige que les ToolMessage suivent immédiatement l'AIMessage contenant tool_calls
                has_tool_messages = False
                for m in reversed(messages):
                    if isinstance(m, ToolMessage):
                        has_tool_messages = True
                        break
                    if isinstance(m, AIMessage):
                        break

                if has_tool_messages:
                    messages_to_send = messages
                else:
                    messages_to_send = messages + [SystemMessage(content=directive)]

                # Lier explicitement les outils pour autoriser de vrais tool_calls (premier passage)
                try:
                    bound_llm = llm.bind_tools(filtered_tools) if hasattr(llm, 'bind_tools') else llm
                except Exception:
                    bound_llm = llm

                # Ne pas streamer ici pour préserver les tool_calls
                try:
                    ai = bound_llm.invoke(messages_to_send)
                except Exception:
                    ai = self._invoke_llm(bound_llm, messages_to_send, session_id)

                # Vérifier et logger les tool calls
                tool_calls = getattr(ai, 'tool_calls', None)
                print(f"=== DEBUG: Étape {step_id} - Réponse complète de l'IA: {ai.content[:500]}... ===")
                print(f"=== DEBUG: Étape {step_id} - Attributs de l'IA: {dir(ai)} ===")

                if tool_calls:
                    print(f"=== DEBUG: Étape {step_id} - Tool calls détectés: {len(tool_calls)} ===")
                    for i, tc in enumerate(tool_calls):
                        print(f"=== DEBUG: Tool call {i+1}: {tc.get('name', 'unknown')} avec args: {tc.get('args', {})} ===")
                else:
                    print(f"=== DEBUG: Étape {step_id} - Aucun tool call détecté dans tool_calls ===")

                    # Essayer de détecter les tool calls dans le contenu textuel
                    content = ai.content or ""
                    if "tool_calls:" in content.lower() or '{"tool_calls"' in content:
                        print(f"=== DEBUG: Étape {step_id} - Tool calls détectés dans le texte ===")
                        # Extraire et analyser le JSON des tool calls du texte
                        try:
                            import json
                            # Chercher du JSON dans le texte
                            json_start = content.find('{')
                            json_end = content.rfind('}') + 1
                            if json_start >= 0 and json_end > json_start:
                                json_part = content[json_start:json_end]
                                parsed = json.loads(json_part)
                                if 'tool_calls' in parsed:
                                    print(f"=== DEBUG: Étape {step_id} - Tool calls parsés du texte: {parsed['tool_calls']} ===")
                        except Exception as e:
                            print(f"=== DEBUG: Étape {step_id} - Erreur parsing tool calls du texte: {e} ===")

                # Si pas de tool_calls, alors fin d'étape tools
                if not tool_calls:
                    # Ajouter un message d'aide pour l'utilisateur
                    help_message = f"\n\n💡 L'IA n'a pas pu faire d'appels d'outils automatiques. Outils disponibles: {tools_names}. Vous pouvez les utiliser manuellement si nécessaire."
                    full_content = (ai.content or '') + help_message
                    self._emit_ws(session_id, 'step_end', f"Étape {step_id} (TOOLS) terminée", {"summary_preview": full_content[:240]})
                return {"messages": [ai], "next": None}

            builder.add_node(node_llm, llm_for_tools)

            def router(state: ChatState) -> str:
                msgs = state["messages"]
                if msgs and isinstance(msgs[-1], AIMessage) and msgs[-1].tool_calls:
                    return node_tools
                return "end"

            builder.add_conditional_edges(node_llm, router)
            builder.add_edge(node_tools, node_llm)
            return node_llm

        # Construire les nœuds
        for step in steps:
            stype = step.get('type')
            if stype == 'llm':
                node = make_llm_step_node(step)
                node_names.append(node)
            elif stype == 'tools':
                node = make_tools_step_nodes(step)
                node_names.append(node)

        # Définir l'entrée et transitions séquentielles
        if node_names:
            builder.set_entry_point(node_names[0])
            for idx, name in enumerate(node_names):
                if name.startswith("llm__"):
                    if idx + 1 < len(node_names):
                        builder.add_edge(name, node_names[idx + 1])
                    else:
                        builder.add_edge(name, END)

        self._graphs_by_pipeline[pipeline.get('id', 'default')] = builder.compile()
        return self._graphs_by_pipeline[pipeline.get('id', 'default')]
    
    def chat(self, messages: List[Dict[str, str]], system_prompt: Optional[str] = None, pipeline_id: Optional[str] = None, images: Optional[List[str]] = None, session_id: Optional[str] = None, stream: bool = False, show_thinking: bool = False) -> str:
        """
        Envoie une conversation au modèle d'IA via LangGraph et retourne la réponse
        
        Args:
            messages: Liste de messages au format {"role": "user"|"assistant", "content": "..."}
            system_prompt: Message système optionnel
            pipeline_id: Identifiant d'un pipeline éditable à appliquer (optionnel)
            
        Returns:
            La réponse du modèle d'IA
        """
        try:
            self._ensure_initialized()
            
            # Construire le graphe si nécessaire
            graph = self._graph
            pipeline = None
            if pipeline_id:
                try:
                    pipeline = pipeline_registry.get_pipeline(pipeline_id)
                except Exception:
                    pipeline = None
            if pipeline:
                if pipeline_id not in self._graphs_by_pipeline:
                    self._build_graph_for_pipeline(pipeline)
                graph = self._graphs_by_pipeline.get(pipeline_id)
            else:
                if graph is None:
                    graph = self._build_graph()
            
            # Convertir les messages au format LangChain
            langchain_messages = []
            
            # Ajouter les messages de la conversation
            # Insérer les images sur le dernier message utilisateur si fournies
            last_user_index = None
            for i, _m in enumerate(messages):
                if _m.get('role') == 'user':
                    last_user_index = i
            for idx, msg in enumerate(messages):
                if msg["role"] == "user":
                    if images and idx == last_user_index:
                        parts = []
                        if msg.get("content"):
                            parts.append({"type": "text", "text": msg["content"]})
                        try:
                            for url in images:
                                parts.append({"type": "image_url", "image_url": {"url": url}})
                        except Exception:
                            pass
                        langchain_messages.append(HumanMessage(content=parts))
                    else:
                        langchain_messages.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    langchain_messages.append(AIMessage(content=msg["content"]))
                elif msg["role"] == "system":
                    langchain_messages.append(SystemMessage(content=msg["content"]))
                elif msg["role"] == "tool":
                    # Gérer les messages d'outils
                    langchain_messages.append(ToolMessage(
                        content=msg.get("content", ""),
                        tool_call_id=msg.get("tool_call_id", ""),
                        name=msg.get("name", "")
                    ))
            
            # Compiler le prompt système à partir du pipeline si fourni
            if pipeline_id:
                pipeline = pipeline_registry.get_pipeline(pipeline_id)
                if pipeline:
                    base_prompt = pipeline.get('system_prompt') or system_prompt or DEFAULT_SYSTEM_PROMPT
                    # Concaténer les instructions des étapes comme guide de structure
                    steps = pipeline.get('steps', [])
                    steps_instructions = []
                    for step in steps:
                        if step.get('type') == 'llm':
                            label = step.get('id', 'step')
                            prompt = step.get('prompt', '')
                            steps_instructions.append(f"### {label}\n{prompt}")
                        elif step.get('type') == 'tools':
                            allowed = step.get('allowed_tools', [])
                            if allowed:
                                steps_instructions.append(
                                    "### tools\nTu peux appeler des outils si nécessaire. Outils autorisés: " + ", ".join(allowed)
                                )
                    compiled = base_prompt
                    if steps_instructions:
                        compiled += "\n\nRespecte la structure suivante:\n" + "\n\n".join(steps_instructions)
                    system_prompt = compiled
            
            # Fallback sur prompt par défaut si toujours absent
            if not system_prompt:
                system_prompt = DEFAULT_SYSTEM_PROMPT
            try:
                print("[LG] Appel LangGraph → messages:", [(m.get('role'), len(m.get('content') or '')) for m in messages])
                print("[LG] system_prompt len:", len(system_prompt or ''))
            except Exception:
                pass
            
            # Préparer l'état initial
            initial_state = {
                "messages": langchain_messages,
                "system_prompt": system_prompt,
                "next": None,
                "session_id": session_id,
                "context": {}
            }
            
            # Exécuter le graphe
            # Brancher callbacks si session fournie
            try:
                if session_id:
                    from app.services.ai_callbacks import WebSocketCallbackHandler
                    cb = WebSocketCallbackHandler(session_id, operation_type="ai_chat", meta={"mode": self.mode, "provider": self.provider, "pipeline_id": pipeline_id}, show_thinking=show_thinking, stream=stream)
                    cfg = {"callbacks": [cb]}
                    if stream:
                        cfg["stream"] = True
                    result = graph.invoke(initial_state, config=cfg)
                else:
                    result = graph.invoke(initial_state)
            except Exception as e:
                # Annulation propre
                try:
                    from app.services.ai_callbacks import GenerationCanceled
                    if isinstance(e, GenerationCanceled):
                        try:
                            if session_id:
                                from app.services.websocket_service import get_websocket_service
                                ws = get_websocket_service()
                                ws.emit_progress(session_id, 'canceled', 'Génération annulée', 100, {})
                        except Exception:
                            pass
                        return "(Génération annulée)"
                except Exception:
                    pass
                # Autres erreurs: relancer exception pour traitement global
                raise
            
            # Extraire la réponse
            final_messages = result["messages"]
            if final_messages and isinstance(final_messages[-1], AIMessage):
                try:
                    print("[LG] Sortie IA len:", len(final_messages[-1].content or ''))
                except Exception:
                    pass
                return final_messages[-1].content
            
            return "Erreur: Aucune réponse générée par le modèle"
            
        except Exception as e:
            print(f"Erreur lors de l'appel au modèle d'IA via LangGraph: {str(e)}")
            try:
                if session_id:
                    from app.services.websocket_service import get_websocket_service
                    ws = get_websocket_service()
                    ws.emit_error(session_id, f"Erreur LangGraph: {str(e)}")
            except Exception:
                pass
            return f"Erreur: {str(e)}"

# Instance singleton du service
langgraph_service = LangGraphService() 