// Alphabet Display Controller
(() => {
    // S'assurer que Stimulus est disponible globalement
    if (!window.Stimulus) {
        console.error("Stimulus n'est pas disponible globalement");
        return;
    }
    
    class AlphabetDisplayController extends Stimulus.Controller {
        static targets = ["showSelector", "exampleControl", "textSelector", "sizeSelector", "customTextControls", "customText", "searchInput", "searchInName", "searchInTags", "searchInReadme"];
    
        connect() {
            console.log("Alphabet display controller connected");
            this.searchTimeout = null; // Pour le debounce
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

            // Ajouter l'événement de recherche
            if (this.hasSearchInputTarget) {
                this.searchInputTarget.addEventListener('input', () => {
                    this.debouncedSearch();
                });
                
                this.searchInputTarget.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        this.updateAlphabetsList();
                    }
                });
            }

            // Ajouter les événements pour les checkboxes de recherche
            [this.searchInNameTarget, this.searchInTagsTarget, this.searchInReadmeTarget].forEach(target => {
                if (target) {
                    target.addEventListener('change', () => {
                        this.updateAlphabetsList();
                    });
                }
            });
        }

        disconnect() {
            // Nettoyer le timeout si le contrôleur est déconnecté
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }
        }

        // Recherche avec debounce
        debouncedSearch() {
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }
            
            this.searchTimeout = setTimeout(() => {
                this.updateAlphabetsList();
            }, 500); // Attendre 500ms après la dernière frappe
        }

        // Effacer la recherche
        clearSearch() {
            if (this.hasSearchInputTarget) {
                this.searchInputTarget.value = '';
                this.updateAlphabetsList();
            }
        }

        // Mettre à jour la liste des alphabets
        updateAlphabetsList() {
            const params = new URLSearchParams();
            
            // Récupérer tous les paramètres
            if (this.hasShowSelectorTarget) {
                params.set('show_examples', this.showSelectorTarget.value);
            }
            
            if (this.hasTextSelectorTarget) {
                params.set('example_text', this.textSelectorTarget.value);
            }
            
            if (this.hasSizeSelectorTarget) {
                params.set('font_size', this.sizeSelectorTarget.value);
            }
            
            if (this.hasCustomTextTarget) {
                params.set('custom_text', this.customTextTarget.value);
            }
            
            if (this.hasSearchInputTarget) {
                params.set('search', this.searchInputTarget.value);
            }

            // Ajouter les paramètres des checkboxes de recherche
            if (this.hasSearchInNameTarget) {
                params.set('search_in_name', this.searchInNameTarget.checked);
            }
            
            if (this.hasSearchInTagsTarget) {
                params.set('search_in_tags', this.searchInTagsTarget.checked);
            }
            
            if (this.hasSearchInReadmeTarget) {
                params.set('search_in_readme', this.searchInReadmeTarget.checked);
            }
            
            const url = `/api/alphabets/list?${params.toString()}`;
            
            // Effectuer la requête
            fetch(url)
                .then(response => response.text())
                .then(html => {
                    const container = document.getElementById('alphabets-list-container');
                    if (container) {
                        container.innerHTML = html;
                        
                        // Réinitialiser les gestionnaires d'événements
                        setTimeout(() => {
                            console.log("Réinitialisation des gestionnaires d'événements après mise à jour des alphabets");
                            // Les événements de tabs sont gérés automatiquement par TabOpenerService
                        }, 100);
                    }
                })
                .catch(error => {
                    console.error('Erreur lors de la mise à jour des alphabets:', error);
                });
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
            
            // Mettre à jour la liste
            this.updateAlphabetsList();
        }
        
        toggleCustomTextControls() {
            if (!this.hasTextSelectorTarget || !this.hasShowSelectorTarget || !this.hasCustomTextControlsTarget) return;
            
            const isCustom = this.textSelectorTarget.value === 'custom';
            
            if (isCustom && this.showSelectorTarget.value === 'true') {
                this.customTextControlsTarget.classList.remove('hidden');
            } else {
                this.customTextControlsTarget.classList.add('hidden');
            }
            
            // Mettre à jour la liste
            this.updateAlphabetsList();
        }
    }
    
    // Enregistrer le contrôleur
    window.StimulusApp.register("alphabet-display", AlphabetDisplayController);
})();
