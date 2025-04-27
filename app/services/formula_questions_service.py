import re
from typing import List, Dict, Any, Optional
from app.services.ai_service import ai_service
from app.models.geocache import Geocache
from app import db  # Import direct de db depuis app au lieu de app.models
import traceback

class FormulaQuestionsService:
    """Service pour extraire les questions associées aux variables dans les formules de coordonnées"""
    
    def __init__(self):
        """Initialise le service d'extraction de questions"""
        pass
    
    def extract_thematic_context(self, geocache):
        """
        Extrait le contexte thématique de la géocache à partir de son titre et sa description
        
        Args:
            geocache: Objet Geocache contenant les informations de la géocache
            
        Returns:
            str: Description du contexte thématique de la géocache
        """
        try:
            print(f"===== DÉBUT EXTRACTION CONTEXTE THÉMATIQUE =====")
            print(f"Géocache: {geocache.gc_code} - {geocache.name}")
            
            # Vérifier si le service AI est disponible
            ai_service._ensure_initialized()
            if not ai_service.api_key:
                print("Erreur: Service IA non disponible ou clé API non configurée")
                return ""
            
            # Préparer les données de la géocache
            geocache_data = {
                "gc_code": geocache.gc_code,
                "name": geocache.name,
                "type": getattr(geocache, 'cache_type', '') or getattr(geocache, 'type', ''),
                "description": self._clean_html(geocache.description) if geocache.description else ""
            }
            
            # Si la description est trop longue, la tronquer
            description_length = len(geocache_data["description"])
            if description_length > 2000:
                print(f"Description tronquée: {description_length} caractères -> 2000 caractères")
                geocache_data["description"] = geocache_data["description"][:2000] + "..."
            else:
                print(f"Longueur de la description: {description_length} caractères")
            
            # Créer le prompt pour l'IA
            prompt = f"""Analyse le titre et la description de cette géocache mystery et identifie son thème principal.
La géocache a pour titre: {geocache_data['name']}
Description (extrait):
{geocache_data['description']}

Donne une courte description (max 3 phrases) du thème principal ou du contexte de cette géocache.
Ce contexte sera utilisé pour aider à résoudre des questions liées à cette géocache.
"""
            
            print(f"Envoi du prompt pour l'extraction du contexte thématique")
            
            # Appeler l'IA pour extraire le contexte
            response = ai_service.chat(
                [
                    {"role": "system", "content": "Tu es un assistant spécialisé dans l'analyse des géocaches."},
                    {"role": "user", "content": prompt}
                ]
            )
            
            if not response:
                print("Pas de réponse de l'IA pour l'extraction du contexte")
                return ""
            
            # Nettoyer la réponse
            context = response.strip()
            
            print(f"Contexte thématique extrait: {context}")
            print(f"===== FIN EXTRACTION CONTEXTE THÉMATIQUE =====")
            return context
            
        except Exception as e:
            print(f"Erreur lors de l'extraction du contexte thématique: {str(e)}")
            traceback.print_exc()
            return ""
    
    def _clean_html(self, html_content):
        """
        Nettoie le contenu HTML pour en extraire le texte
        
        Args:
            html_content: Contenu HTML à nettoyer
            
        Returns:
            str: Texte nettoyé
        """
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html_content, 'html.parser')
            return soup.get_text(separator=' ', strip=True)
        except Exception:
            # Si BeautifulSoup n'est pas disponible, utiliser une méthode plus simple
            import re
            clean = re.compile('<.*?>')
            return re.sub(clean, ' ', html_content)
    
    def extract_questions_with_ai(self, content, letters):
        """
        Extrait les questions associées aux lettres dans le contenu spécifié en utilisant l'IA
        
        Args:
            content: Contenu duquel extraire les questions (texte ou objet Geocache)
            letters: Liste des lettres à rechercher
            
        Returns:
            Dictionnaire associant chaque lettre à sa question correspondante, avec le contexte thématique
        """
        try:
            # Vérifier si le service AI est disponible
            ai_service._ensure_initialized()
            if not ai_service.api_key:
                print("Erreur: Service IA non disponible ou clé API non configurée")
                return {"error": "Service IA non disponible ou clé API non configurée"}
                
            # Préparer le contenu pour l'analyse
            prepared_content = self._prepare_content_for_analysis(content, letters)
            if not prepared_content:
                print("Contenu vide, impossible d'extraire les questions")
                return {"error": "Contenu vide, impossible d'extraire les questions"}
            
            # Extraire le contexte thématique si content est un objet Geocache
            thematic_context = ""
            if hasattr(content, 'gc_code'):
                thematic_context = self.extract_thematic_context(content)
            
            # Créer le message pour l'IA
            instructions = self._build_ai_instructions(letters)
            
            print(f"Extraction des questions pour {len(letters)} lettres avec l'IA...")
            print(f"Instructions: {instructions[:100]}...")
            
            # Appeler l'IA pour extraire les questions
            response = ai_service.chat(
                [
                    {"role": "system", "content": "Tu es un assistant spécialisé dans l'analyse des descriptions de géocaches."},
                    {"role": "user", "content": f"{instructions}\n\nCONTENU DE LA GÉOCACHE:\n{prepared_content}"}
                ]
            )
            
            if not response:
                print("Pas de réponse de l'IA")
                return {"error": "Pas de réponse de l'IA"}
                
            # Extraire le JSON de la réponse
            result = self._extract_json_from_response(response, letters)
            
            # Ajouter le contexte thématique au résultat
            if thematic_context:
                result["_thematic_context"] = thematic_context
                print(f"Contexte thématique ajouté au résultat: {thematic_context[:100]}...")
            
            print(f"Résultat de l'extraction IA: {result}")
            return result
            
        except Exception as e:
            print(f"Erreur lors de l'extraction des questions avec l'IA: {str(e)}")
            traceback.print_exc()
            return {"error": f"Erreur lors de l'extraction des questions avec l'IA: {str(e)}"}
    
    def extract_questions_with_regex(self, content, letters):
        """
        Extrait les questions à partir du contenu en utilisant des expressions régulières.
        
        Args:
            content: Contenu à analyser (texte ou objet Geocache)
            letters (list): Liste des lettres à rechercher
            
        Returns:
            dict: Dictionnaire des questions extraites par lettre
        """
        print(f"=== EXTRACTION DE QUESTIONS PAR REGEX ===")
        print(f"Lettres recherchées: {letters}")
        
        # Préparer le contenu pour l'analyse
        prepared_content = self._prepare_content_for_analysis(content, letters)
        if not prepared_content:
            print("Contenu vide, impossible d'extraire les questions")
            return {"error": "Contenu vide, impossible d'extraire les questions"}
            
        print(f"Longueur du contenu préparé: {len(prepared_content)} caractères")
        
        result = {letter: "" for letter in letters}
        
        # Modèles regex pour trouver les questions
        patterns = [
            # Format: A. Question?
            r'(?:^|\n)\s*([' + ''.join(letters) + r'])\s*[\.\:\)]\s*(.*?)(?=\n\s*[A-Z]\s*[\.\:\)]|\n\s*\d+\s*[\.\:\)]|$)',
            
            # Format: Question A:
            r'(?:^|\n)\s*(.*?)\s+([' + ''.join(letters) + r'])\s*[\.\:\)](?:.*?)(?=\n|$)',
            
            # Format: 1. (A) Question?
            r'(?:^|\n)\s*\d+\s*[\.\:\)]\s*\(([' + ''.join(letters) + r'])\)\s*(.*?)(?=\n\s*\d+\s*[\.\:\)]|\n\s*[A-Z]\s*[\.\:\)]|$)',
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, prepared_content, re.DOTALL | re.MULTILINE)
            for match in matches:
                if len(match.groups()) >= 2:
                    letter = match.group(1).upper()
                    if letter in letters:
                        # Si la lettre est le deuxième groupe, c'est probablement "Question A:"
                        if match.lastindex == 2 and len(match.group(1)) > 3:
                            question = match.group(1).strip()
                            letter = match.group(2).upper()
                        else:
                            question = match.group(2).strip()
                        
                        # Ne remplacer que si la question n'est pas déjà trouvée ou si celle-ci est plus longue
                        if not result[letter] or len(question) > len(result[letter]):
                            result[letter] = question
        
        print(f"Nombre de questions trouvées: {len([q for q in result.values() if q])}")
        print(f"Résultat extrait: {result}")
        
        return result
    
    def _prepare_content_for_analysis(self, content, letters=None, geocache_id=None):
        """
        Prépare le contenu pour l'analyse
        
        Args:
            content (str): Contenu brut à analyser
            letters (list, optional): Liste des lettres recherchées
            geocache_id (int, optional): ID de la géocache pour la référence
            
        Returns:
            str: Contenu préparé pour l'analyse
        """
        # Si le contenu est déjà une chaîne, pas besoin de traitement supplémentaire
        if isinstance(content, str):
            return content
            
        # Si l'entrée est un objet Geocache
        if hasattr(content, 'description'):
            geocache = content
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
            
        # Si aucun cas ne correspond, retourner une chaîne vide
        return ""
    
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

    def _build_ai_instructions(self, letters):
        """
        Crée les instructions à envoyer à l'IA pour l'extraction des questions
        
        Args:
            letters: Liste des lettres pour lesquelles extraire des questions
            
        Returns:
            Instructions formatées pour l'IA
        """
        return f"""Analyse le contenu de cette géocache et identifie les questions associées aux lettres suivantes: {', '.join(letters)}.

Pour chaque lettre, trouve la question correspondante. Les questions sont généralement indiquées par:
- La lettre suivie d'un point, deux-points ou d'une parenthèse (ex: "A.", "B:", "C)")
- Une formulation claire posant une question
- La question peut s'étendre sur plusieurs lignes

Réponds uniquement en format JSON avec une entrée par lettre, comme ceci:
{{
  "A": "Question pour A",
  "B": "Question pour B",
  ...
}}

Si tu ne trouves pas de question pour une lettre, mets une chaîne vide comme valeur.
N'invente pas de questions si elles ne sont pas clairement identifiables dans le texte."""

# Instance singleton du service
formula_questions_service = FormulaQuestionsService() 