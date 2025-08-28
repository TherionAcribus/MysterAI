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

## Éditeur graphique des modèles

### Accès à l'éditeur
1. Allez dans **Paramètres IA**
2. Cliquez sur **"Ouvrir l'éditeur de modèles IA"**
3. L'éditeur s'ouvre dans un nouvel onglet GoldenLayout

### Interface de l'éditeur

#### Zone principale : Édition simplifiée
Chaque modèle découvert apparaît dans une liste avec :
- **Informations du modèle** : nom, fournisseur (ollama/openai), type (local/en ligne), ID
- **Description personnelle** (optionnel) : zone de texte libre pour vos notes
- **Case "Inclure"** : cochez pour sauvegarder le modèle dans `config/models.user.json`
- **Nom personnalisé** : renommez le modèle pour plus de clarté
- **Capacités** : cases à cocher pour les vraies capacités du modèle :
  - **Vision** : traitement d'images
  - **Tools** : utilisation d'outils externes
  - **Thinking** : raisonnement étape par étape
- **Paramètres par défaut** :
  - **Température** : créativité (0.1 = précis, 1.0 = créatif)
  - **Num Predict** (local) : longueur maximale de réponse
  - **Max Tokens** (en ligne) : longueur maximale de réponse

#### Zone latérale : Mode avancé (JSON brut)
- **Textarea** contenant le JSON complet de `models.user.json`
- **Synchronisé** automatiquement avec les modifications de l'interface
- **Édition directe** possible pour les utilisateurs expérimentés

### Utilisation typique

#### 1) Qualifier un nouveau modèle découvert
```
Exemple : Vous venez d'installer gemma3:4b via Ollama
1. Cliquez "Rafraîchir" pour découvrir le modèle
2. Dans la liste, cochez "Inclure dans models.user.json"
3. Renommez-le : "Gemma3 Vision (4B)"
4. Cochez les capacités : Vision, Thinking
5. Ajoutez une description : "Excellent pour les énigmes visuelles"
6. Réglez température : 0.3 (plus précis)
7. Cliquez "Enregistrer"
```

#### 2) Personnaliser un modèle existant
```
1. Sélectionnez le modèle dans la liste
2. Modifiez le nom, capacités, paramètres
3. Ajoutez une description d'usage
4. Enregistrez
```

#### 3) Supprimer un modèle de la configuration
```
Décochez simplement "Inclure dans models.user.json"
```

### Boutons de l'éditeur
- **Rafraîchir** : Redécouvre les modèles et met à jour la liste
- **Enregistrer** : Sauvegarde les modifications dans `models.user.json`
- **Status** : Affiche le résultat des opérations

### Conseils pratiques
- **Descriptions utiles** :
  - "Rapide pour les tâches simples"
  - "Excellent pour la logique et les énigmes"
  - "Bon pour la génération de code Python"
  - "Économique pour les longs textes"
- **Températures recommandées** :
  - 0.1-0.3 : tâches précises (maths, code)
  - 0.5-0.7 : usage général
  - 0.8-1.0 : créatif (rédaction, brainstorming)
- **Rafraîchissez régulièrement** pour découvrir les nouveaux modèles installés

## Conseils
- Modèles en ligne: configurez vos clés API dans les paramètres (OpenAI, Anthropic, Google). Sans clé valide, `is_usable` sera false.
- Modèles locaux (Ollama): assurez-vous que le modèle est installé (`ollama pull ...`) et que le serveur Ollama est joignable.
- Après modification du fichier utilisateur, pensez à appeler `/api/ai/models/refresh` si vous n'avez pas utilisé l'API d'écriture.

## Dépannage
- Un modèle local non « utilisable »: vérifier qu’il apparaît dans `GET {ollama_url}/api/tags` et que l’ID complet correspond (ex: `llama3:latest`).
- Un modèle en ligne non « utilisable »: vérifier la clé API et les droits d’accès au modèle.
- En cas de doute, rafraîchissez le registre: `POST /api/ai/models/refresh`.
