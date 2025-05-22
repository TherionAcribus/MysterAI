/**
 * Script de réparation des boutons d'action
 */

// Exécuter immédiatement lors du chargement
(function() {
    // Fonction pour initialiser les boutons
    function fixButtons() {
        console.log('=== BUTTON FIX: Initialisation des boutons ===');
        
        // Sélectionner tous les boutons d'action
        var buttons = document.querySelectorAll('.geocache-action-button');
        console.log(`=== BUTTON FIX: ${buttons.length} boutons trouvés ===`);
        
        // Appliquer la correction à chaque bouton
        buttons.forEach(function(button) {
            // Ajouter un attribut style direct pour s'assurer que le bouton est visible
            button.style.position = 'relative';
            button.style.zIndex = '999';
            button.style.cursor = 'pointer';
            
            // Ajouter une bordure temporaire pour visualiser le bouton
            button.style.border = '2px dashed #ff0000';
            
            // Récupérer les attributs
            var actionType = button.dataset.actionType;
            var geocacheId = button.dataset.geocacheId;
            var gcCode = button.dataset.gcCode;
            
            console.log(`=== BUTTON FIX: Bouton configuré: ${actionType} ===`);
            
            // Attacher un gestionnaire d'événement
            button.onclick = function(event) {
                console.log(`=== BUTTON FIX: Clic sur le bouton ${actionType} ===`);
                alert(`Bouton cliqué: ${actionType}, ID: ${geocacheId}, GC: ${gcCode}`);
                
                // Vérifier le mode d'ouverture
                var openInSameTab = true;
                if (event.ctrlKey || event.metaKey) {
                    openInSameTab = false;
                } else if (window.PluginGoldenLayoutIntegration && 
                         typeof window.PluginGoldenLayoutIntegration.shouldOpenInSameSection === 'function') {
                    openInSameTab = window.PluginGoldenLayoutIntegration.shouldOpenInSameSection();
                }
                
                // Exécuter l'action en fonction du type
                try {
                    if (actionType === 'analyze') {
                        if (typeof window.openPluginTab === 'function') {
                            window.openPluginTab('analysis_web_page', `Analyse ${gcCode}`, {
                                geocacheId: geocacheId,
                                gcCode: gcCode,
                                openInSameTab: openInSameTab
                            });
                        }
                    } else if (actionType === 'solver') {
                        if (typeof window.openSolverTab === 'function') {
                            window.openSolverTab(geocacheId, gcCode, openInSameTab);
                        }
                    } else if (actionType === 'formula-solver') {
                        if (typeof window.openFormulaSolverTab === 'function') {
                            window.openFormulaSolverTab(geocacheId, gcCode, openInSameTab);
                        }
                    }
                } catch (error) {
                    console.error('=== BUTTON FIX: Erreur ===', error);
                    alert(`Erreur: ${error.message}`);
                }
                
                // Empêcher l'événement par défaut pour les Ctrl+Clic
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                
                return false; // Désactiver le comportement par défaut
            };
        });
        
        console.log('=== BUTTON FIX: Initialisation terminée ===');
        
        // Après 5 secondes, supprimer les bordures
        setTimeout(function() {
            buttons.forEach(function(button) {
                button.style.border = '';
            });
        }, 5000);
    }
    
    // Exécuter lorsque le document est prêt
    document.addEventListener('DOMContentLoaded', function() {
        // Attendre un peu pour s'assurer que tout est chargé
        setTimeout(fixButtons, 1000);
    });
    
    // Exécuter également maintenant au cas où le document est déjà chargé
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(fixButtons, 100);
    }
})(); 