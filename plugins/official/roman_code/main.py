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
        
    def check_code(self, text: str, strict: bool = False, allowed_chars=None) -> dict:
        """
        Vérifie si le texte contient des chiffres romains valides.
        
        Args:
            text: Le texte à analyser
            strict: Si True, vérifie que tout le texte est composé de chiffres romains valides.
                   Si False, cherche des fragments de chiffres romains dans le texte.
            allowed_chars: Liste des caractères autorisés en plus des chiffres romains
            
        Returns:
            Un dictionnaire contenant:
            - is_match: True si des chiffres romains ont été trouvés
            - fragments: Liste des fragments de chiffres romains trouvés
            - score: Score de confiance (1.0 si match parfait, 0.0 sinon)
        """
        import re
        
        # Caractères romains valides
        roman_chars = "MDCLXVI"
        
        # Si allowed_chars est fourni comme liste, on la convertit en chaîne
        if allowed_chars is not None and isinstance(allowed_chars, list):
            allowed_chars = ''.join(allowed_chars)
            
        if allowed_chars is None:
            allowed_chars = " \t\r\n.:;,_-°"  # ponctuation par défaut
        
        # Texte en majuscules pour la vérification
        text_upper = text.upper()
        
        if strict:
            # En mode strict, on vérifie que tous les caractères sont des chiffres romains
            # ou des caractères autorisés
            esc_punct = re.escape(allowed_chars)
            pattern_str = f"^[{roman_chars}{esc_punct}]*$"
            
            # Vérif : tous les caractères sont autorisés
            if not re.match(pattern_str, text_upper):
                return {"is_match": False, "fragments": [], "score": 0.0}
                
            # Vérif : il y a au moins un caractère romain
            roman_chars_found = re.sub(f"[{esc_punct}]", "", text_upper)
            if not roman_chars_found or not any(c in roman_chars for c in roman_chars_found):
                return {"is_match": False, "fragments": [], "score": 0.0}
                
            # Tout est OK, on renvoie le texte "strippé" comme fragment
            stripped_text = text.strip(allowed_chars)
            return {
                "is_match": True,
                "fragments": [{"value": stripped_text, "start": text.find(stripped_text), "end": text.find(stripped_text) + len(stripped_text)}],
                "score": 1.0
            }
        else:
            # Mode "smooth" : on recherche des blocs de chiffres romains
            esc_punct = re.escape(allowed_chars)
            pattern = f"([^{esc_punct}]+)|([{esc_punct}]+)"
            fragments = []
            
            for m in re.finditer(pattern, text_upper):
                block = m.group(0)
                start, end = m.span()
                
                # Ignorer les blocs de ponctuation
                if re.match(f"^[{esc_punct}]+$", block):
                    continue
                    
                # Vérifier si le bloc contient uniquement des caractères romains
                if all(c in roman_chars for c in block):
                    # Vérifier si le bloc est un nombre romain valide
                    try:
                        self.decode_roman(block)
                        fragments.append({"value": text[start:end], "start": start, "end": end})
                    except ValueError:
                        # Ce n'est pas un nombre romain valide
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
        Méthode générique d'exécution, appelée par le PluginManager.
        
        Args:
            inputs: Dictionnaire contenant les paramètres d'entrée
                - mode: "encode" ou "decode"
                - text: Texte à encoder ou décoder
                - strict: "strict" ou "smooth" pour le mode de décodage
                - allowed_chars: Liste de caractères autorisés pour le mode smooth
                
        Returns:
            Dictionnaire contenant le résultat de l'opération
        """
        try:
            mode = inputs.get("mode", "encode").lower()
            text = inputs.get("text", "")
            
            # Récupération du mode strict/smooth
            strict_mode = inputs.get("strict", "").lower() == "strict"
            
            # Récupération des caractères autorisés
            allowed_chars = inputs.get("allowed_chars", None)
            
            if not text:
                return {"error": "Aucun texte fourni à traiter."}
                
            if mode == "encode":
                # On convertit text en entier
                try:
                    number = int(text)
                except ValueError:
                    return {"error": f"Impossible de convertir '{text}' en entier."}
                
                text_output = self.encode_roman(number)
                
                return {
                    "result": {
                        "text": {
                            "text_output": text_output,
                            "text_input": text,
                            "mode": mode
                        }
                    }
                }
                
            elif mode == "decode":
                if strict_mode:
                    # En mode strict, on vérifie d'abord que le texte est valide
                    check = self.check_code(text, strict=True, allowed_chars=allowed_chars)
                    if not check["is_match"]:
                        return {"error": "Code romain invalide en mode strict"}
                    
                    # Si valide, on décode tout le texte
                    try:
                        decimal = self.decode_roman(text)
                        text_output = str(decimal)
                    except ValueError as e:
                        return {"error": f"Erreur de décodage: {str(e)}"}
                else:
                    # En mode smooth, on vérifie d'abord qu'il y a au moins un fragment à décoder
                    check = self.check_code(text, strict=False, allowed_chars=allowed_chars)
                    if not check["is_match"]:
                        return {"error": "Aucun code romain détecté dans le texte"}
                    
                    # Décode les fragments trouvés
                    text_output = self.decode_fragments(text, check["fragments"])
                    
                    # Vérifier si le texte décodé est différent du texte d'origine
                    if text_output == text:
                        return {"error": "Aucun code romain n'a pu être décodé"}
                
                return {
                    "result": {
                        "decoded_text": text_output,  # Ajout pour compatibilité avec metadetection
                        "text": {
                            "text_output": text_output,
                            "text_input": text,
                            "mode": mode
                        }
                    }
                }
            
            else:
                return {"error": f"Mode inconnu: {mode}"}
                
        except Exception as e:
            return {"error": f"Erreur pendant le traitement: {str(e)}"}
