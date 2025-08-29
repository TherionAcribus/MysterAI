/**
 * Contrôleur Stimulus pour la barre de statut
 * Gère notamment le sélecteur de modèle d'IA
 */
(() => {
    // S'assurer que Stimulus est disponible globalement
    if (!window.Stimulus) {
        console.error("Stimulus n'est pas disponible globalement");
        return;
    }
    
    class StatusBarController extends Stimulus.Controller {
        static targets = ["aiModelSelector"];
        
        connect() {
            console.log('=== DEBUG: StatusBarController connecté ===');
            this.loadAIModels();
            
            // Écouter les événements de changement d'IA depuis d'autres parties de l'application
            window.addEventListener('aiModelChanged', this.updateSelectedModel.bind(this));
            // Écouter l'événement de rafraîchissement des modèles (depuis Settings)
            window.addEventListener('aiModelsRefreshed', () => {
                console.log('=== DEBUG: aiModelsRefreshed reçu, rechargement des modèles dans la barre ===');
                this.loadAIModels();
            });
        }
        
        /**
         * Charge la liste des modèles d'IA disponibles
         */
        loadAIModels() {
            fetch('/api/ai/models')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erreur HTTP: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    // Log détaillé pour débogage
                    console.log('=== DEBUG: Réponse API modèles ===', {
                        success: data.success,
                        totalModels: data.models.length,
                        onlineModels: data.models.filter(m => m.type === 'online').length,
                        localModels: data.models.filter(m => m.type === 'local').length,
                        currentMode: data.current_mode,
                        apiKey: data.models.some(m => m.type === 'online') ? 'Configurée' : 'Non configurée'
                    });

                    // Log détaillé des modèles actifs
                    const activeModels = data.models.filter(m => m.is_active);
                    console.log('=== DEBUG: Modèles actifs ===', activeModels.map(m => `${m.name} (${m.id})`));
                    
                    // Vider le sélecteur
                    this.aiModelSelectorTarget.innerHTML = '';
                    
                    // Séparer les modèles par type
                    const onlineModels = data.models.filter(model => model.type === 'online');
                    const localModels = data.models.filter(model => model.type === 'local');

                    const buildOptionLabel = (model) => {
                        // Pictos selon capacités
                        const icons = [];
                        if (model.supports_tools) icons.push('🔧');
                        if (model.supports_thinking) icons.push('🧠');
                        if (model.supports_vision) icons.push('👁');
                        return icons.length ? `${model.name} ${icons.join('')}` : model.name;
                    };
                    
                    // Créer un groupe pour les modèles en ligne
                    if (onlineModels.length > 0) {
                        const onlineGroup = document.createElement('optgroup');
                        onlineGroup.label = 'Modèles en ligne';
                        
                        onlineModels.forEach(model => {
                            const option = document.createElement('option');
                            option.value = model.id;
                            option.textContent = buildOptionLabel(model);
                            option.selected = model.is_active;
                            option.setAttribute('data-usable', model.is_usable ? 'true' : 'false');
                            if (model.supports_vision) option.setAttribute('data-vision', 'true');
                            if (model.supports_tools) option.setAttribute('data-tools', 'true');
                            if (model.supports_thinking) option.setAttribute('data-thinking', 'true');
                            onlineGroup.appendChild(option);
                        });
                        
                        this.aiModelSelectorTarget.appendChild(onlineGroup);
                    }
                    
                    // Créer un groupe pour les modèles locaux
                    if (localModels.length > 0) {
                        const localGroup = document.createElement('optgroup');
                        localGroup.label = 'Modèles locaux';
                        
                        localModels.forEach(model => {
                            const option = document.createElement('option');
                            option.value = model.id;
                            option.textContent = buildOptionLabel(model);
                            option.selected = model.is_active;
                            option.setAttribute('data-usable', model.is_usable !== false ? 'true' : 'false');
                            if (model.supports_vision) option.setAttribute('data-vision', 'true');
                            if (model.supports_tools) option.setAttribute('data-tools', 'true');
                            if (model.supports_thinking) option.setAttribute('data-thinking', 'true');
                            console.log(`=== DEBUG: Création option locale - ID: ${model.id}, Nom: ${model.name}, Actif: ${model.is_active}`);
                            localGroup.appendChild(option);
                        });
                        
                        this.aiModelSelectorTarget.appendChild(localGroup);
                    }
                    
                    // Si aucun modèle n'est disponible
                    if (data.models.length === 0) {
                        const option = document.createElement('option');
                        option.value = 'error';
                        option.textContent = 'Aucun modèle disponible';
                        this.aiModelSelectorTarget.appendChild(option);
                    }
                })
                .catch(error => {
                    console.error('Erreur lors du chargement des modèles d\'IA:', error);
                    this.aiModelSelectorTarget.innerHTML = '<option value="error">Erreur de chargement</option>';
                });
        }
        
        /**
         * Gère le changement de modèle d'IA
         * @param {Event} event - L'événement de changement
         */
        changeAIModel(event) {
            const modelId = event.target.value;
            const selectedOption = event.target.options[event.target.selectedIndex];
            const selectedText = selectedOption.textContent;
            console.log(`=== DEBUG: Changement de modèle d'IA vers ${modelId} (Texte: ${selectedText}) ===`);

            // Vérifier si l'option sélectionnée a l'attribut data-usable à false
            const isUsable = selectedOption.getAttribute('data-usable') !== 'false';
            console.log(`=== DEBUG: Option sélectionnée - Usable: ${isUsable}, Valeur: ${modelId}, Texte: ${selectedText} ===`);

            if (!isUsable) {
                console.log(`=== DEBUG: Modèle ${modelId} non utilisable (clé API manquante) ===`);
                this.showNotification('Veuillez configurer une clé API valide dans les paramètres pour utiliser ce modèle', true);

                // Restaurer la sélection précédente
                this.loadAIModels(); // Recharger les modèles avec la sélection correcte
                return;
            }
            
            // Envoyer la requête pour changer le modèle actif
            fetch('/api/ai/set_active_model', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ model_id: modelId })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    console.log(`Modèle d'IA changé avec succès pour: ${data.model_name}`);
                    
                    // Notifier les autres composants du changement
                    window.dispatchEvent(new CustomEvent('aiModelChanged', {
                        detail: { modelId: modelId, modelName: data.model_name }
                    }));
                    
                    // Afficher une notification
                    this.showNotification(`Modèle d'IA changé pour: ${data.model_name}`);
                } else {
                    console.error(`Erreur lors du changement de modèle: ${data.error}`);
                    this.showNotification(`Erreur: ${data.error}`, true);
                }
            })
            .catch(error => {
                console.error('Erreur lors de la requête:', error);
                this.showNotification('Erreur de communication avec le serveur', true);
            });
        }
        
        /**
         * Met à jour le modèle sélectionné dans le sélecteur
         * @param {CustomEvent} event - L'événement contenant les détails du modèle
         */
        updateSelectedModel(event) {
            const modelId = event.detail.modelId;
            
            // Mettre à jour le sélecteur si l'événement ne vient pas de lui
            if (this.aiModelSelectorTarget.value !== modelId) {
                this.aiModelSelectorTarget.value = modelId;
            }
        }
        
        /**
         * Affiche une notification via AppNotify
         * @param {string} message - Le message à afficher
         * @param {boolean} isError - Indique si c'est une erreur
         */
        showNotification(message, isError = false) {
            if (window.AppNotify) {
                AppNotify.push({
                    level: isError ? 'error' : 'success',
                    message: message,
                    ttl: 4000
                });
            } else {
                (isError ? console.error : console.log)(message);
            }
        }
    }

    // Enregistrer le contrôleur avec Stimulus
    window.application.register('status-bar', StatusBarController);
})(); 