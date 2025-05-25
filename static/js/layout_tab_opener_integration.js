/**
 * Intégration du TabOpenerService avec les fonctions existantes de GoldenLayout
 * Ce script modifie les fonctions globales pour utiliser le nouveau système intelligent
 */

// Attendre que TabOpenerService soit disponible
function waitForTabOpenerService() {
    return new Promise((resolve) => {
        if (window.TabOpenerService) {
            resolve(window.TabOpenerService);
            return;
        }
        
        const checkInterval = setInterval(() => {
            if (window.TabOpenerService) {
                clearInterval(checkInterval);
                resolve(window.TabOpenerService);
            }
        }, 100);
    });
}

// Sauvegarder les fonctions originales
const originalFunctions = {};

// Initialiser l'intégration
async function initializeTabOpenerIntegration() {
    console.log('🔗 Initialisation de l\'intégration TabOpener...');
    
    const tabOpener = await waitForTabOpenerService();
    
    // Sauvegarder les fonctions originales si elles existent
    if (window.openPluginTab) {
        originalFunctions.openPluginTab = window.openPluginTab;
    }
    if (window.openSolverTab) {
        originalFunctions.openSolverTab = window.openSolverTab;
    }
    if (window.openFormulaSolverTab) {
        originalFunctions.openFormulaSolverTab = window.openFormulaSolverTab;
    }
    if (window.openGeocachesTab) {
        originalFunctions.openGeocachesTab = window.openGeocachesTab;
    }
    if (window.openWebSearchTab) {
        originalFunctions.openWebSearchTab = window.openWebSearchTab;
    }
    
    // Remplacer les fonctions par des versions intelligentes
    
    /**
     * Version intelligente d'openPluginTab
     */
    window.openPluginTab = async function(pluginName, title, params = {}) {
        try {
            console.log('🔧 openPluginTab intelligent:', { pluginName, title, params });
            
            const openInSameSection = await tabOpener.getSetting('open_tab_in_same_section');
            
            const config = {
                type: 'plugin',
                title: title || pluginName,
                componentName: 'plugin',
                uniqueId: `plugin-${pluginName}-${params.geocacheId || 'global'}`,
                state: {
                    pluginName: pluginName,
                    ...params
                }
            };
            
            // Vérifier si l'onglet existe déjà
            const existingTab = tabOpener.findExistingTab(config);
            if (existingTab) {
                existingTab.parent.setActiveContentItem(existingTab);
                return;
            }
            
            await tabOpener.openTab(config, openInSameSection);
            
        } catch (error) {
            console.error('❌ Erreur openPluginTab intelligent:', error);
            // Fallback vers la fonction originale
            if (originalFunctions.openPluginTab) {
                originalFunctions.openPluginTab(pluginName, title, params);
            }
        }
    };
    
    /**
     * Version intelligente d'openSolverTab
     */
    window.openSolverTab = async function(geocacheId = null, gcCode = null) {
        try {
            console.log('🔧 openSolverTab intelligent:', { geocacheId, gcCode });
            
            const openInSameSection = await tabOpener.getSetting('open_tab_in_same_section');
            
            const config = {
                type: 'solver',
                title: geocacheId ? `Solver - ${gcCode}` : "Solver",
                componentName: 'geocache-solver',
                uniqueId: geocacheId ? `solver-${geocacheId}` : 'solver-global',
                state: {
                    geocacheId: geocacheId,
                    gcCode: gcCode
                }
            };
            
            // Vérifier si l'onglet existe déjà
            const existingTab = tabOpener.findExistingTab(config);
            if (existingTab) {
                existingTab.parent.setActiveContentItem(existingTab);
                return;
            }
            
            await tabOpener.openTab(config, openInSameSection);
            
        } catch (error) {
            console.error('❌ Erreur openSolverTab intelligent:', error);
            if (originalFunctions.openSolverTab) {
                originalFunctions.openSolverTab(geocacheId, gcCode);
            }
        }
    };
    
    /**
     * Version intelligente d'openFormulaSolverTab
     */
    window.openFormulaSolverTab = async function(geocacheId = null, gcCode = null) {
        try {
            console.log('🔧 openFormulaSolverTab intelligent:', { geocacheId, gcCode });
            
            const openInSameSection = await tabOpener.getSetting('open_tab_in_same_section');
            
            const config = {
                type: 'formula-solver',
                title: geocacheId ? `Formula Solver - ${gcCode}` : "Formula Solver",
                componentName: 'FormulaSolver',
                uniqueId: geocacheId ? `formula-solver-${geocacheId}` : 'formula-solver-global',
                state: {
                    geocacheId: geocacheId,
                    gcCode: gcCode
                }
            };
            
            // Vérifier si l'onglet existe déjà
            const existingTab = tabOpener.findExistingTab(config);
            if (existingTab) {
                existingTab.parent.setActiveContentItem(existingTab);
                return;
            }
            
            await tabOpener.openTab(config, openInSameSection);
            
        } catch (error) {
            console.error('❌ Erreur openFormulaSolverTab intelligent:', error);
            if (originalFunctions.openFormulaSolverTab) {
                originalFunctions.openFormulaSolverTab(geocacheId, gcCode);
            }
        }
    };
    
    /**
     * Version intelligente d'openGeocachesTab
     */
    window.openGeocachesTab = async function(zoneId, zoneName) {
        try {
            console.log('🔧 openGeocachesTab intelligent:', { zoneId, zoneName });
            
            const openInSameSection = await tabOpener.getSetting('open_tab_in_same_section');
            
            const config = {
                type: 'geocaches-table',
                title: `Géocaches - ${zoneName}`,
                componentName: 'geocaches-table',
                uniqueId: `geocaches-table-${zoneId}`,
                state: {
                    zoneId: zoneId,
                    zoneName: zoneName
                }
            };
            
            // Vérifier si l'onglet existe déjà
            const existingTab = tabOpener.findExistingTab(config);
            if (existingTab) {
                existingTab.parent.setActiveContentItem(existingTab);
                return;
            }
            
            await tabOpener.openTab(config, openInSameSection);
            
        } catch (error) {
            console.error('❌ Erreur openGeocachesTab intelligent:', error);
            if (originalFunctions.openGeocachesTab) {
                originalFunctions.openGeocachesTab(zoneId, zoneName);
            }
        }
    };
    
    /**
     * Version intelligente d'openWebSearchTab
     */
    window.openWebSearchTab = async function(searchTerm, title = null) {
        try {
            console.log('🔧 openWebSearchTab intelligent:', { searchTerm, title });
            
            const openInSameSection = await tabOpener.getSetting('open_tab_in_same_section');
            
            const config = {
                type: 'web-search',
                title: title || `Recherche: ${searchTerm.substring(0, 30)}${searchTerm.length > 30 ? '...' : ''}`,
                componentName: 'WebSearch',
                uniqueId: `web-search-${encodeURIComponent(searchTerm)}`,
                state: {
                    searchTerm: searchTerm
                }
            };
            
            // Vérifier si l'onglet existe déjà
            const existingTab = tabOpener.findExistingTab(config);
            if (existingTab) {
                existingTab.parent.setActiveContentItem(existingTab);
                return;
            }
            
            await tabOpener.openTab(config, openInSameSection);
            
        } catch (error) {
            console.error('❌ Erreur openWebSearchTab intelligent:', error);
            if (originalFunctions.openWebSearchTab) {
                originalFunctions.openWebSearchTab(searchTerm, title);
            }
        }
    };
    
    /**
     * Version intelligente d'openGeocacheDetails
     */
    window.openGeocacheDetails = async function(geocacheId, gcCode, name) {
        try {
            console.log('🔧 openGeocacheDetails intelligent:', { geocacheId, gcCode, name });
            
            const openInSameSection = await tabOpener.getSetting('open_tab_in_same_section');
            
            const config = {
                type: 'geocache-details',
                title: `${gcCode} - ${name}`,
                componentName: 'geocache-details',
                uniqueId: `geocache-details-${geocacheId}`,
                state: {
                    geocacheId: geocacheId,
                    gcCode: gcCode,
                    name: name
                }
            };
            
            // Vérifier si l'onglet existe déjà
            const existingTab = tabOpener.findExistingTab(config);
            if (existingTab) {
                existingTab.parent.setActiveContentItem(existingTab);
                return;
            }
            
            await tabOpener.openTab(config, openInSameSection);
            
        } catch (error) {
            console.error('❌ Erreur openGeocacheDetails intelligent:', error);
        }
    };
    
    /**
     * Version intelligente de showGeocachesMapPanel
     */
    window.showGeocachesMapPanel = async function(geocacheIds = [], zoneId = null, title = 'Carte des Géocaches') {
        try {
            console.log('🔧 showGeocachesMapPanel intelligent:', { geocacheIds, zoneId, title });
            
            const openInSameSection = await tabOpener.getSetting('open_tab_in_same_section');
            
            // Créer un ID unique basé sur la zone ou les géocaches
            const uniqueId = zoneId ? `geocaches-map-${zoneId}` : `geocaches-map-${geocacheIds.length > 0 ? geocacheIds.join('-') : 'global'}`;
            
            const config = {
                type: 'geocaches-map',
                title: title,
                componentName: 'geocaches-map',
                uniqueId: uniqueId,
                state: {
                    geocacheIds: geocacheIds,
                    zoneId: zoneId
                }
            };
            
            console.log('🗺️ Configuration carte:', config);
            
            // Vérifier si l'onglet existe déjà
            const existingTab = tabOpener.findExistingTab(config);
            if (existingTab) {
                console.log('✅ Onglet carte existant trouvé, activation');
                existingTab.parent.setActiveContentItem(existingTab);
                return;
            }
            
            await tabOpener.openTab(config, openInSameSection);
            
        } catch (error) {
            console.error('❌ Erreur showGeocachesMapPanel intelligent:', error);
            // Pas de fallback pour cette fonction car elle n'existait pas avant
        }
    };
    
    /**
     * Version intelligente de showMultiSolverPanel
     */
    window.showMultiSolverPanel = async function(geocacheIds = [], zoneId = null, title = 'Multi-Solver') {
        try {
            console.log('🔧 showMultiSolverPanel intelligent:', { geocacheIds, zoneId, title });
            
            // Vérifier que TabOpenerService est disponible
            if (!window.TabOpenerService) {
                console.error('❌ TabOpenerService non disponible');
                return;
            }
            
            // Préparer la configuration pour le Multi-Solver
            const config = {
                type: 'multi-solver',
                title: title,
                componentName: 'multi-solver',
                uniqueId: `multi-solver-${zoneId}`,
                state: {
                    geocacheIds: geocacheIds,
                    zoneId: zoneId,
                    uniqueId: `multi-solver-${zoneId}`,
                    componentName: 'multi-solver'
                }
            };
            
            console.log('🧩 Configuration Multi-Solver:', config);
            
            // Vérifier si un onglet existe déjà
            const existingTab = window.TabOpenerService.findExistingTab(config);
            if (existingTab) {
                console.log('✅ Onglet Multi-Solver existant trouvé, activation');
                existingTab.parent.setActiveContentItem(existingTab);
                return;
            }
            
            // Récupérer le paramètre open_tab_in_same_section
            const openInSameSection = await window.TabOpenerService.getSetting('open_tab_in_same_section');
            
            // Ouvrir le nouvel onglet Multi-Solver
            await window.TabOpenerService.openTab(config, openInSameSection);
            
            console.log('✅ Multi-Solver ouvert avec succès');
            
        } catch (error) {
            console.error('❌ Erreur showMultiSolverPanel intelligent:', error);
        }
    };
    
    console.log('✅ Intégration TabOpener terminée - toutes les fonctions sont maintenant intelligentes');
}

// Invalidation du cache lorsque les paramètres changent
window.addEventListener('SettingsChanged', () => {
    if (window.TabOpenerService) {
        window.TabOpenerService.invalidateCache();
        console.log('🔄 Cache TabOpener invalidé suite à changement de paramètres');
    }
});

// Initialiser dès que possible
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTabOpenerIntegration);
} else {
    initializeTabOpenerIntegration();
}

console.log('📦 Intégration TabOpener chargée'); 