# Guide de Diagnostic - Boutons Intelligents

## Vue d'ensemble

Ce guide vous aide à diagnostiquer pourquoi les onglets ne s'ouvrent pas dans la section active mais toujours dans la première section.

## Étapes de Diagnostic

### 1. Vérification des Services

Ouvrez la console du navigateur (F12) et exécutez :

```javascript
debugTabOpenerSystem();
```

**Résultats attendus :**
```
🔍 === DEBUG TAB OPENER SYSTEM ===
📦 Services disponibles:
  - TabOpenerService: true
  - LayoutStateManager: true
  - mainLayout: true
```

**Si un service est `false` :**
- Vérifiez que les scripts sont chargés dans le bon ordre
- Regardez s'il y a des erreurs JavaScript qui empêchent le chargement

### 2. Vérification du Suivi des Stacks

Après avoir ouvert plusieurs onglets dans différentes sections, exécutez :

```javascript
window.layoutStateManager.debugState();
```

**Résultats attendus :**
```
=== LayoutStateManager: État actuel === {
  activeStack: "stack2",
  activeComponent: "comp3",
  stackCount: 2,
  componentCount: 4,
  stackActivityOrder: ["stack2", "stack1"]
}
```

**Problèmes possibles :**
- `activeStack: null` → Le suivi des stacks ne fonctionne pas
- `stackActivityOrder: []` → Les événements ne sont pas écoutés

### 3. Test de Changement de Stack Active

1. **Cliquez sur un onglet** dans une section différente
2. **Exécutez immédiatement :**
   ```javascript
   console.log('Stack active:', window.layoutStateManager.getActiveGoldenLayoutStack()?.id);
   ```

**Résultat attendu :** L'ID de la stack où vous avez cliqué

**Si le résultat est incorrect :**
- Les événements de clic ne sont pas correctement écoutés
- Le LayoutStateManager n'est pas configuré avec GoldenLayout

### 4. Test d'Ouverture d'Onglet

1. **Activez une stack** en cliquant sur un onglet
2. **Exécutez :**
   ```javascript
   testTabOpening('test', 'Test Tab');
   ```

**Logs attendus :**
```
🧪 === TEST OUVERTURE ONGLET ===
🎯 Configuration de test: {...}
🚀 TabOpener: Ouverture d'un nouvel onglet
📌 TabOpener: Mode "même section" activé
🔍 TabOpener: Recherche de la stack active
🎯 TabOpener: Stack active trouvée: stack2
✅ TabOpener: Onglet ajouté à la stack active
```

**Si vous voyez :**
```
❌ TabOpener: Aucune stack active trouvée via LayoutStateManager
🔄 TabOpener: Ajout à une stack existante (fallback)
```
→ Le problème est dans le suivi des stacks actives

### 5. Simulation de Clic sur Bouton

Testez un bouton spécifique :

```javascript
simulateButtonClick('[data-tab-opener="geocaches-map"]');
```

**Logs attendus :**
```
🖱️ === SIMULATION CLIC BOUTON ===
🔘 Bouton trouvé: <button>
📋 Attributs: {opener: "geocaches-map", title: "Carte", uniqueId: "..."}
🖱️ TabOpenerService: Clic détecté sur bouton avec data-tab-opener
🎯 TabOpener: Gestion du clic sur bouton intelligent
```

### 6. Surveillance en Temps Réel

Activez la surveillance pour voir tous les événements :

```javascript
startEventMonitoring();
```

Puis cliquez sur différents onglets et boutons pour voir les événements en temps réel.

## Problèmes Courants et Solutions

### Problème 1 : Services Non Chargés

**Symptômes :**
- `TabOpenerService: false` ou `LayoutStateManager: false`

**Solutions :**
1. Vérifiez l'ordre de chargement des scripts dans le HTML
2. Regardez la console pour des erreurs JavaScript
3. Assurez-vous que les fichiers existent et sont accessibles

### Problème 2 : Stack Active Non Détectée

**Symptômes :**
- `activeStack: null` même après avoir cliqué sur des onglets
- Logs "Aucune stack active trouvée"

**Solutions :**
1. Vérifiez que `goldenLayoutInitialized` est émis :
   ```javascript
   document.addEventListener('goldenLayoutInitialized', () => {
       console.log('✅ GoldenLayout initialisé');
   });
   ```

2. Vérifiez que les événements sont écoutés :
   ```javascript
   // Doit afficher des logs quand vous cliquez sur des onglets
   ```

### Problème 3 : Événements Non Écoutés

**Symptômes :**
- Aucun log lors des clics sur onglets
- `stackActivityOrder: []`

**Solutions :**
1. Vérifiez que `setupGoldenLayoutListeners` est appelé
2. Vérifiez que l'événement `goldenLayoutInitialized` est émis dans `layout_initialize.js`

### Problème 4 : Boutons Non Reconnus

**Symptômes :**
- Aucun log lors du clic sur les boutons Carte/Multi-Solver
- `simulateButtonClick` ne trouve pas le bouton

**Solutions :**
1. Vérifiez que les boutons ont les attributs `data-tab-opener`
2. Vérifiez que les scripts sont chargés dans l'iframe du tableau

### Problème 5 : Fallback Toujours Utilisé

**Symptômes :**
- Logs "Ajout à une stack existante (fallback)"
- Onglets toujours dans la première section

**Solutions :**
1. Forcez l'activation d'une stack :
   ```javascript
   forceActivateStack('stack2'); // Remplacez par l'ID réel
   ```

2. Vérifiez que `getActiveGoldenLayoutStack()` retourne bien une stack

## Tests de Validation

### Test Complet

1. **Ouvrez plusieurs onglets** dans différentes sections
2. **Exécutez :** `debugTabOpenerSystem()`
3. **Cliquez sur un onglet** dans la section 2
4. **Exécutez :** `window.layoutStateManager.debugState()`
5. **Cliquez sur un bouton** Carte ou Multi-Solver
6. **Vérifiez** que l'onglet s'ouvre dans la section 2

### Test de Récupération

Si le système ne fonctionne pas, essayez :

```javascript
// Réinitialiser le système
window.layoutStateManager.initialize();

// Forcer la configuration des écouteurs
if (window.mainLayout) {
    window.layoutStateManager.setupGoldenLayoutListeners(window.mainLayout);
}

// Tester à nouveau
debugTabOpenerSystem();
```

## Logs de Debug Utiles

### Logs Normaux (Système Fonctionnel)
```
🔧 TabOpenerService: Initialisation du service
📦 TabOpenerService chargé et prêt
=== LayoutStateManager: Initialisation ===
=== LayoutStateManager: Configuration des écouteurs GoldenLayout ===
🏗️ LayoutStateManager: Stack créée: stack1
🖱️ LayoutStateManager: Clic sur onglet dans stack: stack2
🎯 TabOpener: Stack active trouvée: stack2
✅ TabOpener: Onglet ajouté à la stack active
```

### Logs Problématiques
```
❌ TabOpener: LayoutStateManager non disponible
⚠️ TabOpener: mainLayout non disponible
❌ TabOpener: Aucune stack active trouvée via LayoutStateManager
🔄 TabOpener: Ajout à une stack existante (fallback)
```

## Contact et Support

Si le problème persiste après ces vérifications, fournissez :

1. **Résultat de :** `debugTabOpenerSystem()`
2. **Logs de la console** lors du clic sur un bouton
3. **Structure du layout** visible dans les logs
4. **Version du navigateur** et environnement

---

*Ce guide sera mis à jour selon les problèmes identifiés.* 