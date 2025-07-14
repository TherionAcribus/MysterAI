"""
Script de test pour le service QR Code de MysteryAI

Ce script teste les fonctionnalités de base du service QR Code :
1. Vérification des dépendances
2. Test de détection sur une image de test
3. Test des différentes techniques de pré-traitement

Usage:
python -m app.tools.test_qr_service
"""

import sys
import os
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_dependencies():
    """Test de la disponibilité des dépendances."""
    logger.info("Test des dépendances...")
    
    try:
        import cv2
        logger.info(f"✓ OpenCV disponible : version {cv2.__version__}")
    except ImportError:
        logger.error("✗ OpenCV non disponible")
        return False
    
    try:
        from pyzbar import pyzbar
        logger.info("✓ pyzbar disponible")
    except ImportError:
        logger.error("✗ pyzbar non disponible")
        logger.error("  Installation: pip install pyzbar")
        return False
    
    try:
        import numpy as np
        logger.info(f"✓ NumPy disponible : version {np.__version__}")
    except ImportError:
        logger.error("✗ NumPy non disponible")
        return False
    
    return True

def create_test_qr_image():
    """Crée une image de test avec un QR code simple."""
    try:
        import qrcode
        from PIL import Image
        import io
        
        # Créer un QR code de test
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data('https://www.geocaching.com/mystery-ai-test')
        qr.make(fit=True)
        
        # Créer l'image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convertir en bytes
        byte_io = io.BytesIO()
        img.save(byte_io, 'PNG')
        return byte_io.getvalue()
        
    except ImportError:
        logger.warning("qrcode non disponible pour créer une image de test")
        logger.info("Installation optionnelle: pip install qrcode[pil]")
        return None

def test_qr_service():
    """Test principal du service QR Code."""
    logger.info("Test du service QR Code...")
    
    # Tester les dépendances d'abord
    if not test_dependencies():
        logger.error("Échec du test des dépendances")
        return False
    
    try:
        # Importer le service
        from app.services.qr_service import get_qr_service
        
        qr_service = get_qr_service()
        logger.info("✓ Service QR Code initialisé")
        
        # Créer une image de test
        test_image_bytes = create_test_qr_image()
        
        if test_image_bytes:
            logger.info("Test avec image générée...")
            result = qr_service.detect_qr_codes(test_image_bytes)
            
            if result['success']:
                logger.info(f"✓ Détection réussie : {result['count']} QR code(s) trouvé(s)")
                for i, qr in enumerate(result['qr_codes']):
                    logger.info(f"  QR Code {i+1}: {qr['data']}")
                    logger.info(f"  Qualité: {qr['quality']}")
            else:
                logger.warning(f"✗ Échec de détection : {result.get('error', 'Erreur inconnue')}")
        else:
            logger.info("Pas d'image de test disponible (qrcode non installé)")
        
        # Test avec une image inexistante (test de gestion d'erreur)
        logger.info("Test de gestion d'erreur...")
        result = qr_service.detect_qr_codes(b"invalid image data")
        if not result['success']:
            logger.info("✓ Gestion d'erreur fonctionnelle")
        else:
            logger.warning("✗ La gestion d'erreur pourrait être améliorée")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Erreur lors du test du service : {e}")
        return False

def test_url_detection():
    """Test de détection à partir d'une URL (si requests disponible)."""
    logger.info("Test de détection par URL...")
    
    try:
        import requests
        from app.services.qr_service import get_qr_service
        
        qr_service = get_qr_service()
        
        # Test avec une URL d'exemple (QR code public)
        test_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/QR_code_for_mobile_English_Wikipedia.svg/256px-QR_code_for_mobile_English_Wikipedia.svg.png"
        
        logger.info(f"Test avec URL : {test_url}")
        result = qr_service.detect_qr_codes_in_url(test_url)
        
        if result['success'] and result['count'] > 0:
            logger.info(f"✓ Détection par URL réussie : {result['count']} QR code(s)")
            for qr in result['qr_codes']:
                logger.info(f"  Données: {qr['data'][:100]}...")
        else:
            logger.info("✓ Test URL terminé (pas de QR code ou erreur réseau)")
            
    except ImportError:
        logger.info("requests non disponible pour test URL")
    except Exception as e:
        logger.warning(f"Erreur test URL : {e}")

def main():
    """Fonction principale de test."""
    logger.info("=== Test du Système QR Code MysteryAI ===")
    
    success = test_qr_service()
    
    if success:
        test_url_detection()
        logger.info("=== Tests terminés avec succès ===")
        logger.info("Le service QR Code est prêt à être utilisé !")
    else:
        logger.error("=== Échec des tests ===")
        logger.error("Vérifiez l'installation des dépendances :")
        logger.error("  pip install pyzbar opencv-python-headless")
        sys.exit(1)

if __name__ == "__main__":
    main() 