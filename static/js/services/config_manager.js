/**
 * Service de gestion des configurations avec cache
 * Singleton pour gérer les paramètres côté client avec cache pour réduire les appels API
 */
class ConfigManager {
    constructor() {
        this.cache = {};
        this.cacheTimestamp = {};
        this.cacheDuration = 60000; // 1 minute en millisecondes par défaut
    }
    
    /**
     * Récupère tous les paramètres d'une catégorie
     * @param {string} category - La catégorie de paramètres (ex: 'general', 'formula', 'ai')
     * @param {number} maxAge - Durée max du cache en ms (0 pour forcer un rafraîchissement)
     * @returns {Promise<Object>} - Les paramètres de la catégorie
     */
    async getCategory(category, maxAge = this.cacheDuration) {
        console.log(`=== DEBUG: ConfigManager.getCategory('${category}') appelé ===`);
        
        // Vérifier si la catégorie est en cache et si le cache est encore valide
        const now = Date.now();
        if (this.cache[category] && 
            this.cacheTimestamp[category] && 
            maxAge > 0 &&
            (now - this.cacheTimestamp[category]) < maxAge) {
            console.log(`=== DEBUG: Paramètres '${category}' récupérés du cache (âge: ${now - this.cacheTimestamp[category]}ms) ===`);
            return this.cache[category];
        }
        
        // Sinon, récupérer depuis l'API
        try {
            console.log(`=== DEBUG: Chargement des paramètres '${category}' depuis l'API ===`);
            const response = await fetch(`/api/settings/${category}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Mettre en cache les données
                this.cache[category] = data.settings;
                this.cacheTimestamp[category] = now;
                
                console.log(`=== DEBUG: Paramètres '${category}' mis en cache ===`, data.settings);
                return data.settings;
            } else {
                console.error(`Erreur lors de la récupération des paramètres '${category}':`, data.error);
                return null;
            }
        } catch (error) {
            console.error(`Erreur réseau pour '${category}':`, error);
            return null;
        }
    }
    
    /**
     * Récupère un paramètre spécifique
     * @param {string} key - La clé du paramètre
     * @param {*} defaultValue - Valeur par défaut si le paramètre n'existe pas
     * @returns {Promise<*>} - La valeur du paramètre
     */
    async getValue(key, defaultValue = null) {
        console.log(`=== DEBUG: ConfigManager.getValue('${key}') appelé ===`);
        
        try {
            const response = await fetch(`/api/settings/param/${key}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                console.log(`=== DEBUG: Valeur récupérée pour '${key}': ===`, data.value);
                return data.value;
            } else {
                console.error(`Erreur lors de la récupération du paramètre '${key}':`, data.error);
                return defaultValue;
            }
        } catch (error) {
            console.error('Erreur réseau:', error);
            return defaultValue;
        }
    }
    
    /**
     * Sauvegarde les paramètres d'une catégorie
     * @param {string} category - La catégorie (ex: 'general', 'formula', 'ai')
     * @param {Object} settings - Les paramètres à sauvegarder
     * @returns {Promise<boolean>} - True si la sauvegarde a réussi
     */
    async saveCategory(category, settings) {
        console.log(`=== DEBUG: ConfigManager.saveCategory('${category}') appelé ===`, settings);
        
        try {
            const response = await fetch(`/api/settings/${category}/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Mettre à jour le cache
                this.cache[category] = { ...this.cache[category], ...settings };
                this.cacheTimestamp[category] = Date.now();
                
                console.log(`=== DEBUG: Paramètres '${category}' sauvegardés et mis à jour dans le cache ===`);
                return true;
            } else {
                console.error(`Erreur lors de la sauvegarde des paramètres '${category}':`, data.error);
                return false;
            }
        } catch (error) {
            console.error('Erreur réseau:', error);
            return false;
        }
    }
    
    /**
     * Vide tout le cache ou une catégorie spécifique
     * @param {string|null} category - Catégorie à vider (null pour tout vider)
     */
    clearCache(category = null) {
        if (category) {
            delete this.cache[category];
            delete this.cacheTimestamp[category];
            console.log(`=== DEBUG: Cache vidé pour la catégorie '${category}' ===`);
        } else {
            this.cache = {};
            this.cacheTimestamp = {};
            console.log('=== DEBUG: Cache entièrement vidé ===');
        }
    }
}

// Exporter l'instance singleton
const configManager = new ConfigManager();
export default configManager; 