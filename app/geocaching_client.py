import requests
import json
import re
import logging
from time import sleep

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('GeocachingAPI')

class GeocachingClient:
    """Classe principale pour interagir avec geocaching.com"""
    
    def __init__(self, username=None, password=None):
        self.session = requests.Session()
        self.logged_in = False
        self.username = username
        self.password = password
        self.tokens_cache = {}  # Cache pour stocker les tokens utilisateur par geocode
    
    def login(self):
        """Se connecter à geocaching.com"""
        if self.logged_in:
            return True
            
        if not self.username or not self.password:
            raise ValueError("Nom d'utilisateur et mot de passe requis pour se connecter")
            
        logger.info(f"Tentative de connexion avec l'utilisateur {self.username}")
        
        try:
            # Obtenir les viewstates
            login_page = self.session.get('https://www.geocaching.com/account/signin')
            
            # Extraire le __RequestVerificationToken
            token_match = re.search(r'name="__RequestVerificationToken" type="hidden" value="([^"]+)"', login_page.text)
            if not token_match:
                raise Exception("Impossible de trouver le token de vérification")
            
            token = token_match.group(1)
            
            # Effectuer la connexion
            login_data = {
                '__RequestVerificationToken': token,
                'Username': self.username,
                'Password': self.password
            }
            
            login_response = self.session.post('https://www.geocaching.com/account/signin', data=login_data)
            
            self.logged_in = 'Your account has been successfully signed in' in login_response.text
            
            if self.logged_in:
                logger.info("Connexion réussie")
            else:
                logger.error("Échec de la connexion")
                
            return self.logged_in
            
        except Exception as e:
            logger.error(f"Erreur lors de la connexion: {str(e)}")
            return False
    
    def ensure_login(self):
        """S'assure que l'utilisateur est connecté"""
        if not self.logged_in:
            return self.login()
        return True
    
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
            raise Exception("Vous devez être connecté pour accéder au token utilisateur")
        
        try:
            # Récupérer la page du cache
            cache_page = self.session.get(f'https://www.geocaching.com/seek/cache_details.aspx?wp={geocode}')
            
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
            raise Exception("Vous devez être connecté pour effectuer cette action")
            
        headers = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
        
        try:
            if method.upper() == "POST":
                response = self.session.post(url, data=json.dumps(data), headers=headers)
            elif method.upper() == "GET":
                response = self.session.get(url, params=data, headers=headers)
            else:
                raise ValueError(f"Méthode HTTP non supportée: {method}")
                
            if response.status_code != 200:
                logger.error(f"Erreur API {response.status_code}: {response.text}")
                return None
                
            return response.json()
            
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
            
            data = {
                "dto": {
                    "ut": user_token,
                    "data": {
                        "lat": latitude,
                        "lng": longitude
                    }
                }
            }
            
            url = "https://www.geocaching.com/seek/cache_details.aspx/SetUserCoordinate"
            
            result = self.client.make_api_request(url, data)
            
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