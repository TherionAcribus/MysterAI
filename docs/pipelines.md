# Guide des Pipelines IA

Ce document décrit le système de pipelines IA: définition JSON, registre, endpoints, éditeur, et intégration au Chat (notamment pour les géocaches).

## Objectifs

- Structurer les interactions IA en étapes: classification → plan → sélection d'outils → vérification.
- Permettre l’édition sans changer le code (fichiers JSON + éditeur UI).
- Activer automatiquement un pipeline dédié quand le chat provient d’une géocache.
- Offrir des logs détaillés côté serveur pour le débogage.

## Définitions et fichiers

- Fichiers de configuration:
  - `config/pipelines.defaults.json` (versionné)
  - `config/pipelines.user.json` (utilisateur, non versionné)
- Cache en base: `AppConfig['pipelines_cache']` avec `{ pipelines: [...], refreshed_at }`.
- Service: `app/services/pipeline_registry.py` (fusion, cache, CRUD).

## Format JSON d’un pipeline

Exemple minimal du pipeline géocache:

```json
{
  "pipelines": [
    {
      "id": "geocache_default",
      "name": "Pipeline Géocache - Standard",
      "system_prompt": "Tu es un assistant de géocaching...",
      "user_default_prompt": "Merci d'analyser cette géocache en appliquant le pipeline sélectionné (classification → plan/outils → vérification).",
      "steps": [
        {"id": "classify", "type": "llm", "prompt": "Classifie le puzzle...", "output_key": "classification"},
        {"id": "plan", "type": "llm", "prompt": "Sur la base de {classification}, propose...", "output_key": "plan"},
        {"id": "tool_select", "type": "tools", "allowed_tools": ["ocr","exif","qr","cipher","formula"], "selection_from": "plan"},
        {"id": "verify", "type": "llm", "prompt": "Vérifie la cohérence...", "output_key": "final"}
      ]
    }
  ]
}
```

Champs:
- `id`: identifiant unique.
- `name`: libellé affiché en UI.
- `system_prompt`: consignes générales.
- `user_default_prompt`: texte proposé par défaut dans la zone de saisie du chat.
- `steps`: liste ordonnée des étapes. Types supportés:
  - `llm`: étape pilotée par prompt; `prompt`, `output_key` requis.
  - `tools`: étape de sélection/exécution d’outils; `allowed_tools` et/ou `selection_from`.

## Registre des pipelines

Le `PipelineRegistry`:
- Charge `defaults` + `user`, fusionne par `id` (priorité au fichier utilisateur).
- Met en cache la version fusionnée dans `AppConfig` pour performance et persistance.
- Expose des méthodes de lecture/écriture pour l’API.

## Endpoints API

- `GET /api/ai/pipelines`: liste fusionnée des pipelines.
- `GET /api/ai/pipelines/<pipeline_id>`: contenu du pipeline.
- `POST /api/ai/pipelines/<pipeline_id>`: crée/écrase dans `pipelines.user.json` et rafraîchit le cache.
- `POST /api/ai/pipelines/<pipeline_id>/delete`: supprime du fichier utilisateur (si présent) puis rafraîchit.
- `POST /api/ai/pipelines/refresh`: force la re-fusion et met à jour le cache.
- `GET /api/ai/pipelines/editor`: renvoie l’HTML de l’éditeur (intégré via GoldenLayout).

## Éditeur de pipelines (UI)

- Ouverture dans GoldenLayout via le composant `pipelines-editor`.
- Liste des pipelines (dimension adaptable; scroll après ~15 lignes).
- Actions: créer, enregistrer, supprimer (bouton), rafraîchir.
- Deux modes d’édition:
  - Éditeur par blocs (par défaut) pour utilisateurs non techniques.
  - Éditeur JSON brut (avancé) avec bascule.

## Intégration au Chat

Frontend (`static/js/controllers/chat_controller.js`):
- Sélecteur de pipeline dans l’en-tête du chat.
- Sur changement, met à jour `dataset.pipelineId` et le textarea avec `user_default_prompt`.
- Premier envoi depuis une géocache:
  - Construit `messagesToSend` en injectant, dans cet ordre:
    1) éventuel message d’accueil assistant,
    2) message `system` avec le listing (description) de la géocache,
    3) prompt de la première étape LLM du pipeline sélectionné,
    4) message `user` saisi.
- Envoie toujours `pipeline_id` dans la requête `/api/ai/chat`.

Backend (`app/routes/ai_routes.py`, `app/services/langgraph_service.py`):
- Prend en compte `pipeline_id` et applique `system_prompt` du pipeline.
- Orchestration potentielle via LangGraph selon `steps` (LLM + tools).
- Streaming optionnel (`stream: true`) avec émissions WebSocket `progress_update` (tokens) et `operation_complete`.
- `show_thinking` permet de baliser les tokens de réflexion (`data.is_thinking`) pour filtrage côté UI.
- Logs serveurs détaillés:
  - résumé des rôles/longueurs,
  - détail par message (prévisualisation jusqu’à ~2000 caractères),
  - aperçu du dernier `user`, taille du `system_prompt`.

## Bonnes pratiques

- Mettre les règles essentielles dans `system_prompt` (non ambiguës, concises).
- Utiliser `user_default_prompt` pour guider l’utilisateur dès le premier message.
- Garder les étapes au strict nécessaire; éviter la redondance entre prompts.
- Limiter la taille des prompts; privilégier des références aux sorties précédentes (`{classification}`, `{plan}`…).

## Dépannage

- Si l’éditeur ne s’ouvre pas: vérifier l’enregistrement du composant GoldenLayout `pipelines-editor`.
- Si erreur de syntaxe HTML/JS: s’assurer que le HTML renvoyé par `/api/ai/pipelines/editor` n’utilise pas de f-strings Python avec `{}` non échappés.
- Si le listing géocache n’apparaît pas côté serveur:
  - vérifier, dans les logs `[CHAT] msg[i]`, la présence du message `system` contenant le listing,
  - sinon, corriger la construction de `messagesToSend` côté client (insertion en tout début, rôle `system`).


