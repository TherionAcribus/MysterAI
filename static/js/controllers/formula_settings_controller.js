/**
 * Contrôleur Stimulus pour les paramètres du Formula Solver
 */
(() => {
    // S'assurer que Stimulus est disponible globalement
    if (!window.Stimulus) {
        console.error("Stimulus n'est pas disponible globalement");
        return;
    }
    
    class FormulaSettingsController extends Stimulus.Controller {
        static targets = [
            "extractionMethod"
        ];
        
        connect() {
            console.log('=== DEBUG: FormulaSettingsController connecté ===');
            
            // Attendre un instant pour s'assurer que le DOM est complètement chargé
            setTimeout(() => {
                this.loadSettings();
            }, 100);

            // Ajouter un événement pour détecter lorsque le panneau devient visible
            document.addEventListener('click', (event) => {
                // Vérifier si c'est un clic sur l'onglet Formula
                if (event.target.matches('.settings-tab[data-tab="formula"]')) {
                    console.log('=== DEBUG: Onglet Formula activé, rechargement des paramètres ===');
                    this.loadSettings();
                }
            });
        }
        
        /**
         * Charger les paramètres depuis le serveur
         */
        loadSettings() {
            console.log('=== DEBUG: Chargement des paramètres Formula Solver ===');
            
            fetch('/api/settings/formula')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erreur HTTP: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('=== DEBUG: Réponse du serveur ===', data);
                    
                    if (data.success) {
                        this.updateUI(data.settings);
                    } else {
                        console.error('Erreur lors du chargement des paramètres:', data.error);
                        // En cas d'erreur, définir les valeurs par défaut
                        this.resetToDefaults();
                    }
                })
                .catch(error => {
                    console.error('Erreur lors du chargement des paramètres:', error);
                    // En cas d'erreur, définir les valeurs par défaut
                    this.resetToDefaults();
                });
        }
        
        /**
         * Mettre à jour l'interface utilisateur avec les paramètres
         */
        updateUI(settings) {
            console.log('=== DEBUG: Mise à jour de l\'UI avec les paramètres ===', settings);
            
            // Si settings est null ou undefined, utiliser un objet vide
            settings = settings || {};
            
            // Récupérer la méthode d'extraction
            const method = settings.formula_extraction_method || 'regex';
            console.log(`=== DEBUG: Méthode d'extraction à afficher: ${method} ===`);
            
            // Mettre à jour les boutons radio directement via le DOM
            const iaRadio = document.getElementById('extraction_ia');
            const regexRadio = document.getElementById('extraction_regex');
            
            if (iaRadio && regexRadio) {
                iaRadio.checked = (method === 'ia');
                regexRadio.checked = (method === 'regex');
                console.log(`=== DEBUG: Boutons radio mis à jour - IA: ${iaRadio.checked}, Regex: ${regexRadio.checked} ===`);
            } else {
                console.error('=== ERREUR: Impossible de trouver les boutons radio ===');
                
                // Fallback à l'ancienne méthode
                if (this.hasExtractionMethodTargets) {
                    this.extractionMethodTargets.forEach(radio => {
                        radio.checked = radio.value === method;
                    });
                }
            }
        }
        
        /**
         * Définir les valeurs par défaut
         */
        resetToDefaults() {
            if (this.hasExtractionMethodTargets) {
                // Par défaut, utiliser regex
                this.extractionMethodTargets.forEach(radio => {
                    radio.checked = radio.value === 'regex';
                });
            }
        }
        
        /**
         * Enregistrer les paramètres
         */
        saveSettings() {
            console.log('=== DEBUG: Enregistrement des paramètres ===');
            
            // Récupérer la méthode d'extraction sélectionnée directement depuis le DOM
            let extractionMethod = 'regex'; // Valeur par défaut

            // Approche directe pour trouver le bouton radio sélectionné
            const checkedRadio = document.querySelector('input[name="extraction_method"]:checked');
            if (checkedRadio) {
                extractionMethod = checkedRadio.value;
                console.log(`=== DEBUG: Bouton radio sélectionné: ${checkedRadio.id}, valeur: ${extractionMethod} ===`);
            } else {
                console.error('=== ERREUR: Aucun bouton radio sélectionné ===');
            }
            
            const settings = {
                formula_extraction_method: extractionMethod
            };
            
            console.log('=== DEBUG: Paramètres à enregistrer ===', settings);
            
            fetch('/api/settings/formula/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('=== DEBUG: Réponse après enregistrement ===', data);
                
                if (data.success) {
                    this.showNotification('Paramètres enregistrés avec succès!');
                    
                    // Charger à nouveau les paramètres pour s'assurer que l'UI est à jour
                    setTimeout(() => {
                        this.loadSettings();
                    }, 500);
                } else {
                    this.showNotification('Erreur: ' + data.error, true);
                }
            })
            .catch(error => {
                console.error('=== ERREUR lors de l\'enregistrement ===', error);
                this.showNotification('Erreur: ' + error.message, true);
            });
        }
        
        /**
         * Réinitialiser les paramètres aux valeurs par défaut
         */
        resetDefaults() {
            console.log('=== DEBUG: Réinitialisation des paramètres ===');
            
            this.resetToDefaults();
            this.saveSettings();
            
            this.showNotification('Paramètres réinitialisés aux valeurs par défaut');
        }
        
        /**
         * Afficher une notification
         */
        showNotification(message, isError = false) {
            console.log(`=== DEBUG: Affichage d'une notification (${isError ? 'erreur' : 'succès'}) ===`, message);
            
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
    window.application.register('formula-settings', FormulaSettingsController);
})(); 