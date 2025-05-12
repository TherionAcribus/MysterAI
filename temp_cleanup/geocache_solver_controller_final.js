// Geocache Solver Controller
}
    }
}
    }
window.GeocacheSolverController = class extends Stimulus.Controller {
    static targets = [
        "loading", "description", "descriptionText", "error", 
        "pluginsPanel", "togglePluginsButton", "togglePluginsText",
        "pluginList", "pluginResult", "pluginResultText", "pluginInputText",
        "pluginsResults", "resultsContainer", "metaSolverPanel",
        "toggleMetaSolverButton"
    ]
    
    static values = {
        geocacheId: String,
        gcCode: String,
        selectedPlugin: String,
        lastPluginOutput: String,
        pluginsHistory: Array,
        lastDetectedCoordinates: Object
    }

    connect() {
        console.log("Solver controller connected", {
            geocacheId: this.geocacheIdValue,
            gcCode: this.gcCodeValue
        });
        
        // Initialiser l'historique des plugins
        this.pluginsHistoryValue = [];
        
        // VÃ©rifier si une gÃ©ocache est spÃ©cifiÃ©e
        if (this.geocacheIdValue && this.geocacheIdValue.trim() !== '') {
            this.loadGeocacheData();
        } else {
            // Aucune gÃ©ocache spÃ©cifiÃ©e, initialiser un panneau vide
            console.log("Aucune gÃ©ocache spÃ©cifiÃ©e, initialisation d'un panneau vide");
            this.hideLoading();
            this.descriptionTarget.classList.remove('hidden');
            this.descriptionTextTarget.value = '';
        }
        
        // Ajouter un Ã©couteur d'Ã©vÃ©nement pour le changement de type de caractÃ¨res autorisÃ©s
        document.addEventListener('DOMContentLoaded', () => {
            const allowedCharsSelect = document.getElementById('metasolver-allowed-chars');
            const customCharsContainer = document.getElementById('metasolver-custom-chars-container');
            
            if (allowedCharsSelect && customCharsContainer) {
                allowedCharsSelect.addEventListener('change', (event) => {
                    if (event.target.value === 'custom') {
                        customCharsContainer.classList.remove('hidden');
                    } else {
                        customCharsContainer.classList.add('hidden');
                    }
                });
            }
        });
        
        // AJOUT: Ã‰couter les changements dans le champ de description
        if (this.hasDescriptionTextTarget) {
            this.descriptionTextTarget.addEventListener('input', (event) => {
                console.log("Mise Ã  jour du champ de description dÃ©tectÃ©e:", event.target.value);
                // Forcer une mise Ã  jour du modÃ¨le
                this._currentDescriptionValue = event.target.value;
            });
        }

        // AJOUT: Ã‰couter les Ã©vÃ©nements de dÃ©tection de coordonnÃ©es GPS
        console.log("Configuration de l'Ã©couteur d'Ã©vÃ©nements pour coordinatesDetected");
        document.addEventListener('coordinatesDetected', this.handleCoordinatesDetected.bind(this));
        
        // AJOUT: VÃ©rification immÃ©diate des cibles Stimulus
        console.log("VÃ©rification des cibles Stimulus pour les coordonnÃ©es:", {
            hasCoordinatesContainerTarget: this.hasCoordinatesContainerTarget,
            hasCoordinatesContentTarget: this.hasCoordinatesContentTarget
        });
        
        // AJOUT: Ã‰couter l'Ã©vÃ©nement directement sur le document
        document.addEventListener('coordinatesDetected', function(event) {
            console.log("Ã‰vÃ©nement coordinatesDetected reÃ§u directement par le document:", event.detail);
        });
    }

    // AJOUT: MÃ©thode pour gÃ©rer l'Ã©vÃ©nement de dÃ©tection de coordonnÃ©es GPS
    handleCoordinatesDetected(event) {
        console.log("CoordonnÃ©es GPS dÃ©tectÃ©es dans Geocache Solver:", event.detail);
        
        // VÃ©rifier si des coordonnÃ©es ont Ã©tÃ© dÃ©tectÃ©es
        if (event.detail && event.detail.exist) {
            console.log("CoordonnÃ©es valides dÃ©tectÃ©es, mise Ã  jour de l'affichage");
            
            // Stocker les coordonnÃ©es dÃ©tectÃ©es
            this.lastDetectedCoordinatesValue = event.detail;
            
            // CrÃ©er ou mettre Ã  jour la zone d'affichage des coordonnÃ©es
            this.displayDetectedCoordinates(event.detail);
        } else {
            console.log("CoordonnÃ©es non valides ou inexistantes dans l'Ã©vÃ©nement");
        }
    }

    // AJOUT: MÃ©thode pour afficher les coordonnÃ©es dÃ©tectÃ©es
    displayDetectedCoordinates(coordinates) {
        console.log("DÃ©but de displayDetectedCoordinates avec:", coordinates);
        
        // VÃ©rifier si nous avons les cibles Stimulus pour les coordonnÃ©es
        if (!this.hasCoordinatesContainerTarget || !this.hasCoordinatesContentTarget) {
            console.error("Les cibles Stimulus pour les coordonnÃ©es n'ont pas Ã©tÃ© trouvÃ©es");
            console.log("Cibles disponibles:", this.targets);
            
            // Essayer de trouver les Ã©lÃ©ments par leur ID comme fallback
            const containerById = document.getElementById('geocache-solver-coordinates-container');
            const contentById = document.getElementById('geocache-solver-coordinates-content');
            
            if (containerById && contentById) {
                console.log("Ã‰lÃ©ments trouvÃ©s par ID, utilisation comme fallback");
                this._updateCoordinatesDisplay(coordinates, containerById, contentById);
                return;
            }
            
            // CrÃ©er les Ã©lÃ©ments dynamiquement si nÃ©cessaire
            console.log("CrÃ©ation dynamique des Ã©lÃ©ments de coordonnÃ©es");
            this._createCoordinatesElements(coordinates);
            return;
        }
        
        console.log("Cibles Stimulus trouvÃ©es, mise Ã  jour de l'affichage");
        
        // RÃ©cupÃ©rer les coordonnÃ©es en format DDM
        const ddmLat = coordinates.ddm_lat || '';
        const ddmLon = coordinates.ddm_lon || '';
        const ddmFull = coordinates.ddm || `${ddmLat} ${ddmLon}`;
        
        // GÃ©nÃ©rer le HTML pour l'affichage des coordonnÃ©es
        this.coordinatesContentTarget.innerHTML = `
            <div class="mb-3">
                <label class="block text-sm font-medium text-gray-400 mb-1">Format DDM:</label>
                <input type="text" class="w-full bg-gray-700 text-green-300 border border-gray-600 rounded p-2 font-mono" 
                       value="${ddmFull}" readonly>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-3">
                <div>
                    <label class="block text-sm font-medium text-gray-400 mb-1">Latitude:</label>
                    <input type="text" class="w-full bg-gray-700 text-green-300 border border-gray-600 rounded p-2 font-mono" 
                           value="${ddmLat}" readonly>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-400 mb-1">Longitude:</label>
                    <input type="text" class="w-full bg-gray-700 text-green-300 border border-gray-600 rounded p-2 font-mono" 
                           value="${ddmLon}" readonly>
                </div>
            </div>
            <div class="flex space-x-3">
                <button class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                        onclick="navigator.clipboard.writeText('${ddmFull}')">
                    Copier les coordonnÃ©es
                </button>
                ${this.geocacheIdValue ? `
                <button class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                        data-action="click->geocache-solver#useCoordinates">
                    Utiliser pour la gÃ©ocache
                </button>
                ` : ''}
            </div>
        `;
        
        // Afficher le conteneur de coordonnÃ©es
        this.coordinatesContainerTarget.classList.remove('hidden');
        console.log("Affichage des coordonnÃ©es terminÃ© avec succÃ¨s");
    }
    
    // MÃ©thode auxiliaire pour crÃ©er dynamiquement les Ã©lÃ©ments de coordonnÃ©es
    _createCoordinatesElements(coordinates) {
        console.log("CrÃ©ation dynamique des Ã©lÃ©ments de coordonnÃ©es");
        
        // CrÃ©er le conteneur principal
        const container = document.createElement('div');
        container.id = 'geocache-solver-coordinates-container';
        container.className = 'bg-gray-800 rounded-lg p-4 mb-4';
        
        // CrÃ©er le titre
        const title = document.createElement('h2');
        title.className = 'text-lg font-semibold text-gray-100 mb-3';
        title.textContent = 'CoordonnÃ©es GPS dÃ©tectÃ©es';
        container.appendChild(title);
        
        // CrÃ©er le conteneur de contenu
        const content = document.createElement('div');
        content.id = 'geocache-solver-coordinates-content';
        content.className = 'bg-gray-700 p-4 rounded';
        container.appendChild(content);
        
        // InsÃ©rer le conteneur dans le DOM
        if (this.hasResultsContainerTarget) {
            this.resultsContainerTarget.parentNode.insertBefore(container, this.resultsContainerTarget.nextSibling);
            console.log("Conteneur de coordonnÃ©es insÃ©rÃ© aprÃ¨s resultsContainer");
        } else {
            // Fallback: ajouter Ã  la fin de la description
            if (this.hasDescriptionTarget) {
                this.descriptionTarget.appendChild(container);
                console.log("Conteneur de coordonnÃ©es ajoutÃ© Ã  la fin de description");
            } else {
                console.error("Impossible de trouver un endroit oÃ¹ insÃ©rer le conteneur de coordonnÃ©es");
                return;
            }
        }
        
        // Mettre Ã  jour l'affichage des coordonnÃ©es
        this._updateCoordinatesDisplay(coordinates, container, content);
    }
    
    // MÃ©thode auxiliaire pour mettre Ã  jour l'affichage des coordonnÃ©es
    _updateCoordinatesDisplay(coordinates, container, content) {
        // RÃ©cupÃ©rer les coordonnÃ©es en format DDM
        const ddmLat = coordinates.ddm_lat || '';
        const ddmLon = coordinates.ddm_lon || '';
        const ddmFull = coordinates.ddm || `${ddmLat} ${ddmLon}`;
        
        // GÃ©nÃ©rer le HTML pour l'affichage des coordonnÃ©es
        content.innerHTML = `
            <div class="mb-3">
                <label class="block text-sm font-medium text-gray-400 mb-1">Format DDM:</label>
                <input type="text" class="w-full bg-gray-700 text-green-300 border border-gray-600 rounded p-2 font-mono" 
                       value="${ddmFull}" readonly>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-3">
                <div>
                    <label class="block text-sm font-medium text-gray-400 mb-1">Latitude:</label>
                    <input type="text" class="w-full bg-gray-700 text-green-300 border border-gray-600 rounded p-2 font-mono" 
                           value="${ddmLat}" readonly>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-400 mb-1">Longitude:</label>
                    <input type="text" class="w-full bg-gray-700 text-green-300 border border-gray-600 rounded p-2 font-mono" 
                           value="${ddmLon}" readonly>
                </div>
            </div>
            <div class="flex space-x-3">
                <button class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                        onclick="navigator.clipboard.writeText('${ddmFull}')">
                    Copier les coordonnÃ©es
                </button>
                ${this.geocacheIdValue ? `
                <button class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                        data-action="click->geocache-solver#useCoordinates">
                    Utiliser pour la gÃ©ocache
                </button>
                ` : ''}
            </div>
        `;
        
        // Afficher le conteneur
        container.classList.remove('hidden');
        console.log("Affichage des coordonnÃ©es terminÃ© avec succÃ¨s (mÃ©thode auxiliaire)");
    }

    async loadGeocacheData() {
        try {
            this.showLoading();
            
            // Obtenir les donnÃ©es textuelles de la gÃ©ocache
            const response = await fetch(`/geocaches/${this.geocacheIdValue}/text`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des donnÃ©es');
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
    
    // MÃ©thodes pour gÃ©rer les plugins
    
    togglePluginsPanel() {
        console.log("togglePluginsPanel appelÃ©");
        
        // Masquer le panneau MetaSolver s'il est visible
        if (!this.metaSolverPanelTarget.classList.contains('hidden')) {
            this.metaSolverPanelTarget.classList.add('hidden');
            this.toggleMetaSolverButtonTarget.classList.remove('bg-blue-700');
            this.toggleMetaSolverButtonTarget.classList.add('bg-blue-600');
        }
        
        // Si le panneau est masquÃ©, l'afficher et charger les plugins
        if (this.pluginsPanelTarget.classList.contains('hidden')) {
            console.log("Panneau masquÃ©, on l'affiche");
            this.pluginsPanelTarget.classList.remove('hidden');
            this.togglePluginsButtonTarget.classList.remove('bg-purple-600');
            this.togglePluginsButtonTarget.classList.add('bg-purple-700');
            
            // Charger les plugins si ce n'est pas dÃ©jÃ  fait
            if (!this.pluginsPanelTarget.hasAttribute('data-loaded')) {
                console.log("Plugins non chargÃ©s, on les charge");
                this.loadPluginsList();
            }
        } else {
            // Si le panneau est visible, le masquer
            console.log("Panneau visible, on le masque");
            this.pluginsPanelTarget.classList.add('hidden');
            this.togglePluginsButtonTarget.classList.remove('bg-purple-700');
            this.togglePluginsButtonTarget.classList.add('bg-purple-600');
        }
    }
    
    async loadPluginsList() {
        try {
            console.log("loadPluginsList appelÃ©");
            
            // Afficher le panneau des plugins
            console.log("Ã‰tat du panneau avant:", this.pluginsPanelTarget.classList.contains('hidden') ? "cachÃ©" : "visible");
            this.pluginsPanelTarget.classList.remove('hidden');
            console.log("Ã‰tat du panneau aprÃ¨s:", this.pluginsPanelTarget.classList.contains('hidden') ? "cachÃ©" : "visible");
            
            this.togglePluginsButtonTarget.classList.remove('bg-purple-600');
            this.togglePluginsButtonTarget.classList.add('bg-purple-700');
            
            // VÃ©rifier si les plugins sont dÃ©jÃ  chargÃ©s
            if (this.pluginsPanelTarget.hasAttribute('data-loaded')) {
                console.log("Plugins dÃ©jÃ  chargÃ©s, sortie de la fonction");
                return;
            }
            
            // Afficher un loader pendant le chargement
            this.pluginsPanelTarget.innerHTML = `
                <div class="animate-pulse">
                    <div class="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div class="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                    <div class="h-4 bg-gray-700 rounded w-2/3"></div>
                </div>
            `;
            
            // Appeler l'API pour rÃ©cupÃ©rer la liste des plugins
            const response = await fetch('/api/plugins?context=solver');
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const plugins = await response.json();
            
            // CrÃ©er un ID unique pour cette zone de plugins
            const mainPluginZoneId = `main-plugin-zone-${Date.now()}`;
            
            // CrÃ©er l'interface pour la liste des plugins
            let pluginsListHtml = `
                <div id="${mainPluginZoneId}" class="bg-gray-800 rounded-lg p-4" data-plugin-selection-zone="true">
                    <h2 class="text-lg font-semibold text-gray-100 mb-3">Plugins disponibles</h2>
                    
                    <div class="mb-4">
                        <input 
                            type="text" 
                            placeholder="Rechercher un plugin...2" 
                            class="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded-md border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            data-action="input->geocache-solver#filterPlugins">
                    </div>
                    
                    <div class="space-y-2" data-geocache-solver-target="pluginList">
            `;
            
            // Ajouter chaque plugin Ã  la liste
            plugins.forEach(plugin => {
                pluginsListHtml += `
                    <div class="plugin-item flex items-center justify-between p-2 rounded-md hover:bg-gray-700 transition-colors" data-plugin-name="${plugin.name.toLowerCase()}">
                        <div>
                            <div class="font-medium text-gray-200">${plugin.name}</div>
                            <div class="text-xs text-gray-400">${plugin.description || 'Aucune description'}</div>
                        </div>
                        <button 
                            data-action="click->geocache-solver#selectPlugin" 
                            data-plugin-id="${plugin.id}"
                            data-plugin-name="${plugin.name}"
                            data-plugin-zone-id="${mainPluginZoneId}"
                            class="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-medium transition-colors">
                            SÃ©lectionner
                        </button>
                    </div>
                `;
            });
            
            pluginsListHtml += `
                    </div>
                </div>
            `;
            
            // Mettre Ã  jour le contenu du panneau des plugins
            this.pluginsPanelTarget.innerHTML = pluginsListHtml;
            
            // Marquer les plugins comme chargÃ©s
            this.pluginsPanelTarget.setAttribute('data-loaded', 'true');
            console.log("Plugins marquÃ©s comme chargÃ©s");
            
        } catch (error) {
            console.error('Erreur lors du chargement des plugins:', error);
            this.pluginsPanelTarget.innerHTML = `
                <div class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                    Erreur lors du chargement des plugins: ${error.message}
                </div>
            `;
        }
    }
    
    async selectPlugin(event) {
        const pluginId = event.currentTarget.dataset.pluginId;
        const pluginName = event.currentTarget.dataset.pluginName;
        const pluginZoneId = event.currentTarget.dataset.pluginZoneId;
        
        console.log("SÃ©lection du plugin:", pluginName, "dans la zone:", pluginZoneId);
        
        if (pluginId && pluginName) {
            try {
                // Afficher un loader pendant le chargement
                if (pluginZoneId) {
                    const pluginZone = document.getElementById(pluginZoneId);
                    pluginZone.innerHTML = `
                        <div class="animate-pulse">
                            <div class="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                            <div class="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                            <div class="h-4 bg-gray-700 rounded w-2/3"></div>
                        </div>
                    `;
                } else {
                    this.pluginsPanelTarget.innerHTML = `
                        <div class="animate-pulse">
                            <div class="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                            <div class="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                            <div class="h-4 bg-gray-700 rounded w-2/3"></div>
                        </div>
                    `;
                }
                
                // Appeler l'API pour rÃ©cupÃ©rer l'interface du plugin
                const response = await fetch(`/api/plugins/${pluginName}/interface?context=solver`);
                
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                
                const html = await response.text();
                
                // Mettre Ã  jour le contenu du panneau des plugins
                if (pluginZoneId) {
                    const pluginZone = document.getElementById(pluginZoneId);
                    
                    // InsÃ©rer le HTML dans la zone
                    pluginZone.innerHTML = html;
                    
                    // Ajouter l'attribut data-plugin-zone-id au bouton d'exÃ©cution
                    const executeButton = pluginZone.querySelector('[data-action="click->geocache-solver#executePlugin"]');
                    if (executeButton) {
                        executeButton.setAttribute('data-plugin-zone-id', pluginZoneId);
                        console.log("Attribut data-plugin-zone-id ajoutÃ© au bouton d'exÃ©cution:", pluginZoneId);
                    }
                    
                    // Ajouter l'attribut data-plugin-input="true" Ã  tous les textareas du plugin
                    const textareas = pluginZone.querySelectorAll('textarea');
                    textareas.forEach(textarea => {
                        textarea.setAttribute('data-plugin-input', 'true');
                        console.log("Attribut data-plugin-input ajoutÃ© Ã  un textarea");
                    });
                } else {
                    this.pluginsPanelTarget.innerHTML = html;
                    
                    // Dans ce cas, nous sommes dans le panneau principal, crÃ©ons un ID
                    const mainPanelId = `main-panel-${Date.now()}`;
                    this.pluginsPanelTarget.id = mainPanelId;
                    this.pluginsPanelTarget.setAttribute('data-plugin-selection-zone', 'true');
                    
                    // Ajouter l'attribut data-plugin-zone-id au bouton d'exÃ©cution
                    const executeButton = this.pluginsPanelTarget.querySelector('[data-action="click->geocache-solver#executePlugin"]');
                    if (executeButton) {
                        executeButton.setAttribute('data-plugin-zone-id', mainPanelId);
                        console.log("Attribut data-plugin-zone-id ajoutÃ© au bouton d'exÃ©cution principal:", mainPanelId);
                    }
                    
                    // Ajouter l'attribut data-plugin-input="true" Ã  tous les textareas du plugin
                    const textareas = this.pluginsPanelTarget.querySelectorAll('textarea');
                    textareas.forEach(textarea => {
                        textarea.setAttribute('data-plugin-input', 'true');
                        console.log("Attribut data-plugin-input ajoutÃ© Ã  un textarea");
                    });
                }
                
                // Mettre Ã  jour le plugin sÃ©lectionnÃ©
                this.selectedPluginValue = pluginId;
                
                // PrÃ©parer le texte Ã  traiter (soit le rÃ©sultat du plugin prÃ©cÃ©dent, soit le texte de la description)
                if (this.hasPluginInputTextTarget) {
                    if (this.lastPluginOutputValue) {
                        this.pluginInputTextTarget.value = this.lastPluginOutputValue;
                    } else {
                        this.pluginInputTextTarget.value = this.descriptionTextTarget.value;
                    }
                }
                
            } catch (error) {
                console.error('Erreur lors du chargement de l\'interface du plugin:', error);
                if (pluginZoneId) {
                    const pluginZone = document.getElementById(pluginZoneId);
                    pluginZone.innerHTML = `
                        <div class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                            Erreur lors du chargement de l'interface du plugin: ${error.message}
                        </div>
                    `;
                } else {
                    this.pluginsPanelTarget.innerHTML = `
                        <div class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                            Erreur lors du chargement de l'interface du plugin: ${error.message}
                        </div>
                    `;
                }
            }
        }
    }
    
    // Fonction pour normaliser le texte avant de l'envoyer aux plugins
    normalizeText(text) {
        if (!text) return '';
        
        // Remplacer les espaces insÃ©cables par des espaces normaux
        let normalized = text.replace(/\xa0/g, ' ');
        
        // Normaliser les retours Ã  la ligne
        normalized = normalized.replace(/\r\n/g, '\n');
        
        // Supprimer les espaces multiples
        normalized = normalized.replace(/\s+/g, ' ');
        
        // Supprimer les espaces en dÃ©but et fin de chaÃ®ne
        normalized = normalized.trim();
        
        console.log("Texte normalisÃ©:", normalized);
        return normalized;
    }
    
    async executePlugin(event) {
        // RÃ©initialiser l'affichage des coordonnÃ©es
        this.resetCoordinatesDisplay();
        
        // Code existant pour exÃ©cuter le plugin
        const button = event.currentTarget;
        const pluginId = button.dataset.pluginId;
        const pluginName = button.dataset.pluginName;
        
        console.log("ExÃ©cution du plugin:", pluginName, "dans la zone:", button.dataset.pluginZoneId);
        
        // Si on a un plugin sÃ©lectionnÃ©
        if (pluginId && pluginName) {
            // Log pour le dÃ©bogage - valeur actuelle du champ de description
            console.log("Valeur actuelle dans descriptionTextTarget:", this.descriptionTextTarget.value);
            console.log("Valeur dans _currentDescriptionValue:", this._currentDescriptionValue || "non dÃ©finie");
            
            // RÃ©cupÃ©rer le texte Ã  traiter en privilÃ©giant toujours la saisie la plus rÃ©cente
            let textToProcess = '';
            
            // DÃ©terminer si le plugin est dÃ©jÃ  exÃ©cutÃ© dans cette zone (rÃ©exÃ©cution)
            const isReexecution = button.dataset.pluginZoneId && document.getElementById(`result-for-${button.dataset.pluginZoneId}`);
            
            // Trouver la source d'entrÃ©e actuelle - toujours prendre l'entrÃ©e la plus rÃ©cente
            const pluginZone = button.dataset.pluginZoneId ? document.getElementById(button.dataset.pluginZoneId) : null;
            
            // VÃ©rifier si une zone d'entrÃ©e de texte existe dans la zone du plugin
            const pluginInputTextarea = pluginZone ? 
                pluginZone.querySelector('textarea[data-plugin-input="true"]') : null;
            
            if (pluginInputTextarea && pluginInputTextarea.value.trim() !== '') {
                // Utiliser le texte du plugin si disponible et non vide
                textToProcess = pluginInputTextarea.value;
                console.log("Texte saisi dans le plugin utilisÃ©:", textToProcess);
            } else {
                // Essayer d'utiliser la valeur mise en cache si elle existe
                if (this._currentDescriptionValue) {
                    textToProcess = this._currentDescriptionValue;
                    console.log("Utilisation de la valeur mise en cache:", textToProcess);
                } else {
                    // Sinon utiliser le texte de la description principale
                    textToProcess = this.descriptionTextTarget.value;
                    console.log("Texte de la description principale utilisÃ©:", textToProcess);
                }
                
                // Si c'est une rÃ©exÃ©cution et que la description principale est vide, 
                // utiliser le rÃ©sultat du plugin prÃ©cÃ©dent comme fallback
                if (textToProcess.trim() === '' && this.lastPluginOutputValue) {
                    textToProcess = this.lastPluginOutputValue;
                    console.log("Description vide, utilisation du rÃ©sultat du plugin prÃ©cÃ©dent:", textToProcess);
                }
            }
            
            // Normaliser le texte avant de l'envoyer au plugin
            textToProcess = this.normalizeText(textToProcess);
            console.log("Texte final qui sera envoyÃ© au plugin:", textToProcess);
            
            try {
                // CrÃ©er ou rÃ©cupÃ©rer la zone de rÃ©sultat pour ce plugin
                let resultContainer;
                let resultTextContainer;
                
                if (button.dataset.pluginZoneId) {
                    // Cas d'un plugin dans une zone spÃ©cifique
                    if (!pluginZone) {
                        console.error("Zone de plugin non trouvÃ©e:", button.dataset.pluginZoneId);
                        throw new Error("Zone de plugin non trouvÃ©e");
                    }
                    
                    console.log("Zone de plugin trouvÃ©e:", pluginZone);
                    
                    // Mettre Ã  jour l'entrÃ©e originale pour cette zone Ã  chaque exÃ©cution
                    pluginZone.setAttribute('data-original-input', textToProcess);
                    console.log("EntrÃ©e mise Ã  jour pour la zone:", textToProcess);
                    
                    // Supprimer tout rÃ©sultat prÃ©cÃ©dent associÃ© Ã  ce plugin
                    const existingResult = document.getElementById(`result-for-${button.dataset.pluginZoneId}`);
                    if (existingResult) {
                        existingResult.remove();
                    }
                    
                    // CrÃ©er une zone de rÃ©sultat pour ce plugin
                    const resultZoneId = `result-for-${button.dataset.pluginZoneId}`;
                    resultContainer = document.createElement('div');
                    resultContainer.id = resultZoneId;
                    resultContainer.className = 'bg-gray-800 rounded-lg p-4 mb-4 mt-4';
                    resultContainer.innerHTML = `
                        <h2 class="text-lg font-semibold text-gray-100 mb-3">RÃ©sultat du plugin ${pluginName}</h2>
                        <div id="${resultZoneId}-text" class="w-full min-h-[100px] bg-gray-700 text-gray-200 p-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 space-y-3 overflow-auto">
                            <div class="animate-pulse">
                                <div class="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                                <div class="h-4 bg-gray-700 rounded w-1/2"></div>
                            </div>
                        </div>
                    `;
                    
                    // InsÃ©rer la zone de rÃ©sultat aprÃ¨s la zone du plugin
                    pluginZone.parentNode.insertBefore(resultContainer, pluginZone.nextSibling);
                    resultTextContainer = document.getElementById(`${resultZoneId}-text`);
                    
                    console.log("Zone de rÃ©sultat crÃ©Ã©e:", resultContainer);
                } else {
                    // Cas du premier plugin (utiliser la zone de rÃ©sultat existante)
                    this.pluginResultTarget.classList.remove('hidden');
                    this.pluginResultTextTarget.value = ''; // Vider le textarea
                    resultContainer = this.pluginResultTarget;
                    resultTextContainer = this.pluginResultTextTarget;
                    
                    console.log("Utilisation de la zone de rÃ©sultat par dÃ©faut");
                }
                
                // Afficher un indicateur de chargement
                if (resultTextContainer) {
                    if (resultTextContainer.tagName === 'TEXTAREA') {
                        resultTextContainer.value = 'Chargement...';
                    } else {
                        resultTextContainer.innerHTML = '<div class="animate-pulse"><div class="h-4 bg-gray-700 rounded w-3/4 mb-2"></div><div class="h-4 bg-gray-700 rounded w-1/2"></div></div>';
                    }
                }
                
                // Collecter tous les paramÃ¨tres du plugin
                const pluginInputs = {};
                
                // IMPORTANT: Utiliser le texte Ã  traiter qui a Ã©tÃ© normalisÃ©
                pluginInputs.text = textToProcess;
                console.log("Texte utilisÃ© pour les paramÃ¨tres du plugin:", textToProcess);
                
                // Mode par dÃ©faut
                pluginInputs.mode = 'decode';
                
                // RÃ©cupÃ©rer tous les champs de formulaire du plugin s'ils existent
                if (pluginZone) {
                    // RÃ©cupÃ©rer tous les inputs, selects et checkboxes
                    const inputs = pluginZone.querySelectorAll('input, select');
                    
                    inputs.forEach(input => {
                        const inputName = input.name || input.id;
                        
                        if (!inputName) return; // Ignorer les Ã©lÃ©ments sans nom
                        
                        // IMPORTANT: Ne pas Ã©craser le texte d'entrÃ©e
                        if (inputName === 'text') {
                            console.log("Champ 'text' trouvÃ© dans le formulaire, ignorÃ© pour ne pas Ã©craser l'entrÃ©e");
                            return;
                        }
                        
                        // Traiter diffÃ©remment selon le type d'input
                        if (input.type === 'checkbox' || input.type === 'radio') {
                            pluginInputs[inputName] = input.checked;
                        } else if (input.type === 'number') {
                            pluginInputs[inputName] = parseFloat(input.value);
                        } else {
                            pluginInputs[inputName] = input.value;
                        }
                    });
                }
                
                // Option brute-force si disponible
                const bruteForceCheckbox = pluginZone ? pluginZone.querySelector('#brute_force') : null;
                if (bruteForceCheckbox) {
                    pluginInputs.brute_force = bruteForceCheckbox.checked;
                }
                
                console.log("ParamÃ¨tres collectÃ©s pour l'exÃ©cution du plugin:", pluginInputs);
                
                // VÃ©rification finale pour s'assurer que le texte est bien dÃ©fini
                if (pluginInputs.text !== textToProcess) {
                    console.error("ANOMALIE: Le texte dans les paramÃ¨tres a Ã©tÃ© modifiÃ©, correction...");
                    pluginInputs.text = textToProcess;
                }
                
                // Appeler l'API pour exÃ©cuter le plugin
                const response = await fetch(`/api/plugins/${pluginName}/execute`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(pluginInputs),
                });
                
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                
                const data = await response.json();
                console.log("RÃ©ponse du plugin:", data);
                
                // Extraire le rÃ©sultat du plugin en fonction de la structure de la rÃ©ponse
                let resultText = '';
                let resultHtml = '';
                let coordinates = null;
                
                // VÃ©rifier si nous avons le nouveau format standardisÃ© avec un tableau results
                if (data.results && Array.isArray(data.results) && data.results.length > 0) {
                    console.log("Format standardisÃ© dÃ©tectÃ© avec tableau results");
                    
                    // EntÃªte avec le rÃ©sumÃ© si disponible
                    if (data.summary) {
                        resultHtml += `
                            <div class="bg-gray-700 rounded-lg p-4 mb-3">
                                <h3 class="text-md font-medium text-blue-400 mb-2">RÃ©sumÃ©</h3>
                                <div class="bg-gray-800 p-3 rounded">
                                    <p class="text-gray-300">${data.summary.message || `${data.summary.total_results} rÃ©sultat(s)`}</p>
                                    ${data.plugin_info ? `<p class="text-gray-400 text-xs mt-1">Temps d'exÃ©cution: ${data.plugin_info.execution_time || 0} ms</p>` : ''}
                                </div>
                            </div>`;
                    }
                    
                    // Traiter chaque rÃ©sultat
                    data.results.forEach((result, index) => {
                        const isBest = data.summary && data.summary.best_result_id === result.id;
                        
                        // Classe de couleur basÃ©e sur le niveau de confiance
                        const confidenceColor = this.getConfidenceColor(result.confidence);
                        
                        resultHtml += `
                            <div class="bg-gray-700 rounded-lg p-3 mb-3 ${isBest ? 'border border-blue-500' : ''}">
                                <div class="flex justify-between items-start mb-2">
                                    <h4 class="text-md font-medium ${isBest ? 'text-blue-400' : 'text-gray-300'}">
                                        RÃ©sultat ${index + 1} ${isBest ? '(Meilleur rÃ©sultat)' : ''}
                                    </h4>
                                    <div class="bg-gray-900 px-2 py-1 rounded text-xs">
                                        Confiance: <span class="font-bold ${confidenceColor}">${Math.round((result.confidence || 0) * 100)}%</span>
                                    </div>
                                </div>
                                
                                <div class="bg-gray-800 p-3 rounded mb-2">
                                    <div class="text-sm text-gray-300 whitespace-pre-wrap">${result.text_output || ''}</div>
                                </div>`;
                        
                        // Afficher les paramÃ¨tres utilisÃ©s si prÃ©sents
                        if (result.parameters && Object.keys(result.parameters).length > 0) {
                            resultHtml += `
                                <div class="mt-2 p-2 bg-gray-800 rounded">
                                    <h5 class="text-xs font-medium text-gray-400 mb-1">ParamÃ¨tres utilisÃ©s:</h5>
                                    <div class="text-xs text-gray-300 grid grid-cols-2 gap-1">
                                        ${Object.entries(result.parameters).map(([key, value]) => 
                                            `<div><span class="text-gray-500">${key}:</span> ${value}</div>`
                                        ).join('')}
                                    </div>
                                </div>`;
                        }
                        
                        // Afficher les coordonnÃ©es GPS si prÃ©sentes
                        if (result.coordinates && result.coordinates.exist) {
                            coordinates = result.coordinates;
                            resultHtml += `
                                <div class="mt-2 p-2 bg-gray-800 rounded">
                                    <h5 class="text-xs font-medium text-gray-400 mb-1">CoordonnÃ©es GPS:</h5>
                                    <div class="text-xs text-gray-300">
                                        <div class="mb-1"><span class="text-gray-500">Format DDM:</span> ${result.coordinates.ddm || ''}</div>
                                        <div class="grid grid-cols-2 gap-1">
                                            <div><span class="text-gray-500">Latitude:</span> ${result.coordinates.ddm_lat || ''}</div>
                                            <div><span class="text-gray-500">Longitude:</span> ${result.coordinates.ddm_lon || ''}</div>
                                        </div>
                                    </div>
                                </div>`;
                        }
                        
                        resultHtml += `</div>`;
                        
                        // Conserver le texte du meilleur rÃ©sultat pour la chaÃ®ne de plugins
                        if (isBest) {
                            resultText = result.text_output || '';
                        }
                    });
                    
                    // Si aucun meilleur rÃ©sultat n'a Ã©tÃ© dÃ©fini, prendre le premier
                    if (!resultText && data.results.length > 0) {
                        resultText = data.results[0].text_output || '';
                    }
                    
                } else {
                    // Ancien format - maintenir la rÃ©trocompatibilitÃ©
                    console.log("Format ancien dÃ©tectÃ©, utilisation de la rÃ©trocompatibilitÃ©");
                    
                    // Cas 1: RÃ©ponse avec text_output
                    if (data.text_output) {
                        resultText = data.text_output;
                        console.log("Cas 1: text_output trouvÃ©:", resultText);
                    }
                    // Cas 2: RÃ©ponse avec result.text.text_output
                    else if (data.result && data.result.text && data.result.text.text_output) {
                        resultText = data.result.text.text_output;
                        console.log("Cas 2: result.text.text_output trouvÃ©:", resultText);
                    }
                    // Cas 3: RÃ©ponse avec output
                    else if (data.output) {
                        resultText = data.output;
                        console.log("Cas 3: output trouvÃ©:", resultText);
                    }
                    // Cas 4: RÃ©ponse avec result direct
                    else if (data.result) {
                        resultText = typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2);
                        console.log("Cas 4: result direct trouvÃ©:", resultText);
                    }
                    // Cas 5: RÃ©ponse est une chaÃ®ne de caractÃ¨res
                    else if (typeof data === 'string') {
                        resultText = data;
                        console.log("Cas 5: rÃ©ponse est une chaÃ®ne:", resultText);
                    }
                    // Cas par dÃ©faut: Afficher la rÃ©ponse complÃ¨te
                    else {
                        resultText = JSON.stringify(data, null, 2);
                        console.log("Cas par dÃ©faut: affichage de la rÃ©ponse complÃ¨te");
                    }
                    
                    // VÃ©rifier si des coordonnÃ©es sont prÃ©sentes dans l'ancien format
                    if (data.coordinates && data.coordinates.exist) {
                        coordinates = data.coordinates;
                    } else if (data.result && data.result.coordinates && data.result.coordinates.exist) {
                        coordinates = data.result.coordinates;
                    }
                    
                    // GÃ©nÃ©rer HTML pour l'affichage simple
                    resultHtml = `
                        <div class="bg-gray-900 rounded-lg p-3 border border-gray-700 mb-3">
                            <div class="text-sm text-gray-300 whitespace-pre-wrap">${resultText}</div>
                        </div>`;
                        
                    // Ajouter les coordonnÃ©es si prÃ©sentes
                    if (coordinates) {
                        resultHtml += `
                            <div class="bg-gray-900 rounded-lg p-3 border border-gray-700 mb-3">
                                <h4 class="text-md font-medium text-green-400 mb-2">CoordonnÃ©es GPS dÃ©tectÃ©es</h4>
                                <div class="text-sm text-gray-300">
                                    <div class="mb-1">Format DDM: ${coordinates.ddm || ''}</div>
                                    <div class="grid grid-cols-2 gap-1">
                                        <div>Latitude: ${coordinates.ddm_lat || ''}</div>
                                        <div>Longitude: ${coordinates.ddm_lon || ''}</div>
                                    </div>
                                </div>
                            </div>`;
                    }
                }
                
                // Si le rÃ©sultat est vide, afficher un message
                if (!resultText) {
                    resultText = 'Aucun rÃ©sultat';
                    console.log("RÃ©sultat vide, affichage du message par dÃ©faut");
                }
                
                console.log("RÃ©sultat final Ã  afficher:", resultText);
                
                // Afficher le rÃ©sultat dans un conteneur formatÃ©
                if (resultTextContainer) {
                    if (resultTextContainer.tagName === 'TEXTAREA') {
                        // Pour les textareas, on utilise simplement le texte
                        resultTextContainer.value = resultText;
                    } else {
                        // Pour les Ã©lÃ©ments HTML, on utilise l'affichage riche
                        resultTextContainer.innerHTML = resultHtml;
                    }
                    console.log("RÃ©sultat affichÃ© dans le conteneur");
                    
                    // Ajouter un Ã©couteur d'Ã©vÃ©nement pour mettre Ã  jour lastPluginOutputValue lorsque le texte est modifiÃ©
                    if (resultTextContainer.tagName === 'TEXTAREA') {
                        resultTextContainer.addEventListener('input', (e) => {
                            this.lastPluginOutputValue = e.target.value;
                            console.log("Valeur mise Ã  jour aprÃ¨s modification:", this.lastPluginOutputValue);
                        });
                    }
                } else {
                    console.error("Le conteneur de rÃ©sultat n'existe pas!");
                }
                
                // Rendre visible le conteneur de rÃ©sultat s'il est masquÃ©
                if (resultContainer) {
                    resultContainer.classList.remove('hidden');
                    console.log("Conteneur de rÃ©sultat rendu visible");
                } else {
                    console.error("Le conteneur de rÃ©sultat n'existe pas!");
                }
                
                // Stocker le rÃ©sultat pour le prochain plugin (uniquement si ce n'est pas une rÃ©exÃ©cution)
                if (!isReexecution) {
                    this.lastPluginOutputValue = resultText;
                }
                
                // NOUVEAU: DÃ©tecter le format spÃ©cifique avec espaces entre chiffres pour les coordonnÃ©es GPS
                if (!coordinates) {
                    // Expression rÃ©guliÃ¨re pour dÃ©tecter le format "N 4 9 1 2 1 2 3 E 0 0 6 1 2 1 2 3"
                    const spacedFormatRegex = /([NS])\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+([EW])\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)/i;
                    const match = resultText.match(spacedFormatRegex);
                    
                    if (match) {
                        console.log("Format de coordonnÃ©es avec espaces dÃ©tectÃ©:", match[0]);
                        
                        // Assembler les chiffres sÃ©parÃ©s pour obtenir le format compact
                        const latDir = match[1];
                        const latDigits = match[2] + match[3] + match[4] + match[5] + match[6] + match[7] + match[8];
                        const lonDir = match[9];
                        const lonDigits = match[10] + match[11] + match[12] + match[13] + match[14] + match[15] + match[16];
                        
                        console.log(`Format compact: ${latDir}${latDigits}${lonDir}${lonDigits}`);
                        
                        // Convertir au format DDM
                        try {
                            // Extraire composants de latitude
                            const latDeg = latDigits.substring(0, 2);
                            const latMin = latDigits.substring(2, 4);
                            const latDec = latDigits.substring(4);
                            
                            // Extraire composants de longitude
                            // Pour la longitude, prÃ©fixer avec des 0 pour avoir 3 chiffres pour les degrÃ©s
                            const paddedLonDigits = lonDigits.padStart(8, '0');
                            const lonDeg = paddedLonDigits.substring(0, 3);
                            const lonMin = paddedLonDigits.substring(3, 5);
                            const lonDec = paddedLonDigits.substring(5);
                            
                            // Formater en DDM
                            const ddmLat = `${latDir} ${latDeg}Â° ${latMin}.${latDec}'`;
                            const ddmLon = `${lonDir} ${lonDeg}Â° ${lonMin}.${lonDec}'`;
                            const ddm = `${ddmLat} ${ddmLon}`;
                            
                            console.log(`CoordonnÃ©es converties: ${ddm}`);
                            
                            // CrÃ©er l'objet de coordonnÃ©es
                            const convertedCoords = {
                                exist: true,
                                ddm_lat: ddmLat,
                                ddm_lon: ddmLon,
                                ddm: ddm,
                                decimal: {
                                    latitude: parseFloat(latDir === 'N' ? 1 : -1) * (parseFloat(latDeg) + parseFloat(`${latMin}.${latDec}`) / 60),
                                    longitude: parseFloat(lonDir === 'E' ? 1 : -1) * (parseFloat(lonDeg) + parseFloat(`${lonMin}.${lonDec}`) / 60)
                                },
                                patterns: [match[0]]
                            };
                            
                            // Au lieu d'afficher les coordonnÃ©es sÃ©parÃ©ment, les inclure directement dans le HTML du rÃ©sultat
                            if (resultTextContainer && resultTextContainer.tagName !== 'TEXTAREA') {
                                // Pour les conteneurs HTML, ajouter la section de coordonnÃ©es au HTML existant
                                const coordsHtml = `
                                    <div class="mt-3 p-3 bg-gray-800 rounded">
                                        <div class="flex items-center justify-between mb-2">
                                            <h4 class="text-sm font-medium text-blue-400">CoordonnÃ©es GPS dÃ©tectÃ©es</h4>
                                            <span class="px-3 py-1 text-xs rounded-full bg-green-600">Format avec espaces</span>
                                        </div>
                                        <div class="grid grid-cols-1 gap-2">
                                            <div class="flex items-center">
                                                <span class="text-gray-400 text-sm w-20">Format DDM:</span>
                                                <span class="text-white font-medium">${ddm}</span>
                                            </div>
                                            <div class="grid grid-cols-2 gap-2">
                                                <div class="flex items-center">
                                                    <span class="text-gray-400 text-sm w-20">Latitude:</span>
                                                    <span class="text-white">${ddmLat}</span>
                                                </div>
                                                <div class="flex items-center">
                                                    <span class="text-gray-400 text-sm w-20">Longitude:</span>
                                                    <span class="text-white">${ddmLon}</span>
                                                </div>
                                            </div>
                                            <div class="mt-2 flex gap-2">
                                                <button type="button" 
                                                        class="text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded cursor-pointer copy-coords" 
                                                        data-coords="${ddm}"
                                                        onclick="navigator.clipboard.writeText('${ddm}')">
                                                    Copier
                                                </button>
                                                <button type="button" 
                                                        class="text-xs bg-purple-700 hover:bg-purple-600 text-white px-3 py-1 rounded cursor-pointer create-waypoint"
                                                        data-ddm="${ddm}" 
                                                        data-lat="${ddmLat}" 
                                                        data-lon="${ddmLon}"
                                                        data-action="click->geocache-solver#useCoordinates">
                                                    Utiliser coordonnÃ©es
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `;
                                
                                // Ajouter les coordonnÃ©es au HTML existant
                                resultTextContainer.innerHTML += coordsHtml;
                            }
                            
                            // Ã‰mettre Ã©galement l'Ã©vÃ©nement pour que d'autres composants puissent rÃ©agir
                            const event = new CustomEvent('coordinatesDetected', {
                                detail: convertedCoords,
                                bubbles: true
                            });
                            document.dispatchEvent(event);
                        } catch (error) {
                            console.error("Erreur lors de la conversion des coordonnÃ©es espacÃ©es:", error);
                        }
                    }
                }
                
                // Ajouter le rÃ©sultat Ã  l'historique des plugins
                this.pluginsHistoryValue.push({
                    pluginName: pluginName,
                    result: resultText
                });
                
                // Afficher l'historique des plugins
                this.displayPluginsHistory();
                
                // Ajouter un bouton pour appliquer un autre plugin sur ce rÃ©sultat
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'flex flex-col md:flex-row justify-center gap-3 mt-4';
                buttonContainer.innerHTML = `
                    <button 
                        id="apply-new-plugin-btn"
                        class="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors"
                        data-action="click->geocache-solver#addNewPluginZone">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
                        </svg>
                        Appliquer un nouveau plugin
                    </button>
                `;
                
                if (resultContainer.querySelector('button#apply-new-plugin-btn')) {
                    resultContainer.querySelector('button#apply-new-plugin-btn').parentNode.remove();
                }
                resultContainer.appendChild(buttonContainer);
            } catch (error) {
                console.error('Erreur lors de l\'exÃ©cution du plugin:', error);
                if (resultTextContainer) {
                    if (resultTextContainer.tagName === 'TEXTAREA') {
                        resultTextContainer.value = `Erreur: ${error.message}`;
                    } else {
                        resultTextContainer.innerHTML = `
                            <div class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                                Erreur lors de l'exÃ©cution du plugin: ${error.message}
                            </div>
                        `;
                    }
                }
            }
        }
    }
    
    displayPluginsHistory() {
        if (this.hasPluginsResultsTarget) {
            const historyHtml = this.pluginsHistoryValue.map((entry, index) => {
                return `
                    <div class="bg-gray-900 rounded-lg p-3 border border-gray-700 mb-3">
                        <div class="text-sm text-gray-300 whitespace-pre-wrap">
                            <strong>Plugin ${index + 1} : ${entry.pluginName}</strong>
                            <br>
                            ${entry.result}
                        </div>
                    </div>
                `;
            }).join('');
            
            this.pluginsResultsTarget.innerHTML = historyHtml;
        }
    }
    
    closePlugin() {
        // RÃ©initialiser le plugin sÃ©lectionnÃ©
        this.selectedPluginValue = '';
        
        // Recharger la liste des plugins
        this.loadPluginsList();
    }
    
    cancelPlugin() {
        // RÃ©initialiser l'Ã©tat du plugin
        this.selectedPluginValue = '';
        this.lastPluginOutputValue = '';
        
        // Masquer le panneau des plugins
        this.pluginsPanelTarget.classList.add('hidden');
        this.togglePluginsButtonTarget.classList.remove('bg-purple-700');
        this.togglePluginsButtonTarget.classList.add('bg-purple-600');
        
        // RÃ©initialiser l'attribut data-loaded
        this.pluginsPanelTarget.removeAttribute('data-loaded');
        
        // Vider le contenu du panneau des plugins
        this.pluginsPanelTarget.innerHTML = '';
        
        // Masquer le rÃ©sultat du plugin
        if (this.hasPluginResultTarget) {
            this.pluginResultTarget.classList.add('hidden');
            this.pluginResultTarget.innerHTML = '';
        }
        
        // RÃ©initialiser l'historique des plugins
        this.pluginsHistoryValue = [];
        this.displayPluginsHistory();
    }
    
    filterPlugins(event) {
        const searchTerm = event.target.value.toLowerCase();
        console.log("Filtrage des plugins avec le terme:", searchTerm);
        
        // Trouver la liste des plugins la plus proche de l'input de recherche
        const pluginList = event.target.closest('div').nextElementSibling;
        
        if (!pluginList) {
            console.error("Liste de plugins non trouvÃ©e");
            return;
        }
        
        // Filtrer les Ã©lÃ©ments de la liste
        const pluginItems = pluginList.querySelectorAll('.plugin-item');
        
        pluginItems.forEach(item => {
            const pluginName = item.dataset.pluginName;
            if (pluginName.includes(searchTerm)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    async addNewPluginZone() {
        console.log("addNewPluginZone appelÃ©");
        
        try {
            // CrÃ©er une nouvelle zone de recherche de plugins
            const newPluginZoneId = `plugin-zone-${Date.now()}`;
            const newPluginZone = document.createElement('div');
            newPluginZone.id = newPluginZoneId;
            newPluginZone.className = 'bg-gray-800 rounded-lg p-4 mb-4 mt-4';
            newPluginZone.setAttribute('data-plugin-selection-zone', 'true');
            
            // Afficher un loader pendant le chargement
            newPluginZone.innerHTML = `
                <h2 class="text-lg font-semibold text-gray-100 mb-3">Appliquer un nouveau plugin</h2>
                <div class="animate-pulse">
                    <div class="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div class="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                    <div class="h-4 bg-gray-700 rounded w-2/3"></div>
                </div>
            `;
            
            // Ajouter la nouvelle zone Ã  la fin du conteneur de rÃ©sultats
            this.resultsContainerTarget.appendChild(newPluginZone);
            
            // Charger la liste des plugins dans cette nouvelle zone
            const response = await fetch('/api/plugins?context=solver');
            
            if (!response.ok) {
                throw new Error('Erreur lors du chargement des plugins');
            }
            
            const plugins = await response.json();
            
            // GÃ©nÃ©rer le HTML pour la liste des plugins (similaire Ã  loadPluginsList)
            let pluginsListHtml = `
                <h2 class="text-lg font-semibold text-gray-100 mb-3">Plugins disponibles</h2>
                
                <div class="mb-4">
                    <input 
                        type="text" 
                        placeholder="Rechercher un plugin...1" 
                        class="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded-md border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        data-action="input->geocache-solver#filterPlugins">
                </div>
                
                <div class="space-y-2 plugin-list">
            `;
            
            // Ajouter chaque plugin Ã  la liste
            plugins.forEach(plugin => {
                pluginsListHtml += `
                    <div class="plugin-item flex items-center justify-between p-2 rounded-md hover:bg-gray-700 transition-colors" data-plugin-name="${plugin.name.toLowerCase()}">
                        <div>
                            <div class="font-medium text-gray-200">${plugin.name}</div>
                            <div class="text-xs text-gray-400">${plugin.description || 'Aucune description'}</div>
                        </div>
                        <button 
                            data-action="click->geocache-solver#selectPlugin" 
                            data-plugin-id="${plugin.id}"
                            data-plugin-name="${plugin.name}"
                            data-plugin-zone-id="${newPluginZoneId}"
                            class="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-medium transition-colors">
                            SÃ©lectionner
                        </button>
                    </div>
                `;
            });
            
            pluginsListHtml += `
                </div>
            `;
            
            // Mettre Ã  jour le contenu de la nouvelle zone
            document.getElementById(newPluginZoneId).innerHTML = pluginsListHtml;
            
        } catch (error) {
            console.error('Erreur lors de l\'ajout d\'une nouvelle zone de plugin:', error);
        }
    }
    
    // MÃ©thodes pour gÃ©rer le MetaSolver
    
    toggleMetaSolverPanel() {
        console.log("toggleMetaSolverPanel appelÃ©");
        
        // Masquer le panneau des plugins s'il est visible
        if (!this.pluginsPanelTarget.classList.contains('hidden')) {
            this.pluginsPanelTarget.classList.add('hidden');
            this.togglePluginsButtonTarget.classList.remove('bg-purple-700');
            this.togglePluginsButtonTarget.classList.add('bg-purple-600');
        }
        
        // Si le panneau MetaSolver est masquÃ©, l'afficher
        if (this.metaSolverPanelTarget.classList.contains('hidden')) {
            console.log("Panneau MetaSolver masquÃ©, on l'affiche");
            this.metaSolverPanelTarget.classList.remove('hidden');
            this.toggleMetaSolverButtonTarget.classList.remove('bg-blue-600');
            this.toggleMetaSolverButtonTarget.classList.add('bg-blue-700');
        } else {
            // Si le panneau MetaSolver est visible, le masquer
            console.log("Panneau MetaSolver visible, on le masque");
            this.metaSolverPanelTarget.classList.add('hidden');
            this.toggleMetaSolverButtonTarget.classList.remove('bg-blue-700');
            this.toggleMetaSolverButtonTarget.classList.add('bg-blue-600');
        }
    }
    
    async executeMetaSolver(event) {
        console.log("executeMetaSolver appelÃ©");
        
        // RÃ©initialiser l'affichage des coordonnÃ©es
        this.resetCoordinatesDisplay();
        
        // RÃ©cupÃ©rer le mode depuis le bouton ou le select
        const mode = event.currentTarget.dataset.mode || document.getElementById('metasolver-mode').value;
        const strict = document.getElementById('metasolver-strict').value;
        const embedded = document.getElementById('metasolver-embedded').checked;
        const enableGpsDetection = document.getElementById('metasolver-gps-detection').checked;
        
        // RÃ©cupÃ©rer les informations sur les caractÃ¨res autorisÃ©s
        const allowedCharsType = document.getElementById('metasolver-allowed-chars').value;
        let allowedChars = [];
        
        if (allowedCharsType === 'special') {
            allowedChars = ['Â°', '.', "'"];
        } else if (allowedCharsType === 'custom') {
            const customChars = document.getElementById('metasolver-custom-chars').value;
            if (customChars) {
                // Convertir la chaÃ®ne en tableau de caractÃ¨res
                allowedChars = customChars.split('');
            }
        }
        
        // RÃ©cupÃ©rer le texte Ã  analyser et le normaliser
        let text = this.descriptionTextTarget.value;
        text = this.normalizeText(text);
        
        if (!text.trim()) {
            alert("Veuillez entrer un texte Ã  analyser");
            return;
        }
        
        try {
            // Afficher un indicateur de chargement
            const resultElement = document.getElementById('metasolver-result');
            const resultContentElement = document.getElementById('metasolver-result-content');
            
            resultElement.classList.remove('hidden');
            resultContentElement.innerHTML = `
                <div class="animate-pulse space-y-2">
                    <div class="h-4 bg-gray-600 rounded w-3/4"></div>
                    <div class="h-4 bg-gray-600 rounded w-1/2"></div>
                    <div class="h-4 bg-gray-600 rounded w-2/3"></div>
                </div>
            `;
            
            // PrÃ©parer les donnÃ©es pour l'API
            const formData = new FormData();
            formData.append('text', text);
            formData.append('mode', mode);
            formData.append('strict', strict);
            formData.append('embedded', embedded ? 'true' : 'false');
            formData.append('enable_gps_detection', enableGpsDetection ? 'true' : 'false');
            
            // Ajouter les caractÃ¨res autorisÃ©s si nÃ©cessaire
            if (allowedCharsType !== 'all') {
                formData.append('allowed_chars', JSON.stringify(allowedChars));
            }
            
            console.log("ParamÃ¨tres envoyÃ©s Ã  l'API:", {
                text: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
                mode: mode,
                strict: strict,
                embedded: embedded,
                enable_gps_detection: enableGpsDetection,
                allowed_chars: allowedCharsType !== 'all' ? allowedChars : "all"
            });
            
            // Appeler l'API pour exÃ©cuter le MetaSolver
            const response = await fetch('/api/plugins/metadetection/execute', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const result = await response.json();
            console.log("RÃ©ponse brute de l'API MetaSolver:", result);
            console.log("Structure complÃ¨te des rÃ©sultats:", JSON.stringify(result, null, 2));
            console.log("PrÃ©sence de 'results':", !!result.results);
            console.log("Type de 'results':", result.results ? typeof result.results : "non dÃ©fini");
            console.log("Nombre d'Ã©lÃ©ments dans 'results':", result.results && Array.isArray(result.results) ? result.results.length : 0);
            console.log("PrÃ©sence de 'combined_results':", !!result.combined_results);
            console.log("PrÃ©sence de 'primary_coordinates':", !!result.primary_coordinates);
            
            // Formater et afficher les rÃ©sultats
            resultContentElement.innerHTML = await this.formatMetaDetectionResults(result);
            
            // Ajouter Ã  l'historique des plugins
            this.addToPluginsHistory({
                plugin: 'MetaSolver',
                action: mode === 'detect' ? 'Analyse' : 'DÃ©codage',
                timestamp: new Date().toLocaleTimeString(),
                result: result
            });
            
        } catch (error) {
            console.error("Erreur lors de l'exÃ©cution du MetaSolver:", error);
            const resultElement = document.getElementById('metasolver-result');
            const resultContentElement = document.getElementById('metasolver-result-content');
            
            resultElement.classList.remove('hidden');
            resultContentElement.innerHTML = `
                <div class="bg-red-900 text-red-100 p-4 rounded-lg">
                    Erreur lors de l'exÃ©cution du MetaSolver: ${error.message}
                </div>
            `;
        }
    }
    
    async decodeWithPlugin(event) {
        const pluginName = event.currentTarget.dataset.plugin;
        const text = this.descriptionTextTarget.value;
        
        if (!text.trim()) {
            alert("Veuillez entrer un texte Ã  dÃ©coder");
            return;
        }
        
        try {
            // RÃ©cupÃ©rer les options du MetaSolver
            const strict = document.getElementById('metasolver-strict').value;
            const embedded = document.getElementById('metasolver-embedded').checked;
            const enableGpsDetection = document.getElementById('metasolver-gps-detection').checked;
            
            // RÃ©cupÃ©rer les informations sur les caractÃ¨res autorisÃ©s
            const allowedCharsType = document.getElementById('metasolver-allowed-chars').value;
            let allowedChars = [];
            
            if (allowedCharsType === 'special') {
                allowedChars = ['Â°', '.', "'"];
            } else if (allowedCharsType === 'custom') {
                const customChars = document.getElementById('metasolver-custom-chars').value;
                if (customChars) {
                    allowedChars = customChars.split('');
                }
            }
            
            // Afficher un indicateur de chargement
            const resultElement = document.getElementById('metasolver-result');
            const resultContentElement = document.getElementById('metasolver-result-content');
            
            resultElement.classList.remove('hidden');
            resultContentElement.innerHTML = `
                <div class="animate-pulse space-y-2">
                    <div class="h-4 bg-gray-600 rounded w-3/4"></div>
                    <div class="h-4 bg-gray-600 rounded w-1/2"></div>
                    <div class="h-4 bg-gray-600 rounded w-2/3"></div>
                </div>
            `;
            
            // PrÃ©parer les donnÃ©es pour l'API
            const formData = new FormData();
            formData.append('text', text);
            formData.append('mode', 'decode');
            formData.append('strict', strict);
            formData.append('embedded', embedded ? 'true' : 'false');
            formData.append('plugin_name', pluginName);
            formData.append('enable_gps_detection', enableGpsDetection ? 'true' : 'false');
            
            // Ajouter les caractÃ¨res autorisÃ©s si nÃ©cessaire
            if (allowedCharsType !== 'all') {
                formData.append('allowed_chars', JSON.stringify(allowedChars));
            }
            
            console.log("decodeWithPlugin - ParamÃ¨tres envoyÃ©s Ã  l'API:", {
                text: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
                mode: "decode",
                strict: strict,
                embedded: embedded,
                plugin_name: pluginName,
                enable_gps_detection: enableGpsDetection,
                allowed_chars: allowedCharsType !== 'all' ? allowedChars : "all"
            });
            
            // Appeler l'API pour exÃ©cuter le MetaSolver avec le plugin spÃ©cifiÃ©
            const response = await fetch('/api/plugins/metadetection/execute', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const result = await response.json();
            console.log("decodeWithPlugin - RÃ©ponse brute de l'API MetaSolver:", result);
            console.log("decodeWithPlugin - PrÃ©sence de 'results':", !!result.results);
            console.log("decodeWithPlugin - Type de 'results':", result.results ? typeof result.results : "non dÃ©fini");
            console.log("decodeWithPlugin - Nombre d'Ã©lÃ©ments dans 'results':", result.results && Array.isArray(result.results) ? result.results.length : 0);
            
            // Afficher le rÃ©sultat en utilisant la mÃ©thode de formatage
            resultContentElement.innerHTML = await this.formatMetaDetectionResults(result);
            
            // Ajouter Ã  l'historique des plugins
            this.addToPluginsHistory({
                plugin: 'MetaSolver - ' + pluginName,
                action: 'DÃ©codage',
                timestamp: new Date().toLocaleTimeString(),
                result: result
            });
            
        } catch (error) {
            console.error("Erreur lors du dÃ©codage:", error);
            const resultElement = document.getElementById('metasolver-result');
            const resultContentElement = document.getElementById('metasolver-result-content');
            
            resultElement.classList.remove('hidden');
            resultContentElement.innerHTML = `
                <div class="bg-red-900 text-red-100 p-4 rounded-lg">
                    Erreur lors du dÃ©codage: ${error.message}
                </div>
            `;
        }
    }
    
    async formatMetaDetectionResults(result) {
        console.log("formatMetaDetectionResults - DÃ©but du formatage des rÃ©sultats");
        
        if (result.error) {
            console.log("formatMetaDetectionResults - Erreur dÃ©tectÃ©e:", result.error);
            return `
                <div class="bg-red-900 text-red-100 p-4 rounded-lg">
                    ${result.error}
                </div>
            `;
        }
        
        // VÃ©rifier si des coordonnÃ©es GPS ont Ã©tÃ© dÃ©tectÃ©es dans primary_coordinates
        let gpsCoordinatesHtml = '';
        if (result.primary_coordinates) {
            console.log("formatMetaDetectionResults - CoordonnÃ©es primaires dÃ©tectÃ©es:", result.primary_coordinates);
            // Stocker les coordonnÃ©es dÃ©tectÃ©es pour une utilisation ultÃ©rieure
            this.lastDetectedCoordinatesValue = result.primary_coordinates;
            
            // RÃ©cupÃ©rer les coordonnÃ©es en format DDM si disponibles
            let ddmLat = "";
            let ddmLon = "";
            let ddmFull = "";
            
            // Parcourir les rÃ©sultats combinÃ©s pour trouver les coordonnÃ©es DDM
            if (result.combined_results) {
                Object.entries(result.combined_results).forEach(([pluginName, pluginResult]) => {
                    if (pluginResult.coordinates && pluginResult.coordinates.exist) {
                        ddmLat = pluginResult.coordinates.ddm_lat || "";
                        ddmLon = pluginResult.coordinates.ddm_lon || "";
                        ddmFull = pluginResult.coordinates.ddm || "";
                    }
                });
            }
            
            // Utiliser les coordonnÃ©es dÃ©cimales si on n'a pas trouvÃ© de format DDM
            if (!ddmFull && result.primary_coordinates) {
                const lat = result.primary_coordinates.latitude;
                const lon = result.primary_coordinates.longitude;
                ddmFull = `${lat > 0 ? 'N' : 'S'} ${Math.abs(lat).toFixed(6)}Â°, ${lon > 0 ? 'E' : 'W'} ${Math.abs(lon).toFixed(6)}Â°`;
            }
            
            // AJOUT: CrÃ©er un objet de coordonnÃ©es standardisÃ©
            const standardizedCoords = {
                exist: true,
                ddm_lat: ddmLat,
                ddm_lon: ddmLon,
                ddm: ddmFull,
                decimal: result.primary_coordinates
            };
            
            // AJOUT: Ã‰mettre un Ã©vÃ©nement pour informer le systÃ¨me des coordonnÃ©es dÃ©tectÃ©es
            console.log("Ã‰mission de l'Ã©vÃ©nement coordinatesDetected depuis MetaSolver avec les coordonnÃ©es:", standardizedCoords);
            document.dispatchEvent(new CustomEvent('coordinatesDetected', {
                detail: standardizedCoords
            }));
            
            gpsCoordinatesHtml = `
                <div class="bg-gray-700 rounded-lg p-4 mt-4">
                    <h3 class="text-lg font-medium text-green-400 mb-2">CoordonnÃ©es GPS dÃ©tectÃ©es</h3>
                    
                    <div class="bg-gray-800 p-4 rounded grid grid-cols-1 gap-4">
                        <div>
                            <label for="coords_ddm" class="block text-sm font-medium text-gray-400 mb-1">CoordonnÃ©es:</label>
                            <input type="text" id="coords_ddm" class="w-full bg-gray-800 text-green-300 border border-gray-700 focus:border-green-500 p-2 rounded font-mono"
                                   value="${ddmFull}" readonly>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label for="coords_lat" class="block text-sm font-medium text-gray-400 mb-1">Latitude:</label>
                                <input type="text" id="coords_lat" class="w-full bg-gray-800 text-green-300 border border-gray-700 focus:border-green-500 p-2 rounded font-mono"
                                       value="${ddmLat || result.primary_coordinates.latitude}" readonly>
                            </div>
                            <div>
                                <label for="coords_lon" class="block text-sm font-medium text-gray-400 mb-1">Longitude:</label>
                                <input type="text" id="coords_lon" class="w-full bg-gray-800 text-green-300 border border-gray-700 focus:border-green-500 p-2 rounded font-mono"
                                       value="${ddmLon || result.primary_coordinates.longitude}" readonly>
                            </div>
                        </div>
                        
                        <div class="mt-2">
                            <a href="https://www.google.com/maps?q=${result.primary_coordinates.latitude},${result.primary_coordinates.longitude}" 
                               target="_blank" 
                               class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm inline-flex items-center mr-2">
                               <i class="fas fa-map-marker-alt mr-1"></i> Google Maps
                            </a>
                            <button class="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md"
                                    onclick="navigator.clipboard.writeText('${ddmFull}').then(() => alert('CoordonnÃ©es copiÃ©es dans le presse-papier'))">
                                <i class="fas fa-copy mr-1"></i> Copier
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else if (result.coordinates && result.coordinates.exist) {
            console.log("formatMetaDetectionResults - CoordonnÃ©es anciennes dÃ©tectÃ©es (format rÃ©trocompatible)");
            // Ancien format pour rÃ©trocompatibilitÃ©
            this.lastDetectedCoordinatesValue = result.coordinates;
            
            gpsCoordinatesHtml = `
                <div class="bg-gray-700 rounded-lg p-4 mt-4">
                    <h3 class="text-lg font-medium text-green-400 mb-2">CoordonnÃ©es GPS dÃ©tectÃ©es</h3>
                    
                    <div class="bg-gray-800 p-4 rounded grid grid-cols-1 gap-4">
                        <div>
                            <label for="coords_ddm" class="block text-sm font-medium text-gray-400 mb-1">Format DDM:</label>
                            <input type="text" id="coords_ddm" class="w-full bg-gray-800 text-green-300 border border-gray-700 focus:border-green-500 p-2 rounded font-mono"
                                   value="${result.coordinates.ddm || ''}" readonly>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label for="coords_lat" class="block text-sm font-medium text-gray-400 mb-1">Latitude:</label>
                                <input type="text" id="coords_lat" class="w-full bg-gray-800 text-green-300 border border-gray-700 focus:border-green-500 p-2 rounded font-mono"
                                       value="${result.coordinates.ddm_lat || ''}" readonly>
                            </div>
                            <div>
                                <label for="coords_lon" class="block text-sm font-medium text-gray-400 mb-1">Longitude:</label>
                                <input type="text" id="coords_lon" class="w-full bg-gray-800 text-green-300 border border-gray-700 focus:border-green-500 p-2 rounded font-mono"
                                       value="${result.coordinates.ddm_lon || ''}" readonly>
                            </div>
                        </div>
                        
                        <div class="flex justify-between mt-2">
                            <button class="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                                    data-action="click->geocache-solver#useCoordinates">
                                Utiliser ces coordonnÃ©es
                            </button>
                            <button class="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md"
                                    onclick="navigator.clipboard.writeText('${result.coordinates.ddm}').then(() => alert('CoordonnÃ©es copiÃ©es dans le presse-papier'))">
                                Copier
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        // VÃ©rifier si nous avons le nouveau format standardisÃ© avec un tableau results
        if (result.results && Array.isArray(result.results) && result.results.length > 0) {
            console.log("formatMetaDetectionResults - DÃ©tectÃ© format standardisÃ© avec tableau results", result.results);
            let html = '';
            
            // Afficher le rÃ©sumÃ© si disponible
            if (result.summary) {
                console.log("formatMetaDetectionResults - RÃ©sumÃ© disponible:", result.summary);
                html += `
                    <div class="bg-gray-700 rounded-lg p-4 mb-3">
                        <h3 class="text-md font-medium text-blue-400 mb-2">RÃ©sumÃ©</h3>
                        <div class="bg-gray-800 p-3 rounded">
                            <p class="text-gray-300">${result.summary.message || `${result.summary.total_results} rÃ©sultat(s)`}</p>
                            ${result.plugin_info ? `<p class="text-gray-400 text-xs mt-1">Temps d'exÃ©cution: ${result.plugin_info.execution_time || 0} ms</p>` : ''}
                        </div>
                    </div>`;
            }
            
            // Conteneur principal pour les rÃ©sultats
            html += `
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-blue-400 mb-3">RÃ©sultats de l'analyse</h3>
                    <div class="space-y-3">
            `;
            
            // Traiter chaque rÃ©sultat
            result.results.forEach((resultEntry, index) => {
                console.log("formatMetaDetectionResults - Traitement du rÃ©sultat", index, resultEntry);
                const isBest = result.summary && result.summary.best_result_id === resultEntry.id;
                
                // Classe de couleur basÃ©e sur le niveau de confiance
                const confidenceColor = this.getConfidenceColor(resultEntry.confidence);
                const parameterPlugin = resultEntry.parameters?.plugin || "";
                
                // DÃ©terminer si ce rÃ©sultat peut Ãªtre dÃ©codÃ©
                const canDecode = resultEntry.metadata?.can_decode === true;
                const isDetectMode = resultEntry.parameters?.mode === "detect";
                const isNotMetadetection = !parameterPlugin.includes("metadetection");
                const showDecodeButton = isDetectMode && isNotMetadetection && canDecode;
                
                console.log(`RÃ©sultat ${index} - Plugin: ${parameterPlugin}, Mode: ${resultEntry.parameters?.mode}, CanDecode: ${canDecode}, ShowButton: ${showDecodeButton}`);
                
                html += `
                    <div class="bg-gray-600 p-3 rounded ${isBest ? 'border border-blue-500' : ''}">
                        <div class="flex justify-between items-center mb-2">
                            <div class="flex items-center">
                                <span class="text-gray-200 font-medium">${parameterPlugin}</span>
                                <div class="text-xs ${confidenceColor} ml-2">Confiance: ${Math.round((resultEntry.confidence || 0) * 100)}%</div>
                            </div>
                            ${showDecodeButton ? 
                                `<button 
                                    data-action="click->geocache-solver#decodeWithPlugin" 
                                    data-plugin="${parameterPlugin}" 
                                    class="bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-3 rounded">
                                    DÃ©coder
                                </button>` : ''}
                        </div>
                        <div class="text-sm text-gray-300 whitespace-pre-wrap">${resultEntry.text_output || ''}</div>
                        
                        ${resultEntry.metadata?.fragments?.length > 0 ? 
                            `<div class="mt-2 text-xs text-gray-400">
                                Fragments: ${resultEntry.metadata.fragments.join(', ')}
                             </div>` : ''}
                    </div>`;
            });
            
            html += `</div></div>`;
            console.log("formatMetaDetectionResults - HTML gÃ©nÃ©rÃ© pour le format standardisÃ© (longueur):", html.length);
            return html + gpsCoordinatesHtml;
        }
        // Afficher les rÃ©sultats des plugins combinÃ©s (nouveau format)
        else if (result.combined_results && Object.keys(result.combined_results).length > 0) {
            console.log("formatMetaDetectionResults - Utilisation du format combined_results", Object.keys(result.combined_results));
            let html = `
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-blue-400 mb-3">RÃ©sultats de l'analyse</h3>
                    <div class="space-y-3">
            `;
            
            // Parcourir tous les rÃ©sultats combinÃ©s
            Object.entries(result.combined_results).forEach(([pluginName, pluginResult]) => {
                console.log("formatMetaDetectionResults - Plugin rÃ©sultat:", pluginName, pluginResult);
                let resultText = "";
                let confidenceText = "";
                
                // Extraire le texte dÃ©codÃ© s'il existe
                if (pluginResult.decoded_text) {
                    resultText = pluginResult.decoded_text;
                }
                
                // Ajouter l'indicateur de confiance si disponible
                if (pluginResult.confidence !== undefined) {
                    const confidence = pluginResult.confidence;
                    const confidenceColor = this.getConfidenceColor(confidence);
                    confidenceText = `<div class="text-xs ${confidenceColor} font-medium">Confiance: ${Math.round(confidence * 100)}%</div>`;
                }
                
                html += `
                    <div class="bg-gray-600 p-3 rounded">
                        <div class="flex justify-between items-center">
                            <span class="text-gray-200 font-medium">${pluginName}</span>
                            ${confidenceText}
                        </div>
                        <div class="text-gray-200 mt-1">${resultText}</div>
                    </div>
                `;
            });
            
            html += `</div></div>`;
            console.log("formatMetaDetectionResults - HTML gÃ©nÃ©rÃ© pour le format combined_results (longueur):", html.length);
            return html + gpsCoordinatesHtml;
        }
        // GÃ©rer l'ancien format (mode dÃ©tection)
        else if (result.result && result.result.possible_codes && result.result.possible_codes.length > 0) {
            console.log("formatMetaDetectionResults - Utilisation du format possible_codes ancien", result.result.possible_codes);
            const codes = result.result.possible_codes;
            let html = `
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-blue-400 mb-3">Codes dÃ©tectÃ©s</h3>
                    <div class="space-y-3">
            `;
            
            for (const code of codes) {
                const fragments = code.fragments || [];
                const fragmentsText = fragments.map(f => f.value).join(', ');
                
                // Ajouter l'indicateur de confiance si disponible
                let confidenceText = "";
                if (code.confidence !== undefined) {
                    const confidence = code.confidence;
                    const confidenceColor = this.getConfidenceColor(confidence);
                    confidenceText = `<div class="text-xs ${confidenceColor} ml-2">Confiance: ${Math.round(confidence * 100)}%</div>`;
                }
                
                html += `
                    <div class="bg-gray-600 p-3 rounded">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center">
                                <span class="text-gray-200 font-medium">${code.plugin_name}</span>
                                ${confidenceText}
                            </div>
                            ${code.can_decode ? `<button 
                                data-action="click->geocache-solver#decodeWithPlugin" 
                                data-plugin="${code.plugin_name}" 
                                class="bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-3 rounded">
                                DÃ©coder
                            </button>` : ''}
                        </div>
                        <div class="text-sm text-gray-400 mt-1">${fragments.length} fragment(s): ${fragmentsText}</div>
                    </div>
                `;
            }
            
            html += `</div></div>`;
            console.log("formatMetaDetectionResults - HTML gÃ©nÃ©rÃ© pour le format possible_codes (longueur):", html.length);
            return html + gpsCoordinatesHtml;
        }
        // GÃ©rer l'ancien format (dÃ©codage spÃ©cifique)
        else if (result.result && result.result.decoded_results && result.result.decoded_results.length > 0) {
            console.log("formatMetaDetectionResults - Utilisation du format decoded_results ancien", result.result.decoded_results);
            const decodedResults = result.result.decoded_results;
            let html = `
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-blue-400 mb-3">RÃ©sultats du dÃ©codage</h3>
                    <div class="space-y-3">
            `;
            
            for (const decoded of decodedResults) {
                // Ajouter l'indicateur de confiance si disponible
                let confidenceText = "";
                if (decoded.confidence !== undefined) {
                    const confidence = decoded.confidence;
                    const confidenceColor = this.getConfidenceColor(confidence);
                    confidenceText = `<div class="text-xs ${confidenceColor} ml-2">Confiance: ${Math.round(confidence * 100)}%</div>`;
                }
                
                html += `
                    <div class="bg-gray-600 p-3 rounded">
                        <div class="flex items-center">
                            <div class="text-gray-300 font-medium">${decoded.plugin_name}</div>
                            ${confidenceText}
                        </div>
                        <div class="text-gray-200 mt-1">${decoded.decoded_text}</div>
                    </div>
                `;
            }
            
            html += `</div></div>`;
            console.log("formatMetaDetectionResults - HTML gÃ©nÃ©rÃ© pour le format decoded_results (longueur):", html.length);
            return html + gpsCoordinatesHtml;
        } 
        // GÃ©rer l'ancien format (dÃ©codage simple)
        else if (result.result && result.result.decoded_text) {
            console.log("formatMetaDetectionResults - Utilisation du format decoded_text ancien", result.result.decoded_text);
            return `
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-blue-400 mb-3">RÃ©sultat du dÃ©codage</h3>
                    <div class="text-gray-200">${result.result.decoded_text}</div>
                    ${gpsCoordinatesHtml}
                </div>
            `;
        } else {
            console.log("formatMetaDetectionResults - Aucun format reconnu, affichage du message par dÃ©faut", result);
            return `
                <div class="bg-gray-700 p-4 rounded-lg">
                    <div class="text-gray-400">Aucun code dÃ©tectÃ© dans le texte.</div>
                    ${gpsCoordinatesHtml}
                </div>
            `;
        }
    }
    
    addToPluginsHistory(entry) {
        this.pluginsHistoryValue.push(entry);
        this.displayPluginsHistory();
    }

    // Fonction utilitaire pour obtenir la couleur selon le niveau de confiance
    getConfidenceColor(confidence) {
        if (!confidence) return 'text-gray-300';
        if (confidence >= 0.8) return 'text-green-400';
        if (confidence >= 0.5) return 'text-yellow-400';
        if (confidence >= 0.3) return 'text-orange-400';
        return 'text-red-400';
    }

    // MÃ©thode pour utiliser les coordonnÃ©es dÃ©tectÃ©es
    useCoordinates(event) {
        event.preventDefault();
        
        if (!this.lastDetectedCoordinatesValue) {
            alert("Aucune coordonnÃ©e GPS dÃ©tectÃ©e.");
            return;
        }
        
        const coords = this.lastDetectedCoordinatesValue;
        
        // Si nous sommes dans le contexte d'une gÃ©ocache
        if (this.geocacheIdValue) {
            if (confirm("Voulez-vous utiliser ces coordonnÃ©es comme coordonnÃ©es corrigÃ©es pour cette gÃ©ocache?")) {
                this.saveCoordinatesToGeocache(coords);
            }
        } else {
            // Sinon, proposer de copier les coordonnÃ©es ou de les ouvrir dans une carte
            const action = prompt(
                "Que souhaitez-vous faire avec ces coordonnÃ©es?\n" +
                "1: Copier dans le presse-papier\n" +
                "2: Ouvrir dans Google Maps\n" +
                "3: Ouvrir dans OpenStreetMap",
                "1"
            );
            
            switch (action) {
                case "1":
                    navigator.clipboard.writeText(coords.ddm)
                        .then(() => alert("CoordonnÃ©es copiÃ©es dans le presse-papier"))
                        .catch(err => alert("Erreur lors de la copie: " + err));
                    break;
                case "2":
                    // Extraire les valeurs numÃ©riques pour Google Maps
                    this.openInGoogleMaps(coords);
                    break;
                case "3":
                    // Extraire les valeurs numÃ©riques pour OpenStreetMap
                    this.openInOpenStreetMap(coords);
                    break;
                default:
                    alert("Action annulÃ©e ou non reconnue.");
            }
        }
    }
    
    // MÃ©thode pour sauvegarder les coordonnÃ©es dans une gÃ©ocache
    async saveCoordinatesToGeocache(coords) {
        try {
            const response = await fetch(`/api/geocaches/save/${this.geocacheIdValue}/coordinates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    gc_lat: coords.ddm_lat,
                    gc_lon: coords.ddm_lon
                })
            });
            
            if (response.ok) {
                alert("CoordonnÃ©es enregistrÃ©es avec succÃ¨s!");
                // DÃ©clencher un Ã©vÃ©nement pour mettre Ã  jour l'affichage des coordonnÃ©es
                document.dispatchEvent(new CustomEvent('coordinatesUpdated'));
            } else {
                const error = await response.json();
                alert(`Erreur lors de l'enregistrement des coordonnÃ©es: ${error.message || 'Erreur inconnue'}`);
            }
        } catch (error) {
            console.error("Erreur lors de l'enregistrement des coordonnÃ©es:", error);
            alert(`Erreur lors de l'enregistrement des coordonnÃ©es: ${error.message || 'Erreur inconnue'}`);
        }
    }
    
    // MÃ©thode pour ouvrir les coordonnÃ©es dans Google Maps
    openInGoogleMaps(coords) {
        // Extraire les valeurs numÃ©riques des coordonnÃ©es
        const lat = this.extractNumericCoordinate(coords.ddm_lat);
        const lon = this.extractNumericCoordinate(coords.ddm_lon);
        
        if (lat && lon) {
            const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
            window.open(url, '_blank');
        } else {
            alert("Impossible d'extraire les valeurs numÃ©riques des coordonnÃ©es.");
        }
    }
    
    // MÃ©thode pour ouvrir les coordonnÃ©es dans OpenStreetMap
    openInOpenStreetMap(coords) {
        // Extraire les valeurs numÃ©riques des coordonnÃ©es
        const lat = this.extractNumericCoordinate(coords.ddm_lat);
        const lon = this.extractNumericCoordinate(coords.ddm_lon);
        
        if (lat && lon) {
            const url = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=15`;
            window.open(url, '_blank');
        } else {
            alert("Impossible d'extraire les valeurs numÃ©riques des coordonnÃ©es.");
        }
    }
    
    // MÃ©thode pour extraire les valeurs numÃ©riques des coordonnÃ©es
    extractNumericCoordinate(coordStr) {
        try {
            // Format attendu: "N 48Â° 32.296'" ou "E 6Â° 40.636'"
            const direction = coordStr.charAt(0);
            const parts = coordStr.substring(1).trim().split('Â°');
            
            if (parts.length !== 2) return null;
            
            const degrees = parseFloat(parts[0].trim());
            const minutes = parseFloat(parts[1].replace("'", "").trim());
            
            let decimal = degrees + (minutes / 60);
            
            // Ajuster selon la direction
            if (direction === 'S' || direction === 'W') {
                decimal = -decimal;
            }
            
            return decimal;
        } catch (error) {
            console.error("Erreur lors de l'extraction des coordonnÃ©es numÃ©riques:", error);
            return null;
        }
    }

    // AJOUT: MÃ©thode pour utiliser les coordonnÃ©es dÃ©tectÃ©es pour la gÃ©ocache
    async useCoordinates() {
        // VÃ©rifier si nous avons des coordonnÃ©es dÃ©tectÃ©es et un ID de gÃ©ocache
        if (!this.lastDetectedCoordinatesValue || !this.geocacheIdValue) {
            console.error("Impossible d'utiliser les coordonnÃ©es: coordonnÃ©es non dÃ©tectÃ©es ou ID de gÃ©ocache non dÃ©fini");
            return;
        }
        
        const coords = this.lastDetectedCoordinatesValue;
        
        try {
            // Afficher un message de confirmation
            if (!confirm("Voulez-vous utiliser ces coordonnÃ©es comme coordonnÃ©es corrigÃ©es pour cette gÃ©ocache?")) {
                return;
            }
            
            // Envoyer les coordonnÃ©es au serveur
            const response = await fetch(`/api/geocaches/save/${this.geocacheIdValue}/coordinates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    gc_lat: coords.ddm_lat,
                    gc_lon: coords.ddm_lon
                })
            });
            
            if (response.ok) {
                alert("CoordonnÃ©es enregistrÃ©es avec succÃ¨s!");
                
                // DÃ©clencher un Ã©vÃ©nement pour mettre Ã  jour l'affichage des coordonnÃ©es
                document.dispatchEvent(new CustomEvent('coordinatesUpdated'));
            } else {
                const error = await response.json();
                alert(`Erreur lors de l'enregistrement des coordonnÃ©es: ${error.message || 'Erreur inconnue'}`);
            }
        } catch (error) {
            console.error("Erreur lors de l'enregistrement des coordonnÃ©es:", error);
            alert(`Erreur lors de l'enregistrement des coordonnÃ©es: ${error.message || 'Erreur inconnue'}`);
        }
    }

    // MÃ©thode pour rÃ©initialiser l'affichage des coordonnÃ©es
    resetCoordinatesDisplay() {
        console.log("RÃ©initialisation de l'affichage des coordonnÃ©es");
        
        // VÃ©rifier si nous avons les cibles Stimulus pour les coordonnÃ©es
        if (this.hasCoordinatesContainerTarget) {
            // Masquer le conteneur de coordonnÃ©es
            this.coordinatesContainerTarget.classList.add('hidden');
            console.log("Conteneur de coordonnÃ©es Stimulus masquÃ©");
        }
        
        // VÃ©rifier Ã©galement les Ã©lÃ©ments crÃ©Ã©s dynamiquement
        const dynamicContainer = document.getElementById('geocache-solver-coordinates-container');
        if (dynamicContainer) {
            // Masquer ou supprimer le conteneur dynamique
            dynamicContainer.classList.add('hidden');
            console.log("Conteneur de coordonnÃ©es dynamique masquÃ©");
        }
        
        // RÃ©initialiser les coordonnÃ©es stockÃ©es
        this.lastDetectedCoordinatesValue = null;
    }

    // MÃ©thode pour forcer l'affichage des coordonnÃ©es Ã  partir des donnÃ©es du log
    forceDisplayCoordinates() {
        console.log("ForÃ§age de l'affichage des coordonnÃ©es Ã  partir des donnÃ©es du log");
        
        // CoordonnÃ©es extraites du log
        const coordinates = {
            exist: true,
            ddm_lat: "N 49Â° 12.123'",
            ddm_lon: "E 006Â° 12.123'",
            ddm: "N 49Â° 12.123' E 006Â° 12.123'",
            decimal: {
                latitude: 49.20205,
                longitude: 6.20205
            },
            patterns: ["N 49Â° 12.123' E 006Â° 12.123'"]
        };
        
        // Stocker les coordonnÃ©es
        this.lastDetectedCoordinatesValue = coordinates;
        
        // Afficher les coordonnÃ©es
        this.displayDetectedCoordinates(coordinates);
        
        return "CoordonnÃ©es affichÃ©es avec succÃ¨s";
    }
}
