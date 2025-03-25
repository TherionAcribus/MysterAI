# Documentation Technique du Multi-Solver

## Vue d'ensemble

Le Multi-Solver est un composant avancé de l'application MysteryAI qui permet d'appliquer des plugins de résolution simultanément sur plusieurs géocaches. Cette fonctionnalité est particulièrement utile pour les analyses de masse et la résolution de séries de géocaches partageant des mécanismes similaires.

## Architecture

### Structure du composant

Le Multi-Solver est composé de plusieurs éléments fondamentaux :

1. **Interface utilisateur**
   - Panneau HTML/CSS avec Tailwind
   - Sections pliables/dépliables
   - Barre de progression interactive
   
2. **Contrôleur JavaScript**
   - Gestion du chargement des géocaches
   - Sélection et exécution des plugins
   - Traitement des résultats
   
3. **Intégration avec l'API**
   - Communication avec le backend Flask
   - Exécution des plugins sur chaque géocache
   - Récupération des descriptions de géocaches

### Dépendances techniques

- **Framework UI** : Tailwind CSS
- **Framework JS** : Compatible Stimulus (mais fonctionne indépendamment)
- **Intégration** : GoldenLayout pour l'interface modulaire
- **Communication** : Fetch API, postMessage pour les échanges inter-composants

## Flux de données

### Chargement des géocaches

1. Le Multi-Solver reçoit une liste de géocaches via plusieurs méthodes possibles :
   - Attribut `data-geocaches` dans le conteneur HTML
   - Paramètre URL (`geocaches=...`)
   - Événement `geocachesInjected` via GoldenLayout
   - Session Storage (`multiSolverGeocaches`)

2. Le contrôleur initialise l'interface :
   - Affiche le nombre de géocaches dans le badge
   - Prépare la liste pliable des géocaches
   - Stocke les données pour le traitement ultérieur

### Sélection et exécution des plugins

1. Chargement des plugins disponibles via l'API
   - Filtrage par catégorie `solver`
   - Affichage dans une liste avec recherche
   
2. Sélection d'un plugin
   - Chargement de l'interface du plugin via API
   - Masquage des boutons d'exécution du template original
   - Mise à jour du bouton principal d'exécution
   
3. Exécution du plugin sur toutes les géocaches
   - Initialisation de la barre de progression
   - Récupération du texte de chaque géocache
   - Appel API pour exécuter le plugin
   - Ajout progressif des résultats au tableau

### Gestion des résultats

1. Affichage progressif des résultats
   - Animation d'apparition des nouvelles entrées
   - Coloration selon type (erreur, annulation, succès)
   
2. Post-traitement des résultats
   - Extraction des coordonnées détectées
   - Formatage des textes de résultat
   - Préparation des actions (visualisation, sauvegarde)

3. Fonctionnalités d'annulation
   - Interruption possible du traitement en cours
   - Feedback visuel de l'annulation
   - Nettoyage propre des ressources

## Intégration des plugins

Le Multi-Solver s'appuie sur le système de plugins de MysteryAI pour fournir des fonctionnalités d'analyse et de résolution.

### Types de plugins compatibles

1. **Plugins de décodage**
   - Déchiffrement de textes (César, Vigenère, etc.)
   - Conversion entre systèmes numériques (binaire, hexadécimal, etc.)
   - Détection de formats spécifiques (Base64, URL encoding, etc.)

2. **Plugins d'extraction de coordonnées**
   - Recherche de patterns de coordonnées géographiques
   - Analyse de textes pour détecter des formats spécifiques
   - Validation et normalisation des coordonnées extraites

3. **Plugins d'analyse linguistique**
   - Détection de langues
   - Analyse de fréquence
   - Recherche de mots-clés ou expressions

### Interface avec les plugins

Le Multi-Solver communique avec les plugins via une API standardisée :

```javascript
// Exemple d'appel de plugin
async function executePlugin(geocache, pluginName, params) {
    try {
        const response = await fetch('/api/plugins/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                plugin_name: pluginName,
                text: geocache.text,
                parameters: params
            })
        });
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Erreur lors de l'exécution du plugin ${pluginName}:`, error);
        return { 
            error: true, 
            message: `Erreur: ${error.message}` 
        };
    }
}
```

### Cycle de vie d'un plugin dans le Multi-Solver

1. **Découverte** : Le plugin est chargé depuis le registre de plugins
2. **Configuration** : L'interface utilisateur du plugin est présentée pour paramétrage
3. **Exécution** : Le plugin est exécuté sur chaque géocache sélectionnée
4. **Présentation** : Les résultats sont formatés et affichés dans le tableau

### Développement de plugins personnalisés

Pour être compatible avec le Multi-Solver, un plugin doit :

1. Être enregistré dans la catégorie `solver`
2. Implémenter l'interface standard :
   - Méthode `execute(text, params)` retournant un résultat structuré
   - Template HTML avec formulaire de configuration
   - Descripteurs pour le registre (nom, description, version)

3. Gérer correctement les erreurs et retourner des formats de résultat normalisés

## Implémentation technique

### Initialisation du composant

```javascript
// Initialisation du Multi-Solver
function initialize() {
    // Chargement des géocaches
    loadGeocachesFromUrl();
    
    // Configuration des plugins
    const pluginContainer = document.getElementById('plugin-list-container');
    if (pluginContainer) {
        fetchPluginsManually(pluginContainer);
    }
}
```

### Cycle de vie du composant

1. **Chargement** : Détection et chargement des géocaches, initialisation de l'interface.
2. **Interaction** : Sélection des plugins, configuration des paramètres.
3. **Exécution** : Traitement séquentiel des géocaches avec mise à jour en temps réel.
4. **Résultats** : Affichage progressif, actions possibles sur chaque résultat.

### Mécanismes de traitement parallèle

Le Multi-Solver traite les géocaches de manière séquentielle, mais l'affichage des résultats est progressif et asynchrone :

```javascript
// Traitement séquentiel avec affichage progressif
for (let i = 0; i < geocaches.length; i++) {
    // Vérification d'annulation possible
    if (window.processing.cancelRequested) {
        // Gestion de l'annulation
        break;
    }
    
    // Mise à jour de la progression
    updateProgress(i, geocaches.length);
    
    // Traitement de la géocache courante
    const result = await processGeocache(geocaches[i], pluginName);
    
    // Ajout immédiat au tableau de résultats
    addResultToTable(result);
}
```

### Gestion d'erreurs

Le Multi-Solver implémente une gestion d'erreurs robuste :

1. **Détection des erreurs**
   - Par géocache (erreurs individuelles)
   - Globales (erreurs de communication, plugin invalide)
   
2. **Affichage des erreurs**
   - Messages contextuels dans l'interface
   - Coloration des lignes d'erreur en rouge
   - Logs détaillés dans la console

3. **Récupération après erreur**
   - Poursuite du traitement malgré les erreurs individuelles
   - Nettoyage des ressources en cas d'erreur critique

## Interface utilisateur

### Structure de l'interface

L'interface du Multi-Solver est divisée en plusieurs sections :

1. **En-tête** : Titre et description du composant
2. **Liste des géocaches** : Section pliable avec compteur
3. **Sélection de plugin** : Recherche et liste des plugins disponibles
4. **Options d'exécution** : Paramètres et bouton d'exécution
5. **Tableau des résultats** : Affichage avec barre de progression

### Barre de progression

La barre de progression fournit des informations en temps réel sur l'état du traitement :

- Pourcentage de complétion visuel
- Compteur numérique (X/Y géocaches)
- Bouton d'annulation pour interrompre le traitement

### Interactions avancées

- **Pliage/dépliage** de sections pour optimiser l'espace
- **Filtrage** des plugins par recherche textuelle
- **Animations** d'apparition des résultats
- **Annulation** des traitements longs
- **Actions contextuelles** sur les résultats (visualisation, sauvegarde)

## Communication avec les autres composants

### Réception des géocaches

```javascript
// Réception via événement
document.addEventListener('geocachesInjected', function(event) {
    if (event.detail && event.detail.geocaches) {
        window.injectedGeocaches = event.detail.geocaches;
        displayGeocachesList(event.detail.geocaches);
    }
});
```

### Ouverture des détails d'une géocache

```javascript
// Communication avec le composant parent
window.openGeocacheDetails = function(geocacheId, gcCode, name) {
    window.parent.postMessage({
        type: 'openGeocacheDetails',
        geocacheId: geocacheId,
        gcCode: gcCode,
        name: name
    }, '*');
};
```

## Optimisations et performances

Le Multi-Solver implémente plusieurs optimisations pour garantir des performances optimales même avec un grand nombre de géocaches :

1. **Chargement différé** des interfaces de plugins
2. **Recherche côté client** pour filtrer les plugins
3. **Affichage progressif** des résultats sans bloquer l'UI
4. **Mise en cache** des données dans sessionStorage
5. **Animation optimisée** avec transitions CSS

## Considérations de sécurité

- Validation des données côté client et serveur
- Protection contre les injections dans les résultats
- Gestion sécurisée des requêtes API

## Extension et personnalisation

Le Multi-Solver a été conçu pour être extensible :

1. **Plugins personnalisés** : Interface standard pour tous les plugins
2. **Thèmes** : Stylisation via classes Tailwind
3. **Actions personnalisées** : Possibilité d'ajouter des boutons d'action sur les résultats

## Bonnes pratiques d'utilisation

### Conseils pour les utilisateurs

1. **Sélection des géocaches** : Limiter à des ensembles cohérents (même série, même type)
2. **Choix des plugins** : Utiliser des plugins adaptés au type d'énigme
3. **Traitement des résultats** : Vérifier les détections avant de sauvegarder les coordonnées
4. **Annulation** : Ne pas hésiter à annuler un traitement trop long ou incorrect

### Conseils pour les développeurs

1. **Création de plugins** : Suivre l'interface standard
2. **Extension du Multi-Solver** : Utiliser les points d'extension documentés
3. **Débogage** : Utiliser les logs détaillés disponibles dans la console

## Résolution de problèmes

### Problèmes connus

1. **Compteur de géocaches à zéro**
   - Solution : Mécanisme de détection multisource implémenté
   - Dernier recours : Valeur en dur de 197 si nécessaire

2. **Boutons d'exécution dupliqués**
   - Solution : Paramètre `hide_buttons=true` lors du chargement des interfaces de plugins

3. **Plugin non chargé**
   - Solution : Mécanisme de secours pour le chargement direct

### Débogage

Logs détaillés avec code couleur dans la console du navigateur :

- Rouge : Erreurs et problèmes critiques
- Orange : Avertissements et informations de débogage
- Vert : Opérations réussies
- Bleu : Informations sur les données
- Violet : Opérations de plugin

## Évolutions futures

Plusieurs améliorations sont envisagées pour les futures versions :

1. **Traitement parallèle** des géocaches pour améliorer les performances
2. **Sauvegarde automatique** des résultats dans la base de données
3. **Historique des exécutions** pour suivre les analyses précédentes
4. **Export des résultats** au format CSV/Excel
5. **Vue cartographique** des résultats avec coordonnées détectées
6. **Chaînage de plugins** pour des analyses multi-étapes 