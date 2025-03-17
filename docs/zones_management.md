# Documentation de Gestion des Zones

## Introduction

Les zones sont un concept central dans MysteryAI, permettant d'organiser les géocaches par région géographique ou par thème. Cette documentation explique comment gérer les zones dans l'application.

## Fonctionnalités

- Création de nouvelles zones
- Modification des zones existantes
- Suppression de zones (avec suppression automatique des géocaches associées uniquement à cette zone)
- Association de géocaches à des zones
- Visualisation des géocaches par zone

## Interface Utilisateur

### Panneau de Gestion des Zones

Le panneau de gestion des zones présente une interface moderne et réactive pour gérer toutes vos zones :

- **Liste des zones** : Affiche toutes les zones existantes avec leur nom et description
- **Bouton d'ajout** : Permet de créer une nouvelle zone directement dans le panneau
- **Actions par zone** :
  - Modifier : Permet de mettre à jour le nom et la description d'une zone
  - Supprimer : Permet de supprimer une zone (avec confirmation)
  - Voir les géocaches : Ouvre un nouvel onglet dans GoldenLayout avec toutes les géocaches associées à cette zone

### Formulaire d'Ajout/Modification

Le formulaire d'ajout/modification de zone permet de :

- Définir un nom pour la zone (obligatoire)
- Ajouter une description détaillée (optionnelle)

Le formulaire utilise HTMX pour une expérience utilisateur fluide, sans rechargement de page.

## Modèle de Données

### Structure

```python
class Zone(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    geocaches = db.relationship('Geocache', secondary='geocache_zone', back_populates='zones')
```

### Relation avec les Géocaches

Une zone peut contenir plusieurs géocaches, et une géocache peut appartenir à plusieurs zones (relation many-to-many). Cette relation est gérée par la table d'association `geocache_zone` :

```python
class GeocacheZone(db.Model):
    geocache_id = db.Column(db.Integer, db.ForeignKey('geocache.id'), primary_key=True)
    zone_id = db.Column(db.Integer, db.ForeignKey('zone.id'), primary_key=True)
    added_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
```

## Comportement lors de la Suppression

Lorsqu'une zone est supprimée, le système effectue les actions suivantes :

1. Pour chaque géocache associée à cette zone :
   - Si la géocache n'appartient qu'à cette zone, elle est également supprimée
   - Si la géocache appartient à d'autres zones, seule la référence à la zone supprimée est retirée

2. La zone est ensuite supprimée de la base de données

Ce comportement garantit que les géocaches orphelines ne restent pas dans la base de données, tout en préservant celles qui sont associées à d'autres zones.

## API

### Endpoints

| Méthode | URL | Description |
|---------|-----|-------------|
| GET | `/api/zones` | Récupère toutes les zones (JSON ou HTML avec HTMX) |
| GET | `/api/zones/<id>` | Récupère une zone spécifique |
| GET | `/zones/new` | Affiche le formulaire d'ajout de zone |
| POST | `/zones/add` | Ajoute une nouvelle zone |
| GET | `/zones/<id>/edit` | Affiche le formulaire de modification d'une zone |
| POST | `/zones/<id>/update` | Met à jour une zone existante |
| POST | `/zones/<id>/delete` | Supprime une zone et gère les géocaches associées |
| GET | `/geocaches/table/<id>` | Affiche le tableau des géocaches d'une zone |
| GET | `/api/active-zone` | Récupère la zone active |
| POST | `/api/active-zone` | Définit la zone active |

### Format de Réponse

```json
{
  "id": 1,
  "name": "Nom de la zone",
  "description": "Description de la zone",
  "created_at": "2024-03-17T12:00:00Z",
  "geocaches_count": 42
}
```

## Intégration avec HTMX

L'interface de gestion des zones utilise HTMX pour offrir une expérience utilisateur fluide :

- Les formulaires sont soumis sans rechargement de page
- Les listes sont mises à jour dynamiquement après chaque action
- Les modales de confirmation utilisent JavaScript pour une interaction naturelle

## Intégration avec GoldenLayout

Lorsque l'utilisateur clique sur "Voir les géocaches" d'une zone :

1. Un nouvel onglet est créé dans GoldenLayout
2. Le tableau des géocaches de la zone est chargé dans cet onglet
3. L'utilisateur peut interagir avec les géocaches sans quitter l'interface principale

## Bonnes Pratiques

1. **Nommage des zones** :
   - Utilisez des noms courts mais descriptifs
   - Évitez les caractères spéciaux qui pourraient causer des problèmes d'URL

2. **Organisation** :
   - Créez des zones par région géographique pour faciliter la planification
   - Ou créez des zones thématiques pour regrouper des géocaches similaires

3. **Maintenance** :
   - Supprimez les zones vides ou obsolètes
   - Mettez à jour les descriptions pour refléter les changements

## Exemples d'Utilisation

### Création d'une Zone Régionale

1. Cliquez sur le bouton "Ajouter" dans le panneau des zones
2. Entrez un nom comme "Luxembourg Sud"
3. Ajoutez une description comme "Géocaches situées dans la région sud du Luxembourg"
4. Cliquez sur "Créer"

### Association de Géocaches à une Zone

1. Importez un fichier GPX en sélectionnant la zone appropriée
2. Ou ajoutez manuellement des géocaches à la zone via l'interface d'ajout de géocache

## Résolution des Problèmes

### Zone Non Affichée

Si une zone n'apparaît pas dans la liste :
- Vérifiez que la zone a bien été créée (consultez les logs)
- Rafraîchissez la page
- Vérifiez que vous avez les permissions nécessaires

### Erreur lors de la Suppression

Si vous rencontrez une erreur lors de la suppression d'une zone :
- Vérifiez les logs du serveur pour plus de détails
- Assurez-vous que la base de données est accessible
- Si l'erreur persiste, essayez de supprimer les géocaches associées manuellement avant de supprimer la zone 