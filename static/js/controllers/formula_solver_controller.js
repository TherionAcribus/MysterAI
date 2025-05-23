// Formula Solver Controller
(() => {
    // Définir la fonction d'aide pour ouvrir les détails de la géocache à partir de n'importe quel contexte
    if (!window.openGeocacheDetailsTab) {
        window.openGeocacheDetailsTab = function(geocacheId) {
            // Éviter d'ouvrir plusieurs fois le même onglet
            if (document.querySelector(`[data-geocache-details="${geocacheId}"]`)) {
                console.log(`L'onglet des détails de la géocache ${geocacheId} est déjà ouvert.`);
                return;
            }
            
            console.log(`Ouverture de l'onglet des détails de la géocache ${geocacheId}...`);
            
            // Construire l'URL des détails de la géocache
            const detailsUrl = `/geocaches/${geocacheId}/details-panel`;
            
            // Déterminer le conteneur parent le plus approprié
            const container = document.querySelector('.lm_goldenlayout');
            const parentContainer = container ? container.closest('.lm_item') : null;
            const containerId = parentContainer ? parentContainer.id : null;
            
            // Si on trouve un conteneur parent, envoyons un message pour ouvrir les détails
            if (containerId) {
                const message = {
                    type: 'openGeocacheDetails',
                    geocacheId: geocacheId,
                    containerId: containerId,
                    detailsUrl: detailsUrl
                };
                
                // Envoyer le message à la fenêtre principale
                window.postMessage(message, '*');
                console.log("Message envoyé pour ouvrir les détails de la géocache:", message);
                return true;
            } else {
                console.error("Impossible de trouver un conteneur parent pour ouvrir les détails de la géocache.");
                return false;
            }
        };
    }

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
            "openGeoCheckButton",
            "openGeocachingCheckerButton",
            "openCertitudeCheckerButton"
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
            
            // Ajouter un écouteur d'événement pour supprimer tous les points calculés
            document.addEventListener('removeAllCalculatedPoints', () => {
                // Envoyer un événement personnalisé pour informer la carte de supprimer les points
                document.dispatchEvent(new CustomEvent('clearAllCalculatedPoints'));
                
                // Réafficher les boutons d'action du point unique
                this.showActionButtonsForSinglePoint();
            });
            
            // Ajouter un écouteur d'événement pour revenir à l'affichage d'un point unique
            document.addEventListener('showSinglePointView', () => {
                this.showActionButtonsForSinglePoint();
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
            
            // Table de conversion pour les caractères accentués et spéciaux
            const accentMap = {
                'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A', 'Æ': 'AE',
                'Ç': 'C', 'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
                'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I', 'Ð': 'D',
                'Ñ': 'N', 'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O', 'Ø': 'O',
                'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U', 'Ý': 'Y',
                'Þ': 'TH', 'ß': 'SS',
                'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'æ': 'ae',
                'ç': 'c', 'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
                'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i', 'ð': 'd',
                'ñ': 'n', 'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ø': 'o',
                'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u', 'ý': 'y', 'þ': 'th', 'ÿ': 'y',
                'œ': 'oe', 'Œ': 'OE', 'µ': 'u'
            };
            
            // Fonction pour remplacer les caractères accentués
            const removeAccents = (str) => {
                return str.replace(/[^\u0000-\u007E]/g, function(a) {
                    return accentMap[a] || a;
                });
            };
            
            // Convertir en majuscules, enlever les accents, puis supprimer les caractères spéciaux sauf les chiffres
            const normalizedText = removeAccents(text.toUpperCase());
            const cleanText = normalizedText.replace(/[^A-Z0-9]/g, '');
            
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
        
        // Vérifier si une valeur est numérique
        isNumeric(value) {
            return !isNaN(parseFloat(value)) && isFinite(value);
        }
        
        // Analyser les valeurs multiples dans une chaîne de texte
        parseMultipleValues(text) {
            if (!text || typeof text !== 'string') return null;
            
            // Format @1->5 pour une plage de valeurs
            const rangeMatch = text.match(/^@(\d+)->(\d+)$/);
            if (rangeMatch) {
                const start = parseInt(rangeMatch[1]);
                const end = parseInt(rangeMatch[2]);
                if (start <= end) {
                    return Array.from({length: end - start + 1}, (_, i) => start + i);
                }
                return Array.from({length: start - end + 1}, (_, i) => start - i);
            }
            
            // Format @1&3&5 pour des valeurs spécifiques
            const specificMatch = text.match(/^@(.+)$/);
            if (specificMatch) {
                const values = specificMatch[1].split('&');
                return values.map(v => parseInt(v)).filter(v => !isNaN(v));
            }
            
            return null;
        }
        
        // Obtenir la valeur à utiliser pour une lettre donnée
        getLetterValue(letter) {
            if (!this.letterData.has(letter)) return '';
            
            const data = this.letterData.get(letter);
            const valueType = data.selectedType || this.selectedValueType;
            
            switch (valueType) {
                case 'value':
                    // Vérifier s'il s'agit d'un format de valeurs multiples
                    const multiValues = this.parseMultipleValues(data.word);
                    if (multiValues) {
                        return multiValues;
                    }
                    
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
        
        // Mettre à jour la formule avec les substitutions
        updateSubstitutedFormula() {
            console.log("updateSubstitutedFormula appelé");
            const formula = this.formulaInputTarget.value.trim();
            if (!formula) return;
            
            // Découper la formule en préservant les lettres cardinales (N, S, E, W)
            // Format typique: N49°12.(A+B+C+D+E+F+G+H+I+J-317) E005°59.(A+B+C+D+E+F+G+H+I+J-197)
            
            // 1. Séparer les parties Nord/Sud et Est/Ouest
            const parts = this.splitCoordinates(formula);
            
            // Vérifier si nous avons des valeurs multiples
            let hasMultipleValues = false;
            const letterValues = {};
            
            // Collecter toutes les valeurs de lettre pour vérifier les valeurs multiples
            for (const part of parts) {
                if (part.type === 'content') {
                    const matches = part.value.match(/\(([^()]*[A-Z][^()]*)\)/g) || [];
                    for (const match of matches) {
                        const letters = match.match(/[A-Z]/g) || [];
                        for (const letter of letters) {
                            if (!letterValues[letter]) {
                                const value = this.getLetterValue(letter);
                                letterValues[letter] = value;
                                if (Array.isArray(value)) {
                                    hasMultipleValues = true;
                                }
                            }
                        }
                    }
                }
            }
            
            // Si nous avons des valeurs multiples, afficher un message spécial
            if (hasMultipleValues) {
                let multipleValuesMessage = "Formule avec valeurs multiples:\n";
                
                for (const letter in letterValues) {
                    if (Array.isArray(letterValues[letter])) {
                        multipleValuesMessage += `${letter}: [${letterValues[letter].join(', ')}]\n`;
                    }
                }
                
                this.substitutedFormulaTextTarget.innerHTML = `
                    <div class="text-yellow-300">
                        ${multipleValuesMessage}<br>
                        Les combinaisons seront calculées automatiquement.
                    </div>
                `;
                this.substitutedFormulaTarget.classList.remove('hidden');
                return;
            }
            
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
                                    // Vérifier s'il s'agit d'un format de valeurs multiples
                                    const multiValues = this.parseMultipleValues(data.word);
                                    if (multiValues) {
                                        value = `[${multiValues.join(',')}]`;
                                    }
                                    // Si c'est un nombre, l'utiliser directement
                                    else if (data.word && this.isNumeric(data.word)) {
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
                                } else if (value.startsWith('[') && value.endsWith(']')) {
                                    // Si c'est un tableau de valeurs, le conserver tel quel
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
            let hasMultipleValues = false;

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
                        // Vérifier s'il s'agit d'un format de valeurs multiples
                        const multiValues = this.parseMultipleValues(data.word);
                        if (multiValues) {
                            console.log(`Lettre ${letter}: Valeurs multiples détectées: [${multiValues.join(', ')}]`);
                            variables[letter] = multiValues;
                            hasMultipleValues = true;
                        }
                        // Si la valeur est numérique, l'utiliser directement
                        else if (data.word && this.isNumeric(data.word)) {
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

            console.log("Variables collectées:", variables);
            
            // Vérifier si toutes les lettres nécessaires ont des valeurs numériques
            const missingVariables = allLetters.filter(letter => {
                // Une variable est considérée comme manquante si elle n'existe pas dans 'variables'
                // OU si sa valeur est un tableau (indiquant une sélection multiple non résolue en valeur unique)
                // OU si elle existe mais n'est pas numérique (après traitement des types checksum/longueur etc.)
                const value = variables[letter];
                return value === undefined || Array.isArray(value);
            });
            
            // Si des variables sont manquantes, effacer tous les points de la carte
            if (missingVariables.length > 0) {
                console.warn(`Variables manquantes ou non résolues en valeur unique: ${missingVariables.join(', ')}`);
                // Dispatcher un événement pour supprimer tous les points calculés (UTILISER LE BON NOM D'EVENEMENT)
                console.log("Dispatching event: clearCalculatedPoints"); 
                document.dispatchEvent(new CustomEvent('clearCalculatedPoints')); // CORRECTION DU NOM DE L'EVENEMENT
                console.log("Event clearCalculatedPoints dispatched."); 
                // Réafficher les boutons d'action du point unique car on n'a plus de point unique valide
                this.showActionButtonsForSinglePoint();
                // NE PAS retourner ici, continuer pour appeler l'API et mettre à jour l'affichage des coordonnées textuelles
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
            
            // Si nous avons des valeurs multiples, générer toutes les combinaisons
            if (hasMultipleValues) {
                console.log("Détection de valeurs multiples, génération des combinaisons...");
                const allCombinations = this.generateAllCombinations(variables);
                console.log(`${allCombinations.length} combinaisons générées:`, allCombinations);
                
                // Limite pour éviter de surcharger le serveur (max 50 combinaisons)
                const maxCombinations = 50;
                const combinationsToProcess = allCombinations.slice(0, maxCombinations);
                
                // Affichage d'un message si certaines combinaisons sont ignorées
                if (allCombinations.length > maxCombinations) {
                    console.warn(`ATTENTION: Seules les ${maxCombinations} premières combinaisons seront traitées sur un total de ${allCombinations.length}`);
                }
                
                // Réinitialiser l'affichage des coordonnées
                this.calculatedCoordinatesTextTarget.innerHTML = '';
                this.calculatedCoordinatesTarget.classList.remove('hidden');
                
                // Ajouter un message indiquant le traitement en cours
                const processingMsg = document.createElement('div');
                processingMsg.className = 'text-blue-400 mb-2';
                processingMsg.textContent = `Traitement de ${combinationsToProcess.length} combinaisons...`;
                this.calculatedCoordinatesTextTarget.appendChild(processingMsg);
                
                // Créer un conteneur pour toutes les coordonnées calculées
                const resultsContainer = document.createElement('div');
                resultsContainer.className = 'bg-gray-800 p-3 rounded max-h-96 overflow-y-auto';
                this.calculatedCoordinatesTextTarget.appendChild(resultsContainer);
                
                // Collecter les données pour tous les points
                const mapPoints = [];
                
                // Traiter chaque combinaison
                Promise.all(combinationsToProcess.map(combination => {
                    // Créer les données à envoyer à l'API
                    const requestData = {
                        formula: formula,
                        variables: combination,
                        ...originData,
                        timestamp: new Date().getTime() // Pour éviter le cache
                    };
                    
                    // Appeler l'API pour calculer les coordonnées
                    return fetch('/api/calculate_coordinates', {
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
                    });
                }))
                .then(results => {
                    // Supprimer le message de traitement
                    processingMsg.remove();
                    
                    // Ajouter un titre pour les résultats
                    const titleElement = document.createElement('div');
                    titleElement.className = 'text-white font-medium mb-2';
                    titleElement.textContent = `${results.length} combinaisons calculées:`;
                    resultsContainer.appendChild(titleElement);
                    
                    // Préparer les données pour l'affichage sur la carte
                    const validPoints = [];
                    
                    // Afficher chaque résultat et collecter les points valides
                    results.forEach((data, index) => {
                        if (data.error) {
                            // Ignorer les erreurs pour simplifier l'affichage
                            return;
                        }
                        
                        // Créer un élément pour ce résultat
                        const resultElement = document.createElement('div');
                        resultElement.className = 'p-2 border-b border-gray-700';
                        
                        // Construire la description des variables utilisées
                        const variablesUsed = Object.entries(combinationsToProcess[index])
                            .map(([letter, value]) => `${letter}=${value}`)
                            .join(', ');
                        
                        // Calculer la distance si disponible
                        let distanceHTML = '';
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
                            
                            distanceHTML = `<div class="mt-1 ${distanceClass} text-xs" title="Distance par rapport au point d'origine">${distanceMessage}</div>`;
                        }
                        
                        // Coordonnées calculées
                        const coordsText = `${data.latitude} ${data.longitude}`;
                        const coordinatesHTML = `
                            <div class="text-xs text-gray-400 mb-1">${variablesUsed}</div>
                            <div class="flex justify-between items-center">
                                <div class="text-green-400">${coordsText}</div>
                                <div class="flex space-x-1">
                                <button class="text-xs bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded copy-coords" 
                                            data-coords="${coordsText}">
                                    Copier
                                </button>
                            </div>
                            </div>
                            ${distanceHTML}
                        `;
                        
                        resultElement.innerHTML = coordinatesHTML;
                        resultsContainer.appendChild(resultElement);
                        
                        // Ajouter un gestionnaire d'événements pour le bouton Copier
                        const copyButton = resultElement.querySelector('.copy-coords');
                        copyButton.addEventListener('click', (e) => {
                            const coords = e.target.dataset.coords;
                            navigator.clipboard.writeText(coords).then(() => {
                                const originalText = e.target.textContent;
                                e.target.textContent = 'Copié!';
                                e.target.classList.remove('bg-blue-500', 'hover:bg-blue-600');
                                e.target.classList.add('bg-green-500');
                                
                                setTimeout(() => {
                                    e.target.textContent = originalText;
                                    e.target.classList.add('bg-blue-500', 'hover:bg-blue-600');
                                    e.target.classList.remove('bg-green-500');
                                }, 1500);
                            });
                        });
                        
                        // Collecter les points pour la carte si des coordonnées décimales sont disponibles
                        if (data.decimal_latitude && data.decimal_longitude) {
                            console.log(`Préparation du point ${index+1}: ${data.decimal_latitude}, ${data.decimal_longitude}`);
                            
                            // Créer un tableau de couleurs pour différencier les bordures des points
                            const strokeColors = [
                                '#FF0000',     // Rouge vif
                                '#00AAFF',     // Bleu clair
                                '#00CC00',     // Vert vif
                                '#FF9500',     // Orange vif
                                '#9900FF',     // Violet vif
                                '#FF00FF',     // Magenta
                                '#00FFFF',     // Cyan
                                '#FFDD00',     // Or
                                '#CC3300',     // Marron rougeâtre
                                '#AAAAAA'      // Gris
                            ];
                            
                            // Choisir une couleur de bordure basée sur l'index (en boucle si plus de 10 points)
                            const colorIndex = index % strokeColors.length;
                            const strokeColor = strokeColors[colorIndex];
                            
                            // Couleur de fond uniforme pour tous les points
                            const fillColor = 'rgba(0, 90, 220, 0.7)'; // Bleu semi-transparent
                            
                            // Ajouter ce point à notre collection
                            validPoints.push({
                                latitude: data.decimal_latitude,
                                longitude: data.decimal_longitude,
                                label: `Option ${index+1}: ${variablesUsed}`,
                                // Spécifier la couleur de remplissage et de bordure séparément
                                fillColor: fillColor,
                                strokeColor: strokeColor,
                                strokeWidth: 3, // Bordure plus épaisse pour un meilleur contraste
                                index: index + 1,
                                // Ajouter les données complètes pour les actions
                                fullData: data,
                                coordinates: coordsText
                            });
                            
                            // Ajouter une indication visuelle que le point a été préparé
                            const mapIndicator = document.createElement('div');
                            mapIndicator.className = 'mt-1 text-xs flex items-center';
                            
                            // Créer un petit cercle coloré pour représenter le point
                            mapIndicator.innerHTML = `
                                <span style="display:inline-block; width:12px; height:12px; border-radius:50%; 
                                    background-color:${fillColor}; border:2px solid ${strokeColor}; margin-right:5px;"></span>
                                Point ${index+1} sur la carte
                            `;
                            resultElement.appendChild(mapIndicator);
                            
                            // Ajouter les boutons d'action pour ce point
                            const actionsContainer = document.createElement('div');
                            actionsContainer.className = 'mt-2 flex flex-wrap gap-1';
                            
                            // Bouton "Ajouter WP"
                            if (this.geocacheIdValue) {
                                const addWpButton = document.createElement('button');
                                addWpButton.className = 'text-xs bg-green-600 hover:bg-green-700 text-white py-1 px-2 rounded';
                                addWpButton.textContent = 'Ajouter WP';
                                addWpButton.dataset.index = index;
                                addWpButton.addEventListener('click', () => {
                                    this.addAsWaypoint(validPoints[index]);
                                });
                                actionsContainer.appendChild(addWpButton);
                                
                                // Bouton "Créer WP auto"
                                const createWpButton = document.createElement('button');
                                createWpButton.className = 'text-xs bg-green-700 hover:bg-green-800 text-white py-1 px-2 rounded';
                                createWpButton.textContent = 'Créer WP auto';
                                createWpButton.dataset.index = index;
                                createWpButton.addEventListener('click', () => {
                                    this.createWaypointAuto(validPoints[index]);
                                });
                                actionsContainer.appendChild(createWpButton);
                                
                                // Bouton "Mettre à jour coordonnées"
                                const updateCoordsButton = document.createElement('button');
                                updateCoordsButton.className = 'text-xs bg-amber-600 hover:bg-amber-700 text-white py-1 px-2 rounded';
                                updateCoordsButton.textContent = 'Mettre à jour coordonnées';
                                updateCoordsButton.dataset.index = index;
                                updateCoordsButton.addEventListener('click', () => {
                                    this.saveGeocacheCoordinates(validPoints[index]);
                                });
                                actionsContainer.appendChild(updateCoordsButton);
                            }
                            
                            // Bouton "Vérifier (GeoCheck)" si disponible
                            if (this.hasOpenGeoCheckButtonTarget && !this.openGeoCheckButtonTarget.classList.contains('hidden')) {
                                const geoCheckButton = document.createElement('button');
                                geoCheckButton.className = 'text-xs bg-indigo-600 hover:bg-indigo-700 text-white py-1 px-2 rounded';
                                geoCheckButton.textContent = 'Vérifier (GeoCheck)';
                                geoCheckButton.dataset.index = index;
                                geoCheckButton.addEventListener('click', () => {
                                    this.openGeoCheck(null, validPoints[index]);
                                });
                                actionsContainer.appendChild(geoCheckButton);
                            }
                            
                            // Bouton "Vérifier (Geocaching)" si disponible
                            if (this.hasOpenGeocachingCheckerButtonTarget && !this.openGeocachingCheckerButtonTarget.classList.contains('hidden')) {
                                const geocachingButton = document.createElement('button');
                                geocachingButton.className = 'text-xs bg-orange-600 hover:bg-orange-700 text-white py-1 px-2 rounded';
                                geocachingButton.textContent = 'Vérifier (Geocaching)';
                                geocachingButton.dataset.index = index;
                                geocachingButton.addEventListener('click', () => {
                                    this.openGeocachingChecker(null, validPoints[index]);
                                });
                                actionsContainer.appendChild(geocachingButton);
                            }
                            
                            // Bouton "Vérifier (Certitude)" si disponible
                            if (this.hasOpenCertitudeCheckerButtonTarget && !this.openCertitudeCheckerButtonTarget.classList.contains('hidden')) {
                                const certitudeButton = document.createElement('button');
                                certitudeButton.className = 'text-xs bg-teal-600 hover:bg-teal-700 text-white py-1 px-2 rounded';
                                certitudeButton.textContent = 'Vérifier (Certitude)';
                                certitudeButton.dataset.index = index;
                                certitudeButton.addEventListener('click', () => {
                                    this.openCertitudeChecker(null, validPoints[index]);
                                });
                                actionsContainer.appendChild(certitudeButton);
                            }
                            
                            resultElement.appendChild(actionsContainer);
                        }
                    });
                    
                    // Afficher automatiquement les points sur la carte s'il y en a
                    if (validPoints.length > 0) {
                        // Ajouter une légende informative
                        const legendElement = document.createElement('div');
                        legendElement.className = 'mt-4 p-3 bg-gray-900 rounded text-sm';
                        legendElement.innerHTML = `
                            <div class="font-medium text-white mb-2">Points affichés sur la carte</div>
                            <div class="text-gray-300">
                                ${validPoints.length} point(s) affiché(s) automatiquement sur la carte avec des couleurs différentes.
                                <div class="mt-1 text-xs text-blue-300">Si les points ne sont pas visibles, <button id="refresh-points-button" class="underline">cliquez ici</button> pour les réafficher.</div>
                            </div>
                        `;
                        resultsContainer.appendChild(legendElement);
                        
                        // Ajouter un gestionnaire d'événements pour le bouton de rafraîchissement
                        const refreshButton = legendElement.querySelector('#refresh-points-button');
                        refreshButton.addEventListener('click', () => {
                            this.displayMultiplePointsOnMap(validPoints);
                            refreshButton.textContent = 'points réaffichés';
                            refreshButton.disabled = true;
                            setTimeout(() => {
                                refreshButton.textContent = 'cliquez ici';
                                refreshButton.disabled = false;
                            }, 2000);
                        });
                        
                        // Afficher les points immédiatement
                        this.displayMultiplePointsOnMap(validPoints);
                    }
                })
                .catch(error => {
                    console.error("Erreur lors du calcul des combinaisons:", error);
                    
                    // Afficher un message d'erreur
                    this.calculatedCoordinatesTextTarget.innerHTML = `
                        <div class="text-red-500">
                            Erreur lors du calcul des combinaisons: ${error.message}
                        </div>
                    `;
                });
                
                return; // Sortir de la fonction pour ne pas exécuter le code standard
            }

            // --- Calcul pour un point unique --- 
            
            // Créer les données à envoyer à l'API
            const requestData = {
                formula: formula,
                variables: variables, // Envoyer les variables même si certaines sont manquantes
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
                // ET si AUCUNE variable n'était manquante initialement
                if (missingVariables.length === 0 && data.status === 'complete' && data.decimal_latitude && data.decimal_longitude) {
                    console.log(`Affichage automatique du point: ${data.decimal_latitude}, ${data.decimal_longitude}`);
                    
                    // Créer l'événement pour ajouter le point sur la carte
                    const event = new CustomEvent('addCalculatedPointToMap', {
                        detail: {
                            latitude: data.decimal_latitude,
                            longitude: data.decimal_longitude,
                            label: 'Coordonnée calculée',
                            color: 'rgba(255,0,0,0.8)' // Rouge par défaut, pourrait être adapté
                        }
                    });
                    document.dispatchEvent(event);
                    
                    // Afficher une indication que le point a été ajouté
                    const container = this.calculatedCoordinatesTarget;
                    const notificationDiv = document.createElement('div');
                    notificationDiv.className = 'mt-2 text-sm text-green-500 map-point-notification'; // Ajout d'une classe pour cibler
                    notificationDiv.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Point affiché sur la carte';
                    
                    // Supprimer les notifications précédentes de ce type
                    container.querySelectorAll('.map-point-notification').forEach(el => el.remove());
                    // Ajouter la nouvelle notification
                    container.appendChild(notificationDiv);
                } else {
                    // Si les conditions ne sont pas remplies (variables manquantes ou statut incomplet),
                    // s'assurer qu'aucune notification "Point affiché" ne subsiste
                    const container = this.calculatedCoordinatesTarget;
                    container.querySelectorAll('.map-point-notification').forEach(el => el.remove());
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
            const coordinatesText = this.calculatedCoordinatesTextTarget.textContent.trim();
            if (coordinatesText) {
            navigator.clipboard.writeText(coordinatesText)
                .then(() => {
                        // Changer le texte du bouton pour indiquer que la copie a réussi
                        const originalText = this.copyCoordinatesButtonTarget.textContent;
                        this.copyCoordinatesButtonTarget.textContent = 'Copié!';
                        this.copyCoordinatesButtonTarget.classList.remove('bg-blue-500', 'hover:bg-blue-600');
                        this.copyCoordinatesButtonTarget.classList.add('bg-green-500');
                        
                        // Revenir au texte original après un délai
                    setTimeout(() => {
                            this.copyCoordinatesButtonTarget.textContent = originalText;
                            this.copyCoordinatesButtonTarget.classList.add('bg-blue-500', 'hover:bg-blue-600');
                            this.copyCoordinatesButtonTarget.classList.remove('bg-green-500');
                        }, 1500);
                })
                .catch(err => {
                    console.error('Erreur lors de la copie des coordonnées:', err);
                        alert('Impossible de copier les coordonnées. Veuillez réessayer.');
                    });
            }
        }
        
        // Ajouter les coordonnées calculées comme waypoint
        addAsWaypoint(pointData = null) {
            // Récupérer les coordonnées (soit du point spécifique, soit de l'affichage général)
            let coordinates;
            if (pointData && pointData.coordinates) {
                coordinates = pointData.coordinates;
            } else {
                coordinates = this.calculatedCoordinatesTextTarget.textContent.trim();
            }
            
            // Vérifier si des coordonnées sont disponibles
            if (!coordinates) {
                alert('Aucune coordonnée calculée disponible.');
                return;
            }
            
            // Récupérer l'ID de la géocache
            const geocacheId = this.geocacheIdValue;
            if (!geocacheId) {
                alert('ID de géocache non disponible.');
                return;
            }
            
            console.log(`Ajout d'un waypoint avec coordonnées: ${coordinates}`);
            
            // Récupérer les informations de distance si disponibles
            let distanceInfo = '';
            if (pointData && pointData.fullData && pointData.fullData.distance_from_origin) {
                const distance = pointData.fullData.distance_from_origin;
                distanceInfo = `Distance: ${distance.meters} m (${distance.miles} miles)`;
            }
            
            // Détecter si les coordonnées sont au format décimal ou au format standard
            let decimalLat, decimalLon;
            if (pointData && pointData.latitude && pointData.longitude) {
                // Utiliser directement les coordonnées décimales du point si disponibles
                decimalLat = pointData.latitude;
                decimalLon = pointData.longitude;
            } else {
                // Sinon, essayer de convertir les coordonnées standard en décimales
                const coordinatesParts = coordinates.split(' ');
                if (coordinatesParts.length === 2) {
                    const lat = this.convertGCToDecimal(coordinatesParts[0], 'lat');
                    const lon = this.convertGCToDecimal(coordinatesParts[1], 'lon');
                    if (lat !== null && lon !== null) {
                        decimalLat = lat;
                        decimalLon = lon;
                    }
                }
            }
            
            // Trouver le panneau de détails de la géocache et le formulaire de waypoint
            let waypointForm = document.querySelector('[data-controller="waypoint-form"]');
            
            if (!waypointForm) {
                console.error("Panneau de détails de la géocache ou formulaire de waypoint non trouvé");
                
                // Proposer d'ouvrir automatiquement les détails de la géocache
                const shouldOpenDetails = confirm(
                    'Le panneau des détails de la géocache n\'est pas ouvert.\n\n' +
                    'Pour ajouter un waypoint, vous devez ouvrir l\'onglet des détails de la géocache.\n\n' +
                    'Souhaitez-vous ouvrir l\'onglet des détails de la géocache maintenant?'
                );
                
                if (shouldOpenDetails && window.openGeocacheDetailsTab) {
                    // Tenter d'ouvrir l'onglet des détails de la géocache
                    window.openGeocacheDetailsTab(geocacheId);
                    
                    // Afficher un message informant l'utilisateur de réessayer après l'ouverture
                    setTimeout(() => {
                        alert('L\'onglet des détails de la géocache est en cours d\'ouverture.\nVeuillez réessayer d\'ajouter le waypoint dans quelques secondes.');
                    }, 500);
                }
                
                                return;
                            }
                            
            // Générer un nom de waypoint par défaut basé sur la formule
            const formulaText = this.formulaInputTarget.value.trim();
            let waypointName = "Point calculé";
            
            if (pointData && pointData.index) {
                waypointName = `Point calculé ${pointData.index}`;
            } else if (formulaText) {
                // Utiliser les 20 premiers caractères de la formule pour le nom du waypoint
                waypointName = "Calc: " + (formulaText.length > 20 ? formulaText.substring(0, 20) + "..." : formulaText);
            }
            
            // Préparer les notes avec les informations disponibles
            let notes = `Point calculé avec Formula Solver.\nFormule: ${formulaText}\nRésultat: ${coordinates}`;
            
            if (distanceInfo) {
                notes += `\n${distanceInfo}`;
            }
            
            // Récupérer les éléments du formulaire
            const prefixInput = waypointForm.querySelector('[data-waypoint-form-target="prefixInput"]');
            const nameInput = waypointForm.querySelector('[data-waypoint-form-target="nameInput"]');
            const gcLatInput = waypointForm.querySelector('[data-waypoint-form-target="gcLatInput"]');
            const gcLonInput = waypointForm.querySelector('[data-waypoint-form-target="gcLonInput"]');
            const noteInput = waypointForm.querySelector('[data-waypoint-form-target="noteInput"]');
            const formToggleButton = waypointForm.querySelector('[data-action="click->waypoint-form#toggleForm"]');
            const form = waypointForm.querySelector('[data-waypoint-form-target="form"]');
            
            // Extraire les coordonnées au format standard
            let gcLat, gcLon;
            if (coordinates.includes(' ')) {
                [gcLat, gcLon] = coordinates.split(' ');
            } else if (decimalLat !== undefined && decimalLon !== undefined) {
                // Convertir les coordonnées décimales en format standard
                const latDegrees = Math.floor(Math.abs(decimalLat));
                const latMinutes = (Math.abs(decimalLat) - latDegrees) * 60;
                const lonDegrees = Math.floor(Math.abs(decimalLon));
                const lonMinutes = (Math.abs(decimalLon) - lonDegrees) * 60;
                
                const latDir = decimalLat >= 0 ? 'N' : 'S';
                const lonDir = decimalLon >= 0 ? 'E' : 'W';
                
                gcLat = `${latDir}${latDegrees}° ${latMinutes.toFixed(3)}`;
                gcLon = `${lonDir}${lonDegrees}° ${lonMinutes.toFixed(3)}`;
            }
            
            // Afficher un message de succès pour le bouton "Ajouter WP"
                                this.showAddWaypointSuccess();
            
            // Vérifier si le formulaire est actuellement caché et l'afficher si nécessaire
            if (form && form.classList.contains('hidden') && formToggleButton) {
                formToggleButton.click();
            }
            
            // Remplir le formulaire avec les données calculées
            if (prefixInput) prefixInput.value = "FS"; // Formula Solver
            if (nameInput) nameInput.value = waypointName;
            if (gcLatInput && gcLat) gcLatInput.value = gcLat;
            if (gcLonInput && gcLon) gcLonInput.value = gcLon;
            if (noteInput) noteInput.value = notes;
            
            // Faire défiler jusqu'au formulaire pour que l'utilisateur puisse le voir
            if (form) {
                form.scrollIntoView({behavior: 'smooth', block: 'center'});
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

        /**
         * Crée automatiquement un waypoint avec les coordonnées calculées
         * @param {Object} pointData - Données optionnelles du point, pour les points multiples
         */
        createWaypointAuto(pointData = null) {
            // Récupérer les coordonnées (soit du point spécifique, soit de l'affichage général)
            let coordinates, gcLat, gcLon;
            
            if (pointData) {
                console.log("createWaypointAuto: Utilisation des coordonnées du point spécifique", pointData);
                
                if (pointData.coordinates) {
                    coordinates = pointData.coordinates;
                    
                    // Extraire les coordonnées au format N/E
                    const regex = /([NS][\s]*\d+°[\s]*\d+\.\d+)[\s]*([EW][\s]*\d+°[\s]*\d+\.\d+)/;
                    const match = coordinates.match(regex);
                    
                    if (match && match.length >= 3) {
                        gcLat = match[1].trim();
                        gcLon = match[2].trim();
                    }
                }
                else if (pointData.latitude && pointData.longitude) {
                    // Convertir les coordonnées décimales en format standard
                    const latDegrees = Math.floor(Math.abs(pointData.latitude));
                    const latMinutes = (Math.abs(pointData.latitude) - latDegrees) * 60;
                    const lonDegrees = Math.floor(Math.abs(pointData.longitude));
                    const lonMinutes = (Math.abs(pointData.longitude) - lonDegrees) * 60;
                    
                    const latDir = pointData.latitude >= 0 ? 'N' : 'S';
                    const lonDir = pointData.longitude >= 0 ? 'E' : 'W';
                    
                    gcLat = `${latDir}${latDegrees}° ${latMinutes.toFixed(3)}`;
                    gcLon = `${lonDir}${lonDegrees}° ${lonMinutes.toFixed(3)}`;
                    coordinates = `${gcLat} ${gcLon}`;
                }
            } else {
                coordinates = this.calculatedCoordinatesTextTarget.innerText.trim();
            }
            
            if (!coordinates) {
                console.error("Aucune coordonnée disponible");
                this.showCreateWaypointAutoError("Aucune coordonnée");
                return;
            }
            
            // Vérification améliorée pour les variables non résolues
            // On recherche un motif comme "AB" ou "XYZ" qui seraient des lettres non résolues
            // Mais on évite de détecter les directions "N", "S", "E", "W" comme des variables
            const containsVariables = /[A-Z]{2,}/.test(coordinates) && !/^([NS][\s]*\d+°[\s]*\d+\.\d+)[\s]*([EW][\s]*\d+°[\s]*\d+\.\d+)$/.test(coordinates.trim());
            
            if (containsVariables) {
                console.error("Les coordonnées contiennent des variables non résolues");
                this.showCreateWaypointAutoError("Variables non résolues");
                return;
            }
            
            // Récupérer l'ID de la géocache
            const geocacheId = this.geocacheIdValue;
            if (!geocacheId) {
                console.error("ID de géocache manquant");
                this.showCreateWaypointAutoError("ID géocache manquant");
                return;
            }
            
            // Si nous n'avons pas encore extrait les coordonnées, le faire maintenant
            if (!gcLat || !gcLon) {
            const regex = /([NS][\s]*\d+°[\s]*\d+\.\d+)[\s]*([EW][\s]*\d+°[\s]*\d+\.\d+)/;
                const match = coordinates.match(regex);
            
            if (!match || match.length < 3) {
                console.error("Format de coordonnées non reconnu");
                this.showCreateWaypointAutoError("Format de coordonnées non reconnu");
                return;
            }
            
                gcLat = match[1].trim();
                gcLon = match[2].trim();
            }
            
            // Générer un nom de waypoint par défaut basé sur la formule
            const formulaText = this.formulaInputTarget.value.trim();
            let waypointName = "Point calculé";
            
            if (pointData && pointData.index) {
                waypointName = `Point calculé ${pointData.index}`;
            } else if (formulaText) {
                // Utiliser les 20 premiers caractères de la formule pour le nom du waypoint
                waypointName = "Calc: " + (formulaText.length > 20 ? formulaText.substring(0, 20) + "..." : formulaText);
            }
            
            // Ajouter la distance si des coordonnées d'origine sont disponibles
            let note = `Point calculé automatiquement avec Formula Solver.\nFormule: ${formulaText}\nRésultat: ${coordinates}`;
            
            // Ajouter les informations de distance si disponibles dans pointData
            if (pointData && pointData.fullData && pointData.fullData.distance_from_origin) {
                const distance = pointData.fullData.distance_from_origin;
                note += `\nDistance: ${distance.meters} m (${distance.miles} miles)`;
            } 
            // Sinon vérifier si on a des éléments de distance dans l'interface
            else if (document.querySelector('#debug-origin-lat') && document.querySelector('#debug-origin-lon')) {
                const originLat = document.querySelector('#debug-origin-lat').textContent;
                const originLon = document.querySelector('#debug-origin-lon').textContent;
                
                if (originLat && originLon) {
                    // Si on a des données de distance, les ajouter à la note
                    const distanceElement = document.querySelector('[data-formula-solver-target="distanceInfo"]');
                    if (distanceElement && distanceElement.textContent) {
                        note += `\n${distanceElement.textContent}`;
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
            
            // Pour les points multiples, utiliser un message différent
            const buttonText = pointData ? `Création WP ${pointData.index || ''}...` : 'Création...';
            
            // Afficher l'indicateur de chargement
            if (pointData) {
                // Pour les points multiples, utiliser une notification simple
                this.showNotification('Création du waypoint en cours...', 'info');
            } else {
                // Pour les points uniques, mettre à jour le bouton
                this.showCreateWaypointAutoLoading(buttonText);
            }
            
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
                    
                    if (pointData) {
                        // Pour les points multiples, afficher une notification
                        this.showNotification(`Waypoint "${waypointName}" créé avec succès!`, 'success');
                    } else {
                        // Pour les points uniques, mettre à jour le bouton
                    this.showCreateWaypointAutoSuccess();
                    }
                    
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
                
                if (pointData) {
                    // Pour les points multiples, afficher une notification
                    this.showNotification(`Erreur lors de la création du waypoint: ${error.message}`, 'error');
                } else {
                    // Pour les points uniques, mettre à jour le bouton
                this.showCreateWaypointAutoError("Erreur API");
                }
            });
        }
        
        /**
         * Affiche une notification temporaire
         * @param {string} message - Le message à afficher
         * @param {string} type - Le type de notification ('success', 'error', 'info')
         */
        showNotification(message, type = 'info') {
            // Créer la notification
            const notification = document.createElement('div');
            
            // Déterminer la classe CSS en fonction du type
            let cssClass = 'fixed bottom-4 right-4 p-4 rounded shadow-lg text-white z-50 ';
            switch (type) {
                case 'success':
                    cssClass += 'bg-green-600';
                    break;
                case 'error':
                    cssClass += 'bg-red-600';
                    break;
                case 'info':
                default:
                    cssClass += 'bg-blue-600';
                    break;
            }
            
            notification.className = cssClass;
            notification.textContent = message;
            
            // Ajouter la notification au DOM
            document.body.appendChild(notification);
            
            // La faire disparaître après 3 secondes
            setTimeout(() => {
                notification.classList.add('opacity-0', 'transition-opacity', 'duration-500');
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 500);
            }, 3000);
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
        
        showCreateWaypointAutoLoading(buttonText) {
            // Changer temporairement le texte du bouton pour indiquer le chargement
            const originalButtonHTML = this.createWaypointAutoButtonTarget.innerHTML;
            this.createWaypointAutoButtonTarget.innerHTML = `
                <svg class="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span>${buttonText}</span>
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
        saveGeocacheCoordinates(pointData = null) {
            // Vérifier si on a un ID de géocache
            const geocacheId = this.geocacheIdValue;
            if (!geocacheId) {
                this.showSaveCoordinatesError("ID de géocache manquant");
                return;
            }
            
            // Variables pour stocker les coordonnées à envoyer
            let gcLat, gcLon;
            
            if (pointData) {
                console.log(`Utilisation des coordonnées du point ${pointData.index || ''}`);
                
                // Si le point a des coordonnées au format standard
                if (pointData.coordinates) {
                    const regex = /([NS][\s]*\d+°[\s]*\d+\.\d+)[\s]*([EW][\s]*\d+°[\s]*\d+\.\d+)/;
                    const match = pointData.coordinates.match(regex);
                    
                    if (match && match.length >= 3) {
                        gcLat = match[1].trim();
                        gcLon = match[2].trim();
                    }
                } 
                // Si le point a des coordonnées décimales, les convertir au format GC
                else if (pointData.latitude && pointData.longitude) {
                    console.log(`Conversion des coordonnées décimales: ${pointData.latitude}, ${pointData.longitude}`);
                    
                    // Calculer les degrés et minutes
                    const latDegrees = Math.floor(Math.abs(pointData.latitude));
                    const latMinutes = (Math.abs(pointData.latitude) - latDegrees) * 60;
                    const lonDegrees = Math.floor(Math.abs(pointData.longitude));
                    const lonMinutes = (Math.abs(pointData.longitude) - lonDegrees) * 60;
                    
                    // Formater les coordonnées au format standard GC
                    const latDir = pointData.latitude >= 0 ? 'N' : 'S';
                    const lonDir = pointData.longitude >= 0 ? 'E' : 'W';
                    
                    gcLat = `${latDir}${latDegrees}° ${latMinutes.toFixed(3)}`;
                    gcLon = `${lonDir}${lonDegrees}° ${lonMinutes.toFixed(3)}`;
                    
                    console.log(`Coordonnées converties: ${gcLat} ${gcLon}`);
                }
            }
            
            // Si nous n'avons pas obtenu de coordonnées du point, utiliser celles de l'interface
            if (!gcLat || !gcLon) {
                console.log('Utilisation des coordonnées de l\'interface');
            
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
                gcLat = match[1].trim();
                gcLon = match[2].trim();
            }
            
            // Vérification finale que nous avons bien des coordonnées à envoyer
            if (!gcLat || !gcLon) {
                this.showSaveCoordinatesError("Format de coordonnées non valide");
                return;
            }
            
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
                
                // Trouver tous les conteneurs de liste de waypoints dans tous les onglets ouverts
                const waypointsListContainers = document.querySelectorAll('[data-waypoint-form-target="waypointsList"]');
                
                if (waypointsListContainers.length === 0) {
                    console.warn("Aucun conteneur de liste de waypoints trouvé dans l'interface");
                    return;
                }
                
                console.log(`Trouvé ${waypointsListContainers.length} conteneur(s) de liste de waypoints`);
                
                // Récupérer la liste mise à jour des waypoints
                const listResponse = await fetch(`/api/geocaches/${geocacheId}/waypoints/list`);
                
                if (listResponse.ok) {
                    const listHtml = await listResponse.text();
                    
                    // Mettre à jour tous les conteneurs trouvés
                    waypointsListContainers.forEach((container, index) => {
                        container.innerHTML = listHtml;
                        console.log(`Liste des waypoints #${index+1} mise à jour avec succès`);
                    });
                    
                    // Déclencher un événement pour informer que les waypoints ont été mis à jour
                    document.dispatchEvent(new CustomEvent('waypointsListUpdated', {
                        detail: { geocacheId: geocacheId }
                    }));
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
                            waypointsListContainers.forEach((container, index) => {
                                container.innerHTML = newWaypointList.innerHTML;
                                console.log(`Liste des waypoints #${index+1} récupérée à partir des détails complets`);
                            });
                        }
                    }
                }
            } catch (error) {
                console.error("Erreur lors de la mise à jour de la liste des waypoints:", error);
            }
        }
        
        /**
         * Ouvre GeoCheck pour vérifier les coordonnées
         */
        openGeoCheck(event, pointData = null) {
            // Empêcher le comportement par défaut si c'est un événement
            if (event) {
            event.preventDefault();
            }
            
            // Récupérer le GC Code
            const gcCode = this.gcCodeValue;
            if (!gcCode) {
                alert('GC Code non disponible pour cette géocache.');
                return;
            }
            
            console.log(`Ouverture de GeoCheck pour le GC Code: ${gcCode}`);
            
            // Changer l'apparence du bouton pendant le chargement
            const button = event ? event.currentTarget : this.openGeoCheckButtonTarget;
            if (button) {
                button._originalHTML = button.innerHTML;
                button.innerHTML = `
                    <div class="flex items-center">
                        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Ouverture...</span>
                    </div>
                `;
                button.disabled = true;
            }
            
            // Récupérer l'URL du checker GeoCheck
            fetch(`/api/geocaches/${gcCode}/checker?type=geocheck`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erreur HTTP ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success && data.url) {
                        console.log(`URL GeoCheck récupérée: ${data.url}`);
                        
                        try {
                            // Ouvrir l'URL dans un nouvel onglet du navigateur
                            window.open(data.url, '_blank');
                            console.log("Ouverture réussie de GeoCheck dans un nouvel onglet du navigateur");
                            this.showOpenGeoCheckSuccess();
                        } catch (error) {
                            console.error("Erreur lors de l'ouverture de GeoCheck:", error);
                            this.showOpenGeoCheckError(error.message || "Impossible d'ouvrir GeoCheck");
                        }
                    } else {
                        console.error("URL du checker GeoCheck non disponible ou invalide");
                        this.showOpenGeoCheckError("URL du checker non disponible");
                    }
                })
                .catch(error => {
                    console.error(`Erreur lors de la récupération de l'URL du checker:`, error);
                    this.showOpenGeoCheckError(error.message || "Erreur lors de la récupération du checker");
                })
                .finally(() => {
                    // Restaurer le bouton
                    if (button && button._originalHTML) {
                        setTimeout(() => {
                            button.innerHTML = button._originalHTML;
                            button.disabled = false;
                        }, 1000);
                    }
                });
        }
        
        /**
         * Ouvre le checker Geocaching.com
         */
        openGeocachingChecker(event, pointData = null) {
            // Empêcher le comportement par défaut si c'est un événement
            if (event) {
                event.preventDefault();
            }
            
            // Récupérer le GC Code
            const gcCode = this.gcCodeValue;
            if (!gcCode) {
                alert('GC Code non disponible pour cette géocache.');
                                    return;
            }
            
            console.log(`Ouverture du checker Geocaching.com pour le GC Code: ${gcCode}`);
            
            // Changer l'apparence du bouton pendant le chargement
            const button = event ? event.currentTarget : this.openGeocachingCheckerButtonTarget;
            if (button) {
                button._originalHTML = button.innerHTML;
                button.innerHTML = `
                    <div class="flex items-center">
                        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Ouverture...</span>
                    </div>
                `;
                button.disabled = true;
            }
            
            try {
                // Construire l'URL de la géocache sur Geocaching.com
                const geocachingUrl = `https://www.geocaching.com/geocache/${gcCode}`;
                console.log("URL Geocaching.com construite:", geocachingUrl);
                
                // Ouvrir l'URL dans un nouvel onglet
                window.open(geocachingUrl, '_blank');
                console.log("Geocaching.com ouvert dans un nouvel onglet du navigateur");
                
                // Afficher un message de succès
                this.showOpenGeocachingCheckerSuccess();
            } catch (error) {
                console.error("Erreur lors de l'ouverture de Geocaching.com:", error);
                this.showOpenGeocachingCheckerError(error.message || "Impossible d'ouvrir Geocaching.com");
            } finally {
                // Restaurer le bouton
                if (button && button._originalHTML) {
                    setTimeout(() => {
                        button.innerHTML = button._originalHTML;
                        button.disabled = false;
                    }, 1000);
                }
            }
        }
        
        /**
         * Ouvre le checker Certitude
         */
        openCertitudeChecker(event, pointData = null) {
            // Empêcher le comportement par défaut si c'est un événement
            if (event) {
                event.preventDefault();
            }
            
            // Récupérer le GC Code
            const gcCode = this.gcCodeValue;
            if (!gcCode) {
                alert('GC Code non disponible pour cette géocache.');
                return;
            }
            
            console.log(`Ouverture du checker Certitude pour le GC Code: ${gcCode}`);
            
            // Changer l'apparence du bouton pendant le chargement
            const button = event ? event.currentTarget : this.openCertitudeCheckerButtonTarget;
            if (button) {
                button._originalHTML = button.innerHTML;
                button.innerHTML = `
                    <div class="flex items-center">
                        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Ouverture...</span>
                    </div>
                `;
                button.disabled = true;
            }
            
            // Construire l'URL pour Certitude directement à partir du GC Code
            const certitudeUrl = `https://www.certitudes.org/certitude?wp=${gcCode}`;
            console.log("URL Certitude construite:", certitudeUrl);
            
            try {
                // Ouvrir l'URL dans un nouvel onglet
                window.open(certitudeUrl, '_blank');
                console.log("Certitude ouvert dans un nouvel onglet du navigateur");
                
                // Afficher un message de succès
                this.showOpenCertitudeCheckerSuccess();
            } catch (error) {
                console.error("Erreur lors de l'ouverture de Certitude:", error);
                this.showOpenCertitudeCheckerError(error.message || "Impossible d'ouvrir Certitude");
            } finally {
            // Restaurer le bouton
            if (button && button._originalHTML) {
                setTimeout(() => {
                    button.innerHTML = button._originalHTML;
                    button.disabled = false;
                }, 1000);
                }
            }
        }
        
        /**
         * Affiche un message de succès après l'ouverture de GeoCheck
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

        /**
         * Affiche un message de succès après l'ouverture du checker Geocaching.com
         */
        showOpenGeocachingCheckerSuccess() {
            const container = this.element.querySelector('[data-formula-solver-target="calculatedCoordinates"]');
            if (!container) return;
            
            // Supprimer les messages existants
            const existingMessages = container.querySelectorAll('.geocaching-checker-message');
            existingMessages.forEach(el => el.remove());
            
            // Créer et ajouter le message de succès
            const successDiv = document.createElement('div');
            successDiv.className = 'mt-3 bg-green-700/30 border border-green-500 rounded p-3 text-sm text-green-200 geocaching-checker-message';
            successDiv.innerHTML = `
                <div class="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Geocaching.com ouvert dans un nouvel onglet pour vérification.</span>
                </div>
            `;
            
            container.appendChild(successDiv);
            
            // Auto-suppression après 5 secondes
            setTimeout(() => {
                successDiv.remove();
            }, 5000);
        }

        /**
         * Affiche un message d'erreur si l'ouverture du checker Geocaching.com échoue
         */
        showOpenGeocachingCheckerError(message) {
            const container = this.element.querySelector('[data-formula-solver-target="calculatedCoordinates"]');
            if (!container) return;
            
            // Supprimer les messages existants
            const existingMessages = container.querySelectorAll('.geocaching-checker-message');
            existingMessages.forEach(el => el.remove());
            
            // Créer et ajouter le message d'erreur
            const errorDiv = document.createElement('div');
            errorDiv.className = 'mt-3 bg-red-700/30 border border-red-500 rounded p-3 text-sm text-red-200 geocaching-checker-message';
            errorDiv.innerHTML = `
                <div class="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>${message || "Erreur lors de l'ouverture de Geocaching.com"}</span>
                </div>
            `;
            
            container.appendChild(errorDiv);
            
            // Auto-suppression après 5 secondes
            setTimeout(() => {
                errorDiv.remove();
            }, 5000);
        }

        /**
         * Affiche un message de succès après l'ouverture du checker Certitude
         */
        showOpenCertitudeCheckerSuccess() {
            const container = this.element.querySelector('[data-formula-solver-target="calculatedCoordinates"]');
            if (!container) return;
            
            // Supprimer les messages existants
            const existingMessages = container.querySelectorAll('.certitude-checker-message');
            existingMessages.forEach(el => el.remove());
            
            // Créer et ajouter le message de succès
            const successDiv = document.createElement('div');
            successDiv.className = 'mt-3 bg-green-700/30 border border-green-500 rounded p-3 text-sm text-green-200 certitude-checker-message';
            successDiv.innerHTML = `
                <div class="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Certitude ouvert dans un nouvel onglet pour vérification.</span>
                </div>
            `;
            
            container.appendChild(successDiv);
            
            // Auto-suppression après 5 secondes
            setTimeout(() => {
                successDiv.remove();
            }, 5000);
        }

        /**
         * Affiche un message d'erreur si l'ouverture du checker Certitude échoue
         */
        showOpenCertitudeCheckerError(message) {
            const container = this.element.querySelector('[data-formula-solver-target="calculatedCoordinates"]');
            if (!container) return;
            
            // Supprimer les messages existants
            const existingMessages = container.querySelectorAll('.certitude-checker-message');
            existingMessages.forEach(el => el.remove());
            
            // Créer et ajouter le message d'erreur
            const errorDiv = document.createElement('div');
            errorDiv.className = 'mt-3 bg-red-700/30 border border-red-500 rounded p-3 text-sm text-red-200 certitude-checker-message';
            errorDiv.innerHTML = `
                <div class="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>${message || "Erreur lors de l'ouverture de Certitude"}</span>
                </div>
            `;
            
            container.appendChild(errorDiv);
            
            // Auto-suppression après 5 secondes
            setTimeout(() => {
                errorDiv.remove();
            }, 5000);
        }

        // Générer toutes les combinaisons possibles de valeurs
        generateAllCombinations(variables) {
            const letters = Object.keys(variables);
            const allCombinations = [];
            
            // Fonction récursive pour générer toutes les combinaisons
            const generateCombinations = (currentIndex, currentCombination) => {
                // Si nous avons traité toutes les lettres, ajouter la combinaison actuelle
                if (currentIndex === letters.length) {
                    allCombinations.push({...currentCombination});
                    return;
                }
                
                const letter = letters[currentIndex];
                const values = variables[letter];
                
                // Si c'est un tableau, essayer chaque valeur
                if (Array.isArray(values)) {
                    for (const value of values) {
                        currentCombination[letter] = value;
                        generateCombinations(currentIndex + 1, currentCombination);
                    }
                } else {
                    // Sinon, utiliser la valeur unique
                    currentCombination[letter] = values;
                    generateCombinations(currentIndex + 1, currentCombination);
                }
            };
            
            generateCombinations(0, {});
            return allCombinations;
        }
        
        // Afficher plusieurs points sur la carte sans effacer les précédents
        displayMultiplePointsOnMap(points) {
            if (!points || points.length === 0) return;
            
            console.log(`Préparation à l'affichage de ${points.length} points sur la carte`);
            
            // Masquer les boutons d'action du point unique car on affiche des points multiples
            this.hideActionButtonsForSinglePoint();
            
            // Créer un ID unique pour ce groupe de points (basé sur un timestamp)
            const batchId = Date.now();
            
            // Mapper les points pour s'assurer qu'ils ont toutes les propriétés requises
            const formattedPoints = points.map((point, index) => ({
                latitude: point.latitude,
                longitude: point.longitude,
                label: point.label || `Option ${index+1}`,
                fillColor: point.fillColor || 'rgba(0, 90, 220, 0.7)',
                strokeColor: point.strokeColor || '#FF0000',
                strokeWidth: point.strokeWidth || 3,
                index: point.index || (index + 1),
                fullData: point.fullData || null,
                coordinates: point.coordinates || null
            }));
            
            // Créer un événement personnalisé avec tous les points
            const event = new CustomEvent('addMultipleCalculatedPointsToMap', {
                detail: {
                    points: formattedPoints,
                    batchId: batchId,
                    controller: this // Référence au contrôleur pour accéder aux méthodes
                }
            });
            
            // Dispatcher l'événement
            document.dispatchEvent(event);
            console.log(`Événement envoyé pour afficher ${points.length} points sur la carte (batchId: ${batchId})`);
            
            // Écouter les clics sur les points pour activer les boutons d'action
            document.addEventListener('calculatedPointClick', (event) => {
                const pointDetail = event.detail;
                if (pointDetail && pointDetail.index !== undefined) {
                    console.log(`Point ${pointDetail.index} cliqué sur la carte`);
                    
                    // Trouver le point correspondant
                    const clickedPoint = formattedPoints.find(p => p.index === pointDetail.index);
                    if (clickedPoint) {
                        console.log('Point trouvé dans la liste:', clickedPoint);
                        
                        // Créer une popup avec les boutons d'action
                        this.showPointActionButtons(clickedPoint);
                    }
                }
            });
            
            // Ne plus ajouter de bouton pour effacer les points multiples (fonctionnalité désactivée)
        }
        
        // Masquer les boutons d'action pour le point unique
        hideActionButtonsForSinglePoint() {
            // Récupérer le conteneur des boutons d'action du point unique
            const singlePointButtons = this.element.querySelector('[data-formula-solver-target="singlePointActionButtons"]');
            
            if (singlePointButtons) {
                // Masquer les boutons
                singlePointButtons.classList.add('hidden');
                console.log('Boutons d\'action pour le point unique masqués');
            }
        }
        
        // Afficher les boutons d'action pour le point unique
        showActionButtonsForSinglePoint() {
            // Récupérer le conteneur des boutons d'action du point unique
            const singlePointButtons = this.element.querySelector('[data-formula-solver-target="singlePointActionButtons"]');
            
            if (singlePointButtons) {
                // Afficher les boutons
                singlePointButtons.classList.remove('hidden');
                console.log('Boutons d\'action pour le point unique réaffichés');
            }
            
            // Supprimer la bannière des points multiples
            const banner = document.getElementById('multiple-points-banner');
            if (banner) {
                banner.remove();
            }
            
            // Supprimer le bouton de réinitialisation
            const resetButton = document.getElementById('reset-multiple-points-button');
            if (resetButton) {
                resetButton.remove();
            }
        }
        
        // Afficher une bannière qui explique que des points multiples sont affichés (désactivée)
        showMultiplePointsBanner(pointsCount) {
            // Fonction complètement supprimée à la demande de l'utilisateur
            // Ne fait rien et n'affiche pas de bannière
        }
        
        // Ajouter un bouton pour revenir à l'affichage d'un point unique
        addResetMultiplePointsButton() {
            // Fonction désactivée à la demande de l'utilisateur
            // Ne crée plus de bouton pour effacer les points multiples
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