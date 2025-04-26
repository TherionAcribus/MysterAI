# Référence des API du Système d'IA

Ce document fournit une référence technique des API disponibles pour interagir avec le système d'IA.

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Endpoints des paramètres](#endpoints-des-paramètres)
3. [Endpoints des modèles](#endpoints-des-modèles)
4. [Endpoints de chat](#endpoints-de-chat)
5. [Endpoints de test](#endpoints-de-test)
6. [Formats de requêtes et réponses](#formats-de-requêtes-et-réponses)

## Vue d'ensemble

Toutes les API liées à l'IA sont accessibles via le préfixe `/api/ai/`. Les endpoints sont définis dans le fichier `app/routes/ai_routes.py` et implémentent diverses fonctionnalités pour gérer les paramètres, les modèles, et les conversations avec l'IA.

## Endpoints des paramètres

### Récupérer les paramètres actuels

**Endpoint:** `GET /api/ai/settings`

**Description:** Récupère les paramètres actuels de l'IA.

**Réponse:**
```json
{
  "mode": "online",
  "ai_mode": "online",
  "temperature": 0.7,
  "max_context": 10,
  "online_models": { /* Liste des modèles en ligne */ },
  "local_models": { /* Liste des modèles locaux */ },
  "use_langgraph": true,
  "online_model": "gpt-3.5-turbo",
  "ai_model": "gpt-3.5-turbo",
  "ai_provider": "openai",
  "provider": "openai",
  "api_key": "********"
}
```

**Notes:**
- La clé API est masquée dans la réponse pour des raisons de sécurité.

### Enregistrer les paramètres

**Endpoint:** `POST /api/ai/save_settings`

**Description:** Enregistre les paramètres de l'IA.

**Corps de la requête:**
```json
{
  "ai_mode": "online",
  "temperature": 0.7,
  "max_context": 10,
  "use_langgraph": true,
  "ai_provider": "openai",
  "ai_model": "gpt-3.5-turbo",
  "api_key": "sk-your-api-key",
  "openai_api_key": "sk-your-api-key"
}
```

**Réponse:**
```json
{
  "success": true
}
```

**Notes:**
- Les paramètres spécifiques varient selon le mode (`online` ou `local`).
- Pour le mode `online`, vous pouvez spécifier des clés API distinctes pour chaque fournisseur.

### Récupérer la clé API d'un fournisseur

**Endpoint:** `GET /api/ai/provider_api_key/<provider>`

**Description:** Récupère la clé API pour un fournisseur spécifique.

**Paramètres de chemin:**
- `provider`: Le fournisseur (openai, anthropic, google)

**Réponse:**
```json
{
  "success": true,
  "provider": "openai",
  "api_key": "sk-****",
  "has_key": true
}
```

**Notes:**
- La clé API est partiellement masquée pour des raisons de sécurité.

### Récupérer le template HTML des paramètres

**Endpoint:** `GET /api/ai/settings_panel`

**Description:** Récupère le HTML du panneau de paramètres IA pour l'inclusion via HTMX.

**Réponse:** HTML du formulaire de paramètres

## Endpoints des modèles

### Récupérer les modèles disponibles

**Endpoint:** `GET /api/ai/models`

**Description:** Récupère la liste des modèles d'IA disponibles.

**Réponse:**
```json
{
  "success": true,
  "models": [
    {
      "id": "gpt-4o",
      "name": "GPT-4o",
      "type": "online",
      "is_active": true,
      "is_usable": true
    },
    {
      "id": "deepseek-coder",
      "name": "DeepSeek Coder",
      "type": "local",
      "is_active": false,
      "is_usable": true
    }
  ],
  "current_mode": "online"
}
```

**Notes:**
- Les modèles en ligne nécessitent une clé API configurée pour être utilisables.
- Les modèles locaux nécessitent une connexion à Ollama.

### Définir le modèle actif

**Endpoint:** `POST /api/ai/set_active_model`

**Description:** Définit le modèle d'IA actif.

**Corps de la requête:**
```json
{
  "model_id": "gpt-4o"
}
```

**Réponse:**
```json
{
  "success": true,
  "model_id": "gpt-4o",
  "model_name": "GPT-4o",
  "model_type": "online"
}
```

## Endpoints de chat

### Conversation avec l'IA

**Endpoint:** `POST /api/ai/chat`

**Description:** Envoie une conversation au modèle d'IA et retourne la réponse.

**Corps de la requête:**
```json
{
  "messages": [
    {"role": "user", "content": "Bonjour, comment ça va?"}
  ],
  "model_id": "gpt-4o",
  "system_prompt": "Tu es un assistant amical.",
  "use_tools": true
}
```

**Réponse:**
```json
{
  "success": true,
  "response": "Bonjour ! Je vais bien, merci de demander. Comment puis-je vous aider aujourd'hui ?",
  "model_used": "GPT-4o",
  "used_langgraph": true
}
```

**Notes:**
- `model_id` est optionnel ; si omis, le modèle actif configuré sera utilisé.
- `system_prompt` est optionnel ; définit les instructions système pour le modèle.
- `use_tools` détermine si LangGraph (avec outils) doit être utilisé.

## Endpoints de test

### Tester la connexion à Ollama

**Endpoint:** `POST /api/ai/test_ollama_connection`

**Description:** Teste la connexion à Ollama.

**Corps de la requête:**
```json
{
  "url": "http://localhost:11434"
}
```

**Réponse:**
```json
{
  "success": true,
  "models": ["llama3:latest", "mistral:latest"]
}
```

### Tester une clé API

**Endpoint:** `POST /api/ai/test_api_key`

**Description:** Teste la validité d'une clé API pour un fournisseur donné.

**Corps de la requête:**
```json
{
  "provider": "openai",
  "api_key": "sk-your-api-key"
}
```

**Réponse:**
```json
{
  "success": true,
  "models": ["gpt-3.5-turbo", "gpt-4o", "gpt-4"]
}
```

**Notes:**
- Pour OpenAI, la fonction récupère la liste des modèles accessibles avec la clé.
- Pour Anthropic, une simple requête de test est effectuée.

## Formats de requêtes et réponses

### Format des messages de chat

Les messages de chat suivent le format standard utilisé par la plupart des API de modèles de langage:

```json
{
  "role": "user|assistant|system",
  "content": "Texte du message"
}
```

- `role`: Le rôle de l'émetteur du message
  - `user`: Message de l'utilisateur
  - `assistant`: Réponse de l'IA
  - `system`: Instructions système (contexte général)
- `content`: Le contenu textuel du message 