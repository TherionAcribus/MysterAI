/**
 * Service pour gérer l'ouverture intelligente des onglets
 * Respecte le paramètre open_tab_in_same_section et propose un menu contextuel
 */
class TabOpenerService {
    constructor() {
        this.CACHE_DURATION = 30000; // 30 secondes
        this.settingsCache = null;
        this.cacheExpiry = null;
        this.eventListenersInitialized = false; // Flag pour éviter les doublons
        this.currentContextMenu = null; // Menu contextuel actuel
        
        console.log('🔧 TabOpenerService: Initialisation du service');
        this.initializeEventListeners();
        this.initializeContextMenu();
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
        
        // Écouter les clics gauches sur tous les boutons avec data-tab-opener
        document.addEventListener('click', (event) => {
            const button = event.target.closest('[data-tab-opener]');
            if (button && event.button === 0) { // Clic gauche uniquement
                console.log('🖱️ TabOpenerService: Clic gauche détecté sur bouton avec data-tab-opener:', button);
                
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
        
        // Écouter les clics droits pour le menu contextuel
        document.addEventListener('contextmenu', (event) => {
            console.log('🖱️ DEBUG: Événement contextmenu détecté sur:', event.target);
            const button = event.target.closest('[data-tab-opener]');
            if (button) {
                console.log('🖱️ TabOpenerService: Clic droit détecté sur bouton avec data-tab-opener:', button);
                console.log('🔍 DEBUG: Attributs du bouton:', {
                    opener: button.getAttribute('data-tab-opener'),
                    title: button.getAttribute('data-tab-title'),
                    uniqueId: button.getAttribute('data-tab-unique-id')
                });
                
                // Parser la configuration du bouton
                const config = this.parseButtonConfig(button);
                if (config) {
                    console.log('🎯 TabOpener: Configuration parsée pour menu contextuel:', config);
                    this.showContextMenu(event, config);
                } else {
                    console.error('❌ TabOpener: Impossible de parser la configuration pour le menu contextuel');
                }
            } else {
                console.log('🖱️ DEBUG: Clic droit sur élément sans data-tab-opener');
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
     * Initialise le système de menu contextuel
     */
    initializeContextMenu() {
        console.log('🎯 TabOpenerService: Initialisation du menu contextuel');
        
        // Créer le conteneur du menu contextuel
        this.createContextMenuElement();
        
        // Initialiser les écouteurs pour fermer le menu
        this.initializeContextMenuCloseListeners();
    }
    
    /**
     * Initialise les écouteurs pour fermer le menu contextuel
     */
    initializeContextMenuCloseListeners() {
        console.log('🎧 TabOpenerService: Initialisation des écouteurs de fermeture du menu');
        
        // Supprimer les anciens écouteurs s'ils existent
        if (this.documentClickHandler) {
            document.removeEventListener('click', this.documentClickHandler, true);
            document.removeEventListener('click', this.documentClickHandler, false);
            console.log('🗑️ TabOpenerService: Ancien documentClickHandler supprimé');
        }
        if (this.documentKeyHandler) {
            document.removeEventListener('keydown', this.documentKeyHandler);
            console.log('🗑️ TabOpenerService: Ancien documentKeyHandler supprimé');
        }
        if (this.documentScrollHandler) {
            document.removeEventListener('scroll', this.documentScrollHandler, true);
            window.removeEventListener('resize', this.documentScrollHandler);
            console.log('🗑️ TabOpenerService: Ancien documentScrollHandler supprimé');
        }
        
        // Créer les nouvelles fonctions de gestion
        this.documentClickHandler = (event) => {
            console.log('🖱️ DEBUG: Clic détecté:', {
                currentContextMenu: !!this.currentContextMenu,
                target: event.target,
                button: event.button
            });
            
            // Vérifier si le menu est ouvert
            if (!this.currentContextMenu) {
                console.log('🖱️ DEBUG: Pas de menu ouvert, ignoré');
                return;
            }
            
            const menu = document.getElementById('tab-opener-context-menu');
            if (!menu) {
                console.log('🖱️ DEBUG: Menu DOM introuvable, reset currentContextMenu');
                this.currentContextMenu = null;
                return;
            }
            
            if (menu.style.display === 'none') {
                console.log('🖱️ DEBUG: Menu caché, reset currentContextMenu');
                this.currentContextMenu = null;
                return;
            }
            
            // Vérifier si le clic est en dehors du menu
            const isClickOutside = !menu.contains(event.target);
            console.log('🖱️ DEBUG: Clic en dehors du menu?', isClickOutside);
            
            if (isClickOutside) {
                console.log('🖱️ TabOpenerService: Clic en dehors du menu, fermeture');
                this.hideContextMenu();
            } else {
                console.log('🖱️ DEBUG: Clic à l\'intérieur du menu, pas de fermeture');
            }
        };
        
        this.documentKeyHandler = (event) => {
            if (event.key === 'Escape' && this.currentContextMenu) {
                console.log('⌨️ TabOpenerService: Touche Échap pressée, fermeture du menu');
                this.hideContextMenu();
            }
        };
        
        // Écouteur pour le scroll (fermer le menu si on scroll)
        this.documentScrollHandler = () => {
            if (this.currentContextMenu) {
                console.log('📜 TabOpenerService: Scroll détecté, fermeture du menu');
                this.hideContextMenu();
            }
        };
        
        // Ajouter les nouveaux écouteurs avec une approche plus robuste
        document.addEventListener('click', this.documentClickHandler, true); // Phase de capture
        document.addEventListener('click', this.documentClickHandler, false); // Phase de bubble
        document.addEventListener('keydown', this.documentKeyHandler);
        document.addEventListener('scroll', this.documentScrollHandler, true);
        window.addEventListener('resize', this.documentScrollHandler);
        
        // Ajouter un écouteur de sauvegarde avec un délai
        this.backupClickHandler = (event) => {
            setTimeout(() => {
                if (this.currentContextMenu) {
                    const menu = document.getElementById('tab-opener-context-menu');
                    if (menu && menu.style.display !== 'none') {
                        if (!menu.contains(event.target)) {
                            console.log('🔄 TabOpenerService: Fermeture via backup handler');
                            this.hideContextMenu();
                        }
                    }
                }
            }, 10);
        };
        
        // Ajouter le handler de sauvegarde
        setTimeout(() => {
            document.addEventListener('mousedown', this.backupClickHandler, true);
        }, 100);
        
        console.log('✅ TabOpenerService: Écouteurs de fermeture initialisés (avec backup)');
    }
    
    /**
     * Crée l'élément DOM du menu contextuel
     */
    createContextMenuElement() {
        // Vérifier que document.body existe
        if (!document.body) {
            console.log('⚠️ TabOpenerService: document.body non disponible, attente...');
            
            // Retarder la création jusqu'à ce que le DOM soit prêt
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    console.log('📅 TabOpenerService: DOM prêt, création du menu contextuel');
                    this.createContextMenuElement();
                });
                return;
            } else {
                // Si le readyState n'est pas 'loading' mais body n'existe pas, attendre un peu
                setTimeout(() => {
                    this.createContextMenuElement();
                }, 100);
                return;
            }
        }
        
        // Supprimer l'ancien menu s'il existe
        const existingMenu = document.getElementById('tab-opener-context-menu');
        if (existingMenu) {
            existingMenu.remove();
            console.log('🗑️ TabOpenerService: Ancien menu supprimé');
        }
        
        // Créer le nouveau menu
        const menu = document.createElement('div');
        menu.id = 'tab-opener-context-menu';
        menu.className = 'tab-opener-context-menu';
        menu.style.cssText = `
            position: fixed;
            z-index: 10000;
            background: white;
            border: 1px solid #ddd;
            border-radius: 6px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            padding: 6px 0;
            min-width: 220px;
            display: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            opacity: 1;
            transition: opacity 0.1s ease;
        `;
        
        try {
            document.body.appendChild(menu);
            console.log('✅ TabOpenerService: Menu contextuel créé avec succès');
        } catch (error) {
            console.error('❌ TabOpenerService: Erreur lors de la création du menu:', error);
            
            // Réessayer dans un moment
            setTimeout(() => {
                console.log('🔄 TabOpenerService: Nouvel essai de création du menu...');
                this.createContextMenuElement();
            }, 500);
        }
    }
    
    /**
     * Affiche le menu contextuel
     */
    showContextMenu(event, buttonConfig) {
        console.log('📋 TabOpenerService: Affichage du menu contextuel pour:', buttonConfig);
        console.log('🔍 DEBUG: Type de bouton:', buttonConfig.type);
        console.log('🔍 DEBUG: État du bouton:', buttonConfig.state);
        
        let menu = document.getElementById('tab-opener-context-menu');
        if (!menu) {
            console.log('⚠️ TabOpenerService: Menu contextuel non trouvé, création...');
            
            // Vérifier que document.body existe avant de créer
            if (!document.body) {
                console.error('❌ TabOpenerService: document.body non disponible, impossible de créer le menu');
                return;
            }
            
            this.createContextMenuElement();
            menu = document.getElementById('tab-opener-context-menu');
            
            if (!menu) {
                console.error('❌ TabOpenerService: Impossible de créer le menu contextuel');
                return;
            }
        }
        
        // Vider le menu
        menu.innerHTML = '';
        
        // Créer les options du menu
        this.createContextMenuItems(menu, buttonConfig);
        
        // Positionner le menu
        menu.style.left = event.pageX + 'px';
        menu.style.top = event.pageY + 'px';
        menu.style.display = 'block';
        
        // Ajuster la position si le menu dépasse de l'écran
        this.adjustMenuPosition(menu, event);
        
        this.currentContextMenu = menu;
        
        // Empêcher la propagation de l'événement
        event.preventDefault();
        event.stopPropagation();
        
        console.log('✅ TabOpenerService: Menu contextuel affiché et état mis à jour');
        console.log('📋 DEBUG: État du service après affichage:', {
            currentContextMenu: !!this.currentContextMenu,
            documentClickHandler: !!this.documentClickHandler,
            menuVisible: menu.style.display,
            menuPosition: { left: menu.style.left, top: menu.style.top }
        });
    }
    
    /**
     * Crée les éléments du menu contextuel
     */
    createContextMenuItems(menu, buttonConfig) {
        console.log('🎯 TabOpenerService: Création des éléments du menu contextuel');
        
        // Option 1: Ouvrir dans la même section
        const sameSection = this.createMenuItem(
            '📌 Ouvrir dans la même section',
            'Ajouter l\'onglet à une section existante',
            () => {
                console.log('📌 Menu: Ouverture dans la même section');
                this.hideContextMenu();
                this.openTab(buttonConfig, true);
            }
        );
        menu.appendChild(sameSection);
        
        // Option 2: Ouvrir dans une nouvelle section
        const newSection = this.createMenuItem(
            '🆕 Ouvrir dans une nouvelle section',
            'Créer une nouvelle section pour cet onglet',
            () => {
                console.log('🆕 Menu: Ouverture dans une nouvelle section');
                this.hideContextMenu();
                this.openTab(buttonConfig, false);
            }
        );
        menu.appendChild(newSection);
        
        // Séparateur
        const separator = document.createElement('div');
        separator.style.cssText = `
            height: 1px;
            background: #eee;
            margin: 4px 0;
        `;
        menu.appendChild(separator);
        
        // Option 3: Fermer le menu
        const closeMenu = this.createMenuItem(
            '❌ Fermer',
            'Fermer ce menu contextuel',
            () => {
                console.log('❌ Menu: Fermeture du menu');
                this.hideContextMenu();
            }
        );
        menu.appendChild(closeMenu);
        
        // Ajouter des options personnalisées si le bouton en a
        this.addCustomMenuItems(menu, buttonConfig);
    }
    
    /**
     * Crée un élément de menu
     */
    createMenuItem(text, tooltip, onClick) {
        const item = document.createElement('div');
        item.className = 'tab-opener-menu-item';
        item.textContent = text;
        item.title = tooltip;
        item.style.cssText = `
            padding: 10px 16px;
            cursor: pointer;
            transition: background-color 0.2s;
            white-space: nowrap;
            border-radius: 2px;
            margin: 1px 4px;
            user-select: none;
        `;
        
        // Événements hover
        item.addEventListener('mouseenter', () => {
            item.style.backgroundColor = '#e3f2fd';
            item.style.color = '#1976d2';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.backgroundColor = 'transparent';
            item.style.color = 'inherit';
        });
        
        // Événement clic avec meilleure gestion
        item.addEventListener('click', (event) => {
            console.log('🖱️ Menu: Clic sur option:', text);
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            
            // Exécuter l'action
            try {
                onClick();
            } catch (error) {
                console.error('❌ Menu: Erreur lors de l\'exécution de l\'action:', error);
            }
        });
        
        // Aussi écouter mousedown pour être plus réactif
        item.addEventListener('mousedown', (event) => {
            event.preventDefault();
            event.stopPropagation();
        });
        
        return item;
    }
    
    /**
     * Ajoute des options personnalisées au menu selon le type de bouton
     */
    addCustomMenuItems(menu, buttonConfig) {
        console.log('🎨 TabOpenerService: Vérification des options personnalisées');
        
        // Exemple d'options personnalisées selon le type
        switch (buttonConfig.type) {
            case 'plugin':
                this.addPluginCustomItems(menu, buttonConfig);
                break;
            case 'formula-solver':
                this.addFormulaSolverCustomItems(menu, buttonConfig);
                break;
            case 'geocache-details':
                this.addGeocacheDetailsCustomItems(menu, buttonConfig);
                break;
            case 'geocaches-table':
                this.addGeocachesTableCustomItems(menu, buttonConfig);
                break;
        }
        
        // Vérifier les attributs data-tab-menu-* pour des options personnalisées
        this.addDataAttributeMenuItems(menu, buttonConfig);
    }
    
    /**
     * Ajoute des options personnalisées pour les plugins
     */
    addPluginCustomItems(menu, buttonConfig) {
        if (buttonConfig.state && buttonConfig.state.pluginName) {
            // Séparateur pour les options du plugin
            const separator = document.createElement('div');
            separator.style.cssText = `height: 1px; background: #eee; margin: 4px 0;`;
            menu.appendChild(separator);
            
            // Option: Ouvrir l'aide du plugin
            const helpItem = this.createMenuItem(
                '❓ Aide du plugin',
                'Afficher l\'aide pour ce plugin',
                () => {
                    console.log('❓ Menu: Ouverture de l\'aide du plugin');
                    this.hideContextMenu();
                    this.openPluginHelp(buttonConfig.state.pluginName);
                }
            );
            menu.appendChild(helpItem);
        }
    }
    
    /**
     * Ajoute des options personnalisées pour le Formula Solver
     */
    addFormulaSolverCustomItems(menu, buttonConfig) {
        if (buttonConfig.state && buttonConfig.state.geocacheId) {
            // Séparateur
            const separator = document.createElement('div');
            separator.style.cssText = `height: 1px; background: #eee; margin: 4px 0;`;
            menu.appendChild(separator);
            
            // Option: Ouvrir les détails de la géocache
            const detailsItem = this.createMenuItem(
                '🗺️ Détails de la géocache',
                'Voir les détails de cette géocache',
                () => {
                    console.log('🗺️ Menu: Ouverture des détails de la géocache');
                    this.hideContextMenu();
                    this.openGeocacheDetails(buttonConfig.state.geocacheId);
                }
            );
            menu.appendChild(detailsItem);
        }
    }
    
    /**
     * Ajoute des options personnalisées pour les détails de géocache
     */
    addGeocacheDetailsCustomItems(menu, buttonConfig) {
        if (buttonConfig.state && buttonConfig.state.geocacheId) {
            // Séparateur
            const separator = document.createElement('div');
            separator.style.cssText = `height: 1px; background: #eee; margin: 4px 0;`;
            menu.appendChild(separator);
            
            // Option: Ouvrir le Formula Solver
            const solverItem = this.createMenuItem(
                '🧮 Formula Solver',
                'Ouvrir le Formula Solver pour cette géocache',
                () => {
                    console.log('🧮 Menu: Ouverture du Formula Solver');
                    this.hideContextMenu();
                    this.openFormulaSolver(buttonConfig.state.geocacheId, buttonConfig.state.gcCode);
                }
            );
            menu.appendChild(solverItem);
        }
    }
    
    /**
     * Ajoute des options personnalisées pour les tables de géocaches
     */
    addGeocachesTableCustomItems(menu, buttonConfig) {
        if (buttonConfig.state && buttonConfig.state.zoneName) {
            // Séparateur
            const separator = document.createElement('div');
            separator.style.cssText = `height: 1px; background: #eee; margin: 4px 0;`;
            menu.appendChild(separator);
            
            // Option: Ouvrir sur la carte
            const mapItem = this.createMenuItem(
                '🗺️ Voir sur la carte',
                'Afficher cette zone sur la carte des géocaches',
                () => {
                    console.log('🗺️ Menu: Ouverture de la carte pour la zone');
                    this.hideContextMenu();
                    this.openZoneOnMap(buttonConfig.state.zoneId, buttonConfig.state.zoneName);
                }
            );
            menu.appendChild(mapItem);
            
            // Option: Exporter la zone
            const exportItem = this.createMenuItem(
                '📤 Exporter la zone',
                'Exporter les géocaches de cette zone',
                () => {
                    console.log('📤 Menu: Export de la zone');
                    this.hideContextMenu();
                    this.exportZone(buttonConfig.state.zoneId, buttonConfig.state.zoneName);
                }
            );
            menu.appendChild(exportItem);
        }
    }
    
    /**
     * Ajoute des options personnalisées basées sur les attributs data-tab-menu-*
     */
    addDataAttributeMenuItems(menu, buttonConfig) {
        // Cette fonction sera utilisée pour des options définies via les attributs HTML
        // Par exemple: data-tab-menu-option1="Texte|tooltip|action"
        console.log('📋 TabOpenerService: Vérification des options data-tab-menu-*');
        
        // Chercher le bouton original pour récupérer les attributs data-tab-menu-*
        const buttons = document.querySelectorAll('[data-tab-opener]');
        let sourceButton = null;
        
        for (const button of buttons) {
            const config = this.parseButtonConfig(button);
            if (config && config.uniqueId === buttonConfig.uniqueId) {
                sourceButton = button;
                break;
            }
        }
        
        if (!sourceButton) {
            console.log('⚠️ TabOpenerService: Bouton source non trouvé pour les options personnalisées');
            return;
        }
        
        // Récupérer tous les attributs data-tab-menu-*
        const customMenuItems = [];
        console.log('🔍 DEBUG: Recherche des attributs data-tab-menu- pour le bouton:', sourceButton);
        
        for (const attr of sourceButton.attributes) {
            if (attr.name.startsWith('data-tab-menu-')) {
                const optionName = attr.name.replace('data-tab-menu-', '');
                const optionValue = attr.value;
                
                console.log(`🔍 DEBUG: Attribut trouvé: ${attr.name} = ${optionValue}`);
                
                // Format: "Texte|tooltip|action" ou "Texte|tooltip|action|target"
                const parts = optionValue.split('|');
                console.log(`🔍 DEBUG: Parties de l'attribut ${optionName}:`, parts);
                
                if (parts.length >= 3) {
                    const menuItem = {
                        name: optionName,
                        text: parts[0],
                        tooltip: parts[1],
                        action: parts[2],
                        target: parts[3] || null
                    };
                    
                    console.log(`✅ DEBUG: Option menu ajoutée:`, menuItem);
                    customMenuItems.push(menuItem);
                } else {
                    console.warn(`⚠️ DEBUG: Format incorrect pour ${optionName} (${parts.length} parties au lieu de 3+):`, parts);
                }
            }
        }
        
        console.log('📋 DEBUG: Total des options personnalisées trouvées:', customMenuItems.length);
        
        // Ajouter les options personnalisées au menu
        if (customMenuItems.length > 0) {
            console.log('🎨 TabOpenerService: Ajout d\'options personnalisées:', customMenuItems);
            
            // Séparateur
            const separator = document.createElement('div');
            separator.style.cssText = `height: 1px; background: #eee; margin: 4px 0;`;
            menu.appendChild(separator);
            
            // Ajouter chaque option personnalisée
            customMenuItems.forEach(item => {
                const menuItem = this.createMenuItem(
                    item.text,
                    item.tooltip,
                    () => {
                        console.log(`🎯 Menu: Exécution de l'action personnalisée: ${item.action}`);
                        this.hideContextMenu();
                        this.executeCustomAction(item.action, item.target, buttonConfig);
                    }
                );
                menu.appendChild(menuItem);
            });
        }
    }
    
    /**
     * Exécute une action personnalisée définie par les attributs data-tab-menu-*
     */
    executeCustomAction(action, target, buttonConfig) {
        console.log('⚡ TabOpenerService: Exécution d\'action personnalisée:', action, target);
        
        switch (action) {
            case 'open-url':
                if (target) {
                    // Remplacer les placeholders dans l'URL
                    const url = this.replacePlaceholders(target, buttonConfig);
                    console.log('🌐 Action: Ouverture d\'URL:', url);
                    window.open(url, '_blank');
                } else {
                    console.error('❌ Action open-url: target URL manquante');
                }
                break;
                
            case 'copy-to-clipboard':
                if (target) {
                    // Remplacer les placeholders dans le texte
                    const text = this.replacePlaceholders(target, buttonConfig);
                    console.log('📋 Action: Copie vers le presse-papiers:', text);
                    navigator.clipboard.writeText(text).then(() => {
                        console.log('✅ Texte copié avec succès');
                        this.showNotification('Texte copié dans le presse-papiers');
                    }).catch(err => {
                        console.error('❌ Erreur copie presse-papiers:', err);
                    });
                } else {
                    console.error('❌ Action copy-to-clipboard: target text manquant');
                }
                break;
                
            case 'execute-function':
                if (target && typeof window[target] === 'function') {
                    console.log('🔧 Action: Exécution de fonction:', target);
                    window[target](buttonConfig);
                } else {
                    console.error('❌ Action execute-function: fonction non trouvée:', target);
                }
                break;
                
            case 'open-tab':
                if (target) {
                    // Format simple: "componentType" - on utilisera les valeurs par défaut
                    // Ou format étendu: "componentType&title=Titre&state={json}"
                    let componentType = target;
                    let customTitle = null;
                    let customState = {};
                    
                    // Parser les paramètres s'ils sont présents
                    if (target.includes('&')) {
                        const parts = target.split('&');
                        componentType = parts[0];
                        
                        for (let i = 1; i < parts.length; i++) {
                            const param = parts[i];
                            if (param.startsWith('title=')) {
                                customTitle = decodeURIComponent(param.substring(6));
                            } else if (param.startsWith('state=')) {
                                try {
                                    customState = JSON.parse(decodeURIComponent(param.substring(6)));
                                } catch (e) {
                                    console.warn('⚠️ Action open-tab: Erreur parsing state JSON:', e);
                                }
                            }
                        }
                    }
                    
                    // Créer la configuration avec les valeurs du bouton source si pas de custom
                    const config = {
                        type: componentType,
                        title: customTitle || `${componentType} - ${buttonConfig.state.zoneName || buttonConfig.state.geocacheId || 'Nouveau'}`,
                        componentName: this.getDefaultComponentName(componentType),
                        uniqueId: `custom-${componentType}-${buttonConfig.state.zoneId || buttonConfig.state.geocacheId || Date.now()}`,
                        state: { ...buttonConfig.state, ...customState }
                    };
                    
                    console.log('🚀 Action: Ouverture d\'onglet personnalisé:', config);
                    this.openTab(config, true);
                } else {
                    console.error('❌ Action open-tab: target manquant');
                }
                break;
                
            default:
                console.warn('⚠️ Action personnalisée non reconnue:', action);
                break;
        }
    }
    
    /**
     * Remplace les placeholders dans une chaîne de caractères
     */
    replacePlaceholders(text, buttonConfig) {
        if (!text || typeof text !== 'string') return text;
        
        let result = text;
        
        // Remplacer les placeholders de base
        if (buttonConfig.state) {
            Object.keys(buttonConfig.state).forEach(key => {
                const placeholder = `{${key}}`;
                const value = buttonConfig.state[key];
                if (result.includes(placeholder)) {
                    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
                }
            });
        }
        
        // Placeholders spéciaux
        result = result.replace(/{title}/g, buttonConfig.title || '');
        result = result.replace(/{type}/g, buttonConfig.type || '');
        result = result.replace(/{uniqueId}/g, buttonConfig.uniqueId || '');
        
        console.log('🔄 Placeholder replacement:', text, '→', result);
        return result;
    }
    
    /**
     * Affiche une notification temporaire
     */
    showNotification(message) {
        console.log('📢 TabOpenerService: Notification:', message);
        
        // Créer l'élément de notification
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10001;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Animation d'apparition
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Supprimer après 3 secondes
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    /**
     * Ajuste la position du menu pour qu'il reste dans l'écran
     */
    adjustMenuPosition(menu, event) {
        const rect = menu.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Ajuster horizontalement
        if (rect.right > windowWidth) {
            menu.style.left = (event.pageX - rect.width) + 'px';
        }
        
        // Ajuster verticalement
        if (rect.bottom > windowHeight) {
            menu.style.top = (event.pageY - rect.height) + 'px';
        }
    }
    
    /**
     * Cache le menu contextuel
     */
    hideContextMenu() {
        console.log('🚫 TabOpenerService: Fermeture du menu contextuel');
        
        // Reset immédiat de l'état
        this.currentContextMenu = null;
        
        const menu = document.getElementById('tab-opener-context-menu');
        if (menu) {
            // Animation de fermeture (optionnelle)
            menu.style.opacity = '0';
            
            // Fermeture définitive après animation
            setTimeout(() => {
                menu.style.display = 'none';
                menu.innerHTML = ''; // Vider le contenu
                menu.style.opacity = '1'; // Reset pour la prochaine ouverture
                console.log('✅ TabOpenerService: Menu fermé avec succès');
            }, 100);
        } else {
            console.log('⚠️ TabOpenerService: Menu introuvable');
        }
    }
    
    /**
     * Ouvre l'aide d'un plugin
     */
    openPluginHelp(pluginName) {
        console.log('❓ TabOpenerService: Ouverture de l\'aide du plugin:', pluginName);
        
        const config = {
            type: 'plugin',
            title: `Aide - ${pluginName}`,
            componentName: 'plugin',
            uniqueId: `plugin-help-${pluginName}`,
            state: {
                pluginName: 'plugin_help',
                targetPlugin: pluginName
            }
        };
        
        this.openTab(config, true);
    }
    
    /**
     * Ouvre les détails d'une géocache
     */
    openGeocacheDetails(geocacheId) {
        console.log('🗺️ TabOpenerService: Ouverture des détails de la géocache:', geocacheId);
        
        const config = {
            type: 'geocache-details',
            title: `Détails - ${geocacheId}`,
            componentName: 'geocache-details',
            uniqueId: `geocache-details-${geocacheId}`,
            state: {
                geocacheId: geocacheId
            }
        };
        
        this.openTab(config, true);
    }
    
    /**
     * Ouvre le Formula Solver pour une géocache
     */
    openFormulaSolver(geocacheId, gcCode) {
        console.log('🧮 TabOpenerService: Ouverture du Formula Solver:', geocacheId, gcCode);
        
        const config = {
            type: 'formula-solver',
            title: `Formula Solver - ${gcCode || geocacheId}`,
            componentName: 'FormulaSolver',
            uniqueId: `formula-solver-${geocacheId}`,
            state: {
                geocacheId: geocacheId,
                gcCode: gcCode
            }
        };
        
        this.openTab(config, true);
    }
    
    /**
     * Ouvre une zone sur la carte
     */
    openZoneOnMap(zoneId, zoneName) {
        console.log('🗺️ TabOpenerService: Ouverture de la carte pour la zone:', zoneId, zoneName);
        
        const config = {
            type: 'geocaches-map',
            title: `Carte - ${zoneName}`,
            componentName: 'geocaches-map',
            uniqueId: `geocaches-map-zone-${zoneId}`,
            state: {
                zoneId: zoneId,
                zoneName: zoneName,
                filterByZone: true
            }
        };
        
        this.openTab(config, true);
    }
    
    /**
     * Exporte une zone
     */
    exportZone(zoneId, zoneName) {
        console.log('📤 TabOpenerService: Export de la zone:', zoneId, zoneName);
        
        // Créer un lien de téléchargement
        const exportUrl = `/api/zones/${zoneId}/export`;
        const link = document.createElement('a');
        link.href = exportUrl;
        link.download = `zone_${zoneName.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification(`Export de la zone "${zoneName}" démarré`);
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
        
        // Générer un ID unique si non fourni
        const generatedId = uniqueId || `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        const config = {
            type: type,
            title: title,
            componentName: component || this.getDefaultComponentName(type),
            uniqueId: generatedId,
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
                uniqueId: config.uniqueId,
                // S'assurer que les données essentielles sont présentes
                ...(config.state.geocacheId && { geocacheId: config.state.geocacheId }),
                ...(config.state.gcCode && { gcCode: config.state.gcCode }),
                ...(config.state.name && { name: config.state.name })
            }
        };
        
        // Debug logging
        console.log('🔧 TabOpener: Configuration finale du composant:', {
            id: componentConfig.id,
            componentName: componentConfig.componentName,
            title: componentConfig.title,
            componentState: componentConfig.componentState
                 });
        
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
        
        if (activeStack && activeStack.addChild) {
            console.log('🎯 TabOpener: Ajout à la stack active:', activeStack.id || 'ID non défini');
            try {
                activeStack.addChild(componentConfig);
                console.log('✅ TabOpener: Onglet ajouté à la stack active');
                return; // Important: sortir de la fonction après succès
            } catch (error) {
                console.error('❌ TabOpener: Erreur lors de l\'ajout à la stack active:', error);
            }
        } else {
            console.log('⚠️ TabOpener: Stack active non valide ou sans méthode addChild');
        }
        
                // Si on arrive ici, on n'a pas réussi à ajouter à la stack active
        // Fallback: chercher une stack existante
        const fallbackStack = this.findBestStack();
        if (fallbackStack && fallbackStack.addChild) {
            console.log('🔄 TabOpener: Ajout à une stack existante (fallback):', fallbackStack.id || 'ID non défini');
            try {
                fallbackStack.addChild(componentConfig);
                console.log('✅ TabOpener: Onglet ajouté à la stack existante');
                return; // Important: sortir après succès
            } catch (error) {
                console.error('❌ TabOpener: Erreur lors de l\'ajout à la stack de fallback:', error);
            }
        } else {
            console.log('⚠️ TabOpener: Stack de fallback non valide ou sans méthode addChild');
        }
        
                // Dernier recours: ajouter à la section principale
        console.log('🏠 TabOpener: Ajout à la section principale (dernier recours)');
        if (window.mainLayout?.root?.contentItems?.[0]) {
            try {
                window.mainLayout.root.contentItems[0].addChild(componentConfig);
                console.log('✅ TabOpener: Onglet ajouté à la section principale');
            } catch (error) {
                console.error('❌ TabOpener: Erreur lors de l\'ajout à la section principale:', error);
            }
                } else {
            console.error('❌ TabOpener: Impossible d\'ajouter à la section principale - mainLayout non disponible');
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
        if (activeStack && typeof activeStack === 'object' && activeStack.addChild) {
            console.log('🎯 TabOpener: Stack active trouvée:', activeStack.id);
            return activeStack;
        } else {
            console.log('⚠️ TabOpener: Stack active non valide:', activeStack);
        }
        
        // Sinon, utiliser la stack la plus récemment active
        const recentStack = window.layoutStateManager.getMostRecentActiveStack();
        if (recentStack && typeof recentStack === 'object' && recentStack.addChild) {
            console.log('🕒 TabOpener: Stack récemment active trouvée:', recentStack.id);
            return recentStack;
        } else {
            console.log('⚠️ TabOpener: Stack récemment active non valide:', recentStack);
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
    
    /**
     * Réinitialise le service (utile après des changements DOM dynamiques)
     */
    reinitialize() {
        console.log('🔄 TabOpenerService: Réinitialisation du service');
        
        // Fermer le menu s'il est ouvert
        if (this.currentContextMenu) {
            this.hideContextMenu();
        }
        
        // Recréer le menu contextuel si nécessaire
        const existingMenu = document.getElementById('tab-opener-context-menu');
        if (!existingMenu) {
            console.log('🔧 TabOpenerService: Recréation du menu contextuel');
            this.createContextMenuElement();
        }
        
        // Réinitialiser les écouteurs de fermeture
        this.initializeContextMenuCloseListeners();
        
        // Invalider le cache
        this.invalidateCache();
        
        console.log('✅ TabOpenerService: Service réinitialisé');
    }
    
    /**
     * Méthode de debug pour vérifier l'état du service
     */
    debugMenuState() {
        const menu = document.getElementById('tab-opener-context-menu');
        const state = {
            serviceInitialized: this.eventListenersInitialized,
            currentContextMenu: !!this.currentContextMenu,
            menuElement: !!menu,
            menuVisible: menu ? menu.style.display : 'n/a',
            documentClickHandler: !!this.documentClickHandler,
            documentKeyHandler: !!this.documentKeyHandler,
            documentScrollHandler: !!this.documentScrollHandler,
            menuPosition: menu ? { left: menu.style.left, top: menu.style.top } : 'n/a',
            documentBodyAvailable: !!document.body,
            documentReadyState: document.readyState
        };
        
        console.log('🔍 DEBUG: État complet du TabOpenerService:', state);
        return state;
    }
    
    /**
     * Vérifie si le service est prêt à être utilisé
     */
    isReady() {
        return !!(
            this.eventListenersInitialized && 
            document.body && 
            document.readyState !== 'loading'
        );
    }
}

// Créer l'instance globale de manière sécurisée
(function() {
    function initializeTabOpenerService() {
        console.log('🚀 Initialisation du TabOpenerService...');
        
        if (!window.TabOpenerService) {
            try {
                window.TabOpenerService = new TabOpenerService();
                console.log('✅ TabOpenerService initialisé avec succès');
            } catch (error) {
                console.error('❌ Erreur lors de l\'initialisation du TabOpenerService:', error);
                
                // Réessayer après que le DOM soit prêt
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => {
                        console.log('🔄 Nouvelle tentative d\'initialisation après DOMContentLoaded');
                        initializeTabOpenerService();
                    });
                } else {
                    // Réessayer dans un moment
                    setTimeout(() => {
                        console.log('🔄 Nouvelle tentative d\'initialisation retardée');
                        initializeTabOpenerService();
                    }, 500);
                }
            }
        } else {
            console.log('ℹ️ TabOpenerService déjà initialisé');
        }
    }
    
    // Initialiser immédiatement ou attendre le DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeTabOpenerService);
    } else {
        initializeTabOpenerService();
    }
})();

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