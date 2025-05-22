# Système de Gestion de Configuration avec Cache

## Introduction

Le système de gestion de configuration de MysteryAI permet de stocker, récupérer et gérer efficacement les paramètres de l'application en utilisant un mécanisme de cache pour optimiser les performances. Ce système est conçu pour gérer un grand nombre de paramètres organisés par catégories, tout en minimisant les accès à la base de données.

## Architecture

Le système repose sur deux composants principaux :

1. **AppConfig** - Un modèle SQLAlchemy qui stocke les paramètres dans la base de données.
2. **ConfigManager** - Un gestionnaire qui met en cache les valeurs et offre une interface pour accéder aux paramètres.

Le ConfigManager utilise le pattern Singleton pour garantir qu'une seule instance existe dans l'application, assurant ainsi la cohérence du cache.

## Fonctionnalités Principales

- Mise en cache des paramètres avec expiration configurable
- Chargement par catégorie pour optimiser les requêtes
- Accès individuel ou groupé aux paramètres
- Préchargement au démarrage de l'application
- Rafraîchissement automatique des valeurs périmées

## Utilisation

### Récupérer l'instance du gestionnaire

```python
from app.models.config_manager import ConfigManager

# Récupérer l'instance unique du gestionnaire
config_manager = ConfigManager.get_instance()

# Alternative via le contexte Flask
from flask import current_app
config_manager = current_app.config_manager
```

### Récupérer un paramètre individuel

```python
# Récupération simple avec valeur par défaut
auto_mark_solved = config_manager.get_value('auto_mark_solved', default=True)

# Avec durée de validité du cache personnalisée (en secondes)
api_key = config_manager.get_value('openai_api_key', max_age_seconds=60)
```

### Définir un paramètre

```python
# Définir un paramètre simple
config_manager.set_value('auto_mark_solved', True, category='general')

# Définir un paramètre avec description et catégorie
config_manager.set_value(
    'formula_extraction_method', 
    'ia', 
    category='formula',
    description='Méthode d\'extraction des formules (ia ou regex)'
)

# Définir un paramètre sensible
config_manager.set_value(
    'api_key', 
    'sk-xxxxxxxxxxxxxxxx', 
    category='ai', 
    description='Clé API pour OpenAI',
    is_secret=True
)
```

### Travailler avec des catégories de paramètres

```python
# Charger tous les paramètres d'une catégorie (forcer rafraîchissement depuis la BD)
formula_settings = config_manager.load_category('formula')

# Récupérer tous les paramètres d'une catégorie (utilise le cache si valide)
general_settings = config_manager.get_all_category_values('general')

# Exemple d'utilisation dans une route Flask
@app.route('/api/settings/ai', methods=['GET'])
def get_ai_settings():
    settings = config_manager.get_all_category_values('ai')
    return jsonify({
        'success': True,
        'settings': settings
    })
```

### Vider le cache

```python
# Vider le cache en cas de besoin
config_manager.clear_cache()
```

## Préchargement des paramètres au démarrage

Au démarrage de l'application, les catégories principales de paramètres sont préchargées automatiquement :

```python
# Dans app/__init__.py
with app.app_context():
    # ... autres initialisations ...
    
    # Préchargement des paramètres de l'application
    from app.models.config_manager import ConfigManager
    config_manager = ConfigManager.get_instance()
    
    # Charger les paramètres généraux
    general_settings = config_manager.load_category('general')
    
    # Charger les paramètres formula
    formula_settings = config_manager.load_category('formula')
    
    # Rendre le gestionnaire accessible via l'application
    app.config_manager = config_manager
```

## Types de données supportés

Le système gère automatiquement la conversion des types suivants :

- **str** - Chaînes de caractères (type par défaut)
- **int** - Nombres entiers
- **float** - Nombres à virgule flottante
- **bool** - Booléens (stockés comme 'true'/'false')
- **json** - Structures de données complexes (dictionnaires, listes, etc.)

Exemple avec un paramètre JSON :

```python
# Définir une configuration JSON
config_manager.set_value(
    'ui_preferences',
    {
        'theme': 'dark',
        'font_size': 14,
        'panels': ['map', 'solver', 'list']
    },
    category='ui'
)

# Récupérer la configuration JSON
ui_prefs = config_manager.get_value('ui_preferences')
theme = ui_prefs['theme']  # 'dark'
```

## Bonnes pratiques

1. **Organisez les paramètres par catégories** : Utilisez des catégories cohérentes pour regrouper les paramètres liés.

2. **Utilisez des valeurs par défaut** : Fournissez toujours des valeurs par défaut pertinentes pour vos paramètres.

3. **Ajoutez des descriptions** : Documentez l'utilité de chaque paramètre via le champ description.

4. **Gérez les paramètres sensibles** : Utilisez is_secret=True pour les informations sensibles.

5. **Optimisez les accès** : Préférez get_all_category_values() à de multiples get_value() quand vous avez besoin de plusieurs paramètres d'une même catégorie.

6. **Validez les entrées utilisateur** : Avant d'enregistrer des paramètres provenant de l'interface utilisateur, validez leur format et leurs valeurs.

## Exemple complet d'une route de paramètres

```python
@settings_bp.route('/theme/save', methods=['POST'])
def save_theme_settings():
    try:
        data = request.get_json()
        
        # Valider les données
        if not isinstance(data, dict):
            return jsonify({
                'success': False,
                'error': 'Format de données invalide'
            }), 400
        
        # Récupérer le gestionnaire
        config_manager = ConfigManager.get_instance()
        
        # Enregistrer les paramètres
        config_manager.set_value(
            'theme', 
            data.get('theme', 'light'),
            category='ui',
            description='Thème de l\'interface (light/dark)'
        )
        
        config_manager.set_value(
            'accent_color', 
            data.get('accent_color', '#007bff'),
            category='ui',
            description='Couleur d\'accent de l\'interface'
        )
        
        return jsonify({
            'success': True,
            'message': 'Paramètres du thème enregistrés avec succès'
        })
        
    except Exception as e:
        logger.error(f"=== ERREUR lors de l'enregistrement des paramètres du thème: {str(e)} ===")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
```

## Conclusion

Le système de gestion de configuration avec cache offre une solution performante et flexible pour gérer les paramètres de l'application. En minimisant les accès à la base de données et en organisant les paramètres par catégories, il permet de gérer efficacement un grand nombre de paramètres tout en garantissant une bonne réactivité de l'application.

## Ressources additionnelles

Pour l'utilisation du système de configuration depuis JavaScript (côté frontend), consultez la documentation dédiée :

- [Utilisation du système de configuration depuis JavaScript](config_manager_js_usage.md) 