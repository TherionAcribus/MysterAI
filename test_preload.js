const { contextBridge, ipcRenderer } = require('electron');

console.log('=== DEBUG: Test preload script chargé ===');

// Exposer les APIs de test
contextBridge.exposeInMainWorld('electronTest', {
    sendTestMessage: () => {
        console.log('=== DEBUG: Envoi du message de test ===');
        ipcRenderer.send('test-from-renderer', 'Message de test du renderer');
    }
});

// Écouter les messages du main process
ipcRenderer.on('test-from-main', (event, data) => {
    console.log('=== DEBUG: Message reçu du main process ===', data);
    document.getElementById('result').textContent = 'Message reçu: ' + data;
});
