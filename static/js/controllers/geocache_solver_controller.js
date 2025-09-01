// Geocache Solver Controller
window.GeocacheSolverController = class extends Stimulus.Controller {
    static targets = [
        "loading", 
        "description", 
        "descriptionText", 
        "error", 
        "pluginsPanel", 
        "togglePluginsButton",
        "togglePluginsText",
        "pluginList",
        "pluginResult",
        "pluginResultText",
        "pluginInputText",
        "pluginsResults",
        "resultsContainer",
        "metaSolverPanel",
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

    async pauseMetaSolver() {
        if (!this._metaWsSessionId) return;
        try {
            await fetch('/api/plugins/metadetection/pause', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ session_id: this._metaWsSessionId })
            });
        } catch (e) { /* ignore */ }
    }

    async resumeMetaSolver() {
        if (!this._metaWsSessionId) return;
        try {
            await fetch('/api/plugins/metadetection/resume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ session_id: this._metaWsSessionId })
            });
        } catch (e) { /* ignore */ }
    }

    async cancelMetaSolver() {
        if (!this._metaWsSessionId) return;
        try {
            await fetch('/api/plugins/metadetection/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ session_id: this._metaWsSessionId })
            });
        } catch (e) { /* ignore */ }
    }
    connect() {
        console.log("Solver controller connected", {
            geocacheId: this.geocacheIdValue,
            gcCode: this.gcCodeValue
        });
        
        // Initialiser l'historique des plugins
        this.pluginsHistoryValue = [];
        
        // Vérifier si une géocache est spécifiée
        if (this.geocacheIdValue && this.geocacheIdValue.trim() !== '') {
            this.loadGeocacheData();
        } else {
            // Aucune géocache spécifiée, initialiser un panneau vide
            console.log("Aucune géocache spécifiée, initialisation d'un panneau vide");
            this.hideLoading();
            this.descriptionTarget.classList.remove('hidden');
            this.descriptionTextTarget.value = '';
        }
        
        // Ajouter un écouteur d'événement pour le changement de type de caractères autorisés
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
        
        // AJOUT: Écouter les changements dans le champ de description
        if (this.hasDescriptionTextTarget) {
            this.descriptionTextTarget.addEventListener('input', (event) => {
                console.log("Mise à jour du champ de description détectée:", event.target.value);
                // Forcer une mise à jour du modèle
                this._currentDescriptionValue = event.target.value;
            });
        }
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
    
    togglePluginsPanel() {
        console.log("togglePluginsPanel appelé");
        
        // Masquer le panneau MetaSolver s'il est visible
        if (!this.metaSolverPanelTarget.classList.contains('hidden')) {
            this.metaSolverPanelTarget.classList.add('hidden');
            this.toggleMetaSolverButtonTarget.classList.remove('bg-blue-700');
            this.toggleMetaSolverButtonTarget.classList.add('bg-blue-600');
        }
        
        // Si le panneau est masqué, l'afficher et charger les plugins
        if (this.pluginsPanelTarget.classList.contains('hidden')) {
            console.log("Panneau masqué, on l'affiche");
            this.pluginsPanelTarget.classList.remove('hidden');
            this.togglePluginsButtonTarget.classList.remove('bg-purple-600');
            this.togglePluginsButtonTarget.classList.add('bg-purple-700');
            
            // Charger les plugins si ce n'est pas déjà fait
            if (!this.pluginsPanelTarget.hasAttribute('data-loaded')) {
                console.log("Plugins non chargés, on les charge");
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
            console.log("loadPluginsList appelé");
            
            // Afficher le panneau des plugins
            console.log("État du panneau avant:", this.pluginsPanelTarget.classList.contains('hidden') ? "caché" : "visible");
            this.pluginsPanelTarget.classList.remove('hidden');
            console.log("État du panneau après:", this.pluginsPanelTarget.classList.contains('hidden') ? "caché" : "visible");
            
            this.togglePluginsButtonTarget.classList.remove('bg-purple-600');
            this.togglePluginsButtonTarget.classList.add('bg-purple-700');
            
            // Vérifier si les plugins sont déjà chargés
            if (this.pluginsPanelTarget.hasAttribute('data-loaded')) {
                console.log("Plugins déjà chargés, sortie de la fonction");
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
            
            // Appeler l'API pour récupérer la liste des plugins
            const response = await fetch('/api/plugins?context=solver');
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const plugins = await response.json();
            
            // Créer un ID unique pour cette zone de plugins
            const mainPluginZoneId = `main-plugin-zone-${Date.now()}`;
            
            // Créer l'interface pour la liste des plugins
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
            
            // Ajouter chaque plugin à la liste
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
                            Sélectionner
                        </button>
                    </div>
                `;
            });
            
            pluginsListHtml += `
                    </div>
                </div>
            `;
            
            // Mettre à jour le contenu du panneau des plugins
            this.pluginsPanelTarget.innerHTML = pluginsListHtml;
            
            // Marquer les plugins comme chargés
            this.pluginsPanelTarget.setAttribute('data-loaded', 'true');
            console.log("Plugins marqués comme chargés");
            
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
        
        console.log("Sélection du plugin:", pluginName, "dans la zone:", pluginZoneId);
        
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
                
                // Appeler l'API pour récupérer l'interface du plugin
                const response = await fetch(`/api/plugins/${pluginName}/interface?context=solver`);
                
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                
                const html = await response.text();
                
                // Mettre à jour le contenu du panneau des plugins
                if (pluginZoneId) {
                    const pluginZone = document.getElementById(pluginZoneId);
                    
                    // Insérer le HTML dans la zone
                    pluginZone.innerHTML = html;
                    
                    // Ajouter l'attribut data-plugin-zone-id au bouton d'exécution
                    const executeButton = pluginZone.querySelector('[data-action="click->geocache-solver#executePlugin"]');
                    if (executeButton) {
                        executeButton.setAttribute('data-plugin-zone-id', pluginZoneId);
                        console.log("Attribut data-plugin-zone-id ajouté au bouton d'exécution:", pluginZoneId);
                    }
                    
                    // Ajouter l'attribut data-plugin-input="true" à tous les textareas du plugin
                    const textareas = pluginZone.querySelectorAll('textarea');
                    textareas.forEach(textarea => {
                        textarea.setAttribute('data-plugin-input', 'true');
                        console.log("Attribut data-plugin-input ajouté à un textarea");
                    });
                } else {
                    this.pluginsPanelTarget.innerHTML = html;
                    
                    // Dans ce cas, nous sommes dans le panneau principal, créons un ID
                    const mainPanelId = `main-panel-${Date.now()}`;
                    this.pluginsPanelTarget.id = mainPanelId;
                    this.pluginsPanelTarget.setAttribute('data-plugin-selection-zone', 'true');
                    
                    // Ajouter l'attribut data-plugin-zone-id au bouton d'exécution
                    const executeButton = this.pluginsPanelTarget.querySelector('[data-action="click->geocache-solver#executePlugin"]');
                    if (executeButton) {
                        executeButton.setAttribute('data-plugin-zone-id', mainPanelId);
                        console.log("Attribut data-plugin-zone-id ajouté au bouton d'exécution principal:", mainPanelId);
                    }
                    
                    // Ajouter l'attribut data-plugin-input="true" à tous les textareas du plugin
                    const textareas = this.pluginsPanelTarget.querySelectorAll('textarea');
                    textareas.forEach(textarea => {
                        textarea.setAttribute('data-plugin-input', 'true');
                        console.log("Attribut data-plugin-input ajouté à un textarea");
                    });
                }
                
                // Mettre à jour le plugin sélectionné
                this.selectedPluginValue = pluginId;
                
                // Préparer le texte à traiter (soit le résultat du plugin précédent, soit le texte de la description)
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
        
        // Remplacer les espaces insécables par des espaces normaux
        let normalized = text.replace(/\xa0/g, ' ');
        
        // Normaliser les retours à la ligne
        normalized = normalized.replace(/\r\n/g, '\n');
        
        // Supprimer les espaces multiples
        normalized = normalized.replace(/\s+/g, ' ');
        
        // Supprimer les espaces en début et fin de chaîne
        normalized = normalized.trim();
        
        console.log("Texte normalisé:", normalized);
        return normalized;
    }
    
    async executePlugin(event) {
        // Récupérer l'ID et le nom du plugin
        const pluginId = event.currentTarget.dataset.pluginId;
        const pluginName = event.currentTarget.dataset.pluginName;
        const pluginZoneId = event.currentTarget.dataset.pluginZoneId;
        
        console.log("Exécution du plugin:", pluginName, "dans la zone:", pluginZoneId);
        
        // Si on a un plugin sélectionné
        if (pluginId && pluginName) {
            // Log pour le débogage - valeur actuelle du champ de description
            console.log("Valeur actuelle dans descriptionTextTarget:", this.descriptionTextTarget.value);
            console.log("Valeur dans _currentDescriptionValue:", this._currentDescriptionValue || "non définie");
            
            // Récupérer le texte à traiter en privilégiant toujours la saisie la plus récente
            let textToProcess = '';
            
            // Déterminer si le plugin est déjà exécuté dans cette zone (réexécution)
            const isReexecution = pluginZoneId && document.getElementById(`result-for-${pluginZoneId}`);
            
            // Trouver la source d'entrée actuelle - toujours prendre l'entrée la plus récente
            const pluginZone = pluginZoneId ? document.getElementById(pluginZoneId) : null;
            
            // Vérifier si une zone d'entrée de texte existe dans la zone du plugin
            const pluginInputTextarea = pluginZone ? 
                pluginZone.querySelector('textarea[data-plugin-input="true"]') : null;
            
            if (pluginInputTextarea && pluginInputTextarea.value.trim() !== '') {
                // Utiliser le texte du plugin si disponible et non vide
                textToProcess = pluginInputTextarea.value;
                console.log("Texte saisi dans le plugin utilisé:", textToProcess);
            } else {
                // Essayer d'utiliser la valeur mise en cache si elle existe
                if (this._currentDescriptionValue) {
                    textToProcess = this._currentDescriptionValue;
                    console.log("Utilisation de la valeur mise en cache:", textToProcess);
                } else {
                    // Sinon utiliser le texte de la description principale
                    textToProcess = this.descriptionTextTarget.value;
                    console.log("Texte de la description principale utilisé:", textToProcess);
                }
                
                // Si c'est une réexécution et que la description principale est vide, 
                // utiliser le résultat du plugin précédent comme fallback
                if (textToProcess.trim() === '' && this.lastPluginOutputValue) {
                    textToProcess = this.lastPluginOutputValue;
                    console.log("Description vide, utilisation du résultat du plugin précédent:", textToProcess);
                }
            }
            
            // Normaliser le texte avant de l'envoyer au plugin
            textToProcess = this.normalizeText(textToProcess);
            console.log("Texte final qui sera envoyé au plugin:", textToProcess);
            
            try {
                // Créer ou récupérer la zone de résultat pour ce plugin
                let resultContainer;
                let resultTextContainer;
                
                if (pluginZoneId) {
                    // Cas d'un plugin dans une zone spécifique
                    if (!pluginZone) {
                        console.error("Zone de plugin non trouvée:", pluginZoneId);
                        throw new Error("Zone de plugin non trouvée");
                    }
                    
                    console.log("Zone de plugin trouvée:", pluginZone);
                    
                    // Mettre à jour l'entrée originale pour cette zone à chaque exécution
                    pluginZone.setAttribute('data-original-input', textToProcess);
                    console.log("Entrée mise à jour pour la zone:", textToProcess);
                    
                    // Supprimer tout résultat précédent associé à ce plugin
                    const existingResult = document.getElementById(`result-for-${pluginZoneId}`);
                    if (existingResult) {
                        existingResult.remove();
                    }
                    
                    // Créer une zone de résultat pour ce plugin
                    const resultZoneId = `result-for-${pluginZoneId}`;
                    resultContainer = document.createElement('div');
                    resultContainer.id = resultZoneId;
                    resultContainer.className = 'bg-gray-800 rounded-lg p-4 mb-4 mt-4';
                    resultContainer.innerHTML = `
                        <h2 class="text-lg font-semibold text-gray-100 mb-3">Résultat du plugin ${pluginName}</h2>
                        <div id="${resultZoneId}-text" class="w-full min-h-[100px] bg-gray-700 text-gray-200 p-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 space-y-3 overflow-auto">
                            <div class="animate-pulse">
                                <div class="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                                <div class="h-4 bg-gray-700 rounded w-1/2"></div>
                            </div>
                        </div>
                    `;
                    
                    // Insérer la zone de résultat après la zone du plugin
                    pluginZone.parentNode.insertBefore(resultContainer, pluginZone.nextSibling);
                    resultTextContainer = document.getElementById(`${resultZoneId}-text`);
                    
                    console.log("Zone de résultat créée:", resultContainer);
                } else {
                    // Cas du premier plugin (utiliser la zone de résultat existante)
                    this.pluginResultTarget.classList.remove('hidden');
                    this.pluginResultTextTarget.value = ''; // Vider le textarea
                    resultContainer = this.pluginResultTarget;
                    resultTextContainer = this.pluginResultTextTarget;
                    
                    console.log("Utilisation de la zone de résultat par défaut");
                }
                
                // Afficher un indicateur de chargement
                if (resultTextContainer) {
                    if (resultTextContainer.tagName === 'TEXTAREA') {
                        resultTextContainer.value = 'Chargement...';
                    } else {
                        resultTextContainer.innerHTML = '<div class="animate-pulse"><div class="h-4 bg-gray-700 rounded w-3/4 mb-2"></div><div class="h-4 bg-gray-700 rounded w-1/2"></div></div>';
                    }
                }
                
                // Collecter tous les paramètres du plugin
                const pluginInputs = {};
                
                // IMPORTANT: Utiliser le texte à traiter qui a été normalisé
                pluginInputs.text = textToProcess;
                console.log("Texte utilisé pour les paramètres du plugin:", textToProcess);
                
                // Mode par défaut
                pluginInputs.mode = 'decode';
                
                // Récupérer tous les champs de formulaire du plugin s'ils existent
                if (pluginZone) {
                    // Récupérer tous les inputs, selects et checkboxes
                    const inputs = pluginZone.querySelectorAll('input, select');
                    
                    inputs.forEach(input => {
                        const inputName = input.name || input.id;
                        
                        if (!inputName) return; // Ignorer les éléments sans nom
                        
                        // IMPORTANT: Ne pas écraser le texte d'entrée
                        if (inputName === 'text') {
                            console.log("Champ 'text' trouvé dans le formulaire, ignoré pour ne pas écraser l'entrée");
                            return;
                        }
                        
                        // Traiter différemment selon le type d'input
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
                
                console.log("Paramètres collectés pour l'exécution du plugin:", pluginInputs);
                
                // Vérification finale pour s'assurer que le texte est bien défini
                if (pluginInputs.text !== textToProcess) {
                    console.error("ANOMALIE: Le texte dans les paramètres a été modifié, correction...");
                    pluginInputs.text = textToProcess;
                }
                
                // Appeler l'API pour exécuter le plugin
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
                console.log("Réponse du plugin:", data);
                
                // Extraire le résultat du plugin en fonction de la structure de la réponse
                let resultText = '';
                let resultHtml = '';
                let coordinates = null;
                
                // Vérifier si nous avons le nouveau format standardisé avec un tableau results
                if (data.results && Array.isArray(data.results) && data.results.length > 0) {
                    console.log("Format standardisé détecté avec tableau results");
                    
                    // Entête avec le résumé si disponible
                    if (data.summary) {
                        resultHtml += `
                            <div class="bg-gray-700 rounded-lg p-4 mb-3">
                                <h3 class="text-md font-medium text-blue-400 mb-2">Résumé</h3>
                                <div class="bg-gray-800 p-3 rounded">
                                    <p class="text-gray-300">${data.summary.message || `${data.summary.total_results} résultat(s)`}</p>
                                    ${data.plugin_info ? `<p class="text-gray-400 text-xs mt-1">Temps d'exécution: ${data.plugin_info.execution_time || 0} ms</p>` : ''}
                                </div>
                            </div>`;
                    }
                    
                    // Traiter chaque résultat
                    data.results.forEach((result, index) => {
                        const isBest = data.summary && data.summary.best_result_id === result.id;
                        
                        // Classe de couleur basée sur le niveau de confiance
                        const confidenceColor = this.getConfidenceColor(result.confidence);
                        
                        resultHtml += `
                            <div class="bg-gray-700 rounded-lg p-3 mb-3 ${isBest ? 'border border-blue-500' : ''}">
                                <div class="flex justify-between items-start mb-2">
                                    <h4 class="text-md font-medium ${isBest ? 'text-blue-400' : 'text-gray-300'}">
                                        Résultat ${index + 1} ${isBest ? '(Meilleur résultat)' : ''}
                                    </h4>
                                    <div class="bg-gray-900 px-2 py-1 rounded text-xs">
                                        Confiance: <span class="font-bold ${confidenceColor}">${Math.round((result.confidence || 0) * 100)}%</span>
                                    </div>
                                </div>
                                
                                <div class="bg-gray-800 p-3 rounded mb-2">
                                    <div class="text-sm text-gray-300 whitespace-pre-wrap">${result.text_output || ''}</div>
                                </div>`;
                        
                        // Afficher les paramètres utilisés si présents
                        if (result.parameters && Object.keys(result.parameters).length > 0) {
                            resultHtml += `
                                <div class="mt-2 p-2 bg-gray-800 rounded">
                                    <h5 class="text-xs font-medium text-gray-400 mb-1">Paramètres utilisés:</h5>
                                    <div class="text-xs text-gray-300 grid grid-cols-2 gap-1">
                                        ${Object.entries(result.parameters).map(([key, value]) => 
                                            `<div><span class="text-gray-500">${key}:</span> ${value}</div>`
                                        ).join('')}
                                    </div>
                                </div>`;
                        }
                        
                        // Récupérer les coordonnées à partir des différentes positions possibles
                        let currentCoordinates = null;
                        if (result.coordinates && result.coordinates.exist) {
                            currentCoordinates = result.coordinates;
                        } else if (result.scoring && result.scoring.coordinates && result.scoring.coordinates.exist) {
                            currentCoordinates = result.scoring.coordinates;
                        }
                        
                        // Afficher les coordonnées GPS si présentes
                        if (currentCoordinates) {
                            // La variable 'coordinates' de portée supérieure n'est pas modifiée ici volontairement
                            // car elle est utilisée plus bas pour l'ancien format.
                            // Si une logique de "coordonnées globales du solver" était nécessaire, il faudrait la gérer ici.
                            resultHtml += `
                                <div class="mt-2 p-2 bg-gray-800 rounded">
                                    <h5 class="text-xs font-medium text-gray-400 mb-1">Coordonnées GPS:</h5>
                                    <div class="text-xs text-gray-300">
                                        <div class="mb-1"><span class="text-gray-500">Format DDM:</span> ${currentCoordinates.ddm || ''}</div>
                                        <div class="grid grid-cols-2 gap-1">
                                            <div><span class="text-gray-500">Latitude:</span> ${currentCoordinates.ddm_lat || ''}</div>
                                            <div><span class="text-gray-500">Longitude:</span> ${currentCoordinates.ddm_lon || ''}</div>
                                        </div>
                                    </div>
                                </div>`;
                            
                            // Si les coordonnées ont des valeurs décimales, les mémoriser pour l'affichage sur la carte
                            if (currentCoordinates.decimal && 
                                currentCoordinates.decimal.latitude !== null && 
                                currentCoordinates.decimal.longitude !== null) {
                                
                                coordinates = currentCoordinates.decimal;
                                console.log("Coordonnées décimales trouvées:", coordinates);
                            }
                        }
                        
                        resultHtml += `</div>`;
                        
                        // Conserver le texte du meilleur résultat pour la chaîne de plugins
                        if (isBest) {
                            resultText = result.text_output || '';
                        }
                    });
                    
                    // Si aucun meilleur résultat n'a été défini, prendre le premier
                    if (!resultText && data.results.length > 0) {
                        resultText = data.results[0].text_output || '';
                    }
                    
                } else {
                    // Ancien format - maintenir la rétrocompatibilité
                    console.log("Format ancien détecté, utilisation de la rétrocompatibilité");
                    
                    // Cas 1: Réponse avec text_output
                    if (data.text_output) {
                        resultText = data.text_output;
                        console.log("Cas 1: text_output trouvé:", resultText);
                    }
                    // Cas 2: Réponse avec result.text.text_output
                    else if (data.result && data.result.text && data.result.text.text_output) {
                        resultText = data.result.text.text_output;
                        console.log("Cas 2: result.text.text_output trouvé:", resultText);
                    }
                    // Cas 3: Réponse avec output
                    else if (data.output) {
                        resultText = data.output;
                        console.log("Cas 3: output trouvé:", resultText);
                    }
                    // Cas 4: Réponse avec result direct
                    else if (data.result) {
                        resultText = typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2);
                        console.log("Cas 4: result direct trouvé:", resultText);
                    }
                    // Cas 5: Réponse est une chaîne de caractères
                    else if (typeof data === 'string') {
                        resultText = data;
                        console.log("Cas 5: réponse est une chaîne:", resultText);
                    }
                    // Cas par défaut: Afficher la réponse complète
                    else {
                        resultText = JSON.stringify(data, null, 2);
                        console.log("Cas par défaut: affichage de la réponse complète");
                    }
                    
                    // Vérifier si des coordonnées sont présentes dans l'ancien format
                    if (data.coordinates && data.coordinates.exist) {
                        coordinates = data.coordinates;
                        
                        // Si les coordonnées ont des valeurs décimales, les mémoriser pour l'affichage sur la carte
                        if (data.coordinates.decimal && 
                            data.coordinates.decimal.latitude !== null && 
                            data.coordinates.decimal.longitude !== null) {
                            
                            coordinates = data.coordinates.decimal;
                            console.log("Coordonnées décimales trouvées (format ancien):", coordinates);
                        }
                    } else if (data.result && data.result.coordinates && data.result.coordinates.exist) {
                        coordinates = data.result.coordinates;
                        
                        // Si les coordonnées ont des valeurs décimales, les mémoriser pour l'affichage sur la carte
                        if (data.result.coordinates.decimal && 
                            data.result.coordinates.decimal.latitude !== null && 
                            data.result.coordinates.decimal.longitude !== null) {
                            
                            coordinates = data.result.coordinates.decimal;
                            console.log("Coordonnées décimales trouvées (dans result):", coordinates);
                        }
                    }
                    
                    // Générer HTML pour l'affichage simple
                    resultHtml = `
                        <div class="bg-gray-900 rounded-lg p-3 border border-gray-700 mb-3">
                            <div class="text-sm text-gray-300 whitespace-pre-wrap">${resultText}</div>
                        </div>`;
                        
                    // Ajouter les coordonnées si présentes
                    if (coordinates) {
                        resultHtml += `
                            <div class="bg-gray-900 rounded-lg p-3 border border-gray-700 mb-3">
                                <h4 class="text-md font-medium text-green-400 mb-2">Coordonnées GPS détectées</h4>
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
                
                // Si le résultat est vide, afficher un message
                if (!resultText) {
                    resultText = 'Aucun résultat';
                    console.log("Résultat vide, affichage du message par défaut");
                }
                
                console.log("Résultat final à afficher:", resultText);
                
                // Afficher le résultat dans un conteneur formaté
                if (resultTextContainer) {
                    if (resultTextContainer.tagName === 'TEXTAREA') {
                        // Pour les textareas, on utilise simplement le texte
                        resultTextContainer.value = resultText;
                    } else {
                        // Pour les éléments HTML, on utilise l'affichage riche
                        resultTextContainer.innerHTML = resultHtml;
                    }
                    console.log("Résultat affiché dans le conteneur");
                    
                    // Ajouter un écouteur d'événement pour mettre à jour lastPluginOutputValue lorsque le texte est modifié
                    if (resultTextContainer.tagName === 'TEXTAREA') {
                        resultTextContainer.addEventListener('input', (e) => {
                            this.lastPluginOutputValue = e.target.value;
                            console.log("Valeur mise à jour après modification:", this.lastPluginOutputValue);
                        });
                    }
                } else {
                    console.error("Le conteneur de résultat n'existe pas!");
                }
                
                // Rendre visible le conteneur de résultat s'il est masqué
                if (resultContainer) {
                    resultContainer.classList.remove('hidden');
                    console.log("Conteneur de résultat rendu visible");
                } else {
                    console.error("Le conteneur de résultat n'existe pas!");
                }
                
                // Stocker le résultat pour le prochain plugin (uniquement si ce n'est pas une réexécution)
                if (!isReexecution) {
                    this.lastPluginOutputValue = resultText;
                }
                
                // Ajouter le résultat à l'historique des plugins
                this.pluginsHistoryValue.push({
                    pluginName: pluginName,
                    result: resultText
                });
                
                // Afficher l'historique des plugins
                this.displayPluginsHistory();
                
                // Ajouter un bouton pour appliquer un autre plugin sur ce résultat
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
                
                // Afficher automatiquement les coordonnées sur la carte si disponibles
                if (coordinates && coordinates.latitude !== null && coordinates.longitude !== null) {
                    console.log(`Affichage automatique du point sur la carte: ${coordinates.latitude}, ${coordinates.longitude}`);
                    
                    // Créer l'événement pour ajouter le point sur la carte
                    const event = new CustomEvent('addCalculatedPointToMap', {
                        detail: {
                            latitude: coordinates.latitude,
                            longitude: coordinates.longitude,
                            label: 'Coordonnée détectée',
                            color: 'rgba(0, 150, 255, 0.8)' // Bleu par défaut
                        }
                    });
                    document.dispatchEvent(event);
                    
                    // Afficher une indication que le point a été ajouté
                    const notificationDiv = document.createElement('div');
                    notificationDiv.className = 'mt-2 text-sm text-green-500 map-point-notification';
                    notificationDiv.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Point affiché sur la carte';
                    
                    // Supprimer les notifications précédentes de ce type
                    resultContainer.querySelectorAll('.map-point-notification').forEach(el => el.remove());
                    // Ajouter la nouvelle notification
                    resultContainer.appendChild(notificationDiv);
                    
                    // Ajouter les boutons d'action pour les coordonnées
                    const buttonsDiv = document.createElement('div');
                    buttonsDiv.className = 'flex flex-col sm:flex-row gap-2 mt-3';
                    
                    // Bouton "Créer WP auto"
                    const createWpBtn = document.createElement('button');
                    createWpBtn.id = 'create-wp-auto-btn';
                    createWpBtn.className = 'flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors';
                    createWpBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clip-rule="evenodd" />
                            <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
                        </svg>
                        <span>Créer WP auto</span>
                    `;
                    createWpBtn.addEventListener('click', () => this.createWaypointAuto(coordinates));
                    
                    // Bouton "Ajouter WP" pour ouvrir le formulaire
                    const addWpBtn = document.createElement('button');
                    addWpBtn.id = 'add-wp-btn';
                    addWpBtn.className = 'flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors';
                    addWpBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
                        </svg>
                        <span>Ajouter WP</span>
                    `;
                    addWpBtn.addEventListener('click', () => this.addAsWaypoint(coordinates));
                    
                    // Bouton "Copier les coordonnées"
                    const copyBtn = document.createElement('button');
                    copyBtn.id = 'copy-coords-btn';
                    copyBtn.className = 'flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors';
                    copyBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                        </svg>
                        <span>Copier</span>
                    `;
                    copyBtn.addEventListener('click', () => this.copyCoordinates(coordinates));
                    
                    // Bouton "Mettre à jour coordonnées"
                    const updateCoordsBtn = document.createElement('button');
                    updateCoordsBtn.id = 'update-coords-btn';
                    updateCoordsBtn.className = 'flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-sm font-medium transition-colors';
                    updateCoordsBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M17 8l4 4m0 0l-4 4m4-4H3" clip-rule="evenodd" />
                        </svg>
                        <span>Mettre à jour coordonnées</span>
                    `;
                    updateCoordsBtn.addEventListener('click', () => this.saveGeocacheCoordinates(coordinates));
                    
                    // Ajouter les boutons au conteneur
                    buttonsDiv.appendChild(createWpBtn);
                    buttonsDiv.appendChild(addWpBtn);
                    buttonsDiv.appendChild(copyBtn);
                    buttonsDiv.appendChild(updateCoordsBtn);
                    resultContainer.appendChild(buttonsDiv);
                }
            } catch (error) {
                console.error('Erreur lors de l\'exécution du plugin:', error);
                if (resultTextContainer) {
                    if (resultTextContainer.tagName === 'TEXTAREA') {
                        resultTextContainer.value = `Erreur: ${error.message}`;
                    } else {
                        resultTextContainer.innerHTML = `
                            <div class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                                Erreur lors de l'exécution du plugin: ${error.message}
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
        // Réinitialiser le plugin sélectionné
        this.selectedPluginValue = '';
        
        // Recharger la liste des plugins
        this.loadPluginsList();
    }
    
    cancelPlugin() {
        // Réinitialiser l'état du plugin
        this.selectedPluginValue = '';
        this.lastPluginOutputValue = '';
        
        // Masquer le panneau des plugins
        this.pluginsPanelTarget.classList.add('hidden');
        this.togglePluginsButtonTarget.classList.remove('bg-purple-700');
        this.togglePluginsButtonTarget.classList.add('bg-purple-600');
        
        // Réinitialiser l'attribut data-loaded
        this.pluginsPanelTarget.removeAttribute('data-loaded');
        
        // Vider le contenu du panneau des plugins
        this.pluginsPanelTarget.innerHTML = '';
        
        // Masquer le résultat du plugin
        if (this.hasPluginResultTarget) {
            this.pluginResultTarget.classList.add('hidden');
            this.pluginResultTarget.innerHTML = '';
        }
        
        // Réinitialiser l'historique des plugins
        this.pluginsHistoryValue = [];
        this.displayPluginsHistory();
    }
    
    filterPlugins(event) {
        const searchTerm = event.target.value.toLowerCase();
        console.log("Filtrage des plugins avec le terme:", searchTerm);
        
        // Trouver la liste des plugins la plus proche de l'input de recherche
        const pluginList = event.target.closest('div').nextElementSibling;
        
        if (!pluginList) {
            console.error("Liste de plugins non trouvée");
            return;
        }
        
        // Filtrer les éléments de la liste
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
        console.log("addNewPluginZone appelé");
        
        try {
            // Créer une nouvelle zone de recherche de plugins
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
            
            // Ajouter la nouvelle zone à la fin du conteneur de résultats
            this.resultsContainerTarget.appendChild(newPluginZone);
            
            // Charger la liste des plugins dans cette nouvelle zone
            const response = await fetch('/api/plugins?context=solver');
            
            if (!response.ok) {
                throw new Error('Erreur lors du chargement des plugins');
            }
            
            const plugins = await response.json();
            
            // Générer le HTML pour la liste des plugins (similaire à loadPluginsList)
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
            
            // Ajouter chaque plugin à la liste
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
                            Sélectionner
                        </button>
                    </div>
                `;
            });
            
            pluginsListHtml += `
                </div>
            `;
            
            // Mettre à jour le contenu de la nouvelle zone
            document.getElementById(newPluginZoneId).innerHTML = pluginsListHtml;
            
        } catch (error) {
            console.error('Erreur lors de l\'ajout d\'une nouvelle zone de plugin:', error);
        }
    }
    
    // Méthodes pour gérer le MetaSolver
    
    toggleMetaSolverPanel() {
        console.log("toggleMetaSolverPanel appelé");
        
        // Masquer le panneau des plugins s'il est visible
        if (!this.pluginsPanelTarget.classList.contains('hidden')) {
            this.pluginsPanelTarget.classList.add('hidden');
            this.togglePluginsButtonTarget.classList.remove('bg-purple-700');
            this.togglePluginsButtonTarget.classList.add('bg-purple-600');
        }
        
        // Si le panneau MetaSolver est masqué, l'afficher
        if (this.metaSolverPanelTarget.classList.contains('hidden')) {
            console.log("Panneau MetaSolver masqué, on l'affiche");
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
        console.log("executeMetaSolver appelé");
        // S'assurer que les gestionnaires WebSocket sont branchés
        try { this.connectWebSocketProgressForMetaSolver(); } catch (e) { /* ignore */ }
        
        // Récupérer le mode depuis le bouton ou le select
        const mode = event.currentTarget.dataset.mode || document.getElementById('metasolver-mode').value;
        const strict = document.getElementById('metasolver-strict').value;
        const pluginScopeEl = document.getElementById('metasolver-plugin-scope');
        const pluginScope = pluginScopeEl ? pluginScopeEl.value : 'selected';
        const embedded = document.getElementById('metasolver-embedded').checked;
        const enableGpsDetection = document.getElementById('metasolver-gps-detection').checked;
        // Nouvelle option : clé éventuelle pour certains plugins
        const keyValueElement = document.getElementById('metasolver-key');
        const keyValue = keyValueElement ? keyValueElement.value.trim() : "";
        
        // Récupérer les informations sur les caractères autorisés
        const allowedCharsType = document.getElementById('metasolver-allowed-chars').value;
        let allowedChars = [];
        
        if (allowedCharsType === 'special') {
            allowedChars = ['°', '.', "'"];
        } else if (allowedCharsType === 'custom') {
            const customChars = document.getElementById('metasolver-custom-chars').value;
            if (customChars) {
                // Convertir la chaîne en tableau de caractères
                allowedChars = customChars.split('');
            }
        }
        
        // Récupérer le texte à analyser et le normaliser
        let text = this.descriptionTextTarget.value;
        text = this.normalizeText(text);
        
        if (!text.trim()) {
            alert("Veuillez entrer un texte à analyser");
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
            
            // Préparer les données pour l'API
            const formData = new FormData();
            formData.append('text', text);
            formData.append('mode', mode);
            formData.append('strict', strict);
            formData.append('embedded', embedded ? 'true' : 'false');
            formData.append('plugin_scope', pluginScope);
            formData.append('enable_gps_detection', enableGpsDetection ? 'true' : 'false');
            // Tenter d'ajouter les coordonnées d'origine de la géocache si disponibles
            try {
                const gcCode = this.gcCodeValue;
                if (gcCode && typeof gcCode === 'string' && gcCode.trim() !== '') {
                    const gcResp = await fetch(`/api/geocaches/by-code/${gcCode}`);
                    if (gcResp.ok) {
                        const gcData = await gcResp.json();
                        if (gcData && gcData.gc_lat && gcData.gc_lon) {
                            const originCoords = { ddm_lat: gcData.gc_lat, ddm_lon: gcData.gc_lon };
                            formData.append('origin_coords', JSON.stringify(originCoords));
                            console.log('Coordonnées d\'origine ajoutées:', originCoords);
                        }
                    }
                }
            } catch (e) {
                console.warn('Impossible de récupérer les coordonnées d\'origine:', e);
            }
            // Ajouter la clé si fournie
            if (keyValue) {
                formData.append('key', keyValue);
            }
            // Ajouter les caractères autorisés si nécessaire
            if (allowedCharsType !== 'all') {
                formData.append('allowed_chars', JSON.stringify(allowedChars));
            }

            // Créer/obtenir une session WebSocket pour suivre la progression
            let sessionId = null;
            try {
                const sessionResp = await fetch('/api/plugins/metadetection/session', { method: 'POST' });
                if (sessionResp.ok) {
                    const sessionData = await sessionResp.json();
                    sessionId = sessionData.session_id;
                }
            } catch (e) {
                console.warn('Impossible de créer la session WebSocket MetaSolver', e);
            }
            if (sessionId) {
                // Rejoindre la session pour recevoir les updates
                if (window.wsService) {
                    window.wsService.joinSession(sessionId);
                }
                // Mémoriser pour Pause/Reprendre/Arrêter
                this._metaWsSessionId = sessionId;
                formData.append('ws_session_id', sessionId);
            }
            
            console.log("Paramètres envoyés à l'API:", {
                text: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
                mode: mode,
                strict: strict,
                embedded: embedded,
                enable_gps_detection: enableGpsDetection,
                key: keyValue || undefined,
                allowed_chars: allowedCharsType !== 'all' ? allowedChars : "all"
            });
            
            // Appeler l'API pour exécuter le MetaSolver
            const response = await fetch('/api/plugins/metadetection/execute', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const result = await response.json();
            // Si le backend nous renvoie un session_id, s'y abonner si pas déjà fait
            if (!sessionId && result && result.ws_session_id && window.wsService) {
                this._metaWsSessionId = result.ws_session_id;
                window.wsService.joinSession(result.ws_session_id);
            }
            console.log("Réponse brute de l'API MetaSolver:", result);
            console.log("Structure complète des résultats:", JSON.stringify(result, null, 2));
            console.log("Présence de 'results':", !!result.results);
            console.log("Type de 'results':", result.results ? typeof result.results : "non défini");
            console.log("Nombre d'éléments dans 'results':", result.results && Array.isArray(result.results) ? result.results.length : 0);
            console.log("Présence de 'combined_results':", !!result.combined_results);
            console.log("Présence de 'primary_coordinates':", !!result.primary_coordinates);
            
            // Formater et afficher les résultats
            resultContentElement.innerHTML = await this.formatMetaDetectionResults(result);
            
            // Ajouter à l'historique des plugins
            this.addToPluginsHistory({
                plugin: 'MetaSolver',
                action: mode === 'detect' ? 'Analyse' : 'Décodage',
                timestamp: new Date().toLocaleTimeString(),
                result: result
            });
            
        } catch (error) {
            console.error("Erreur lors de l'exécution du MetaSolver:", error);
            const resultElement = document.getElementById('metasolver-result');
            const resultContentElement = document.getElementById('metasolver-result-content');
            
            resultElement.classList.remove('hidden');
            resultContentElement.innerHTML = `
                <div class="bg-red-900 text-red-100 p-4 rounded-lg">
                    Erreur lors de l'exécution du MetaSolver: ${error.message}
                </div>
            `;
        }
    }

    connectWebSocketProgressForMetaSolver() {
        // Branche les handlers globaux une seule fois
        if (!window.wsService || this._metaWsHandlersInitialized) return;
        this._metaWsHandlersInitialized = true;

        const resultElement = document.getElementById('metasolver-result');
        const resultContentElement = document.getElementById('metasolver-result-content');
        const liveStatusEl = document.getElementById('metasolver-live-status');
        const liveSpinnerEl = document.getElementById('metasolver-live-spinner');
        const liveTextEl = document.getElementById('metasolver-live-text');
        const liveProgressEl = document.getElementById('metasolver-live-progress');

        // Afficher une ligne d'état nette
        const ensureVisible = () => {
            if (resultElement.classList.contains('hidden')) {
                resultElement.classList.remove('hidden');
            }
            if (liveStatusEl && liveStatusEl.classList.contains('hidden')) {
                liveStatusEl.classList.remove('hidden');
            }
            if (liveSpinnerEl) {
                liveSpinnerEl.classList.remove('hidden');
            }
            if (liveProgressEl) {
                liveProgressEl.style.width = '0%';
            }
        };

        // Progression générique
        window.wsService.on('progress_metadetection', (data) => {
            if (!data) return;
            ensureVisible();
            const { step, message, progress, data: extra } = data;
            const pct = (typeof progress === 'number' && progress >= 0 && progress <= 100) ? `${progress}%` : '';
            if (liveStatusEl) {
                const STEP_LABELS = {
                    started: 'Démarrage',
                    prepare: 'Préparation',
                    scraping: 'Récupération',
                    detect_found: 'Détection',
                    decode_start: 'Décodage',
                    decode_try_plugin: 'Décodage',
                    partial_result: 'Résultat partiel',
                    decode_done: 'Décodage terminé',
                    completed: 'Terminé',
                    progress: 'Progression'
                };
                const stepKey = (step || '').toString().toLowerCase();
                const friendly = STEP_LABELS[stepKey] || (step ? step.replace(/_/g, ' ') : 'Progression');
                const friendlyCaps = friendly.toUpperCase();
                if (liveTextEl) {
                    liveTextEl.innerHTML = `<span class="text-blue-400">${friendlyCaps}${pct ? ' · ' + pct : ''}</span> ${message || ''}`;
                } else {
                    liveStatusEl.innerHTML = `<span class="text-blue-400">${friendlyCaps}${pct ? ' · ' + pct : ''}</span> ${message || ''}`;
                }
            }
            if (liveProgressEl && typeof progress === 'number' && progress >= 0 && progress <= 100) {
                liveProgressEl.style.width = `${progress}%`;
            }

            // Affichage incrémental de l'étape en cours
            const line = document.createElement('div');
            line.className = 'text-sm text-gray-300';
            const STEP_LABELS2 = {
                started: 'Démarrage',
                prepare: 'Préparation',
                scraping: 'Récupération',
                detect_found: 'Détection',
                decode_start: 'Décodage',
                decode_try_plugin: 'Décodage',
                partial_result: 'Résultat partiel',
                decode_done: 'Décodage terminé',
                completed: 'Terminé',
                progress: 'Progression'
            };
            const stepKey2 = (step || '').toString().toLowerCase();
            const friendly2 = STEP_LABELS2[stepKey2] || (step ? step.replace(/_/g, ' ') : 'progress');
            line.innerHTML = `<span class="text-blue-400">[${friendly2}${pct ? ' ' + pct : ''}]</span> ${message || ''}`;
            resultContentElement.appendChild(line);

            // Si un résultat partiel est disponible, l'afficher
            if (extra && (extra.text_output || extra.fragments)) {
                const partial = document.createElement('div');
                partial.className = 'mt-1 p-2 bg-gray-700 rounded';
                const header = extra.plugin ? `<div class="text-xs text-gray-400">Plugin: ${extra.plugin}</div>` : '';
                const body = extra.text_output ? `<pre class="whitespace-pre-wrap text-gray-200 text-xs">${extra.text_output}</pre>` : '';
                const fr = Array.isArray(extra.fragments) && extra.fragments.length ? `<div class="text-xs text-gray-400">Fragments: ${extra.fragments.join(', ')}</div>` : '';
                partial.innerHTML = `${header}${fr}${body}`;
                resultContentElement.appendChild(partial);
            }

            // Garder le scroll en bas
            resultContentElement.scrollTop = resultContentElement.scrollHeight;
        });

        // Terminaison
        window.wsService.on('complete_metadetection', (data) => {
            if (!data) return;
            ensureVisible();
            const status = data.status;
            const line = document.createElement('div');
            line.className = status === 'success' ? 'text-sm text-green-400' : 'text-sm text-red-400';
            line.textContent = status === 'success' ? (data.message || 'Terminé') : (data.message || 'Erreur');
            resultContentElement.appendChild(line);
            if (liveStatusEl) {
                if (status === 'success') {
                    liveStatusEl.className = 'mb-3 p-2 bg-green-900/30 border border-green-600 rounded text-sm text-green-300';
                    if (liveSpinnerEl) liveSpinnerEl.classList.add('hidden');
                    if (liveTextEl) { liveTextEl.textContent = data.message || 'Terminé'; } else { liveStatusEl.textContent = data.message || 'Terminé'; }
                } else {
                    liveStatusEl.className = 'mb-3 p-2 bg-red-900/30 border border-red-600 rounded text-sm text-red-300';
                    if (liveSpinnerEl) liveSpinnerEl.classList.add('hidden');
                    if (liveTextEl) { liveTextEl.textContent = data.message || 'Erreur'; } else { liveStatusEl.textContent = data.message || 'Erreur'; }
                }
                if (liveProgressEl) liveProgressEl.style.width = '100%';
                setTimeout(() => {
                    if (liveStatusEl) {
                        liveStatusEl.classList.add('hidden');
                        liveStatusEl.className = 'mb-3 p-2 bg-gray-800 border border-gray-600 rounded text-sm text-blue-300';
                        if (liveSpinnerEl) liveSpinnerEl.classList.add('hidden');
                        if (liveTextEl) liveTextEl.textContent = '';
                        if (liveProgressEl) liveProgressEl.style.width = '0%';
                    }
                }, 3000);
            }

            // En cas de succès, si un résultat complet est inclus, re-render
            if (status === 'success' && data.result) {
                // Séparateur
                const sep = document.createElement('hr');
                sep.className = 'my-2 border-gray-600';
                resultContentElement.appendChild(sep);
                // Rendu final
                (async () => {
                    const html = await this.formatMetaDetectionResults(data.result);
                    const container = document.createElement('div');
                    container.innerHTML = html;
                    resultContentElement.appendChild(container);
                    resultContentElement.scrollTop = resultContentElement.scrollHeight;
                })();
            }
        });
    }
    
    async decodeWithPlugin(event) {
        const pluginName = event.currentTarget.dataset.plugin;
        const text = this.descriptionTextTarget.value;
        
        if (!text.trim()) {
            alert("Veuillez entrer un texte à décoder");
            return;
        }
        
        try {
            // Récupérer les options du MetaSolver
            const strict = document.getElementById('metasolver-strict').value;
            const embedded = document.getElementById('metasolver-embedded').checked;
            const enableGpsDetection = document.getElementById('metasolver-gps-detection').checked;
            const keyValueElementDecode = document.getElementById('metasolver-key');
            const keyValueDecode = keyValueElementDecode ? keyValueElementDecode.value.trim() : "";
            
            // Récupérer les informations sur les caractères autorisés
            const allowedCharsType = document.getElementById('metasolver-allowed-chars').value;
            let allowedChars = [];
            
            if (allowedCharsType === 'special') {
                allowedChars = ['°', '.', "'"];
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
            
            // Préparer les données pour l'API
            const formData = new FormData();
            formData.append('text', text);
            formData.append('mode', 'decode');
            formData.append('strict', strict);
            formData.append('embedded', embedded ? 'true' : 'false');
            formData.append('plugin_name', pluginName);
            formData.append('enable_gps_detection', enableGpsDetection ? 'true' : 'false');
            // Tenter d'ajouter les coordonnées d'origine de la géocache si disponibles
            try {
                const gcCode = this.gcCodeValue;
                if (gcCode && typeof gcCode === 'string' && gcCode.trim() !== '') {
                    const gcResp = await fetch(`/api/geocaches/by-code/${gcCode}`);
                    if (gcResp.ok) {
                        const gcData = await gcResp.json();
                        if (gcData && gcData.gc_lat && gcData.gc_lon) {
                            const originCoords = { ddm_lat: gcData.gc_lat, ddm_lon: gcData.gc_lon };
                            formData.append('origin_coords', JSON.stringify(originCoords));
                            console.log('Coordonnées d\'origine ajoutées:', originCoords);
                        }
                    }
                }
            } catch (e) {
                console.warn('Impossible de récupérer les coordonnées d\'origine:', e);
            }
            // Ajouter la clé si fournie
            if (keyValueDecode) {
                formData.append('key', keyValueDecode);
            }
            // Ajouter les caractères autorisés si nécessaire
            if (allowedCharsType !== 'all') {
                formData.append('allowed_chars', JSON.stringify(allowedChars));
            }
            
            console.log("decodeWithPlugin - Paramètres envoyés à l'API:", {
                text: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
                mode: "decode",
                strict: strict,
                embedded: embedded,
                plugin_name: pluginName,
                enable_gps_detection: enableGpsDetection,
                key: keyValueDecode || undefined,
                allowed_chars: allowedCharsType !== 'all' ? allowedChars : "all"
            });
            
            // Appeler l'API pour exécuter le MetaSolver avec le plugin spécifié
            const response = await fetch('/api/plugins/metadetection/execute', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const result = await response.json();
            console.log("decodeWithPlugin - Réponse brute de l'API MetaSolver:", result);
            console.log("decodeWithPlugin - Présence de 'results':", !!result.results);
            console.log("decodeWithPlugin - Type de 'results':", result.results ? typeof result.results : "non défini");
            console.log("decodeWithPlugin - Nombre d'éléments dans 'results':", result.results && Array.isArray(result.results) ? result.results.length : 0);
            
            // Afficher le résultat en utilisant la méthode de formatage
            resultContentElement.innerHTML = await this.formatMetaDetectionResults(result);
            
            // Ajouter à l'historique des plugins
            this.addToPluginsHistory({
                plugin: 'MetaSolver - ' + pluginName,
                action: 'Décodage',
                timestamp: new Date().toLocaleTimeString(),
                result: result
            });
            
        } catch (error) {
            console.error("Erreur lors du décodage:", error);
            const resultElement = document.getElementById('metasolver-result');
            const resultContentElement = document.getElementById('metasolver-result-content');
            
            resultElement.classList.remove('hidden');
            resultContentElement.innerHTML = `
                <div class="bg-red-900 text-red-100 p-4 rounded-lg">
                    Erreur lors du décodage: ${error.message}
                </div>
            `;
        }
    }
    
    async formatMetaDetectionResults(result) {
        console.log("formatMetaDetectionResults - Début du formatage des résultats");
        
        if (result.error) {
            console.log("formatMetaDetectionResults - Erreur détectée:", result.error);
            return `
                <div class="bg-red-900 text-red-100 p-4 rounded-lg">
                    ${result.error}
                </div>
            `;
        }
        
        // Préparer une collection de points pour l'affichage automatique sur la carte
        const mapPoints = [];
        const pushPointIfValid = (lat, lon, label, index = null) => {
            const latNum = typeof lat === 'number' ? lat : parseFloat(lat);
            const lonNum = typeof lon === 'number' ? lon : parseFloat(lon);
            if (!isNaN(latNum) && !isNaN(lonNum)) {
                mapPoints.push({
                    latitude: latNum,
                    longitude: lonNum,
                    label: label || 'Coordonnée détectée',
                    fillColor: 'rgba(0, 90, 220, 0.7)',
                    strokeColor: '#00AAFF',
                    strokeWidth: 3,
                    index: index || (mapPoints.length + 1)
                });
            }
        };

        // Petite fonction d'échappement HTML pour du texte arbitraire (erreurs, raisons)
        const escapeHtml = (s) => {
            try { return (s ?? '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); } catch (e) { return ''; }
        };

        // Vérifier si des coordonnées GPS ont été détectées dans primary_coordinates
        let gpsCoordinatesHtml = '';
        // Préparer éventuellement un encart pour les plugins en échec
        let failedHtml = '';
        if (result.failed_plugins && Array.isArray(result.failed_plugins) && result.failed_plugins.length > 0) {
            failedHtml = `\n                <div class=\"bg-red-900/40 border border-red-600 rounded-lg p-4 mt-4\">\n                    <h3 class=\"text-md font-semibold text-red-300 mb-2\">Plugins sans résultat (${result.failed_plugins.length})</h3>\n                    <ul class=\"list-disc list-inside space-y-1 text-sm text-red-200\">\n                        ${result.failed_plugins.map(fp => `<li><strong>${fp.plugin}</strong> : ${fp.reason}</li>`).join('')}\n                    </ul>\n                </div>`;
        }
        if (result.primary_coordinates) {
            console.log("formatMetaDetectionResults - Coordonnées primaires détectées:", result.primary_coordinates);
            // Stocker les coordonnées détectées pour une utilisation ultérieure
            this.lastDetectedCoordinatesValue = result.primary_coordinates;
            
            // Préparer un point primaire (il sera dispatché plus bas selon les autres résultats)
            pushPointIfValid(result.primary_coordinates.latitude, result.primary_coordinates.longitude, 'Coordonnée principale', 1);
            
            // Récupérer les coordonnées en format DDM si disponibles
            let ddmLat = "";
            let ddmLon = "";
            let ddmFull = "";
            
            // Parcourir les résultats combinés pour trouver les coordonnées DDM
            if (result.combined_results) {
                Object.entries(result.combined_results).forEach(([pluginName, pluginResult]) => {
                    if (pluginResult.coordinates && pluginResult.coordinates.exist) {
                        ddmLat = pluginResult.coordinates.ddm_lat || "";
                        ddmLon = pluginResult.coordinates.ddm_lon || "";
                        ddmFull = pluginResult.coordinates.ddm || "";
                    }
                });
            }
            
            // Utiliser les coordonnées décimales si on n'a pas trouvé de format DDM
            if (!ddmFull && result.primary_coordinates) {
                const lat = result.primary_coordinates.latitude;
                const lon = result.primary_coordinates.longitude;
                ddmFull = `${lat > 0 ? 'N' : 'S'} ${Math.abs(lat).toFixed(6)}°, ${lon > 0 ? 'E' : 'W'} ${Math.abs(lon).toFixed(6)}°`;
            }
            
            gpsCoordinatesHtml = ``; // Suppression du bloc global éditable: l'édition se fait par résultat uniquement
        } else if (result.coordinates && result.coordinates.exist) {
            console.log("formatMetaDetectionResults - Coordonnées anciennes détectées (format rétrocompatible)");
            // Ancien format pour rétrocompatibilité
            this.lastDetectedCoordinatesValue = result.coordinates;
            
            gpsCoordinatesHtml = `
                <div class="bg-gray-700 rounded-lg p-4 mt-4">
                    <h3 class="text-lg font-medium text-green-400 mb-2">Coordonnées GPS détectées</h3>
                    
                    <div class="bg-gray-800 p-4 rounded grid grid-cols-1 gap-4" data-coords-container="true">
                        <div>
                            <label class="block text-sm font-medium text-gray-400 mb-1">Format DDM:</label>
                            <input type="text" class="w-full bg-gray-800 text-green-300 border border-gray-700 focus:border-green-500 p-2 rounded font-mono"
                                   data-coords-input="ddm" value="${result.coordinates.ddm || ''}" readonly>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-400 mb-1">Latitude:</label>
                                <input type="text" class="w-full bg-gray-800 text-green-300 border border-gray-700 focus:border-green-500 p-2 rounded font-mono"
                                       data-coords-input="lat" value="${result.coordinates.ddm_lat || ''}" readonly>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-400 mb-1">Longitude:</label>
                                <input type="text" class="w-full bg-gray-800 text-green-300 border border-gray-700 focus:border-green-500 p-2 rounded font-mono"
                                       data-coords-input="lon" value="${result.coordinates.ddm_lon || ''}" readonly>
                            </div>
                        </div>
                        
                        <div class="flex justify-between mt-2">
                            <div class="flex gap-2">
                                <button class="px-3 py-1 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-md"
                                        data-action="click->geocache-solver#toggleEditCoordinates">
                                    Modifier
                                </button>
                                <button class="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md"
                                        onclick="navigator.clipboard.writeText('${result.coordinates.ddm}').then(() => alert('Coordonnées copiées dans le presse-papier'))">
                                    Copier
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Vérifier si nous avons le nouveau format standardisé avec un tableau results
        if (result.results && Array.isArray(result.results) && result.results.length > 0) {
            console.log("formatMetaDetectionResults - Détecté format standardisé avec tableau results", result.results);
            let html = '';
            
            // Afficher le résumé si disponible (supprimé en mode Analyse avec nouveau bloc)
            const hasAnalysisBlocks = Array.isArray(result.tested_plugins) || Array.isArray(result.skipped_plugins);
            const isDetectOverall = result.inputs && result.inputs.mode === 'detect';
            if (result.summary && !(isDetectOverall && hasAnalysisBlocks)) {
                console.log("formatMetaDetectionResults - Résumé disponible:", result.summary);
                html += `
                    <div class="bg-gray-700 rounded-lg p-4 mb-3">
                        <h3 class="text-md font-medium text-blue-400 mb-2">Résumé</h3>
                        <div class="bg-gray-800 p-3 rounded">
                            <p class="text-gray-300">${result.summary.message || `${result.summary.total_results} résultat(s)`}</p>
                            ${result.plugin_info ? `<p class="text-gray-400 text-xs mt-1">Temps d'exécution: ${result.plugin_info.execution_time || 0} ms</p>` : ''}
                        </div>
                    </div>`;
            }
            
            // Section: Plugins testés / ignorés (mode Analyse)
            if (Array.isArray(result.tested_plugins) || Array.isArray(result.skipped_plugins)) {
                const tested = Array.isArray(result.tested_plugins) ? result.tested_plugins : [];
                const skipped = Array.isArray(result.skipped_plugins) ? result.skipped_plugins : [];
                const testedHtml = tested.length ? `
                    <div class="bg-gray-700 rounded-lg p-4 mb-3">
                        <h3 class="text-md font-medium text-blue-300 mb-2">Plugins testés (${tested.length})</h3>
                        <div id="metasolver-tested-table" class="w-full"></div>
                    </div>` : '';
                const skippedHtml = skipped.length ? `
                    <div class="bg-gray-700 rounded-lg p-4 mb-3">
                        <h3 class="text-md font-medium text-gray-300 mb-2">Plugins ignorés (${skipped.length})</h3>
                        <ul class="list-disc list-inside text-sm text-gray-300">
                            ${skipped.map(s => `<li><span class="text-gray-200 font-medium">${escapeHtml(s.plugin)}</span> — <span class="text-gray-400">${escapeHtml(s.reason || '')}</span></li>`).join('')}
                        </ul>
                    </div>` : '';
                html += testedHtml + skippedHtml;
                // Après génération HTML, initialiser Tabulator pour le tableau testé
                setTimeout(() => {
                    try {
                        const tableEl = document.getElementById('metasolver-tested-table');
                        if (!tableEl || typeof Tabulator === 'undefined') return;
                        const rows = tested.map((t, idx) => ({
                            id: idx + 1,
                            plugin: t.plugin,
                            scorePct: Math.round((t.score || 0) * 100),
                            fragments: t.fragments_count ?? 0,
                            time_ms: t.time_ms ?? '',
                            error: t.error || '',
                            can_decode: !!t.can_decode,
                            is_match: !!t.is_match
                        }));
                        new Tabulator(tableEl, {
                            data: rows,
                            layout: "fitColumns",
                            height: 280,
                            placeholder: "Aucun plugin testé",
                            columns: [
                                { title: "Plugin", field: "plugin", headerSort: true },
                                { title: "Score", field: "scorePct", hozAlign: "right", headerSort: true, formatter: (cell) => `${cell.getValue()}%` },
                                { title: "Fragments", field: "fragments", hozAlign: "right", headerSort: true },
                                { title: "Temps (ms)", field: "time_ms", hozAlign: "right", headerSort: true },
                                { title: "Erreur", field: "error", headerSort: false, formatter: (cell) => `<span class=\"text-red-300\">${escapeHtml(cell.getValue())}</span>` },
                                { title: "Actions", field: "actions", headerSort: false, formatter: (cell) => {
                                    const row = cell.getRow().getData();
                                    return (row.can_decode && row.is_match) ? `<button data-action=\"click->geocache-solver#decodeWithPlugin\" data-plugin=\"${escapeHtml(row.plugin)}\" class=\"bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-2 rounded\">Décoder</button>` : '';
                                } }
                            ]
                        });
                    } catch (e) { console.warn('Tabulator init (tested) échoué:', e); }
                }, 0);
            }

            // Traiter chaque résultat (sauf en mode Analyse avec nouveau bloc)
            if (!(isDetectOverall && hasAnalysisBlocks)) {
            result.results.forEach((resultEntry, index) => {
                console.log("formatMetaDetectionResults - Traitement du résultat", index, resultEntry);
                const isBest = result.summary && result.summary.best_result_id === resultEntry.id;
                
                // Classe de couleur basée sur le niveau de confiance
                const confidenceColor = this.getConfidenceColor(resultEntry.confidence);
                const parameterPlugin = resultEntry.parameters?.plugin || "";
                
                // Déterminer si ce résultat peut être décodé
                const canDecode = resultEntry.metadata?.can_decode === true;
                const isDetectMode = resultEntry.parameters?.mode === "detect";
                const isNotMetadetection = !parameterPlugin.includes("metadetection");
                const showDecodeButton = isDetectMode && isNotMetadetection && canDecode;
                
                console.log(`Résultat ${index} - Plugin: ${parameterPlugin}, Mode: ${resultEntry.parameters?.mode}, CanDecode: ${canDecode}, ShowButton: ${showDecodeButton}`);
                
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
                                    Décoder
                                </button>` : ''}
                        </div>
                        <div class="text-sm text-gray-300 whitespace-pre-wrap">${resultEntry.text_output || ''}</div>
                        
                        ${resultEntry.metadata?.fragments?.length > 0 ? 
                            `<div class="mt-2 text-xs text-gray-400">
                                Fragments: ${resultEntry.metadata.fragments.join(', ')}
                             </div>` : ''}
                        ${(() => {
                            // Bloc coordonnées par résultat (si disponible)
                            const coords = resultEntry.coordinates || (result.combined_results && result.combined_results[parameterPlugin] ? result.combined_results[parameterPlugin].coordinates : null);
                            if (!coords || !coords.exist) {
                                return '';
                            }
                            // Récupérer lat/lon décimaux depuis diverses structures possibles
                            let lat = null; let lon = null;
                            if (coords.decimal) {
                                if (Array.isArray(coords.decimal)) {
                                    lat = coords.decimal[0];
                                    lon = coords.decimal[1];
                                } else if (typeof coords.decimal === 'object') {
                                    lat = coords.decimal.latitude ?? coords.decimal.lat ?? null;
                                    lon = coords.decimal.longitude ?? coords.decimal.lon ?? null;
                                }
                            }
                            // Fallback si decimal absent mais primary_coordinates au format objet
                            if ((lat === null || lon === null) && result.primary_coordinates) {
                                lat = result.primary_coordinates.latitude ?? null;
                                lon = result.primary_coordinates.longitude ?? null;
                            }
                            // Construire DDM
                            let ddmLat = coords.ddm_lat || '';
                            let ddmLon = coords.ddm_lon || '';
                            let ddmFull = coords.ddm || '';
                            const toDdm = (value, isLat) => {
                                if (typeof value !== 'number' || isNaN(value)) return '';
                                const dir = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
                                const abs = Math.abs(value);
                                const deg = Math.floor(abs);
                                const min = (abs - deg) * 60;
                                return `${dir} ${deg}° ${min.toFixed(3)}'`;
                            };
                            if ((!ddmLat || !ddmLon) && (typeof lat === 'number') && (typeof lon === 'number')) {
                                ddmLat = toDdm(lat, true);
                                ddmLon = toDdm(lon, false);
                            }
                            if (!ddmFull && ddmLat && ddmLon) {
                                ddmFull = `${ddmLat} ${ddmLon}`;
                            }
                            const gmapsLat = (typeof lat === 'number') ? lat : '';
                            const gmapsLon = (typeof lon === 'number') ? lon : '';
                            const ddmAttr = (ddmFull || '').replace(/"/g, '&quot;');
                            const ddmLatAttr = (ddmLat || '').replace(/"/g, '&quot;');
                            const ddmLonAttr = (ddmLon || '').replace(/"/g, '&quot;');
                            // Distance depuis l'origine si fournie par le backend
                            let distanceInfo = resultEntry.distance_from_origin;
                            if (!distanceInfo && result.combined_results && result.combined_results[parameterPlugin]) {
                                distanceInfo = result.combined_results[parameterPlugin].distance_from_origin;
                            }
                            const renderDistance = () => {
                                if (!distanceInfo) return '';
                                const meters = typeof distanceInfo.meters === 'number' ? distanceInfo.meters.toFixed(0) : distanceInfo.meters;
                                const miles = typeof distanceInfo.miles === 'number' ? distanceInfo.miles.toFixed(2) : distanceInfo.miles;
                                let cls = 'text-gray-300';
                                if (distanceInfo.status === 'ok') cls = 'text-green-400';
                                else if (distanceInfo.status === 'warning') cls = 'text-amber-300';
                                else if (distanceInfo.status === 'far') cls = 'text-red-400';
                                const label = distanceInfo.status === 'ok' ? 'Conforme (< 2 miles)' : (distanceInfo.status === 'warning' ? 'Proche limite (~2–2.5 miles)' : 'Hors limite (> 2.5 miles)');
                                return `<div class="mt-2 text-xs ${cls}">Distance: ${meters} m (${miles} miles) · ${label}</div>`;
                            };
                            return `
                                <div class="bg-gray-700 rounded-lg p-3 mt-3">
                                    <h4 class="text-sm font-medium text-green-400 mb-2">Coordonnées détectées</h4>
                                    <div class="bg-gray-800 p-3 rounded grid grid-cols-1 gap-3" data-coords-container="true">
                                        <div>
                                            <label class="block text-xs font-medium text-gray-400 mb-1">Coordonnées — éditable:</label>
                                            <input type="text" class="w-full bg-gray-800 text-green-300 border border-gray-700 focus:border-green-500 p-2 rounded font-mono" value="${ddmFull}" data-coords-input="ddm" readonly>
                                        </div>
                                        <div class="grid grid-cols-2 gap-3">
                                            <div>
                                                <label class="block text-xs font-medium text-gray-400 mb-1">Latitude:</label>
                                                <input type="text" class="w-full bg-gray-800 text-green-300 border border-gray-700 focus:border-green-500 p-2 rounded font-mono" value="${ddmLat || (typeof lat === 'number' ? lat : '')}" data-coords-input="lat" readonly>
                                            </div>
                                            <div>
                                                <label class="block text-xs font-medium text-gray-400 mb-1">Longitude:</label>
                                                <input type="text" class="w-full bg-gray-800 text-green-300 border border-gray-700 focus:border-green-500 p-2 rounded font-mono" value="${ddmLon || (typeof lon === 'number' ? lon : '')}" data-coords-input="lon" readonly>
                                            </div>
                                        </div>
                                        <div class="mt-1">
                                            ${ (gmapsLat !== '' && gmapsLon !== '') ? `<a href="https://www.google.com/maps?q=${gmapsLat},${gmapsLon}" target="_blank" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs inline-flex items-center mr-2"><i class="fas fa-map-marker-alt mr-1"></i> Google Maps</a>` : ''}
                                            <button class="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-md mr-2" onclick="navigator.clipboard.writeText('${ddmAttr}').then(() => alert('Coordonnées copiées dans le presse-papier'))">
                                                <i class="fas fa-copy mr-1"></i> Copier
                                            </button>
                                            <button class="px-3 py-1 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-md" data-action="click->geocache-solver#toggleEditCoordinates">
                                                Modifier
                                            </button>
                                        </div>
                                        ${renderDistance()}
                                    </div>
                                </div>
                            `;
                        })()}
                    </div>`;
            });
            }
            
            html += `</div></div>`;
            console.log("formatMetaDetectionResults - HTML généré pour le format standardisé (longueur):", html.length);
            // Ajouter affichage automatique sur la carte pour les résultats
            try {
                // Ajouter également les coordonnées par-résultat en tant que points si disponibles
                const augmentedPoints = [];
                const strokeColors = ['#FF0000','#00AAFF','#00CC00','#FF9500','#9900FF','#FF00FF','#00FFFF','#FFDD00','#CC3300','#AAAAAA'];
                if (result.results && Array.isArray(result.results)) {
                    result.results.forEach((resultEntry, idx) => {
                        const coords = resultEntry.coordinates || (result.combined_results && result.combined_results[resultEntry.parameters?.plugin]?.coordinates);
                        if (!coords || !coords.exist) return;
                        let lat = null, lon = null;
                        if (coords.decimal) {
                            if (Array.isArray(coords.decimal)) {
                                lat = coords.decimal[0];
                                lon = coords.decimal[1];
                            } else if (typeof coords.decimal === 'object') {
                                lat = coords.decimal.latitude ?? coords.decimal.lat ?? null;
                                lon = coords.decimal.longitude ?? coords.decimal.lon ?? null;
                            }
                        }
                        if (lat === null || lon === null) return;
                        const label = `Résultat ${idx + 1}`;
                        const colorIdx = idx % strokeColors.length;
                        augmentedPoints.push({
                            latitude: typeof lat === 'number' ? lat : parseFloat(lat),
                            longitude: typeof lon === 'number' ? lon : parseFloat(lon),
                            label,
                            fillColor: 'rgba(0, 90, 220, 0.7)',
                            strokeColor: strokeColors[colorIdx],
                            strokeWidth: 3,
                            index: idx + 1
                        });
                    });
                }

                // Fusionner avec le(s) point(s) primaires collectés
                const allPoints = (augmentedPoints.length > 0) ? augmentedPoints : mapPoints;
                if (allPoints.length > 1) {
                    document.dispatchEvent(new CustomEvent('addMultipleCalculatedPointsToMap', {
                        detail: { points: allPoints, batchId: Date.now() }
                    }));
                } else if (allPoints.length === 1) {
                    const p = allPoints[0];
                    document.dispatchEvent(new CustomEvent('addCalculatedPointToMap', {
                        detail: { latitude: p.latitude, longitude: p.longitude, label: p.label, color: 'rgba(0, 90, 220, 0.8)' }
                    }));
                }
            } catch (e) {
                console.warn('Affichage carte automatique (results):', e);
            }

            return html + gpsCoordinatesHtml + failedHtml;
        }
        // Afficher les résultats des plugins combinés (nouveau format)
        else if (result.combined_results && Object.keys(result.combined_results).length > 0) {
            console.log("formatMetaDetectionResults - Utilisation du format combined_results", Object.keys(result.combined_results));
            let html = `
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-blue-400 mb-3">Résultats de l'analyse</h3>
                    <div class="space-y-3">
            `;
            
            // Parcourir tous les résultats combinés
            Object.entries(result.combined_results).forEach(([pluginName, pluginResult]) => {
                console.log("formatMetaDetectionResults - Plugin résultat:", pluginName, pluginResult);
                let resultText = "";
                let confidenceText = "";
                
                // Extraire le texte décodé s'il existe
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
            console.log("formatMetaDetectionResults - HTML généré pour le format combined_results (longueur):", html.length);
            // Déterminer les points à afficher sur la carte à partir des résultats combinés
            try {
                const points = [];
                const strokeColors = ['#FF0000','#00AAFF','#00CC00','#FF9500','#9900FF','#FF00FF','#00FFFF','#FFDD00','#CC3300','#AAAAAA'];
                let idx = 0;
                Object.values(result.combined_results).forEach((pluginResult) => {
                    const coords = pluginResult?.coordinates;
                    if (!coords || !coords.exist) return;
                    let lat = null, lon = null;
                    if (coords.decimal) {
                        if (Array.isArray(coords.decimal)) {
                            lat = coords.decimal[0];
                            lon = coords.decimal[1];
                        } else if (typeof coords.decimal === 'object') {
                            lat = coords.decimal.latitude ?? coords.decimal.lat ?? null;
                            lon = coords.decimal.longitude ?? coords.decimal.lon ?? null;
                        }
                    }
                    if (lat === null || lon === null) return;
                    const colorIdx = idx % strokeColors.length;
                    points.push({
                        latitude: typeof lat === 'number' ? lat : parseFloat(lat),
                        longitude: typeof lon === 'number' ? lon : parseFloat(lon),
                        label: `Résultat ${idx + 1}`,
                        fillColor: 'rgba(0, 90, 220, 0.7)',
                        strokeColor: strokeColors[colorIdx],
                        strokeWidth: 3,
                        index: idx + 1
                    });
                    idx += 1;
                });

                // Si aucun point combiné, fallback vers le primaire si présent
                const allPoints = points.length > 0 ? points : mapPoints;
                if (allPoints.length > 1) {
                    document.dispatchEvent(new CustomEvent('addMultipleCalculatedPointsToMap', {
                        detail: { points: allPoints, batchId: Date.now() }
                    }));
                } else if (allPoints.length === 1) {
                    const p = allPoints[0];
                    document.dispatchEvent(new CustomEvent('addCalculatedPointToMap', {
                        detail: { latitude: p.latitude, longitude: p.longitude, label: p.label, color: 'rgba(0, 90, 220, 0.8)' }
                    }));
                }
            } catch (e) {
                console.warn('Affichage carte automatique (combined_results):', e);
            }

            return html + gpsCoordinatesHtml + failedHtml;
        }
        // Gérer l'ancien format (mode détection)
        else if (result.result && result.result.possible_codes && result.result.possible_codes.length > 0) {
            console.log("formatMetaDetectionResults - Utilisation du format possible_codes ancien", result.result.possible_codes);
            const codes = result.result.possible_codes;
            let html = `
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-blue-400 mb-3">Codes détectés</h3>
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
                                Décoder
                            </button>` : ''}
                        </div>
                        <div class="text-sm text-gray-400 mt-1">${fragments.length} fragment(s): ${fragmentsText}</div>
                    </div>
                `;
            }
            
            html += `</div></div>`;
            console.log("formatMetaDetectionResults - HTML généré pour le format possible_codes (longueur):", html.length);
            // Afficher un éventuel point primaire si présent
            try {
                if (mapPoints.length === 1) {
                    const p = mapPoints[0];
                    document.dispatchEvent(new CustomEvent('addCalculatedPointToMap', {
                        detail: { latitude: p.latitude, longitude: p.longitude, label: p.label, color: 'rgba(0, 90, 220, 0.8)' }
                    }));
                }
            } catch (e) {
                console.warn('Affichage carte automatique (possible_codes):', e);
            }
            return html + gpsCoordinatesHtml + failedHtml;
        }
        // Gérer l'ancien format (décodage spécifique)
        else if (result.result && result.result.decoded_results && result.result.decoded_results.length > 0) {
            console.log("formatMetaDetectionResults - Utilisation du format decoded_results ancien", result.result.decoded_results);
            const decodedResults = result.result.decoded_results;
            let html = `
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-blue-400 mb-3">Résultats du décodage</h3>
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
            console.log("formatMetaDetectionResults - HTML généré pour le format decoded_results (longueur):", html.length);
            // Afficher un éventuel point primaire si présent
            try {
                if (mapPoints.length === 1) {
                    const p = mapPoints[0];
                    document.dispatchEvent(new CustomEvent('addCalculatedPointToMap', {
                        detail: { latitude: p.latitude, longitude: p.longitude, label: p.label, color: 'rgba(0, 90, 220, 0.8)' }
                    }));
                }
            } catch (e) {
                console.warn('Affichage carte automatique (decoded_results):', e);
            }
            return html + gpsCoordinatesHtml + failedHtml;
        } 
        // Gérer l'ancien format (décodage simple)
        else if (result.result && result.result.decoded_text) {
            console.log("formatMetaDetectionResults - Utilisation du format decoded_text ancien", result.result.decoded_text);
            // Afficher un éventuel point primaire si présent
            try {
                if (mapPoints.length === 1) {
                    const p = mapPoints[0];
                    document.dispatchEvent(new CustomEvent('addCalculatedPointToMap', {
                        detail: { latitude: p.latitude, longitude: p.longitude, label: p.label, color: 'rgba(0, 90, 220, 0.8)' }
                    }));
                }
            } catch (e) {
                console.warn('Affichage carte automatique (decoded_text):', e);
            }
            return `
                <div class="bg-gray-700 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-blue-400 mb-3">Résultat du décodage</h3>
                    <div class="text-gray-200">${result.result.decoded_text}</div>
                    ${gpsCoordinatesHtml}
                </div>
            `;
        } else {
            console.log("formatMetaDetectionResults - Aucun format reconnu, affichage du message par défaut", result);
            // Afficher un éventuel point primaire si présent
            try {
                if (mapPoints.length === 1) {
                    const p = mapPoints[0];
                    document.dispatchEvent(new CustomEvent('addCalculatedPointToMap', {
                        detail: { latitude: p.latitude, longitude: p.longitude, label: p.label, color: 'rgba(0, 90, 220, 0.8)' }
                    }));
                }
            } catch (e) {
                console.warn('Affichage carte automatique (default):', e);
            }
            return `
                <div class="bg-gray-700 p-4 rounded-lg">
                    <div class="text-gray-400">Aucun code détecté dans le texte.</div>
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

    // Bascule l'édition des inputs dans le bloc et valide si demandé
    toggleEditCoordinates(event) {
        event.preventDefault();
        const container = event.currentTarget.closest('[data-coords-container]');
        if (!container) return;
        const ddmInput = container.querySelector('[data-coords-input="ddm"]');
        const latInput = container.querySelector('[data-coords-input="lat"]');
        const lonInput = container.querySelector('[data-coords-input="lon"]');
        const isReadonly = ddmInput ? ddmInput.hasAttribute('readonly') : true;
        if (isReadonly) {
            // Activer l'édition uniquement si tous les champs existent (coordonnées complètes)
            if (!ddmInput || !latInput || !lonInput || !ddmInput.value || !latInput.value || !lonInput.value) {
                alert('Coordonnées incomplètes: impossible d\'activer la modification.');
                return;
            }
            // Ne déverrouiller QUE le champ Coordonnées (DDM)
            ddmInput.removeAttribute('readonly');
            // S'assurer que Lat/Lon restent en lecture seule
            latInput.setAttribute('readonly', '');
            lonInput.setAttribute('readonly', '');
            // Attacher la validation live une seule fois
            if (!container.dataset.validationAttached) {
                this.attachLiveValidation(container);
                container.dataset.validationAttached = '1';
            } else {
                // Forcer une première validation visuelle à l'ouverture
                this.runInitialValidation(container);
            }
            event.currentTarget.textContent = 'Valider';
            event.currentTarget.classList.remove('bg-amber-600', 'hover:bg-amber-700');
            event.currentTarget.classList.add('bg-green-600', 'hover:bg-green-700');
        } else {
            // Valider et appliquer
            this.applyManualCoordinates(event);
            // Repasser en lecture seule
            if (ddmInput) {
                ddmInput.setAttribute('readonly', '');
                this.setInputValidity(ddmInput, true);
            }
            if (latInput) this.setInputValidity(latInput, true);
            if (lonInput) this.setInputValidity(lonInput, true);
            event.currentTarget.textContent = 'Modifier';
            event.currentTarget.classList.remove('bg-green-600', 'hover:bg-green-700');
            event.currentTarget.classList.add('bg-amber-600', 'hover:bg-amber-700');
        }
    }

    // Ajoute la validation live sur les inputs d'un conteneur
    attachLiveValidation(container) {
        const ddmInput = container.querySelector('[data-coords-input="ddm"]');
        const latInput = container.querySelector('[data-coords-input="lat"]');
        const lonInput = container.querySelector('[data-coords-input="lon"]');

        const bind = (el, validator) => {
            if (!el) return;
            const handler = () => {
                const valid = validator(el.value.trim());
                this.setInputValidity(el, valid);
            };
            el.addEventListener('input', handler);
            el.addEventListener('keyup', handler);
            el.addEventListener('keydown', handler);
            el.addEventListener('compositionupdate', handler);
        };
        bind(ddmInput, this.validateDdmFull.bind(this));
        bind(latInput, this.validateLat.bind(this));
        bind(lonInput, this.validateLon.bind(this));

        // Lancer une première validation visuelle immédiate
        this.runInitialValidation(container);
    }

    runInitialValidation(container) {
        const ddmInput = container.querySelector('[data-coords-input="ddm"]');
        const latInput = container.querySelector('[data-coords-input="lat"]');
        const lonInput = container.querySelector('[data-coords-input="lon"]');
        if (ddmInput) this.setInputValidity(ddmInput, this.validateDdmFull(ddmInput.value.trim()));
        if (latInput) this.setInputValidity(latInput, this.validateLat(latInput.value.trim()));
        if (lonInput) this.setInputValidity(lonInput, this.validateLon(lonInput.value.trim()));
    }

    // Applique des classes visuelles selon la validité
    setInputValidity(inputEl, isValid) {
        if (!inputEl) return;
        // Toujours garder la classe 'border' présente d'origine
        // Utiliser des styles inline pour éviter les soucis de purge Tailwind
        if (isValid) {
            inputEl.style.setProperty('border-color', null, 'important');
            inputEl.style.setProperty('box-shadow', null, 'important');
            inputEl.style.setProperty('outline', null, 'important');
            inputEl.style.setProperty('outline-offset', null, 'important');
            inputEl.classList.remove('text-red-400');
            // Restaurer les classes focus par défaut
            inputEl.classList.remove('focus:border-red-500', 'focus:ring-red-500');
            if (!inputEl.classList.contains('focus:ring-blue-500')) inputEl.classList.add('focus:ring-blue-500');
            if (!inputEl.classList.contains('focus:border-green-500')) inputEl.classList.add('focus:border-green-500');
        } else {
            inputEl.style.setProperty('border-color', '#ef4444', 'important'); // red-500
            // Inset + outer pour forcer l'affichage même en focus
            inputEl.style.setProperty('box-shadow', 'inset 0 0 0 2px #ef4444, 0 0 0 2px #ef4444', 'important');
            inputEl.style.setProperty('outline', '2px solid #ef4444', 'important');
            inputEl.style.setProperty('outline-offset', '0px', 'important');
            inputEl.classList.add('text-red-400');
            // Forcer la couleur de focus en rouge
            inputEl.classList.remove('focus:ring-blue-500', 'focus:border-green-500');
            inputEl.classList.add('focus:ring-red-500', 'focus:border-red-500');
        }
    }

    // Validation DDM complet
    validateDdmFull(str) {
        if (!str) return false;
        const m = str.match(/([NS])\s*(\d{1,2})[°\s]*(\d{1,2}\.\d+)["']?\s*([EW])\s*(\d{1,3})[°\s]*(\d{1,2}\.\d+)["']?/i);
        if (!m) return false;
        const degLat = parseInt(m[2], 10);
        const minLat = parseFloat(m[3]);
        const degLon = parseInt(m[5], 10);
        const minLon = parseFloat(m[6]);
        if (degLat < 0 || degLat > 90) return false;
        if (degLon < 0 || degLon > 180) return false;
        if (minLat < 0 || minLat >= 60) return false;
        if (minLon < 0 || minLon >= 60) return false;
        return true;
    }

    // Validation latitude (DDM ou décimal)
    validateLat(str) {
        if (!str) return false;
        const m = str.match(/([NS])\s*(\d{1,2})[°\s]*(\d{1,2}\.\d+)["']?/i);
        if (m) {
            const deg = parseInt(m[2], 10);
            const min = parseFloat(m[3]);
            return deg >= 0 && deg <= 90 && min >= 0 && min < 60;
        }
        const num = parseFloat(str.replace(',', '.'));
        return !isNaN(num) && num >= -90 && num <= 90;
    }

    // Validation longitude (DDM ou décimal)
    validateLon(str) {
        if (!str) return false;
        const m = str.match(/([EW])\s*(\d{1,3})[°\s]*(\d{1,2}\.\d+)["']?/i);
        if (m) {
            const deg = parseInt(m[2], 10);
            const min = parseFloat(m[3]);
            return deg >= 0 && deg <= 180 && min >= 0 && min < 60;
        }
        const num = parseFloat(str.replace(',', '.'));
        return !isNaN(num) && num >= -180 && num <= 180;
    }

    // Méthode pour utiliser les coordonnées détectées
    useCoordinates(event) {
        event.preventDefault();
        
        // Si des coordonnées sont passées via data-*, les utiliser en priorité
        const button = event.currentTarget;
        const dataLat = button?.dataset?.lat;
        const dataLon = button?.dataset?.lon;
        const dataDdm = button?.dataset?.ddm;
        const dataDdmLat = button?.dataset?.ddmLat;
        const dataDdmLon = button?.dataset?.ddmLon;
        if (dataLat || dataLon || dataDdm || dataDdmLat || dataDdmLon) {
            let ddmLat = dataDdmLat || '';
            let ddmLon = dataDdmLon || '';
            let ddmFull = dataDdm || '';
            const toDdm = (value, isLat) => {
                const num = parseFloat(value);
                if (isNaN(num)) return '';
                const dir = isLat ? (num >= 0 ? 'N' : 'S') : (num >= 0 ? 'E' : 'W');
                const abs = Math.abs(num);
                const deg = Math.floor(abs);
                const min = (abs - deg) * 60;
                return `${dir} ${deg}° ${min.toFixed(3)}'`;
            };
            if (!ddmLat && dataLat) ddmLat = toDdm(dataLat, true);
            if (!ddmLon && dataLon) ddmLon = toDdm(dataLon, false);
            if (!ddmFull && ddmLat && ddmLon) ddmFull = `${ddmLat} ${ddmLon}`;
            this.lastDetectedCoordinatesValue = {
                ddm: ddmFull,
                ddm_lat: ddmLat,
                ddm_lon: ddmLon
            };
        }
        
        if (!this.lastDetectedCoordinatesValue) {
            alert("Aucune coordonnée GPS détectée.");
            return;
        }
        
        const coords = this.lastDetectedCoordinatesValue;
        
        // Si nous sommes dans le contexte d'une géocache
        if (this.geocacheIdValue) {
            if (confirm("Voulez-vous utiliser ces coordonnées comme coordonnées corrigées pour cette géocache?")) {
                this.saveCoordinatesToGeocache(coords);
            }
        } else {
            // Sinon, proposer de copier les coordonnées ou de les ouvrir dans une carte
            const action = prompt(
                "Que souhaitez-vous faire avec ces coordonnées?\n" +
                "1: Copier dans le presse-papier\n" +
                "2: Ouvrir dans Google Maps\n" +
                "3: Ouvrir dans OpenStreetMap",
                "1"
            );
            
            switch (action) {
                case "1":
                    navigator.clipboard.writeText(coords.ddm)
                        .then(() => alert("Coordonnées copiées dans le presse-papier"))
                        .catch(err => alert("Erreur lors de la copie: " + err));
                    break;
                case "2":
                    // Extraire les valeurs numériques pour Google Maps
                    this.openInGoogleMaps(coords);
                    break;
                case "3":
                    // Extraire les valeurs numériques pour OpenStreetMap
                    this.openInOpenStreetMap(coords);
                    break;
                default:
                    alert("Action annulée ou non reconnue.");
            }
        }
    }

    // Appliquer des coordonnées saisies manuellement et les afficher sur la carte
    applyManualCoordinates(event) {
        event.preventDefault();
        try {
            // Récupérer le conteneur le plus proche du bouton cliqué
            const container = event.currentTarget.closest('[data-coords-container]') || document.getElementById('metasolver-result-content');
            if (!container) {
                alert("Impossible de trouver la zone de coordonnées à appliquer.");
                return;
            }
            // Récupérer les champs dans ce conteneur
            const ddmFullInput = container.querySelector('[data-coords-input="ddm"]');
            const latInput = container.querySelector('[data-coords-input="lat"]');
            const lonInput = container.querySelector('[data-coords-input="lon"]');
            const ddmFull = ddmFullInput ? ddmFullInput.value.trim() : '';
            const latStr = latInput ? latInput.value.trim() : '';
            const lonStr = lonInput ? lonInput.value.trim() : '';

            // Helpers de parsing DDM → décimal
            const parseDDM = (str, isLat) => {
                if (!str) return null;
                // Exemples acceptés: N 48° 41.823' | N48°41.823' | N48°41.823 | 48.69705
                const ddmMatch = str.match(/([NSWE])?\s*0*([0-9]{1,3})[°º]?\s*([0-9]{1,2})[\.\,]?(\d{1,6})?\'?/i);
                if (ddmMatch) {
                    const dir = (ddmMatch[1] || '').toUpperCase();
                    const deg = parseInt(ddmMatch[2], 10);
                    const min = parseInt(ddmMatch[3], 10);
                    const dec = ddmMatch[4] || '0';
                    const minutes = parseFloat(`${min}.${dec}`);
                    let value = deg + (minutes / 60);
                    if (dir === 'S' || dir === 'W') value = -value;
                    return value;
                }
                // Tentative décimale directe
                const num = parseFloat(str.replace(',', '.'));
                return isNaN(num) ? null : num;
            };

            // Regex de validation DDM (mêmes principes que dans multi_solver)
            const ddmFullRegex = /([NS])\s*(\d{1,2})[°\s]*(\d{1,2}\.\d+)["']?\s*([EW])\s*(\d{1,3})[°\s]*(\d{1,2}\.\d+)["']?/i;
            const ddmLatRegex = /([NS])\s*(\d{1,2})[°\s]*(\d{1,2}\.\d+)["']?/i;
            const ddmLonRegex = /([EW])\s*(\d{1,3})[°\s]*(\d{1,2}\.\d+)["']?/i;

            // Utilitaires de formatage décimal → DDM normalisé
            const toDdmPart = (value, isLat) => {
                const dir = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
                const abs = Math.abs(value);
                const deg = Math.floor(abs);
                const min = (abs - deg) * 60;
                return `${dir} ${deg}° ${min.toFixed(3)}`;
            };

            let lat = null, lon = null;

            if (ddmFull) {
                // Essayer de valider et extraire depuis DDM complet
                const m = ddmFull.match(ddmFullRegex);
                if (m) {
                    const dirLat = m[1].toUpperCase();
                    const degLat = parseInt(m[2], 10);
                    const minLat = parseFloat(m[3]);
                    const dirLon = m[4].toUpperCase();
                    const degLon = parseInt(m[5], 10);
                    const minLon = parseFloat(m[6]);
                    lat = degLat + (minLat / 60);
                    lon = degLon + (minLon / 60);
                    if (dirLat === 'S') lat = -lat;
                    if (dirLon === 'W') lon = -lon;
                } else {
                    // Fallback: utiliser lat/lon champs si fournis
                    const latOk = ddmLatRegex.test(latStr) || !isNaN(parseFloat(latStr.replace(',', '.')));
                    const lonOk = ddmLonRegex.test(lonStr) || !isNaN(parseFloat(lonStr.replace(',', '.')));
                    if (!latOk || !lonOk) {
                        alert("Format de coordonnées invalide. Utilisez DDM (ex: N 48° 32.296' E 6° 40.636') ou décimal (ex: 48.538267, 6.677267).");
                        return;
                    }
                }
            }

            if (lat === null || lon === null) {
                // Tenter à partir de lat/lon séparés
                if (ddmLatRegex.test(latStr) && ddmLonRegex.test(lonStr)) {
                    // DDM séparés
                    const lm = latStr.match(ddmLatRegex);
                    const lom = lonStr.match(ddmLonRegex);
                    const dirLat = lm[1].toUpperCase();
                    const degLat = parseInt(lm[2], 10);
                    const minLat = parseFloat(lm[3]);
                    const dirLon = lom[1].toUpperCase();
                    const degLon = parseInt(lom[2], 10);
                    const minLon = parseFloat(lom[3]);
                    lat = degLat + (minLat / 60);
                    lon = degLon + (minLon / 60);
                    if (dirLat === 'S') lat = -lat;
                    if (dirLon === 'W') lon = -lon;
                } else {
                    // Essayer décimal
                    const latNum = parseFloat(latStr.replace(',', '.'));
                    const lonNum = parseFloat(lonStr.replace(',', '.'));
                    if (!isNaN(latNum) && !isNaN(lonNum)) {
                        lat = latNum; lon = lonNum;
                    } else {
                        alert("Format de coordonnées invalide. Utilisez DDM (ex: N 48° 32.296' / E 6° 40.636') ou décimal (ex: 48.538267 / 6.677267).");
                        return;
                    }
                }
            }

            if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
                alert("Coordonnées invalides. Veuillez saisir un format DDM (ex: N 48° 32.296') ou décimal (ex: 48.538267).");
                return;
            }

            // Mettre à jour le stockage interne (format générique)
            this.lastDetectedCoordinatesValue = {
                latitude: lat,
                longitude: lon,
                decimal: { latitude: lat, longitude: lon }
            };

            // Mettre à jour les champs DDM normalisés pour lat/lon et le champ DDM combiné
            const ddmLatNorm = toDdmPart(lat, true);
            const ddmLonNorm = toDdmPart(lon, false);
            if (latInput) latInput.value = ddmLatNorm;
            if (lonInput) lonInput.value = ddmLonNorm;
            if (ddmFullInput) ddmFullInput.value = `${ddmLatNorm} ${ddmLonNorm}`;

            // Dispatche vers la carte (point unique)
            document.dispatchEvent(new CustomEvent('addCalculatedPointToMap', {
                detail: {
                    latitude: lat,
                    longitude: lon,
                    label: 'Coordonnée corrigée',
                    color: 'rgba(255, 0, 0, 0.8)'
                }
            }));

            // Feedback utilisateur
            const resultElement = container;
            if (resultElement) {
                const notificationDiv = document.createElement('div');
                notificationDiv.className = 'mt-2 text-sm text-green-500 map-point-notification';
                notificationDiv.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Point affiché sur la carte (coordonnées corrigées)';
                // Nettoyer anciennes notifications
                resultElement.querySelectorAll('.map-point-notification').forEach(el => el.remove());
                resultElement.appendChild(notificationDiv);
            }
        } catch (e) {
            console.error('applyManualCoordinates error:', e);
            alert('Erreur lors de l\'application des coordonnées corrigées.');
        }
    }
    
    // Méthode pour sauvegarder les coordonnées dans une géocache
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
                alert("Coordonnées enregistrées avec succès!");
                // Déclencher un événement pour mettre à jour l'affichage des coordonnées
                document.dispatchEvent(new CustomEvent('coordinatesUpdated'));
            } else {
                const error = await response.json();
                alert(`Erreur lors de l'enregistrement des coordonnées: ${error.message || 'Erreur inconnue'}`);
            }
        } catch (error) {
            console.error("Erreur lors de l'enregistrement des coordonnées:", error);
            alert(`Erreur lors de l'enregistrement des coordonnées: ${error.message || 'Erreur inconnue'}`);
        }
    }
    
    // Méthode pour ouvrir les coordonnées dans Google Maps
    openInGoogleMaps(coords) {
        // Extraire les valeurs numériques des coordonnées
        const lat = this.extractNumericCoordinate(coords.ddm_lat);
        const lon = this.extractNumericCoordinate(coords.ddm_lon);
        
        if (lat && lon) {
            const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
            window.open(url, '_blank');
        } else {
            alert("Impossible d'extraire les valeurs numériques des coordonnées.");
        }
    }
    
    // Méthode pour ouvrir les coordonnées dans OpenStreetMap
    openInOpenStreetMap(coords) {
        // Extraire les valeurs numériques des coordonnées
        const lat = this.extractNumericCoordinate(coords.ddm_lat);
        const lon = this.extractNumericCoordinate(coords.ddm_lon);
        
        if (lat && lon) {
            const url = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=15`;
            window.open(url, '_blank');
        } else {
            alert("Impossible d'extraire les valeurs numériques des coordonnées.");
        }
    }
    
    // Méthode pour extraire les valeurs numériques des coordonnées
    extractNumericCoordinate(coordStr) {
        try {
            // Format attendu: "N 48° 32.296'" ou "E 6° 40.636'"
            const direction = coordStr.charAt(0);
            const parts = coordStr.substring(1).trim().split('°');
            
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
            console.error("Erreur lors de l'extraction des coordonnées numériques:", error);
            return null;
        }
    }

    // Méthode pour créer automatiquement un waypoint avec les coordonnées détectées
    createWaypointAuto(coordinates = null) {
        // Récupérer l'ID de la géocache
        const geocacheId = this.geocacheIdValue;
        if (!geocacheId) {
            this.showNotification('ID de géocache manquant', 'error');
            return;
        }
        
        // Variables pour stocker les coordonnées
        let gcLat, gcLon;
        
        // Si des coordonnées spécifiques sont fournies, les utiliser
        if (coordinates && coordinates.latitude && coordinates.longitude) {
            console.log(`Utilisation des coordonnées décimales fournies: ${coordinates.latitude}, ${coordinates.longitude}`);
            
            // Convertir les coordonnées décimales en format standard
            const latDegrees = Math.floor(Math.abs(coordinates.latitude));
            const latMinutes = (Math.abs(coordinates.latitude) - latDegrees) * 60;
            const lonDegrees = Math.floor(Math.abs(coordinates.longitude));
            const lonMinutes = (Math.abs(coordinates.longitude) - lonDegrees) * 60;
            
            const latDir = coordinates.latitude >= 0 ? 'N' : 'S';
            const lonDir = coordinates.longitude >= 0 ? 'E' : 'W';
            
            gcLat = `${latDir} ${latDegrees}° ${latMinutes.toFixed(3)}'`;
            gcLon = `${lonDir} ${lonDegrees}° ${lonMinutes.toFixed(3)}'`;
            coordinates = `${gcLat} ${gcLon}`;
        } else {
            // Sinon, chercher les coordonnées dans le DOM (résultat du plugin)
            console.log("Recherche des coordonnées dans les résultats de plugin...");
            
            // Chercher dans tous les conteneurs de résultats de plugin
            const coordElements = document.querySelectorAll('.coordinates-container, [data-coordinates]');
            
            if (coordElements.length > 0) {
                for (const el of coordElements) {
                    const coordText = el.getAttribute('data-coordinates') || el.textContent;
                    if (coordText) {
                        coordinates = coordText.trim();
                        break;
                    }
                }
            }
            
            // Si toujours pas de coordonnées, essayer de les extraire des classes map-point-notification
            if (!coordinates) {
                // S'il y a une notification d'affichage de point sur la carte, 
                // on peut supposer que des coordonnées existent
                const mapNotif = document.querySelector('.map-point-notification');
                if (mapNotif) {
                    // Récupérer le dernier événement addCalculatedPointToMap
                    const mapEvent = document.createEvent('CustomEvent');
                    if (mapEvent && mapEvent.detail) {
                        const detail = mapEvent.detail;
                        if (detail.latitude && detail.longitude) {
                            // Convertir les coordonnées décimales en format standard
                            const latDegrees = Math.floor(Math.abs(detail.latitude));
                            const latMinutes = (Math.abs(detail.latitude) - latDegrees) * 60;
                            const lonDegrees = Math.floor(Math.abs(detail.longitude));
                            const lonMinutes = (Math.abs(detail.longitude) - lonDegrees) * 60;
                            
                            const latDir = detail.latitude >= 0 ? 'N' : 'S';
                            const lonDir = detail.longitude >= 0 ? 'E' : 'W';
                            
                            gcLat = `${latDir} ${latDegrees}° ${latMinutes.toFixed(3)}'`;
                            gcLon = `${lonDir} ${lonDegrees}° ${lonMinutes.toFixed(3)}'`;
                            coordinates = `${gcLat} ${gcLon}`;
                        }
                    }
                }
            }
        }
        
        // Vérifier qu'on a bien des coordonnées
        if (!coordinates) {
            this.showNotification('Aucune coordonnée disponible', 'error');
            return;
        }
        
        console.log(`Coordonnées pour création de waypoint: ${coordinates}`);
        
        // Si nous n'avons pas encore extrait les parties latitude/longitude, le faire maintenant
        if (!gcLat || !gcLon) {
            const regex = /([NS][\s]*\d+°[\s]*\d+\.\d+)[\s]*([EW][\s]*\d+°[\s]*\d+\.\d+)/;
            const match = coordinates.match(regex);
            
            if (!match || match.length < 3) {
                this.showNotification('Format de coordonnées non reconnu', 'error');
                return;
            }
            
            gcLat = match[1].trim();
            gcLon = match[2].trim();
        }
        
        // Générer un nom de waypoint par défaut basé sur le plugin utilisé
        let waypointName = "Point détecté";
        let pluginName = "Geocache Solver";
        
        // Chercher le nom du dernier plugin utilisé
        if (this.pluginsHistoryValue && this.pluginsHistoryValue.length > 0) {
            const lastPlugin = this.pluginsHistoryValue[this.pluginsHistoryValue.length - 1];
            if (lastPlugin && lastPlugin.pluginName) {
                pluginName = lastPlugin.pluginName;
                waypointName = `Point ${pluginName}`;
            }
        }
        
        // Préparer la note
        let note = `Point détecté automatiquement avec le plugin ${pluginName}.\nCoordonnées: ${coordinates}`;
        
        // Préparer les données pour la création du waypoint
        const waypointData = {
            geocache_id: geocacheId,
            name: waypointName,
            prefix: "GS", // Geocache Solver
            gc_lat: gcLat,
            gc_lon: gcLon,
            note: note
        };
        
        // Afficher l'indicateur de chargement
        const createWPBtn = document.getElementById('create-wp-auto-btn');
        if (createWPBtn) {
            this.showCreateWaypointAutoLoading('Création...', createWPBtn);
        } else {
            this.showNotification('Création du waypoint en cours...', 'info');
        }
        
        // Appeler l'API pour créer le waypoint
        fetch(`/api/geocaches/${geocacheId}/waypoints`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(waypointData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            // Vérifier d'abord le type de contenu pour savoir si on attend du JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            } else {
                // Si ce n'est pas du JSON, traiter comme du texte
                return response.text().then(text => {
                    // Si la réponse est vide ou non-JSON, créer un objet factice avec les données essentielles
                    console.log("Réponse non-JSON reçue:", text);
                    return {
                        id: new Date().getTime(), // ID temporaire unique
                        name: waypointName,
                        prefix: "GS",
                        gc_lat: gcLat,
                        gc_lon: gcLon,
                        // Convertir les coordonnées GC en latitude/longitude
                        latitude: this.convertGCToDecimal(gcLat, "lat"),
                        longitude: this.convertGCToDecimal(gcLon, "lon"),
                        note: note,
                        _success: true // Marqueur indiquant que l'opération a réussi malgré la réponse non-JSON
                    };
                });
            }
        })
        .then(data => {
            // Vérifier si on a une structure de données valide
            if (data && (data.id || data._success)) {
                console.log("Waypoint créé avec succès:", data);
                
                if (createWPBtn) {
                    this.showCreateWaypointAutoSuccess(createWPBtn);
                } else {
                    this.showNotification(`Waypoint "${waypointName}" créé avec succès!`, 'success');
                }
                
                // Annoncer la création du waypoint pour mettre à jour la carte
                const event = new CustomEvent('waypointSaved', {
                    detail: {
                        waypoint: data,
                        geocacheId: geocacheId,
                        isNew: true
                    },
                    bubbles: true
                });
                document.dispatchEvent(event);
                
                // Mettre à jour la liste des waypoints dans l'interface
                this.updateWaypointsList(geocacheId);
            } else {
                throw new Error("Structure de données invalide ou incomplète");
            }
        })
        .catch(error => {
            console.error("Erreur lors de la création du waypoint:", error);
            
            if (createWPBtn) {
                this.showCreateWaypointAutoError(error.message || "Erreur", createWPBtn);
            } else {
                this.showNotification(`Erreur lors de la création du waypoint: ${error.message || "Erreur inconnue"}`, 'error');
            }
        });
    }
    
    // Méthode pour mettre à jour la liste des waypoints
    async updateWaypointsList(geocacheId) {
        try {
            console.log("Mise à jour de la liste des waypoints...");
            
            // Trouver tous les conteneurs de liste de waypoints dans tous les onglets ouverts
            const waypointsListContainers = document.querySelectorAll('[data-waypoint-form-target="waypointsList"]');
            
            if (waypointsListContainers.length === 0) {
                console.warn("Aucun conteneur de liste de waypoints trouvé dans l'interface");
                return;
            }
            
            console.log(`Trouvé ${waypointsListContainers.length} conteneur(s) de liste de waypoints`);
            
            // Récupérer la liste mise à jour des waypoints
            const listResponse = await fetch(`/api/geocaches/${geocacheId}/waypoints/list`);
            
            if (listResponse.ok) {
                const listHtml = await listResponse.text();
                
                // Mettre à jour tous les conteneurs trouvés
                waypointsListContainers.forEach((container, index) => {
                    container.innerHTML = listHtml;
                    console.log(`Liste des waypoints #${index+1} mise à jour avec succès`);
                });
                
                // Déclencher un événement pour informer que les waypoints ont été mis à jour
                document.dispatchEvent(new CustomEvent('waypointsListUpdated', {
                    detail: { geocacheId: geocacheId }
                }));
            } else {
                console.warn(`Échec de la récupération de la liste des waypoints: ${listResponse.status} ${listResponse.statusText}`);
                
                // Tentative alternative: recharger la section complète de waypoints
                const fullListResponse = await fetch(`/geocaches/${geocacheId}/details-panel`);
                if (fullListResponse.ok) {
                    const fullHtml = await fullListResponse.text();
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = fullHtml;
                    
                    const newWaypointList = tempDiv.querySelector('#waypoints-list-container');
                    if (newWaypointList) {
                        waypointsListContainers.forEach((container, index) => {
                            container.innerHTML = newWaypointList.innerHTML;
                            console.log(`Liste des waypoints #${index+1} récupérée à partir des détails complets`);
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Erreur lors de la mise à jour de la liste des waypoints:", error);
        }
    }
    
    // Méthode utilitaire pour convertir les coordonnées GC en coordonnées décimales
    convertGCToDecimal(coordStr, type) {
        try {
            if (type === "lat") {
                // Format N/S DD° MM.MMM
                const match = coordStr.match(/([NS])\s*(\d+)°\s*(\d+\.\d+)/);
                if (match) {
                    const direction = match[1];
                    const degrees = parseInt(match[2]);
                    const minutes = parseFloat(match[3]);
                    let decimal = degrees + (minutes / 60);
                    if (direction === 'S') decimal = -decimal;
                    return decimal;
                }
            } else if (type === "lon") {
                // Format E/W DDD° MM.MMM
                const match = coordStr.match(/([EW])\s*(\d+)°\s*(\d+\.\d+)/);
                if (match) {
                    const direction = match[1];
                    const degrees = parseInt(match[2]);
                    const minutes = parseFloat(match[3]);
                    let decimal = degrees + (minutes / 60);
                    if (direction === 'W') decimal = -decimal;
                    return decimal;
                }
            }
            // En cas d'échec de parsing, retourner 0
            return 0;
        } catch (error) {
            console.error("Erreur de conversion des coordonnées:", error);
            return 0;
        }
    }
    
    // Afficher l'état de chargement du bouton "Créer WP auto"
    showCreateWaypointAutoLoading(buttonText, button) {
        // Sauvegarder le contenu original du bouton
        button._originalHTML = button.innerHTML;
        
        // Mettre à jour le bouton avec l'animation de chargement
        button.innerHTML = `
            <svg class="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span>${buttonText}</span>
        `;
        button.disabled = true;
        button.classList.add("opacity-75");
    }
    
    // Afficher l'état de succès du bouton "Créer WP auto"
    showCreateWaypointAutoSuccess(button) {
        // Changer temporairement le texte du bouton pour indiquer le succès
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>WP créé!</span>
        `;
        button.disabled = false;
        button.classList.remove("opacity-75");
        button.classList.remove("bg-blue-600", "hover:bg-blue-700");
        button.classList.add("bg-green-600", "hover:bg-green-700");
        
        // Rétablir le bouton après un délai
        setTimeout(() => {
            button.innerHTML = button._originalHTML;
            button.classList.remove("bg-green-600", "hover:bg-green-700");
            button.classList.add("bg-blue-600", "hover:bg-blue-700");
        }, 3000);
    }
    
    // Afficher l'état d'erreur du bouton "Créer WP auto"
    showCreateWaypointAutoError(message, button) {
        // Sauvegarder le contenu original du bouton
        const originalButtonHTML = button._originalHTML || button.innerHTML;
        
        // Mettre à jour le bouton avec un message d'erreur
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>${message}</span>
        `;
        button.classList.remove("bg-blue-600", "hover:bg-blue-700");
        button.classList.add("bg-red-600", "hover:bg-red-700");
        
        // Rétablir le bouton après un délai
        setTimeout(() => {
            button.innerHTML = originalButtonHTML;
            button.classList.remove("bg-red-600", "hover:bg-red-700");
            button.classList.add("bg-blue-600", "hover:bg-blue-700");
        }, 3000);
    }
    
    // Afficher une notification générale
    showNotification(message, type = 'info') {
        // Créer l'élément de notification
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-500 translate-y-0 z-50';

        // Définir les styles en fonction du type
        switch (type) {
            case 'success':
                notification.classList.add('bg-green-600', 'text-white');
                break;
            case 'error':
                notification.classList.add('bg-red-600', 'text-white');
                break;
            case 'warning':
                notification.classList.add('bg-yellow-500', 'text-gray-900');
                break;
            default: // info
                notification.classList.add('bg-blue-600', 'text-white');
                break;
        }

        // Définir le contenu de la notification
        notification.innerHTML = message;

        // Ajouter la notification au document
        document.body.appendChild(notification);

        // Supprimer la notification après un délai
        setTimeout(() => {
            notification.classList.add('opacity-0', 'translate-y-10');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 5000);
    }
    
    // Ajouter les coordonnées détectées comme waypoint (ouverture du formulaire)
    addAsWaypoint(coordinates = null) {
        // Récupérer l'ID de la géocache
        const geocacheId = this.geocacheIdValue;
        if (!geocacheId) {
            this.showNotification('ID de géocache non disponible', 'error');
            return;
        }
        
        // Vérifier si des coordonnées sont fournies
        if (!coordinates && typeof coordinates !== 'object') {
            // Si des coordonnées ne sont pas explicitement fournies, chercher à partir du contexte actuel
            // (Cette partie est différente du Formula Solver car la structure est différente)
            
            // Chercher dans les éléments HTML qui pourraient contenir des coordonnées DDM
            const coordElements = document.querySelectorAll('.coordinates-container, [data-coordinates]');
            for (const el of coordElements) {
                const coordText = el.getAttribute('data-coordinates') || el.textContent;
                if (coordText) {
                    coordinates = coordText.trim();
                    break;
                }
            }
            
            // Si toujours pas de coordonnées, chercher si un point est affiché sur la carte
            if (!coordinates) {
                const mapNotif = document.querySelector('.map-point-notification');
                if (mapNotif) {
                    // Utiliser les coordonnées du dernier événement addCalculatedPointToMap si disponible
                    // (Ceci est différent du Formula Solver, adapté à notre contexte)
                    const lastCoords = this.lastDetectedCoordinatesValue;
                    if (lastCoords && lastCoords.latitude !== undefined && lastCoords.longitude !== undefined) {
                        coordinates = {
                            latitude: lastCoords.latitude,
                            longitude: lastCoords.longitude
                        };
                    }
                }
            }
        }
        
        // Vérifier si nous avons des coordonnées à utiliser
        if (!coordinates) {
            this.showNotification('Aucune coordonnée détectée disponible', 'error');
            return;
        }
        
        console.log(`Ajout d'un waypoint avec coordonnées:`, coordinates);
        
        // Variables pour stocker les coordonnées au format GC
        let gcLat, gcLon;
        
        // Traiter le cas où coordinates est un objet avec latitude/longitude (coordonnées décimales)
        if (typeof coordinates === 'object' && coordinates.latitude !== undefined && coordinates.longitude !== undefined) {
            console.log("Conversion des coordonnées décimales en format standard");
            // Convertir les coordonnées décimales en format standard
            const latDegrees = Math.floor(Math.abs(coordinates.latitude));
            const latMinutes = (Math.abs(coordinates.latitude) - latDegrees) * 60;
            const lonDegrees = Math.floor(Math.abs(coordinates.longitude));
            const lonMinutes = (Math.abs(coordinates.longitude) - lonDegrees) * 60;
            
            const latDir = coordinates.latitude >= 0 ? 'N' : 'S';
            const lonDir = coordinates.longitude >= 0 ? 'E' : 'W';
            
            gcLat = `${latDir} ${latDegrees}° ${latMinutes.toFixed(3)}'`;
            gcLon = `${lonDir} ${lonDegrees}° ${lonMinutes.toFixed(3)}'`;
            
            coordinates = `${gcLat} ${gcLon}`;
        } 
        // Traiter le cas où coordinates est une chaîne (format DDM)
        else if (typeof coordinates === 'string') {
            console.log("Utilisation des coordonnées au format texte:", coordinates);
            // Extraire les coordonnées au format standard
            const coordParts = coordinates.match(/([NS][^EW]+)([EW].+)/);
            if (coordParts && coordParts.length >= 3) {
                gcLat = coordParts[1].trim();
                gcLon = coordParts[2].trim();
            } else {
                // Tentative alternative avec un autre format
                const parts = coordinates.split(' ');
                if (parts.length >= 2) {
                    // Supposer que le premier élément est la latitude et le second la longitude
                    gcLat = parts[0].trim();
                    gcLon = parts[1].trim();
                }
            }
        }
        
        // Vérifier si nous avons bien obtenu les coordonnées au format GC
        if (!gcLat || !gcLon) {
            this.showNotification('Format de coordonnées non reconnu', 'error');
            return;
        }
        
        // Trouver le panneau de détails de la géocache et le formulaire de waypoint
        let waypointForm = document.querySelector('[data-controller="waypoint-form"]');
        
        if (!waypointForm) {
            console.error("Panneau de détails de la géocache ou formulaire de waypoint non trouvé");
            
            // Proposer d'ouvrir automatiquement les détails de la géocache
            const shouldOpenDetails = confirm(
                'Le panneau des détails de la géocache n\'est pas ouvert.\n\n' +
                'Pour ajouter un waypoint, vous devez ouvrir l\'onglet des détails de la géocache.\n\n' +
                'Souhaitez-vous ouvrir l\'onglet des détails de la géocache maintenant?'
            );
            
            if (shouldOpenDetails && window.openGeocacheDetailsTab) {
                // Tenter d'ouvrir l'onglet des détails de la géocache
                window.openGeocacheDetailsTab(geocacheId);
                
                // Afficher un message informant l'utilisateur de réessayer après l'ouverture
                setTimeout(() => {
                    alert('L\'onglet des détails de la géocache est en cours d\'ouverture.\nVeuillez réessayer d\'ajouter le waypoint dans quelques secondes.');
                }, 500);
            }
            
            return;
        }
        
        // Générer un nom de waypoint par défaut
        let waypointName = "Point détecté";
        let pluginName = "Geocache Solver";
        
        // Utiliser le nom du dernier plugin exécuté s'il est disponible
        if (this.pluginsHistoryValue && this.pluginsHistoryValue.length > 0) {
            const lastPlugin = this.pluginsHistoryValue[this.pluginsHistoryValue.length - 1];
            if (lastPlugin && lastPlugin.pluginName) {
                pluginName = lastPlugin.pluginName;
                waypointName = `Point ${pluginName}`;
            }
        }
        
        // Préparer les notes avec les informations disponibles
        let notes = `Point détecté avec le plugin ${pluginName}.\nCoordonnées: ${coordinates}`;
        
        // Récupérer les éléments du formulaire
        const prefixInput = waypointForm.querySelector('[data-waypoint-form-target="prefixInput"]');
        const nameInput = waypointForm.querySelector('[data-waypoint-form-target="nameInput"]');
        const gcLatInput = waypointForm.querySelector('[data-waypoint-form-target="gcLatInput"]');
        const gcLonInput = waypointForm.querySelector('[data-waypoint-form-target="gcLonInput"]');
        const noteInput = waypointForm.querySelector('[data-waypoint-form-target="noteInput"]');
        const formToggleButton = waypointForm.querySelector('[data-action="click->waypoint-form#toggleForm"]');
        const form = waypointForm.querySelector('[data-waypoint-form-target="form"]');
        
        // Afficher un message de succès pour le bouton "Ajouter WP"
        const addWpBtn = document.getElementById('add-wp-btn');
        if (addWpBtn) {
            this.showAddWaypointSuccess(addWpBtn);
        } else {
            this.showNotification('Formulaire de waypoint ouvert', 'success');
        }
        
        // Vérifier si le formulaire est actuellement caché et l'afficher si nécessaire
        if (form && form.classList.contains('hidden') && formToggleButton) {
            formToggleButton.click();
        }
        
        // Remplir le formulaire avec les données calculées
        if (prefixInput) prefixInput.value = "GS"; // Geocache Solver
        if (nameInput) nameInput.value = waypointName;
        if (gcLatInput && gcLat) gcLatInput.value = gcLat;
        if (gcLonInput && gcLon) gcLonInput.value = gcLon;
        if (noteInput) noteInput.value = notes;
        
        // Faire défiler jusqu'au formulaire pour que l'utilisateur puisse le voir
        if (form) {
            form.scrollIntoView({behavior: 'smooth', block: 'center'});
        }
    }
    
    showAddWaypointSuccess(button) {
        // Sauvegarder le contenu original du bouton
        button._originalHTML = button.innerHTML;
        
        // Changer temporairement le texte du bouton pour indiquer le succès
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Waypoint créé!</span>
        `;
        button.classList.remove("bg-green-600", "hover:bg-green-700");
        button.classList.add("bg-teal-600", "hover:bg-teal-700");
        
        // Rétablir le bouton après un délai
        setTimeout(() => {
            button.innerHTML = button._originalHTML;
            button.classList.remove("bg-teal-600", "hover:bg-teal-700");
            button.classList.add("bg-green-600", "hover:bg-green-700");
        }, 2000);
    }
    
    showAddWaypointError(message, button) {
        console.error('Erreur lors de l\'ajout du waypoint:', message);
        
        // Sauvegarder le contenu original du bouton
        button._originalHTML = button.innerHTML;
        
        // Déterminer le message à afficher
        let displayMessage = "Erreur";
        if (message) {
            displayMessage = message;
        }
        
        // Mettre à jour le bouton avec un message d'erreur
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>${displayMessage}</span>
        `;
        button.classList.remove("bg-green-600", "hover:bg-green-700");
        button.classList.add("bg-red-600", "hover:bg-red-700");
        
        // Rétablir le bouton après un délai
        setTimeout(() => {
            button.innerHTML = button._originalHTML;
            button.classList.remove("bg-red-600", "hover:bg-red-700");
            button.classList.add("bg-green-600", "hover:bg-green-700");
        }, 3000); // Augmenter le délai pour donner à l'utilisateur plus de temps pour lire le message
    }
    
    // Copier les coordonnées GPS détectées dans le presse-papier
    copyCoordinates(coordinates) {
        try {
            // Récupérer le format DDM des coordonnées
            let coordText = "";
            
            // Si c'est un objet avec latitude/longitude (coordonnées décimales)
            if (typeof coordinates === 'object' && coordinates.latitude !== undefined && coordinates.longitude !== undefined) {
                // Convertir en format DDM
                const latDegrees = Math.floor(Math.abs(coordinates.latitude));
                const latMinutes = (Math.abs(coordinates.latitude) - latDegrees) * 60;
                const lonDegrees = Math.floor(Math.abs(coordinates.longitude));
                const lonMinutes = (Math.abs(coordinates.longitude) - lonDegrees) * 60;
                
                const latDir = coordinates.latitude >= 0 ? 'N' : 'S';
                const lonDir = coordinates.longitude >= 0 ? 'E' : 'W';
                
                coordText = `${latDir} ${latDegrees}° ${latMinutes.toFixed(3)}' ${lonDir} ${lonDegrees}° ${lonMinutes.toFixed(3)}'`;
            } 
            // Si les coordonnées sont dans un format spécifique (chaîne avec attributs)
            else if (typeof coordinates === 'object' && coordinates.ddm) {
                coordText = coordinates.ddm;
            }
            // Si c'est une chaîne simple
            else if (typeof coordinates === 'string') {
                coordText = coordinates;
            }
            
            // Vérifier si nous avons des coordonnées à copier
            if (!coordText) {
                throw new Error("Format de coordonnées non reconnu");
            }
            
            // Copier dans le presse-papier
            navigator.clipboard.writeText(coordText)
                .then(() => {
                    // Afficher un message de succès
                    const copyBtn = document.getElementById('copy-coords-btn');
                    if (copyBtn) {
                        this.showCopySuccess(copyBtn);
                    } else {
                        this.showNotification('Coordonnées copiées!', 'success');
                    }
                })
                .catch(err => {
                    throw new Error(`Erreur lors de la copie: ${err.message}`);
                });
        } catch (error) {
            console.error('Erreur lors de la copie des coordonnées:', error);
            
            // Afficher un message d'erreur
            const copyBtn = document.getElementById('copy-coords-btn');
            if (copyBtn) {
                this.showCopyError(copyBtn, error.message);
            } else {
                this.showNotification(`Erreur: ${error.message}`, 'error');
            }
        }
    }
    
    // Affiche un message de succès sur le bouton de copie
    showCopySuccess(button) {
        // Sauvegarder le contenu original du bouton
        button._originalHTML = button.innerHTML;
        
        // Changer temporairement le texte du bouton pour indiquer le succès
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Copié!</span>
        `;
        button.classList.remove("bg-purple-600", "hover:bg-purple-700");
        button.classList.add("bg-green-600", "hover:bg-green-700");
        
        // Rétablir le bouton après un délai
        setTimeout(() => {
            button.innerHTML = button._originalHTML;
            button.classList.remove("bg-green-600", "hover:bg-green-700");
            button.classList.add("bg-purple-600", "hover:bg-purple-700");
        }, 2000);
    }
    
    // Affiche un message d'erreur sur le bouton de copie
    showCopyError(button, message = "Erreur") {
        // Sauvegarder le contenu original du bouton
        button._originalHTML = button.innerHTML;
        
        // Mettre à jour le bouton avec un message d'erreur
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Erreur</span>
        `;
        button.classList.remove("bg-purple-600", "hover:bg-purple-700");
        button.classList.add("bg-red-600", "hover:bg-red-700");
        
        // Rétablir le bouton après un délai
        setTimeout(() => {
            button.innerHTML = button._originalHTML;
            button.classList.remove("bg-red-600", "hover:bg-red-700");
            button.classList.add("bg-purple-600", "hover:bg-purple-700");
        }, 3000);
    }
    
    // Mettre à jour les coordonnées de la géocache
    saveGeocacheCoordinates(coordinates) {
        // Vérifier si on a un ID de géocache
        const geocacheId = this.geocacheIdValue;
        if (!geocacheId) {
            this.showSaveCoordinatesError("ID de géocache manquant");
            return;
        }
        
        // Variables pour stocker les coordonnées à envoyer
        let gcLat, gcLon;
        
        // Si c'est un objet avec latitude/longitude (coordonnées décimales)
        if (typeof coordinates === 'object' && coordinates.latitude !== undefined && coordinates.longitude !== undefined) {
            console.log(`Conversion des coordonnées décimales: ${coordinates.latitude}, ${coordinates.longitude}`);
            
            // Calculer les degrés et minutes
            const latDegrees = Math.floor(Math.abs(coordinates.latitude));
            const latMinutes = (Math.abs(coordinates.latitude) - latDegrees) * 60;
            const lonDegrees = Math.floor(Math.abs(coordinates.longitude));
            const lonMinutes = (Math.abs(coordinates.longitude) - lonDegrees) * 60;
            
            // Formater les coordonnées au format standard GC
            const latDir = coordinates.latitude >= 0 ? 'N' : 'S';
            const lonDir = coordinates.longitude >= 0 ? 'E' : 'W';
            
            gcLat = `${latDir} ${latDegrees}° ${latMinutes.toFixed(3)}'`;
            gcLon = `${lonDir} ${lonDegrees}° ${lonMinutes.toFixed(3)}'`;
            
            console.log(`Coordonnées converties: ${gcLat} ${gcLon}`);
        }
        // Si les coordonnées sont dans un format spécifique (chaîne avec attributs)
        else if (typeof coordinates === 'object' && coordinates.ddm_lat && coordinates.ddm_lon) {
            gcLat = coordinates.ddm_lat;
            gcLon = coordinates.ddm_lon;
        }
        // Si c'est une chaîne simple
        else if (typeof coordinates === 'string') {
            // Extraire les coordonnées au format N/E
            const regex = /([NS][\s]*\d+°[\s]*\d+\.\d+)[\s]*([EW][\s]*\d+°[\s]*\d+\.\d+)/;
            const match = coordinates.match(regex);
            
            if (match && match.length >= 3) {
                gcLat = match[1].trim();
                gcLon = match[2].trim();
            }
        }
        
        // Vérification finale que nous avons bien des coordonnées à envoyer
        if (!gcLat || !gcLon) {
            this.showSaveCoordinatesError("Format de coordonnées non valide");
            return;
        }
        
        // Préparer les données à envoyer
        const formData = new FormData();
        formData.append('gc_lat', gcLat);
        formData.append('gc_lon', gcLon);
        
        // Afficher l'état de chargement
        this.showSaveCoordinatesLoading();
        
        // Appel à l'API pour sauvegarder les coordonnées
        fetch(`/geocaches/${geocacheId}/coordinates`, {
            method: 'PUT',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            console.log("Coordonnées mises à jour avec succès");
            this.showSaveCoordinatesSuccess();
            
            // Vérifier si la page doit être rechargée pour afficher les coordonnées mises à jour
            if (html.includes('coordinatesUpdated')) {
                // Si on utilise HTMX, déclencher un événement personnalisé
                document.dispatchEvent(new CustomEvent('coordinatesUpdated'));
            }
        })
        .catch(error => {
            console.error("Erreur lors de la mise à jour des coordonnées:", error);
            this.showSaveCoordinatesError("Erreur de communication");
        });
    }
    
    // Affiche l'état de chargement pour la sauvegarde des coordonnées
    showSaveCoordinatesLoading() {
        const button = document.getElementById('update-coords-btn');
        if (!button) return;
        
        // Sauvegarder le contenu original du bouton
        button._originalHTML = button.innerHTML;
        
        // Mettre à jour le bouton avec une animation de chargement
        button.innerHTML = `
            <div class="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-1"></div>
            <span>Sauvegarde...</span>
        `;
        button.disabled = true;
    }
    
    // Affiche un message de succès pour la sauvegarde des coordonnées
    showSaveCoordinatesSuccess() {
        const button = document.getElementById('update-coords-btn');
        if (!button) return;
        
        // Mettre à jour le bouton avec un message de succès
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Sauvegardé!</span>
        `;
        button.classList.remove("bg-amber-600", "hover:bg-amber-700");
        button.classList.add("bg-green-600", "hover:bg-green-700");
        button.disabled = false;
        
        // Rétablir le bouton après un délai
        setTimeout(() => {
            button.innerHTML = button._originalHTML || `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <span>Mettre à jour coordonnées</span>
            `;
            button.classList.remove("bg-green-600", "hover:bg-green-700");
            button.classList.add("bg-amber-600", "hover:bg-amber-700");
        }, 3000);
    }
    
    // Affiche un message d'erreur pour la sauvegarde des coordonnées
    showSaveCoordinatesError(message) {
        const button = document.getElementById('update-coords-btn');
        if (!button) return;
        
        // Mettre à jour le bouton avec un message d'erreur
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>${message}</span>
        `;
        button.classList.remove("bg-amber-600", "hover:bg-amber-700");
        button.classList.add("bg-red-600", "hover:bg-red-700");
        button.disabled = false;
        
        // Rétablir le bouton après un délai
        setTimeout(() => {
            button.innerHTML = button._originalHTML || `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <span>Mettre à jour coordonnées</span>
            `;
            button.classList.remove("bg-red-600", "hover:bg-red-700");
            button.classList.add("bg-amber-600", "hover:bg-amber-700");
        }, 3000);
    }
}
