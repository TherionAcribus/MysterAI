import re
from loguru import logger

class MorseCodePlugin:
    """
    Plugin pour chiffrer et déchiffrer du texte en code Morse.
    - Gère les modes strict/smooth selon le nouveau système
    - Mode strict : vérifie que tout le texte est valide
    - Mode smooth : détecte les fragments valides
    """

    def __init__(self):
        self.name = "morse_code"
        self.description = "Plugin pour chiffrer et déchiffrer le code Morse (A-Z, 0-9)."

        # Tables de conversion
        self.letter_to_morse = {
            'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 
            'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---',
            'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---',
            'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-',
            'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--',
            'Z': '--..', '0': '-----', '1': '.----', '2': '..---', 
            '3': '...--', '4': '....-', '5': '.....', '6': '-....', 
            '7': '--...', '8': '---..', '9': '----.'
        }
        self.morse_to_letter = {v: k for k, v in self.letter_to_morse.items()}

    def check_code(self, text: str, strict: bool = False, allowed_punct=None) -> dict:
        """
        Analyse le texte selon le mode spécifié :
        - Strict : Tous les tokens doivent être valides
        - Smooth : Recherche des tokens valides
        """
        if allowed_punct is None:
            allowed_punct = " "  # Séparateur par défaut
            
        esc_punct = re.escape(allowed_punct)
        tokens = self._split_into_tokens(text, allowed_punct)

        if strict:
            # Vérification des caractères autorisés
            if not re.fullmatch(f"^[{esc_punct}.\\-]*$", text):
                return {"is_match": False, "fragments": []}

            # Validation de tous les tokens
            valid_fragments = []
            for token in tokens:
                if token["block"] not in self.morse_to_letter:
                    return {"is_match": False, "fragments": []}
                valid_fragments.append({
                    "value": token["block"],
                    "start": token["start"],
                    "end": token["end"]
                })
                
            return {"is_match": True, "fragments": valid_fragments}
            
        else:
            # Détection des tokens valides
            valid_fragments = []
            for token in tokens:
                if token["block"] in self.morse_to_letter:
                    valid_fragments.append({
                        "value": token["block"],
                        "start": token["start"],
                        "end": token["end"]
                    })
                    
            return {"is_match": len(valid_fragments) > 0, "fragments": valid_fragments}

    def _split_into_tokens(self, text: str, allowed_punct: str) -> list:
        """
        Découpe le texte en tokens Morse séparés par la ponctuation autorisée
        """
        esc_punct = re.escape(allowed_punct)
        pattern = f"([^{esc_punct}]+)|([{esc_punct}]+)"
        tokens = []
        
        for match in re.finditer(pattern, text):
            if match.group(1):  # Bloc Morse
                tokens.append({
                    "block": match.group(1),
                    "start": match.start(),
                    "end": match.end()
                })
                
        return tokens

    def decode_fragments(self, text: str, fragments: list) -> str:
        """
        Décode uniquement les fragments valides dans leur contexte original
        """
        sorted_frags = sorted(fragments, key=lambda x: x["start"])
        result = []
        last_pos = 0
        
        for frag in sorted_frags:
            result.append(text[last_pos:frag["start"]])  # Texte avant
            result.append(self.morse_to_letter[frag["value"]])  # Texte décodé
            last_pos = frag["end"]
            
        result.append(text[last_pos:])  # Reste du texte
        return "".join(result)

    def encrypt(self, text: str) -> str:
        """Encode le texte en Morse (inchangé)"""
        return " ".join(
            self.letter_to_morse.get(c.upper(), "") 
            for c in text 
            if c.upper() in self.letter_to_morse
        )

    def decrypt(self, morse_text: str) -> str:
        """Décode le Morse en texte (inchangé)"""
        return "".join(
            self.morse_to_letter.get(token, "?") 
            for token in morse_text.split()
        )

    def execute(self, inputs: dict) -> dict:
        """
        Méthode d'exécution avec gestion des modes strict/smooth
        """
        mode = inputs.get("mode", "encode").lower()
        text = inputs.get("text", "")
        strict_mode = inputs.get("strict", False)
        allowed_punct = inputs.get("allowed_punct", None)

        if not text:
            return {"error": "Aucun texte fourni à traiter."}

        try:
            if mode == "encode":
                encoded = self.encrypt(text)
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
                        return {"error": "Code Morse invalide en mode strict"}
                    decoded = self.decrypt(text)
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