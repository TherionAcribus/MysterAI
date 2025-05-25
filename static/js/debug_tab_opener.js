/**
 * Script de debug pour diagnostiquer les problèmes d'ouverture d'onglets
 */

// Fonction pour afficher l'état complet du système
window.debugTabOpenerSystem = function() {
    console.log('🔍 === DEBUG TAB OPENER SYSTEM ===');
    
    // 1. Vérifier la disponibilité des services
    console.log('📦 Services disponibles:');
    console.log('  - TabOpenerService:', !!window.TabOpenerService);
    console.log('  - LayoutStateManager:', !!window.layoutStateManager);
    console.log('  - mainLayout:', !!window.mainLayout);
    
    // 2. État du LayoutStateManager
    if (window.layoutStateManager) {
        console.log('🏗️ État du LayoutStateManager:');
        window.layoutStateManager.debugState();
        
        const activeStack = window.layoutStateManager.getActiveGoldenLayoutStack();
        console.log('  - Stack active:', activeStack ? activeStack.id : 'aucune');
        
        const recentStack = window.layoutStateManager.getMostRecentActiveStack();
        console.log('  - Stack récente:', recentStack ? recentStack.id : 'aucune');
        
        const stacksByActivity = window.layoutStateManager.getStacksByActivity();
        console.log('  - Stacks par activité:', stacksByActivity.map(s => s.id));
    }
    
    // 3. Structure du layout
    if (window.mainLayout) {
        console.log('🏗️ Structure du layout:');
        const analyzeItems = (items, level = 0) => {
            const indent = '  '.repeat(level);
            items.forEach(item => {
                if (item.type === 'stack') {
                    console.log(`${indent}📚 Stack: ${item.id} (${item.contentItems.length} onglets)`);
                    item.contentItems.forEach(child => {
                        console.log(`${indent}  📄 ${child.config.componentName}: ${child.config.title}`);
                    });
                } else if (item.type === 'component') {
                    console.log(`${indent}📄 Component: ${item.config.componentName} - ${item.config.title}`);
                } else {
                    console.log(`${indent}📁 ${item.type}`);
                    if (item.contentItems) {
                        analyzeItems(item.contentItems, level + 1);
                    }
                }
            });
        };
        
        analyzeItems(window.mainLayout.root.contentItems);
    }
    
    // 4. Boutons avec data-tab-opener
    console.log('🔘 Boutons avec data-tab-opener:');
    const buttons = document.querySelectorAll('[data-tab-opener]');
    buttons.forEach((button, index) => {
        console.log(`  ${index + 1}. ${button.getAttribute('data-tab-opener')} - ${button.getAttribute('data-tab-title')}`);
        console.log(`     ID unique: ${button.getAttribute('data-tab-unique-id')}`);
        console.log(`     onclick: ${!!button.onclick || !!button.getAttribute('onclick')}`);
    });
    
    console.log('🔍 === FIN DEBUG ===');
};

// Fonction pour tester l'ouverture d'un onglet
window.testTabOpening = function(type = 'test', title = 'Test Tab') {
    console.log('🧪 === TEST OUVERTURE ONGLET ===');
    
    if (!window.TabOpenerService) {
        console.error('❌ TabOpenerService non disponible');
        return;
    }
    
    const config = {
        type: type,
        title: title,
        componentName: 'plugin',
        uniqueId: `test-${Date.now()}`,
        state: {
            test: true,
            timestamp: Date.now()
        }
    };
    
    console.log('🎯 Configuration de test:', config);
    
    // Tester avec open_tab_in_same_section = true
    window.TabOpenerService.openTab(config, true);
};

// Fonction pour simuler un clic sur un bouton
window.simulateButtonClick = function(buttonSelector) {
    console.log('🖱️ === SIMULATION CLIC BOUTON ===');
    
    const button = document.querySelector(buttonSelector);
    if (!button) {
        console.error('❌ Bouton non trouvé:', buttonSelector);
        return;
    }
    
    console.log('🔘 Bouton trouvé:', button);
    console.log('📋 Attributs:', {
        opener: button.getAttribute('data-tab-opener'),
        title: button.getAttribute('data-tab-title'),
        uniqueId: button.getAttribute('data-tab-unique-id')
    });
    
    // Simuler le clic
    const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
    });
    
    button.dispatchEvent(event);
};

// Fonction pour forcer l'activation d'une stack
window.forceActivateStack = function(stackId) {
    console.log('🎯 === ACTIVATION FORCÉE STACK ===');
    
    if (!window.layoutStateManager) {
        console.error('❌ LayoutStateManager non disponible');
        return;
    }
    
    const stackInfo = window.layoutStateManager.stacks.get(stackId);
    if (!stackInfo) {
        console.error('❌ Stack non trouvée:', stackId);
        console.log('📚 Stacks disponibles:', Array.from(window.layoutStateManager.stacks.keys()));
        return;
    }
    
    console.log('✅ Activation de la stack:', stackId);
    window.layoutStateManager.setActiveStack(stackInfo.goldenLayoutStack);
    
    // Afficher l'état après activation
    setTimeout(() => {
        console.log('📊 État après activation:');
        window.layoutStateManager.debugState();
    }, 100);
};

// Fonction pour surveiller les événements en temps réel
window.startEventMonitoring = function() {
    console.log('👁️ === SURVEILLANCE ÉVÉNEMENTS ACTIVÉE ===');
    
    // Surveiller les clics sur les boutons data-tab-opener
    document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-tab-opener]');
        if (button) {
            console.log('🖱️ ÉVÉNEMENT: Clic sur bouton data-tab-opener');
            console.log('  - Type:', button.getAttribute('data-tab-opener'));
            console.log('  - Titre:', button.getAttribute('data-tab-title'));
            console.log('  - Timestamp:', new Date().toISOString());
        }
    });
    
    // Surveiller les changements de stack active
    if (window.layoutStateManager) {
        const originalSetActiveStack = window.layoutStateManager.setActiveStack;
        window.layoutStateManager.setActiveStack = function(stack) {
            console.log('🎯 ÉVÉNEMENT: Changement de stack active');
            console.log('  - Nouvelle stack:', stack ? stack.id : 'aucune');
            console.log('  - Timestamp:', new Date().toISOString());
            return originalSetActiveStack.call(this, stack);
        };
    }
    
    console.log('✅ Surveillance activée. Utilisez stopEventMonitoring() pour arrêter.');
};

// Fonction pour arrêter la surveillance
window.stopEventMonitoring = function() {
    console.log('🛑 Surveillance des événements arrêtée');
    // Note: Pour une implémentation complète, il faudrait stocker les références des listeners
};

// Auto-exécution du debug au chargement
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        console.log('🔧 Script de debug Tab Opener chargé');
        console.log('📋 Fonctions disponibles:');
        console.log('  - debugTabOpenerSystem() : Affiche l\'état complet');
        console.log('  - testTabOpening() : Teste l\'ouverture d\'un onglet');
        console.log('  - simulateButtonClick(selector) : Simule un clic');
        console.log('  - forceActivateStack(stackId) : Force l\'activation d\'une stack');
        console.log('  - startEventMonitoring() : Active la surveillance');
    }, 1000);
});

console.log('📦 Script de debug Tab Opener chargé');

/**
 * Test spécifique pour diagnostiquer le problème de passage des données de géocaches
 */
function testGeocacheDataTransfer() {
    console.log('🔍 === Test de transfert des données de géocaches ===');
    
    // 1. Vérifier les fonctions disponibles
    console.log('📋 Fonctions disponibles:');
    console.log('- showGeocachesMapPanel:', typeof window.showGeocachesMapPanel);
    console.log('- getFilteredGeocacheIds:', typeof window.getFilteredGeocacheIds);
    console.log('- handleMapClick:', typeof window.handleMapClick);
    
    // 2. Tester getFilteredGeocacheIds
    if (typeof window.getFilteredGeocacheIds === 'function') {
        try {
            const geocacheIds = window.getFilteredGeocacheIds();
            console.log('✅ getFilteredGeocacheIds retourne:', geocacheIds);
        } catch (error) {
            console.error('❌ Erreur getFilteredGeocacheIds:', error);
        }
    }
    
    // 3. Tester showGeocachesMapPanel avec des données de test
    if (typeof window.showGeocachesMapPanel === 'function') {
        console.log('🧪 Test de showGeocachesMapPanel avec données de test...');
        try {
            window.showGeocachesMapPanel([676, 678, 683], 6, 'Test Carte (3 géocaches)');
            console.log('✅ showGeocachesMapPanel appelée avec succès');
        } catch (error) {
            console.error('❌ Erreur showGeocachesMapPanel:', error);
        }
    }
    
    // 4. Vérifier l'état du layout
    if (window.layoutStateManager) {
        console.log('📊 État du LayoutStateManager:');
        window.layoutStateManager.debugState();
    }
    
    // 5. Vérifier les composants GoldenLayout
    if (window.layout) {
        console.log('🏗️ Composants GoldenLayout enregistrés:');
        const registeredComponents = window.layout.config.components || [];
        console.log('- Composants:', registeredComponents.map(c => c.componentName));
        
        // Vérifier si 'geocaches-map' est enregistré
        const hasGeocachesMap = registeredComponents.some(c => c.componentName === 'geocaches-map');
        console.log('- geocaches-map enregistré:', hasGeocachesMap);
    }
    
    console.log('🔍 === Fin du test de transfert des données ===');
} 