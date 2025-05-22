/**
 * Script de remplacement des boutons d'action problématiques
 */

(function() {
    console.log('=== BUTTON DIRECT: Script de remplacement des boutons chargé ===');
    
    function replaceButtons() {
        console.log('=== BUTTON DIRECT: Début du remplacement des boutons ===');
        
        // Sélectionner tous les boutons d'action
        var buttons = document.querySelectorAll('.geocache-action-button');
        console.log(`=== BUTTON DIRECT: ${buttons.length} boutons trouvés ===`);
        
        // Remplacer chaque bouton par un nouveau bouton simple
        buttons.forEach(function(button, index) {
            // Récupérer les attributs
            var actionType = button.dataset.actionType;
            var geocacheId = button.dataset.geocacheId;
            var gcCode = button.dataset.gcCode;
            var buttonText = button.textContent.trim();
            var buttonClasses = button.className;
            
            console.log(`=== BUTTON DIRECT: Remplacement du bouton ${index}: ${actionType} ===`);
            
            // Créer un nouveau bouton HTML basique
            var newButton = document.createElement('button');
            newButton.className = buttonClasses;
            newButton.innerHTML = button.innerHTML;
            newButton.style.position = 'relative';
            newButton.style.zIndex = '1000';
            newButton.style.cursor = 'pointer';
            newButton.style.border = '2px solid #00ff00'; // Bordure verte pour identifier les boutons réparés
            
            // Stocker les données comme attributs data
            newButton.setAttribute('data-action-type', actionType);
            newButton.setAttribute('data-geocache-id', geocacheId);
            newButton.setAttribute('data-gc-code', gcCode);
            
            // Fonction d'exécution pour le bouton
            function executeAction(openInSameTab) {
                console.log(`=== BUTTON DIRECT: Exécution de l'action ${actionType} avec openInSameTab=${openInSameTab} ===`);
                
                try {
                    switch (actionType) {
                        case 'analyze':
                            if (typeof window.openPluginTab === 'function') {
                                window.openPluginTab('analysis_web_page', `Analyse ${gcCode}`, {
                                    geocacheId: geocacheId,
                                    gcCode: gcCode,
                                    openInSameTab: openInSameTab
                                });
                                console.log('=== BUTTON DIRECT: openPluginTab appelé avec succès ===');
                            } else {
                                alert('Erreur: La fonction d\'ouverture d\'analyse n\'est pas disponible');
                            }
                            break;
                            
                        case 'solver':
                            if (typeof window.openSolverTab === 'function') {
                                window.openSolverTab(geocacheId, gcCode, openInSameTab);
                                console.log('=== BUTTON DIRECT: openSolverTab appelé avec succès ===');
                            } else {
                                alert('Erreur: La fonction d\'ouverture du solver n\'est pas disponible');
                            }
                            break;
                            
                        case 'formula-solver':
                            if (typeof window.openFormulaSolverTab === 'function') {
                                window.openFormulaSolverTab(geocacheId, gcCode, openInSameTab);
                                console.log('=== BUTTON DIRECT: openFormulaSolverTab appelé avec succès ===');
                            } else {
                                alert('Erreur: La fonction d\'ouverture du formula solver n\'est pas disponible');
                            }
                            break;
                            
                        default:
                            alert(`Type d'action inconnu: ${actionType}`);
                    }
                } catch (error) {
                    console.error('=== BUTTON DIRECT: Erreur lors de l\'exécution de l\'action ===', error);
                    alert(`Erreur: ${error.message}`);
                }
            }
            
            // Attacher gestionnaire pour le clic gauche
            newButton.addEventListener('click', function(event) {
                console.log('=== BUTTON DIRECT: Clic gauche sur le bouton ===');
                
                // Vérifier si c'est un Ctrl+Clic
                if (event.ctrlKey || event.metaKey) {
                    console.log('=== BUTTON DIRECT: Ctrl+Clic détecté ===');
                    executeAction(false); // Toujours ouvrir dans un nouvel onglet
                    event.preventDefault();
                    event.stopPropagation();
                } else {
                    console.log('=== BUTTON DIRECT: Clic simple détecté ===');
                    
                    // Vérifier la préférence utilisateur
                    let openInSameTab = true; // Valeur par défaut
                    if (window.PluginGoldenLayoutIntegration && 
                        typeof window.PluginGoldenLayoutIntegration.shouldOpenInSameSection === 'function') {
                        try {
                            openInSameTab = window.PluginGoldenLayoutIntegration.shouldOpenInSameSection();
                            console.log(`=== BUTTON DIRECT: Préférence utilisateur: openInSameTab = ${openInSameTab} ===`);
                        } catch (error) {
                            console.error('=== BUTTON DIRECT: Erreur lors de l\'appel à shouldOpenInSameSection ===', error);
                        }
                    }
                    
                    executeAction(openInSameTab);
                }
                
                return false; // Empêcher le comportement par défaut
            });
            
            // Attacher gestionnaire pour le clic droit
            newButton.addEventListener('contextmenu', function(event) {
                console.log('=== BUTTON DIRECT: Clic droit sur le bouton ===');
                
                // Laisser le gestionnaire de menu contextuel habituel gérer cela
                if (typeof window.showActionButtonContextMenu === 'function') {
                    event.preventDefault();
                    event.stopPropagation();
                    window.showActionButtonContextMenu(event.clientX, event.clientY, newButton);
                }
                
                return false;
            });
            
            // Remplacer l'ancien bouton par le nouveau
            button.parentNode.replaceChild(newButton, button);
            console.log(`=== BUTTON DIRECT: Bouton ${index} (${actionType}) remplacé avec succès ===`);
        });
        
        console.log('=== BUTTON DIRECT: Fin du remplacement des boutons ===');
        
        // Supprimer la bordure verte après 5 secondes
        setTimeout(function() {
            document.querySelectorAll('button[style*="border: 2px solid rgb(0, 255, 0)"]').forEach(function(button) {
                button.style.border = '';
            });
        }, 5000);
    }
    
    // Exécuter le remplacement quand le DOM est prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(replaceButtons, 500);
        });
    } else {
        setTimeout(replaceButtons, 100);
    }
})(); 