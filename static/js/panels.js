        // Gestion des onglets du panneau inférieur
        function showPanel(panelId) {
            // Vérifier que les éléments existent avant de manipuler leurs classes
            const selectedTab = document.querySelector(`.bottom-panel-tab[data-panel="${panelId}"]`);
            const selectedPanel = document.getElementById(panelId);
            const bottomPanelContainer = document.querySelector('.bottom-panel-container');

            if (!selectedTab || !selectedPanel || !bottomPanelContainer) {
                console.error(`Onglet ou panneau introuvable pour l'ID: ${panelId}`);
                return;
            }

            // Si on clique sur l'onglet actif, on bascule la visibilité du panneau
            if (selectedTab.classList.contains('active')) {
                bottomPanelContainer.classList.toggle('expanded');
            } else {
                // Sinon, on active le nouvel onglet et on s'assure que le panneau est ouvert
                // Retirer la classe active de tous les onglets et panneaux
                document.querySelectorAll('.bottom-panel-tab').forEach(tab => {
                    tab.classList.remove('active');
                });
                document.querySelectorAll('.panel-content').forEach(panel => {
                    panel.classList.remove('active');
                });
                
                // Activer l'onglet et le panneau sélectionnés
                selectedTab.classList.add('active');
                selectedPanel.classList.add('active');
                bottomPanelContainer.classList.add('expanded');

                // Si le panneau est réduit, on l'agrandit
                const currentHeight = parseInt(window.getComputedStyle(bottomPanelContainer).height);
                if (currentHeight <= 35) {
                    bottomPanelContainer.style.height = '300px';
                }
            }

            // Mettre à jour la taille de Golden Layout
            if (window.mainLayout) {
                window.mainLayout.updateSize();
            }
        }

        // Gestion des panneaux latéraux
        function showSidePanel(panelId, isRight) {
            const panel = isRight ? rightPanel : leftPanel;
            const button = document.querySelector(`.sidebar-button[data-panel="${panelId}"]`);
            const shiftClass = isRight ? 'shifted-right' : 'shifted-left';
            
            if ((isRight && activeRightButton === button) || (!isRight && activeLeftButton === button)) {
                // Fermeture du panneau actif
                button.classList.remove('active');
                panel.classList.remove('visible');
                mainContent.classList.remove(shiftClass);
                
                panel.style.width = '250px';
                if (isRight) {
                    mainContent.style.marginRight = '0';
                    panel.style.transform = 'translateX(100%)';
                    activeRightButton = null;
                    activeRightPanelId = null;
                } else {
                    mainContent.style.marginLeft = '0';
                    panel.style.transform = 'translateX(-100%)';
                    activeLeftButton = null;
                    activeLeftPanelId = null;
                }
            } else {
                // Fermeture du panneau précédent du même côté s'il existe
                if (isRight && activeRightButton) {
                    activeRightButton.classList.remove('active');
                    rightPanel.classList.remove('visible');
                    mainContent.classList.remove('shifted-right');
                    rightPanel.style.transform = 'translateX(100%)';
                } else if (!isRight && activeLeftButton) {
                    activeLeftButton.classList.remove('active');
                    leftPanel.classList.remove('visible');
                    mainContent.classList.remove('shifted-left');
                    leftPanel.style.transform = 'translateX(-100%)';
                }
                
                // Ouverture du nouveau panneau
                button.classList.add('active');
                panel.classList.add('visible');
                mainContent.classList.add(shiftClass);
                
                panel.style.transform = 'translateX(0)';
                const currentWidth = panel.style.width || '250px';
                if (isRight) {
                    mainContent.style.marginRight = currentWidth;
                    activeRightButton = button;
                    activeRightPanelId = panelId;
                } else {
                    mainContent.style.marginLeft = currentWidth;
                    activeLeftButton = button;
                    activeLeftPanelId = panelId;
                }
                
                // Charger le contenu du panneau si nécessaire
                loadPanelContent(panelId, isRight);
            }

            if (window.mainLayout) {
                setTimeout(() => {
                    window.mainLayout.updateSize();
                }, 300);
            }
        }

        // Chargement du contenu des panneaux latéraux
        function loadPanelContent(panelId, isRight) {
            const panel = isRight ? rightPanel : leftPanel;
            const panelContent = panel.querySelector('.side-panel-content');
            
            if (!panelContent) {
                console.error('Conteneur de contenu non trouvé dans le panneau');
                return;
            }

            // Masquer tous les panneaux de contenu
            panelContent.querySelectorAll('.panel-content').forEach(content => {
                content.classList.remove('active');
            });

            // Afficher le panneau sélectionné
            const selectedPanel = document.getElementById(`${panelId}-panel`);
            if (selectedPanel) {
                selectedPanel.classList.add('active');
                if (panelId === 'geocaches') {
                    // Le contenu est déjà chargé par HTMX au chargement initial
                    console.log('Panneau geocaches activé');
                }
            } else {
                console.warn(`Panneau ${panelId} non trouvé, création d'un panneau par défaut`);
                // Créer un panneau par défaut s'il n'existe pas
                const defaultPanel = document.createElement('div');
                defaultPanel.id = `${panelId}-panel`;
                defaultPanel.className = 'h-full p-4 panel-content active';
                defaultPanel.innerHTML = `
                    <div class="panel-header border-b border-gray-700 p-2">
                        <h2 class="text-lg font-semibold">${panelId.charAt(0).toUpperCase() + panelId.slice(1)}</h2>
                    </div>
                    <div class="panel-body">
                        <p class="text-gray-400 mt-4">Contenu en cours de développement</p>
                    </div>
                `;
                panelContent.appendChild(defaultPanel);
            }
        }

        // Fonction de gestion du redimensionnement
        function handleResize(e, panel, isRight) {
            if (!isResizing) return;

            if (panel === bottomPanel) {
                // Gestion du redimensionnement vertical
                const diff = startY - e.clientY;
                const newHeight = Math.min(800, Math.max(35, startHeight + diff));
                
                // Mettre à jour la hauteur du panneau inférieur
                panel.style.height = newHeight + 'px';
                
                // Mettre à jour la hauteur du conteneur Golden Layout
                const totalHeight = panel.parentElement.clientHeight;
                goldenLayoutContainer.style.height = (totalHeight - newHeight) + 'px';
                
                // Mettre à jour les classes en fonction de la hauteur
                if (newHeight <= 35) {
                    panel.classList.remove('visible');
                } else {
                    panel.classList.add('visible');
                }
            } else {
                // Gestion du redimensionnement horizontal (panneaux latéraux)
                const rect = panel.getBoundingClientRect();
                const width = isRight 
                    ? Math.min(800, Math.max(100, rect.right - e.clientX))
                    : Math.min(800, Math.max(100, e.clientX - rect.left));
                
                panel.style.width = width + 'px';
                if (isRight) {
                    mainContent.style.marginRight = width + 'px';
                } else {
                    mainContent.style.marginLeft = width + 'px';
                }
            }

            // Mettre à jour le layout
            if (window.mainLayout) {
                window.mainLayout.updateSize();
            }
        }

        document.addEventListener('DOMContentLoaded', function() {
            // Initialisation des références DOM
            mainContent = document.getElementById('main-content');
            leftPanel = document.querySelector('.side-panel:not(.right-panel)');
            rightPanel = document.querySelector('.side-panel.right-panel');
            bottomPanel = document.querySelector('.bottom-panel-container');
            goldenLayoutContainer = document.querySelector('.golden-layout-container');
            bottomPanelResizer = document.querySelector('.bottom-panel-resizer');

            // Variables pour le redimensionnement
            let isResizing = false;
            let startY = 0;
            let startHeight = 0;

            // Gestion du redimensionnement du panneau inférieur
            if (bottomPanelResizer) {
                bottomPanelResizer.addEventListener('mousedown', function(e) {
                    isResizing = true;
                    startY = e.clientY;
                    startHeight = bottomPanel.offsetHeight;
                    
                    bottomPanelResizer.classList.add('resizing');
                    document.body.style.cursor = 'ns-resize';
                    
                    // Désactiver la transition pendant le redimensionnement
                    bottomPanel.style.transition = 'none';
                });

                document.addEventListener('mousemove', function(e) {
                    if (!isResizing) return;
                    
                    const delta = startY - e.clientY;
                    const newHeight = Math.min(Math.max(startHeight + delta, 35), 800);
                    bottomPanel.style.height = newHeight + 'px';
                    
                    if (window.mainLayout) {
                        window.mainLayout.updateSize();
                    }
                });

                document.addEventListener('mouseup', function() {
                    if (!isResizing) return;
                    
                    isResizing = false;
                    bottomPanelResizer.classList.remove('resizing');
                    document.body.style.cursor = '';
                    
                    // Réactiver la transition
                    bottomPanel.style.transition = '';
                });
            }

            // Gestion des clics sur les onglets du panneau inférieur
            document.querySelectorAll('.bottom-panel-tab').forEach(tab => {
                tab.addEventListener('click', function() {
                    const panelId = this.getAttribute('data-panel');
                    showPanel(panelId);
                });
            });

            // Gestion des boutons des panneaux latéraux
            document.querySelectorAll('.sidebar-button').forEach(button => {
                button.addEventListener('click', function() {
                    const panelId = this.dataset.panel;
                    const isRight = this.dataset.side === 'right';
                    showSidePanel(panelId, isRight);
                });
            });

            // Gestionnaires d'événements pour le redimensionnement
            [leftPanel.querySelector('.resizer'), rightPanel.querySelector('.resizer')].forEach(resizer => {
                const isRight = resizer === rightPanel.querySelector('.resizer');
                const panel = isRight ? rightPanel : leftPanel;
                
                resizer.addEventListener('mousedown', function(e) {
                    if (!panel.classList.contains('visible')) return;
                    
                    isResizing = true;
                    activePanel = panel;
                    document.body.classList.add('resizing');
                    
                    panel.style.transition = 'none';
                    mainContent.style.transition = 'none';
                    
                    e.preventDefault();
                });
            });

            document.addEventListener('mousemove', function(e) {
                if (!isResizing || !activePanel) return;
                handleResize(e, activePanel, activePanel === rightPanel);
            });

            document.addEventListener('mouseup', function() {
                if (!isResizing) return;
                
                isResizing = false;
                document.body.classList.remove('resizing');
                
                if (activePanel) {
                    activePanel.style.transition = '';
                    if (activePanel === bottomPanel) {
                        goldenLayoutContainer.style.transition = '';
                        const currentHeight = parseInt(window.getComputedStyle(bottomPanel).height);
                        isBottomPanelVisible = currentHeight > 35;
                    }
                    activePanel = null;
                }
            });

            // Initialisation du layout
            initializeLayout();
        });

        // Fonction de gestion du redimensionnement
        function handleResize(e, panel, isRight) {
            if (!isResizing) return;

            if (panel === bottomPanel) {
                // Gestion du redimensionnement vertical
                const diff = startY - e.clientY;
                const newHeight = Math.min(800, Math.max(35, startHeight + diff));
                
                // Mettre à jour la hauteur du panneau inférieur
                panel.style.height = newHeight + 'px';
                
                // Mettre à jour la hauteur du conteneur Golden Layout
                const totalHeight = panel.parentElement.clientHeight;
                goldenLayoutContainer.style.height = (totalHeight - newHeight) + 'px';
                
                // Mettre à jour les classes en fonction de la hauteur
                if (newHeight <= 35) {
                    panel.classList.remove('visible');
                } else {
                    panel.classList.add('visible');
                }
            } else {
                // Gestion du redimensionnement horizontal (panneaux latéraux)
                const rect = panel.getBoundingClientRect();
                const width = isRight 
                    ? Math.min(800, Math.max(100, rect.right - e.clientX))
                    : Math.min(800, Math.max(100, e.clientX - rect.left));
                
                panel.style.width = width + 'px';
                if (isRight) {
                    mainContent.style.marginRight = width + 'px';
                } else {
                    mainContent.style.marginLeft = width + 'px';
                }
            }

            // Mettre à jour le layout
            if (window.mainLayout) {
                window.mainLayout.updateSize();
            }
        }