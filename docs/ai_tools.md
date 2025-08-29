# Utilisation des Tools par l’IA

Ce document décrit précisément comment les outils (plugins) sont exposés et utilisés par l’IA via le pipeline et LangGraph.

## Vue d’ensemble

- Les plugins sont découverts/chargés par `PluginManager` puis exposés comme Tools au LLM.
- Lors d’une étape `tools` d’un pipeline, on limite dynamiquement les Tools disponibles via `allowed_tools` (avec résolution générique → noms réels via un mapping).
- Le LLM est explicitement lié aux Tools (`bind_tools`) pour émettre de vrais `tool_calls` (et non du texte simulé).
- Le backend exécute chaque `tool_call` et renvoie au LLM des réponses via des `ToolMessage` (format OpenAI/LangChain), strictement dans l’ordre requis.

## Orchestration côté backend

- Fichier: `app/services/langgraph_service.py`
- Étape `tools` (construction dynamique du graphe):
  - Résout `allowed_tools` → noms réels via `TOOL_NAME_MAPPING`.
  - Lie les Tools au modèle: `bound_llm = llm.bind_tools(filtered_tools)`.
  - Appelle `bound_llm.invoke(messages)` (pas de streaming, pour préserver `tool_calls`).
  - Si `ai.tool_calls` est non vide, exécute chaque outil et génère un `ToolMessage` par appel avec le même `tool_call_id`.
  - Envoie ensuite un nouveau tour LLM (assistant) uniquement après que tous les `ToolMessage` ont été ajoutés.

### Ordonnancement strict (OpenAI)

- Un message assistant avec `tool_calls` doit être immédiatement suivi des `ToolMessage` correspondants, chacun portant le `tool_call_id` associé.
- Aucun autre message (même `system`) ne doit être intercalé.
- Après les `ToolMessage`, un nouveau tour LLM peut être lancé.

## Mapping des Tools

- Les noms génériques du pipeline (ex: `cipher`, `qr`, `ocr`, `formula`) sont traduits vers les plugins concrets via `TOOL_NAME_MAPPING`.
- Exemple: `cipher` → `caesar_code`, `vigenere_cipher`, `atbash`, `kenny_code`, etc.
- Seuls les Tools filtrés sont mis à disposition du LLM pour l’étape en cours.

## Règles par défaut pour les outils de chiffrement

- Par défaut, les outils de chiffrement sont utilisés en mode « decode » (déchiffrer). Si le LLM ne précise pas le mode, le backend injecte `mode: "decode"`.
- Si un plugin signale un encodage (ex: `parameters.mode: encode` ou résumé contenant "Encodage"), une re‑tentative est automatiquement faite avec `mode: "decode"`.

## Émissions WebSocket et UX

- `tool_start` / `tool_end` sont émis avec: nom de l’outil, arguments, succès/erreur et un aperçu du résultat.
- Le chat affiche ces événements en temps réel (messages système et barre de progression).

## Bonnes pratiques de prompts (étape tools)

- Demander explicitement de faire de vrais `tool_calls` (pas de simulation dans le texte).
- Mentionner qu’en l’absence d’instructions, les outils de chiffrement doivent DÉCODER.
- Si des données manquent (image QR, texte source), l’IA doit les demander avant l’appel.

## Dépannage

- 400 OpenAI “tool_calls must be followed by tool messages”: vérifier l’ordre assistant(tool_calls) → ToolMessage(s) et `tool_call_id` identiques.
- L’IA décrit les outils sans les appeler: vérifier `bind_tools` + prompt, et qu’il n’y a pas de streaming sur cet appel.
- Aucune sortie utile: inspecter les arguments passés à l’outil (logs debug) et fournir les données nécessaires.
