import logging

class CoordinatesFinderPlugin:
    """
    Plugin pour détecter les coordonnées GPS dans le texte d'une géocache.
    Utilise la fonction detect_gps_coordinates pour identifier différents formats de coordonnées.
    """

    def __init__(self):
        self.name = "coordinates_finder"
        self.description = "Détecte les coordonnées GPS dans le texte sous tous les formats possibles"
        self.logger = logging.getLogger(__name__)

    def execute(self, inputs):
        """
        Analyse le texte d'une géocache pour détecter des coordonnées GPS.

        Args:
            inputs: Dictionnaire contenant:
                - text: Texte HTML/brut de la géocache à analyser
                - geocache_id: ID de la géocache (optionnel)

        Returns:
            Dictionnaire au format standardisé :
            {
                "findings": [
                    {
                        "type": "coordinates",
                        "content": str,
                        "isInteresting": bool,
                        "description": str,
                        "confidence": float,
                        "source": str
                    }
                ],
                "coordinates": {
                    "exist": bool,
                    "ddm_lat": str,
                    "ddm_lon": str,
                    "ddm": str,
                    "confidence": float,
                    "source": str
                }
            }
        """
        text = inputs.get('text', '')
        if not text:
            return {
                "findings": [],
                "coordinates": {"exist": False}
            }

        try:
            # Importer la fonction de détection de coordonnées
            from app.routes.coordinates import detect_gps_coordinates
            
            # Détecter les coordonnées dans le texte brut
            coordinates_result = detect_gps_coordinates(text, include_numeric_only=False)
            
            findings = []
            
            if coordinates_result.get('exist', False):
                # Créer un finding pour les coordonnées détectées
                confidence = coordinates_result.get('confidence', 0.75)
                source = coordinates_result.get('source', 'unknown')
                ddm_text = coordinates_result.get('ddm', '')
                
                findings.append({
                    "type": "coordinates",
                    "content": ddm_text,
                    "isInteresting": True,
                    "description": f"Coordonnées GPS détectées par {source} (confiance: {confidence:.0%})",
                    "confidence": confidence,
                    "source": source
                })
                
                self.logger.info(f"Coordonnées détectées : {ddm_text} (source: {source}, confiance: {confidence})")
            else:
                self.logger.info("Aucune coordonnée détectée dans le texte")

            return {
                "findings": findings,
                "coordinates": coordinates_result
            }

        except Exception as e:
            self.logger.error(f"Erreur dans CoordinatesFinderPlugin: {e}")
            return {
                "findings": [],
                "coordinates": {"exist": False},
                "error": str(e)
            }

    def execute_with_numeric_only(self, inputs, origin_coords=None):
        """
        Version alternative qui inclut la détection de coordonnées numériques pures.
        
        Args:
            inputs: Dictionnaire avec le texte à analyser
            origin_coords: Coordonnées d'origine au format DDM (optionnel)
        
        Returns:
            Résultats de détection incluant les formats numériques
        """
        text = inputs.get('text', '')
        if not text:
            return {
                "findings": [],
                "coordinates": {"exist": False}
            }

        try:
            from app.routes.coordinates import detect_gps_coordinates
            
            # Détecter avec les coordonnées numériques activées
            coordinates_result = detect_gps_coordinates(
                text, 
                include_numeric_only=True, 
                origin_coords=origin_coords
            )
            
            findings = []
            
            if coordinates_result.get('exist', False):
                confidence = coordinates_result.get('confidence', 0.75)
                source = coordinates_result.get('source', 'unknown')
                ddm_text = coordinates_result.get('ddm', '')
                
                findings.append({
                    "type": "coordinates_numeric",
                    "content": ddm_text,
                    "isInteresting": True,
                    "description": f"Coordonnées numériques détectées par {source} (confiance: {confidence:.0%})",
                    "confidence": confidence,
                    "source": source
                })
                
                self.logger.info(f"Coordonnées numériques détectées : {ddm_text}")

            return {
                "findings": findings,
                "coordinates": coordinates_result
            }

        except Exception as e:
            self.logger.error(f"Erreur dans execute_with_numeric_only: {e}")
            return {
                "findings": [],
                "coordinates": {"exist": False},
                "error": str(e)
            } 