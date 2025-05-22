/**
 * Script d'intégration des plugins avec GoldenLayout et Stimulus
 */

// Variables de configuration globales pour GoldenLayout
let goldenLayoutConfig = {
    openTabsInSameSection: true // Valeur par défaut
};

// Fonction pour réinitialiser les contrôleurs Stimulus dans un conteneur GoldenLayout
function reinitializeStimulus(container) {
    console.log("Réinitialisation de Stimulus pour", container.getElement())
    
    // Récupérer l'élément du conteneur
    const element = container.getElement()
    
    // Déclencher un événement pour signaler que le contenu a été chargé
    element.dispatchEvent(new CustomEvent('golden-layout-content-loaded', {
        bubbles: true,
        detail: { container }
    }))
    
    // Timeout pour laisser le temps au DOM de se stabiliser avant la réinitialisation
    setTimeout(() => {
        // Réinitialiser Stimulus si disponible
        if (window.StimulusApp) {
            console.log("Redémarrage de StimulusApp pour", element)
            
            try {
                // Arrêter et redémarrer StimulusApp pour cet élément spécifique
                const controllerElements = element.querySelectorAll('[data-controller]')
                
                // Déconnecter explicitement les anciens contrôleurs s'ils existent
                if (window.StimulusApp.controllers) {
                    window.StimulusApp.controllers.forEach(controller => {
                        if (element.contains(controller.element)) {
                            console.log("Déconnexion du contrôleur", controller.context.identifier, controller.element)
                            controller.disconnect()
                        }
                    })
                }
                
                // Force à recréer les contrôleurs
                controllerElements.forEach(el => {
                    // Stocker temporairement les attributs data-controller et data-action
                    const controllerAttr = el.getAttribute('data-controller')
                    const actionAttrs = []
                    
                    // Récupérer tous les attributs data-action
                    Array.from(el.attributes).forEach(attr => {
                        if (attr.name.startsWith('data-action')) {
                            actionAttrs.push({ name: attr.name, value: attr.value })
                        }
                    })
                    
                    // Supprimer temporairement les attributs pour forcer la reconnexion
                    el.removeAttribute('data-controller')
                    actionAttrs.forEach(attr => el.removeAttribute(attr.name))
                    
                    // Re-ajouter les attributs après un court délai
                    setTimeout(() => {
                        el.setAttribute('data-controller', controllerAttr)
                        actionAttrs.forEach(attr => el.setAttribute(attr.name, attr.value))
                        
                        console.log("Contrôleur reconnecté:", controllerAttr, el)
                    }, 10)
                })
                
                // Redémarrer Stimulus
                window.StimulusApp.start()
            } catch (error) {
                console.error("Erreur lors de la réinitialisation de Stimulus:", error)
            }
            
            console.log("Stimulus réinitialisé pour", element)
        } else if (window.Stimulus && window.Stimulus.application) {
            // Ancienne version de compatibilité
            window.Stimulus.application.controllers.forEach(controller => {
                if (element.contains(controller.element)) {
                    controller.disconnect()
                }
            })
            
            window.Stimulus.application.start()
            console.log("Stimulus (ancienne version) réinitialisé pour", element)
        } else {
            console.warn("L'application Stimulus n'est pas disponible pour la réinitialisation")
        }
    }, 50)
}

// Ajouter une fonction pour attacher l'ID du conteneur à l'élément racine du plugin
function updateRootElementWithContainerId(container) {
    const rootElement = container.getElement().querySelector('.w-full.h-full');
    if (rootElement && container._config && container._config.id) {
        rootElement.dataset.containerGlId = container._config.id;
        console.log(`Élément racine mis à jour avec l'ID du conteneur: ${container._config.id}`);
    } else if (rootElement) {
        // Générer un ID si non disponible
        const newId = 'gl-container-' + Math.random().toString(36).substr(2, 9);
        container._config = container._config || {};
        container._config.id = newId;
        rootElement.dataset.containerGlId = newId;
        console.log(`ID généré pour le conteneur: ${newId}`);
    }
}

// Fonction pour charger les paramètres depuis le serveur au démarrage
function loadGoldenLayoutSettings() {
    console.log('=== DEBUG: Chargement des paramètres pour GoldenLayout ===');
    
    fetch('/api/settings/param/open_tabs_in_same_section')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('=== DEBUG: Paramètre open_tabs_in_same_section chargé ===', data);
            
            if (data.success) {
                // Mettre à jour la configuration
                goldenLayoutConfig.openTabsInSameSection = data.value !== undefined ? data.value : true;
                
                console.log('=== DEBUG: Configuration GoldenLayout mise à jour ===', goldenLayoutConfig);
            }
        })
        .catch(error => {
            console.error('Erreur lors du chargement des paramètres:', error);
        });
}

// Écouteur d'événements pour les changements de paramètres
document.addEventListener('goldenLayoutSettingChange', function(event) {
    console.log('=== DEBUG: Événement de changement de paramètre détecté ===', event.detail);
    
    if (event.detail && event.detail.setting === 'openTabsInSameSection') {
        goldenLayoutConfig.openTabsInSameSection = event.detail.value;
        console.log(`=== DEBUG: Paramètre openTabsInSameSection mis à jour: ${goldenLayoutConfig.openTabsInSameSection} ===`);
    }
});

// Enregistrer le composant plugin-interface dans GoldenLayout
function registerPluginInterfaceComponent(layout) {
    if (!layout) {
        console.error("GoldenLayout non disponible");
        return;
    }
    
    // Charger les paramètres au démarrage
    loadGoldenLayoutSettings();
    
    layout.registerComponent('plugin-interface', function(container, state) {
        // Générer un ID unique pour ce conteneur s'il n'en a pas déjà un
        const containerId = container._config && container._config.id ? 
                            container._config.id : 
                            'plugin-container-' + Math.random().toString(36).substr(2, 9);
        
        // Stocker l'ID dans la configuration
        if (container._config) {
            container._config.id = containerId;
        }
        
        // Identifier ce conteneur pour le débogage
        container.getElement().id = containerId;
        console.log(`Composant plugin-interface enregistré: ${containerId}`, state);
        
        // Afficher un indicateur de chargement
        container.getElement().innerHTML = '<div class="flex items-center justify-center h-full"><div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div></div>';
        
        // Marquer ce conteneur avec un attribut data unique pour éviter les collisions de scripts
        container.getElement().attr('data-plugin-instance-id', containerId);
        
        // Charger le contenu du plugin
        fetch(`/api/plugins/${state.pluginName}/interface${state.geocacheId ? '?geocacheId=' + state.geocacheId : ''}`)
            .then(response => {
                if (!response.ok) throw new Error("Erreur lors du chargement de l'interface");
                return response.text();
            })
            .then(html => {
                // Créer un ID unique pour ce conteneur
                const uniqueScriptId = `plugin-scripts-${containerId}`;
                
                // Créer un wrapper avec un ID unique pour isoler le contexte JavaScript
                const modifiedHtml = `
                    <div id="${uniqueScriptId}" class="plugin-instance-wrapper">
                        ${html}
                    </div>
                `;
                
                // Insérer le HTML
                container.getElement().html(modifiedHtml);
                
                // Ajouter un attribut pour identifier facilement ce conteneur
                updateRootElementWithContainerId(container);
                
                // Réinitialiser Stimulus
                reinitializeStimulus(container);
                
                // Ajouter un gestionnaire d'exécution de secours
                setTimeout(() => {
                    const rootElement = container.getElement().querySelector('.w-full.h-full');
                    if (!rootElement) {
                        console.error(`Élément racine non trouvé dans ${containerId}`);
                        return;
                    }
                    
                    const executeButton = rootElement.querySelector('.debug-button');
                    if (executeButton) {
                        console.log(`Ajout d'un gestionnaire de secours pour le bouton Exécuter dans ${containerId}`);
                        executeButton.addEventListener('click', function(event) {
                            console.log(`Clic sur le bouton Exécuter via gestionnaire GoldenLayout dans ${containerId}`);
                            
                            // Rechercher l'instance du contrôleur associée à cet élément
                            if (window.StimulusApp && window.StimulusApp.controllers) {
                                const controller = window.StimulusApp.controllers.find(
                                    c => c.context.identifier === 'plugin-interface' && 
                                    (c.element === rootElement || rootElement.contains(c.element))
                                );
                                
                                if (controller) {
                                    console.log(`Instance du contrôleur trouvée pour ${containerId}`, controller);
                                    controller.execute(event);
                                    return;
                                } else {
                                    console.warn(`Aucun contrôleur trouvé pour ${containerId}, utilisation de l'API directe`);
                                }
                            }
                            
                            // Si aucun contrôleur n'est trouvé, appeler directement l'API
                            directAPICall(container, rootElement);
                        });
                    } else {
                        console.warn(`Bouton exécuter non trouvé dans ${containerId}`);
                    }
                }, 500);
            })
            .catch(error => {
                console.error("Erreur:", error);
                container.getElement().innerHTML = `<div class="bg-red-900 text-red-100 p-4 rounded-lg m-4">Erreur: ${error.message}</div>`;
            });
    });
    
    console.log("Composant plugin-interface enregistré avec succès");
}

// Fonction pour vérifier si les onglets doivent s'ouvrir dans la même section
function shouldOpenInSameSection() {
    console.log('=== DEBUG: shouldOpenInSameSection appelée ===');
    
    // Vérifier si la configuration est déjà chargée
    if (goldenLayoutConfig.openTabsInSameSection === undefined) {
        // Si la configuration n'est pas encore chargée, la charger de manière synchrone
        console.log('=== DEBUG: Configuration non chargée, récupération synchrone ===');
        
        try {
            // Effectuer une requête synchrone (déconseillée en général, mais nécessaire ici)
            const xhr = new XMLHttpRequest();
            xhr.open('GET', '/api/settings/param/open_tabs_in_same_section', false); // 'false' rend la requête synchrone
            xhr.send();
            
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    goldenLayoutConfig.openTabsInSameSection = response.value;
                    console.log('=== DEBUG: Paramètre open_tabs_in_same_section chargé de manière synchrone ===', response.value);
                }
            } else {
                console.error('=== DEBUG: Erreur lors du chargement synchrone des paramètres ===');
            }
        } catch (error) {
            console.error('=== DEBUG: Exception lors du chargement synchrone des paramètres ===', error);
        }
    }
    
    // Utiliser la valeur par défaut si toujours undefined après tentative de chargement
    if (goldenLayoutConfig.openTabsInSameSection === undefined) {
        console.log('=== DEBUG: Paramètre toujours non défini, utilisation de la valeur par défaut (true) ===');
        goldenLayoutConfig.openTabsInSameSection = true;
    }
    
    console.log('=== DEBUG: Valeur de openTabsInSameSection:', goldenLayoutConfig.openTabsInSameSection);
    return goldenLayoutConfig.openTabsInSameSection;
}

// Fonction d'appel direct à l'API en cas d'échec des contrôleurs
function directAPICall(container, rootElement) {
    // Identifier le conteneur pour le débogage
    const containerId = container._config && container._config.id || 'unknown-container';
    console.log(`Appel direct de l'API comme solution de secours pour ${containerId}`);
    
    // Récupérer le nom du plugin
    const pluginName = rootElement.dataset.pluginName || 
                      rootElement.querySelector('h1.text-2xl.font-bold.text-blue-400')?.textContent.trim();
    
    if (!pluginName) {
        console.error(`Impossible de déterminer le nom du plugin pour ${containerId}`);
        return;
    }
    
    // Récupérer les données du formulaire
    const data = {};
    const form = rootElement.querySelector('[data-plugin-interface-target="form"]');
    if (form) {
        const formData = new FormData(form);
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        // Récupérer les champs spéciaux
        const modeSelect = form.querySelector('#mode');
        if (modeSelect) {
            data.mode = modeSelect.value;
        }
        
        const bruteForceCheckbox = form.querySelector('#brute_force');
        if (bruteForceCheckbox) {
            data.brute_force = bruteForceCheckbox.checked;
        }
    } else {
        // Si pas de formulaire, utiliser les paramètres ID de géocache
        const geocacheId = rootElement.dataset.pluginInterfaceIdValue;
        if (geocacheId && geocacheId !== 'default') {
            data.geocache_id = geocacheId;
        }
    }
    
    // Montrer le chargement
    const output = rootElement.querySelector('[data-plugin-interface-target="output"]');
    if (output) {
        output.classList.remove('hidden');
        output.innerHTML = '<div class="flex items-center justify-center p-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>';
    }
    
    console.log(`Exécution de plugin ${pluginName} avec données:`, data);
    
    // Appeler l'API
    fetch(`/api/plugins/${pluginName}/execute`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        // Vérifier le type de contenu
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return response.json().then(data => ({
                isJson: true,
                content: data
            }));
        } else {
            return response.text().then(text => ({
                isJson: false,
                content: text
            }));
        }
    })
    .then(result => {
        // Gérer les résultats
        console.log(`Résultat reçu pour ${containerId}:`, result);
        
        if (output) {
            if (!result.isJson) {
                output.innerHTML = result.content;
            } else {
                // Afficher le résultat formaté
                const data = result.content;
                let normalizedData = { ...data };
                
                // Normaliser la structure
                if (data.result && data.result.text && data.result.text.text_output !== undefined) {
                    normalizedData.text_output = data.result.text.text_output;
                } else if (data.output !== undefined) {
                    normalizedData.text_output = data.output;
                }
                
                if (data.result && data.result.log !== undefined) {
                    normalizedData.log = data.result.log;
                } else if (data.original_result && data.original_result.result && data.original_result.result.log) {
                    normalizedData.log = data.original_result.result.log;
                }
                
                // Afficher un résultat simplifié
                output.innerHTML = `
                    <div class="space-y-4">
                        <div class="bg-gray-700 rounded-lg p-4">
                            <h3 class="text-lg font-medium text-gray-300 mb-2">Résultat (API direct)</h3>
                            <div class="bg-gray-800 p-4 rounded">
                                <textarea class="w-full bg-gray-800 text-gray-300 border border-gray-700 focus:border-blue-500 p-2 rounded resize-y">${normalizedData.text_output || ''}</textarea>
                            </div>
                        </div>
                        ${normalizedData.log ? `
                        <div class="bg-gray-700 rounded-lg p-4">
                            <h3 class="text-lg font-medium text-gray-300 mb-2">Détails de la projection</h3>
                            <div class="bg-gray-800 p-4 rounded">
                                <pre class="w-full bg-gray-800 text-gray-300 font-mono text-sm whitespace-pre-wrap">${normalizedData.log}</pre>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                `;
            }
        }
    })
    .catch(error => {
        console.error(`Erreur lors de l'appel direct à l'API pour ${containerId}:`, error);
        if (output) {
            output.innerHTML = `<div class="bg-red-900 text-red-100 p-4 rounded-lg">Erreur: ${error.message}</div>`;
        }
    });
}

// Gestionnaire d'événements pour les messages de GoldenLayout
window.addEventListener('gl-component-created', function(event) {
    const container = event.detail.container
    if (container && container._config && container._config.componentName === 'plugin-interface') {
        console.log("Nouvel événement gl-component-created pour plugin-interface", container)
        setTimeout(() => reinitializeStimulus(container), 100)
    }
})

// Exporter les fonctions
window.PluginGoldenLayoutIntegration = {
    reinitializeStimulus,
    registerPluginInterfaceComponent,
    directAPICall,
    updateRootElementWithContainerId,
    shouldOpenInSameSection,
    loadGoldenLayoutSettings
}

// Appeler loadGoldenLayoutSettings au chargement du script
document.addEventListener('DOMContentLoaded', loadGoldenLayoutSettings); 