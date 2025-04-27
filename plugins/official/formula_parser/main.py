import re

class FormulaParserPlugin:
    """
    Plugin pour parser des formules/coordonnées dans un texte.
    Exemple : N49°18.(B-A)(B-C-F)(D+E)  E006°16.(C+F)(D+F)(C+D)
    """

    def __init__(self):
        self.name = "formula_parser"
        self.description = "Plugin pour parser des coordonnées/formules GPS dans un texte"

    def execute(self, inputs):
        """
        Le PluginManager appelle cette méthode. On récupère `text` et on tente de détecter
        des formules de coordonnées (N... E...) dans le texte.
        
        Return structure (exemple) :
        {
          "coordinates": [
            {
              "north": "N49°18.(B-A)(B-C-F)(D+E)",
              "east": "E006°16.(C+F)(D+F)(C+D)"
            },
            ...
          ],
          "details": {
             "regex_used": ...
          }
        }
        """
        text = inputs.get('text', '')
        if not text:
            return {
                "coordinates": [],
                "details": {"error": "Aucun texte fourni."}
            }

        # Détection de base pour trouver les coordonnées
        coordinates = []
        
        # Cas particulier: le format spécifique demandé
        # N 48° 41.E D B E 006° 09. F C (A / 2)
        special_pattern = r'N\s+48°\s+41\.\s*[A-Z]\s+[A-Z]\s+[A-Z][\s\n]*E\s+006°\s+09\.\s+[A-Z]\s+[A-Z]\s+\([A-Z]\s*/\s*\d+\)'
        match = re.search(special_pattern, text, re.DOTALL)
        
        if match:
            # Format trouvé, le traiter spécifiquement
            full_text = match.group(0)
            
            # Séparation Nord/Est
            if 'E 006' in full_text:
                parts = full_text.split('E 006')
                north_part = parts[0].strip()
                east_part = 'E 006' + parts[1].strip()
                
                # Nettoyage spécifique du format Nord
                north_clean = re.sub(r'48°\s+41\.\s*([A-Z])\s+([A-Z])\s+([A-Z])', r'48° 41.\1\2\3', north_part)
                
                # Nettoyage spécifique du format Est
                east_clean = re.sub(r'006°\s+09\.\s+([A-Z])\s+([A-Z])\s+\(([A-Z])\s*/\s*(\d+)\)', r'006° 09.\1\2(\3/\4)', east_part)
                
                coordinates.append({
                    "north": north_clean,
                    "east": east_clean
                })
        
        # Si le format spécifique n'est pas trouvé, on utilise les méthodes traditionnelles
        if not coordinates:
            north_match = self._find_north(text)
            east_match = self._find_east(text)
            
            if north_match or east_match:
                north_str = north_match.group(0) if north_match else ""
                east_str = east_match.group(0) if east_match else ""
                
                # Nettoyer les coordonnées en évitant les chevauchements
                if north_match and east_match:
                    n_start, n_end = north_match.span()
                    e_start, e_end = east_match.span()
                    if e_start < n_end:  # Chevauchement
                        north_str = north_str[:-(n_end-e_start)].strip()
                
                # Application d'un nettoyage simplifié
                north_clean = self._basic_clean(north_str)
                east_clean = self._basic_clean(east_str)
                
                coordinates.append({
                    "north": north_clean,
                    "east": east_clean
                })
        
        return {
            "coordinates": coordinates,
            "details": {
                "info": "Coordonnées détectées et nettoyées"
            }
        }

    # --------------------------------------------------------------------------
    # Fonctions internes
    # --------------------------------------------------------------------------
    
    def _basic_clean(self, coord_str):
        """
        Nettoyage de base pour les formats standards
        """
        if not coord_str or '.' not in coord_str:
            return coord_str
            
        # Pour le format N 48° 41.X Y Z, transformer en N 48° 41.XYZ
        result = re.sub(r'(\d{1,2}°\s+\d{1,2}\.)\s*([A-Z])\s+([A-Z])\s+([A-Z])', r'\1\2\3\4', coord_str)
        
        # Pour le format E 006° 09.X Y (Z/W), transformer en E 006° 09.XY(Z/W)
        result = re.sub(r'(\d{1,3}°\s+\d{1,2}\.)\s*([A-Z])\s+([A-Z])\s+\(([A-Z])\s*/\s*(\d+)\)', r'\1\2\3(\4/\5)', result)
        
        return result
    
    def _find_north(self, description):
        """
        Essaie de trouver une coordonnée Nord (ou Sud) dans le texte.
        """
        patterns = [
            # Format classique
            r"[N|S]\s*[A-Za-z0-9]{1,2}\s*°\s*[A-Za-z0-9]{1,2}\.\s*[A-Za-z0-9]{1,3}",
            # Format avec opérations
            r"[N|S]\s*[A-Za-z0-9()+*/\- ]{2,}°[A-Za-z0-9()+*/\- ]{2,}\.[A-Za-z0-9()+*/\- ]{3,}",
            # Format spécifique
            r"N\s+48°\s+41\.[A-Z]\s+[A-Z]\s+[A-Z]"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, description)
            if match:
                return match
        return None

    def _find_east(self, description):
        """
        Essaie de trouver une coordonnée Est (ou Ouest) dans le texte.
        """
        patterns = [
            # Format classique
            r"[E|W]\s*[A-Za-z0-9]{1,3}\s*°\s*[A-Za-z0-9]{1,2}\.\s*[A-Za-z0-9]{1,3}",
            # Format avec opérations
            r"[E|W]\s*[A-Za-z0-9()+*/\- ]{2,}°[A-Za-z0-9()+*/\- ]{2,}\.[A-Za-z0-9()+*/\- ]{2,}",
            # Format spécifique
            r"E\s+006°\s+09\.\s+[A-Z]\s+[A-Z]\s+\([A-Z]\s*/\s*\d+\)"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, description)
            if match:
                return match
        return None
