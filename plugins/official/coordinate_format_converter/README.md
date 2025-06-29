# Plugin « coordinate_format_converter »

Ce plugin permet de convertir des coordonnées géographiques entre plusieurs formats :

* DD  – Degrés décimaux (ex : 49.60117  5.35098)
* DMM – Degrés + minutes décimales (ex : N 49° 36.070' E 005° 21.059')
* DMS – Degrés + minutes + secondes (ex : N 49° 36' 04" E 005° 21' 03")
* UTM – Universal Transverse Mercator (ex : 31U 334785 5499708 ou 31 U 334785 5499708)
* auto – Détection automatique du format source

> Le plugin est pensé pour évoluer : il suffit d'ajouter des méthodes `_parse_xxx` / `_format_xxx` pour prendre en charge de nouveaux formats.

---

## Fichier `plugin.json`

Extrait :

```json
{
  "input_types": {
    "coordinates": { "type": "string", "label": "Coordonnées" },
    "source_format": {
      "type": "select",
      "label": "Format source",
      "options": [
        { "value": "auto", "label": "auto (détection)" },
        { "value": "dd",   "label": "dd – 49.60117 5.35098" },
        { "value": "dmm",  "label": "dmm – N 49° 36.070' E 005° 21.059'" },
        { "value": "dms",  "label": "dms – N 49° 36' 04\" E 005° 21' 03\"" },
        { "value": "utm",  "label": "utm – 31U 334785 5499708" }
      ],
      "default": "auto"
    },
    "target_format": { … },
    "embedded": { "type": "boolean", "label": "Texte avec autres informations ?", "default": false }
  }
}
```

### Champs d'entrée
| Nom | Type | Description |
|-----|------|-------------|
| `coordinates` | string | Chaîne contenant les coordonnées à convertir. |
| `source_format` | select | Format supposé du texte (ou `auto` pour détection). |
| `target_format` | select | Format de sortie désiré. |
| `embedded` | boolean | Si vrai, le plugin cherchera des coordonnées **à l'intérieur** d'un texte plus large (à améliorer). |

### Champs de sortie (format standardisé)
* `results[]` → `text_output` : la coordonnée convertie.
* `results[]` → `parameters.source_format` / `parameters.target_format`.
* `results[]` → `coordinates` : structure normalisée (champ `exist`, `ddm_lat`, `decimal`, …).

Si `source_format = auto` et que plusieurs formats correspondent, chaque résultat est retourné dans le tableau avec un `id` distinct (`result_1`, `result_2`, …).

---

## Dépendances
* `pyproj` – utilisé pour la conversion UTM ↔ WGS-84 (EPSG :4326).

---

## Fonctionnement interne (simplifié)

1. **Parsing** : selon le format demandé, `_parse_xxx` extrait lat/lon décimaux.
2. **Validation DD** : latitude ∈ [-90 ; 90] et longitude ∈ [-180 ; 180] pour éviter de prendre une UTM pour du DD.
3. **Formatage** : `_format_xxx` produit la représentation cible.
4. **Auto-détection** :
   * Itère sur `SUPPORTED_FORMATS` ; pour chaque format, tente un `_parse_xxx`.
   * Conserve les conversions qui ne lèvent pas d'erreur.
   * Si aucune ne réussit → erreur.
5. **Réponse standardisée** envoyée au frontend.

---

## Exemples d'utilisation API

```bash
POST /api/plugins/coordinate_format_converter/execute
Content-Type: application/json

{
  "coordinates": "31U 334785 5499708",
  "source_format": "auto",
  "target_format": "dms"
}
```

Réponse (extrait) :
```json
"results": [
  {
    "id": "result_1",
    "text_output": "N 49° 36' 04.2\" E 005° 21' 03.5\"",
    "parameters": { "source_format": "utm", "target_format": "dms" },
    "coordinates": { "exist": true, "decimal": { "latitude": 49.60117, "longitude": 5.35098 } }
  }
]
```

---

## Ajout d'un nouveau format
1. Ajouter le select (option `{ value, label }`) dans `plugin.json`.
2. Créer `_parse_monformat` et `_format_monformat` dans `main.py`.
3. Ajouter la clé dans `SUPPORTED_FORMATS` et dans les redirections de `_parse` / `_format`.
4. Mettre à jour la doc si nécessaire.

---

© MysterAI – 2024 