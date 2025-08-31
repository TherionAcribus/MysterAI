## Améliorations MetaSolver — Phase « Analyser » (détection de plugins)

### Objectifs
- **Rapidité**: exécutions courtes, budget global plafonné, caches.
- **Sensibilité**: repérer des fragments faibles mais caractéristiques.
- **Précision**: réduire les faux positifs, meilleur classement des candidats.

### Légende des cases
- [ ] à faire • [x] fait • [~] en cours • [!] à valider • [?] optionnel

## 1) Contrat standard de check_code (compatible rétro)
- [ ] Définir un contrat enrichi de retour pour `check_code(text, strict, allowed_chars, embedded)`:
  - [ ] `is_match: bool`
  - [ ] `score: float (0..1)` score global continu (non-binaire)
  - [ ] `fragments: [{ value, start, end, score_fragment }]`
  - [ ] `metrics: { coverage_ratio, valid_unit_ratio, modulo_penalty, noise_ratio, fragment_count, avg_fragment_len }`
  - [ ] `time_ms: number` (profiling rapide)
- [ ] Conserver la rétrocompatibilité (si `metrics` absent → valeurs par défaut, si `score` binaire → accepté)
- [ ] Documenter ce contrat dans `docs/plugin_system.md` (section « Analyse/Detection »)

## 2) Optimisations per-plugin (exemple: `kenny_code`)
- [ ] Précompilation/caches
  - [ ] Mémoriser `re.escape(allowed_chars)` via LRU par `allowed_chars`
  - [ ] Précompiler les regex dépendantes de `allowed_chars` (cache dict)
  - [ ] Conserver `lower_text` et segmentation pour éviter re-scan multiples
- [ ] Early-exit rapides
  - [ ] Si proportion de caractères de l’alphabet cible < seuil (ex. 0.2) → exit
  - [ ] Si aucun run consécutif minimal (ex. ≥ 6–9 chars pertinents) → baisser score / exit
- [ ] Scoring non-binaire
  - [ ] Par bloc: `total_triplets`, `valid_triplets`, `modulo_penalty`, `block_score = valid_triplets/max(1,total_triplets) - penalty`
  - [ ] Global: `coverage_ratio = sum(len(fragment))/len(text)`
  - [ ] Score final: clamp(0..1, 0.5*coverage + 0.4*avg(block_score) - 0.1*excess_fragments - modulo_penalty)
  - [ ] Renseigner `score_fragment` par fragment
- [ ] Qualité/robustesse
  - [ ] Ignorer micro-fragments (ex. < 6 chars ou block_score < 0.34)
  - [ ] Gérer proprement `allowed_chars` vide/None (fallback par défaut)

## 3) Prétraitements globaux (calculés une fois dans MetaSolver)
- [ ] Normalisation: lower, espaces/retours, trimming (déjà géré côté `PluginManager` → vérifier réutilisation)
- [ ] Caractéristiques globales:
  - [ ] Ratio lettres/chiffres/espaces/ponctuation
  - [ ] Alphabet des lettres uniques, ratio majuscules, entropie
  - [ ] IoC rapide si texte majoritairement alphabétique
- [ ] Exposer ces features aux plugins (param `features`) pour éviter recalculs internes

## 4) Routage/Préfiltrage des plugins (ordre intelligent)
- [ ] Signatures heuristiques légères (O(n)):
  - [ ] Si ≥ 90% lettres ∈ {m,p,f} → prioriser `kenny_code`
  - [ ] Si lettres ⊆ {I,V,X,L,C,D,M} → prioriser `roman_numerals`
  - [ ] Si majoritairement chiffres/séparateurs → prioriser convertisseurs/numériques
- [ ] Ordonnancement adaptatif: commencer par top-N candidats probables, puis les autres
- [ ] Arrêt anticipé: si K (ex. 3) candidats ≥ seuil S (ex. 0.75), s’arrêter
- [ ] Budget global d’analyse (ex. 120 ms) et budget par plugin (ex. 20–30 ms)

## 5) Parallélisation contrôlée
- [ ] Pool (3–4) pour exécuter `check_code` en parallèle (dans le budget CPU)
- [ ] Timeouts par future (annuler plugin trop lent → `timeout_soft`)
- [ ] Regrouper résultats, préserver ordre par score puis heuristiques

## 6) Caching MetaSolver (Analyse)
- [ ] Cache mémoire par clé: hash(text_normalized) + strict + embedded + allowed_chars
- [ ] Valeur: dict plugin → résultat `check_code` (avec timestamp)
- [ ] Politique LRU/TTL (ex. 5–10 min) pour limiter mémoire

## 7) Sortie enrichie « Analyse » (format standardisé)
- [ ] Conserver `confidence = 0.0` et utiliser `plugin_confidence = score`
- [ ] Propager `metrics` au `combined_results[plugin]`
- [ ] Conserver fragments avec `score_fragment` (tri possibles dans l’UI)
- [ ] Tri: `plugin_confidence` desc, tie-breaks: `coverage_ratio`, `avg_fragment_len`, `noise_ratio`

## 8) Observabilité et robustesse
- [ ] Mesurer `time_ms` par plugin (analyse)
- [ ] Logger plugins lents > seuil (avertissement)
- [ ] Gérer exceptions silencieusement avec raison (ex. `invalid_param`, `timeout_soft`)
- [ ] Compter `failed_plugins` (analyse) pour debug

## 9) Gouvernance de la liste de plugins
- [ ] Éviter liste blanche codée en dur:
  - [ ] Ajouter flag `supports_check_code: true` dans `plugin.json` (ou catégorie)
  - [ ] Filtrer par catégorie (`Ciphers`, `Alphabets`, `Numeric`, …)
- [ ] Option UI: basculer « strict whitelist » / « auto-pick par catégorie »

## 10) Critères d’acceptation (QA rapide)
- [ ] Temps d’analyse moyen ≤ budget défini (ex. ≤ 120 ms) sur corpus test
- [ ] Taux de détection (recall) ↑ et faux positifs (precision) contrôlés
- [ ] Classement: le bon plugin dans le top-3 pour ≥ X% des cas
- [ ] Aucun blocage UI, logs informatifs disponibles

## 11) Plan d’implémentation par étapes
- [ ] Étape A — Standardiser contrat `check_code`
  - [ ] Doc et exemples (plugins types)
  - [ ] Adapter 2–3 plugins pilotes (`kenny_code`, `roman_numerals`, un numérique)
- [ ] Étape B — Optimiser `kenny_code`
  - [ ] Caches/regex précompilées, early-exit, scoring fin, métriques
- [ ] Étape C — MetaSolver Analyse
  - [ ] Prétraitements globaux, routage/ordre, budget/timeout
  - [ ] Parallélisation limitée et cache global
  - [ ] Sortie enrichie, tri amélioré
- [ ] Étape D — Extension plugins
  - [ ] Propager le contrat aux plugins majeurs
  - [ ] Activer gouvernance dynamique via `plugin.json`
- [ ] Étape E — QA & Tuning
  - [ ] Benchmarks corpus: mesurer temps, recall/precision
  - [ ] Ajuster seuils (coverage, block_score, K/S, budgets)

## 12) Exemples de métriques (référence)
- **coverage_ratio**: somme des longueurs de fragments / longueur du texte
- **valid_unit_ratio**: unités valides / unités totales dans un fragment (ex. triplets Kenny)
- **modulo_penalty**: pénalité si longueur % taille_unité != 0 (ex. 0.1–0.2)
- **noise_ratio**: chars hors alphabet du code / longueur fragment
- **fragment_count/avg_fragment_len**: réduire score si trop de micro-fragments

## 13) Notes de compatibilité
- Plugins sans `metrics` ni `score_fragment` restent acceptés; le MetaSolver infère des valeurs défaut
- `confidence` côté « Analyse » reste à 0, seul `plugin_confidence` est utilisé pour le tri


