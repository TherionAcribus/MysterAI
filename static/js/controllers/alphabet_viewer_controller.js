// Alphabet Viewer Controller
(() => {
    const application = Stimulus.Application.start()
    
    application.register("alphabet-viewer", class extends Stimulus.Controller {
        static targets = ["enteredSymbols", "decodedText", "availableSymbol"]
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
                symbolElement.classList.add('opacity-50')
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

            // Retirer l'effet d'opacité de tous les symboles
            this.enteredSymbolsTarget.querySelectorAll('[data-index]').forEach(el => {
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

        updateDisplay() {
            // Mettre à jour les symboles entrés
            this.enteredSymbolsTarget.innerHTML = this.enteredChars
                .map((char, index) => {
                    const symbol = this.availableSymbolTargets.find(s => s.dataset.char === char)
                    if (!symbol) return ''

                    // Gérer différemment selon le type de symbole (font ou image)
                    let symbolContent
                    if (symbol.querySelector('span')) {
                        // Cas d'une police personnalisée
                        symbolContent = symbol.querySelector('span').cloneNode(true)
                        symbolContent.classList.remove('group-hover:text-gray-200')
                    } else if (symbol.querySelector('img')) {
                        // Cas d'une image
                        symbolContent = symbol.querySelector('img').cloneNode(true)
                    } else {
                        return ''
                    }

                    return `
                        <div class="w-24 h-24 flex items-center justify-center bg-gray-800 rounded-lg cursor-move group"
                             draggable="true"
                             data-index="${index}"
                             data-char="${char}">
                            ${symbolContent.outerHTML}
                        </div>
                    `
                }).join('')

            // Mettre à jour le texte décodé
            this.decodedTextTarget.value = this.enteredChars.join('')
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
            if (event.key === 'Backspace' && this.enteredChars.length > 0) {
                event.preventDefault()
                this.removeSymbol(this.enteredChars.length - 1)
            }
        }
    })
})()
