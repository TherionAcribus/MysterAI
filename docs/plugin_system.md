# Système de Plugins MysteryAI

Ce document décrit l'architecture et le fonctionnement du système de plugins de MysteryAI, une application dédiée au géocaching.

## Table des matières
- [Structure des plugins](#structure-des-plugins)
- [Configuration des plugins](#configuration-des-plugins)
- [Développement d'un plugin](#développement-dun-plugin)
- [Interface utilisateur](#interface-utilisateur)
- [API Backend](#api-backend)

## Structure des plugins

Chaque plugin est organisé dans un dossier distinct sous `plugins/official/` avec la structure suivante :

```
plugins/
└── official/
    └── nom_du_plugin/
        ├── plugin.json    # Configuration du plugin
        ├── main.py        # Point d'entrée du plugin
        └── README.md      # Documentation spécifique au plugin
```

## Configuration des plugins

### Le fichier plugin.json

Chaque plugin doit avoir un fichier `plugin.json` qui définit ses métadonnées et son interface. Voici un exemple :

```json
{
  "name": "nom_du_plugin",
  "version": "1.0.0",
  "description": "Description du plugin",
  "author": "Nom de l'auteur",
  "plugin_type": "python",
  "entry_point": "main.py",
  "dependencies": [],
  "categories": ["CategoryName"],
  "input_types": {
    "text": {
      "type": "string",
      "label": "Texte à traiter",
      "placeholder": "Entrez le texte ici..."
    },
    "mode": {
      "type": "select",
      "label": "Mode",
      "options": ["decode", "encode"],
      "default": "decode"
    }
  },
  "output_types": {
    "result": {
      "type": "string",
      "label": "Résultat"
    }
  }
}
```

### Types d'entrées supportés

- `string`: Champ texte simple
  ```json
  {
    "type": "string",
    "label": "Label du champ",
    "placeholder": "Texte d'aide (optionnel)",
    "default": "Valeur par défaut (optionnel)"
  }
  ```

- `select`: Liste déroulante
  ```json
  {
    "type": "select",
    "label": "Label du champ",
    "options": ["option1", "option2", "option3"],
    "default": "option1"
  }
  ```

- `number`: Champ numérique
  ```json
  {
    "type": "number",
    "label": "Label du champ",
    "min": 0,
    "max": 100,
    "step": 1,
    "default": 0
  }
  ```

## Développement d'un plugin

### Structure de base d'un plugin Python

```python
def execute(inputs):
    """
    Fonction principale du plugin.
    
    Args:
        inputs (dict): Dictionnaire contenant les entrées du plugin
                      selon la configuration dans plugin.json
                      
    Returns:
        dict: Dictionnaire contenant les sorties selon la configuration
              dans plugin.json
    """
    # Traitement des entrées
    text = inputs.get('text', '')
    mode = inputs.get('mode', 'decode')
    
    # Logique du plugin
    result = process_text(text, mode)
    
    # Retour des résultats
    return {
        'result': result
    }
```

## Interface utilisateur

L'interface utilisateur des plugins est générée dynamiquement à partir du fichier `plugin.json`. Elle comprend :

1. **En-tête du plugin**
   - Nom du plugin
   - Version
   - Description
   - Auteur
   - Catégories

2. **Formulaire d'entrée**
   - Champs générés automatiquement selon `input_types`
   - Boutons d'action (Encoder, Décoder, Bruteforce si activé)

3. **Zone de résultat**
   - Affichage des résultats du plugin
   - Indicateur de chargement pendant l'exécution

## API Backend

### Routes

- `GET /api/plugins/<plugin_name>/interface`
  - Charge l'interface du plugin
  - Retourne le HTML généré à partir du template

- `POST /api/plugins/<plugin_name>/execute`
  - Exécute le plugin avec les paramètres fournis
  - Corps de la requête : FormData avec les champs du formulaire
  - Retourne le résultat formaté en HTML

### Gestion des erreurs

Le système gère plusieurs types d'erreurs :
- Plugin non trouvé
- Fichier `plugin.json` manquant ou invalide
- Erreurs d'exécution du plugin
- Paramètres manquants ou invalides

## Exemple d'utilisation

1. Créez un nouveau dossier dans `plugins/official/`
2. Ajoutez un fichier `plugin.json` avec la configuration
3. Créez le fichier Python principal (`main.py`)
4. Implémentez la fonction `execute`
5. Redémarrez l'application pour charger le nouveau plugin

Le plugin sera automatiquement découvert et intégré à l'interface utilisateur.
