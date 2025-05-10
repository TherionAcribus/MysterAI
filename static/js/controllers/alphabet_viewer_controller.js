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
            "coordinatesDetectionStatus"
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
            
            // Afficher le statut "Analyse en cours"
            this.coordinatesDetectionStatusTarget.textContent = "Analyse..."
            this.coordinatesDetectionStatusTarget.classList.remove('hidden', 'bg-green-700', 'bg-red-700')
            this.coordinatesDetectionStatusTarget.classList.add('bg-yellow-700')
            this.coordinatesDetectionStatusTarget.classList.remove('hidden')
            
            fetch('/api/detect_coordinates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: text })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Résultat de la détection de coordonnées:', data)
                
                if (data.exist) {
                    // Coordonnées trouvées !
                    this.detectedCoordinatesTarget.textContent = data.ddm || 'N/A'
                    this.detectedLatitudeTarget.textContent = data.ddm_lat || 'N/A'
                    this.detectedLongitudeTarget.textContent = data.ddm_lon || 'N/A'
                    
                    // Afficher le conteneur des coordonnées et masquer le message "Aucune coordonnée"
                    this.coordinatesContainerTarget.classList.remove('hidden')
                    this.noCoordinatesMessageTarget.classList.add('hidden')
                    
                    // Mettre à jour le statut
                    this.coordinatesDetectionStatusTarget.textContent = "Trouvées !"
                    this.coordinatesDetectionStatusTarget.classList.remove('bg-yellow-700')
                    this.coordinatesDetectionStatusTarget.classList.add('bg-green-700')
                } else {
                    // Aucune coordonnée trouvée
                    this.resetCoordinatesDisplay()
                    
                    // Mettre à jour le statut
                    this.coordinatesDetectionStatusTarget.textContent = "Non trouvées"
                    this.coordinatesDetectionStatusTarget.classList.remove('bg-yellow-700')
                    this.coordinatesDetectionStatusTarget.classList.add('bg-red-700')
                }
            })
            .catch(error => {
                console.error('Erreur lors de la détection des coordonnées:', error)
                this.resetCoordinatesDisplay()
                
                // Mettre à jour le statut
                this.coordinatesDetectionStatusTarget.textContent = "Erreur"
                this.coordinatesDetectionStatusTarget.classList.remove('bg-yellow-700')
                this.coordinatesDetectionStatusTarget.classList.add('bg-red-700')
            })
        }
        
        // Réinitialiser l'affichage des coordonnées
        resetCoordinatesDisplay() {
            // Masquer le conteneur des coordonnées et afficher le message "Aucune coordonnée"
            this.coordinatesContainerTarget.classList.add('hidden')
            this.noCoordinatesMessageTarget.classList.remove('hidden')
            
            // Réinitialiser les valeurs
            this.detectedCoordinatesTarget.textContent = ''
            this.detectedLatitudeTarget.textContent = ''
            this.detectedLongitudeTarget.textContent = ''
            
            // Réinitialiser le statut
            this.coordinatesDetectionStatusTarget.classList.add('hidden')
        }

        removeSymbol(index) {
            if (index >= 0 && index < this.enteredChars.length) {
                this.enteredChars.splice(index, 1)
                this.updateDisplay()
            }
        }

        duplicateSymbol(index) {
            if (index >= 0 && index < this.enteredChars.length) {
                const char = this.enteredChars[index]
                // Insérer le symbole dupliqué juste après l'original
                this.enteredChars.splice(index + 1, 0, char)
                this.updateDisplay()
            }
        }

        keydown(event) {
            // Ne pas traiter les touches si l'utilisateur est en train de saisir dans le champ texte
            if (event.target === this.decodedTextTarget) {
                return;
            }
            
            if (event.key === 'Backspace' && this.enteredChars.length > 0) {
                event.preventDefault();
                this.removeSymbol(this.enteredChars.length - 1);
            }
        }

        // Nouvelle méthode pour gérer la saisie directe dans le champ de texte
        handleTextInput(event) {
            const newText = event.target.value;
            console.log('Saisie directe dans le champ texte:', newText);
            
            // Convertir le texte en tableau de caractères
            this.isUpdatingFromTextInput = true;
            this.enteredChars = Array.from(newText);
            
            // Mettre à jour l'affichage (uniquement les symboles, pas le texte)
            this.updateDisplay();
            
            // Détecter les coordonnées
            this.detectCoordinatesDebounced(newText);
        }
    })
})()
