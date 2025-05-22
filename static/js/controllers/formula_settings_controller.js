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
            "extractionMethod", "questionExtractionMethod"
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
         * Charger les paramètres depuis le gestionnaire de configuration
         */
        async loadSettings() {
            console.log('=== DEBUG: Chargement des paramètres Formula Solver ===');
            
            try {
                // Utiliser le ConfigManager pour récupérer les paramètres formula
                const settings = await window.configManager.getCategory('formula');
                
                if (settings) {
                    this.updateUI(settings);
                } else {
                    console.error('Erreur lors du chargement des paramètres: Aucune donnée reçue');
                    this.resetToDefaults();
                }
            } catch (error) {
                console.error('Erreur lors du chargement des paramètres:', error);
                this.resetToDefaults();
            }
        }
        
        /**
         * Mettre à jour l'interface utilisateur avec les paramètres
         */
        updateUI(settings) {
            console.log('=== DEBUG: Mise à jour de l\'UI avec les paramètres ===', settings);
            
            // Si settings est null ou undefined, utiliser un objet vide
            settings = settings || {};
            
            // Récupérer la méthode d'extraction de formule
            const extractionMethod = settings.formula_extraction_method || 'regex';
            console.log(`=== DEBUG: Méthode d'extraction de formule à afficher: ${extractionMethod} ===`);
            
            // Récupérer la méthode d'extraction de question
            const questionExtractionMethod = settings.question_extraction_method || 'regex';
            console.log(`=== DEBUG: Méthode d'extraction de question à afficher: ${questionExtractionMethod} ===`);
            
            // Mettre à jour les boutons radio d'extraction de formule
            const iaRadio = document.getElementById('extraction_ia');
            const regexRadio = document.getElementById('extraction_regex');
            
            if (iaRadio && regexRadio) {
                iaRadio.checked = (extractionMethod === 'ia');
                regexRadio.checked = (extractionMethod === 'regex');
                console.log(`=== DEBUG: Boutons radio de formule mis à jour - IA: ${iaRadio.checked}, Regex: ${regexRadio.checked} ===`);
            } else {
                console.error('=== ERREUR: Impossible de trouver les boutons radio d\'extraction de formule ===');
                
                // Fallback à l'ancienne méthode
                if (this.hasExtractionMethodTargets) {
                    this.extractionMethodTargets.forEach(radio => {
                        radio.checked = radio.value === extractionMethod;
                    });
                }
            }
            
            // Mettre à jour les boutons radio d'extraction de question
            const questionIARadio = document.getElementById('question_extraction_ia');
            const questionRegexRadio = document.getElementById('question_extraction_regex');
            
            if (questionIARadio && questionRegexRadio) {
                questionIARadio.checked = (questionExtractionMethod === 'ia');
                questionRegexRadio.checked = (questionExtractionMethod === 'regex');
                console.log(`=== DEBUG: Boutons radio de question mis à jour - IA: ${questionIARadio.checked}, Regex: ${questionRegexRadio.checked} ===`);
            } else {
                console.error('=== ERREUR: Impossible de trouver les boutons radio d\'extraction de question ===');
                
                // Fallback à l'ancienne méthode
                if (this.hasQuestionExtractionMethodTargets) {
                    this.questionExtractionMethodTargets.forEach(radio => {
                        radio.checked = radio.value === questionExtractionMethod;
                    });
                }
            }
        }
        
        /**
         * Définir les valeurs par défaut
         */
        resetToDefaults() {
            // Réinitialiser les boutons radio d'extraction de formule
            if (this.hasExtractionMethodTargets) {
                this.extractionMethodTargets.forEach(radio => {
                    radio.checked = radio.value === 'regex';
                });
            }
            
            // Réinitialiser les boutons radio d'extraction de question
            if (this.hasQuestionExtractionMethodTargets) {
                this.questionExtractionMethodTargets.forEach(radio => {
                    radio.checked = radio.value === 'regex';
                });
            }
        }
        
        /**
         * Enregistrer les paramètres
         */
        async saveSettings() {
            console.log('=== DEBUG: Enregistrement des paramètres ===');
            
            // Récupérer la méthode d'extraction de formule
            let extractionMethod = 'regex'; // Valeur par défaut
            const checkedRadio = document.querySelector('input[name="extraction_method"]:checked');
            if (checkedRadio) {
                extractionMethod = checkedRadio.value;
                console.log(`=== DEBUG: Bouton radio de formule sélectionné: ${checkedRadio.id}, valeur: ${extractionMethod} ===`);
            } else {
                console.error('=== ERREUR: Aucun bouton radio d\'extraction de formule sélectionné ===');
            }
            
            // Récupérer la méthode d'extraction de question
            let questionExtractionMethod = 'regex'; // Valeur par défaut
            const checkedQuestionRadio = document.querySelector('input[name="question_extraction_method"]:checked');
            if (checkedQuestionRadio) {
                questionExtractionMethod = checkedQuestionRadio.value;
                console.log(`=== DEBUG: Bouton radio de question sélectionné: ${checkedQuestionRadio.id}, valeur: ${questionExtractionMethod} ===`);
            } else {
                console.error('=== ERREUR: Aucun bouton radio d\'extraction de question sélectionné ===');
            }
            
            const settings = {
                formula_extraction_method: extractionMethod,
                question_extraction_method: questionExtractionMethod
            };
            
            console.log('=== DEBUG: Paramètres à enregistrer ===', settings);
            
            try {
                // Utiliser le ConfigManager pour sauvegarder les paramètres
                const success = await window.configManager.saveCategory('formula', settings);
                
                if (success) {
                    this.showNotification('Paramètres enregistrés avec succès!');
                    
                    // Forcer un rafraîchissement des paramètres après 500ms
                    setTimeout(() => {
                        window.configManager.clearCache('formula');
                        this.loadSettings();
                    }, 500);
                } else {
                    this.showNotification('Erreur lors de l\'enregistrement des paramètres', true);
                }
            } catch (error) {
                console.error('=== ERREUR lors de l\'enregistrement ===', error);
                this.showNotification('Erreur: ' + error.message, true);
            }
        }
        
        /**
         * Réinitialiser les paramètres aux valeurs par défaut
         */
        async resetDefaults() {
            console.log('=== DEBUG: Réinitialisation des paramètres ===');
            
            this.resetToDefaults();
            await this.saveSettings();
            
            // Vider le cache pour forcer un rafraîchissement
            window.configManager.clearCache('formula');
            
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