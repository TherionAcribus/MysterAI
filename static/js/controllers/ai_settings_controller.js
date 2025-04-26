/**
 * Contrôleur Stimulus pour les paramètres IA
 */
(() => {
    // S'assurer que Stimulus est disponible globalement
    if (!window.Stimulus) {
        console.error("Stimulus n'est pas disponible globalement");
        return;
    }
    
    class AISettingsController extends Stimulus.Controller {
        static targets = [
            "modeRadio", "provider", "apiKey", "onlineModel", 
            "ollamaUrl", "localModel", "connectionStatus", 
            "temperature", "temperatureValue", "maxContext",
            "onlineSettings", "localSettings", "localModelEnabled",
            "frameworkRadio"
        ];
        
        connect() {
            console.log('=== DEBUG: AISettingsController connecté ===');
            
            // Écouter l'événement htmx:afterSwap pour initialiser après le chargement HTMX
            this.element.addEventListener('htmx:afterSwap', this.initialize.bind(this));
            
            // Si le contenu est déjà chargé (si ce n'est pas un chargement HTMX),
            // initialiser directement
            if (this.hasModeRadioTargets) {
                this.initialize();
            }
        }
        
        initialize() {
            console.log('=== DEBUG: AISettingsController initializing ===', {
                hasModeRadioTargets: this.hasModeRadioTargets,
                hasOnlineSettingsTarget: this.hasOnlineSettingsTarget,
                hasLocalSettingsTarget: this.hasLocalSettingsTarget
            });
            
            if (this.hasModeRadioTargets && this.hasOnlineSettingsTarget && this.hasLocalSettingsTarget) {
                this.updateVisibility();
                if (this.hasProviderTarget && this.hasOnlineModelTarget) {
                    this.updateProviderVisibility();
                    
                    // Charger la clé API pour le fournisseur sélectionné
                    if (this.hasProviderTarget && this.hasApiKeyTarget) {
                        const provider = this.providerTarget.value;
                        this.loadAPIKeyForProvider(provider);
                    }
                }
            }
        }
        
        changeMode() {
            this.updateVisibility();
        }
        
        updateVisibility() {
            // Vérifier que les cibles existent
            if (!this.hasModeRadioTargets || !this.hasOnlineSettingsTarget || !this.hasLocalSettingsTarget) {
                console.warn('=== WARN: Targets for updateVisibility not available yet ===');
                return;
            }
            
            // Trouver le radio bouton coché, ou prendre le premier par défaut
            const checkedRadio = this.modeRadioTargets.find(radio => radio.checked);
            if (!checkedRadio) {
                console.warn('=== WARN: No checked radio button found ===');
                return;
            }
            
            const mode = checkedRadio.value;
            console.log('=== DEBUG: Changing mode to ===', mode);
            
            if (mode === 'online') {
                this.onlineSettingsTarget.style.display = 'block';
                this.localSettingsTarget.style.display = 'none';
                
                // Initialiser le nom du fournisseur dans le libellé
                if (this.hasProviderTarget) {
                    this.updateProviderNameInLabel(this.providerTarget.value);
                }
            } else {
                this.onlineSettingsTarget.style.display = 'none';
                this.localSettingsTarget.style.display = 'block';
            }
        }
        
        changeProvider() {
            this.updateProviderVisibility();
            
            // Récupérer la valeur du fournisseur sélectionné
            const provider = this.providerTarget.value;
            
            // Mettre à jour la valeur du champ de clé API en fonction du fournisseur
            this.loadAPIKeyForProvider(provider);
            
            // Mettre à jour le libellé du champ de clé API
            this.updateProviderNameInLabel(provider);
        }
        
        updateProviderVisibility() {
            // Vérifier que les cibles existent
            if (!this.hasProviderTarget || !this.hasOnlineModelTarget) {
                console.warn('=== WARN: Targets for updateProviderVisibility not available yet ===');
                return;
            }
            
            const provider = this.providerTarget.value;
            
            // Masquer tous les groupes d'options
            const optgroups = this.onlineModelTarget.querySelectorAll('optgroup');
            optgroups.forEach(group => {
                const groupProvider = group.getAttribute('data-provider');
                if (groupProvider === provider) {
                    group.style.display = '';
                    
                    // Sélectionner la première option du groupe si aucune n'est sélectionnée
                    const hasSelectedOption = Array.from(group.querySelectorAll('option')).some(option => option.selected);
                    if (!hasSelectedOption && group.querySelector('option')) {
                        group.querySelector('option').selected = true;
                    }
                } else {
                    group.style.display = 'none';
                    
                    // Désélectionner les options des groupes masqués
                    group.querySelectorAll('option').forEach(option => {
                        option.selected = false;
                    });
                }
            });
        }
        
        toggleApiKeyVisibility() {
            const input = this.apiKeyTarget;
            if (input.type === 'password') {
                input.type = 'text';
            } else {
                input.type = 'password';
            }
        }
        
        updateTemperature() {
            this.temperatureValueTarget.textContent = this.temperatureTarget.value;
        }
        
        testOllamaConnection() {
            const url = this.ollamaUrlTarget.value;
            this.connectionStatusTarget.textContent = 'Test en cours...';
            this.connectionStatusTarget.className = 'ml-2 text-sm text-yellow-400';
            
            fetch('/api/ai/test_ollama_connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.connectionStatusTarget.textContent = 'Connexion réussie! Modèles disponibles: ' + data.models.join(', ');
                    this.connectionStatusTarget.className = 'ml-2 text-sm text-green-400';
                } else {
                    this.connectionStatusTarget.textContent = 'Erreur: ' + data.error;
                    this.connectionStatusTarget.className = 'ml-2 text-sm text-red-400';
                }
            })
            .catch(error => {
                this.connectionStatusTarget.textContent = 'Erreur: ' + error.message;
                this.connectionStatusTarget.className = 'ml-2 text-sm text-red-400';
            });
        }
        
        saveSettings() {
            // Récupérer les valeurs des paramètres
            const mode = this.modeRadioTargets.find(radio => radio.checked).value;
            const temperature = parseFloat(this.temperatureTarget.value);
            const maxContext = parseInt(this.maxContextTarget.value);
            const useLangGraph = this.frameworkRadioTargets.find(radio => radio.checked).value === 'true';
            
            // Créer l'objet de paramètres
            const settings = {
                ai_mode: mode,
                temperature: temperature,
                max_context: maxContext,
                use_langgraph: useLangGraph
            };
            
            // Ajouter les paramètres spécifiques au mode
            if (mode === 'online') {
                const provider = this.providerTarget.value;
                settings.ai_provider = provider;
                settings.ai_model = this.onlineModelTarget.value;
                
                // Ajouter la clé API si elle n'est pas vide
                const apiKey = this.apiKeyTarget.value.trim();
                if (apiKey) {
                    // Enregistrer la clé API à la fois dans la clé générique et dans la clé spécifique au fournisseur
                    settings.api_key = apiKey;
                    
                    // Ajouter également la clé spécifique au fournisseur
                    if (provider === 'openai') {
                        settings.openai_api_key = apiKey;
                    } else if (provider === 'anthropic') {
                        settings.anthropic_api_key = apiKey;
                    } else if (provider === 'google') {
                        settings.google_api_key = apiKey;
                    }
                    
                    console.log(`=== DEBUG: Clé API ajoutée pour ${provider} (longueur: ${apiKey.length}) ===`);
                    
                    // Vérifier que la clé API contient bien un format valide selon le provider
                    if (provider === 'openai' && !apiKey.startsWith('sk-')) {
                        if (!confirm('Votre clé API OpenAI ne semble pas avoir le format attendu (commence par "sk-"). Voulez-vous continuer quand même?')) {
                            return;
                        }
                    } else if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
                        if (!confirm('Votre clé API Anthropic ne semble pas avoir le format attendu (commence par "sk-ant-"). Voulez-vous continuer quand même?')) {
                            return;
                        }
                    }
                } else {
                    console.log('=== DEBUG: Pas de clé API à envoyer (champ vide) ===');
                    
                    // Avertir l'utilisateur que sans clé API, les modèles en ligne ne fonctionneront pas
                    if (!confirm('Aucune clé API fournie. Les modèles en ligne ne fonctionneront pas sans clé API valide. Voulez-vous continuer quand même?')) {
                        return;
                    }
                }
            } else {
                settings.ollama_url = this.ollamaUrlTarget.value;
                settings.local_model = this.localModelTarget.value;
                
                // Ajouter les modèles locaux activés
                settings.local_models_enabled = {};
                this.localModelEnabledTargets.forEach(checkbox => {
                    const modelId = checkbox.getAttribute('data-model-id');
                    settings.local_models_enabled[modelId] = checkbox.checked;
                });
            }
            
            // Envoyer les paramètres au serveur
            fetch('/api/ai/save_settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.showNotification('Paramètres enregistrés avec succès!');
                    
                    // Si on a configuré une clé API, proposer de tester la connexion
                    if (mode === 'online' && settings.api_key) {
                        if (confirm('Voulez-vous tester votre clé API pour vérifier qu\'elle fonctionne?')) {
                            this.testAPIKey(settings.ai_provider, settings.api_key);
                        }
                    }
                } else {
                    this.showNotification('Erreur: ' + data.error, true);
                }
            })
            .catch(error => {
                this.showNotification('Erreur: ' + error.message, true);
            });
        }
        
        /**
         * Teste la validité d'une clé API
         * @param {string} provider - Le fournisseur d'API (openai, anthropic, etc.)
         * @param {string} apiKey - La clé API à tester
         */
        testAPIKey(provider, apiKey) {
            this.showNotification('Test de la clé API en cours...', false, false);
            
            // Appeler l'API appropriée pour tester la clé
            fetch('/api/ai/test_api_key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ provider, api_key: apiKey })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.showNotification('Clé API valide! Modèles disponibles: ' + 
                                         (data.models ? data.models.join(', ') : 'inconnu'));
                } else {
                    this.showNotification('Erreur avec la clé API: ' + data.error, true);
                }
            })
            .catch(error => {
                this.showNotification('Erreur lors du test: ' + error.message, true);
            });
        }
        
        /**
         * Affiche une notification temporaire
         * @param {string} message - Le message à afficher
         * @param {boolean} isError - Indique si c'est une erreur
         * @param {boolean} autoHide - Indique si la notification doit disparaître automatiquement
         */
        showNotification(message, isError = false, autoHide = true) {
            // Créer l'élément de notification
            const notification = document.createElement('div');
            notification.className = `notification ${isError ? 'error' : 'success'}`;
            notification.textContent = message;
            
            // Ajouter au DOM
            document.body.appendChild(notification);
            
            // Animer l'entrée
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);
            
            // Supprimer après un délai (sauf si autoHide est false)
            if (autoHide) {
                setTimeout(() => {
                    notification.classList.remove('show');
                    setTimeout(() => {
                        notification.remove();
                    }, 300);
                }, 3000);
            } else {
                // Ajouter un bouton pour fermer la notification
                const closeBtn = document.createElement('button');
                closeBtn.innerHTML = '&times;';
                closeBtn.className = 'notification-close';
                closeBtn.onclick = () => {
                    notification.classList.remove('show');
                    setTimeout(() => {
                        notification.remove();
                    }, 300);
                };
                notification.appendChild(closeBtn);
            }
        }
        
        resetDefaults() {
            // Réinitialiser les valeurs par défaut
            this.modeRadioTargets.find(radio => radio.value === 'online').checked = true;
            this.frameworkRadioTargets.find(radio => radio.value === 'true').checked = true;
            this.providerTarget.value = 'openai';
            this.onlineModelTarget.value = 'gpt-3.5-turbo';
            this.ollamaUrlTarget.value = 'http://localhost:11434';
            this.localModelTarget.value = 'deepseek-coder:latest';
            this.temperatureTarget.value = 0.7;
            this.temperatureValueTarget.textContent = '0.7';
            this.maxContextTarget.value = 10;
            
            // Réinitialiser les modèles locaux activés
            this.localModelEnabledTargets.forEach(checkbox => {
                checkbox.checked = true;
            });
            
            // Mettre à jour l'interface
            this.updateVisibility();
            this.updateProviderVisibility();
            
            this.showNotification('Paramètres réinitialisés aux valeurs par défaut');
        }
        
        // Charge la clé API pour le fournisseur sélectionné
        loadAPIKeyForProvider(provider) {
            fetch(`/api/ai/provider_api_key/${provider}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.api_key) {
                        // Masquer la clé pour l'affichage
                        const maskedKey = data.api_key;
                        this.apiKeyTarget.value = maskedKey;
                        console.log(`=== DEBUG: Clé API chargée pour ${provider} ===`);
                    } else {
                        // Effacer le champ si aucune clé n'est configurée
                        this.apiKeyTarget.value = '';
                        console.log(`=== DEBUG: Aucune clé API configurée pour ${provider} ===`);
                    }
                })
                .catch(error => {
                    console.error(`Erreur lors du chargement de la clé API pour ${provider}:`, error);
                    this.apiKeyTarget.value = '';
                });
        }
        
        /**
         * Met à jour le nom du fournisseur dans le libellé du champ de clé API
         * @param {string} provider - Le fournisseur sélectionné
         */
        updateProviderNameInLabel(provider) {
            const providerNameElement = document.getElementById('provider-name');
            if (providerNameElement) {
                // Convertir en nom plus lisible
                let displayName = 'OpenAI';
                if (provider === 'anthropic') {
                    displayName = 'Anthropic (Claude)';
                } else if (provider === 'google') {
                    displayName = 'Google (Gemini)';
                }
                
                providerNameElement.textContent = displayName;
            }
        }
    }

    // Enregistrer le contrôleur avec Stimulus
    window.application.register('ai-settings', AISettingsController);
})(); 