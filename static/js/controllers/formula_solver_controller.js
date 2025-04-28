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
            "questionExtractionModeDisplay"
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
                    html += this.createLetterFieldHTML(letter);
                }
            });
            
            // Ajouter les nouveaux champs
            if (html) {
                this.letterFieldsTarget.insertAdjacentHTML('beforeend', html);
            }
            
            // Supprimer les champs pour les lettres qui ne sont plus dans la formule
            Array.from(this.letterFieldsTarget.querySelectorAll('.letter-container')).forEach(container => {
                const letter = container.dataset.letter;
                if (!letters.includes(letter)) {
                    container.remove();
                    this.letterData.delete(letter);
                }
            });
        }
        
        // Créer le HTML pour un champ de lettre
        createLetterFieldHTML(letter) {
            return `
                <div class="bg-gray-700 p-4 rounded letter-container" data-letter="${letter}">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-lg font-bold text-white">Lettre ${letter}</h3>
                        <div class="flex items-center space-x-4">
                            <label class="flex items-center space-x-1 text-gray-300 text-sm">
                                <input type="radio" name="value-type-${letter}" value="value" checked 
                                       data-letter="${letter}" data-action="change->formula-solver#setLetterValueType">
                                <span>Valeur</span>
                            </label>
                            <label class="flex items-center space-x-1 text-gray-300 text-sm">
                                <input type="radio" name="value-type-${letter}" value="checksum" 
                                       data-letter="${letter}" data-action="change->formula-solver#setLetterValueType">
                                <span>Checksum</span>
                            </label>
                            <label class="flex items-center space-x-1 text-gray-300 text-sm">
                                <input type="radio" name="value-type-${letter}" value="reduced-checksum" 
                                       data-letter="${letter}" data-action="change->formula-solver#setLetterValueType">
                                <span>Réduit</span>
                            </label>
                            <label class="flex items-center space-x-1 text-gray-300 text-sm">
                                <input type="radio" name="value-type-${letter}" value="length" 
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
                    selectedType: this.selectedValueType
                };
                
                // Mettre à jour le mot
                letterData.word = value;
                
                // Calculer le checksum (somme des valeurs des lettres A=1, B=2, etc.)
                letterData.checksum = this.calculateChecksum(value);
                
                // Calculer le checksum réduit (réduire à un seul chiffre)
                letterData['reduced-checksum'] = this.reduceChecksum(letterData.checksum);
                
                // Calculer la longueur
                letterData.length = value.length;
                
                // Mettre à jour la map des données
                this.letterData.set(letter, letterData);
                
                // Mettre à jour les champs d'affichage
                this.updateLetterFields(letter, letterData);
                
                console.log(`Données mises à jour pour ${letter}:`, letterData);
                
                // Forcer la mise à jour avec un petit délai pour s'assurer que tout est bien traité
                // Pour éviter des problèmes potentiels de timing ou de mise en cache
                setTimeout(() => {
                    console.log("Mise à jour forcée après délai");
                    
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
                            const value = this.getLetterValue(letter);
                            
                            // Ne remplacer que si la valeur est numérique ou si c'est un mot/expression
                            if (value !== '') {
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

            // Collecter les variables et leurs valeurs
            const allLetters = this.extractUniqueLetters(formula);
            const variables = {};

            for (const letter of allLetters) {
                const value = this.getLetterValue(letter);
                if (value !== '' && this.isNumeric(value)) {
                    variables[letter] = parseFloat(value);
                }
            }

            console.log("Variables collectées:", variables);
            
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
            
            console.log("Données envoyées à l'API:", requestData);

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
                
                // Ajouter des infobulles pour les messages d'erreur
                if (data.lat_status && data.lat_status.status === 'error' && data.lat_status.message) {
                    console.log("Message d'erreur pour latitude:", data.lat_status.message);
                }
                if (data.lon_status && data.lon_status.status === 'error' && data.lon_status.message) {
                    console.log("Message d'erreur pour longitude:", data.lon_status.message);
                }
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