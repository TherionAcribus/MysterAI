const { contextBridge, ipcRenderer } = require('electron');

// Exposer les APIs sécurisées au renderer process
contextBridge.exposeInMainWorld('electron', {
    showImageContextMenu: (imageData) => {
        ipcRenderer.send('show-image-context-menu', imageData);
    },
    showContextMenu: (type, data) => {
        ipcRenderer.send('show-context-menu', { type, data });
    },
    on: (channel, callback) => {
        ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
});

// Écouter les événements du menu contextuel
ipcRenderer.on('edit-image-requested', () => {
    // Récupérer l'image actuellement sélectionnée
    const selectedImage = document.querySelector('.geocache-image.selected');
    if (selectedImage) {
        const imageId = selectedImage.dataset.imageId;
        const imageName = selectedImage.dataset.imageName;
        window.openImageEditor(imageId, imageName);
    }
});
