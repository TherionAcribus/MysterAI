import re
import time

# Dépendances externes
try:
    import fasttext  # Utilisation prioritaire pour la détection de langue
except ImportError:
    fasttext = None  # Fallback sur langdetect

from number_parser import parse_number
from langdetect import detect as langdetect_detect


class WordCoordsConverter:
    """Plugin MysteryAI : conversion de coordonnées écrites en toutes lettres
    vers le format géocaching DDM (ex : N 49° 36.070 E 005° 21.059).
    Support multilingue (actuellement : fr, en)."""

    # ------------------------------------------------------------------
    # Tables de correspondance
    # ------------------------------------------------------------------
    DIGITS_LANG = {
        "en": {
            "zero": "0", "zeros": "0", "one": "1", "two": "2", "three": "3",
            "four": "4", "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9"
        },
        "fr": {
            "zero": "0", "zéro": "0", "zeros": "0", "zeros": "0", "un": "1", "deux": "2", "trois": "3",
            "quatre": "4", "cinq": "5", "six": "6", "sept": "7", "huit": "8", "neuf": "9"
        }
    }

    DIRECTIONS_LANG = {
        "en": {"north": "N", "south": "S", "east": "E", "west": "W"},
        "fr": {"nord": "N", "sud": "S", "est": "E", "ouest": "W"}
    }

    DEG_KEYWORDS = {
        "en": {"degree", "degrees"},
        "fr": {"degre", "degré", "degrés", "degres"}
    }

    POINT_KEYWORDS = {
        "en": {"point", "dot"},
        "fr": {"virgule", "point"}
    }

    SEP_KEYWORDS = {"by", "par", ";", ","}

    # ------------------------------------------------------------------
    def __init__(self):
        self.name = "word_coords_converter"
        # Chargement éventuel du modèle fastText pour la détection de langue
        self._fasttext_model = None
        if fasttext is not None:
            for model_name in ("lid.176.ftz", "lid.176.bin"):
                try:
                    self._fasttext_model = fasttext.load_model(model_name)
                    break
                except Exception:
                    continue

        # Essai d'initialisation du service de scoring (optionnel)
        try:
            from app.services.scoring_service import ScoringService
            self.scoring_service = ScoringService()
            self.scoring_service_available = True
        except Exception:
            self.scoring_service_available = False

    # ------------------------------------------------------------------
    # Outils internes
    # ------------------------------------------------------------------
    def _detect_language(self, text: str) -> str:
        """Détecte la langue via fastText si possible, sinon langdetect."""
        if self._fasttext_model is not None:
            try:
                prediction = self._fasttext_model.predict(text.replace("\n", " "))
                # prediction[0] contient ['__label__fr'] par ex.
                lang = prediction[0][0].replace("__label__", "")
                return lang
            except Exception:
                pass
        # Fallback
        try:
            return langdetect_detect(text)
        except Exception:
            return "en"  # défaut

    def _words_to_number(self, words: list[str], lang: str):
        """Convertit une liste de mots représentant un nombre en entier.
        1. Tentative parse_number
        2. On réessaie avec des tirets (soixante-dix) si nécessaire
        3. Concaténation de chiffres individuels (quatre neuf -> 49)"""
        segment_space = " ".join(words)
        # 1) avec espaces
        try:
            val = parse_number(segment_space, language=lang)
            if val is not None:
                return int(val)
        except Exception:
            pass

        # 2) avec tirets (utile pour 'soixante-dix', 'quatre-vingt')
        segment_hyphen = "-".join(words)
        try:
            val = parse_number(segment_hyphen, language=lang)
            if val is not None:
                return int(val)
        except Exception:
            pass

        digits_map = self.DIGITS_LANG.get(lang, {})
        if all(w in digits_map for w in words):
            return int("".join(digits_map[w] for w in words))

        # Fallback manuel pour le français : dizaines + unités (quarante neuf -> 49, soixante dix -> 70)
        if lang == "fr":
            units = {
                "zero": 0, "zéro": 0, "un": 1, "deux": 2, "trois": 3, "quatre": 4,
                "cinq": 5, "six": 6, "sept": 7, "huit": 8, "neuf": 9,
                "dix": 10
            }
            tens = {
                "dix": 10, "vingt": 20, "trente": 30, "quarante": 40,
                "cinquante": 50, "soixante": 60, "soixante-dix": 70,
                "septante": 70, "quatre-vingt": 80, "quatre-vingt-dix": 90,
                "huitante": 80, "nonante": 90
            }

            # gérer concaténation potentielle avec tiret
            segment_hyphen_lower = segment_hyphen.lower()
            if segment_hyphen_lower in tens:
                return tens[segment_hyphen_lower]

            if len(words) == 2:
                first, second = words[0].lower(), words[1].lower()
                base = tens.get(first)
                unit = units.get(second)
                if base is not None and unit is not None:
                    return base + unit  # ex: quarante (40) + neuf (9)

            # Cas 'soixante dix' (60 + 10)
            if len(words) == 2 and words[0].lower() == "soixante" and words[1].lower() == "dix":
                return 70

            # Cas 'quatre vingt' (80)
            if len(words) == 2 and words[0].lower() == "quatre" and words[1].lower() == "vingt":
                return 80

            # Cas 'quatre vingt dix' (90) -> trois mots
            if len(words) == 3 and words[0].lower() == "quatre" and words[1].lower() == "vingt" and words[2].lower() == "dix":
                return 90

        return None

    def _parse_decimals(self, words: list[str], lang: str) -> str:
        """Décimales : conversion mot->chiffres concaténés (max 3)."""
        digits_map = self.DIGITS_LANG.get(lang, {})
        digits = ""
        for w in words:
            if w in digits_map:
                digits += digits_map[w]
            else:
                try:
                    val = parse_number(w, language=lang)
                    if val is not None:
                        digits += str(int(val))
                except Exception:
                    pass
        if not digits:
            digits = "0"
        # on limite à 3 décimales, remplit à droite avec 0
        return digits[:3].ljust(3, "0")

    def _extract_coord(self, tokens: list[str], start_idx: int, lang: str):
        """Extrait une coordonnée à partir de start_idx.
        Retour : (coord_str ou None, next_idx)"""
        dir_words_map = self.DIRECTIONS_LANG.get(lang, {})
        n = len(tokens)
        i = start_idx
        while i < n:
            dir_letter = dir_words_map.get(tokens[i])
            if dir_letter:
                # Direction trouvée
                i += 1
                # -------------------- Degrés/Minutes (avec ou sans mot 'degrees') --------------------
                has_degree_keyword = False
                deg_words = []

                # Tentative standard: s'arrêter sur le mot-clé 'degrees'
                while i < n and tokens[i] not in self.DEG_KEYWORDS.get(lang, set()):
                    deg_words.append(tokens[i])
                    i += 1
                if i < n and tokens[i] in self.DEG_KEYWORDS.get(lang, set()):
                    has_degree_keyword = True

                if has_degree_keyword:
                    # On a trouvé explicitement 'degree(s)'
                    i += 1  # saute le mot 'degrees'
                    # -------------------- Minutes --------------------
                    min_words = []
                    while i < n and tokens[i] not in (self.POINT_KEYWORDS.get(lang, set()) | set(dir_words_map) | self.SEP_KEYWORDS):
                        min_words.append(tokens[i])
                        i += 1
                    # Décimales éventuelles
                    decimals_part = "000"
                    if i < n and tokens[i] in self.POINT_KEYWORDS.get(lang, set()):
                        i += 1
                        dec_words = []
                        while i < n and tokens[i] not in (set(dir_words_map) | self.SEP_KEYWORDS):
                            dec_words.append(tokens[i])
                            i += 1
                        decimals_part = self._parse_decimals(dec_words, lang)

                    deg_val = self._words_to_number(deg_words, lang)
                    min_val = self._words_to_number(min_words, lang)
                    if deg_val is not None and min_val is not None:
                        coord_str = f"{dir_letter} {deg_val:02d}° {min_val:02d}.{decimals_part}"
                        return coord_str, i
                    # Sinon on continue la recherche après la direction
                else:
                    # Fallback sans mot 'degrees' (ex: "north forty two fifty two point six eight one")
                    # Construire un segment jusqu'au prochain mot direction/séparateur ou fin
                    segment_start = i - len(deg_words)
                    j = segment_start
                    point_idx = None
                    stop_words = set(dir_words_map) | self.SEP_KEYWORDS
                    while j < n and tokens[j] not in stop_words:
                        if tokens[j] in self.POINT_KEYWORDS.get(lang, set()) and point_idx is None:
                            point_idx = j
                        j += 1
                    segment_end = j

                    # déterminer borne minutes avant 'point' (ou fin)
                    window_end = point_idx if point_idx is not None else segment_end
                    seg = tokens[segment_start:window_end]

                    # Essayer 1 à 3 mots pour les degrés
                    deg_max = 90 if dir_letter in ("N", "S") else 180
                    for k in range(1, min(4, len(seg))):
                        deg_words_try = seg[:k]
                        min_words_try = seg[k:]
                        if not min_words_try:
                            continue
                        deg_val = self._words_to_number(deg_words_try, lang)
                        min_val = self._words_to_number(min_words_try, lang)
                        if deg_val is None or min_val is None:
                            continue
                        if 0 <= deg_val <= deg_max and 0 <= min_val <= 59:
                            decimals_part = "000"
                            if point_idx is not None:
                                dec_words = tokens[point_idx+1:segment_end]
                                decimals_part = self._parse_decimals(dec_words, lang)
                            coord_str = f"{dir_letter} {deg_val:02d}° {min_val:02d}.{decimals_part}"
                            return coord_str, segment_end
            i += 1
        return None, start_idx

    def _get_text_score(self, text, context=None):
        if not self.scoring_service_available:
            return None
        try:
            return self.scoring_service.score_text(text, context)
        except Exception:
            return None

    # ------------------------------------------------------------------
    # Entrée principale du plugin
    # ------------------------------------------------------------------
    def execute(self, inputs: dict):
        start_time = time.time()
        text: str = inputs.get("text", "")
        if not text:
            return {
                "status": "error",
                "plugin_info": {"name": self.name, "version": "1.0.0", "execution_time": 0},
                "summary": {"message": "Aucun texte fourni", "total_results": 0}
            }

        lang_override = inputs.get("language_override", "auto")
        lang = self._detect_language(text) if lang_override == "auto" else lang_override

        tokens = re.sub(r"[^\w]", " ", text.lower()).split()

        # On peut tenter plusieurs langues si besoin
        langs_to_try = [lang] + [l for l in ("fr", "en") if l != lang]
        coord1 = coord2 = None
        used_lang = lang
        for current_lang in langs_to_try:
            coord1, idx_after = self._extract_coord(tokens, 0, current_lang)
            coord2, _ = self._extract_coord(tokens, idx_after, current_lang)
            if coord1 or coord2:
                used_lang = current_lang
                break

        combined = f"{coord1 or ''} {coord2 or ''}".strip()

        # -------------------- Scoring optionnel --------------------
        checkbox_val = inputs.get("enable_scoring", "")
        enable_scoring = checkbox_val == "on"
        scoring_info = self._get_text_score(combined) if enable_scoring else None
        confidence = scoring_info.get("score", 1.0) if scoring_info else 1.0 if coord1 and coord2 else 0.4

        result_obj = {
            "id": "result_1",
            "text_output": combined,
            "confidence": confidence,
            "parameters": {"language": used_lang},
            "metadata": {
                "coord_1": coord1,
                "coord_2": coord2
            }
        }
        if scoring_info:
            result_obj["scoring"] = scoring_info

        exec_time_ms = int((time.time() - start_time) * 1000)
        return {
            "status": "success" if combined else "partial_success",
            "plugin_info": {"name": self.name, "version": "1.0.0", "execution_time": exec_time_ms},
            "inputs": inputs,
            "results": [result_obj],
            "summary": {
                "best_result_id": "result_1",
                "total_results": 1,
                "message": "Coordonnées converties" if combined else "Aucune coordonnée complète détectée"
            }
        }

class WordCoordsConverterPlugin(WordCoordsConverter):
    """Alias requis pour la détection automatique par le PluginManager (nom se terminant par 'Plugin')."""
    pass 