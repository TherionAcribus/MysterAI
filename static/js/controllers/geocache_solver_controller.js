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
        "pluginResult"
    ]
    
    static values = {
        geocacheId: String,
        gcCode: String,
        selectedPlugin: String
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
            const response = await fetch(`/api/plugins/${pluginName}/interface`);
            if (!response.ok) {
                throw new Error(`Erreur lors du chargement de l'interface du plugin: ${response.statusText}`);
            }
            
            const html = await response.text();
            this.pluginsPanelTarget.innerHTML = html;
            
            // Pré-remplir la zone de texte avec le contenu de la description si nécessaire
            const textInputs = this.pluginsPanelTarget.querySelectorAll('textarea');
            if (textInputs.length > 0) {
                // Utiliser seulement le premier textarea trouvé
                textInputs[0].value = this.descriptionTextTarget.value;
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.pluginsPanelTarget.innerHTML = `<div class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">Erreur: ${error.message}</div>`;
        }
    }
    
    async executePlugin(event) {
        event.preventDefault();
        
        const form = event.currentTarget;
        const pluginName = form.dataset.pluginName;
        
        try {
            // Récupérer les données du formulaire
            const formData = new FormData(form);
            const data = {};
            formData.forEach((value, key) => {
                data[key] = value;
            });
            
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
                if (result.text_output) {
                    this.pluginResultTarget.innerHTML = `
                        <div class="bg-gray-900 rounded-lg p-3 border border-gray-700">
                            <div class="text-sm text-gray-300 whitespace-pre-wrap">${result.text_output}</div>
                        </div>
                    `;
                } else {
                    this.pluginResultTarget.innerHTML = `
                        <div class="bg-gray-900 rounded-lg p-3 border border-gray-700">
                            <div class="text-sm text-gray-300">Résultat: ${JSON.stringify(result, null, 2)}</div>
                        </div>
                    `;
                }
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
