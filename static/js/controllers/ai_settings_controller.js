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
            } else {
                this.onlineSettingsTarget.style.display = 'none';
                this.localSettingsTarget.style.display = 'block';
            }
        }
        
        changeProvider() {
            this.updateProviderVisibility();
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
                settings.ai_provider = this.providerTarget.value;
                settings.ai_model = this.onlineModelTarget.value;
                
                // Ajouter la clé API si elle n'est pas vide
                const apiKey = this.apiKeyTarget.value.trim();
                if (apiKey) {
                    settings.api_key = apiKey;
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
                } else {
                    this.showNotification('Erreur: ' + data.error, true);
                }
            })
            .catch(error => {
                this.showNotification('Erreur: ' + error.message, true);
            });
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
        
        showNotification(message, isError = false) {
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
            
            // Supprimer après un délai
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }, 3000);
        }
    }

    // Enregistrer le contrôleur avec Stimulus
    window.application.register('ai-settings', AISettingsController);
})(); 