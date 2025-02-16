# Système de Notes pour les Géocaches

## Vue d'ensemble

Le système de notes permet aux utilisateurs de gérer des annotations pour chaque géocache. Les notes sont organisées par type et affichées dans un panneau dédié dans l'interface principale.

## Types de Notes

- **Note personnelle** (user) : Notes générales de l'utilisateur
- **Note système** (system) : Informations générées par le système
- **Indice** (hint) : Indices supplémentaires pour la résolution
- **Spoiler** (spoiler) : Informations révélant la solution

## Interface Utilisateur

### Panneau de Notes

Le panneau de notes est accessible depuis la barre de navigation inférieure. Il affiche :
- Le nom de la géocache sélectionnée
- Un bouton pour ajouter une nouvelle note
- La liste des notes existantes, triées par date de création (plus récentes en premier)

Chaque note affiche :
- Son type (avec code couleur)
- Sa date de création
- Son contenu
- Des boutons d'édition et de suppression

### Formulaire de Note

Le formulaire permet de :
- Sélectionner le type de note
- Saisir le contenu
- Sauvegarder ou annuler les modifications

## Architecture Technique

### Modèles de Données

```python
class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    note_type = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime)
    updated_at = db.Column(db.DateTime)
    
    geocaches = db.relationship('Geocache', secondary='geocache_note', back_populates='notes')

class GeocacheNote(db.Model):
    geocache_id = db.Column(db.Integer, db.ForeignKey('geocache.id'), primary_key=True)
    note_id = db.Column(db.Integer, db.ForeignKey('note.id'), primary_key=True)
    added_at = db.Column(db.DateTime)
```

### Routes API

- `GET /api/logs/notes_panel` : Charge le panneau de notes
- `GET /api/logs/note_form` : Charge le formulaire de note
- `POST /api/logs/geocache/<id>/notes` : Crée une nouvelle note
- `PUT /api/logs/note/<id>` : Modifie une note existante
- `DELETE /api/logs/note/<id>` : Supprime une note

### Composants Frontend

- **Stimulus Controller** : `notes_controller.js`
  - Gère le chargement des notes
  - Maintient la synchronisation avec la géocache sélectionnée

- **Templates** :
  - `notes_panel.html` : Structure principale du panneau
  - `note_form.html` : Formulaire d'ajout/édition
  - `note_item.html` : Affichage d'une note individuelle

### Intégration HTMX

- Chargement dynamique du contenu
- Mises à jour partielles de l'interface
- Gestion des formulaires sans rechargement
- Animations de transition

## Exemples d'Utilisation

### Ajouter une Note

1. Cliquer sur "Ajouter une note"
2. Sélectionner le type
3. Saisir le contenu
4. Cliquer sur "Ajouter"

### Modifier une Note

1. Cliquer sur l'icône d'édition
2. Modifier le contenu ou le type
3. Cliquer sur "Modifier"

### Supprimer une Note

1. Cliquer sur l'icône de suppression
2. Confirmer la suppression
