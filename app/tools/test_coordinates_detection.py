"""
Script de test pour la détection de coordonnées dans MysteryAI

Ce script teste :
1. Le plugin coordinates_finder
2. L'intégration avec le système d'analyse
3. Les différents formats de coordonnées

Usage:
python -m app.tools.test_coordinates_detection
"""

import sys
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_coordinates_finder_plugin():
    """Test du plugin coordinates_finder."""
    logger.info("Test du plugin coordinates_finder...")
    
    try:
        # Importer le plugin
        sys.path.append('plugins/official/coordinates_finder')
        from main import CoordinatesFinderPlugin
        
        plugin = CoordinatesFinderPlugin()
        logger.info("✓ Plugin coordinates_finder initialisé")
        
        # Tests avec différents formats de coordonnées
        test_cases = [
            {
                "name": "Coordonnées DDM standard",
                "text": "Les coordonnées finales sont N 48° 51.402 E 002° 21.048",
                "expected": True
            },
            {
                "name": "Coordonnées cachées dans du HTML",
                "text": '<span style="color:#ffffff; background:#ffffff">N 48° 51.402 E 002° 21.048</span>',
                "expected": True
            },
            {
                "name": "Coordonnées dans des formules",
                "text": "N 48° (A+B).(CDE) E 002° (F+G).(HIJ) où A=4, B=4, C=5, D=1, E=4, F=2, G=1, H=0, I=4, J=8",
                "expected": True
            },
            {
                "name": "Texte sans coordonnées",
                "text": "Ceci est un texte normal sans coordonnées.",
                "expected": False
            },
            {
                "name": "Coordonnées compactes",
                "text": "GC: N48 51.402 E002 21.048",
                "expected": True
            }
        ]
        
        success_count = 0
        
        for test_case in test_cases:
            logger.info(f"Test: {test_case['name']}")
            inputs = {"text": test_case["text"]}
            result = plugin.execute(inputs)
            
            has_coordinates = result.get('coordinates', {}).get('exist', False)
            
            if has_coordinates == test_case['expected']:
                logger.info(f"✓ {test_case['name']}: {'Coordonnées détectées' if has_coordinates else 'Aucune coordonnée'}")
                if has_coordinates:
                    coords = result['coordinates']
                    logger.info(f"  → {coords.get('ddm', 'N/A')} (confiance: {coords.get('confidence', 0)*100:.0f}%)")
                success_count += 1
            else:
                logger.error(f"✗ {test_case['name']}: Résultat inattendu")
                logger.error(f"  Attendu: {test_case['expected']}, Obtenu: {has_coordinates}")
        
        logger.info(f"Tests plugin coordinates_finder: {success_count}/{len(test_cases)} réussis")
        return success_count == len(test_cases)
        
    except Exception as e:
        logger.error(f"✗ Erreur lors du test du plugin : {e}")
        return False

def test_detect_gps_coordinates():
    """Test de la fonction detect_gps_coordinates directement."""
    logger.info("Test de la fonction detect_gps_coordinates...")
    
    try:
        from app.routes.coordinates import detect_gps_coordinates
        
        test_texts = [
            "N 48° 51.402 E 002° 21.048",
            "48° 51.402' N, 002° 21.048' E",
            "48°51'24.12\"N 2°21'2.88\"E",
            "N48 51.402 E002 21.048",
            "Nord 48 51.402 Est 002 21.048"
        ]
        
        detected_count = 0
        
        for i, text in enumerate(test_texts, 1):
            logger.info(f"Test {i}: {text}")
            result = detect_gps_coordinates(text)
            
            if result.get('exist', False):
                logger.info(f"✓ Coordonnées détectées: {result.get('ddm', 'N/A')}")
                logger.info(f"  Source: {result.get('source', 'unknown')}, Confiance: {result.get('confidence', 0)*100:.0f}%")
                detected_count += 1
            else:
                logger.warning(f"✗ Aucune coordonnée détectée")
        
        logger.info(f"Tests detect_gps_coordinates: {detected_count}/{len(test_texts)} réussis")
        return detected_count > 0
        
    except Exception as e:
        logger.error(f"✗ Erreur lors du test de detect_gps_coordinates : {e}")
        return False

def test_analysis_integration():
    """Test de l'intégration avec le système d'analyse."""
    logger.info("Test de l'intégration avec le système d'analyse...")
    
    try:
        # Simuler un appel au plugin analysis_web_page
        sys.path.append('plugins/official/analysis_web_page')
        from main import AnalysisWebPagePlugin
        
        # Créer une géocache de test en base
        from app.models.geocache import Geocache
        from app import create_app, db
        
        app = create_app()
        with app.app_context():
            # Créer une géocache de test
            test_geocache = Geocache(
                gc_code="GC123TEST",
                name="Test Geocache",
                description="<p>Les coordonnées finales sont <span style='color:#ffffff;background:#ffffff'>N 48° 51.402 E 002° 21.048</span></p>",
                cache_type="Mystery",
                difficulty=3.5,
                terrain=2.0,
                size="Small"
            )
            
            db.session.add(test_geocache)
            db.session.commit()
            
            # Tester le plugin d'analyse
            analysis_plugin = AnalysisWebPagePlugin()
            inputs = {"geocache_id": test_geocache.id}
            
            result = analysis_plugin.execute(inputs)
            
            if result and 'combined_results' in result:
                combined = result['combined_results']
                
                # Vérifier que coordinates_finder a trouvé quelque chose
                if 'coordinates_finder' in combined:
                    coords_result = combined['coordinates_finder']
                    if coords_result.get('coordinates', {}).get('exist', False):
                        logger.info("✓ Integration réussie: coordinates_finder a détecté des coordonnées")
                        logger.info(f"  → {coords_result['coordinates'].get('ddm', 'N/A')}")
                    else:
                        logger.warning("✗ coordinates_finder n'a pas détecté de coordonnées")
                else:
                    logger.warning("✗ coordinates_finder absent des résultats")
                
                # Vérifier la déduplication
                coord_sources = []
                for plugin_name in ['coordinates_finder', 'color_text_detector', 'formula_parser', 'image_alt_text_extractor']:
                    if plugin_name in combined:
                        plugin_result = combined[plugin_name]
                        if plugin_result.get('coordinates', {}).get('exist', False):
                            coord_sources.append(plugin_name)
                
                logger.info(f"Sources de coordonnées actives: {coord_sources}")
                
                return len(coord_sources) > 0
            else:
                logger.error("✗ Aucun résultat d'analyse")
                return False
                
    except Exception as e:
        logger.error(f"✗ Erreur lors du test d'intégration : {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Fonction principale de test."""
    logger.info("=== Test du Système de Détection de Coordonnées ===")
    
    success_count = 0
    total_tests = 3
    
    # Test 1: Plugin coordinates_finder
    if test_coordinates_finder_plugin():
        success_count += 1
    
    # Test 2: Fonction detect_gps_coordinates
    if test_detect_gps_coordinates():
        success_count += 1
    
    # Test 3: Intégration avec le système d'analyse
    if test_analysis_integration():
        success_count += 1
    
    # Résultats
    logger.info(f"=== Résultats: {success_count}/{total_tests} tests réussis ===")
    
    if success_count == total_tests:
        logger.info("🎉 Tous les tests sont passés avec succès !")
        logger.info("Le système de détection de coordonnées est prêt !")
    else:
        logger.warning(f"⚠️ {total_tests - success_count} test(s) échoué(s)")
        logger.info("Vérifiez les logs ci-dessus pour plus de détails")

if __name__ == "__main__":
    main() 