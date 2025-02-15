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

            // Si nous sommes dans Electron, utiliser le menu contextuel natif
            if (window.electron) {
                console.log('=== DEBUG: Utilisation du menu Electron ===');
                const imageData = {
                    imageId: targetImage.dataset.imageId,
                    imageName: targetImage.dataset.imageName
                };
                const position = {
                    x: e.clientX,
                    y: e.clientY
                };
                console.log('=== DEBUG: Image data:', imageData);
                console.log('=== DEBUG: Position:', position);
                window.electron.showImageContextMenu(imageData, position);
            } else {
                console.log('=== DEBUG: Utilisation du menu web ===');
                // Fallback pour le navigateur web
                const rect = targetImage.getBoundingClientRect();
                showWebContextMenu(rect.left, rect.top, targetImage.dataset.imageId, targetImage.dataset.imageName);
            }
        }
    });
}

// Fonction pour afficher le menu contextuel web
function showWebContextMenu(x, y, imageId, imageName) {
    // Supprimer tout menu contextuel existant
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }

    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.innerHTML = `
        <div class="context-menu-item edit-image">
            <i class="fas fa-edit"></i>
            Éditer l'image
        </div>
    `;

    // Positionner le menu
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    document.body.appendChild(contextMenu);

    // Gérer le clic sur l'option d'édition
    contextMenu.querySelector('.edit-image').addEventListener('click', function() {
        window.openImageEditor(imageId, imageName);
        contextMenu.remove();
    });

    // Fermer le menu au clic en dehors
    function handleClickOutside(e) {
        if (!contextMenu.contains(e.target)) {
            contextMenu.remove();
            document.removeEventListener('click', handleClickOutside);
        }
    }

    // Attendre un peu avant d'ajouter le gestionnaire de clic
    setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
    }, 0);
}

