# Système de Détection de QR Codes MysteryAI

## Vue d'ensemble
Le système de détection de QR codes permet de détecter et décoder automatiquement les QR codes dans les images associées aux géocaches. Il s'appuie sur :

1. **Détection hors-ligne** : [pyzbar](https://github.com/NaturalHistoryMuseum/pyzbar) + pré-traitement OpenCV.
2. **Pré-traitement avancé** : Amélioration d'image avec différentes techniques pour optimiser la détection.
3. **Interface utilisateur** : Menu contextuel + intégration dans l'analyse automatique des géocaches.

```
+-------------+       POST /qr/extract          +--------------------+
| Browser (JS)| -----------------------------> | Flask API (ai_bp)  |
|  runQRCode()| <=  JSON {qr_codes,success}   | get_qr_service()   |
+-------------+                                +--------------------+
          |                                            |
          | Menu contextuel                            v
+-------------+  pyzbar + OpenCV       +---------------------+
|   Images    |<----------------------|   QRCodeService     |
|   Galerie   |                       +---------------------+
```

---

## Backend

### 1. `app/services/qr_service.py`

```python
class QRCodeService:
    def detect_qr_codes(self, image_bytes: bytes) -> Dict:
        # 1. pré-traitement OpenCV (amélioration contraste, seuillage)
        # 2. pyzbar pour détection directe
        # 3. fallback avec pré-traitement si échec initial
```

* **Pré-traitement** : niveaux de gris → CLAHE → seuillages adaptatif/Otsu → filtres.
* **Détection** : pyzbar.decode() avec support multi-QR codes.
* **Formats** : QR codes uniquement (filtrage des autres codes-barres).
* **Singleton** : `get_qr_service()` → évite réinstanciation.

### 2. Endpoint API

```
@ai_bp.route('/qr/extract', methods=['POST'])
```
* `multipart/form-data`
  * `image` : fichier image.
* Réponse :

```json
{
  "success": true,
  "qr_codes": [
    {
      "data": "https://example.com",
      "type": "QRCODE",
      "rect": {"left": 10, "top": 20, "width": 100, "height": 100},
      "polygon": [{"x": 10, "y": 20}, ...],
      "quality": "direct"
    }
  ],
  "count": 1
}
```

**Erreurs** renvoient `success:false` + `error`.

### 3. Dépendances

```
requirements.txt
└─ pyzbar==0.1.9
└─ opencv-python-headless (déjà présent)
└─ numpy (déjà présent)
```

---

## Plugin d'Analyse Automatique

### 1. `plugins/official/qr_code_detector/`

```
qr_code_detector/
├── plugin.json      # Configuration du plugin
└── main.py         # QRCodeDetectorPlugin
```

Le plugin analyse automatiquement toutes les images d'une géocache lors de l'analyse via `analysis_web_page`.

**Intégration dans le pipeline** :
- Ajouté dans `plugins/official/analysis_web_page/plugin.json`
- Exécuté automatiquement lors de l'analyse d'une géocache
- Résultats intégrés dans l'interface d'analyse

---

## Frontend

### 1. Menu contextuel des images

**Deux implémentations** :
- `static/js/controllers/geocache_gallery_controller.js` (nouveau)
- `static/js/contextual_menu.js` (compatibilité)

```js
// Ajouté dans le menu contextuel
{
  label: 'Lire QR Code',
  icon: 'fas fa-qrcode',
  click: () => runQRCode(targetImage)
}
```

### 2. `runQRCode()`

1. Télécharge l'image (`fetch(blob)`).
2. `FormData` → `/api/ai/qr/extract`.
3. Affiche les résultats dans modale OCR ou alert.
4. Copie automatique dans le presse-papier (QR code unique).

### 3. Interface d'analyse

**Intégration dans `geocache_analysis_controller.js`** :
- Section dédiée "QR Codes détectés"
- Affichage avec image source, qualité, bouton copier
- Inclusion dans "Textes intéressants" avec icône 📱

---

## Utilisation

### 1. Analyse automatique
1. Ouvrir une géocache → Bouton "Analyser"
2. Le plugin `qr_code_detector` analyse automatiquement toutes les images
3. Les QR codes trouvés apparaissent dans les résultats d'analyse

### 2. Analyse manuelle d'une image
1. Clic droit sur une image de la galerie
2. Sélectionner "Lire QR Code"
3. Résultats affichés dans une modale ou alert

### 3. Fonctionnalités
- **Détection multiple** : Support de plusieurs QR codes par image
- **Copie automatique** : Presse-papier pour QR code unique
- **Pré-traitement** : Amélioration automatique si détection échoue
- **Informations détaillées** : Position, qualité, image source

---

## Extensibilité & Performance

| Paramètre | Valeur | Notes |
|-----------|--------|-------|
| Formats supportés | QR Code uniquement | Filtrage automatique |
| Pré-traitement | 6 techniques différentes | CLAHE, seuillages, filtres |
| Performance | < 2s par image | Dépend de la taille et complexité |
| Fallback | Pré-traitement automatique | Si détection directe échoue |

* **Extensions possibles** : Support codes-barres, détection dans vidéos
* **Optimisations** : Cache des images prétraitées, traitement parallèle
* **Intégration IA** : Fallback multimodal pour QR codes endommagés

---

## Sécurité & Limitations

* **QR codes malveillants** : Pas de validation du contenu (URLs, etc.)
* **Taille d'image** : Recommandation < 5 Mo pour performances optimales
* **Formats supportés** : PNG, JPEG, BMP, TIFF via OpenCV
* **Dépendances système** : pyzbar nécessite zbar (installé automatiquement)

--- 