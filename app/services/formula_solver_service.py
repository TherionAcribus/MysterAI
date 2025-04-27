from app.services.ai_service import ai_service
from app.models.geocache import Geocache
import re
import traceback

class FormulaSolverService:
    """Service pour résoudre les questions des formules de coordonnées avec l'IA"""
    
    def __init__(self):
        """Initialise le service de résolution de formules"""
        pass
    
    def solve_questions_with_ai(self, questions, geocache_id=None, gc_code=None):
        """
        Résout les questions associées aux lettres en utilisant l'IA
        
        Args:
            questions (dict): Dictionnaire de questions par lettre
            geocache_id (int, optional): ID de la géocache pour le contexte
            gc_code (str, optional): Code GC de la géocache pour le contexte
            
        Returns:
            dict: Dictionnaire associant chaque lettre à sa réponse générée
        """
        try:
            # Vérifier si le service AI est disponible
            ai_service._ensure_initialized()
            if not ai_service.api_key:
                print("Erreur: Service IA non disponible ou clé API non configurée")
                return {"error": "Service IA non disponible ou clé API non configurée"}
            
            # Obtenir le contexte de la géocache si un ID est fourni
            geocache_context = ""
            if geocache_id:
                try:
                    geocache = Geocache.query.get(geocache_id)
                    if geocache:
                        geocache_context = f"Cette géocache a pour code GC: {gc_code or geocache.gc_code}. "
                        geocache_context += f"Son nom est: {geocache.name}. "
                        geocache_context += f"Elle est de type: {geocache.type}. "
                        geocache_context += f"Difficulté: {geocache.difficulty}/5, Terrain: {geocache.terrain}/5. "
                except Exception as e:
                    print(f"Erreur lors de la récupération de la géocache: {str(e)}")
            
            # Construire le message pour l'IA avec les questions
            questions_text = ""
            for letter, question in questions.items():
                if question:
                    questions_text += f"Question {letter}: {question}\n"
            
            # Créer les instructions pour l'IA
            instructions = self._build_ai_instructions(questions, geocache_context)
            
            print(f"Résolution de {len(questions)} questions avec l'IA...")
            print(f"Instructions: {instructions[:200]}...")
            
            # Appeler l'IA pour résoudre les questions
            response = ai_service.chat(
                [
                    {"role": "system", "content": "Tu es un assistant spécialisé dans la résolution de géocaches."},
                    {"role": "user", "content": instructions}
                ]
            )
            
            if not response:
                print("Pas de réponse de l'IA")
                return {"error": "Pas de réponse de l'IA"}
            
            # Extraire le JSON de la réponse
            result = self._extract_json_from_response(response, questions.keys())
            print(f"Réponses générées: {result}")
            return result
            
        except Exception as e:
            print(f"Erreur lors de la résolution des questions avec l'IA: {str(e)}")
            traceback.print_exc()
            return {"error": f"Erreur lors de la résolution des questions avec l'IA: {str(e)}"}
    
    def _build_ai_instructions(self, questions, geocache_context=""):
        """
        Crée les instructions à envoyer à l'IA pour la résolution des questions
        
        Args:
            questions: Dictionnaire des questions par lettre
            geocache_context: Contexte supplémentaire sur la géocache
            
        Returns:
            Instructions formatées pour l'IA
        """
        letters = ", ".join(questions.keys())
        questions_text = ""
        
        for letter, question in questions.items():
            if question:
                questions_text += f"Question {letter}: {question}\n"
        
        return f"""Je dois résoudre une géocache mystery qui utilise des formules avec des variables.
{geocache_context}

Pour résoudre la formule, je dois trouver les réponses aux questions suivantes:
{questions_text}

Pour chaque question, donne une réponse précise. Les réponses sont généralement:
- Des mots uniques
- Des nombres
- Des décomptes d'éléments
- Des valeurs précises

N'explique pas ton raisonnement, réponds uniquement en format JSON avec une entrée par lettre:
{{
  "A": "réponse_à_A",
  "B": "réponse_à_B",
  ...
}}

Les réponses doivent être aussi précises que possible. Utilise uniquement des mots ou des chiffres sans symboles spéciaux."""

    def _extract_json_from_response(self, response, letters):
        """
        Extrait et nettoie le JSON de la réponse de l'IA
        
        Args:
            response: Réponse textuelle de l'IA
            letters: Liste des lettres attendues
            
        Returns:
            Dictionnaire des réponses par lettre
        """
        # Valeurs par défaut
        result = {letter: "" for letter in letters}
        
        try:
            print(f"=== DÉBUT EXTRACTION JSON ===")
            # Trouver le JSON dans la réponse
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
                            print(f"Réponse pour {letter}: {result[letter][:50]}...")
                except json.JSONDecodeError as json_error:
                    print(f"Erreur de parsing JSON: {str(json_error)}")
                    print(f"JSON problématique: {json_str}")
            else:
                print(f"Aucun JSON trouvé dans la réponse")
                
                # En cas d'échec, tenter une extraction plus simple avec des regex
                for letter in letters:
                    pattern = rf'"{letter}"\s*:\s*"([^"]*)"'
                    match = re.search(pattern, response)
                    if match:
                        result[letter] = match.group(1)
                        print(f"Réponse extraite par regex pour {letter}: {result[letter][:50]}...")
            
            print(f"=== FIN EXTRACTION JSON ===")
            return result
            
        except Exception as e:
            print(f"Erreur lors de l'extraction du JSON: {str(e)}")
            traceback.print_exc()
            return result

# Instance singleton du service
formula_solver_service = FormulaSolverService() 