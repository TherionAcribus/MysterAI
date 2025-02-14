const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Log au démarrage
console.log('=== DEBUG: Application de test IPC démarrée ===');

function createWindow() {
    console.log('=== DEBUG: Création de la fenêtre de test ===');
    
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'test_preload.js')
        }
    });

    // Créer une page HTML simple
    win.loadFile('test.html');
    win.webContents.openDevTools();

    return win;
}

// Test IPC Main -> Renderer
ipcMain.on('test-from-renderer', (event, data) => {
    console.log('=== DEBUG: Message reçu du renderer ===', data);
    event.reply('test-from-main', 'Réponse du main process');
});

app.whenReady().then(() => {
    console.log('=== DEBUG: App prête, création de la fenêtre ===');
    createWindow();
});
