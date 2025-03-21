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

### Suppression Multiple
- Suppression de toutes les géocaches correspondant aux filtres actuellement appliqués
- Confirmation avec indication claire du nombre de géocaches affectées

### Visualisation Cartographique
- Affichage des géocaches sur une carte interactive
- Navigation facilitée entre les différentes géocaches

## Améliorations Récentes

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

### Contribution
Les contributions sont les bienvenues! N'hésitez pas à soumettre des pull requests ou à ouvrir des issues pour tout problème rencontré.
