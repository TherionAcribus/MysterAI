# Settings - Référence Rapide

## 🚀 Accès Rapide aux Settings

### Côté Python (Backend)

```python
from app.models.app_config import AppConfig

# Lire
auto_mark = AppConfig.get_value('auto_mark_solved', True)
method = AppConfig.get_value('formula_extraction_method', 'regex')

# Écrire
AppConfig.set_value('mon_param', 'valeur', category='general')
```

### Côté JavaScript (Frontend)

```javascript
// Via API directe
const response = await fetch('/api/settings/general');
const data = await response.json();
const autoMark = data.settings.auto_mark_solved;

// Via service (recommandé)
const settings = await SettingsService.getGeneralSettings();
```

## 📋 Paramètres Disponibles

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `auto_mark_solved` | Boolean | `true` | Marquer automatiquement comme "résolue" |
| `auto_correct_coordinates` | Boolean | `true` | Corriger automatiquement les coordonnées |
| `enable_auto_scoring` | Boolean | `true` | Activer le scoring automatique |
| `formula_extraction_method` | String | `'regex'` | Méthode d'extraction (`'regex'` ou `'ia'`) |
| `question_extraction_method` | String | `'regex'` | Méthode d'extraction (`'regex'` ou `'ia'`) |

## 🔧 Créer un Nouveau Contrôleur

1. **Dans `static/js/controllers/index.js` :**

```javascript
class MonController extends window.BaseSettingsController {
    static targets = [...window.BaseSettingsController.targets, "monInput"]
    apiEndpoint = '/api/settings/mon-type'
    
    gatherSettings() {
        return { mon_param: this.monInputTarget.value };
    }
    
    updateUI(settings) {
        this.monInputTarget.value = settings.mon_param || 'default';
    }
}

app.register('mon-controller', MonController);
```

2. **Ajouter les routes API dans `app/routes/settings.py` :**

```python
@settings_bp.route('/mon-type', methods=['GET'])
def get_mon_type():
    return jsonify({
        'success': True,
        'settings': {'mon_param': AppConfig.get_value('mon_param', 'default')}
    })

@settings_bp.route('/mon-type/save', methods=['POST'])
def save_mon_type():
    data = request.get_json()
    AppConfig.set_value('mon_param', data.get('mon_param'))
    return jsonify({'success': True})
```

3. **Template HTML :**

```html
<div data-controller="mon-controller" 
     data-mon-controller-api-endpoint-value="/api/settings/mon-type">
    <input data-mon-controller-target="monInput" 
           data-action="input->mon-controller#settingChanged">
    <button data-action="click->mon-controller#manualSave">Sauvegarder</button>
</div>
```

## 🛠️ Service Settings JavaScript

**Créer `static/js/services/settings_service.js` :**

```javascript
class SettingsService {
    constructor() {
        this.cache = new Map();
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 min
    }
    
    async getGeneralSettings() {
        return this.getCached('general', '/api/settings/general');
    }
    
    async getSetting(name) {
        return this.getCached(`param_${name}`, `/api/settings/param/${name}`, 'value');
    }
    
    async getCached(key, url, prop = 'settings') {
        if (this.cache.has(key)) return this.cache.get(key);
        
        const response = await fetch(url);
        const data = await response.json();
        const value = data[prop];
        
        this.cache.set(key, value);
        setTimeout(() => this.cache.delete(key), this.CACHE_DURATION);
        
        return value;
    }
    
    invalidateCache() { this.cache.clear(); }
}

window.SettingsService = new SettingsService();
```

## 🎯 Cas d'Usage Fréquents

### 1. Adapter le Comportement selon les Settings

```python
# Dans une route Flask
@app.route('/process-geocache', methods=['POST'])
def process_geocache():
    auto_mark = AppConfig.get_value('auto_mark_solved', True)
    
    # Traitement...
    
    if auto_mark:
        geocache.status = 'solved'
        db.session.commit()
```

### 2. Interface Adaptative

```javascript
// Dans un contrôleur Stimulus
async connect() {
    const settings = await SettingsService.getGeneralSettings();
    
    if (settings.enable_auto_scoring) {
        this.element.querySelector('.scoring-panel').classList.remove('hidden');
    }
}
```

### 3. Plugin Intelligent

```python
class MonPlugin:
    def execute(self, text):
        method = AppConfig.get_value('formula_extraction_method', 'regex')
        
        if method == 'ia':
            return self.process_with_ai(text)
        else:
            return self.process_with_regex(text)
```

## 🔍 Debug et Test

### Routes de Test

- **Test minimal** : `/api/settings/test_minimal`
- **Test complet** : `/api/settings/test_interaction`

### Console Debug

```javascript
// Vérifier Stimulus
window.application.controllers

// Vérifier BaseController
window.BaseSettingsController

// Tester un paramètre
await SettingsService.getSetting('auto_mark_solved')
```

### Test API

```bash
# Lire
curl http://localhost:3000/api/settings/general

# Écrire
curl -X POST http://localhost:3000/api/settings/general/save \
     -H "Content-Type: application/json" \
     -d '{"auto_mark_solved": true}'
```

## ⚠️ Bonnes Pratiques

1. **Toujours fournir une valeur par défaut**
   ```python
   value = AppConfig.get_value('param', 'default')  # ✅
   value = AppConfig.get_value('param')             # ❌
   ```

2. **Valider les types**
   ```python
   enable = bool(AppConfig.get_value('enable_feature', False))
   ```

3. **Utiliser le cache côté client**
   ```javascript
   const settings = await SettingsService.getGeneralSettings(); // ✅
   ```

4. **Gérer les erreurs**
   ```javascript
   try {
       const settings = await SettingsService.getGeneralSettings();
   } catch (error) {
       console.error('Erreur settings:', error);
       // Fallback
   }
   ```

## 📚 Documentation Complète

- **[Système de Settings - Guide Développeur](systeme_settings.md)** : Architecture complète, création de contrôleurs
- **[Accès aux Settings - Guide d'Intégration](acces_settings_donnees.md)** : Intégration dans l'application, exemples concrets

---

*Mise à jour : Cette référence couvre la version actuelle du système de settings. Pour les détails techniques, consultez la documentation complète.* 