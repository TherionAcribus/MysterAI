const { app, BrowserWindow, ipcMain } = require('electron');
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

// Gérer la demande d'ouverture de l'éditeur d'image
ipcMain.on('request-open-image-editor', (event, data) => {
    try {
        console.log('=== DEBUG: Demande d\'ouverture de l\'éditeur reçue ===', data);
        const window = BrowserWindow.fromWebContents(event.sender);
        if (window) {
            // Envoyer un événement au renderer pour ouvrir l'éditeur dans GoldenLayout
            window.webContents.send('open-image-editor', data);
            console.log('=== DEBUG: Événement open-image-editor envoyé au renderer ===');
        }
    } catch (error) {
        console.error('=== DEBUG: Erreur lors de l\'ouverture de l\'éditeur ===', error);
    }
});

// Créer la fenêtre principale
function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
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
