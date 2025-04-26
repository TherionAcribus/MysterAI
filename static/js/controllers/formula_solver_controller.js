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
            this.letterValues = new Map();
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
                Array.from(this.letterFieldsTarget.querySelectorAll('input'))
                    .map(input => input.dataset.letter)
            );
            
            // Créer les nouveaux champs
            let html = '';
            letters.forEach(letter => {
                if (!existingLetters.has(letter)) {
                    html += `
                        <div class="flex items-center">
                            <label class="text-gray-300 w-10 font-bold">${letter}:</label>
                            <input 
                                type="number" 
                                class="bg-gray-700 text-white border border-gray-600 rounded w-full py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                data-letter="${letter}"
                                data-action="input->formula-solver#updateFormula"
                                min="0"
                                max="9"
                                placeholder="0-9">
                        </div>
                    `;
                }
            });
            
            // Ajouter les nouveaux champs
            if (html) {
                this.letterFieldsTarget.insertAdjacentHTML('beforeend', html);
            }
            
            // Supprimer les champs pour les lettres qui ne sont plus dans la formule
            Array.from(this.letterFieldsTarget.querySelectorAll('input')).forEach(input => {
                const letter = input.dataset.letter;
                if (!letters.includes(letter)) {
                    input.closest('.flex').remove();
                    this.letterValues.delete(letter);
                }
            });
        }
        
        // Mettre à jour la formule quand une valeur est changée
        updateFormula(event) {
            const letter = event.target.dataset.letter;
            const value = event.target.value.trim();
            
            if (value === '') {
                this.letterValues.delete(letter);
            } else {
                this.letterValues.set(letter, parseInt(value, 10));
            }
            
            this.updateSubstitutedFormula();
            this.calculateCoordinates();
        }
        
        // Mettre à jour l'affichage de la formule avec les substitutions
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
                    this.letterValues.forEach((value, letter) => {
                        // Création d'une regex qui évite de remplacer les lettres cardinales
                        // sauf si elles sont à l'intérieur des parenthèses
                        const regex = new RegExp(`(\\([^()]*)(${letter})([^()]*\\)|\\.(${letter}))`, 'g');
                        content = content.replace(regex, (match, prefix, letterMatch, suffix) => {
                            return prefix + value + suffix;
                        });
                    });
                    substitutedFormula += content;
                }
            }
            
            // Afficher la formule substituée
            this.substitutedFormulaTextTarget.textContent = substitutedFormula;
            this.substitutedFormulaTarget.classList.remove('hidden');
        }
        
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
        
        // Calculer les coordonnées finales
        calculateCoordinates() {
            const formula = this.formulaInputTarget.value.trim();
            if (!formula) return;
            
            // Vérifier si toutes les lettres ont des valeurs
            const allLetters = this.extractUniqueLetters(formula);
            const allLettersHaveValues = allLetters.every(letter => this.letterValues.has(letter));
            
            if (!allLettersHaveValues) {
                // Si toutes les lettres n'ont pas de valeur, cacher le résultat final
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
                            for (const [letter, value] of this.letterValues.entries()) {
                                const regex = new RegExp(letter, 'g');
                                substitutedExpression = substitutedExpression.replace(regex, value);
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
                            for (const [letter, value] of this.letterValues.entries()) {
                                const regex = new RegExp(letter, 'g');
                                substitutedExpression = substitutedExpression.replace(regex, value);
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
        
        // Calculer les expressions mathématiques dans une chaîne
        calculateExpressions(formula) {
            if (!formula) return '';
            
            // Remplacer les expressions entre parenthèses par leur valeur calculée
            let result = formula;
            const parenthesesRegex = /\(([^()]+)\)/g;
            let match;
            
            // Tant qu'il y a des expressions entre parenthèses, les calculer
            while ((match = parenthesesRegex.exec(result)) !== null) {
                const expression = match[1];
                try {
                    // Calculer l'expression
                    const value = this.evaluateExpression(expression);
                    // Remplacer l'expression par sa valeur
                    result = result.replace(`(${expression})`, value);
                    // Réinitialiser l'expression régulière pour continuer à chercher
                    parenthesesRegex.lastIndex = 0;
                } catch (error) {
                    console.error(`Erreur lors de l'évaluation de l'expression ${expression}:`, error);
                }
            }
            
            // Rechercher des motifs comme "47° 5E.FTN" et calculer les décimales
            const decimalRegex = /(\d+)°\s+(\d+)\.([^°\s]+)/g;
            result = result.replace(decimalRegex, (match, degrees, minutes, decimal) => {
                // Si decimal contient encore des expressions comme "A+B-317", les évaluer
                const calculatedDecimal = this.evaluateExpression(decimal);
                return `${degrees}° ${minutes}.${calculatedDecimal}`;
            });
            
            return result;
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