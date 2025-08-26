# Référence des API du Système d'IA

Ce document fournit une référence technique des API disponibles pour interagir avec le système d'IA.

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Endpoints des paramètres](#endpoints-des-paramètres)
3. [Endpoints des modèles](#endpoints-des-modèles)
4. [Endpoints des pipelines](#endpoints-des-pipelines)
5. [Endpoints de chat](#endpoints-de-chat)
6. [Endpoints de test](#endpoints-de-test)
7. [Formats de requêtes et réponses](#formats-de-requêtes-et-réponses)

## Vue d'ensemble

Toutes les API liées à l'IA sont accessibles via le préfixe `/api/ai/`. Les endpoints sont définis dans le fichier `app/routes/ai_routes.py` et implémentent diverses fonctionnalités pour gérer les paramètres, les modèles, et les conversations avec l'IA.
## Endpoints des pipelines

### Récupérer les pipelines disponibles

**Endpoint:** `GET /api/ai/pipelines`

**Description:** Retourne la liste fusionnée des pipelines (defaults + user) depuis le cache.

**Réponse:**
```json
{
  "success": true,
  "pipelines": [{
    "id": "geocache_default",
    "name": "Pipeline Géocache - Standard",
    "steps": []
  }]
}
```

### Récupérer un pipeline

**Endpoint:** `GET /api/ai/pipelines/<pipeline_id>`

**Description:** Retourne la définition d'un pipeline.

**Réponse:**
```json
{
  "success": true,
  "pipeline": {"id": "geocache_default", "steps": []}
}
```

### Enregistrer/mettre à jour un pipeline utilisateur

**Endpoint:** `POST /api/ai/pipelines/<pipeline_id>`

**Description:** Met à jour (ou crée) la définition d'un pipeline dans `pipelines.user.json` puis rafraîchit le cache.

**Corps de la requête:** contenu JSON complet du pipeline.

**Réponse:**
```json
{ "success": true, "refreshed_at": "2025-01-01T12:00:00Z" }
```

### Supprimer un pipeline utilisateur

**Endpoint:** `POST /api/ai/pipelines/<pipeline_id>/delete`

**Description:** Supprime le pipeline dans `pipelines.user.json` (si présent) et rafraîchit le cache.

**Réponse:**
```json
{ "success": true, "refreshed_at": "2025-01-01T12:00:00Z" }
```

### Rafraîchir le registre de pipelines

**Endpoint:** `POST /api/ai/pipelines/refresh`

**Description:** Re-fusionne defaults + user et met à jour `pipelines_cache` en DB.

**Réponse:**
```json
{ "success": true, "refreshed_at": "2025-01-01T12:00:00Z", "count": 1 }
```


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
  "models": [{
    "id": "gpt-4o",
    "name": "GPT-4o",
    "type": "online",
    "is_active": true,
    "is_usable": true
  },{
    "id": "llama3:latest",
    "name": "Llama 3",
    "type": "local",
    "is_active": false,
    "is_usable": true
  }],
  "current_mode": "online"
}
```

**Notes:**
- Les modèles en ligne nécessitent une clé API configurée pour être utilisables (`is_usable: true`).
- Les modèles locaux nécessitent une connexion à Ollama et un modèle installé.
- Les identifiants de modèles locaux sont renvoyés au format complet (ex: `llama3:latest`).

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

### Rafraîchir le registre de modèles

**Endpoint:** `POST /api/ai/models/refresh`

**Description:** Déclenche la fusion JSON + découverte dynamique (Ollama/clé API) et met à jour le cache.

**Réponse:**
```json
{
  "success": true,
  "refreshed_at": "2025-01-01T12:00:00Z",
  "count": 12
}
```

### Lire/Écrire la configuration des modèles utilisateur

**Endpoint:** `GET /api/ai/models/user`

**Description:** Retourne le contenu de `config/models.user.json`.

**Réponse:**
```json
{
  "success": true,
  "config": {
    "models": [],
    "use_case_models": {}
  }
}
```

**Endpoint:** `POST /api/ai/models/user`

**Description:** Écrit la configuration utilisateur (fichier JSON) puis rafraîchit le registre.

**Corps de la requête:**
```json
{
  "models": [
    {"id": "ollama:deepseek-coder:latest", "provider": "ollama", "type": "local", "model_id": "deepseek-coder:latest", "name": "DeepSeek Coder"}
  ],
  "use_case_models": {"traduction": "openai:gpt-4o"}
}
```

**Réponse:**
```json
{
  "success": true,
  "refreshed_at": "2025-01-01T12:00:00Z"
}
```

### Gestion des cas d'usage (use-cases)

**Endpoint:** `GET /api/ai/use_cases`

**Description:** Retourne le mapping des cas d'usage vers les modèles.

**Réponse:**
```json
{
  "success": true,
  "use_case_models": {
    "traduction": "openai:gpt-4o",
    "recherche_code_secret": "ollama:deepseek-coder:latest"
  }
}
```

**Endpoint:** `POST /api/ai/use_cases`

**Description:** Définit le modèle utilisé pour un cas d'usage donné.

**Corps de la requête:**
```json
{
  "use_case": "traduction",
  "model_id": "openai:gpt-4o"
}
```

**Réponse:**
```json
{
  "success": true,
  "refreshed_at": "2025-01-01T12:00:00Z"
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
    {"role": "assistant", "content": "Bienvenue dans le Chat IA"},
    {"role": "system", "content": "Contexte géocache : <listing tronqué>"},
    {"role": "system", "content": "Tu es un assistant de géocaching... (system_prompt du pipeline)"},
    {"role": "user", "content": "Merci d'analyser cette géocache..."}
  ],
  "model_id": "gpt-4o",
  "system_prompt": "Tu es un assistant amical.",
  "use_tools": true,
  "pipeline_id": "geocache_default"
}
```

**Réponse:**
```json
{
  "success": true,
  "response": "Bonjour ! Je vais bien, merci de demander. Comment puis-je vous aider aujourd'hui ?",
  "model_used": "GPT-4o",
  "used_langgraph": true,
  "debug": {
    "message_count": 4,
    "log_keys": ["[CHAT] Messages", "[CHAT] msg[0]", "[CHAT] msg[1]"]
  }
}
```

**Notes:**
- `model_id` est optionnel ; si omis, le modèle actif configuré sera utilisé.
- `system_prompt` est optionnel ; définit les instructions système pour le modèle.
- `use_tools` détermine si LangGraph (avec outils) doit être utilisé.
- `pipeline_id` est optionnel ; lorsqu'il est fourni et que `use_tools` est vrai, la réponse est orchestrée selon la définition du pipeline (étapes, prompts, outils autorisés).
- En cas d'ouverture depuis une géocache, le client enverra un message `system` supplémentaire contenant le listing (description) afin d'assurer sa prise en compte dans le premier tour.

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