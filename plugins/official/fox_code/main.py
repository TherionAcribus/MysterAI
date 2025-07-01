import re
import json
import os
import time
from itertools import product
from typing import Dict, List, Tuple

# Import optionnel du service de scoring
try:
    from app.services.scoring_service import ScoringService  # type: ignore
    scoring_service_available = True
except ImportError:
    scoring_service_available = False


class FoxCodePlugin:
    """Plugin de codage/décodage pour le Fox Code.

    Deux variantes :
      • courte  : on encode uniquement le numéro de colonne (1-9)
      • longue  : on encode colonne+ligne (ex. 71 → colonne 7, ligne 1)
    """

    # Construction de la grille 3×9
    _GRID: Dict[Tuple[int, int], str] = {}
    _LETTER_TO_POS: Dict[str, Tuple[int, int]] = {}
    _ROWS, _COLS = 3, 9
    _ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

    for idx, letter in enumerate(_ALPHABET):
        row = idx // _COLS + 1  # 1-indexé
        col = idx % _COLS + 1
        # La 3ᵉ ligne n'a que 8 colonnes (pas de lettre pour 3,9)
        if row == 3 and col == 9:
            break
        _GRID[(row, col)] = letter
        _LETTER_TO_POS[letter] = (row, col)

    def __init__(self):
        self.name = "fox_code"
        self.description = "Plugin d'encodage/décodage du Fox Code"

        # Lecture des options depuis plugin.json
        cfg_path = os.path.join(os.path.dirname(__file__), "plugin.json")
        self.enable_scoring = False
        if os.path.exists(cfg_path):
            try:
                with open(cfg_path, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                self.enable_scoring = cfg.get("enable_scoring", False)
            except Exception:
                pass

        # Initialisation éventuelle du scoring
        self.scoring_service = None
        if self.enable_scoring and scoring_service_available:
            try:
                self.scoring_service = ScoringService()
            except Exception:
                self.scoring_service = None

    # ---------------------------------------------------------------------
    # Encodage
    # ---------------------------------------------------------------------
    def _encode_char(self, char: str, variant: str) -> str:
        if char.upper() not in self._LETTER_TO_POS:
            return char  # caractère non pris en charge ‑ on le conserve
        row, col = self._LETTER_TO_POS[char.upper()]
        if variant == "short":
            return str(col)
        # variante longue : ligne puis colonne
        return f"{row}{col}"

    def encode(self, text: str, variant: str = "long") -> str:
        variant = variant.lower()
        if variant not in ("short", "long"):
            variant = "long"
        encoded_tokens = [self._encode_char(ch, variant) for ch in text]
        # On sépare les jetons par des espaces pour plus de lisibilité
        return " ".join(encoded_tokens)

    # ---------------------------------------------------------------------
    # Décodage
    # ---------------------------------------------------------------------
    def _decode_long_tokens(self, tokens: List[str]) -> str:
        result = []
        for tok in tokens:
            if not re.fullmatch(r"[1-3][1-9]", tok):
                # Jeton invalide – on le renvoie tel quel
                result.append(tok)
                continue
            row = int(tok[0])
            col = int(tok[1])
            letter = self._GRID.get((row, col), "?")
            result.append(letter)
        return "".join(result)

    def _generate_short_decodings(self, digits: List[str], limit: int = 20) -> List[str]:
        """Génère (au maximum *limit*) toutes les décodages possibles de la
        variante courte.
        """
        # Pour chaque chiffre → liste des lettres possibles (1-3 lignes)
        letter_options = []
        for d in digits:
            if d not in "123456789":
                letter_options.append([d])
                continue
            col = int(d)
            opts = [self._GRID.get((row, col)) for row in range(1, 4)]
            # Filtrer None (ex: colonne 9 ligne3 inexistante)
            opts = [o for o in opts if o]
            letter_options.append(opts)

        # Produit cartésien – peut exploser, on limite
        possibilities = []
        for combination in product(*letter_options):
            possibilities.append("".join(combination))
            if len(possibilities) >= limit:
                break
        return possibilities

    def decode(self, text: str, variant: str = "auto") -> List[str]:
        """Renvoie une liste de décodages possibles (au moins 1)."""
        variant = variant.lower()

        # Nettoyage : on conserve chiffres et séparateurs espace/slash
        cleaned = re.sub(r"[^0-9\s]", " ", text)
        cleaned = re.sub(r"\s+", " ", cleaned.strip())

        if variant == "long" or (variant == "auto" and re.search(r"[1-3][1-9](\s|$)", cleaned)):
            # Supposons que les jetons sont séparés par espace OU concaténés 2 par 2
            if " " in cleaned:
                tokens = cleaned.split()
            else:
                tokens = [cleaned[i:i+2] for i in range(0, len(cleaned), 2)]
            return [self._decode_long_tokens(tokens)]

        # Variante courte
        digits = cleaned.split() if " " in cleaned else list(cleaned)
        return self._generate_short_decodings(digits)

    # ---------------------------------------------------------------------
    # Bruteforce helper
    # ---------------------------------------------------------------------
    def bruteforce(self, text: str) -> List[Tuple[str, float, Dict]]:
        """Essaye automatiquement les deux variantes et classe les résultats
        par pertinence.
        Retourne une liste de tuples (texte, confiance, meta)
        """
        results = []

        # Variante longue
        long_dec = self.decode(text, variant="long")[0]
        conf_long = 1.0
        results.append((long_dec, conf_long, {"variant": "long"}))

        # Variant courte – générer quelques possibilités
        short_decodings = self.decode(text, variant="short")
        base_conf = 0.4
        for idx, cand in enumerate(short_decodings):
            conf = base_conf - (idx * 0.05)
            if conf < 0.1:
                conf = 0.1
            results.append((cand, conf, {"variant": "short", "candidate_rank": idx + 1}))

        # Eventuel scoring automatique
        if self.scoring_service:
            for i, (txt, _, meta) in enumerate(results):
                scoring = self.scoring_service.score_text(txt)
                if scoring:
                    results[i] = (txt, scoring.get("score", 0.5), {**meta, "scoring": scoring})

        # Triage par confiance décroissante
        results.sort(key=lambda t: t[1], reverse=True)
        return results

    # ------------------------------------------------------------------
    # Méthode execute (interface standardisée)
    # ------------------------------------------------------------------
    def execute(self, inputs: Dict) -> Dict:
        start_time = time.time()

        mode = inputs.get("mode", "decode").lower()
        text = inputs.get("text", "")
        variant = inputs.get("variant", "auto").lower()
        enable_scoring = inputs.get("enable_scoring", "off") == "on" and self.scoring_service is not None

        response = {
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

        if mode == "encode":
            encoded = self.encode(text, variant="long" if variant == "auto" else variant)
            result = {
                "id": "result_1",
                "text_output": encoded,
                "confidence": 1.0,
                "parameters": {"mode": "encode", "variant": variant}
            }
            response["results"].append(result)
            response["summary"].update({
                "best_result_id": "result_1",
                "total_results": 1,
                "message": "Encodage réussi"
            })

        elif mode == "decode":
            decodings = self.decode(text, variant=variant)
            for idx, dec in enumerate(decodings[:10]):  # limite de sécurité
                conf = 0.5
                scoring_info = None
                if enable_scoring:
                    scoring_info = self.scoring_service.score_text(dec)
                    conf = scoring_info.get("score", 0.5) if scoring_info else conf
                result = {
                    "id": f"result_{idx+1}",
                    "text_output": dec,
                    "confidence": conf,
                    "parameters": {"mode": "decode", "variant": variant},
                }
                if scoring_info:
                    result["scoring"] = scoring_info
                response["results"].append(result)

            # Choix du meilleur résultat
            best_id = max(response["results"], key=lambda r: r["confidence"])["id"] if response["results"] else None
            response["summary"].update({
                "best_result_id": best_id,
                "total_results": len(response["results"]),
                "message": "Décodage terminé"
            })

        elif mode == "bruteforce":
            brute_results = self.bruteforce(text)
            for idx, (dec, conf, meta) in enumerate(brute_results):
                result = {
                    "id": f"result_{idx+1}",
                    "text_output": dec,
                    "confidence": conf,
                    "parameters": {"mode": "bruteforce", **meta}
                }
                response["results"].append(result)
            response["summary"].update({
                "best_result_id": response["results"][0]["id"] if response["results"] else None,
                "total_results": len(response["results"]),
                "message": "Bruteforce terminé"
            })

        else:
            response["status"] = "error"
            response["summary"]["message"] = f"Mode '{mode}' non pris en charge."

        response["plugin_info"]["execution_time"] = int((time.time() - start_time) * 1000)
        return response


# Point d'entrée pour le manager de plugins
PLUGIN_CLASS = FoxCodePlugin

def init():
    return FoxCodePlugin() 