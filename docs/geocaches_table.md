# Tableau des Géocaches

## Vue d'ensemble

Le tableau des géocaches est un composant interactif qui affiche la liste des géocaches pour une zone donnée. Il est implémenté en utilisant la bibliothèque [Tabulator](http://tabulator.info/) et s'intègre avec GoldenLayout pour la gestion des onglets. Ce composant est accessible depuis le panneau des zones via le bouton "Voir les géocaches".

## Fonctionnalités

- Affichage des géocaches avec colonnes triables
- Chargement dynamique des données via AJAX
- Redimensionnement automatique dans l'onglet
- Boutons d'action pour voir les détails ou supprimer une géocache
- Indicateurs visuels pour l'état des géocaches (résolue, non résolue, en cours)
- Formulaire d'ajout de géocache intégré
- Rechargement automatique du tableau après ajout ou suppression
- Intégration avec le panneau des zones via GoldenLayout

## Structure technique

### Templates

#### Template principal (`geocaches_table.html`)
- Formulaire d'ajout de géocache avec validation
- Conteneur pour le tableau avec les attributs data nécessaires
- Script d'initialisation qui configure et crée l'instance Tabulator
- Gestionnaires d'événements pour l'ajout et la suppression

#### Template du contenu (`geocaches_table_content.html`)
- Conteneur pour l'instance Tabulator
- Séparé du formulaire pour permettre le rechargement partiel

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
10. Actions - Boutons pour voir les détails et supprimer

### Intégration avec GoldenLayout

Le tableau est chargé dans un composant GoldenLayout qui :
1. Est enregistré dans `layout_initialize.js` sous le nom `geocaches-table`
2. Est ouvert depuis le panneau des zones via la fonction `openGeocachesTab`
3. Reçoit l'ID et le nom de la zone comme paramètres d'état
4. Charge le template via une requête fetch
5. Exécute les scripts d'initialisation
6. Gère le redimensionnement automatique du tableau

```javascript
// Exemple d'ouverture du tableau depuis le panneau des zones
function openGeocachesTab(zoneId, zoneName) {
    if (window.parent && window.parent.mainLayout) {
        try {
            window.parent.mainLayout.root.contentItems[0].addChild({
                type: 'component',
                componentName: 'geocaches-table',
                title: 'Géocaches: ' + zoneName,
                componentState: {
                    zoneId: zoneId,
                    zoneName: zoneName
                }
            });
        } catch (error) {
            window.location.href = '/geocaches/table/' + zoneId;
        }
    } else {
        window.location.href = '/geocaches/table/' + zoneId;
    }
}
```

### Gestion du redimensionnement

Le tableau s'adapte automatiquement à la taille de son conteneur grâce à :
- L'option `layout: "fitDataFill"` de Tabulator
- Un gestionnaire de redimensionnement dans le composant GoldenLayout
- L'exposition de l'instance Tabulator via une variable globale pour le redimensionnement

## Endpoints API

### Données du tableau
- GET `/geocaches/<zone_id>` : Données des géocaches au format JSON

### Gestion des géocaches
- POST `/geocaches/add` : Ajoute une nouvelle géocache
  - Paramètres : `code` (GC code), `zone_id`
  - Retourne : `{ id, gc_code, name, message }`
- DELETE `/geocaches/<id>` : Supprime une géocache
  - Retourne : `{ message }`
- GET `/geocaches/table/<zone_id>/content` : Contenu HTML du tableau pour le rechargement

## Personnalisation de l'affichage

### États des géocaches

Les états sont affichés avec des couleurs distinctives :
- ✓ Résolue (vert)
- ✗ Non résolue (rouge)
- ⟳ En cours (jaune)
- - Non défini (gris)

### Boutons d'action

#### Bouton "Détails"
- Utilise `window.postMessage` pour la communication
- Ouvre le panneau de détails dans un nouvel onglet
- Classes Tailwind pour le style

#### Bouton "Supprimer"
- Affiche une confirmation avant suppression
- Supprime la géocache via une requête DELETE
- Recharge automatiquement le tableau après suppression

## Gestion des événements

### Ajout de géocache
1. Soumission du formulaire
2. Envoi des données via fetch
3. Affichage du message de succès/erreur
4. Rechargement du tableau via Tabulator
5. Ouverture automatique du panneau de détails

### Suppression de géocache
1. Confirmation de l'utilisateur
2. Envoi de la requête DELETE
3. Affichage du message de succès/erreur
4. Rechargement du tableau via Tabulator

## Communication inter-composants

La communication entre le tableau et la fenêtre principale se fait via le système de messagerie `postMessage` :
1. Les boutons d'action envoient des messages avec les informations nécessaires
2. La fenêtre principale intercepte ces messages et :
   - Charge le contenu HTML approprié
   - Crée un nouvel onglet si nécessaire
   - Affiche le contenu dans l'onglet

## Intégration avec le panneau des zones

Le tableau des géocaches est étroitement intégré avec le panneau des zones :
1. Chaque zone dans le panneau des zones a un bouton "Voir les géocaches"
2. Ce bouton appelle la fonction `openGeocachesTab` avec l'ID et le nom de la zone
3. La fonction ouvre un nouvel onglet dans GoldenLayout avec le tableau des géocaches
4. Le tableau charge automatiquement les géocaches de la zone spécifiée
5. Si GoldenLayout n'est pas disponible, une redirection vers la page du tableau est effectuée

## Bonnes pratiques

1. **Gestion des erreurs**
   - Fallback vers une URL directe si GoldenLayout n'est pas disponible
   - Messages d'erreur clairs pour les opérations CRUD
   - Validation des données côté client et serveur

2. **Performance**
   - Chargement asynchrone des données
   - Rechargement partiel du tableau après modifications
   - Utilisation de l'API Tabulator pour les mises à jour

3. **UX**
   - Indicateurs visuels pour les états des géocaches
   - Confirmation avant suppression
   - Feedback immédiat après les actions
   - Intégration fluide avec GoldenLayout
