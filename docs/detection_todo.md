### Amélioration de la détection des codes et des performances

Objectif: réduire l'espace de recherche des plugins, sélectionner le bon outil plus vite et plus souvent, avec transparence et reproductibilité.

### Axes clés
- **Extraction**: isoler automatiquement les blocs potentiellement chiffrés.
- **Détection**: estimer le(s) algorithme(s) probable(s) via heuristiques + `detect()` des plugins.
- **Shortlist**: restreindre dynamiquement les outils liés au LLM.
- **Guidage LLM**: fournir schémas d’arguments, descriptions enrichies et exemples.
- **Performance**: paralléliser, mémoïser, limiter les appels inutiles au LLM.
- **Apprentissage**: utiliser le retour d’expérience pour améliorer le tri des outils.
- **Transparence**: logs détaillés et affichage des scores dans l’UI.

### TODO (priorités hautes)
- [ ] Créer le meta‑plugin `detect_cipher` (agrégation de `detect()` + heuristiques génériques)
- [ ] Ajouter une étape pipeline `extract_code_spans` pour isoler 1–3 blocs candidats
- [ ] Restreindre `allowed_tools` à une shortlist issue de `detect_cipher` (top‑K)
- [ ] Enrichir les métadonnées plugins: `category`, `when_to_use`, `inputs_schema`, `defaults` (mode=decode), `limitations`
- [ ] Exposer des schémas d’arguments explicites (JSONSchema/Pydantic) aux tools liés au LLM
- [ ] Construire une base d’exemples `config/tools.examples.jsonl` (few‑shots par plugin)
- [ ] Brancher RAG (top‑K d’exemples) dans l’étape `tool_select`/`detect_cipher`
- [ ] Émettre via WebSocket la shortlist `detect_cipher` (scores + explications)
- [ ] Ajouter mémoïsation par session/listing pour `extract_code_spans` et `detect_cipher`
- [ ] Paralléliser les appels `detect()` des plugins éligibles avec timeouts par plugin

### TODO (priorités moyennes)
- [ ] Heuristiques génériques: alphabets restreints, densité symboles, n‑grammes, ratio lettres/espaces, régularités
- [ ] Classifieur léger optionnel (sur données synthétiques) pour réordonner la shortlist
- [ ] Bandit simple: re‑prioriser les outils selon leur succès récent par type d’entrée
- [ ] Politique de retry/fallback: si résultat vide/inchangé, essayer 1–2 alternatives
- [ ] Caching cross‑session (hash sur bloc extrait) avec TTL
- [ ] Limiteurs: budget LLM par étape, nombre max d’outils essayés, temps plafond global

### Détails d’implémentation
- **detect_cipher (meta‑plugin)**
  - Entrée: `text`
  - Étapes: calcul des indices génériques → sélection d’un sous‑ensemble de plugins candidats → appels `detect()` parallèles → normalisation des scores → tri → top‑K
  - Sortie: `results[0].parameters.plugins=[...]`, `text_output` = JSON (plugins+scores+why)
- **extract_code_spans**
  - Heuristiques: lignes à alphabet restreint, forte densité de symboles/majuscules, peu de mots usuels, longueur minimale
  - Option: combiner avec un prompt LLM pour robustesse et nettoyage
- **Shortlist → bind_tools**
  - Dans `langgraph_service`, filtrer `tool_by_name` avant `bind_tools`/étape `tools`
  - Toujours forcer `mode=decode` par défaut (runtime), et l’indiquer dans descriptions/exemples
- **Descriptions & Schémas**
  - `plugin_tool.description`: enrichir avec `when_to_use`, `inputs_schema`, `defaults`, `examples` courts
  - Publier JSONSchema/Pydantic pour chaque tool (aide à la structuration des `tool_calls`)
- **Exemples (RAG)**
  - Fichier `config/tools.examples.jsonl` par ligne: `{tool, input_hint, args, expected, notes}`
  - Récupérer top‑K selon similarité (texte utilisateur + bloc extrait) et injecter au prompt

### Performance & Robustesse
- **Parallélisation**: `detect()` en parallèle avec timeouts (ex: 300–800ms)
- **Mémoïsation**: cache par session et global (hash du bloc), TTL configurable
- **Circuit‑breakers**: si 3 plugins échouent lentement, restreindre davantage la shortlist
- **Pré‑filtres**: regex rapides (m/p/f → Kenny, .- → Morse, I/V/X/L/C/D/M → Romains, 0/1 → Binaire, HEX, Base64)
- **Réduction LLM**: n’appeler le LLM que si heuristiques sont ambiguës

### Logs & UX
- **Logs**: tracer `extract_code_spans`, `detect_cipher` (scores, raisons), shortlist finale, outils réellement appelés
- **UI**: afficher blocs extraits + shortlist/scores, offrir un bouton “essayer un autre outil”

### Validation
- **Jeux de tests**: corpus synthétique couvrant 15+ chiffres (César, Vigenère, Kenny, Morse, Romains, Rail Fence, Bifid…)
- **KPIs**: taux de bon 1er choix, temps médian avant 1er résultat pertinent, nb d’appels plugins/LLM
- **A/B**: comparer “sans shortlist” vs “avec shortlist+RAG”

### Risques & atténuations
- Ambiguïté multi‑algos → conserver 2–3 alternatives et un fallback automatique
- Heuristiques trop strictes → garder un seuil bas et compléter par LLM quand nécessaire
- Coûts LLM → budgets/limiteurs, caching, et “LLM en dernier recours”


