class RomanNumeralsPlugin:
    """
    Plugin pour convertir entre décimal et chiffres romains.
    - mode="encode" => text est un entier (sous forme de string),
        on renvoie le nombre en chiffres romains
    - mode="decode" => text est une chaîne de chiffres romains,
        on renvoie le nombre décimal correspondant
    """

    def __init__(self):
        self.name = "roman_numerals"
        self.description = "Convertit un entier décimal en chiffres romains et inversement."
    
    def encode_roman(self, number: int) -> str:
        """
        Convertit un nombre décimal (ex: 42) en chiffres romains (ex: 'XLII').
        Règles standard (pas de notation au-delà de 3999 dans la forme classique, 
        mais on peut étendre si on le souhaite).
        
        Args:
            number: Le nombre décimal à convertir
            
        Returns:
            La représentation en chiffres romains
            
        Raises:
            ValueError: Si le nombre est négatif ou nul
        """
        if number <= 0:
            # Normalement, on ne définit pas de romains pour 0 ou négatifs
            raise ValueError("Les chiffres romains ne sont pas définis pour 0 ou négatifs.")

        # Couples (valeur, symbole)
        roman_map = [
            (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"),
            (100, "C"), (90, "XC"), (50, "L"), (40, "XL"),
            (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")
        ]

        result = []
        for val, symb in roman_map:
            while number >= val:
                result.append(symb)
                number -= val
        return "".join(result)

    def decode_roman(self, roman_str: str) -> int:
        """
        Convertit une chaîne de chiffres romains (ex: 'XLII') en entier (ex: 42).
        
        Args:
            roman_str: La chaîne de caractères représentant un nombre en chiffres romains
            
        Returns:
            Le nombre décimal correspondant
            
        Raises:
            ValueError: Si la chaîne contient des caractères non romains
        """
        # Dictionnaire de base
        roman_values = {
            'M': 1000, 'D': 500, 'C': 100,
            'L': 50,   'X': 10,   'V': 5,
            'I': 1
        }

        # Mise en majuscules
        roman_str = roman_str.upper()

        total = 0
        prev_value = 0

        for char in reversed(roman_str):
            # On lit de droite à gauche
            if char not in roman_values:
                raise ValueError(f"Symbole romain inconnu: {char}")
            value = roman_values[char]
            # Si la valeur est au moins égale à la valeur précédente, on additionne
            # Sinon, on la soustrait (ex: IV = 4 => 'I' précède 'V')
            if value >= prev_value:
                total += value
            else:
                total -= value
            prev_value = value
        
        return total
        
    def check_code(self, text: str, strict: bool = False, allowed_chars=None, embedded: bool = False) -> dict:
        """
        Vérifie si le texte contient des chiffres romains valides.
        
        Args:
            text: Texte à analyser
            strict: Mode strict (True) ou smooth (False)
            allowed_chars: Liste de caractères autorisés en plus des chiffres romains
            embedded: True si le texte peut contenir du code intégré, False si tout le texte doit être du code
            
        Returns:
            Un dictionnaire contenant:
            - is_match: True si des chiffres romains ont été trouvés
            - fragments: Liste des fragments contenant des chiffres romains
            - score: Score de confiance (0.0 à 1.0)
        """
        # Si allowed_chars est fourni comme liste, on la convertit en chaîne
        if allowed_chars is not None and isinstance(allowed_chars, list):
            allowed_chars = ''.join(allowed_chars)
            
        # Caractères autorisés par défaut
        if allowed_chars is None:
            allowed_chars = " \t\r\n.:;,_-°"
            
        # Caractères romains valides
        roman_chars = "IVXLCDM"
        
        # En mode strict, le comportement dépend du paramètre embedded
        if strict:
            if embedded:
                # En mode strict+embedded, on recherche des fragments de chiffres romains valides dans le texte
                return self._extract_roman_fragments(text, allowed_chars)
            else:
                # En mode strict sans embedded, on vérifie que tout le texte est composé de chiffres romains valides
                import re
                
                # Échapper les caractères spéciaux pour l'expression régulière
                esc_punct = re.escape(allowed_chars)
                pattern_str = f"^[{roman_chars}{esc_punct}]*$"
                
                # Vérifier que tous les caractères sont autorisés
                if not re.match(pattern_str, text.upper()):
                    return {"is_match": False, "fragments": [], "score": 0.0}
                
                # Vérifier qu'il y a au moins un caractère romain
                roman_chars_found = re.sub(f"[{esc_punct}]", "", text.upper())
                if not roman_chars_found:
                    return {"is_match": False, "fragments": [], "score": 0.0}
                
                # Vérifier que le texte contient des chiffres romains valides
                # Supprimer les caractères autorisés
                clean_text = re.sub(f"[{esc_punct}]", "", text.upper())
                
                # Vérifier si le texte est un chiffre romain valide
                try:
                    self.decode_roman(clean_text)
                    is_valid = True
                except ValueError:
                    is_valid = False
                    
                if not is_valid:
                    return {"is_match": False, "fragments": [], "score": 0.0}
                
                # Tout est OK, on renvoie le texte "strippé" comme fragment
                stripped_text = text.strip(allowed_chars)
                return {
                    "is_match": True,
                    "fragments": [{"value": stripped_text, "start": text.find(stripped_text), "end": text.find(stripped_text) + len(stripped_text)}],
                    "score": 1.0
                }
        else:
            # En mode smooth, on recherche des fragments de chiffres romains valides dans le texte
            return self._extract_roman_fragments(text, allowed_chars)
            
    def _extract_roman_fragments(self, text: str, allowed_chars: str) -> dict:
        """
        Extrait les fragments de chiffres romains valides dans le texte.
        
        Args:
            text: Texte à analyser
            allowed_chars: Caractères autorisés en plus des chiffres romains
            
        Returns:
            Un dictionnaire contenant:
            - is_match: True si des fragments ont été trouvés
            - fragments: Liste des fragments contenant des chiffres romains
            - score: Score de confiance (0.0 à 1.0)
        """
        import re
        
        # Caractères romains valides
        roman_chars = "IVXLCDM"
        
        # Échapper les caractères spéciaux pour l'expression régulière
        esc_punct = re.escape(allowed_chars)
        
        # Rechercher des blocs de texte séparés par des caractères autorisés
        pattern = f"([^{esc_punct}]+)|([{esc_punct}]+)"
        fragments = []
        
        for m in re.finditer(pattern, text.upper()):
            block = m.group(0)
            start, end = m.span()
            
            # Ignorer les blocs de ponctuation
            if re.match(f"^[{esc_punct}]+$", block):
                continue
            
            # Vérifier si le bloc contient uniquement des caractères romains
            if all(c in roman_chars for c in block):
                # Vérifier si le bloc est un chiffre romain valide
                try:
                    self.decode_roman(block)
                    fragments.append({"value": text[start:end], "start": start, "end": end})
                except ValueError:
                    # Ce n'est pas un chiffre romain valide
                    pass
        
        # Calculer un score basé sur le nombre de fragments trouvés
        score = 1.0 if fragments else 0.0
        
        return {
            "is_match": bool(fragments),
            "fragments": fragments,
            "score": score
        }

    def decode_fragments(self, text: str, fragments: list) -> str:
        """
        Décode les fragments de chiffres romains dans le texte.
        
        Args:
            text: Le texte contenant les fragments
            fragments: Liste des fragments à décoder
            
        Returns:
            Le texte avec les fragments décodés
        """
        # Copie du texte original
        result = list(text)
        
        # On traite les fragments de la fin vers le début pour éviter les problèmes d'indices
        for fragment in sorted(fragments, key=lambda f: f["start"], reverse=True):
            start = fragment["start"]
            end = fragment["end"]
            value = fragment["value"]
            
            try:
                # Décoder le fragment
                decoded = str(self.decode_roman(value))
                
                # Remplacer le fragment dans le texte
                result[start:end] = decoded
            except ValueError:
                # Si le décodage échoue, on laisse le fragment tel quel
                pass
                
        return "".join(result)

    def execute(self, inputs: dict) -> dict:
        """
        Point d'entrée principal du plugin.
        
        Args:
            inputs: Dictionnaire contenant les paramètres d'entrée
                - mode: "encode" ou "decode"
                - text: Texte à encoder ou décoder
                - strict: "strict" ou "smooth" pour le mode de décodage
                - allowed_chars: Liste de caractères autorisés pour le mode smooth
                - embedded: True si le texte peut contenir du code intégré, False si tout le texte doit être du code
                
        Returns:
            Dictionnaire contenant le résultat de l'opération
        """
        mode = inputs.get("mode", "encode").lower()
        text = inputs.get("text", "")
        
        # Considère le mode strict si la valeur du paramètre "strict" est exactement "strict"
        strict_mode = inputs.get("strict", "").lower() == "strict"
        
        # Récupération de la liste des caractères autorisés sous la clé "allowed_chars"
        allowed_chars = inputs.get("allowed_chars", None)
        
        # Récupération du mode embedded
        embedded = inputs.get("embedded", False)

        if not text:
            return {"error": "Aucun texte fourni à traiter."}

        try:
            if mode == "encode":
                # Vérifier si le texte est un nombre valide
                try:
                    num = int(text)
                    if num <= 0:
                        return {"error": "Le nombre doit être positif pour l'encodage en chiffres romains."}
                    encoded = self.encode_roman(num)
                    text_output = encoded
                except ValueError:
                    return {"error": "Le texte doit être un nombre entier pour l'encodage en chiffres romains."}
                
                return {
                    "result": {
                        "decoded_text": text_output,
                        "text": {
                            "text_output": text_output,
                            "text_input": text,
                            "mode": mode
                        }
                    }
                }
                
            elif mode == "decode":
                if strict_mode:
                    check = self.check_code(text, strict=True, allowed_chars=allowed_chars, embedded=embedded)
                    if not check["is_match"]:
                        return {"error": "Chiffres romains invalides en mode strict"}
                    # Concatène les fragments valides et effectue le décodage classique.
                    decoded = self.decode_fragments(text, check["fragments"])
                else:
                    check = self.check_code(text, strict=False, allowed_chars=allowed_chars, embedded=embedded)
                    if not check["is_match"]:
                        # Si aucun fragment n'a été trouvé, on retourne une erreur
                        return {"error": "Aucun chiffre romain détecté dans le texte"}
                    
                    # Décode les fragments trouvés
                    decoded = self.decode_fragments(text, check["fragments"])
                    
                    # Vérifier si le texte décodé est différent du texte d'origine
                    if decoded == text:
                        return {"error": "Aucun chiffre romain n'a pu être décodé"}

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
                
            else:
                return {"error": f"Mode inconnu : {mode}"}
                
        except Exception as e:
            return {"error": f"Erreur pendant le traitement : {e}"}
