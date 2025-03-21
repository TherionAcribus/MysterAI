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
class MyPlugin:
    def __init__(self):
        self.name = "my_plugin"
        self.description = "Description of the plugin"
        
    def check_code(self, text: str, strict: bool = False, allowed_chars=None, embedded: bool = False) -> dict:
        """
        Vérifie si le texte contient du code valide selon les paramètres spécifiés.
        
        Args:
            text: Texte à analyser
            strict: Mode strict (True) ou smooth (False)
            allowed_chars: Liste de caractères autorisés en plus des caractères du code
            embedded: True si le texte peut contenir du code intégré, False si tout le texte doit être du code
            
        Returns:
            Un dictionnaire contenant:
            - is_match: True si du code valide a été trouvé
            - fragments: Liste des fragments de code trouvés
            - score: Score de confiance (0.0 à 1.0)
        """
        # Implémentation de la vérification du code
        pass
        
    def decode_fragments(self, text: str, fragments: list) -> str:
        """
        Décode uniquement les fragments valides dans leur contexte original.
        
        Args:
            text: Texte original contenant les fragments
            fragments: Liste des fragments à décoder
            
        Returns:
            Texte avec les fragments décodés
        """
        # Implémentation du décodage des fragments
        pass
        
    def encode(self, text: str) -> str:
        """
        Encode le texte selon l'algorithme du plugin.
        
        Args:
            text: Texte à encoder
            
        Returns:
            Texte encodé
        """
        # Implémentation de l'encodage
        pass
        
    def decode(self, text: str) -> str:
        """
        Décode le texte selon l'algorithme du plugin.
        
        Args:
            text: Texte à décoder
            
        Returns:
            Texte décodé
        """
        # Implémentation du décodage
        pass
        
    def execute(self, inputs: dict) -> dict:
        """
        Point d'entrée principal du plugin.
        
        Args:
            inputs: Dictionnaire contenant les paramètres d'entrée
                - mode: "encode", "decode" ou "detect"
                - text: Texte à traiter
                - strict: "strict" ou "smooth" pour le mode de décodage
                - allowed_chars: Liste de caractères autorisés
                - embedded: True si le texte peut contenir du code intégré
                
        Returns:
            Dictionnaire contenant le résultat de l'opération
        """
        mode = inputs.get("mode", "encode").lower()
        text = inputs.get("text", "")
        strict_mode = inputs.get("strict", "").lower() == "strict"
        allowed_chars = inputs.get("allowed_chars", None)
        embedded = inputs.get("embedded", False)
        
        # Logique du plugin selon le mode
        if mode == "encode":
            result = self.encode(text)
            return {
                "result": {
                    "text": {
                        "text_output": result,
                        "text_input": text,
                        "mode": mode
                    }
                }
            }
        elif mode == "decode":
            # Logique de décodage selon les paramètres
            pass
        elif mode == "detect":
            # Logique de détection selon les paramètres
            pass
        else:
            return {"error": f"Mode inconnu : {mode}"}
```


## Modes de fonctionnement

### Paramètres de traitement

Les plugins de MysteryAI supportent plusieurs modes et paramètres pour répondre aux besoins spécifiques du géocaching :

1. **Mode principal (mode):**

encode: Convertit un texte normal en format encodé
decode: Convertit un texte encodé en texte normal
detect: Analyse un texte pour détecter la présence possible de code


2. **Mode de décodage (strict):**

strict: Applique des règles strictes de validation (tout le texte doit être du code valide, ou seuls les fragments explicitement valides sont traités)
smooth: Mode plus souple qui tente de décoder des parties de texte même si tout n'est pas parfaitement conforme


3. **Intégration dans le texte (embedded):**

true: Le code peut être intégré dans un texte plus large (ex: "Voici un code: XXX")
false: Le texte entier est considéré comme étant du code


4. **Caractères autorisés (allowed_chars):**

Liste de caractères autorisés en plus des caractères du code (espaces, ponctuation, etc.)
Ces caractères sont ignorés lors de la validation en mode strict



### Comportement attendu

#### Mode DECODE
Texte embedded (intégré dans un autre texte):

Strict: Récupère uniquement les éléments codés
Smooth: Récupère code + caractères spéciaux, mais uniquement si fragments décodés

Texte non embedded:

Strict: Décode uniquement si tout est codé
Smooth: Récupère code + caractères spéciaux, mais uniquement si fragments décodés

#### Mode DETECT
Texte embedded:

Strict: Indique si trouve fragment de texte potentiellement encodé
Smooth: Indique si trouve fragment de texte potentiellement encodé + caractères spéciaux, mais uniquement si fragments décodés

Texte non embedded:

Strict: Indique si tout le texte est potentiellement encodé
Smooth: Indique si tout le texte est potentiellement encodé avec ou sans caractères spéciaux, mais uniquement s'il y a des fragments potentiellement encodés



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
