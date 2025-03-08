import re
from loguru import logger

class HexadecimalEncoderDecoderPlugin:
    """
    Plugin pour :
      - Encoder un texte en hexadécimal (UTF-8) => "encode"
      - Décoder un texte hexadécimal en décimal => "decode"
      - Gérer un mode "strict" ou "smooth" :
          * strict : tout le texte (hors ponctuation/espaces autorisés) doit être valide hex (0-9, A-F, a-f, x)
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
    def check_code(self, text: str, strict: bool = False, allowed_punct=None):
        """
        Analyse le texte pour voir s'il correspond à du code hex, selon 2 modes :

        - strict=True :
            * On vérifie que tous les caractères sont soit des chiffres hex [0-9A-Fa-f],
              soit le caractère 'x' (pour 0x), soit dans la liste de ponctuation autorisée.
            * S'il y a au moins un caractère hex restant, on considère que c'est OK.
            * is_match=True si c'est conforme, et on renvoie un seul fragment correspondant
              au texte "strippé".

        - strict=False :
            * On recherche des "blocs" séparés par la ponctuation (voir decode_hex_blocks)
            * is_match=True si au moins un bloc est hex
            * On renvoie la liste de fragments hex trouvés.
        """
        import re
        
        # Si allowed_punct est fourni comme liste, on la convertit en chaîne
        if allowed_punct is not None and isinstance(allowed_punct, list):
            allowed_punct = ''.join(allowed_punct)
            
        if allowed_punct is None:
            allowed_punct = " \t\r\n.:;,_-°"  # ponctuation par défaut

        if strict:
            # Echapper la ponctuation pour l'intégrer dans un pattern
            esc_punct = re.escape(allowed_punct)
            pattern_str = f"^[0-9A-Fa-fx{esc_punct}]*$"

            # Vérif : tous les caractères sont autorisés
            if not re.match(pattern_str, text):
                return {"is_match": False, "fragments": [], "score": 0.0}

            # Vérif : il y a au moins un caractère hex
            hex_chars = re.sub(f"[{esc_punct}x]", "", text)
            if not hex_chars:
                return {"is_match": False, "fragments": [], "score": 0.0}

            # Tout est OK, on renvoie le texte "strippé" comme fragment
            stripped_text = text.strip(allowed_punct)
            return {
                "is_match": True,
                "fragments": [{"value": stripped_text, "start": text.find(stripped_text), "end": text.find(stripped_text) + len(stripped_text)}],
                "score": 1.0  # Ajout d'un score pour compatibilité avec metadetection
            }

        else:
            # Mode "smooth" : on recherche des blocs hexadécimaux
            esc_punct = re.escape(allowed_punct)
            pattern = f"([^{esc_punct}]+)|([{esc_punct}]+)"
            fragments = []

            for m in re.finditer(pattern, text):
                block = m.group(0)
                start, end = m.span()

                # Ignorer les blocs de ponctuation
                if re.match(f"^[{esc_punct}]+$", block):
                    continue

                # Vérifier si le bloc est 100% hex (sans 'x')
                if re.fullmatch(r"[0-9A-Fa-f]+", block):
                    fragments.append({"value": block, "start": start, "end": end})

            # Calculer un score basé sur le nombre de fragments trouvés
            score = 1.0 if fragments else 0.0
            
            return {
                "is_match": bool(fragments),
                "fragments": fragments,
                "score": score  # Ajout d'un score pour compatibilité avec metadetection
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
            allowed_punct = allowed_chars  # Pour compatibilité avec le code existant
            
            if not text:
                return {"error": "Aucun texte fourni à traiter."}
                
            text_output = ""
            
            if mode == "encode":
                text_output = self.encode(text)
                
            elif mode == "decode":
                if strict_mode:
                    # En mode strict, on vérifie d'abord que le texte est valide
                    check = self.check_code(text, strict=True, allowed_punct=allowed_punct)
                    if not check["is_match"]:
                        return {"error": "Code hexadécimal invalide en mode strict"}
                    # Si valide, on décode tout le texte
                    text_output = self.decode(text)
                else:
                    # En mode smooth, on décode par blocs
                    text_output = self.decode_hex_blocks(text, allowed_punct)

            else:
                return {"error": f"Mode inconnu : {mode}"}

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

    def decode_hex_blocks(self, text: str, allowed_punct: str = None) -> str:
        """
        Mode "smooth" :
        On découpe le texte en blocs (ponctuation vs non-ponctuation),
        et pour chaque bloc non-ponctuation, si c'est 100% hex (sans 'x'), on le décode.
        Sinon on le laisse tel quel.
        """
        if allowed_punct is None:
            allowed_punct = " \t\r\n.:;,_-°"
        esc_punct = re.escape(allowed_punct)
        pattern = f"([^{esc_punct}]+)|([{esc_punct}]+)"

        result_parts = []

        for m in re.finditer(pattern, text):
            block = m.group(0)
            # Vérif si c'est un bloc de ponct ou pas
            if re.match(f"^[{esc_punct}]+$", block):
                # c'est de la ponctuation, on le garde tel quel
                result_parts.append(block)
            else:
                # c'est un bloc de texte ; on check si c'est hex pur
                # (ici on n'autorise pas 'x' => si tu veux l'autoriser, adapter la regex)
                if re.fullmatch(r"[0-9A-Fa-f]+", block):
                    # On décode
                    try:
                        decimal_str = str(int(block, 16))
                        result_parts.append(decimal_str)
                    except ValueError:
                        # On le garde tel quel si ça plante
                        result_parts.append(block)
                else:
                    # pas hex => on laisse
                    result_parts.append(block)

        return "".join(result_parts)