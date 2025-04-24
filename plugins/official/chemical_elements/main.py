import re

class ChemicalElementsPlugin:
    """
    Plugin pour convertir les symboles chimiques des éléments en leur numéro atomique et vice-versa.
    Traite uniquement les symboles chimiques isolés, séparés par des espaces ou des caractères spéciaux.
    """

    def __init__(self):
        self.name = "chemical_elements"
        self.description = "Convertit les symboles chimiques en numéros atomiques et vice-versa"
        
        # Table de correspondance entre les symboles chimiques et leurs numéros atomiques
        self.element_to_number = {
            'H': 1, 'He': 2, 'Li': 3, 'Be': 4, 'B': 5, 'C': 6, 'N': 7, 'O': 8, 'F': 9, 'Ne': 10,
            'Na': 11, 'Mg': 12, 'Al': 13, 'Si': 14, 'P': 15, 'S': 16, 'Cl': 17, 'Ar': 18, 'K': 19, 'Ca': 20,
            'Sc': 21, 'Ti': 22, 'V': 23, 'Cr': 24, 'Mn': 25, 'Fe': 26, 'Co': 27, 'Ni': 28, 'Cu': 29, 'Zn': 30,
            'Ga': 31, 'Ge': 32, 'As': 33, 'Se': 34, 'Br': 35, 'Kr': 36, 'Rb': 37, 'Sr': 38, 'Y': 39, 'Zr': 40,
            'Nb': 41, 'Mo': 42, 'Tc': 43, 'Ru': 44, 'Rh': 45, 'Pd': 46, 'Ag': 47, 'Cd': 48, 'In': 49, 'Sn': 50,
            'Sb': 51, 'Te': 52, 'I': 53, 'Xe': 54, 'Cs': 55, 'Ba': 56, 'La': 57, 'Ce': 58, 'Pr': 59, 'Nd': 60,
            'Pm': 61, 'Sm': 62, 'Eu': 63, 'Gd': 64, 'Tb': 65, 'Dy': 66, 'Ho': 67, 'Er': 68, 'Tm': 69, 'Yb': 70,
            'Lu': 71, 'Hf': 72, 'Ta': 73, 'W': 74, 'Re': 75, 'Os': 76, 'Ir': 77, 'Pt': 78, 'Au': 79, 'Hg': 80,
            'Tl': 81, 'Pb': 82, 'Bi': 83, 'Po': 84, 'At': 85, 'Rn': 86, 'Fr': 87, 'Ra': 88, 'Ac': 89, 'Th': 90,
            'Pa': 91, 'U': 92, 'Np': 93, 'Pu': 94, 'Am': 95, 'Cm': 96, 'Bk': 97, 'Cf': 98, 'Es': 99, 'Fm': 100,
            'Md': 101, 'No': 102, 'Lr': 103, 'Rf': 104, 'Db': 105, 'Sg': 106, 'Bh': 107, 'Hs': 108, 'Mt': 109,
            'Ds': 110, 'Rg': 111, 'Cn': 112, 'Nh': 113, 'Fl': 114, 'Mc': 115, 'Lv': 116, 'Ts': 117, 'Og': 118
        }
        
        # Table inverse pour la conversion numéro -> symbole
        self.number_to_element = {v: k for k, v in self.element_to_number.items()}

    def check_code(self, text: str, strict: bool = False, allowed_chars=None, embedded: bool = False) -> dict:
        """
        Vérifie si le texte contient des symboles chimiques valides isolés.
        
        Args:
            text: Texte à analyser
            strict: Mode strict (True) ou smooth (False)
            allowed_chars: Liste de caractères autorisés en plus des symboles chimiques
            embedded: True si le texte peut contenir des symboles intégrés, False si tout le texte doit être des symboles
            
        Returns:
            Un dictionnaire contenant:
            - is_match: True si des symboles chimiques ont été trouvés
            - fragments: Liste des fragments contenant des symboles chimiques
            - score: Score de confiance (0.0 à 1.0)
        """
        # Si allowed_chars est fourni comme liste, on la convertit en chaîne
        if allowed_chars is not None and isinstance(allowed_chars, list):
            allowed_chars = ''.join(allowed_chars)
            
        # Caractères autorisés par défaut
        if allowed_chars is None:
            allowed_chars = " \t\r\n.:;,_-°"
            
        # En mode strict, le comportement dépend du paramètre embedded
        if strict:
            if embedded:
                # En mode strict+embedded, on recherche des symboles chimiques isolés valides dans le texte
                return self._extract_elements(text, allowed_chars)
            else:
                # En mode strict sans embedded, on vérifie que tout le texte est composé de symboles chimiques valides
                import re
                
                # Échapper les caractères spéciaux pour l'expression régulière
                esc_punct = re.escape(allowed_chars)
                
                # Diviser le texte en "mots" séparés par les caractères autorisés
                words = re.split(f"[{esc_punct}]+", text)
                words = [w for w in words if w]  # Supprimer les chaînes vides
                
                if not words:
                    return {"is_match": False, "fragments": [], "score": 0.0}
                
                # Vérifier que chaque mot est un symbole chimique valide
                fragments = []
                for word in words:
                    if word in self.element_to_number:
                        # Trouver la position du mot dans le texte original
                        start = text.find(word)
                        fragments.append({"value": word, "start": start, "end": start + len(word)})
                    else:
                        return {"is_match": False, "fragments": [], "score": 0.0}
                
                if not fragments:
                    return {"is_match": False, "fragments": [], "score": 0.0}
                
                return {
                    "is_match": True,
                    "fragments": fragments,
                    "score": 1.0
                }
        else:
            # En mode smooth, on recherche des symboles chimiques valides dans le texte
            return self._extract_elements(text, allowed_chars)
            
    def _extract_elements(self, text: str, allowed_chars: str) -> dict:
        """
        Extrait les symboles chimiques valides isolés dans le texte.
        
        Args:
            text: Texte à analyser
            allowed_chars: Caractères autorisés en plus des symboles chimiques
            
        Returns:
            Un dictionnaire contenant:
            - is_match: True si des symboles ont été trouvés
            - fragments: Liste des fragments contenant des symboles chimiques
            - score: Score de confiance (0.0 à 1.0)
        """
        import re
        
        # Échapper les caractères spéciaux pour l'expression régulière
        esc_punct = re.escape(allowed_chars)
        
        # Diviser le texte en "mots" séparés par les caractères autorisés
        pattern = f"[^{esc_punct}]+"
        fragments = []
        
        for match in re.finditer(pattern, text):
            word = match.group(0)
            start, end = match.span()
            
            # Vérifier si le mot est un symbole chimique valide
            if word in self.element_to_number:
                fragments.append({"value": word, "start": start, "end": end})
        
        # Calculer un score basé sur le nombre de fragments trouvés
        score = 1.0 if fragments else 0.0
        
        return {
            "is_match": bool(fragments),
            "fragments": fragments,
            "score": score
        }

    def decode_fragments(self, text: str, fragments: list) -> str:
        """
        Décode uniquement les fragments valides dans le texte.
        Remplace chaque symbole chimique par son numéro atomique.
        """
        # Trier les fragments par position de début (en ordre décroissant)
        # pour éviter les problèmes de décalage d'indices
        sorted_fragments = sorted(fragments, key=lambda f: f["start"], reverse=True)
        
        # Remplacer chaque fragment par sa valeur décodée
        result = list(text)
        for fragment in sorted_fragments:
            start, end = fragment["start"], fragment["end"]
            element = fragment["value"]
            
            # Convertir le symbole chimique en numéro atomique
            if element in self.element_to_number:
                number = str(self.element_to_number[element])
                result[start:end] = number
        
        return ''.join(result)


    def encode(self, text: str) -> str:
        """
        Encode des nombres en symboles chimiques lorsque possible.
        Ne traite que les nombres isolés par des séparateurs.
        """
        
        # Caractères considérés comme séparateurs
        separators = " \t\r\n.:;,_-°"
        
        # Nouvelle approche : utiliser une expression régulière pour capturer les mots
        # et les séparateurs, puis traiter uniquement les "mots" qui sont des nombres
        result = ""
        # Regex pour capturer soit un mot, soit un séparateur
        pattern = r'([' + re.escape(separators) + r']+)|([^' + re.escape(separators) + r']+)'
        
        for match in re.finditer(pattern, text):
            part = match.group(0)
            if part.strip(separators) and part.isdigit():
                # C'est un nombre isolé
                number = int(part)
                if number in self.number_to_element:
                    # Remplacer par le symbole chimique
                    result += self.number_to_element[number]
                else:
                    # Garder tel quel
                    result += part
            else:
                # Garder tel quel (séparateur ou autre mot)
                result += part
        
        return result

    def decode(self, text: str) -> str:
        """
        Décode des symboles chimiques isolés en numéros atomiques.
        Utilise une approche plus robuste pour éviter les problèmes de regex.
        """
        
        # Caractères considérés comme séparateurs
        separators = " \t\r\n.:;,_-°"
        
        # Nouvelle approche : utiliser une expression régulière pour capturer les mots
        # et les séparateurs, puis traiter uniquement les "mots" qui sont des symboles chimiques
        result = ""
        # Regex pour capturer soit un mot, soit un séparateur
        pattern = r'([' + re.escape(separators) + r']+)|([^' + re.escape(separators) + r']+)'
        
        for match in re.finditer(pattern, text):
            part = match.group(0)
            if part.strip(separators) and part in self.element_to_number:
                # C'est un symbole chimique isolé
                result += str(self.element_to_number[part])
            else:
                # Garder tel quel (séparateur ou autre mot)
                result += part
        
        return result

    def execute(self, inputs: dict) -> dict:
        """
        Point d'entrée principal du plugin.
        
        Args:
            inputs: Dictionnaire contenant les paramètres d'entrée
                - mode: "encode", "decode" ou "detect"
                - text: Texte à traiter
                - strict: "strict" ou "smooth" pour le mode de décodage
                - allowed_chars: Liste de caractères autorisés
                - embedded: True si le texte peut contenir des symboles intégrés
                
        Returns:
            Dictionnaire contenant le résultat de l'opération
        """
        mode = inputs.get("mode", "encode").lower()
        text = inputs.get("text", "")
        
        # Considère le mode strict si la valeur du paramètre "strict" est exactement "strict"
        strict_mode = inputs.get("strict", "").lower() == "strict"
        
        # Récupération de la liste des caractères autorisés
        allowed_chars = inputs.get("allowed_chars", None)
        
        # Récupération du mode embedded
        embedded = inputs.get("embedded", False)

        if not text:
            return {"error": "Aucun texte fourni à traiter."}

        try:
            if mode == "encode":
                encoded = self.encode(text)
                return {
                    "result": {
                        "decoded_text": encoded,
                        "text": {
                            "text_output": encoded,
                            "text_input": text,
                            "mode": mode
                        }
                    }
                }
                
            elif mode == "decode":
                if strict_mode:
                    check = self.check_code(text, strict=True, allowed_chars=allowed_chars, embedded=embedded)
                    if not check["is_match"]:
                        return {"error": "Aucun symbole chimique valide trouvé en mode strict"}
                    # Décode les fragments trouvés
                    decoded = self.decode_fragments(text, check["fragments"])
                else:
                    check = self.check_code(text, strict=False, allowed_chars=allowed_chars, embedded=embedded)
                    if not check["is_match"]:
                        # Si aucun fragment n'a été trouvé, on retourne une erreur
                        return {"error": "Aucun symbole chimique détecté dans le texte"}
                    
                    # Décode les fragments trouvés
                    decoded = self.decode_fragments(text, check["fragments"])
                    
                    # Vérifier si le texte décodé est différent du texte d'origine
                    if decoded == text:
                        return {"error": "Aucun symbole chimique n'a pu être décodé"}

                # Format de retour compatible avec metadetection
                return {
                    "result": {
                        "decoded_text": decoded,
                        "text": {
                            "text_output": decoded,
                            "text_input": text,
                            "mode": mode
                        }
                    }
                }
            
            elif mode == "detect":
                check = self.check_code(text, strict=strict_mode, allowed_chars=allowed_chars, embedded=embedded)
                if not check["is_match"]:
                    return {"error": "Aucun symbole chimique détecté dans le texte"}
                
                # Mettre en évidence les symboles chimiques trouvés
                fragments_info = []
                for fragment in check["fragments"]:
                    element = fragment["value"]
                    number = self.element_to_number.get(element, "?")
                    fragments_info.append(f"{element} (numéro atomique: {number})")
                
                return {
                    "result": {
                        "detected": True,
                        "message": f"Symboles chimiques détectés: {', '.join(fragments_info)}",
                        "fragments": check["fragments"]
                    }
                }
                
            else:
                return {"error": f"Mode inconnu : {mode}"}
                
        except Exception as e:
            return {"error": f"Erreur pendant le traitement : {e}"}