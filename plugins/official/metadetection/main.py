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
            Dictionnaire contenant le résultat de l'opération au format standardisé
        """
        mode = inputs.get("mode", "detect").lower()
        text = inputs.get("text", "")
        plugin_name = inputs.get("plugin_name")
        
        # Récupération du mode strict/smooth
        strict = inputs.get("strict", True) == "strict"
        strict_param = "strict" if strict else "smooth"
        
        print('param strict', strict, mode)
        
        # Récupération des caractères autorisés
        allowed_chars = inputs.get("allowed_chars", None)
        
        # Récupération du mode embedded
        embedded = inputs.get("embedded", False)
        
        # Récupération du paramètre de détection GPS
        enable_gps_detection = inputs.get("enable_gps_detection", True)
        
        if not text:
            return {
                "status": "error",
                "plugin_info": {
                    "name": self.name,
                    "version": "1.1.3"
                },
                "results": [],
                "summary": {
                    "message": "Aucun texte fourni",
                    "total_results": 0
                }
            }
            
        # Mesurer le temps d'exécution
        import time
        start_time = time.time()
            
        if mode == "detect":
            # Ancien format pour rétrocompatibilité avec l'UI
            old_result = self.detect_codes(text, strict, allowed_chars, embedded)
            
            # Conversion au nouveau format standardisé
            possible_codes = old_result.get("result", {}).get("possible_codes", [])
            
            # Préparation des résultats standardisés
            standardized_results = []
            combined_results = {}
            
            for idx, code in enumerate(possible_codes):
                plugin_name = code.get("plugin_name", "unknown")
                score = code.get("score", 0)
                fragments = code.get("fragments", [])
                fragment_values = [f.get("value", "") for f in fragments if "value" in f]
                
                result_id = f"result_{idx+1}"
                
                # Créer un résultat standardisé pour chaque plugin détecté
                standardized_results.append({
                    "id": result_id,
                    "text_output": f"Plugin: {plugin_name}\nFragments détectés: {', '.join(fragment_values)}",
                    "confidence": score,
                    "parameters": {
                        "plugin": plugin_name,
                        "mode": "detect",
                        "strict": "strict" if strict else "smooth"
                    },
                    "metadata": {
                        "fragments": fragment_values,
                        "can_decode": code.get("can_decode", False)
                    }
                })
                
                # Ajouter au dictionnaire combined_results pour la rétrocompatibilité
                combined_results[plugin_name] = {
                    "fragments": fragment_values,
                    "confidence": score,
                    "can_decode": code.get("can_decode", False)
                }
            
            # Format standardisé complet
            execution_time = int((time.time() - start_time) * 1000)
            
            return {
                "status": "success" if standardized_results else "partial_success",
                "plugin_info": {
                    "name": self.name,
                    "version": "1.1.3",
                    "execution_time": execution_time
                },
                "inputs": {
                    "mode": mode,
                    "text": text,
                    "strict": "strict" if strict else "smooth",
                    "embedded": embedded
                },
                "results": standardized_results,
                "combined_results": combined_results,
                "summary": {
                    "best_result_id": standardized_results[0]["id"] if standardized_results else None,
                    "total_results": len(standardized_results),
                    "message": f"{len(standardized_results)} plugins détectés" if standardized_results else "Aucun code détecté"
                }
            }
            
        elif mode == "decode":
            # Récupérer les résultats de décodage (format standardisé uniquement)
            decode_results = self.decode_code(plugin_name, text, strict_param, allowed_chars, embedded)
            
            # Mesure du temps d'exécution
            execution_time = int((time.time() - start_time) * 1000)
            
            # En cas d'absence de résultat, retourner une erreur formatée
            if not decode_results["results"]:
                return {
                    "status": "error",
                    "plugin_info": {
                        "name": self.name,
                        "version": "1.1.3",
                        "execution_time": execution_time
                    },
                    "results": [],
                    "summary": {
                        "message": "Aucun plugin n'a pu décoder le texte",
                        "total_results": 0
                    }
                }
            
            # Sinon, retourner les résultats formatés
            return {
                "status": "success",
                "plugin_info": {
                    "name": self.name,
                    "version": "1.1.3",
                    "execution_time": execution_time
                },
                "inputs": {
                    "mode": mode,
                    "text": text,
                    "strict": strict_param,
                    "embedded": embedded,
                    "plugin_name": plugin_name
                },
                "results": decode_results["results"],
                "combined_results": decode_results["combined_results"],
                "primary_coordinates": decode_results["primary_coordinates"],
                "summary": {
                    "best_result_id": decode_results["best_result_id"],
                    "total_results": len(decode_results["results"]),
                    "message": f"{len(decode_results['results'])} résultats de décodage"
                }
            }
        else:
            return {
                "status": "error",
                "plugin_info": {
                    "name": self.name,
                    "version": "1.1.3"
                },
                "results": [],
                "summary": {
                    "message": f"Mode non reconnu : {mode}",
                    "total_results": 0
                }
            }

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
            #"abaddon_code",
            "kenny_code",
            #"hexadecimal_encoder_decoder",
            "letter_value",
            "roman_numerals",
            "wherigo_reverse_decoder"
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
            Un dictionnaire contenant le résultat du décodage au format standardisé
        """
        from app import get_plugin_manager
        plugin_manager = get_plugin_manager()
        
        # Liste des plugins à exclure pour éviter les boucles récursives
        excluded_plugins = ["metadetection"]
        
        # Liste des plugins à utiliser pour le test (phase de développement)
        included_plugins = [
            #"abaddon_code",
            "letter_value",
            "kenny_code",
            "roman_numerals",
            "wherigo_reverse_decoder"
        ]
        
        # Structure du résultat standardisé
        result_structure = {
            "results": [],
            "combined_results": {},
            "primary_coordinates": None,
            "best_result_id": None
        }
        
        if plugin_name:
            # Si un plugin spécifique est demandé
            if plugin_name in excluded_plugins:
                return result_structure
            
            # Vérifier si le plugin est dans la liste des plugins inclus en phase de test
            if included_plugins and plugin_name not in included_plugins:
                return result_structure
            
            # Obtenir le plugin directement depuis loaded_plugins
            plugin_wrapper = plugin_manager.loaded_plugins.get(plugin_name)
            if not plugin_wrapper:
                return result_structure
            
            # Obtenir l'instance du plugin
            p_instance = getattr(plugin_wrapper, "_instance", None)
            if not p_instance:
                return result_structure
            
            # Utiliser la méthode execute du plugin
            try:
                inputs = {
                    "text": text,
                    "strict": strict,
                    "mode": "decode",
                    "embedded": embedded,
                    "enable_gps_detection": True
                }
                
                # Ajouter les caractères autorisés si fournis
                if allowed_chars:
                    inputs["allowed_chars"] = allowed_chars
                
                plugin_result = p_instance.execute(inputs)
                
                # Traiter uniquement les résultats au format standardisé
                return self._process_standardized_result(plugin_result, plugin_name)
                
            except Exception as e:
                print(f"Erreur lors du décodage avec {plugin_name}: {str(e)}")
                return result_structure
        else:
            # Si aucun plugin spécifique n'est demandé, essayer tous les plugins
            all_results = []
            combined_results = {}
            primary_coordinates = None
            
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
                print(f"Décodage avec {plugin_name}")
                try:
                    inputs = {
                        "text": text,
                        "strict": strict,
                        "mode": "decode",
                        "embedded": embedded,
                        "enable_gps_detection": True
                    }
                    
                    # Ajouter les caractères autorisés si fournis
                    if allowed_chars:
                        inputs["allowed_chars"] = allowed_chars
                    
                    plugin_result = p_instance.execute(inputs)
                    print('result', plugin_result)
                    
                    # Traiter uniquement les formats standardisés
                    if self._is_standardized_format(plugin_result):
                        plugin_processed = self._process_plugin_result(plugin_result, plugin_name)
                        
                        # Ajouter les résultats à notre collection
                        all_results.extend(plugin_processed["results"])
                        
                        # Mettre à jour les résultats combinés
                        for key, value in plugin_processed["combined_results"].items():
                            combined_results[key] = value
                        
                        # Mettre à jour les coordonnées primaires si présentes
                        if plugin_processed["primary_coordinates"]:
                            primary_coordinates = plugin_processed["primary_coordinates"]
                    
                except Exception as e:
                    print(f"Erreur lors du décodage avec {plugin_name}: {str(e)}")
                    continue
            
            # Trier les résultats par confiance
            all_results.sort(key=lambda x: x.get("confidence", 0), reverse=True)
            
            # Définir le meilleur résultat
            best_result_id = all_results[0]["id"] if all_results else None
            
            return {
                "results": all_results,
                "combined_results": combined_results,
                "primary_coordinates": primary_coordinates,
                "best_result_id": best_result_id
            }
    
    def _is_standardized_format(self, result):
        """
        Vérifie si le résultat utilise le format standardisé
        """
        # Un résultat standardisé doit avoir le champ status et results
        if not isinstance(result, dict):
            return False
        
        return "status" in result and "results" in result
    
    def _process_plugin_result(self, plugin_result, plugin_name):
        """
        Traite le résultat d'un plugin au format standardisé
        """
        processed = {
            "results": [],
            "combined_results": {},
            "primary_coordinates": None
        }
        
        # Si le plugin a retourné une erreur ou n'a pas de résultats
        if plugin_result.get("status") == "error" or not plugin_result.get("results"):
            return processed
        
        # Traiter chaque résultat du plugin
        for result in plugin_result.get("results", []):
            # Ajouter le nom du plugin si non spécifié
            if "parameters" not in result:
                result["parameters"] = {"plugin": plugin_name}
            elif "plugin" not in result["parameters"]:
                result["parameters"]["plugin"] = plugin_name
            
            # Ajouter à la liste des résultats
            processed["results"].append(result)
            
            # Extraire le texte de sortie et la confiance pour combined_results
            text_output = result.get("text_output", "")
            confidence = result.get("confidence", 0.5)
            
            processed["combined_results"][plugin_name] = {
                "decoded_text": text_output,
                "confidence": confidence
            }
            
            # Si le résultat contient des coordonnées, les extraire
            if "coordinates" in result and result["coordinates"].get("exist", False):
                processed["combined_results"][plugin_name]["coordinates"] = result["coordinates"]
                
                # Définir comme coordonnées primaires si présentes et valides
                if "decimal" in result["coordinates"]:
                    processed["primary_coordinates"] = result["coordinates"]["decimal"]
        
        return processed
    
    def _process_standardized_result(self, plugin_result, plugin_name):
        """
        Traite le résultat d'un plugin spécifique au format standardisé
        """
        # Structure de base pour le résultat
        processed = {
            "results": [],
            "combined_results": {},
            "primary_coordinates": None,
            "best_result_id": None
        }
        
        # Si le résultat n'est pas au format standardisé ou est une erreur
        if not self._is_standardized_format(plugin_result) or plugin_result.get("status") == "error":
            return processed
        
        # Traiter chaque résultat individuel
        for result in plugin_result.get("results", []):
            # Ajouter le nom du plugin si non spécifié
            if "parameters" not in result:
                result["parameters"] = {"plugin": plugin_name}
            elif "plugin" not in result["parameters"]:
                result["parameters"]["plugin"] = plugin_name
            
            processed["results"].append(result)
            
            # Extraire pour combined_results
            processed["combined_results"][plugin_name] = {
                "decoded_text": result.get("text_output", ""),
                "confidence": result.get("confidence", 0.5)
            }
            
            # Traiter les coordonnées si présentes
            if "coordinates" in result and result["coordinates"].get("exist", False):
                processed["combined_results"][plugin_name]["coordinates"] = result["coordinates"]
                
                # Définir comme coordonnées primaires
                if "decimal" in result["coordinates"]:
                    processed["primary_coordinates"] = result["coordinates"]["decimal"]
        
        # Définir le meilleur résultat
        if processed["results"]:
            processed["best_result_id"] = processed["results"][0]["id"]
        
        return processed
