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
            
            // Initialiser les valeurs par défaut
            if (!this.hasNextIdValue) {
                this.nextIdValue = 1;
            }
            
            // Créer un premier chat s'il n'y en a pas
            if (this.chatListTarget.children.length === 0) {
                this.addChat();
            }
            
            // Ajuster la position des onglets pour éviter le chevauchement
            this.adjustTabsPosition();
            
            // Écouter les changements de taille de la fenêtre
            window.addEventListener('resize', this.adjustTabsPosition.bind(this));
        }
        
        // Méthode pour ajuster la position des onglets
        adjustTabsPosition() {
            // Obtenir la largeur de la barre latérale
            const sidebarWidth = 48; // Largeur fixe de la barre latérale
            
            // Ajuster la largeur du conteneur d'onglets
            if (this.tabsTarget) {
                this.tabsTarget.style.paddingRight = `${sidebarWidth + 10}px`;
            }
        }

        addChat() {
            const chatId = this.nextIdValue;
            this.nextIdValue++;
            
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
            
            const textarea = activeChat.querySelector('.chat-input');
            const messagesContainer = activeChat.querySelector('.chat-messages');
            
            if (!textarea || !messagesContainer) return;
            
            const message = textarea.value.trim();
            if (message === '') return;
            
            // Ajouter le message de l'utilisateur
            const userMessageElement = document.createElement('div');
            userMessageElement.className = 'chat-message user';
            userMessageElement.innerHTML = `
                <div class="message-content">${this.escapeHtml(message)}</div>
            `;
            messagesContainer.appendChild(userMessageElement);
            
            // Effacer la zone de texte
            textarea.value = '';
            
            // Faire défiler vers le bas
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Simuler une réponse de l'IA (à remplacer par une vraie API)
            this.simulateAiResponse(messagesContainer, message);
        }
        
        simulateAiResponse(messagesContainer, userMessage) {
            // Ajouter un message "en cours de frappe"
            const typingElement = document.createElement('div');
            typingElement.className = 'chat-message system typing';
            typingElement.innerHTML = `
                <div class="message-content">
                    <div class="typing-indicator">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            `;
            messagesContainer.appendChild(typingElement);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Simuler un délai de réponse (1-2 secondes)
            setTimeout(() => {
                // Supprimer l'indicateur de frappe
                typingElement.remove();
                
                // Ajouter la réponse de l'IA
                const aiMessageElement = document.createElement('div');
                aiMessageElement.className = 'chat-message system';
                
                // Exemple de réponse simple (à remplacer par une vraie API)
                let aiResponse = "Je suis désolé, je ne peux pas traiter cette demande pour le moment.";
                
                if (userMessage.toLowerCase().includes('bonjour') || userMessage.toLowerCase().includes('salut')) {
                    aiResponse = "Bonjour ! Comment puis-je vous aider aujourd'hui ?";
                } else if (userMessage.toLowerCase().includes('merci')) {
                    aiResponse = "Je vous en prie ! N'hésitez pas si vous avez d'autres questions.";
                } else if (userMessage.toLowerCase().includes('geocache') || userMessage.toLowerCase().includes('cache')) {
                    aiResponse = "Je peux vous aider avec vos géocaches. Voulez-vous des informations sur une cache spécifique ?";
                }
                
                aiMessageElement.innerHTML = `
                    <div class="message-content">${this.escapeHtml(aiResponse)}</div>
                `;
                messagesContainer.appendChild(aiMessageElement);
                
                // Faire défiler vers le bas
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, Math.random() * 1000 + 1000); // Délai aléatoire entre 1 et 2 secondes
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