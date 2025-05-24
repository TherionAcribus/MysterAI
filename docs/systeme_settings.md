# Système de Settings - Documentation Développeur

## Vue d'ensemble

Le système de settings de MysteryAI offre un framework modulaire et robuste pour gérer les paramètres de l'application. Il utilise **Stimulus** comme base et fournit une architecture orientée objet avec auto-save, gestion d'erreurs, et interface utilisateur moderne.

## Architecture

### Composants Principaux

```
static/js/controllers/
├── base_settings_controller_final.js    # Contrôleur de base réutilisable
└── index.js                             # Enregistrement des contrôleurs spécialisés

app/routes/
└── settings.py                          # Routes API Flask

templates/settings/
├── general_settings.html                # Template paramètres généraux
└── formula_settings.html                # Template paramètres Formula Solver
```

### Architecture de Classes

```
BaseSettingsController (Classe abstraite)
├── GeneralSettingsController
├── FormulaSettingsController
└── [Vos nouveaux contrôleurs...]
```

## BaseSettingsController

### Fonctionnalités Principales

1. **Auto-Save avec Debounce**
   - Sauvegarde automatique après 2 secondes de modification
   - Évite les requêtes multiples
   - Protection contre la perte de données

2. **Gestion d'État**
   - Indicateurs visuels (chargement, synchronisation)
   - Notifications utilisateur
   - Cache versioning

3. **Protection des Données**
   - Alert avant fermeture si modifications non sauvées
   - Gestion robuste des erreurs réseau
   - Fallback sur valeurs par défaut

### API du Contrôleur de Base

#### Targets Stimulus

```javascript
static targets = [
    "notification",        // Zone d'affichage des notifications
    "loadingIndicator",   // Spinner de chargement
    "syncStatus",         // Statut de synchronisation
    "cacheVersion",       // Version du cache
    "saveButton"          // Bouton de sauvegarde
]
```

#### Values Stimulus

```javascript
static values = {
    apiEndpoint: String   // Endpoint API (ex: '/api/settings/general')
}
```

#### Méthodes Abstraites (à implémenter)

```javascript
// Endpoint API pour ce type de settings
get apiEndpoint() {
    throw new Error('apiEndpoint doit être défini dans la classe enfant');
}

// Collecte les valeurs actuelles de l'interface
gatherSettings() {
    throw new Error('gatherSettings() doit être implémentée');
}

// Met à jour l'interface avec les valeurs reçues
updateUI(settings) {
    throw new Error('updateUI() doit être implémentée');
}

// Retourne les valeurs par défaut
getDefaults() {
    return {};
}
```

#### Méthodes Disponibles

```javascript
// Chargement initial des paramètres
async loadInitialSettings()

// Appelé automatiquement lors de modifications
settingChanged()

// Sauvegarde automatique (appelée après 2s)
async autoSave()

// Sauvegarde manuelle (bouton)
async manualSave()

// Actualisation depuis le serveur
async refreshSettings()

// Réinitialisation aux valeurs par défaut
resetDefaults()

// Affichage de notifications
showNotification(message, type = 'info')

// Mise à jour du statut de synchronisation
updateSyncStatus(text, type)
```

## Créer un Nouveau Type de Settings

### 1. Créer le Contrôleur

Dans `static/js/controllers/index.js`, ajoutez votre contrôleur :

```javascript
class MonNouveauSettingsController extends window.BaseSettingsController {
    static targets = [
        ...window.BaseSettingsController.targets,
        "monParametre1", "monParametre2"  // Vos targets spécifiques
    ]
    
    apiEndpoint = '/api/settings/mon-type'
    
    connect() {
        console.log('🔗 MonNouveauSettingsController connecté !');
        super.connect();
    }
    
    gatherSettings() {
        return {
            mon_parametre_1: this.hasMonParametre1Target ? 
                this.monParametre1Target.value : 'default',
            mon_parametre_2: this.hasMonParametre2Target ? 
                this.monParametre2Target.checked : false
        };
    }
    
    updateUI(settings) {
        if (this.hasMonParametre1Target) {
            this.monParametre1Target.value = settings.mon_parametre_1 || 'default';
        }
        if (this.hasMonParametre2Target) {
            this.monParametre2Target.checked = settings.mon_parametre_2 !== false;
        }
    }
    
    getDefaults() {
        return {
            mon_parametre_1: 'default',
            mon_parametre_2: false
        };
    }
}

// Enregistrer le contrôleur
app.register('mon-nouveau-settings', MonNouveauSettingsController);
```

### 2. Créer les Routes API

Dans `app/routes/settings.py` :

```python
@settings_bp.route('/mon-type', methods=['GET'])
def get_mon_type_settings():
    """Récupère les paramètres de mon type"""
    try:
        settings = {
            'mon_parametre_1': AppConfig.get_value('mon_parametre_1', 'default'),
            'mon_parametre_2': AppConfig.get_value('mon_parametre_2', False)
        }
        
        from datetime import datetime
        return jsonify({
            'success': True,
            'settings': settings,
            'cache_version': datetime.now().strftime("%H:%M:%S"),
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@settings_bp.route('/mon-type/save', methods=['POST'])
def save_mon_type_settings():
    """Enregistre les paramètres de mon type"""
    try:
        data = request.get_json()
        
        AppConfig.set_value('mon_parametre_1', data.get('mon_parametre_1', 'default'),
                           category='mon-type', description='Description du paramètre 1')
        AppConfig.set_value('mon_parametre_2', data.get('mon_parametre_2', False),
                           category='mon-type', description='Description du paramètre 2')
        
        from datetime import datetime
        return jsonify({
            'success': True,
            'message': 'Paramètres enregistrés avec succès',
            'cache_version': datetime.now().strftime("%H:%M:%S")
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
```

### 3. Créer le Template HTML

Dans `templates/settings/mon_type_settings.html` :

```html
<div data-controller="mon-nouveau-settings" 
     data-mon-nouveau-settings-api-endpoint-value="/api/settings/mon-type"
     class="space-y-6">
    
    <!-- En-tête avec indicateurs -->
    <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-200">Mes Paramètres</h3>
        <div class="flex items-center space-x-4">
            <div data-mon-nouveau-settings-target="loadingIndicator" class="hidden">
                <!-- Spinner de chargement -->
            </div>
            <span class="text-sm text-gray-500">v<span data-mon-nouveau-settings-target="cacheVersion">-</span></span>
            <span data-mon-nouveau-settings-target="syncStatus" class="text-sm text-gray-500">-</span>
        </div>
    </div>

    <!-- Notification -->
    <div data-mon-nouveau-settings-target="notification" class="hidden p-3 rounded-lg"></div>

    <!-- Paramètres -->
    <div class="space-y-4">
        <div>
            <label for="mon_parametre_1" class="block text-sm font-medium text-gray-200 mb-2">
                Mon Paramètre 1
            </label>
            <input type="text" 
                   id="mon_parametre_1"
                   data-mon-nouveau-settings-target="monParametre1"
                   data-action="input->mon-nouveau-settings#settingChanged"
                   class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded">
        </div>
        
        <div class="flex items-center space-x-3">
            <input type="checkbox" 
                   id="mon_parametre_2"
                   data-mon-nouveau-settings-target="monParametre2"
                   data-action="change->mon-nouveau-settings#settingChanged"
                   class="rounded">
            <label for="mon_parametre_2" class="text-sm font-medium text-gray-200">
                Mon Paramètre 2
            </label>
        </div>
    </div>

    <!-- Boutons d'action -->
    <div class="flex justify-between items-center pt-4 border-t border-gray-700">
        <div class="flex space-x-3">
            <button data-mon-nouveau-settings-target="saveButton"
                    data-action="click->mon-nouveau-settings#manualSave"
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Enregistrer
            </button>
            <button data-action="click->mon-nouveau-settings#refreshSettings"
                    class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                Actualiser
            </button>
        </div>
        <button data-action="click->mon-nouveau-settings#resetDefaults"
                class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
                Réinitialiser
        </button>
    </div>
</div>
```

### 4. Ajouter la Route de Template

```python
@settings_bp.route('/mon-type-panel', methods=['GET'])
def get_mon_type_settings_panel():
    """Retourne le template HTML pour mes paramètres"""
    try:
        return render_template('settings/mon_type_settings.html')
    except Exception as e:
        return f"Erreur lors du chargement: {str(e)}", 500
```

## Conventions et Bonnes Pratiques

### Nommage

1. **Contrôleurs** : `MonTypeSettingsController`
2. **Identifiants Stimulus** : `mon-type-settings`
3. **Routes API** : `/api/settings/mon-type`
4. **Templates** : `templates/settings/mon_type_settings.html`
5. **Targets** : camelCase (ex: `monParametre`)
6. **Paramètres API** : snake_case (ex: `mon_parametre`)

### Types de Paramètres Supportés

1. **Booléens** : Utilisez `checkbox`
2. **Texte** : Utilisez `input[type="text"]`
3. **Nombres** : Utilisez `input[type="number"]`
4. **Sélection** : Utilisez `select`
5. **Texte long** : Utilisez `textarea`

### Gestion d'Erreurs

```javascript
// Dans votre contrôleur
async manualSave() {
    try {
        await super.manualSave();
        // Actions spécifiques après sauvegarde
    } catch (error) {
        // Gestion d'erreur spécifique
        this.showNotification(`Erreur spécifique: ${error.message}`, 'error');
    }
}
```

### Performance

1. **Debounce** : L'auto-save est automatiquement avec debounce de 2s
2. **Cache** : Utilisez le système de cache versioning intégré
3. **Validation** : Validez côté client ET serveur
4. **Fallbacks** : Toujours fournir des valeurs par défaut

## Tests et Débogage

### Pages de Test Disponibles

1. **Test Minimal** : `/api/settings/test_minimal`
   - Test isolé du système
   - Contrôleurs inline
   - Parfait pour déboguer

2. **Test Complet** : `/api/settings/test_interaction`
   - Test avec l'architecture complète
   - Diagnostic détaillé
   - Console de débogage

### Débogage

1. **Console du Navigateur**
   - Tous les contrôleurs loggent leurs actions
   - Utilisez les logs pour tracer les problèmes

2. **Vérifications Stimulus**
   ```javascript
   // Dans la console du navigateur
   window.application.controllers  // Liste des contrôleurs
   window.BaseSettingsController   // Vérifier la disponibilité
   ```

3. **Test API Direct**
   ```bash
   # Test GET
   curl http://localhost:3000/api/settings/general
   
   # Test POST
   curl -X POST http://localhost:3000/api/settings/general/save \
        -H "Content-Type: application/json" \
        -d '{"auto_mark_solved": true}'
   ```

## Sécurité

### Validation des Données

1. **Côté Client** : Validation de base dans `gatherSettings()`
2. **Côté Serveur** : Validation complète dans les routes Flask
3. **Sanitisation** : Nettoyage des données avant stockage

### Permissions

1. Les settings sont globaux à l'application
2. Pas de permissions par utilisateur actuellement
3. Accès via routes API protégées par Flask

## Exemples Concrets

### Paramètre Simple (Booléen)

```javascript
// Dans gatherSettings()
enable_feature: this.hasEnableFeatureTarget ? this.enableFeatureTarget.checked : false

// Dans updateUI()
if (this.hasEnableFeatureTarget) {
    this.enableFeatureTarget.checked = settings.enable_feature !== false;
}
```

### Paramètre Complexe (Select)

```javascript
// Dans gatherSettings()
extraction_method: this.hasExtractionMethodTarget ? this.extractionMethodTarget.value : 'default'

// Dans updateUI()
if (this.hasExtractionMethodTarget) {
    this.extractionMethodTarget.value = settings.extraction_method || 'default';
}
```

### Validation Personnalisée

```javascript
gatherSettings() {
    const settings = {
        port: this.hasPortTarget ? parseInt(this.portTarget.value) : 3000
    };
    
    // Validation
    if (settings.port < 1 || settings.port > 65535) {
        this.showNotification('Port invalide (1-65535)', 'error');
        return null; // Empêche la sauvegarde
    }
    
    return settings;
}
```

## Roadmap et Améliorations

### Fonctionnalités Prévues

1. **Permissions** : Système de permissions par rôle
2. **Catégories** : Organisation hiérarchique des paramètres
3. **Import/Export** : Sauvegarde et restauration des configurations
4. **Versioning** : Historique des modifications
5. **Validation** : Schémas de validation JSON

### Optimisations

1. **Lazy Loading** : Chargement à la demande des contrôleurs
2. **WebSockets** : Synchronisation temps réel
3. **Offline** : Support hors ligne avec synchronisation
4. **Compression** : Optimisation des payloads API

---

*Cette documentation est maintenue à jour avec le développement du système. Pour des questions spécifiques, consultez le code source ou les tests.* 