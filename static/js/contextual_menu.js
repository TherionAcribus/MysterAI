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
            
            const imageId = targetImage.dataset.imageId;
            const imageName = targetImage.dataset.imageName || 'Sans nom';
            
            // Créer le menu contextuel avec le style Tailwind
            const menu = document.createElement('div');
            menu.className = 'fixed z-50 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 min-w-[200px]';
            menu.style.left = `${e.clientX}px`;
            menu.style.top = `${e.clientY}px`;
            
            // En-tête avec le nom de l'image
            const header = document.createElement('div');
            header.className = 'px-4 py-2 text-gray-400 text-sm border-b border-gray-700';
            header.textContent = `Image : "${imageName}"`;
            menu.appendChild(header);
            
            // Option d'édition
            const editOption = document.createElement('div');
            editOption.className = 'px-4 py-2 text-white hover:bg-gray-700 cursor-pointer flex items-center';
            editOption.innerHTML = '<i class="fas fa-edit mr-2"></i>Éditer l\'image';
            editOption.onclick = () => {
                if (window.electron) {
                    window.electron.openImageEditor(imageId, imageName);
                } else {
                    window.openImageEditor(imageId, imageName);
                }
                menu.remove();
            };
            menu.appendChild(editOption);
            
            // Option de copie
            const copyOption = document.createElement('div');
            copyOption.className = 'px-4 py-2 text-white hover:bg-gray-700 cursor-pointer flex items-center';
            copyOption.innerHTML = '<i class="fas fa-copy mr-2"></i>Copier';
            copyOption.onclick = () => {
                // TODO: Implémenter la copie
                menu.remove();
            };
            menu.appendChild(copyOption);
            
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
        }
    });
}

// Exporter les fonctions
window.initContextMenu = initContextMenu;
