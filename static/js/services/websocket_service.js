/**
 * Service WebSocket pour la communication temps réel avec le serveur
 * 
 * Ce service fournit une API simple pour :
 * - Se connecter au serveur WebSocket
 * - Écouter les messages de progression d'opérations
 * - Gérer les salles (rooms) pour organiser les communications
 * - Afficher les notifications en temps réel
 */

class WebSocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.eventHandlers = new Map();
        this.debug = true; // Activer les logs pour le développement
        
        // Configuration par défaut
        this.config = {
            autoConnect: true,
            reconnectDelay: 3000,
            maxReconnectAttempts: 5
        };
        
        this.reconnectAttempts = 0;
        this.currentSessions = new Set();
        this.currentZones = new Set();
        
        // Auto-connexion si configurée → seulement après chargement de Socket.IO
        if (this.config.autoConnect) {
            this.ensureIo().then(() => this.connect());
        }
    }
    
    /**
     * S'assure que le client Socket.IO (io) est disponible, sinon le charge dynamiquement
     */
    ensureIo() {
        if (typeof io !== 'undefined') {
            return Promise.resolve(true);
        }
        return new Promise((resolve) => {
            try {
                const existing = document.querySelector('script[src*="/socket.io/socket.io.js"]');
                if (existing) {
                    existing.addEventListener('load', () => resolve(true));
                    existing.addEventListener('error', () => resolve(false));
                    return;
                }
                const s = document.createElement('script');
                s.src = '/socket.io/socket.io.js';
                s.onload = () => resolve(true);
                s.onerror = () => resolve(false);
                document.head.appendChild(s);
            } catch (e) {
                resolve(false);
            }
        });
    }
    
    /**
     * Se connecte au serveur WebSocket
     */
    connect() {
        if (this.socket && this.isConnected) {
            this.log('WebSocket déjà connecté');
            return;
        }
        
        if (typeof io === 'undefined') {
            this.log('Client Socket.IO non chargé; tentative de chargement…');
            this.ensureIo().then((ok) => {
                if (ok) {
                    this.connect();
                } else {
                    this.attemptReconnect();
                }
            });
            return;
        }
        
        try {
            // Initialiser Socket.IO
            this.socket = io({
                transports: ['websocket', 'polling'],
                upgrade: true,
                rememberUpgrade: true
            });
            
            // Gestionnaires d'événements de connexion
            this.socket.on('connect', () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.log('WebSocket connecté', this.socket.id);
                this.emit('websocket_connected');
                
                // Rejoindre toutes les sessions et zones actives
                this.rejoinRooms();
            });
            
            this.socket.on('disconnect', (reason) => {
                this.isConnected = false;
                this.log('WebSocket déconnecté', reason);
                this.emit('websocket_disconnected', reason);
                
                // Tentative de reconnexion automatique
                if (reason === 'io server disconnect') {
                    // Le serveur a fermé la connexion, reconnexion manuelle nécessaire
                    this.attemptReconnect();
                } else {
                    // Reconnexion automatique par Socket.IO
                }
            });
            
            this.socket.on('connect_error', (error) => {
                this.log('Erreur de connexion WebSocket', error);
                this.emit('websocket_error', error);
                this.attemptReconnect();
            });
            
            // Gestionnaires des messages métier
            this.socket.on('progress_update', (data) => {
                this.handleProgressUpdate(data);
            });
            
            this.socket.on('operation_complete', (data) => {
                this.handleOperationComplete(data);
            });
            
        } catch (error) {
            this.log('Erreur lors de la connexion WebSocket', error);
            this.attemptReconnect();
        }
    }
    
    /**
     * Déconnecte le WebSocket
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.log('WebSocket déconnecté manuellement');
        }
    }
    
    /**
     * Tente une reconnexion avec délai
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            this.log('Nombre maximum de tentatives de reconnexion atteint');
            this.emit('websocket_max_reconnect_reached');
            return;
        }
        
        this.reconnectAttempts++;
        this.log(`Tentative de reconnexion ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} dans ${this.config.reconnectDelay}ms`);
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.ensureIo().then(() => this.connect());
            }
        }, this.config.reconnectDelay);
    }
    
    /**
     * Rejoint toutes les salles précédemment actives
     */
    rejoinRooms() {
        // Rejoindre les sessions actives
        this.currentSessions.forEach(sessionId => {
            this.joinSession(sessionId);
        });
        
        // Rejoindre les zones actives
        this.currentZones.forEach(zoneId => {
            this.joinZone(zoneId);
        });
    }
    
    /**
     * Rejoint une session pour recevoir ses mises à jour
     */
    joinSession(sessionId) {
        if (!this.isConnected) {
            this.log('WebSocket non connecté, session sera rejointe à la connexion', sessionId);
            this.currentSessions.add(sessionId);
            return;
        }
        
        this.socket.emit('join_session', { session_id: sessionId });
        this.currentSessions.add(sessionId);
        this.log('Session rejointe', sessionId);
    }
    
    /**
     * Quitte une session
     */
    leaveSession(sessionId) {
        if (this.isConnected) {
            this.socket.emit('leave_session', { session_id: sessionId });
        }
        this.currentSessions.delete(sessionId);
        this.log('Session quittée', sessionId);
    }
    
    /**
     * Rejoint une zone pour recevoir toutes ses mises à jour
     */
    joinZone(zoneId) {
        if (!this.isConnected) {
            this.log('WebSocket non connecté, zone sera rejointe à la connexion', zoneId);
            this.currentZones.add(zoneId);
            return;
        }
        
        this.socket.emit('join_zone', { zone_id: zoneId });
        this.currentZones.add(zoneId);
        this.log('Zone rejointe', zoneId);
    }
    
    /**
     * Quitte une zone
     */
    leaveZone(zoneId) {
        if (this.isConnected) {
            this.socket.emit('leave_zone', { zone_id: zoneId });
        }
        this.currentZones.delete(zoneId);
        this.log('Zone quittée', zoneId);
    }
    
    /**
     * Gère les mises à jour de progression
     */
    handleProgressUpdate(data) {
        this.log('Mise à jour de progression reçue', data);
        
        // Émettre l'événement générique
        this.emit('progress_update', data);
        
        // Émettre des événements spécifiques par opération
        this.emit(`progress_${data.operation_type}`, data);
        
        // Émettre l'événement spécifique à la session
        this.emit(`session_${data.session_id}_progress`, data);
    }
    
    /**
     * Gère la fin des opérations (succès ou erreur)
     */
    handleOperationComplete(data) {
        this.log('Opération terminée', data);
        
        // Émettre l'événement générique
        this.emit('operation_complete', data);
        
        // Émettre des événements spécifiques par opération
        this.emit(`complete_${data.operation_type}`, data);
        
        // Émettre l'événement spécifique à la session
        this.emit(`session_${data.session_id}_complete`, data);
        
        // Nettoyer la session si nécessaire
        setTimeout(() => {
            this.leaveSession(data.session_id);
        }, 5000); // Délai de 5 secondes avant de quitter la session
    }
    
    /**
     * Ajoute un gestionnaire d'événement
     */
    on(eventName, handler) {
        if (!this.eventHandlers.has(eventName)) {
            this.eventHandlers.set(eventName, []);
        }
        this.eventHandlers.get(eventName).push(handler);
        this.log('Gestionnaire d\'événement ajouté', eventName);
    }
    
    /**
     * Retire un gestionnaire d'événement
     */
    off(eventName, handler) {
        if (this.eventHandlers.has(eventName)) {
            const handlers = this.eventHandlers.get(eventName);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
                this.log('Gestionnaire d\'événement retiré', eventName);
            }
        }
    }
    
    /**
     * Émet un événement vers tous les gestionnaires correspondants
     */
    emit(eventName, data = null) {
        if (this.eventHandlers.has(eventName)) {
            this.eventHandlers.get(eventName).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    this.log('Erreur dans le gestionnaire d\'événement', eventName, error);
                }
            });
        }
    }
    
    /**
     * Utilitaire de logging avec option debug
     */
    log(...args) {
        if (this.debug) {
            console.log('[WebSocket]', ...args);
        }
    }
    
    /**
     * Retourne l'état de la connexion
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            socketId: this.socket?.id,
            activeSessions: Array.from(this.currentSessions),
            activeZones: Array.from(this.currentZones),
            reconnectAttempts: this.reconnectAttempts
        };
    }
}

// Instance globale du service WebSocket
window.webSocketService = new WebSocketService();

// Interface de convenance pour faciliter l'utilisation
window.wsService = window.webSocketService;

// Exporter pour les modules ES6 si nécessaire
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebSocketService;
} 