from bs4 import BeautifulSoup, Comment
from app.routes.coordinates import detect_gps_coordinates

class HtmlCommentsFinderPlugin:
    """
    Plugin pour rechercher tous les commentaires dans un code HTML,
    mais uniquement dans la div ayant la classe 'UserSuppliedContent'.
    Inclut la détection de coordonnées GPS dans les commentaires.
    """

    def __init__(self):
        self.name = "html_comments_finder"
        self.description = ("Recherche tous les commentaires dans un code HTML, "
                          "avec détection de coordonnées GPS dans les commentaires.")

    def execute(self, inputs):
        """
        Récupère le HTML depuis inputs["text"] et cherche tous les commentaires 
        (<!-- ... -->) dans la div class="UserSuppliedContent" via BeautifulSoup.
        Détecte également les coordonnées GPS dans ces commentaires.

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

        # 1. Trouver la div .UserSuppliedContent
        container = soup.find("div", class_="UserSuppliedContent")
        if not container:
            return {
                "findings": [],
                "coordinates": {"exist": False}
            }

        # 2. Récupérer tous les commentaires à l'intérieur de ce container
        comment_nodes = container.find_all(string=lambda text: isinstance(text, Comment))

        # 3. Analyser chaque commentaire
        for comment in comment_nodes:
            comment_text = str(comment).strip()
            if not comment_text:
                continue

            # Vérifier si le commentaire contient des coordonnées
            coords = detect_gps_coordinates(comment_text)
            if coords and coords["exist"] and not coordinates_result:
                coordinates_result = coords

            findings.append({
                "type": "html_comment",
                "content": comment_text,
                "isInteresting": bool(coords and coords["exist"]) or len(comment_text) > 3,
                "description": f"Commentaire HTML{' (contient des coordonnées GPS)' if coords and coords['exist'] else ''}"
            })

        result = {
            "findings": findings
        }
        
        if coordinates_result:
            result["coordinates"] = coordinates_result

        return result
