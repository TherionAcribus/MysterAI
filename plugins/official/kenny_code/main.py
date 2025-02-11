import re
from loguru import logger

class KennyCodePlugin:
    """
    Plugin pour encoder/décoder du texte avec le code Kenny.
    - mode="encode": convertit un texte normal en code Kenny
    - mode="decode": convertit du code Kenny en texte normal
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
        # Table de conversion pour le décodage
        self.decode_table = {v: k for k, v in self.encode_table.items()}

    def check_code(self, text: str, strict: bool = False, allowed_punct=None) -> dict:
        """
        Vérifie si le texte correspond au code Kenny selon le mode spécifié.
        - Mode strict : Tous les blocs séparés par la ponctuation doivent être valides
        - Mode smooth : Recherche des blocs valides dans le texte
        """
        if allowed_punct is None:
            allowed_punct = " "  # Séparateur par défaut
            
        if strict:
            # Vérification des caractères autorisés
            esc_punct = re.escape(allowed_punct)
            if not re.fullmatch(f"^[{esc_punct}mfp]*$", text):
                return {"is_match": False, "fragments": []}

            # Découpage et validation des blocs
            blocks = self._split_into_blocks(text, allowed_punct)
            valid_blocks = []
            
            for block in blocks:
                block_text = block["block"]
                if len(block_text) % 3 != 0:
                    return {"is_match": False, "fragments": []}
                
                for i in range(0, len(block_text), 3):
                    trio = block_text[i:i+3]
                    if trio not in self.decode_table:
                        return {"is_match": False, "fragments": []}
                
                valid_blocks.append({
                    "value": block_text,
                    "start": block["start"],
                    "end": block["end"]
                })

            return {
                "is_match": True,
                "fragments": valid_blocks
            }
            
        else:
            # Mode smooth : recherche de blocs valides
            blocks = self._split_into_blocks(text, allowed_punct)
            valid_fragments = []
            
            for block in blocks:
                block_text = block["block"]
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

            return {
                "is_match": len(valid_fragments) > 0,
                "fragments": valid_fragments
            }

    def _split_into_blocks(self, text: str, allowed_punct: str) -> list:
        """
        Découpe le texte en blocs séparés par la ponctuation autorisée
        """
        esc_punct = re.escape(allowed_punct)
        pattern = f"([^{esc_punct}]+)|([{esc_punct}]+)"
        blocks = []
        
        for match in re.finditer(pattern, text):
            block = match.group(0)
            start, end = match.span()
            
            if re.fullmatch(f"^[{esc_punct}]+$", block):
                continue  # Ignorer la ponctuation
                
            blocks.append({
                "block": block,
                "start": start,
                "end": end
            })
            
        return blocks

    def decode_fragments(self, text: str, fragments: list) -> str:
        """
        Décode uniquement les fragments valides dans le texte
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
        Encode le texte en code Kenny (inchangé)
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
        Décode le code Kenny en texte normal (inchangé)
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
        Méthode d'exécution avec gestion des modes strict/smooth
        """
        mode = inputs.get("mode", "encode").lower()
        text = inputs.get("text", "")
        strict_mode = inputs.get("strict", False) == "strict"
        allowed_punct = inputs.get("allowed_punct", None)

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
                    check = self.check_code(text, strict=True, allowed_punct=allowed_punct)
                    if not check["is_match"]:
                        return {"error": "Code Kenny invalide en mode strict"}
                    decoded_text = self.decode(text)
                else:
                    check = self.check_code(text, strict=False, allowed_punct=allowed_punct)
                    decoded_text = self.decode_fragments(text, check["fragments"]) if check["is_match"] else text

                return {
                    "result": {
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