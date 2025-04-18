import requests
import json
import re
import logging
from time import sleep
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
            response = requests.get('https://www.geocaching.com/my/default.aspx', cookies=self.cookies)
            
            # Si pas de redirection vers la page de login, nous sommes connectés
            return 'geocaching.com/account/signin' not in response.url and response.status_code == 200
        except Exception:
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
            return self.tokens_cache[geocode]
        
        if not self.ensure_login():
            raise Exception("Les cookies Firefox ne permettent pas d'accéder à Geocaching.com")
        
        try:
            # Récupérer la page du cache
            cache_page = requests.get(
                f'https://www.geocaching.com/seek/cache_details.aspx?wp={geocode}', 
                cookies=self.cookies
            )
            
            if cache_page.status_code != 200:
                raise Exception(f"Erreur lors de l'accès à la page du cache {geocode}: {cache_page.status_code}")
            
            # Vérifier si c'est une page Premium
            soup = BeautifulSoup(cache_page.text, 'html.parser')
            premium_widget = soup.find('section', class_='premium-upgrade-widget')
            if premium_widget:
                raise Exception(f"La géocache {geocode} est réservée aux membres Premium")
            
            # Extraire le userToken avec regex
            token_match = re.search(r'userToken = \'([^\']+)\'', cache_page.text)
            if not token_match:
                raise Exception(f"Impossible de trouver le token utilisateur pour {geocode}")
            
            token = token_match.group(1)
            
            # Mettre en cache le token
            self.tokens_cache[geocode] = token
            
            return token
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération du token utilisateur: {str(e)}")
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