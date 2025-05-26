/**
 * Script de test pour vérifier le fonctionnement des liens intelligents des codes GC
 * 
 * Ce script peut être exécuté dans la console du navigateur pour tester
 * le bon fonctionnement du système de boutons intelligents pour les géocaches.
 */

(function() {
    'use strict';
    
    console.log('🧪 === Test des Liens Intelligents des Codes GC ===');
    
    // Fonction de test principale
    function testGeocacheLinks() {
        console.log('🔍 Début des tests des liens de géocaches...');
        
        // Test 1: Vérifier que TabOpenerService est disponible
        console.log('\n📦 Test 1: Disponibilité de TabOpenerService');
        if (window.TabOpenerService) {
            console.log('✅ TabOpenerService est disponible');
            console.log('   - Version:', window.TabOpenerService.version || 'Non spécifiée');
        } else {
            console.log('❌ TabOpenerService n\'est pas disponible');
            console.log('   - Les liens utiliseront la méthode de fallback');
        }
        
        // Test 2: Vérifier que la fonction handleGeocacheDetailsClick existe
        console.log('\n🔗 Test 2: Fonction handleGeocacheDetailsClick');
        if (typeof window.handleGeocacheDetailsClick === 'function') {
            console.log('✅ handleGeocacheDetailsClick est définie');
        } else {
            console.log('❌ handleGeocacheDetailsClick n\'est pas définie');
            console.log('   - Vérifiez que le script geocaches_table.html est chargé');
        }
        
        // Test 3: Vérifier les liens dans le tableau
        console.log('\n📊 Test 3: Liens dans le tableau des géocaches');
        const gcLinks = document.querySelectorAll('a[onclick*="handleGeocacheDetailsClick"]');
        const detailsButtons = document.querySelectorAll('button[onclick*="handleGeocacheDetailsClick"]');
        
        console.log(`   - Liens de codes GC trouvés: ${gcLinks.length}`);
        console.log(`   - Boutons Détails trouvés: ${detailsButtons.length}`);
        
        if (gcLinks.length > 0) {
            console.log('✅ Les liens des codes GC utilisent la fonction intelligente');
            
            // Analyser le premier lien
            const firstLink = gcLinks[0];
            const onclickAttr = firstLink.getAttribute('onclick');
            console.log(`   - Exemple d'onclick: ${onclickAttr.substring(0, 80)}...`);
        } else {
            console.log('❌ Aucun lien de code GC trouvé avec la fonction intelligente');
        }
        
        if (detailsButtons.length > 0) {
            console.log('✅ Les boutons Détails utilisent la fonction intelligente');
        } else {
            console.log('❌ Aucun bouton Détails trouvé avec la fonction intelligente');
        }
        
        // Test 4: Vérifier le paramètre open_tab_in_same_section
        console.log('\n⚙️ Test 4: Paramètre open_tab_in_same_section');
        if (window.TabOpenerService && window.TabOpenerService.getSettings) {
            const settings = window.TabOpenerService.getSettings();
            if (settings && typeof settings.open_tab_in_same_section !== 'undefined') {
                console.log(`✅ Paramètre trouvé: ${settings.open_tab_in_same_section}`);
                console.log(`   - Les onglets s'ouvriront ${settings.open_tab_in_same_section ? 'dans la même section' : 'dans une nouvelle section'}`);
            } else {
                console.log('⚠️ Paramètre non trouvé, utilisation de la valeur par défaut');
            }
        } else {
            console.log('⚠️ Impossible de vérifier le paramètre (TabOpenerService non disponible)');
        }
        
        // Test 5: Simuler un clic sur un lien (si disponible)
        console.log('\n🖱️ Test 5: Simulation d\'un clic (optionnel)');
        if (gcLinks.length > 0) {
            console.log('   - Un lien de code GC est disponible pour test');
            console.log('   - Pour tester, exécutez: testGeocacheLinks.simulateClick()');
        } else {
            console.log('   - Aucun lien disponible pour simulation');
        }
        
        console.log('\n🏁 Tests terminés');
        return {
            tabOpenerServiceAvailable: !!window.TabOpenerService,
            handleFunctionExists: typeof window.handleGeocacheDetailsClick === 'function',
            gcLinksCount: gcLinks.length,
            detailsButtonsCount: detailsButtons.length
        };
    }
    
    // Fonction pour simuler un clic sur le premier lien trouvé
    function simulateClick() {
        console.log('🖱️ Simulation d\'un clic sur un lien de code GC...');
        
        const gcLinks = document.querySelectorAll('a[onclick*="handleGeocacheDetailsClick"]');
        if (gcLinks.length === 0) {
            console.log('❌ Aucun lien de code GC trouvé pour simulation');
            return false;
        }
        
        const firstLink = gcLinks[0];
        const gcCode = firstLink.textContent.trim();
        
        console.log(`   - Simulation du clic sur: ${gcCode}`);
        console.log('   - Vérifiez la console pour les messages de handleGeocacheDetailsClick');
        
        // Simuler le clic
        try {
            firstLink.click();
            console.log('✅ Clic simulé avec succès');
            return true;
        } catch (error) {
            console.log('❌ Erreur lors de la simulation:', error.message);
            return false;
        }
    }
    
    // Fonction pour vérifier l'état du LayoutStateManager
    function checkLayoutState() {
        console.log('\n🏗️ État du LayoutStateManager:');
        
        if (window.layoutStateManager) {
            console.log('✅ LayoutStateManager disponible');
            
            if (typeof window.layoutStateManager.debugState === 'function') {
                window.layoutStateManager.debugState();
            } else {
                console.log('   - Méthode debugState non disponible');
            }
        } else {
            console.log('❌ LayoutStateManager non disponible');
        }
    }
    
    // Exposer les fonctions de test globalement
    window.testGeocacheLinks = testGeocacheLinks;
    window.testGeocacheLinks.simulateClick = simulateClick;
    window.testGeocacheLinks.checkLayoutState = checkLayoutState;
    
    // Exécuter automatiquement les tests de base
    console.log('🚀 Exécution automatique des tests...');
    const results = testGeocacheLinks();
    
    // Afficher un résumé
    console.log('\n📋 === RÉSUMÉ DES TESTS ===');
    console.log(`TabOpenerService: ${results.tabOpenerServiceAvailable ? '✅' : '❌'}`);
    console.log(`Fonction intelligente: ${results.handleFunctionExists ? '✅' : '❌'}`);
    console.log(`Liens GC: ${results.gcLinksCount} trouvés`);
    console.log(`Boutons Détails: ${results.detailsButtonsCount} trouvés`);
    
    if (results.tabOpenerServiceAvailable && results.handleFunctionExists && 
        (results.gcLinksCount > 0 || results.detailsButtonsCount > 0)) {
        console.log('🎉 Tous les tests sont RÉUSSIS ! Le système de liens intelligents fonctionne.');
    } else {
        console.log('⚠️ Certains tests ont ÉCHOUÉ. Vérifiez la configuration.');
    }
    
    console.log('\n💡 Commandes disponibles:');
    console.log('   - testGeocacheLinks() : Relancer tous les tests');
    console.log('   - testGeocacheLinks.simulateClick() : Simuler un clic sur un lien');
    console.log('   - testGeocacheLinks.checkLayoutState() : Vérifier l\'état du layout');
    
})(); 