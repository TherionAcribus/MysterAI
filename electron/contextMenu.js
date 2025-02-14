const { Menu, MenuItem } = require('electron');

function createImageContextMenu(mainWindow) {
    const menu = new Menu();
    
    menu.append(new MenuItem({
        label: 'Éditer l\'image',
        click: () => {
            mainWindow.webContents.send('edit-image-requested');
        }
    }));

    return menu;
}

module.exports = {
    createImageContextMenu
};
