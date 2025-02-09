# Tableau des Géocaches

## Vue d'ensemble

Le tableau des géocaches est un composant interactif qui affiche la liste des géocaches pour une zone donnée. Il est implémenté en utilisant la bibliothèque [Tabulator](http://tabulator.info/) et s'intègre avec GoldenLayout pour la gestion des onglets.

## Fonctionnalités

- Affichage des géocaches avec colonnes triables
- Chargement dynamique des données via AJAX
- Redimensionnement automatique dans l'onglet
- Boutons d'action pour voir les détails de chaque géocache
- Indicateurs visuels pour l'état des géocaches (résolue, non résolue, en cours)

## Structure technique

### Template (`geocaches_table.html`)

Le template contient :
- Un conteneur pour le tableau avec les attributs data nécessaires
- Un script d'initialisation qui configure et crée l'instance Tabulator
- La configuration complète des colonnes et des formateurs

### Colonnes du tableau

1. GC Code - Code unique de la géocache
2. Nom - Nom de la géocache
3. Type - Type de géocache
4. Difficulté - Niveau de difficulté
5. Terrain - Niveau de terrain
6. Taille - Taille du contenant
7. Favoris - Nombre de favoris
8. Logs - Nombre de logs
9. Statut - État de résolution avec indicateurs visuels
10. Actions - Bouton pour voir les détails

### Intégration avec GoldenLayout

Le tableau est chargé dans un composant GoldenLayout qui :
1. Charge le template via une requête fetch
2. Exécute les scripts d'initialisation
3. Gère le redimensionnement automatique du tableau

### Gestion du redimensionnement

Le tableau s'adapte automatiquement à la taille de son conteneur grâce à :
- L'option `layout: "fitDataFill"` de Tabulator
- Un gestionnaire de redimensionnement dans le composant GoldenLayout
- L'exposition de l'instance Tabulator via une variable globale pour le redimensionnement

## Endpoints API

Le tableau utilise l'endpoint `/geocaches/<zone_id>` qui retourne les données au format JSON avec les champs suivants :
- gc_code
- name
- cache_type
- difficulty
- terrain
- size
- favorites_count
- logs_count
- solved
- id

## Personnalisation de l'affichage

### États des géocaches

Les états sont affichés avec des couleurs distinctives :
- ✓ Résolue (vert)
- ✗ Non résolue (rouge)
- ⟳ En cours (jaune)
- - Non défini (gris)

### Bouton d'action

Le bouton "Détails" utilise :
- `window.postMessage` pour la communication avec la fenêtre parente
- Un gestionnaire d'événements dans la fenêtre parente pour ouvrir le panneau de détails dans GoldenLayout
- Classes Tailwind pour le style

La communication entre le tableau et la fenêtre principale se fait via le système de messagerie `postMessage` :
1. Le bouton "Détails" envoie un message de type `openGeocacheDetails` avec l'ID de la géocache
2. La fenêtre principale intercepte ce message et :
   - Charge le contenu HTML des détails via une requête fetch
   - Crée un nouvel onglet dans GoldenLayout avec les détails
   - Affiche le contenu dans le nouvel onglet
