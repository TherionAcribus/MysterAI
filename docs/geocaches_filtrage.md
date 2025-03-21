# Système de filtrage et suppression de géocaches

## Vue d'ensemble

Le système de filtrage des géocaches permet aux utilisateurs de filtrer dynamiquement les géocaches affichées dans le tableau principal et de supprimer en masse les géocaches correspondant aux critères de filtrage appliqués.

## Problématique

Lors de l'implémentation du système de filtrage et de suppression des géocaches, plusieurs défis ont été rencontrés :

1. **Limitation des résultats** : La bibliothèque Tabulator pouvait limiter les résultats à un nombre fixe (environ 9) lorsque des filtres étaient appliqués
2. **Incohérence entre affichage et suppression** : Ce qui était affiché à l'écran ne correspondait pas toujours à ce qui allait être supprimé
3. **Performance avec de grands ensembles de données** : Le système devait rester performant même avec un grand nombre de géocaches

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

### Système de filtrage unifié

Pour assurer la cohérence entre l'affichage et la suppression, nous utilisons le même algorithme de filtrage dans les deux contextes :

```javascript
// Fonction de filtrage commune
function filterData(data, textFilter, statusValue, typeValue) {
    let textMatch = true;
    let statusMatch = true;
    let typeMatch = true;
    
    // Filtre textuel (recherche dans le code GC, le nom ou le type)
    if (textFilter) {
        textMatch = (
            (data.gc_code && data.gc_code.toLowerCase().includes(textFilter)) ||
            (data.name && data.name.toLowerCase().includes(textFilter)) ||
            (data.cache_type && data.cache_type.toLowerCase().includes(textFilter))
        );
    }
    
    // Filtre de statut
    if (statusValue) {
        statusMatch = data.solved === statusValue;
    }
    
    // Filtre de type
    if (typeValue) {
        typeMatch = data.cache_type === typeValue;
    }
    
    return textMatch && statusMatch && typeMatch;
}
```

### Filtrage pour l'affichage

```javascript
// Appliquer le filtre pour l'affichage
table.setFilter(function(data) {
    return filterData(data, textFilter, statusValue, typeValue);
});
```

### Sélection pour suppression

```javascript
// Utiliser notre propre logique de filtrage pour la suppression
const allData = window[`allGeocachesData_${tableId}`] || table.getData();

if (!textFilter && !statusValue && !typeValue) {
    // Si aucun filtre n'est actif, utiliser toutes les données
    geocachesToDelete = allData;
} else {
    // Appliquer manuellement le filtre sur toutes les données
    geocachesToDelete = allData.filter(function(data) {
        return filterData(data, textFilter, statusValue, typeValue);
    });
}

// Stocker les géocaches pour la suppression
selectedGeocaches = geocachesToDelete;
```

### Diagnostic et auto-correction

```javascript
// Vérifier le nombre réel de lignes affichées après filtrage
setTimeout(() => {
    const visibleRows = table.getRows("visible");
    console.log(`Après filtrage: ${visibleRows.length} géocaches visibles`);
    
    // Filtrer manuellement pour vérification
    const manuallyFiltered = allData.filter(data => {
        return filterData(data, textFilter, statusValue, typeValue);
    });
    
    // Si différence, forcer l'actualisation
    if (manuallyFiltered.length !== visibleRows.length) {
        console.log("Différence détectée, forçage de l'actualisation");
        setTimeout(() => table.refreshFilter(), 10);
    }
}, 100);
```

## Utilisation des filtres

### Interface utilisateur

L'interface de filtrage se compose de trois éléments principaux :

1. **Champ de recherche textuelle** : Permet de filtrer par code GC, nom ou type de géocache
2. **Sélecteur de statut** : Permet de filtrer les géocaches par statut (Résolues, Non résolues, En cours)
3. **Sélecteur de type** : Permet de filtrer par type spécifique de géocache

### Application des filtres

Les filtres s'appliquent en temps réel à chaque modification :

```javascript
// Gestionnaires d'événements pour les filtres
tableFilter.addEventListener('input', filterTable);
statusFilter.addEventListener('change', filterTable);
typeFilter.addEventListener('change', filterTable);
```

### Effacement des filtres

Un bouton permet d'effacer rapidement le filtre textuel :

```javascript
// Gestionnaire pour effacer le filtre de texte
clearFilterButton.addEventListener('click', function() {
    tableFilter.value = '';
    filterTable();
});
```

## Suppression des géocaches filtrées

Le processus de suppression en masse comprend les étapes suivantes :

1. L'utilisateur applique les filtres souhaités
2. Il clique sur le bouton "Supprimer les géocaches affichées"
3. Une modale de confirmation s'affiche, indiquant le nombre de géocaches qui seront supprimées
4. Après confirmation, toutes les géocaches filtrées sont supprimées séquentiellement

```javascript
// Fonction pour supprimer les géocaches sélectionnées
async function deleteSelectedGeocaches() {
    // Copier la liste des géocaches à supprimer
    const geocachesToDelete = [...selectedGeocaches];
    
    // Supprimer chaque géocache
    for (const geocache of geocachesToDelete) {
        try {
            const response = await fetch(`/api/geocaches/${geocache.id}`, {
                method: 'DELETE',
            });
            
            if (response.ok) {
                successCount++;
            } else {
                errorCount++;
            }
        } catch (error) {
            console.error('Erreur:', error);
            errorCount++;
        }
    }
    
    // Recharger le tableau après suppression
    await reloadTable();
}
```

## Avantages du système

- **Cohérence totale** entre ce qui est affiché et ce qui sera supprimé
- **Aucune limitation** sur le nombre de géocaches affichées ou supprimées
- **Filtrage intuitif** avec application en temps réel des critères
- **Performances optimisées** même avec de grands jeux de données
- **Système d'auto-diagnostic** qui détecte et corrige les incohérences

## Dépannage

En cas de problème avec le filtrage ou la suppression :

1. **Consulter la console du navigateur** (F12) pour voir les logs de diagnostic
2. Vérifier que les nombres affichés dans les logs correspondent :
   - Nombre total de géocaches chargées
   - Nombre de géocaches après filtrage manuel
   - Nombre de géocaches visibles selon Tabulator
3. Si une différence est détectée, le système tentera de corriger automatiquement le problème

## Fichiers concernés

- `templates/geocaches_table.html` : Contient l'implémentation du système de filtrage et de suppression

## Notes techniques

- Le système utilise le stockage global de toutes les données pour contourner les limitations de Tabulator
- L'approche de filtrage manuel garantit que tous les résultats correspondants sont inclus
- Les filtres peuvent être combinés pour une recherche précise
- Le délai d'auto-correction (setTimeout) permet à Tabulator de terminer son rendu avant la vérification
</rewritten_file> 