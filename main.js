const { app, BrowserWindow, ipcMain, Menu, MenuItem, screen } = require('electron');
const express = require('express');
const path = require('path');
const proxy = require('express-http-proxy');

process.on('uncaughtException', (error) => {
    console.error('=== DEBUG: Uncaught Exception ===', error);
});

process.on('unhandledRejection', (error) => {
    console.error('=== DEBUG: Unhandled Rejection ===', error);
});

console.log('=== DEBUG: Main process démarré ===');

// Express app setup
const server = express();

// Log all requests for debugging
server.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Proxy all /api requests to Flask server
server.use('/api', proxy('http://127.0.0.1:3000', {
    proxyReqPathResolver: (req) => {
        console.log('Path original:', req.originalUrl);
        return req.originalUrl;
    },
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        proxyReqOpts.hostname = '127.0.0.1';
        proxyReqOpts.headers = {
            ...srcReq.headers,
            Host: 'localhost:3000'
        };
        return proxyReqOpts;
    }
}));

// Set proper MIME types for all static files
server.use(express.static(path.join(__dirname, 'static'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (filePath.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html');
        } else if (filePath.endsWith('.woff2')) {
            res.setHeader('Content-Type', 'font/woff2');
        } else if (filePath.endsWith('.ttf')) {
            res.setHeader('Content-Type', 'font/ttf');
        }
    }
}));

// Log the absolute paths we're using
console.log('Static directory:', path.join(__dirname, 'static'));

// Serve index.html from templates directory
server.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'templates', 'index.html');
    console.log('Trying to serve:', indexPath);
    if (!require('fs').existsSync(indexPath)) {
        console.error('File does not exist:', indexPath);
        res.status(404).send('index.html not found');
        return;
    }
    res.sendFile(indexPath);
});

// Start Express server
const expressApp = server.listen(8080, () => {
    console.log('Express server running on port 8080');
});

// Créer le menu contextuel pour les images
function createImageContextMenu(window) {
    return Menu.buildFromTemplate([
        {
            label: 'Éditer l\'image',
            click: () => {
                window.webContents.send('edit-image', {
                    action: 'edit'
                });
            }
        },
        { type: 'separator' },
        {
            label: 'Copier',
            click: () => {
                window.webContents.send('edit-image', {
                    action: 'copy'
                });
            }
        }
    ]);
}

// Gérer le clic droit sur les images
ipcMain.on('show-image-context-menu', (event, data) => {
    console.log('=== DEBUG: Événement show-image-context-menu reçu dans le main process ===', data);
    
    try {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (!window) {
            console.error('=== DEBUG: Fenêtre non trouvée ===');
            return;
        }
        console.log('=== DEBUG: Fenêtre trouvée ===');
        
        const menu = createImageContextMenu(window);
        if (!menu) {
            console.error('=== DEBUG: Menu non créé ===');
            return;
        }
        
        try {
            // Obtenir la position de la fenêtre et du clic
            const bounds = window.getBounds();
            const displays = screen.getAllDisplays();
            const currentDisplay = screen.getDisplayNearestPoint({
                x: bounds.x + bounds.width / 2,
                y: bounds.y + bounds.height / 2
            });

            // Calculer les coordonnées relatives à la fenêtre
            const clickX = data.position.x;
            const clickY = data.position.y;

            console.log('=== DEBUG: Informations ===', {
                window: bounds,
                click: { x: clickX, y: clickY },
                display: {
                    bounds: currentDisplay.bounds,
                    workArea: currentDisplay.workArea
                }
            });

            // Empêcher l'événement contextmenu par défaut
            event.preventDefault();
            
            menu.popup({
                window,
                positioningItem: 0,
                callback: () => {
                    console.log('=== DEBUG: Menu fermé ===');
                }
            });
            console.log('=== DEBUG: Menu affiché avec succès ===');
        } catch (error) {
            console.error('=== DEBUG: Erreur lors de l\'affichage du menu ===', error);
        }
    } catch (error) {
        console.error('=== DEBUG: Erreur globale ===', error);
    }
});

// Gérer la demande d'ouverture de l'éditeur d'image
ipcMain.on('request-open-image-editor', (event, data) => {
    console.log('=== DEBUG: Main process - Demande d\'ouverture de l\'éditeur reçue ===', data);
    // Envoyer l'événement à la fenêtre principale
    mainWindow.webContents.send('request-open-image-editor', data);
});

// Écouter l'événement d'ouverture de l'éditeur d'image
ipcMain.on('open-image-editor', (event, { imageId, imageName }) => {
    console.log('=== DEBUG: Demande d\'ouverture de l\'éditeur reçue ===', { imageId, imageName });
    try {
        // Envoyer un message au renderer process pour ouvrir l'éditeur
        event.sender.send('execute-open-editor', { imageId, imageName });
    } catch (error) {
        console.error('=== DEBUG: Erreur lors de l\'ouverture de l\'éditeur ===', error);
    }
});

// Écouter l'événement context-menu natif pour le bloquer si nécessaire
app.on('browser-window-created', (event, window) => {
    window.webContents.on('context-menu', (event, params) => {
        // Si c'est une image, on empêche le menu contextuel par défaut
        if (params.mediaType === 'image') {
            event.preventDefault();
        }
    });
});

let mainWindow;

function createWindow() {
    console.log('=== DEBUG: Création de la fenêtre principale ===');
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Wait a bit for the Express server to start
    setTimeout(() => {
        mainWindow.loadURL('http://localhost:8080');
        mainWindow.webContents.openDevTools();
        
        mainWindow.webContents.on('did-finish-load', () => {
            console.log('=== DEBUG: Page principale chargée ===');
        });
    }, 1000);

    return mainWindow;
}

app.whenReady().then(() => {
    console.log('=== DEBUG: Application prête ===');
    createWindow();
});

app.on('window-all-closed', () => {
    expressApp.close();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
