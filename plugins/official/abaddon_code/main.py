import re

class AbaddonCodePlugin:
    """
    Plugin pour encoder/décoder le code Abaddon avec gestion des modes strict/smooth.
    - Strict : Vérifie que tout le texte (hors caractères autorisés) est composé de triplets valides
    - Smooth : Itère sur le texte pour détecter et décoder les triplets valides, en ignorant les autres caractères
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
        # Inverse la table pour le décryptage
        self.code_to_letter = {v: k for k, v in self.letter_to_code.items()}

    def normalize_text(self, text: str) -> str:
        """
        Normalise le texte en remplaçant d'éventuels caractères similaires (par exemple,
        la lettre grecque μ par le micro signe µ attendu).
        """
        return text.replace("μ", "µ")

    def check_code(self, text: str, strict: bool = False, allowed_chars=None) -> dict:
        """
        Analyse le texte selon le mode spécifié :
        - strict = True : Tous les caractères (hors allowed_chars) doivent former des triplets valides.
        - strict = False (smooth) : Itère sur le texte pour extraire les triplets valides, en ignorant les autres caractères.

        Paramètres :
          - text : Texte à analyser.
          - strict : Mode strict (True) ou smooth (False).
          - allowed_chars : Liste (ou chaîne) de caractères à ignorer.
        """
        # Si allowed_chars est fourni comme liste, on la convertit en chaîne.
        if allowed_chars is not None and isinstance(allowed_chars, list):
            allowed_chars = ''.join(allowed_chars)
            
        # Ensemble des caractères autorisés à ignorer.
        allowed_set = set(allowed_chars) if allowed_chars else set()

        if strict:
            symbols = []
            positions = []
            # Parcourt le texte en ignorant les caractères autorisés.
            for i, c in enumerate(text):
                if c in allowed_set:
                    continue
                if c not in {'þ', 'µ', '¥'}:
                    return {"is_match": False, "fragments": []}
                symbols.append(c)
                positions.append(i)
                
            if not symbols or len(symbols) % 3 != 0:
                return {"is_match": False, "fragments": []}
                
            fragments = []
            for i in range(0, len(symbols), 3):
                triplet = ''.join(symbols[i:i+3])
                if triplet not in self.code_to_letter:
                    return {"is_match": False, "fragments": []}
                start = positions[i]
                end = positions[i+2] + 1
                fragments.append({"value": triplet, "start": start, "end": end})
                
            return {"is_match": True, "fragments": fragments, "score": 1.0}
            
        else:
            # Mode smooth : on parcourt le texte pour extraire les séquences de symboles.
            fragments = []
            current_fragment = ""
            current_fragment_start = None

            for i, c in enumerate(text):
                # Ignorer les caractères autorisés
                if c in allowed_set:
                    # Si on est au milieu d'un fragment, on traite ce qu'on a déjà
                    if current_fragment:
                        n_triplets = len(current_fragment) // 3
                        for j in range(n_triplets):
                            triplet = current_fragment[j*3:(j+1)*3]
                            start = current_fragment_start + j*3
                            end = start + 3
                            if triplet in self.code_to_letter:
                                fragments.append({"value": triplet, "start": start, "end": end})
                        current_fragment = ""
                        current_fragment_start = None
                    continue
                
                if c in {'þ', 'µ', '¥'}:
                    if current_fragment == "":
                        current_fragment_start = i
                    current_fragment += c
                else:
                    # Fin d'une séquence de symboles : on découpe en triplets complets.
                    if current_fragment:
                        n_triplets = len(current_fragment) // 3
                        for j in range(n_triplets):
                            triplet = current_fragment[j*3:(j+1)*3]
                            start = current_fragment_start + j*3
                            end = start + 3
                            if triplet in self.code_to_letter:
                                fragments.append({"value": triplet, "start": start, "end": end})
                        current_fragment = ""
                        current_fragment_start = None
            # Traiter le dernier fragment s'il reste incomplet.
            if current_fragment:
                n_triplets = len(current_fragment) // 3
                for j in range(n_triplets):
                    triplet = current_fragment[j*3:(j+1)*3]
                    start = current_fragment_start + j*3
                    end = start + 3
                    if triplet in self.code_to_letter:
                        fragments.append({"value": triplet, "start": start, "end": end})
                        
            # Ajouter un score basé sur le nombre de fragments trouvés
            score = 1.0 if fragments else 0.0
            return {"is_match": bool(fragments), "fragments": fragments, "score": score}

    def decode_fragments(self, text: str, fragments: list) -> str:
        """
        Décode uniquement les fragments valides dans leur contexte original.
        Chaque fragment reconnu est remplacé par sa lettre correspondante.
        """
        sorted_frags = sorted(fragments, key=lambda x: x["start"])
        result = []
        last_pos = 0
        
        for frag in sorted_frags:
            result.append(text[last_pos:frag["start"]])
            # Recherche la lettre correspondante ou "?" si non trouvée.
            decoded = self.code_to_letter.get(frag["value"], "?")
            result.append(decoded)
            last_pos = frag["end"]
            
        result.append(text[last_pos:])
        return "".join(result)

    def encode(self, text: str) -> str:
        """Encodage classique inchangé."""
        return "".join(
            self.letter_to_code.get(c.upper(), "")
            for c in text
            if c.upper() in self.letter_to_code
        )

    def decode(self, coded_text: str) -> str:
        """Décodage classique lorsque le texte est uniquement constitué de codes."""
        print('ABADDON DECODE', coded_text)
        return "".join(
            self.code_to_letter.get(coded_text[i:i+3], "?")
            for i in range(0, len(coded_text), 3)
        )

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
        mode = inputs.get("mode", "encode").lower()
        text = inputs.get("text", "")
        print('ABADDON INPUTS', inputs)
        # Considère le mode strict si la valeur du paramètre "strict" est exactement "strict"
        strict_mode = inputs.get("strict", "").lower() == "strict"
        # Récupération de la liste des caractères autorisés sous la clé "allowed_chars"
        allowed_chars = inputs.get("allowed_chars", None)

        if not text:
            return {"error": "Aucun texte fourni à traiter."}

        # Normalisation : on remplace, par exemple, les mu grecs par le micro signe attendu.
        text = self.normalize_text(text)

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
                    check = self.check_code(text, strict=True, allowed_chars=allowed_chars)
                    if not check["is_match"]:
                        return {"error": "Code Abaddon invalide en mode strict"}
                    # Concatène les triplets valides et effectue le décodage classique.
                    decoded = self.decode("".join([f["value"] for f in check["fragments"]]))
                else:
                    check = self.check_code(text, strict=False, allowed_chars=allowed_chars)
                    decoded = (
                        self.decode_fragments(text, check["fragments"])
                        if check["is_match"]
                        else text
                    )

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
