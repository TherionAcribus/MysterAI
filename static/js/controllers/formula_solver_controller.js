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
            "calculatedCoordinatesText"
        ]
        static values = {
            geocacheId: String,
            gcCode: String
        }

        connect() {
            console.log("Formula Solver controller connected", {
                geocacheId: this.geocacheIdValue,
                gcCode: this.gcCodeValue
            });
            
            // Map pour stocker les valeurs des lettres
            this.letterData = new Map();
            // Type de valeur sélectionné par défaut
            this.selectedValueType = 'value';
        }

        // Définir le type de valeur pour toutes les lettres
        setGlobalValueType(event) {
            this.selectedValueType = event.target.value;
            
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
            
            // Mettre à jour la formule et les calculs
            this.updateSubstitutedFormula();
            this.calculateCoordinates();
        }
        
        // Définir le type de valeur pour une lettre spécifique
        setLetterValueType(event) {
            const letter = event.target.dataset.letter;
            const valueType = event.target.value;
            
            if (letter && this.letterData.has(letter)) {
                const data = this.letterData.get(letter);
                data.selectedType = valueType;
                this.letterData.set(letter, data);
                
                // Mettre à jour la formule et les calculs
                this.updateSubstitutedFormula();
                this.calculateCoordinates();
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
            
            if (letters.length === 0) {
                this.letterInputsTarget.classList.add('hidden');
                return;
            }
            
            // Créer les champs de saisie pour chaque lettre
            this.createLetterInputFields(letters);
            
            // Afficher la section des lettres
            this.letterInputsTarget.classList.remove('hidden');
            
            // Mettre à jour la formule substituée
            this.updateSubstitutedFormula();
        }
        
        // Extraire les lettres uniques de la formule
        extractUniqueLetters(formula) {
            // Cette méthode est optimisée pour les formules du type:
            // N49°12.(A+B+C+D+E+F+G+H+I+J-317) E005°59.(A+B+C+D+E+F+G+H+I+J-197)
            
            let letterMatches = [];
            
            // On extrait uniquement les lettres à l'intérieur des parenthèses
            const parenthesesRegex = /\(([^()]+)\)/g;
            let match;
            
            while ((match = parenthesesRegex.exec(formula)) !== null) {
                const content = match[1];
                // Extraire les lettres majuscules dans le contenu des parenthèses
                const letters = content.match(/[A-Z]/g) || [];
                letterMatches = [...letterMatches, ...letters];
            }
            
            // Si on ne trouve pas de parenthèses, rechercher des lettres après un point
            if (letterMatches.length === 0) {
                const decimalRegex = /\.([A-Z0-9+\-*\/]+)/g;
                while ((match = decimalRegex.exec(formula)) !== null) {
                    const content = match[1];
                    const letters = content.match(/[A-Z]/g) || [];
                    letterMatches = [...letterMatches, ...letters];
                }
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
                </div>
            `;
        }
        
        // Mettre à jour les données d'une lettre
        updateLetterData(event) {
            const letter = event.target.dataset.letter;
            const field = event.target.dataset.field;
            const value = event.target.value.trim();
            
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
                
                // Mettre à jour la formule et les coordonnées calculées
                this.updateSubstitutedFormula();
                this.calculateCoordinates();
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
            
            // Convertir en majuscules et supprimer les espaces et caractères spéciaux
            const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
            
            // Calculer la somme (A=1, B=2, etc.)
            return cleanText.split('').reduce((sum, char) => {
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
            const formula = this.formulaInputTarget.value.trim();
            if (!formula) return;
            
            // Vérifier si toutes les lettres ont des valeurs numériques
            const allLetters = this.extractUniqueLetters(formula);
            const allLettersHaveNumericValues = allLetters.every(letter => {
                const value = this.getLetterValue(letter);
                return value !== '' && this.isNumeric(value);
            });
            
            if (!allLettersHaveNumericValues) {
                // Si toutes les lettres n'ont pas de valeur numérique, cacher le résultat final
                this.calculatedCoordinatesTarget.classList.add('hidden');
                return;
            }
            
            try {
                // Découper les coordonnées en parties Nord/Sud et Est/Ouest
                // Format typique: N49°12.(A+B+C+D+E+F+G+H+I+J-317) E005°59.(A+B+C+D+E+F+G+H+I+J-197)
                
                // Extraction de la partie Nord
                const northMatch = formula.match(/([NS])\s*(\d+)°\s*(\d+)\.(\([^()]+\)|\w+)/);
                let northPart = '';
                
                if (northMatch) {
                    const [, northDirection, northDegrees, northMinutes, northDecimal] = northMatch;
                    
                    // Calculer la partie décimale
                    let calculatedDecimal = northDecimal;
                    
                    // Si la partie décimale contient une formule entre parenthèses, la calculer
                    if (northDecimal.startsWith('(')) {
                        const expressionMatch = northDecimal.match(/\(([^()]+)\)/);
                        if (expressionMatch) {
                            const expression = expressionMatch[1];
                            // Remplacer les lettres par leurs valeurs
                            let substitutedExpression = expression;
                            for (const letter of allLetters) {
                                const value = this.getLetterValue(letter);
                                if (value !== '' && this.isNumeric(value)) {
                                    const regex = new RegExp(letter, 'g');
                                    substitutedExpression = substitutedExpression.replace(regex, value);
                                }
                            }
                            // Évaluer l'expression
                            calculatedDecimal = this.evaluateExpression(substitutedExpression);
                        }
                    }
                    
                    // Formater les minutes avec 2 chiffres (00-59)
                    const formattedMinutes = northMinutes.padStart(2, '0');
                    
                    // Formater la partie décimale avec 3 chiffres
                    const formattedDecimal = calculatedDecimal.toString().padStart(3, '0');
                    
                    // Reconstruire la partie Nord
                    northPart = `${northDirection}${northDegrees}° ${formattedMinutes}.${formattedDecimal}`;
                }
                
                // Extraction de la partie Est
                const eastMatch = formula.match(/([EW])\s*(\d+)°\s*(\d+)\.(\([^()]+\)|\w+)/);
                let eastPart = '';
                
                if (eastMatch) {
                    const [, eastDirection, eastDegrees, eastMinutes, eastDecimal] = eastMatch;
                    
                    // Calculer la partie décimale
                    let calculatedDecimal = eastDecimal;
                    
                    // Si la partie décimale contient une formule entre parenthèses, la calculer
                    if (eastDecimal.startsWith('(')) {
                        const expressionMatch = eastDecimal.match(/\(([^()]+)\)/);
                        if (expressionMatch) {
                            const expression = expressionMatch[1];
                            // Remplacer les lettres par leurs valeurs
                            let substitutedExpression = expression;
                            for (const letter of allLetters) {
                                const value = this.getLetterValue(letter);
                                if (value !== '' && this.isNumeric(value)) {
                                    const regex = new RegExp(letter, 'g');
                                    substitutedExpression = substitutedExpression.replace(regex, value);
                                }
                            }
                            // Évaluer l'expression
                            calculatedDecimal = this.evaluateExpression(substitutedExpression);
                        }
                    }
                    
                    // Formater les minutes avec 2 chiffres (00-59)
                    const formattedMinutes = eastMinutes.padStart(2, '0');
                    
                    // Formater la partie décimale avec 3 chiffres
                    const formattedDecimal = calculatedDecimal.toString().padStart(3, '0');
                    
                    // Reconstruire la partie Est
                    eastPart = `${eastDirection}${eastDegrees}° ${formattedMinutes}.${formattedDecimal}`;
                }
                
                // Combiner les deux parties
                const calculatedCoordinates = `${northPart} ${eastPart}`;
                
                // Afficher les coordonnées calculées
                this.calculatedCoordinatesTextTarget.textContent = calculatedCoordinates;
                this.calculatedCoordinatesTarget.classList.remove('hidden');
            } catch (error) {
                console.error("Erreur lors du calcul des coordonnées:", error);
                this.calculatedCoordinatesTextTarget.textContent = "Erreur: Formule invalide ou incomplète";
                this.calculatedCoordinatesTarget.classList.remove('hidden');
            }
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
            
            // Afficher le résultat de base
            this.displayResults({
                input: formula,
                formattedInput: formula,
                status: "success"
            });
        }

        // Méthode pour ajouter les coordonnées d'un waypoint au formulaire
        addToFormula(event) {
            const coordinates = event.currentTarget.dataset.coordinates;
            if (coordinates) {
                this.formulaInputTarget.value = coordinates;
                // Extraire les lettres de la nouvelle formule
                this.extractLetters();
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