import time
import requests
import json

# Import du service de scoring (à ajuster selon l'emplacement réel du module)
try:
    from app.services.scoring_service import ScoringService
    scoring_service_available = True
except ImportError:
    scoring_service_available = False
    print("Module de scoring non disponible, utilisation du scoring legacy uniquement")

class CaesarCodePlugin:
    """
    Plugin pour encoder/décoder du texte avec le code César.
    Le code César est un chiffrement par substitution où chaque lettre 
    est remplacée par une lettre décalée de N positions dans l'alphabet.
    """

    def __init__(self):
        self.name = "caesar_code"
        self.description = "Plugin d'encodage/décodage avec le code César"
        
        # L'alphabet de référence (majuscules uniquement)
        self.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        self.alphabet_len = len(self.alphabet)
        
        # Initialiser le service de scoring local si disponible
        self.scoring_service = None
        if scoring_service_available:
            try:
                self.scoring_service = ScoringService()
                print("Service de scoring initialisé avec succès")
            except Exception as e:
                print(f"Erreur lors de l'initialisation du service de scoring: {str(e)}")
        
        # Conserver l'URL API pour la rétrocompatibilité
        self.scoring_api_url = "http://localhost:5000/api/plugins/score"
    
    def encode(self, text: str, shift: int) -> str:
        """
        Encode le texte en utilisant un décalage positif.
        Args:
            text (str): Texte à encoder
            shift (int): Décalage à appliquer (nombre de positions)
        Returns:
            str: Texte encodé
        """
        result = []
        for char in text.upper():
            if char in self.alphabet:
                pos = self.alphabet.index(char)
                new_pos = (pos + shift) % self.alphabet_len
                result.append(self.alphabet[new_pos])
            else:
                result.append(char)  # Garder caractères non alphabétiques
        return ''.join(result)
    
    def decode(self, text: str, shift: int) -> str:
        """
        Décode le texte en utilisant un décalage négatif.
        Args:
            text (str): Texte à décoder
            shift (int): Décalage qui a été appliqué
        Returns:
            str: Texte décodé
        """
        return self.encode(text, -shift)

    def bruteforce(self, text: str):
        """
        Teste tous les décalages (1 à 25) pour essayer de retrouver 
        le texte en clair sans connaître le décalage initial.
        
        Args:
            text (str): Texte chiffré dont on veut tester tous les décalages
        Returns:
            list: Liste de solutions, chaque élément étant un dict 
                  { "shift": int, "decoded_text": str }
        """
        print("Bruteforce")
        solutions = []
        for possible_shift in range(1, 26):
            decoded = self.decode(text, possible_shift)
            solutions.append({
                "shift": possible_shift,
                "decoded_text": decoded
            })
        return solutions
    
    def execute(self, inputs):
        """
        Exécute le plugin avec les entrées spécifiées.
        
        Args:
            inputs: Dictionnaire des paramètres d'entrée
                - mode: "encode", "decode" ou "bruteforce"
                - text: Texte à traiter
                - shift: Décalage à appliquer (entier, par défaut 13)
        
        Returns:
            Dictionnaire au format standardisé contenant le résultat
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
        
        mode = inputs.get('mode', 'encode')
        text_input = inputs.get('text', '')
        print("INPUTS", inputs)
        
        # Vérifier si le scoring automatique est activé
        enable_scoring = inputs.get('enable_scoring', True)
        
        # Extraire le contexte pour le scoring (si présent)
        context = inputs.get('context', {})
        
        # Vérifier si le texte est vide
        if not text_input:
            standardized_response["status"] = "error"
            standardized_response["summary"]["message"] = "Aucun texte fourni à traiter."
            return standardized_response
        
        try:
            shift = int(inputs.get('shift', 13))  # Décalage par défaut: 13
        except ValueError:
            standardized_response["status"] = "error"
            standardized_response["summary"]["message"] = "La valeur du décalage doit être un nombre entier."
            return standardized_response

        # Vérifier si le mode bruteforce est activé (avec les deux styles de paramètre possibles)
        bruteforce_param1 = inputs.get('bruteforce', False)
        bruteforce_param2 = inputs.get('brute_force', False)
        do_bruteforce = bruteforce_param1 or bruteforce_param2
        
        print(f"Bruteforce params: bruteforce={bruteforce_param1}, brute_force={bruteforce_param2}, final={do_bruteforce}")
        
        try:
            # Mode bruteforce activé explicitement ou via le paramètre
            if do_bruteforce or mode == 'bruteforce':
                print("Mode bruteforce activé")
                solutions = self.bruteforce(text_input)
                
                # Ajouter chaque solution comme un résultat distinct
                for idx, solution in enumerate(solutions, 1):
                    shift_value = solution["shift"]
                    decoded_text = solution["decoded_text"]
                    
                    # Utiliser le service de scoring si activé
                    if enable_scoring:
                        scoring_result = self._get_text_score(decoded_text, context)
                        confidence = scoring_result.get("score", self._legacy_calculate_confidence(shift_value)) if scoring_result else self._legacy_calculate_confidence(shift_value)
                    else:
                        # Utiliser l'ancien système de confiance si le scoring est désactivé
                        confidence = self._legacy_calculate_confidence(shift_value)
                        scoring_result = None
                    
                    result = {
                        "id": f"result_{idx}",
                        "text_output": decoded_text,
                        "confidence": confidence,
                        "parameters": {
                            "mode": "decode",
                            "shift": shift_value
                        },
                        "metadata": {
                            "bruteforce_position": idx,
                            "processed_chars": sum(1 for c in text_input.upper() if c in self.alphabet)
                        }
                    }
                    
                    # Ajouter les résultats du scoring s'ils sont disponibles
                    if scoring_result:
                        result["scoring"] = scoring_result
                    
                    standardized_response["results"].append(result)
                
                # Trier les résultats par confiance décroissante
                standardized_response["results"].sort(key=lambda x: x["confidence"], reverse=True)
                
                # Mettre à jour le résumé
                if standardized_response["results"]:
                    standardized_response["summary"]["best_result_id"] = standardized_response["results"][0]["id"]
                    standardized_response["summary"]["total_results"] = len(standardized_response["results"])
                    standardized_response["summary"]["message"] = f"Bruteforce César: {len(standardized_response['results'])} décalages testés"
                else:
                    standardized_response["status"] = "error"
                    standardized_response["summary"]["message"] = "Aucune solution de bruteforce trouvée"
            # Cas standard: encode avec une entrée de texte simple
            elif mode == 'encode' and isinstance(text_input, str):
                result = self.encode(text_input, shift)
                
                # Pour l'encodage, nous gardons une confiance de 1.0 (certitude)
                standardized_response["results"].append({
                    "id": "result_1",
                    "text_output": result,
                    "confidence": 1.0,
                    "parameters": {
                        "mode": mode,
                        "shift": shift
                    },
                    "metadata": {
                        "processed_chars": sum(1 for c in text_input.upper() if c in self.alphabet)
                    }
                })
                
                standardized_response["summary"]["best_result_id"] = "result_1"
                standardized_response["summary"]["total_results"] = 1
                standardized_response["summary"]["message"] = f"{mode.capitalize()} César avec décalage {shift} réussi"
            
            # Mode decode simple
            elif mode == 'decode' and isinstance(text_input, str):
                # Mode decode simple avec un seul décalage
                decoded_text = self.decode(text_input, shift)
                
                # Utiliser le service de scoring si activé
                if enable_scoring:
                    scoring_result = self._get_text_score(decoded_text, context)
                    confidence = scoring_result.get("score", self._legacy_calculate_confidence(shift)) if scoring_result else self._legacy_calculate_confidence(shift)
                else:
                    # Utiliser l'ancien système de confiance si le scoring est désactivé
                    confidence = self._legacy_calculate_confidence(shift)
                    scoring_result = None
                
                result = {
                    "id": "result_1",
                    "text_output": decoded_text,
                    "confidence": confidence,
                    "parameters": {
                        "mode": "decode",
                        "shift": shift
                    },
                    "metadata": {
                        "processed_chars": sum(1 for c in text_input.upper() if c in self.alphabet)
                    }
                }
                
                # Ajouter les résultats du scoring s'ils sont disponibles
                if scoring_result:
                    result["scoring"] = scoring_result
                
                standardized_response["results"].append(result)
                
                standardized_response["summary"]["best_result_id"] = "result_1"
                standardized_response["summary"]["total_results"] = 1
                standardized_response["summary"]["message"] = f"Décodage César avec décalage {shift} réussi"
            
            # Cas où l'entrée est déjà un résultat de bruteforce (format ancien)
            elif isinstance(text_input, dict) and 'bruteforce_solutions' in text_input:
                standardized_response["status"] = "error"
                standardized_response["summary"]["message"] = "Format d'entrée non compatible avec le format standardisé"
                return standardized_response
            
            else:
                standardized_response["status"] = "error"
                standardized_response["summary"]["message"] = f"Mode invalide ou incompatible : {mode}"
                return standardized_response
                
        except Exception as e:
            standardized_response["status"] = "error"
            standardized_response["summary"]["message"] = f"Erreur pendant le traitement : {str(e)}"
            return standardized_response
        
        # Calculer le temps d'exécution
        standardized_response["plugin_info"]["execution_time"] = int((time.time() - start_time) * 1000)
        
        return standardized_response
    
    def _get_text_score(self, text, context=None):
        """
        Obtient le score de confiance d'un texte en utilisant le service de scoring.
        
        Args:
            text: Le texte à évaluer
            context: Contexte optionnel (coordonnées de géocache, etc.)
        
        Returns:
            Dictionnaire contenant le résultat du scoring, ou None en cas d'erreur
        """
        # Préparer les données
        data = {
            "text": text
        }
        
        # Ajouter le contexte s'il est fourni
        if context:
            data["context"] = context
        
        print(f"Évaluation du texte: {text[:30]}...")
        
        # Utiliser le service local si disponible
        if self.scoring_service:
            try:
                result = self.scoring_service.score_text(text, context)
                return result
            except Exception as e:
                print(f"Erreur lors de l'évaluation locale: {str(e)}")
                # On pourrait tomber en fallback sur l'API, mais pour simplifier,
                # on va juste retourner None en cas d'erreur
                return None
        else:
            # Fallback: utiliser l'API distante si le service local n'est pas disponible
            try:
                response = requests.post(self.scoring_api_url, json=data)
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get("success"):
                        return result.get("result", {})
                    else:
                        print(f"Erreur API: {result.get('error')}")
                else:
                    print(f"Erreur HTTP: {response.status_code}")
                    
                return None
            except Exception as e:
                print(f"Erreur lors de l'appel à l'API de scoring: {str(e)}")
                return None
    
    def _legacy_calculate_confidence(self, shift):
        """
        Ancien système de calcul de confiance basé uniquement sur le décalage.
        Conservé pour rétrocompatibilité lorsque le scoring est désactivé.
        """
        # ROT13 est le plus courant, suivi par ROT1
        common_shifts = {13: 0.95, 1: 0.9, 3: 0.85, 5: 0.8, 7: 0.75}
        
        if shift in common_shifts:
            return common_shifts[shift]
        
        # Pour les autres, calculer en fonction de la position (plus proche de 13, plus probable)
        base_confidence = 0.7
        distance_from_13 = abs(shift - 13)
        confidence_modifier = -0.01 * distance_from_13  # Réduire la confiance en s'éloignant de 13
        
        return max(0.5, base_confidence + confidence_modifier)  # Minimum 0.5
