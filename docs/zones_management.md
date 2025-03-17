# Documentation de Gestion des Zones

## Introduction

Les zones sont un concept central dans MysteryAI, permettant d'organiser les géocaches par région géographique ou par thème. Cette documentation explique comment gérer les zones dans l'application.

## Fonctionnalités

- Création de nouvelles zones
- Modification des zones existantes
- Suppression de zones
- Association de géocaches à des zones
- Visualisation des géocaches par zone

## Interface Utilisateur

### Page de Gestion des Zones

La page de gestion des zones (`/zones`) présente une interface conviviale pour gérer toutes vos zones :

- **Liste des zones** : Affiche toutes les zones existantes avec leur nom, description et date de création
- **Bouton d'ajout** : Permet de créer une nouvelle zone
- **Actions par zone** :
  - Modifier : Permet de mettre à jour le nom et la description d'une zone
  - Supprimer : Permet de supprimer une zone (avec confirmation)
  - Voir les géocaches : Affiche toutes les géocaches associées à cette zone

### Formulaire d'Ajout/Modification

Le formulaire d'ajout/modification de zone (`/zones/new` ou `/zones/<id>/edit`) permet de :

- Définir un nom pour la zone (obligatoire)
- Ajouter une description détaillée (optionnelle)

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

## API

### Endpoints

| Méthode | URL | Description |
|---------|-----|-------------|
| GET | `/api/zones` | Récupère toutes les zones |
| GET | `/api/zones/<id>` | Récupère une zone spécifique |
| GET | `/zones` | Affiche la page de gestion des zones |
| GET | `/zones/new` | Affiche le formulaire d'ajout de zone |
| POST | `/zones/add` | Ajoute une nouvelle zone |
| GET | `/zones/<id>/edit` | Affiche le formulaire de modification d'une zone |
| POST | `/zones/<id>/update` | Met à jour une zone existante |
| POST | `/zones/<id>/delete` | Supprime une zone |
| GET | `/api/zones/<id>/geocaches` | Récupère toutes les géocaches d'une zone |
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

1. Accédez à la page de gestion des zones
2. Cliquez sur "Ajouter une zone"
3. Entrez un nom comme "Luxembourg Sud"
4. Ajoutez une description comme "Géocaches situées dans la région sud du Luxembourg"
5. Cliquez sur "Ajouter"

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

Si vous ne pouvez pas supprimer une zone :
- Vérifiez qu'elle ne contient plus de géocaches
- Ou utilisez l'option "Forcer la suppression" qui supprimera également l'association avec les géocaches 