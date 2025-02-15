# Documentation : Système d'Alphabets

## Introduction
Le système d'Alphabets permet d'ajouter et de gérer différents types d'alphabets ou systèmes de symboles utilisés dans les géocaches. Il supporte deux types principaux d'alphabets :
- Les alphabets basés sur des images (ex: Hexahue)
- Les alphabets basés sur des polices de caractères (ex: Braille)

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
  "alphabetConfig": {
    "type": "images",           // ou "font"
    "imageFormat": "png",       // Pour type="images"
    "imageDir": "images",       // Dossier des images
    "fontFile": "fonts/xx.ttf", // Pour type="font"
    "hasUpperCase": false,
    "characters": {
      "letters": "all",         // Utilise tout l'alphabet (a-z)
      // OU
      "letters": ["a", "b", "c"], // Liste spécifique de lettres
      
      "numbers": "all",         // Utilise tous les chiffres (0-9)
      // OU
      "numbers": ["1", "2", "3"], // Liste spécifique de chiffres
      
      "special": {              // Caractères spéciaux (optionnel)
        ".": "point",
        ",": "virgule"
      }
    }
  }
}
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

Les caractères sont organisés en sections :
- Lettres
- Chiffres
- Caractères spéciaux

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
