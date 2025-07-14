"""
Service QR Code pour MysteryAI

Fournit la détection et le décodage de QR codes à partir d'images via pyzbar et OpenCV.

Principales caractéristiques :
1. Pré-traitement OpenCV pour améliorer la détection des QR codes.
2. Utilisation de pyzbar pour la détection et le décodage.
3. Support de multiples QR codes dans une même image.
4. API simple : detect_qr_codes(image_bytes) → {qr_codes: [{"data": str, "type": str, "rect": dict}], "success": bool}.
"""

import base64
import logging
from typing import Dict, List, Tuple, Optional

import numpy as np

try:
    import cv2  # type: ignore
except ImportError:
    cv2 = None

try:
    from pyzbar import pyzbar  # type: ignore
    from pyzbar.pyzbar import ZBarSymbol  # type: ignore
except ImportError:
    pyzbar = None
    ZBarSymbol = None

logger = logging.getLogger(__name__)


class QRCodeService:
    """Service principal pour la détection et le décodage de QR codes."""

    def __init__(self) -> None:
        if pyzbar is None:
            logger.warning("QRCodeService : pyzbar n'est pas installé. La détection de QR codes sera désactivée.")
        if cv2 is None:
            logger.warning("QRCodeService : OpenCV n'est pas installé. Le pré-traitement sera limité.")
        
        logger.info("QRCodeService : Service initialisé")

    # ---------------------------------------------------------------------
    # API publique
    # ---------------------------------------------------------------------
    def detect_qr_codes(self, image_bytes: bytes) -> Dict:
        """Détecte et décode les QR codes dans une image.

        Args:
            image_bytes: Contenu binaire de l'image.

        Returns:
            Dictionnaire : {
                "qr_codes": [{"data": str, "type": str, "rect": dict}],
                "success": bool,
                "count": int
            }
        """
        if pyzbar is None:
            return {
                "success": False,
                "error": "pyzbar n'est pas installé",
                "qr_codes": [],
                "count": 0
            }

        try:
            # 1) Convertir les bytes en image OpenCV si possible
            if cv2 is not None:
                np_img = np.frombuffer(image_bytes, np.uint8)
                image = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
                if image is None:
                    return {
                        "success": False,
                        "error": "Impossible de décoder l'image",
                        "qr_codes": [],
                        "count": 0
                    }
            else:
                # Fallback sans OpenCV (moins efficace)
                from PIL import Image
                import io
                image = Image.open(io.BytesIO(image_bytes))
                image = np.array(image)

            # 2) Essayer la détection directe
            qr_codes = self._detect_codes_direct(image)
            
            # 3) Si aucun QR code trouvé, essayer avec préprocessing
            if not qr_codes and cv2 is not None:
                processed_images = self._preprocess_image(image)
                for processed_img in processed_images:
                    detected_codes = self._detect_codes_direct(processed_img)
                    qr_codes.extend(detected_codes)
                    if qr_codes:  # Arrêter au premier succès
                        break

            return {
                "success": True,
                "qr_codes": qr_codes,
                "count": len(qr_codes)
            }

        except Exception as exc:
            logger.error(f"Erreur lors de la détection de QR codes : {exc}")
            return {
                "success": False,
                "error": str(exc),
                "qr_codes": [],
                "count": 0
            }

    # ------------------------------------------------------------------
    # Méthodes internes
    # ------------------------------------------------------------------
    def _detect_codes_direct(self, image) -> List[Dict]:
        """Détecte directement les QR codes dans l'image."""
        qr_codes = []
        
        try:
            # Détecter tous les codes-barres et QR codes
            decoded_objects = pyzbar.decode(image)
            
            for obj in decoded_objects:
                # Filtrer pour ne garder que les QR codes
                if obj.type == 'QRCODE':
                    # Décoder les données
                    try:
                        data = obj.data.decode('utf-8')
                    except UnicodeDecodeError:
                        # Essayer avec d'autres encodages
                        try:
                            data = obj.data.decode('latin-1')
                        except UnicodeDecodeError:
                            data = str(obj.data)
                    
                    # Récupérer les coordonnées du rectangle
                    rect = {
                        "left": obj.rect.left,
                        "top": obj.rect.top,
                        "width": obj.rect.width,
                        "height": obj.rect.height
                    }
                    
                    # Récupérer les points du polygone pour plus de précision
                    polygon = [{"x": point.x, "y": point.y} for point in obj.polygon]
                    
                    qr_codes.append({
                        "data": data,
                        "type": obj.type,
                        "rect": rect,
                        "polygon": polygon,
                        "quality": "direct"
                    })
                    
                    logger.info(f"QR Code détecté : {data[:50]}...")
                    
        except Exception as exc:
            logger.warning(f"Erreur lors de la détection directe : {exc}")
            
        return qr_codes

    def _preprocess_image(self, image) -> List:
        """Prétraite l'image pour améliorer la détection des QR codes."""
        if cv2 is None:
            return [image]
        
        processed_images = []
        
        try:
            # Convertir en niveaux de gris
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # 1. Image originale en niveaux de gris
            processed_images.append(gray)
            
            # 2. Amélioration du contraste avec CLAHE
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            enhanced = clahe.apply(gray)
            processed_images.append(enhanced)
            
            # 3. Seuillage adaptatif
            adaptive_thresh = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            processed_images.append(adaptive_thresh)
            
            # 4. Seuillage d'Otsu
            _, otsu_thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            processed_images.append(otsu_thresh)
            
            # 5. Filtre médian pour réduire le bruit
            median_filtered = cv2.medianBlur(gray, 5)
            processed_images.append(median_filtered)
            
            # 6. Réduction du bruit gaussien
            gaussian_filtered = cv2.GaussianBlur(gray, (5, 5), 0)
            processed_images.append(gaussian_filtered)
            
        except Exception as exc:
            logger.warning(f"Erreur lors du préprocessing : {exc}")
            processed_images = [image]
        
        return processed_images

    def detect_qr_codes_in_url(self, image_url: str) -> Dict:
        """Détecte les QR codes à partir d'une URL d'image."""
        try:
            import requests
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            return self.detect_qr_codes(response.content)
        except Exception as exc:
            logger.error(f"Erreur lors du téléchargement de l'image : {exc}")
            return {
                "success": False,
                "error": f"Impossible de télécharger l'image : {exc}",
                "qr_codes": [],
                "count": 0
            }


# Singleton pour éviter de réinstancier le service
_qr_service_instance = None

def get_qr_service() -> QRCodeService:
    """Retourne l'instance singleton du service QR Code."""
    global _qr_service_instance
    if _qr_service_instance is None:
        _qr_service_instance = QRCodeService()
    return _qr_service_instance 