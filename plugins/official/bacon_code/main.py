import os
import sys

# Ajouter le dossier parent au path pour pouvoir importer la classe de base
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from substitution_base import SubstitutionPluginBase

class BaconCodePlugin(SubstitutionPluginBase):
    """
    Plugin pour encoder/décoder le chiffre de Bacon (aussi appelé chiffre bilitère).

    Dans sa version moderne (26 lettres), chaque lettre de A à Z est remplacée par
    une séquence de cinq caractères constituée uniquement de « A » et « B ».

    Référence : https://www.dcode.fr/chiffre-bacon-bilitere
    """

    def __init__(self):
        super().__init__("bacon_code")
        self.description = "Plugin de chiffrement/déchiffrement utilisant le chiffre Bacon (bilitère)"

        # --- Tables de substitution -------------------------------------------------
        # Variante 26 lettres (I≠J, U≠V)
        self.encode_table_26 = {
            'A': 'AAAAA', 'B': 'AAAAB', 'C': 'AAABA', 'D': 'AAABB', 'E': 'AABAA',
            'F': 'AABAB', 'G': 'AABBA', 'H': 'AABBB', 'I': 'ABAAA', 'J': 'ABAAB',
            'K': 'ABABA', 'L': 'ABABB', 'M': 'ABBAA', 'N': 'ABBAB', 'O': 'ABBBA',
            'P': 'ABBBB', 'Q': 'BAAAA', 'R': 'BAAAB', 'S': 'BAABA', 'T': 'BAABB',
            'U': 'BABAA', 'V': 'BABAB', 'W': 'BABBA', 'X': 'BABBB', 'Y': 'BBAAA',
            'Z': 'BBAAB'
        }

        # Variante 24 lettres (I/J & U/V fusionnés)
        self.encode_table_24 = {
            'A': 'AAAAA', 'B': 'AAAAB', 'C': 'AAABA', 'D': 'AAABB', 'E': 'AABAA',
            'F': 'AABAB', 'G': 'AABBA', 'H': 'AABBB', 'I': 'ABAAA', 'J': 'ABAAA',
            'K': 'ABAAB', 'L': 'ABABA', 'M': 'ABABB', 'N': 'ABBAA', 'O': 'ABBAB',
            'P': 'ABBBA', 'Q': 'ABBBB', 'R': 'BAAAA', 'S': 'BAAAB', 'T': 'BAABA',
            'U': 'BAABB', 'V': 'BAABB', 'W': 'BABAA', 'X': 'BABAB', 'Y': 'BABBA',
            'Z': 'BABBB'
        }

        # Paramètres par défaut (si l'utilisateur ne précise rien)
        self.variant = "26"     # "24" ou "26"
        self.symbol_a = "A"
        self.symbol_b = "B"

        # Configuration générale
        self.default_separators = " \t\r\n.:;,_-'\"!?"  # mêmes séparateurs que pour Atbash
        self.case_sensitive = False

        # Initialiser la table par défaut (26 lettres)
        self.set_substitution_tables(self.encode_table_26)

    # Pour le chiffre de Bacon, l'encodage fourni par la classe de base est suffisant.
    # On pourrait toutefois souhaiter ajouter un espace entre chaque groupe de cinq
    # lettres pour lisibilité. Si besoin, dé-commentez la méthode suivante.
    #
    # def encode(self, text: str) -> str:
    #     coded = super().encode(text)
    #     # Insérer un espace après chaque groupe complet « A/B » de taille 5
    #     grouped = []
    #     chunk = ''
    #     for char in coded:
    #         if char in {'A', 'B'}:
    #             chunk += char
    #             if len(chunk) == 5:
    #                 grouped.append(chunk)
    #                 chunk = ''
    #         else:
    #             if chunk:
    #                 grouped.append(chunk)
    #                 chunk = ''
    #             grouped.append(char)  # conserver le séparateur
    #     if chunk:
    #         grouped.append(chunk)
    #     return ' '.join(grouped)

    # ------------------------------------------------------------------------
    # Méthodes internes utilitaires
    # ------------------------------------------------------------------------

    def _build_tables(self):
        """Construit (ou reconstruit) les tables encode/decode selon la variante."""
        if str(self.variant) == "24":
            table = self.encode_table_24
        else:
            table = self.encode_table_26

        # Mettre à jour les tables utilisées par la classe de base
        self.set_substitution_tables(table)

    def _to_canonical_ab(self, text: str) -> str:
        """Convertit le texte en alphabet canonique A/B en remplaçant les symboles personnalisés."""
        if self.symbol_a == "A" and self.symbol_b == "B":
            return text

        # Utiliser un caractère temporaire rarissime pour éviter les collisions (U+FFF0)
        tmp = "\uFFF0"
        converted = text.replace(self.symbol_a, tmp)  # étape 1 : symbol_a -> tmp
        converted = converted.replace(self.symbol_b, "B")  # étape 2 : symbol_b -> B
        converted = converted.replace(tmp, "A")  # étape 3 : tmp -> A
        return converted

    def _from_canonical_ab(self, text: str) -> str:
        """Convertit un texte A/B vers les symboles personnalisés."""
        if self.symbol_a == "A" and self.symbol_b == "B":
            return text

        tmp = "\uFFF0"
        converted = text.replace("A", tmp)  # A -> tmp
        converted = converted.replace("B", self.symbol_b)  # B -> symbol_b
        converted = converted.replace(tmp, self.symbol_a)  # tmp -> symbol_a
        return converted

    # ------------------------------------------------------------------------
    # Surcharge encode/decode/check_code pour gérer symboles personnalisés
    # ------------------------------------------------------------------------

    def encode(self, text: str) -> str:
        # Assurer que la table correspond à la variante courante
        self._build_tables()

        # Encodage canonique (A/B)
        ab_encoded = super().encode(text)

        # Remplacer par symboles personnalisés le cas échéant
        return self._from_canonical_ab(ab_encoded)

    def decode(self, text: str) -> str:
        # Assurer les bonnes tables et convertir en A/B
        self._build_tables()
        canonical = self._to_canonical_ab(text)
        return super().decode(canonical)

    def check_code(self, text: str, strict: bool = False, allowed_chars: str = None, embedded: bool = False) -> dict:
        self._build_tables()
        canonical = self._to_canonical_ab(text)

        # Étendre allowed_chars pour inclure les symboles personnalisés
        if allowed_chars is None:
            allowed_chars = self.default_separators
        allowed_chars += self.symbol_a + self.symbol_b

        return super().check_code(canonical, strict, allowed_chars, embedded)

    # ------------------------------------------------------------------------
    # Surcharge execute pour gérer les nouveaux paramètres d'entrée
    # ------------------------------------------------------------------------

    def execute(self, inputs: dict) -> dict:
        """Intercepte les paramètres variant / symboles puis délègue à la classe de base."""
        # Paramètres de configuration transmis par l'utilisateur (valeurs par défaut définies dans __init__)
        self.variant = str(inputs.get("variant", self.variant)).strip()
        self.symbol_a = str(inputs.get("symbol_a", self.symbol_a)) or self.symbol_a
        self.symbol_b = str(inputs.get("symbol_b", self.symbol_b)) or self.symbol_b
        
        # Vérifier cohérence symboles
        if self.symbol_a == self.symbol_b:
            return {
                "status": "error",
                "plugin_info": {"name": self.name, "version": "1.0.0", "execution_time": 0},
                "inputs": inputs.copy(),
                "results": [],
                "summary": {"best_result_id": None, "total_results": 0, "message": "Les symboles A et B doivent être distincts."}
            }

        # Option auto-détection des symboles (activée par défaut)
        auto_detect_param = inputs.get("auto_detect_symbols", "on")
        auto_detect = str(auto_detect_param).lower() in ["on", "true", "1", "yes"]

        # Vérifier si le mode bruteforce est demandé (via checkbox ou mode explicite)
        mode = inputs.get("mode", "decode").lower()
        bruteforce_flag = inputs.get("bruteforce", False) or inputs.get("brute_force", False)
        do_bruteforce = bruteforce_flag or mode == "bruteforce"

        # ------------------------------------------------------------------
        # Mode BRUTEFORCE
        # ------------------------------------------------------------------
        if do_bruteforce:
            return self._execute_bruteforce(inputs, auto_detect)

        # ------------------------------------------------------------------
        # Modes classiques (encode / decode / detect)
        # ------------------------------------------------------------------

        # Auto-détection pour le décodage
        if mode in ("decode", "detect") and auto_detect:
            self._maybe_detect_symbols(inputs.get("text", ""))

        # Recalculer les tables maintenant que variant/symboles sont définitifs
        self._build_tables()

        # Déléguer au comportement standard
        return super().execute(inputs)

    # --------------------------------------------------------------------
    #   Support interne : auto-détection & bruteforce
    # --------------------------------------------------------------------

    def _maybe_detect_symbols(self, text: str):
        """Si le texte ne contient que deux symboles distincts, les utiliser automatiquement."""
        # Ne rien changer si l'utilisateur a explicitement fourni les deux symboles
        if self.symbol_a != "A" or self.symbol_b != "B":
            return

        # Supprimer les séparateurs pour ne garder que les caractères significatifs
        clean = text
        for sep in self.default_separators:
            clean = clean.replace(sep, "")

        unique_chars = list(dict.fromkeys(clean))  # ordre de première apparition
        if len(unique_chars) == 2:
            self.symbol_a, self.symbol_b = unique_chars[0], unique_chars[1]

    def _execute_bruteforce(self, inputs: dict, auto_detect: bool):
        import time
        start_time = time.time()

        text = inputs.get("text", "")
        context = inputs.get("context", {})

        # Déterminer les paires de symboles à tester
        symbol_pairs = set()

        # 1) paire utilisateur
        symbol_pairs.add((self.symbol_a, self.symbol_b))

        # 2) inversion
        if self.symbol_a != self.symbol_b:
            symbol_pairs.add((self.symbol_b, self.symbol_a))

        # 3) auto-détection : si seulement 2 symboles dans le texte, les ajouter
        if auto_detect:
            clean = text
            for sep in self.default_separators:
                clean = clean.replace(sep, "")
            uniq = list(dict.fromkeys(clean))
            if len(uniq) == 2:
                symbol_pairs.add((uniq[0], uniq[1]))
                symbol_pairs.add((uniq[1], uniq[0]))

        # Générer les différentes combinaisons
        results = []
        result_id = 1
        for variant in ("26", "24"):
            for a_sym, b_sym in symbol_pairs:
                # Appliquer la configuration
                self.variant = variant
                self.symbol_a = a_sym
                self.symbol_b = b_sym
                self._build_tables()

                # Décoder
                canonical = self._to_canonical_ab(text)
                decoded = super().decode(canonical)

                # Scoring (optionnel)
                scoring = None
                confidence = 0.5
                enable_scoring = str(inputs.get("enable_scoring", "")).lower() == "on"
                if enable_scoring and self.scoring_service_available:
                    scoring = self.get_text_score(decoded, context)
                    if scoring:
                        confidence = scoring.get("score", confidence)

                res = {
                    "id": f"result_{result_id}",
                    "text_output": decoded,
                    "confidence": confidence,
                    "parameters": {
                        "variant": variant,
                        "symbol_a": a_sym,
                        "symbol_b": b_sym
                    },
                    "metadata": {
                        "swapped": (a_sym, b_sym) != (self.symbol_a, self.symbol_b)
                    }
                }
                if scoring:
                    res["scoring"] = scoring
                results.append(res)
                result_id += 1

        # Choisir le meilleur résultat (max confiance)
        if results:
            best = max(results, key=lambda r: r["confidence"])
            best_id = best["id"]
        else:
            best_id = None

        # Construire la réponse standardisée
        standardized = {
            "status": "success",
            "plugin_info": {
                "name": self.name,
                "version": "1.0.0",
                "execution_time": int((time.time() - start_time) * 1000)
            },
            "inputs": inputs.copy(),
            "results": results,
            "summary": {
                "best_result_id": best_id,
                "total_results": len(results),
                "message": f"Bruteforce Bacon : {len(results)} combinaisons testées"
            }
        }
        if not results:
            standardized["summary"]["message"] = "Aucun résultat trouvé lors du bruteforce"

        return standardized

# Point d'entrée pour le système de plugins

def execute(inputs: dict) -> dict:
    """Point d'entrée principal pour le plugin Bacon Code."""
    plugin = BaconCodePlugin()
    return plugin.execute(inputs) 