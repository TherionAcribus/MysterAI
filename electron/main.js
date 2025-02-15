const { app, BrowserWindow, ipcMain, contextBridge } = require('electron');
const path = require('path');
const { createImageContextMenu, createSymbolContextMenu } = require('./contextMenu');

let mainWindow;
let currentImageData = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadURL('http://localhost:5000');

    // Handle right-click on images
    ipcMain.on('show-image-context-menu', (event, imageData) => {
        currentImageData = imageData;
        const menu = createImageContextMenu(mainWindow);
        menu.popup(BrowserWindow.fromWebContents(event.sender));
    });

    // Handle right-click on symbols
    ipcMain.on('show-context-menu', (event, { type, data }) => {
        if (type === 'symbol') {
            const menu = createSymbolContextMenu(mainWindow, data);
            menu.popup(BrowserWindow.fromWebContents(event.sender));
        }
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
