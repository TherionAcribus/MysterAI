# Documentation du Panneau des Zones

## Vue d'ensemble

Le panneau des zones est un composant de l'interface utilisateur qui affiche la liste des zones de géocaching disponibles. Il est implémenté en utilisant une combinaison de HTML, Tailwind CSS et JavaScript.

## Structure de l'interface

### Emplacement
- Situé dans le panneau latéral gauche
- Accessible via l'icône de marqueur de carte dans la barre latérale
- Template : `zones_list.html`

### Design

Le panneau utilise un design moderne avec :
- Fond sombre (`bg-gray-800`)
- Cartes interactives pour chaque zone
- Effets de survol
- Icônes FontAwesome
- Boutons d'action stylisés

## Implémentation

### Template HTML (zones_list.html)

```html
<div class="space-y-4">
    {% for zone in zones %}
    <div class="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors">
        <h3 class="text-lg font-semibold text-blue-400 mb-2">{{ zone.name }}</h3>
        <p class="text-gray-300 mb-4">{{ zone.description }}</p>
        <button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                onclick="window.openGeocachesTab('{{ zone.id }}', '{{ zone.name | escape }}')">
            <i class="fas fa-table mr-2"></i>
            Voir les géocaches
        </button>
    </div>
    {% endfor %}
</div>
```

### Styles Tailwind

Les classes principales utilisées :
- `space-y-4` : Espacement vertical entre les éléments
- `bg-gray-800` : Fond sombre
- `rounded-lg` : Coins arrondis
- `hover:bg-gray-700` : Effet de survol
- `transition-colors` : Animation de transition
- `text-blue-400` : Couleur du texte des titres
- `text-gray-300` : Couleur du texte descriptif

### Intégration avec le Layout

Le panneau est intégré dans la structure principale via :
```javascript
document.querySelectorAll('.sidebar-button').forEach(button => {
    button.addEventListener('click', function() {
        const panelId = this.dataset.panel;
        const isRight = this.dataset.side === 'right';
        // ... gestion de l'affichage du panneau
    });
});
```

## Fonctionnalités

### Affichage des zones

1. Les zones sont chargées depuis le backend via l'endpoint `/api/zones`
2. Chaque zone affiche :
   - Son nom
   - Sa description (si disponible)
   - Un bouton pour voir les géocaches

### Interaction avec les géocaches

Quand l'utilisateur clique sur "Voir les géocaches" :
1. La fonction `window.openGeocachesTab` est appelée
2. Un nouvel onglet est créé dans GoldenLayout
3. Le tableau Tabulator est initialisé avec les géocaches de la zone

## Backend API

### Structure des données

```python
class Zone:
    id: int
    name: str
    description: str
```

### Endpoint

- Route : `/api/zones`
- Méthode : GET
- Format de réponse : JSON
- Structure :
```json
[
    {
        "id": 1,
        "name": "Nom de la zone",
        "description": "Description de la zone"
    }
]
```

## Bonnes pratiques

1. **Sécurité**
   - Échapper les variables dans les templates
   - Valider les données côté serveur

2. **Performance**
   - Chargement asynchrone des données
   - Mise en cache des résultats si nécessaire

3. **UX**
   - Feedback visuel sur les interactions
   - Transitions fluides
   - Messages d'erreur clairs

4. **Maintenance**
   - Code commenté
   - Structure modulaire
   - Documentation à jour
