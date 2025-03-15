/**
 * Contrôleur Stimulus pour gérer les paramètres IA
 */
(function() {
    class AiSettingsController extends Stimulus.Controller {
        static targets = [
            "modeRadio", "provider", "apiKey", "onlineModel", "localModel", 
            "ollamaUrl", "temperature", "temperatureValue", "maxContext",
            "onlineSettings", "localSettings", "connectionStatus"
        ];
        
        connect() {
            console.log('=== DEBUG: AiSettingsController connecté ===');
            
            // Écouter l'événement htmx:afterSwap pour initialiser après le chargement du contenu
            this.element.addEventListener('htmx:afterSwap', this.initialize.bind(this));
            
            // Vérifier si le contenu est déjà chargé
            if (this.hasRequiredTargets()) {
                this.initialize();
            }
        }
        
        /**
         * Vérifie si toutes les cibles requises sont disponibles
         */
        hasRequiredTargets() {
            return this.hasOnlineSettingsTarget && this.hasLocalSettingsTarget;
        }
        
        /**
         * Initialise le contrôleur après le chargement du contenu
         */
        initialize() {
            console.log('=== DEBUG: AiSettingsController initialisation ===');
            
            if (this.hasRequiredTargets()) {
                this.updateVisibility();
                if (this.hasProviderTarget && this.hasOnlineModelTarget) {
                    this.updateModelOptions();
                }
            } else {
                console.log('=== DEBUG: AiSettingsController - cibles requises non disponibles ===');
            }
        }
        
        /**
         * Met à jour la visibilité des sections en fonction du mode sélectionné
         */
        updateVisibility() {
            if (!this.hasOnlineSettingsTarget || !this.hasLocalSettingsTarget) {
                console.log('=== DEBUG: Cibles de visibilité non disponibles ===');
                return;
            }
            
            const mode = this.getSelectedMode();
            
            if (mode === 'online') {
                this.onlineSettingsTarget.style.display = 'block';
                this.localSettingsTarget.style.display = 'none';
            } else {
                this.onlineSettingsTarget.style.display = 'none';
                this.localSettingsTarget.style.display = 'block';
            }
        }
        
        /**
         * Récupère le mode sélectionné (online/local)
         */
        getSelectedMode() {
            if (!this.hasModeRadioTarget) {
                return 'online'; // Valeur par défaut
            }
            
            const checkedRadio = this.modeRadioTargets.find(radio => radio.checked);
            return checkedRadio ? checkedRadio.value : 'online';
        }
        
        /**
         * Gère le changement de mode
         */
        changeMode() {
            this.updateVisibility();
        }
        
        /**
         * Met à jour les options de modèle en fonction du fournisseur sélectionné
         */
        updateModelOptions() {
            if (!this.hasProviderTarget || !this.hasOnlineModelTarget) {
                console.log('=== DEBUG: Cibles pour les options de modèle non disponibles ===');
                return;
            }
            
            const provider = this.providerTarget.value;
            const modelSelect = this.onlineModelTarget;
            
            // Masquer tous les groupes d'options
            Array.from(modelSelect.querySelectorAll('optgroup')).forEach(group => {
                if (group.dataset.provider === provider) {
                    group.style.display = '';
                    
                    // Sélectionner la première option du groupe si aucune n'est sélectionnée
                    const hasSelectedOption = Array.from(group.querySelectorAll('option')).some(option => option.selected);
                    if (!hasSelectedOption && group.querySelector('option')) {
                        group.querySelector('option').selected = true;
                    }
                } else {
                    group.style.display = 'none';
                    
                    // Désélectionner les options des autres groupes
                    Array.from(group.querySelectorAll('option')).forEach(option => {
                        option.selected = false;
                    });
                }
            });
        }
        
        /**
         * Gère le changement de fournisseur
         */
        changeProvider() {
            this.updateModelOptions();
        }
        
        /**
         * Met à jour l'affichage de la valeur de température
         */
        updateTemperature() {
            if (this.hasTemperatureValueTarget) {
                this.temperatureValueTarget.textContent = this.temperatureTarget.value;
            }
        }
        
        /**
         * Bascule la visibilité de la clé API
         */
        toggleApiKeyVisibility(event) {
            if (!this.hasApiKeyTarget) return;
            
            const button = event.currentTarget;
            const input = this.apiKeyTarget;
            
            if (input.type === 'password') {
                input.type = 'text';
                button.innerHTML = '<i class="fas fa-eye-slash"></i>';
            } else {
                input.type = 'password';
                button.innerHTML = '<i class="fas fa-eye"></i>';
            }
        }
        
        /**
         * Teste la connexion à Ollama
         */
        testOllamaConnection() {
            if (!this.hasOllamaUrlTarget || !this.hasConnectionStatusTarget) return;
            
            const url = this.ollamaUrlTarget.value.trim();
            this.connectionStatusTarget.textContent = 'Test en cours...';
            this.connectionStatusTarget.className = 'ml-2 text-sm text-yellow-500';
            
            fetch(`/api/ai/test_ollama_connection`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.connectionStatusTarget.textContent = 'Connexion réussie!';
                    this.connectionStatusTarget.className = 'ml-2 text-sm text-green-500';
                } else {
                    this.connectionStatusTarget.textContent = `Erreur: ${data.error}`;
                    this.connectionStatusTarget.className = 'ml-2 text-sm text-red-500';
                }
            })
            .catch(error => {
                this.connectionStatusTarget.textContent = `Erreur: ${error.message}`;
                this.connectionStatusTarget.className = 'ml-2 text-sm text-red-500';
            });
        }
        
        /**
         * Réinitialise les paramètres par défaut
         */
        resetDefaults() {
            if (!this.hasRequiredTargets()) return;
            
            // Mode en ligne par défaut
            if (this.hasModeRadioTarget) {
                this.modeRadioTargets.forEach(radio => {
                    radio.checked = radio.value === 'online';
                });
            }
            
            // Paramètres en ligne
            if (this.hasProviderTarget) this.providerTarget.value = 'openai';
            if (this.hasApiKeyTarget) this.apiKeyTarget.value = '';
            if (this.hasProviderTarget && this.hasOnlineModelTarget) this.updateModelOptions();
            
            // Paramètres locaux
            if (this.hasOllamaUrlTarget) this.ollamaUrlTarget.value = 'http://localhost:11434';
            if (this.hasLocalModelTarget) this.localModelTarget.value = 'deepseek-coder:latest';
            
            // Paramètres communs
            if (this.hasTemperatureTarget) {
                this.temperatureTarget.value = '0.7';
                if (this.hasTemperatureValueTarget) this.temperatureValueTarget.textContent = '0.7';
            }
            if (this.hasMaxContextTarget) this.maxContextTarget.value = '10';
            
            // Mettre à jour l'interface
            this.updateVisibility();
        }
        
        /**
         * Enregistre les paramètres
         */
        saveSettings() {
            if (!this.hasRequiredTargets()) return;
            
            const mode = this.getSelectedMode();
            const settings = {
                ai_mode: mode,
                temperature: parseFloat(this.hasTemperatureTarget ? this.temperatureTarget.value : 0.7),
                max_context: parseInt(this.hasMaxContextTarget ? this.maxContextTarget.value : 10)
            };
            
            if (mode === 'online') {
                settings.ai_provider = this.hasProviderTarget ? this.providerTarget.value : 'openai';
                settings.api_key = this.hasApiKeyTarget ? this.apiKeyTarget.value : '';
                settings.ai_model = this.hasOnlineModelTarget ? this.onlineModelTarget.value : 'gpt-3.5-turbo';
            } else {
                settings.ollama_url = this.hasOllamaUrlTarget ? this.ollamaUrlTarget.value : 'http://localhost:11434';
                settings.local_model = this.hasLocalModelTarget ? this.localModelTarget.value : 'deepseek-coder:latest';
            }
            
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
                    // Afficher un message de succès
                    const notification = document.createElement('div');
                    notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg';
                    notification.textContent = 'Paramètres enregistrés avec succès!';
                    document.body.appendChild(notification);
                    
                    // Supprimer la notification après 3 secondes
                    setTimeout(() => {
                        notification.remove();
                    }, 3000);
                } else {
                    console.error('Erreur lors de l\'enregistrement des paramètres:', data.error);
                    alert(`Erreur: ${data.error}`);
                }
            })
            .catch(error => {
                console.error('Erreur lors de l\'enregistrement des paramètres:', error);
                alert(`Erreur: ${error.message}`);
            });
        }
    }
    
    // Enregistrer le contrôleur avec Stimulus
    window.application.register('ai-settings', AiSettingsController);
})(); 