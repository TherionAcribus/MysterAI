# MysteryAI - Assistant Intelligent pour Géocaches

## Description

MysteryAI est une application de bureau moderne conçue pour aider à la résolution de géocaches mystères. Elle combine une interface utilisateur intuitive avec des outils puissants d'analyse et de résolution.

## Fonctionnalités Principales

- **Gestion des Géocaches**
  - Import depuis Geocaching.com
  - Organisation par zones
  - Waypoints additionnels
  - Notes et annotations

- **Système de Notes**
  - Types de notes personnalisables
  - Interface moderne avec HTMX
  - Organisation claire des informations
  - Édition et suppression faciles

- **Gestion des Images**
  - Éditeur d'image intégré
  - Historique des modifications
  - Organisation par géocache

- **Plugins**
  - Outils de résolution
  - Analyseurs de texte
  - Convertisseurs de coordonnées

## Installation

### Prérequis

- Python 3.8+
- Node.js 14+
- SQLite 3

### Installation des Dépendances

```bash
# Backend
pip install -r requirements.txt

# Frontend
npm install
```

### Configuration

1. Copier `.env.example` vers `.env`
2. Configurer les variables d'environnement
3. Initialiser la base de données :
   ```bash
   flask db upgrade
   ```

## Utilisation

### Démarrage

```bash
# Mode développement
npm run dev

# Mode production
npm run start
```

### Interface

1. **Géocaches**
   - Liste à gauche
   - Détails au centre
   - Notes en bas

2. **Notes**
   - Cliquer sur "+" pour ajouter
   - Types : personnelle, système, indice, spoiler
   - Édition en temps réel

3. **Images**
   - Glisser-déposer pour importer
   - Double-clic pour éditer
   - Menu contextuel pour les options

## Documentation

Documentation détaillée disponible dans le dossier `docs/` :

- [Architecture](docs/architecture.md)
- [Notes](docs/notes.md)
- [Images](docs/images.md)
- [Plugins](docs/plugins.md)

## Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## Licence

Distribué sous la licence MIT. Voir `LICENSE` pour plus d'informations.

## Contact

Créé par [Votre Nom] - [votre.email@example.com]
