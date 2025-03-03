// Geocache Solver Controller
window.GeocacheSolverController = class extends Stimulus.Controller {
    static targets = [
        "loading", 
        "description", 
        "descriptionText", 
        "error", 
        "pluginsPanel", 
        "togglePluginsButton",
        "pluginList",
        "pluginResult",
        "pluginResultText",
        "pluginInputText"
    ]
    
    static values = {
        geocacheId: String,
        gcCode: String,
        selectedPlugin: String,
        lastPluginOutput: String
    }

    connect() {
        console.log("Solver controller connected", {
            geocacheId: this.geocacheIdValue,
            gcCode: this.gcCodeValue
        });
        this.loadGeocacheData();
    }

    async loadGeocacheData() {
        try {
            this.showLoading();
            
            // Obtenir les données textuelles de la géocache
            const response = await fetch(`/geocaches/${this.geocacheIdValue}/text`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des données');
            }

            const data = await response.json();
            this.displayDescription(data.description);
        } catch (error) {
            console.error('Erreur:', error);
            this.showError();
        }
    }

    displayDescription(description) {
        this.hideLoading();
        this.errorTarget.classList.add('hidden');
        this.descriptionTarget.classList.remove('hidden');
        
        // Afficher le texte dans le textarea
        this.descriptionTextTarget.value = description;
    }

    showLoading() {
        this.loadingTarget.classList.remove('hidden');
        this.descriptionTarget.classList.add('hidden');
        this.errorTarget.classList.add('hidden');
    }

    hideLoading() {
        this.loadingTarget.classList.add('hidden');
    }

    showError() {
        this.hideLoading();
        this.descriptionTarget.classList.add('hidden');
        this.errorTarget.classList.remove('hidden');
    }
    
    // Méthodes pour gérer les plugins
    
    async togglePluginsPanel() {
        if (this.pluginsPanelTarget.classList.contains('hidden')) {
            // Si le panneau est masqué, l'afficher et charger les plugins
            this.pluginsPanelTarget.classList.remove('hidden');
            this.togglePluginsButtonTarget.classList.add('bg-purple-700');
            this.togglePluginsButtonTarget.classList.remove('bg-purple-600');
            
            // Charger la liste des plugins si elle n'est pas déjà chargée
            if (!this.pluginsPanelTarget.hasAttribute('data-loaded')) {
                await this.loadPluginsList();
                this.pluginsPanelTarget.setAttribute('data-loaded', 'true');
            }
        } else {
            // Si le panneau est visible, le masquer
            this.pluginsPanelTarget.classList.add('hidden');
            this.togglePluginsButtonTarget.classList.remove('bg-purple-700');
            this.togglePluginsButtonTarget.classList.add('bg-purple-600');
        }
    }
    
    async loadPluginsList() {
        try {
            // Afficher un indicateur de chargement
            this.pluginsPanelTarget.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-light" role="status"></div><span class="ml-2">Chargement des plugins...</span></div>';
            
            // Charger la liste des plugins
            const response = await fetch('/api/solver/plugins');
            if (!response.ok) {
                throw new Error('Erreur lors du chargement des plugins');
            }
            
            const html = await response.text();
            this.pluginsPanelTarget.innerHTML = html;
            
            // Si nous avons une cible pluginList, stocker une référence (sinon, elle sera définie plus tard)
            if (this.hasPluginListTarget) {
                this.pluginListElement = this.pluginListTarget;
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.pluginsPanelTarget.innerHTML = `<div class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">Erreur lors du chargement des plugins: ${error.message}</div>`;
        }
    }
    
    async selectPlugin(event) {
        const pluginId = event.currentTarget.dataset.pluginId;
        const pluginName = event.currentTarget.dataset.pluginName;
        
        try {
            // Stocker le plugin sélectionné
            this.selectedPluginValue = pluginName;
            
            // Charger l'interface du plugin
            const response = await fetch(`/api/plugins/${pluginName}/interface?from_solver=true`);
            if (!response.ok) {
                throw new Error(`Erreur lors du chargement de l'interface du plugin: ${response.statusText}`);
            }
            
            const html = await response.text();
            this.pluginsPanelTarget.innerHTML = html;
            
            // Remplir automatiquement le champ de texte caché
            if (this.hasPluginInputTextTarget) {
                // Si nous avons déjà un résultat de plugin précédent, l'utiliser
                if (this.hasLastPluginOutputValue && this.lastPluginOutputValue) {
                    this.pluginInputTextTarget.value = this.lastPluginOutputValue;
                } else {
                    // Sinon, utiliser le contenu actuel de la description
                    this.pluginInputTextTarget.value = this.descriptionTextTarget.value;
                }
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.pluginsPanelTarget.innerHTML = `<div class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">Erreur: ${error.message}</div>`;
        }
    }
    
    async executePlugin(event) {
        event.preventDefault();
        
        // Récupérer les données du formulaire
        let pluginName;
        let formData;
        
        if (event.currentTarget.tagName === 'FORM') {
            // Si c'est un formulaire
            const form = event.currentTarget;
            pluginName = form.dataset.pluginName;
            formData = new FormData(form);
        } else {
            // Si c'est un bouton
            const button = event.currentTarget;
            pluginName = button.dataset.pluginName;
            
            // Trouver le formulaire dans le panneau des plugins
            const form = this.pluginsPanelTarget.querySelector('form');
            formData = new FormData(form);
        }
        
        // Convertir FormData en objet
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });
        
        // Ajouter le texte actuel de la description
        if (this.hasDescriptionTextTarget) {
            data['text'] = this.descriptionTextTarget.value;
        }
        
        try {
            // Afficher un indicateur de chargement dans la zone de résultat
            if (this.hasPluginResultTarget) {
                this.pluginResultTarget.classList.remove('hidden');
                this.pluginResultTarget.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-light" role="status"></div><span class="ml-2">Exécution en cours...</span></div>';
            }
            
            // Exécuter le plugin
            const response = await fetch(`/api/plugins/${pluginName}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`Erreur lors de l'exécution du plugin: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            // Afficher le résultat
            if (this.hasPluginResultTarget) {
                this.pluginResultTarget.classList.remove('hidden');
                let resultText = '';
                
                if (result.text_output) {
                    resultText = result.text_output;
                    this.pluginResultTarget.innerHTML = `
                        <div class="bg-gray-900 rounded-lg p-3 border border-gray-700">
                            <div class="text-sm text-gray-300 whitespace-pre-wrap">${resultText}</div>
                        </div>
                    `;
                } else {
                    resultText = JSON.stringify(result, null, 2);
                    this.pluginResultTarget.innerHTML = `
                        <div class="bg-gray-900 rounded-lg p-3 border border-gray-700">
                            <div class="text-sm text-gray-300">Résultat: ${resultText}</div>
                        </div>
                    `;
                }
                
                // Stocker le résultat pour le prochain plugin
                this.lastPluginOutputValue = resultText;
                
                // Ajouter un bouton pour appliquer un autre plugin sur ce résultat
                this.pluginResultTarget.innerHTML += `
                    <div class="mt-3 flex justify-end">
                        <button 
                            data-action="click->geocache-solver#loadPluginsList"
                            class="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors">
                            Appliquer un autre plugin
                        </button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Erreur:', error);
            if (this.hasPluginResultTarget) {
                this.pluginResultTarget.classList.remove('hidden');
                this.pluginResultTarget.innerHTML = `<div class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">Erreur: ${error.message}</div>`;
            }
        }
    }
    
    closePlugin() {
        // Réinitialiser le plugin sélectionné
        this.selectedPluginValue = '';
        
        // Recharger la liste des plugins
        this.loadPluginsList();
    }
    
    filterPlugins(event) {
        const searchTerm = event.target.value.toLowerCase();
        
        // Si nous n'avons pas encore de référence à la liste des plugins, la trouver
        if (!this.pluginListElement && this.hasPluginListTarget) {
            this.pluginListElement = this.pluginListTarget;
        }
        
        // Si nous avons une référence à la liste des plugins, filtrer les éléments
        if (this.pluginListElement) {
            const pluginItems = this.pluginListElement.querySelectorAll('.plugin-item');
            
            pluginItems.forEach(item => {
                const pluginName = item.dataset.pluginName.toLowerCase();
                const description = item.querySelector('p').textContent.toLowerCase();
                
                if (pluginName.includes(searchTerm) || description.includes(searchTerm)) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });
        }
    }
}
