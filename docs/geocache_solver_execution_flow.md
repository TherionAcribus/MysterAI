# Flux d'exécution du Geocache Solver

Ce document décrit le parcours complet d'exécution du Geocache Solver, depuis le moment où l'utilisateur clique sur le bouton "Exécuter" jusqu'à l'affichage des résultats.

## 1. Interface Utilisateur et Événements

### 1.1 Déclenchement via le bouton Exécuter

Le processus commence lorsque l'utilisateur clique sur un bouton avec l'attribut `data-action="click->geocache-solver#executePlugin"`. Ce bouton est créé dynamiquement lors du chargement d'un plugin dans l'interface.

### 1.2 Récupération des métadonnées

Le contrôleur Stimulus `GeocacheSolverController` intercepte l'événement et récupère les informations suivantes :
- `pluginId` : Identifiant unique du plugin
- `pluginName` : Nom du plugin à exécuter
- `pluginZoneId` : Identifiant de la zone DOM où se trouve le plugin

## 2. Préparation des données en JavaScript

### 2.1 Récupération et normalisation du texte

Le contrôleur effectue les actions suivantes :
- Recherche le texte à traiter dans diverses sources (par ordre de priorité) :
  1. Textarea du plugin actuel (si disponible et non vide)
  2. Valeur mise en cache (si disponible)
  3. Textarea de la description principale 
  4. Résultat d'un plugin précédent (en cas de chaînage)
- Normalise le texte (suppression des espaces, uniformisation des retours à la ligne)

### 2.2 Préparation de l'affichage des résultats

- Création/récupération d'un conteneur de résultats pour le plugin
- Affichage d'un indicateur de chargement

### 2.3 Collecte des paramètres

- Ajout du texte normalisé au paramètre `text`
- Définition du mode par défaut (`decode`)
- Collecte de tous les champs du formulaire associé au plugin (checkboxes, inputs, selects)

## 3. Appel à l'API du serveur

### 3.1 Requête HTTP

Envoi d'une requête POST à l'endpoint `/api/plugins/{pluginName}/execute` avec :
- Headers : Content-Type: application/json
- Body : Les paramètres collectés au format JSON

## 4. Traitement côté serveur

### 4.1 Réception de la requête par le contrôleur Flask

Le flux côté serveur commence dans la route Flask `execute_plugin(plugin_name)` dans `app/routes/plugins.py` qui :
- Vérifie l'existence et l'état du plugin (actif/inactif)
- Récupère et convertit les inputs selon les types définis dans le `plugin.json`

### 4.2 Appel au Plugin Manager

Après la préparation des données, le contrôleur appelle `plugin_manager.execute_plugin(plugin_name, converted_inputs)` pour exécuter le plugin.

### 4.3 Exécution du plugin dans le Plugin Manager

Dans `app/plugin_manager.py`, la méthode `execute_plugin` :
1. Récupère l'instance du plugin (`get_plugin`)
2. Normalise le texte d'entrée (`_normalize_text`)
3. Supprime les accents si nécessaire (`_remove_accents`) selon la configuration du plugin
4. Exécute le plugin (`plugin.execute(inputs)`) 
5. Recherche le texte décodé dans différents formats de résultat possibles
6. Si la détection GPS est activée, analyse le texte pour y trouver des coordonnées
7. Si le scoring est activé, évalue la qualité et la confiance du résultat

### 4.4 Exécution du plugin spécifique

Le plugin est exécuté via sa méthode `execute()` qui :
- Applique la logique spécifique du plugin (déchiffrement, analyse, etc.)
- Retourne un résultat qui peut avoir différentes structures selon le plugin

### 4.5 Retour et normalisation des résultats

Le contrôleur Flask normalise les résultats pour obtenir un format cohérent, quelle que soit la structure retournée par le plugin.

## 5. Traitement côté client du résultat

### 5.1 Réception et analyse de la réponse

Le contrôleur Stimulus :
- Reçoit la réponse JSON du serveur
- Analyse sa structure pour déterminer le format approprié d'affichage

### 5.2 Affichage des résultats

Selon le format du résultat :
- Si c'est le nouveau format standardisé (tableau `results`), affiche chaque résultat avec son niveau de confiance
- Si ce sont des coordonnées, affiche les coordonnées GPS formatées
- Sinon, affiche le texte décodé dans un format simple

### 5.3 Mise à jour de l'historique et des variables d'état

- Stockage du résultat pour une utilisation future (`lastPluginOutputValue`)
- Ajout du résultat à l'historique des plugins (`pluginsHistoryValue`)
- Affichage de l'historique mis à jour

### 5.4 Ajout des contrôles pour les actions suivantes

- Bouton pour appliquer un nouveau plugin sur le résultat obtenu

## 6. Fonctionnalités avancées

### 6.1 Chaînage de plugins

Le système permet d'enchaîner les plugins, où le résultat d'un plugin devient l'entrée du suivant.

### 6.2 Détection de coordonnées GPS

Le système intègre une détection automatique des coordonnées GPS dans le texte décodé, avec :
- Support de multiples formats (DDM, DMS, formats textuels, etc.)
- Conversion vers différents formats pour l'affichage et l'exploitation

### 6.3 Scoring et évaluation de confiance

Un système de scoring évalue la qualité et la confiance des résultats en analysant :
- La cohérence lexicale du texte décodé
- La présence de termes spécifiques au géocaching
- La présence de coordonnées GPS valides

## 7. Diagramme de séquence simplifié

```
┌──────────┐          ┌───────────────────────┐          ┌─────────────┐          ┌──────────────┐
│Utilisateur│          │GeocacheSolverController│          │API Flask    │          │Plugin Manager│
└─────┬────┘          └───────────┬───────────┘          └──────┬──────┘          └──────┬───────┘
      │                           │                              │                        │
      │ Clic sur Exécuter        │                              │                        │
      │ ──────────────────────► │                              │                        │
      │                           │                              │                        │
      │                           │ Récupère et normalise texte  │                        │
      │                           │ ◄─────────────────────────   │                        │
      │                           │                              │                        │
      │                           │ POST /api/plugins/{name}/execute                      │
      │                           │ ────────────────────────────►│                        │
      │                           │                              │                        │
      │                           │                              │ execute_plugin()       │
      │                           │                              │ ──────────────────────►│
      │                           │                              │                        │
      │                           │                              │                        │ normalize_text()
      │                           │                              │                        │ ◄───────────────
      │                           │                              │                        │
      │                           │                              │                        │ plugin.execute()
      │                           │                              │                        │ ◄───────────────
      │                           │                              │                        │
      │                           │                              │                        │ detect_gps_coordinates()
      │                           │                              │                        │ ◄───────────────────────
      │                           │                              │                        │
      │                           │                              │                        │ score_text()
      │                           │                              │                        │ ◄────────────
      │                           │                              │                        │
      │                           │                              │ Résultat normalisé     │
      │                           │                              │ ◄──────────────────────│
      │                           │                              │                        │
      │                           │ Réponse JSON                 │                        │
      │                           │ ◄────────────────────────────│                        │
      │                           │                              │                        │
      │                           │ Affiche les résultats        │                        │
      │                           │ ◄─────────────────────────   │                        │
      │                           │                              │                        │
      │ Résultats affichés        │                              │                        │
      │ ◄──────────────────────  │                              │                        │
      │                           │                              │                        │
```

## 8. Intégration avec les autres systèmes

Le Geocache Solver interagit avec plusieurs sous-systèmes de l'application :

- **Système de détection de coordonnées GPS** : Analyse le texte décodé pour identifier des coordonnées géographiques.
- **Système de scoring** : Évalue la qualité et la pertinence des résultats décodés.
- **Système de plugins** : Fournit une architecture extensible pour ajouter de nouveaux décodeurs.
- **Interface utilisateur adaptative** : Permet de chaîner les plugins et d'explorer différentes approches de résolution. 