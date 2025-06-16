import re
import time
import json
import os
from typing import Dict, List, Tuple, Optional, Any

class SubstitutionPluginBase:
    """
    Classe de base pour tous les plugins de substitution simple.
    Mutualise la logique commune : détection, encodage, décodage, scoring.
    """
    
    def __init__(self, plugin_name: str):
        self.name = plugin_name
        self.description = f"Plugin de substitution {plugin_name}"
        
        # Tables de substitution - à redéfinir dans les classes dérivées
        self.encode_table: Dict[str, str] = {}  # Texte clair -> Code
        self.decode_table: Dict[str, str] = {}  # Code -> Texte clair
        
        # Paramètres de configuration - à redéfinir si nécessaire
        self.default_separators = " \t\r\n.:;,_-°"
        self.case_sensitive = False
        
        # Initialisation du service de scoring
        try:
            from app.services.scoring_service import ScoringService
            self.scoring_service = ScoringService()
            self.scoring_service_available = True
        except ImportError:
            self.scoring_service_available = False
            print("Module de scoring non disponible, utilisation du scoring legacy uniquement")
            
    def set_substitution_tables(self, encode_table: Dict[str, str], decode_table: Optional[Dict[str, str]] = None):
        """
        Définit les tables de substitution.
        
        Args:
            encode_table: Table de conversion texte clair -> code
            decode_table: Table de conversion code -> texte clair (optionnel, sera déduite d'encode_table si non fournie)
        """
        self.encode_table = encode_table
        if decode_table is None:
            self.decode_table = {v: k for k, v in encode_table.items()}
        else:
            self.decode_table = decode_table
            
    def check_code(self, text: str, strict: bool = False, allowed_chars: str = None, embedded: bool = False) -> dict:
        """
        Vérifie si le texte contient du code valide selon les paramètres spécifiés.
        
        Args:
            text: Texte à analyser
            strict: Mode strict (True) ou smooth (False)
            allowed_chars: Liste de caractères autorisés en plus des caractères du code
            embedded: True si le texte peut contenir du code intégré, False si tout le texte doit être du code
            
        Returns:
            Un dictionnaire contenant:
            - is_match: True si du code valide a été trouvé
            - fragments: Liste des fragments de code trouvés
            - score: Score de confiance (0.0 à 1.0)
        """
        if allowed_chars is None:
            allowed_chars = self.default_separators
            
        # Si allowed_chars est fourni comme liste, on la convertit en chaîne
        if isinstance(allowed_chars, list):
            allowed_chars = ''.join(allowed_chars)
            
        if strict:
            if embedded:
                # Mode strict + embedded : recherche des fragments valides isolés
                return self._extract_valid_fragments(text, allowed_chars)
            else:
                # Mode strict sans embedded : tout le texte doit être du code valide
                return self._validate_entire_text(text, allowed_chars)
        else:
            # Mode smooth : recherche des fragments valides
            return self._extract_valid_fragments(text, allowed_chars)
            
    def _validate_entire_text(self, text: str, allowed_chars: str) -> dict:
        """
        Vérifie que tout le texte est composé de code valide et de séparateurs autorisés.
        """
        # Créer le pattern des caractères autorisés (code + séparateurs)
        code_chars = set()
        for code in self.decode_table.keys():
            code_chars.update(code)
        code_chars.update(allowed_chars)
        
        # Vérifier que tous les caractères du texte sont autorisés
        for char in text:
            if char not in code_chars:
                return {"is_match": False, "fragments": [], "score": 0.0}
                
        # Extraire les fragments et vérifier qu'ils sont tous valides
        fragments = self._extract_fragments(text, allowed_chars)
        
        # Tous les fragments non-séparateurs doivent être du code valide
        valid_fragments = []
        for fragment in fragments:
            if fragment["value"] in self.decode_table:
                valid_fragments.append(fragment)
            elif fragment["value"] not in allowed_chars:
                # Fragment qui n'est ni du code valide ni un séparateur
                return {"is_match": False, "fragments": [], "score": 0.0}
                
        if not valid_fragments:
            return {"is_match": False, "fragments": [], "score": 0.0}
            
        return {
            "is_match": True,
            "fragments": valid_fragments,
            "score": 1.0
        }
        
    def _extract_valid_fragments(self, text: str, allowed_chars: str) -> dict:
        """
        Extrait tous les fragments valides dans le texte, même s'il y a du texte non-code.
        """
        fragments = self._extract_fragments(text, allowed_chars)
        valid_fragments = []
        
        for fragment in fragments:
            if fragment["value"] in self.decode_table:
                valid_fragments.append(fragment)
                
        score = 1.0 if valid_fragments else 0.0
        
        return {
            "is_match": bool(valid_fragments),
            "fragments": valid_fragments,
            "score": score
        }
        
    def _extract_fragments(self, text: str, allowed_chars: str) -> List[dict]:
        """
        Divise le texte en fragments séparés par les caractères autorisés.
        Pour les codes de substitution complexes, on utilise une approche par tokens.
        
        Returns:
            Liste de dictionnaires avec les clés: value, start, end
        """
        # Échapper les caractères spéciaux pour l'expression régulière
        esc_chars = re.escape(allowed_chars)
        
        # Pattern pour capturer les fragments non-séparateurs
        pattern = f"[^{esc_chars}]+"
        fragments = []
        
        for match in re.finditer(pattern, text):
            # Pour chaque fragment, essayer de le décomposer en codes valides
            fragment_text = match.group(0)
            start_pos = match.start()
            
            # Essayer de décomposer le fragment en codes valides
            sub_fragments = self._decompose_fragment(fragment_text, start_pos)
            fragments.extend(sub_fragments)
            
        return fragments
        
    def _decompose_fragment(self, fragment: str, base_pos: int) -> List[dict]:
        """
        Décompose un fragment en codes valides en utilisant une approche gloutonne.
        Essaie de faire correspondre les codes les plus longs en premier.
        """
        if not self.decode_table:
            return [{"value": fragment, "start": base_pos, "end": base_pos + len(fragment)}]
            
        # Trier les codes par longueur décroissante pour une approche gloutonne
        sorted_codes = sorted(self.decode_table.keys(), key=len, reverse=True)
        
        result = []
        pos = 0
        
        while pos < len(fragment):
            found_match = False
            
            # Essayer de trouver le code le plus long qui correspond
            for code in sorted_codes:
                if fragment[pos:pos+len(code)] == code:
                    result.append({
                        "value": code,
                        "start": base_pos + pos,
                        "end": base_pos + pos + len(code)
                    })
                    pos += len(code)
                    found_match = True
                    break
                    
            if not found_match:
                # Caractère non reconnu, passer au suivant
                pos += 1
                
        return result
        
    def decode_fragments(self, text: str, fragments: List[dict]) -> str:
        """
        Décode uniquement les fragments valides dans leur contexte original.
        
        Args:
            text: Texte original contenant les fragments
            fragments: Liste des fragments à décoder
            
        Returns:
            Texte avec les fragments décodés
        """
        # Trier les fragments par position de début (en ordre décroissant)
        # pour éviter les problèmes de décalage d'indices
        sorted_fragments = sorted(fragments, key=lambda f: f["start"], reverse=True)
        
        # Convertir le texte en liste pour faciliter les modifications
        result = list(text)
        
        for fragment in sorted_fragments:
            start, end = fragment["start"], fragment["end"]
            code = fragment["value"]
            
            # Décoder le fragment s'il est valide
            if code in self.decode_table:
                decoded = self.decode_table[code]
                result[start:end] = decoded
                
        return ''.join(result)
        
    def encode(self, text: str) -> str:
        """
        Encode le texte selon l'algorithme du plugin.
        
        Args:
            text: Texte à encoder
            
        Returns:
            Texte encodé
        """
        if not self.case_sensitive:
            text = text.upper()
            
        result = []
        for char in text:
            if char in self.encode_table:
                result.append(self.encode_table[char])
            elif char in self.default_separators:
                result.append(char)  # Conserver les séparateurs
            else:
                result.append(char)  # Caractère non géré, conservé tel quel
                
        return ''.join(result)
        
    def decode(self, text: str) -> str:
        """
        Décode le texte selon l'algorithme du plugin.
        
        Args:
            text: Texte à décoder
            
        Returns:
            Texte décodé
        """
        # Utiliser la méthode de détection pour trouver les fragments
        detection_result = self._extract_valid_fragments(text, self.default_separators)
        fragments = detection_result["fragments"]
        
        if not fragments:
            return text  # Aucun code détecté, retourner le texte original
            
        return self.decode_fragments(text, fragments)
        
    def get_text_score(self, text: str, context: dict = None) -> Optional[dict]:
        """
        Obtient le score de confiance d'un texte décodé en utilisant le service de scoring.
        
        Args:
            text: Le texte à évaluer
            context: Contexte optionnel (coordonnées de géocache, région, etc.)
            
        Returns:
            Dictionnaire contenant le résultat du scoring, ou None en cas d'erreur
        """
        if not self.scoring_service_available:
            return None
            
        try:
            # Nettoyer le texte avant scoring
            cleaned_text = self._clean_text_for_scoring(text)
            
            # Appel direct au service de scoring local
            result = self.scoring_service.score_text(cleaned_text, context)
            return result
        except Exception as e:
            print(f"Erreur lors de l'évaluation avec le service de scoring: {str(e)}")
            return None
            
    def _clean_text_for_scoring(self, text: str) -> str:
        """
        Nettoie le texte décodé pour le scoring.
        À redéfinir dans les classes dérivées si nécessaire.
        
        Args:
            text: Le texte décodé à nettoyer
            
        Returns:
            Le texte nettoyé prêt pour le scoring
        """
        # Par défaut, on supprime les espaces multiples
        return re.sub(r'\s+', ' ', text.strip())
        
    def execute(self, inputs: dict) -> dict:
        """
        Point d'entrée principal du plugin.
        
        Args:
            inputs: Dictionnaire contenant les paramètres d'entrée
                - mode: "encode", "decode" ou "detect"
                - text: Texte à traiter
                - strict: "strict" ou "smooth" pour le mode de décodage
                - allowed_chars: Liste de caractères autorisés
                - embedded: True si le texte peut contenir du code intégré
                - enable_scoring: True pour activer l'évaluation automatique des résultats
                
        Returns:
            Dictionnaire contenant le résultat de l'opération au format standardisé
        """
        start_time = time.time()
        
        mode = inputs.get("mode", "decode").lower()
        text = inputs.get("text", "")
        strict_mode = inputs.get("strict", "").lower() == "strict"
        allowed_chars = inputs.get("allowed_chars", self.default_separators)
        embedded = inputs.get("embedded", False)
        checkbox_value = inputs.get("enable_scoring", "")
        enable_scoring = checkbox_value == "on"
        
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
        
        try:
            if mode == "encode":
                result = self.encode(text)
                response_result = {
                    "id": "result_1",
                    "text_output": result,
                    "confidence": 1.0,  # Confiance maximale pour l'encodage
                    "parameters": {
                        "mode": mode
                    },
                    "metadata": {
                        "processed_chars": len(text)
                    }
                }
                
                standardized_response["results"].append(response_result)
                standardized_response["summary"]["best_result_id"] = "result_1"
                standardized_response["summary"]["total_results"] = 1
                standardized_response["summary"]["message"] = "Encodage réussi"
                
            elif mode == "decode":
                # Effectuer le décodage
                decoded_text = self.decode(text)
                
                # Évaluer la pertinence du résultat avec le scoring si activé
                confidence = 0.5  # Valeur par défaut
                scoring_result = None
                
                if enable_scoring and self.scoring_service_available:
                    # Contexte optionnel (coordonnées géographiques, etc.)
                    context = inputs.get("context", {})
                    
                    # Obtenir le score du texte décodé
                    scoring_result = self.get_text_score(decoded_text, context)
                    
                    # Utiliser le score obtenu comme niveau de confiance
                    if scoring_result:
                        confidence = scoring_result.get("score", 0.5)
                
                # Construire le résultat
                response_result = {
                    "id": "result_1",
                    "text_output": decoded_text,
                    "confidence": confidence,
                    "parameters": {
                        "mode": mode,
                        "strict": strict_mode,
                        "embedded": embedded
                    },
                    "metadata": {
                        "processed_chars": len(text)
                    }
                }
                
                # Ajouter les informations de scoring si disponibles
                if scoring_result:
                    response_result["scoring"] = scoring_result
                
                standardized_response["results"].append(response_result)
                standardized_response["summary"]["best_result_id"] = "result_1"
                standardized_response["summary"]["total_results"] = 1
                standardized_response["summary"]["message"] = "Décodage réussi"
                
            elif mode == "detect":
                # Effectuer la détection
                detection_result = self.check_code(text, strict_mode, allowed_chars, embedded)
                
                response_result = {
                    "id": "result_1",
                    "text_output": f"Code détecté: {detection_result['is_match']}",
                    "confidence": detection_result.get("score", 0.0),
                    "parameters": {
                        "mode": mode,
                        "strict": strict_mode,
                        "embedded": embedded
                    },
                    "metadata": {
                        "fragments_found": len(detection_result.get("fragments", [])),
                        "is_match": detection_result["is_match"]
                    }
                }
                
                standardized_response["results"].append(response_result)
                standardized_response["summary"]["best_result_id"] = "result_1"
                standardized_response["summary"]["total_results"] = 1
                standardized_response["summary"]["message"] = "Détection effectuée"
                
            else:
                standardized_response["status"] = "error"
                standardized_response["summary"]["message"] = f"Mode '{mode}' non supporté"
                
        except Exception as e:
            standardized_response["status"] = "error"
            standardized_response["summary"]["message"] = f"Erreur lors de l'exécution: {str(e)}"
            
        # Calculer le temps d'exécution
        execution_time = int((time.time() - start_time) * 1000)
        standardized_response["plugin_info"]["execution_time"] = execution_time
        
        return standardized_response 