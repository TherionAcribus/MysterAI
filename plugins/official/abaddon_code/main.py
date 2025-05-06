import re
import time

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

    def check_code(self, text: str, strict: bool = False, allowed_chars=None, embedded: bool = False) -> dict:
        """
        Vérifie si le texte contient du code Abaddon valide.
        
        Args:
            text: Texte à analyser
            strict: Mode strict (True) ou smooth (False)
            allowed_chars: Liste de caractères autorisés en plus des caractères Abaddon
            embedded: True si le texte peut contenir du code intégré, False si tout le texte doit être du code
            
        Returns:
            Un dictionnaire contenant:
            - is_match: True si du code Abaddon a été trouvé
            - fragments: Liste des fragments de code Abaddon trouvés
            - score: Score de confiance (0.0 à 1.0)
        """
        # Si allowed_chars est fourni comme liste, on la convertit en chaîne
        if allowed_chars is not None and isinstance(allowed_chars, list):
            allowed_chars = ''.join(allowed_chars)
            
        # Caractères autorisés par défaut
        if allowed_chars is None:
            allowed_chars = " \t\r\n.:;,_-°"
            
        # Caractères Abaddon valides
        abaddon_chars = "þµ¥"
        
        # En mode strict, le comportement dépend du paramètre embedded
        if strict:
            if embedded:
                # En mode strict+embedded, on recherche des triplets valides dans le texte
                return self._extract_triplets(text, allowed_chars)
            else:
                # En mode strict sans embedded, on vérifie que tout le texte est du code Abaddon valide
                import re
                
                # Échapper les caractères spéciaux pour l'expression régulière
                esc_punct = re.escape(allowed_chars)
                pattern_str = f"^[{abaddon_chars}{esc_punct}]*$"
                
                # Vérifier que tous les caractères sont autorisés
                if not re.match(pattern_str, text):
                    return {"is_match": False, "fragments": [], "score": 0.0}
                
                # Vérifier qu'il y a au moins un caractère Abaddon
                abaddon_chars_found = re.sub(f"[{esc_punct}]", "", text)
                if not abaddon_chars_found:
                    return {"is_match": False, "fragments": [], "score": 0.0}
                
                # Vérifier que le nombre de caractères Abaddon est un multiple de 3
                if len(abaddon_chars_found) % 3 != 0:
                    return {"is_match": False, "fragments": [], "score": 0.0}
                
                # Vérifier que les triplets sont valides
                for i in range(0, len(abaddon_chars_found), 3):
                    if i + 3 <= len(abaddon_chars_found):
                        triplet = abaddon_chars_found[i:i+3]
                        if triplet not in self.code_to_letter:
                            return {"is_match": False, "fragments": [], "score": 0.0}
                
                # Tout est OK, on renvoie le texte "strippé" comme fragment
                stripped_text = text.strip(allowed_chars)
                return {
                    "is_match": True,
                    "fragments": [{"value": stripped_text, "start": text.find(stripped_text), "end": text.find(stripped_text) + len(stripped_text)}],
                    "score": 1.0
                }
        else:
            # En mode smooth, on recherche des triplets valides dans le texte
            return self._extract_triplets(text, allowed_chars)
            
    def _extract_triplets(self, text: str, allowed_chars: str) -> dict:
        """
        Extrait les triplets valides dans le texte.
        
        Args:
            text: Texte à analyser
            allowed_chars: Caractères autorisés en plus des caractères Abaddon
            
        Returns:
            Un dictionnaire contenant:
            - is_match: True si des triplets ont été trouvés
            - fragments: Liste des fragments contenant des triplets
            - score: Score de confiance (0.0 à 1.0)
        """
        import re
        
        # Caractères Abaddon valides
        abaddon_chars = "þµ¥"
        
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
            
            # Trouver tous les triplets valides dans le bloc
            found_triplets = []
            for i in range(0, len(block), 3):
                if i + 3 <= len(block):
                    triplet = block[i:i+3]
                    if all(c in abaddon_chars for c in triplet):
                        if triplet in self.code_to_letter:
                            found_triplets.append((i, i+3))
            
            # Si des triplets valides ont été trouvés, les ajouter comme fragments
            for start_triplet, end_triplet in found_triplets:
                triplet_start = start + start_triplet
                triplet_end = start + end_triplet
                fragments.append({
                    "value": text[triplet_start:triplet_end],
                    "start": triplet_start,
                    "end": triplet_end
                })
        
        # Calculer un score basé sur le nombre de fragments trouvés
        score = 1.0 if fragments else 0.0
        
        return {
            "is_match": bool(fragments),
            "fragments": fragments,
            "score": score
        }

    def decode_fragments(self, text: str, fragments: list) -> str:
        """
        Décode uniquement les fragments valides dans leur contexte original.
        Chaque fragment reconnu est remplacé par sa lettre correspondante.
        """
        # Créer une copie du texte pour le résultat final
        result = text
        
        # Trier les fragments par position (du dernier au premier)
        # pour éviter les problèmes de décalage d'indices
        sorted_fragments = sorted(fragments, key=lambda f: f["start"], reverse=True)
        
        # Remplacer chaque fragment par sa lettre correspondante
        for fragment in sorted_fragments:
            start, end = fragment["start"], fragment["end"]
            # Utiliser la valeur stockée dans le fragment plutôt que de l'extraire du texte
            abaddon_value = fragment["value"]
            letter = self.code_to_letter.get(abaddon_value, "?")
            result = result[:start] + letter + result[end:]
        
        return result

    def encode(self, text: str) -> str:
        """
        Encode le texte en code Abaddon.
        Les lettres sont converties selon la table d'encodage, les caractères non reconnus sont ignorés.
        """
        result = []
        for char in text.upper():
            if char in self.letter_to_code:
                result.append(self.letter_to_code[char])
        return ''.join(result)

    def decode(self, coded_text: str) -> str:
        """
        Décode un texte en code Abaddon en texte normal.
        Parcourt le texte en groupes de trois caractères, en tentant de les décoder.
        """
        result = []
        i = 0
        
        while i < len(coded_text):
            if i + 3 <= len(coded_text):
                triplet = coded_text[i:i+3]
                result.append(self.code_to_letter.get(triplet, "?"))
                i += 3
            else:
                # Si un groupe incomplet reste à la fin, on l'ignore
                break
        
        return ''.join(result)

    def execute(self, inputs: dict) -> dict:
        """
        Point d'entrée principal du plugin.
        
        Args:
            inputs: Dictionnaire contenant les paramètres d'entrée
                - mode: "encode" ou "decode"
                - text: Texte à encoder ou décoder
                - strict: "strict" ou "smooth" pour le mode de décodage
                - allowed_chars: Liste de caractères autorisés pour le mode smooth
                - embedded: True si le texte peut contenir du code intégré
                
        Returns:
            Dictionnaire au format standardisé contenant le résultat de l'opération
        """
        # Mesurer le temps d'exécution
        start_time = time.time()
        
        # Structure de base pour la réponse au format standardisé
        standardized_response = {
            "status": "success",
            "plugin_info": {
                "name": self.name,
                "version": "1.0.0",
                "execution_time": 0
            },
            "inputs": inputs.copy(),
            "results": [],
            "summary": {
                "best_result_id": None,
                "total_results": 0,
                "message": ""
            }
        }
        
        mode = inputs.get("mode", "encode").lower()
        text = inputs.get("text", "")
        
        # Vérifier si le texte est vide
        if not text:
            standardized_response["status"] = "error"
            standardized_response["summary"]["message"] = "Aucun texte fourni à traiter."
            return standardized_response
        
        # Considère le mode strict si la valeur du paramètre "strict" est exactement "strict"
        strict_mode = inputs.get("strict", "").lower() == "strict"
        
        # Récupération de la liste des caractères autorisés sous la clé "allowed_chars"
        allowed_chars = inputs.get("allowed_chars", None)
        
        # Récupération du mode embedded
        embedded = inputs.get("embedded", False)

        # Normalisation : on remplace, par exemple, les mu grecs par le micro signe attendu.
        text = self.normalize_text(text)

        try:
            if mode == "encode":
                encoded = self.encode(text)
                
                standardized_response["results"].append({
                    "id": "result_1",
                    "text_output": encoded,
                    "confidence": 1.0,
                    "parameters": {
                        "mode": "encode"
                    },
                    "metadata": {
                        "processed_chars": len(text),
                        "encoded_chars": sum(1 for c in text.upper() if c in self.letter_to_code)
                    }
                })
                
                standardized_response["summary"]["best_result_id"] = "result_1"
                standardized_response["summary"]["total_results"] = 1
                standardized_response["summary"]["message"] = "Encodage Abaddon réussi"
                
            elif mode == "decode":
                if strict_mode:
                    check = self.check_code(text, strict=True, allowed_chars=allowed_chars, embedded=embedded)
                    if not check["is_match"]:
                        standardized_response["status"] = "error"
                        standardized_response["summary"]["message"] = "Code Abaddon invalide en mode strict"
                        return standardized_response
                    
                    # Décode les fragments trouvés
                    decoded = self.decode_fragments(text, check["fragments"])
                    confidence = check["score"]
                else:
                    check = self.check_code(text, strict=False, allowed_chars=allowed_chars, embedded=embedded)
                    if not check["is_match"]:
                        # Si aucun fragment n'a été trouvé, on retourne une erreur
                        standardized_response["status"] = "error"
                        standardized_response["summary"]["message"] = "Aucun code Abaddon détecté dans le texte"
                        return standardized_response
                    
                    # Décode les fragments trouvés
                    decoded = self.decode_fragments(text, check["fragments"])
                    confidence = check["score"] * 0.9  # Légèrement moins de confiance en mode smooth
                    
                    # Vérifier si le texte décodé est différent du texte d'origine
                    if decoded == text:
                        standardized_response["status"] = "error"
                        standardized_response["summary"]["message"] = "Aucun code Abaddon n'a pu être décodé"
                        return standardized_response
                
                standardized_response["results"].append({
                    "id": "result_1",
                    "text_output": decoded,
                    "confidence": confidence,
                    "parameters": {
                        "mode": "decode",
                        "strict": strict_mode,
                        "embedded": embedded
                    },
                    "metadata": {
                        "fragments_count": len(check["fragments"]),
                        "detection_score": check["score"]
                    }
                })
                
                standardized_response["summary"]["best_result_id"] = "result_1"
                standardized_response["summary"]["total_results"] = 1
                standardized_response["summary"]["message"] = f"Décodage Abaddon réussi ({len(check['fragments'])} fragments trouvés)"
                
            else:
                standardized_response["status"] = "error"
                standardized_response["summary"]["message"] = f"Mode inconnu : {mode}"
                
        except Exception as e:
            standardized_response["status"] = "error"
            standardized_response["summary"]["message"] = f"Erreur pendant le traitement: {str(e)}"
        
        # Calculer le temps d'exécution
        standardized_response["plugin_info"]["execution_time"] = int((time.time() - start_time) * 1000)
        
        return standardized_response