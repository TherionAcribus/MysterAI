Documentation : Création d’un plugin compatible
Sommaire
Introduction
Structure du répertoire du plugin
Fichier plugin.json
Fichier Python d’entrée (main.py)
Fonctionnement général du plugin Python
Exemple complet
Bonnes pratiques
Introduction
Le système de PluginManager permet de découvrir, charger et exécuter des plug-ins de manière dynamique. Chaque plug-in doit :

Posséder un fichier manifeste (plugin.json) pour être détecté.
Respecter un format et une interface attendus (selon son type : Python, Rust, binaire, etc.).
Cette documentation se concentre sur les plug-ins en Python, qui sont les plus simples à mettre en place.

Remarque : Les plug-ins Rust, binaire ou WASM suivent la même logique de découverte (plugin.json), mais leur exécution se fait via un wrapper spécifique (ex. BinaryPluginWrapper).

Structure du répertoire du plugin
Chaque plugin doit être dans un répertoire dédié, par exemple :

css
Copier le code
plugins/
  └─ votre_plugin/
      ├─ plugin.json
      └─ main.py
Nom du répertoire : généralement identique au nom du plugin (ex. caesar_code).
plugin.json : manifeste décrivant le plugin (nom, version, etc.).
main.py : fichier d’entrée principal (pour un plugin Python) contenant la classe ou la fonction à exécuter.
Si votre plugin requiert plusieurs fichiers Python (ex. utils.py, my_module/, etc.), vous pouvez les inclure dans le même répertoire, tant que l’entrée “officielle” reste celle indiquée dans plugin.json (champ "entry_point": "main.py").

Fichier plugin.json
Le fichier manifeste plugin.json doit obligatoirement contenir les champs suivants :

name : Nom unique du plugin (ex. "caesar_code").
version : Version du plugin (ex. "1.0.0").
description : Brève description (ex. "Plugin de chiffrement et déchiffrement utilisant le code César").
author : Nom ou pseudonyme de l’auteur (ex. "MysterAI").
plugin_type : Type de plugin (ex. "python", "binary", "wasm", "rust").
entry_point : Chemin vers le fichier ou binaire d’entrée (ex. "main.py" pour un plugin Python).
dependencies : Liste des dépendances (peut être vide).
categories : Liste des catégories du plugin (ex. ["Decryption", "Alphabet"]).
input_types : Décrit les variables d'entrées attendues (avec nom et type).
output_types : Décrit les variables de sorties produites (avec nom et type).

Les catégories permettent de classer et organiser les plugins par type de fonctionnalité. Les catégories disponibles sont :
- Decryption : Pour les plugins de déchiffrement
- Encryption : Pour les plugins de chiffrement
- Alphabet : Pour les plugins manipulant des alphabets
- Coordinates : Pour les plugins travaillant avec des coordonnées
- Internet : Pour les plugins utilisant des ressources en ligne
- Logic : Pour les plugins de logique et de raisonnement
- Mathematical : Pour les plugins mathématiques
- Text Processing : Pour les plugins de traitement de texte
- Network : Pour les plugins réseau
- Conversion : Pour les plugins de conversion de données
- Analysis : Pour les plugins d'analyse

Exemple de plugin.json
json
Copier le code
{
  "name": "caesar_code",
  "version": "1.0.0",
  "description": "Plugin de chiffrement et déchiffrement utilisant le code César",
  "author": "MysterAI",
  "plugin_type": "python",
  "entry_point": "main.py",
  "dependencies": [],
  "categories": ["Decryption", "Alphabet"],
  "input_types": {
    "text": "string",
    "shift": "integer",
    "mode": "string"
  },
  "output_types": {
    "encrypted_text": "string",
    "decrypted_text": "string"
  }
}
Note : Les champs input_types et output_types servent à documenter ce que le plugin attend et produit. Ils ne sont pas forcément vérifiés automatiquement par le système, mais permettent à l’IA (ou aux devs) de comprendre comment l’utiliser.

Fichier Python d’entrée (main.py)
Règles de base
Le fichier Python doit contenir la classe ou la (les) fonction(s) principales qui permettent d’exécuter le plugin.
Par convention, on nomme souvent la classe XYZPlugin (ex. CaesarCodePlugin).
Cette classe doit fournir, au minimum, l’une des approches suivantes :
Une méthode execute(inputs: dict) -> dict : point d’entrée générique.
Ou des méthodes spécialisées (ex. encrypt, decrypt) que le wrapper Python saura appeler.
Exemple minimal de classe Python
python
Copier le code
class CaesarCodePlugin:
    """
    Un plugin pour chiffrer/déchiffrer du texte avec le code César.
    """

    def __init__(self):
        self.name = "caesar_code"
        self.description = "Plugin de chiffrement/déchiffrement en César"

    def encrypt(self, text: str, shift: int = 3) -> str:
        """Chiffre le texte avec un décalage positif."""
        # ... (implémentation)

    def decrypt(self, text: str, shift: int = 3) -> str:
        """Déchiffre le texte (décalage négatif)."""
        # ... (implémentation)

    def execute(self, inputs: dict) -> dict:
        """
        Méthode générique : 
        - mode = 'encrypt' ou 'decrypt' 
        - text = texte
        - shift = décalage
        Retourne un dict (clé: "encrypted_text" ou "decrypted_text").
        """
        mode = inputs.get("mode", "encrypt")
        text = inputs.get("text", "")
        shift = inputs.get("shift", 3)

        if mode == "encrypt":
            result = self.encrypt(text, shift)
            return {"encrypted_text": result}
        elif mode == "decrypt":
            result = self.decrypt(text, shift)
            return {"decrypted_text": result}
        else:
            raise ValueError(f"Mode inconnu: {mode}")
Fonctionnement général du plugin Python
Découverte : Le système (PluginManager) va détecter le répertoire du plugin grâce au fichier plugin.json.
Chargement : Étant donné que plugin_type = "python", le manager utilisera un “PythonPluginWrapper” pour :
Importer dynamiquement le module Python (main.py).
Chercher la classe (ex. CaesarCodePlugin).
Instancier cette classe.
Exécution : Lorsque l’application (ou l’IA) souhaite utiliser ce plug-in, elle fera un appel du type :
python
Copier le code
plugin_manager.execute_plugin("caesar_code", {
    "mode": "encrypt",
    "text": "Hello",
    "shift": 3
})
En interne, le système appellera la méthode execute() (ou encrypt()/decrypt(), selon la logique) et obtiendra un dictionnaire de sortie.
Exemple complet
Voici un exemple de répertoire caesar_code :

css
Copier le code
caesar_code/
  ├─ plugin.json
  └─ main.py
plugin.json
json
Copier le code
{
  "name": "caesar_code",
  "version": "1.0.0",
  "description": "Plugin de chiffrement et déchiffrement utilisant le code César",
  "author": "MysterAI",
  "plugin_type": "python",
  "entry_point": "main.py",
  "dependencies": [],
  "categories": ["Decryption", "Alphabet"],
  "input_types": {
    "text": "string",
    "shift": "integer",
    "mode": "string"
  },
  "output_types": {
    "encrypted_text": "string",
    "decrypted_text": "string"
  }
}
main.py
python
Copier le code
class CaesarCodePlugin:
    """
    Un plugin pour chiffrer/déchiffrer du texte avec le code César.
    """

    def __init__(self):
        self.name = "caesar_code"
        self.description = "Plugin de chiffrement/déchiffrement en César"

    def encrypt(self, text: str, shift: int = 3) -> str:
        result = ""
        for char in text:
            if char.isalpha():
                base = 'A' if char.isupper() else 'a'
                result += chr((ord(char) - ord(base) + shift) % 26 + ord(base))
            else:
                result += char
        return result

    def decrypt(self, text: str, shift: int = 3) -> str:
        return self.encrypt(text, -shift)

    def execute(self, inputs: dict) -> dict:
        mode = inputs.get("mode", "encrypt")
        text = inputs.get("text", "")
        shift = inputs.get("shift", 3)

        if mode == "encrypt":
            encrypted = self.encrypt(text, shift)
            return {"encrypted_text": encrypted}
        elif mode == "decrypt":
            decrypted = self.decrypt(text, shift)
            return {"decrypted_text": decrypted}
        else:
            raise ValueError(f"Mode inconnu: {mode}")
Bonnes pratiques
Noms cohérents : Le champ name dans plugin.json doit correspondre au nom du répertoire et éventuellement au nom de la classe.
Respecter les types : Essayez de suivre la description input_types / output_types dans votre plugin.json.
Mise à jour de version : Incrémentez version dans plugin.json quand vous modifiez significativement le plugin.
Gestion des dépendances :
Si votre plugin Python dépend de packages externes, précisez-les dans "dependencies" (ex: "dependencies": ["requests", "numpy"]").
Optionnel : vous pouvez inclure un requirements.txt dans le même répertoire, en plus.
Logs et erreurs :
Si vous rencontrez une erreur dans la méthode execute, levez une exception Python (ValueError, etc.).
Le système (PluginManager) pourra capturer l’erreur et la tracer dans la base de données ou dans des logs.
Tests :
Mettez un petit script de test local (ex: test_plugin.py) pour valider rapidement votre plugin avant de l’insérer dans le système.
Conclusion
Pour créer un plugin compatible avec le système, il suffit de :

Créer un répertoire dédié (nom = nom du plugin).
Écrire un plugin.json conforme (nom, version, type, entry_point, etc.).
Fournir un fichier d’entrée (main.py si plugin_type=python), contenant au moins une classe (<Nom>Plugin) avec une méthode execute() (ou des méthodes spécialisées).
Déposer le répertoire dans le dossier de plugins scanné par le PluginManager.
Une fois découvert, le plugin sera automatiquement référencé en base de données et pourra être chargé puis appelé par l’application ou un Agent IA (via plugin_manager.execute_plugin("votre_plugin", inputs)).




Sortie de plugin

{result : {
        text:
        {text_output: "texte sortie",
        text_input: "texte entrée",
        mode: "encrypt/decrypt/bruteforce/calculation"}
    },
        coordinates:
        {
          exist: true/false,
          certitude: true/false,
          ddm_lat: "lat",
          ddm_lon: "lon",
          ddm: "lat lon",
          source_text: "texte source",
          other_coords_format_value: "autres coordonnées"
          other_coords_format_lat: "lat",
          other_coords_format_lon: "lon",
          other_coords_format: "format des coordonnées",
        }
}