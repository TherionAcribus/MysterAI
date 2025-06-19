# Plugin Chiffre de Bacon (Bilitère)

Ce plugin implémente le **chiffre de Bacon** – aussi appelé *Baconian cipher* ou *chiffre bilitère*. Il s'agit d'un
chiffrement par substitution où chaque lettre est représentée par une séquence de **cinq symboles** composés de
deux états (traditionnellement « A » et « B »).

## Principe de fonctionnement

Le chiffre de Bacon repose sur l'encodage de l'alphabet en groupes de 5 bits :

| Lettre | 26 lettres | 24 lettres |
|--------|------------|------------|
| A      | AAAAA      | AAAAA      |
| B      | AAAAB      | AAAAB      |
| …      | …          | …          |
| I      | ABAAA      | **fusion I/J → ABAAA** |
| J      | ABAAB      | *voir I*   |
| U      | BABAA      | **fusion U/V → BAABB** |
| V      | BABAB      | *voir U*   |

Deux versions sont donc possibles :

1. **Alphabet 26 lettres** : I ≠ J et U ≠ V (version moderne)
2. **Alphabet 24 lettres** : I=J et U=V (version d'origine)

Chaque "A/B" peut être remplacé par **n'importe quel couple de symboles** (0/1, ./--, X/Y…) permettant un
stéganographique ou une dissimulation dans un texte existant.

## Modes de fonctionnement

### Encode

Transforme un texte clair en séquences A/B (ou symboles personnalisés).

### Decode

Décodage direct en utilisant les paramètres choisis. Si l'option *auto-detect* est activée (défaut), le plugin
essaye de déterminer automatiquement quelles sont les deux lettres/symboles utilisés dans le texte.

### Detect

Analyse un texte pour trouver des groupes de 5 symboles compatibles avec le code de Bacon.

### Bruteforce

Teste automatiquement :

* Les deux alphabets (24 et 26 lettres)
* L'ordre original et inversé des symboles (A/B ↔ B/A)
* La paire de symboles réellement présente si le texte ne contient que 2 caractères différents

en évaluant chaque résultat via le système de **scoring** intégré (fréquence des mots, détection GPS, etc.).

## Paramètres

| Nom                  | Type      | Description |
|----------------------|-----------|-------------|
| **mode**             | select    | encode / decode / detect / bruteforce |
| **variant**          | select    | "26" (défaut) ou "24" |
| **symbol_a**         | string    | Symbole représentant « A » (défaut : "A") |
| **symbol_b**         | string    | Symbole représentant « B » (défaut : "B") |
| **auto_detect_symbols** | checkbox | Active la détection automatique des deux symboles (défaut : activé) |
| **brute_force**      | checkbox  | Active la recherche exhaustive |
| **enable_scoring**   | checkbox  | Évalue automatiquement les résultats |

## Formats d'entrée

Le plugin accepte :

* Groupes de 5 symboles séparés par espaces ou non : `ABBBAAABAA ...`
* Symboles mélangés dans un texte libre (mode *detect*)

## Exemples d'utilisation

### Encodage simple

| Entrée | Paramètres | Sortie |
|--------|------------|--------|
| `HELLO` | variant : 26, symboles : A/B | `AABBBAABAA ABABB ABBAB ABBAB ABBBA` |
| `CACHE` | variant : 24, symboles : 0/1 | `00000 00000 01000 00100 00010` |

### Décodage

```text
Entrée  : AABBBAABAAABABBABABBABBBA
Variant : 26
Résultat: HELLO
```

### Bruteforce

```json
{
  "mode": "bruteforce",
  "text": "010000100101001",
  "auto_detect_symbols": "on",
  "enable_scoring": "on"
}
```
Renvoie plusieurs combinaisons testées ; la meilleure est indiquée dans `summary.best_result_id`.

## Scoring automatique

Comme les autres plugins MysteryAI, **bacon_code** peut faire évaluer les textes décodés :

* fréquence des mots (Zipf)
* détection de coordonnées GPS
* structure linguistique française

Le score renvoyé (0 – 1) est stocké dans chaque résultat et utilisé pour sélectionner la solution la plus
probable lors d'un bruteforce.

## Notes techniques

* Conversion sûre A ↔ B : le code utilise un caractère temporaire invisible pour éviter les collisions lors de
  l'inversion des symboles.
* Compatible avec le système de plugins standard (format JSON unifié).
* Code source : `plugins/official/bacon_code/main.py` 