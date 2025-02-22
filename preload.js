const { contextBridge, ipcRenderer } = require('electron');

console.log('=== DEBUG: Preload script chargé ===');

// Exposer les fonctions nécessaires au renderer process
contextBridge.exposeInMainWorld('electron', {
    openImageEditor: (imageId, imageName) => {
        try {
            ipcRenderer.send('request-open-image-editor', { imageId, imageName });
            console.log('=== DEBUG: Demande d\'ouverture de l\'éditeur envoyée ===', { imageId, imageName });
        } catch (error) {
            console.error('=== DEBUG: Erreur lors de l\'envoi de la demande ===', error);
        }
    },
    // Gestionnaires d'événements IPC
    on: (channel, callback) => {
        if (channel === 'open-image-editor') {
            ipcRenderer.on(channel, (event, ...args) => {
                console.log('=== DEBUG: Événement reçu dans le bridge ===', channel, args);
                callback(...args);
            });
        }
    },
    once: (channel, callback) => {
        ipcRenderer.once(channel, (event, ...args) => callback(...args));
    },
    removeListener: (channel, callback) => {
        ipcRenderer.removeListener(channel, callback);
    },
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});
