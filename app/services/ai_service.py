import os
import json
import requests
from typing import List, Dict, Any, Optional, Union
from langchain_community.chat_models import ChatOpenAI, ChatAnthropic, ChatOllama
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from app.models.app_config import AppConfig
from langchain_openai import ChatOpenAI as OpenAI

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
                    self.api_key = AppConfig.get_value('api_key', '')
                    self.model_name = AppConfig.get_value('ai_model', 'gpt-3.5-turbo')
                    
                    # Log pour le débogage
                    print(f"=== DEBUG: Mode en ligne chargé - Provider: {self.provider}, Model: {self.model_name} ===")
                else:
                    self.ollama_url = AppConfig.get_value('ollama_url', 'http://localhost:11434')
                    self.model_name = AppConfig.get_value('local_model', 'deepseek-coder:latest')
                    
                    # Log pour le débogage
                    print(f"=== DEBUG: Mode local chargé - URL: {self.ollama_url}, Model: {self.model_name} ===")
                    print(f"=== DEBUG: Modèles locaux activés: {self.local_models_enabled} ===")
                
                self._initialized = True
                
                # Log pour confirmer l'initialisation
                print(f"=== DEBUG: Service AI initialisé - Mode: {self.mode}, Modèle: {self.model_name} ===")
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
    
    def chat(self, messages: List[Dict[str, str]], system_prompt: Optional[str] = None) -> str:
        """
        Envoie une conversation au modèle d'IA et retourne la réponse
        
        Args:
            messages: Liste de messages au format {"role": "user"|"assistant", "content": "..."}
            system_prompt: Message système optionnel
            
        Returns:
            La réponse du modèle d'IA
        """
        try:
            self._ensure_initialized()
            
            # Limiter le nombre de messages au contexte maximum
            if len(messages) > self.max_context:
                messages = messages[-self.max_context:]
            
            # Convertir les messages au format LangChain
            langchain_messages = []
            
            # Ajouter le message système s'il est fourni
            if system_prompt:
                langchain_messages.append(SystemMessage(content=system_prompt))
            
            # Ajouter les messages de la conversation
            for msg in messages:
                if msg["role"] == "user":
                    langchain_messages.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    langchain_messages.append(AIMessage(content=msg["content"]))
            
            # Obtenir le modèle de chat
            chat_model = self.get_chat_model()
            
            # Envoyer la requête au modèle
            response = chat_model.invoke(langchain_messages)
            
            # Retourner le contenu de la réponse
            return response.content
            
        except Exception as e:
            print(f"Erreur lors de l'appel au modèle d'IA: {str(e)}")
            return f"Erreur: {str(e)}"
    
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
            
            # Log pour le débogage
            print(f"=== DEBUG: Sauvegarde des paramètres - Mode: {mode} ===")
            
            # Enregistrer les paramètres spécifiques au mode
            if mode == 'online':
                # Déterminer le provider (utiliser ai_provider ou provider)
                provider = settings.get('ai_provider', settings.get('provider', 'openai'))
                
                # Déterminer le modèle (utiliser ai_model ou online_model)
                model = settings.get('ai_model', settings.get('online_model', 'gpt-3.5-turbo'))
                
                AppConfig.set_value('ai_provider', provider)
                AppConfig.set_value('ai_model', model)
                
                # Enregistrer la clé API si elle est fournie et non vide
                if settings.get('api_key'):
                    AppConfig.set_value('api_key', settings.get('api_key'), 
                                       category='api_key', is_secret=True)
                    
                # Log pour le débogage
                print(f"=== DEBUG: Paramètres en ligne sauvegardés - Provider: {provider}, Model: {model} ===")
            else:
                # Déterminer l'URL Ollama
                ollama_url = settings.get('ollama_url', 'http://localhost:11434')
                
                # Déterminer le modèle local
                local_model = settings.get('local_model', 'deepseek-coder:latest')
                
                AppConfig.set_value('ollama_url', ollama_url)
                AppConfig.set_value('local_model', local_model)
                
                # Enregistrer les modèles locaux activés
                if settings.get('local_models_enabled'):
                    # Convertir en JSON pour le stockage
                    local_models_enabled_json = json.dumps(settings.get('local_models_enabled'))
                    AppConfig.set_value('local_models_enabled', local_models_enabled_json)
                    
                    # Log pour le débogage
                    print(f"=== DEBUG: Modèles locaux activés sauvegardés: {settings.get('local_models_enabled')} ===")
                
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
            
            # Mettre à jour les modèles locaux activés dans l'instance
            if settings.get('local_models_enabled'):
                self.local_models_enabled = settings.get('local_models_enabled')
            
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
        
        # Modèles en ligne par défaut
        default_online_models = {
            'gpt-3.5-turbo': {'name': 'GPT-3.5 Turbo'},
            'gpt-4': {'name': 'GPT-4'},
            'gpt-4o': {'name': 'GPT-4o'},
            'claude-3-opus': {'name': 'Claude 3 Opus'},
            'claude-3-sonnet': {'name': 'Claude 3 Sonnet'},
            'claude-3-haiku': {'name': 'Claude 3 Haiku'}
        }
        
        # Modèles locaux par défaut avec état activé
        default_local_models = {
            'llama3': {'name': 'Llama 3', 'enabled': False},
            'mistral': {'name': 'Mistral', 'enabled': False},
            'deepseek-coder': {'name': 'DeepSeek Coder', 'enabled': False},
            'phi3': {'name': 'Phi-3', 'enabled': False}
        }
        
        # Mettre à jour l'état activé des modèles locaux
        if hasattr(self, 'local_models_enabled') and self.local_models_enabled:
            for model_id, enabled in self.local_models_enabled.items():
                if model_id in default_local_models:
                    default_local_models[model_id]['enabled'] = enabled
        else:
            # Par défaut, activer tous les modèles si aucun n'est spécifié
            for model_id in default_local_models:
                default_local_models[model_id]['enabled'] = True
        
        # Paramètres de base
        settings = {
            'mode': self.mode,
            'ai_mode': self.mode,  # Pour la compatibilité
            'temperature': self.temperature,
            'max_context': self.max_context,
            'online_models': default_online_models,
            'local_models': default_local_models
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

    def chat(self, messages, settings=None):
        """
        Envoie un message à l'IA et retourne la réponse
        
        Args:
            messages (list): Liste des messages précédents
            settings (dict, optional): Paramètres spécifiques pour cette requête
        
        Returns:
            str: Réponse de l'IA
        """
        if settings is None:
            settings = self.get_settings()
        
        mode = settings.get('mode', 'online')
        
        if mode == 'online':
            return self.chat_online(messages, settings)
        else:
            return self.chat_local(messages, settings)

    def chat_online(self, messages, settings):
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
            
            if not api_key:
                return "Erreur: Clé API non configurée. Veuillez configurer votre clé API dans les paramètres."
            
            # Créer une instance de ChatOpenAI avec les paramètres appropriés
            chat_model = OpenAI(
                model_name=model,
                temperature=settings.get('temperature', 0.7),
                openai_api_key=api_key,
                max_tokens=settings.get('max_tokens', 1000)
            )
            
            # Préparer les messages pour l'API
            formatted_messages = []
            
            # Ajouter un message système si configuré
            system_prompt = settings.get('system_prompt', '')
            if system_prompt:
                formatted_messages.append(SystemMessage(content=system_prompt))
            
            # Ajouter les messages de la conversation
            for msg in messages:
                role = msg.get('role', 'user')
                content = msg.get('content', '')
                
                if role == 'user':
                    formatted_messages.append(HumanMessage(content=content))
                elif role == 'assistant':
                    formatted_messages.append(AIMessage(content=content))
                elif role == 'system':
                    formatted_messages.append(SystemMessage(content=content))
            
            # Appeler l'API via l'interface de LangChain
            response = chat_model.invoke(formatted_messages)
            
            # Extraire la réponse
            return response.content
        except Exception as e:
            print(f"Erreur lors de l'appel à l'API OpenAI: {str(e)}")
            return f"Erreur: {str(e)}"

    def chat_local(self, messages, settings):
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
            for msg in messages:
                formatted_messages.append({
                    "role": msg.get('role', 'user'),
                    "content": msg.get('content', '')
                })
            
            # Appeler l'API Ollama
            response = requests.post(
                f"{ollama_url}/api/chat",
                json={
                    "model": model,
                    "messages": formatted_messages,
                    "stream": False,
                    "temperature": settings.get('temperature', 0.7),
                    "num_predict": settings.get('max_tokens', 1000)
                }
            )
            
            if response.status_code == 200:
                return response.json().get('message', {}).get('content', '')
            else:
                return f"Erreur: {response.status_code} - {response.text}"
        except Exception as e:
            print(f"Erreur lors de l'appel à l'API Ollama: {str(e)}")
            return f"Erreur: {str(e)}"

# Instance singleton du service
ai_service = AIService() 