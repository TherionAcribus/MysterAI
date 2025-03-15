import os
import json
import requests
from typing import List, Dict, Any, Optional, Union
from langchain_community.chat_models import ChatOpenAI, ChatAnthropic, ChatOllama
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from app.models.app_config import AppConfig

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
                self.mode = AppConfig.get_value('ai_mode', 'online')
                self.temperature = float(AppConfig.get_value('temperature', 0.7))
                self.max_context = int(AppConfig.get_value('max_context', 10))
                
                # Paramètres spécifiques au mode
                if self.mode == 'online':
                    self.provider = AppConfig.get_value('ai_provider', 'openai')
                    self.api_key = AppConfig.get_value('api_key', '')
                    self.model_name = AppConfig.get_value('ai_model', 'gpt-3.5-turbo')
                else:
                    self.ollama_url = AppConfig.get_value('ollama_url', 'http://localhost:11434')
                    self.model_name = AppConfig.get_value('local_model', 'deepseek-coder:latest')
                
                self._initialized = True
            except RuntimeError:
                # Si nous sommes toujours en dehors du contexte de l'application,
                # nous utiliserons les valeurs par défaut
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
            # Enregistrer les paramètres communs
            AppConfig.set_value('ai_mode', settings.get('ai_mode', 'online'))
            AppConfig.set_value('temperature', settings.get('temperature', 0.7))
            AppConfig.set_value('max_context', settings.get('max_context', 10))
            
            # Enregistrer les paramètres spécifiques au mode
            if settings.get('ai_mode') == 'online':
                AppConfig.set_value('ai_provider', settings.get('ai_provider', 'openai'))
                AppConfig.set_value('ai_model', settings.get('ai_model', 'gpt-3.5-turbo'))
                
                # Enregistrer la clé API si elle est fournie et non vide
                if settings.get('api_key'):
                    AppConfig.set_value('api_key', settings.get('api_key'), 
                                       category='api_key', is_secret=True)
            else:
                AppConfig.set_value('ollama_url', settings.get('ollama_url', 'http://localhost:11434'))
                AppConfig.set_value('local_model', settings.get('local_model', 'deepseek-coder:latest'))
            
            # Mettre à jour les attributs de l'instance
            self.mode = settings.get('ai_mode', 'online')
            self.temperature = float(settings.get('temperature', 0.7))
            self.max_context = int(settings.get('max_context', 10))
            
            if settings.get('ai_mode') == 'online':
                self.provider = settings.get('ai_provider', 'openai')
                self.model_name = settings.get('ai_model', 'gpt-3.5-turbo')
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
        
        settings = {
            'ai_mode': self.mode,
            'temperature': self.temperature,
            'max_context': self.max_context
        }
        
        if self.mode == 'online':
            settings.update({
                'ai_provider': self.provider,
                'ai_model': self.model_name,
                'api_key': self.api_key
            })
        else:
            settings.update({
                'ollama_url': self.ollama_url,
                'local_model': self.model_name
            })
        
        return settings


# Instance singleton du service
ai_service = AIService() 