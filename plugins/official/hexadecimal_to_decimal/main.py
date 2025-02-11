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
        logger.info(f'inputs : {text}, {strict}, {allowed_punct}')
        if allowed_punct is None:
            allowed_punct = " \t\r\n.:;,_-°"  # ponctuation par défaut

        if strict:
            # Echapper la ponctuation pour l'intégrer dans un pattern
            esc_punct = re.escape(allowed_punct)
            pattern_str = f"^[0-9A-Fa-fx{esc_punct}]*$"

            # Vérif : tous les caractères sont autorisés
            if not re.match(pattern_str, text):
                return {"is_match": False, "fragments": []}

            # Vérif : au moins un caractère hex
            has_hex = re.search(r"[0-9A-Fa-f]", text)
            if not has_hex:
                return {"is_match": False, "fragments": []}

            # Construire le fragment final
            strip_pattern = f"[{esc_punct}x]+"
            stripped = re.sub(strip_pattern, "", text, flags=re.IGNORECASE)
            stripped = re.sub(r"[^0-9A-Fa-f]", "", stripped)

            if not stripped:
                return {"is_match": False, "fragments": []}

            return {
                "is_match": True,
                "fragments": [{"value": stripped, "start": 0, "end": len(stripped)}]
            }
        else:
            # mode smooth : On va détecter les blocs hex avec decode_hex_blocks,
            #   mais ici on renvoie juste s'il y a au moins un bloc hex
            blocks_info = self._split_and_check_blocks(text, allowed_punct)
            # On récupère uniquement ceux qui sont hex
            hex_fragments = [b for b in blocks_info if b["is_hex"]]
            return {
                "is_match": len(hex_fragments) > 0,
                "fragments": [
                    {
                        "value": b["block"],
                        "start": b["start"],
                        "end": b["end"]
                    }
                    for b in hex_fragments
                ]
            }

    def _split_and_check_blocks(self, text: str, allowed_punct: str) -> list:
        """
        Découpe le texte par séquences de ponctuation (autorisée) et détecte si le bloc est 100% hex.
        Retourne une liste de dicts :
        [
          {
            "block": str,       # le bloc
            "start": int,       # position de début
            "end": int,         # position de fin
            "is_hex": bool,     # True si 100% hex
          },
          ...
        ]
        """
        esc_punct = re.escape(allowed_punct)
        # On va capturer soit "une suite de ponctuation" soit "tout autre bloc"
        # pattern = (bloc non ponct) | (bloc ponct)
        # pour mieux localiser, on utilise finditer
        pattern = f"([^{esc_punct}]+)|([{esc_punct}]+)"

        blocks_info = []
        for m in re.finditer(pattern, text):
            block = m.group(0)
            start, end = m.span()

            # Vérif si c'est un bloc ponctuation ou un bloc "texte"
            # si c'est ponctuation, is_hex=False
            # si c'est "texte", on check si tout [0-9A-Fa-f],
            #   (on autorise le 'x' ? => up to you)
            #   Exclure si c'est vide

            # On check si c'est ponctuation en comparant par ex. re.match
            if re.match(f"^[{esc_punct}]+$", block):
                # c'est un bloc de ponctuation
                blocks_info.append({
                    "block": block,
                    "start": start,
                    "end": end,
                    "is_hex": False
                })
            else:
                # c'est un bloc "texte"
                # check si tout hex (autorise x ? => adapt if needed)
                if re.match("^[0-9A-Fa-f]+$", block):
                    is_hex = True
                else:
                    is_hex = False
                blocks_info.append({
                    "block": block,
                    "start": start,
                    "end": end,
                    "is_hex": is_hex
                })
        return blocks_info

    # -------------------------------------------------------------------------
    # 2) Méthode principale d'exécution
    # -------------------------------------------------------------------------

    def execute(self, inputs):
        """
        Inputs attendus :
          - text (str) : texte source
          - mode (str) : "encode" ou "decode"
          - strict (bool) : True ou False (défaut=False)
          - allowed_punct (str ou None) : caractères autorisés en mode strict

        Sortie :
          {
            "result": {
              "text": {
                "text_output": "...",
                "text_input": "...",
                "mode": "encode"/"decode"
              }
            }
          }

        En mode "decode":
          - strict=True => on vérifie que TOUT est autorisé ([0-9A-Fa-fx] + ponctuation autorisée)
                          si oui, on décode le bloc "pur" en décimal
          - strict=False (smooth) => on "split" le texte par ponctuation.
                                     Si un bloc est 100% hex, on le décode.
                                     Sinon on le laisse.
        """
        logger.info(inputs)

        text = inputs.get("text", "")
        mode = inputs.get("mode", "encode").lower()
        strict_mode = inputs.get("strict", False)
        allowed_punct = inputs.get("allowed_punct", None)

        if not text:
            return {"error": "Aucun texte fourni à traiter."}

        try:
            if mode == "encode":
                # Encode le texte (UTF-8) en hexadécimal
                text_output = self.encode(text)

            elif mode == "decode":
                if strict_mode:
                    # Vérifie si tout est valide + recup le fragment stripped
                    check = self.check_code(text, strict=True, allowed_punct=allowed_punct)
                    if not check["is_match"]:
                        return {"error": "Le texte n'est pas valide hex (mode strict)."}
                    # On récupère le bloc unique
                    hex_block = check["fragments"][0]["value"]
                    text_output = self.decode(hex_block)
                else:
                    # mode smooth => decode block par block
                    text_output = self.decode_hex_blocks(text, allowed_punct)

            else:
                return {"error": f"Mode inconnu : {mode}"}

            return {
                "result": {
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