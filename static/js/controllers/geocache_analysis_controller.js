// Geocache Analysis Controller
(() => {
    class GeocacheAnalysisController extends Stimulus.Controller {
        static targets = ["loading", "results", "error"]
        static values = {
            geocacheId: String,
            gcCode: String
        }

        connect() {
            console.log("Analysis controller connected", {
                geocacheId: this.geocacheIdValue,
                gcCode: this.gcCodeValue
            });
            console.log("Démarrage de l'analyse dans 1 seconde...");
            // Utilisons un setTimeout pour s'assurer que tout est bien initialisé
            setTimeout(() => this.analyze(), 1000);
            
            // Ajouter un gestionnaire pour réessayer l'analyse
            document.addEventListener('retryAnalysis', this.analyze.bind(this));
        }

        disconnect() {
            // Nettoyer les écouteurs d'événements
            document.removeEventListener('retryAnalysis', this.analyze.bind(this));
        }

        async analyze() {
            console.log("Méthode analyze() appelée");
            try {
                this.showLoading()
                console.log("Affichage du chargement");
                
                // Récupérer les valeurs et vérifier qu'elles sont valides
                const geocacheId = this.geocacheIdValue;
                const gcCode = this.gcCodeValue;
                
                console.log("Valeurs utilisées pour l'analyse:", { 
                    geocacheId, 
                    gcCode,
                    geocacheIdType: typeof geocacheId
                });
                
                if (!geocacheId) {
                    throw new Error("ID de géocache non disponible");
                }
                
                // Définir une valeur par défaut pour auto_correct
                this.autoCorrectEnabled = false;
                
                // Récupérer la configuration auto_correct_coordinates
                try {
                    await this.getAutoCorrectSetting();
                } catch (settingError) {
                    console.warn("Erreur lors de la récupération du paramètre, utilisation de la valeur par défaut:", settingError);
                }
                
                // Tester avec une autre approche - XMLHttpRequest au lieu de fetch
                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/api/plugins/analysis_web_page/execute');
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.setRequestHeader('Accept', 'application/json');
                xhr.onload = () => {
                    console.log("XHR onload, status:", xhr.status);
                    if (xhr.status === 200) {
                        console.log("Réponse XHR reçue:", xhr.responseText);
                        try {
                            const data = JSON.parse(xhr.responseText);
                            this.displayResults(data);
                        } catch (e) {
                            console.error("Erreur de parsing JSON:", e);
                            this.showError("Erreur de parsing JSON: " + e.message);
                        }
                    } else {
                        console.error("Erreur XHR:", xhr.status, xhr.responseText);
                        this.showError(`Erreur ${xhr.status}: ${xhr.responseText}`);
                    }
                };
                xhr.onerror = (e) => {
                    console.error("Erreur réseau XHR:", e);
                    this.showError("Erreur réseau: impossible de contacter le serveur");
                };
                
                const payload = JSON.stringify({
                    geocache_id: geocacheId,
                    _format: 'json'
                });
                console.log("Envoi XHR avec payload:", payload);
                xhr.send(payload);
            } catch (error) {
                console.error('Erreur complète:', error);
                this.showError(error.message);
            }
        }

        displayResults(data) {
            this.hideLoading()
            this.errorTarget.classList.add('hidden')
            this.resultsTarget.classList.remove('hidden')

            console.log("Données reçues:", data);

            // Créer le HTML pour les résultats
            let html = ''
            
            // Vérifier si nous avons des résultats combinés (format du plugin analysis_web_page)
            if (data.combined_results) {
                const combined = data.combined_results;
                
                // Vérifier s'il y a des coordonnées détectées
                let coordinates = [];
                
                // Vérifier les coordonnées du parser de formules
                if (combined.formula_parser && combined.formula_parser.coordinates && combined.formula_parser.coordinates.length > 0) {
                    console.log("Coordonnées trouvées dans formula_parser:", combined.formula_parser.coordinates);
                    combined.formula_parser.coordinates.forEach(coord => {
                        coordinates.push({
                            original_text: `${coord.north} ${coord.east}`,
                            lat: coord.north,
                            lng: coord.east
                        });
                    });
                }
                
                // Vérifier les coordonnées du détecteur de couleur
                if (combined.color_text_detector && combined.color_text_detector.coordinates && combined.color_text_detector.coordinates.exist) {
                    console.log("Coordonnées trouvées dans color_text_detector:", combined.color_text_detector.coordinates);
                    coordinates.push({
                        original_text: combined.color_text_detector.coordinates.ddm || "Coordonnées détectées dans un texte coloré",
                        lat: combined.color_text_detector.coordinates.ddm_lat,
                        lng: combined.color_text_detector.coordinates.ddm_lon
                    });
                }
                
                console.log("Toutes les coordonnées détectées:", coordinates);
                console.log("État de autoCorrectEnabled:", this.autoCorrectEnabled);
                
                // Sauvegarder automatiquement les premières coordonnées si auto_correct est activé
                if (this.autoCorrectEnabled && coordinates.length > 0) {
                    console.log("Auto-correction activée, sauvegarde automatique des coordonnées:", coordinates[0]);
                    
                    // Vérifier que les coordonnées sont bien au format attendu
                    if (coordinates[0].lat && coordinates[0].lng) {
                        try {
                            // Tenter de sauvegarder les coordonnées
                            this.saveCoordinatesData(coordinates[0].lat, coordinates[0].lng);
                        } catch (saveError) {
                            console.error("Erreur lors de la sauvegarde automatique des coordonnées:", saveError);
                        }
                    } else {
                        console.warn("Format des coordonnées invalide pour la sauvegarde automatique:", coordinates[0]);
                    }
                    
                    // Ajouter un message d'information
                    const autoSaveInfo = document.createElement('div');
                    autoSaveInfo.className = 'bg-blue-600 text-white px-4 py-2 rounded mb-4 text-sm';
                    autoSaveInfo.innerHTML = `
                        <div class="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Les coordonnées ont été automatiquement sauvegardées grâce à l'option <strong>auto_correct_coordinates</strong></span>
                        </div>
                    `;
                    setTimeout(() => {
                        const resultsContainer = this.resultsTarget;
                        resultsContainer.insertBefore(autoSaveInfo, resultsContainer.firstChild);
                    }, 500);
                }
                
                // Afficher les coordonnées si on en a trouvé
                if (coordinates.length > 0) {
                    html += `
                        <div class="bg-gray-800 rounded-lg p-4 mb-4">
                            <h2 class="text-lg font-semibold text-gray-100 mb-3">Coordonnées détectées</h2>
                            <div class="space-y-2">
                                ${coordinates.map(coord => `
                                    <div class="bg-gray-700 rounded p-3">
                                        <div class="flex justify-between items-start">
                                            <div>
                                                <div class="text-gray-200">${coord.original_text}</div>
                                                <div class="text-sm text-gray-400 mt-1">
                                                    ${coord.lat}, ${coord.lng}
                                                </div>
                                            </div>
                                            <button 
                                                class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline flex items-center"
                                                data-action="click->geocache-analysis#saveCoordinates"
                                                data-lat="${coord.lat}"
                                                data-lng="${coord.lng}">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                                </svg>
                                                Enregistrer
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `
                }
                
                // Regrouper les textes intéressants
                let interestingTexts = [];
                
                // Ajouter les textes du détecteur de couleur
                if (combined.color_text_detector && combined.color_text_detector.findings && combined.color_text_detector.findings.length > 0) {
                    combined.color_text_detector.findings.forEach(finding => {
                        if (finding.isInteresting) {
                            interestingTexts.push(`🎨 ${finding.content} (${finding.description})`);
                        }
                    });
                }
                
                // Ajouter les commentaires HTML
                if (combined.html_comments_finder && combined.html_comments_finder.findings && combined.html_comments_finder.findings.length > 0) {
                    combined.html_comments_finder.findings.forEach(comment => {
                        interestingTexts.push(`💬 ${comment}`);
                    });
                }
                
                // Ajouter les textes des images
                if (combined.image_alt_text_extractor && combined.image_alt_text_extractor.findings && combined.image_alt_text_extractor.findings.length > 0) {
                    combined.image_alt_text_extractor.findings.forEach(text => {
                        interestingTexts.push(`🖼️ ${text}`);
                    });
                }
                
                // Afficher les textes intéressants
                if (interestingTexts.length > 0) {
                    html += `
                        <div class="bg-gray-800 rounded-lg p-4">
                            <h2 class="text-lg font-semibold text-gray-100 mb-3">Textes intéressants</h2>
                            <div class="space-y-2">
                                ${interestingTexts.map(text => `
                                    <div class="bg-gray-700 rounded p-3">
                                        <div class="text-gray-200">${text}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `
                }
            } else {
                // Format standard
                // Coordonnées détectées
                if (data.coordinates && data.coordinates.length > 0) {
                    html += `
                        <div class="bg-gray-800 rounded-lg p-4 mb-4">
                            <h2 class="text-lg font-semibold text-gray-100 mb-3">Coordonnées détectées</h2>
                            <div class="space-y-2">
                                ${data.coordinates.map(coord => `
                                    <div class="bg-gray-700 rounded p-3">
                                        <div class="text-gray-200">${coord.original_text}</div>
                                        <div class="text-sm text-gray-400 mt-1">
                                            ${coord.lat}, ${coord.lng}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `
                }

                // Textes intéressants
                if (data.interesting_texts && data.interesting_texts.length > 0) {
                    html += `
                        <div class="bg-gray-800 rounded-lg p-4">
                            <h2 class="text-lg font-semibold text-gray-100 mb-3">Textes intéressants</h2>
                            <div class="space-y-2">
                                ${data.interesting_texts.map(text => `
                                    <div class="bg-gray-700 rounded p-3">
                                        <div class="text-gray-200">${text}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `
                }
            }

            // Afficher les résultats
            this.resultsTarget.innerHTML = html || `
                <div class="bg-gray-800 rounded-lg p-4">
                    <div class="text-gray-400">Aucun résultat intéressant trouvé dans l'analyse.</div>
                </div>
            `
        }

        showLoading() {
            this.loadingTarget.classList.remove('hidden')
            this.resultsTarget.classList.add('hidden')
            this.errorTarget.classList.add('hidden')
        }

        hideLoading() {
            this.loadingTarget.classList.add('hidden')
        }

        showError(errorMsg = '') {
            this.hideLoading()
            this.resultsTarget.classList.add('hidden')
            this.errorTarget.classList.remove('hidden')
            
            // Ajouter des détails d'erreur si disponibles
            const errorDetails = document.getElementById('error-details');
            if (errorDetails && errorMsg) {
                errorDetails.textContent = errorMsg;
            }
        }

        // Récupérer le paramètre auto_correct_coordinates
        async getAutoCorrectSetting() {
            try {
                console.log("Récupération du paramètre auto_correct_coordinates...");
                const response = await fetch('/api/settings/param/auto_correct_coordinates');
                console.log("Réponse du serveur pour auto_correct_coordinates:", {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries())
                });
                
                if (response.ok) {
                    const responseText = await response.text();
                    console.log("Texte de réponse brut:", responseText);
                    
                    try {
                        const data = JSON.parse(responseText);
                        console.log("Données JSON pour auto_correct_coordinates:", data);
                        
                        // Vérifier le format de la réponse
                        if (!data.hasOwnProperty('value') && data.hasOwnProperty('success') && data.success === true) {
                            // Format différent de ce qu'on attend
                            if (data.key === 'auto_correct_coordinates') {
                                this.autoCorrectEnabled = data.value === true || data.value === 'true';
                            } else {
                                console.warn("Le paramètre récupéré n'est pas le bon:", data.key);
                                this.autoCorrectEnabled = false;
                            }
                        } else {
                            this.autoCorrectEnabled = data.value === true || data.value === 'true';
                        }
                        
                        console.log("Auto-correction des coordonnées:", this.autoCorrectEnabled ? "activée" : "désactivée", "Type:", typeof this.autoCorrectEnabled);
                    } catch (parseError) {
                        console.error("Erreur de parsing de la réponse JSON:", parseError);
                        this.autoCorrectEnabled = false;
                    }
                } else {
                    console.log("Impossible de récupérer le paramètre auto_correct_coordinates, désactivation par défaut");
                    this.autoCorrectEnabled = false;
                }
            } catch (error) {
                console.error("Erreur lors de la récupération du paramètre auto_correct_coordinates:", error);
                this.autoCorrectEnabled = false;
                throw error; // Propager l'erreur pour que la fonction appelante puisse la gérer
            }
        }

        // Fonction pour sauvegarder des coordonnées à partir de données brutes
        saveCoordinatesData(lat, lng) {
            console.log("Sauvegarde des coordonnées:", { lat, lng });
            
            // Créer un FormData pour la requête
            const formData = new FormData();
            formData.append('gc_lat', lat);
            formData.append('gc_lon', lng);
            
            console.log("FormData créé:", {
                'gc_lat': formData.get('gc_lat'),
                'gc_lon': formData.get('gc_lon')
            });
            
            const url = `/geocaches/${this.geocacheIdValue}/coordinates`;
            console.log("URL pour la sauvegarde:", url);
            
            // Appeler l'API pour mettre à jour les coordonnées
            fetch(url, {
                method: 'PUT',
                body: formData,
                headers: {
                    'X-Layout-Component': 'true',
                    'Accept': 'text/html'
                }
            })
            .then(response => {
                console.log("Réponse de sauvegarde des coordonnées:", {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries())
                });
                
                if (response.ok) {
                    console.log("Coordonnées sauvegardées avec succès");
                    // Créer une notification de succès
                    const notif = document.createElement('div');
                    notif.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in-out';
                    notif.textContent = 'Coordonnées sauvegardées avec succès';
                    document.body.appendChild(notif);
                    
                    // Supprimer la notification après 3 secondes
                    setTimeout(() => {
                        notif.classList.add('animate-fade-out');
                        setTimeout(() => notif.remove(), 500);
                    }, 3000);
                    
                    // Déclencher un événement pour mettre à jour les coordonnées dans l'interface
                    document.dispatchEvent(new CustomEvent('coordinatesUpdated'));
                } else {
                    console.error("Erreur lors de la sauvegarde des coordonnées");
                    this.showError("Erreur lors de la sauvegarde des coordonnées");
                }
            })
            .catch(error => {
                console.error("Erreur lors de la sauvegarde des coordonnées:", error);
                this.showError("Erreur lors de la sauvegarde des coordonnées: " + error.message);
            });
        }

        // Fonction pour sauvegarder des coordonnées comme coordonnées corrigées
        saveCoordinates(event) {
            const coordData = event.currentTarget.dataset;
            const { lat, lng } = coordData;
            this.saveCoordinatesData(lat, lng);
        }
    }

    // Enregistrer le contrôleur dans l'application Stimulus
    try {
        // Essayer avec les deux façons d'enregistrer un contrôleur dans votre application
        if (window.application) {
            window.application.register('geocache-analysis', GeocacheAnalysisController);
            console.log("GeocacheAnalysisController enregistré avec window.application");
        } else if (window.StimulusApp) {
            window.StimulusApp.register('geocache-analysis', GeocacheAnalysisController);
            console.log("GeocacheAnalysisController enregistré avec window.StimulusApp");
        } else {
            console.error("Aucune application Stimulus trouvée pour enregistrer le contrôleur");
        }
    } catch (error) {
        console.error("Erreur lors de l'enregistrement du contrôleur GeocacheAnalysisController:", error);
    }
})();
