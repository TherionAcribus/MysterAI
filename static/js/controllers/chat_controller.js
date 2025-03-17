/**
 * Contrôleur Stimulus pour gérer les chats IA multiples
 */
(function() {
    class ChatController extends Stimulus.Controller {
        static targets = ["container", "tabs", "chatList", "addButton", "activeChat"];
        static values = {
            nextId: Number,
            activeId: Number
        };

        connect() {
            console.log('=== DEBUG: ChatController connecté ===');
            
            // Vérifier que toutes les cibles requises sont disponibles
            if (!this.hasRequiredTargets()) {
                console.error('=== DEBUG: ChatController - cibles requises non disponibles ===');
                return;
            }
            
            // Initialiser les valeurs par défaut
            if (!this.hasNextIdValue) {
                this.nextIdValue = 1;
            }
            
            // Initialiser l'objet conversations
            this.conversations = {};
            
            // Créer un premier chat s'il n'y en a pas
            if (this.chatListTarget.children.length === 0) {
                this.addChat();
            }
            
            // Ajuster la position des onglets pour éviter le chevauchement
            this.adjustTabsPosition();
            
            // Écouter les changements de taille de la fenêtre
            window.addEventListener('resize', this.adjustTabsPosition.bind(this));
            
            // Écouter les changements de modèle d'IA
            window.addEventListener('aiModelChanged', this.handleAIModelChanged.bind(this));
            
            // Exposer les méthodes publiques pour l'accès externe
            this.element.addChat = this.addChat.bind(this);
            this.element.switchToChat = this.switchToChat.bind(this);
        }
        
        /**
         * Vérifie si toutes les cibles requises sont disponibles
         */
        hasRequiredTargets() {
            return this.hasTabsTarget && this.hasChatListTarget && this.hasAddButtonTarget;
        }
        
        // Méthode pour ajuster la position des onglets
        adjustTabsPosition() {
            if (!this.hasTabsTarget) return;
            
            // Obtenir la largeur de la barre latérale
            const sidebarWidth = 48; // Largeur fixe de la barre latérale
            
            // Ajuster la largeur du conteneur d'onglets
            this.tabsTarget.style.paddingRight = `${sidebarWidth + 10}px`;
        }

        addChat() {
            if (!this.hasRequiredTargets()) return;
            
            const chatId = this.hasNextIdValue ? this.nextIdValue : 1;
            
            // Mettre à jour la valeur nextId
            if (this.hasNextIdValue) {
                this.nextIdValue = chatId + 1;
            }
            
            // Créer un nouvel onglet
            const tabButton = document.createElement('button');
            tabButton.className = 'chat-tab';
            tabButton.dataset.chatId = chatId;
            tabButton.dataset.action = 'click->chat#switchChat';
            tabButton.innerHTML = `
                <i class="fas fa-comments"></i>
                <span class="chat-tab-label">Chat ${chatId}</span>
            `;
            this.tabsTarget.insertBefore(tabButton, this.addButtonTarget);
            
            // Créer un nouveau conteneur de chat
            const chatContainer = document.createElement('div');
            chatContainer.className = 'chat-instance';
            chatContainer.dataset.chatId = chatId;
            chatContainer.innerHTML = `
                <div class="chat-header">
                    <h2 class="text-sm font-semibold mb-2">CHAT IA #${chatId}</h2>
                    <button class="chat-close-button" data-action="click->chat#closeChat" data-chat-id="${chatId}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="chat-messages">
                    <!-- Les messages du chat apparaîtront ici -->
                    <div class="chat-message system">
                        <div class="message-content">
                            Bonjour, je suis votre assistant IA. Comment puis-je vous aider aujourd'hui?
                        </div>
                    </div>
                </div>
                <div class="chat-input-container">
                    <textarea class="chat-input" rows="3" placeholder="Tapez votre message..." 
                              data-action="keydown->chat#handleKeydown"></textarea>
                    <button class="chat-send-button" data-action="click->chat#sendMessage">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            `;
            this.chatListTarget.appendChild(chatContainer);
            
            // Initialiser la conversation pour ce chat
            if (!this.conversations) {
                this.conversations = {};
            }
            
            this.conversations[chatId] = [
                {
                    role: "assistant",
                    content: "Bonjour, je suis votre assistant IA. Comment puis-je vous aider aujourd'hui?"
                }
            ];
            
            // Activer ce nouveau chat
            this.switchToChat(chatId);
            
            // Ajuster la position des onglets après l'ajout
            this.adjustTabsPosition();
            
            return chatId;
        }
        
        switchChat(event) {
            const chatId = parseInt(event.currentTarget.dataset.chatId);
            this.switchToChat(chatId);
        }
        
        switchToChat(chatId) {
            // Désactiver tous les onglets et chats
            this.tabsTarget.querySelectorAll('.chat-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            this.chatListTarget.querySelectorAll('.chat-instance').forEach(chat => {
                chat.classList.remove('active');
            });
            
            // Activer l'onglet et le chat sélectionnés
            const selectedTab = this.tabsTarget.querySelector(`.chat-tab[data-chat-id="${chatId}"]`);
            const selectedChat = this.chatListTarget.querySelector(`.chat-instance[data-chat-id="${chatId}"]`);
            
            if (selectedTab && selectedChat) {
                selectedTab.classList.add('active');
                selectedChat.classList.add('active');
                this.activeIdValue = chatId;
                
                // Mettre le focus sur la zone de texte
                const textarea = selectedChat.querySelector('.chat-input');
                if (textarea) {
                    setTimeout(() => textarea.focus(), 0);
                }
                
                // Stocker une référence au chat actif
                if (this.hasActiveChatTarget) {
                    this.activeChatTarget.value = chatId;
                }
            }
        }
        
        closeChat(event) {
            const chatId = parseInt(event.currentTarget.dataset.chatId);
            
            // Supprimer l'onglet et le conteneur
            const tabToRemove = this.tabsTarget.querySelector(`.chat-tab[data-chat-id="${chatId}"]`);
            const chatToRemove = this.chatListTarget.querySelector(`.chat-instance[data-chat-id="${chatId}"]`);
            
            if (tabToRemove && chatToRemove) {
                // Vérifier si c'est le chat actif
                const isActive = tabToRemove.classList.contains('active');
                
                // Supprimer les éléments
                tabToRemove.remove();
                chatToRemove.remove();
                
                // Supprimer la conversation
                delete this.conversations[chatId];
                
                // S'il n'y a plus de chats, en créer un nouveau
                if (this.chatListTarget.children.length === 0) {
                    this.addChat();
                    return;
                }
                
                // Si c'était le chat actif, activer le premier chat disponible
                if (isActive) {
                    const firstChatId = parseInt(this.chatListTarget.querySelector('.chat-instance').dataset.chatId);
                    this.switchToChat(firstChatId);
                }
                
                // Ajuster la position des onglets après la suppression
                this.adjustTabsPosition();
            }
        }
        
        handleKeydown(event) {
            // Envoyer le message avec Ctrl+Enter ou Cmd+Enter
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                this.sendMessage(event);
            }
        }
        
        sendMessage(event) {
            // Trouver le chat actif
            const activeChat = this.chatListTarget.querySelector('.chat-instance.active');
            if (!activeChat) return;
            
            const chatId = parseInt(activeChat.dataset.chatId);
            const textarea = activeChat.querySelector('.chat-input');
            const messagesContainer = activeChat.querySelector('.chat-messages');
            
            if (!textarea || !messagesContainer) return;
            
            const message = textarea.value.trim();
            if (message === '') return;
            
            // Ajouter le message de l'utilisateur à l'interface
            const userMessageElement = document.createElement('div');
            userMessageElement.className = 'chat-message user';
            userMessageElement.innerHTML = `
                <div class="message-content">${this.escapeHtml(message)}</div>
            `;
            messagesContainer.appendChild(userMessageElement);
            
            // Ajouter le message à la conversation
            this.conversations[chatId].push({
                role: "user",
                content: message
            });
            
            // Effacer la zone de texte
            textarea.value = '';
            
            // Faire défiler vers le bas
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Ajouter un message "en cours de frappe"
            const typingElement = document.createElement('div');
            typingElement.className = 'chat-message system typing';
            typingElement.innerHTML = `
                <div class="message-content">
                    <div class="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            `;
            messagesContainer.appendChild(typingElement);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Récupérer le modèle actif
            const activeModel = document.getElementById('ai-model-selector')?.value || null;
            
            // Envoyer la requête à l'API
            fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: this.conversations[chatId],
                    model_id: activeModel,
                    use_tools: true  // Activer l'utilisation des outils
                })
            })
            .then(response => response.json())
            .then(data => {
                // Supprimer l'indicateur de frappe
                const typingIndicator = messagesContainer.querySelector('.typing');
                if (typingIndicator) {
                    typingIndicator.remove();
                }
                
                if (data.success) {
                    // Ajouter la réponse à l'interface
                    const responseElement = document.createElement('div');
                    responseElement.className = 'chat-message system';
                    
                    // Formater la réponse avec Markdown si nécessaire
                    let formattedResponse = this.escapeHtml(data.response);
                    
                    // Remplacer les blocs de code
                    formattedResponse = formattedResponse.replace(/```(\w*)([\s\S]*?)```/g, (match, language, code) => {
                        return `<pre class="code-block ${language}"><code>${this.escapeHtml(code.trim())}</code></pre>`;
                    });
                    
                    // Remplacer les lignes de code inline
                    formattedResponse = formattedResponse.replace(/`([^`]+)`/g, '<code>$1</code>');
                    
                    // Remplacer les sauts de ligne
                    formattedResponse = formattedResponse.replace(/\n/g, '<br>');
                    
                    // Ajouter le badge du modèle si disponible
                    let modelBadge = '';
                    if (data.model_used) {
                        modelBadge = `<div class="model-badge">${data.model_used}</div>`;
                    }
                    
                    // Ajouter le badge LangGraph si utilisé
                    let langGraphBadge = '';
                    if (data.used_langgraph) {
                        langGraphBadge = `<div class="langgraph-badge">LangGraph</div>`;
                    }
                    
                    responseElement.innerHTML = `
                        <div class="message-content">
                            ${formattedResponse}
                        </div>
                        <div class="message-badges">
                            ${modelBadge}
                            ${langGraphBadge}
                        </div>
                    `;
                    
                    messagesContainer.appendChild(responseElement);
                    
                    // Ajouter la réponse à la conversation
                    this.conversations[chatId].push({
                        role: "assistant",
                        content: data.response
                    });
                    
                    // Vérifier s'il y a des appels d'outils dans la réponse
                    if (data.response.includes("Je vais utiliser un outil") || 
                        data.response.includes("J'utilise l'outil") ||
                        data.response.includes("Résultat de ")) {
                        
                        // Ajouter un badge d'outil
                        const toolBadge = document.createElement('div');
                        toolBadge.className = 'tool-badge';
                        toolBadge.textContent = 'Outil utilisé';
                        responseElement.querySelector('.message-badges').appendChild(toolBadge);
                    }
                } else {
                    // Afficher l'erreur
                    const errorElement = document.createElement('div');
                    errorElement.className = 'chat-message error';
                    errorElement.innerHTML = `
                        <div class="message-content">
                            Erreur: ${data.error || 'Une erreur est survenue lors de la communication avec l\'IA.'}
                        </div>
                    `;
                    messagesContainer.appendChild(errorElement);
                }
                
                // Faire défiler vers le bas
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            })
            .catch(error => {
                // Supprimer l'indicateur de frappe
                const typingIndicator = messagesContainer.querySelector('.typing');
                if (typingIndicator) {
                    typingIndicator.remove();
                }
                
                // Afficher l'erreur
                const errorElement = document.createElement('div');
                errorElement.className = 'chat-message error';
                errorElement.innerHTML = `
                    <div class="message-content">
                        Erreur de connexion: ${error.message}
                    </div>
                `;
                messagesContainer.appendChild(errorElement);
                
                // Faire défiler vers le bas
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            });
        }
        
        /**
         * Gère le changement de modèle d'IA
         * @param {CustomEvent} event - L'événement contenant les détails du modèle
         */
        handleAIModelChanged(event) {
            const modelId = event.detail.modelId;
            const modelName = event.detail.modelName;
            
            // Ajouter un message système dans tous les chats actifs
            this.chatListTarget.querySelectorAll('.chat-instance').forEach(chatInstance => {
                const chatId = parseInt(chatInstance.dataset.chatId);
                const messagesContainer = chatInstance.querySelector('.chat-messages');
                
                if (messagesContainer) {
                    // Créer le message de notification
                    const notificationElement = document.createElement('div');
                    notificationElement.className = 'chat-message system model-change';
                    notificationElement.innerHTML = `
                        <div class="message-content">
                            <i class="fas fa-exchange-alt"></i> Modèle d'IA changé pour: <strong>${modelName}</strong>
                        </div>
                    `;
                    messagesContainer.appendChild(notificationElement);
                    
                    // Faire défiler vers le bas
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            });
        }
        
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }

    // Enregistrer le contrôleur avec Stimulus
    window.application.register('chat', ChatController);
})(); 