const { spawn } = require('child_process');
const path = require('path');
const electron = require('electron');

// Chemin vers le script principal
const appPath = path.join(__dirname, 'main.js');

// Démarrer Electron avec le debug IPC activé
const electronProcess = spawn(electron, [appPath], {
    env: {
        ...process.env,
        ELECTRON_ENABLE_LOGGING: '1',
        ELECTRON_ENABLE_STACK_DUMPING: '1',
        DEBUG: 'electron-*,ipc-*'
    },
    stdio: 'inherit'  // Afficher les logs dans le terminal parent
});

electronProcess.on('error', (err) => {
    console.error('Erreur lors du démarrage d\'Electron:', err);
});

electronProcess.on('exit', (code) => {
    console.log(`Electron s'est arrêté avec le code: ${code}`);
});
