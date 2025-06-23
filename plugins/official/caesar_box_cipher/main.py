import os
import json
import math
import time
import re
import random
import itertools
import requests

try:
    from app.services.scoring_service import ScoringService
    scoring_service_available = True
except ImportError:
    scoring_service_available = False


class CaesarBoxCipherPlugin:
    """Plugin MysteryAI – Chiffre Carré de César / Caesar Box."""

    def __init__(self):
        self.name = "caesar_box_cipher"
        self.description = "Plugin de chiffrement/déchiffrement Caesar Box (transposition en grille)"

        cfg_path = os.path.join(os.path.dirname(__file__), "plugin.json")
        try:
            with open(cfg_path, "r", encoding="utf-8") as fp:
                cfg = json.load(fp)
                self.enable_scoring = cfg.get("enable_scoring", False)
        except Exception:
            self.enable_scoring = False

        self.scoring_service = None
        if scoring_service_available and self.enable_scoring:
            try:
                self.scoring_service = ScoringService()
            except Exception:
                self.scoring_service = None

    # ------------------------------------------------------------------
    #  Utilitaires grille
    # ------------------------------------------------------------------
    @staticmethod
    def _clean_text(text):
        return re.sub(r"\s+", "", text)

    def _fill_grid_row(self, text: str, width: int, height: int = None, pad_char: str = "_"):
        if width <= 0:
            return []
        if height is None or height <= 0:
            height = math.ceil(len(text) / width)
        padded = text.ljust(width * height, pad_char)
        grid = [list(padded[i * width:(i + 1) * width]) for i in range(height)]
        return grid

    def _encode(self, text: str, width: int, height: int = None) -> str:
        grid = self._fill_grid_row(text, width, height)
        if not grid:
            return ""
        h = len(grid)
        w = len(grid[0])
        cipher = []
        for col in range(w):
            for row in range(h):
                cipher.append(grid[row][col])
        return "".join(cipher)

    def _decode(self, cipher: str, width: int, height: int = None) -> str:
        if width <= 0:
            return cipher
        if height is None or height <= 0:
            height = math.ceil(len(cipher) / width)
        grid = [[None] * width for _ in range(height)]
        idx = 0
        for col in range(width):
            for row in range(height):
                if idx < len(cipher):
                    grid[row][col] = cipher[idx]
                    idx += 1
        plaintext_chars = []
        for row in grid:
            plaintext_chars.extend([ch for ch in row if ch])
        return "".join(plaintext_chars).rstrip("_")

    # ------------------------------------------------------------------
    #  Bruteforce tailles
    # ------------------------------------------------------------------
    def _bruteforce(self, cipher: str, max_width: int = None):
        length = len(cipher)
        max_width = max_width or length
        solutions = []
        seen = set()
        for w in range(2, min(max_width, length) + 1):
            h = math.ceil(length / w)
            decoded = self._decode(cipher, w, h)
            key = (decoded, w)
            if key in seen:
                continue
            seen.add(key)
            solutions.append({"width": w, "height": h, "decoded_text": decoded})
        return solutions

    # ------------------------------------------------------------------
    #  Scoring
    # ------------------------------------------------------------------
    def _score(self, text):
        if not self.scoring_service:
            return None
        try:
            return self.scoring_service.score_text(text)
        except Exception:
            return None

    # ------------------------------------------------------------------
    #  Execute
    # ------------------------------------------------------------------
    def execute(self, inputs: dict):
        start = time.time()
        text = inputs.get("text", "")
        if not text:
            return {
                "status": "error",
                "plugin_info": {"name": self.name, "version": "1.0.0", "execution_time": 0},
                "summary": {"message": "Aucun texte fourni", "total_results": 0}
            }

        mode = inputs.get("mode", "decode").lower()
        width = int(inputs.get("width", 0))
        height = int(inputs.get("height", 0))
        enable_scoring = inputs.get("enable_scoring", "") == "on" and self.enable_scoring

        # détection flag bruteforce (cas où mode==decode mais brute_force==True)
        brute_force_flag = False
        for flag in ("bruteforce", "brute_force", "enable_bruteforce"):
            val = inputs.get(flag, False)
            if isinstance(val, bool):
                brute_force_flag = brute_force_flag or val
            else:
                brute_force_flag = brute_force_flag or str(val).lower() in ("true", "on", "1")

        response = {
            "status": "success",
            "plugin_info": {"name": self.name, "version": "1.0.0", "execution_time": 0},
            "inputs": inputs.copy(),
            "results": [],
            "summary": {"best_result_id": None, "total_results": 0, "message": ""}
        }

        if mode == "encode":
            plain = self._clean_text(text)
            length = len(plain)
            if width > 0 and height == 0:
                height = math.ceil(length / width)
            elif height > 0 and width == 0:
                width = math.ceil(length / height)
            elif width == 0 and height == 0:
                width = int(math.ceil(math.sqrt(length)))
                height = math.ceil(length / width)
            cipher = self._encode(plain, width, height)
            res = {
                "id": "result_1",
                "text_output": cipher,
                "confidence": 1.0,
                "parameters": {"mode": mode, "width": width, "height": height or None},
                "metadata": {"processed_chars": len(plain)}
            }
            response["results"].append(res)
            response["summary"].update({"best_result_id": "result_1", "total_results": 1, "message": "Encodage réussi"})

        elif mode == "decode":
            # Si bruteforce demandé via flag, on passe directement en bruteforce
            if brute_force_flag:
                cipher = self._clean_text(text)
                solutions = self._bruteforce(cipher, max_width=len(cipher))
                results = []
                for idx, sol in enumerate(solutions, 1):
                    conf = 0.3
                    if enable_scoring:
                        s = self._score(sol["decoded_text"])
                        if s:
                            conf = s.get("score", conf)
                    results.append({
                        "id": f"result_{idx}",
                        "text_output": sol["decoded_text"],
                        "confidence": conf,
                        "parameters": {"mode": "decode", "width": sol["width"], "height": sol["height"], "bruteforce": True}
                    })
                results.sort(key=lambda r: r.get("confidence", 0), reverse=True)
                response["results"] = results
                response["bruteforce_solutions"] = solutions
                response["summary"].update({"best_result_id": results[0]["id"] if results else None, "total_results": len(results), "message": f"{len(results)} tailles testées (decode bruteforce)"})
                response["plugin_info"]["execution_time"] = int((time.time() - start) * 1000)
                return response
            else:
                cipher = self._clean_text(text)
                length = len(cipher)

                # gérer alternative hauteur
                if width == 0 and height > 0:
                    width = math.ceil(length / height)

                if width == 0:
                    # Recherche automatique de la meilleure largeur
                    best_plain = ""
                    best_conf = -1.0
                    best_w = None
                    max_w = len(cipher)
                    for w in range(2, max_w + 1):
                        h = math.ceil(len(cipher) / w)
                        decoded_candidate = self._decode(cipher, w, h)
                        conf = 0.3
                        if enable_scoring:
                            score_info_tmp = self._score(decoded_candidate)
                            if score_info_tmp:
                                conf = score_info_tmp.get("score", conf)
                            else:
                                # heuristique : proportion de voyelles
                                vowels = sum(1 for ch in decoded_candidate if ch in "AEIOUY")
                                conf = vowels / max(1, len(decoded_candidate))
                        if conf > best_conf:
                            best_conf = conf
                            best_plain = decoded_candidate
                            best_w = w
                    width = best_w if best_w else int(math.ceil(math.sqrt(len(cipher))))
                    plain = best_plain
                else:
                    if height == 0:
                        height = math.ceil(length / width)
                    plain = self._decode(cipher, width, height)
                conf = 0.5
                score_info = None
                if enable_scoring:
                    score_info = self._score(plain)
                    if score_info:
                        conf = score_info.get("score", conf)
                res = {
                    "id": "result_1",
                    "text_output": plain,
                    "confidence": conf,
                    "parameters": {"mode": mode, "width": width, "height": height or None},
                    "metadata": {"processed_chars": len(cipher)}
                }
                if score_info:
                    res["scoring"] = score_info
                response["results"].append(res)
                response["summary"].update({"best_result_id": "result_1", "total_results": 1, "message": "Décodage réussi"})

        elif mode == "bruteforce":
            cipher = self._clean_text(text)
            solutions = self._bruteforce(cipher, max_width=len(cipher))
            results = []
            for idx, sol in enumerate(solutions, 1):
                conf = 0.3
                if enable_scoring:
                    s = self._score(sol["decoded_text"])
                    if s:
                        conf = s.get("score", conf)
                results.append({
                    "id": f"result_{idx}",
                    "text_output": sol["decoded_text"],
                    "confidence": conf,
                    "parameters": {"mode": mode, "width": sol["width"], "height": sol["height"]}
                })
            results.sort(key=lambda r: r.get("confidence", 0), reverse=True)
            response["results"] = results
            response["bruteforce_solutions"] = solutions
            response["summary"].update({"best_result_id": results[0]["id"] if results else None, "total_results": len(results), "message": f"{len(results)} tailles testées"})
        else:
            response["status"] = "error"
            response["summary"].update({"message": f"Mode inconnu: {mode}", "total_results": 0})

        response["plugin_info"]["execution_time"] = int((time.time() - start) * 1000)
        return response


class CaesarBoxCipher(CaesarBoxCipherPlugin):
    pass 