#!/usr/bin/env python
"""
Script de test pour le service de scoring.
Teste le scoring sur différents types de textes pour vérifier le bon fonctionnement.
"""

import sys
import os
import json
import logging
from typing import Dict, List
from unittest.mock import patch

# Configurer le logger
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Ajouter le répertoire racine au PYTHONPATH pour permettre l'import depuis app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Simuler la classe AppConfig pour éviter la dépendance à la base de données
def mock_get_value(key, default=None):
    """Simuler la fonction AppConfig.get_value."""
    config = {
        'enable_auto_scoring': True
    }
    return config.get(key, default)

# Appliquer le patch avant d'importer le service
with patch('app.models.app_config.AppConfig.get_value', side_effect=mock_get_value):
    from app.services.scoring_service import get_scoring_service, ScoringService

# Palette de couleurs pour l'affichage des résultats
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    END = '\033[0m'

def format_score(score: float) -> str:
    """Formate un score avec coloration en fonction de la valeur."""
    if score >= 0.65:
        return f"{Colors.GREEN}{score:.2f}{Colors.END}"
    elif score >= 0.40:
        return f"{Colors.YELLOW}{score:.2f}{Colors.END}"
    else:
        return f"{Colors.RED}{score:.2f}{Colors.END}"

def print_result(text: str, result: Dict) -> None:
    """Affiche le résultat d'un test de scoring."""
    print(f"\n{Colors.BOLD}Texte:{Colors.END} {text}")
    
    if result.get("status") == "disabled":
        print(f"  {Colors.YELLOW}Scoring désactivé: {result.get('message')}{Colors.END}")
        return
    
    if result.get("status") == "rejected":
        print(f"  {Colors.RED}Texte rejeté: {result.get('message')}{Colors.END}")
        return
    
    print(f"  Score: {format_score(result.get('score', 0.0))} ({result.get('confidence_level', 'unknown')})")
    print(f"  Langue: {result.get('language', 'non détectée')}")
    
    if result.get("words_found"):
        print(f"  Mots reconnus: {Colors.BLUE}{', '.join(result.get('words_found', []))}{Colors.END}")
    
    if result.get("coordinates", {}).get("exist", False):
        patterns = result.get("coordinates", {}).get("patterns", [])
        print(f"  Coordonnées: {Colors.GREEN}{', '.join(patterns)}{Colors.END}")
    
    print(f"  Temps d'exécution: {result.get('execution_time_ms', 0)} ms")

def test_with_examples() -> None:
    """Teste le service de scoring avec différents exemples."""
    # Obtenir l'instance du service de scoring
    with patch.object(ScoringService, 'is_scoring_enabled', return_value=True):
        scoring_service = get_scoring_service()
        
        # Liste des textes à tester
        test_texts = [
            # Texte mentionné dans le problème
            "CECI EST UN TEXTE EN FRANCE ET IL EST PLUTÔT LONG MAIS PAS TROP",
            
            # Textes valides en français
            "Bonjour tout le monde, je suis très heureux de vous voir aujourd'hui.",
            "La cache se trouve sous le grand arbre à N 48° 51.234 E 2° 21.567",
            
            # Textes valides en anglais
            "Hello everyone, I am very happy to see you today.",
            "The cache is located near the old church at N 48° 51.234 E 2° 21.567",
            
            # Textes avec coordonnées seules
            "N 48° 51.234 E 2° 21.567",
            
            # Textes sans espaces
            "lacachesetrouvesouslegrandarbre",
            "thecacheislocatedneartheoldchurch",
            
            # Textes avec espaces entre lettres
            "L A  C A C H E  E S T  I C I",
            
            # Textes trop courts
            "abc",
            
            # Textes avec beaucoup de caractères non alphabétiques
            "!@#$%^&*()_+{}|:<>?",
            
            # Textes aléatoires
            "xyzqwjklmvbnfdsp",
            
            # Texte avec motif N E N E (faux positif pour GPS)
            "Le nord est au nord-est de cette position"
        ]
        
        # Tester chaque texte
        for text in test_texts:
            with patch.object(ScoringService, 'is_scoring_enabled', return_value=True):
                print(f"\n{Colors.BOLD}==== Test de: {text} ===={Colors.END}")
                result = scoring_service.score_text(text)
                print_result(text, result)
                
                # Afficher les candidats si disponibles
                if result.get("candidates"):
                    print(f"  {Colors.BOLD}Candidats évalués:{Colors.END}")
                    for i, candidate in enumerate(result.get("candidates", [])):
                        print(f"    {i+1}. Texte: {candidate.get('text')}")
                        print(f"       Score: {format_score(candidate.get('score', 0.0))}")
                        print(f"       Langue: {candidate.get('language')}")
                        print(f"       Mots trouvés: {', '.join(candidate.get('words_found', []))}")
        
        print("\nTous les tests sont terminés.")

if __name__ == "__main__":
    test_with_examples() 