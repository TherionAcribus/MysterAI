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

    def check_code(self, text: str, strict: bool = False, allowed_chars=None) -> dict:
        """
        Vérifie si le texte correspond au code Kenny selon le mode spécifié.
        - Mode strict : Tous les blocs séparés par les caractères autorisés doivent être valides.
        - Mode smooth : Recherche des blocs valides dans le texte.

        Paramètres :
          - text : Texte à analyser.
          - strict : Mode strict (True) ou smooth (False).
          - allowed_chars : Liste (ou chaîne) de caractères à ignorer (ex. [' ', '-', '_']).
        """
        # Si allowed_chars est fourni comme liste, le convertir en chaîne.
        if allowed_chars is not None and isinstance(allowed_chars, list):
            allowed_chars = ''.join(allowed_chars)
        
        # Définir l'ensemble des caractères autorisés
        allowed_set = set(allowed_chars) if allowed_chars else set()
        
        # En mode strict, vérifier que le texte ne contient que les caractères autorisés et ceux du code (m, f, p)
        if strict:
            esc_chars = re.escape(allowed_chars) if allowed_chars else ""
            # Le texte doit être composé uniquement des symboles du code (m, f, p) et des caractères autorisés
            if not re.fullmatch(f"^[{esc_chars}mfp]*$", text):
                return {"is_match": False, "fragments": []}
            
            # Découper le texte en blocs à l'aide des caractères autorisés
            blocks = self._split_into_blocks(text, allowed_chars)
            valid_blocks = []
            
            for block in blocks:
                block_text = block["block"]
                if len(block_text) % 3 != 0:
                    return {"is_match": False, "fragments": []}
                
                # Valider chaque trio du bloc
                for i in range(0, len(block_text), 3):
                    trio = block_text[i:i+3]
                    if trio not in self.decode_table:
                        return {"is_match": False, "fragments": []}
                
                valid_blocks.append({
                    "value": block_text,
                    "start": block["start"],
                    "end": block["end"]
                })
            
            return {"is_match": True, "fragments": valid_blocks, "score": 1.0}
            
        else:
            # Mode smooth : recherche de blocs valides dans le texte
            blocks = self._split_into_blocks(text, allowed_chars)
            valid_fragments = []
            
            for block in blocks:
                block_text = block["block"]
                # On vérifie que le bloc ne contient que les symboles m, f, p
                if not re.fullmatch(r"^[mfp]+$", block_text):
                    continue
                    
                if len(block_text) % 3 != 0:
                    continue
                    
                valid = True
                for i in range(0, len(block_text), 3):
                    trio = block_text[i:i+3]
                    if trio not in self.decode_table:
                        valid = False
                        break
                        
                if valid:
                    valid_fragments.append({
                        "value": block_text,
                        "start": block["start"],
                        "end": block["end"]
                    })
                    
            return {"is_match": len(valid_fragments) > 0, "fragments": valid_fragments}

    def _split_into_blocks(self, text: str, allowed_chars: str) -> list:
        """
        Découpe le texte en blocs en utilisant les caractères autorisés comme séparateurs.
        Renvoie une liste de dictionnaires avec le bloc extrait et ses positions.
        """
        esc_chars = re.escape(allowed_chars) if allowed_chars else ""
        pattern = f"([^{esc_chars}]+)|([{esc_chars}]+)"
        blocks = []
        
        for match in re.finditer(pattern, text):
            block = match.group(0)
            start, end = match.span()
            # Ignorer les blocs qui sont uniquement composés des caractères autorisés
            if allowed_chars and re.fullmatch(f"^[{esc_chars}]+$", block):
                continue
            blocks.append({
                "block": block,
                "start": start,
                "end": end
            })
            
        return blocks

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
        Returns:
            Dictionnaire contenant le résultat de l'opération.
        """
        mode = inputs.get("mode", "encode").lower()
        text = inputs.get("text", "")
        # Considère le mode strict si le paramètre "strict" vaut exactement "strict" (en minuscule)
        strict_mode = inputs.get("strict", "").lower() == "strict"
        # Récupération de la liste des caractères autorisés sous la clé "allowed_chars"
        allowed_chars = inputs.get("allowed_chars", None)

        if not text:
            return {"error": "Aucun texte fourni à traiter."}

        try:
            if mode == "encode":
                encoded_text = self.encode(text)
                return {
                    "result": {
                        "text": {
                            "text_output": encoded_text,
                            "text_input": text,
                            "mode": mode
                        }
                    }
                }
                
            elif mode == "decode":
                if strict_mode:
                    check = self.check_code(text, strict=True, allowed_chars=allowed_chars)
                    if not check["is_match"]:
                        return {"error": "Code Kenny invalide en mode strict"}
                    # En mode strict, on effectue un décodage complet du texte
                    decoded_text = self.decode(text)
                else:
                    check = self.check_code(text, strict=False, allowed_chars=allowed_chars)
                    decoded_text = (
                        self.decode_fragments(text, check["fragments"])
                        if check["is_match"]
                        else text
                    )

                return {
                    "result": {
                        "decoded_text": decoded_text,
                        "text": {
                            "text_output": decoded_text,
                            "text_input": text,
                            "mode": mode
                        }
                    }
                }
                
            else:
                return {"error": f"Mode inconnu : {mode}"}
                
        except Exception as e:
            return {"error": f"Erreur pendant le traitement : {e}"}
