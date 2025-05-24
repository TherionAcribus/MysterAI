# Accès aux Settings - Guide d'Intégration

## Vue d'ensemble

Ce guide explique comment accéder et utiliser les paramètres (settings) de MysteryAI depuis n'importe quelle partie de l'application, que ce soit côté Python (Flask), JavaScript (frontend), ou dans vos contrôleurs Stimulus.

## Accès Côté Python (Backend)

### Utilisation du Modèle AppConfig

Le modèle `AppConfig` fournit une interface simple pour lire et écrire les paramètres :

```python
from app.models.app_config import AppConfig

# Lire une valeur avec fallback
auto_mark = AppConfig.get_value('auto_mark_solved', True)
scoring_enabled = AppConfig.get_value('enable_auto_scoring', False)

# Écrire une valeur
AppConfig.set_value('my_parameter', 'my_value', 
                   category='general', 
                   description='Description du paramètre')
```

### Dans vos Routes Flask

```python
from flask import Blueprint, jsonify
from app.models.app_config import AppConfig

@my_bp.route('/my-action', methods=['POST'])
def my_action():
    # Lire les paramètres pour adapter le comportement
    auto_mark_solved = AppConfig.get_value('auto_mark_solved', True)
    enable_scoring = AppConfig.get_value('enable_auto_scoring', True)
    
    # Logique basée sur les paramètres
    if auto_mark_solved:
        # Marquer automatiquement la géocache comme résolue
        pass
    
    if enable_scoring:
        # Calculer le score
        pass
    
    return jsonify({'success': True})
```

### Dans vos Modèles et Services

```python
class GeocacheService:
    @staticmethod
    def solve_coordinates(geocache_id, coordinates):
        """Résoudre les coordonnées d'une géocache"""
        
        # Lire les paramètres
        auto_mark = AppConfig.get_value('auto_mark_solved', True)
        auto_correct = AppConfig.get_value('auto_correct_coordinates', True)
        
        # Appliquer la logique
        if auto_correct:
            coordinates = GeocacheService.correct_coordinates(coordinates)
        
        if auto_mark:
            geocache = Geocache.query.get(geocache_id)
            geocache.status = 'solved'
            db.session.commit()
        
        return coordinates
```

### Paramètres Disponibles

#### Paramètres Généraux

```python
# Marquage automatique comme "résolue"
auto_mark_solved = AppConfig.get_value('auto_mark_solved', True)

# Correction automatique des coordonnées
auto_correct_coordinates = AppConfig.get_value('auto_correct_coordinates', True)

# Activation du scoring automatique
enable_auto_scoring = AppConfig.get_value('enable_auto_scoring', True)
```

#### Paramètres Formula Solver

```python
# Méthode d'extraction des formules
formula_method = AppConfig.get_value('formula_extraction_method', 'regex')

# Méthode d'extraction des questions
question_method = AppConfig.get_value('question_extraction_method', 'regex')
```

## Accès Côté JavaScript (Frontend)

### Via les APIs REST

```javascript
// Lire tous les paramètres généraux
async function getGeneralSettings() {
    try {
        const response = await fetch('/api/settings/general');
        const data = await response.json();
        
        if (data.success) {
            return data.settings;
        }
    } catch (error) {
        console.error('Erreur lecture settings:', error);
    }
}

// Lire un paramètre spécifique
async function getSpecificSetting(paramName) {
    try {
        const response = await fetch(`/api/settings/param/${paramName}`);
        const data = await response.json();
        
        if (data.success) {
            return data.value;
        }
    } catch (error) {
        console.error('Erreur lecture paramètre:', error);
    }
}

// Utilisation
const settings = await getGeneralSettings();
const autoMark = settings.auto_mark_solved;

const scoringEnabled = await getSpecificSetting('enable_auto_scoring');
```

### Depuis vos Contrôleurs Stimulus

```javascript
// Import du service settings (à créer)
import SettingsService from './settings_service.js';

export default class extends Controller {
    async connect() {
        // Lire les paramètres au démarrage
        this.settings = await SettingsService.getGeneralSettings();
        this.adaptBehavior();
    }
    
    async myAction() {
        // Vérifier un paramètre avant action
        if (this.settings.auto_mark_solved) {
            this.markAsSolved();
        }
        
        // Ou lire à la demande
        const enableScoring = await SettingsService.getSetting('enable_auto_scoring');
        if (enableScoring) {
            this.calculateScore();
        }
    }
    
    adaptBehavior() {
        // Adapter l'interface selon les paramètres
        if (this.settings.auto_correct_coordinates) {
            this.element.classList.add('auto-correct-enabled');
        }
    }
}
```

### Service Settings JavaScript

Créez un service réutilisable dans `static/js/services/settings_service.js` :

```javascript
class SettingsService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = new Map();
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    }
    
    async getGeneralSettings() {
        return this.getCachedOrFetch('general', '/api/settings/general');
    }
    
    async getFormulaSettings() {
        return this.getCachedOrFetch('formula', '/api/settings/formula');
    }
    
    async getSetting(paramName) {
        const cacheKey = `param_${paramName}`;
        return this.getCachedOrFetch(cacheKey, `/api/settings/param/${paramName}`, 'value');
    }
    
    async getCachedOrFetch(cacheKey, url, dataProperty = 'settings') {
        // Vérifier le cache
        if (this.cache.has(cacheKey)) {
            const expiry = this.cacheExpiry.get(cacheKey);
            if (Date.now() < expiry) {
                return this.cache.get(cacheKey);
            }
        }
        
        // Récupérer depuis l'API
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                const value = data[dataProperty];
                
                // Mettre en cache
                this.cache.set(cacheKey, value);
                this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);
                
                return value;
            }
        } catch (error) {
            console.error(`Erreur récupération ${cacheKey}:`, error);
        }
        
        return null;
    }
    
    invalidateCache(cacheKey = null) {
        if (cacheKey) {
            this.cache.delete(cacheKey);
            this.cacheExpiry.delete(cacheKey);
        } else {
            this.cache.clear();
            this.cacheExpiry.clear();
        }
    }
    
    // Écouter les changements de settings
    onSettingsChange(callback) {
        window.addEventListener('SettingsChanged', callback);
    }
    
    // Déclencher un événement de changement
    notifyChange(settingsType) {
        this.invalidateCache(settingsType);
        window.dispatchEvent(new CustomEvent('SettingsChanged', {
            detail: { type: settingsType }
        }));
    }
}

// Instance globale
window.SettingsService = new SettingsService();
export default window.SettingsService;
```

## Intégration avec les Composants Existants

### Dans les Plugins

```python
# Dans un plugin
class MyPlugin:
    def execute(self, text, **params):
        # Adapter le comportement selon les settings
        use_ia = AppConfig.get_value('formula_extraction_method', 'regex') == 'ia'
        
        if use_ia:
            return self.process_with_ia(text)
        else:
            return self.process_with_regex(text)
```

### Dans le Formula Solver

```python
class FormulaSolver:
    def extract_formulas(self, text):
        method = AppConfig.get_value('formula_extraction_method', 'regex')
        
        if method == 'ia':
            return self.extract_with_ia(text)
        else:
            return self.extract_with_regex(text)
    
    def should_enable_scoring(self):
        return AppConfig.get_value('enable_auto_scoring', True)
```

### Dans les Contrôleurs de Géocaches

```javascript
// Dans geocache_controller.js
export default class extends Controller {
    async solveCoordinates(coordinates) {
        const settings = await SettingsService.getGeneralSettings();
        
        // Corriger automatiquement si activé
        if (settings.auto_correct_coordinates) {
            coordinates = this.correctCoordinates(coordinates);
        }
        
        // Marquer comme résolu si activé
        if (settings.auto_mark_solved) {
            await this.markAsSolved();
        }
        
        // Calculer le score si activé
        if (settings.enable_auto_scoring) {
            const score = await this.calculateScore(coordinates);
            this.displayScore(score);
        }
    }
}
```

## Synchronisation et Événements

### Écouter les Changements de Settings

```javascript
// Écouter tous les changements
SettingsService.onSettingsChange((event) => {
    const { type } = event.detail;
    console.log(`Settings ${type} ont changé`);
    
    // Réagir au changement
    if (type === 'general') {
        this.updateBehavior();
    }
});

// Dans un contrôleur
export default class extends Controller {
    connect() {
        // Écouter les changements
        this.settingsChangeHandler = this.onSettingsChange.bind(this);
        window.addEventListener('SettingsChanged', this.settingsChangeHandler);
    }
    
    disconnect() {
        window.removeEventListener('SettingsChanged', this.settingsChangeHandler);
    }
    
    onSettingsChange(event) {
        // Réagir aux changements de settings
        this.reloadSettings();
    }
}
```

### Notifier les Changements

```javascript
// Dans un contrôleur de settings après sauvegarde
async performSave() {
    const result = await super.performSave();
    
    // Notifier le changement
    SettingsService.notifyChange('general');
    
    return result;
}
```

## Validation et Valeurs par Défaut

### Côté Python

```python
class SettingsValidator:
    @staticmethod
    def get_safe_boolean(key, default=False):
        """Récupère un booléen avec validation"""
        value = AppConfig.get_value(key, default)
        return bool(value) if value is not None else default
    
    @staticmethod
    def get_safe_string(key, default='', allowed_values=None):
        """Récupère une chaîne avec validation"""
        value = AppConfig.get_value(key, default)
        
        if allowed_values and value not in allowed_values:
            return default
        
        return str(value) if value is not None else default
    
    @staticmethod
    def get_safe_integer(key, default=0, min_val=None, max_val=None):
        """Récupère un entier avec validation"""
        value = AppConfig.get_value(key, default)
        
        try:
            int_value = int(value)
            
            if min_val is not None and int_value < min_val:
                return default
            if max_val is not None and int_value > max_val:
                return default
            
            return int_value
        except (ValueError, TypeError):
            return default

# Utilisation
auto_mark = SettingsValidator.get_safe_boolean('auto_mark_solved', True)
method = SettingsValidator.get_safe_string('formula_extraction_method', 'regex', 
                                          ['regex', 'ia'])
```

### Côté JavaScript

```javascript
class SettingsValidator {
    static getSafeBoolean(value, defaultValue = false) {
        return value !== null && value !== undefined ? Boolean(value) : defaultValue;
    }
    
    static getSafeString(value, defaultValue = '', allowedValues = null) {
        if (value === null || value === undefined) return defaultValue;
        
        const strValue = String(value);
        if (allowedValues && !allowedValues.includes(strValue)) {
            return defaultValue;
        }
        
        return strValue;
    }
    
    static getSafeInteger(value, defaultValue = 0, minVal = null, maxVal = null) {
        const intValue = parseInt(value);
        
        if (isNaN(intValue)) return defaultValue;
        if (minVal !== null && intValue < minVal) return defaultValue;
        if (maxVal !== null && intValue > maxVal) return defaultValue;
        
        return intValue;
    }
}
```

## Cas d'Usage Concrets

### 1. Plugin Intelligent

```python
class IntelligentPlugin:
    def process(self, text):
        # Adapter selon les paramètres
        extraction_method = AppConfig.get_value('formula_extraction_method', 'regex')
        enable_scoring = AppConfig.get_value('enable_auto_scoring', True)
        
        if extraction_method == 'ia':
            result = self.process_with_ai(text)
        else:
            result = self.process_with_regex(text)
        
        if enable_scoring:
            result['score'] = self.calculate_relevance_score(result)
        
        return result
```

### 2. Interface Adaptive

```javascript
export default class extends Controller {
    async connect() {
        const settings = await SettingsService.getGeneralSettings();
        
        // Adapter l'interface
        if (settings.auto_mark_solved) {
            this.enableAutoMarkFeatures();
        }
        
        if (settings.enable_auto_scoring) {
            this.showScoringIndicators();
        }
    }
    
    enableAutoMarkFeatures() {
        // Afficher les indicateurs auto-mark
        this.element.querySelectorAll('.auto-mark-indicator')
                   .forEach(el => el.classList.remove('hidden'));
    }
}
```

### 3. Workflow Automatisé

```python
class GeocacheWorkflow:
    def process_solution(self, geocache_id, solution_data):
        """Traite une solution de géocache selon les paramètres"""
        
        auto_correct = AppConfig.get_value('auto_correct_coordinates', True)
        auto_mark = AppConfig.get_value('auto_mark_solved', True)
        enable_scoring = AppConfig.get_value('enable_auto_scoring', True)
        
        geocache = Geocache.query.get(geocache_id)
        
        # Étape 1: Correction automatique
        if auto_correct and 'coordinates' in solution_data:
            solution_data['coordinates'] = self.correct_coordinates(
                solution_data['coordinates']
            )
        
        # Étape 2: Calcul du score
        if enable_scoring:
            score = self.calculate_solution_score(solution_data)
            solution_data['score'] = score
        
        # Étape 3: Marquage automatique
        if auto_mark and self.is_valid_solution(solution_data):
            geocache.status = 'solved'
            geocache.solution_data = solution_data
            db.session.commit()
        
        return solution_data
```

## Bonnes Pratiques

### Performance

1. **Cache côté client** : Utilisez le SettingsService avec cache
2. **Lectures groupées** : Lisez plusieurs paramètres en une fois
3. **Lazy loading** : Ne chargez les settings que quand nécessaire

### Robustesse

1. **Valeurs par défaut** : Toujours fournir une valeur par défaut
2. **Validation** : Validez les valeurs avant utilisation
3. **Gestion d'erreurs** : Gérez les cas d'échec de lecture

### Maintenabilité

1. **Centralisation** : Utilisez les services dédiés
2. **Documentation** : Documentez les paramètres utilisés
3. **Tests** : Testez avec différentes valeurs de paramètres

## Dépannage

### Problèmes Courants

1. **Paramètre non trouvé**
   ```python
   # ❌ Mauvais
   value = AppConfig.get_value('param_inexistant')  # Peut retourner None
   
   # ✅ Bon
   value = AppConfig.get_value('param_inexistant', 'default_value')
   ```

2. **Cache obsolète côté client**
   ```javascript
   // Forcer le rechargement
   SettingsService.invalidateCache();
   const freshSettings = await SettingsService.getGeneralSettings();
   ```

3. **Type de données incorrect**
   ```python
   # ❌ Mauvais
   if AppConfig.get_value('enable_feature'):  # Peut être une chaîne
   
   # ✅ Bon
   if AppConfig.get_value('enable_feature', False) is True:
   ```

### Debug

```javascript
// Vérifier le cache
console.log('Cache actuel:', SettingsService.cache);

// Forcer un rechargement
SettingsService.invalidateCache();

// Tester un paramètre
const value = await SettingsService.getSetting('auto_mark_solved');
console.log('Valeur:', value);
```

---

*Cette documentation couvre l'intégration complète des settings dans votre application. Pour des besoins spécifiques, consultez la documentation du système de settings ou les exemples de code.* 