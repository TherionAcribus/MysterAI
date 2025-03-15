from app.models.models import Geocache
from sqlalchemy import text

class AdditionalWaypointsAnalyzerPlugin:
    """
    Plugin pour analyser les waypoints additionnels d'une géocache
    et détecter les coordonnées GPS qui y sont présentes.
    """

    def __init__(self):
        self.name = "additional_waypoints_analyzer"
        self.description = ("Analyse les waypoints additionnels de la géocache "
                          "et détecte les coordonnées GPS qui y sont présentes.")

    def execute(self, inputs):
        """
        Analyse les waypoints additionnels de la géocache spécifiée.
        
        Retourne le format standardisé :
        {
            "findings": [
                {
                    "type": str,
                    "content": str,
                    "isInteresting": bool,
                    "description": str
                }
            ],
            "coordinates": {  # optionnel, si des coordonnées sont trouvées
                "exist": bool,
                "ddm_lat": str,
                "ddm_lon": str,
                "ddm": str
            }
        }
        """
        geocache_id = inputs.get("geocache_id")
        if not geocache_id:
            return {
                "findings": [],
                "coordinates": {"exist": False}
            }

        # Récupérer la géocache et ses waypoints
        geocache = Geocache.query.get(geocache_id)
        if not geocache:
            return {
                "findings": [],
                "coordinates": {"exist": False}
            }

        findings = []
        coordinates_result = None

        # Analyser chaque waypoint
        for waypoint in geocache.additional_waypoints:
            # Si le waypoint a des coordonnées
            if waypoint.gc_coords:
                # Si c'est le premier waypoint avec coordonnées, on le garde
                if not coordinates_result:
                    coordinates_result = {
                        "exist": True,
                        "ddm_lat": waypoint.gc_lat,
                        "ddm_lon": waypoint.gc_lon,
                        "ddm": waypoint.gc_coords
                    }

                findings.append({
                    "type": "waypoint",
                    "content": f"{waypoint.prefix} {waypoint.lookup} - {waypoint.name}: {waypoint.gc_coords}",
                    "isInteresting": True,
                    "description": f"Waypoint avec coordonnées GPS"
                })
            
            # Si le waypoint a une note, on l'ajoute aussi
            if waypoint.note:
                findings.append({
                    "type": "waypoint_note",
                    "content": f"{waypoint.prefix} {waypoint.lookup} - {waypoint.name}: {waypoint.note}",
                    "isInteresting": len(waypoint.note) > 3,
                    "description": f"Note du waypoint"
                })

        result = {
            "findings": findings
        }
        
        if coordinates_result:
            result["coordinates"] = coordinates_result

        return result
