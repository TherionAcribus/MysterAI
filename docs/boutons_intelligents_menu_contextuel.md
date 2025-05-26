# Boutons Intelligents avec Menu Contextuel

## Vue d'ensemble

Le système de boutons intelligents a été amélioré avec un **menu contextuel** (clic droit) qui permet aux utilisateurs de choisir précisément où et comment ouvrir un onglet. Ce système est extensible et permet d'ajouter des options personnalisées pour chaque bouton.

## Fonctionnalités

### Menu Contextuel Standard

Chaque bouton intelligent (`data-tab-opener`) dispose automatiquement d'un menu contextuel accessible par **clic droit** avec les options suivantes :

- **📌 Ouvrir dans la même section** : Force l'ouverture dans une section existante
- **🆕 Ouvrir dans une nouvelle section** : Force la création d'une nouvelle section
- **⚙️ Selon les préférences** : Utilise le paramètre `open_tab_in_same_section`

### Options Contextuelles Intelligentes

Le menu s'adapte automatiquement selon le type de bouton :

#### Pour les Plugins
- **❓ Aide du plugin** : Ouvre l'aide spécifique au plugin

#### Pour Formula Solver
- **🗺️ Détails de la géocache** : Ouvre les détails de la géocache associée

#### Pour les Détails de Géocache
- **🧮 Formula Solver** : Ouvre le Formula Solver pour cette géocache

## Utilisation de Base

### Bouton Simple
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

**Comportement :**
- **Clic gauche** : Ouvre selon les préférences utilisateur
- **Clic droit** : Affiche le menu contextuel avec les 3 options standard + aide du plugin

## Options Personnalisées

### Attributs `data-tab-menu-*`

Vous pouvez ajouter des options personnalisées au menu contextuel en utilisant les attributs `data-tab-menu-*` :

**Format :** `data-tab-menu-[nom]="Texte|Tooltip|Action|Target"`

### Actions Disponibles

#### 1. `open-url` - Ouvrir une URL
```html
<button data-tab-opener="plugin"
        data-tab-title="Caesar Code"
        data-tab-component="plugin"
        data-tab-unique-id="plugin-caesar_code-global"
        data-tab-config-pluginname="caesar_code"
        data-tab-config-gccode="GC12345"
        data-tab-menu-geocaching="🌐 Voir sur Geocaching.com|Ouvrir la page de la géocache|open-url|https://geocaching.com/geocache/{gcCode}">
    Caesar Code
</button>
```

#### 2. `copy-to-clipboard` - Copier vers le presse-papiers
```html
<button data-tab-opener="formula-solver"
        data-tab-title="Formula Solver - GC67890"
        data-tab-component="FormulaSolver"
        data-tab-unique-id="formula-solver-456"
        data-tab-config-geocacheid="456"
        data-tab-config-gccode="GC67890"
        data-tab-menu-copy="📋 Copier le GC Code|Copier le code dans le presse-papiers|copy-to-clipboard|{gcCode}">
    Formula Solver
</button>
```

#### 3. `execute-function` - Exécuter une fonction JavaScript
```html
<button data-tab-opener="plugin"
        data-tab-title="Multi Decoder"
        data-tab-component="plugin"
        data-tab-unique-id="plugin-multi-decoder-global"
        data-tab-config-pluginname="multi_decoder"
        data-tab-menu-reset="🔄 Réinitialiser|Réinitialiser le plugin|execute-function|resetMultiDecoder">
    Multi Decoder
</button>
```

#### 4. `open-tab` - Ouvrir un onglet personnalisé
```html
<button data-tab-opener="geocache-details"
        data-tab-title="Détails - GC12345"
        data-tab-component="geocache-details"
        data-tab-unique-id="geocache-details-123"
        data-tab-config-geocacheid="123"
        data-tab-config-gccode="GC12345"
        data-tab-menu-map="🗺️ Voir sur la carte|Afficher sur la carte des géocaches|open-tab|geocaches-map|Carte - {gcCode}|geocaches-map|{\"selectedGeocache\": {geocacheId}}">
    Détails GC12345
</button>
```

## Placeholders

Le système supporte des placeholders qui sont automatiquement remplacés :

### Placeholders de Configuration
- `{pluginName}` : Nom du plugin
- `{geocacheId}` : ID de la géocache
- `{gcCode}` : Code GC
- `{zoneName}` : Nom de la zone
- `{alphabetId}` : ID de l'alphabet
- etc. (tous les attributs `data-tab-config-*`)

### Placeholders Spéciaux
- `{title}` : Titre du bouton
- `{type}` : Type du bouton
- `{uniqueId}` : ID unique du bouton

## Exemples Avancés

### Bouton avec Multiples Options Personnalisées
```html
<button data-tab-opener="plugin"
        data-tab-title="Analysis - GC12345"
        data-tab-component="plugin"
        data-tab-unique-id="plugin-analysis-123"
        data-tab-config-pluginname="analysis_web_page"
        data-tab-config-geocacheid="123"
        data-tab-config-gccode="GC12345"
        data-tab-menu-geocaching="🌐 Geocaching.com|Voir sur le site officiel|open-url|https://geocaching.com/geocache/{gcCode}"
        data-tab-menu-copy="📋 Copier GC Code|Copier dans le presse-papiers|copy-to-clipboard|{gcCode}"
        data-tab-menu-solver="🧮 Formula Solver|Ouvrir le solver pour cette cache|open-tab|formula-solver|Formula Solver - {gcCode}|FormulaSolver|{\"geocacheId\": {geocacheId}, \"gcCode\": \"{gcCode}\"}"
        class="px-4 py-2 bg-green-600 text-white rounded">
    Analysis
</button>
```

**Menu contextuel résultant :**
- 📌 Ouvrir dans la même section
- 🆕 Ouvrir dans une nouvelle section
- ⚙️ Selon les préférences
- --- *(séparateur)* ---
- ❓ Aide du plugin
- --- *(séparateur)* ---
- 🌐 Geocaching.com
- 📋 Copier GC Code
- 🧮 Formula Solver

### Bouton avec Action JavaScript Personnalisée
```html
<button data-tab-opener="web-search"
        data-tab-title="Recherche Web"
        data-tab-component="WebSearch"
        data-tab-unique-id="web-search-global"
        data-tab-menu-bookmark="⭐ Ajouter aux favoris|Ajouter cette recherche aux favoris|execute-function|addSearchBookmark"
        data-tab-menu-share="🔗 Partager|Partager cette recherche|execute-function|shareSearch">
    Recherche Web
</button>
```

```javascript
// Fonctions JavaScript correspondantes
window.addSearchBookmark = function(buttonConfig) {
    console.log('Ajout aux favoris:', buttonConfig);
    // Logique pour ajouter aux favoris
};

window.shareSearch = function(buttonConfig) {
    console.log('Partage de la recherche:', buttonConfig);
    // Logique pour partager
};
```

## Intégration dans les Templates Jinja2

### Boucle avec Options Contextuelles
```html
{% for geocache in geocaches %}
<button data-tab-opener="formula-solver"
        data-tab-title="Formula Solver - {{ geocache.gc_code }}"
        data-tab-component="FormulaSolver"
        data-tab-unique-id="formula-solver-{{ geocache.id }}"
        data-tab-config-geocacheid="{{ geocache.id }}"
        data-tab-config-gccode="{{ geocache.gc_code }}"
        data-tab-menu-geocaching="🌐 Geocaching.com|Voir {{ geocache.gc_code }} sur le site|open-url|https://geocaching.com/geocache/{{ geocache.gc_code }}"
        data-tab-menu-details="🗺️ Détails|Voir les détails de cette géocache|open-tab|geocache-details|Détails - {{ geocache.gc_code }}|geocache-details|{\"geocacheId\": {{ geocache.id }}, \"gcCode\": \"{{ geocache.gc_code }}\"}"
        class="btn btn-primary">
    Formula Solver
</button>
{% endfor %}
```

## Stylisation et Thèmes

### CSS Personnalisé
Le menu contextuel peut être stylisé via CSS :

```css
/* Menu principal */
#tab-opener-context-menu {
    background: var(--menu-bg, white);
    border: 1px solid var(--menu-border, #ccc);
    border-radius: var(--menu-radius, 4px);
    font-family: var(--menu-font, Arial, sans-serif);
}

/* Éléments de menu */
.tab-opener-menu-item {
    padding: var(--menu-item-padding, 8px 16px);
    transition: background-color 0.2s;
}

.tab-opener-menu-item:hover {
    background-color: var(--menu-item-hover, #f0f0f0);
}
```

### Thème Sombre
```css
:root {
    --menu-bg: #2d2d2d;
    --menu-border: #555;
    --menu-item-hover: #404040;
    --menu-text: white;
}

#tab-opener-context-menu {
    color: var(--menu-text);
}
```

## API JavaScript

### Méthodes Publiques
```javascript
// Afficher manuellement le menu contextuel
window.TabOpenerService.showContextMenu(event, buttonConfig);

// Cacher le menu contextuel
window.TabOpenerService.hideContextMenu();

// Exécuter une action personnalisée
window.TabOpenerService.executeCustomAction('open-url', 'https://example.com', buttonConfig);

// Afficher une notification
window.TabOpenerService.showNotification('Message de succès');
```

### Événements Personnalisés
```javascript
// Écouter l'ouverture du menu contextuel
document.addEventListener('tabOpenerMenuShown', (event) => {
    console.log('Menu contextuel ouvert:', event.detail);
});

// Écouter la fermeture du menu contextuel
document.addEventListener('tabOpenerMenuHidden', (event) => {
    console.log('Menu contextuel fermé');
});
```

## Migration

### Anciens Boutons
Les anciens boutons `onclick` continuent de fonctionner normalement. Le menu contextuel est automatiquement ajouté lorsque vous migrez vers les attributs `data-tab-opener`.

### Activation Progressive
Vous pouvez migrer progressivement en gardant les anciens boutons et en ajoutant les nouveaux :

```html
<!-- Ancien bouton (toujours fonctionnel) -->
<button onclick="openPluginTab('caesar_code', 'Caesar Code')">
    Caesar Code (Ancien)
</button>

<!-- Nouveau bouton avec menu contextuel -->
<button data-tab-opener="plugin"
        data-tab-title="Caesar Code"
        data-tab-component="plugin"
        data-tab-unique-id="plugin-caesar_code-global"
        data-tab-config-pluginname="caesar_code">
    Caesar Code (Nouveau)
</button>
```

## Dépannage

### Menu Contextuel ne s'affiche pas
1. Vérifiez que `TabOpenerService` est chargé
2. Vérifiez la console pour les erreurs
3. Assurez-vous que `data-tab-opener` est défini

### Options Personnalisées non visibles
1. Vérifiez le format des attributs `data-tab-menu-*`
2. Vérifiez la syntaxe : `"Texte|Tooltip|Action|Target"`
3. Regardez les logs dans la console

### Actions Personnalisées ne fonctionnent pas
1. Pour `execute-function` : vérifiez que la fonction existe dans `window`
2. Pour `open-url` : vérifiez l'URL et les placeholders
3. Pour `copy-to-clipboard` : vérifiez que le navigateur supporte l'API Clipboard

---

*Ce système offre une flexibilité maximale tout en conservant la simplicité d'utilisation. Vous pouvez commencer par les boutons simples et ajouter progressivement des options personnalisées selon vos besoins.* 