# Utilisation du Système de Configuration depuis le Front-end

Ce document explique comment interagir avec le système de configuration de MysteryAI depuis le code JavaScript du front-end.

## Routes API disponibles

Le système de configuration expose plusieurs routes API qui peuvent être utilisées depuis le front-end :

### Récupération des paramètres

#### Récupérer tous les paramètres d'une catégorie

```javascript
// Récupérer les paramètres généraux
async function getGeneralSettings() {
  try {
    const response = await fetch('/api/settings/general', {
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
      return data.settings;
    } else {
      console.error('Erreur lors de la récupération des paramètres:', data.error);
      return null;
    }
  } catch (error) {
    console.error('Erreur réseau:', error);
    return null;
  }
}

// Exemple d'utilisation
async function setupUI() {
  const settings = await getGeneralSettings();
  
  if (settings) {
    // Appliquer les paramètres à l'interface
    document.getElementById('auto-mark-solved').checked = settings.auto_mark_solved;
    document.getElementById('auto-correct-coordinates').checked = settings.auto_correct_coordinates;
    // ...
  }
}
```

#### Récupérer un paramètre spécifique

```javascript
async function getSpecificSetting(paramName) {
  try {
    const response = await fetch(`/api/settings/param/${paramName}`, {
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
      return data.value;
    } else {
      console.error(`Erreur lors de la récupération du paramètre ${paramName}:`, data.error);
      return null;
    }
  } catch (error) {
    console.error('Erreur réseau:', error);
    return null;
  }
}

// Exemple d'utilisation
async function checkTheme() {
  const theme = await getSpecificSetting('theme');
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
  }
}
```

### Sauvegarde des paramètres

#### Enregistrer des paramètres généraux

```javascript
async function saveGeneralSettings(settings) {
  try {
    const response = await fetch('/api/settings/general/save', {
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
      console.log('Paramètres enregistrés avec succès:', data.message);
      return true;
    } else {
      console.error('Erreur lors de l\'enregistrement des paramètres:', data.error);
      return false;
    }
  } catch (error) {
    console.error('Erreur réseau:', error);
    return false;
  }
}

// Exemple d'utilisation avec un formulaire
document.getElementById('settings-form').addEventListener('submit', async function(event) {
  event.preventDefault();
  
  const settings = {
    auto_mark_solved: document.getElementById('auto-mark-solved').checked,
    auto_correct_coordinates: document.getElementById('auto-correct-coordinates').checked,
    enable_auto_scoring: document.getElementById('enable-auto-scoring').checked,
    open_tabs_in_same_section: document.getElementById('open-tabs-in-same-section').checked
  };
  
  const success = await saveGeneralSettings(settings);
  
  if (success) {
    showNotification('Paramètres enregistrés avec succès!', 'success');
  } else {
    showNotification('Erreur lors de l\'enregistrement des paramètres.', 'error');
  }
});
```

## Intégration dans une classe JavaScript

Voici un exemple de classe JavaScript qui encapsule les interactions avec le système de configuration :

```javascript
class ConfigManager {
  constructor() {
    this.cache = {};
    this.cacheTimestamp = {};
    this.cacheDuration = 60000; // 1 minute en millisecondes
  }
  
  async getSettingsCategory(category) {
    // Vérifier si la catégorie est en cache et si le cache est encore valide
    const now = Date.now();
    if (this.cache[category] && 
        this.cacheTimestamp[category] && 
        (now - this.cacheTimestamp[category]) < this.cacheDuration) {
      console.log(`Paramètres ${category} récupérés du cache`);
      return this.cache[category];
    }
    
    // Sinon, récupérer depuis l'API
    try {
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
        
        return data.settings;
      } else {
        console.error(`Erreur lors de la récupération des paramètres ${category}:`, data.error);
        return null;
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
      return null;
    }
  }
  
  async getSetting(key, defaultValue = null) {
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
        return data.value;
      } else {
        console.error(`Erreur lors de la récupération du paramètre ${key}:`, data.error);
        return defaultValue;
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
      return defaultValue;
    }
  }
  
  async saveSettings(category, settings) {
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
        
        console.log('Paramètres enregistrés avec succès:', data.message);
        return true;
      } else {
        console.error(`Erreur lors de l'enregistrement des paramètres ${category}:`, data.error);
        return false;
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
      return false;
    }
  }
  
  clearCache() {
    this.cache = {};
    this.cacheTimestamp = {};
    console.log('Cache vidé');
  }
}

// Utilisation comme singleton
const configManager = new ConfigManager();
export default configManager;
```

## Exemple d'utilisation avec un composant Stimulus

Voici un exemple d'intégration avec un contrôleur Stimulus pour gérer un formulaire de paramètres :

```javascript
// settings_controller.js
import { Controller } from "stimulus";
import configManager from "../services/config_manager";

export default class extends Controller {
  static targets = ["form", "status"];
  
  async connect() {
    // Charger les paramètres au chargement du contrôleur
    await this.loadSettings();
  }
  
  async loadSettings() {
    // Récupérer les paramètres généraux
    const generalSettings = await configManager.getSettingsCategory("general");
    
    if (!generalSettings) {
      this.showStatus("Impossible de charger les paramètres", "error");
      return;
    }
    
    // Remplir le formulaire avec les valeurs récupérées
    const form = this.formTarget;
    
    for (const [key, value] of Object.entries(generalSettings)) {
      const element = form.elements[key];
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = value;
        } else {
          element.value = value;
        }
      }
    }
    
    this.showStatus("Paramètres chargés", "success", 2000);
  }
  
  async saveSettings(event) {
    event.preventDefault();
    
    const form = this.formTarget;
    const formData = new FormData(form);
    const settings = {};
    
    // Convertir les données du formulaire en objet
    for (const [key, value] of formData.entries()) {
      const element = form.elements[key];
      
      if (element.type === 'checkbox') {
        settings[key] = element.checked;
      } else if (element.type === 'number') {
        settings[key] = Number(value);
      } else {
        settings[key] = value;
      }
    }
    
    // Sauvegarder les paramètres
    const success = await configManager.saveSettings("general", settings);
    
    if (success) {
      this.showStatus("Paramètres enregistrés avec succès", "success");
    } else {
      this.showStatus("Erreur lors de l'enregistrement des paramètres", "error");
    }
  }
  
  showStatus(message, type, duration = 3000) {
    const statusElement = this.statusTarget;
    statusElement.textContent = message;
    statusElement.className = `status status-${type}`;
    statusElement.style.display = "block";
    
    if (duration > 0) {
      setTimeout(() => {
        statusElement.style.display = "none";
      }, duration);
    }
  }
}
```

## Intégration avec le HTML

```html
<div data-controller="settings">
  <h2>Paramètres Généraux</h2>
  
  <div data-target="settings.status" class="status" style="display: none;"></div>
  
  <form data-target="settings.form" data-action="submit->settings#saveSettings">
    <div class="form-group">
      <label for="auto-mark-solved">
        <input type="checkbox" id="auto-mark-solved" name="auto_mark_solved">
        Marquer automatiquement comme résolu lors de la correction des coordonnées
      </label>
    </div>
    
    <div class="form-group">
      <label for="auto-correct-coordinates">
        <input type="checkbox" id="auto-correct-coordinates" name="auto_correct_coordinates">
        Corriger automatiquement les coordonnées quand une solution valide est trouvée
      </label>
    </div>
    
    <div class="form-group">
      <label for="enable-auto-scoring">
        <input type="checkbox" id="enable-auto-scoring" name="enable_auto_scoring">
        Activer le scoring automatique des solutions
      </label>
    </div>
    
    <div class="form-group">
      <label for="open-tabs-in-same-section">
        <input type="checkbox" id="open-tabs-in-same-section" name="open_tabs_in_same_section">
        Ouvrir les nouveaux onglets dans la même section
      </label>
    </div>
    
    <button type="submit" class="btn btn-primary">Enregistrer</button>
  </form>
</div>
```

## Conclusion

Cette documentation montre comment interagir avec le système de configuration depuis le front-end de l'application. En utilisant les routes API fournies et en implémentant une gestion de cache côté client, vous pouvez créer une interface utilisateur réactive pour gérer les paramètres de l'application. 