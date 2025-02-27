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
            const isOriginalRaw = targetImage.dataset.isOriginal;
            const isOriginal = isOriginalRaw === "true";
            
            console.log('Image sélectionnée:', {
                id: imageId,
                name: imageName,
                isOriginalRaw: isOriginalRaw,
                isOriginal: isOriginal,
                datasetComplete: JSON.stringify(targetImage.dataset)
            });
            
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
                    // Fallback si Electron n'est pas disponible
                    // Par exemple, ouvrir dans un nouvel onglet ou utiliser un éditeur web
                    console.log('Édition de l\'image (mode web):', imageId, imageName);
                    if (typeof window.openImageEditor === 'function') {
                        window.openImageEditor(imageId, imageName);
                    } else {
                        alert('L\'éditeur d\'image n\'est pas disponible dans cette version.');
                    }
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
            
            // Option de suppression uniquement pour les images non originales
            if (!isOriginal) {
                console.log('=== DEBUG: Ajout de l\'option de suppression ===');
                const deleteOption = document.createElement('div');
                deleteOption.className = 'px-4 py-2 text-white hover:bg-gray-700 cursor-pointer flex items-center text-red-400';
                deleteOption.innerHTML = '<i class="fas fa-trash-alt mr-2"></i>Supprimer';
                deleteOption.onclick = () => {
                    if (confirm('Êtes-vous sûr de vouloir supprimer cette image ?')) {
                        // Appeler l'API pour supprimer l'image
                        fetch(`/api/geocaches/images/${imageId}/delete`, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json',
                            }
                        })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Erreur lors de la suppression de l\'image');
                            }
                            return response.json();
                        })
                        .then(data => {
                            console.log('Image supprimée avec succès:', data);
                            
                            // Trouver le conteneur de la galerie et l'ID du géocache
                            const galleryContainer = document.getElementById('geocache-gallery-container');
                            const geocacheId = galleryContainer.dataset.geocacheId;
                            
                            // Utiliser HTMX pour rafraîchir uniquement la galerie
                            if (htmx) {
                                htmx.ajax('GET', `/api/geocaches/${geocacheId}/gallery`, {
                                    target: '#geocache-gallery-container',
                                    swap: 'innerHTML'
                                });
                            } else {
                                // Fallback si HTMX n'est pas disponible
                                fetch(`/api/geocaches/${geocacheId}/gallery`)
                                    .then(response => response.text())
                                    .then(html => {
                                        galleryContainer.innerHTML = html;
                                    });
                            }
                        })
                        .catch(error => {
                            console.error('Erreur:', error);
                            alert('Erreur lors de la suppression de l\'image.');
                        });
                    }
                    menu.remove();
                };
                menu.appendChild(deleteOption);
            }
            
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
        } else {
            // Restaurer le menu contextuel HTML natif
            console.log('=== DEBUG: Menu contextuel HTML natif restauré ===');
        }
    });
}

// Exporter les fonctions
window.initContextMenu = initContextMenu;
