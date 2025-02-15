// Alphabet Viewer Controller
(() => {
    const application = Stimulus.Application.start()
    
    application.register("alphabet-viewer", class extends Stimulus.Controller {
        static targets = ["enteredSymbols", "decodedText", "availableSymbol"]
        static values = {
            alphabetId: String
        }

        connect() {
            console.log('Alphabet Viewer Controller connected')
            this.enteredChars = []
            this.updateDisplay()
            this.setupContextMenu()
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
            
            // Add character to our list
            this.enteredChars.push(char)
            
            // Update display
            this.updateDisplay()
        }

        updateDisplay() {
            console.log('Updating display with chars:', this.enteredChars)
            
            // Update entered symbols area
            const symbolsHtml = this.enteredChars.map((char, index) => {
                const symbol = this.availableSymbolTargets.find(s => s.dataset.char === char)
                if (!symbol) return ''
                
                // Create a clone of the symbol content
                const symbolContent = symbol.querySelector('span').cloneNode(true)
                symbolContent.classList.remove('group-hover:text-gray-200')
                
                return `<div class="inline-flex items-center justify-center bg-gray-700 rounded p-2 relative group" data-index="${index}">
                    ${symbolContent.outerHTML}
                </div>`
            }).join('')
            
            this.enteredSymbolsTarget.innerHTML = symbolsHtml
            
            // Update decoded text
            this.decodedTextTarget.value = this.enteredChars.join('')
        }

        removeSymbol(index) {
            if (typeof index === 'number' && index >= 0 && index < this.enteredChars.length) {
                console.log('Removing symbol at index:', index)
                this.enteredChars.splice(index, 1)
                this.updateDisplay()
            }
        }

        keydown(event) {
            // Keyboard shortcut to remove last character
            if (event.key === 'Backspace' && this.enteredChars.length > 0) {
                event.preventDefault()
                this.enteredChars.pop()
                this.updateDisplay()
            }
        }
    })
})()
