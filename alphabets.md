# Documentation : Système d'Alphabets

## Introduction
Le système d'Alphabets permet d'ajouter et de gérer différents types d'alphabets ou systèmes de symboles utilisés dans les géocaches. Il supporte deux types principaux d'alphabets :
- Les alphabets basés sur des images (ex: Hexahue)
- Les alphabets basés sur des polices de caractères (ex: Braille)

## Système de Recherche
Le système d'alphabets inclut une fonction de recherche avancée qui permet de trouver rapidement des alphabets selon plusieurs critères :

### Types de recherche
- **Nom & Description** : Recherche dans le nom et la description du JSON (poids élevé)
- **Tags** : Recherche dans les tags définis (poids élevé)
- **Description longue (README)** : Recherche dans le fichier README.md s'il existe (poids faible)
- **Recherche partielle** : Recherche par mots séparés

### Options de recherche
Vous pouvez choisir où effectuer la recherche grâce aux checkboxes :
- ✅ **Nom & Description** (activé par défaut) : Recherche dans le nom et la description courte
- ✅ **Tags** (activé par défaut) : Recherche dans les mots-clés et tags
- ⬜ **Description longue (README)** (désactivé par défaut) : Recherche dans le contenu du fichier README.md

### Utilisation
1. Saisissez votre terme de recherche dans le champ "Rechercher"
2. Sélectionnez les zones de recherche avec les checkboxes
3. La recherche se fait automatiquement avec un délai de 500ms (debounce)
4. Les résultats sont triés par pertinence (score de correspondance)
5. Les correspondances trouvées sont affichées sous chaque alphabet
6. Appuyez sur Entrée pour une recherche immédiate
7. Cliquez sur l'icône ❌ pour effacer la recherche

### Exemples de recherche
- `morse` : Trouve tous les alphabets liés au morse
- `maritime` : Trouve les alphabets de signalisation maritime  
- `danse` : Trouve l'alphabet Ballet grâce aux tags
- `tactile` : Trouve le Braille
- `circle` : Trouve le Morse Circle

## Structure du répertoire
```
alphabets/
  ├── hexahue/                  # Un alphabet par dossier
  │   ├── alphabet.json         # Configuration de l'alphabet
  │   └── images/              # Ressources de l'alphabet
  │       ├── a.png
  │       ├── b.png
  │       └── ...
  └── braille/
      ├── alphabet.json
      └── fonts/
          └── braille.ttf
```

## Configuration d'un alphabet (alphabet.json)
Chaque alphabet doit avoir un fichier `alphabet.json` qui définit sa configuration :

```json
{
  "name": "Nom de l'Alphabet",
  "description": "Description de l'alphabet",
  "type": "alphabet",
  "category": "alphabets",
  "version": "1.0.0",
  "tags": ["tag1", "tag2", "tag3"],                         // Tags pour la recherche
  "sources": [                   // Sources et crédits (optionnel)
    {
      "type": "reference",       // Types: reference, font, credit, author
      "label": "Wikipedia",
      "url": "https://...",
      "author": "@/contributeur",
      "description": "Description de la source"
    }
  ],
  "alphabetConfig": {
    "type": "images",           // ou "font"
    "imageFormat": "png",       // Pour type="images"
    "imageDir": "images",       // Dossier des images
    "lowercaseSuffix": "_min",  // Suffixe optionnel pour les minuscules (par défaut "")
    "uppercaseSuffix": "_maj",  // Suffixe optionnel pour les majuscules (par défaut "")
    "fontFile": "fonts/xx.ttf", // Pour type="font"
    "hasUpperCase": false,
    "characters": {
      "letters": "all",         // Utilise tout l'alphabet (a-z)
      // OU
      "letters": ["a", "b", "c"], // Liste spécifique de lettres
      
      "numbers": "all",         // Utilise tous les chiffres (0-9)
      // OU
      "numbers": ["1", "2", "3"], // Liste spécifique de chiffres
      
      "special": {              // Caractères spéciaux (optionnel) – la valeur est le nom du fichier image sans extension
        ".": "point",        // utilisera images/point.png
        ",": "virgule"       // utilisera images/virgule.png
      }
    }
  }
}
```

### Optimisation pour la recherche

#### Tags
Les tags permettent d'améliorer la découvrabilité des alphabets en incluant des mots-clés pertinents :
```json
"tags": ["morse", "télégraphe", "points", "traits", "radio", "sos"]
```

**Bonnes pratiques pour les tags :**
- Utilisez des termes descriptifs et variés
- Incluez des synonymes et variantes
- Pensez aux contextes d'utilisation (géocaching, thèmes, etc.)
- Évitez la répétition avec le nom et la description
- Incluez des termes techniques et populaires

**Types de tags recommandés :**
- **Thématiques** : maritime, militaire, fantasy, sci-fi
- **Techniques** : tactile, visuel, auditif
- **Historiques** : antique, moderne, médiéval
- **Usage** : géocaching, communication, art

#### Exemples complets

**Alphabet basé sur police (Braille) :**
```json
{
  "name": "Braille",
  "description": "Alphabet Braille standard",
  "tags": ["braille", "aveugle", "tactile", "points", "relief", "accessibilité"],
  "alphabetConfig": {
    "type": "font",
    "fontFile": "fonts/braille.ttf",
    "characters": { "letters": "all", "numbers": "all" }
  }
}
```

**Alphabet basé sur images (Sémaphore) :**
```json
{
  "name": "Sémaphore",
  "description": "Signalisation maritime par drapeaux",
  "tags": ["sémaphore", "maritime", "drapeaux", "signalisation", "navire"],
  "alphabetConfig": {
    "type": "images",
    "imageFormat": "png",
    "imageDir": "images",
    "characters": { "letters": "all", "numbers": "all" }
  }
}
```

### Sources et crédits
Le champ `sources` permet d'ajouter multiple références et crédits :

#### Types de sources supportés :
- `reference` : Documentation, articles, spécifications
- `font` : Sources des polices utilisées
- `credit` : Crédits d'implémentation ou adaptation
- `author` : Auteurs originaux

#### Champs disponibles pour chaque source :
- `type` (requis) : Type de source
- `label` (requis) : Nom affiché de la source
- `url` (optionnel) : Lien vers la ressource
- `author` (optionnel) : Auteur ou contributeur (format @/nom recommandé)
- `description` (optionnel) : Description détaillée

#### Exemples de sources :
```json
"sources": [
  {
    "type": "reference",
    "label": "Wikipedia - Morse",
    "url": "https://fr.wikipedia.org/wiki/Code_Morse",
    "description": "Documentation du code Morse"
  },
  {
    "type": "font",
    "label": "Police Braille",
    "author": "National Institute for the Blind",
    "url": "https://www.brailleinstitute.org/",
    "description": "Police officielle Braille"
  },
  {
    "type": "credit",
    "label": "Adaptation MysteryAI",
    "author": "@/code_39",
    "description": "Implémentation et adaptation pour l'interface"
  }
]
```

### Options de configuration

#### Type d'alphabet
- `type: "images"` : Utilise des images individuelles pour chaque caractère
  - Nécessite `imageFormat` et `imageDir`
  - Les images doivent être nommées selon le caractère (ex: a.png, b.png)
- `type: "font"` : Utilise une police de caractères
  - Nécessite `fontFile`
  - La police doit mapper les caractères aux bons glyphes

#### Caractères supportés
Pour les lettres et les chiffres, deux options sont disponibles :
1. Utiliser tous les caractères :
   ```json
   "letters": "all"    // Génère a-z automatiquement
   "numbers": "all"    // Génère 0-9 automatiquement
   ```
2. Spécifier une liste précise :
   ```json
   "letters": ["a", "b", "c"]
   "numbers": ["1", "2", "3"]
   ```

Les caractères spéciaux doivent toujours être spécifiés individuellement avec leurs labels :
```json
"special": {
  "@": "arobase",
  "#": "dièse"
}
```

## Ajout d'un nouvel alphabet
1. Créez un nouveau dossier dans `alphabets/`
2. Créez le fichier `alphabet.json` avec la configuration appropriée
3. Ajoutez les ressources nécessaires :
   - Pour les images : placez les fichiers dans le dossier spécifié par `imageDir`
   - Pour les polices : placez le fichier dans le dossier spécifié par `fontFile`

## Interface utilisateur
L'interface affiche :
- Une zone de texte pour composer le message
- Une grille de caractères cliquables
- Des boutons utilitaires (espace, retour, effacer)
- **Sources et crédits** (si configurées)

Les caractères sont organisés en sections :
- Lettres
- Chiffres
- Caractères spéciaux

### Affichage des sources
Les sources s'affichent automatiquement en bas de l'interface de visualisation de l'alphabet :
- **Icônes** différentes selon le type de source
- **Liens cliquables** vers les ressources externes
- **Informations d'auteur** avec le format @/nom
- **Descriptions** détaillées pour chaque source

## Développement et maintenance
Le système est conçu pour être facilement extensible :
- Nouveau type d'alphabet : ajouter un type dans `AlphabetConfig`
- Nouvelles fonctionnalités : modifier `AlphabetView.tsx`
- Nouveaux caractères : ajouter dans la configuration JSON

### Fichiers principaux
- `src/types/alphabet.ts` : Types TypeScript
- `src/components/alphabets/AlphabetView.tsx` : Composant d'affichage
- `app/routes/alphabets.py` : Backend Flask

## Bonnes pratiques
1. Utilisez des noms descriptifs pour les alphabets
2. Fournissez des descriptions claires
3. Optimisez les images (taille et format)
4. Testez avec différents caractères
5. Vérifiez la compatibilité des polices

## Futures améliorations possibles
- Support de plus de formats d'images
- Prévisualisation des caractères
- Export/Import de messages
- Recherche de caractères
- Support de caractères composés
- Thèmes visuels personnalisés