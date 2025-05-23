import requests
import json
import re
import logging
from time import sleep
from datetime import datetime
import browser_cookie3
from bs4 import BeautifulSoup

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('GeocachingAPI')

class GeocachingClient:
    """Classe principale pour interagir avec geocaching.com en utilisant les cookies Firefox"""
    
    def __init__(self):
        self.session = requests.Session()
        self.logged_in = False
        self.tokens_cache = {}  # Cache pour stocker les tokens utilisateur par geocode
        
        # Initialisation avec les cookies Firefox
        try:
            self.cookies = browser_cookie3.firefox()
            # Ajouter les cookies à la session
            for cookie in self.cookies:
                if cookie.domain and '.geocaching.com' in cookie.domain:
                    self.session.cookies.set(
                        cookie.name, 
                        cookie.value, 
                        domain=cookie.domain,
                        path=cookie.path
                    )
                    
            logger.info("Cookies Firefox trouvés pour geocaching.com")
            
            # Tester si on est déjà connecté 
            self.logged_in = self._check_login_status()
            if self.logged_in:
                logger.info("Connecté à Geocaching.com avec les cookies Firefox")
            else:
                logger.warning("Les cookies Firefox ne permettent pas de se connecter à Geocaching.com")
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des cookies Firefox: {str(e)}")
            self.cookies = None
    
    def _check_login_status(self):
        """Vérifie si les cookies permettent d'être connecté"""
        try:
            # Essayer d'accéder à une page qui nécessite une connexion
            logger.info("Vérification du statut de connexion à Geocaching.com...")
            response = self.session.get('https://www.geocaching.com/my/default.aspx', allow_redirects=True)
            
            logger.info(f"Statut de la réponse: {response.status_code}")
            logger.info(f"URL finale: {response.url}")
            
            # Si pas de redirection vers la page de login, nous sommes connectés
            is_logged_in = 'geocaching.com/account/signin' not in response.url and response.status_code == 200
            
            if is_logged_in:
                logger.info("Utilisateur connecté à Geocaching.com")
            else:
                logger.warning("Utilisateur NON connecté à Geocaching.com")
                
            return is_logged_in
        except Exception as e:
            logger.error(f"Erreur lors de la vérification du statut de connexion: {str(e)}")
            return False
    
    def ensure_login(self):
        """S'assure que l'utilisateur est connecté via les cookies Firefox"""
        if not self.logged_in:
            self.logged_in = self._check_login_status()
        return self.logged_in
    
    def get_user_token(self, geocode, force_refresh=False):
        """
        Récupère le token utilisateur depuis la page de détails du cache
        
        Args:
            geocode (str): Code du geocache
            force_refresh (bool): Force le rafraîchissement du token même s'il est en cache
            
        Returns:
            str: Le token utilisateur
        """
        # Vérifier si le token est en cache et valide
        if not force_refresh and geocode in self.tokens_cache:
            logger.info(f"Utilisation du token en cache pour {geocode}")
            return self.tokens_cache[geocode]
        
        if not self.ensure_login():
            logger.error("Les cookies Firefox ne permettent pas d'accéder à Geocaching.com")
            raise Exception("Les cookies Firefox ne permettent pas d'accéder à Geocaching.com")
        
        try:
            # Récupérer la page du cache
            logger.info(f"Récupération de la page du cache {geocode}")
            cache_url = f'https://www.geocaching.com/seek/cache_details.aspx?wp={geocode}'
            logger.info(f"URL de la page du cache: {cache_url}")
            
            cache_page = self.session.get(
                cache_url, 
                cookies=self.cookies,
                allow_redirects=True
            )
            
            logger.info(f"Statut de la réponse pour la page du cache: {cache_page.status_code}")
            logger.info(f"URL finale après redirection: {cache_page.url}")
            
            if cache_page.status_code != 200:
                logger.error(f"Erreur lors de l'accès à la page du cache {geocode}: {cache_page.status_code}")
                logger.error(f"Contenu de la réponse: {cache_page.text[:200]}...")
                raise Exception(f"Erreur lors de l'accès à la page du cache {geocode}: {cache_page.status_code}")
            
            # Vérifier si c'est une page Premium
            soup = BeautifulSoup(cache_page.text, 'html.parser')
            premium_widget = soup.find('section', class_='premium-upgrade-widget')
            if premium_widget:
                logger.error(f"La géocache {geocode} est réservée aux membres Premium")
                raise Exception(f"La géocache {geocode} est réservée aux membres Premium")
            
            # Extraire le userToken avec regex
            token_match = re.search(r'userToken = \'([^\']+)\'', cache_page.text)
            if not token_match:
                logger.error(f"Impossible de trouver le token utilisateur pour {geocode}")
                logger.debug(f"Contenu de la page: {cache_page.text[:500]}...")
                raise Exception(f"Impossible de trouver le token utilisateur pour {geocode}")
            
            token = token_match.group(1)
            logger.info(f"Token utilisateur trouvé pour {geocode}: {token[:10]}...")
            
            # Mettre en cache le token
            self.tokens_cache[geocode] = token
            
            return token
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération du token utilisateur: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            raise
    
    def make_api_request(self, url, data, method="POST"):
        """
        Effectue une requête API vers geocaching.com
        
        Args:
            url (str): URL de l'API
            data (dict): Données à envoyer
            method (str): Méthode HTTP (POST, GET, etc.)
            
        Returns:
            dict: La réponse JSON
        """
        if not self.ensure_login():
            raise Exception("Les cookies Firefox ne permettent pas d'accéder à Geocaching.com")
            
        headers = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
        
        try:
            if method.upper() == "POST":
                response = requests.post(url, data=json.dumps(data), headers=headers, cookies=self.cookies)
            elif method.upper() == "GET":
                response = requests.get(url, params=data, headers=headers, cookies=self.cookies)
            else:
                raise ValueError(f"Méthode HTTP non supportée: {method}")
                
            if response.status_code != 200:
                logger.error(f"Erreur API {response.status_code}: {response.text}")
                return None
            
            try:
                return response.json()
            except json.JSONDecodeError:
                logger.error(f"Erreur lors du décodage de la réponse JSON: {response.text}")
                return None
            
        except Exception as e:
            logger.error(f"Erreur lors de la requête API: {str(e)}")
            return None

class PersonalNotes:
    """Classe pour gérer les notes personnelles"""
    
    def __init__(self, client):
        self.client = client
    
    def update(self, geocode, note):
        """
        Met à jour la note personnelle d'un cache
        
        Args:
            geocode (str): Code du geocache
            note (str): Texte de la note personnelle
            
        Returns:
            bool: True si la mise à jour a réussi, False sinon
        """
        try:
            user_token = self.client.get_user_token(geocode)
            
            data = {
                "dto": {
                    "et": note,  # et = personal note text
                    "ut": user_token  # ut = user token
                }
            }
            
            url = "https://www.geocaching.com/seek/cache_details.aspx/SetUserCacheNote"
            
            result = self.client.make_api_request(url, data)
            
            return result is not None
            
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour de la note personnelle: {str(e)}")
            return False

class Coordinates:
    """Classe pour gérer les coordonnées des caches"""
    
    def __init__(self, client):
        self.client = client
    
    def update(self, geocode, latitude, longitude):
        """
        Met à jour les coordonnées d'un cache
        
        Args:
            geocode (str): Code du geocache
            latitude (float): Latitude en degrés décimaux
            longitude (float): Longitude en degrés décimaux
            
        Returns:
            bool: True si la mise à jour a réussi, False sinon
        """
        try:
            user_token = self.client.get_user_token(geocode)
            
            # Format attendu par l'API de Geocaching.com
            data = {
                "dto": {
                    "data": {
                        "lat": latitude,
                        "lng": longitude
                    },
                    "ut": user_token
                }
            }
            
            url = "https://www.geocaching.com/seek/cache_details.aspx/SetUserCoordinate"
            
            # Débogage des données envoyées
            logger.info(f"Envoi des coordonnées à Geocaching.com pour {geocode}: lat={latitude}, lng={longitude}")
            logger.info(f"Données JSON envoyées: {json.dumps(data)}")
            
            result = self.client.make_api_request(url, data)
            
            if result:
                logger.info(f"Résultat de l'API: {json.dumps(result)}")
            
            return result is not None
            
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour des coordonnées: {str(e)}")
            return False
    
    def reset(self, geocode):
        """
        Réinitialise les coordonnées d'un cache aux coordonnées d'origine
        
        Args:
            geocode (str): Code du geocache
            
        Returns:
            bool: True si la réinitialisation a réussi, False sinon
        """
        try:
            user_token = self.client.get_user_token(geocode)
            
            data = {
                "dto": {
                    "ut": user_token
                }
            }
            
            url = "https://www.geocaching.com/seek/cache_details.aspx/ResetUserCoordinate"
            
            result = self.client.make_api_request(url, data)
            
            return result is not None
            
        except Exception as e:
            logger.error(f"Erreur lors de la réinitialisation des coordonnées: {str(e)}")
            return False
        
class GeocachingLogs:
    """Classe pour gérer les logs des geocaches"""
    
    def __init__(self, client):
        self.client = client
    
    def get_logs(self, geocode, log_type="ALL", count=10):
        """
        Récupère les logs d'un geocache
        
        Args:
            geocode (str): Code du geocache (ex: GC12345)
            log_type (str): Type de logs à récupérer (ALL, FRIENDS, OWN)
            count (int): Nombre de logs à récupérer
            
        Returns:
            list: Liste des logs récupérés
        """
        try:
            if not self.client.ensure_login():
                logger.error(f"Erreur: non connecté à Geocaching.com pour obtenir les logs de {geocode}")
                raise Exception("Vous devez être connecté pour accéder aux logs")
            
            # Obtenir le token utilisateur
            user_token = self.client.get_user_token(geocode)
            logger.info(f"Token utilisateur obtenu pour {geocode}: {user_token[:10]}...")
            
            # Construire les paramètres
            params = {
                'tkn': user_token,
                'idx': '1',
                'num': str(count),
                'decrypt': 'false'
            }
            
            # Ajouter des paramètres spécifiques selon le type de logs
            if log_type == "FRIENDS":
                params['sf'] = "True"
            elif log_type == "OWN":
                params['sp'] = "True"
            
            # Effectuer la requête
            url = "https://www.geocaching.com/seek/geocache.logbook"
            logger.info(f"Requête vers {url} avec params: {params}")
            
            # Utiliser le client pour faire la requête
            response = self.client.session.get(url, params=params, cookies=self.client.cookies)
            
            logger.info(f"Statut de la réponse: {response.status_code}")
            
            if response.status_code != 200:
                logger.error(f"Erreur lors de la récupération des logs: {response.status_code}")
                logger.error(f"Contenu de la réponse: {response.text[:200]}...")
                return []
            
            # Analyser la réponse JSON
            try:
                data = response.json()
                logger.info(f"Réponse JSON reçue, statut: {data.get('status')}")
            except Exception as e:
                logger.error(f"Erreur lors du décodage JSON: {str(e)}")
                logger.error(f"Contenu de la réponse: {response.text[:200]}...")
                return []
            
            if data.get('status') != 'success':
                logger.error(f"Erreur de statut: {data.get('status')}")
                logger.error(f"Message d'erreur: {data.get('msg', 'Aucun message')}")
                return []
            
            # Traiter les logs
            logs = []
            for log_data in data.get('data', []):
                log = {
                    'id': log_data.get('LogID'),
                    'code': f"GL{log_data.get('LogID')}",
                    'type': self._normalize_log_type(log_data.get('LogType')),
                    'author': log_data.get('UserName'),
                    'author_guid': log_data.get('AccountGuid'),
                    'date': self._parse_date(log_data.get('Visited')),
                    'text': log_data.get('LogText'),
                    'found_count': log_data.get('GeocacheFindCount'),
                    'images': self._parse_images(log_data.get('Images', [])),
                    'is_friend_log': log_type == "FRIENDS"
                }
                logs.append(log)
            
            logger.info(f"Nombre de logs récupérés pour {geocode}: {len(logs)}")
            return logs
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des logs: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return []
    
    def _parse_date(self, date_str):
        """Parse une date au format GC"""
        try:
            if not date_str:
                return None
            # Format: 2025-05-02T18:30:31Z
            return datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%SZ")
        except Exception:
            return None
    
    def _parse_images(self, images_data):
        """Parse les images d'un log"""
        images = []
        for img in images_data:
            image = {
                'url': f"https://imgcdn.geocaching.com/cache/log/large/{img.get('FileName')}",
                'title': img.get('Name'),
                'description': img.get('Descr')
            }
            images.append(image)
        return images

    def _normalize_log_type(self, log_type):
        """Normalize the log type"""
        if log_type == "Found":
            return "Found"
        elif log_type == "DNF":
            return "Did Not Find"
        elif log_type == "Webcam":
            return "Webcam"
        elif log_type == "Note":
            return "Note"
        elif log_type == "Other":
            return "Other"
        else:
            return log_type