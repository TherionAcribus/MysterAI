// Controller for displaying/hiding alphabet examples
(function() {
    class AlphabetDisplayController extends Stimulus.Controller {
        static targets = ["showSelector", "exampleControl", "textSelector", "sizeSelector", "customTextControls", "customText"];
    
        connect() {
            console.log("Alphabet display controller connected");
            this.toggleExampleControls();
            this.toggleCustomTextControls();
            
            // Ajouter les événements
            if (this.hasShowSelectorTarget) {
                this.showSelectorTarget.addEventListener('change', () => {
                    this.toggleExampleControls();
                });
            }
            
            if (this.hasTextSelectorTarget) {
                this.textSelectorTarget.addEventListener('change', () => {
                    this.toggleCustomTextControls();
                });
            }
        }
    
        toggleExampleControls() {
            if (!this.hasShowSelectorTarget) return;
            
            const showExamples = this.showSelectorTarget.value === 'true';
            if (this.hasExampleControlTarget) {
                this.exampleControlTargets.forEach(control => {
                    if (showExamples) {
                        control.classList.remove('hidden');
                    } else {
                        control.classList.add('hidden');
                    }
                });
            }
            
            // Masquer aussi le champ personnalisé si nécessaire
            if (!showExamples && this.hasCustomTextControlsTarget) {
                this.customTextControlsTarget.classList.add('hidden');
            } else if (this.hasCustomTextControlsTarget) {
                this.toggleCustomTextControls();
            }
        }
        
        toggleCustomTextControls() {
            if (!this.hasTextSelectorTarget || !this.hasShowSelectorTarget || !this.hasCustomTextControlsTarget) return;
            
            const isCustom = this.textSelectorTarget.value === 'custom';
            
            if (isCustom && this.showSelectorTarget.value === 'true') {
                this.customTextControlsTarget.classList.remove('hidden');
            } else {
                this.customTextControlsTarget.classList.add('hidden');
            }
        }
    }
    
    // Enregistrer le contrôleur
    window.Stimulus.register("alphabet-display", AlphabetDisplayController);
})();
