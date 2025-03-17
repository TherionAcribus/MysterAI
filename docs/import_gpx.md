# Documentation d'importation de fichiers GPX

## Introduction

Cette documentation explique comment importer des géocaches à partir de fichiers GPX (Pocket Query) dans l'application MysteryAI. L'importation de fichiers GPX permet d'ajouter rapidement plusieurs géocaches à la fois dans une zone spécifique.

## Fonctionnalités principales

- Importation de fichiers GPX individuels ou d'archives ZIP contenant plusieurs fichiers GPX
- Traitement des géocaches principales et de leurs waypoints additionnels
- Gestion des fichiers de waypoints additionnels (fichiers *-wpts.gpx)
- Association d'une géocache à plusieurs zones
- Mise à jour des waypoints pour les géocaches existantes

## Prérequis

- Un fichier GPX exporté depuis Geocaching.com (Pocket Query)
- Une zone existante dans l'application pour y ajouter les géocaches

## Processus d'importation

### 1. Accéder à la page d'importation

1. Connectez-vous à l'application
2. Accédez à la section "Géocaches"
3. Cliquez sur le bouton "Importer GPX"

### 2. Sélectionner les fichiers et options

1. Sélectionnez la zone dans laquelle vous souhaitez importer les géocaches
2. Choisissez le fichier GPX ou ZIP à importer
3. Options disponibles :
   - **Mettre à jour les waypoints** : Si cette option est cochée, les waypoints des géocaches existantes seront mis à jour

### 3. Lancer l'importation

1. Cliquez sur le bouton "Importer"
2. L'application traitera le fichier et affichera la progression en temps réel
3. Une fois l'importation terminée, un résumé des opérations effectuées sera affiché

## Gestion des zones multiples

Une des fonctionnalités clés de notre système d'importation est la gestion des zones multiples. Une même géocache peut désormais être associée à plusieurs zones, ce qui évite la duplication des données et permet une organisation plus flexible.

### Comportement lors de l'importation

- Si une géocache n'existe pas encore dans la base de données, elle est créée et associée à la zone sélectionnée
- Si une géocache existe déjà mais n'est pas associée à la zone sélectionnée, elle est simplement associée à cette nouvelle zone
- Si une géocache existe déjà et est déjà associée à la zone sélectionnée :
  - Sans l'option "Mettre à jour les waypoints" : la géocache est ignorée
  - Avec l'option "Mettre à jour les waypoints" : seuls les waypoints sont mis à jour

## Structure des fichiers GPX

### Fichier GPX principal

Le fichier GPX principal contient les informations sur les géocaches :

```xml
<wpt lat="49.7587" lon="5.936217">
  <time>2024-04-19T00:00:00</time>
  <name>GCAP9A8</name>
  <desc>✉ Letterbox 81 🦕MATRIX🦖 51 Y by Sawi52, Letterbox Hybrid (4.5/3.5)</desc>
  <url>https://coord.info/GCAP9A8</url>
  <urlname>✉ Letterbox 81 🦕MATRIX🦖 51 Y</urlname>
  <sym>Geocache</sym>
  <type>Geocache|Letterbox Hybrid</type>
  <groundspeak:cache id="9488459" archived="False" available="True" xmlns:groundspeak="http://www.groundspeak.com/cache/1/0/1">
    <groundspeak:name>✉ Letterbox 81 🦕MATRIX🦖 51 Y</groundspeak:name>
    <groundspeak:placed_by>Sawi52</groundspeak:placed_by>
    <groundspeak:owner id="15593754">Sawi52</groundspeak:owner>
    <!-- Autres informations... -->
  </groundspeak:cache>
</wpt>
```

### Fichier de waypoints additionnels

Les fichiers de waypoints additionnels (généralement nommés avec le suffixe `-wpts.gpx`) contiennent les waypoints associés aux géocaches :

```xml
<wpt lat="49.75665" lon="5.943533">
  <time>2023-12-24T06:13:35</time>
  <name>FNAHM30</name>
  <desc>Final Location</desc>
  <url>http://www.geocaching.com/seek/wpt.aspx?WID=ba8de3c8-9eda-4038-bc67-f7f52561aa21</url>
  <urlname>Final Location</urlname>
  <sym>Final Location</sym>
  <type>Waypoint|Final Location</type>
  <cmt />
</wpt>
```

## Données extraites

Pour chaque géocache, les informations suivantes sont extraites et stockées :

- **Informations de base** : GC Code, nom, propriétaire, type de cache
- **Coordonnées** : Latitude, longitude (formats décimal et GC)
- **Caractéristiques** : Difficulté, terrain, taille
- **Contenu** : Description, indices
- **Statistiques** : Nombre de favoris, nombre de logs
- **Dates** : Date de création
- **Waypoints additionnels** : Nom, préfixe, coordonnées, notes

## Résolution des problèmes courants

### Erreur "Contrainte d'unicité"

Si vous rencontrez une erreur de contrainte d'unicité lors de l'importation, cela peut être dû à une ancienne version de la base de données. Suivez les instructions de migration dans le fichier `migration_instructions.txt` pour mettre à jour votre base de données.

### Fichiers GPX non reconnus

Assurez-vous que vos fichiers GPX sont au format standard de Geocaching.com (Pocket Query). Les fichiers GPX créés manuellement ou provenant d'autres sources peuvent ne pas être correctement reconnus.

### Waypoints non associés

Si les waypoints additionnels ne sont pas correctement associés aux géocaches, vérifiez que :
- Le fichier de waypoints suit la convention de nommage standard (suffixe `-wpts.gpx`)
- Les waypoints contiennent une référence au code GC de la géocache principale

## Conseils d'utilisation

- **Importation par lots** : Pour importer un grand nombre de géocaches, utilisez un fichier ZIP contenant tous vos fichiers GPX
- **Organisation par zones** : Créez des zones logiques pour organiser vos géocaches (par région, par difficulté, par thème, etc.)
- **Mise à jour régulière** : Utilisez l'option "Mettre à jour les waypoints" pour maintenir vos données à jour

## Modifications techniques récentes

### Gestion multi-zones

La récente mise à jour du modèle de données permet désormais d'associer une géocache à plusieurs zones :

1. Une table d'association `geocache_zone` a été créée pour gérer la relation many-to-many entre géocaches et zones
2. La contrainte d'unicité sur le champ `gc_code` a été supprimée
3. Le champ `zone_id` a été retiré de la table `geocache`

Ces modifications permettent :
- D'éviter la duplication des données
- De faciliter la gestion des géocaches présentes dans plusieurs zones
- D'améliorer les performances de l'application

### Compatibilité

Pour assurer la compatibilité avec le code existant, des propriétés virtuelles ont été ajoutées :
- `geocache.zone` : Retourne la première zone associée à la géocache
- `geocache.zone_id` : Retourne l'ID de la première zone associée à la géocache 