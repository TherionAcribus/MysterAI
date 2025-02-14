const { contextBridge, ipcRenderer } = require('electron');

console.log('=== DEBUG: Preload script chargé ===');

// Exposer les fonctions nécessaires au renderer process
contextBridge.exposeInMainWorld('electron', {
    showImageContextMenu: (data, position) => {
        try {
            ipcRenderer.send('show-image-context-menu', { ...data, position });
            console.log('=== DEBUG: Événement IPC envoyé avec succès ===');
        } catch (error) {
            console.error('=== DEBUG: Erreur lors de l\'envoi de l\'événement IPC ===', error);
        }
    },
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
        if (channel === 'request-open-image-editor') {
            ipcRenderer.on(channel, (event, ...args) => {
                console.log('=== DEBUG: Événement reçu dans le bridge ===', channel, args);
                callback(...args);
            });
        } else {
            ipcRenderer.on(channel, (event, ...args) => callback(...args));
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

// Écouter les événements du menu contextuel
ipcRenderer.on('edit-image', (event, data) => {
    console.log('=== DEBUG: Événement edit-image reçu ===', data);
    const selectedImage = document.querySelector('.geocache-image.selected');
    if (selectedImage) {
        const imageId = selectedImage.dataset.imageId;
        const imageName = selectedImage.dataset.imageName || '';
        
        if (data.action === 'edit') {
            // Envoyer l'événement au renderer via le canal IPC
            console.log('=== DEBUG: Envoi de l\'événement au renderer ===', { imageId, imageName });
            ipcRenderer.send('request-open-image-editor', { imageId, imageName });
            
            // Émettre aussi l'événement localement pour le renderer
            window.postMessage({
                type: 'request-open-image-editor',
                data: { imageId, imageName }
            }, '*');
        } else if (data.action === 'copy') {
            // TODO: Implémenter la copie
            console.log('=== DEBUG: Copie de l\'image ===', imageId);
        }
    } else {
        console.error('=== DEBUG: Aucune image sélectionnée ===');
    }
});
