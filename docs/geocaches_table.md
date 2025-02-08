# Documentation du Tableau des Géocaches

## Vue d'ensemble

Le tableau des géocaches est implémenté en utilisant [Tabulator](http://tabulator.info/) v6.3, une bibliothèque JavaScript pour créer des tableaux interactifs. Il est intégré dans l'interface via GoldenLayout pour permettre une gestion flexible des onglets.

## Fonctionnalités

- Tri des colonnes
- Chargement asynchrone des données
- Redimensionnement automatique
- Formatage personnalisé des statuts
- Gestion des clics sur les lignes

## Structure des données

Le tableau affiche les colonnes suivantes :

| Colonne | Champ | Description |
|---------|-------|-------------|
| GC Code | gc_code | Code unique de la géocache |
| Nom | name | Nom de la géocache |
| Type | cache_type | Type de cache (traditionnelle, mystère, etc.) |
| Difficulté | difficulty | Niveau de difficulté (1-5) |
| Terrain | terrain | Niveau de terrain (1-5) |
| Taille | size | Taille de la cache |
| Favoris | favorites_count | Nombre de favoris |
| Logs | logs_count | Nombre de logs |
| Statut | solved | État de résolution |

## Implémentation technique

### Initialisation

```javascript
const table = new Tabulator(`#${tableId}`, {
    ajaxURL: `/api/zones/${state.zoneId}/geocaches`,
    layout: "fitDataFill",
    height: "100%",
    placeholder: "Aucune géocache trouvée",
    // ... configuration des colonnes
});
```

### Gestion des statuts

Les statuts sont affichés avec des icônes et des couleurs différentes :
- ✓ Vert : Résolue
- ✗ Rouge : Non résolue
- ⟳ Jaune : En cours
- - Gris : Non défini

### Intégration avec GoldenLayout

Le tableau est créé dans un composant GoldenLayout personnalisé nommé `geocachesTable`. L'initialisation est différée via `setTimeout` pour assurer que le DOM est prêt.

### Gestion du redimensionnement

```javascript
container.on('resize', function() {
    if (table) {
        table.redraw(true);
    }
});
```

## API Backend

Le tableau utilise l'endpoint `/api/zones/{zone_id}/geocaches` qui renvoie un tableau JSON avec les propriétés suivantes :

```json
{
    "gc_code": "string",
    "name": "string",
    "cache_type": "string",
    "difficulty": "number",
    "terrain": "number",
    "size": "string",
    "favorites_count": "number",
    "logs_count": "number",
    "solved": "string"
}
```

## Événements

### Clic sur une ligne

```javascript
rowClick: function(e, row) {
    console.log("Clicked row:", row.getData());
    // TODO: Implémentation de l'ouverture des détails
}
```

## Bonnes pratiques

1. Toujours vérifier l'existence de l'élément DOM avant l'initialisation
2. Utiliser le placeholder pour informer l'utilisateur quand il n'y a pas de données
3. Gérer le redimensionnement pour maintenir la mise en page
4. Sécuriser les appels aux méthodes de la table avec des vérifications d'existence
