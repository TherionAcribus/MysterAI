from flask_socketio import emit, join_room, leave_room
from flask import request
from typing import Dict, Any, Optional
import uuid
from loguru import logger
import json

class WebSocketService:
    """
    Service centralisé pour gérer toutes les communications WebSocket de l'application.
    
    Ce service fournit une API simple pour :
    - Envoyer des updates de progression pour les tâches longues
    - Gérer les salles (rooms) pour organiser les communications
    - Standardiser les messages WebSocket
    - Permettre une extensibilité facile pour de nouvelles fonctionnalités
    """
    
    def __init__(self, socketio):
        self.socketio = socketio
        self.active_sessions = {}  # Stockage des sessions actives
        # Contrôles par session: pause / annulation
        # Stockés aussi dans active_sessions[session_id]['control'] pour accès unifié
        
    def create_session(self, operation_type: str, zone_id: Optional[int] = None) -> str:
        """
        Crée une nouvelle session pour une opération donnée.
        
        Args:
            operation_type: Type d'opération (ex: 'add_geocache', 'import_gpx', etc.)
            zone_id: ID de la zone si applicable
            
        Returns:
            session_id: Identifiant unique de la session
        """
        session_id = str(uuid.uuid4())
        self.active_sessions[session_id] = {
            'operation_type': operation_type,
            'zone_id': zone_id,
            'started_at': None,
            'completed_at': None,
            'status': 'created',
            'control': {
                'paused': False,
                'canceled': False
            }
        }
        return session_id
    
    def register_session(self, session_id: str, operation_type: str, zone_id: Optional[int] = None) -> str:
        """
        Enregistre une session fournie par le client (UUID généré côté frontend).
        Ne réécrit pas une session existante.
        """
        if not session_id:
            return self.create_session(operation_type, zone_id)
        if session_id in self.active_sessions:
            return session_id
        self.active_sessions[session_id] = {
            'operation_type': operation_type,
            'zone_id': zone_id,
            'started_at': None,
            'completed_at': None,
            'status': 'created',
            'control': {
                'paused': False,
                'canceled': False
            }
        }
        return session_id
    
    def emit_progress(self, session_id: str, step: str, message: str, 
                     progress: Optional[int] = None, data: Optional[Dict] = None):
        """
        Émet un message de progression pour une session donnée.
        
        Args:
            session_id: ID de la session
            step: Nom de l'étape actuelle
            message: Message descriptif de l'étape
            progress: Pourcentage de progression (0-100)
            data: Données additionnelles
        """
        if session_id not in self.active_sessions:
            logger.warning(f"Tentative d'envoi de progression pour une session inexistante: {session_id}")
            return
            
        session = self.active_sessions[session_id]
        
        # Mettre à jour le statut de la session
        if session['status'] == 'created':
            session['status'] = 'in_progress'
            
        payload = {
            'session_id': session_id,
            'operation_type': session['operation_type'],
            'zone_id': session.get('zone_id'),
            'step': step,
            'message': message,
            'progress': progress,
            'data': data or {},
            'timestamp': self._get_timestamp()
        }
        
        # Émettre vers la room de la session
        room = f"session_{session_id}"
        self.socketio.emit('progress_update', payload, room=room)
        
        # Émettre aussi vers la room globale si une zone est spécifiée
        if session.get('zone_id'):
            zone_room = f"zone_{session['zone_id']}"
            self.socketio.emit('progress_update', payload, room=zone_room)
            
        logger.info(f"[WebSocket] {session_id}: {step} - {message}")
    
    def emit_success(self, session_id: str, message: str, result: Optional[Dict] = None):
        """
        Émet un message de succès pour terminer une session.
        
        Args:
            session_id: ID de la session
            message: Message de succès
            result: Résultat de l'opération
        """
        if session_id not in self.active_sessions:
            logger.warning(f"Tentative de succès pour une session inexistante: {session_id}")
            return
            
        session = self.active_sessions[session_id]
        session['status'] = 'completed'
        session['completed_at'] = self._get_timestamp()
        
        payload = {
            'session_id': session_id,
            'operation_type': session['operation_type'],
            'zone_id': session.get('zone_id'),
            'status': 'success',
            'message': message,
            'result': result or {},
            'timestamp': self._get_timestamp()
        }
        
        # Émettre vers les rooms appropriées
        room = f"session_{session_id}"
        self.socketio.emit('operation_complete', payload, room=room)
        
        if session.get('zone_id'):
            zone_room = f"zone_{session['zone_id']}"
            self.socketio.emit('operation_complete', payload, room=zone_room)
            
        logger.info(f"[WebSocket] {session_id}: Operation completed successfully - {message}")
    
    def emit_error(self, session_id: str, error_message: str, error_data: Optional[Dict] = None):
        """
        Émet un message d'erreur pour terminer une session.
        
        Args:
            session_id: ID de la session
            error_message: Message d'erreur
            error_data: Données additionnelles sur l'erreur
        """
        if session_id not in self.active_sessions:
            logger.warning(f"Tentative d'erreur pour une session inexistante: {session_id}")
            return
            
        session = self.active_sessions[session_id]
        session['status'] = 'error'
        session['completed_at'] = self._get_timestamp()
        
        payload = {
            'session_id': session_id,
            'operation_type': session['operation_type'],
            'zone_id': session.get('zone_id'),
            'status': 'error',
            'message': error_message,
            'error_data': error_data or {},
            'timestamp': self._get_timestamp()
        }
        
        # Émettre vers les rooms appropriées
        room = f"session_{session_id}"
        self.socketio.emit('operation_complete', payload, room=room)
        
        if session.get('zone_id'):
            zone_room = f"zone_{session['zone_id']}"
            self.socketio.emit('operation_complete', payload, room=zone_room)
            
        logger.error(f"[WebSocket] {session_id}: Operation failed - {error_message}")

    def set_control(self, session_id: str, paused: Optional[bool] = None, canceled: Optional[bool] = None):
        """
        Met à jour les drapeaux de contrôle (pause/annulation) pour une session.
        """
        if session_id not in self.active_sessions:
            logger.warning(f"Tentative de contrôle sur une session inexistante: {session_id}")
            return
        control = self.active_sessions[session_id].setdefault('control', {'paused': False, 'canceled': False})
        if paused is not None:
            control['paused'] = bool(paused)
        if canceled is not None:
            control['canceled'] = bool(canceled)

    def get_control(self, session_id: str) -> Optional[Dict[str, bool]]:
        """
        Retourne les drapeaux de contrôle pour une session.
        """
        if session_id not in self.active_sessions:
            return None
        return self.active_sessions[session_id].get('control', {'paused': False, 'canceled': False})
    
    def join_session(self, session_id: str):
        """
        Permet à un client de rejoindre une session pour recevoir ses updates.
        
        Args:
            session_id: ID de la session à rejoindre
        """
        room = f"session_{session_id}"
        join_room(room)
        logger.debug(f"Client joint la session: {session_id}")
    
    def join_zone(self, zone_id: int):
        """
        Permet à un client de rejoindre une zone pour recevoir tous ses updates.
        
        Args:
            zone_id: ID de la zone à rejoindre
        """
        room = f"zone_{zone_id}"
        join_room(room)
        logger.debug(f"Client joint la zone: {zone_id}")
    
    def leave_session(self, session_id: str):
        """
        Permet à un client de quitter une session.
        
        Args:
            session_id: ID de la session à quitter
        """
        room = f"session_{session_id}"
        leave_room(room)
        logger.debug(f"Client quitte la session: {session_id}")
    
    def leave_zone(self, zone_id: int):
        """
        Permet à un client de quitter une zone.
        
        Args:
            zone_id: ID de la zone à quitter
        """
        room = f"zone_{zone_id}"
        leave_room(room)
        logger.debug(f"Client quitte la zone: {zone_id}")
    
    def cleanup_session(self, session_id: str):
        """
        Nettoie une session terminée.
        
        Args:
            session_id: ID de la session à nettoyer
        """
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]
            logger.debug(f"Session nettoyée: {session_id}")
    
    def get_session_status(self, session_id: str) -> Optional[Dict]:
        """
        Récupère le statut d'une session.
        
        Args:
            session_id: ID de la session
            
        Returns:
            Dictionnaire avec les informations de la session ou None
        """
        return self.active_sessions.get(session_id)
    
    def _get_timestamp(self) -> str:
        """Retourne un timestamp au format ISO."""
        from datetime import datetime
        return datetime.now().isoformat()

# Instance globale du service WebSocket
websocket_service = None

def init_websocket_service(socketio):
    """
    Initialise le service WebSocket avec l'instance SocketIO.
    
    Args:
        socketio: Instance Flask-SocketIO
    """
    global websocket_service
    websocket_service = WebSocketService(socketio)
    return websocket_service

def get_websocket_service() -> WebSocketService:
    """
    Récupère l'instance globale du service WebSocket.
    
    Returns:
        Instance du WebSocketService
    """
    global websocket_service
    if websocket_service is None:
        raise RuntimeError("WebSocket service not initialized. Call init_websocket_service() first.")
    return websocket_service 