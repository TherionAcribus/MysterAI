from loguru import logger

class MetaDetectionPlugin:
    """
    Plugin central de détection de codes, qui s'appuie sur d'autres plugins
    déclarant des capacités de détection (ex. 'detect').
    
    Basé sur la doc fournie :
      - Le plugin manager va charger ce 'meta_detection' plugin
      - On suppose qu'il dispose d'une méthode 'plugin_manager.get_plugins()'
        ou équivalent pour récupérer tous les plugins disponibles
      - Chaque plugin de détection doit implémenter une méthode 'check_code(text, mode)'
        ou proposer un 'execute' avec un 'action="detect"' qui renvoie un score
      - Pour décoder, on suppose qu'un plugin peut proposer un 'decode(text)' 
        ou 'execute({"action": "decode", ...})'.
    """

    def __init__(self, plugin_manager=None):
        # Le plugin manager est injecté (ou récupéré autrement)
        self.plugin_manager = plugin_manager
        self.name = "meta_detection"
        self.description = "Plugin de détection centralisé"

    def set_plugin_manager(self, plugin_manager):
        """
        Permet d'injecter le plugin manager après l'initialisation
        """
        self.plugin_manager = plugin_manager

    def execute(self, inputs: dict) -> dict:
        """
        Point d'entrée principal pour le manager.
        
        inputs attendus :
          - mode : "detect" ou "decode"
          - text : le texte à analyser ou à décoder
          - strict : "strict" ou "smooth"
          - plugin_name : si on veut décoder via un plugin précis

        Renvoie un dict au format :
          {
            "result": {
              "possible_codes": [
                { "plugin_name": str, "score": float, "can_decode": bool },
                ...
              ]
            }
          }
          ou
          {
            "result": {
              "decoded_text": "..."
            }
          }
        """
        logger.info(inputs)
        mode = inputs.get("mode", "detect")
        text = inputs.get("text", "")
        strict = inputs.get("strict", "strict") == "strict" # "strict" ou "smooth"
        plugin_name = inputs.get("plugin_name", None)

        if mode == "detect":
            return self.detect_codes(text, strict)
        elif mode == "decode":
            return self.decode_code(plugin_name, text)
        else:
            raise ValueError(f"Action inconnue: {mode}")

    def detect_codes(self, text: str, strict: bool = True) -> dict:
        # On récupère les plugins chargés
        all_plugins = list(self.plugin_manager.loaded_plugins.values())

        results = []
        for plugin_wrapper in all_plugins:
            # plugin_wrapper._instance est l'instance de la classe plugin
            p_instance = getattr(plugin_wrapper, "_instance", None)
            if p_instance and hasattr(p_instance, "check_code"):
                try:
                    # On appelle check_code avec le mode approprié
                    result = p_instance.check_code(text, strict=strict)
                    
                    if result["is_match"]:
                        can_decode = hasattr(p_instance, "decode")
                        results.append({
                            "plugin_name": p_instance.name,
                            "score": 1.0,
                            "can_decode": can_decode,
                            "fragments": result["fragments"]
                        })

                except Exception as e:
                    continue

        # On trie par score décroissant (ici tous les scores sont à 1.0)
        # Plus tard on pourra ajouter un score basé sur la qualité/quantité des fragments
        results.sort(key=lambda x: len(x.get("fragments", [])), reverse=True)

        return {
            "result": {
                "possible_codes": results
            }
        }


    def decode_code(self, plugin_name: str = None, text: str = "") -> dict:
        """
        Décode le texte en utilisant soit :
        - le plugin spécifié par plugin_name s'il est fourni
        - sinon tous les plugins qui ont une méthode decode
        """
        if not text:
            return {"error": "Aucun texte fourni"}

        # On récupère les plugins chargés
        all_plugins = list(self.plugin_manager.loaded_plugins.values())
        
        # Si un plugin spécifique est demandé
        if plugin_name:
            for plugin_wrapper in all_plugins:
                p_instance = getattr(plugin_wrapper, "_instance", None)
                if p_instance and p_instance.name == plugin_name:
                    if hasattr(p_instance, "decode"):
                        try:
                            decoded = p_instance.decode(text)
                            return {"result": {"decoded_text": decoded}}
                        except Exception as e:
                            return {"error": f"Erreur lors du décodage: {str(e)}"}
                    else:
                        return {"error": f"Le plugin {plugin_name} ne supporte pas le décodage"}
            return {"error": f"Plugin {plugin_name} non trouvé"}
        
        # Sinon on essaie tous les plugins qui ont decode
        results = []
        for plugin_wrapper in all_plugins:
            p_instance = getattr(plugin_wrapper, "_instance", None)
            if p_instance and hasattr(p_instance, "decode"):
                try:
                    decoded = p_instance.decode(text)
                    results.append({
                        "plugin_name": p_instance.name,
                        "decoded_text": decoded
                    })
                except Exception:
                    # On ignore les erreurs de décodage pour les autres plugins
                    continue
        
        if not results:
            return {"error": "Aucun plugin n'a réussi à décoder le texte"}
            
        return {
            "result": {
                "decoded_results": results
            }
        }
