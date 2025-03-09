import re

class KennyCodePlugin:
    """
    Plugin pour encoder/décoder du texte avec le code Kenny.
    - mode="encode" : convertit un texte normal en code Kenny
    - mode="decode" : convertit du code Kenny en texte normal
    - Gère les modes strict/smooth selon le nouveau système de plugins
    """

    def __init__(self):
        self.name = "kenny_code"
        self.description = "Plugin pour encoder/décoder du texte avec le code Kenny"

        # Table de conversion pour l'encodage
        self.encode_table = {
            'a': 'mmm', 'b': 'mmp', 'c': 'mmf', 'd': 'mpm', 'e': 'mpp',
            'f': 'mpf', 'g': 'mfm', 'h': 'mfp', 'i': 'mff', 'j': 'pmm',
            'k': 'pmp', 'l': 'pmf', 'm': 'ppm', 'n': 'ppp', 'o': 'ppf',
            'p': 'pfm', 'q': 'pfp', 'r': 'pff', 's': 'fmm', 't': 'fmp',
            'u': 'fmf', 'v': 'fpm', 'w': 'fpp', 'x': 'fpf', 'y': 'ffm',
            'z': 'ffp'
        }
        # Table de conversion pour le décodage (inversion de encode_table)
        self.decode_table = {v: k for k, v in self.encode_table.items()}

    def check_code(self, text: str, strict: bool = False, allowed_chars=None, embedded: bool = False) -> dict:
        """
        Vérifie si le texte contient du code Kenny valide.
        
        Args:
            text: Texte à analyser
            strict: Mode strict (True) ou smooth (False)
            allowed_chars: Liste de caractères autorisés en plus des caractères Kenny
            embedded: True si le texte peut contenir du code intégré, False si tout le texte doit être du code
            
        Returns:
            Un dictionnaire contenant:
            - is_match: True si du code Kenny a été trouvé
            - fragments: Liste des fragments de code Kenny trouvés
            - score: Score de confiance (0.0 à 1.0)
        """
        # Si allowed_chars est fourni comme liste, on la convertit en chaîne
        if allowed_chars is not None and isinstance(allowed_chars, list):
            allowed_chars = ''.join(allowed_chars)
            
        # Caractères autorisés par défaut
        if allowed_chars is None:
            allowed_chars = " \t\r\n.:;,_-°"
            
        # Caractères Kenny valides (les triplets de m, p, f dans la table de conversion)
        kenny_chars = "mpf"
        
        # En mode strict, le comportement dépend du paramètre embedded
        if strict:
            if embedded:
                # En mode strict+embedded, on recherche des fragments de code Kenny valides dans le texte
                return self._extract_kenny_fragments(text, allowed_chars)
            else:
                # En mode strict sans embedded, on vérifie que tout le texte est du code Kenny valide
                import re
                
                # Échapper les caractères spéciaux pour l'expression régulière
                esc_punct = re.escape(allowed_chars)
                
                # Créer un pattern qui accepte uniquement les caractères Kenny et les caractères autorisés
                pattern_str = f"^[{kenny_chars}{esc_punct}]*$"
                
                # Vérifier que tous les caractères sont autorisés
                if not re.match(pattern_str, text.lower()):
                    return {"is_match": False, "fragments": [], "score": 0.0}
                
                # Vérifier qu'il y a au moins un caractère Kenny
                kenny_chars_found = re.sub(f"[{esc_punct}]", "", text.lower())
                if not kenny_chars_found:
                    return {"is_match": False, "fragments": [], "score": 0.0}
                
                # Vérifier que le texte contient des triplets Kenny valides
                # Supprimer les caractères autorisés
                clean_text = re.sub(f"[{esc_punct}]", "", text.lower())
                
                # Vérifier si le texte contient des triplets Kenny valides
                valid_triplets = []
                for i in range(0, len(clean_text), 3):
                    if i + 3 <= len(clean_text):
                        triplet = clean_text[i:i+3]
                        if triplet in self.decode_table:
                            valid_triplets.append(triplet)
                        
                if not valid_triplets:
                    return {"is_match": False, "fragments": [], "score": 0.0}
                
                # Tout est OK, on renvoie le texte "strippé" comme fragment
                stripped_text = text.strip(allowed_chars)
                return {
                    "is_match": True,
                    "fragments": [{"value": stripped_text, "start": text.find(stripped_text), "end": text.find(stripped_text) + len(stripped_text)}],
                    "score": 1.0
                }
        else:
            # En mode smooth, on recherche des fragments de code Kenny valides dans le texte
            return self._extract_kenny_fragments(text, allowed_chars)
            
    def _extract_kenny_fragments(self, text: str, allowed_chars: str) -> dict:
        """
        Extrait les fragments de code Kenny valides dans le texte.
        
        Args:
            text: Texte à analyser
            allowed_chars: Caractères autorisés en plus des caractères Kenny
            
        Returns:
            Un dictionnaire contenant:
            - is_match: True si des fragments ont été trouvés
            - fragments: Liste des fragments contenant du code Kenny
            - score: Score de confiance (0.0 à 1.0)
        """
        import re
        
        # Caractères Kenny valides
        kenny_chars = "mpf"
        
        # Échapper les caractères spéciaux pour l'expression régulière
        esc_punct = re.escape(allowed_chars)
        
        # Rechercher des blocs de texte séparés par des caractères autorisés
        pattern = f"([^{esc_punct}]+)|([{esc_punct}]+)"
        fragments = []
        
        for m in re.finditer(pattern, text.lower()):
            block = m.group(0)
            start, end = m.span()
            
            # Ignorer les blocs de ponctuation
            if re.match(f"^[{esc_punct}]+$", block):
                continue
            
            # Vérifier si le bloc contient des triplets Kenny valides
            valid_triplets = []
            for i in range(0, len(block), 3):
                if i + 3 <= len(block):
                    triplet = block[i:i+3]
                    if triplet in self.decode_table:
                        valid_triplets.append(triplet)
                    
            if valid_triplets:
                fragments.append({"value": text[start:end], "start": start, "end": end})
        
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
        Remplace chaque fragment par son décodage, tout en préservant le reste du texte.
        """
        sorted_fragments = sorted(fragments, key=lambda x: x["start"])
        result = []
        last_pos = 0
        
        for frag in sorted_fragments:
            result.append(text[last_pos:frag["start"]])
            result.append(self.decode(frag["value"]))
            last_pos = frag["end"]
            
        result.append(text[last_pos:])
        return "".join(result)

    def encode(self, text: str) -> str:
        """
        Encode le texte en code Kenny.
        Les lettres sont converties selon la table d'encodage, les espaces sont conservés.
        """
        result = []
        for char in text.lower():
            if char in self.encode_table:
                result.append(self.encode_table[char])
            elif char.isspace():
                result.append(' ')
            else:
                result.append(char)
        return ''.join(result)

    def decode(self, text: str) -> str:
        """
        Décode le code Kenny en texte normal.
        Parcourt le texte en groupes de trois caractères, en conservant les espaces.
        """
        result = []
        i = 0
        current_group = []
        
        while i < len(text):
            if text[i].isspace():
                if current_group:
                    result.append(self._decode_group(''.join(current_group)))
                    current_group = []
                result.append(' ')
                i += 1
            else:
                current_group.append(text[i])
                if len(current_group) == 3:
                    result.append(self._decode_group(''.join(current_group)))
                    current_group = []
                i += 1
        
        if current_group:
            result.append(self._decode_group(''.join(current_group)))
        
        return ''.join(result)

    def _decode_group(self, group: str) -> str:
        return self.decode_table.get(group, '?')

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
                        return {"error": "Code Kenny invalide en mode strict"}
                    # Concatène les fragments valides et effectue le décodage classique.
                    decoded = self.decode_fragments(text, check["fragments"])
                else:
                    check = self.check_code(text, strict=False, allowed_chars=allowed_chars, embedded=embedded)
                    if not check["is_match"]:
                        # Si aucun fragment n'a été trouvé, on retourne une erreur
                        return {"error": "Aucun code Kenny détecté dans le texte"}
                    
                    # Décode les fragments trouvés
                    decoded = self.decode_fragments(text, check["fragments"])
                    
                    # Vérifier si le texte décodé est différent du texte d'origine
                    if decoded == text:
                        return {"error": "Aucun code Kenny n'a pu être décodé"}

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