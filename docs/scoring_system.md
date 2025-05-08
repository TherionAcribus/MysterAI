# Système de Scoring pour les Plugins MysteryAI

Ce document décrit le système d'évaluation de confiance implémenté pour les plugins de décryptage de MysteryAI, avec une attention particulière aux spécificités du géocaching.

## Table des matières

- [Problématique](#problématique)
- [Vue d'ensemble du système](#vue-densemble-du-système)
- [1. Pré-filtrage ultra-léger](#1-pré-filtrage-ultra-léger)
- [2. Normalisation "géocaching"](#2-normalisation-géocaching)
- [3. Segmentation de texte](#3-segmentation-de-texte)
- [4. Bonus "GPS"](#4-bonus-gps)
- [5. Score lexical](#5-score-lexical)
- [6. Score global](#6-score-global)
- [7. Architecture pratique](#7-architecture-pratique)
- [8. Optimisations & garde-fous](#8-optimisations--garde-fous)
- [9. Cas particuliers et retours terrain](#9-cas-particuliers-et-retours-terrain)
- [10. Améliorations futures](#10-améliorations-futures)

## Problématique

Le système précédent de score de confiance, basé principalement sur le nombre de fragments décryptés, présente des limitations importantes :

- Un texte décrypté par rotation de l'alphabet donne toujours le même score peu importe la rotation
- De nombreux textes sont techniquement déchiffrables mais ne produisent rien d'intéressant
- Absence de contexte sémantique dans l'évaluation

Le nouveau système se base principalement sur la reconnaissance de mots réels dans les langues connues, avec des adaptations spécifiques au contexte du géocaching.

## Vue d'ensemble du système

Le système complet de scoring suit un processus en plusieurs étapes, depuis le pré-filtrage rapide jusqu'à l'attribution d'un score global normalisé entre 0 et 1.

## 1. Pré-filtrage ultra-léger

Ce filtrage initial, extrêmement rapide (≤ 0,1 ms), rejette d'emblée les textes peu prometteurs :

| Test | Rejette | Méthode |
|------|---------|---------|
| Longueur < 20 caractères | Texte trop court pour être fiable | Sauf si regex coordonnées (voir section 4) |
| Ratio voyelles/consonnes aberrant | Chaînes générées aléatoirement | Table fixe par alphabet |
| Explosion de caractères non alphabétiques | Dumps hexadécimaux, Base64, etc. | Seuil ~ 40% non-alpha |

> **Astuce d'implémentation** : Réaliser cette étape dans le plugin JS/Electron pour éviter d'appeler l'API Python lorsque l'échec est prévisible.

## 2. Normalisation "géocaching"

### Réduction des espaces

- Transformation de textes comme « H E L L O » en « HELLO » (si ≥ 5 lettres)
- Création d'une variante sans aucun espace (utile pour les formats de coordonnées comme N48°13.123E2°34.567)

### Création de candidats

- Génération de 4 "candidats" maximum à partir du texte original :
  - Texte original
  - Sans doubles espaces
  - Sans espaces
  - Autres normalisations pertinentes

> **⚠️ Attention** : Ne pas multiplier excessivement les variantes. Au-delà de 4 candidats, le temps de calcul explose sans gain significatif.

## 3. Segmentation de texte

Lorsque les espaces sont absents, une segmentation est nécessaire pour identifier des mots potentiels :

| Langue probable | Méthode de segmentation | Latence typique |
|-----------------|------------------------|-----------------|
| Langues alphabétiques (en/fr/es/de...) | Wordninja ou DP Zipf | 0,1–2 ms |
| Langues asiatiques (zh/ja/ko/th) | Jieba / Tiny-Segment | 0,5–4 ms |
| Texte > 200 caractères | Algorithme "Triangular Matrix" (TM) | ~ 0,8 ms |

> **Astuce** : Utiliser fastText (lid.176.ftz, 917 kB) avant de segmenter pour déterminer la langue probable et charger le dictionnaire approprié.

## 4. Bonus "GPS"

Une expression régulière dédiée identifie les formats de coordonnées GPS :

```
([NS]\s*\d{1,2}[° ]\d{1,2}\.\d+)|([EW]\s*\d{1,3}[° ]\d{1,2}\.\d+)
```

- Si correspondance trouvée → `coord_bonus = 0,3` (sur une échelle de 0 à 1)

> **⚠️ Attention** : 70% des faux positifs contiennent la séquence « N E N E ». Un traitement spécifique de ce motif évite de surévaluer ces cas.

## 5. Score lexical

### Stop-list géocaching

Mots à exclure avant le scoring pour éviter les faux positifs liés au domaine :
- n, s, e, w, o
- est, nord, sud, ouest
- geocache, cache, treasure...

### Méthode d'évaluation

- **Bloom filter** par langue :
  - 50 000 à 100 000 mots courants
  - ~600 kB par langue
  - Taux de faux positifs ≃ 1%

- **Couverture** : proportion des mots trouvés dans le filtre de Bloom

- **Zipf moyen** (avec wordfreq) :
  - Pondération par fréquence d'usage
  - Évite de survaloriser les mots très communs comme "le", "the", "de"...

- **Formule du score lexical** :
  ```
  score_lexical = 0,7 × coverage + 0,3 × (zipf_moyen/7)
  ```

## 6. Score global

Le score final combine le score lexical et le bonus GPS :

```
score_global = 0,7 × score_lexical + 0,3 × coord_bonus
```

### Interprétation des scores

| Score | Interprétation | Interface |
|-------|----------------|-----------|
| ≥ 0,65 | Décryptage certain | Badge vert |
| 0,40–0,65 | Décryptage probable | Badge orange |
| < 0,40 | Peu crédible | Badge gris |

## 7. Architecture pratique

### Architecture standard (appel API)
```
Plugin JS/Electron
   ├─ pré-filtrage (1)
   ├─ normalisation (2)
   └─► appel API Flask /score
            │
            ├─ fastText → langue
            ├─ segmentation (3)
            ├─ regex GPS (4)
            ├─ Bloom + Zipf (5)
            └─ renvoie {texte, langue, score, détails}
UI GoldenLayout
   ├─ trie par score
   └─ affiche top N + badges
```

### Architecture optimisée (appel direct)
```
Plugin Python
   ├─ pré-filtrage (1)
   ├─ normalisation (2)
   └─► appel direct au service de scoring
            │
            ├─ fastText → langue
            ├─ segmentation (3)
            ├─ regex GPS (4)
            ├─ Bloom + Zipf (5)
            └─ retourne {texte, langue, score, détails}
   └─► fallback sur API si service non disponible
UI GoldenLayout
   ├─ trie par score
   └─ affiche top N + badges
```

- **Cache LRU côté service** : dictionnaires Bloom chargés à la volée puis conservés
- **Fiabilité améliorée** : le système fonctionne même si le serveur Flask n'est pas disponible
- **Performance optimisée** : élimination de la latence réseau pour les appels directs
- Possibilité d'utiliser WebSocket pour obtenir le score en temps réel pendant la saisie

## 8. Optimisations & garde-fous

| Optimisation | Justification |
|--------------|---------------|
| Modèles et Bloom compressés (zstd) | 40 langues ≈ 30 Mo au lieu de 120 Mo |
| Priorité aux 4 langues régionales | Gain de 50% sur le premier appel (ex: fr/en/de/nl pour l'Europe centrale) |
| Limite de 10 000 candidats par énigme | Au-delà, suggérer un algorithme différent plutôt que d'évaluer tous les candidats |
| Journalisation systématique | Ré-entraînement des pondérations sur données réelles (cipher, plain, lang, score, verdict) |

## 9. Cas particuliers et retours terrain

| Cas problématique | Solution |
|-------------------|----------|
| Textes très courts (< 10 car.) | Basculer vers détecteur d'indices GPS ou d'hexadécimal |
| Langues agglutinantes (fi, tr) | Utiliser perplexité n-gram plutôt que Bloom (couverture naturellement faible) |
| ROT13 de directions (« A = N, N = A ») | Combiner regex GPS + stop-list pour éliminer la fausse piste |
| Listes de nombres sans direction | Au lieu de "aucun résultat", proposer essai de Vigenère ou bruteforce d'offset numérique |

## 10. Améliorations futures

Sur la base du système actuel, voici les améliorations planifiées pour enrichir notre système de scoring:

### API de scoring standardisée

- ✅ Implémentation d'un endpoint dédié `/api/plugins/score` pour centraliser la logique d'évaluation
- ✅ Ajout dans le `plugin.json` d'un champ `scoring_method` permettant aux plugins de spécifier leur méthode préférée:
  ```json
  "scoring_method": {
    "type": "lexical",
    "language_priority": ["fr", "en", "de"],
    "custom_weights": {
      "lexical": 0.8,
      "gps": 0.2
    }
  }
  ```
- ✅ Ajout d'un accès direct au service de scoring dans les plugins Python pour améliorer la fiabilité et les performances

### Contextualisation par géocache

- Prise en compte des coordonnées GPS de la géocache originale (paramètre optionnel):
  ```json
  "context": {
    "geocache_coords": {
      "latitude": 49.60117,
      "longitude": 5.35098
    }
  }
  ```
- Utilisation de ces coordonnées pour:
  - Prioriser les résultats pointant vers des lieux à proximité
  - Éliminer les résultats trop éloignés (>20km de la cache d'origine)
  - Adapter la priorité des langues selon la région

### Extension du format de sortie standardisé

Enrichissement de la section `metadata` avec des informations détaillées sur le scoring:

```json
"metadata": {
  "scoring": {
    "words_found": ["mot1", "mot2", "mot3"],
    "language_detected": "fr",
    "language_confidence": 0.92,
    "word_coverage": 0.78,
    "average_zipf": 4.3,
    "gps_patterns": ["N 49° 36.070'"],
    "explanation": "Haute confiance car 9 mots français reconnus et format GPS détecté"
  }
}
```

### Optimisations techniques additionnelles

| Optimisation | Mise en œuvre |
|--------------|---------------|
| ✅ Appel direct au service | Utilisation directe du service de scoring dans les plugins Python avec fallback API |
| Cache distribué | Redis pour partager les modèles linguistiques entre instances |
| Préchargement intelligent | Modèles pré-chargés selon géolocalisation de l'utilisateur |
| Compilation JIT | Expressions régulières pré-compilées pour la détection GPS |
| Bloom filter adaptatifs | Ajustement dynamique de la taille selon fréquence d'utilisation |

### Interface utilisateur améliorée

- Visualisation interactive des scores:
  - Graphiques radar montrant les composantes du score (lexical, GPS, proximité)
  - Code couleur sur le texte déchiffré mettant en évidence les mots reconnus
  - Scores de confiance animés lors du calcul en temps réel
- Explication visuelle du scoring:
  - Surlignage des mots reconnus dans le dictionnaire
  - Mise en évidence des motifs de coordonnées GPS
  - Indication des seuils de décision entre les différents niveaux de confiance

Ces améliorations seront déployées progressivement pour enrichir l'expérience utilisateur tout en maintenant les performances du système.

## Résumé

1. **Filtrer** rapidement (ratios, longueurs)
2. **Normaliser** (suppression/condensation d'espaces)
3. **Segmenter** si nécessaire, après détection de langue
4. **Chercher** motifs GPS → bonus dédié
5. **Calculer** score lexical (coverage Bloom + Zipf)
6. **Combiner** : 70% lexical + 30% GPS
7. **Ignorer** directions & jargon pour le scoring
8. **Sélectionner** les meilleurs résultats
9. **Journaliser** et apprendre des faux positifs

Cette approche multicritère permet une évaluation plus fiable des résultats de décryptage dans le contexte spécifique du géocaching. 