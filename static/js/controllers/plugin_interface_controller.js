// Controller Stimulus pour l'interface du plugin
import { Controller } from "@hotwired/stimulus"

/**
 * PluginInterfaceController - Gère l'interface des plugins
 */
class PluginInterfaceController extends Controller {
    static targets = [
        "form", 
        "output", 
        "geocacheSelect", 
        "gcCodeInput", 
        "associatedGeocacheInfo", 
        "associatedGeocacheName", 
        "associatedGeocacheCode",
        "originalCoordinatesValue",
        "geocacheAssociation"
    ]
    
    static values = { id: String }
    
    initialize() {
        // Initialisation
        this.pluginName = this.element.querySelector('h1.text-2xl.font-bold.text-blue-400')?.textContent.trim();
        this.clearOutput();
        this.hideSpinner();
        
        if (this.pluginName) {
            console.log(`Contrôleur initialisé pour le plugin [${this.pluginName}]`);
            
            // Supprimer explicitement toute association de géocache au démarrage
            sessionStorage.removeItem(`plugin_${this.pluginName}_geocache`);
            console.log(`Association de géocache supprimée pour ${this.pluginName} (initialisation)`);
        } else {
            console.log("Contrôleur initialisé (plugin inconnu)");
        }
        
        // Nettoyer les associations obsolètes
        this.clearCachedAssociations();
        
        // Le chargement des associations est désormais inutile puisqu'on les supprime à l'initialisation
        // Mais on garde la méthode au cas où elle serait appelée d'ailleurs
        // this.loadGeocacheAssociation();
    }
    
    connect() {
        console.log("Plugin interface controller connected", this.element)
        // Si un ID de géocache est présent, exécuter automatiquement
        if (this.hasIdValue && this.idValue !== 'default') {
            this.execute()
        }

        // Charger la liste des géocaches ouvertes
        this.loadOpenGeocaches()
        
        // Gestionnaire d'événement pour beforeunload
        this.beforeUnloadHandler = this.handleBeforeUnload.bind(this)
        window.addEventListener('beforeunload', this.beforeUnloadHandler)
    }
    
    disconnect() {
        console.log('Plugin interface controller disconnected');
        
        // Supprimer l'association géocache
        if (this.associatedGeocache) {
            const pluginName = this.element.querySelector('h1.text-2xl.font-bold.text-blue-400')?.textContent.trim();
            if (pluginName) {
                sessionStorage.removeItem(`plugin_${pluginName}_geocache`);
                console.log(`Association de géocache supprimée pour ${pluginName}`);
            }
            this.associatedGeocache = null;
        }
        
        // Supprimer le gestionnaire d'événement beforeunload
        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    }
    
    handleBeforeUnload() {
        // Supprimer l'association de géocache lors de la fermeture de la page
        if (this.associatedGeocache) {
            const pluginName = this.element.querySelector('h1.text-2xl.font-bold.text-blue-400')?.textContent.trim();
            if (pluginName) {
                sessionStorage.removeItem(`plugin_${pluginName}_geocache`);
                console.log(`Association de géocache supprimée pour ${pluginName} (beforeunload)`);
            }
        }
    }
    
    // Méthode pour charger la liste des géocaches ouvertes
    loadOpenGeocaches() {
        console.log("Chargement des géocaches ouvertes");
        
        if (!this.hasGeocacheSelectTarget) return;
        
        // Vider le sélecteur
        this.geocacheSelectTarget.innerHTML = '<option value="">Sélectionner une géocache...</option>';
        
        // Récupérer les géocaches ouvertes via le gestionnaire d'état de layout
        try {
            if (window.layoutStateManager) {
                const openGeocaches = window.layoutStateManager.getComponentsByType('geocache-details');
                console.log(`${openGeocaches.length} géocaches ouvertes trouvées`);
                console.log("Structure complète des géocaches:", JSON.stringify(openGeocaches));
                
                // Ajouter chaque géocache au sélecteur
                openGeocaches.forEach(gc => {
                    if (!gc.metadata) {
                        console.warn("Métadonnées manquantes pour la géocache:", gc);
                        return; // Ignorer cette géocache
                    }
                    
                    const option = document.createElement('option');
                    option.value = gc.id;
                    
                    // Rechercher le code GC dans les métadonnées (différentes structures possibles)
                    const gcCode = gc.metadata.gcCode || gc.metadata.code || '';
                    const name = gc.metadata.name || gc.id || 'Géocache sans nom';
                    
                    option.textContent = `${name} ${gcCode ? `(${gcCode})` : ''}`;
                    option.dataset.name = name;
                    option.dataset.gcCode = gcCode;
                    option.dataset.databaseId = gc.metadata.databaseId || '';
                    
                    this.geocacheSelectTarget.appendChild(option);
                });
            } else {
                console.warn("layoutStateManager non disponible");
            }
        } catch (error) {
            console.error("Erreur lors du chargement des géocaches ouvertes:", error);
        }
    }
    
    // Méthode appelée lorsqu'une géocache est sélectionnée dans le dropdown
    selectGeocache(event) {
        const selectedOption = event.target.options[event.target.selectedIndex];
        const selectedId = event.target.value;
        
        if (!selectedId || !selectedOption) {
            console.warn("Aucune géocache valide sélectionnée");
            return;
        }
        
        // Récupérer les données depuis les dataset de l'option
        const geocacheName = selectedOption.dataset.name;
        const gcCode = selectedOption.dataset.gcCode;
        const databaseId = selectedOption.dataset.databaseId;
        
        console.log(`Géocache sélectionnée: ${selectedId}`);
        console.log("Données de la géocache:", {
            name: geocacheName,
            code: gcCode,
            databaseId: databaseId
        });
        
        if (!gcCode) {
            console.error("Code GC manquant pour la géocache sélectionnée");
            this.showErrorMessage("Cette géocache n'a pas de code GC valide");
            return;
        }
        
        // Associer la géocache
        this.associateGeocache({
            id: selectedId,
            name: geocacheName,
            code: gcCode,
            databaseId: databaseId || null
        });
    }
    
    // Méthode pour associer une géocache à partir du code GC
    associateGcCode(event) {
        event.preventDefault();
        const gcCode = this.gcCodeInputTarget.value.trim().toUpperCase();
        
        if (!gcCode) {
            this.showErrorMessage("Veuillez saisir un code GC");
            return;
        }
        
        console.log(`Tentative d'association avec le code GC: ${gcCode}`);
        
        // Rechercher parmi les géocaches ouvertes
        try {
            if (window.layoutStateManager) {
                const openGeocaches = window.layoutStateManager.getComponentsByType('geocache-details');
                console.log("Recherche parmi les géocaches ouvertes:", openGeocaches);
                
                // Chercher le code GC dans les métadonnées des géocaches
                const existingGeocache = openGeocaches.find(gc => 
                    gc.metadata && (
                        (gc.metadata.gcCode && gc.metadata.gcCode.toUpperCase() === gcCode) || 
                        (gc.metadata.code && gc.metadata.code.toUpperCase() === gcCode)
                    )
                );
                
                if (existingGeocache) {
                    console.log("Géocache trouvée parmi les onglets ouverts:", existingGeocache);
                    
                    // La géocache est déjà ouverte, on l'associe directement
                    this.associateGeocache({
                        id: existingGeocache.id,
                        name: existingGeocache.metadata.name || "Sans nom",
                        code: gcCode, // Utiliser le code fourni pour garantir sa présence
                        databaseId: existingGeocache.metadata.databaseId || null
                    });
                    
                    // Mettre à jour le sélecteur si disponible
                    if (this.hasGeocacheSelectTarget) {
                        this.geocacheSelectTarget.value = existingGeocache.id;
                    }
                } else {
                    console.log("Géocache non trouvée parmi les onglets ouverts, requête API nécessaire");
                    
                    // La géocache n'est pas ouverte, il faut faire une requête API
                    fetch(`/api/geocaches/by-code/${gcCode}`)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`Géocache non trouvée: ${gcCode}`);
                            }
                            return response.json();
                        })
                        .then(data => {
                            console.log("Données de géocache récupérées:", data);
                            
                            this.associateGeocache({
                                id: null, // Pas d'ID car non ouverte
                                name: data.name || gcCode,
                                code: gcCode, // Utiliser le code fourni
                                databaseId: data.id || null
                            });
                        })
                        .catch(error => {
                            console.error("Erreur lors de la récupération de la géocache:", error);
                            this.showErrorMessage(`Erreur: ${error.message}`);
                        });
                }
            } else {
                console.warn("layoutStateManager non disponible");
                this.showErrorMessage("Impossible de vérifier les géocaches ouvertes");
            }
        } catch (error) {
            console.error("Erreur lors de l'association de la géocache:", error);
            this.showErrorMessage(`Erreur: ${error.message}`);
        }
        
        // Vider le champ de saisie
        this.gcCodeInputTarget.value = '';
    }
    
    // Méthode commune pour associer une géocache
    associateGeocache(geocache) {
        console.log("Association de la géocache:", geocache);
        
        // Vérifier que nous avons un code GC valide
        if (!geocache || !geocache.code) {
            console.error("Tentative d'association avec une géocache sans code GC:", geocache);
            this.showErrorMessage("La géocache n'a pas de code GC valide");
            return;
        }
        
        // Stocker la référence à la géocache
        this.associatedGeocache = {
            id: geocache.id || null,
            name: geocache.name || "Sans nom",
            code: geocache.code,
            databaseId: geocache.databaseId || null
        };
        
        // Mettre à jour l'affichage
        if (this.hasAssociatedGeocacheNameTarget && this.hasAssociatedGeocacheCodeTarget && this.hasAssociatedGeocacheInfoTarget) {
            this.associatedGeocacheNameTarget.textContent = this.associatedGeocache.name;
            this.associatedGeocacheCodeTarget.textContent = this.associatedGeocache.code;
            this.associatedGeocacheInfoTarget.classList.remove('hidden');
            
            // Mettre à jour le sélecteur si la géocache est ouverte
            if (this.associatedGeocache.id && this.hasGeocacheSelectTarget) {
                this.geocacheSelectTarget.value = this.associatedGeocache.id;
            }
        } else {
            console.error("Éléments d'interface manquants pour afficher l'association");
        }
        
        // Enregistrer l'association dans le sessionStorage
        this.saveGeocacheAssociation();
        
        // Charger les coordonnées d'origine
        this.loadAndDisplayOriginalCoordinates();
    }
    
    // Méthode pour sauvegarder l'association dans le sessionStorage
    saveGeocacheAssociation() {
        if (!this.associatedGeocache) {
            console.warn("Tentative de sauvegarde sans géocache associée");
            return;
        }
        
        // Vérifier que les propriétés nécessaires sont présentes
        if (!this.associatedGeocache.code) {
            console.error("Tentative de sauvegarde d'une géocache sans code GC:", this.associatedGeocache);
            return;
        }
        
        const pluginName = this.element.querySelector('h1.text-2xl.font-bold.text-blue-400')?.textContent.trim();
        if (!pluginName) {
            console.warn("Impossible de déterminer le nom du plugin pour sauvegarder l'association");
            return;
        }
        
        const storageKey = `plugin_${pluginName}_geocache`;
        
        // Préparer l'objet à sauvegarder
        const geocacheToSave = {
            id: this.associatedGeocache.id,
            name: this.associatedGeocache.name,
            code: this.associatedGeocache.code,
            databaseId: this.associatedGeocache.databaseId
        };
        
        // Sauvegarder dans le sessionStorage
        sessionStorage.setItem(storageKey, JSON.stringify(geocacheToSave));
        console.log(`Association sauvegardée pour ${pluginName} avec le code ${this.associatedGeocache.code}`);
    }
    
    // Méthode pour charger l'association depuis le sessionStorage
    loadGeocacheAssociation() {
        const pluginName = this.element.querySelector('h1.text-2xl.font-bold.text-blue-400')?.textContent.trim();
        if (!pluginName) {
            console.warn("Impossible de déterminer le nom du plugin pour charger l'association");
            return;
        }
        
        const storageKey = `plugin_${pluginName}_geocache`;
        console.log(`Tentative de chargement de l'association pour ${pluginName} depuis la clé ${storageKey}`);
        
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
            try {
                const geocache = JSON.parse(saved);
                console.log("Association de géocache trouvée dans sessionStorage:", geocache);
                
                // Vérifier que la géocache a les propriétés nécessaires
                if (!geocache.code) {
                    console.error("Association stockée invalide (code manquant):", geocache);
                    // Nettoyer cette entrée invalide
                    sessionStorage.removeItem(storageKey);
                    return;
                }
                
                // Associer la géocache
                this.associateGeocache({
                    id: geocache.id || null,
                    name: geocache.name || "Géocache sans nom",
                    code: geocache.code,
                    databaseId: geocache.databaseId || null
                });
                
                // Mettre à jour le sélecteur si la géocache est ouverte
                if (geocache.id && this.hasGeocacheSelectTarget) {
                    this.geocacheSelectTarget.value = geocache.id;
                }
            } catch (e) {
                console.error('Erreur lors du chargement de l\'association:', e);
                // En cas d'erreur, nettoyer l'entrée
                sessionStorage.removeItem(storageKey);
            }
        } else {
            console.log("Aucune association trouvée dans sessionStorage pour ce plugin");
        }
    }
    
    // Méthode pour charger et afficher les coordonnées d'origine
    loadAndDisplayOriginalCoordinates() {
        if (!this.associatedGeocache || !this.associatedGeocache.code) {
            console.error("Impossible de charger les coordonnées: code GC manquant");
            return;
        }
        
        if (!this.hasOriginalCoordinatesValueTarget) {
            console.warn("Élément pour afficher les coordonnées manquant");
            return;
        }
        
        // Afficher l'état de chargement
        this.originalCoordinatesValueTarget.textContent = "Chargement...";
        
        console.log(`Chargement des coordonnées pour ${this.associatedGeocache.code}`);
        
        // Requête API pour récupérer les coordonnées
        fetch(`/api/geocaches/by-code/${this.associatedGeocache.code}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error("Impossible de récupérer les coordonnées");
                }
                return response.json();
            })
            .then(data => {
                // Afficher les coordonnées
                const coordsStr = data.gc_lat && data.gc_lon ? 
                    `${data.gc_lat} ${data.gc_lon}` : 'Non disponibles';
                this.originalCoordinatesValueTarget.textContent = coordsStr;
                console.log(`Coordonnées chargées: ${coordsStr}`);
            })
            .catch(error => {
                console.error("Erreur lors du chargement des coordonnées:", error);
                this.originalCoordinatesValueTarget.textContent = "Erreur lors du chargement";
            });
    }
    
    // Méthode pour ouvrir les détails de la géocache
    openGeocacheDetails(event) {
        if (event) {
            event.preventDefault();
        }
        
        // Vérifier que nous avons une géocache associée
        if (!this.associatedGeocache || !this.associatedGeocache.code) {
            console.error("Aucune géocache associée à ouvrir");
            this.showErrorMessage("Veuillez d'abord associer une géocache");
            return;
        }
        
        // Si nous n'avons pas d'ID de base de données, le récupérer
        if (!this.associatedGeocache.databaseId) {
            fetch(`/api/geocaches/by-code/${this.associatedGeocache.code}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Impossible de récupérer les détails de la géocache`);
                    }
                    return response.json();
                })
                .then(data => {
                    this.associatedGeocache.databaseId = data.id;
                    this.saveGeocacheAssociation(); // Mettre à jour avec l'ID
                    this.openGeocacheTab();
                })
                .catch(error => {
                    this.showErrorMessage(`Erreur: ${error.message}`);
                });
        } else {
            // Ouvrir directement l'onglet
            this.openGeocacheTab();
        }
    }
    
    // Méthode pour ouvrir l'onglet de la géocache
    openGeocacheTab() {
        // Utiliser le système de messaging pour ouvrir l'onglet
        window.parent.postMessage({ 
            type: 'openGeocacheDetails',
            geocacheId: this.associatedGeocache.databaseId,
            gcCode: this.associatedGeocache.code,
            name: this.associatedGeocache.name || this.associatedGeocache.code
        }, '*');
    }
    
    // Méthode pour ajouter les coordonnées détectées comme waypoint via un formulaire
    addAsWaypoint(event) {
        console.log("=== Méthode addAsWaypoint appelée ===", event);
        
        if (!this.associatedGeocache || !this.associatedGeocache.code) {
            this.showErrorMessage("Vous devez d'abord associer une géocache");
            return;
        }
        
        // Récupérer les coordonnées des attributs data du bouton
        const button = event.currentTarget || event.target;
        const coordinates = {
            ddm: button.dataset.ddm,
            ddm_lat: button.dataset.lat,
            ddm_lon: button.dataset.lon
        };
        
        if (!coordinates.ddm) {
            this.showErrorMessage("Coordonnées manquantes");
            return;
        }
        
        console.log(`Ajout de waypoint: ${coordinates.ddm} pour la géocache ${this.associatedGeocache.code}`);
        
        // Trouver le panneau de détails de la géocache et le formulaire de waypoint
        let waypointForm = document.querySelector('[data-controller="waypoint-form"]');
        
        if (!waypointForm) {
            console.log("Panneau de détails de la géocache ou formulaire de waypoint non trouvé");
            
            // Ouvrir l'onglet de la géocache
            this.openGeocacheTab();
            
            // Stocker les coordonnées pour une utilisation ultérieure
            this.pendingCoordinates = coordinates;
            
            // Informer l'utilisateur
            setTimeout(() => {
                this.showSuccessMessage("L'onglet de la géocache est en cours d'ouverture. Veuillez réessayer d'ajouter le waypoint dans quelques secondes.");
            }, 500);
            
            return;
        }
        
        // Préparer les éléments du formulaire
        const prefixInput = waypointForm.querySelector('[data-waypoint-form-target="prefixInput"]');
        const nameInput = waypointForm.querySelector('[data-waypoint-form-target="nameInput"]');
        const gcLatInput = waypointForm.querySelector('[data-waypoint-form-target="gcLatInput"]');
        const gcLonInput = waypointForm.querySelector('[data-waypoint-form-target="gcLonInput"]');
        const noteInput = waypointForm.querySelector('[data-waypoint-form-target="noteInput"]');
        const formToggleButton = waypointForm.querySelector('[data-action="click->waypoint-form#toggleForm"]');
        const form = waypointForm.querySelector('[data-waypoint-form-target="form"]');
        
        // Générer un nom de waypoint par défaut
        const pluginName = this.element.querySelector('h1.text-2xl.font-bold.text-blue-400')?.textContent.trim() || 'Plugin';
        let waypointName = `${pluginName}: Point détecté`;
        
        // Préparer les notes avec les informations disponibles
        let notes = `Point détecté par le plugin "${pluginName}".\nCoordonnées: ${coordinates.ddm}`;
        
        // Vérifier si le formulaire est actuellement caché et l'afficher si nécessaire
        if (form && form.classList.contains('hidden') && formToggleButton) {
            formToggleButton.click();
        }
        
        // Remplir le formulaire
        if (prefixInput) prefixInput.value = "PL"; // Pour Plugin
        if (nameInput) nameInput.value = waypointName;
        if (gcLatInput) gcLatInput.value = coordinates.ddm_lat;
        if (gcLonInput) gcLonInput.value = coordinates.ddm_lon;
        if (noteInput) noteInput.value = notes;
        
        // Faire défiler jusqu'au formulaire pour que l'utilisateur puisse le voir
        if (form) {
            form.scrollIntoView({behavior: 'smooth', block: 'center'});
        }
        
        // Enregistrer cette géocache pour les utilisations futures
        window.lastAssociatedGeocache = this.associatedGeocache;
        
        this.showSuccessMessage("Formulaire de waypoint prérempli avec les coordonnées détectées");
    }
    
    // Méthode pour créer automatiquement un waypoint à partir des coordonnées détectées
    createWaypointAuto(event) {
        console.log("=== Méthode createWaypointAuto appelée ===");
        
        // Vérifier que nous avons une géocache associée
        if (!this.associatedGeocache || !this.associatedGeocache.code) {
            this.showErrorMessage("Vous devez d'abord associer une géocache");
            return;
        }
        
        // Récupérer les coordonnées du bouton
        const button = event.currentTarget || event.target;
        const coordinates = {
            ddm: button.dataset.ddm,
            ddm_lat: button.dataset.lat,
            ddm_lon: button.dataset.lon
        };
        
        if (!coordinates.ddm || !coordinates.ddm_lat || !coordinates.ddm_lon) {
            this.showErrorMessage("Coordonnées manquantes ou incomplètes");
            return;
        }
        
        // Vérifier si nous avons l'ID dans la base de données de la géocache
        if (!this.associatedGeocache.databaseId) {
            // Afficher un état de chargement
            button.disabled = true;
            button.classList.add('opacity-50');
            button.innerHTML = 'Chargement...';
            
            // Récupérer l'ID de la géocache
            fetch(`/api/geocaches/by-code/${this.associatedGeocache.code}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Impossible de récupérer les détails de la géocache`);
                    }
                    return response.json();
                })
                .then(data => {
                    // Mettre à jour l'ID de la géocache dans l'objet associé
                    this.associatedGeocache.databaseId = data.id;
                    this.saveGeocacheAssociation(); // Mettre à jour l'association avec le nouvel ID
                    
                    // Créer le waypoint maintenant que nous avons l'ID
                    this.createWaypointWithJSON(
                        coordinates.ddm_lat,
                        coordinates.ddm_lon,
                        coordinates.ddm,
                        button
                    );
                })
                .catch(error => {
                    console.error("Erreur lors de la récupération de l'ID de géocache:", error);
                    button.disabled = false;
                    button.classList.remove('opacity-50');
                    button.innerHTML = 'Créer WP auto';
                    this.showErrorMessage(`Erreur: ${error.message}`);
                });
        } else {
            // Nous avons déjà l'ID, créer directement le waypoint
            this.createWaypointWithJSON(
                coordinates.ddm_lat,
                coordinates.ddm_lon,
                coordinates.ddm,
                button
            );
        }
    }
    
    // Méthode interne pour créer un waypoint via l'API JSON
    createWaypointWithJSON(gcLat, gcLon, originalCoordinates, buttonElement) {
        // Afficher l'état de chargement sur le bouton
        if (buttonElement) {
            buttonElement.disabled = true;
            buttonElement.classList.add('opacity-50');
            buttonElement.innerHTML = 'Création...';
        }
        
        // Générer un nom pour le waypoint
        const pluginName = this.element.querySelector('h1.text-2xl.font-bold.text-blue-400')?.textContent.trim() || 'Plugin';
        const waypointName = `${pluginName}: Point détecté`;
        
        // Préparer la note avec les informations disponibles
        let note = `Point créé automatiquement à partir des coordonnées détectées dans le plugin "${pluginName}".\nCoordonnées: ${originalCoordinates}`;
        
        // Récupérer le texte décodé si disponible (pour référence)
        const decodedText = document.querySelector('.text-output-field')?.value;
        if (decodedText) {
            note += `\nTexte source: ${decodedText}`;
        }
        
        // S'assurer que nous avons un ID de géocache numérique valide
        if (!this.associatedGeocache || !this.associatedGeocache.databaseId) {
            console.error("ID de géocache manquant pour la création du waypoint");
            this.showErrorMessage("ID de géocache manquant. Veuillez associer une géocache.");
            
            // Rétablir le bouton
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.classList.remove('opacity-50');
                buttonElement.innerHTML = 'Créer WP auto';
            }
            
            return;
        }
        
        // Utiliser l'ID de la géocache
        const databaseId = this.associatedGeocache.databaseId;
        
        // Préparer les données du waypoint
        const waypointData = {
            name: waypointName,
            prefix: "PL", // Pour Plugin
            gc_lat: gcLat,
            gc_lon: gcLon,
            note: note,
            geocache_id: databaseId
        };
        
        console.log("Création du waypoint avec les données:", waypointData);
        
        // Vérifier si l'onglet de la géocache est ouvert
        const isGeocacheTabOpen = document.querySelector('[data-controller="waypoint-form"]') !== null;
        if (!isGeocacheTabOpen) {
            console.log("L'onglet de la géocache n'est pas ouvert. Ouverture de l'onglet...");
            
            try {
                // Stocker les coordonnées pour une utilisation ultérieure
                this.pendingWaypoint = {
                    gcLat: gcLat,
                    gcLon: gcLon,
                    originalCoordinates: originalCoordinates,
                    method: 'auto'
                };
                
                // Ouvrir l'onglet de la géocache
        window.parent.postMessage({
                    type: 'openGeocacheDetails',
                    geocacheId: databaseId,
                    gcCode: this.associatedGeocache.code,
                    name: this.associatedGeocache.name || this.associatedGeocache.code
        }, '*');
        
                // Informer l'utilisateur
                this.showSuccessMessage("L'onglet de la géocache est en cours d'ouverture. Veuillez réessayer dans quelques secondes.");
                
                // Rétablir le bouton
                if (buttonElement) {
                    buttonElement.disabled = false;
                    buttonElement.classList.remove('opacity-50');
                    buttonElement.innerHTML = 'Créer WP auto';
                }
                
                return;
            } catch (error) {
                console.error("Erreur lors de l'ouverture de l'onglet:", error);
            }
        }
        
        // Appeler l'API pour créer le waypoint
        fetch(`/api/geocaches/${databaseId}/waypoints`, {
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
            return response.json();
        })
        .then(data => {
            console.log("Waypoint créé avec succès:", data);
            
            // Afficher un message de succès
            this.showSuccessMessage("Waypoint créé avec succès");
            
            // Rétablir le bouton
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.classList.remove('opacity-50');
                buttonElement.innerHTML = 'Créer WP auto';
            }
            
            // Rafraîchir la liste des waypoints si l'onglet de la géocache est ouvert
            if (window.layoutStateManager) {
                const geocacheComponent = window.layoutStateManager.findComponentById(this.associatedGeocache.id);
                if (geocacheComponent && geocacheComponent.instance) {
                    // Si l'onglet de la géocache est ouvert et a une méthode de rafraîchissement des waypoints
                    if (typeof geocacheComponent.instance.refreshWaypoints === 'function') {
                        try {
                            geocacheComponent.instance.refreshWaypoints();
                            console.log("Liste des waypoints rafraîchie");
                        } catch (error) {
                            console.error("Erreur lors du rafraîchissement de la liste des waypoints:", error);
                        }
                    } else {
                        console.log("L'instance de la géocache n'a pas de méthode refreshWaypoints");
                    }
                }
            }
            
            // Émettre un événement pour informer d'autres composants
            const event = new CustomEvent('waypointCreated', {
                detail: {
                    geocacheId: databaseId,
                    waypoint: data
                },
                bubbles: true
            });
            document.dispatchEvent(event);
        })
        .catch(error => {
            console.error("Erreur lors de la création du waypoint:", error);
            
            // Afficher un message d'erreur
            this.showErrorMessage(`Erreur lors de la création du waypoint: ${error.message}`);
            
            // Rétablir le bouton
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.classList.remove('opacity-50');
                buttonElement.innerHTML = 'Créer WP auto';
            }
        });
    }
    
    // Méthode pour remplir le formulaire de waypoint avec les coordonnées extraites
    fillWaypointForm(gcLat, gcLon, originalCoordinates) {
        console.log("Remplissage du formulaire de waypoint:", { gcLat, gcLon, originalCoordinates });
        
        // Vérifier que nous avons un ID de géocache valide
        if (!this.associatedGeocache.databaseId) {
            console.error("ID de géocache non disponible pour le formulaire de waypoint");
            this.showErrorMessage("ID de géocache manquant");
            return;
        }
        
        // Trouver le panneau de détails de la géocache et le formulaire de waypoint
        let waypointForm = document.querySelector('[data-controller="waypoint-form"]');
        
        if (!waypointForm) {
            console.log("Panneau de détails de la géocache ou formulaire de waypoint non trouvé");
            
            try {
                // Ouvrir l'onglet de la géocache
                this.openGeocacheTab();
                
                // Stocker les coordonnées pour une utilisation ultérieure
                this.pendingCoordinates = {
                    gcLat: gcLat,
                    gcLon: gcLon,
                    originalCoordinates: originalCoordinates
                };
                
                // Informer l'utilisateur
                setTimeout(() => {
                    alert('L\'onglet des détails de la géocache est en cours d\'ouverture.\nVeuillez réessayer d\'ajouter le waypoint dans quelques secondes lorsque l\'onglet sera ouvert.');
                }, 500);
                
            } catch (error) {
                console.error("Erreur lors de l'ouverture de l'onglet de détails:", error);
                this.showErrorMessage("Erreur d'ouverture de l'onglet");
                alert('Impossible d\'ouvrir l\'onglet des détails de la géocache. Veuillez l\'ouvrir manuellement et réessayer.');
            }
            
            return;
        }
        
        // Préparer les éléments du formulaire
        const prefixInput = waypointForm.querySelector('[data-waypoint-form-target="prefixInput"]');
        const nameInput = waypointForm.querySelector('[data-waypoint-form-target="nameInput"]');
        const gcLatInput = waypointForm.querySelector('[data-waypoint-form-target="gcLatInput"]');
        const gcLonInput = waypointForm.querySelector('[data-waypoint-form-target="gcLonInput"]');
        const noteInput = waypointForm.querySelector('[data-waypoint-form-target="noteInput"]');
        
        // Générer un nom de waypoint par défaut
        const pluginName = this.element.querySelector('h1.text-2xl.font-bold.text-blue-400')?.textContent.trim() || 'Plugin';
        let waypointName = `${pluginName}: Point détecté`;
        
        // Préparer les notes avec les informations disponibles
        let notes = `Point détecté par le plugin "${pluginName}".\nCoordonnées: ${originalCoordinates}`;
        
        // Remplir le formulaire
        if (prefixInput) prefixInput.value = "PL"; // Pour Plugin
        if (nameInput) nameInput.value = waypointName;
        if (gcLatInput) gcLatInput.value = gcLat;
        if (gcLonInput) gcLonInput.value = gcLon;
        if (noteInput) noteInput.value = notes;
        
        // Afficher un message de confirmation
        this.showErrorMessage(`Le formulaire de waypoint a été prérempli avec les coordonnées détectées.`, "success");
    }
    
    // Méthode pour supprimer l'association avec la géocache
    removeGeocacheAssociation() {
        this.associatedGeocache = null;
        this.associatedGeocacheInfoTarget.classList.add('hidden');
        
        if (this.hasGeocacheSelectTarget) {
            this.geocacheSelectTarget.value = "";
        }
        
        // Réinitialiser l'affichage des coordonnées d'origine
        this.originalCoordinatesValueTarget.textContent = "";
        
        // Supprimer l'association du sessionStorage
        const pluginName = this.element.querySelector('h1.text-2xl.font-bold.text-blue-400')?.textContent.trim();
        if (pluginName) {
            sessionStorage.removeItem(`plugin_${pluginName}_geocache`);
        }
    }
    
    // Méthode pour afficher un message d'erreur
    showErrorMessage(message, type = "error") {
        // Créer un élément d'erreur s'il n'existe pas déjà
        let errorElement = document.getElementById('plugin-error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'plugin-error-message';
            errorElement.className = `bg-${type === "error" ? "red" : "green"}-600 text-white px-4 py-2 rounded-lg mb-4 flex items-center justify-between`;
            
            // Ajouter l'élément juste après la section d'association de géocache
            if (this.hasGeocacheAssociationTarget) {
                this.geocacheAssociationTarget.parentNode.insertBefore(errorElement, this.geocacheAssociationTarget.nextSibling);
            } else {
                // Fallback si la cible n'est pas disponible
                const formElement = this.hasFormTarget ? this.formTarget : this.element.querySelector('form');
                if (formElement) {
                    formElement.parentNode.insertBefore(errorElement, formElement);
                }
            }
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
        
        // Auto-supprimer après un délai
        setTimeout(() => {
            if (errorElement && errorElement.parentNode) {
                errorElement.remove();
            }
        }, 5000);
    }

    execute(event) {
        console.log("Executing plugin...")
        
        // Récupérer le formulaire et préparer les données
        const data = {}
        
        // Si on a un formulaire, récupérer ses données
        if (this.hasFormTarget) {
            const formData = new FormData(this.formTarget)
            
            // Convertir FormData en objet
            for (let [key, value] of formData.entries()) {
                data[key] = value
            }
            
            // Pour le mode, récupérer la valeur du select s'il existe
            const modeSelect = this.formTarget.querySelector('#mode')
            if (modeSelect) {
                data.mode = modeSelect.value
            }
            
            // Vérifier l'option brute_force s'il est présent
            const bruteForceCheckbox = this.formTarget.querySelector('#brute_force')
            if (bruteForceCheckbox) {
                data.brute_force = bruteForceCheckbox.checked
            }
            
            // Vérifier l'option enable_scoring s'il est présent
            const enableScoringCheckbox = this.formTarget.querySelector('#enable_scoring')
            if (enableScoringCheckbox) {
                data.enable_scoring = enableScoringCheckbox.checked
            }
        } else {
            // Si pas de formulaire, utiliser les paramètres passés au plugin
            data.geocache_id = this.idValue
        }
        
        // Montrer le chargement
        if (this.hasOutputTarget) {
            this.outputTarget.classList.remove('hidden')
            this.outputTarget.innerHTML = '<div class="flex items-center justify-center p-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>'
        }
        
        // Récupérer le nom du plugin depuis l'attribut data ou depuis le titre
        let pluginName = this.element.dataset.pluginName
        if (!pluginName) {
            const titleElement = this.element.querySelector('h1.text-2xl.font-bold.text-blue-400')
            if (titleElement) {
                pluginName = titleElement.textContent.trim()
            } else {
                console.error("Impossible de trouver le nom du plugin")
                return
            }
        }
        
        // Exécuter le plugin
        fetch(`/api/plugins/${pluginName}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok')
            }
            
            // Vérifier le type de contenu
            const contentType = response.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
                return response.json().then(data => ({
                    isJson: true,
                    content: data
                }))
            } else {
                return response.text().then(text => ({
                    isJson: false,
                    content: text
                }))
            }
        })
        .then(result => {
            if (!this.hasOutputTarget) return
            
            // Si c'est du HTML (ancien format)
            if (!result.isJson) {
                this.outputTarget.innerHTML = result.content
                return
            }
            
            // C'est du JSON, utiliser le contenu pour l'affichage formaté
            const data = result.content
            this.pluginResult = data // Sauvegarder le résultat pour l'édition
            
            // Nouveau format standardisé
            if (data.results && Array.isArray(data.results)) {
                this._renderStandardizedResults(data)
                return
            }
            
            // Gérer les formats de résultat variables des différents plugins (ancien format)
            let normalizedData = { ...data }
            
            // Gérer les formats de résultat variables des différents plugins
            if (data.result && data.result.text && data.result.text.text_output !== undefined) {
                normalizedData.text_output = data.result.text.text_output
            } else if (data.output !== undefined) {
                normalizedData.text_output = data.output
            }
            
            // Extraire le log s'il existe
            if (data.result && data.result.log !== undefined) {
                normalizedData.log = data.result.log
            } else if (data.original_result && data.original_result.result && data.original_result.result.log !== undefined) {
                normalizedData.log = data.original_result.result.log
            }
            
            // Toujours mettre normalizedData dans this.pluginResult
            this.pluginResult = normalizedData
            
            // Nouvelle façon d'afficher les résultats
            let outputHtml = '<div class="space-y-4">'
            
            // Afficher le texte output s'il existe
            if (normalizedData.text_output !== undefined) {
                outputHtml += `
                    <div class="bg-gray-700 rounded-lg p-4">
                        <h3 class="text-lg font-medium text-gray-300 mb-2">Résultat</h3>
                        <div class="bg-gray-800 p-4 rounded">
                            <textarea class="text-output-field w-full bg-gray-800 text-gray-300 border border-gray-700 focus:border-blue-500 p-2 rounded resize-y"
                            data-action="input->plugin-interface#updatePluginResult" data-key="text_output">${normalizedData.text_output || ''}</textarea>
                        </div>
                    </div>
                `
            } else if (normalizedData.output !== undefined) {
                // Compatibilité avec les plugins qui retournent "output" au lieu de "text_output"
                outputHtml += `
                    <div class="bg-gray-700 rounded-lg p-4">
                        <h3 class="text-lg font-medium text-gray-300 mb-2">Résultat</h3>
                        <div class="bg-gray-800 p-4 rounded">
                            <textarea class="text-output-field w-full bg-gray-800 text-gray-300 border border-gray-700 focus:border-blue-500 p-2 rounded resize-y"
                            data-action="input->plugin-interface#updatePluginResult" data-key="output">${normalizedData.output || ''}</textarea>
                        </div>
                    </div>
                `
                // Copier dans text_output pour uniformité
                normalizedData.text_output = normalizedData.output
                this.pluginResult.text_output = normalizedData.output
            }
            
            // Afficher le log s'il existe
            if (normalizedData.log) {
                outputHtml += `
                    <div class="bg-gray-700 rounded-lg p-4">
                        <h3 class="text-lg font-medium text-gray-300 mb-2">Détails de la projection</h3>
                        <div class="bg-gray-800 p-4 rounded">
                            <pre class="log-field w-full bg-gray-800 text-gray-300 font-mono text-sm whitespace-pre-wrap">${normalizedData.log || ''}</pre>
                        </div>
                    </div>
                `
            }
            
            // Afficher les coordonnées si elles existent
            if (normalizedData.coordinates) {
                const coords = normalizedData.coordinates
                const exists = coords.exist === true
                
                outputHtml += `
                    <div class="bg-gray-700 rounded-lg p-4">
                        <h3 class="text-lg font-medium text-gray-300 mb-2">Coordonnées détectées</h3>
                        
                        <div class="mb-3">
                            <label class="inline-flex items-center">
                                <input type="checkbox" class="coords-exist-checkbox form-checkbox h-5 w-5 text-blue-600" 
                                       ${exists ? 'checked' : ''}
                                       data-action="change->plugin-interface#updateCoordsExist">
                                <span class="ml-2 text-gray-300">Coordonnées présentes</span>
                            </label>
                        </div>
                        
                        <div class="bg-gray-800 p-4 rounded grid grid-cols-1 gap-4 ${exists ? '' : 'opacity-50'} coords-container">
                            <div>
                                <label for="coords-ddm" class="block text-sm font-medium text-gray-400 mb-1">Format DDM:</label>
                                <input type="text" class="coords-ddm w-full bg-gray-800 text-gray-300 border border-gray-700 focus:border-blue-500 p-2 rounded"
                                       value="${coords.ddm || ''}" ${exists ? '' : 'disabled'}
                                       data-action="input->plugin-interface#updatePluginResult"
                                       data-key="coordinates.ddm">
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label for="coords-lat" class="block text-sm font-medium text-gray-400 mb-1">Latitude:</label>
                                    <input type="text" class="coords-lat w-full bg-gray-800 text-gray-300 border border-gray-700 focus:border-blue-500 p-2 rounded"
                                           value="${coords.ddm_lat || ''}" ${exists ? '' : 'disabled'}
                                           data-action="input->plugin-interface#updatePluginResult"
                                           data-key="coordinates.ddm_lat">
                                </div>
                                <div>
                                    <label for="coords-lon" class="block text-sm font-medium text-gray-400 mb-1">Longitude:</label>
                                    <input type="text" class="coords-lon w-full bg-gray-800 text-gray-300 border border-gray-700 focus:border-blue-500 p-2 rounded"
                                           value="${coords.ddm_lon || ''}" ${exists ? '' : 'disabled'}
                                           data-action="input->plugin-interface#updatePluginResult"
                                           data-key="coordinates.ddm_lon">
                                </div>
                            </div>
                        </div>
                    </div>
                `
            }
            
            // Ajouter l'option pour afficher le format brut
            outputHtml += `
                <div class="mt-4">
                    <button data-action="plugin-interface#toggleRawOutput" class="text-sm text-blue-400 hover:text-blue-300">
                        Afficher le format brut
                    </button>
                    <div class="raw-output hidden mt-2 bg-gray-700 rounded-lg p-4">
                        <textarea class="raw-output-field w-full h-40 bg-gray-800 text-gray-300 border border-gray-700 focus:border-blue-500 p-2 rounded resize-y"
                                 data-action="input->plugin-interface#updateRawJson">${JSON.stringify(normalizedData, null, 2)}</textarea>
                    </div>
                </div>
            `
            
            // Ajouter le bouton pour copier la sortie
            outputHtml += `
                <div class="mt-4 flex justify-end">
                    <button data-action="plugin-interface#copyOutputToClipboard" class="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        Copier la sortie
                    </button>
                </div>
            `
            
            outputHtml += '</div>'
            this.outputTarget.innerHTML = outputHtml
        })
        .catch(error => {
            console.error('Error:', error)
            if (this.hasOutputTarget) {
                this.outputTarget.innerHTML = `<div class="bg-red-900 text-red-100 p-4 rounded-lg">Erreur: ${error.message}</div>`
            }
        })
    }

    // Rendu des résultats au format standardisé
    _renderStandardizedResults(data) {
        let resultsHtml = '<div class="space-y-4">'
        
        // Afficher d'abord le résumé s'il existe
        if (data.summary) {
            resultsHtml += `
            <div class="bg-gray-700 rounded-lg p-4 mb-4">
                <h3 class="text-lg font-medium text-blue-400 mb-2">Résumé</h3>
                <div class="bg-gray-800 p-4 rounded">
                    <p class="text-gray-300">${data.summary.message || `${data.summary.total_results} résultat(s)`}</p>
                    ${data.status === 'error' ? `<p class="text-red-400 mt-2">Erreur: ${data.summary.message || 'Une erreur est survenue'}</p>` : ''}
                    ${data.plugin_info ? `<p class="text-gray-400 text-sm mt-2">Temps d'exécution: ${data.plugin_info.execution_time || 0} ms</p>` : ''}
                </div>
            </div>
        `
        }
        
        // Afficher les résultats
        if (data.results && Array.isArray(data.results)) {
            resultsHtml += '<div class="space-y-4">'
            data.results.forEach((result, index) => {
                resultsHtml += `
                    <div class="bg-gray-700 rounded-lg p-4">
                        <h3 class="text-lg font-medium text-gray-300 mb-2">Résultat ${index + 1}</h3>
                        <div class="bg-gray-800 p-4 rounded">
                            <textarea class="text-output-field w-full bg-gray-800 text-gray-300 border border-gray-700 focus:border-blue-500 p-2 rounded resize-y"
                                      data-action="input->plugin-interface#updatePluginResult" data-key="results.${index}.text_output">${result.text_output || ''}</textarea>
                        </div>
                    </div>
                `
            })
            resultsHtml += '</div>'
        }
        
        // Afficher le log s'il existe
        if (data.log) {
            resultsHtml += `
                <div class="bg-gray-700 rounded-lg p-4">
                    <h3 class="text-lg font-medium text-gray-300 mb-2">Détails de la projection</h3>
                    <div class="bg-gray-800 p-4 rounded">
                        <pre class="log-field w-full bg-gray-800 text-gray-300 font-mono text-sm whitespace-pre-wrap">${data.log || ''}</pre>
                    </div>
                </div>
            `
        }
        
        // Afficher les coordonnées si elles existent
        if (data.coordinates) {
            const coords = data.coordinates
            const exists = coords.exist === true
            
            resultsHtml += `
                <div class="bg-gray-700 rounded-lg p-4">
                    <h3 class="text-lg font-medium text-gray-300 mb-2">Coordonnées détectées</h3>
                    
                    <div class="mb-3">
                        <label class="inline-flex items-center">
                            <input type="checkbox" class="coords-exist-checkbox form-checkbox h-5 w-5 text-blue-600" 
                                   ${exists ? 'checked' : ''}
                                   data-action="change->plugin-interface#updateCoordsExist">
                            <span class="ml-2 text-gray-300">Coordonnées présentes</span>
                        </label>
                    </div>
                    
                    <div class="bg-gray-800 p-4 rounded grid grid-cols-1 gap-4 ${exists ? '' : 'opacity-50'} coords-container">
                        <div>
                            <label for="coords-ddm" class="block text-sm font-medium text-gray-400 mb-1">Format DDM:</label>
                            <input type="text" class="coords-ddm w-full bg-gray-800 text-gray-300 border border-gray-700 focus:border-blue-500 p-2 rounded"
                                   value="${coords.ddm || ''}" ${exists ? '' : 'disabled'}
                                   data-action="input->plugin-interface#updatePluginResult"
                                   data-key="coordinates.ddm">
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label for="coords-lat" class="block text-sm font-medium text-gray-400 mb-1">Latitude:</label>
                                <input type="text" class="coords-lat w-full bg-gray-800 text-gray-300 border border-gray-700 focus:border-blue-500 p-2 rounded"
                                       value="${coords.ddm_lat || ''}" ${exists ? '' : 'disabled'}
                                       data-action="input->plugin-interface#updatePluginResult"
                                       data-key="coordinates.ddm_lat">
                            </div>
                            <div>
                                <label for="coords-lon" class="block text-sm font-medium text-gray-400 mb-1">Longitude:</label>
                                <input type="text" class="coords-lon w-full bg-gray-800 text-gray-300 border border-gray-700 focus:border-blue-500 p-2 rounded"
                                       value="${coords.ddm_lon || ''}" ${exists ? '' : 'disabled'}
                                       data-action="input->plugin-interface#updatePluginResult"
                                       data-key="coordinates.ddm_lon">
                            </div>
                        </div>
                    </div>
                </div>
            `
        }
        
        // Ajouter l'option pour afficher le format brut
        resultsHtml += `
            <div class="mt-4">
                <button data-action="plugin-interface#toggleRawOutput" class="text-sm text-blue-400 hover:text-blue-300">
                    Afficher le format brut
                </button>
                <div class="raw-output hidden mt-2 bg-gray-700 rounded-lg p-4">
                    <textarea class="raw-output-field w-full h-40 bg-gray-800 text-gray-300 border border-gray-700 focus:border-blue-500 p-2 rounded resize-y"
                             data-action="input->plugin-interface#updateRawJson">${JSON.stringify(data, null, 2)}</textarea>
                </div>
            </div>
        `
        
        // Ajouter le bouton pour copier la sortie
        resultsHtml += `
            <div class="mt-4 flex justify-end">
                <button data-action="plugin-interface#copyOutputToClipboard" class="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    Copier la sortie
                </button>
            </div>
        `
        
        resultsHtml += '</div>'
        this.outputTarget.innerHTML = resultsHtml
    }

    // Méthode pour créer un waypoint à partir des coordonnées détectées
    createWaypoint(coordinates) {
        if (!coordinates) {
            this.showErrorMessage("Coordonnées manquantes");
            return;
        }
        
        console.log(`Création d'un waypoint autonome avec les coordonnées: ${coordinates}`);
        
        // Utiliser le système de messaging pour créer un waypoint
        window.parent.postMessage({
            type: 'createStandaloneWaypoint',
            coordinates: coordinates
        }, '*');
        
        this.showSuccessMessage("Création du waypoint en cours...");
    }
    
    // Méthode pour afficher un point sur la carte
    addCalculatedPointToMap(latitude, longitude, label) {
        // Vérifier si nous avons une géocache associée
        if (!this.associatedGeocache || !this.associatedGeocache.code) {
            console.error("Impossible d'afficher le point sur la carte: pas de géocache associée");
            this.showErrorMessage("Vous devez d'abord associer une géocache pour afficher un point sur la carte");
            return;
        }

        console.log(`Préparation de l'ajout d'un point sur la carte: ${latitude}, ${longitude}`);
        
        // Si nous n'avons pas d'ID de base de données, le récupérer d'abord
        if (!this.associatedGeocache.databaseId) {
            console.log("Récupération de l'ID de base de données pour la géocache", this.associatedGeocache.code);
            
            // Afficher un message temporaire
            this.showSuccessMessage("Récupération des données de la géocache...");
            
            // Récupérer l'ID de la géocache à partir du code GC
            fetch(`/api/geocaches/by-code/${this.associatedGeocache.code}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Impossible de récupérer les détails de la géocache`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log("Données de géocache récupérées:", data);
                    
                    // Mettre à jour l'ID de la géocache dans l'objet associé
                    this.associatedGeocache.databaseId = data.id;
                    
                    // Sauvegarder cette mise à jour
                    this.saveGeocacheAssociation();
                    
                    // Maintenant que nous avons l'ID, afficher le point
                    this._displayCalculatedPoint(latitude, longitude, label);
                })
                .catch(error => {
                    console.error("Erreur lors de la récupération de l'ID de géocache:", error);
                    this.showErrorMessage(`Erreur: ${error.message}`);
                });
        } else {
            // Nous avons déjà l'ID, afficher directement le point
            this._displayCalculatedPoint(latitude, longitude, label);
        }
    }
    
    // Méthode interne pour envoyer l'événement d'ajout de point à la carte
    _displayCalculatedPoint(latitude, longitude, label) {
        console.log(`Ajout d'un point sur la carte: ${latitude}, ${longitude} (ID géocache: ${this.associatedGeocache.databaseId})`);

        // Créer l'événement pour ajouter le point à la carte
        const pointData = {
            latitude: latitude,
            longitude: longitude,
            geocacheId: this.associatedGeocache.databaseId,
            source: 'plugin',
            label: label || `Point détecté par ${this.pluginName || 'plugin'}`
        };

        const event = new CustomEvent('addCalculatedPointToMap', {
            detail: pointData,
            bubbles: true
        });

        // Déclencher l'événement
        window.dispatchEvent(event);
        
        // Ajouter un message de confirmation
        this.showSuccessMessage("Point affiché sur la carte");
    }
    
    // Fonction pour convertir les coordonnées DDM en décimales
    convertGCCoordsToDecimal(gcLat, gcLon) {
        try {
            // Extraire les composants pour la latitude
            const latMatch = gcLat.match(/([NS])\s*(\d+)°\s*(\d+\.\d+)['']/i);
            if (!latMatch) return null;
            
            const latDir = latMatch[1].toUpperCase();
            const latDeg = parseInt(latMatch[2], 10);
            const latMin = parseFloat(latMatch[3]);
            
            // Extraire les composants pour la longitude
            const lonMatch = gcLon.match(/([EW])\s*(\d+)°\s*(\d+\.\d+)['']/i);
            if (!lonMatch) return null;
            
            const lonDir = lonMatch[1].toUpperCase();
            const lonDeg = parseInt(lonMatch[2], 10);
            const lonMin = parseFloat(lonMatch[3]);
            
            // Calculer les coordonnées décimales
            let latitude = latDeg + (latMin / 60);
            if (latDir === 'S') latitude = -latitude;
            
            let longitude = lonDeg + (lonMin / 60);
            if (lonDir === 'W') longitude = -longitude;
            
            return { latitude, longitude };
        } catch (error) {
            console.error("Erreur lors de la conversion des coordonnées:", error);
            return null;
        }
    }
    
    // Méthode pour nettoyer les associations de géocache dans le sessionStorage
    clearCachedAssociations() {
        // Nettoyer uniquement les associations obsolètes (pas de code GC)
        if (this.pluginName) {
            const storageKey = `plugin_${this.pluginName}_geocache`;
            const saved = sessionStorage.getItem(storageKey);
            
            if (saved) {
                try {
                    const geocache = JSON.parse(saved);
                    if (!geocache.code) {
                        console.log(`Suppression de l'association invalide pour ${this.pluginName}`);
                        sessionStorage.removeItem(storageKey);
                        return true;
                    }
                } catch (error) {
                    console.error("Erreur lors du traitement de l'association:", error);
                    sessionStorage.removeItem(storageKey);
                    return true;
                }
            }
        }
        return false;
    }
}

// Fonction utilitaire pour obtenir la couleur en fonction de la confiance
function getConfidenceColor(confidence) {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
}