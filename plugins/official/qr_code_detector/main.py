import os
import logging

class QRCodeDetectorPlugin:
    """
    Plugin pour détecter et décoder les QR codes dans les images d'une géocache.
    Analyse toutes les images associées à la géocache et retourne les QR codes trouvés.
    """

    def __init__(self):
        self.name = "qr_code_detector"
        self.description = "Détecte et décode les QR codes dans les images d'une géocache"
        self.logger = logging.getLogger(__name__)

    def execute(self, inputs):
        """
        Analyse les images d'une géocache pour détecter des QR codes.

        Args:
            inputs: Dictionnaire contenant:
                - geocache_id: ID de la géocache à analyser
                - text: Contenu HTML de la géocache (optionnel)

        Returns:
            Dictionnaire au format standardisé :
            {
                "findings": [
                    {
                        "type": "qr_code",
                        "content": str,
                        "isInteresting": bool,
                        "description": str,
                        "image_name": str,
                        "rect": dict
                    }
                ],
                "qr_codes": [
                    {
                        "data": str,
                        "image_name": str,
                        "image_id": int,
                        "rect": dict,
                        "polygon": list
                    }
                ],
                "images_analyzed": int,
                "success": bool
            }
        """
        geocache_id = inputs.get('geocache_id')
        if not geocache_id:
            return {
                "findings": [],
                "qr_codes": [],
                "images_analyzed": 0,
                "success": False,
                "error": "Missing 'geocache_id' in inputs."
            }

        try:
            # Récupérer la géocache et ses images depuis la base de données
            from app.models.geocache import Geocache, GeocacheImage
            from app import db
            from app.services.qr_service import get_qr_service

            geocache = db.session.query(Geocache).get(geocache_id)
            if not geocache:
                return {
                    "findings": [],
                    "qr_codes": [],
                    "images_analyzed": 0,
                    "success": False,
                    "error": f"Geocache with id {geocache_id} not found."
                }

            # Récupérer toutes les images de la géocache
            images = db.session.query(GeocacheImage).filter_by(geocache_id=geocache_id).all()
            
            if not images:
                return {
                    "findings": [],
                    "qr_codes": [],
                    "images_analyzed": 0,
                    "success": True,
                    "message": "Aucune image trouvée pour cette géocache."
                }

            qr_service = get_qr_service()
            findings = []
            all_qr_codes = []
            images_processed = 0

            # Analyser chaque image
            for image in images:
                try:
                    image_path = self._get_image_path(geocache.gc_code, image.filename)
                    if not os.path.exists(image_path):
                        self.logger.warning(f"Image non trouvée : {image_path}")
                        continue

                    # Lire l'image
                    with open(image_path, 'rb') as f:
                        image_bytes = f.read()

                    # Détecter les QR codes
                    result = qr_service.detect_qr_codes(image_bytes)
                    images_processed += 1

                    if result.get('success') and result.get('qr_codes'):
                        for qr_code in result['qr_codes']:
                            # Ajouter aux findings pour l'affichage standardisé
                            findings.append({
                                "type": "qr_code",
                                "content": qr_code['data'],
                                "isInteresting": True,  # Les QR codes sont toujours intéressants
                                "description": f"QR Code détecté dans l'image '{image.name or image.filename}'",
                                "image_name": image.name or image.filename,
                                "image_id": image.id,
                                "rect": qr_code.get('rect', {}),
                                "quality": qr_code.get('quality', 'unknown')
                            })

                            # Ajouter aux QR codes détaillés
                            qr_code_detail = {
                                "data": qr_code['data'],
                                "image_name": image.name or image.filename,
                                "image_id": image.id,
                                "image_filename": image.filename,
                                "rect": qr_code.get('rect', {}),
                                "polygon": qr_code.get('polygon', []),
                                "quality": qr_code.get('quality', 'unknown')
                            }
                            all_qr_codes.append(qr_code_detail)

                            self.logger.info(f"QR Code trouvé dans {image.filename}: {qr_code['data'][:50]}...")

                except Exception as e:
                    self.logger.error(f"Erreur lors de l'analyse de l'image {image.filename}: {e}")
                    continue

            return {
                "findings": findings,
                "qr_codes": all_qr_codes,
                "images_analyzed": images_processed,
                "success": True
            }

        except Exception as e:
            self.logger.error(f"Erreur dans QRCodeDetectorPlugin: {e}")
            return {
                "findings": [],
                "qr_codes": [],
                "images_analyzed": 0,
                "success": False,
                "error": str(e)
            }

    def _get_image_path(self, gc_code, filename):
        """Construit le chemin vers l'image de la géocache."""
        from flask import current_app
        
        # Essayer plusieurs emplacements possibles
        possible_paths = [
            os.path.join(current_app.root_path, 'geocaches_images', gc_code, filename),
            os.path.join('geocaches_images', gc_code, filename),
            os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), gc_code, filename),
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                return path
        
        # Si aucun chemin n'existe, retourner le premier (pour les logs d'erreur)
        return possible_paths[0] 