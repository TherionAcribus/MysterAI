// Fonction pour initialiser le menu contextuel
function initContextMenu() {
    console.log('=== DEBUG: Initialisation du menu contextuel ===');
    
    // Utiliser la délégation d'événements pour gérer le clic droit sur les images
    document.body.addEventListener('contextmenu', function(e) {
        console.log('=== DEBUG: Événement contextmenu détecté ===');
        console.log('Target:', e.target);
        console.log('Target classList:', e.target.classList);
        
        // Vérifier si l'élément cliqué ou un de ses parents est une image de géocache
        const targetImage = e.target.closest('.geocache-image');
        console.log('Image trouvée:', !!targetImage);
        
        if (targetImage) {
            console.log('=== DEBUG: Clic droit sur une image de géocache ===');
            e.preventDefault();
            e.stopPropagation();

            // Retirer la sélection de toutes les images
            document.querySelectorAll('.geocache-image').forEach(img => {
                img.classList.remove('selected');
            });

            // Sélectionner l'image actuelle
            targetImage.classList.add('selected');

            // Vérifier si window.electron existe
            console.log('=== DEBUG: window.electron existe:', !!window.electron);
            console.log('=== DEBUG: window.electron:', window.electron);

            if (window.electron) {
                // Utiliser le menu contextuel natif d'Electron
                const imageData = {
                    imageId: targetImage.dataset.imageId,
                    imageName: targetImage.dataset.imageName
                };
                window.electron.showImageContextMenu(imageData);
            } else {
                // Utiliser le menu contextuel web
                showWebContextMenu(
                    e.clientX,
                    e.clientY,
                    targetImage.dataset.imageId,
                    targetImage.dataset.imageName
                );
            }
        }
    });
}

// Fonction pour afficher le menu contextuel web
function showWebContextMenu(x, y, id, name, customItems = []) {
    // Créer le menu
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    // Ajouter les éléments personnalisés s'ils existent
    if (customItems.length > 0) {
        customItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = item.label;
            menuItem.addEventListener('click', () => {
                item.click();
                menu.remove();
            });
            menu.appendChild(menuItem);
        });
    } else {
        // Menu par défaut pour les images
        const editItem = document.createElement('div');
        editItem.className = 'context-menu-item';
        editItem.textContent = 'Éditer l\'image';
        editItem.addEventListener('click', () => {
            window.openImageEditor(id, name);
            menu.remove();
        });
        menu.appendChild(editItem);
    }

    // Ajouter le menu au document
    document.body.appendChild(menu);

    // Fermer le menu au clic en dehors
    function handleClickOutside(e) {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', handleClickOutside);
        }
    }
    
    // Utiliser setTimeout pour éviter que le menu ne se ferme immédiatement
    setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
    }, 0);
}

// Exporter les fonctions
window.initContextMenu = initContextMenu;
window.showWebContextMenu = showWebContextMenu;
