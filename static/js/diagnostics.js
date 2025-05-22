/**
 * Script de diagnostic pour les problèmes de boutons d'action
 */

(function() {
    console.log('=== DIAGNOSTIC: Script de diagnostic chargé ===');
    
    // Fonction pour attendre que le DOM soit complètement chargé
    function whenDOMReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }
    
    // Fonction de diagnostic principale
    function runDiagnostics() {
        console.log('=== DIAGNOSTIC: Début du diagnostic ===');
        
        // Vérifier la présence des boutons d'action
        const buttons = document.querySelectorAll('.geocache-action-button');
        console.log(`=== DIAGNOSTIC: ${buttons.length} boutons d'action trouvés ===`);
        
        if (buttons.length === 0) {
            console.error('=== DIAGNOSTIC: Aucun bouton d\'action trouvé, vérifiez les classes CSS ===');
            return;
        }
        
        // Vérifier que les boutons ont les attributs nécessaires
        let allButtonsValid = true;
        buttons.forEach((button, index) => {
            const actionType = button.dataset.actionType;
            const geocacheId = button.dataset.geocacheId;
            const gcCode = button.dataset.gcCode;
            
            console.log(`=== DIAGNOSTIC: Bouton ${index} ===`, {
                element: button,
                actionType: actionType,
                geocacheId: geocacheId,
                gcCode: gcCode
            });
            
            if (!actionType || !geocacheId || !gcCode) {
                console.error(`=== DIAGNOSTIC: Attributs manquants sur le bouton ${index} ===`);
                allButtonsValid = false;
            }
        });
        
        if (!allButtonsValid) {
            console.error('=== DIAGNOSTIC: Certains boutons n\'ont pas tous les attributs nécessaires ===');
        }
        
        // Vérifier la disponibilité des fonctions d'ouverture d'onglet
        console.log('=== DIAGNOSTIC: Vérification des fonctions d\'ouverture d\'onglet ===');
        console.log('window.openPluginTab disponible:', typeof window.openPluginTab === 'function');
        console.log('window.openSolverTab disponible:', typeof window.openSolverTab === 'function');
        console.log('window.openFormulaSolverTab disponible:', typeof window.openFormulaSolverTab === 'function');
        
        // Vérifier GoldenLayout Integration
        console.log('=== DIAGNOSTIC: Vérification de PluginGoldenLayoutIntegration ===');
        console.log('window.PluginGoldenLayoutIntegration disponible:', typeof window.PluginGoldenLayoutIntegration !== 'undefined');
        
        if (window.PluginGoldenLayoutIntegration) {
            console.log('shouldOpenInSameSection disponible:', typeof window.PluginGoldenLayoutIntegration.shouldOpenInSameSection === 'function');
            if (typeof window.PluginGoldenLayoutIntegration.shouldOpenInSameSection === 'function') {
                try {
                    const value = window.PluginGoldenLayoutIntegration.shouldOpenInSameSection();
                    console.log('Valeur de shouldOpenInSameSection:', value);
                } catch (error) {
                    console.error('Erreur lors de l\'appel à shouldOpenInSameSection:', error);
                }
            }
        } else {
            console.error('=== DIAGNOSTIC: PluginGoldenLayoutIntegration n\'est pas disponible ===');
        }
        
        // Corriger les boutons en attachant des gestionnaires d'événements directs
        console.log('=== DIAGNOSTIC: Application de correctifs aux boutons ===');
        
        buttons.forEach((button, index) => {
            console.log(`=== DIAGNOSTIC: Correction du bouton ${index} ===`);
            
            // Supprimer tous les gestionnaires d'événements existants
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Ajouter des gestionnaires d'événements directs
            newButton.addEventListener('click', function(event) {
                console.log(`=== DIAGNOSTIC: Clic sur le bouton ${index} ===`);
                
                const actionType = this.dataset.actionType;
                const geocacheId = this.dataset.geocacheId;
                const gcCode = this.dataset.gcCode;
                
                console.log(`=== DIAGNOSTIC: Action: ${actionType}, ID: ${geocacheId}, GC: ${gcCode} ===`);
                
                // Déterminer le mode d'ouverture
                const isCtrlOrCmdClick = event.ctrlKey || event.metaKey;
                const openInSameTab = !isCtrlOrCmdClick; // Par défaut pour le mode simple
                
                // Vérifier la préférence utilisateur pour le clic normal
                let shouldOpenInSameTab = openInSameTab;
                if (!isCtrlOrCmdClick && window.PluginGoldenLayoutIntegration && 
                    typeof window.PluginGoldenLayoutIntegration.shouldOpenInSameSection === 'function') {
                    try {
                        shouldOpenInSameTab = window.PluginGoldenLayoutIntegration.shouldOpenInSameSection();
                        console.log(`=== DIAGNOSTIC: Configuration utilisateur: openInSameTab = ${shouldOpenInSameTab} ===`);
                    } catch (error) {
                        console.error('=== DIAGNOSTIC: Erreur lors de l\'appel à shouldOpenInSameSection ===', error);
                    }
                }
                
                // Exécuter l'action en fonction du type
                try {
                    switch (actionType) {
                        case 'analyze':
                            console.log(`=== DIAGNOSTIC: Appel de openPluginTab pour analyze ===`);
                            if (typeof window.openPluginTab === 'function') {
                                window.openPluginTab('analysis_web_page', `Analyse ${gcCode}`, {
                                    geocacheId: geocacheId,
                                    gcCode: gcCode,
                                    openInSameTab: shouldOpenInSameTab
                                });
                                console.log('=== DIAGNOSTIC: openPluginTab appelé avec succès ===');
                            } else {
                                console.error('=== DIAGNOSTIC: La fonction openPluginTab n\'est pas disponible ===');
                                alert('Erreur: La fonction d\'ouverture d\'analyse n\'est pas disponible');
                            }
                            break;
                            
                        case 'solver':
                            console.log(`=== DIAGNOSTIC: Appel de openSolverTab ===`);
                            if (typeof window.openSolverTab === 'function') {
                                window.openSolverTab(geocacheId, gcCode, shouldOpenInSameTab);
                                console.log('=== DIAGNOSTIC: openSolverTab appelé avec succès ===');
                            } else {
                                console.error('=== DIAGNOSTIC: La fonction openSolverTab n\'est pas disponible ===');
                                alert('Erreur: La fonction d\'ouverture du solver n\'est pas disponible');
                            }
                            break;
                            
                        case 'formula-solver':
                            console.log(`=== DIAGNOSTIC: Appel de openFormulaSolverTab ===`);
                            if (typeof window.openFormulaSolverTab === 'function') {
                                window.openFormulaSolverTab(geocacheId, gcCode, shouldOpenInSameTab);
                                console.log('=== DIAGNOSTIC: openFormulaSolverTab appelé avec succès ===');
                            } else {
                                console.error('=== DIAGNOSTIC: La fonction openFormulaSolverTab n\'est pas disponible ===');
                                alert('Erreur: La fonction d\'ouverture du formula solver n\'est pas disponible');
                            }
                            break;
                            
                        default:
                            console.error(`=== DIAGNOSTIC: Type d'action inconnu: ${actionType} ===`);
                            alert(`Erreur: Type d'action inconnu: ${actionType}`);
                    }
                } catch (error) {
                    console.error('=== DIAGNOSTIC: Erreur lors de l\'exécution de l\'action ===', error);
                    alert(`Erreur: ${error.message}`);
                }
                
                // Arrêter la propagation pour Ctrl+Clic
                if (isCtrlOrCmdClick) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            });
            
            console.log(`=== DIAGNOSTIC: Gestionnaire de clic ajouté au bouton ${index} ===`);
        });
        
        console.log('=== DIAGNOSTIC: Fin du diagnostic et application des correctifs ===');
    }
    
    // Exécuter les diagnostics lorsque le DOM est prêt
    whenDOMReady(function() {
        console.log('=== DIAGNOSTIC: DOM prêt, exécution du diagnostic ===');
        // Exécuter après un court délai pour s'assurer que tous les autres scripts sont chargés
        setTimeout(runDiagnostics, 500);
    });
})(); 