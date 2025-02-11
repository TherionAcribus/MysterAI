from bs4 import BeautifulSoup
from app.routes.coordinates import detect_gps_coordinates

class ImageAltTitleExtractorPlugin:
    """
    Plugin pour extraire les attributs 'alt' et 'title' des balises <img>,
    avec la possibilité d'exclure certaines sources d'images.
    Inclut la détection de coordonnées GPS dans ces attributs.
    """

    def __init__(self):
        self.name = "image_alt_title_extractor"
        self.description = ("Extrait les attributs 'alt' et 'title' des images, "
                          "avec exclusion des sources non pertinentes et détection de coordonnées GPS.")
        self.excluded_sources = ["geocheck.org"]  # Liste des sources à exclure

    def execute(self, inputs):
        """
        Analyse les balises <img> et extrait les attributs 'alt' et 'title',
        tout en excluant les images provenant des sources spécifiées.
        Détecte également les coordonnées GPS dans ces attributs.

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
        html_content = inputs["text"]
        if not html_content:
            return {
                "findings": [],
                "coordinates": {"exist": False}
            }

        soup = BeautifulSoup(html_content, "html.parser")
        findings = []
        coordinates_result = None

        # Trouver toutes les balises <img> dans le document
        img_tags = soup.find_all("img")

        for img in img_tags:
            src = img.get("src", "").strip()
            
            # Exclure les images dont le src correspond à une source exclue
            if any(excluded in src for excluded in self.excluded_sources):
                continue

            alt = img.get("alt", "").strip()
            title = img.get("title", "").strip()

            # Vérifier les coordonnées dans alt et title
            if alt:
                coords = detect_gps_coordinates(alt)
                if coords and coords["exist"]:
                    coordinates_result = coords
                findings.append({
                    "type": "image_alt",
                    "content": alt,
                    "isInteresting": bool(coords and coords["exist"]) or len(alt) > 3,
                    "description": f"Texte alternatif d'image{' (contient des coordonnées GPS)' if coords and coords['exist'] else ''}"
                })

            if title:
                coords = detect_gps_coordinates(title)
                if coords and coords["exist"] and not coordinates_result:
                    coordinates_result = coords
                findings.append({
                    "type": "image_title",
                    "content": title,
                    "isInteresting": bool(coords and coords["exist"]) or len(title) > 3,
                    "description": f"Titre d'image{' (contient des coordonnées GPS)' if coords and coords['exist'] else ''}"
                })

        result = {
            "findings": findings
        }
        
        if coordinates_result:
            result["coordinates"] = coordinates_result

        return result