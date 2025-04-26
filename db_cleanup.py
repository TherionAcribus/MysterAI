from app import create_app
from app.models.app_config import AppConfig
from app.database import db
import json

def nettoyage_parametres_ia():
    """
    Script de nettoyage et réinitialisation des paramètres IA
    - Supprime les paramètres incohérents
    - Réinitialise les valeurs par défaut
    - Corrige les associations provider/modèles
    - Crée des clés API distinctes pour chaque fournisseur
    """
    print("=== DÉBUT DU NETTOYAGE DE LA BASE DE DONNÉES DES PARAMÈTRES IA ===")
    
    # 1. Supprimer tous les paramètres actuels liés à l'IA
    parametres_a_supprimer = [
        'ai_mode', 'ai_provider', 'ai_model', 'api_key', 'temperature', 
        'max_context', 'ollama_url', 'local_model', 'local_models_enabled',
        'use_langgraph', 'openai_api_key', 'anthropic_api_key', 'google_api_key'
    ]
    
    for param in parametres_a_supprimer:
        config = AppConfig.query.filter_by(key=param).first()
        if config:
            db.session.delete(config)
            print(f"Paramètre supprimé: {param}")
    
    db.session.commit()
    print("Paramètres supprimés avec succès!")
    
    # 2. Recréer les paramètres par défaut
    AppConfig.set_value('ai_mode', 'online', category='ai_model', 
                       description='Mode d\'exécution de l\'IA (online/local)')
    
    AppConfig.set_value('ai_provider', 'openai', category='ai_model',
                       description='Fournisseur d\'API en ligne (openai, anthropic, google)')
    
    AppConfig.set_value('ai_model', 'gpt-3.5-turbo', category='ai_model',
                       description='Modèle d\'IA en ligne par défaut')
    
    # Clés API par fournisseur (toutes vides par défaut)
    AppConfig.set_value('openai_api_key', '', category='api_key', is_secret=True,
                       description='Clé API pour OpenAI (ChatGPT)')
    
    AppConfig.set_value('anthropic_api_key', '', category='api_key', is_secret=True,
                       description='Clé API pour Anthropic (Claude)')
    
    AppConfig.set_value('google_api_key', '', category='api_key', is_secret=True,
                       description='Clé API pour Google (Gemini)')
    
    # Garder api_key pour compatibilité avec l'existant (copie de la clé du fournisseur actuel)
    AppConfig.set_value('api_key', '', category='api_key', is_secret=True,
                       description='Clé API pour le fournisseur actuel (compatibilité)')
    
    # Paramètres généraux
    AppConfig.set_value('temperature', 0.7, category='ai_model',
                       description='Température pour la génération (0-2)')
    
    AppConfig.set_value('max_context', 10, category='ai_model',
                       description='Nombre maximum de messages de contexte')
    
    # Paramètres pour le mode local
    AppConfig.set_value('ollama_url', 'http://localhost:11434', category='ai_model',
                       description='URL du serveur Ollama local')
    
    AppConfig.set_value('local_model', 'deepseek-coder:latest', category='ai_model',
                       description='Modèle d\'IA local par défaut')
    
    # Activer tous les modèles locaux par défaut
    local_models_enabled = {
        'llama3': True,
        'mistral': True,
        'deepseek-coder': True,
        'phi3': True
    }
    AppConfig.set_value('local_models_enabled', json.dumps(local_models_enabled), 
                       category='ai_model', description='Modèles locaux activés')
    
    # Utiliser LangGraph par défaut
    AppConfig.set_value('use_langgraph', 'true', category='ai_model',
                       description='Utiliser LangGraph (true) ou LangChain (false)')
    
    db.session.commit()
    print("Paramètres par défaut recréés avec succès!")
    
    # 3. Vérification des paramètres
    print("\n=== VÉRIFICATION DES PARAMÈTRES ===")
    params_a_verifier = parametres_a_supprimer + ['openai_api_key', 'anthropic_api_key', 'google_api_key']
    for param in params_a_verifier:
        # Masquer les clés API dans l'affichage
        if param.endswith('_api_key') and AppConfig.get_value(param, '') != '':
            print(f"{param}: ********")
        else:
            valeur = AppConfig.get_value(param, "NON DÉFINI")
            print(f"{param}: {valeur}")
    
    print("\n=== NETTOYAGE TERMINÉ ===")
    print("Vous pouvez maintenant ouvrir l'interface des paramètres IA")
    print("et configurer vos clés API pour chaque fournisseur.")

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        nettoyage_parametres_ia() 