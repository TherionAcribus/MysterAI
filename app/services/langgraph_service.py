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
                
                # Initialiser le plugin manager sans import circulaire de 'app'
                plugins_dir = AppConfig.get_value('plugins_dir', 'plugins')
                try:
                    from flask import current_app
                    flask_app = None
                    try:
                        flask_app = current_app._get_current_object()
                    except Exception:
                        flask_app = None
                    # Importer PluginManager ici pour éviter l'importation circulaire
                    from app.plugin_manager import PluginManager
                    if flask_app is not None:
                        self._plugin_manager = PluginManager(plugins_dir, flask_app)
                    else:
                        # Essayer une signature sans app si supportée
                        try:
                            self._plugin_manager = PluginManager(plugins_dir)
                        except Exception:
                            self._plugin_manager = None
                except Exception as e_init:
                    print(f"=== ERROR: Initialisation du PluginManager échouée: {str(e_init)} ===")
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
        
        # Récupérer tous les plugins activés
        from app.models.plugin_model import Plugin
        plugins = Plugin.query.filter_by(enabled=True).all()
        
        for plugin in plugins:
            try:
                # Charger les métadonnées du plugin
                metadata = json.loads(plugin.metadata_json)
                
                # Créer une fonction de wrapper pour le plugin
                def create_plugin_tool(plugin_name):
                    @tool
                    def plugin_tool(text: str, **kwargs) -> str:
                        """
                        Utilise le plugin {plugin_name} pour traiter le texte.
                        
                        Args:
                            text: Le texte à traiter
                            **kwargs: Paramètres supplémentaires spécifiques au plugin
                        
                        Returns:
                            Le résultat du traitement
                        """
                        inputs = {"text": text, **kwargs}
                        result = self._plugin_manager.execute_plugin(plugin_name, inputs)
                        
                        # Formater la sortie pour qu'elle soit lisible
                        if result:
                            if "text_output" in result:
                                return f"Résultat de {plugin_name}: {result['text_output']}"
                            elif "bruteforce_solutions" in result:
                                solutions = result["bruteforce_solutions"]
                                formatted_solutions = "\n".join([
                                    f"- Décalage {sol['shift']}: {sol['decoded_text']}"
                                    for sol in solutions[:5]  # Limiter à 5 solutions pour la lisibilité
                                ])
                                return f"Résultats de bruteforce avec {plugin_name}:\n{formatted_solutions}\n..."
                            else:
                                return f"Résultat de {plugin_name}: {json.dumps(result, ensure_ascii=False)}"
                        else:
                            return f"Erreur lors de l'exécution du plugin {plugin_name}"
                
                    # Personnaliser le nom et la description de l'outil
                    plugin_tool.__name__ = plugin.name
                    plugin_tool.name = plugin.name
                    plugin_tool.description = f"{plugin.description}. Utilisez ce plugin pour {plugin.name.replace('_', ' ')}."
                    
                    return plugin_tool
                
                # Créer l'outil pour ce plugin
                tool = create_plugin_tool(plugin.name)
                self._tools.append(tool)
                
                print(f"=== DEBUG: Outil créé pour le plugin {plugin.name} ===")
                
            except Exception as e:
                print(f"=== ERROR: Erreur lors de la création de l'outil pour le plugin {plugin.name}: {str(e)} ===")
    
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

            filtered_tools = [tool_by_name[n] for n in allowed if n in tool_by_name] if allowed else all_tools
            tool_node = ToolNode(filtered_tools)
            builder.add_node(node_tools, tool_node)

            def llm_for_tools(state: ChatState) -> ChatState:
                messages = list(state["messages"])
                system_prompt = state.get("system_prompt")
                session_id = state.get("session_id")
                ctx = dict(state.get("context") or {})
                if system_prompt and not any(isinstance(m, SystemMessage) for m in messages):
                    messages = [SystemMessage(content=system_prompt)] + messages
                hint = ""
                if selection_from and selection_from in ctx:
                    hint = f"\nContexte de sélection ({selection_from}):\n{ctx[selection_from]}"
                tools_names = ", ".join([getattr(t, 'name', getattr(t, '__name__', 'outil')) for t in filtered_tools]) or "(aucun)"
                directive = f"[{step_id}] Tu peux utiliser des outils si nécessaire. Outils autorisés: {tools_names}.{hint}\nDécide et appelle les outils, puis résume."
                self._emit_ws(session_id, 'step_start', f"Étape {step_id} (TOOLS) — décision et appels d’outils", {"allowed_tools": tools_names})
                messages2 = messages + [SystemMessage(content=directive)]
                ai = self._invoke_llm(llm, messages2, session_id)
                # Si pas de tool_calls, alors fin d'étape tools
                try:
                    if not getattr(ai, 'tool_calls', None):
                        self._emit_ws(session_id, 'step_end', f"Étape {step_id} (TOOLS) terminée", {"summary_preview": (ai.content or '')[:240]})
                except Exception:
                    pass
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