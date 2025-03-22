# Système de filtrage et suppression de géocaches

## Vue d'ensemble

Le système de filtrage des géocaches permet aux utilisateurs de filtrer dynamiquement les géocaches affichées dans le tableau principal et de supprimer en masse les géocaches correspondant aux critères de filtrage appliqués.

## Problématique

Lors de l'implémentation du système de filtrage et de suppression des géocaches, plusieurs défis ont été rencontrés :

1. **Limitation des résultats** : La bibliothèque Tabulator pouvait limiter les résultats à un nombre fixe (environ 9) lorsque des filtres étaient appliqués
2. **Incohérence entre affichage et suppression** : Ce qui était affiché à l'écran ne correspondait pas toujours à ce qui allait être supprimé
3. **Performance avec de grands ensembles de données** : Le système devait rester performant même avec un grand nombre de géocaches
4. **Sensibilité à la casse** : Certains filtres comme celui de la taille ("Micro" vs "micro") échouaient à cause de différences de casse
5. **Différence de format entre les valeurs de filtre et les données** : Les valeurs stockées dans la base de données pouvaient avoir un format différent des valeurs attendues par les filtres

## Solution implémentée

### Chargement et stockage des données

```javascript
// Configuration de Tabulator pour charger et stocker toutes les données
ajaxResponse: function(url, params, response) {
    // Stocker les données complètes dans une variable accessible
    window[`allGeocachesData_${tableId}`] = response;
    console.log(`Chargement de ${response.length} géocaches dans le tableau.`);
    return response;
}
```

Toutes les données sont chargées en une seule fois depuis l'API et stockées dans une variable globale accessible. La pagination est désactivée pour garantir que toutes les données sont disponibles simultanément.

### Configuration de Tabulator pour de meilleures performances

```javascript
// Créer une nouvelle instance de Tabulator avec des optimisations
window[`tabulator_${tableId}`] = new Tabulator(`#${tableId}`, {
    pagination: false,       // Désactiver la pagination
    maxHeight: "100%",       // Utiliser toute la hauteur disponible
    virtualDom: true,        // Activer le DOM virtuel pour de meilleures performances
    layoutColumnsOnNewData: false, // Ne pas recalculer la disposition à chaque mise à jour
    // ...autres configurations...
});
```

### Définition des champs avec gestion de la casse

```javascript
// Définition des champs et leurs types
const fieldDefinitions = {
    // ...autres champs...
    size: { 
        type: "categorical", 
        label: "Taille", 
        values: [
            { value: "Micro", label: "Micro" },
            { value: "Small", label: "Petite" },
            { value: "Regular", label: "Normale" },
            { value: "Large", label: "Grande" },
            { value: "Other", label: "Autre" }
        ],
        caseSensitive: false // Indiquer que ce champ doit être comparé sans tenir compte de la casse
    },
    // ...autres champs...
};
```

### Détection automatique des valeurs de taille

```javascript
// Dans la fonction initialComplete
const uniqueSizes = [...new Set(allData.map(row => row.size))].filter(Boolean);
if (uniqueSizes.length > 0) {
    // Remplacer les valeurs prédéfinies par les valeurs réelles trouvées dans les données
    fieldDefinitions.size.values = uniqueSizes.map(size => ({ value: size, label: size }));
    console.log("Tailles uniques trouvées:", uniqueSizes);
}
```

### Gestion de la casse dans le système de filtrage

```javascript
// Pour les champs insensibles à la casse, convertir en minuscules
if (fieldDef?.caseSensitive === false) {
    dataValue = typeof dataValue === 'string' ? dataValue.toLowerCase() : dataValue;
    comparisonValue = typeof comparisonValue === 'string' ? comparisonValue.toLowerCase() : comparisonValue;
}
```

### Traitement spécial pour l'opérateur "in" avec insensibilité à la casse

```javascript
// Pour les opérateurs "in" (parmi)
if (Array.isArray(comparisonValue)) {
    if (fieldDef?.caseSensitive === false && typeof dataValue === 'string') {
        // Cas insensible à la casse, convertir toutes les valeurs en minuscules
        const lowerCaseValues = comparisonValue.map(v => typeof v === 'string' ? v.toLowerCase() : v.toString().toLowerCase());
        matchesAllFilters = lowerCaseValues.includes(dataValue);
    } else {
        // Cas normal, convertir en strings pour la comparaison si nécessaire
        const stringComparisonValues = comparisonValue.map(v => v.toString());
        matchesAllFilters = stringComparisonValues.includes(dataValue.toString());
    }
} else {
    matchesAllFilters = dataValue.toString() === comparisonValue.toString();
}
```

### Système de filtrage unifié pour l'affichage et la suppression

Pour assurer la cohérence entre l'affichage et la suppression, nous utilisons le même algorithme de filtrage dans les deux contextes. Le système de filtrage comprend maintenant les étapes suivantes :

1. **Récupération des données complètes** depuis la variable globale
2. **Application des filtres simples** (texte, statut, type)
3. **Application des filtres avancés** avec gestion de la casse lorsque nécessaire
4. **Conversion des types** pour assurer des comparaisons correctes
5. **Application des opérateurs logiques** (eq, neq, gt, lt, in, etc.)

```javascript
// Fonction de filtrage commune (extraite pour plus de clarté)
function filterData(data, textFilter, statusValue, typeValue, activeFiltersList, fieldDefinitions) {
    let matchesAllFilters = true;
    
    // Filtre textuel
    if (textFilter) {
        const textMatch = (
            (data.gc_code && data.gc_code.toLowerCase().includes(textFilter)) ||
            (data.name && data.name.toLowerCase().includes(textFilter)) ||
            (data.cache_type && data.cache_type.toLowerCase().includes(textFilter))
        );
        if (!textMatch) matchesAllFilters = false;
    }
    
    // Filtre de statut
    if (statusValue && matchesAllFilters) {
        const statusMatch = data.solved === statusValue;
        if (!statusMatch) matchesAllFilters = false;
    }
    
    // Filtre de type
    if (typeValue && matchesAllFilters) {
        const typeMatch = data.cache_type === typeValue;
        if (!typeMatch) matchesAllFilters = false;
    }
    
    // Filtres avancés
    for (const filter of activeFiltersList) {
        if (!matchesAllFilters) break;
        
        const fieldValue = data[filter.field];
        const filterValue = filter.value;
        const fieldDef = fieldDefinitions[filter.field];
        
        // Vérification et préparation des valeurs...
        
        // Gestion de la casse
        if (fieldDef?.caseSensitive === false) {
            dataValue = typeof dataValue === 'string' ? dataValue.toLowerCase() : dataValue;
            comparisonValue = typeof comparisonValue === 'string' ? comparisonValue.toLowerCase() : comparisonValue;
        }
        
        // Application de l'opérateur approprié...
    }
    
    return matchesAllFilters;
}
```

### Filtrage pour l'affichage

```javascript
// Appliquer le filtre pour l'affichage
table.setFilter(function(data) {
    // Utiliser l'algorithme commun
    return filterData(data, textFilter, statusValue, typeValue, activeFiltersList, fieldDefinitions);
});
```

### Sélection pour suppression

```javascript
// Utiliser notre propre logique de filtrage pour la suppression
const allData = window[`allGeocachesData_${tableId}`] || table.getData();

// Appliquer manuellement le filtre sur toutes les données
const geocachesToDelete = allData.filter(function(data) {
    // Utiliser le même algorithme que pour l'affichage
    return filterData(data, textFilter, statusValue, typeValue, activeFiltersList, fieldDefinitions);
});

// Stocker les géocaches pour la suppression
selectedGeocaches = geocachesToDelete;
```

### Diagnostic et auto-correction

```javascript
// Vérification et diagnostic après filtrage
setTimeout(() => {
    const visibleRows = table.getRows("visible");
    console.log(`Après filtrage avancé: ${visibleRows.length} géocaches visibles`);
    
    // Log des filtres actifs pour diagnostic
    console.log("Filtres actifs:", activeFiltersList);
    
    // Vérification manuelle pour le débogage
    if (visibleRows.length === 0 && activeFiltersList.length > 0) {
        console.log("Aucun résultat trouvé. Vérification manuelle des correspondances...");
        
        // Vérifier manuellement combien d'éléments correspondent aux critères
        const matches = allData.filter(item => {
            // ...logique de filtrage manuel pour diagnostiquer les problèmes
        });
        
        console.log(`Vérification manuelle: ${matches.length} correspondances trouvées.`);
    }
}, 100);
```

## Utilisation des filtres

### Interface utilisateur

L'interface de filtrage se compose de trois types d'éléments :

1. **Champ de recherche textuelle** : Permet de filtrer par code GC, nom ou type de géocache
2. **Sélecteurs simples** : Permet de filtrer les géocaches par statut et type
3. **Système de filtres avancés** : Interface interactive pour créer des filtres complexes avec différents opérateurs

### Filtres avancés

Les filtres avancés permettent de créer des critères de recherche précis :

```javascript
// Définitions des opérateurs par type de champ
const operatorsByFieldType = {
    numeric: [
        { value: "eq", label: "Égal à" },
        { value: "neq", label: "Différent de" },
        { value: "gt", label: "Supérieur à" },
        { value: "gte", label: "Supérieur ou égal à" },
        { value: "lt", label: "Inférieur à" },
        { value: "lte", label: "Inférieur ou égal à" }
    ],
    categorical: [
        { value: "eq", label: "Égal à" },
        { value: "neq", label: "Différent de" },
        { value: "in", label: "Parmi" }
    ]
};
```

### Application des filtres

Les filtres s'appliquent en temps réel à chaque modification :

```javascript
// Gestionnaires d'événements pour les filtres
tableFilter.addEventListener('input', filterTable);
statusFilter.addEventListener('change', filterTable);
typeFilter.addEventListener('change', filterTable);
```

### Suppression des géocaches filtrées

Le processus de suppression en masse comprend les étapes suivantes :

1. L'utilisateur applique les filtres souhaités
2. Il clique sur le bouton "Supprimer les géocaches filtrées"
3. Une modale de confirmation s'affiche, indiquant le nombre de géocaches qui seront supprimées
4. Le système utilise la même logique de filtrage que pour l'affichage pour déterminer quelles géocaches supprimer
5. Après confirmation, toutes les géocaches filtrées sont supprimées séquentiellement

### Conservation des géocaches filtrées

À l'inverse de la suppression des géocaches filtrées, cette fonctionnalité permet de conserver uniquement les géocaches correspondant aux filtres actuels:

1. L'utilisateur applique les filtres souhaités
2. Il clique sur le bouton "Conserver uniquement les filtrées"
3. Une modale de confirmation s'affiche, indiquant le nombre de géocaches qui seront supprimées (toutes celles qui ne correspondent pas aux filtres)
4. Le système utilise la même logique de filtrage pour déterminer quelles géocaches conserver et lesquelles supprimer
5. Après confirmation, toutes les géocaches qui ne correspondent pas aux filtres actuels sont supprimées

Cette fonctionnalité est particulièrement utile pour "nettoyer" une zone en ne gardant que les géocaches qui répondent à certains critères.

## Avantages du système

- **Cohérence totale** entre ce qui est affiché et ce qui sera supprimé
- **Aucune limitation** sur le nombre de géocaches affichées ou supprimées
- **Filtrage intuitif** avec application en temps réel des critères
- **Performances optimisées** même avec de grands jeux de données
- **Système d'auto-diagnostic** qui détecte et corrige les incohérences
- **Insensibilité à la casse** pour les champs où cela est pertinent (comme la taille)
- **Détection automatique des valeurs** pour certains filtres comme la taille
- **Interface utilisateur améliorée** avec filtres avancés facilement manipulables

## Dépannage

En cas de problème avec le filtrage ou la suppression :

1. **Consulter la console du navigateur** (F12) pour voir les logs de diagnostic
2. Vérifier que les nombres affichés dans les logs correspondent :
   - Nombre total de géocaches chargées
   - Nombre de géocaches après filtrage manuel
   - Nombre de géocaches visibles selon Tabulator
3. Si un filtre ne fonctionne pas comme prévu, vérifier :
   - Les valeurs réelles dans les données vs valeurs du filtre (casse, format)
   - Si l'opérateur utilisé est approprié pour le type de données
4. Pour le filtre de taille, vérifier les valeurs uniques détectées dans les logs

## Fichiers concernés

- `templates/geocaches_table.html` : Contient l'implémentation du système de filtrage et de suppression

## Notes techniques

- Le système utilise le stockage global de toutes les données pour contourner les limitations de Tabulator
- L'approche de filtrage manuel garantit que tous les résultats correspondants sont inclus
- Les filtres peuvent être combinés pour une recherche précise
- La propriété `caseSensitive: false` permet d'indiquer quels champs doivent être comparés sans tenir compte de la casse
- La détection automatique des valeurs garantit la cohérence entre les données et les filtres disponibles
