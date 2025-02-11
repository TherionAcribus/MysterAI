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

        # 1) Tenter de trouver un (ou plusieurs) pattern N... E... dans le texte
        #    On peut imaginer qu'il y a potentiellement plusieurs blocs distincts.
        #    Par simplification, on va chercher la "première" occurrence de N et E.
        #    Vous pouvez améliorer pour capturer toutes les occurrences.

        north_match = self._find_north(text)
        east_match = self._find_east(text)

        if not north_match and not east_match:
            return {
                "coordinates": [],
                "details": {
                    "info": "Aucune coordonnée détectée"
                }
            }

        # 2) Gérer chevauchement potentiel entre la partie north et east
        #    Dans votre code, vous aviez une fonction reduce_north().
        #    Ci-dessous, on utilise `_reduce_north_east()` pour harmoniser.
        north_str, east_str = self._reduce_north_east(north_match, east_match)

        # 3) Construire le résultat
        coordinates = []
        if north_str or east_str:
            coordinates.append({
                "north": north_str,
                "east": east_str
            })

        return {
            "coordinates": coordinates,
            "details": {
                "regex_used": [
                    "find_north() / find_east() with multiple patterns"
                ]
            }
        }

    # --------------------------------------------------------------------------
    # Fonctions internes
    # --------------------------------------------------------------------------

    def _find_north(self, description):
        """
        Essaie de trouver une coordonnée Nord (ou Sud) dans le texte, y compris 
        avec des formules (parenthèses, +, -, etc.).
        Retourne un re.Match ou None.
        """
        # Regex 1 (classical)
        north_regex2 = re.compile(r"[N|S]\s*[A-Za-z0-9]\s*[A-Za-z0-9]\s*°\s*[A-Za-z0-9]\s*[A-Za-z0-9]\.\s*[A-Za-z0-9]\s*[A-Za-z0-9]\s*[A-Za-z0-9]")

        # Regex 2 (classical with optional length)
        north_regex4 = re.compile(r"[N|S]\s*[A-Za-z0-9]{1,2}\s*°\s*[A-Za-z0-9]{1,2}\.\s*[A-Za-z0-9]{1,3}")

        # Regex 3 (avec opérations)
        north_regex3 = re.compile(r"[N|S]\s*[A-Za-z0-9()+*/\- ]{2,}°[A-Za-z0-9()+*/\- ]{2,}\.[A-Za-z0-9()+*/\- ]{3,}")

        for reg in [north_regex2, north_regex3, north_regex4]:
            match = re.search(reg, description)
            if match:
                return match
        return None

    def _find_east(self, description):
        """
        Essaie de trouver une coordonnée Est (ou Ouest) dans le texte, y compris 
        avec des formules. Retourne un re.Match ou None.
        """
        south_regex1 = re.compile(r"[E|W]\s*[A-Za-z0-9]{1,3}\s*°\s*[A-Za-z0-9]{1,2}\.\s*[A-Za-z0-9]{1,3}")
        south_regex2 = re.compile(r"[E|W]\s*[A-Za-z0-9()+*/\- ]{2,}°[A-Za-z0-9()+*/\- ]{2,}\.[A-Za-z0-9()+*/\- ]{2,}")
        south_regex3 = re.compile(r"[E|W]\s*[A-Za-z0-9]{1,3}\s*°\s*[A-Za-z0-9]{1,2}\.\s*[A-Za-z0-9]{1,3}")

        for reg in [south_regex1, south_regex2, south_regex3]:
            match = re.search(reg, description)
            if match:
                return match
        return None

    def _reduce_north_east(self, north_match, east_match):
        """
        Supprime d'éventuels chevauchements. Renvoie deux chaînes finales (north_str, east_str).
        
        Exemple : si le texte N... E... se chevauche, on découpe proprement.
        """
        if not north_match:
            n_str = ""
        else:
            n_str = north_match.group(0)

        if not east_match:
            e_str = ""
        else:
            e_str = east_match.group(0)

        # On peut affiner ici la logique si on détecte un overlap,
        # en se basant sur les .span() de north_match et east_match.
        if north_match and east_match:
            # Si la coord E débute avant la fin de la coord N, on tronque
            n_start, n_end = north_match.span()
            e_start, e_end = east_match.span()
            if e_start < n_end:
                # Chevauchement
                overlap = n_end - e_start
                # On tronque la fin de n_str
                n_str = n_str[:-overlap].strip()

        return n_str.strip(), e_str.strip()
