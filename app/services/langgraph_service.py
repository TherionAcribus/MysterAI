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
from langchain_community.chat_models import ChatOllama
from app.models.app_config import AppConfig
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
                
                # Initialiser le plugin manager
                from app import app
                plugins_dir = AppConfig.get_value('plugins_dir', 'plugins')
                # Importer PluginManager ici pour éviter l'importation circulaire
                from app.plugin_manager import PluginManager
                self._plugin_manager = PluginManager(plugins_dir, app)
                
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
    
    def _build_graph(self):
        """Construit le graphe LangGraph pour le chat"""
        llm = self._get_llm()
        
        # Définir les nœuds du graphe
        def llm_node(state: ChatState) -> ChatState:
            """Nœud pour l'appel au modèle de langage"""
            messages = state["messages"]
            system_prompt = state.get("system_prompt")
            
            # Ajouter le message système s'il est fourni
            if system_prompt and not any(isinstance(msg, SystemMessage) for msg in messages):
                messages = [SystemMessage(content=system_prompt)] + list(messages)
            
            # Appeler le LLM
            response = llm.invoke(messages)
            
            # Mettre à jour l'état
            return {"messages": [response], "next": None}
        
        # Créer le graphe
        builder = StateGraph(ChatState)
        
        # Ajouter les nœuds
        builder.add_node("llm", llm_node)
        
        # Ajouter le nœud d'outils si des outils sont disponibles
        if self._tools:
            # Créer un nœud d'outils
            tool_node = ToolNode(self._tools)
            builder.add_node("tools", tool_node)
            
            # Définir le flux avec les outils
            builder.set_entry_point("llm")
            
            # Fonction pour déterminer si on doit utiliser des outils
            def should_use_tools(state: ChatState) -> str:
                """Détermine si le LLM veut utiliser des outils"""
                messages = state["messages"]
                if messages and isinstance(messages[-1], AIMessage) and messages[-1].tool_calls:
                    return "tools"
                return "end"
            
            # Ajouter les transitions
            builder.add_conditional_edges("llm", should_use_tools)
            builder.add_edge("tools", "llm")
        else:
            # Flux simple sans outils
            builder.set_entry_point("llm")
            builder.add_edge("llm", END)
        
        # Compiler le graphe
        self._graph = builder.compile()
        
        return self._graph
    
    def chat(self, messages: List[Dict[str, str]], system_prompt: Optional[str] = None) -> str:
        """
        Envoie une conversation au modèle d'IA via LangGraph et retourne la réponse
        
        Args:
            messages: Liste de messages au format {"role": "user"|"assistant", "content": "..."}
            system_prompt: Message système optionnel
            
        Returns:
            La réponse du modèle d'IA
        """
        try:
            self._ensure_initialized()
            
            # Construire le graphe si nécessaire
            if self._graph is None:
                self._build_graph()
            
            # Convertir les messages au format LangChain
            langchain_messages = []
            
            # Ajouter les messages de la conversation
            for msg in messages:
                if msg["role"] == "user":
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
            
            # Utiliser le prompt système par défaut si aucun n'est fourni
            if not system_prompt:
                system_prompt = DEFAULT_SYSTEM_PROMPT
            
            # Préparer l'état initial
            initial_state = {
                "messages": langchain_messages,
                "system_prompt": system_prompt,
                "next": None
            }
            
            # Exécuter le graphe
            result = self._graph.invoke(initial_state)
            
            # Extraire la réponse
            final_messages = result["messages"]
            if final_messages and isinstance(final_messages[-1], AIMessage):
                return final_messages[-1].content
            
            return "Erreur: Aucune réponse générée par le modèle"
            
        except Exception as e:
            print(f"Erreur lors de l'appel au modèle d'IA via LangGraph: {str(e)}")
            return f"Erreur: {str(e)}"

# Instance singleton du service
langgraph_service = LangGraphService() 