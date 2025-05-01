# Documentation Technique: Système de Checkers pour Géocaches

## Introduction

Le système de Checkers dans l'application permet de gérer les différents outils de validation de coordonnées utilisés dans les géocaches mystères (Mystery/Unknown caches). Ces outils sont des services tiers qui permettent aux joueurs de vérifier si les coordonnées qu'ils ont calculées pour une géocache sont correctes, sans révéler directement la position finale.

Trois types principaux de checkers sont pris en charge par l'application:
- **GeoCheck**: Services comme geocheck.org ou geotjek.dk
- **Certitude**: Service de certitudes.org
- **Geocaching**: Checker intégré à la plateforme Geocaching.com

## Modèle de données

### Classe `Checker`

La classe `Checker` est définie dans le modèle `geocache.py` et stocke les informations relatives aux checkers:

```python
class Checker(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    geocache_id = db.Column(db.Integer, db.ForeignKey('geocache.id'), nullable=False)
    name = db.Column(db.String(100))
    url = db.Column(db.String(500))
    
    geocache = db.relationship('Geocache', back_populates='checkers')
```

La relation avec le modèle `Geocache` permet d'associer plusieurs checkers à une géocache.

```python
class Geocache(db.Model):
    # autres champs...
    checkers = db.relationship('Checker', back_populates='geocache', cascade='all, delete-orphan')
```

## Extraction des Checkers

L'application extrait les checkers de deux sources principales:

### 1. Scraping des pages Geocaching.com

Le module `geocache_scraper.py` extrait les checkers directement des pages Geocaching.com lorsque l'utilisateur importe une géocache via son code GC.

```python
def extract_checkers(soup: BeautifulSoup) -> List[Dict[str, str]]:
    """
    Extrait les différents checkers présents sur la page de la géocache.
    
    Args:
        soup (BeautifulSoup): L'objet BeautifulSoup de la page
        
    Returns:
        List[Dict[str, str]]: Liste de dictionnaires contenant les informations sur les checkers trouvés
                             avec 'name' et 'url' pour chaque checker
    """
    checkers = []
    
    # Recherche des liens de checker (GeoCheck, Certitude, etc.)
    links = soup.find_all('a', href=True)
    for link in links:
        href = link['href']
        checker_info = None
        
        # GeoCheck - plusieurs domaines possibles (geocheck.org, geotjek.dk, etc.)
        if any(domain in href.lower() for domain in ['geocheck.org', 'geotjek.dk', 'geo_inputchkcoord.php']):
            checker_info = {
                'name': 'GeoCheck',
                'url': href
            }
                
        # Certitude
        elif 'certitudes.org' in href.lower():
            checker_info = {
                'name': 'Certitude',
                'url': href
            }
        
        if checker_info:
            # Vérifier que ce checker n'est pas déjà dans la liste
            if not any(c['url'] == checker_info['url'] for c in checkers):
                checkers.append(checker_info)
    
    # Recherche du checker Geocaching.com
    geocaching_checker = soup.find('div', {'class': 'CoordChecker'})
    if geocaching_checker:
        # Ajouter le checker Geocaching.com à la liste
        checkers.append({
            'name': 'Geocaching',
            'url': '#solution-checker'  # URL symbolique puisque c'est intégré à la page
        })
        
    return checkers
```

### 2. Extraction depuis les fichiers GPX importés

La fonction `extract_checkers_from_description` dans `geocaches.py` extrait les checkers à partir des descriptions HTML contenues dans les fichiers GPX importés:

```python
def extract_checkers_from_description(description_html):
    """
    Extrait les checkers d'une description HTML de géocache.
    
    Args:
        description_html (str): La description HTML d'une géocache
        
    Returns:
        list: Liste de dictionnaires contenant les informations des checkers trouvés
    """
    checkers = []
    
    if not description_html:
        return checkers
    
    try:
        # Parser le HTML avec BeautifulSoup
        soup = BeautifulSoup(description_html, 'html.parser')
        
        # Recherche des liens pour les checkers
        links = soup.find_all('a', href=True)
        for link in links:
            href = link['href']
            checker_info = None
            
            # GeoCheck - plusieurs domaines possibles (geocheck.org, geotjek.dk, etc.)
            if any(domain in href.lower() for domain in ['geocheck.org', 'geotjek.dk', 'geo_inputchkcoord.php']):
                checker_info = {
                    'name': 'GeoCheck',
                    'url': href
                }
                
            # Certitude
            elif 'certitudes.org' in href.lower():
                checker_info = {
                    'name': 'Certitude',
                    'url': href
                }
            
            if checker_info:
                # Vérifier que ce checker n'est pas déjà dans la liste
                if not any(c['url'] == checker_info['url'] for c in checkers):
                    checkers.append(checker_info)
        
        # Recherche du checker Geocaching.com (moins probable dans un GPX)
        coord_checker = soup.find('div', {'class': 'CoordChecker'})
        if coord_checker:
            checkers.append({
                'name': 'Geocaching',
                'url': '#solution-checker'
            })
    
    except Exception as e:
        current_app.logger.error(f"Erreur lors de l'extraction des checkers de la description: {str(e)}")
    
    return checkers
```

Cette fonction est appelée lors du traitement des fichiers GPX par la fonction `process_gpx_file` :

```python
# Extraire et ajouter les checkers de la description HTML
checkers_list = extract_checkers_from_description(description)
for checker_data in checkers_list:
    checker = Checker(
        name=checker_data.get('name', ''),
        url=checker_data.get('url', '')
    )
    geocache.checkers.append(checker)
```

## Détection des Différents Types de Checkers

### 1. GeoCheck

Les GeoChecks se reconnaissent par leurs URLs contenant des domaines spécifiques:
- geocheck.org
- geotjek.dk
- geo_inputchkcoord.php

Exemple de code HTML pour un GeoCheck:
```html
<p><a href="http://geocheck.org/geo_inputchkcoord.php?gid=639639683cfa19d-79f6-426d-9165-2b2ece2dd6a3"><img src="http://geocheck.org/geocheck_small.php?gid=639639683cfa19d-79f6-426d-9165-2b2ece2dd6a3" title="Prüfe Deine Lösung"></a></p>
```

Ou avec le domaine geotjek.dk:
```html
<p><a href="http://geotjek.dk/geo_inputchkcoord.php?gid=6399832c0d5b18d-8ade-47bb-b930-d6c085407d71"><img src="http://geotjek.dk/geocheck_small.php?gid=6399832c0d5b18d-8ade-47bb-b930-d6c085407d71" title="Vérifier votre solution"></a></p>
```

### 2. Certitude

Les checkers Certitude se reconnaissent par la présence de "certitudes.org" dans l'URL:

```html
<div style="text-align: center; max-width: 670px;"> <a href="https://www.certitudes.org/certitude?wp=GCA5H81">
<img src="https://www.certitudes.org/logo?wp=GCA5H81" style="filter:drop-shadow(3px 3px 3px #CCC);" class="InsideTable"></a>
<div style="font-family:Comic Sans MS;">Vous pouvez valider
votre solution d'énigme avec <a href="https://www.certitudes.org/certitude?wp=GCA5H81">certitude</a>.</div>
</div>
```

### 3. Geocaching (Checker natif)

Le checker natif de Geocaching.com est reconnu par la présence d'une div avec la classe "CoordChecker":

```html
<div id="ctl00_ContentBody_uxCacheChecker" class="CoordChecker">
    <span id="ctl00_ContentBody_lblSolutionChecker" class="checker-bold">Solution checker</span>
    <label id="lblSolutionResponse" data-event-category="data" data-event-label="Check Solution Response"></label>
    <label id="solution-lat" class="checker-bold"></label>
    <label id="solution-lon" class="checker-bold"></label>
    <div id="coordinate-div" class="coordinate">
        <input name="ctl00$ContentBody$txtSolutionInput" type="text" value="N 48° 41.529 W 003° 51.901" id="ctl00_ContentBody_txtSolutionInput" class="solution-input">
        <label id="lblSolutionInputError" visible="False" class="error-txt"></label>
        <div id="ctl00_ContentBody_divRecaptcha">
            <br id="recaptcha-br">
            <div class="g-recaptcha" data-sitekey="6Ld6lR4TAAAAAPw2XFziK62mbPHDbId_WWMOPCOA">
                <!-- Contenu recaptcha -->
            </div>
        </div>
        <br>
        <input type="submit" name="ctl00$ContentBody$CheckerButton" value="Check Solution" onclick="CheckCoords(); return false;" id="CheckerButton" class="btn btn-primary btn-submit" data-event-category="data" data-event-label="Check Solution">
    </div>
</div>
```

## Stockage et Affichage des Checkers

Les checkers sont stockés dans la base de données et associés à leur géocache correspondante. Ils sont affichés dans l'interface via différentes routes:

```python
# Exemple dans get_geocache_details
'checkers': [{
    'id': checker.id,
    'name': checker.name,
    'url': checker.url
} for checker in (geocache.checkers or [])],
```

## Standardisation des Noms

Pour faciliter le filtrage et la cohérence dans l'interface utilisateur, les noms des checkers sont standardisés:
- "GeoCheck" pour tous les checkers basés sur geocheck.org ou geotjek.dk
- "Certitude" pour les checkers certitudes.org
- "Geocaching" pour le checker natif de Geocaching.com

Cette standardisation permet d'avoir des noms cohérents indépendamment de la langue de la page d'origine.

## Utilisation Future (Validation des Coordonnées)

Le système de checkers peut être étendu pour permettre la validation des coordonnées directement depuis l'application:

1. Pour les GeoChecks et Certitude, une intégration avec leurs APIs respectives pourrait être développée
2. Pour le checker Geocaching.com, une simulation du formulaire de validation pourrait être mise en place

## Maintenance et Évolution

### Ajout de Nouveaux Types de Checkers

Pour ajouter un nouveau type de checker:

1. Identifier le motif de reconnaissance dans le HTML
2. Ajouter la condition dans les fonctions `extract_checkers` et `extract_checkers_from_description`
3. Standardiser le nom pour ce type de checker

### Problèmes Connus et Limitations

- Les checkers dans les fichiers GPX peuvent parfois ne pas être détectés si le format HTML diffère significativement des modèles attendus
- Le checker Geocaching.com est plus difficile à détecter dans les fichiers GPX car il dépend de la présence de certains éléments HTML qui peuvent être modifiés lors de l'export GPX

## Conclusion

Le système de Checkers offre une fonctionnalité essentielle pour les géocaches de type Mystery en permettant aux utilisateurs d'accéder facilement aux outils de validation sans avoir à les rechercher manuellement dans la description. La standardisation des noms et l'extraction depuis différentes sources (web et GPX) permettent une expérience utilisateur cohérente. 