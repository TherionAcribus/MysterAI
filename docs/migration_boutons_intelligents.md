# Guide de Migration - Boutons Intelligents

## Vue d'ensemble

Ce guide explique comment migrer vos boutons existants vers le nouveau système de boutons intelligents qui respecte le paramètre `open_tab_in_same_section`.

## Système Actuel vs Nouveau Système

### Avant (Système Actuel)
```html
<button onclick="openPluginTab('caesar_code', 'Caesar Code')" 
        class="px-4 py-2 bg-blue-600 text-white rounded">
    Caesar Code
</button>
```

### Après (Nouveau Système)
```html
<button data-tab-opener="plugin"
        data-tab-title="Caesar Code" 
        data-tab-component="plugin"
        data-tab-unique-id="plugin-caesar_code-global"
        data-tab-config-pluginname="caesar_code"
        class="px-4 py-2 bg-blue-600 text-white rounded">
    Caesar Code
</button>
```

## Attributs Data Requis

### Attributs Principaux
- `data-tab-opener` : Type d'onglet (`plugin`, `solver`, `formula-solver`, etc.)
- `data-tab-title` : Titre de l'onglet
- `data-tab-component` : Nom du composant GoldenLayout
- `data-tab-unique-id` : ID unique pour éviter les doublons

### Attributs de Configuration
- `data-tab-config-*` : Configuration spécifique (remplacer `*` par le nom du paramètre)
- `data-tab-config-json` : Configuration JSON complexe

## Exemples de Migration

### 1. Plugin Simple
```html
<!-- AVANT -->
<button onclick="openPluginTab('rot13', 'ROT13')">ROT13</button>

<!-- APRÈS -->
<button data-tab-opener="plugin"
        data-tab-title="ROT13"
        data-tab-component="plugin"
        data-tab-unique-id="plugin-rot13-global"
        data-tab-config-pluginname="rot13">
    ROT13
</button>
```

### 2. Plugin avec Géocache
```html
<!-- AVANT -->
<button onclick="openPluginTab('analysis_web_page', 'Analysis', {geocacheId: 123, gcCode: 'GC12345'})">
    Analysis
</button>

<!-- APRÈS -->
<button data-tab-opener="plugin"
        data-tab-title="Analysis - GC12345"
        data-tab-component="plugin"
        data-tab-unique-id="plugin-analysis_web_page-123"
        data-tab-config-pluginname="analysis_web_page"
        data-tab-config-geocacheid="123"
        data-tab-config-gccode="GC12345">
    Analysis
</button>
```

### 3. Solver
```html
<!-- AVANT -->
<button onclick="openSolverTab()">Solver</button>

<!-- APRÈS -->
<button data-tab-opener="solver"
        data-tab-title="Solver"
        data-tab-component="geocache-solver"
        data-tab-unique-id="solver-global">
    Solver
</button>
```

### 4. Formula Solver avec Géocache
```html
<!-- AVANT -->
<button onclick="openFormulaSolverTab(456, 'GC67890')">Formula Solver</button>

<!-- APRÈS -->
<button data-tab-opener="formula-solver"
        data-tab-title="Formula Solver - GC67890"
        data-tab-component="FormulaSolver"
        data-tab-unique-id="formula-solver-456"
        data-tab-config-geocacheid="456"
        data-tab-config-gccode="GC67890">
    Formula Solver
</button>
```

### 5. Configuration JSON Complexe
```html
<!-- AVANT -->
<button onclick="openPluginTab('multi_decoder', 'Multi Decoder', {
    text: 'ABCDEF',
    mode: 'auto',
    geocacheId: 789
})">Multi Decoder</button>

<!-- APRÈS -->
<button data-tab-opener="plugin"
        data-tab-title="Multi Decoder"
        data-tab-component="plugin"
        data-tab-unique-id="plugin-multi-decoder-789"
        data-tab-config-json='{"pluginName": "multi_decoder", "text": "ABCDEF", "mode": "auto", "geocacheId": 789}'>
    Multi Decoder
</button>
```

## Patterns de Migration Courants

### 1. Boutons dans les Tables Jinja2
```html
<!-- AVANT -->
{% for geocache in geocaches %}
<button onclick="openFormulaSolverTab({{ geocache.id }}, '{{ geocache.gc_code }}')">
    Formula Solver
</button>
{% endfor %}

<!-- APRÈS -->
{% for geocache in geocaches %}
<button data-tab-opener="formula-solver"
        data-tab-title="Formula Solver - {{ geocache.gc_code }}"
        data-tab-component="FormulaSolver"
        data-tab-unique-id="formula-solver-{{ geocache.id }}"
        data-tab-config-geocacheid="{{ geocache.id }}"
        data-tab-config-gccode="{{ geocache.gc_code }}">
    Formula Solver
</button>
{% endfor %}
```

### 2. Boutons avec Événements Personnalisés
```html
<!-- AVANT -->
<button onclick="doSomething(); openPluginTab('test', 'Test')">Test</button>

<!-- APRÈS -->
<button data-tab-opener="plugin"
        data-tab-title="Test"
        data-tab-component="plugin"
        data-tab-unique-id="plugin-test-global"
        data-tab-config-pluginname="test"
        onclick="doSomething()">
    Test
</button>
```

## Mapping des Types d'Onglets

| Type                | Composant GoldenLayout | Exemple d'ID unique          |
|---------------------|------------------------|------------------------------|
| `plugin`            | `plugin`               | `plugin-{nom}-{geocacheId}`  |
| `solver`            | `geocache-solver`      | `solver-{geocacheId}`        |
| `formula-solver`    | `FormulaSolver`        | `formula-solver-{geocacheId}`|
| `geocache-details`  | `geocache-details`     | `geocache-details-{id}`      |
| `web-search`        | `WebSearch`            | `web-search-{terme}`         |
| `external-url`      | `external-url`         | `external-url-{hash}`        |

## Script de Migration Automatique

Voici un script bash pour automatiser une partie de la migration :

```bash
#!/bin/bash
# Script de migration des boutons onclick vers data-tab-opener

# Remplacer les patterns courants
find . -name "*.html" -type f -exec sed -i '' \
    -e 's/onclick="openPluginTab(\x27\([^'\''"]*\)\x27, \x27\([^'\''"]*\)\x27)"/data-tab-opener="plugin" data-tab-title="\2" data-tab-component="plugin" data-tab-unique-id="plugin-\1-global" data-tab-config-pluginname="\1"/g' \
    -e 's/onclick="openSolverTab()"/data-tab-opener="solver" data-tab-title="Solver" data-tab-component="geocache-solver" data-tab-unique-id="solver-global"/g' \
    -e 's/onclick="openFormulaSolverTab()"/data-tab-opener="formula-solver" data-tab-title="Formula Solver" data-tab-component="FormulaSolver" data-tab-unique-id="formula-solver-global"/g' \
    {} \;

echo "Migration automatique terminée. Vérifiez manuellement les fichiers modifiés."
```

## Rétrocompatibilité

Le nouveau système est rétrocompatible :
- Les anciens boutons `onclick` continuent de fonctionner
- Les nouvelles fonctions intelligentes sont appliquées automatiquement
- Pas de rupture dans le code existant

## Test de la Migration

Pour tester que vos boutons fonctionnent correctement :

1. **Activez le paramètre** `open_tab_in_same_section` dans les Settings
2. **Cliquez sur un bouton** migré - l'onglet doit s'ouvrir dans une section existante
3. **Désactivez le paramètre** et cliquez à nouveau - l'onglet doit créer une nouvelle section
4. **Vérifiez les logs** dans la console pour voir les messages de debug

## Avantages du Nouveau Système

1. **Respecte les préférences utilisateur** (même section vs nouvelle section)
2. **Évite les doublons** (réutilise les onglets existants)
3. **Performance améliorée** (cache des paramètres)
4. **Code plus propre** (pas de JavaScript inline)
5. **Facilite la maintenance** (configuration centralisée)

## Dépannage

### Problème : Le bouton ne fonctionne pas
- Vérifiez que `data-tab-opener` est défini
- Vérifiez que `TabOpenerService` est chargé
- Regardez la console pour les erreurs

### Problème : Configuration non prise en compte
- Vérifiez la syntaxe des attributs `data-tab-config-*`
- Pour JSON complexe, utilisez `data-tab-config-json`

### Problème : Onglets en double
- Vérifiez que `data-tab-unique-id` est unique et consistant
- Utilisez un pattern prévisible pour l'ID unique

---

*Ce guide sera mis à jour au fur et à mesure que de nouveaux patterns sont identifiés.*

## Migrations Effectuées

### Fichier `geocache_details.html` - Boutons des Détails de Géocache

**Date de migration :** Décembre 2024

**Boutons convertis :**

#### Section Coordonnées
1. **Bouton "Analyser"**
   - **Avant :** `data-action="click->geocache-coordinates#openAnalysis"`
   - **Après :** Bouton intelligent avec `data-tab-opener="plugin"`
   - **Configuration :** Plugin `analysis_web_page` avec `geocacheId` et `gcCode`

2. **Bouton "Solver"**
   - **Avant :** `data-action="click->geocache-coordinates#openSolver"`
   - **Après :** Bouton intelligent avec `data-tab-opener="solver"`
   - **Configuration :** Composant `geocache-solver` avec `geocacheId` et `gcCode`

3. **Bouton "Formula Solver"**
   - **Avant :** `onclick="window.openFormulaSolverTab(...)"`
   - **Après :** Bouton intelligent avec `data-tab-opener="formula-solver"`
   - **Configuration :** Composant `FormulaSolver` avec `geocacheId` et `gcCode`

#### Section Description
1. **Bouton "Analyser"**
   - **Avant :** `onclick="window.openPluginTab('analysis_web_page', ...)"`
   - **Après :** Bouton intelligent avec `data-tab-opener="plugin"`
   - **Configuration :** Plugin `analysis_web_page` avec `geocacheId` et `gcCode`

2. **Bouton "Solver"**
   - **Avant :** `onclick="window.openSolverTab(...)"`
   - **Après :** Bouton intelligent avec `data-tab-opener="solver"`
   - **Configuration :** Composant `geocache-solver` avec `geocacheId` et `gcCode`

3. **Bouton "Formula Solver"**
   - **Avant :** `onclick="window.openFormulaSolverTab(...)"`
   - **Après :** Bouton intelligent avec `data-tab-opener="formula-solver"`
   - **Configuration :** Composant `FormulaSolver` avec `geocacheId` et `gcCode`

**Avantages obtenus :**
- ✅ Respect du paramètre `open_tab_in_same_section`
- ✅ Menu contextuel disponible (clic droit)
- ✅ Évitement des doublons d'onglets
- ✅ Rétrocompatibilité maintenue (les anciens `data-action` et attributs sont conservés)

**Notes spéciales :**
- Les boutons conservent leurs attributs `data-action` existants pour maintenir la compatibilité avec les contrôleurs Stimulus
- Le bouton "Chat IA" n'a pas été converti car il utilise une fonction spéciale `openGeocacheAIChat()`
- Les IDs uniques utilisent le pattern `{type}-{plugin/component}-{geocacheId}` pour garantir l'unicité

### Fichier `alphabet_viewer.html` - Bouton "Ouvrir Géocache"

**Date de migration :** Décembre 2024

**Bouton converti :**

1. **Bouton "Ouvrir Géocache"**
   - **Avant :** `data-action="click->alphabet-viewer#openGeocacheDetails"`
   - **Après :** Bouton intelligent avec `data-tab-opener="geocache-details"`
   - **Configuration :** Composant `geocache-details` avec `geocacheId` et `gcCode` dynamiques

**Particularités de cette migration :**

- **Configuration dynamique :** Les attributs du bouton intelligent sont mis à jour dynamiquement via JavaScript lorsqu'une géocache est associée
- **Méthode `updateSmartButtonAttributes()`** : Nouvelle méthode dans le contrôleur qui met à jour les attributs `data-tab-*` selon la géocache associée
- **Logique hybride :** La méthode `openGeocacheDetails()` vérifie si le bouton intelligent est configuré et délègue au `TabOpenerService` si c'est le cas
- **Nettoyage automatique :** Les attributs du bouton intelligent sont supprimés quand l'association avec la géocache est retirée

**Code ajouté dans le contrôleur :**
```javascript
updateSmartButtonAttributes() {
    const openButton = this.element.querySelector('[data-action*="openGeocacheDetails"]');
    if (!openButton || !this.associatedGeocache) return;
    
    const geocacheId = this.associatedGeocache.databaseId || this.associatedGeocache.id;
    const gcCode = this.associatedGeocache.code;
    
    openButton.setAttribute('data-tab-opener', 'geocache-details');
    openButton.setAttribute('data-tab-title', `Détails - ${gcCode}`);
    openButton.setAttribute('data-tab-unique-id', `geocache-details-${geocacheId}`);
    // ... autres attributs
}
```

**Avantages obtenus :**
- ✅ Respect du paramètre `open_tab_in_same_section`
- ✅ Menu contextuel disponible (clic droit)
- ✅ Évitement des doublons d'onglets
- ✅ Configuration dynamique selon la géocache associée
- ✅ Rétrocompatibilité totale avec l'ancien système 