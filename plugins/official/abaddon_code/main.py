import re
from loguru import logger

class AbaddonCodePlugin:
    """
    Plugin pour encoder/décoder le code Abaddon avec gestion des modes strict/smooth.
    - Strict : Vérifie que tout le texte est composé de triplets valides
    - Smooth : Détecte et décode les triplets valides dans le texte
    """

    def __init__(self):
        self.name = "abaddon_code"
        self.description = "Plugin d'encodage/décodage avec le code Abaddon"
        
        self.letter_to_code = {
            'O': 'þþþ', 'R': 'þþµ', 'P': 'þþ¥', 'S': 'þµþ', 'C': 'þµµ',
            'H': 'þµ¥', 'Z': 'þ¥þ', 'T': 'þ¥µ', 'M': 'þ¥¥', 'G': 'µþþ',
            'J': 'µþµ', 'W': 'µþ¥', 'D': 'µµþ', 'U': 'µµµ', 'F': 'µµ¥',
            'X': 'µ¥þ', 'E': 'µ¥µ', 'L': 'µ¥¥', 'Q': '¥þþ', 'K': '¥þµ',
            'B': '¥þ¥', 'Y': '¥µþ', ' ': '¥µµ', 'V': '¥µ¥', 'N': '¥¥þ',
            'A': '¥¥µ', 'I': '¥¥¥'
        }
        self.code_to_letter = {v: k for k, v in self.letter_to_code.items()}

    def check_code(self, text: str, strict: bool = False, allowed_punct=None) -> dict:
        """
        Analyse le texte selon le mode spécifié :
        - Strict : Tous les caractères doivent former des triplets valides
        - Smooth : Détecte les triplets valides dans le texte
        """
        if allowed_punct is None:
            allowed_punct = ""
            
        allowed_set = set(allowed_punct)
        esc_punct = re.escape(allowed_punct)
        
        if strict:
            symbols = []
            positions = []
            # Collecte des symboles valides et leurs positions
            for i, c in enumerate(text):
                if c in allowed_set:
                    continue
                if c not in {'þ', 'µ', '¥'}:
                    return {"is_match": False, "fragments": []}
                symbols.append(c)
                positions.append(i)
                
            if len(symbols) % 3 != 0 or not symbols:
                return {"is_match": False, "fragments": []}
                
            # Vérification de tous les triplets
            fragments = []
            for i in range(0, len(symbols), 3):
                triplet = ''.join(symbols[i:i+3])
                if triplet not in self.code_to_letter:
                    return {"is_match": False, "fragments": []}
                start = positions[i]
                end = positions[i+2] + 1
                fragments.append({"value": triplet, "start": start, "end": end})
                
            return {"is_match": True, "fragments": fragments}
            
        else:
            # Détection des triplets valides par blocs
            pattern = f"([^{esc_punct}]+)"
            fragments = []
            
            for match in re.finditer(pattern, text):
                block = match.group(1)
                block_start = match.start()
                
                # Vérification des caractères valides dans le bloc
                if any(c not in {'þ', 'µ', '¥'} for c in block):
                    continue
                    
                # Découpage en triplets
                for i in range(0, len(block), 3):
                    if i+3 > len(block):
                        break
                    triplet = block[i:i+3]
                    if triplet in self.code_to_letter:
                        start = block_start + i
                        end = start + 3
                        fragments.append({
                            "value": triplet,
                            "start": start,
                            "end": end
                        })
            
            return {"is_match": len(fragments) > 0, "fragments": fragments}

    def decode_fragments(self, text: str, fragments: list) -> str:
        """
        Décode uniquement les fragments valides dans leur contexte original
        """
        sorted_frags = sorted(fragments, key=lambda x: x["start"])
        result = []
        last_pos = 0
        
        for frag in sorted_frags:
            result.append(text[last_pos:frag["start"]])
            decoded = self.code_to_letter.get(frag["value"], "?")
            result.append(decoded)
            last_pos = frag["end"]
            
        result.append(text[last_pos:])
        return "".join(result)

    def encode(self, text: str) -> str:
        """Encodage classique inchangé"""
        return "".join(
            self.letter_to_code.get(c.upper(), "")
            for c in text
            if c.upper() in self.letter_to_code
        )

    def decode(self, coded_text: str) -> str:
        """Décodage classique inchangé"""
        return "".join(
            self.code_to_letter.get(coded_text[i:i+3], "?")
            for i in range(0, len(coded_text), 3)
        )

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
                    check = self.check_code(text, strict=True, allowed_punct=allowed_punct)
                    if not check["is_match"]:
                        return {"error": "Code Abaddon invalide en mode strict"}
                    decoded = self.decode("".join([f["value"] for f in check["fragments"]]))
                else:
                    check = self.check_code(text, strict=False, allowed_punct=allowed_punct)
                    decoded = (
                        self.decode_fragments(text, check["fragments"])
                        if check["is_match"]
                        else text
                    )

                return {
                    "result": {
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