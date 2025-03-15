from what3words import Geocoder

class What3WordsPlugin:
    """
    Plugin pour interagir avec l'API What3Words en mode vérification et autosuggestion.
    """

    def __init__(self):
        self.name = "what3words_plugin"
        self.description = "Interagissez avec What3Words pour vérifier et suggérer des adresses"
        # Remplacez 'YOUR_API_KEY' par votre clé API What3Words
        self.api_key = "9TQSPIIO"
        self.geocoder = Geocoder(self.api_key)

    def execute(self, inputs):
        """
        Exécute l'action demandée en fonction des inputs.
        :param inputs: dict contenant 'action' et 'value'.
        :return: dict avec le résultat.
        """
        action = inputs.get("action", "verify_address")
        value = inputs.get("value", "").strip()

        if not value:
            return {"error": "La valeur d'entrée 'value' est vide."}

        try:
            if action == "verify_address":
                return self._verify_address(value)
            elif action == "autosuggest":
                return self._autosuggest(value)
            else:
                return {"error": f"Action inconnue : {action}"}
        except Exception as e:
            return {"error": f"Erreur lors de l'exécution : {str(e)}"}

    def _verify_address(self, words):
        """
        Vérifie si une adresse What3Words est valide.
        :param words: Adresse 3 mots (ex : enfermant.vouer.tellement).
        :return: dict avec le statut de validation.
        """
        try:
            res = self.geocoder.is_valid_3wa(words)
            return {
                "result": {
                    "valid": res,
                    "words": words
                }
            }
        except Exception as e:
            return {"error": f"Erreur lors de la vérification : {str(e)}"}

    def _autosuggest(self, partial_words):
        """
        Retourne une liste de suggestions basées sur une entrée partielle.
        :param partial_words: Chaîne partielle des 3 mots.
        :return: dict avec une liste de suggestions.
        """
        try:
            res = self.geocoder.autosuggest(partial_words)
            if res.get("error") is None:
                suggestions = [s["words"] for s in res["suggestions"]]
                return {
                    "input": partial_words,
                    "text_output": str(suggestions)
                }
            return {"error": f"Erreur lors de l'autosuggestion : {res['error']['message']}"}
        except Exception as e:
            return {"error": f"Erreur lors de l'autosuggestion : {str(e)}"}
