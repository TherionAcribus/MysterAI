import json
import requests
from typing import Dict, Any, Optional
from langchain_community.chat_models import ChatOpenAI, ChatAnthropic
try:
    from langchain_ollama import ChatOllama  # type: ignore
except Exception:
    from langchain_community.chat_models import ChatOllama
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from app.models.app_config import AppConfig
from langchain_openai import ChatOpenAI as OpenAI
from app.services.model_registry import model_registry
from app.services.ai_callbacks import GenerationCanceled

class AIService:
    """Service pour gérer les interactions avec les modèles d'IA"""
    
    def __init__(self):
        """Initialise le service IA avec des valeurs par défaut"""
        self.mode = 'online'
        self.temperature = 0.7
        self.max_context = 10
        self.provider = 'openai'
        self.api_key = ''
        self.model_name = 'gpt-3.5-turbo'
        self.ollama_url = 'http://localhost:11434'
        self.use_langgraph = True  # Par défaut, utiliser LangGraph
        
        # Les paramètres seront chargés lors de la première utilisation
        self._initialized = False
    
    def _ensure_initialized(self):
        """Charge les paramètres depuis la base de données si ce n'est pas déjà fait"""
        if not self._initialized:
            try:
                # Charger les paramètres communs
                self.mode = AppConfig.get_value('ai_mode', 'online')
                self.temperature = float(AppConfig.get_value('temperature', 0.7))
                self.max_context = int(AppConfig.get_value('max_context', 10))
                self.use_langgraph = AppConfig.get_value('use_langgraph', 'true').lower() == 'true'
                
                # Log des clés disponibles pour débogage
                api_key_present = AppConfig.get_value('api_key', '') != ''
                print(f"=== DEBUG: _ensure_initialized - Clé API présente dans la BD: {api_key_present} ===")
                
                # Clés API par fournisseur
                self.api_keys = {
                    'openai': AppConfig.get_value('openai_api_key', ''),
                    'anthropic': AppConfig.get_value('anthropic_api_key', ''),
                    'google': AppConfig.get_value('google_api_key', '')
                }
                
                # Log des clés API disponibles
                for provider, key in self.api_keys.items():
                    print(f"=== DEBUG: Clé API pour {provider}: {'configurée' if key else 'non configurée'} ===")
                
                # Charger les modèles locaux activés
                local_models_enabled_json = AppConfig.get_value('local_models_enabled', '{}')
                try:
                    self.local_models_enabled = json.loads(local_models_enabled_json)
                except json.JSONDecodeError:
                    self.local_models_enabled = {}
                    print("=== WARNING: Erreur lors du décodage des modèles locaux activés, utilisation des valeurs par défaut ===")
                
                # Paramètres spécifiques au mode
                if self.mode == 'online':
                    self.provider = AppConfig.get_value('ai_provider', 'openai')
                    
                    # Récupérer la clé API correspondant au fournisseur
                    self.api_key = self.api_keys.get(self.provider, '')
                    if not self.api_key:
                        # Si pas de clé spécifique, utiliser la clé générique pour compatibilité
                        self.api_key = AppConfig.get_value('api_key', '')
                        
                    self.model_name = AppConfig.get_value('ai_model', 'gpt-3.5-turbo')
                    
                    # Log pour le débogage
                    print(f"=== DEBUG: Mode en ligne chargé - Provider: {self.provider}, Model: {self.model_name} ===")
                    print(f"=== DEBUG: Clé API configurée: {bool(self.api_key)} ===")
                else:
                    self.ollama_url = AppConfig.get_value('ollama_url', 'http://localhost:11434')
                    self.model_name = AppConfig.get_value('local_model', 'deepseek-coder:latest')
                    
                    # Log pour le débogage
                    print(f"=== DEBUG: Mode local chargé - URL: {self.ollama_url}, Model: {self.model_name} ===")
                    print(f"=== DEBUG: Modèles locaux activés: {self.local_models_enabled} ===")
                
                self._initialized = True
                
                # Log pour confirmer l'initialisation
                print(f"=== DEBUG: Service AI initialisé - Mode: {self.mode}, Modèle: {self.model_name}, LangGraph: {self.use_langgraph} ===")
            except Exception as e:
                # Si nous sommes toujours en dehors du contexte de l'application,
                # nous utiliserons les valeurs par défaut
                print(f"=== ERROR: Erreur lors de l'initialisation du service AI: {str(e)} ===")
                pass
    
    def get_chat_model(self):
        """Retourne le modèle de chat approprié en fonction de la configuration"""
        self._ensure_initialized()
        
        if self.mode == 'online':
            if self.provider == 'openai':
                return ChatOpenAI(
                    model_name=self.model_name,
                    temperature=self.temperature,
                    openai_api_key=self.api_key
                )
            elif self.provider == 'anthropic':
                return ChatAnthropic(
                    model=self.model_name,
                    temperature=self.temperature,
                    anthropic_api_key=self.api_key
                )
            else:
                raise ValueError(f"Fournisseur non pris en charge: {self.provider}")
        else:
            return ChatOllama(
                model=self.model_name,
                temperature=self.temperature,
                base_url=self.ollama_url
            )
    
    def chat(self, messages, settings=None, images=None, session_id: Optional[str] = None, stream: bool = False, show_thinking: bool = False):
        """
        Envoie une conversation au modèle d'IA et retourne la réponse.
        Cette méthode sert de point d'entrée unique et délègue aux implémentations
        spécifiques (LangGraph ou LangChain) selon la configuration.
        
        Args:
            messages: Liste de messages au format {"role": "user"|"assistant", "content": "..."}
            settings: Paramètres optionnels pour l'appel
            
        Returns:
            str: Réponse de l'IA
        """
        if settings is None:
            settings = self.get_settings()
        
        # Support explicite pour model_id et provider dans les paramètres
        if 'model_id' in settings:
            model_name = settings['model_id']
            # Mettre à jour les paramètres en ligne ou locaux selon le type de modèle
            if settings.get('mode') == 'online':
                settings['online_model'] = model_name
                settings['ai_model'] = model_name  # Pour compatibilité
            else:
                settings['local_model'] = model_name
        
        # Support pour le fournisseur spécifié
        if 'provider' in settings:
            settings['ai_provider'] = settings['provider']
        
        # Déterminer si on utilise LangGraph ou LangChain
        use_langgraph = settings.get('use_langgraph', self.use_langgraph)
        
        print("=== APPEL IA ===")
        print(f"Utilisation de LangGraph: {use_langgraph}")
        print(f"Mode: {settings.get('mode', 'online')}")
        print(f"Fournisseur: {settings.get('ai_provider', 'inconnu')}")
        print(f"Modèle: {settings.get('model_name', settings.get('ai_model', settings.get('online_model', 'inconnu')))}")
        
        if use_langgraph:
            # Utiliser LangGraph (avec support des outils/plugins)
            # Importer ici pour éviter l'importation circulaire
            from app.services.langgraph_service import langgraph_service
            system_prompt = settings.get('system_prompt', '')
            print(f"Utilisation de LangGraph avec system_prompt de {len(system_prompt)} caractères")
            return langgraph_service.chat(messages, system_prompt, images=images, session_id=session_id, stream=stream, show_thinking=show_thinking)
        else:
            # Utiliser LangChain (implémentation simple sans outils)
            mode = settings.get('mode', 'online')
            print(f"Utilisation de LangChain en mode {mode}")
            
            if mode == 'online':
                return self.chat_online(messages, settings, images=images, session_id=session_id, stream=stream, show_thinking=show_thinking)
            else:
                return self.chat_local(messages, settings, images=images, session_id=session_id, stream=stream, show_thinking=show_thinking)
    
    def test_ollama_connection(self, url: Optional[str] = None) -> Dict[str, Any]:
        """
        Teste la connexion à Ollama
        
        Args:
            url: URL d'Ollama à tester (utilise l'URL configurée si non spécifiée)
            
        Returns:
            Dictionnaire avec le résultat du test
        """
        self._ensure_initialized()
        test_url = url or self.ollama_url
        
        try:
            # Tester la connexion à l'API Ollama
            response = requests.get(f"{test_url}/api/tags", timeout=5)
            
            if response.status_code == 200:
                # Récupérer la liste des modèles disponibles
                models = response.json().get('models', [])
                model_names = [model.get('name') for model in models]
                
                return {
                    "success": True,
                    "models": model_names
                }
            else:
                return {
                    "success": False,
                    "error": f"Erreur HTTP {response.status_code}: {response.text}"
                }
                
        except requests.exceptions.ConnectionError:
            return {
                "success": False,
                "error": "Impossible de se connecter au serveur Ollama"
            }
        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": "Délai d'attente dépassé lors de la connexion à Ollama"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def save_settings(self, settings: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enregistre les paramètres de l'IA
        
        Args:
            settings: Dictionnaire des paramètres à enregistrer
            
        Returns:
            Dictionnaire avec le résultat de l'opération
        """
        try:
            # Déterminer le mode (utiliser ai_mode ou mode)
            mode = settings.get('ai_mode', settings.get('mode', 'online'))
            
            # Enregistrer les paramètres communs
            AppConfig.set_value('ai_mode', mode)
            AppConfig.set_value('temperature', settings.get('temperature', 0.7))
            AppConfig.set_value('max_context', settings.get('max_context', 10))
            
            # Enregistrer le paramètre use_langgraph
            if 'use_langgraph' in settings:
                use_langgraph = settings.get('use_langgraph', True)
                AppConfig.set_value('use_langgraph', str(use_langgraph).lower())
                self.use_langgraph = use_langgraph
                print(f"=== DEBUG: Paramètre use_langgraph sauvegardé: {use_langgraph} ===")
            
            # Log pour le débogage
            print(f"=== DEBUG: Sauvegarde des paramètres - Mode: {mode} ===")
            
            # Enregistrer les modèles locaux activés (quel que soit le mode)
            if settings.get('local_models_enabled'):
                # Convertir en JSON pour le stockage
                local_models_enabled_json = json.dumps(settings.get('local_models_enabled'))
                AppConfig.set_value('local_models_enabled', local_models_enabled_json)
                
                # Log pour le débogage
                print(f"=== DEBUG: Modèles locaux activés sauvegardés: {settings.get('local_models_enabled')} ===")
                
                # Mettre à jour les modèles locaux activés dans l'instance
                self.local_models_enabled = settings.get('local_models_enabled')
            
            # Enregistrer les paramètres spécifiques au mode
            if mode == 'online':
                # Déterminer le provider (utiliser ai_provider ou provider)
                provider = settings.get('ai_provider', settings.get('provider', 'openai'))
                
                # Déterminer le modèle (utiliser ai_model ou online_model)
                model = settings.get('ai_model', settings.get('online_model', 'gpt-3.5-turbo'))
                
                AppConfig.set_value('ai_provider', provider)
                AppConfig.set_value('ai_model', model)
                
                # Traiter les clés API spécifiques au fournisseur
                provider_key_map = {
                    'openai': 'openai_api_key',
                    'anthropic': 'anthropic_api_key',
                    'google': 'google_api_key'
                }
                
                # Enregistrer les clés API spécifiques si elles sont fournies
                for provider_name, config_key in provider_key_map.items():
                    if settings.get(config_key):
                        AppConfig.set_value(config_key, settings.get(config_key), 
                                           category='api_key', is_secret=True)
                        print(f"=== DEBUG: Clé API pour {provider_name} enregistrée ===")
                        
                        # Mettre à jour les clés API dans l'instance
                        if hasattr(self, 'api_keys'):
                            self.api_keys[provider_name] = settings.get(config_key)
                
                # Enregistrer la clé API générique si elle est fournie
                if 'api_key' in settings and settings['api_key']:
                    print(f"=== DEBUG: Clé API générique fournie, longueur: {len(settings['api_key'])} ===")
                    AppConfig.set_value('api_key', settings['api_key'], 
                                       category='api_key', is_secret=True)
                    
                    # S'assurer également que la clé spécifique au fournisseur est mise à jour
                    provider_key = provider_key_map.get(provider)
                    if provider_key and provider_key not in settings:
                        AppConfig.set_value(provider_key, settings['api_key'], 
                                           category='api_key', is_secret=True)
                        print(f"=== DEBUG: Clé API spécifique pour {provider} synchronisée avec la clé générique ===")
                    
                    # S'assurer que l'objet courant a aussi la clé API
                    self.api_key = settings['api_key']
                    print("=== DEBUG: Clé API enregistrée avec succès ===")
                else:
                    print("=== DEBUG: Pas de clé API générique fournie ou clé vide ===")
                
                # Log pour le débogage
                print(f"=== DEBUG: Paramètres en ligne sauvegardés - Provider: {provider}, Model: {model} ===")
            else:
                # Déterminer l'URL Ollama
                ollama_url = settings.get('ollama_url', 'http://localhost:11434')
                
                # Déterminer le modèle local
                local_model = settings.get('local_model', 'deepseek-coder:latest')
                
                AppConfig.set_value('ollama_url', ollama_url)
                AppConfig.set_value('local_model', local_model)
                
                # Log pour le débogage
                print(f"=== DEBUG: Paramètres locaux sauvegardés - URL: {ollama_url}, Model: {local_model} ===")
            
            # Mettre à jour les attributs de l'instance
            self.mode = mode
            self.temperature = float(settings.get('temperature', 0.7))
            self.max_context = int(settings.get('max_context', 10))
            
            if mode == 'online':
                self.provider = settings.get('ai_provider', settings.get('provider', 'openai'))
                self.model_name = settings.get('ai_model', settings.get('online_model', 'gpt-3.5-turbo'))
                if settings.get('api_key'):
                    self.api_key = settings.get('api_key')
            else:
                self.ollama_url = settings.get('ollama_url', 'http://localhost:11434')
                self.model_name = settings.get('local_model', 'deepseek-coder:latest')
            
            self._initialized = True
            
            return {"success": True}
            
        except Exception as e:
            print(f"Erreur lors de l'enregistrement des paramètres: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_settings(self) -> Dict[str, Any]:
        """
        Récupère les paramètres actuels de l'IA
        
        Returns:
            Dictionnaire des paramètres
        """
        self._ensure_initialized()

        # Construire les listes de modèles depuis le registre
        registry_online = model_registry.get_models(type='online')
        registry_local = model_registry.get_models(type='local')

        # Dictionnaire attendu par le reste du système (compatibilité)
        # Online: clé = model_id provider (ex: 'gpt-4o')
        default_online_models = {m.get('model_id'): {'name': m.get('name', m.get('model_id'))}
                                 for m in registry_online}

        # Local: clé = short id (ex: 'llama3' pour 'llama3:latest')
        default_local_models: Dict[str, Dict[str, Any]] = {}
        for m in registry_local:
            full = m.get('model_id') or ''
            short_id = full.split(':')[0] if ':' in full else full
            # Par défaut: enabled si installé
            default_local_models[short_id] = {
                'name': m.get('name', short_id),
                'enabled': bool(m.get('installed', False))
            }

        # Appliquer les préférences d'activation locales stockées en DB si présentes
        if hasattr(self, 'local_models_enabled') and self.local_models_enabled:
            for model_id, enabled in self.local_models_enabled.items():
                if model_id in default_local_models:
                    default_local_models[model_id]['enabled'] = enabled
        
        # Paramètres de base
        settings = {
            'mode': self.mode,
            'ai_mode': self.mode,  # Pour la compatibilité
            'temperature': self.temperature,
            'max_context': self.max_context,
            'online_models': default_online_models,
            'local_models': default_local_models,
            'use_langgraph': self.use_langgraph
        }
        
        # Paramètres spécifiques au mode
        if self.mode == 'online':
            settings.update({
                'online_model': self.model_name,
                'ai_model': self.model_name,  # Pour la compatibilité
                'ai_provider': self.provider,  # Pour la compatibilité
                'provider': self.provider,
                'api_key': self.api_key
            })
        else:
            settings.update({
                'local_model': self.model_name,
                'ollama_url': self.ollama_url
            })
        
        return settings

    def chat_online(self, messages, settings, images=None, session_id: Optional[str] = None, stream: bool = False, show_thinking: bool = False):
        """
        Utilise un service en ligne (OpenAI, etc.) pour le chat
        
        Args:
            messages (list): Liste des messages précédents
            settings (dict): Paramètres pour cette requête
        
        Returns:
            str: Réponse de l'IA
        """
        try:
            model = settings.get('online_model', 'gpt-3.5-turbo')
            api_key = settings.get('api_key', '')
            
            print("=== CHAT ONLINE ===")
            print(f"Modèle: {model}")
            print(f"Température: {settings.get('temperature', 0.7)}")
            print(f"Max tokens: {settings.get('max_tokens', 1000)}")
            print(f"API Key configurée: {'Oui' if api_key else 'Non'}")
            try:
                print("[LC] Messages envoyés:", [(m.get('role'), len(m.get('content') or '')) for m in messages])
                sysm = next((m for m in messages if m.get('role')=='system'), None)
                if sysm:
                    print("[LC] system prompt len:", len(sysm.get('content') or ''))
            except Exception:
                pass
            
            if not api_key:
                return "Erreur: Clé API non configurée. Veuillez configurer votre clé API dans les paramètres."
            
            # Créer une instance de ChatOpenAI avec les paramètres appropriés
            chat_model = OpenAI(
                model_name=model,
                temperature=settings.get('temperature', 0.7),
                openai_api_key=api_key,
                max_tokens=settings.get('max_tokens', 1000)
            )
            # Brancher callbacks WebSocket si session fournie
            try:
                if session_id:
                    from app.services.ai_callbacks import WebSocketCallbackHandler
                    handler = WebSocketCallbackHandler(session_id, operation_type="ai_chat", meta={"mode": "online", "model": model}, show_thinking=show_thinking, stream=stream)
                    chat_model = chat_model.bind(callbacks=[handler])
            except Exception:
                pass
            
            # Préparer les messages pour l'API
            formatted_messages = []
            # Déterminer si le modèle supporte la vision
            def _supports_vision(model_id: str) -> bool:
                vision_models = {
                    'gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4-turbo', 'gpt-4-turbo-2024-04-09'
                }
                try:
                    return model_id in vision_models or 'gpt-4o' in model_id or 'gpt-4-vision' in model_id
                except Exception:
                    return False
            
            # Ajouter un message système si configuré
            system_prompt = settings.get('system_prompt', '')
            if system_prompt:
                formatted_messages.append(SystemMessage(content=system_prompt))
                print(f"Message système ajouté: {len(system_prompt)} caractères")
            
            # Ajouter les messages de la conversation
            # Trouver l'index du dernier message user
            last_user_index = None
            for i, m in enumerate(messages):
                if m.get('role') == 'user':
                    last_user_index = i
            for idx, msg in enumerate(messages):
                role = msg.get('role', 'user')
                content = msg.get('content', '')
                if role == 'user':
                    # Combiner le texte avec les images si fournies et supportées
                    if images and _supports_vision(model):
                        if idx == last_user_index:
                            parts = []
                            if content:
                                parts.append({"type": "text", "text": content})
                            try:
                                for url in images:
                                    parts.append({"type": "image_url", "image_url": {"url": url}})
                            except Exception:
                                pass
                            formatted_messages.append(HumanMessage(content=parts))
                        else:
                            formatted_messages.append(HumanMessage(content=content))
                    else:
                        # Fallback: insérer les URLs d'images dans le texte
                        if idx == last_user_index and images:
                            fallback_text = content + "\n\nImages: " + ", ".join(images)
                            formatted_messages.append(HumanMessage(content=fallback_text))
                        else:
                            formatted_messages.append(HumanMessage(content=content))
                elif role == 'assistant':
                    formatted_messages.append(AIMessage(content=content))
                elif role == 'system':
                    formatted_messages.append(SystemMessage(content=content))
                try:
                    print(f"Message {role}: {len(content)} caractères")
                except Exception:
                    pass
            
            print(f"Envoi de {len(formatted_messages)} messages à l'API")
            
            # Appeler l'API via l'interface de LangChain
            # Toujours utiliser le streaming interne si disponible pour permettre l'annulation
            if hasattr(chat_model, 'stream'):
                from app.services.websocket_service import get_websocket_service
                ws = None
                try:
                    ws = get_websocket_service()
                except Exception:
                    ws = None
                buffer: list[str] = []
                try:
                    for chunk in chat_model.stream(formatted_messages):
                        # Accumuler le texte (même si l'UI ne veut pas streamer, on aura la réponse)
                        try:
                            txt = getattr(chunk, 'content', None)
                            if txt:
                                buffer.append(txt)
                        except Exception:
                            pass
                        # Annulation coopérative
                        try:
                            if session_id and ws:
                                ctl = ws.get_control(session_id)
                                if ctl and ctl.get('canceled'):
                                    raise GenerationCanceled("Annulé par l'utilisateur")
                        except GenerationCanceled:
                            raise
                        except Exception:
                            pass
                    # Fin normale → constituer un objet réponse simulé
                    content = ''.join(buffer)
                    response = type('Obj', (), {'content': content})
                except GenerationCanceled:
                    raise
                except Exception as e_stream:
                    # Fallback ultime: tenter un invoke non-stream (peut déjà être trop tard)
                    try:
                        response = chat_model.invoke(formatted_messages)
                    except Exception as e2:
                        response = type('Obj', (), {'content': f"Erreur: {e_stream} / {e2}"})
            else:
                response = chat_model.invoke(formatted_messages)
            
            # Extraire la réponse
            content = response.content
            print(f"Réponse reçue: {len(content)} caractères")
            
            return content
        except GenerationCanceled:
            try:
                from app.services.websocket_service import get_websocket_service
                ws = get_websocket_service()
                if session_id:
                    ws.emit_progress(session_id, 'canceled', 'Génération annulée', 100, {})
                    ws.emit_error(session_id, 'Annulé par l\'utilisateur')
            except Exception:
                pass
            return "(Génération annulée)"
        except Exception as e:
            print(f"Erreur lors de l'appel à l'API OpenAI: {str(e)}")
            return f"Erreur: {str(e)}"

    def chat_local(self, messages, settings, images=None, session_id: Optional[str] = None, stream: bool = False, show_thinking: bool = False):
        """
        Utilise un service local (Ollama, etc.) pour le chat
        
        Args:
            messages (list): Liste des messages précédents
            settings (dict): Paramètres pour cette requête
        
        Returns:
            str: Réponse de l'IA
        """
        try:
            model = settings.get('local_model', 'llama2')
            ollama_url = settings.get('ollama_url', 'http://localhost:11434')
            
            # Préparer les messages pour l'API
            formatted_messages = []
            
            # Ajouter un message système si configuré
            system_prompt = settings.get('system_prompt', '')
            if system_prompt:
                formatted_messages.append({
                    "role": "system",
                    "content": system_prompt
                })
            
            # Ajouter les messages de la conversation
            # Pour Ollama, sans support vision explicite ici, on concatène les URLs en fallback
            last_user_index = None
            for i, m in enumerate(messages):
                if m.get('role') == 'user':
                    last_user_index = i
            for idx, msg in enumerate(messages):
                role = msg.get('role', 'user')
                content = msg.get('content', '')
                if role == 'user' and images and idx == last_user_index:
                    content = content + "\n\nImages: " + ", ".join(images)
                formatted_messages.append({
                    "role": role,
                    "content": content
                })
            
            # Émettre progression via WebSocket si session
            try:
                if session_id:
                    from app.services.websocket_service import get_websocket_service
                    ws = get_websocket_service()
                    ws.emit_progress(session_id, 'ollama_request', 'Requête envoyée à Ollama', None, {
                        'model': model
                    })
            except Exception:
                pass

            # Appeler l'API Ollama
            # Utiliser un stream HTTP pour pouvoir interrompre à la volée (NDJSON)
            use_stream = True
            req = requests.post(
                f"{ollama_url}/api/chat",
                json={
                    "model": model,
                    "messages": formatted_messages,
                    "stream": use_stream,
                    "temperature": settings.get('temperature', 0.7),
                    "num_predict": settings.get('max_tokens', 1000)
                },
                stream=True
            )
            content_parts: list[str] = []
            if req.status_code == 200:
                from app.services.websocket_service import get_websocket_service
                ws = None
                try:
                    ws = get_websocket_service()
                except Exception:
                    ws = None
                try:
                    for line in req.iter_lines(decode_unicode=True):
                        if not line:
                            continue
                        try:
                            import json as _json
                            obj = _json.loads(line)
                            msg = ((obj.get('message') or {}).get('content')) if isinstance(obj, dict) else None
                            if msg:
                                content_parts.append(msg)
                        except Exception:
                            pass
                        # Annulation coopérative
                        try:
                            if session_id and ws:
                                ctl = ws.get_control(session_id)
                                if ctl and ctl.get('canceled'):
                                    try:
                                        req.close()
                                    except Exception:
                                        pass
                                    raise GenerationCanceled("Annulé par l'utilisateur")
                        except GenerationCanceled:
                            raise
                        except Exception:
                            pass
                    content = ''.join(content_parts)
                    try:
                        if session_id and ws:
                            ws.emit_progress(session_id, 'ollama_response', 'Réponse Ollama reçue', 100, {
                                'chars': len(content or '')
                            })
                    except Exception:
                        pass
                    return content
                except GenerationCanceled:
                    raise
                except Exception as e_stream:
                    return f"Erreur: {str(e_stream)}"
            else:
                return f"Erreur: {req.status_code} - {req.text}"
        except GenerationCanceled:
            try:
                from app.services.websocket_service import get_websocket_service
                ws = get_websocket_service()
                if session_id:
                    ws.emit_progress(session_id, 'canceled', 'Génération annulée', 100, {})
                    ws.emit_error(session_id, 'Annulé par l\'utilisateur')
            except Exception:
                pass
            return "(Génération annulée)"
        except Exception as e:
            print(f"Erreur lors de l'appel à l'API Ollama: {str(e)}")
            return f"Erreur: {str(e)}"

# Instance singleton du service
ai_service = AIService() 