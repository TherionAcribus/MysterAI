import re

class HexadecimalEncoderDecoderPlugin:
    """
    Plugin pour :
      - Encoder un texte en hexadécimal (UTF-8) => "encode"
      - Décoder un texte hexadécimal en décimal => "decode"
      - Gérer un mode "strict" ou "smooth" :
          * strict : tout le texte (hors ponctuation/espaces autorisés) doit être valide hex (0-9, A-F, a-f)
          * smooth : on recherche des "blocs" séparés par la ponctuation autorisée ;
                      si un bloc est 100% hex, on le décode, sinon on le laisse tel quel.

    Exemples :
     - "NORD 49C1FB" => en mode smooth, on split en ["NORD ", "49C1FB"],
       le 1er bloc n'est pas hex, on le laisse ; le 2e l'est, on décode => "NORD 4839163"
    """

    def __init__(self):
        self.name = "hexadecimal_encoder_decoder"
        self.description = "Plugin pour coder et décoder du texte en hexadécimal (-> décimal)"

    # -------------------------------------------------------------------------
    # 1) Vérification / détection : check_code
    # -------------------------------------------------------------------------
    def check_code(self, text: str, strict: bool = False, allowed_chars=None, embedded: bool = False) -> dict:
        """
        Vérifie si le texte contient du code hexadécimal valide.
        
        Args:
            text: Texte à analyser
            strict: Mode strict (True) ou smooth (False)
            allowed_chars: Liste de caractères autorisés en plus des caractères hexadécimaux
            embedded: True si le texte peut contenir du code intégré, False si tout le texte doit être du code
            
        Returns:
            Un dictionnaire contenant:
            - is_match: True si du code hexadécimal a été trouvé
            - fragments: Liste des fragments de code hexadécimal trouvés
            - score: Score de confiance (0.0 à 1.0)
        """
        # Si allowed_chars est fourni comme liste, on la convertit en chaîne
        if allowed_chars is not None and isinstance(allowed_chars, list):
            allowed_chars = ''.join(allowed_chars)
            
        # Caractères autorisés par défaut
        if allowed_chars is None:
            allowed_chars = " \t\r\n.:;,_-°"
            
        # Caractères hexadécimaux valides
        hex_chars = "0123456789ABCDEFabcdef"
        
        # En mode strict, le comportement dépend du paramètre embedded
        if strict:
            if embedded:
                # En mode strict+embedded, on recherche des fragments de code hexadécimal valides dans le texte
                return self._extract_hex_fragments(text, allowed_chars)
            else:
                # En mode strict sans embedded, on vérifie que tout le texte est du code hexadécimal valide
                import re
                
                # Échapper les caractères spéciaux pour l'expression régulière
                esc_punct = re.escape(allowed_chars)
                pattern_str = f"^[{hex_chars}{esc_punct}]*$"
                
                # Vérifier que tous les caractères sont autorisés
                if not re.match(pattern_str, text):
                    return {"is_match": False, "fragments": [], "score": 0.0}
                
                # Vérifier qu'il y a au moins un caractère hexadécimal
                hex_chars_found = re.sub(f"[{esc_punct}]", "", text)
                if not hex_chars_found:
                    return {"is_match": False, "fragments": [], "score": 0.0}
                
                # Vérifier que le nombre de caractères hexadécimaux est pair (pour former des octets)
                if len(hex_chars_found) % 2 != 0:
                    return {"is_match": False, "fragments": [], "score": 0.0}
                
                # Vérifier que les paires sont valides
                pairs = [hex_chars_found[i:i+2] for i in range(0, len(hex_chars_found), 2)]
                for pair in pairs:
                    if len(pair) != 2 or not all(c in hex_chars for c in pair):
                        return {"is_match": False, "fragments": [], "score": 0.0}
                
                # Tout est OK, on renvoie le texte "strippé" comme fragment
                stripped_text = text.strip(allowed_chars)
                return {
                    "is_match": True,
                    "fragments": [{"value": stripped_text, "start": text.find(stripped_text), "end": text.find(stripped_text) + len(stripped_text)}],
                    "score": 1.0
                }
        else:
            # En mode smooth, on recherche des fragments de code hexadécimal valides dans le texte
            return self._extract_hex_fragments(text, allowed_chars)
            
    def _extract_hex_fragments(self, text: str, allowed_chars: str) -> dict:
        """
        Extrait les fragments de code hexadécimal valides dans le texte.
        
        Args:
            text: Texte à analyser
            allowed_chars: Caractères autorisés en plus des caractères hexadécimaux
            
        Returns:
            Un dictionnaire contenant:
            - is_match: True si des fragments ont été trouvés
            - fragments: Liste des fragments contenant du code hexadécimal
            - score: Score de confiance (0.0 à 1.0)
        """
        import re
        
        # Caractères hexadécimaux valides
        hex_chars = "0123456789ABCDEFabcdef"
        
        # Échapper les caractères spéciaux pour l'expression régulière
        esc_punct = re.escape(allowed_chars)
        
        # Rechercher des blocs de texte séparés par des caractères autorisés
        pattern = f"([^{esc_punct}]+)|([{esc_punct}]+)"
        fragments = []
        
        for m in re.finditer(pattern, text):
            block = m.group(0)
            start, end = m.span()
            
            # Ignorer les blocs de ponctuation
            if re.match(f"^[{esc_punct}]+$", block):
                continue
            
            # Vérifier si le bloc contient uniquement des caractères hexadécimaux
            if all(c in hex_chars for c in block):
                # Vérifier si la longueur du bloc est paire (pour former des octets)
                if len(block) >= 2 and len(block) % 2 == 0:
                    fragments.append({"value": text[start:end], "start": start, "end": end})
        
        # Calculer un score basé sur le nombre de fragments trouvés
        score = 1.0 if fragments else 0.0
        
        return {
            "is_match": bool(fragments),
            "fragments": fragments,
            "score": score
        }

    # -------------------------------------------------------------------------
    # 2) Méthode principale d'exécution
    # -------------------------------------------------------------------------

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
                        return {"error": "Code hexadécimal invalide en mode strict"}
                    # Utiliser decode_fragments pour traiter les fragments individuellement
                    decoded = self.decode_fragments(text, check["fragments"])
                else:
                    check = self.check_code(text, strict=False, allowed_chars=allowed_chars, embedded=embedded)
                    if not check["is_match"]:
                        # Si aucun fragment n'a été trouvé, on retourne une erreur
                        return {"error": "Aucun code hexadécimal détecté dans le texte"}
                    
                    # Décode les fragments trouvés
                    decoded = self.decode_fragments(text, check["fragments"])
                    
                    # Vérifier si le texte décodé est différent du texte d'origine
                    if decoded == text:
                        return {"error": "Aucun code hexadécimal n'a pu être décodé"}

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

    # -------------------------------------------------------------------------
    # 3) Encodage / décodage
    # -------------------------------------------------------------------------

    def encode(self, text: str) -> str:
        """
        Encode le texte en hexadécimal (UTF-8).
        """
        return text.encode("utf-8").hex()

    def decode(self, hex_text: str) -> str:
        """
        Convertit un bloc hexadécimal (même longueur impaire) en décimal (string).
        Ex : "49C1FB" -> "4839163"
             "49C1F"  -> int('49C1F',16) => 303299
        """
        cleaned_hex = re.sub(r'[^0-9A-Fa-f]', '', hex_text)
        if not cleaned_hex:
            return hex_text  # rien à décoder => on renvoie tel quel
        decimal_value = int(cleaned_hex, 16)
        return str(decimal_value)

    def decode_fragments(self, text: str, fragments: list) -> str:
        """
        Décode les fragments de code hexadécimal trouvés dans le texte.
        Gère correctement les décalages d'indices après chaque remplacement.
        
        Args:
            text: Texte d'origine
            fragments: Liste des fragments de code hexadécimal
            
        Returns:
            Texte décodé
        """
        # Trier les fragments par position de début (en ordre décroissant)
        # pour éviter les problèmes de décalage d'indices
        sorted_fragments = sorted(fragments, key=lambda f: f["start"], reverse=True)
        
        # Remplacer chaque fragment par sa valeur décodée
        result = text
        for fragment in sorted_fragments:
            start, end = fragment["start"], fragment["end"]
            hex_value = fragment["value"]
            decimal_value = self.decode(hex_value)
            result = result[:start] + decimal_value + result[end:]
        
        return result