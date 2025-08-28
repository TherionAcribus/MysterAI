/**
 * Contrôleur Stimulus pour gérer les chats IA multiples
 */
(() => {
    // S'assurer que Stimulus est disponible globalement
    if (!window.Stimulus) {
        console.error("Stimulus n'est pas disponible globalement");
        return;
    }
    
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
            
            // Initialiser nextId en fonction des chats existants
            const existingIds = Array.from(this.chatListTarget.querySelectorAll('.chat-instance'))
                .map(n => parseInt(n.dataset.chatId))
                .filter(n => !isNaN(n));
            const maxExistingId = existingIds.length ? Math.max(...existingIds) : 0;
            if (!this.hasNextIdValue || (this.hasNextIdValue && this.nextIdValue <= maxExistingId)) {
                this.nextIdValue = maxExistingId + 1;
            }
            console.log('=== DEBUG: nextIdValue initialisé à ===', this.nextIdValue);
            
            // Initialiser l'objet conversations
            this.conversations = {};
            
            // Ne pas créer automatiquement un chat au chargement
            // Le premier chat sera créé à la demande (bouton + ou openGeocacheAIChat)
            
            // Ajuster la position des onglets pour éviter le chevauchement
            this.adjustTabsPosition();
            
            // Écouter les changements de taille de la fenêtre
            window.addEventListener('resize', this.adjustTabsPosition.bind(this));
            
            // Écouter les changements de modèle d'IA
            window.addEventListener('aiModelChanged', this.handleAIModelChanged.bind(this));
            
            // Exposer les méthodes publiques pour l'accès externe
            this.element.addChat = this.addChat.bind(this);
            this.element.switchToChat = this.switchToChat.bind(this);
            this.element.setWelcomeForChat = this.setWelcomeForChat.bind(this);
            this.element.addContextMessage = this.addContextMessage.bind(this);
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

        #notifyPipelineChanged(chatContainer, label) {
            try {
                const messagesContainer = chatContainer.querySelector('.chat-messages');
                if (!messagesContainer) return;
                const info = document.createElement('div');
                info.className = 'chat-message system';
                info.innerHTML = `
                    <div class="message-content">
                        Pipeline sélectionné: <strong>${this.escapeHtml(label)}</strong>
                    </div>
                `;
                messagesContainer.appendChild(info);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            } catch (e) {}
        }

        addChat() {
            if (!this.hasRequiredTargets()) return;
            
            // Garantir l'unicité de l'ID basé sur le DOM actuel
            const existingIds = Array.from(this.chatListTarget.querySelectorAll('.chat-instance'))
                .map(n => parseInt(n.dataset.chatId))
                .filter(n => !isNaN(n));
            const maxExistingId = existingIds.length ? Math.max(...existingIds) : 0;
            if (!this.hasNextIdValue || this.nextIdValue <= maxExistingId) {
                this.nextIdValue = maxExistingId + 1;
            }
            const chatId = this.nextIdValue;
            
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
                    <div class="flex items-center space-x-2">
                        <label class="text-xs text-gray-400">Pipeline</label>
                        <select class="chat-pipeline-selector bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600">
                            <option value="">(par défaut)</option>
                        </select>
                        <label class="text-xs text-gray-400 ml-2 flex items-center space-x-1" title="Activer le streaming (tokens en direct)">
                            <input type="checkbox" class="chat-toggle-stream" />
                            <span>Streaming</span>
                        </label>
                        <label class="text-xs text-gray-400 ml-1 flex items-center space-x-1" title="Afficher la réflexion (si disponible)">
                            <input type="checkbox" class="chat-toggle-thinking" />
                            <span>Réflexion</span>
                        </label>
                        <button class="chat-images-toggle bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600" title="Sélectionner des images" data-action="click->chat#toggleImages">
                            <i class="fas fa-image"></i> Images
                        </button>
                    </div>
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
                <div class="chat-status-row flex items-center mt-1">
                    <div class="chat-progress text-2xs text-gray-400 flex-1 hidden"></div>
                    <button class="chat-stop bg-red-700 hover:bg-red-600 text-white text-xs rounded px-2 py-1 border border-red-600 ml-2 hidden" title="Arrêter la génération" data-action="click->chat#stopGeneration">
                        <i class="fas fa-stop"></i> Stop
                    </button>
                </div>
                <div class="chat-image-picker hidden">
                    <div class="text-xs text-gray-300 mb-2">Sélectionnez les images pertinentes à envoyer au modèle (facultatif)</div>
                    <div class="image-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:8px;"></div>
                    <div class="text-xs text-gray-400 mt-2"><span class="selected-count">0</span> image(s) sélectionnée(s)</div>
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

            // Charger la liste des pipelines pour le sélecteur
            const selector = chatContainer.querySelector('.chat-pipeline-selector');
            if (selector) {
                fetch('/api/ai/pipelines')
                    .then(r => r.json())
                    .then(data => {
                        if (data && data.success && Array.isArray(data.pipelines)) {
                            // Cache pipelines côté client pour usage ultérieur
                            window.__pipelinesCache = data.pipelines;
                            window.__pipelinesMap = (data.pipelines || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
                            if (!window.__pipelineDefaultUserPrompts) window.__pipelineDefaultUserPrompts = {};
                            data.pipelines.forEach(p => {
                                const opt = document.createElement('option');
                                opt.value = p.id;
                                opt.textContent = p.name || p.id;
                                selector.appendChild(opt);
                                if (p.user_default_prompt) {
                                    window.__pipelineDefaultUserPrompts[p.id] = p.user_default_prompt;
                                }
                            });
                            // Préselect pipeline si le chat a un dataset
                            if (chatContainer.dataset.pipelineId) {
                                selector.value = chatContainer.dataset.pipelineId;
                            }
                            // Pré-remplir la zone de saisie avec message standard (pipeline ou fallback)
                            const textarea = chatContainer.querySelector('.chat-input');
                            if (textarea) {
                                const sel = selector.value || '';
                                const prompts = window.__pipelineDefaultUserPrompts || {};
                                const fallback = "Merci d'analyser cette géocache en appliquant le pipeline sélectionné (classification → plan/outils → vérification).";
                                textarea.value = sel && prompts[sel] ? prompts[sel] : fallback;
                            }
                        }
                    })
                    .catch(() => {});

                // Persister le choix dans dataset
                selector.addEventListener('change', () => {
                    const val = selector.value || '';
                    if (val) {
                        chatContainer.dataset.pipelineId = val;
                    } else {
                        delete chatContainer.dataset.pipelineId;
                    }
                    // Notifier dans l'UI
                    const label = selector.options[selector.selectedIndex]?.text || (val || '(par défaut)');
                    this.#notifyPipelineChanged(chatContainer, label);
                    // Mettre à jour le message par défaut dans le textarea
                    const textarea = chatContainer.querySelector('.chat-input');
                    if (textarea) {
                        const prompts = window.__pipelineDefaultUserPrompts || {};
                        const fallback = "Merci d'analyser cette géocache en appliquant le pipeline sélectionné (classification → plan/outils → vérification).";
                        textarea.value = val && prompts[val] ? prompts[val] : fallback;
                    }
                });
            }
            
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

        toggleImages(event) {
            // Trouver le chat actif
            const activeChat = this.chatListTarget.querySelector('.chat-instance.active');
            if (!activeChat) return;
            const picker = activeChat.querySelector('.chat-image-picker');
            if (!picker) return;
            const wasHidden = picker.classList.contains('hidden');
            picker.classList.toggle('hidden');
            if (wasHidden) {
                // Charger les images si pas encore chargées
                if (!activeChat.dataset.imagesLoaded) {
                    const geocacheId = activeChat.dataset.geocacheId;
                    const grid = picker.querySelector('.image-grid');
                    const countEl = picker.querySelector('.selected-count');
                    if (!geocacheId) {
                        if (grid) grid.innerHTML = '<div class="text-xs text-gray-400">Ce chat n\'est pas lié à une géocache. Ouvrez le chat depuis une fiche géocache pour sélectionner des images.</div>';
                        if (countEl) countEl.textContent = '0';
                        return;
                    }
                    this.loadImagesForChat(activeChat);
                }
            }
        }

        async loadImagesForChat(chatContainer) {
            try {
                const geocacheId = chatContainer.dataset.geocacheId;
                if (!geocacheId) return;
                const resp = await fetch(`/api/geocaches/${geocacheId}/images`);
                if (!resp.ok) {
                    const grid = chatContainer.querySelector('.chat-image-picker .image-grid');
                    const countEl = chatContainer.querySelector('.chat-image-picker .selected-count');
                    if (grid) grid.innerHTML = '<div class="text-xs text-red-400">Erreur HTTP lors du chargement des images.</div>';
                    if (countEl) countEl.textContent = '0';
                    return;
                }
                const data = await resp.json();
                const grid = chatContainer.querySelector('.chat-image-picker .image-grid');
                const countEl = chatContainer.querySelector('.chat-image-picker .selected-count');
                if (!data.success || !Array.isArray(data.images)) {
                    if (grid) grid.innerHTML = '<div class="text-xs text-red-400">Erreur lors du chargement des images.</div>';
                    if (countEl) countEl.textContent = '0';
                    return;
                }
                if (!grid) return;
                grid.innerHTML = '';
                // Préserver sélection précédente
                const selectedSet = new Set((chatContainer.dataset.selectedImages ? JSON.parse(chatContainer.dataset.selectedImages) : []));
                if (data.images.length === 0) {
                    grid.innerHTML = '<div class="text-xs text-gray-400">Aucune image trouvée pour cette géocache.</div>';
                    if (countEl) countEl.textContent = '0';
                }
                data.images.forEach(img => {
                    const wrap = document.createElement('div');
                    wrap.className = 'image-thumb';
                    wrap.innerHTML = `
                        <label style="display:block;cursor:pointer;">
                            <input type="checkbox" class="image-select" data-url="${this.escapeHtml(img.url)}" style="display:none;">
                            <div style="position:relative;border:1px solid #444;border-radius:6px;overflow:hidden;">
                                <img src="${this.escapeHtml(img.url)}" alt="${this.escapeHtml(img.name || '')}" style="width:100%;height:72px;object-fit:cover;display:block;">
                                <div class="check-overlay" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.6);color:#fff;border-radius:9999px;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:12px;opacity:0;transition:opacity .15s;">✓</div>
                            </div>
                            <div class="text-2xs text-gray-400 mt-1 truncate" title="${this.escapeHtml(img.name || '')}">${this.escapeHtml(img.name || '')}</div>
                        </label>
                    `;
                    const checkbox = wrap.querySelector('.image-select');
                    const overlay = wrap.querySelector('.check-overlay');
                    if (selectedSet.has(img.url)) {
                        checkbox.checked = true;
                        if (overlay) overlay.style.opacity = '1';
                    }
                    wrap.addEventListener('click', (e) => {
                        // éviter double toggle si clic sur input
                        if (e.target && e.target.classList && e.target.classList.contains('image-select')) return;
                        checkbox.checked = !checkbox.checked;
                        overlay.style.opacity = checkbox.checked ? '1' : '0';
                        this.#updateSelectedImages(chatContainer);
                    });
                    grid.appendChild(wrap);
                });
                chatContainer.dataset.imagesLoaded = '1';
                this.#updateSelectedImages(chatContainer);
            } catch (e) {
                // silencieux
                const grid = chatContainer.querySelector('.chat-image-picker .image-grid');
                const countEl = chatContainer.querySelector('.chat-image-picker .selected-count');
                if (grid) grid.innerHTML = '<div class="text-xs text-red-400">Erreur lors du chargement des images.</div>';
                if (countEl) countEl.textContent = '0';
            }
        }

        #updateSelectedImages(chatContainer) {
            const checkboxes = chatContainer.querySelectorAll('.chat-image-picker .image-select');
            const selected = [];
            checkboxes.forEach(cb => { if (cb.checked && cb.dataset.url) selected.push(cb.dataset.url); });
            chatContainer.dataset.selectedImages = JSON.stringify(selected);
            const countEl = chatContainer.querySelector('.chat-image-picker .selected-count');
            if (countEl) countEl.textContent = String(selected.length);
        }

        /**
         * Définit un message d'accueil personnalisé pour un chat donné
         * @param {number} chatId - ID du chat
         * @param {string} welcomeText - Texte d'accueil à afficher
         * @returns {boolean} true si mis à jour, false sinon
         */
        setWelcomeForChat(chatId, welcomeText) {
            const chatInstance = this.chatListTarget.querySelector(`.chat-instance[data-chat-id="${chatId}"]`);
            if (!chatInstance) return false;
            const messagesContainer = chatInstance.querySelector('.chat-messages');
            if (!messagesContainer) return false;
            const firstSystemMessage = messagesContainer.querySelector('.chat-message.system .message-content');
            if (!firstSystemMessage) return false;
            // Mettre à jour le contenu visuel (sécurisé)
            firstSystemMessage.textContent = welcomeText;
            // Mettre à jour l'historique interne si présent
            if (this.conversations && this.conversations[chatId] && this.conversations[chatId][0] && this.conversations[chatId][0].role === 'assistant') {
                this.conversations[chatId][0].content = welcomeText;
            }
            return true;
        }

        addContextMessage(chatId, role, content) {
            const chatInstance = this.chatListTarget.querySelector(`.chat-instance[data-chat-id="${chatId}"]`);
            if (!chatInstance) return false;
            const messagesContainer = chatInstance.querySelector('.chat-messages');
            if (!messagesContainer) return false;
            const wrap = document.createElement('div');
            wrap.className = `chat-message ${role === 'system' ? 'system' : 'user'}`;
            wrap.innerHTML = `
                <div class="message-content">${this.escapeHtml(content).replace(/\n/g,'<br>')}</div>
            `;
            messagesContainer.appendChild(wrap);
            if (this.conversations && this.conversations[chatId]) {
                const msg = { role: role === 'system' ? 'system' : 'user', content };
                // Si c'est un contexte système et qu'aucun message système n'existe encore, l'insérer en 0 après le message d'accueil assistant
                if (msg.role === 'system') {
                    // position après le premier message assistant si présent
                    if (this.conversations[chatId].length >= 1 && this.conversations[chatId][0].role === 'assistant') {
                        this.conversations[chatId].splice(1, 0, msg);
                    } else {
                        this.conversations[chatId].unshift(msg);
                    }
                } else {
                    this.conversations[chatId].push(msg);
                }
            }
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            return true;
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
        
        async sendMessage(event) {
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
            
            // Déterminer le pipeline à utiliser si ce chat provient d'une géocache
            let pipelineId = null;
            const chatInstanceEl = this.chatListTarget.querySelector(`.chat-instance[data-chat-id="${chatId}"]`);
            const isGeocacheChat = chatInstanceEl && chatInstanceEl.dataset.geocacheId;
            const pipelineAlreadyExecuted = chatInstanceEl && chatInstanceEl.dataset.pipelineExecuted === 'true';

            if (chatInstanceEl) {
                // Priorité au dataset explicitement défini
                if (chatInstanceEl.dataset.pipelineId) {
                    pipelineId = chatInstanceEl.dataset.pipelineId;
                } else if (isGeocacheChat && !pipelineAlreadyExecuted) {
                    // Appliquer le pipeline seulement pour les chats géocache au premier message
                    pipelineId = 'geocache_default';
                }
            }

            // Construire les messages: cas spécial premier envoi avec pipeline pour géocache
            const isFirstUserSend = this.conversations[chatId].filter(m => m.role === 'user').length === 1;
            let messagesToSend = this.conversations[chatId];

            // Appliquer le pipeline seulement au premier message d'un chat géocache
            if (isFirstUserSend && pipelineId && isGeocacheChat && !pipelineAlreadyExecuted) {
                try {
                    const pipeline = window.__pipelinesMap ? window.__pipelinesMap[pipelineId] : null;
                    const firstStep = pipeline && Array.isArray(pipeline.steps) ? pipeline.steps.find(s => s.type === 'llm') : null;
                    const firstStepPrompt = firstStep && firstStep.prompt ? firstStep.prompt : null;

                    // Construire un contexte formaté avec la description stockée en dataset
                    let sysCtxMsg = this.conversations[chatId].find(m => m.role === 'system');
                    if (!sysCtxMsg && chatInstanceEl && chatInstanceEl.dataset.geocacheDesc) {
                        const desc = chatInstanceEl.dataset.geocacheDesc;
                        sysCtxMsg = { role: 'system', content: `Contexte géocache (listing) :\n\n${desc}` };
                    }

                    const userLast = this.conversations[chatId][this.conversations[chatId].length - 1];
                    const envelope = [];
                    if (sysCtxMsg) envelope.push(sysCtxMsg);
                    if (firstStepPrompt) envelope.push({ role: 'system', content: firstStepPrompt });
                    if (userLast && userLast.role === 'user') envelope.push(userLast);

                    // Conserver aussi le tout premier assistant (accueil) en tête si présent
                    const firstAssistant = this.conversations[chatId][0] && this.conversations[chatId][0].role === 'assistant' ? this.conversations[chatId][0] : null;
                    messagesToSend = firstAssistant ? [firstAssistant, ...envelope] : envelope;

                    // Marquer que le pipeline a été exécuté pour ce chat
                    chatInstanceEl.dataset.pipelineExecuted = 'true';

                    // Ajouter un message informatif à l'utilisateur
                    const pipelineMessage = document.createElement('div');
                    pipelineMessage.className = 'chat-message system';
                    pipelineMessage.innerHTML = `
                        <div class="message-content">
                            <strong>Pipeline exécuté avec succès !</strong><br>
                            Vous pouvez maintenant discuter normalement avec l'IA. Le pipeline ne se relancera plus automatiquement.
                        </div>
                    `;
                    messagesContainer.appendChild(pipelineMessage);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                } catch(e) {
                    console.error('Erreur lors de la construction du pipeline:', e);
                    messagesToSend = this.conversations[chatId];
                }
            }

            // Récupérer les images sélectionnées (si le chat est lié à une géocache)
            let images = [];
            try {
                const selected = chatInstanceEl && chatInstanceEl.dataset.selectedImages ? JSON.parse(chatInstanceEl.dataset.selectedImages) : [];
                if (Array.isArray(selected)) {
                    images = selected;
                }
            } catch(e) {}

            // Créer/obtenir un session_id pour WebSocket et rejoindre la room
            let sessionId = activeChat.dataset.sessionId;
            if (!sessionId) {
                try {
                    sessionId = ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
                    );
                } catch (e) {
                    sessionId = 'sess_' + Date.now() + '_' + Math.floor(Math.random()*1e6);
                }
                activeChat.dataset.sessionId = sessionId;
            }
            // Fallback: s’assurer que wsService est initialisé et que Socket.IO est chargé
            const ensureWsReady = async () => {
                if (window.wsService && window.wsService.socket) return true;
                // Charger socket.io si absent
                if (typeof io === 'undefined') {
                    // Essayer en local d'abord
                    let loaded = await new Promise((resolve) => {
                        const s = document.createElement('script');
                        s.src = '/js/vendor/socket.io.min.js';
                        s.onload = () => resolve(true);
                        s.onerror = () => resolve(false);
                        document.head.appendChild(s);
                    });
                    if (!loaded) {
                        // Fallback CDN
                        await new Promise((resolve) => {
                            const s = document.createElement('script');
                            s.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
                            s.onload = resolve;
                            s.onerror = resolve;
                            document.head.appendChild(s);
                        });
                    }
                }
                // Charger le service WebSocket si absent
                if (typeof WebSocketService === 'undefined') {
                    await new Promise((resolve) => {
                        const s = document.createElement('script');
                        s.src = '/js/services/websocket_service.js';
                        s.onload = resolve;
                        s.onerror = resolve;
                        document.head.appendChild(s);
                    });
                }
                // Initialiser le service si besoin
                if (!window.wsService && typeof WebSocketService !== 'undefined') {
                    try { window.wsService = new WebSocketService(); } catch(e) {}
                }
                return !!(window.wsService && window.wsService.socket);
            };
            try {
                await ensureWsReady();
                // Attendre la connexion si nécessaire (timeout court)
                if (window.wsService && !window.wsService.isConnected) {
                    await new Promise((resolve) => {
                        let done = false;
                        const finish = () => { if (!done) { done = true; resolve(); } };
                        window.wsService.on('websocket_connected', finish);
                        setTimeout(finish, 600);
                    });
                }
                if (window.wsService) {
                    window.wsService.joinSession(sessionId);
                    // micro délai pour laisser l'event join partir
                    await new Promise(r => setTimeout(r, 20));
                }
            } catch(e) {}

            // Afficher une zone de progression pour ce chat
            const progressEl = activeChat.querySelector('.chat-progress');
            if (progressEl) { progressEl.classList.remove('hidden'); progressEl.textContent = 'Envoi au modèle…'; }

            // Abonner des handlers spécifiques à cette session (une seule fois)
            if (activeChat.dataset.boundSessionId !== sessionId) {
                const onProg = (data) => {
                    // Debug UI
                    try { console.log('[CHAT UI] onProg', data && data.step, data && data.message); } catch(e) {}
                    if (!data || data.session_id !== sessionId) return;
                    const el = activeChat.querySelector('.chat-progress');
                    const stopBtn = activeChat.querySelector('.chat-stop');
                    if (!el) return;
                    const step = data.step || 'progress';
                    const rawMsg = data.message || '';
                    const pct = (typeof data.progress === 'number') ? ` (${data.progress}%)` : '';
                    // Libellés conviviaux
                    let friendly = '';
                    if (step === 'start') friendly = 'Préparation…';
                    else if (step === 'chain_start') friendly = 'Orchestration…';
                    else if (step === 'llm_start') friendly = 'Le modèle réfléchit…';
                    else if (step === 'tool_start') friendly = `🔧 Exécution outil${data.data && data.data.tool ? ' '+data.data.tool : ''}…`;
                    else if (step === 'tool_end') {
                        const toolData = data.data || {};
                        const status = toolData.success === false ? '❌' : '✅';
                        const toolName = toolData.tool || 'inconnu';
                        const result = toolData.result_preview || toolData.error_preview || toolData.error || '';
                        const truncatedResult = result ? result.substring(0, 80) + (result.length > 80 ? '...' : '') : '';
                        friendly = `${status} ${toolName}${truncatedResult ? ': ' + truncatedResult : ''}`;
                    }
                    else if (step === 'llm_end') friendly = 'Génération terminée';
                    else if (step === 'chain_end') friendly = 'Finalisation…';
                    else if (step === 'token') friendly = 'Réception de la réponse…';
                    else if (step === 'canceled') friendly = 'Génération annulée';
                    else if (step === 'step_start') friendly = rawMsg || 'Début étape';
                    else if (step === 'step_end') friendly = rawMsg || 'Fin étape';
                    else friendly = rawMsg || 'En cours…';
                    el.classList.remove('hidden');
                    el.textContent = `[${step}] ${friendly}${pct}`;
                    // Afficher/masquer le bouton Stop uniquement lorsque LLM actif
                    if (stopBtn) {
                        if (step === 'llm_start' || step === 'token') {
                            stopBtn.classList.remove('hidden');
                            stopBtn.disabled = false;
                        } else if (['llm_end','chain_end','canceled','tool_end'].includes(step)) {
                            stopBtn.classList.add('hidden');
                            stopBtn.disabled = true;
                        }
                    }
                    // Injecter des événements notables dans le fil des messages
                    if (['tool_start','tool_end','llm_start','llm_end','step_start','step_end'].includes(step)) {
                        const info = document.createElement('div');
                        info.className = 'chat-message system';
                        // Construire détail enrichi pour step_start/step_end et tool_start/tool_end
                        if (step === 'step_start' || step === 'step_end') {
                            const meta = (data && data.data) ? data.data : {};
                            let detailsHtml = '';
                            if (meta.prompt_preview) {
                                detailsHtml += `<div class="text-2xs text-gray-400 mt-1">Prompt (aperçu):</div><pre class="code-block" style="white-space:pre-wrap;">${this.escapeHtml(String(meta.prompt_preview))}</pre>`;
                            }
                            if (meta.allowed_tools) {
                                detailsHtml += `<div class="text-2xs text-gray-400 mt-1">Outils autorisés: ${this.escapeHtml(String(meta.allowed_tools))}</div>`;
                            }
                            if (meta.output_key || meta.output_preview) {
                                if (meta.output_key) {
                                    detailsHtml += `<div class="text-2xs text-gray-400 mt-1">Sortie enregistrée sous: <code>${this.escapeHtml(String(meta.output_key))}</code></div>`;
                                }
                                if (meta.output_preview) {
                                    detailsHtml += `<div class="text-2xs text-gray-400 mt-1">Sortie (aperçu):</div><pre class="code-block" style="white-space:pre-wrap;">${this.escapeHtml(String(meta.output_preview))}</pre>`;
                                }
                            }
                            info.innerHTML = `<div class="message-content"><strong>${this.escapeHtml(rawMsg || '')}</strong>${detailsHtml}</div>`;
                        } else if (step === 'tool_start' || step === 'tool_end') {
                            const meta = (data && data.data) ? data.data : {};
                            let detailsHtml = '';
                            if (meta.tool) {
                                detailsHtml += `<div class="text-2xs text-gray-400 mt-1">Outil: <code>${this.escapeHtml(String(meta.tool))}</code></div>`;
                            }
                            if (meta.args) {
                                detailsHtml += `<div class="text-2xs text-gray-400 mt-1">Arguments: ${this.escapeHtml(String(meta.args))}</div>`;
                            }
                            if (meta.result_preview) {
                                detailsHtml += `<div class="text-2xs text-gray-400 mt-1">Résultat: <pre class="code-block" style="white-space:pre-wrap;">${this.escapeHtml(String(meta.result_preview))}</pre></div>`;
                            }
                            if (meta.error) {
                                detailsHtml += `<div class="text-2xs text-red-400 mt-1">Erreur: ${this.escapeHtml(String(meta.error))}</div>`;
                            }
                            if (meta.success !== undefined) {
                                const status = meta.success ? '✅ Succès' : '❌ Échec';
                                detailsHtml += `<div class="text-2xs mt-1">${status}</div>`;
                            }
                            info.innerHTML = `<div class="message-content"><strong>${this.escapeHtml(rawMsg || '')}</strong>${detailsHtml}</div>`;
                        } else {
                            info.innerHTML = `<div class="message-content">${this.escapeHtml(el.textContent)}</div>`;
                        }
                        messagesContainer.appendChild(info);
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                    // Streaming de tokens (optionnel)
                    if (step === 'token') {
                        const streamEnabled = !!activeChat.querySelector('.chat-toggle-stream')?.checked;
                        if (!streamEnabled) return;
                        let streamingBubble = activeChat.querySelector('.chat-message.streaming-current');
                        if (!streamingBubble) {
                            streamingBubble = document.createElement('div');
                            streamingBubble.className = 'chat-message system streaming-current';
                            streamingBubble.innerHTML = '<div class="message-content"></div>';
                            messagesContainer.appendChild(streamingBubble);
                        }
                        const mc = streamingBubble.querySelector('.message-content');
                        const isThinking = !!(data.data && data.data.is_thinking);
                        const showThinking = !!activeChat.querySelector('.chat-toggle-thinking')?.checked;
                        if (isThinking && !showThinking) {
                            return;
                        }
                        mc.textContent += (rawMsg || '');
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    } else if (step === 'canceled') {
                        // Nettoyer l'UI: retirer typing et finaliser la bulle de streaming
                        const typing = messagesContainer.querySelector('.typing');
                        if (typing) typing.remove();
                        const streamingBubble = activeChat.querySelector('.chat-message.streaming-current');
                        if (streamingBubble) streamingBubble.classList.remove('streaming-current');
                    }
                };
                const onDone = (data) => {
                    if (!data || data.session_id !== sessionId) return;
                    const el = activeChat.querySelector('.chat-progress');
                    const stopBtn = activeChat.querySelector('.chat-stop');
                    if (!el) return;
                    // Nettoyer typing et bulle streaming
                    const typing = messagesContainer.querySelector('.typing');
                    if (typing) typing.remove();
                    const streamingBubble = activeChat.querySelector('.chat-message.streaming-current');
                    if (streamingBubble) streamingBubble.classList.remove('streaming-current');
                    if (stopBtn) { stopBtn.classList.add('hidden'); stopBtn.disabled = true; }
                    if (data.status === 'success') {
                        el.textContent = 'Réponse prête';
                        setTimeout(()=> el.classList.add('hidden'), 1500);
                    } else if (data.status === 'error') {
                        el.textContent = 'Erreur: ' + (data.message || '');
                    }
                };
                try {
                    if (window.wsService) {
                        window.wsService.on(`session_${sessionId}_progress`, onProg);
                        window.wsService.on(`session_${sessionId}_complete`, onDone);
                    }
                } catch(e) {}
                // Neutraliser d'éventuels fallbacks globaux pour éviter les doublons
                try { window.onAIChatProgress = null; window.onAIChatComplete = null; } catch(e) {}
                activeChat.dataset.boundSessionId = sessionId;
            }

            // Lire options Streaming / Réflexion
            const streamEnabled = !!activeChat.querySelector('.chat-toggle-stream')?.checked;
            const thinkingEnabled = !!activeChat.querySelector('.chat-toggle-thinking')?.checked;

            // Envoyer la requête à l'API
            const requestData = {
                messages: messagesToSend,
                model_id: activeModel,
                use_tools: true,  // Activer l'utilisation des outils
                images: images,
                session_id: sessionId,
                stream: streamEnabled,
                show_thinking: thinkingEnabled
            };

            // N'ajouter pipeline_id que si le pipeline doit être exécuté (premier message géocache)
            if (pipelineId && isGeocacheChat && !pipelineAlreadyExecuted) {
                requestData.pipeline_id = pipelineId;
            }

            fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
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
                    // Mettre à jour le statut
                    const progressEl = activeChat.querySelector('.chat-progress');
                    if (progressEl) {
                        progressEl.classList.remove('hidden');
                        progressEl.textContent = 'Erreur: ' + (data.error || '');
                    }
                }
                
                // Faire défiler vers le bas
                messagesContainer.scrollTop = messagesContainer.scrollHeight;

                // Fallback: mettre à jour/masquer le statut même si l'événement WebSocket est manqué
                const progressEl = activeChat.querySelector('.chat-progress');
                if (progressEl) {
                    if (data.success) {
                        progressEl.textContent = 'Terminé';
                        setTimeout(() => progressEl.classList.add('hidden'), 1500);
                    }
                }
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

                // Mettre à jour le statut
                const progressEl = activeChat.querySelector('.chat-progress');
                if (progressEl) {
                    progressEl.classList.remove('hidden');
                    progressEl.textContent = 'Erreur: ' + (error.message || '');
                }
            });
        }
        
        async stopGeneration(event) {
            // Trouver le chat actif
            const activeChat = this.chatListTarget.querySelector('.chat-instance.active');
            if (!activeChat) return;
            const sessionId = activeChat.dataset.sessionId;
            if (!sessionId) return;
            try {
                await fetch('/api/ai/cancel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id: sessionId })
                });
            } catch (e) {}
            // Feedback UI immédiat
            const el = activeChat.querySelector('.chat-progress');
            if (el) {
                el.classList.remove('hidden');
                el.textContent = '[canceled] Annulation demandée…';
            }
            // Cacher le bouton stop
            const stopBtn = activeChat.querySelector('.chat-stop');
            if (stopBtn) { stopBtn.classList.add('hidden'); stopBtn.disabled = true; }
            // Retirer l'indicateur de frappe et finaliser la bulle streaming si présente
            const messagesContainer = activeChat.querySelector('.chat-messages');
            const typing = messagesContainer && messagesContainer.querySelector('.typing');
            if (typing) typing.remove();
            const streamingBubble = activeChat.querySelector('.chat-message.streaming-current');
            if (streamingBubble) streamingBubble.classList.remove('streaming-current');
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