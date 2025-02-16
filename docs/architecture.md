# Architecture de MysteryAI

## Vue d'ensemble

MysteryAI est une application Electron/Flask pour la gestion et la résolution de géocaches. Elle combine une interface utilisateur moderne avec des outils puissants d'analyse et de résolution.

## Architecture Technique

### Backend (Flask)

- **API REST** : Points d'entrée pour toutes les opérations
- **Base de données** : SQLite avec SQLAlchemy
- **Gestion des fichiers** : Stockage local des images et ressources
- **Plugins** : Système modulaire pour les outils de résolution

### Frontend (Electron)

- **Interface utilisateur** : HTML/CSS avec Tailwind CSS
- **Interactivité** : HTMX et Stimulus.js
- **Layout** : GoldenLayout pour les panneaux dynamiques
- **IPC** : Communication sécurisée entre processus

## Composants Principaux

### Géocaches

- Stockage des informations de base
- Gestion des waypoints additionnels
- Système de notes et annotations
- Gestion des images et médias

Voir [geocaches.md](geocaches.md) pour plus de détails.

### Notes

Système complet de gestion des notes pour chaque géocache :
- Types de notes personnalisables
- Interface HTMX pour une expérience fluide
- Stockage relationnel avec les géocaches

Voir [notes.md](notes.md) pour plus de détails.

### Images

- Gestion des images originales et modifiées
- Éditeur d'image intégré
- Stockage local optimisé

Voir [images.md](images.md) pour plus de détails.

### Plugins

- Architecture modulaire
- Chargement dynamique
- Interface standardisée

Voir [plugins.md](plugins.md) pour plus de détails.

## Base de Données

### Tables Principales

- `geocache` : Informations des géocaches
- `note` : Notes et annotations
- `geocache_note` : Association géocaches-notes
- `image` : Gestion des images
- `plugin` : Configuration des plugins

### Relations

```
geocache ─┬─── geocache_note ───┬── note
          ├─── image
          └─── additional_waypoint
```

## Interface Utilisateur

### Composants

- Barre de navigation
- Panneau de géocaches
- Éditeur d'images
- Panneau de notes
- Console de plugins

### Interactions

- Glisser-déposer des panneaux
- Mise à jour en temps réel avec HTMX
- Gestion d'état avec Stimulus

## Sécurité

- Validation des entrées
- Sanitization des données
- Protection contre les injections SQL
- Gestion sécurisée des fichiers

## Performance

- Chargement asynchrone
- Mise en cache des données
- Optimisation des requêtes
- Gestion efficace des ressources

## Développement

### Prérequis

- Python 3.8+
- Node.js 14+
- SQLite 3

### Installation

```bash
# Backend
pip install -r requirements.txt

# Frontend
npm install
```

### Structure des Fichiers

```
MysteryAI/
├── app/
│   ├── models/
│   ├── routes/
│   └── static/
├── docs/
├── plugins/
└── templates/
```
