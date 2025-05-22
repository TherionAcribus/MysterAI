# MysteryAI - Gestionnaire de Géocaches

Application web pour gérer les géocaches, particulièrement adaptée aux Mystery Caches (géocaches nécessitant la résolution d'énigmes).

## Fonctionnalités Principales

### Gestion des Géocaches
- **Ajout de géocaches** par code GC
- **Importation par fichier GPX** (PocketQuery)
- **Visualisation des géocaches** dans un tableau interactif
- **Filtrage avancé** selon de multiples critères
- **Suppression individuelle ou multiple** des géocaches

### Filtrage des Géocaches
Le système de filtrage permet de trouver facilement les géocaches correspondant à des critères spécifiques:

1. **Filtres Simples**
   - Recherche rapide (nom, code GC, type)
   - Filtres par statut et type

2. **Filtres Avancés**
   - Filtres par difficulté/terrain (1-5)
   - Filtres par taille (Micro, Small, Regular, Large, Other)
   - Filtres par nombre de favoris ou logs
   - Opérateurs multiples (égal, supérieur à, parmi, etc.)

3. **Caractéristiques Techniques**
   - Comparaisons insensibles à la casse pour certains champs
   - Détection automatique des valeurs disponibles
   - Interface utilisateur intuitive pour la création et gestion des filtres

### Système de Gestion de Configuration Optimisé
- **Mise en cache intelligente** des paramètres de l'application
- **Organisation par catégories** pour une gestion modulaire
- **Préchargement au démarrage** pour améliorer les performances
- **Support de multiples types de données** (texte, nombres, booléens, JSON)
- **Protection des données sensibles** avec l'indicateur is_secret
- [Documentation détaillée](docs/config_manager.md)

### Suppression Multiple
- Suppression de toutes les géocaches correspondant aux filtres actuellement appliqués
- Conservation des géocaches filtrées uniquement (suppression de toutes les autres)
- Confirmation avec indication claire du nombre de géocaches affectées

### Visualisation Cartographique
- Affichage des géocaches sur une carte interactive
- Navigation facilitée entre les différentes géocaches

## Améliorations Récentes

### Version 1.5.0
- Implémentation d'un système de gestion de configuration avec cache pour améliorer les performances
- Organisation des paramètres par catégories pour une meilleure modularité
- Préchargement des configurations au démarrage de l'application

### Version 1.4.0
- Ajout d'une fonction pour conserver uniquement les géocaches correspondant aux filtres appliqués
- Amélioration des messages de confirmation pour clarifier l'action à entreprendre

### Version 1.3.0
- Correction de la suppression multiple pour ne cibler que les géocaches filtrées
- Amélioration du système de filtrage pour supporter l'insensibilité à la casse
- Correction du filtre par taille pour reconnaître correctement toutes les valeurs
- Détection automatique des valeurs de taille présentes dans les données

## Instructions d'Installation

1. Cloner le dépôt
2. Installer les dépendances: `pip install -r requirements.txt`
3. Configurer la base de données
4. Lancer l'application: `python app.py`

## Développement

### Structure du Code
- Frontend: HTML/CSS/JavaScript avec Tailwind CSS et Tabulator
- Backend: Flask avec SQLAlchemy
- Base de données: SQLite (par défaut)
- Système de configuration: Modèle hybride avec mise en cache

### Documentation Technique
- [Gestion de la configuration](docs/config_manager.md)
- [Système de plugins](docs/plugin_system.md)
- [Intégration GoldenLayout](docs/stimulus_goldenlayout_integration.md)

### Contribution
Les contributions sont les bienvenues! N'hésitez pas à soumettre des pull requests ou à ouvrir des issues pour tout problème rencontré.
