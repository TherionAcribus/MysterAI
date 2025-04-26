# Système de Paramètres IA

Ce document décrit le fonctionnement du système de paramètres IA et de la barre de statut permettant la sélection des modèles.

## Table des matières

1. [Architecture générale](#architecture-générale)
2. [Stockage des paramètres](#stockage-des-paramètres)
3. [Système de clés API](#système-de-clés-api)
4. [Interface des paramètres](#interface-des-paramètres)
5. [Contrôleur de la barre de statut](#contrôleur-de-la-barre-de-statut)
6. [Cycle de vie des paramètres](#cycle-de-vie-des-paramètres)
7. [Dépannage](#dépannage)

## Architecture générale

Le système de paramètres IA est composé de plusieurs composants clés :

- **Service IA (`AIService`)** : Service principal qui gère l'interaction avec les modèles d'IA.
- **Contrôleur des paramètres IA (`AISettingsController`)** : Gère l'interface utilisateur des paramètres.
- **Contrôleur de la barre de statut (`StatusBarController`)** : Gère l'affichage et la sélection des modèles d'IA dans la barre de statut.
- **Routes API (`ai_routes.py`)** : Endpoints pour gérer les requêtes liées aux paramètres et aux modèles.
- **Base de données des paramètres (`AppConfig`)** : Stockage persistant des paramètres.

## Stockage des paramètres

Les paramètres sont stockés dans la base de données `app_config.db` via le modèle `AppConfig`. Chaque paramètre est identifié par une clé unique et possède un type spécifique.

### Paramètres principaux

| Paramètre | Description | Valeurs possibles |
|-----------|-------------|------------------|
| `ai_mode` | Mode d'exécution de l'IA | `online`, `local` |
| `ai_provider` | Fournisseur d'API en ligne | `openai`, `anthropic`, `google` |
| `ai_model` | Modèle d'IA en ligne par défaut | `gpt-3.5-turbo`, `gpt-4o`, etc. |
| `temperature` | Température pour la génération | `0.0` à `2.0` (défaut: `0.7`) |
| `max_context` | Nombre maximum de messages de contexte | Entier (défaut: `10`) |
| `use_langgraph` | Framework IA à utiliser | `true` (LangGraph), `false` (LangChain) |

### Paramètres spécifiques au mode local

| Paramètre | Description | Exemple |
|-----------|-------------|---------|
| `ollama_url` | URL du serveur Ollama local | `http://localhost:11434` |
| `local_model` | Modèle d'IA local par défaut | `deepseek-coder:latest` |
| `local_models_enabled` | Liste des modèles locaux activés | JSON : `{"llama3": true, ...}` |

## Système de clés API

Le système prend en charge des clés API distinctes pour chaque fournisseur, tout en maintenant une compatibilité avec l'ancien système.

### Clés API par fournisseur

| Paramètre | Description |
|-----------|-------------|
| `openai_api_key` | Clé API pour OpenAI (ChatGPT) |
| `anthropic_api_key` | Clé API pour Anthropic (Claude) |
| `google_api_key` | Clé API pour Google (Gemini) |
| `api_key` | Clé API générique (compatibilité) |

Lorsqu'un fournisseur est sélectionné, le système utilise automatiquement la clé API correspondante. Si la clé spécifique au fournisseur n'existe pas, le système utilise la clé générique `api_key`.

### Synchronisation des clés

Lors de l'enregistrement d'une clé API via l'interface, le système :
1. Enregistre la clé dans le paramètre spécifique au fournisseur actuel
2. Enregistre également la clé dans le paramètre générique `api_key` pour la compatibilité

## Interface des paramètres

L'interface des paramètres est gérée par le contrôleur `AISettingsController` dans le fichier `static/js/controllers/ai_settings_controller.js`.

### Fonctionnalités principales

- Changement de mode (en ligne/local)
- Sélection du fournisseur d'API
- Gestion des clés API par fournisseur
- Sélection du modèle d'IA
- Configuration des paramètres de génération (température, contexte)
- Test de connexion (Ollama pour mode local, clé API pour mode en ligne)

### Chargement des clés API

Lorsque l'utilisateur change de fournisseur, le système :
1. Appelle l'endpoint `/api/ai/provider_api_key/<provider>` pour récupérer la clé API correspondante
2. Met à jour le champ de saisie avec la clé récupérée (masquée)
3. Met à jour le libellé du champ pour indiquer le fournisseur actuel

### Validation des clés API

Le système effectue une validation basique des formats de clés API :
- OpenAI : Commence généralement par "sk-"
- Anthropic : Commence généralement par "sk-ant-"

Si le format ne correspond pas, une confirmation est demandée à l'utilisateur.

## Contrôleur de la barre de statut

Le contrôleur de la barre de statut (`StatusBarController`) dans `static/js/controllers/status_bar_controller.js` gère l'affichage et la sélection des modèles d'IA.

### Fonctionnalités principales

- Chargement des modèles d'IA disponibles (locaux et en ligne)
- Affichage des modèles dans un menu déroulant
- Changement de modèle actif
- Notification des autres composants des changements de modèle

### Chargement des modèles

Le contrôleur appelle l'endpoint `/api/ai/models` pour récupérer :
- La liste des modèles en ligne disponibles
- La liste des modèles locaux disponibles
- Des informations sur chaque modèle (nom, type, disponibilité)

Les modèles sont ensuite affichés dans le sélecteur, regroupés par type.

### Gestion des modèles non disponibles

Si un modèle nécessite une clé API qui n'est pas configurée, il est marqué comme "non utilisable" et :
- Affiché avec la mention "(API Key manquante)" dans le sélecteur
- Bloqué à la sélection, avec un message d'erreur invitant l'utilisateur à configurer la clé API

## Cycle de vie des paramètres

1. **Initialisation** : Lors du démarrage, `AIService` charge les paramètres depuis la base de données via la méthode `_ensure_initialized()`.
2. **Affichage** : L'interface des paramètres et la barre de statut récupèrent les paramètres via les routes API.
3. **Modification** : L'utilisateur modifie les paramètres via l'interface.
4. **Enregistrement** : Les paramètres sont envoyés au serveur via la route `/api/ai/save_settings` et enregistrés dans la base de données.
5. **Utilisation** : Le service IA utilise les paramètres pour les requêtes au modèle d'IA.

## Dépannage

### Problèmes courants

| Problème | Solution |
|----------|----------|
| Modèles en ligne non affichés | Vérifier la présence d'une clé API valide |
| Erreur lors de l'appel à l'API | Vérifier la validité de la clé API et la compatibilité avec le modèle |
| Modèles locaux non disponibles | Vérifier la connexion à Ollama et la disponibilité des modèles |

### Réinitialisation des paramètres

Un script de nettoyage (`db_cleanup.py`) est disponible pour réinitialiser tous les paramètres IA :

```bash
python db_cleanup.py
```

Cette commande :
1. Supprime tous les paramètres IA existants
2. Recrée les paramètres par défaut
3. Affiche les valeurs des paramètres pour vérification 