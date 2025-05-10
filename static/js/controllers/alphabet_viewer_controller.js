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
            "sendCoordinatesBtn",
            "originalCoordinates",
            "originalCoordinatesValue"
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
                        code: this.associatedGeocache.code
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
                    this.associateGeocache(geocache);
                    
                    // Mettre à jour le sélecteur si la géocache est ouverte
                    if (geocache.id) {
                        this.geocacheSelectTarget.value = geocache.id;
                    }
                } catch (e) {
                    console.error('Erreur lors du chargement de l\'association:', e);
                }
            }
        }
        
        // Envoyer les coordonnées détectées à la géocache
        sendCoordinatesToGeocache() {
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
            const hasAssociatedGeocache = this.associatedGeocache && this.associatedGeocache.id;
            
            this.sendCoordinatesBtnTarget.disabled = !(hasCoordinates && hasAssociatedGeocache);
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
    })
})()
