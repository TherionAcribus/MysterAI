import re
from typing import List, Dict, Any, Optional
from app.services.ai_service import ai_service
from app.models.geocache import Geocache
from app import db  # Import direct de db depuis app au lieu de app.models

class FormulaQuestionsService:
    """Service pour extraire les questions associées aux variables dans les formules de coordonnées"""
    
    def __init__(self):
        """Initialise le service d'extraction de questions"""
        pass
    
    def extract_questions_with_ai(self, geocache_id: int, letters: List[str]) -> Dict[str, str]:
        """
        Utilise l'IA pour extraire les questions correspondant aux lettres dans la formule
        
        Args:
            geocache_id: ID de la géocache contenant les questions
            letters: Liste des lettres à trouver dans la description
            
        Returns:
            Dictionnaire associant chaque lettre à sa question correspondante
        """
        # Récupérer les données de la géocache
        geocache = Geocache.query.options(
            db.joinedload(Geocache.additional_waypoints)
        ).get(geocache_id)
        
        if not geocache:
            return {"error": f"Géocache avec ID {geocache_id} non trouvée"}
        
        # Préparer le contenu pour l'analyse
        content_to_analyze = self._prepare_content_for_analysis(geocache)
        
        # Préparer le prompt pour l'IA
        system_prompt = """
        Tu es un assistant spécialisé dans l'analyse des descriptions de géocaches mystery.
        Ta tâche est d'identifier les questions associées à des lettres spécifiques qui serviront
        à résoudre les coordonnées finales de la géocache.
        
        Règles à suivre :
        1. Cherche les questions qui sont clairement associées aux lettres fournies
        2. Les questions sont souvent numérotées ou associées explicitement à une lettre (ex: "Question A:", "1.", etc.)
        3. Si une lettre n'a pas de question clairement associée, laisse-la vide
        4. Ignore les questions qui ne correspondent pas aux lettres recherchées
        5. Extrais uniquement le texte de la question, pas les réponses potentielles
        6. Retourne un JSON propre et bien formaté
        """
        
        user_prompt = f"""
        Analyse la description suivante d'une géocache mystery et identifie les questions
        associées aux lettres suivantes: {', '.join(letters)}.
        
        Retourne ta réponse UNIQUEMENT au format JSON comme ceci:
        {{
            "A": "Question associée à A",
            "B": "Question associée à B",
            ...
        }}
        
        Si aucune question n'est trouvée pour une lettre, utilise une chaîne vide.
        N'inclus que les lettres qui sont dans la liste fournie.
        
        Voici le contenu à analyser:
        
        {content_to_analyze}
        """
        
        # Appeler l'IA
        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            # Récupérer les paramètres de l'IA pour le log
            ai_settings = ai_service.get_settings()
            mode = ai_settings.get('mode', 'online')
            model = ai_settings.get('model_name', ai_settings.get('ai_model', 'unknown'))
            
            # Log détaillé avant l'appel
            print(f"===== EXTRACTION DES QUESTIONS PAR IA =====")
            print(f"Mode IA: {mode}")
            print(f"Modèle utilisé: {model}")
            print(f"Lettres recherchées: {', '.join(letters)}")
            print(f"Longueur du contenu: {len(content_to_analyze)} caractères")
            print(f"Extrait du contenu: {content_to_analyze[:200]}...")
            print(f"System prompt: {system_prompt.strip()}")
            print(f"User prompt: {user_prompt[:200]}...")
            
            # Appel à l'IA
            response = ai_service.chat(messages, {"use_langgraph": False})
            
            # Log de la réponse
            print(f"=== RÉPONSE DE L'IA ===")
            print(f"Longueur de la réponse: {len(response)} caractères")
            print(f"Réponse brute: {response[:500]}...")
            
            # Extraire le JSON de la réponse
            result = self._extract_json_from_response(response, letters)
            
            # Log du résultat
            print(f"=== RÉSULTAT EXTRAIT ===")
            print(f"Nombre de questions trouvées: {sum(1 for v in result.values() if v)}")
            print(f"Résultat: {result}")
            
            return result
            
        except Exception as e:
            print(f"Erreur lors de l'extraction des questions par IA: {str(e)}")
            return {"error": f"Erreur lors de l'analyse: {str(e)}"}
    
    def extract_questions_with_regex(self, geocache_id: int, letters: List[str]) -> Dict[str, str]:
        """
        Utilise des expressions régulières pour extraire les questions correspondant aux lettres
        
        Args:
            geocache_id: ID de la géocache contenant les questions
            letters: Liste des lettres à trouver dans la description
            
        Returns:
            Dictionnaire associant chaque lettre à sa question correspondante
        """
        # Récupérer les données de la géocache
        geocache = Geocache.query.options(
            db.joinedload(Geocache.additional_waypoints)
        ).get(geocache_id)
        
        if not geocache:
            return {"error": f"Géocache avec ID {geocache_id} non trouvée"}
        
        # Préparer le contenu pour l'analyse
        content = self._prepare_content_for_analysis(geocache)
        
        # Nettoyer le HTML
        plain_text = re.sub(r'<[^>]*>', ' ', content)
        
        # Initialiser le résultat
        result = {letter: "" for letter in letters}
        
        # Patterns courants pour les questions
        patterns = [
            # Format "Question A : texte de la question"
            r'(?:Question|Q)?\s*([A-Z])\s*(?::|-)?\s*([^.?!]*[.?!])',
            
            # Format "A. texte de la question"
            r'([A-Z])\.?\s+([^.?!]*[.?!])',
            
            # Format "A - texte de la question"
            r'([A-Z])\s*-\s*([^.?!]*[.?!])',
            
            # Format "Pour A : texte de la question"
            r'(?:Pour|For)\s+([A-Z])\s*(?::|-)?\s*([^.?!]*[.?!])'
        ]
        
        # Rechercher les questions pour chaque pattern
        for pattern in patterns:
            matches = re.finditer(pattern, plain_text)
            for match in matches:
                letter = match.group(1)
                if letter in letters and not result[letter]:
                    question = match.group(2).strip()
                    result[letter] = question
        
        return result
    
    def _prepare_content_for_analysis(self, geocache: Geocache) -> str:
        """
        Prépare le contenu de la géocache pour l'analyse
        
        Args:
            geocache: Objet Geocache à analyser
            
        Returns:
            Contenu textuel combiné de la géocache
        """
        content_parts = []
        
        # Ajouter la description principale
        if geocache.description:
            content_parts.append("=== DESCRIPTION PRINCIPALE ===\n")
            content_parts.append(re.sub(r'<[^>]*>', ' ', geocache.description))
            content_parts.append("\n\n")
        
        # Ajouter les waypoints additionnels
        if geocache.additional_waypoints:
            content_parts.append("=== WAYPOINTS ADDITIONNELS ===\n")
            for wp in geocache.additional_waypoints:
                content_parts.append(f"{wp.prefix} - {wp.name}")
                if wp.note:
                    content_parts.append(f"Note: {wp.note}")
                content_parts.append("\n")
        
        # Ajouter les indications (hint) - vérifier si l'attribut existe
        if hasattr(geocache, 'hint') and geocache.hint:
            content_parts.append("=== INDICE ===\n")
            content_parts.append(geocache.hint)
            content_parts.append("\n\n")
        
        return "".join(content_parts)
    
    def _extract_json_from_response(self, response: str, letters: List[str]) -> Dict[str, str]:
        """
        Extrait et nettoie le JSON de la réponse de l'IA
        
        Args:
            response: Réponse textuelle de l'IA
            letters: Liste des lettres attendues
            
        Returns:
            Dictionnaire des questions par lettre
        """
        # Valeurs par défaut
        result = {letter: "" for letter in letters}
        
        try:
            print(f"=== DÉBUT EXTRACTION JSON ===")
            # Trouver le JSON dans la réponse (peut être entouré de texte)
            json_match = re.search(r'({[\s\S]*})', response)
            
            if json_match:
                json_str = json_match.group(1)
                print(f"JSON trouvé dans la réponse: {json_str[:200]}...")
                
                # Essayer de parser le JSON
                import json
                try:
                    extracted_data = json.loads(json_str)
                    print(f"Parsing JSON réussi: {len(extracted_data)} entrées trouvées")
                    
                    # Ne conserver que les lettres demandées
                    for letter in letters:
                        if letter in extracted_data:
                            result[letter] = extracted_data[letter]
                            print(f"Question pour {letter}: {result[letter][:50]}...")
                except json.JSONDecodeError as json_error:
                    print(f"Erreur de parsing JSON: {str(json_error)}")
                    print(f"JSON problématique: {json_str}")
            else:
                print(f"Aucun JSON trouvé dans la réponse")
            
            # Si aucune question n'a été trouvée, tenter l'extraction par regex
            if not any(result.values()):
                print(f"Aucune question extraite du JSON, tentative avec regex")
                
                # En cas d'échec, tenter une extraction plus simple avec des regex
                for letter in letters:
                    pattern = rf'"{letter}"\s*:\s*"([^"]*)"'
                    match = re.search(pattern, response)
                    if match:
                        result[letter] = match.group(1)
                        print(f"Question extraite par regex pour {letter}: {result[letter][:50]}...")
            
            print(f"=== FIN EXTRACTION JSON ===")
            return result
            
        except Exception as e:
            print(f"Erreur lors de l'extraction du JSON: {str(e)}")
            print(f"Réponse reçue: {response[:500]}...")
            
            # En cas d'erreur, tenter une extraction plus simple avec des regex
            for letter in letters:
                pattern = rf'"{letter}"\s*:\s*"([^"]*)"'
                match = re.search(pattern, response)
                if match:
                    result[letter] = match.group(1)
                    print(f"Question extraite par regex (en cas d'erreur) pour {letter}: {result[letter][:50]}...")
            
            return result

# Instance singleton du service
formula_questions_service = FormulaQuestionsService() 