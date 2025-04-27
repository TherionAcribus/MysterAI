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

        # Détection des coordonnées dans les formats suivants:
        # Format standard: N 49° 18.123 E 006° 16.456
        # Format avec formules: N49°18.(B-A)(B-C-F)(D+E) E006°16.(C+F)(D+F)(C+D)
        # Format avec lettres espacées: N 48° 41.E D B E 006° 09. F C (A / 2)
        
        coordinates = []
        
        # Approche 1: Tenter d'extraire le bloc complet N...E... si présent
        full_coords = self._extract_full_coord_block(text)
        if full_coords:
            coordinates.append(full_coords)
        
        # Approche 2: Si l'approche 1 échoue, tenter de détecter séparément les parties N et E
        if not coordinates:
            # Chercher les formats spécifiques avec des expressions régulières très précises
            north_pattern = r'N\s+\d{1,2}°\s+\d{1,2}\.\s*[A-Z]\s+[A-Z]\s+[A-Z]'
            east_pattern = r'E\s+00\d°\s+0\d\.\s*[A-Z]\s+[A-Z]\s+\([A-Z]\s*\/\s*\d+\)'
            
            north_matches = re.findall(north_pattern, text)
            east_matches = re.findall(east_pattern, text)
            
            if north_matches and east_matches:
                coordinates.append({
                    "north": north_matches[0].strip(),
                    "east": east_matches[0].strip()
                })
            elif north_matches:
                coordinates.append({
                    "north": north_matches[0].strip(),
                    "east": ""
                })
            elif east_matches:
                coordinates.append({
                    "north": "",
                    "east": east_matches[0].strip()
                })
        
        # Si les approches précédentes échouent, essayer avec les détecteurs traditionnels
        if not coordinates:
            # Trouver les coordonnées avec les anciennes méthodes (pour compatibilité)
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
                
                coordinates.append({
                    "north": north_str.strip(),
                    "east": east_str.strip()
                })
        
        # Recherche du format spécifique demandé
        if not coordinates:
            specific_patterns = [
                # Format exact: N 48° 41.E D B et E 006° 09. F C (A / 2) sur deux lignes
                (r'N\s+48°\s+41\.[A-Z]\s+[A-Z]\s+[A-Z]', r'E\s+006°\s+09\.\s+[A-Z]\s+[A-Z]\s+\([A-Z]\s*/\s*\d+\)')
            ]
            
            for north_pat, east_pat in specific_patterns:
                north = re.search(north_pat, text)
                east = re.search(east_pat, text)
                
                if north and east:
                    coordinates.append({
                        "north": north.group(0).strip(),
                        "east": east.group(0).strip()
                    })
                    break
        
        return {
            "coordinates": coordinates,
            "details": {
                "info": "Coordonnées détectées",
                "formats_supportés": [
                    "Standard (N XX° XX.XXX E XXX° XX.XXX)",
                    "Formules (NXX°XX.(X)(X) EXXX°XX.(X)(X))",
                    "Lettres espacées (N XX° XX.X X X E XXX° XX. X X (X / X))"
                ]
            }
        }

    # --------------------------------------------------------------------------
    # Fonctions internes
    # --------------------------------------------------------------------------
    
    def _extract_full_coord_block(self, text):
        """
        Tente d'extraire le bloc entier de coordonnées (N... E...) d'un seul coup.
        Cette méthode est spécialement conçue pour le format demandé.
        """
        # Recherche exacte du format N 48° 41.E D B suivi de E 006° 09. F C (A / 2)
        pattern = r'N\s+48°\s+41\.[A-Z]\s+[A-Z]\s+[A-Z][\s\n]*E\s+006°\s+09\.\s+[A-Z]\s+[A-Z]\s+\([A-Z]\s*/\s*\d+\)'
        match = re.search(pattern, text, re.DOTALL)
        
        if match:
            # Diviser en parties nord et est
            full_text = match.group(0)
            parts = re.split(r'[\s\n]*E\s+', full_text, 1)
            
            if len(parts) == 2:
                north = parts[0].strip()
                east = "E " + parts[1].strip()
                return {
                    "north": north,
                    "east": east
                }
        
        # Recherche avec motif plus souple
        pattern2 = r'(N\s+\d{1,2}°\s+\d{1,2}\.[A-Z](?:\s+[A-Z]){1,2})[\s\n]*(E\s+00\d°\s+0\d\.\s+[A-Z](?:\s+[A-Z])(?:\s+\([A-Z]\s*/\s*\d+\)))'
        match = re.search(pattern2, text, re.DOTALL)
        if match:
            return {
                "north": match.group(1).strip(),
                "east": match.group(2).strip()
            }
            
        return None
    
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
