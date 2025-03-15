# MysteryAI - Documentation Générale

## Vue d'ensemble

MysteryAI est une application de gestion de géocaches qui combine une interface web moderne avec une application de bureau Electron. Elle permet aux utilisateurs de gérer, visualiser et analyser des géocaches avec des fonctionnalités avancées d'intelligence artificielle.

## Architecture

### Structure du Projet

```
MysteryAI/
├── app/
│   ├── routes/           # Routes Flask
│   ├── models/          # Modèles SQLAlchemy
│   ├── utils/           # Utilitaires et helpers
│   └── __init__.py      # Configuration Flask
├── static/
│   ├── css/            # Styles Tailwind
│   ├── js/             # Scripts JavaScript
│   └── vendor/         # Bibliothèques tierces
├── templates/          # Templates Jinja2
├── docs/              # Documentation
└── electron/          # Application Electron
```

### Technologies Utilisées

1. **Backend**
   - Flask (Python) pour l'API REST
   - SQLAlchemy pour l'ORM
   - Jinja2 pour le templating

2. **Frontend**
   - Tailwind CSS pour les styles
   - GoldenLayout pour l'interface à onglets
   - Tabulator pour les tableaux de données
   - HTMX pour les interactions dynamiques

3. **Application Bureau**
   - Electron pour l'application native
   - Node.js pour le runtime

## Configuration

### URLs et Ports

L'application utilise une configuration spéciale pour gérer les URLs dans différents environnements :

```javascript
// Configuration globale des URLs
window.API_BASE_URL = 'http://127.0.0.1:3000';
```

- **Navigateur Web** : Utilise les URLs relatives
- **Electron** : Utilise l'URL complète avec le port 3000

### Environnements

1. **Développement**
   ```bash
   # Backend Flask
   flask run --port 3000

   # Frontend Electron
   cd electron
   npm start
   ```

2. **Production**
   ```bash
   # Construction de l'application
   cd electron
   npm run build
   ```

## Composants Principaux

### 1. Interface Principale

- Utilise GoldenLayout pour une interface modulaire
- Gestion des onglets et des panneaux
- Communication inter-fenêtres via postMessage

### 2. Tableau des Géocaches

- Affichage des géocaches par zone
- Filtrage et tri dynamiques
- Actions rapides (détails, édition)

### 3. Panneau de Détails

- Affichage détaillé des informations
- Intégration dans le même conteneur que le tableau parent
- Support du HTML dans les descriptions

## Communication Inter-Composants

### Messages et Événements

1. **Format des Messages**
   ```javascript
   {
     type: 'openGeocacheDetails',
     geocacheId: id,
     containerId: containerId,
     detailsUrl: `${API_BASE_URL}/geocaches/${id}/details-panel`
   }
   ```

2. **Gestion des Conteneurs**
   - Chaque composant a un ID unique
   - Les composants enfants sont ajoutés au même parent
   - Fallback vers la racine si le parent n'est pas trouvé

### Routing et URLs

1. **Routes API**
   - `/api/zones` : Liste des zones
   - `/geocaches/table/:zoneId` : Tableau des géocaches
   - `/geocaches/:id/details-panel` : Détails d'une géocache

2. **Gestion des URLs**
   ```javascript
   // Construction d'URL pour les requêtes API
   const apiUrl = `${window.API_BASE_URL}/endpoint`;
   ```

## Bonnes Pratiques

### Développement

1. **URLs et Ports**
   - Toujours utiliser `API_BASE_URL` pour les requêtes
   - Éviter les URLs codées en dur
   - Gérer les erreurs de connexion

2. **Interface Utilisateur**
   - Suivre les conventions Tailwind CSS
   - Utiliser les composants réutilisables
   - Maintenir la cohérence visuelle

3. **Documentation**
   - Documenter les nouvelles fonctionnalités
   - Maintenir la documentation à jour
   - Inclure des exemples de code

### Déploiement

1. **Préparation**
   - Vérifier la configuration des URLs
   - Tester dans les deux environnements
   - Valider les dépendances

2. **Tests**
   - Tester les fonctionnalités principales
   - Vérifier la compatibilité Electron
   - Valider les performances

## Contribution

1. **Workflow Git**
   - Créer une branche par fonctionnalité
   - Suivre les conventions de commit
   - Faire des revues de code

2. **Standards de Code**
   - Suivre PEP 8 pour Python
   - Utiliser ESLint pour JavaScript
   - Maintenir la cohérence du style

## Ressources

- [Documentation Flask](https://flask.palletsprojects.com/)
- [Documentation Electron](https://www.electronjs.org/docs)
- [Documentation GoldenLayout](https://golden-layout.com/docs/)
- [Documentation Tailwind CSS](https://tailwindcss.com/docs)
