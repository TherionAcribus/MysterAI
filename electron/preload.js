const { contextBridge, ipcRenderer } = require('electron');

// Exposer les APIs sécurisées au renderer process
contextBridge.exposeInMainWorld('electron', {
    showImageContextMenu: (imageData) => {
        ipcRenderer.send('show-image-context-menu', imageData);
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
