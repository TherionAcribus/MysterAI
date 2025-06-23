const { Menu } = require('electron');

function createImageContextMenu(mainWindow) {
    return Menu.buildFromTemplate([
        {
            label: 'Éditer l1\'image',
            click: () => {
                mainWindow.webContents.send('edit-image-requested');
            }
        }
    ]);
}

function createSymbolContextMenu(mainWindow, data) {
    return Menu.buildFromTemplate([
        {
            label: 'Supprimer le symbole',
            click: () => {
                mainWindow.webContents.send('context-menu-command', 'remove-symbol', data);
            }
        }
    ]);
}

module.exports = {
    createImageContextMenu,
    createSymbolContextMenu
};
