# Documentation du Panneau des Zones

## Vue d'ensemble

Le panneau des zones est un composant de l'interface utilisateur qui affiche la liste des zones de géocaching disponibles et permet leur gestion complète. Il est implémenté en utilisant une combinaison de HTML, Tailwind CSS, HTMX et JavaScript.

## Structure de l'interface

### Emplacement
- Situé dans le panneau latéral gauche ou dans le panneau principal
- Accessible via l'icône de marqueur de carte dans la barre latérale
- Template : `zones_list.html`

### Design

Le panneau utilise un design moderne avec :
- Fond sombre (`bg-gray-800`)
- Cartes interactives pour chaque zone
- Effets de survol et transitions fluides
- Icônes FontAwesome
- Boutons d'action stylisés avec Tailwind CSS

## Implémentation

### Template HTML (zones_list.html)

```html
<div class="p-4">
    <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold text-blue-400">Zones</h2>
        <button hx-get="/zones/new" 
                hx-target="#geocaches-panel-content"
                class="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700 transition-colors flex items-center">
            <i class="fas fa-plus mr-1"></i>Ajouter
        </button>
    </div>

    {% if zones %}
        <div class="space-y-4">
            {% for zone in zones %}
                <div class="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="text-lg font-semibold text-blue-400">{{ zone.name }}</h3>
                        <div class="flex space-x-2">
                            <button hx-get="/zones/{{ zone.id }}/edit"
                                    hx-target="#geocaches-panel-content"
                                    class="text-yellow-500 hover:text-yellow-400 transition-colors" 
                                    title="Modifier">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button data-zone-id="{{ zone.id }}" 
                                    data-zone-name="{{ zone.name | escape }}"
                                    class="delete-zone-btn text-red-500 hover:text-red-400 transition-colors" 
                                    title="Supprimer">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    {% if zone.description %}
                        <p class="text-gray-300 mb-4">{{ zone.description }}</p>
                    {% endif %}
                    
                    <button onclick="openGeocachesTab('{{ zone.id }}', '{{ zone.name | escape }}')"
                            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors inline-flex items-center">
                        <i class="fas fa-table mr-2"></i>
                        Voir les géocaches
                    </button>
                </div>
            {% endfor %}
        </div>
    {% else %}
        <div class="text-center py-8">
            <p class="text-gray-400 mb-4">Aucune zone trouvée</p>
            <button hx-get="/zones/new"
                    hx-target="#geocaches-panel-content"
                    class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                <i class="fas fa-plus mr-2"></i>Créer votre première zone
            </button>
        </div>
    {% endif %}
</div>
```

### Styles Tailwind

Les classes principales utilisées :
- `p-4` : Padding intérieur
- `flex justify-between items-center` : Disposition flexible avec espacement
- `space-y-4` : Espacement vertical entre les éléments
- `bg-gray-800` : Fond sombre
- `rounded-lg` : Coins arrondis
- `hover:bg-gray-700` : Effet de survol
- `transition-colors` : Animation de transition
- `text-blue-400` : Couleur du texte des titres
- `text-gray-300` : Couleur du texte descriptif

## Fonctionnalités

### Affichage des zones

1. Les zones sont chargées depuis le backend via l'endpoint `/api/zones`
2. Chaque zone affiche :
   - Son nom
   - Sa description (si disponible)
   - Des boutons d'action (modifier, supprimer)
   - Un bouton pour voir les géocaches

### Gestion des zones

Le panneau permet de :
1. **Ajouter une zone** : Via un formulaire HTMX qui s'affiche dans le même panneau
2. **Modifier une zone** : Via un formulaire HTMX qui s'affiche dans le même panneau
3. **Supprimer une zone** : Via une modale de confirmation avec gestion des géocaches associées

### Interaction avec les géocaches

Quand l'utilisateur clique sur "Voir les géocaches" :
1. La fonction `openGeocachesTab` est appelée
2. Un nouvel onglet est créé dans GoldenLayout
3. Le tableau des géocaches de la zone est chargé dans cet onglet

## Intégration avec HTMX

Le panneau utilise HTMX pour :
- Charger les formulaires d'ajout et de modification sans changer de page
- Soumettre les formulaires de manière asynchrone
- Mettre à jour la liste des zones après chaque action

Exemple d'attributs HTMX :
```html
<button hx-get="/zones/new" 
        hx-target="#geocaches-panel-content"
        class="...">
    Ajouter
</button>
```

## Intégration avec GoldenLayout

La fonction `openGeocachesTab` gère l'ouverture d'un nouvel onglet dans GoldenLayout :

```javascript
function openGeocachesTab(zoneId, zoneName) {
    // Vérifier si nous sommes dans un iframe (dans GoldenLayout)
    if (window.parent && window.parent.mainLayout) {
        // Utiliser GoldenLayout pour ouvrir un nouvel onglet
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
            // Fallback: rediriger vers la page du tableau
            window.location.href = '/geocaches/table/' + zoneId;
        }
    } else if (window.mainLayout) {
        // Si nous sommes dans la fenêtre principale
        // ...code similaire...
    } else {
        // Fallback: rediriger vers la page du tableau
        window.location.href = '/geocaches/table/' + zoneId;
    }
}
```

## Gestion des événements

Le panneau utilise plusieurs gestionnaires d'événements :

1. **Initialisation** : La fonction `initZoneEvents` configure tous les gestionnaires d'événements
2. **Suppression** : La fonction `confirmDeleteZone` gère la confirmation et l'exécution de la suppression
3. **Réinitialisation** : Les événements HTMX (`htmx:afterSwap`) déclenchent la réinitialisation des gestionnaires

## Backend API

### Structure des données

```python
class Zone:
    id: int
    name: str
    description: str
    created_at: datetime
    geocaches: List[Geocache]  # Relation many-to-many
```

### Endpoints

- Route : `/api/zones` (GET) - Récupère toutes les zones
- Route : `/zones/new` (GET) - Affiche le formulaire d'ajout
- Route : `/zones/add` (POST) - Ajoute une nouvelle zone
- Route : `/zones/<id>/edit` (GET) - Affiche le formulaire de modification
- Route : `/zones/<id>/update` (POST) - Met à jour une zone
- Route : `/zones/<id>/delete` (POST) - Supprime une zone

## Bonnes pratiques

1. **Sécurité**
   - Échapper les variables dans les templates (`{{ zone.name | escape }}`)
   - Valider les données côté serveur
   - Confirmation avant suppression

2. **Performance**
   - Chargement asynchrone avec HTMX
   - Mise à jour partielle du DOM
   - Gestion efficace des événements

3. **UX**
   - Feedback visuel sur les interactions
   - Transitions fluides
   - Messages d'erreur clairs
   - Confirmation avant actions destructives

4. **Maintenance**
   - Séparation des préoccupations (HTML, CSS, JS)
   - Réinitialisation des gestionnaires d'événements après les mises à jour HTMX
   - Gestion des erreurs avec fallbacks
