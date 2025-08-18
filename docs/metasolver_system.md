### MetaSolver — Système d’analyse et de décryptage multi-plugins

Ce document décrit le fonctionnement du MetaSolver: un orchestrateur qui parcourt les plugins pour détecter puis décoder automatiquement des messages/énigmes, avec suivi de progression en temps réel.

### Objectif
- **Analyser** un texte pour identifier quel(s) plugin(s) sont pertinents.
- **Décrypter** en essayant un plugin ciblé ou une série de plugins et agréger les résultats (texte, confiance, coordonnées GPS, etc.).

### Architecture (vue d’ensemble)
- **UI (template)**: `templates/geocache_solver.html`
  - Panneau MetaSolver (paramètres, boutons Analyser/Décrypter, zone de résultats, statut live).
- **Frontend (JS/Stimulus)**: `static/js/controllers/geocache_solver_controller.js`
  - Méthodes clés: `toggleMetaSolverPanel`, `executeMetaSolver`, `decodeWithPlugin`, `connectWebSocketProgressForMetaSolver`, `formatMetaDetectionResults`.
- **Backend (API Flask)**: `app/routes/plugins.py`
  - Endpoints: `/api/plugins/metadetection/session`, `/api/plugins/metadetection/execute`.
  - Normalisation du texte: `normalize_text`.
- **Plugin MetaSolver**: `plugins/official/metadetection/main.py`
  - Entrée principale: `execute(inputs)` avec `mode` = `detect` | `decode`.
  - Sous-routines: `detect_codes`, `decode_code`, helpers de formatage `_is_standardized_format`, `_process_*`.
- **WebSockets**: service émet des événements `progress_metadetection` et `complete_metadetection` pour le statut live.

### Flux d’exécution
1) L’utilisateur saisit le texte dans le Solver et ouvre le panneau MetaSolver.
2) Il choisit les options (mode, précision, caractères autorisés, clé, embedded, détection GPS).
3) Le frontend:
   - crée une session WebSocket (`POST /api/plugins/metadetection/session`) et rejoint la session via `wsService`;
   - appelle l’API d’exécution (`POST /api/plugins/metadetection/execute`) avec les paramètres;
   - écoute les événements `progress_metadetection` (barre de progression + traces incrémentales) et `complete_metadetection` (résumé final).
4) Le backend normalise le texte, prépare les entrées pour le plugin `metadetection` et l’exécute via `plugin_manager`.
5) Le plugin `metadetection`:
   - en mode **detect**: parcourt des plugins (liste blanche), appelle `check_code(...)`, et retourne une liste standardisée des candidats avec scores et fragments;
   - en mode **decode**: exécute un **plugin précis** (si `plugin_name`) ou **enchaîne** plusieurs plugins, agrège les résultats, extrait/évalue coordonnées et meilleures réponses.
6) Le frontend rend un résumé formaté (avec possibilité de réutiliser des coordonnées détectées ailleurs dans l’UI).

### Paramètres pris en charge
- **text**: contenu du textarea; normalisé côté backend (espaces, retours ligne).
- **mode**: `detect` | `decode`.
- **strict**: `strict` | `smooth` (impacte détection/décryptage).
- **embedded**: booléen; le code peut être intégré dans du texte.
- **allowed_chars**: si ≠ `all`, tableau JSON de caractères autorisés (ex: `["°", ".", "'"]`).
- **plugin_name**: pour forcer le décodage avec un plugin spécifique.
- **key**: clé optionnelle pour certains chiffrements (ex: Vigenère, Gronsfeld).
- **enable_gps_detection**, **enable_bruteforce**: options activables, exploitées dans le plugin.
- **ws_session_id**: identifiant de session WebSocket pour la progression live.

### WebSockets: événements et étapes
- **progress_metadetection**: événements avec `{ step, message, progress, data }`.
  - Étapes usuelles: `started`, `prepare`, `detect_found`, `decode_start`, `decode_try_plugin`, `partial_result`, `decode_done`, `completed`.
- **complete_metadetection**: résultat final, met à jour le bandeau live (succès/erreur) et peut inclure `result` complet.

### Format de résultat standardisé (résumé)
- Champs principaux:
  - `status`: `success` | `partial_success` | `error`
  - `plugin_info`: nom, version, durée d’exécution
  - `inputs`: écho des paramètres d’entrée
  - `results`: liste d’objets résultat (voir ci-dessous)
  - `combined_results`: agrégat par plugin (texte, confiance, coordonnées)
  - `primary_coordinates`: coordonnées “promues” si disponibles
  - `failed_plugins`: (mode decode) liste des plugins en échec
  - `summary`: id du meilleur résultat, total, message

Exemple abrégé:
```json
{
  "status": "success",
  "results": [
    {
      "id": "result_1",
      "text_output": "Solution: ...",
      "confidence": 0.92,
      "parameters": { "plugin": "vigenere_cipher" },
      "coordinates": { "exist": true, "decimal": [48.8566, 2.3522] }
    }
  ],
  "combined_results": {
    "vigenere_cipher": {
      "decoded_text": "Solution: ...",
      "confidence": 0.92,
      "coordinates": { "exist": true, "decimal": [48.8566, 2.3522] }
    }
  },
  "primary_coordinates": [48.8566, 2.3522],
  "summary": {
    "best_result_id": "result_1",
    "total_results": 1,
    "message": "1 résultats de décodage"
  }
}
```

### Intégration côté UI
- Panneau MetaSolver dans `templates/geocache_solver.html` avec:
  - menu Mode / Précision / Caractères autorisés / Clé / Embedded / GPS;
  - boutons "Analyser" et "Décrypter";
  - zone `metasolver-result` (statut live + contenu formaté).

### Intégration côté Frontend (Stimulus)
- `executeMetaSolver(event)`: construit `FormData`, ouvre session WS, POST `/api/plugins/metadetection/execute`, affiche et met à jour les résultats.
- `decodeWithPlugin(pluginName)`: identique mais en ajoutant `plugin_name` pour cibler un plugin.
- `connectWebSocketProgressForMetaSolver()`: abonne les handlers WS pour afficher progression et résultats partiels.
- `formatMetaDetectionResults(result)`: rend proprement le JSON standardisé dans l’UI.

### Intégration côté Backend (Flask)
- `POST /api/plugins/metadetection/session`: crée une session WS et renvoie `session_id`.
- `POST /api/plugins/metadetection/execute`: lit/normalise les paramètres, appelle `plugin_manager.execute_plugin('metadetection', inputs)`, émet la progression/succès, renvoie le JSON.
- `normalize_text(text)`: remplace espaces insécables, unifie retours de ligne, compresse espaces, `strip`.

### Plugin `metadetection`
- `execute(inputs)`: route en fonction du `mode`.
  - **detect**: `detect_codes(text, strict, allowed_chars, embedded)`
    - Parcourt des plugins (liste blanche de dev), appelle `check_code(...)` si disponible; 
    - construit une liste de candidats avec score, fragments, `can_decode`.
  - **decode**: `decode_code(plugin_name, ...)`
    - Si `plugin_name`: exécute uniquement ce plugin;
    - sinon: essaie une liste blanche de plugins, récupère uniquement les sorties au format standardisé, agrège.
- Helpers: `_is_standardized_format`, `_process_plugin_result`, `_process_standardized_result` pour unifier l’output.

### Ajouter un nouveau plugin compatible MetaSolver
1) Implémenter idéalement:
   - `check_code(text: str, strict: bool, allowed_chars: list | None, embedded: bool) -> dict` retournant au minimum: 
     - `is_match: bool`, `score: float (0..1)`, `fragments: list[ { value: str, ... } ]`.
   - `execute(inputs: dict) -> dict` au **format standardisé** (cf. exemple JSON ci-dessus). 
     - Utiliser `status`, `results[]`, `summary`, etc.
2) S’assurer que le plugin est chargé par le `plugin_manager`.
3) Pour le faire considérer par MetaSolver (en phase actuelle):
   - ajouter le nom du plugin aux listes blanches `included_plugins` de `detect_codes`/`decode_code` dans `metadetection/main.py`.

### Bonnes pratiques
- Respecter la normalisation d’entrées (`strict/smooth`, `allowed_chars`, `embedded`, `key`).
- Retourner des `coordinates` si le plugin en détecte (ex: parse GPS) pour bénéficier de `primary_coordinates`.
- Donner un `text_output` concis et informatif; remplir `confidence`.
- En cas d’erreur côté plugin, préférer un `status: error` avec un `summary.message` explicite.

### Débogage rapide
- Vérifier la session WS (création puis `joinSession` côté front).
- Observer `progress_metadetection` (étapes attendues) dans la console.
- Confirmer la présence de `results` et le format standardisé dans la réponse JSON.
- Sur le backend, vérifier la normalisation du texte et les listes blanches `included_plugins`.

### Références internes
- `docs/geocache_solver_execution_flow.md` — Détails du flux du Solver.
- `docs/plugin_system.md` — Architecture globale des plugins.
- `docs/websocket_system.md` — Système WebSocket (sessions, événements, intégration front).
- `docs/coordinates_detection_system.md` — Détails de détection de coordonnées GPS.


