# Système de Plugins MysteryAI

Ce document décrit l'architecture et le fonctionnement du système de plugins de MysteryAI, une application dédiée au géocaching.

## Table des matières
- [Structure des plugins](#structure-des-plugins)
- [Configuration des plugins](#configuration-des-plugins)
- [Développement d'un plugin](#développement-dun-plugin)
- [Format de sortie standardisé](#format-de-sortie-standardisé)
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



## Format de sortie standardisé

Pour assurer une intégration cohérente des plugins dans l'application, un format de sortie standardisé a été défini. Ce format permet de gérer de manière uniforme les résultats, qu'ils proviennent d'un traitement simple ou d'un mode bruteforce avec plusieurs résultats.

### Structure du format de sortie

```json
{
  "status": "success",                // statut global: success, error, partial_success
  "plugin_info": {
    "name": "nom_du_plugin",          // nom du plugin utilisé
    "version": "1.0.0",               // version du plugin
    "execution_time": 123             // temps d'exécution en ms
  },
  "inputs": {                         // paramètres d'entrée utilisés
    "mode": "decode",                 // mode utilisé
    "text": "104106 565398 096015",   // texte d'entrée
    "strict": true,                   // autres paramètres utilisés
    "embedded": false
  },
  "results": [                        // tableau des résultats (plusieurs en mode bruteforce)
    {
      "id": "result_1",               // identifiant unique du résultat
      "text_output": "N 49° 36.070 E 005° 21.059", // texte décodé/encodé
      "confidence": 0.95,             // niveau de confiance (0-1)
      "parameters": {                 // paramètres spécifiques utilisés pour ce résultat
        "key": "ABC",                 // par exemple une clé spécifique
        "offset": 3                   // ou un décalage particulier
      },
      "coordinates": {                // coordonnées GPS détectées (si présentes)
        "exist": true,
        "ddm_lat": "N 49° 36.070'",
        "ddm_lon": "E 005° 21.059'",
        "ddm": "N 49° 36.070' E 005° 21.059'",
        "decimal": {
          "latitude": 49.60117,
          "longitude": 5.35098
        }
      },
      "metadata": {                  // données supplémentaires spécifiques au plugin
        "fragments": ["N 49", "36.070", "E 005", "21.059"],
        "is_valid_checksum": true
      }
    }
  ],
  "summary": {                       // résumé global
    "best_result_id": "result_1",    // référence au meilleur résultat
    "total_results": 1,              // nombre total de résultats
    "message": "Coordonnées GPS détectées" // message informatif
  }
}
```

### Champs obligatoires et optionnels

#### Obligatoires
- `status`: État de l'exécution du plugin (`success`, `error`, `partial_success`)
- `plugin_info`: Informations sur le plugin exécuté
- `results`: Tableau contenant au moins un résultat

#### Optionnels
- `inputs`: Paramètres d'entrée ayant servi à générer le résultat
- `summary`: Résumé global des résultats

### Valeurs de confiance

Le champ `confidence` dans chaque résultat permet de classer les résultats par pertinence, en particulier dans le mode bruteforce :

- `1.0`: Confiance maximale (résultat certain)
- `0.7-0.9`: Haute confiance (résultat probable)
- `0.4-0.6`: Confiance moyenne (résultat possible)
- `< 0.4`: Faible confiance (résultat peu probable)

### Gestion des coordonnées GPS

Chaque résultat peut inclure des coordonnées GPS détectées dans son champ `coordinates`. Ces coordonnées suivent un format standard :

```json
"coordinates": {
  "exist": true,
  "ddm_lat": "N 49° 36.070'",
  "ddm_lon": "E 005° 21.059'",
  "ddm": "N 49° 36.070' E 005° 21.059'",
  "decimal": {
    "latitude": 49.60117,
    "longitude": 5.35098
  }
}
```

Si aucune coordonnée n'est détectée, la structure minimale sera :

```json
"coordinates": {
  "exist": false,
  "ddm_lat": null,
  "ddm_lon": null,
  "ddm": null
}
```

### Exemples

#### Exemple 1: Résultat simple avec coordonnées GPS

```json
{
  "status": "success",
  "plugin_info": {
    "name": "coord_converter",
    "version": "1.0.0",
    "execution_time": 42
  },
  "inputs": {
    "mode": "decode",
    "text": "104106 565398 096015"
  },
  "results": [
    {
      "id": "result_1",
      "text_output": "N 49° 36.070 E 005° 21.059",
      "confidence": 1.0,
      "parameters": {},
      "coordinates": {
        "exist": true,
        "ddm_lat": "N 49° 36.070'",
        "ddm_lon": "E 005° 21.059'",
        "ddm": "N 49° 36.070' E 005° 21.059'",
        "decimal": {
          "latitude": 49.60117,
          "longitude": 5.35098
        }
      },
      "metadata": {}
    }
  ],
  "summary": {
    "best_result_id": "result_1",
    "total_results": 1,
    "message": "Coordonnées GPS détectées"
  }
}
```

#### Exemple 2: Résultats multiples en mode bruteforce

```json
{
  "status": "success",
  "plugin_info": {
    "name": "caesar_cipher",
    "version": "1.2.0",
    "execution_time": 156
  },
  "inputs": {
    "mode": "decode",
    "text": "SBSHFUBQIJF",
    "bruteforce": true
  },
  "results": [
    {
      "id": "result_1",
      "text_output": "CRYPTOGRAPHIE",
      "confidence": 0.85,
      "parameters": {"offset": 13},
      "metadata": {"language": "fr"}
    },
    {
      "id": "result_2",
      "text_output": "QZXBCPZLDWN",
      "confidence": 0.12,
      "parameters": {"offset": 3},
      "metadata": {"language": "unknown"}
    }
  ],
  "summary": {
    "best_result_id": "result_1",
    "total_results": 2,
    "message": "Plusieurs décalages testés, meilleur résultat avec décalage=13"
  }
}
```

### Support de la rétrocompatibilité

Le `PluginManager` assure la rétrocompatibilité en convertissant automatiquement les formats de sortie existants vers le nouveau format standardisé. Les développeurs de plugins sont toutefois encouragés à adopter directement ce nouveau format pour une meilleure intégration.

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

### Affichage des résultats standardisés

L'interface utilisateur a été adaptée pour prendre en charge le nouveau format de sortie standardisé et offre les fonctionnalités suivantes :

1. **Résumé global** 
   - Message récapitulatif (status de l'opération)
   - Nombre total de résultats
   - Temps d'exécution du plugin

2. **Présentation des résultats multiples**
   - Le meilleur résultat est mis en évidence (bordure bleue)
   - Chaque résultat affiche son niveau de confiance avec un code couleur :
     * Vert (≥ 80%) : Confiance élevée
     * Jaune (≥ 50%) : Confiance moyenne
     * Orange (≥ 30%) : Confiance faible
     * Rouge (< 30%) : Confiance très faible

3. **Détails contextuels pour chaque résultat**
   - Paramètres spécifiques utilisés pour générer le résultat
   - Métadonnées fournies par le plugin
   - Coordonnées GPS spécifiques à chaque résultat (si détectées)

4. **Options avancées**
   - Visualisation du format JSON brut
   - Édition dynamique des résultats
   - Copie des résultats dans le presse-papier

5. **Rétrocompatibilité**
   - Support des plugins qui utilisent encore l'ancien format de résultat

### Exemple d'affichage

Pour un plugin en mode bruteforce qui génère plusieurs résultats, l'interface présentera :

```
Résumé
------
2 résultats générés en mode bruteforce
Temps d'exécution: 156 ms

Résultat 1 (Meilleur résultat)
------------------------------
Confiance: 85%
Texte décodé: CRYPTOGRAPHIE

Paramètres utilisés:
- offset: 13
- output_format: standard

Résultat 2
----------
Confiance: 12%
Texte décodé: QZXBCPZLDWN

Paramètres utilisés:
- offset: 3
- output_format: standard
```

## API Backend

### Routes

- `GET /api/plugins/<plugin_name>/interface`
  - Charge l'interface du plugin
  - Retourne le HTML généré à partir du template

- `POST /api/plugins/<plugin_name>/execute`
  - Exécute le plugin avec les paramètres fournis
  - Corps de la requête : FormData avec les champs du formulaire
  - Retourne le résultat au format JSON standardisé

### Gestion des erreurs

Le système gère plusieurs types d'erreurs :
- Plugin non trouvé
- Fichier `plugin.json` manquant ou invalide
- Erreurs d'exécution du plugin
- Paramètres manquants ou invalides

### Format de réponse API

L'API renvoie désormais les résultats au format JSON standardisé décrit dans la section [Format de sortie standardisé](#format-de-sortie-standardisé).

## Exemple d'utilisation

1. Créez un nouveau dossier dans `plugins/official/`
2. Ajoutez un fichier `plugin.json` avec la configuration
3. Créez le fichier Python principal (`main.py`)
4. Implémentez la fonction `execute` avec le nouveau format de sortie standardisé
5. Redémarrez l'application pour charger le nouveau plugin

Le plugin sera automatiquement découvert et intégré à l'interface utilisateur.