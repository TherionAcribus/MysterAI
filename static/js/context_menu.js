// Fonction pour afficher un menu contextuel web
function showWebContextMenu(x, y, id, title, items = []) {
    // Créer le menu contextuel avec le style Tailwind
    const menu = document.createElement('div');
    menu.className = 'fixed z-50 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 min-w-[200px]';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    // En-tête avec le titre
    if (title) {
        const header = document.createElement('div');
        header.className = 'px-4 py-2 text-gray-400 text-sm border-b border-gray-700';
        header.textContent = title;
        menu.appendChild(header);
    }
    
    // Ajouter les éléments du menu
    items.forEach(item => {
        if (item.type === 'separator') {
            const separator = document.createElement('div');
            separator.className = 'border-t border-gray-700 my-1';
            menu.appendChild(separator);
        } else {
            const menuItem = document.createElement('div');
            menuItem.className = `px-4 py-2 text-white ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700 cursor-pointer'} flex items-center ${item.className || ''}`;
            
            // Ajouter une icône si spécifiée
            if (item.icon) {
                const icon = document.createElement('i');
                icon.className = `${item.icon} mr-2`;
                menuItem.appendChild(icon);
            }
            
            // Ajouter le texte
            const text = document.createElement('span');
            text.textContent = item.label;
            menuItem.appendChild(text);
            
            // Ajouter le gestionnaire de clic si l'élément n'est pas désactivé
            if (!item.disabled && item.click) {
                menuItem.onclick = () => {
                    item.click();
                    menu.remove();
                };
            }
            
            menu.appendChild(menuItem);
        }
    });
    
    // Ajouter le menu au document
    document.body.appendChild(menu);
    
    // Fermer le menu au clic en dehors
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    
    // Petit délai pour éviter la fermeture immédiate
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 0);
    
    return menu;
}

// Exporter la fonction globalement
window.showWebContextMenu = showWebContextMenu;
