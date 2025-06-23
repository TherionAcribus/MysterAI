# Système OCR MysteryAI

## Vue d'ensemble
Le système OCR permet d'extraire le texte des images associées à une géocache puis d'afficher le résultat dans l'interface utilisateur. Il s'appuie sur :

1. **OCR hors-ligne** : [EasyOCR](https://github.com/JaidedAI/EasyOCR) + pré-traitement OpenCV.
2. **Fallback IA** : appel multimodal via `AIService` (GPT-4o, Claude-3, etc.) lorsque la confiance EasyOCR est basse.
3. **Interface utilisateur** : menu contextuel + modale Stimulus pour afficher les étapes et le résultat.

```
+-------------+       POST /ocr/extract        +--------------------+
| Browser (JS)| -----------------------------> | Flask API (ai_bp)  |
|  runOCR()   |                               |  get_ocr_service() |
|             |  <=  JSON {text,confidence}   +--------------------+
+-------------+                                        |
          ▲                                            |
          | fetch()                                     v
+-------------+  EasyOCR / AI fallback  +---------------------+
|   Modale    |<------------------------|   OCRService        |
| OCRModal    |                        +---------------------+
```

---

## Backend

### 1. `app/services/ocr_service.py`

```python
class OCRService:
    def extract_text(self, image_bytes: bytes, use_ai_fallback: bool = False) -> Dict:
        # 1. pré-traitement OpenCV (binarisation)
        # 2. EasyOCR (langues définies dans SUPPORTED_LANGS)
        # 3. si confiance < 0,75 et use_ai_fallback=True → IA
```

* **Pré-traitement** : grayscale → filtre bilatéral → Otsu threshold.
* **Confiance** : EasyOCR ne fournit pas de score global ; la doc utilise 0,85 par défaut.
* **Fallback IA** : image base64 + `AIService.chat()` multimodal.
* **Singleton** : `get_ocr_service()` → évite recharger EasyOCR.

### 2. Endpoint API

```
@ai_bp.route('/ocr/extract', methods=['POST'])
```
* `multipart/form-data`
  * `image` : fichier image.
  * `use_ai` : `true|false` (optionnel).
* Réponse :

```json
{
  "success": true,
  "text": "HELLO WORLD",
  "confidence": 0.92
}
```

**Erreurs** renvoient `success:false` + `error`.

### 3. Dépendances

```
requirements.txt
└─ easyocr
└─ opencv-python-headless
└─ torch
└─ numpy
```

---

## Frontend

### 1. Menu contextuel (`static/js/contextual_menu.js`)

```js
// Ajouté dans handleContextMenu()
{
  label: 'OCR rapide',  click: () => runOCR(img,false)
},
{
  label: 'OCR IA (GPT-4o)', click: () => runOCR(img,true)
}
```

### 2. `runOCR()`

1. Télécharge l'image (`fetch(blob)`).
2. `FormData` → `/api/ai/ocr/extract`.
3. Avant appel : `OCRModal.showLoading()`.
4. Après : `OCRModal.showResult(text, confidence)`.

### 3. Modale OCR

* HTML inséré dans `templates/geocache_details.html`.
* Largeur `w-full max-w-screen-xl` + `overflow-y-auto`.
* Contrôleur Stimulus :`static/js/controllers/ocr_modal_controller.js` :
  * `showLoading()` → spinner.
  * `showResult()` → textarea + confiance.
  * `copy()` → `navigator.clipboard.writeText(...)`.

---

## Paramétrage & Extensibilité

| Clé `AppConfig` | Rôle | Valeur par défaut |
|-----------------|------|-------------------|
| `enable_ai_ocr` (à créer) | Activer le fallback IA | `true` |

* **Ajout d'une langue EasyOCR** : modifier `SUPPORTED_LANGS` dans `OCRService`.
* **Seuil de confiance** : variable interne `confidence < 0.75`.
* **UI** : le textarea est redimensionnable ; ajouter des boutons (ex. « Envoyer au Solver ») dans la section `footer`.

---

## Sécurité & Performance

* EasyOCR CPU : < 500 ms pour une image 800×800.
* IA fallback : dépend du modèle (GPT-4o ≃ 4-8 s). Limiter la taille :
  * compression client possible avant envoi (< 1 Mo).
* Les images ne sont pas stockées côté IA ; seule la base64 passe par HTTPS.

---

## Tests

```
pytest tests/integration/test_ocr.py
```

* Vérifie :
  * statut 200 + `success` true.
  * présence de texte pour une image d'échantillon.

---

## Roadmap

1. Mise en cache des résultats OCR (éviter re-scan).
2. Ajustement automatique du seuil de confiance.
3. Highlight visuel des mots reconnus dans l'image (Overlay Canvas). 