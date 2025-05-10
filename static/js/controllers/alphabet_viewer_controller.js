// Alphabet Viewer Controller
(() => {
    // S'assurer que Stimulus est disponible globalement
    if (!window.Stimulus) {
        console.error("Stimulus n'est pas disponible globalement");
        return;
    }
    
    // Utiliser l'application Stimulus déjà initialisée dans index.html
    const application = window.application || window.StimulusApp;
    
    if (!application) {
        console.error("L'application Stimulus n'est pas disponible");
        return;
    }
    
    application.register("alphabet-viewer", class extends Stimulus.Controller {
        static targets = [
            "enteredSymbols", 
            "decodedText", 
            "availableSymbol", 
            "detectedCoordinates", 
            "detectedLatitude", 
            "detectedLongitude", 
            "coordinatesContainer", 
            "noCoordinatesMessage",
            "coordinatesDetectionStatus",
            // Nouveaux targets pour l'association de géocache
            "geocacheSelect",
            "gcCodeInput",
            "associatedGeocacheInfo",
            "associatedGeocacheName",
            "associatedGeocacheCode",
            "sendCoordinatesBtn", // pour la rétrocompatibilité temporaire
            "originalCoordinates",
            "originalCoordinatesValue",
            "createWaypointAutoBtn", // pour la rétrocompatibilité temporaire
            "sendCoordinatesBtnDetected",
            "createWaypointAutoBtnDetected"
        ]
        
        static values = {
            alphabetId: String,
            type: String
        }

        connect() {
            console.log('Alphabet Viewer Controller connected')
            this.enteredChars = []
            this.updateDisplay()
            this.setupContextMenu()
            this.setupDragAndDrop()
            
            // Ajouter un délai pour éviter des appels trop fréquents
            this.detectCoordinatesDebounced = this.debounce(this.detectCoordinates.bind(this), 500)
            
            // Indicateur pour éviter les boucles infinies lors de la saisie directe
            this.isUpdatingFromTextInput = false
            
            // Initialiser l'association de géocache
            this.associatedGeocache = null
            this.loadOpenGeocaches()
            this.loadGeocacheAssociation()
            
            // Écouter les événements de coordonnées détectées
            this.element.addEventListener('coordinatesDetected', this.handleCoordinatesDetected.bind(this))
            
            // Débogage des boutons
            setTimeout(() => {
                console.log("== Débogage des boutons ==");
                
                // Anciens boutons (pour rétrocompatibilité)
                if (this.hasSendCoordinatesBtnTarget) {
                    console.log("Ancien bouton Envoyer coordonnées:", this.sendCoordinatesBtnTarget);
                }
                if (this.hasCreateWaypointAutoBtnTarget) {
                    console.log("Ancien bouton Créer WP auto:", this.createWaypointAutoBtnTarget);
                }
                
                // Nouveaux boutons dans la section "Coordonnées détectées"
                if (this.hasSendCoordinatesBtnDetectedTarget) {
                    console.log("Nouveau bouton Envoyer coordonnées:", this.sendCoordinatesBtnDetectedTarget);
                    this.sendCoordinatesBtnDetectedTarget.addEventListener('click', () => {
                        console.log('Clic sur le bouton Envoyer coordonnées détecté');
                    });
                }
                
                if (this.hasCreateWaypointAutoBtnDetectedTarget) {
                    console.log("Nouveau bouton Créer WP auto:", this.createWaypointAutoBtnDetectedTarget);
                    this.createWaypointAutoBtnDetectedTarget.addEventListener('click', () => {
                        console.log('Clic sur le bouton Créer WP auto détecté');
                    });
                }
            }, 1000);
        }
        
        // Fonction pour charger les géocaches ouvertes
        loadOpenGeocaches() {
            if (!window.layoutStateManager) {
                console.error("Layout State Manager n'est pas disponible");
                return;
            }
            
            // Débogage - Afficher toutes les composantes pour trouver le bon type
            console.log('=== DEBUG: Tous les composants enregistrés ===');
            const allComponents = Array.from(window.layoutStateManager.components.values());
            console.log(allComponents);
            
            // Essayer différents types de composants qui pourraient contenir des géocaches
            const geocaches = [
                ...window.layoutStateManager.getComponentsByType('geocache-details'),
                ...window.layoutStateManager.getComponentsByType('geocache'),
                ...window.layoutStateManager.getComponentsByType('GeocacheAnalysis')
            ].filter(Boolean);  // Supprimer les undefined/null
            
            // Débogage - Afficher les géocaches disponibles
            console.log('=== DEBUG: Géocaches disponibles ===', geocaches);
            
            if (geocaches && geocaches.length > 0) {
                console.log(`Trouvé ${geocaches.length} géocaches`);
                
                // Vider et reconstruire le menu déroulant
                this.geocacheSelectTarget.innerHTML = '<option value="">Sélectionner une géocache...</option>';
                
                // Ajouter chaque géocache comme option
                geocaches.forEach(geocache => {
                    console.log('Géocache:', geocache);
                    const option = document.createElement('option');
                    option.value = geocache.id;
                    option.textContent = `${geocache.metadata.name || geocache.metadata.gcCode || 'Sans nom'} (${geocache.metadata.code || geocache.metadata.gcCode || 'Sans code'})`;
                    option.dataset.code = geocache.metadata.code || geocache.metadata.gcCode || '';
                    option.dataset.name = geocache.metadata.name || '';
                    
                    this.geocacheSelectTarget.appendChild(option);
                });
                
                // Afficher un toast de succès
                if (window.showToast) {
                    window.showToast({
                        message: `${geocaches.length} géocache(s) trouvée(s)`,
                        type: 'success',
                        duration: 3000
                    });
                }
            } else {
                console.log('Aucune géocache trouvée');
                this.geocacheSelectTarget.innerHTML = '<option value="">Aucune géocache ouverte</option>';
                
                // Afficher un toast pour informer l'utilisateur
                if (window.showToast) {
                    window.showToast({
                        message: 'Aucune géocache n\'est actuellement ouverte. Ouvrez une géocache pour l\'associer.',
                        type: 'info',
                        duration: 5000
                    });
                }
            }
        }
        
        // Sélectionner une géocache à partir du menu déroulant
        selectGeocache(event) {
            const selectedOption = event.target.options[event.target.selectedIndex];
            const geocacheId = event.target.value;
            
            if (!geocacheId) {
                this.removeGeocacheAssociation();
                return;
            }
            
            this.associateGeocache({
                id: geocacheId,
                name: selectedOption.dataset.name,
                code: selectedOption.dataset.code
            });
        }
        
        // Associer une géocache manuellement via son code GC
        associateGcCode(event) {
            event.preventDefault();
            const gcCode = this.gcCodeInputTarget.value.trim();
            
            if (!gcCode) {
                // Afficher un message d'erreur si le champ est vide
                this.showErrorMessage("Veuillez saisir un code GC");
                return;
            }
            
            // Essayer différents types de composants qui pourraient contenir des géocaches
            const openGeocaches = [
                ...window.layoutStateManager.getComponentsByType('geocache-details'),
                ...window.layoutStateManager.getComponentsByType('geocache'),
                ...window.layoutStateManager.getComponentsByType('GeocacheAnalysis')
            ].filter(Boolean);  // Supprimer les undefined/null
            
            // Rechercher par code ou par gcCode
            const existingGeocache = openGeocaches.find(gc => 
                (gc.metadata.code && gc.metadata.code.toUpperCase() === gcCode.toUpperCase()) || 
                (gc.metadata.gcCode && gc.metadata.gcCode.toUpperCase() === gcCode.toUpperCase())
            );
            
            if (existingGeocache) {
                // La géocache est déjà ouverte, on l'associe directement
                this.associateGeocache({
                    id: existingGeocache.id,
                    name: existingGeocache.metadata.name || existingGeocache.metadata.gcCode || gcCode,
                    code: existingGeocache.metadata.code || existingGeocache.metadata.gcCode || gcCode
                });
                
                // Mettre à jour le sélecteur
                this.geocacheSelectTarget.value = existingGeocache.id;
                
                // Afficher un toast de succès
                if (typeof window.showToast === 'function') {
                    window.showToast({
                        message: `Associé à la géocache ${gcCode} déjà ouverte`,
                        type: 'success',
                        duration: 3000
                    });
                }
            } else {
                // Afficher un indicateur de chargement
                this.gcCodeInputTarget.disabled = true;
                const originalButtonText = event.target.innerText;
                event.target.innerText = "Recherche...";
                
                // La géocache n'est pas ouverte, il faut faire une requête API
                fetch(`/api/geocaches/by-code/${gcCode}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Géocache non trouvée: ${gcCode}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        this.associateGeocache({
                            id: null, // Pas d'ID car non ouverte
                            name: data.name || gcCode,
                            code: gcCode
                        });
                        
                        // Afficher un toast de succès
                        if (typeof window.showToast === 'function') {
                            window.showToast({
                                message: `Associé à la géocache ${gcCode}`,
                                type: 'success',
                                duration: 3000
                            });
                        }
                    })
                    .catch(error => {
                        console.error('Erreur lors de la récupération de la géocache:', error);
                        
                        // Afficher une notification d'erreur visible
                        this.showErrorMessage(`Erreur: ${error.message}`);
                    })
                    .finally(() => {
                        // Réactiver le champ et le bouton
                        this.gcCodeInputTarget.disabled = false;
                        event.target.innerText = originalButtonText;
                    });
            }
        }
        
        // Associer une géocache (fonction commune)
        associateGeocache(geocache) {
            console.log("Association de la géocache:", geocache);
            
            this.associatedGeocache = geocache;
            
            // Mettre à jour l'affichage
            this.associatedGeocacheNameTarget.textContent = geocache.name;
            this.associatedGeocacheCodeTarget.textContent = geocache.code;
            this.associatedGeocacheInfoTarget.classList.remove('hidden');
            
            // Activer le bouton d'envoi des coordonnées seulement si on a des coordonnées détectées
            this.updateSendCoordinatesButton();
            
            // Enregistrer l'association dans le localStorage
            this.saveGeocacheAssociation();
            
            // Charger automatiquement les coordonnées d'origine
            this.loadAndDisplayOriginalCoordinates();
            
            // Si nous avons le code GC mais pas d'ID numérique, récupérer l'ID
            if (geocache.code && !geocache.databaseId) {
                console.log(`Récupération de l'ID numérique pour ${geocache.code}...`);
                
                fetch(`/api/geocaches/by-code/${geocache.code}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Impossible de récupérer les détails de la géocache ${geocache.code}`);
                        }
                        return response.json();
                    })
                    .then(geocacheData => {
                        console.log("Données de la géocache récupérées:", geocacheData);
                        
                        // Mise à jour de l'objet associatedGeocache avec l'ID
                        if (geocacheData.id && !isNaN(parseInt(geocacheData.id))) {
                            this.associatedGeocache.databaseId = parseInt(geocacheData.id);
                            console.log("ID numérique récupéré:", this.associatedGeocache.databaseId);
                            
                            // Sauvegarder l'association mise à jour
                            this.saveGeocacheAssociation();
                        } else {
                            console.warn("ID numérique non disponible dans les données de la géocache:", geocacheData);
                        }
                    })
                    .catch(error => {
                        console.error("Erreur lors de la récupération de l'ID de la géocache:", error);
                    });
            }
        }
        
        // Charger et afficher les coordonnées d'origine
        loadAndDisplayOriginalCoordinates() {
            if (!this.associatedGeocache || !this.associatedGeocache.code) {
                return;
            }
            
            // Afficher l'état de chargement
            this.originalCoordinatesValueTarget.textContent = "Chargement...";
            
            fetch(`/api/geocaches/by-code/${this.associatedGeocache.code}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Impossible de récupérer les coordonnées pour ${this.associatedGeocache.code}`);
                    }
                    return response.json();
                })
                .then(data => {
                    // Afficher les coordonnées dans l'élément dédié
                    const coordsStr = data.gc_lat && data.gc_lon ? `${data.gc_lat} ${data.gc_lon}` : 'Non disponibles';
                    this.originalCoordinatesValueTarget.textContent = coordsStr;
                })
                .catch(error => {
                    console.error('Erreur lors de la récupération des coordonnées:', error);
                    this.originalCoordinatesValueTarget.textContent = "Erreur lors du chargement";
                });
        }
        
        // Supprimer l'association avec la géocache
        removeGeocacheAssociation() {
            this.associatedGeocache = null;
            this.associatedGeocacheInfoTarget.classList.add('hidden');
            this.geocacheSelectTarget.value = "";
            
            // Réinitialiser l'affichage des coordonnées d'origine
            this.originalCoordinatesValueTarget.textContent = "";
            
            // Supprimer l'association du localStorage
            localStorage.removeItem(`alphabet_${this.alphabetIdValue}_geocache`);
        }
        
        // Sauvegarder l'association dans le localStorage
        saveGeocacheAssociation() {
            if (this.associatedGeocache) {
                localStorage.setItem(`alphabet_${this.alphabetIdValue}_geocache`, 
                    JSON.stringify({
                        id: this.associatedGeocache.id,
                        name: this.associatedGeocache.name,
                        code: this.associatedGeocache.code,
                        databaseId: this.associatedGeocache.databaseId || null
                    })
                );
            }
        }
        
        // Charger l'association depuis le localStorage
        loadGeocacheAssociation() {
            const saved = localStorage.getItem(`alphabet_${this.alphabetIdValue}_geocache`);
            if (saved) {
                try {
                    const geocache = JSON.parse(saved);
                    console.log("Association de géocache chargée depuis localStorage:", geocache);
                    this.associateGeocache(geocache);
                    
                    // Mettre à jour le sélecteur si la géocache est ouverte
                    if (geocache.id) {
                        this.geocacheSelectTarget.value = geocache.id;
                    }
                    
                    // Si nous avons le code mais pas l'ID numérique, essayer de le récupérer
                    if (geocache.code && !geocache.databaseId) {
                        console.log("ID numérique non disponible dans les données sauvegardées, récupération...");
                    }
                } catch (e) {
                    console.error('Erreur lors du chargement de l\'association:', e);
                }
            }
        }
        
        // Envoyer les coordonnées détectées à la géocache
        sendCoordinatesToGeocache() {
            console.log("=== Méthode sendCoordinatesToGeocache appelée ===");
            if (!this.associatedGeocache || !this.associatedGeocache.id) {
                // Si la géocache n'a pas d'ID (pas ouverte), on ne peut pas envoyer les coordonnées
                showToast({
                    message: 'Impossible d\'envoyer les coordonnées : la géocache n\'est pas ouverte',
                    type: 'warning',
                    duration: 3000
                });
                return;
            }
            
            // Récupérer les coordonnées détectées
            const coordinates = {
                ddm: this.detectedCoordinatesTarget.textContent,
                latitude: this.detectedLatitudeTarget.textContent,
                longitude: this.detectedLongitudeTarget.textContent,
                source: 'alphabet',
                alphabetId: this.alphabetIdValue
            };
            
            // Envoyer un événement personnalisé que la géocache pourra écouter
            document.dispatchEvent(new CustomEvent('coordinatesUpdate', {
                detail: {
                    targetGeocacheId: this.associatedGeocache.id,
                    coordinates: coordinates
                }
            }));
            
            // Feedback à l'utilisateur
            showToast({
                message: `Coordonnées envoyées à ${this.associatedGeocache.name}`,
                type: 'success',
                duration: 3000
            });
        }
        
        // Gérer l'événement de détection de coordonnées
        handleCoordinatesDetected(event) {
            // Activer/désactiver le bouton d'envoi des coordonnées
            this.updateSendCoordinatesButton();
        }
        
        // Mettre à jour l'état du bouton d'envoi des coordonnées
        updateSendCoordinatesButton() {
            const hasCoordinates = !this.coordinatesContainerTarget.classList.contains('hidden');
            const hasAssociatedGeocache = this.associatedGeocache && this.associatedGeocache.code;
            
            console.log("Mise à jour des boutons:", {hasCoordinates, hasAssociatedGeocache});
            
            // Pour la rétrocompatibilité
            if (this.hasSendCoordinatesBtnTarget) {
                this.sendCoordinatesBtnTarget.disabled = !(hasCoordinates && hasAssociatedGeocache);
            }
            if (this.hasCreateWaypointAutoBtnTarget) {
                this.createWaypointAutoBtnTarget.disabled = !(hasCoordinates && hasAssociatedGeocache);
            }
            
            // Nouveaux boutons dans la section "Coordonnées détectées"
            if (this.hasSendCoordinatesBtnDetectedTarget) {
                this.sendCoordinatesBtnDetectedTarget.disabled = !(hasCoordinates && hasAssociatedGeocache);
            }
            if (this.hasCreateWaypointAutoBtnDetectedTarget) {
                this.createWaypointAutoBtnDetectedTarget.disabled = !(hasCoordinates && hasAssociatedGeocache);
            }
        }

        // Fonction pour limiter les appels fréquents
        debounce(func, wait) {
            let timeout
            return function(...args) {
                clearTimeout(timeout)
                timeout = setTimeout(() => func.apply(this, args), wait)
            }
        }

        setupDragAndDrop() {
            this.enteredSymbolsTarget.addEventListener('dragstart', this.handleDragStart.bind(this))
            this.enteredSymbolsTarget.addEventListener('dragover', this.handleDragOver.bind(this))
            this.enteredSymbolsTarget.addEventListener('drop', this.handleDrop.bind(this))
        }

        handleDragStart(event) {
            const symbolElement = event.target.closest('[data-index]')
            if (symbolElement) {
                event.dataTransfer.setData('text/plain', symbolElement.dataset.index)
                event.dataTransfer.effectAllowed = 'move'
                
                // Ajouter l'effet d'opacité au conteneur parent pour une meilleure expérience visuelle
                const container = symbolElement.closest('.flex.flex-col')
                if (container) {
                    container.classList.add('opacity-50')
                } else {
                symbolElement.classList.add('opacity-50')
                }
            }
        }

        handleDragOver(event) {
            event.preventDefault()
            const symbolElement = event.target.closest('[data-index]')
            if (symbolElement) {
                event.dataTransfer.dropEffect = 'move'
            }
        }

        handleDrop(event) {
            event.preventDefault()
            const sourceIndex = parseInt(event.dataTransfer.getData('text/plain'))
            const targetElement = event.target.closest('[data-index]')
            
            if (targetElement) {
                const targetIndex = parseInt(targetElement.dataset.index)
                if (sourceIndex !== targetIndex) {
                    // Réorganiser les caractères
                    const char = this.enteredChars[sourceIndex]
                    this.enteredChars.splice(sourceIndex, 1)
                    this.enteredChars.splice(targetIndex, 0, char)
                    this.updateDisplay()
                }
            }

            // Retirer l'effet d'opacité de tous les conteneurs
            this.enteredSymbolsTarget.querySelectorAll('.opacity-50').forEach(el => {
                el.classList.remove('opacity-50')
            })
        }

        setupContextMenu() {
            // Add context menu listener to entered symbols
            this.enteredSymbolsTarget.addEventListener('contextmenu', (event) => {
                const symbolElement = event.target.closest('[data-index]')
                if (symbolElement) {
                    event.preventDefault()
                    event.stopPropagation()
                    
                    const index = parseInt(symbolElement.dataset.index)
                    const char = this.enteredChars[index]
                    
                    // Show web context menu with custom options for symbols
                    showWebContextMenu(
                        event.clientX,
                        event.clientY,
                        `symbol-${index}`,
                        `Symbole ${char}`,
                        [
                            {
                                label: `Valeur : "${char}"`,
                                disabled: true,
                                className: 'text-gray-500'
                            },
                            {
                                type: 'separator'
                            },
                            {
                                label: 'Dupliquer le symbole',
                                click: () => this.duplicateSymbol(index)
                            },
                            {
                                label: 'Supprimer le symbole',
                                click: () => this.removeSymbol(index)
                            }
                        ]
                    )
                }
            })
        }

        addSymbol(event) {
            event.preventDefault()
            const symbol = event.currentTarget
            const char = symbol.dataset.char
            console.log('Adding symbol:', char)
            
            this.enteredChars.push(char)
            this.updateDisplay()
        }
        
        // Nouvelle méthode pour ajouter des symboles spéciaux pour les coordonnées
        addSpecialSymbol(event) {
            event.preventDefault()
            const button = event.currentTarget
            const value = button.dataset.value
            console.log('Adding special symbol:', value)
            
            this.enteredChars.push(value)
            this.updateDisplay()
        }
        
        // Nouvelle méthode pour supprimer le dernier symbole (bouton Effacer)
        removeLastSymbol(event) {
            event.preventDefault()
            if (this.enteredChars.length > 0) {
                this.enteredChars.pop()
                this.updateDisplay()
            }
        }

        updateDisplay() {
            // Si nous sommes en train de mettre à jour depuis la saisie de texte,
            // ne pas mettre à jour le texte décodé pour éviter une boucle
            if (!this.isUpdatingFromTextInput) {
            // Mettre à jour les symboles entrés
            this.enteredSymbolsTarget.innerHTML = this.enteredChars
                .map((char, index) => {
                        return this.createSymbolElement(char, index)
                    }).join('')
    
                // Mettre à jour le texte décodé
                this.decodedTextTarget.value = this.enteredChars.join('')
            } else {
                // Mettre à jour seulement les symboles entrés
                this.enteredSymbolsTarget.innerHTML = this.enteredChars
                    .map((char, index) => {
                        return this.createSymbolElement(char, index)
                    }).join('')
            }
            
            // Détecter les coordonnées si du texte est présent
            if (this.enteredChars.length > 0) {
                this.detectCoordinatesDebounced(this.decodedTextTarget.value)
            } else {
                this.resetCoordinatesDisplay()
            }
            
            // Réinitialiser le flag
            this.isUpdatingFromTextInput = false
        }
        
        // Nouvelle méthode pour créer un élément de symbole (factorisation du code)
        createSymbolElement(char, index) {
            // Vérifier d'abord si c'est un symbole disponible dans la liste
                    const symbol = this.availableSymbolTargets.find(s => s.dataset.char === char)
            
            // Contenu du symbole et classe de couleur de fond
            let symbolContent;
            let bgColorClass = 'bg-gray-800'; // Couleur par défaut pour les symboles normaux

            if (symbol) {
                // Cas d'un symbole disponible dans l'alphabet
                    if (symbol.querySelector('span')) {
                        // Cas d'une police personnalisée
                        symbolContent = symbol.querySelector('span').cloneNode(true)
                        symbolContent.classList.remove('group-hover:text-gray-200')
                    } else if (symbol.querySelector('img')) {
                        // Cas d'une image
                        symbolContent = symbol.querySelector('img').cloneNode(true)
                    } else {
                    symbolContent = `<span class="text-white text-2xl">${char}</span>`
                }
            } else {
                // Cas d'un symbole spécial (lettres cardinales, symboles de coordonnées)
                
                // Si c'est une lettre cardinale (N, S, E, W)
                if (['N', 'S', 'E', 'W'].includes(char)) {
                    bgColorClass = 'bg-indigo-800'
                    symbolContent = `<span class="text-white font-bold text-2xl">${char}</span>`
                } 
                // Si c'est un symbole de coordonnées (°, ., ′, ″)
                else if (['°', '.', '′', '″'].includes(char)) {
                    bgColorClass = 'bg-teal-800'
                    symbolContent = `<span class="text-white font-bold text-2xl">${char}</span>`
                }
                // Si c'est un espace
                else if (char === ' ') {
                    bgColorClass = 'bg-gray-500'
                    symbolContent = `<span class="text-white text-xs">espace</span>`
                } else {
                    symbolContent = `<span class="text-white text-2xl">${char}</span>`
                }
            }
            
            // Si symbolContent est un objet DOM, le convertir en string
            if (typeof symbolContent !== 'string') {
                symbolContent = symbolContent.outerHTML
                    }

                    return `
                <div class="flex flex-col items-center">
                    <div class="w-24 h-24 flex items-center justify-center ${bgColorClass} rounded-lg cursor-move group"
                             draggable="true"
                             data-index="${index}"
                             data-char="${char}">
                        ${symbolContent}
                    </div>
                    <div class="text-center mt-1 px-2 py-1 bg-gray-600 border border-gray-500 rounded-md text-gray-200 font-medium text-sm min-w-10 flex items-center justify-center shadow-sm">
                        ${char === ' ' ? 'espace' : char}
                    </div>
                        </div>
                    `
        }
        
        // Détection des coordonnées via l'API
        detectCoordinates(text) {
            if (!text || text.trim() === '') {
                this.resetCoordinatesDisplay()
                return
            }
            
            // Afficher l'indicateur d'analyse
            this.coordinatesDetectionStatusTarget.textContent = 'Analyse...'
            this.coordinatesDetectionStatusTarget.classList.remove('hidden')
            this.coordinatesDetectionStatusTarget.classList.add('bg-yellow-600')
            
            // Préparer les données avec include_numeric_only=true pour l'interface alphabet
            const requestData = {
                text: text,
                include_numeric_only: true
            }
            
            fetch('/api/detect_coordinates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.exist) {
                    // Coordonnées trouvées !
                    this.detectedCoordinatesTarget.textContent = data.ddm || 'N/A'
                    this.detectedLatitudeTarget.textContent = data.ddm_lat || 'N/A'
                    this.detectedLongitudeTarget.textContent = data.ddm_lon || 'N/A'
                    
                    // Afficher le conteneur des coordonnées
                    this.coordinatesContainerTarget.classList.remove('hidden')
                    this.noCoordinatesMessageTarget.classList.add('hidden')
                    
                    // Mettre à jour l'indicateur d'analyse
                    this.coordinatesDetectionStatusTarget.textContent = 'Coordonnées trouvées'
                    this.coordinatesDetectionStatusTarget.classList.remove('bg-yellow-600')
                    this.coordinatesDetectionStatusTarget.classList.add('bg-green-600')
                    
                    // Mettre à jour le bouton d'envoi des coordonnées
                    this.updateSendCoordinatesButton()
                    
                    // Émettre un événement pour notifier de la détection des coordonnées
                    this.element.dispatchEvent(new CustomEvent('coordinatesDetected', {
                        detail: data
                    }))
                } else {
                    // Aucune coordonnée trouvée
                    this.resetCoordinatesDisplay()
                    
                    // Mettre à jour l'indicateur d'analyse
                    this.coordinatesDetectionStatusTarget.textContent = 'Aucune coordonnée'
                    this.coordinatesDetectionStatusTarget.classList.remove('bg-yellow-600')
                    this.coordinatesDetectionStatusTarget.classList.add('bg-red-600')
                }
                
                // Masquer l'indicateur après 2 secondes
                setTimeout(() => {
                    this.coordinatesDetectionStatusTarget.classList.add('hidden')
                }, 2000)
            })
            .catch(error => {
                console.error('Erreur lors de la détection des coordonnées:', error)
                this.coordinatesDetectionStatusTarget.textContent = 'Erreur'
                this.coordinatesDetectionStatusTarget.classList.remove('bg-yellow-600')
                this.coordinatesDetectionStatusTarget.classList.add('bg-red-600')
                
                // Masquer l'indicateur après 2 secondes
                setTimeout(() => {
                    this.coordinatesDetectionStatusTarget.classList.add('hidden')
                }, 2000)
            })
        }
        
        // Réinitialiser l'affichage des coordonnées
        resetCoordinatesDisplay() {
            this.coordinatesContainerTarget.classList.add('hidden')
            this.noCoordinatesMessageTarget.classList.remove('hidden')
            // Désactiver le bouton d'envoi des coordonnées
            this.updateSendCoordinatesButton()
        }

        removeSymbol(index) {
            this.enteredChars.splice(index, 1)
            this.updateDisplay()
        }
        
        duplicateSymbol(index) {
            const char = this.enteredChars[index]
            this.enteredChars.splice(index + 1, 0, char)
            this.updateDisplay()
        }
        
        keydown(event) {
            // Gestion de la touche Retour arrière pour supprimer le dernier symbole
            if (event.key === 'Backspace' && document.activeElement !== this.decodedTextTarget) {
                event.preventDefault()
                this.removeLastSymbol(event)
            }
        }
        
        handleTextInput(event) {
            const newText = event.target.value
            
            // Convertir le texte en tableau de caractères
            this.isUpdatingFromTextInput = true
            this.enteredChars = Array.from(newText)
            
            // Mettre à jour l'affichage (uniquement les symboles, pas le texte)
            this.updateDisplay()
            
            // Détecter les coordonnées
            this.detectCoordinatesDebounced(newText)
        }

        // Méthode pour afficher un message d'erreur directement dans l'interface
        showErrorMessage(message) {
            // Créer un élément d'erreur s'il n'existe pas déjà
            let errorElement = document.getElementById('alphabet-error-message');
            if (!errorElement) {
                errorElement = document.createElement('div');
                errorElement.id = 'alphabet-error-message';
                errorElement.className = 'bg-red-600 text-white px-4 py-2 rounded-lg mb-4 flex items-center justify-between';
                
                // Ajouter l'élément juste après la section d'association de géocache
                const associationSection = this.associatedGeocacheInfoTarget.parentNode;
                associationSection.parentNode.insertBefore(errorElement, associationSection.nextSibling);
            }
            
            // Mettre à jour le contenu
            errorElement.innerHTML = `
                <div class="flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    <span>${message}</span>
                </div>
                <button class="text-white hover:text-gray-200" onclick="this.parentNode.remove()">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            `;
            
            // Ajouter une classe d'erreur au champ de saisie
            this.gcCodeInputTarget.classList.add('border-red-500');
            setTimeout(() => {
                this.gcCodeInputTarget.classList.remove('border-red-500');
            }, 3000);
            
            // Auto-supprimer après un délai
            setTimeout(() => {
                if (errorElement && errorElement.parentNode) {
                    errorElement.remove();
                }
            }, 5000);
        }

        /**
         * Crée automatiquement un waypoint à partir des coordonnées détectées
         */
        createWaypointAuto(event) {
            console.log("=== Méthode createWaypointAuto appelée ===", event);
            if (event) {
                event.preventDefault();
            }
            
            // Vérifier que nous avons une géocache associée
            if (!this.associatedGeocache || !this.associatedGeocache.code) {
                console.error("Aucune géocache associée pour créer un waypoint");
                this.showErrorMessage("Veuillez d'abord associer une géocache");
                this.showCreateWaypointAutoError("Pas de géocache");
                return;
            }
            
            // Récupérer les coordonnées détectées
            const coordinates = this.detectedCoordinatesTarget.textContent.trim();
            if (!coordinates) {
                console.error("Aucune coordonnée détectée");
                this.showCreateWaypointAutoError("Aucune coordonnée");
                return;
            }
            
            console.log("État actuel de la géocache associée:", this.associatedGeocache);
            console.log("Code GC:", this.associatedGeocache.code);
            
            // Si nous avons déjà un ID de base de données, l'utiliser directement
            if (this.associatedGeocache.databaseId) {
                console.log("ID de base de données déjà disponible:", this.associatedGeocache.databaseId);
                this.extractCoordinatesAndCreateWaypoint(coordinates);
                return;
            }
            
            // Afficher un indicateur de chargement
            this.showCreateWaypointAutoLoading();
            
            // Récupérer l'ID de la géocache à partir du code GC
            console.log(`Récupération de l'ID de la géocache pour le code ${this.associatedGeocache.code}...`);
            
            fetch(`/api/geocaches/by-code/${this.associatedGeocache.code}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Impossible de récupérer les détails de la géocache ${this.associatedGeocache.code}`);
                    }
                    return response.json();
                })
                .then(geocacheData => {
                    console.log("Données de la géocache récupérées:", geocacheData);
                    
                    // Vérifier que l'ID est bien un ID numérique
                    if (!geocacheData.id || isNaN(parseInt(geocacheData.id))) {
                        throw new Error(`ID invalide ou non numérique retourné pour la géocache: ${geocacheData.id}`);
                    }
                    
                    const numericId = parseInt(geocacheData.id);
                    console.log("ID numérique de la géocache:", numericId);
                    
                    // Mise à jour de l'objet associatedGeocache avec les informations récupérées
                    this.associatedGeocache = {
                        ...this.associatedGeocache,
                        databaseId: numericId,  // ID numérique pour l'API
                        id: this.associatedGeocache.id || null,  // Garder l'ID du composant pour d'autres usages
                        latitude: geocacheData.latitude,
                        longitude: geocacheData.longitude
                    };
                    
                    console.log("Géocache mise à jour avec l'ID numérique:", this.associatedGeocache);
                    
                    // Une fois l'ID récupéré, continuer avec l'extraction des coordonnées
                    this.extractCoordinatesAndCreateWaypoint(coordinates);
                })
                .catch(error => {
                    console.error("Erreur lors de la récupération de l'ID de la géocache:", error);
                    this.showCreateWaypointAutoError("Erreur API");
                    this.showErrorMessage(`Impossible de récupérer les détails de la géocache. ${error.message}`);
                });
        }
        
        /**
         * Extrait les coordonnées et crée le waypoint (séparé de createWaypointAuto pour la clarté)
         */
        extractCoordinatesAndCreateWaypoint(coordinates) {
            // Extraire la latitude et la longitude au format standard
            const regex = /([NS][\s]*\d+°[\s]*\d+\.\d+['']*)[\s]*([EW][\s]*\d+°[\s]*\d+\.\d+['']*)/ ;
            
            const match = coordinates.match(regex);
            
            // Débogage pour voir ce qui est extrait
            console.log("Coordonnées à extraire:", coordinates);
            console.log("Résultat du match:", match);
            
            if (!match || match.length < 3) {
                console.error("Format de coordonnées non reconnu");
                
                // Essayer avec une regex plus permissive
                const altRegex = /([NS])[\s]*(\d+)°[\s]*(\d+\.\d+)[']*[\s]*([EW])[\s]*(\d+)°[\s]*(\d+\.\d+)[']*/;
                const altMatch = coordinates.match(altRegex);
                
                if (altMatch && altMatch.length >= 7) {
                    console.log("Match alternatif trouvé:", altMatch);
                    
                    // Reconstruire les coordonnées au format attendu
                    const gcLat = `${altMatch[1]} ${altMatch[2]}° ${altMatch[3]}`;
                    const gcLon = `${altMatch[4]} ${altMatch[5]}° ${altMatch[6]}`;
                    
                    console.log("Coordonnées reconstruites:", gcLat, gcLon);
                    
                    // Continuer avec ces coordonnées
                    this.processCoordinates(gcLat, gcLon, coordinates);
                    return;
                }
                
                this.showCreateWaypointAutoError("Format invalide");
                return;
            }
            
            const gcLat = match[1].trim();
            const gcLon = match[2].trim();
            
            // Utiliser une méthode commune pour traiter les coordonnées
            this.processCoordinates(gcLat, gcLon, coordinates);
        }
        
        /**
         * Traite les coordonnées extraites pour créer un waypoint
         */
        processCoordinates(gcLat, gcLon, originalCoordinates) {
            console.log("Traitement des coordonnées:", { gcLat, gcLon, originalCoordinates });
            console.log("État de la géocache avant création du waypoint:", this.associatedGeocache);
            
            // On n'a plus besoin de vérifier databaseId ici, car cela est fait dans createWaypointWithJSON
            
            // Essayer d'abord avec JSON (comme dans Formula Solver)
            this.createWaypointWithJSON(gcLat, gcLon, originalCoordinates);
            
            // La méthode FormData est disponible en secours si JSON échoue
            // En cas d'erreur, la méthode createWaypointWithJSON affichera un message d'erreur
            // et on pourrait alors suggérer à l'utilisateur d'essayer avec FormData
        }
        
        /**
         * Met à jour la liste des waypoints dans toutes les instances ouvertes
         */
        async updateWaypointsList(geocacheId) {
            try {
                console.log("Mise à jour de la liste des waypoints...");
                
                // S'assurer qu'on utilise bien un ID numérique
                const numericId = this.associatedGeocache.databaseId || geocacheId;
                if (!numericId || isNaN(parseInt(numericId))) {
                    console.error("ID de géocache non numérique pour la mise à jour des waypoints:", numericId);
                    return;
                }
                
                // Trouver tous les conteneurs de liste de waypoints dans tous les onglets ouverts
                const waypointsListContainers = document.querySelectorAll('[data-waypoint-form-target="waypointsList"]');
                
                if (waypointsListContainers.length === 0) {
                    console.warn("Aucun conteneur de liste de waypoints trouvé dans l'interface");
                    return;
                }
                
                console.log(`Trouvé ${waypointsListContainers.length} conteneur(s) de liste de waypoints`);
                
                // Récupérer la liste mise à jour des waypoints
                // Utiliser l'URL avec le préfixe /api/ comme dans Formula Solver
                const listResponse = await fetch(`/api/geocaches/${numericId}/waypoints/list`);
                
                if (listResponse.ok) {
                    const listHtml = await listResponse.text();
                    
                    // Mettre à jour tous les conteneurs trouvés
                    waypointsListContainers.forEach((container, index) => {
                        container.innerHTML = listHtml;
                        console.log(`Liste des waypoints #${index+1} mise à jour avec succès`);
                    });
                    
                    // Déclencher un événement pour informer que les waypoints ont été mis à jour
                    document.dispatchEvent(new CustomEvent('waypointsListUpdated', {
                        detail: { geocacheId: numericId }
                    }));
                } else {
                    console.warn(`Échec de la récupération de la liste des waypoints: ${listResponse.status} ${listResponse.statusText}`);
                }
            } catch (error) {
                console.error("Erreur lors de la mise à jour de la liste des waypoints:", error);
            }
        }
        
        /**
         * Affiche l'état de chargement pour le bouton Créer WP auto
         */
        showCreateWaypointAutoLoading() {
            // On utilise le nouveau target dans les coordonnées détectées
            const button = this.hasCreateWaypointAutoBtnDetectedTarget ? 
                this.createWaypointAutoBtnDetectedTarget : this.createWaypointAutoBtnTarget;
            
            const originalButtonHTML = button.innerHTML;
            
            // Sauvegarde du texte original
            button._originalHTML = originalButtonHTML;
            
            // Affichage de l'animation de chargement
            button.innerHTML = `
                <svg class="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span>Création...</span>
            `;
            button.disabled = true;
            button.classList.add("opacity-75");
        }
        
        /**
         * Affiche un message de succès pour la création du waypoint
         */
        showCreateWaypointAutoSuccess() {
            // On utilise le nouveau target dans les coordonnées détectées
            const button = this.hasCreateWaypointAutoBtnDetectedTarget ? 
                this.createWaypointAutoBtnDetectedTarget : this.createWaypointAutoBtnTarget;
                
            const originalButtonHTML = button._originalHTML || button.innerHTML;
            
            // Affichage de l'icône de succès
            button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>WP créé!</span>
            `;
            button.disabled = false;
            button.classList.remove("opacity-75");
            button.classList.remove("bg-purple-700", "hover:bg-purple-600");
            button.classList.add("bg-green-700", "hover:bg-green-600");
            
            // Rétablir le bouton après un délai
            setTimeout(() => {
                button.innerHTML = originalButtonHTML;
                button.classList.remove("bg-green-700", "hover:bg-green-600");
                button.classList.add("bg-purple-700", "hover:bg-purple-600");
            }, 3000);
        }
        
        /**
         * Affiche un message d'erreur pour la création du waypoint
         */
        showCreateWaypointAutoError(message) {
            // On utilise le nouveau target dans les coordonnées détectées
            const button = this.hasCreateWaypointAutoBtnDetectedTarget ? 
                this.createWaypointAutoBtnDetectedTarget : this.createWaypointAutoBtnTarget;
                
            const originalButtonHTML = button._originalHTML || button.innerHTML;
            
            // Affichage de l'icône d'erreur
            button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>${message}</span>
            `;
            button.disabled = false;
            button.classList.remove("opacity-75");
            button.classList.remove("bg-purple-700", "hover:bg-purple-600");
            button.classList.add("bg-red-700", "hover:bg-red-600");
            
            // Rétablir le bouton après un délai
            setTimeout(() => {
                button.innerHTML = originalButtonHTML;
                button.classList.remove("bg-red-700", "hover:bg-red-600");
                button.classList.add("bg-purple-700", "hover:bg-purple-600");
            }, 3000);
        }

        /**
         * Méthode pour créer un waypoint en utilisant JSON (comme dans Formula Solver)
         */
        createWaypointWithJSON(gcLat, gcLon, originalCoordinates) {
            console.log("=== Appel de createWaypointWithJSON ===");
            console.log("État actuel de la géocache:", this.associatedGeocache);
            
            // Générer un nom pour le waypoint
            const waypointName = "Coordonnées Alphabet";
            const note = `Point créé à partir des coordonnées détectées dans l'alphabet.\nSource: ${this.decodedTextTarget.value}\nCoordonnées: ${originalCoordinates}`;
            
            // Vérifier si nous avons l'ID numérique de la géocache
            if (!this.associatedGeocache || !this.associatedGeocache.databaseId) {
                console.error("Impossible de créer un waypoint sans ID numérique de géocache");
                console.log("Géocache associée:", this.associatedGeocache);
                
                // Si nous avons un code GC mais pas d'ID, essayer de récupérer l'ID
                if (this.associatedGeocache && this.associatedGeocache.code) {
                    console.log("Tentative de récupération de l'ID à partir du code GC...");
                    
                    // Montrer un message d'erreur
                    this.showCreateWaypointAutoError("Récup. ID...");
                    
                    // Récupérer l'ID et réessayer
                    fetch(`/api/geocaches/by-code/${this.associatedGeocache.code}`)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`Impossible de récupérer les détails de la géocache ${this.associatedGeocache.code}`);
                            }
                            return response.json();
                        })
                        .then(geocacheData => {
                            console.log("Données de la géocache récupérées:", geocacheData);
                            
                            if (!geocacheData.id || isNaN(parseInt(geocacheData.id))) {
                                throw new Error(`ID invalide ou non numérique retourné pour la géocache: ${geocacheData.id}`);
                            }
                            
                            // Mise à jour de l'objet associatedGeocache avec l'ID
                            this.associatedGeocache.databaseId = parseInt(geocacheData.id);
                            
                            // Réessayer la création du waypoint
                            console.log("ID récupéré, on réessaie la création du waypoint...");
                            this.createWaypointWithJSON(gcLat, gcLon, originalCoordinates);
                        })
                        .catch(error => {
                            console.error("Erreur lors de la récupération de l'ID:", error);
                            this.showCreateWaypointAutoError("ID non trouvé");
                            this.showErrorMessage("Impossible de récupérer l'ID de la géocache.");
                        });
                    return;
                }
                
                this.showCreateWaypointAutoError("ID manquant");
                this.showErrorMessage("Impossible de créer un waypoint pour cette géocache. ID de base de données manquant.");
                return;
            }
            
            // Utiliser l'ID numérique de la géocache
            const databaseId = this.associatedGeocache.databaseId;
            console.log("Utilisation de l'ID numérique:", databaseId);
            
            const waypointData = {
                name: waypointName,
                prefix: "AL", // Pour Alphabet
                gc_lat: gcLat,
                gc_lon: gcLon,
                note: note,
                geocache_id: databaseId
            };
            
            console.log("Données du waypoint:", waypointData);
            
            // Afficher l'indicateur de chargement
            this.showCreateWaypointAutoLoading();
            
            // Utiliser l'ID numérique dans l'URL de l'API
            fetch(`/api/geocaches/${databaseId}/waypoints`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(waypointData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                
                // Vérifier si la réponse est du JSON
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return response.json();
                } else {
                    // Si ce n'est pas du JSON, traiter comme du texte
                    return response.text().then(text => {
                        console.log("Réponse non-JSON reçue:", text);
                        return {
                            name: waypointName,
                            prefix: "AL",
                            gc_lat: gcLat,
                            gc_lon: gcLon,
                            _success: true // Indicateur que l'opération a réussi
                        };
                    });
                }
            })
            .then(data => {
                console.log("Waypoint créé avec succès:", data);
                this.showCreateWaypointAutoSuccess();
                
                // Annoncer la création du waypoint pour mettre à jour la carte
                const event = new CustomEvent('waypointSaved', {
                    detail: {
                        waypoint: data,
                        geocacheId: this.associatedGeocache.id || databaseId,
                        isNew: true
                    },
                    bubbles: true
                });
                document.dispatchEvent(event);
                
                // Si la géocache est ouverte, mettre à jour sa liste de waypoints
                if (this.associatedGeocache.databaseId) {
                    this.updateWaypointsList(this.associatedGeocache.databaseId);
                }
            })
            .catch(error => {
                console.error("Erreur lors de la création du waypoint (JSON):", error);
                
                // Si c'est une erreur 405, essayer avec FormData à la place
                if (error.message.includes("405")) {
                    console.log("Méthode POST non autorisée avec JSON. Tentative avec FormData...");
                    this.createWaypointWithFormData(gcLat, gcLon, originalCoordinates);
                    return;
                }
                
                this.showCreateWaypointAutoError("Erreur API (JSON)");
            });
        }

        /**
         * Méthode alternative pour créer un waypoint en utilisant FormData
         */
        createWaypointWithFormData(gcLat, gcLon, originalCoordinates) {
            console.log("=== Appel de createWaypointWithFormData ===");
            console.log("État actuel de la géocache:", this.associatedGeocache);
            
            // Générer un nom pour le waypoint
            const waypointName = "Coordonnées Alphabet";
            const note = `Point créé à partir des coordonnées détectées dans l'alphabet.\nSource: ${this.decodedTextTarget.value}\nCoordonnées: ${originalCoordinates}`;
            
            // Vérifier si nous avons l'ID numérique de la géocache
            if (!this.associatedGeocache || !this.associatedGeocache.databaseId) {
                console.error("Impossible de créer un waypoint sans ID numérique de géocache");
                this.showCreateWaypointAutoError("ID manquant");
                this.showErrorMessage("Impossible de créer un waypoint pour cette géocache. ID de base de données manquant.");
                return;
            }
            
            // Utiliser l'ID numérique de la géocache
            const databaseId = this.associatedGeocache.databaseId;
            console.log("Utilisation de l'ID numérique:", databaseId);
            
            // Utiliser FormData au lieu de JSON
            const formData = new FormData();
            formData.append('name', waypointName);
            formData.append('prefix', 'AL'); // Pour Alphabet
            formData.append('gc_lat', gcLat);
            formData.append('gc_lon', gcLon);
            formData.append('note', note);
            formData.append('geocache_id', databaseId);
            
            // Afficher l'indicateur de chargement
            this.showCreateWaypointAutoLoading();
            
            // Utiliser l'ID numérique dans l'URL de l'API
            fetch(`/api/geocaches/${databaseId}/waypoints`, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                
                return response.text();
            })
            .then(data => {
                console.log("Waypoint créé avec succès:", data);
                this.showCreateWaypointAutoSuccess();
                
                // Si la géocache est ouverte, mettre à jour sa liste de waypoints
                if (this.associatedGeocache.databaseId) {
                    this.updateWaypointsList(this.associatedGeocache.databaseId);
                }
            })
            .catch(error => {
                console.error("Erreur lors de la création du waypoint (FormData):", error);
                this.showCreateWaypointAutoError("Erreur API (FormData)");
            });
        }
    })
})()