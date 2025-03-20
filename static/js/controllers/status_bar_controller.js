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
                    // Vider le sélecteur
                    this.aiModelSelectorTarget.innerHTML = '';
                    
                    // Séparer les modèles par type
                    const onlineModels = data.models.filter(model => model.type === 'online');
                    const localModels = data.models.filter(model => model.type === 'local');
                    
                    // Créer un groupe pour les modèles en ligne
                    if (onlineModels.length > 0) {
                        const onlineGroup = document.createElement('optgroup');
                        onlineGroup.label = 'Modèles en ligne';
                        
                        onlineModels.forEach(model => {
                            const option = document.createElement('option');
                            option.value = model.id;
                            option.textContent = model.name;
                            option.selected = model.is_active;
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
                            option.textContent = model.name;
                            option.selected = model.is_active;
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
            console.log(`=== DEBUG: Changement de modèle d'IA vers ${modelId} ===`);
            
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
         * Affiche une notification temporaire
         * @param {string} message - Le message à afficher
         * @param {boolean} isError - Indique si c'est une erreur
         */
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
    window.application.register('status-bar', StatusBarController);
})(); 