// Formula Solver Controller
(() => {
    class FormulaSolverController extends Stimulus.Controller {
        static targets = [
            "formulaInput", 
            "loading", 
            "results", 
            "error", 
            "letterInputs", 
            "letterFields", 
            "substitutedFormula", 
            "substitutedFormulaText", 
            "calculatedCoordinates", 
            "calculatedCoordinatesText",
            "geocacheId",
            "loadingQuestions",
            "extractionMethodAI",
            "extractionMethodRegex",
            "solvingWithAI",
            "solvingOverlay",
            "extractionModeDisplay",
            "detectedFormulasContainer",
            "detectedFormulasLoading",
            "questionExtractionModeDisplay",
            "copyCoordinatesButton",
            "addWaypointButton",
            "createWaypointAutoButton",
            "openGeoCheckButton"
        ]
        static values = {
            geocacheId: String,
            gcCode: String
        }

        connect() {
            console.log("Formula Solver Controller connected", {
                geocacheId: this.geocacheIdValue,
                gcCode: this.gcCodeValue
            });
            
            // Initialiser le dictionnaire pour stocker les données des lettres
            this.letterData = new Map();
            
            // Initialiser le type de valeur par défaut à 'value'
            this.selectedValueType = 'value';
            console.log("Type de valeur par défaut initialisé à:", this.selectedValueType);
            
            // Déclencher l'extraction des lettres si une formule est déjà présente
            const formula = this.formulaInputTarget.value.trim();
            if (formula) {
                this.extractLetters();
            }
            
            // Récupérer le paramètre de méthode d'extraction des formules (ia ou regex)
            this.formulaExtractionMethod = 'regex'; // Valeur par défaut
            this.loadFormulaExtractionMethod();
            
            // Récupérer le paramètre de méthode d'extraction des questions (ia ou regex)
            this.questionExtractionMethod = 'ai'; // Valeur par défaut
            this.loadQuestionExtractionMethod();
            
            // Ajouter un gestionnaire d'événements pour le clic droit sur les éléments avec la classe geocache-description
            document.querySelectorAll('.geocache-description').forEach(element => {
                element.addEventListener('contextmenu', this.handleContextMenu.bind(this));
            });
        }
        
        /**
         * Charge la méthode d'extraction des formules depuis les paramètres
         */
        loadFormulaExtractionMethod() {
            console.log('=== DEBUG: Chargement du paramètre formula_extraction_method ===');
            
            fetch('/api/settings/param/formula_extraction_method')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erreur HTTP: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('=== DEBUG: Méthode d\'extraction des formules ===', data);
                    
                    if (data.success && data.value) {
                        this.formulaExtractionMethod = data.value;
                        console.log(`=== DEBUG: Méthode d'extraction des formules définie à: ${this.formulaExtractionMethod} ===`);
                        
                        // Mettre à jour l'affichage
                        if (this.hasExtractionModeDisplayTarget) {
                            this.extractionModeDisplayTarget.textContent = this.formulaExtractionMethod === 'ia' ? 'IA' : 'Regex';
                        }
                    } else {
                        console.warn('=== WARN: Paramètre formula_extraction_method non disponible, utilisation de regex par défaut ===');
                    }
                })
                .catch(error => {
                    console.error('Erreur lors du chargement du paramètre formula_extraction_method:', error);
                });
        }

        /**
         * Charge la méthode d'extraction des questions depuis les paramètres
         */
        loadQuestionExtractionMethod() {
            console.log('=== DEBUG: Chargement du paramètre question_extraction_method ===');
            
            fetch('/api/settings/param/question_extraction_method')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erreur HTTP: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('=== DEBUG: Méthode d\'extraction des questions ===', data);
                    
                    if (data.success && data.value) {
                        this.questionExtractionMethod = data.value;
                        console.log(`=== DEBUG: Méthode d'extraction des questions définie à: ${this.questionExtractionMethod} ===`);
                        
                        // Mettre à jour l'affichage des boutons radio en fonction de la méthode par défaut
                        if (this.hasExtractionMethodAITarget && this.hasExtractionMethodRegexTarget) {
                            if (this.questionExtractionMethod === 'ai') {
                                this.extractionMethodAITarget.checked = true;
                                this.extractionMethodRegexTarget.checked = false;
                            } else {
                                this.extractionMethodAITarget.checked = false;
                                this.extractionMethodRegexTarget.checked = true;
                            }
                        }
                        
                        // Mettre à jour l'affichage du mode d'extraction
                        this.updateQuestionExtractionModeDisplay();
                    } else {
                        console.warn('=== WARN: Paramètre question_extraction_method non disponible, utilisation de IA par défaut ===');
                    }
                    
                    // Ajouter des écouteurs d'événements pour mettre à jour l'affichage lorsqu'on change de méthode
                    if (this.hasExtractionMethodAITarget && this.hasExtractionMethodRegexTarget) {
                        this.extractionMethodAITarget.addEventListener('change', () => this.updateQuestionExtractionModeDisplay());
                        this.extractionMethodRegexTarget.addEventListener('change', () => this.updateQuestionExtractionModeDisplay());
                    }
                })
                .catch(error => {
                    console.error('Erreur lors du chargement du paramètre question_extraction_method:', error);
                });
        }

        /**
         * Met à jour l'affichage du mode d'extraction des questions
         */
        updateQuestionExtractionModeDisplay() {
            if (this.hasQuestionExtractionModeDisplayTarget) {
                const method = this.extractionMethodAITarget.checked ? 'IA' : 'Regex';
                this.questionExtractionModeDisplayTarget.textContent = method;
            }
        }

        // Définir le type de valeur pour toutes les lettres
        setGlobalValueType(event) {
            this.selectedValueType = event.target.value;
            
            console.log(`setGlobalValueType appelé, nouveau type: ${this.selectedValueType}`);
            
            // Mettre à jour tous les boutons radio des lettres individuelles
            this.letterFieldsTarget.querySelectorAll(`input[name^="value-type-"]`).forEach(radio => {
                if (radio.value === this.selectedValueType) {
                    radio.checked = true;
                } else {
                    radio.checked = false;
                }
            });
            
            // Mettre à jour le type de valeur sélectionné pour chaque lettre dans letterData
            this.letterData.forEach((data, letter) => {
                data.selectedType = this.selectedValueType;
            });
            
            console.log("Type de valeur mis à jour pour toutes les lettres");
            
            // Forcer la mise à jour avec un petit délai
            setTimeout(() => {
                console.log("Mise à jour forcée après changement global de type de valeur");
                
                // Mettre à jour la formule et les calculs
                this.updateSubstitutedFormula();
                this.calculateCoordinates();
            }, 10);
        }
        
        // Définir le type de valeur pour une lettre spécifique
        setLetterValueType(event) {
            const letter = event.target.dataset.letter;
            const valueType = event.target.value;
            
            console.log(`setLetterValueType appelé pour lettre ${letter}, type ${valueType}`);
            
            if (letter && this.letterData.has(letter)) {
                const data = this.letterData.get(letter);
                data.selectedType = valueType;
                this.letterData.set(letter, data);
                
                console.log(`Type de valeur mis à jour pour ${letter}: ${valueType}`);
                
                // Forcer la mise à jour avec un petit délai pour s'assurer que tout est bien traité
                setTimeout(() => {
                    console.log("Mise à jour forcée après changement de type de valeur");
                    
                    // Mettre à jour la formule et les calculs
                    this.updateSubstitutedFormula();
                    this.calculateCoordinates();
                }, 10);
            }
        }

        // Extraire les lettres de la formule
        extractLetters(event) {
            const formula = this.formulaInputTarget.value.trim();
            
            if (!formula) {
                this.letterInputsTarget.classList.add('hidden');
                this.substitutedFormulaTarget.classList.add('hidden');
                this.calculatedCoordinatesTarget.classList.add('hidden');
                return;
            }
            
            // Extraction des lettres (A-Z) dans la formule
            const letters = this.extractUniqueLetters(formula);
            
            // Créer les champs de saisie pour chaque lettre si elles existent
            if (letters.length > 0) {
                this.createLetterInputFields(letters);
                this.letterInputsTarget.classList.remove('hidden');
            } else {
                this.letterInputsTarget.classList.add('hidden');
            }
            
            // Mettre à jour la formule substituée
            this.updateSubstitutedFormula();
            
            // Calculer et afficher les coordonnées, même sans valeurs pour les lettres
            this.calculateCoordinates();
            
            // Si l'ID de la géocache est disponible et qu'il y a des lettres, extraire les questions
            if (this.geocacheIdValue && letters.length > 0) {
                this.extractQuestions(this.geocacheIdValue, letters);
            }
        }
        
        // Extraire les lettres uniques de la formule
        extractUniqueLetters(formula) {
            // Cette méthode est optimisée pour les formules du type:
            // N49°12.(A+B+C+D+E+F+G+H+I+J-317) E005°59.(A+B+C+D+E+F+G+H+I+J-197)
            
            // Si la méthode d'extraction est IA et que l'on a un ID de géocache, utiliser l'IA
            if (this.formulaExtractionMethod === 'ia' && this.geocacheIdValue) {
                return this.extractUniqueLettersWithAI(formula);
            } else {
                // Sinon utiliser la méthode regex (par défaut)
                return this.extractUniqueLettersWithRegex(formula);
            }
        }
        
        // Extraction des lettres avec IA
        extractUniqueLettersWithAI(formula) {
            console.log('=== DEBUG: Extraction des lettres avec IA ===');
            
            // REMARQUE: Comme l'IA est asynchrone, cette méthode ne peut pas retourner directement les lettres
            // On doit donc faire une requête et traiter les résultats plus tard
            // Pour l'instant, on utilise quand même regex en attendant
            
            // Déclencher une requête pour extraire les lettres par IA
            fetch('/geocaches/formula-extract-letters', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    geocache_id: this.geocacheIdValue,
                    formula: formula
                }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success && data.letters && data.letters.length > 0) {
                    console.log('=== Lettres extraites par IA ===', data.letters);
                    
                    // Mettre à jour l'interface avec les lettres extraites par l'IA
                    this.createLetterInputFields(data.letters);
                    
                    // Si l'IA retourne une formule propre, la mettre à jour
                    if (data.clean_formula) {
                        this.formulaInputTarget.value = data.clean_formula;
                    }
                    
                    // Mettre à jour la formule substituée
                    this.updateSubstitutedFormula();
                    
                    // Extraire les questions si nécessaire
                    if (this.geocacheIdValue) {
                        this.extractQuestions(this.geocacheIdValue, data.letters);
                    }
                } else {
                    console.error('Erreur lors de l\'extraction des lettres par IA:', data.error || 'Aucune lettre trouvée');
                }
            })
            .catch(error => {
                console.error('Erreur lors de la requête d\'extraction par IA:', error);
            });
            
            // En attendant la réponse de l'IA, utiliser regex pour ne pas bloquer l'interface
            return this.extractUniqueLettersWithRegex(formula);
        }
        
        // Extraction des lettres avec regex (méthode originale)
        extractUniqueLettersWithRegex(formula) {
            let letterMatches = [];
            
            // On extrait les lettres à l'intérieur des parenthèses
            const parenthesesRegex = /\(([^()]+)\)/g;
            let match;
            
            while ((match = parenthesesRegex.exec(formula)) !== null) {
                const content = match[1];
                // Extraire les lettres majuscules dans le contenu des parenthèses
                const letters = content.match(/[A-Z]/g) || [];
                letterMatches = [...letterMatches, ...letters];
            }
            
            // Rechercher également des lettres après un point (peu importe s'il y a des parenthèses ou non)
            const decimalRegex = /\.([A-Z0-9+\-*\/]+)/g;
            while ((match = decimalRegex.exec(formula)) !== null) {
                const content = match[1];
                const letters = content.match(/[A-Z]/g) || [];
                letterMatches = [...letterMatches, ...letters];
            }
            
            // Filtrer et trier les lettres uniques
            return [...new Set(letterMatches)].sort();
        }
        
        // Créer les champs de saisie pour chaque lettre
        createLetterInputFields(letters) {
            const existingLetters = new Set(
                Array.from(this.letterFieldsTarget.querySelectorAll('.letter-container'))
                    .map(container => container.dataset.letter)
            );
            
            // Créer les nouveaux champs
            let html = '';
            letters.forEach(letter => {
                if (!existingLetters.has(letter)) {
                    // Initialiser les données pour cette lettre si elles n'existent pas déjà
                    if (!this.letterData.has(letter)) {
                        this.letterData.set(letter, {
                            word: '',
                            checksum: 0,
                            'reduced-checksum': 0,
                            length: 0,
                            selectedType: this.selectedValueType || 'value'
                        });
                        console.log(`Données initialisées pour la lettre ${letter} avec type=${this.selectedValueType || 'value'}`);
                    }
                    
                    html += this.createLetterFieldHTML(letter);
                }
            });
            
            // Supprimer les lettres qui ne sont plus dans la formule
            Array.from(this.letterFieldsTarget.querySelectorAll('.letter-container')).forEach(container => {
                const letter = container.dataset.letter;
                if (!letters.includes(letter)) {
                    container.remove();
                    this.letterData.delete(letter);
                }
            });
            
            // Ajouter les nouveaux champs à l'interface
            if (html) {
                this.letterFieldsTarget.insertAdjacentHTML('beforeend', html);
            }
            
            // Afficher l'état actuel de letterData après la création des champs
            console.log("État de letterData après createLetterInputFields:");
            this.letterData.forEach((data, key) => {
                console.log(`Lettre ${key}:`, data);
            });
        }
        
        // Créer le HTML pour un champ de lettre
        createLetterFieldHTML(letter) {
            // Déterminer le type de valeur par défaut (utiliser 'value' si rien n'est défini)
            const defaultValueType = this.selectedValueType || 'value';
            console.log(`Création du champ pour la lettre ${letter} avec type de valeur par défaut: ${defaultValueType}`);
            
            return `
                <div class="bg-gray-700 p-4 rounded letter-container" data-letter="${letter}">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-lg font-bold text-white">Lettre ${letter}</h3>
                        <div class="flex items-center space-x-4">
                            <label class="flex items-center space-x-1 text-gray-300 text-sm">
                                <input type="radio" name="value-type-${letter}" value="value" 
                                       ${defaultValueType === 'value' ? 'checked' : ''}
                                       data-letter="${letter}" data-action="change->formula-solver#setLetterValueType">
                                <span>Valeur</span>
                            </label>
                            <label class="flex items-center space-x-1 text-gray-300 text-sm">
                                <input type="radio" name="value-type-${letter}" value="checksum" 
                                       ${defaultValueType === 'checksum' ? 'checked' : ''}
                                       data-letter="${letter}" data-action="change->formula-solver#setLetterValueType">
                                <span>Checksum</span>
                            </label>
                            <label class="flex items-center space-x-1 text-gray-300 text-sm">
                                <input type="radio" name="value-type-${letter}" value="reduced-checksum" 
                                       ${defaultValueType === 'reduced-checksum' ? 'checked' : ''}
                                       data-letter="${letter}" data-action="change->formula-solver#setLetterValueType">
                                <span>Réduit</span>
                            </label>
                            <label class="flex items-center space-x-1 text-gray-300 text-sm">
                                <input type="radio" name="value-type-${letter}" value="length" 
                                       ${defaultValueType === 'length' ? 'checked' : ''}
                                       data-letter="${letter}" data-action="change->formula-solver#setLetterValueType">
                                <span>Longueur</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-gray-300 text-sm font-medium mb-1">
                                Mot ou expression
                            </label>
                            <input 
                                type="text" 
                                class="bg-gray-800 text-white border border-gray-600 rounded w-full py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                data-letter="${letter}"
                                data-field="word"
                                data-action="input->formula-solver#updateLetterData">
                        </div>
                        <div class="grid grid-cols-3 gap-2">
                            <div>
                                <label class="block text-gray-300 text-sm font-medium mb-1">
                                    Checksum
                                </label>
                                <input 
                                    type="text" 
                                    class="bg-gray-800 text-white border border-gray-600 rounded w-full py-2 px-3" 
                                    data-letter="${letter}"
                                    data-field="checksum"
                                    readonly>
                            </div>
                            <div>
                                <label class="block text-gray-300 text-sm font-medium mb-1">
                                    Réduit
                                </label>
                                <input 
                                    type="text" 
                                    class="bg-gray-800 text-white border border-gray-600 rounded w-full py-2 px-3" 
                                    data-letter="${letter}"
                                    data-field="reduced-checksum"
                                    readonly>
                            </div>
                            <div>
                                <label class="block text-gray-300 text-sm font-medium mb-1">
                                    Longueur
                                </label>
                                <input 
                                    type="text" 
                                    class="bg-gray-800 text-white border border-gray-600 rounded w-full py-2 px-3" 
                                    data-letter="${letter}"
                                    data-field="length"
                                    readonly>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-3 question-container">
                        <div class="flex items-center justify-between mb-1">
                            <label class="block text-gray-300 text-sm font-medium">
                                Question
                            </label>
                            <div class="flex items-center space-x-1">
                                <button 
                                    class="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                                    data-action="click->formula-solver#copyQuestion"
                                    data-letter="${letter}"
                                    title="Copier la question">
                                    Copier
                                </button>
                                <button 
                                    class="bg-purple-600 hover:bg-purple-700 text-white text-xs px-2 py-1 rounded"
                                    data-action="click->formula-solver#searchOnWeb" 
                                    data-letter="${letter}"
                                    title="Rechercher sur le web">
                                    Rechercher
                                </button>
                                <button 
                                    class="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                                    data-action="click->formula-solver#solveSingleQuestion"
                                    data-letter="${letter}">
                                    Résoudre
                                </button>
                            </div>
                        </div>
                        <textarea 
                            class="letter-question-input bg-gray-800 text-yellow-300 border border-gray-600 rounded w-full py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
                            data-letter="${letter}"
                            data-field="question"
                            data-action="change->formula-solver#updateQuestionData"
                            placeholder="La question apparaîtra ici après l'extraction"></textarea>
                    </div>
                </div>
            `;
        }
        
        // Mettre à jour les données d'une lettre
        updateLetterData(event) {
            const letter = event.target.dataset.letter;
            const field = event.target.dataset.field;
            const value = event.target.value.trim();
            
            console.log(`updateLetterData appelé pour lettre ${letter}, champ ${field}, valeur "${value}"`);
            
            if (letter && field === 'word') {
                // Initialiser ou mettre à jour les données pour cette lettre
                const letterData = this.letterData.get(letter) || {
                    word: '',
                    checksum: 0,
                    'reduced-checksum': 0,
                    length: 0,
                    selectedType: this.selectedValueType || 'value' // Assurer qu'on a toujours un type
                };
                
                // Mettre à jour le mot
                letterData.word = value;
                
                // Toujours calculer le checksum correctement, même pour les valeurs numériques
                letterData.checksum = this.calculateChecksum(value);
                
                // Calculer le checksum réduit
                letterData['reduced-checksum'] = this.reduceChecksum(letterData.checksum);
                
                // Calculer la longueur
                letterData.length = value.length;
                
                // S'assurer que selectedType est défini
                if (!letterData.selectedType) {
                    letterData.selectedType = this.selectedValueType || 'value';
                }
                
                // Mettre à jour la map des données
                this.letterData.set(letter, letterData);
                
                console.log(`Données mises à jour pour ${letter}:`, letterData);
                console.log(`Type de valeur sélectionné pour ${letter}: ${letterData.selectedType}`);
                
                // Mettre à jour les champs d'affichage
                this.updateLetterFields(letter, letterData);
                
                // Forcer la mise à jour avec un petit délai pour s'assurer que tout est bien traité
                setTimeout(() => {
                    // Déboguer la map letterData complète
                    console.log("État actuel de letterData:");
                    this.letterData.forEach((data, key) => {
                        console.log(`Lettre ${key}:`, data);
                    });
                    
                    // Afficher les types de valeur sélectionnés
                    console.log(`Type de valeur global: ${this.selectedValueType}`);
                    
                    // Mettre à jour la formule substituée
                    this.updateSubstitutedFormula();
                    
                    // Recalculer les coordonnées
                    this.calculateCoordinates();
                }, 10);
            }
        }
        
        // Mettre à jour les champs d'affichage pour une lettre
        updateLetterFields(letter, data) {
            const container = this.letterFieldsTarget.querySelector(`.letter-container[data-letter="${letter}"]`);
            if (!container) return;
            
            // Mettre à jour les champs de lecture seule
            container.querySelector(`[data-field="checksum"]`).value = data.checksum;
            container.querySelector(`[data-field="reduced-checksum"]`).value = data['reduced-checksum'];
            container.querySelector(`[data-field="length"]`).value = data.length;
        }
        
        // Calculer le checksum d'un mot ou d'une expression
        calculateChecksum(text) {
            if (!text) return 0;
            
            // Convertir en majuscules et supprimer les caractères spéciaux mais garder les chiffres
            const cleanText = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
            
            // Calculer la somme (A=1, B=2, etc. et chiffres conservés tels quels)
            return cleanText.split('').reduce((sum, char) => {
                // Si c'est un chiffre, ajouter directement sa valeur numérique
                if (/[0-9]/.test(char)) {
                    return sum + parseInt(char, 10);
                }
                // Si c'est une lettre, calculer comme avant (A=1, B=2, etc.)
                return sum + (char.charCodeAt(0) - 64);
            }, 0);
        }
        
        // Réduire un nombre à un seul chiffre (ex: 123 -> 1+2+3 = 6)
        reduceChecksum(number) {
            if (number < 10) return number;
            
            const digits = number.toString().split('').map(Number);
            const sum = digits.reduce((a, b) => a + b, 0);
            
            // Réduire de manière récursive jusqu'à obtenir un seul chiffre
            return this.reduceChecksum(sum);
        }
        
        // Obtenir la valeur à utiliser pour une lettre donnée
        getLetterValue(letter) {
            if (!this.letterData.has(letter)) return '';
            
            const data = this.letterData.get(letter);
            const valueType = data.selectedType || this.selectedValueType;
            
            switch (valueType) {
                case 'value':
                    // Si la valeur est numérique, retourner directement la valeur numérique
                    if (data.word && this.isNumeric(data.word)) {
                        return data.word;
                    }
                    return data.word || '';
                case 'checksum':
                    return data.checksum.toString();
                case 'reduced-checksum':
                    return data['reduced-checksum'].toString();
                case 'length':
                    return data.length.toString();
                default:
                    return '';
            }
        }
        
        // Vérifier si une valeur est numérique
        isNumeric(value) {
            return !isNaN(parseFloat(value)) && isFinite(value);
        }
        
        // Mettre à jour la formule avec les substitutions
        updateSubstitutedFormula() {
            console.log("updateSubstitutedFormula appelé");
            const formula = this.formulaInputTarget.value.trim();
            if (!formula) return;
            
            // Découper la formule en préservant les lettres cardinales (N, S, E, W)
            // Format typique: N49°12.(A+B+C+D+E+F+G+H+I+J-317) E005°59.(A+B+C+D+E+F+G+H+I+J-197)
            
            // 1. Séparer les parties Nord/Sud et Est/Ouest
            const parts = this.splitCoordinates(formula);
            
            // 2. Appliquer les substitutions uniquement sur les portions appropriées
            let substitutedFormula = '';
            
            for (const part of parts) {
                if (part.type === 'direction') {
                    // Ne pas modifier les indicateurs de direction
                    substitutedFormula += part.value;
                } else if (part.type === 'content') {
                    // Appliquer les substitutions sur le contenu
                    let content = part.value;
                    
                    // Trouver toutes les lettres dans les formules
                    const matches = content.match(/\(([^()]*[A-Z][^()]*)\)/g) || [];
                    
                    for (const match of matches) {
                        let substituted = match;
                        
                        // Extraire les lettres de cette formule
                        const letters = match.match(/[A-Z]/g) || [];
                        
                        // Remplacer chaque lettre par sa valeur
                        for (const letter of letters) {
                            if (!this.letterData.has(letter)) continue;
                            
                            const data = this.letterData.get(letter);
                            const valueType = data.selectedType || this.selectedValueType;
                            
                            let value;
                            // Obtenir la valeur en fonction du type sélectionné
                            switch (valueType) {
                                case 'value':
                                    // Si c'est un nombre, l'utiliser directement
                                    if (data.word && this.isNumeric(data.word)) {
                                        value = data.word;
                                    } else {
                                        value = data.word || '';
                                    }
                                    break;
                                case 'checksum':
                                    value = data.checksum.toString();
                                    break;
                                case 'reduced-checksum':
                                    value = data['reduced-checksum'].toString();
                                    break;
                                case 'length':
                                    value = data.length.toString();
                                    break;
                            }
                            
                            // Ne remplacer que si la valeur existe
                            if (value !== undefined && value !== '') {
                                // Créer une expression régulière pour cette lettre spécifique
                                const regex = new RegExp(letter, 'g');
                                
                                // Si la valeur est numérique, remplacer directement
                                if (this.isNumeric(value)) {
                                    substituted = substituted.replace(regex, value);
                                } else {
                                    // Si c'est un mot/expression, remplacer par "value"
                                    substituted = substituted.replace(regex, `"${value}"`);
                                }
                            }
                        }
                        
                        // Remplacer la formule originale par la version substituée
                        content = content.replace(match, substituted);
                    }
                    
                    substitutedFormula += content;
                }
            }
            
            console.log(`Formule substituée: "${substitutedFormula}"`);
            
            // Afficher la formule substituée
            this.substitutedFormulaTextTarget.textContent = substitutedFormula;
            this.substitutedFormulaTarget.classList.remove('hidden');
        }

        // Autres méthodes existantes...
        // Code inchangé...
        
        // Découper la formule en fragments (direction et contenu)
        splitCoordinates(formula) {
            const result = [];
            
            // Rechercher les positions des lettres cardinales (N, S, E, W) suivies d'un chiffre
            const directionRegex = /([NSEW])\s*\d+/g;
            let match;
            let lastIndex = 0;
            
            while ((match = directionRegex.exec(formula)) !== null) {
                const direction = match[1];
                const directionIndex = match.index;
                
                // Ajouter le contenu précédent s'il existe
                if (directionIndex > lastIndex) {
                    result.push({
                        type: 'content',
                        value: formula.substring(lastIndex, directionIndex)
                    });
                }
                
                // Ajouter la direction
                result.push({
                    type: 'direction',
                    value: direction
                });
                
                // Mettre à jour l'indice pour la prochaine recherche
                lastIndex = directionIndex + direction.length;
            }
            
            // Ajouter le contenu restant
            if (lastIndex < formula.length) {
                result.push({
                    type: 'content',
                    value: formula.substring(lastIndex)
                });
            }
            
            return result;
        }
        
        // Calculer les coordonnées finales en remplaçant les valeurs des lettres avec des nombres
        calculateCoordinates() {
            console.log("calculateCoordinates appelé");
            const formula = this.formulaInputTarget.value.trim();
            if (!formula) return;

            console.log("État de letterData avant collecte des variables:");
            this.letterData.forEach((data, letter) => {
                console.log(`Lettre ${letter}:`, data);
            });

            // Collecter les variables et leurs valeurs
            const allLetters = this.extractUniqueLetters(formula);
            console.log("Lettres extraites:", allLetters);
            
            const variables = {};

            // Collecter les valeurs pour chaque lettre en fonction du type sélectionné
            for (const letter of allLetters) {
                if (!this.letterData.has(letter)) {
                    console.log(`Lettre ${letter} non trouvée dans letterData`);
                    continue;
                }
                
                const data = this.letterData.get(letter);
                console.log(`Traitement de la lettre ${letter}:`, data);
                
                // Déterminer le type de valeur à utiliser (valeur spécifique à la lettre ou globale)
                const valueType = data.selectedType || this.selectedValueType || 'value';
                console.log(`Type de valeur pour ${letter}: ${valueType}`);
                
                let value;
                
                // Obtenir la valeur en fonction du type
                switch (valueType) {
                    case 'value':
                        // Si la valeur est numérique, l'utiliser directement
                        if (data.word && this.isNumeric(data.word)) {
                            value = parseFloat(data.word);
                            console.log(`Lettre ${letter}: Valeur numérique détectée: ${value}`);
                            // Ajouter immédiatement à variables
                            variables[letter] = value;
                        } else {
                            console.log(`Lettre ${letter}: Valeur non numérique: "${data.word}"`);
                        }
                        break;
                    case 'checksum':
                        value = data.checksum;
                        console.log(`Lettre ${letter}: Utilisation du checksum: ${value}`);
                        if (this.isNumeric(value)) {
                            variables[letter] = parseFloat(value);
                        }
                        break;
                    case 'reduced-checksum':
                        value = data['reduced-checksum'];
                        console.log(`Lettre ${letter}: Utilisation du checksum réduit: ${value}`);
                        if (this.isNumeric(value)) {
                            variables[letter] = parseFloat(value);
                        }
                        break;
                    case 'length':
                        value = data.length;
                        console.log(`Lettre ${letter}: Utilisation de la longueur: ${value}`);
                        if (this.isNumeric(value)) {
                            variables[letter] = parseFloat(value);
                        }
                        break;
                    default:
                        console.log(`Lettre ${letter}: Type de valeur inconnu: ${valueType}`);
                }
            }

            console.log("Variables collectées pour API:", variables);
            
            // Vérifier si des variables ont été collectées
            if (Object.keys(variables).length === 0) {
                console.warn("ATTENTION: Aucune variable numérique n'a été collectée!");
            }
            
            // Récupérer les coordonnées d'origine de la géocache si disponible
            let originData = {};
            const geocacheId = this.geocacheIdValue;
            
            // Récupérer les coordonnées d'origine directement depuis l'élément
            const originLat = this.element.dataset.originLat;
            const originLon = this.element.dataset.originLon;
            
            console.log("Dataset de l'élément:", this.element.dataset);
            console.log("Valeurs d'origine:", { originLat, originLon, geocacheId });
            
            if (originLat && originLon) {
                originData = {
                    origin_lat: originLat,
                    origin_lon: originLon
                };
                console.log("Coordonnées d'origine trouvées:", originData);
            } else {
                console.log("ATTENTION: Aucune coordonnée d'origine trouvée!");
            }

            // Créer les données à envoyer à l'API
            const requestData = {
                formula: formula,
                variables: variables,
                ...originData,
                timestamp: new Date().getTime() // Pour éviter le cache
            };
            
            console.log("Données envoyées à l'API:", JSON.stringify(requestData));

            // Appeler directement l'API qui fonctionne
            fetch('/api/calculate_coordinates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(requestData),
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Réponse de l'API calculate_coordinates:", data);
                console.log("Distance reçue:", data.distance_from_origin);
                
                if (data.error) {
                    console.error("Erreur lors du calcul des coordonnées:", data.error);
                    this.calculatedCoordinatesTextTarget.textContent = `Erreur: ${data.error}`;
                    this.calculatedCoordinatesTextTarget.classList.add('text-red-500');
                    this.calculatedCoordinatesTarget.classList.remove('hidden');
                    
                    // Afficher un message d'erreur convivial pour les problèmes de calcul
                    if (data.error.includes("Erreur de calcul")) {
                        const container = this.calculatedCoordinatesTarget;
                        const warningDiv = document.createElement('div');
                        warningDiv.className = 'mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-900 text-sm';
                        warningDiv.innerHTML = `
                            <i class="fas fa-exclamation-triangle mr-1"></i>
                            <strong>Erreur de calcul :</strong> Une opération mathématique a échoué.
                            <br>
                            ${data.error}
                            <br>
                            En géocaching, toutes les opérations doivent donner des nombres entiers.
                        `;
                        
                        // Supprimer les avertissements existants
                        container.querySelectorAll('.bg-amber-100, .bg-red-100').forEach(el => el.remove());
                        // Ajouter le nouvel avertissement
                        container.appendChild(warningDiv);
                    }
                    
                    return;
                }

                // Créer un affichage HTML avec des couleurs différentes pour chaque partie
                let coordinatesHTML = '';
                
                // Ajouter la latitude avec la couleur appropriée
                if (data.lat_status && data.lat_status.status) {
                    let latClass = '';
                    switch (data.lat_status.status) {
                        case 'complete':
                            latClass = 'text-green-400';
                            break;
                        case 'partial':
                            latClass = 'text-amber-300';
                            break;
                        case 'error':
                            latClass = 'text-red-500';
                            break;
                        default:
                            latClass = 'text-white';
                    }
                    coordinatesHTML += `<span class="${latClass}" title="${data.lat_status.message || ''}">${data.latitude}</span>`;
                } else {
                    // Fallback pour maintenir la compatibilité avec l'ancienne API
                    coordinatesHTML += data.latitude;
                }
                
                // Ajouter un espace entre la latitude et la longitude
                coordinatesHTML += ' ';
                
                // Ajouter la longitude avec la couleur appropriée
                if (data.lon_status && data.lon_status.status) {
                    let lonClass = '';
                    switch (data.lon_status.status) {
                        case 'complete':
                            lonClass = 'text-green-400';
                            break;
                        case 'partial':
                            lonClass = 'text-amber-300';
                            break;
                        case 'error':
                            lonClass = 'text-red-500';
                            break;
                        default:
                            lonClass = 'text-white';
                    }
                    coordinatesHTML += `<span class="${lonClass}" title="${data.lon_status.message || ''}">${data.longitude}</span>`;
                } else {
                    // Fallback pour maintenir la compatibilité avec l'ancienne API
                    coordinatesHTML += data.longitude;
                }
                
                // Ajouter les informations de distance si disponibles
                if (data.distance_from_origin) {
                    const distance = data.distance_from_origin;
                    let distanceClass = '';
                    let distanceMessage = '';
                    
                    switch (distance.status) {
                        case 'ok':
                            distanceClass = 'text-green-400';
                            distanceMessage = `Distance: ${distance.meters} m (${distance.miles} miles) - Conforme aux règles du géocaching`;
                            break;
                        case 'warning':
                            distanceClass = 'text-amber-300';
                            distanceMessage = `Distance: ${distance.meters} m (${distance.miles} miles) - Attention, proche de la limite de 2 miles!`;
                            break;
                        case 'far':
                            distanceClass = 'text-red-500';
                            distanceMessage = `Distance: ${distance.meters} m (${distance.miles} miles) - Trop éloigné! La géocache doit être à moins de 2 miles du point d'origine.`;
                            break;
                    }
                    
                    coordinatesHTML += `<div class="mt-2 ${distanceClass}" title="Distance par rapport au point d'origine">${distanceMessage}</div>`;
                }

                // Afficher les coordonnées avec formatage HTML
                this.calculatedCoordinatesTextTarget.innerHTML = coordinatesHTML;
                this.calculatedCoordinatesTarget.classList.remove('hidden');
                console.log("Coordonnées mises à jour avec formatage spécifique");
                
                // Affichage automatique sur la carte si des coordonnées décimales sont fournies
                if (data.status === 'complete' && data.decimal_latitude && data.decimal_longitude) {
                    console.log(`Affichage automatique du point: ${data.decimal_latitude}, ${data.decimal_longitude}`);
                    
                    // Créer l'événement pour ajouter le point sur la carte
                    const event = new CustomEvent('addCalculatedPointToMap', {
                        detail: {
                            latitude: data.decimal_latitude,
                            longitude: data.decimal_longitude,
                            label: 'Coordonnée calculée',
                            color: 'rgba(255,0,0,0.8)'
                        }
                    });
                    document.dispatchEvent(event);
                    
                    // Afficher une indication que le point a été ajouté
                    const container = this.calculatedCoordinatesTarget;
                    const notificationDiv = document.createElement('div');
                    notificationDiv.className = 'mt-2 text-sm text-green-500';
                    notificationDiv.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Point affiché sur la carte';
                    
                    // Supprimer les notifications existantes
                    container.querySelectorAll('.text-green-500').forEach(el => el.remove());
                    // Ajouter la nouvelle notification
                    container.appendChild(notificationDiv);
                }
                
                // Vérifier si une erreur concernant le nombre de décimales est présente
                const hasDecimalIssue = (data.lat_status && data.lat_status.message && data.lat_status.message.includes('décimales')) || 
                                       (data.lon_status && data.lon_status.message && data.lon_status.message.includes('décimales'));
                
                // Vérifier si une erreur concernant une expression mathématique est présente
                const hasMathIssue = (data.lat_status && data.lat_status.message && 
                                     (data.lat_status.message.includes('expression mathématique') || 
                                      data.lat_status.message.includes('ne donne pas un nombre entier'))) || 
                                    (data.lon_status && data.lon_status.message && 
                                     (data.lon_status.message.includes('expression mathématique') || 
                                      data.lon_status.message.includes('ne donne pas un nombre entier')));
                
                if (hasDecimalIssue || hasMathIssue) {
                    const container = this.calculatedCoordinatesTarget;
                    const warningDiv = document.createElement('div');
                    warningDiv.className = 'mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-900 text-sm';
                    
                    let errorMessage = '';
                    if (hasDecimalIssue) {
                        errorMessage = `
                            <i class="fas fa-exclamation-triangle mr-1"></i>
                            <strong>Erreur de coordonnées :</strong> Les coordonnées affichées ont plus de 3 chiffres après le point.
                            <br>
                            En géocaching, les coordonnées correctes doivent avoir exactement 3 chiffres après le point.
                            <br>
                            Cette erreur indique probablement que certaines valeurs utilisées sont incorrectes.
                        `;
                    } else if (hasMathIssue) {
                        errorMessage = `
                            <i class="fas fa-exclamation-triangle mr-1"></i>
                            <strong>Erreur de calcul :</strong> Une ou plusieurs expressions mathématiques n'ont pas pu être évaluées correctement.
                            <br>
                            Vérifiez les parties entre parenthèses dans les coordonnées affichées.
                            <br>
                            En géocaching, toutes les opérations doivent donner des nombres entiers (par exemple 4/2=2, mais 3/2=1.5 n'est pas valide).
                        `;
                    }
                    
                    warningDiv.innerHTML = errorMessage;
                    
                    // Supprimer les avertissements existants
                    container.querySelectorAll('.bg-amber-100, .bg-red-100').forEach(el => el.remove());
                    // Ajouter le nouvel avertissement
                    container.appendChild(warningDiv);
                }
                
                // Ajouter des infobulles pour les messages d'erreur
                if (data.lat_status && data.lat_status.status === 'error' && data.lat_status.message) {
                    console.log("Message d'erreur pour latitude:", data.lat_status.message);
                }
                if (data.lon_status && data.lon_status.status === 'error' && data.lon_status.message) {
                    console.log("Message d'erreur pour longitude:", data.lon_status.message);
                }
                // --- AJOUT : bouton afficher sur la carte ---
                // Fonction supprimée car le point est désormais affiché automatiquement
                // this.addShowOnMapButtonIfPossible(data);
            })
            .catch(error => {
                console.error("Erreur lors de l'appel à l'API:", error);
                this.calculatedCoordinatesTextTarget.textContent = "Erreur: Impossible de calculer les coordonnées";
                this.calculatedCoordinatesTextTarget.classList.add('text-red-500');
                this.calculatedCoordinatesTarget.classList.remove('hidden');
            });
        }

        // Évaluer une expression mathématique
        evaluateExpression(expression) {
            // Nettoyer l'expression (retirer les espaces et caractères non numériques/opérateurs)
            const cleanExpr = expression.replace(/\s+/g, '');
            
            // Vérifier si l'expression est déjà un nombre
            if (/^\d+$/.test(cleanExpr)) {
                return cleanExpr;
            }
            
            // Séparer les nombres et les opérateurs
            const tokens = cleanExpr.match(/(\d+|[+\-*/])/g) || [];
            
            if (tokens.length === 0) return '';
            
            // Évaluer l'expression
            let result = parseInt(tokens[0], 10);
            for (let i = 1; i < tokens.length; i += 2) {
                const operator = tokens[i];
                const operand = parseInt(tokens[i + 1], 10);
                
                switch (operator) {
                    case '+': result += operand; break;
                    case '-': result -= operand; break;
                    case '*': result *= operand; break;
                    case '/': result /= operand; break;
                }
            }
            
            return result.toString();
        }

        solveFormula(event) {
            event.preventDefault();
            
            const formula = this.formulaInputTarget.value.trim();
            if (!formula) {
                this.showError("Veuillez entrer des coordonnées à résoudre");
                return;
            }
            
            this.showLoading();
            
            // Extraire les lettres et créer les champs
            this.extractLetters();
            
            // Calculer et afficher les coordonnées immédiatement, même sans valeurs pour les lettres
            this.calculateCoordinates();
            
            // Afficher le résultat de base
            this.displayResults({
                input: formula,
                formattedInput: formula,
                status: "success"
            });
        }

        // Méthode pour ajouter les coordonnées d'un waypoint au formulaire
        addToFormula(event) {
            // Récupérer les coordonnées de l'attribut data-coordinates ou de l'objet event
            let coordinates;
            if (event.coordinates) {
                coordinates = event.coordinates;
            } else {
                coordinates = event.currentTarget.dataset.coordinates;
            }
            
            if (coordinates) {
                this.formulaInputTarget.value = coordinates;
                // Extraire les lettres de la nouvelle formule
                this.extractLetters({ target: this.formulaInputTarget });
                // Faire défiler jusqu'au formulaire
                this.formulaInputTarget.scrollIntoView({ behavior: 'smooth' });
                // Mettre le focus sur l'input
                this.formulaInputTarget.focus();
            }
        }

        displayResults(data) {
            this.hideLoading();
            this.errorTarget.classList.add('hidden');
            this.resultsTarget.classList.remove('hidden');

            console.log("Résultats du Formula Solver:", data);

            // Créer le HTML pour les résultats
            let html = '';
            
            if (data.status === "success") {
                html = `
                    <div class="bg-gray-800 rounded-lg p-4 mb-4">
                        <h2 class="text-lg font-semibold text-gray-100 mb-3">Formule détectée</h2>
                        <div class="bg-gray-700 rounded p-3">
                            <div class="text-gray-200">Formule entrée: ${data.formattedInput}</div>
                        </div>
                    </div>
                `;
            } else {
                html = `
                    <div class="bg-gray-800 rounded-lg p-4">
                        <div class="text-red-400">Impossible de résoudre cette formule.</div>
                    </div>
                `;
            }

            // Afficher les résultats
            this.resultsTarget.innerHTML = html;
        }

        showLoading() {
            this.loadingTarget.classList.remove('hidden');
            this.resultsTarget.classList.add('hidden');
            this.errorTarget.classList.add('hidden');
        }

        hideLoading() {
            this.loadingTarget.classList.add('hidden');
        }

        showError(errorMsg = '') {
            this.hideLoading();
            this.resultsTarget.classList.add('hidden');
            this.errorTarget.classList.remove('hidden');
            
            // Ajouter des détails d'erreur si disponibles
            const errorDetails = document.getElementById('error-details');
            if (errorDetails && errorMsg) {
                errorDetails.textContent = errorMsg;
            }
        }

        extractQuestionsManually() {
            const geocacheId = this.geocacheIdTarget.value;
            if (!geocacheId) {
                alert('ID Géocache Manquant: Veuillez entrer un ID de géocache pour extraire les questions');
                return;
            }

            const letters = this.extractUniqueLetters(this.formulaInputTarget.value);
            if (letters.length === 0) {
                alert('Aucune Variable Trouvée: La formule ne contient aucune variable (lettre)');
                return;
            }

            // Utiliser la méthode sélectionnée par les boutons radio
            const method = this.extractionMethodAITarget.checked ? 'ai' : 'regex';
            console.log(`=== DEBUG: Extraction manuelle des questions avec méthode: ${method} ===`);
            
            this.extractQuestions(geocacheId, letters, method);
        }

        extractQuestions(geocacheId, letters, method = null) {
            // Si aucune méthode n'est spécifiée, utiliser la méthode par défaut chargée depuis les paramètres
            if (method === null) {
                method = this.questionExtractionMethod || 'ai';
                console.log(`=== DEBUG: Utilisation de la méthode d'extraction par défaut: ${method} ===`);
            }
            
            this.showLoadingQuestions();

            fetch('/geocaches/formula-questions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    geocache_id: geocacheId,
                    letters: letters,
                    method: method
                }),
            })
            .then(response => response.json())
            .then(data => {
                this.hideLoadingQuestions();
                
                if (data.success) {
                    this.updateQuestionsInUI(data.questions);
                    console.log('Questions extraites:', data.questions);
                    
                    if (Object.keys(data.questions).length === 0) {
                        alert(`Aucune Question Trouvée: Aucune question n'a été identifiée pour les variables de la formule avec la méthode ${method === 'ai' ? 'd\'IA' : 'regex'}.`);
                    }
                } else {
                    console.error('Erreur lors de l\'extraction des questions:', data.error);
                    alert(`Erreur d'Extraction: ${data.error || 'Une erreur s\'est produite lors de l\'extraction des questions'}`);
                }
            })
            .catch(error => {
                this.hideLoadingQuestions();
                console.error('Erreur lors de la requête:', error);
                alert('Erreur de Connexion: Impossible de se connecter au serveur pour extraire les questions');
            });
        }

        updateQuestionsInUI(questions) {
            // Parcourir chaque lettre et ajouter la question si elle existe
            const letterContainers = this.letterFieldsTarget.querySelectorAll('.letter-container');
            let questionsFound = false;
            
            // Extraire d'abord le contexte thématique s'il existe
            const thematicContext = questions._thematic_context || "";
            
            // Supprimer le contexte thématique du dictionnaire de questions
            delete questions._thematic_context;
            
            // Afficher le contexte thématique s'il existe
            if (thematicContext) {
                let contextElement = document.getElementById('thematic-context');
                let contextContainer = document.getElementById('thematic-context-container');
                
                // Créer l'élément de contexte s'il n'existe pas
                if (!contextElement) {
                    // Créer le conteneur s'il n'existe pas
                    if (!contextContainer) {
                        contextContainer = document.createElement('div');
                        contextContainer.id = 'thematic-context-container';
                        contextContainer.className = 'mb-4 bg-gray-700 p-3 rounded';
                        
                        // Ajouter le titre avec l'icône d'information
                        const titleContainer = document.createElement('div');
                        titleContainer.className = 'flex items-center justify-between mb-2';
                        
                        const titleElement = document.createElement('p');
                        titleElement.className = 'text-gray-300 font-medium';
                        titleElement.textContent = 'Contexte thématique:';
                        titleContainer.appendChild(titleElement);
                        
                        // Ajouter une icône d'information avec tooltip
                        const infoContainer = document.createElement('div');
                        infoContainer.className = 'relative';
                        
                        const infoIcon = document.createElement('span');
                        infoIcon.className = 'cursor-pointer text-blue-400 hover:text-blue-300';
                        infoIcon.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        `;
                        infoContainer.appendChild(infoIcon);
                        
                        // Ajouter l'infobulle
                        const tooltip = document.createElement('div');
                        tooltip.className = 'absolute z-10 bottom-full right-0 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg hidden';
                        tooltip.innerHTML = `
                            <p>Ce contexte a été identifié par l'IA à partir du titre et de la description de la géocache.</p>
                            <p class="mt-1">Il aide à comprendre le thème général et à résoudre des questions ambiguës.</p>
                            <div class="absolute bottom-0 right-3 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                        `;
                        infoContainer.appendChild(tooltip);
                        
                        // Ajouter des gestionnaires d'événements pour afficher/masquer l'infobulle
                        infoIcon.addEventListener('mouseenter', () => {
                            tooltip.classList.remove('hidden');
                        });
                        
                        infoIcon.addEventListener('mouseleave', () => {
                            tooltip.classList.add('hidden');
                        });
                        
                        titleContainer.appendChild(infoContainer);
                        contextContainer.appendChild(titleContainer);
                        
                        // Ajouter le contenu
                        contextElement = document.createElement('p');
                        contextElement.id = 'thematic-context';
                        contextElement.className = 'text-yellow-300 text-sm p-2 bg-gray-800 rounded';
                        contextContainer.appendChild(contextElement);
                        
                        // Ajouter un bouton pour copier le contexte dans le presse-papiers
                        const copyButton = document.createElement('button');
                        copyButton.className = 'mt-2 text-xs text-gray-400 hover:text-blue-400 flex items-center';
                        copyButton.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            Copier le contexte
                        `;
                        copyButton.onclick = () => {
                            navigator.clipboard.writeText(thematicContext)
                                .then(() => {
                                    copyButton.textContent = "Copié!";
                                    setTimeout(() => {
                                        copyButton.innerHTML = `
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                            </svg>
                                            Copier le contexte
                                        `;
                                    }, 2000);
                                })
                                .catch(err => console.error('Erreur lors de la copie du contexte:', err));
                        };
                        contextContainer.appendChild(copyButton);
                        
                        // Insérer le conteneur avant le conteneur des lettres
                        this.letterFieldsTarget.insertBefore(contextContainer, this.letterFieldsTarget.firstChild);
                    } else {
                        // Si le conteneur existe mais pas l'élément de contexte
                        contextElement = document.createElement('p');
                        contextElement.id = 'thematic-context';
                        contextElement.className = 'text-yellow-300 text-sm p-2 bg-gray-800 rounded';
                        contextContainer.appendChild(contextElement);
                    }
                }
                
                // Mettre à jour le contenu
                contextElement.textContent = thematicContext;
                contextContainer.classList.remove('hidden');
                
                // Ajouter un log pour voir le contexte thématique
                console.log("Contexte thématique utilisé:", thematicContext);
            }
            
            // Afficher les questions pour chaque lettre
            letterContainers.forEach(container => {
                const letter = container.dataset.letter;
                if (letter && questions[letter]) {
                    questionsFound = true;
                    // Mettre à jour le contenu du textarea de question
                    const questionTextarea = container.querySelector(`.letter-question-input[data-letter="${letter}"]`);
                    if (questionTextarea) {
                        questionTextarea.value = questions[letter];
                        
                        // Mettre à jour notre stockage de questions
                        if (!this.letterQuestions) {
                            this.letterQuestions = {};
                        }
                        this.letterQuestions[letter] = questions[letter];
                    }
                }
            });
            
            // Afficher un message de réussite si des questions ont été trouvées
            const statusElement = document.getElementById('extraction-status');
            if (statusElement) {
                if (questionsFound || thematicContext) {
                    statusElement.textContent = 'Les questions ont été extraites avec succès et apparaissent sous chaque variable.';
                    statusElement.classList.remove('hidden');
                    statusElement.classList.remove('text-red-400');
                    statusElement.classList.add('text-green-400');
                } else {
                    statusElement.textContent = 'Aucune question n\'a été trouvée pour les variables de la formule.';
                    statusElement.classList.remove('hidden');
                    statusElement.classList.remove('text-green-400');
                    statusElement.classList.add('text-red-400');
                }
                
                // Masquer le message après 5 secondes
                setTimeout(() => {
                    statusElement.classList.add('hidden');
                }, 5000);
            }
        }

        showLoadingQuestions() {
            // Vérifie si l'élément loadingQuestions existe, sinon le crée
            if (!this.hasLoadingQuestionsTarget) {
                const loadingElement = document.createElement('div');
                loadingElement.className = 'loading-questions text-center p-3 m-3 hidden';
                loadingElement.innerHTML = `
                    <div class="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                    <span class="text-gray-300">Extraction des questions en cours...</span>
                `;
                loadingElement.dataset.formulaSolverTarget = 'loadingQuestions';
                this.letterInputsTarget.insertBefore(loadingElement, this.letterFieldsTarget);
                
                // Attendre le prochain cycle pour que Stimulus enregistre la cible
                setTimeout(() => {
                    if (this.hasLoadingQuestionsTarget) {
                        this.loadingQuestionsTarget.classList.remove('hidden');
                    }
                }, 0);
                return;
            }
            
            this.loadingQuestionsTarget.classList.remove('hidden');
        }

        hideLoadingQuestions() {
            if (this.hasLoadingQuestionsTarget) {
                this.loadingQuestionsTarget.classList.add('hidden');
            }
        }
        
        // Résoudre les questions avec l'IA
        solveQuestionsWithAI() {
            const geocacheId = this.geocacheIdTarget.value;
            if (!geocacheId) {
                alert('ID Géocache Manquant: Veuillez entrer un ID de géocache pour résoudre les questions');
                return;
            }

            const letters = this.extractUniqueLetters(this.formulaInputTarget.value);
            if (letters.length === 0) {
                alert('Aucune Variable Trouvée: La formule ne contient aucune variable (lettre)');
                return;
            }
            
            // Récupérer les questions pour chaque lettre
            const questions = {};
            let thematicContext = "";
            
            // Chercher d'abord s'il y a un élément contenant le contexte thématique
            const contextEl = document.getElementById('thematic-context');
            if (contextEl && contextEl.textContent) {
                thematicContext = contextEl.textContent.trim();
                console.log("Contexte thématique récupéré pour la résolution:", thematicContext);
            } else {
                console.log("Aucun contexte thématique trouvé pour la résolution");
            }
            
            // Récupérer les questions pour chaque lettre
            letters.forEach(letter => {
                const container = this.letterFieldsTarget.querySelector(`.letter-container[data-letter="${letter}"]`);
                if (container) {
                    const questionTextarea = container.querySelector(`.letter-question-input[data-letter="${letter}"]`);
                    if (questionTextarea && questionTextarea.value.trim()) {
                        questions[letter] = questionTextarea.value.trim();
                    }
                }
            });
            
            console.log("Questions récupérées pour la résolution:", questions);
            
            // Vérifier si des questions existent pour les lettres
            if (Object.keys(questions).length === 0) {
                alert('Aucune Question Trouvée: Veuillez d\'abord extraire les questions');
                return;
            }
            
            // Ajouter le contexte thématique au dictionnaire de questions si disponible
            if (thematicContext) {
                questions["_thematic_context"] = thematicContext;
                console.log("Contexte thématique ajouté à la requête de résolution");
            }
            
            this.showSolvingWithAI();
            
            console.log("Envoi de la requête de résolution avec l'IA...");
            
            fetch('/geocaches/formula-solve-questions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    geocache_id: geocacheId,
                    questions: questions,
                    gc_code: this.gcCodeValue
                }),
            })
            .then(response => response.json())
            .then(data => {
                this.hideSolvingWithAI();
                
                if (data.success) {
                    console.log("Réponses reçues du serveur:", data.answers);
                    this.updateLettersWithAnswers(data.answers);
                    
                    // Afficher un message de réussite temporaire
                    const statusElement = document.getElementById('extraction-status');
                    if (statusElement) {
                        statusElement.textContent = 'Les réponses ont été générées avec succès!';
                        statusElement.classList.remove('hidden');
                        statusElement.classList.remove('text-red-400');
                        statusElement.classList.add('text-green-400');
                        
                        setTimeout(() => {
                            statusElement.classList.add('hidden');
                        }, 5000);
                    }
                } else {
                    console.error('Erreur lors de la résolution des questions:', data.error);
                    alert(`Erreur: ${data.error || 'Une erreur s\'est produite lors de la résolution des questions'}`);
                }
            })
            .catch(error => {
                this.hideSolvingWithAI();
                console.error('Erreur lors de la requête:', error);
                alert('Erreur de Connexion: Impossible de se connecter au serveur pour résoudre les questions');
            });
        }
        
        // Mettre à jour les lettres avec les réponses de l'IA
        updateLettersWithAnswers(answers) {
            // Parcourir chaque lettre et mettre à jour sa valeur
            Object.entries(answers).forEach(([letter, answer]) => {
                const container = this.letterFieldsTarget.querySelector(`.letter-container[data-letter="${letter}"]`);
                if (container) {
                    const input = container.querySelector(`[data-letter="${letter}"][data-field="word"]`);
                    if (input) {
                        input.value = answer;
                        // Déclencher l'événement input pour mettre à jour les calculs
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            });
        }
        
        // Afficher l'indicateur de chargement pour la résolution par IA
        showSolvingWithAI() {
            // Vérifie si l'élément solvingWithAI existe, sinon le crée
            if (!this.hasSolvingWithAITarget) {
                const loadingElement = document.createElement('div');
                loadingElement.className = 'solving-with-ai text-center p-3 m-3 hidden';
                loadingElement.innerHTML = `
                    <div class="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500 mr-2"></div>
                    <span class="text-gray-300">Résolution des questions avec IA en cours...</span>
                `;
                loadingElement.dataset.formulaSolverTarget = 'solvingWithAI';
                this.letterInputsTarget.insertBefore(loadingElement, this.letterFieldsTarget);
                
                // Attendre le prochain cycle pour que Stimulus enregistre la cible
                setTimeout(() => {
                    if (this.hasSolvingWithAITarget) {
                        this.solvingWithAITarget.classList.remove('hidden');
                    }
                }, 0);
                return;
            }
            
            this.solvingWithAITarget.classList.remove('hidden');
        }
        
        // Masquer l'indicateur de chargement pour la résolution par IA
        hideSolvingWithAI() {
            if (this.hasSolvingWithAITarget) {
                this.solvingWithAITarget.classList.add('hidden');
            }
        }
        
        // Mettre à jour les données de question lors de l'édition
        updateQuestionData(event) {
            const letter = event.target.dataset.letter;
            const question = event.target.value.trim();
            
            if (letter) {
                // Stocker la question éditée pour cette lettre
                if (!this.letterQuestions) {
                    this.letterQuestions = {};
                }
                this.letterQuestions[letter] = question;
                console.log(`Question mise à jour pour la lettre ${letter}:`, question);
            }
        }
        
        // Résoudre une seule question avec l'IA
        solveSingleQuestion(event) {
            const letter = event.currentTarget.dataset.letter;
            if (!letter) return;
            
            const geocacheId = this.geocacheIdTarget.value;
            if (!geocacheId) {
                alert('ID Géocache Manquant: Veuillez entrer un ID de géocache pour résoudre la question');
                return;
            }
            
            // Obtenir la question pour cette lettre
            const questionInput = this.element.querySelector(`.letter-question-input[data-letter="${letter}"]`);
            if (!questionInput || !questionInput.value.trim()) {
                alert('Question Manquante: Veuillez extraire ou saisir une question pour cette lettre');
                return;
            }
            
            const question = questionInput.value.trim();
            
            // Obtenir le contexte thématique s'il existe
            let thematicContext = "";
            const contextElement = document.getElementById('thematic-context');
            if (contextElement) {
                thematicContext = contextElement.textContent || "";
            }
            
            // Afficher un chargement pour cette lettre spécifique
            this.showSingleQuestionLoading(letter);
            
            // Préparer les données à envoyer
            const data = {
                geocache_id: geocacheId,
                letter: letter,
                question: question,
                thematic_context: thematicContext
            };
            
            // Envoyer la requête pour résoudre cette question
            fetch('/geocaches/formula-solve-single-question', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                },
                body: JSON.stringify(data)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Masquer le chargement
                this.hideSingleQuestionLoading(letter);
                
                // Vérifier si la réponse contient une erreur
                if (data.error) {
                    console.error("Erreur lors de la résolution de la question:", data.error);
                    this.showSingleQuestionError(letter, data.error);
                    return;
                }
                
                console.log(`Réponse reçue pour la lettre ${letter}:`, data);
                
                // Mettre à jour la réponse pour cette lettre
                if (data.answer) {
                    const inputElement = this.element.querySelector(`input[data-letter="${letter}"][data-field="word"]`);
                    if (inputElement) {
                        inputElement.value = data.answer;
                        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                        
                        // Afficher un message de réussite
                        this.showSingleQuestionSuccess(letter, data.answer);
                    }
                }
            })
            .catch(error => {
                console.error("Erreur lors de la résolution de la question:", error);
                this.hideSingleQuestionLoading(letter);
                this.showSingleQuestionError(letter, error.message);
            });
        }
        
        // Afficher un indicateur de chargement pour une lettre spécifique
        showSingleQuestionLoading(letter) {
            const container = this.element.querySelector(`.letter-container[data-letter="${letter}"]`);
            if (!container) return;
            
            // Supprimer les messages d'erreur ou de réussite précédents
            this.removeSingleQuestionMessages(letter);
            
            // Créer et ajouter l'indicateur de chargement
            const loadingElement = document.createElement('div');
            loadingElement.className = 'single-question-loading flex items-center text-sm text-blue-400 mt-2';
            loadingElement.innerHTML = `
                <div class="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                <span>Résolution de la question en cours...</span>
            `;
            
            const questionContainer = container.querySelector('.question-container');
            if (questionContainer) {
                questionContainer.appendChild(loadingElement);
            }
        }
        
        // Masquer l'indicateur de chargement pour une lettre spécifique
        hideSingleQuestionLoading(letter) {
            const container = this.element.querySelector(`.letter-container[data-letter="${letter}"]`);
            if (!container) return;
            
            const loadingElement = container.querySelector('.single-question-loading');
            if (loadingElement) {
                loadingElement.remove();
            }
        }
        
        // Afficher un message d'erreur pour une lettre spécifique
        showSingleQuestionError(letter, errorMessage) {
            const container = this.element.querySelector(`.letter-container[data-letter="${letter}"]`);
            if (!container) return;
            
            const errorElement = document.createElement('div');
            errorElement.className = 'single-question-error text-sm text-red-400 mt-2';
            errorElement.textContent = `Erreur: ${errorMessage}`;
            
            const questionContainer = container.querySelector('.question-container');
            if (questionContainer) {
                questionContainer.appendChild(errorElement);
                
                // Masquer le message après 5 secondes
                setTimeout(() => {
                    errorElement.remove();
                }, 5000);
            }
        }
        
        // Afficher un message de réussite pour une lettre spécifique
        showSingleQuestionSuccess(letter, answer) {
            const container = this.element.querySelector(`.letter-container[data-letter="${letter}"]`);
            if (!container) return;
            
            const successElement = document.createElement('div');
            successElement.className = 'single-question-success text-sm text-green-400 mt-2';
            successElement.textContent = `Réponse trouvée: "${answer}"`;
            
            const questionContainer = container.querySelector('.question-container');
            if (questionContainer) {
                questionContainer.appendChild(successElement);
                
                // Masquer le message après 5 secondes
                setTimeout(() => {
                    successElement.remove();
                }, 5000);
            }
        }
        
        // Supprimer tous les messages pour une lettre spécifique
        removeSingleQuestionMessages(letter) {
            const container = this.element.querySelector(`.letter-container[data-letter="${letter}"]`);
            if (!container) return;
            
            const messages = container.querySelectorAll('.single-question-error, .single-question-success');
            messages.forEach(el => el.remove());
        }
        
        // Copier la question d'une lettre dans le presse-papier
        copyQuestion(event) {
            const letter = event.currentTarget.dataset.letter;
            if (!letter) return;
            
            const questionTextarea = this.element.querySelector(`.letter-question-input[data-letter="${letter}"]`);
            if (!questionTextarea || !questionTextarea.value.trim()) {
                this.showSingleQuestionError(letter, "Aucune question à copier");
                return;
            }
            
            // Copier le texte dans le presse-papier
            navigator.clipboard.writeText(questionTextarea.value.trim())
                .then(() => {
                    // Afficher une notification de succès
                    this.showSingleQuestionSuccess(letter, "Question copiée dans le presse-papier");
                })
                .catch(err => {
                    console.error("Erreur lors de la copie dans le presse-papier:", err);
                    this.showSingleQuestionError(letter, "Impossible de copier la question");
                });
        }
        
        // Rechercher la question sur le web
        searchOnWeb(event) {
            const letter = event.currentTarget.dataset.letter;
            if (!letter) return;
            
            const questionTextarea = this.element.querySelector(`.letter-question-input[data-letter="${letter}"]`);
            if (!questionTextarea || !questionTextarea.value.trim()) {
                this.showSingleQuestionError(letter, "Aucune question à rechercher");
                return;
            }
            
            const question = questionTextarea.value.trim();
            
            // Obtenir le contexte thématique s'il existe, pour enrichir la recherche
            let thematicContext = "";
            const contextElement = document.getElementById('thematic-context');
            if (contextElement && contextElement.textContent.trim()) {
                thematicContext = contextElement.textContent.trim();
            }
            
            // Créer le terme de recherche en combinant la question et le contexte
            let searchTerm = question;
            if (thematicContext) {
                // Extraire les mots-clés du contexte thématique (les 3-4 premiers mots significatifs)
                const contextKeywords = thematicContext.split(/\s+/).filter(word => 
                    word.length > 3 && 
                    !['cette', 'dont', 'pour', 'avec', 'dans', 'comme'].includes(word.toLowerCase())
                ).slice(0, 4).join(' ');
                
                if (contextKeywords) {
                    searchTerm = `${question} ${contextKeywords}`;
                }
            }
            
            // Utiliser la fonction globale pour ouvrir un onglet de recherche
            if (window.openWebSearchTab) {
                const searchTitle = `Recherche ${letter}: ${question.substring(0, 20)}${question.length > 20 ? '...' : ''}`;
                window.openWebSearchTab(searchTerm, searchTitle);
                this.showSingleQuestionSuccess(letter, "Recherche ouverte dans un nouvel onglet");
            } else {
                // Fallback vers l'ouverture d'un nouvel onglet de navigateur si openWebSearchTab n'est pas disponible
                const encodedSearch = encodeURIComponent(searchTerm);
                window.open(`https://www.google.com/search?q=${encodedSearch}`, '_blank');
                this.showSingleQuestionSuccess(letter, "Recherche lancée dans un nouvel onglet");
            }
        }

        /**
         * Détecte les formules avec IA
         */
        detectFormulasWithAI() {
            console.log('=== DEBUG: Détection des formules avec IA ===');
            
            if (!this.geocacheIdValue) {
                alert('ID de géocache manquant. Impossible de détecter les formules avec IA.');
                return;
            }
            
            // Mettre à jour l'affichage du mode d'extraction
            if (this.hasExtractionModeDisplayTarget) {
                this.extractionModeDisplayTarget.textContent = 'IA';
            }
            
            // Afficher le loading
            if (this.hasDetectedFormulasLoadingTarget) {
                this.detectedFormulasLoadingTarget.classList.remove('hidden');
            }
            
            // Masquer le conteneur des formules détectées
            if (this.hasDetectedFormulasContainerTarget) {
                this.detectedFormulasContainerTarget.classList.add('hidden');
            }
            
            // Appel à l'API pour détecter les formules
            fetch('/geocaches/formula-detect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    geocache_id: this.geocacheIdValue,
                    method: 'ia'
                }),
            })
            .then(response => response.json())
            .then(data => {
                console.log('=== DEBUG: Résultat de la détection IA ===', data);
                
                // Masquer le loading
                if (this.hasDetectedFormulasLoadingTarget) {
                    this.detectedFormulasLoadingTarget.classList.add('hidden');
                }
                
                if (data.success) {
                    // Mettre à jour l'affichage des formules détectées
                    this.updateDetectedFormulas(data.formulas);
                } else {
                    console.error('Erreur lors de la détection des formules:', data.error);
                    alert(`Erreur lors de la détection des formules: ${data.error || 'Une erreur est survenue'}`);
                    
                    // Réafficher le conteneur des formules détectées
                    if (this.hasDetectedFormulasContainerTarget) {
                        this.detectedFormulasContainerTarget.classList.remove('hidden');
                    }
                }
            })
            .catch(error => {
                console.error('Erreur lors de la requête de détection:', error);
                alert('Erreur de connexion: Impossible de se connecter au serveur pour détecter les formules');
                
                // Masquer le loading
                if (this.hasDetectedFormulasLoadingTarget) {
                    this.detectedFormulasLoadingTarget.classList.add('hidden');
                }
                
                // Réafficher le conteneur des formules détectées
                if (this.hasDetectedFormulasContainerTarget) {
                    this.detectedFormulasContainerTarget.classList.remove('hidden');
                }
            });
        }
        
        /**
         * Détecte les formules avec Regex
         */
        detectFormulasWithRegex() {
            console.log('=== DEBUG: Détection des formules avec Regex ===');
            
            if (!this.geocacheIdValue) {
                alert('ID de géocache manquant. Impossible de détecter les formules avec Regex.');
                return;
            }
            
            // Mettre à jour l'affichage du mode d'extraction
            if (this.hasExtractionModeDisplayTarget) {
                this.extractionModeDisplayTarget.textContent = 'Regex';
            }
            
            // Afficher le loading
            if (this.hasDetectedFormulasLoadingTarget) {
                this.detectedFormulasLoadingTarget.classList.remove('hidden');
            }
            
            // Masquer le conteneur des formules détectées
            if (this.hasDetectedFormulasContainerTarget) {
                this.detectedFormulasContainerTarget.classList.add('hidden');
            }
            
            // Appel à l'API pour détecter les formules
            fetch('/geocaches/formula-detect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    geocache_id: this.geocacheIdValue,
                    method: 'regex'
                }),
            })
            .then(response => response.json())
            .then(data => {
                console.log('=== DEBUG: Résultat de la détection Regex ===', data);
                
                // Masquer le loading
                if (this.hasDetectedFormulasLoadingTarget) {
                    this.detectedFormulasLoadingTarget.classList.add('hidden');
                }
                
                if (data.success) {
                    // Mettre à jour l'affichage des formules détectées
                    this.updateDetectedFormulas(data.formulas);
                } else {
                    console.error('Erreur lors de la détection des formules:', data.error);
                    alert(`Erreur lors de la détection des formules: ${data.error || 'Une erreur est survenue'}`);
                    
                    // Réafficher le conteneur des formules détectées
                    if (this.hasDetectedFormulasContainerTarget) {
                        this.detectedFormulasContainerTarget.classList.remove('hidden');
                    }
                }
            })
            .catch(error => {
                console.error('Erreur lors de la requête de détection:', error);
                alert('Erreur de connexion: Impossible de se connecter au serveur pour détecter les formules');
                
                // Masquer le loading
                if (this.hasDetectedFormulasLoadingTarget) {
                    this.detectedFormulasLoadingTarget.classList.add('hidden');
                }
                
                // Réafficher le conteneur des formules détectées
                if (this.hasDetectedFormulasContainerTarget) {
                    this.detectedFormulasContainerTarget.classList.remove('hidden');
                }
            });
        }
        
        /**
         * Met à jour l'affichage des formules détectées
         */
        updateDetectedFormulas(formulas) {
            console.log('=== DEBUG: Mise à jour des formules détectées ===', formulas);
            
            if (!this.hasDetectedFormulasContainerTarget) {
                console.warn('Cible detectedFormulasContainer non disponible');
                return;
            }
            
            // Générer le HTML pour les formules
            let html = '';
            
            formulas.forEach(formula => {
                html += `
                    <div class="bg-gray-700 rounded p-3">
                        <div class="flex justify-between">
                            <div>
                                <div class="text-gray-200">${formula.formula}</div>
                                <div class="text-gray-400 text-sm mt-1">Source: ${formula.source}</div>
                            </div>
                            <button
                                class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1 px-3 rounded self-start"
                                data-action="click->formula-solver#addToFormula"
                                data-coordinates="${formula.formula}">
                                Utiliser
                            </button>
                        </div>
                    </div>
                `;
            });
            
            // Si aucune formule n'a été trouvée
            if (formulas.length === 0) {
                html = `
                    <div class="bg-gray-700 rounded p-3">
                        <div class="text-gray-300">Aucune formule détectée.</div>
                    </div>
                `;
            }
            
            // Mettre à jour le conteneur
            this.detectedFormulasContainerTarget.innerHTML = html;
            this.detectedFormulasContainerTarget.classList.remove('hidden');
        }

        /**
         * Gère le clic droit sur la description pour créer un menu contextuel
         * @param {Event} event - L'événement de clic droit
         */
        handleContextMenu(event) {
            // Vérifier s'il y a du texte sélectionné
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            if (!selectedText) return; // Ne rien faire si aucun texte n'est sélectionné
            
            // Empêcher le menu contextuel par défaut
            event.preventDefault();
            
            // Supprimer tout menu contextuel existant
            const existingMenu = document.getElementById('formula-context-menu');
            if (existingMenu) {
                existingMenu.remove();
            }
            
            // Créer le menu contextuel
            const contextMenu = document.createElement('div');
            contextMenu.id = 'formula-context-menu';
            contextMenu.className = 'absolute bg-gray-800 border border-gray-600 rounded shadow-lg z-50';
            contextMenu.style.left = `${event.pageX}px`;
            contextMenu.style.top = `${event.pageY}px`;
            
            // Option pour utiliser comme formule
            const useAsFormulaOption = document.createElement('div');
            useAsFormulaOption.className = 'px-4 py-2 text-gray-200 hover:bg-blue-600 cursor-pointer';
            useAsFormulaOption.innerText = 'Utiliser comme formule';
            useAsFormulaOption.onclick = () => {
                this.addToFormula({ coordinates: selectedText });
                contextMenu.remove();
            };
            
            contextMenu.appendChild(useAsFormulaOption);
            document.body.appendChild(contextMenu);
            
            // Fermer le menu au clic ailleurs
            document.addEventListener('click', () => {
                contextMenu.remove();
            }, { once: true });
        }

        // Ajout : Afficher sur la carte le point calculé
        // Cette fonction est supprimée car les points sont maintenant affichés automatiquement
        // en utilisant les coordonnées décimales fournies par le serveur.
        /*
        addShowOnMapButtonIfPossible(data) {
            // Vérifier si les coordonnées sont complètes et bien numériques
            if (data.status === 'complete' && data.latitude && data.longitude) {
                // Chercher le conteneur
                const container = this.calculatedCoordinatesTarget;
                // Éviter de dupliquer le bouton
                if (container.querySelector('.show-on-map-btn')) return;
                // Créer le bouton
                const btn = document.createElement('button');
                btn.textContent = 'Afficher sur la carte';
                btn.className = 'show-on-map-btn bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded ml-3';
                btn.style.marginLeft = '1rem';
                btn.onclick = () => {
                    // Convertir DDM en décimal
                    const lat = this.ddmToDecimal(data.latitude);
                    const lon = this.ddmToDecimal(data.longitude);
                    if (lat !== null && lon !== null) {
                        const event = new CustomEvent('addCalculatedPointToMap', {
                            detail: {
                                latitude: lat,
                                longitude: lon,
                                label: 'Coordonnée calculée',
                                color: 'rgba(255,0,0,0.8)'
                            }
                        });
                        document.dispatchEvent(event);
                    } else {
                        alert('Impossible de convertir les coordonnées au format décimal.');
                    }
                };
                // Ajouter le bouton à la fin du conteneur
                container.appendChild(btn);
            }
        }
        */

        // Utilitaire : conversion DDM (ex: N48° 41.823 ou E007° 08.156) en décimal
        ddmToDecimal(ddm) {
            // Exemples acceptés : N48° 41.823, N 48° 41.823, E007° 08.156, E 7° 8.156
            const match = ddm.match(/([NSWE])\s*0*([0-9]{1,3})[°º]?\s*([0-9]{1,2})\.(\d{1,6})/i);
            if (!match) return null;
            const dir = match[1].toUpperCase();
            const deg = parseInt(match[2], 10);
            const min = parseInt(match[3], 10);
            const dec = match[4];
            const minutes = parseFloat(`${min}.${dec}`);
            let value = deg + (minutes / 60);
            if (dir === 'S' || dir === 'W') value = -value;
            return value;
        }

        copyCalculatedCoordinates() {
            const coordinatesText = this.calculatedCoordinatesTextTarget.innerText.trim();
            
            if (!coordinatesText) {
                return;
            }
            
            // Copier le texte dans le presse-papier
            navigator.clipboard.writeText(coordinatesText)
                .then(() => {
                    // Changer temporairement le texte du bouton pour indiquer le succès
                    const originalButtonHTML = this.copyCoordinatesButtonTarget.innerHTML;
                    this.copyCoordinatesButtonTarget.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Copié!</span>
                    `;
                    this.copyCoordinatesButtonTarget.classList.remove("bg-blue-600", "hover:bg-blue-700");
                    this.copyCoordinatesButtonTarget.classList.add("bg-green-600", "hover:bg-green-700");
                    
                    // Rétablir le bouton après un délai
                    setTimeout(() => {
                        this.copyCoordinatesButtonTarget.innerHTML = originalButtonHTML;
                        this.copyCoordinatesButtonTarget.classList.remove("bg-green-600", "hover:bg-green-700");
                        this.copyCoordinatesButtonTarget.classList.add("bg-blue-600", "hover:bg-blue-700");
                    }, 2000);
                })
                .catch(err => {
                    console.error('Erreur lors de la copie des coordonnées:', err);
                    
                    // Afficher un message d'erreur
                    this.copyCoordinatesButtonTarget.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Erreur</span>
                    `;
                    this.copyCoordinatesButtonTarget.classList.remove("bg-blue-600", "hover:bg-blue-700");
                    this.copyCoordinatesButtonTarget.classList.add("bg-red-600", "hover:bg-red-700");
                    
                    // Rétablir le bouton après un délai
                    setTimeout(() => {
                        this.copyCoordinatesButtonTarget.innerHTML = originalButtonHTML;
                        this.copyCoordinatesButtonTarget.classList.remove("bg-red-600", "hover:bg-red-700");
                        this.copyCoordinatesButtonTarget.classList.add("bg-blue-600", "hover:bg-blue-700");
                    }, 2000);
                });
        }

        addAsWaypoint() {
            const coordinatesText = this.calculatedCoordinatesTextTarget.innerText.trim();
            
            if (!coordinatesText) {
                return;
            }
            
            // Vérifier si les coordonnées contiennent des variables non résolues (lettres A-Z)
            const containsVariables = /[A-Z]{2,}/.test(coordinatesText);
            if (containsVariables) {
                console.error("Les coordonnées contiennent des variables non résolues");
                this.showAddWaypointError("Variables non résolues");
                return;
            }
            
            // Récupérer l'ID de la géocache
            const geocacheId = this.geocacheIdValue;
            
            // Extraire les coordonnées calculées
            const regex = /([NS][\s]*\d+°[\s]*\d+\.\d+)[\s]*([EW][\s]*\d+°[\s]*\d+\.\d+)/;
            const match = coordinatesText.match(regex);
            
            if (!match || match.length < 3) {
                console.error("Format de coordonnées non reconnu");
                this.showAddWaypointError("Format de coordonnées non reconnu");
                return;
            }
            
            const gcLat = match[1].trim();
            const gcLon = match[2].trim();
            
            // Générer un nom de waypoint par défaut basé sur la formule
            const formulaText = this.formulaInputTarget.value.trim();
            let waypointName = "Point calculé";
            
            if (formulaText) {
                // Utiliser les 20 premiers caractères de la formule pour le nom du waypoint
                waypointName = "Calc: " + (formulaText.length > 20 ? formulaText.substring(0, 20) + "..." : formulaText);
            }
            
            try {
                // Approche alternative: ouvrir directement le panneau de waypoint
                // Trouver l'onglet actif avec les détails de la géocache
                let detailsTab = null;
                if (window.mainLayout) {
                    const components = window.mainLayout.root.getItemsByType('component');
                    for (const comp of components) {
                        if (comp.config.componentName === 'geocache-details' && 
                            comp.container && 
                            comp.container.getState().geocacheId == geocacheId) {
                            detailsTab = comp;
                            break;
                        }
                    }
                    
                    // Si on trouve un onglet de détails, l'activer
                    if (detailsTab) {
                        detailsTab.parent.setActiveContentItem(detailsTab);
                        
                        // Créer une fonction pour continuer après que l'onglet soit activé
                        const continueWithWaypointForm = () => {
                            // Trouver la section waypoint dans le détail
                            const container = detailsTab.container.getElement()[0];
                            if (!container) {
                                console.error("Container du panneau de détails non trouvé");
                                this.showAddWaypointError("Erreur panneau");
                                return;
                            }
                            
                            // Trouver le bouton pour ajouter un waypoint
                            const waypointSection = container.querySelector('.waypoints-section');
                            if (!waypointSection) {
                                console.error("Section waypoints non trouvée");
                                this.showAddWaypointError("Erreur section");
                                return;
                            }
                            
                            // Trouver le bouton et simuler un clic
                            const addButton = waypointSection.querySelector('button');
                            if (!addButton) {
                                console.error("Bouton d'ajout de waypoint non trouvé");
                                this.showAddWaypointError("Erreur bouton");
                                return;
                            }
                            
                            // Cliquer sur le bouton pour ouvrir le formulaire
                            addButton.click();
                            
                            // Attendre l'ouverture du formulaire puis remplir les champs
                            setTimeout(() => {
                                // Chercher le formulaire ouvert
                                const form = waypointSection.querySelector('form');
                                if (!form) {
                                    console.error("Formulaire de waypoint non trouvé");
                                    this.showAddWaypointError("Erreur form");
                                    return;
                                }
                                
                                // Remplir les champs
                                const gcLatInput = form.querySelector('[name="gc_lat"]');
                                const gcLonInput = form.querySelector('[name="gc_lon"]');
                                const nameInput = form.querySelector('[name="name"]');
                                const prefixInput = form.querySelector('[name="prefix"]');
                                const noteInput = form.querySelector('[name="note"]');
                                
                                if (gcLatInput) gcLatInput.value = gcLat;
                                if (gcLonInput) gcLonInput.value = gcLon;
                                if (nameInput) nameInput.value = waypointName;
                                if (prefixInput) prefixInput.value = "FS"; // Formula Solver
                                if (noteInput) noteInput.value = `Point calculé avec Formula Solver.\nFormule: ${formulaText}\nRésultat: ${coordinatesText}`;
                                
                                // Faire défiler jusqu'au formulaire
                                form.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                
                                // Afficher message de succès
                                this.showAddWaypointSuccess();
                            }, 500);
                        };
                        
                        // Exécuter après un court délai pour laisser l'onglet s'activer
                        setTimeout(continueWithWaypointForm, 200);
                    } else {
                        console.error("Aucun panneau de détails de géocache trouvé");
                        this.showAddWaypointError("Aucun panneau");
                    }
                } else {
                    console.error("window.mainLayout n'est pas disponible");
                    this.showAddWaypointError("Erreur Layout");
                }
            } catch (error) {
                console.error("Erreur lors de l'ajout du waypoint:", error);
                this.showAddWaypointError("Erreur");
            }
        }
        
        showAddWaypointSuccess() {
            // Changer temporairement le texte du bouton pour indiquer le succès
            const originalButtonHTML = this.addWaypointButtonTarget.innerHTML;
            this.addWaypointButtonTarget.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Waypoint créé!</span>
            `;
            this.addWaypointButtonTarget.classList.remove("bg-green-600", "hover:bg-green-700");
            this.addWaypointButtonTarget.classList.add("bg-teal-600", "hover:bg-teal-700");
            
            // Rétablir le bouton après un délai
            setTimeout(() => {
                this.addWaypointButtonTarget.innerHTML = originalButtonHTML;
                this.addWaypointButtonTarget.classList.remove("bg-teal-600", "hover:bg-teal-700");
                this.addWaypointButtonTarget.classList.add("bg-green-600", "hover:bg-green-700");
            }, 2000);
        }
        
        showAddWaypointError(message) {
            console.error('Erreur lors de l\'ajout du waypoint:', message);
            
            // Déterminer le message à afficher
            let displayMessage = "Erreur";
            if (message === "Variables non résolues") {
                displayMessage = "Variables non résolues";
            }
            
            // Afficher un message d'erreur
            const originalButtonHTML = this.addWaypointButtonTarget.innerHTML;
            this.addWaypointButtonTarget.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>${displayMessage}</span>
            `;
            this.addWaypointButtonTarget.classList.remove("bg-green-600", "hover:bg-green-700");
            this.addWaypointButtonTarget.classList.add("bg-red-600", "hover:bg-red-700");
            
            // Rétablir le bouton après un délai
            setTimeout(() => {
                this.addWaypointButtonTarget.innerHTML = originalButtonHTML;
                this.addWaypointButtonTarget.classList.remove("bg-red-600", "hover:bg-red-700");
                this.addWaypointButtonTarget.classList.add("bg-green-600", "hover:bg-green-700");
            }, 3000); // Augmenter le délai pour donner à l'utilisateur plus de temps pour lire le message
        }

        createWaypointAuto() {
            const coordinatesText = this.calculatedCoordinatesTextTarget.innerText.trim();
            
            if (!coordinatesText) {
                return;
            }
            
            // Vérifier si les coordonnées contiennent des variables non résolues (lettres A-Z)
            const containsVariables = /[A-Z]{2,}/.test(coordinatesText);
            if (containsVariables) {
                console.error("Les coordonnées contiennent des variables non résolues");
                this.showCreateWaypointAutoError("Variables non résolues");
                return;
            }
            
            // Récupérer l'ID de la géocache
            const geocacheId = this.geocacheIdValue;
            
            // Extraire les coordonnées calculées
            const regex = /([NS][\s]*\d+°[\s]*\d+\.\d+)[\s]*([EW][\s]*\d+°[\s]*\d+\.\d+)/;
            const match = coordinatesText.match(regex);
            
            if (!match || match.length < 3) {
                console.error("Format de coordonnées non reconnu");
                this.showCreateWaypointAutoError("Format de coordonnées non reconnu");
                return;
            }
            
            const gcLat = match[1].trim();
            const gcLon = match[2].trim();
            
            // Générer un nom de waypoint par défaut basé sur la formule
            const formulaText = this.formulaInputTarget.value.trim();
            let waypointName = "Point calculé";
            
            if (formulaText) {
                // Utiliser les 20 premiers caractères de la formule pour le nom du waypoint
                waypointName = "Calc: " + (formulaText.length > 20 ? formulaText.substring(0, 20) + "..." : formulaText);
            }
            
            // Ajouter la distance si des coordonnées d'origine sont disponibles
            let note = `Point calculé automatiquement avec Formula Solver.\nFormule: ${formulaText}\nRésultat: ${coordinatesText}`;
            
            // Vérifier si on a des éléments de distance pour les ajouter à la note
            if (document.querySelector('#debug-origin-lat') && document.querySelector('#debug-origin-lon')) {
                const originLat = document.querySelector('#debug-origin-lat').textContent;
                const originLon = document.querySelector('#debug-origin-lon').textContent;
                
                if (originLat && originLon) {
                    // Si on a des données de distance, les ajouter à la note
                    const distanceElement = document.querySelector('[data-formula-solver-target="distanceInfo"]');
                    if (distanceElement && distanceElement.textContent) {
                        note += `\nDistance: ${distanceElement.textContent}`;
                    }
                }
            }
            
            // Préparer les données pour la création du waypoint
            const waypointData = {
                geocache_id: geocacheId,
                name: waypointName,
                prefix: "FS", // Formula Solver
                gc_lat: gcLat,
                gc_lon: gcLon,
                note: note
            };
            
            // Afficher l'indicateur de chargement
            this.showCreateWaypointAutoLoading();
            
            // Appeler l'API pour créer le waypoint
            fetch(`/api/geocaches/${geocacheId}/waypoints`, {
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
                // Vérifier d'abord le type de contenu pour savoir si on attend du JSON
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return response.json();
                } else {
                    // Si ce n'est pas du JSON, traiter comme du texte
                    return response.text().then(text => {
                        // Si la réponse est vide ou non-JSON, créer un objet factice avec les données essentielles
                        console.log("Réponse non-JSON reçue:", text);
                        return {
                            id: new Date().getTime(), // ID temporaire unique
                            name: waypointName,
                            prefix: "FS",
                            gc_lat: gcLat,
                            gc_lon: gcLon,
                            // Convertir les coordonnées GC en latitude/longitude
                            latitude: this.convertGCToDecimal(gcLat, "lat"),
                            longitude: this.convertGCToDecimal(gcLon, "lon"),
                            note: note,
                            _success: true // Marqueur indiquant que l'opération a réussi malgré la réponse non-JSON
                        };
                    });
                }
            })
            .then(data => {
                // Vérifier si on a une structure de données valide
                if (data && (data.id || data._success)) {
                    console.log("Waypoint créé avec succès:", data);
                    this.showCreateWaypointAutoSuccess();
                    
                    // Annoncer la création du waypoint pour mettre à jour la carte
                    const event = new CustomEvent('waypointSaved', {
                        detail: {
                            waypoint: data,
                            geocacheId: geocacheId,
                            isNew: true
                        },
                        bubbles: true
                    });
                    document.dispatchEvent(event);
                    
                    // Mettre à jour la liste des waypoints dans l'interface
                    this.updateWaypointsList(geocacheId);
                } else {
                    throw new Error("Structure de données invalide ou incomplète");
                }
            })
            .catch(error => {
                console.error("Erreur lors de la création du waypoint:", error);
                this.showCreateWaypointAutoError("Erreur API");
            });
        }
        
        // Méthode utilitaire pour convertir les coordonnées GC en coordonnées décimales
        convertGCToDecimal(coordStr, type) {
            try {
                if (type === "lat") {
                    // Format N/S DD° MM.MMM
                    const match = coordStr.match(/([NS])\s*(\d+)°\s*(\d+\.\d+)/);
                    if (match) {
                        const direction = match[1];
                        const degrees = parseInt(match[2]);
                        const minutes = parseFloat(match[3]);
                        let decimal = degrees + (minutes / 60);
                        if (direction === 'S') decimal = -decimal;
                        return decimal;
                    }
                } else if (type === "lon") {
                    // Format E/W DDD° MM.MMM
                    const match = coordStr.match(/([EW])\s*(\d+)°\s*(\d+\.\d+)/);
                    if (match) {
                        const direction = match[1];
                        const degrees = parseInt(match[2]);
                        const minutes = parseFloat(match[3]);
                        let decimal = degrees + (minutes / 60);
                        if (direction === 'W') decimal = -decimal;
                        return decimal;
                    }
                }
                // En cas d'échec de parsing, retourner 0
                return 0;
            } catch (error) {
                console.error("Erreur de conversion des coordonnées:", error);
                return 0;
            }
        }
        
        showCreateWaypointAutoLoading() {
            // Changer temporairement le texte du bouton pour indiquer le chargement
            const originalButtonHTML = this.createWaypointAutoButtonTarget.innerHTML;
            this.createWaypointAutoButtonTarget.innerHTML = `
                <svg class="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span>Création...</span>
            `;
            this.createWaypointAutoButtonTarget.disabled = true;
            this.createWaypointAutoButtonTarget.classList.add("opacity-75");
        }
        
        showCreateWaypointAutoSuccess() {
            // Changer temporairement le texte du bouton pour indiquer le succès
            const originalButtonHTML = this.createWaypointAutoButtonTarget.innerHTML;
            this.createWaypointAutoButtonTarget.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>WP créé!</span>
            `;
            this.createWaypointAutoButtonTarget.disabled = false;
            this.createWaypointAutoButtonTarget.classList.remove("opacity-75");
            this.createWaypointAutoButtonTarget.classList.remove("bg-purple-600", "hover:bg-purple-700");
            this.createWaypointAutoButtonTarget.classList.add("bg-green-600", "hover:bg-green-700");
            
            // Rétablir le bouton après un délai
            setTimeout(() => {
                this.createWaypointAutoButtonTarget.innerHTML = originalButtonHTML;
                this.createWaypointAutoButtonTarget.classList.remove("bg-green-600", "hover:bg-green-700");
                this.createWaypointAutoButtonTarget.classList.add("bg-purple-600", "hover:bg-purple-700");
            }, 3000);
        }
        
        showCreateWaypointAutoError(message) {
            const button = this.createWaypointAutoButtonTarget;
            
            // Sauvegarder le contenu original du bouton
            const originalButtonHTML = button.innerHTML;
            
            // Mettre à jour le bouton avec un message d'erreur
            button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>${message}</span>
            `;
            button.classList.remove("bg-purple-600", "hover:bg-purple-700");
            button.classList.add("bg-red-600", "hover:bg-red-700");
            
            // Rétablir le bouton après un délai
            setTimeout(() => {
                button.innerHTML = originalButtonHTML;
                button.classList.remove("bg-red-600", "hover:bg-red-700");
                button.classList.add("bg-purple-600", "hover:bg-purple-700");
            }, 3000);
        }
        
        /**
         * Sauvegarde les coordonnées corrigées de la géocache
         */
        saveGeocacheCoordinates() {
            // Vérifier si on a un ID de géocache
            const geocacheId = this.geocacheIdValue;
            if (!geocacheId) {
                this.showSaveCoordinatesError("ID de géocache manquant");
                return;
            }
            
            // Récupérer les coordonnées calculées
            const coordinatesText = this.calculatedCoordinatesTextTarget.innerText.trim();
            if (!coordinatesText) {
                this.showSaveCoordinatesError("Aucune coordonnée calculée");
                return;
            }
            
            // Vérifier si les coordonnées sont complètes (pas de variables non résolues)
            if (coordinatesText.match(/[A-Z]{2,}/)) {
                this.showSaveCoordinatesError("Coordonnées incomplètes");
                return;
            }
            
            // Extraire les coordonnées au format N/E
            const regex = /([NS][\s]*\d+°[\s]*\d+\.\d+)[\s]*([EW][\s]*\d+°[\s]*\d+\.\d+)/;
            const match = coordinatesText.match(regex);
            
            if (!match || match.length < 3) {
                this.showSaveCoordinatesError("Format non reconnu");
                return;
            }
            
            // Extraire la latitude et la longitude
            const gcLat = match[1].trim();
            const gcLon = match[2].trim();
            
            // Préparer les données à envoyer
            const formData = new FormData();
            formData.append('gc_lat', gcLat);
            formData.append('gc_lon', gcLon);
            
            // Afficher l'état de chargement
            this.showSaveCoordinatesLoading();
            
            // Appel à l'API pour sauvegarder les coordonnées
            fetch(`/geocaches/${geocacheId}/coordinates`, {
                method: 'PUT',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                console.log("Coordonnées mises à jour avec succès");
                this.showSaveCoordinatesSuccess();
                
                // Vérifier si la page doit être rechargée pour afficher les coordonnées mises à jour
                if (html.includes('coordinatesUpdated')) {
                    // Si on utilise HTMX, déclencher un événement personnalisé
                    document.dispatchEvent(new CustomEvent('coordinatesUpdated'));
                }
            })
            .catch(error => {
                console.error("Erreur lors de la mise à jour des coordonnées:", error);
                this.showSaveCoordinatesError("Erreur de communication");
            });
        }
        
        /**
         * Affiche l'état de chargement pour la sauvegarde des coordonnées
         */
        showSaveCoordinatesLoading() {
            const button = this.element.querySelector('[data-formula-solver-target="saveGeocacheButton"]');
            if (!button) return;
            
            // Sauvegarder le contenu original du bouton
            button._originalHTML = button.innerHTML;
            
            // Mettre à jour le bouton avec une animation de chargement
            button.innerHTML = `
                <div class="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-1"></div>
                <span>Sauvegarde...</span>
            `;
            button.disabled = true;
        }
        
        /**
         * Affiche un message de succès pour la sauvegarde des coordonnées
         */
        showSaveCoordinatesSuccess() {
            const button = this.element.querySelector('[data-formula-solver-target="saveGeocacheButton"]');
            if (!button) return;
            
            // Mettre à jour le bouton avec un message de succès
            button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Sauvegardé!</span>
            `;
            button.classList.remove("bg-amber-600", "hover:bg-amber-700");
            button.classList.add("bg-green-600", "hover:bg-green-700");
            button.disabled = false;
            
            // Rétablir le bouton après un délai
            setTimeout(() => {
                button.innerHTML = button._originalHTML || `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    <span>Mettre à jour coordonnées</span>
                `;
                button.classList.remove("bg-green-600", "hover:bg-green-700");
                button.classList.add("bg-amber-600", "hover:bg-amber-700");
            }, 3000);
        }
        
        /**
         * Affiche un message d'erreur pour la sauvegarde des coordonnées
         * @param {string} message - Le message d'erreur à afficher
         */
        showSaveCoordinatesError(message) {
            const button = this.element.querySelector('[data-formula-solver-target="saveGeocacheButton"]');
            if (!button) return;
            
            // Mettre à jour le bouton avec un message d'erreur
            button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>${message}</span>
            `;
            button.classList.remove("bg-amber-600", "hover:bg-amber-700");
            button.classList.add("bg-red-600", "hover:bg-red-700");
            button.disabled = false;
            
            // Rétablir le bouton après un délai
            setTimeout(() => {
                button.innerHTML = button._originalHTML || `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    <span>Mettre à jour coordonnées</span>
                `;
                button.classList.remove("bg-red-600", "hover:bg-red-700");
                button.classList.add("bg-amber-600", "hover:bg-amber-700");
            }, 3000);
        }

        /**
         * Met à jour la liste des waypoints de la géocache
         * @param {number} geocacheId - L'ID de la géocache
         */
        async updateWaypointsList(geocacheId) {
            try {
                console.log("Mise à jour de la liste des waypoints...");
                
                // Trouver le conteneur de la liste des waypoints
                const waypointsListContainer = document.querySelector('[data-waypoint-form-target="waypointsList"]');
                
                if (!waypointsListContainer) {
                    console.warn("Conteneur de la liste des waypoints non trouvé");
                    return;
                }
                
                // Récupérer la liste mise à jour des waypoints
                const listResponse = await fetch(`/api/geocaches/${geocacheId}/waypoints/list`);
                
                if (listResponse.ok) {
                    const listHtml = await listResponse.text();
                    waypointsListContainer.innerHTML = listHtml;
                    console.log("Liste des waypoints mise à jour avec succès");
                } else {
                    console.warn(`Échec de la récupération de la liste des waypoints: ${listResponse.status} ${listResponse.statusText}`);
                    
                    // Tentative alternative: recharger la section complète de waypoints
                    const fullListResponse = await fetch(`/geocaches/${geocacheId}/details-panel`);
                    if (fullListResponse.ok) {
                        const fullHtml = await fullListResponse.text();
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = fullHtml;
                        
                        const newWaypointList = tempDiv.querySelector('#waypoints-list-container');
                        if (newWaypointList) {
                            waypointsListContainer.innerHTML = newWaypointList.innerHTML;
                            console.log("Liste des waypoints récupérée à partir des détails complets");
                        }
                    }
                }
            } catch (error) {
                console.error("Erreur lors de la mise à jour de la liste des waypoints:", error);
            }
        }
        
        /**
         * Ouvre les coordonnées calculées dans GeoCheck pour vérification
         */
        openGeoCheck(event) {
            event.preventDefault();
            
            // Récupérer les coordonnées calculées
            const coordinatesText = this.calculatedCoordinatesTextTarget.innerText.trim();
            if (!coordinatesText) {
                this.showOpenGeoCheckError("Aucune coordonnée calculée");
                return;
            }
            
            // Vérifier si les coordonnées sont complètes (pas de variables non résolues)
            if (coordinatesText.match(/[A-Z]{2,}/)) {
                this.showOpenGeoCheckError("Coordonnées incomplètes");
                return;
            }
            
            // Extraire les coordonnées au format N/E
            // Format attendu: N 47° 12.345 E 006° 12.345
            const regex = /([NS])[\s]*(\d+)°[\s]*(\d+)\.(\d+)[\s]*([EW])[\s]*(\d+)°[\s]*(\d+)\.(\d+)/;
            const match = coordinatesText.match(regex);
            
            if (!match || match.length < 9) {
                this.showOpenGeoCheckError("Format non reconnu");
                return;
            }
            
            // Extraire les composants des coordonnées
            const latHemisphere = match[1];  // N ou S
            const latDegrees = match[2];     // degrés latitude
            const latMinutes = match[3];     // minutes latitude
            const latDecimals = match[4];    // décimales minutes latitude
            
            const lonHemisphere = match[5];  // E ou W
            const lonDegrees = match[6];     // degrés longitude
            const lonMinutes = match[7];     // minutes longitude
            const lonDecimals = match[8];    // décimales minutes longitude
            
            // URL de base pour GeoCheck
            const geoCheckUrl = 'https://geotjek.dk/geo_inputchkcoord.php';
            
            // Créer un script qui sera exécuté dans l'iframe pour remplir automatiquement les champs du formulaire
            const autoFillScript = `
                // Exécuter quand la page est chargée
                document.addEventListener('DOMContentLoaded', function() {
                    // Sélectionner le bon hémisphère pour la latitude (N/S)
                    const latRadios = document.querySelectorAll('input[name="lat"]');
                    for(let radio of latRadios) {
                        if(radio.value === '${latHemisphere}') {
                            radio.checked = true;
                        }
                    }
                    
                    // Sélectionner le bon hémisphère pour la longitude (E/W)
                    const lonRadios = document.querySelectorAll('input[name="lon"]');
                    for(let radio of lonRadios) {
                        if(radio.value === '${lonHemisphere}') {
                            radio.checked = true;
                        }
                    }
                    
                    // Remplir les champs de degrés, minutes et décimales
                    document.querySelector('input[name="latdeg"]').value = '${latDegrees}';
                    document.querySelector('input[name="latmin"]').value = '${latMinutes}';
                    document.querySelector('input[name="latdec"]').value = '${latDecimals}';
                    
                    document.querySelector('input[name="londeg"]').value = '${lonDegrees}';
                    document.querySelector('input[name="lonmin"]').value = '${lonMinutes}';
                    document.querySelector('input[name="londec"]').value = '${lonDecimals}';
                    
                    console.log('GeoCheck Form Autofilled!');
                });
            `;
            
            // Vérifier si GoldenLayout est disponible
            if (window.mainLayout) {
                try {
                    // Créer le nouvel onglet dans GoldenLayout
                    window.mainLayout.root.contentItems[0].addChild({
                        type: 'component',
                        componentName: 'external-url',
                        title: 'GeoCheck Verification',
                        componentState: {
                            url: geoCheckUrl,
                            autoFillScript: autoFillScript,
                            icon: 'check-circle'
                        }
                    });
                    
                    // Afficher un message de succès
                    this.showOpenGeoCheckSuccess();
                } catch (error) {
                    console.error("Erreur lors de l'ouverture de GeoCheck:", error);
                    this.showOpenGeoCheckError("Erreur d'affichage");
                    
                    // Fallback: ouvrir dans un nouvel onglet du navigateur
                    window.open(geoCheckUrl, '_blank');
                }
            } else if (window.parent && window.parent.mainLayout) {
                // Si nous sommes dans un iframe, utiliser le layout parent
                try {
                    window.parent.mainLayout.root.contentItems[0].addChild({
                        type: 'component',
                        componentName: 'external-url',
                        title: 'GeoCheck Verification',
                        componentState: {
                            url: geoCheckUrl,
                            autoFillScript: autoFillScript,
                            icon: 'check-circle'
                        }
                    });
                    
                    // Afficher un message de succès
                    this.showOpenGeoCheckSuccess();
                } catch (error) {
                    console.error("Erreur lors de l'ouverture de GeoCheck depuis l'iframe:", error);
                    this.showOpenGeoCheckError("Erreur d'affichage");
                    
                    // Fallback: ouvrir dans un nouvel onglet du navigateur
                    window.open(geoCheckUrl, '_blank');
                }
            } else {
                // Fallback: ouvrir dans un nouvel onglet du navigateur si GoldenLayout n'est pas disponible
                console.warn("GoldenLayout n'est pas disponible, ouverture dans un nouvel onglet navigateur");
                window.open(geoCheckUrl, '_blank');
                this.showOpenGeoCheckSuccess();
            }
        }
        
        /**
         * Affiche un message de succès pour l'ouverture de GeoCheck
         */
        showOpenGeoCheckSuccess() {
            const button = this.element.querySelector('[data-formula-solver-target="openGeoCheckButton"]');
            if (!button) return;
            
            const originalHTML = button.innerHTML;
            
            // Mettre à jour le bouton avec un message de succès
            button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Ouvert!</span>
            `;
            button.classList.remove("bg-indigo-600", "hover:bg-indigo-700");
            button.classList.add("bg-green-600", "hover:bg-green-700");
            
            // Rétablir le bouton après un délai
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove("bg-green-600", "hover:bg-green-700");
                button.classList.add("bg-indigo-600", "hover:bg-indigo-700");
            }, 3000);
        }
        
        /**
         * Affiche un message d'erreur pour l'ouverture de GeoCheck
         * @param {string} message - Le message d'erreur à afficher
         */
        showOpenGeoCheckError(message) {
            const button = this.element.querySelector('[data-formula-solver-target="openGeoCheckButton"]');
            if (!button) return;
            
            const originalHTML = button.innerHTML;
            
            // Mettre à jour le bouton avec un message d'erreur
            button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>${message}</span>
            `;
            button.classList.remove("bg-indigo-600", "hover:bg-indigo-700");
            button.classList.add("bg-red-600", "hover:bg-red-700");
            
            // Rétablir le bouton après un délai
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove("bg-red-600", "hover:bg-red-700");
                button.classList.add("bg-indigo-600", "hover:bg-indigo-700");
            }, 3000);
        }
    }

    // Enregistrer le contrôleur dans l'application Stimulus
    try {
        // Essayer avec les deux façons d'enregistrer un contrôleur dans l'application
        if (window.application) {
            window.application.register('formula-solver', FormulaSolverController);
            console.log("FormulaSolverController enregistré avec window.application");
        } else if (window.StimulusApp) {
            window.StimulusApp.register('formula-solver', FormulaSolverController);
            console.log("FormulaSolverController enregistré avec window.StimulusApp");
        } else {
            console.error("Aucune application Stimulus trouvée pour enregistrer le contrôleur");
        }
    } catch (error) {
        console.error("Erreur lors de l'enregistrement du contrôleur FormulaSolverController:", error);
    }
})(); 