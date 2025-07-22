#!/usr/bin/env python3
"""
Test de la version sécurisée du plugin T9
"""
import sys
import os

# Ajouter le chemin racine au PYTHONPATH
sys.path.insert(0, os.path.abspath('../../..'))

def test_safe_version():
    """Test la version sécurisée"""
    print("=== Test Version Sécurisée T9 ===\n")
    
    try:
        from plugins.official.t9_code.main import T9CodePluginSafe
        plugin = T9CodePluginSafe()
        
        print(f"DictionaryService: {plugin.dict_service_available}")
        print(f"ScoringService: {plugin.scoring_service_available}\n")
        
        # Tests sécurisés
        test_cases = [
            {"name": "DCODE", "input": "32633", "expected": "DCODE"},
            {"name": "MONDE", "input": "66633", "expected": "MONDE"},
            {"name": "HELLO", "input": "43556", "expected": "HELLO"},
            {"name": "THE AREA", "input": "84302732", "expected": "THE AREA"},
            {"name": "Texte court", "input": "843", "expected": "THE"},
            {"name": "Texte très long", "input": "1234567890123456789012345678901234567890", "expected": "REJET"},
        ]
        
        for test in test_cases:
            print(f"--- Test: {test['name']} ---")
            print(f"Entrée: {test['input'][:20]}{'...' if len(test['input']) > 20 else ''}")
            
            result = plugin.execute({
                "text": test['input'],
                "mode": "decode",
                "language": "auto",
                "max_results": 5
            })
            
            print(f"Statut: {result['status']}")
            print(f"Message: {result['summary']['message']}")
            
            if result.get('results'):
                print(f"Meilleur résultat: {result['results'][0]['text_output']}")
                print(f"Confiance: {result['results'][0]['confidence']:.3f}")
                print(f"Metadata: {result['results'][0].get('metadata', {}).get('safe_mode', 'N/A')}")
            
            print()
        
        # Test d'encodage
        print("--- Test Encodage ---")
        words = ["DCODE", "MONDE", "HELLO", "THE"]
        for word in words:
            result = plugin.execute({
                "text": word,
                "mode": "encode"
            })
            if result.get('results'):
                encoded = result['results'][0]['text_output']
                print(f"{word} → {encoded}")
        
        print("\n=== Tests sécurisés terminés ===")
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_safe_version()
    sys.exit(0 if success else 1) 