/**
 * Service pour gérer l'ouverture intelligente des onglets
 * Respecte le paramètre open_tab_in_same_section
 */
class TabOpenerService {
    constructor() {
        this.CACHE_DURATION = 30000; // 30 secondes
        this.settingsCache = null;
        this.cacheExpiry = null;
        this.eventListenersInitialized = false; // Flag pour éviter les doublons
        
        console.log('🔧 TabOpenerService: Initialisation du service');
        this.initializeEventListeners();
    }
    
    /**
     * Initialise les écouteurs d'événements pour les boutons data-tab-opener
     */
    initializeEventListeners() {
        // Éviter d'ajouter plusieurs fois les mêmes écouteurs
        if (this.eventListenersInitialized) {
            console.log('🎧 TabOpenerService: Écouteurs déjà initialisés, ignoré');
            return;
        }
        
        console.log('🎧 TabOpenerService: Configuration des écouteurs d\'événements');
        
        // Écouter les clics sur tous les boutons avec data-tab-opener
        document.addEventListener('click', (event) => {
            const button = event.target.closest('[data-tab-opener]');
            if (button) {
                console.log('🖱️ TabOpenerService: Clic détecté sur bouton avec data-tab-opener:', button);
                
                // Si le bouton a un onclick, l'exécuter d'abord
                if (button.onclick) {
                    console.log('🔄 TabOpener: Bouton avec onclick détecté, exécution en premier');
                    
                    // Exécuter la fonction onclick et vérifier sa valeur de retour
                    const result = button.onclick.call(button, event);
                    
                    console.log('🔍 TabOpener: Résultat de onclick:', result);
                    
                    // Si la fonction retourne false (strictement), arrêter le traitement
                    if (result === false) {
                        console.log('🛑 TabOpener: onclick a retourné false, arrêt du traitement TabOpener');
                        return;
                    }
                    
                    console.log('✅ TabOpener: onclick terminé, continuation du traitement TabOpener');
                }
                
                // Vérifier si l'événement a été annulé
                if (event.defaultPrevented) {
                    console.log('🛑 TabOpener: Événement annulé par preventDefault, arrêt du traitement');
                    return;
                }
                
                this.handleTabOpenerClick(button, event);
            }
        });
        
        // Écouter l'événement d'initialisation de GoldenLayout pour s'assurer que tout est prêt
        document.addEventListener('goldenLayoutInitialized', () => {
            console.log('✅ TabOpenerService: GoldenLayout initialisé, service prêt');
        });
        
        this.eventListenersInitialized = true;
        console.log('✅ TabOpenerService: Écouteurs d\'événements initialisés');
    }
    
    /**
     * Gère le clic sur un bouton avec data-tab-opener
     */
    async handleTabOpenerClick(button, event) {
        console.log('🖱️ TabOpenerService: Clic détecté sur bouton avec data-tab-opener:', button);
        
        try {
            console.log('🎯 TabOpener: Gestion du clic sur bouton intelligent');
            console.log('📋 TabOpener: Bouton:', button);
            console.log('📋 TabOpener: Attributs data-tab-*:', {
                opener: button.dataset.tabOpener,
                title: button.dataset.tabTitle,
                component: button.dataset.tabComponent,
                uniqueId: button.dataset.tabUniqueId
            });
            
            // Empêcher la propagation et le comportement par défaut
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            // Parser la configuration du bouton
            const config = this.parseButtonConfig(button);
            if (!config) {
                console.error('❌ TabOpener: Impossible de parser la configuration du bouton');
                return;
            }
            
            console.log('🎯 TabOpener: Configuration parsée:', config);
            
            // Vérifier si un onglet avec cet ID unique existe déjà
            const existingTab = this.findExistingTab(config);
            if (existingTab) {
                console.log('✅ TabOpener: Onglet existant trouvé, activation');
                existingTab.parent.setActiveContentItem(existingTab);
                return;
            }
            
            // Récupérer le paramètre open_tab_in_same_section
            const openInSameSection = await this.getSetting('open_tab_in_same_section');
            console.log('📋 TabOpener: open_tab_in_same_section =', openInSameSection);
            
            // Ouvrir le nouvel onglet
            await this.openTab(config, openInSameSection);
            
        } catch (error) {
            console.error('❌ TabOpener: Erreur lors de la gestion du clic:', error);
        }
    }
    
    /**
     * Parse la configuration d'un bouton data-tab-opener
     */
    parseButtonConfig(button) {
        console.log('🔍 TabOpener: Parsing de la configuration du bouton');
        
        const type = button.getAttribute('data-tab-opener');
        const title = button.getAttribute('data-tab-title');
        const component = button.getAttribute('data-tab-component');
        const uniqueId = button.getAttribute('data-tab-unique-id');
        
        if (!type || !title) {
            console.error('❌ TabOpener: Attributs requis manquants (data-tab-opener ou data-tab-title)');
            return null;
        }
        
        // Récupérer tous les attributs data-tab-config-*
        const state = {};
        for (const attr of button.attributes) {
            if (attr.name.startsWith('data-tab-config-')) {
                const key = attr.name.replace('data-tab-config-', '');
                let value = attr.value;
                
                // Essayer de parser le JSON si c'est l'attribut json
                if (key === 'json') {
                    try {
                        const jsonData = JSON.parse(value);
                        Object.assign(state, jsonData);
                        continue;
                    } catch (error) {
                        console.warn('⚠️ TabOpener: Erreur parsing JSON:', error);
                    }
                }
                
                // Essayer de parser les arrays JSON
                if (value.startsWith('[') || value.startsWith('{')) {
                    try {
                        value = JSON.parse(value);
                    } catch (error) {
                        // Garder la valeur string si le parsing échoue
                    }
                }
                
                // Mapper les clés pour corriger la casse (HTML convertit tout en minuscules)
                const mappedKey = this.mapAttributeKey(key);
                state[mappedKey] = value;
            }
        }
        
        const config = {
            type: type,
            title: title,
            componentName: component || this.getDefaultComponentName(type),
            uniqueId: uniqueId || `${type}-${Date.now()}`,
            state: state
        };
        
        console.log('✅ TabOpener: Configuration parsée avec succès:', config);
        return config;
    }
    
    /**
     * Cherche un onglet existant avec la même configuration
     */
    findExistingTab(config) {
        console.log('🔍 TabOpener: Recherche d\'onglet existant pour:', config.uniqueId);
        
        if (!window.mainLayout) {
            console.warn('⚠️ TabOpener: mainLayout non disponible');
            return null;
        }
        
        const findInItems = (items) => {
            for (const item of items) {
                if (item.isComponent && item.config.id === config.uniqueId) {
                    console.log('✅ TabOpener: Onglet existant trouvé:', item.config.id);
                    return item;
                }
                
                if (item.contentItems) {
                    const found = findInItems(item.contentItems);
                    if (found) return found;
                }
            }
            return null;
        };
        
        const existing = findInItems(window.mainLayout.root.contentItems);
        if (!existing) {
            console.log('ℹ️ TabOpener: Aucun onglet existant trouvé');
        }
        return existing;
    }
    
    /**
     * Vérifie si un component correspond à la configuration
     */
    matchesConfig(component, config) {
        // Vérification par ID unique (priorité)
        if (component.config.id === config.uniqueId) {
            return true;
        }
        
        // Vérification par type et paramètres
        if (component.config.componentName === config.componentName) {
            const state = component.config.componentState || {};
            
            // Pour les plugins, vérifier le nom du plugin
            if (config.type === 'plugin' && state.pluginName === config.state.pluginname) {
                return true;
            }
            
            // Pour les geocaches, vérifier l'ID
            if (state.geocacheId && config.state.geocacheid) {
                return state.geocacheId.toString() === config.state.geocacheid.toString();
            }
        }
        
        return false;
    }
    
    /**
     * Ouvre un nouvel onglet selon la configuration et le paramètre
     */
    async openTab(config, openInSameSection) {
        console.log('🚀 TabOpener: Ouverture d\'un nouvel onglet');
        console.log('📋 TabOpener: Config:', config);
        console.log('📋 TabOpener: openInSameSection:', openInSameSection);
        
        const componentConfig = {
            type: 'component',
            componentName: config.componentName || this.getDefaultComponentName(config.type),
            title: config.title,
            id: config.uniqueId,
            componentState: {
                ...config.state,
                uniqueId: config.uniqueId
            }
        };
        
        console.log('🔧 TabOpener: Configuration du composant:', componentConfig);
        
        if (openInSameSection) {
            console.log('📌 TabOpener: Mode "même section" activé');
            this.addToExistingSection(componentConfig);
        } else {
            console.log('🆕 TabOpener: Mode "nouvelle section" activé');
            this.addToNewSection(componentConfig);
        }
    }
    
    /**
     * Ajoute l'onglet à une section existante
     */
    addToExistingSection(componentConfig) {
        console.log('📌 TabOpener: Ajout à une section existante');
        
        // Utiliser le LayoutStateManager pour trouver la stack active
        const activeStack = this.findActiveStack();
        
        if (activeStack) {
            console.log('🎯 TabOpener: Ajout à la stack active:', activeStack.id);
            activeStack.addChild(componentConfig);
            console.log('✅ TabOpener: Onglet ajouté à la stack active');
        } else {
            // Fallback: chercher une stack existante
            const fallbackStack = this.findBestStack();
            if (fallbackStack) {
                console.log('🔄 TabOpener: Ajout à une stack existante (fallback):', fallbackStack.id);
                fallbackStack.addChild(componentConfig);
                console.log('✅ TabOpener: Onglet ajouté à la stack existante');
            } else {
                // Dernier recours: ajouter à la section principale
                console.log('🏠 TabOpener: Ajout à la section principale (dernier recours)');
                if (window.mainLayout?.root?.contentItems?.[0]) {
                    window.mainLayout.root.contentItems[0].addChild(componentConfig);
                    console.log('✅ TabOpener: Onglet ajouté à la section principale');
                } else {
                    console.error('❌ TabOpener: Impossible d\'ajouter à la section principale');
                }
            }
        }
    }
    
    /**
     * Ajoute l'onglet à une nouvelle section
     */
    addToNewSection(componentConfig) {
        console.log('🆕 TabOpener: Création d\'une nouvelle section');
        
        if (!window.mainLayout) {
            console.error('❌ TabOpener: mainLayout non disponible');
            return;
        }
        
        // Créer une nouvelle colonne avec l'onglet
        const newColumn = {
            type: 'column',
            content: [{
                type: 'stack',
                content: [componentConfig]
            }]
        };
        
        console.log('🔧 TabOpener: Configuration de la nouvelle colonne:', newColumn);
        
        // Ajouter la nouvelle colonne
        if (window.mainLayout.root.contentItems.length === 0) {
            console.log('📍 TabOpener: Ajout comme première colonne');
            window.mainLayout.root.addChild(newColumn);
        } else {
            // Ajouter comme nouvelle colonne à côté de l'existante
            const rootRow = window.mainLayout.root.contentItems[0];
            if (rootRow.type === 'row') {
                console.log('📍 TabOpener: Ajout à la row existante');
                rootRow.addChild(newColumn);
            } else {
                // Transformer en row si nécessaire
                console.log('📍 TabOpener: Transformation en row et ajout');
                const existingContent = window.mainLayout.root.contentItems[0];
                window.mainLayout.root.replaceChild(existingContent, {
                    type: 'row',
                    content: [existingContent.config, newColumn]
                });
            }
        }
        
        console.log('✅ TabOpener: Nouvelle section créée');
    }
    
    /**
     * Trouve la stack active en utilisant le LayoutStateManager
     */
    findActiveStack() {
        console.log('🔍 TabOpener: Recherche de la stack active');
        
        if (!window.layoutStateManager) {
            console.warn('⚠️ TabOpener: LayoutStateManager non disponible');
            return null;
        }
        
        console.log('🔍 TabOpener: LayoutStateManager disponible, recherche de la stack active');
        
        // Essayer d'abord la stack actuellement active
        const activeStack = window.layoutStateManager.getActiveGoldenLayoutStack();
        if (activeStack) {
            console.log('🎯 TabOpener: Stack active trouvée:', activeStack.id);
            return activeStack;
        }
        
        // Sinon, utiliser la stack la plus récemment active
        const recentStack = window.layoutStateManager.getMostRecentActiveStack();
        if (recentStack) {
            console.log('🕒 TabOpener: Stack récemment active trouvée:', recentStack.id);
            return recentStack;
        }
        
        console.log('❌ TabOpener: Aucune stack active trouvée via LayoutStateManager');
        return null;
    }
    
    /**
     * Trouve la meilleure stack pour ajouter un onglet (méthode de fallback)
     */
    findBestStack() {
        console.log('🔍 TabOpener: Recherche de la meilleure stack (fallback)');
        
        // D'abord essayer d'utiliser le LayoutStateManager
        if (window.layoutStateManager) {
            console.log('🔍 TabOpener: Tentative via LayoutStateManager');
            const stacksByActivity = window.layoutStateManager.getStacksByActivity();
            if (stacksByActivity.length > 0) {
                console.log('📊 TabOpener: Utilisation des stacks par activité');
                return stacksByActivity[0]; // La plus récemment active
            }
        }
        
        // Fallback vers l'ancienne méthode
        console.log('🔍 TabOpener: Fallback vers la méthode par nombre d\'onglets');
        let bestStack = null;
        let maxItems = -1;
        
        const findStacks = (items) => {
            items.forEach(item => {
                if (item.type === 'stack') {
                    console.log(`📊 TabOpener: Stack trouvée: ${item.id} avec ${item.contentItems.length} onglets`);
                    // Préférer les stacks avec le plus d'onglets (plus actives)
                    if (item.contentItems.length > maxItems) {
                        maxItems = item.contentItems.length;
                        bestStack = item;
                    }
                }
                if (item.contentItems) {
                    findStacks(item.contentItems);
                }
            });
        };
        
        if (window.mainLayout?.root?.contentItems) {
            findStacks(window.mainLayout.root.contentItems);
        }
        
        if (bestStack) {
            console.log('📈 TabOpener: Stack avec le plus d\'onglets trouvée:', bestStack.id);
        } else {
            console.log('❌ TabOpener: Aucune stack trouvée');
        }
        
        return bestStack;
    }
    
    /**
     * Détermine le nom du composant par défaut selon le type
     */
    getDefaultComponentName(type) {
        const mapping = {
            'plugin': 'plugin',
            'solver': 'geocache-solver',
            'formula-solver': 'FormulaSolver',
            'geocache-details': 'geocache-details',
            'geocaches-map': 'geocaches-map',
            'geocaches-table': 'geocaches-table',
            'multi-solver': 'multi-solver',
            'web-search': 'WebSearch',
            'external-url': 'external-url'
        };
        
        const componentName = mapping[type] || 'plugin';
        console.log(`🔧 TabOpener: Nom du composant pour type "${type}": ${componentName}`);
        return componentName;
    }
    
    /**
     * Mappe les clés d'attributs pour corriger la casse
     * (HTML convertit automatiquement les attributs en minuscules)
     */
    mapAttributeKey(key) {
        const mapping = {
            'zoneid': 'zoneId',
            'zonename': 'zoneName',
            'geocacheid': 'geocacheId',
            'gccode': 'gcCode',
            'pluginname': 'pluginName',
            'uniqueid': 'uniqueId',
            'alphabetid': 'alphabetId',
            'alphabetname': 'alphabetName'
        };
        
        return mapping[key] || key;
    }
    
    /**
     * Récupère un paramètre avec cache
     */
    async getSetting(key) {
        const now = Date.now();
        
        // Vérifier le cache
        if (this.settingsCache && this.cacheExpiry && now < this.cacheExpiry) {
            console.log(`📋 TabOpener: Paramètre "${key}" récupéré du cache:`, this.settingsCache[key]);
            return this.settingsCache[key];
        }
        
        console.log(`🌐 TabOpener: Récupération du paramètre "${key}" depuis l'API`);
        
        try {
            // Récupérer les paramètres généraux
            const response = await fetch('/api/settings/general');
            const data = await response.json();
            
            if (data.success) {
                this.settingsCache = data.settings;
                this.cacheExpiry = now + this.CACHE_DURATION;
                console.log(`✅ TabOpener: Paramètres récupérés et mis en cache:`, this.settingsCache);
                return this.settingsCache[key];
            } else {
                console.error('❌ TabOpener: Erreur API settings:', data);
            }
        } catch (error) {
            console.error('❌ TabOpener: Erreur récupération paramètres:', error);
        }
        
        // Valeur par défaut
        const defaultValue = key === 'open_tab_in_same_section' ? true : null;
        console.log(`🔧 TabOpener: Utilisation de la valeur par défaut pour "${key}":`, defaultValue);
        return defaultValue;
    }
    
    /**
     * Invalide le cache des paramètres
     */
    invalidateCache() {
        console.log('🗑️ TabOpener: Invalidation du cache des paramètres');
        this.settingsCache = null;
        this.cacheExpiry = null;
    }
}

// Créer l'instance globale
window.TabOpenerService = new TabOpenerService();

// Fonctions de compatibilité pour les anciens boutons
window.openTabWithSettings = async function(type, title, config = {}) {
    console.log('🔄 TabOpener: Fonction de compatibilité appelée:', { type, title, config });
    
    const openInSameSection = await window.TabOpenerService.getSetting('open_tab_in_same_section');
    
    const tabConfig = {
        type: type,
        title: title,
        componentName: window.TabOpenerService.getDefaultComponentName(type),
        uniqueId: config.uniqueId || `${type}-${Date.now()}`,
        state: config
    };
    
    await window.TabOpenerService.openTab(tabConfig, openInSameSection);
};

console.log('📦 TabOpenerService chargé et prêt'); 