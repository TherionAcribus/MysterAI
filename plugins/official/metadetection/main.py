from loguru import logger

class MetaDetectionPlugin:
    """
    Plugin de détection et décodage de codes.
    
    Ce plugin permet de détecter automatiquement les codes potentiels dans un texte
    et de les décoder en utilisant les plugins appropriés.
    """

    def __init__(self):
        """
        Initialise le plugin de détection de codes.
        """
        self.name = "metadetection"
        self.description = "Détecte et décode automatiquement les codes"

    def execute(self, inputs: dict) -> dict:
        """
        Point d'entrée principal du plugin.
        
        Args:
            inputs: Dictionnaire contenant les paramètres d'entrée
                - mode: "detect" ou "decode"
                - text: Texte à analyser ou décoder
                - strict: "strict" ou "smooth" pour le mode d'analyse
                - allowed_chars: Liste de caractères autorisés pour le mode smooth
                - embedded: True si le texte peut contenir du code intégré, False si tout le texte doit être du code
                - plugin_name: Nom du plugin à utiliser (optionnel)
                - enable_gps_detection: True pour activer la détection des coordonnées GPS (optionnel)
                
        Returns:
            Dictionnaire contenant le résultat de l'opération
        """
        mode = inputs.get("mode", "detect").lower()
        text = inputs.get("text", "")
        plugin_name = inputs.get("plugin_name")
        
        # Récupération du mode strict/smooth
        strict = inputs.get("strict", "strict").lower() == "strict"
        
        # Récupération des caractères autorisés
        allowed_chars = inputs.get("allowed_chars", None)
        
        # Récupération du mode embedded
        embedded = inputs.get("embedded", False)
        
        # Récupération du paramètre de détection GPS
        enable_gps_detection = inputs.get("enable_gps_detection", True)
        
        if not text:
            return {"result": {"error": "Aucun texte fourni à traiter."}}
            
        if mode == "detect":
            return self.detect_codes(text, strict, allowed_chars, embedded)
        elif mode == "decode":
            strict_param = "strict" if strict else "smooth"
            result = self.decode_code(plugin_name, text, strict_param, allowed_chars, embedded)
            
            # Ajouter le paramètre enable_gps_detection au résultat pour que le plugin_manager puisse l'utiliser
            result["enable_gps_detection"] = enable_gps_detection
            return result
        else:
            raise ValueError(f"Action inconnue: {mode}")

    def detect_codes(self, text: str, strict: bool = True, allowed_chars: list = None, embedded: bool = False) -> dict:
        """
        Détecte les codes potentiels dans un texte.
        
        Args:
            text: Texte à analyser
            strict: Mode strict (True) ou smooth (False)
            allowed_chars: Liste de caractères autorisés pour le mode smooth
            embedded: True si le texte peut contenir du code intégré, False si tout le texte doit être du code
            
        Returns:
            Un dictionnaire contenant les codes détectés
        """
        from app import get_plugin_manager
        plugin_manager = get_plugin_manager()
        
        # Liste des plugins à exclure pour éviter les boucles récursives
        excluded_plugins = ["metadetection"]
        
        # Liste des plugins à utiliser pour le test (phase de développement)
        included_plugins = [
            "abaddon_code",
            "kenny_code",
            "hexadecimal_encoder_decoder",
            "roman_numerals"
        ]
        
        if not text:
            return {"result": {"possible_codes": []}}
        
        possible_codes = []
        
        # Récupérer les plugins depuis le plugin_manager.loaded_plugins
        for plugin_name, plugin_wrapper in plugin_manager.loaded_plugins.items():
            # Ignorer les plugins exclus
            if plugin_name in excluded_plugins:
                continue
            
            # Ignorer les plugins non inclus dans la liste de test
            if included_plugins and plugin_name not in included_plugins:
                continue
            
            # Obtenir l'instance du plugin
            p_instance = getattr(plugin_wrapper, "_instance", None)
            if not p_instance:
                continue
            
            # Vérifier si le plugin a une méthode check_code
            if not hasattr(p_instance, "check_code"):
                continue
            
            # Essayer d'analyser avec ce plugin
            try:
                # Convertir le paramètre strict en booléen pour check_code
                strict_bool = strict if isinstance(strict, bool) else strict == "strict"
                
                # Appeler la méthode check_code avec les paramètres appropriés
                check_result = p_instance.check_code(text, strict_bool, allowed_chars, embedded)
                
                if check_result and isinstance(check_result, dict):
                    # Si le plugin a détecté quelque chose
                    if check_result.get("is_match", False):
                        code_info = {
                            "plugin_name": plugin_name,
                            "score": check_result.get("score", 1.0),
                            "can_decode": hasattr(p_instance, "execute"),
                            "fragments": check_result.get("fragments", [])
                        }
                        
                        possible_codes.append(code_info)
            except Exception as e:
                print(f"Erreur lors de l'analyse avec {plugin_name}: {str(e)}")
                continue
        
        # Trier les résultats par score décroissant
        possible_codes.sort(key=lambda x: x["score"], reverse=True)
        
        return {
            "result": {
                "possible_codes": possible_codes
            }
        }

    def decode_code(self, plugin_name: str = None, text: str = "", strict: str = "smooth", allowed_chars: list = None, embedded: bool = False) -> dict:
        """
        Décode un texte en utilisant soit un plugin spécifique, soit tous les plugins ayant une méthode execute.
        
        Args:
            plugin_name: Nom du plugin à utiliser pour le décodage (optionnel)
            text: Texte à décoder
            strict: Mode de décodage "strict" ou "smooth"
            allowed_chars: Liste de caractères autorisés pour le mode smooth
            embedded: True si le texte peut contenir du code intégré, False si tout le texte doit être du code
            
        Returns:
            Un dictionnaire contenant le résultat du décodage
        """
        from app import get_plugin_manager
        plugin_manager = get_plugin_manager()
        
        # Liste des plugins à exclure pour éviter les boucles récursives
        excluded_plugins = ["metadetection"]
        
        # Liste des plugins à utiliser pour le test (phase de développement)
        included_plugins = [
            "abaddon_code",
            "kenny_code",
            "hexadecimal_encoder_decoder",
            "roman_numerals"
        ]
        
        if plugin_name:
            # Si un plugin spécifique est demandé
            if plugin_name in excluded_plugins:
                return {"result": {"error": f"Le plugin {plugin_name} ne peut pas être utilisé pour le décodage (risque de boucle récursive)"}}
            
            # Vérifier si le plugin est dans la liste des plugins inclus en phase de test
            if included_plugins and plugin_name not in included_plugins:
                return {"result": {"error": f"Le plugin {plugin_name} n'est pas inclus dans la liste des plugins autorisés pour le test"}}
            
            # Obtenir le plugin directement depuis loaded_plugins
            plugin_wrapper = plugin_manager.loaded_plugins.get(plugin_name)
            if not plugin_wrapper:
                return {"result": {"error": f"Plugin {plugin_name} non trouvé ou non chargé"}}
            
            # Obtenir l'instance du plugin
            p_instance = getattr(plugin_wrapper, "_instance", None)
            if not p_instance:
                return {"result": {"error": f"Impossible d'obtenir l'instance du plugin {plugin_name}"}}
            
            # Utiliser la méthode execute du plugin
            try:
                inputs = {
                    "text": text,
                    "strict": strict,
                    "mode": "decode",
                    "embedded": embedded,
                    "enable_gps_detection": False  # Désactiver la détection GPS pour les plugins individuels
                }
                
                # Ajouter les caractères autorisés si fournis
                if allowed_chars:
                    inputs["allowed_chars"] = allowed_chars
                
                result = p_instance.execute(inputs)
                
                # Extraire le texte décodé du résultat
                if result and "result" in result and "decoded_text" in result["result"]:
                    return {"result": {"decoded_text": result["result"]["decoded_text"]}}
                else:
                    return {"result": {"error": f"Format de résultat non reconnu pour le plugin {plugin_name}"}}
            except Exception as e:
                return {"result": {"error": f"Erreur lors du décodage avec {plugin_name}: {str(e)}"}}
        else:
            # Si aucun plugin spécifique n'est demandé, essayer tous les plugins
            decoded_results = []
            
            # Parcourir tous les plugins chargés
            for plugin_name, plugin_wrapper in plugin_manager.loaded_plugins.items():
                # Ignorer les plugins exclus
                if plugin_name in excluded_plugins:
                    continue
                
                # Ignorer les plugins non inclus dans la liste de test
                if included_plugins and plugin_name not in included_plugins:
                    continue
                
                # Obtenir l'instance du plugin
                p_instance = getattr(plugin_wrapper, "_instance", None)
                if not p_instance:
                    continue
                
                # Vérifier si le plugin a une méthode execute
                if not hasattr(p_instance, "execute"):
                    continue
                
                # Essayer de décoder avec ce plugin
                try:
                    inputs = {
                        "text": text,
                        "strict": strict,
                        "mode": "decode",
                        "embedded": embedded,
                        "enable_gps_detection": False  # Désactiver la détection GPS pour les plugins individuels
                    }
                    
                    # Ajouter les caractères autorisés si fournis
                    if allowed_chars:
                        inputs["allowed_chars"] = allowed_chars
                    
                    result = p_instance.execute(inputs)
                    
                    # Extraire le texte décodé du résultat
                    if result and "result" in result and "decoded_text" in result["result"]:
                        decoded_results.append({
                            "plugin_name": plugin_name,
                            "decoded_text": result["result"]["decoded_text"]
                        })
                except Exception as e:
                    print(f"Erreur lors du décodage avec {plugin_name}: {str(e)}")
                    continue
            
            if decoded_results:
                return {"result": {"decoded_results": decoded_results}}
            else:
                return {"result": {"error": "Aucun plugin n'a pu décoder le texte"}}
