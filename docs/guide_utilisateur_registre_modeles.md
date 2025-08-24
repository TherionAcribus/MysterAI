# Guide utilisateur — Registre des modèles IA (local et en ligne)

Ce guide explique comment gérer les modèles IA utilisés par l'application, sans modifier le code. Vous pouvez déclarer des modèles, déclencher la découverte automatique (Ollama et fournisseurs en ligne), et assigner des modèles à des fonctionnalités (cas d'usage).

## Principe
- Un registre de modèles consolide trois sources:
  - Fichier par défaut fourni par l'application: `config/models.defaults.json`
  - Fichier utilisateur modifiable: `config/models.user.json`
  - Découverte dynamique: modèles locaux (Ollama) installés et modèles en ligne utilisables (selon vos clés API)
- L'état (installé, utilisable, dernière détection) est mis en cache en base de données.

## Actions courantes

### 1) Rafraîchir la liste des modèles
Déclenche la (re)fusion des fichiers + découverte Ollama, puis met à jour le cache.

Requête:
```bash
POST /api/ai/models/refresh
```
Réponse:
```json
{
  "success": true,
  "refreshed_at": "2025-01-01T12:00:00Z",
  "count": 12
}
```

### 2) Consulter la liste des modèles
Retourne les modèles disponibles (locaux et en ligne), leur statut d'utilisation, et le mode courant.

```bash
GET /api/ai/models
```
Extrait de réponse:
```json
{
  "success": true,
  "current_mode": "online",
  "models": [
    {"id": "gpt-4o", "name": "GPT-4o", "type": "online", "is_usable": true, "is_active": true},
    {"id": "llama3:latest", "name": "Llama 3", "type": "local", "is_usable": true, "is_active": false}
  ]
}
```
- `is_usable`: true si clé API (en ligne) présente/valide ou si modèle local installé (Ollama)
- Les IDs locaux sont retournés au format complet (ex: `llama3:latest`)

### 3) Définir le modèle actif
Change le modèle utilisé par défaut pour le chat et les fonctionnalités génériques.

```bash
POST /api/ai/set_active_model
{
  "model_id": "gpt-4o"
}
```
- Pour un modèle local, vous pouvez utiliser l'ID complet: `llama3:latest`
- Le serveur refusera un modèle non utilisable (clé manquante ou non installé)

### 4) Déclarer ou modifier des modèles via le fichier utilisateur
Vous pouvez éditer `config/models.user.json` (non versionné par git) ou passer par l'API.

- Lire la configuration utilisateur:
```bash
GET /api/ai/models/user
```
- Écrire la configuration utilisateur (écrase le fichier et rafraîchit le registre):
```bash
POST /api/ai/models/user
{
  "models": [
    {
      "id": "ollama:my-custom-model:latest",
      "provider": "ollama",
      "type": "local",
      "model_id": "my-custom-model:latest",
      "name": "Mon modèle local",
      "capabilities": ["chat"],
      "requires_api_key": false,
      "defaults": {"temperature": 0.6, "num_predict": 1200}
    }
  ],
  "use_case_models": {
    "traduction": "openai:gpt-4o"
  }
}
```

### 5) Assigner des modèles par cas d'usage
Permet d'utiliser des modèles différents selon la fonctionnalité (ex: traduction, résolution d'énigmes, outils, etc.).

- Lire les assignations:
```bash
GET /api/ai/use_cases
```
- Définir une assignation:
```bash
POST /api/ai/use_cases
{
  "use_case": "traduction",
  "model_id": "openai:gpt-4o"
}
```

## Conseils
- Modèles en ligne: configurez vos clés API dans les paramètres (OpenAI, Anthropic, Google). Sans clé valide, `is_usable` sera false.
- Modèles locaux (Ollama): assurez-vous que le modèle est installé (`ollama pull ...`) et que le serveur Ollama est joignable.
- Après modification du fichier utilisateur, pensez à appeler `/api/ai/models/refresh` si vous n’avez pas utilisé l’API d’écriture.

## Dépannage
- Un modèle local non « utilisable »: vérifier qu’il apparaît dans `GET {ollama_url}/api/tags` et que l’ID complet correspond (ex: `llama3:latest`).
- Un modèle en ligne non « utilisable »: vérifier la clé API et les droits d’accès au modèle.
- En cas de doute, rafraîchissez le registre: `POST /api/ai/models/refresh`.
