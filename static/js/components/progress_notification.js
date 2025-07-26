/**
 * Composant de notification de progression en temps réel
 * 
 * Ce composant affiche des notifications élégantes pour suivre le progrès
 * des opérations longues via WebSocket.
 */

class ProgressNotification {
    constructor(options = {}) {
        this.options = {
            containerId: 'progress-notifications',
            position: 'top-right', // top-right, top-left, bottom-right, bottom-left
            maxNotifications: 5,
            autoRemove: true,
            autoRemoveDelay: 5000,
            showProgress: true,
            showTimestamp: false,
            theme: 'dark', // dark, light
            ...options
        };
        
        this.notifications = new Map();
        this.container = null;
        this.init();
    }
    
    /**
     * Initialise le composant
     */
    init() {
        this.createContainer();
        this.attachStyles();
        
        // Écouter les événements WebSocket
        if (window.wsService) {
            window.wsService.on('progress_update', (data) => {
                this.updateProgress(data);
            });
            
            window.wsService.on('operation_complete', (data) => {
                this.completeOperation(data);
            });
        }
    }
    
    /**
     * Crée le conteneur des notifications
     */
    createContainer() {
        // Chercher le conteneur existant
        this.container = document.getElementById(this.options.containerId);
        
        if (!this.container) {
            // Créer le conteneur s'il n'existe pas
            this.container = document.createElement('div');
            this.container.id = this.options.containerId;
            this.container.className = `progress-notifications ${this.options.position} ${this.options.theme}`;
            document.body.appendChild(this.container);
        }
    }
    
    /**
     * Ajoute les styles CSS
     */
    attachStyles() {
        if (document.getElementById('progress-notification-styles')) {
            return; // Styles déjà ajoutés
        }
        
        const style = document.createElement('style');
        style.id = 'progress-notification-styles';
        style.textContent = `
            .progress-notifications {
                position: fixed;
                z-index: 10000;
                max-width: 400px;
                pointer-events: none;
            }
            
            .progress-notifications.top-right {
                top: 20px;
                right: 20px;
            }
            
            .progress-notifications.top-left {
                top: 20px;
                left: 20px;
            }
            
            .progress-notifications.bottom-right {
                bottom: 20px;
                right: 20px;
            }
            
            .progress-notifications.bottom-left {
                bottom: 20px;
                left: 20px;
            }
            
            .progress-notification {
                background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
                border: 1px solid #4b5563;
                border-radius: 12px;
                margin-bottom: 10px;
                padding: 16px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(10px);
                pointer-events: auto;
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
                min-width: 320px;
            }
            
            .progress-notification.show {
                transform: translateX(0);
                opacity: 1;
            }
            
            .progress-notification.hide {
                transform: translateX(100%);
                opacity: 0;
                margin-bottom: 0;
                padding: 0;
                min-height: 0;
            }
            
            .progress-notification.light {
                background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
                border-color: #e5e7eb;
                color: #111827;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            }
            
            .progress-notification-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }
            
            .progress-notification-title {
                font-weight: 600;
                color: #f3f4f6;
                font-size: 14px;
                display: flex;
                align-items: center;
            }
            
            .progress-notification.light .progress-notification-title {
                color: #111827;
            }
            
            .progress-notification-icon {
                width: 16px;
                height: 16px;
                margin-right: 8px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }
            
            .progress-notification-close {
                background: none;
                border: none;
                color: #9ca3af;
                cursor: pointer;
                padding: 2px;
                border-radius: 4px;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            
            .progress-notification-close:hover {
                background: rgba(75, 85, 99, 0.3);
                color: #f3f4f6;
            }
            
            .progress-notification.light .progress-notification-close:hover {
                background: rgba(0, 0, 0, 0.1);
                color: #111827;
            }
            
            .progress-notification-message {
                color: #d1d5db;
                font-size: 13px;
                line-height: 1.4;
                margin-bottom: 12px;
            }
            
            .progress-notification.light .progress-notification-message {
                color: #6b7280;
            }
            
            .progress-notification-progress {
                background: #374151;
                border-radius: 8px;
                height: 6px;
                overflow: hidden;
                margin-bottom: 8px;
                position: relative;
            }
            
            .progress-notification.light .progress-notification-progress {
                background: #e5e7eb;
            }
            
            .progress-notification-progress-bar {
                background: linear-gradient(90deg, #3b82f6, #1d4ed8);
                height: 100%;
                border-radius: 8px;
                transition: width 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            
            .progress-notification-progress-bar::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                bottom: 0;
                right: 0;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                animation: progress-shimmer 2s infinite;
            }
            
            @keyframes progress-shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
            
            .progress-notification-progress-text {
                font-size: 11px;
                color: #9ca3af;
                text-align: right;
                margin-top: 4px;
            }
            
            .progress-notification.light .progress-notification-progress-text {
                color: #6b7280;
            }
            
            .progress-notification-timestamp {
                font-size: 10px;
                color: #6b7280;
                opacity: 0.7;
            }
            
            .progress-notification.success {
                border-color: #10b981;
            }
            
            .progress-notification.success .progress-notification-progress-bar {
                background: linear-gradient(90deg, #10b981, #059669);
            }
            
            .progress-notification.error {
                border-color: #ef4444;
            }
            
            .progress-notification.error .progress-notification-progress-bar {
                background: linear-gradient(90deg, #ef4444, #dc2626);
            }
            
            .progress-notification-step {
                font-size: 11px;
                color: #9ca3af;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
                font-weight: 500;
            }
            
            .progress-notification.light .progress-notification-step {
                color: #6b7280;
            }
            
            /* Animation d'entrée */
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            /* Animation de sortie */
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Met à jour la progression d'une opération
     */
    updateProgress(data) {
        const sessionId = data.session_id;
        let notification = this.notifications.get(sessionId);
        
        if (!notification) {
            notification = this.createNotification(data);
            this.notifications.set(sessionId, notification);
        }
        
        this.updateNotificationContent(notification, data);
        this.limitNotifications();
    }
    
    /**
     * Crée une nouvelle notification
     */
    createNotification(data) {
        const notification = document.createElement('div');
        notification.className = `progress-notification ${this.options.theme}`;
        notification.dataset.sessionId = data.session_id;
        
        notification.innerHTML = `
            <div class="progress-notification-header">
                <div class="progress-notification-title">
                    <div class="progress-notification-icon">
                        ${this.getOperationIcon(data.operation_type)}
                    </div>
                    ${this.getOperationTitle(data.operation_type)}
                </div>
                <button class="progress-notification-close" title="Fermer">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M6 4.586L9.293 1.293a1 1 0 011.414 1.414L7.414 6l3.293 3.293a1 1 0 01-1.414 1.414L6 7.414l-3.293 3.293a1 1 0 01-1.414-1.414L4.586 6 1.293 2.707a1 1 0 011.414-1.414L6 4.586z"/>
                    </svg>
                </button>
            </div>
            <div class="progress-notification-step"></div>
            <div class="progress-notification-message"></div>
            ${this.options.showProgress ? `
                <div class="progress-notification-progress">
                    <div class="progress-notification-progress-bar" style="width: 0%"></div>
                </div>
                <div class="progress-notification-progress-text">0%</div>
            ` : ''}
            ${this.options.showTimestamp ? '<div class="progress-notification-timestamp"></div>' : ''}
        `;
        
        // Gestionnaire de fermeture
        const closeBtn = notification.querySelector('.progress-notification-close');
        closeBtn.addEventListener('click', () => {
            this.removeNotification(data.session_id);
        });
        
        this.container.appendChild(notification);
        
        // Animation d'entrée
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        return notification;
    }
    
    /**
     * Met à jour le contenu d'une notification
     */
    updateNotificationContent(notification, data) {
        const stepElement = notification.querySelector('.progress-notification-step');
        const messageElement = notification.querySelector('.progress-notification-message');
        const progressBar = notification.querySelector('.progress-notification-progress-bar');
        const progressText = notification.querySelector('.progress-notification-progress-text');
        const timestampElement = notification.querySelector('.progress-notification-timestamp');
        
        if (stepElement) {
            stepElement.textContent = data.step?.toUpperCase() || '';
        }
        
        if (messageElement) {
            messageElement.textContent = data.message;
        }
        
        if (progressBar && data.progress !== null && data.progress !== undefined) {
            progressBar.style.width = `${data.progress}%`;
        }
        
        if (progressText && data.progress !== null && data.progress !== undefined) {
            progressText.textContent = `${data.progress}%`;
        }
        
        if (timestampElement) {
            timestampElement.textContent = new Date(data.timestamp).toLocaleTimeString();
        }
    }
    
    /**
     * Complète une opération (succès ou erreur)
     */
    completeOperation(data) {
        const notification = this.notifications.get(data.session_id);
        if (!notification) return;
        
        // Mettre à jour le style selon le statut
        if (data.status === 'success') {
            notification.classList.add('success');
        } else if (data.status === 'error') {
            notification.classList.add('error');
        }
        
        // Mettre à jour le contenu final
        this.updateNotificationContent(notification, {
            ...data,
            step: data.status === 'success' ? 'terminé' : 'erreur',
            progress: data.status === 'success' ? 100 : null
        });
        
        // Auto-suppression si activée
        if (this.options.autoRemove) {
            setTimeout(() => {
                this.removeNotification(data.session_id);
            }, this.options.autoRemoveDelay);
        }
    }
    
    /**
     * Supprime une notification
     */
    removeNotification(sessionId) {
        const notification = this.notifications.get(sessionId);
        if (!notification) return;
        
        notification.classList.add('hide');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications.delete(sessionId);
        }, 300);
    }
    
    /**
     * Limite le nombre de notifications affichées
     */
    limitNotifications() {
        const notificationElements = this.container.querySelectorAll('.progress-notification');
        if (notificationElements.length > this.options.maxNotifications) {
            const oldestNotification = notificationElements[0];
            const sessionId = oldestNotification.dataset.sessionId;
            this.removeNotification(sessionId);
        }
    }
    
    /**
     * Retourne l'icône pour un type d'opération
     */
    getOperationIcon(operationType) {
        const icons = {
            'add_geocache': `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2a6 6 0 100 12A6 6 0 008 2zM7 7V5a1 1 0 112 0v2h2a1 1 0 110 2H9v2a1 1 0 11-2 0V9H5a1 1 0 110-2h2z"/>
            </svg>`,
            'import_gpx': `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 2a1 1 0 000 2h10a1 1 0 100-2H3zM3 6a1 1 0 000 2h4a1 1 0 100-2H3zM3 10a1 1 0 100 2h10a1 1 0 100-2H3z"/>
            </svg>`,
            'default': `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2a6 6 0 100 12A6 6 0 008 2z"/>
            </svg>`
        };
        
        return icons[operationType] || icons.default;
    }
    
    /**
     * Retourne le titre pour un type d'opération
     */
    getOperationTitle(operationType) {
        const titles = {
            'add_geocache': 'Ajout de géocache',
            'import_gpx': 'Import GPX',
            'default': 'Opération en cours'
        };
        
        return titles[operationType] || titles.default;
    }
    
    /**
     * Nettoie toutes les notifications
     */
    clearAll() {
        this.notifications.forEach((notification, sessionId) => {
            this.removeNotification(sessionId);
        });
    }
}

// Instance globale du composant de notification
window.progressNotification = new ProgressNotification();

// Exporter pour les modules ES6 si nécessaire
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgressNotification;
} 