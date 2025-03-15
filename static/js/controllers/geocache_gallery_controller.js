// Geocache Gallery Controller
(() => {
    const application = Stimulus.Application.start()
    
    application.register("geocache-gallery", class extends Stimulus.Controller {
        static targets = ["image"]

        connect() {
            console.log('Geocache Gallery Controller connected')
            console.log('Vérification des images disponibles:')
            document.querySelectorAll('.geocache-image').forEach((img, index) => {
                console.log(`Image ${index}:`, {
                    id: img.dataset.imageId,
                    name: img.dataset.imageName,
                    isOriginal: img.dataset.isOriginal
                })
            })
            this.element.addEventListener('contextmenu', this.handleContextMenu.bind(this))
        }

        handleContextMenu(event) {
            // Vérifier si l'élément cliqué ou un de ses parents est une image de géocache
            const targetImage = event.target.closest('.geocache-image');
            
            if (targetImage) {
                event.preventDefault();
                event.stopPropagation();

                // Retirer la sélection de toutes les images
                document.querySelectorAll('.geocache-image').forEach(img => {
                    img.classList.remove('selected');
                });

                // Sélectionner l'image actuelle
                targetImage.classList.add('selected');
                
                const imageId = targetImage.dataset.imageId;
                const imageName = targetImage.dataset.imageName || 'Sans nom';
                const isOriginalRaw = targetImage.dataset.isOriginal;
                
                // Convertir explicitement en booléen
                // La valeur devrait être "true" ou "false" en tant que chaîne
                // Il faut faire une comparaison stricte avec la chaîne "true"
                const isOriginal = isOriginalRaw === "true";
                
                console.log('Image sélectionnée:', {
                    id: imageId,
                    name: imageName,
                    isOriginalRaw: isOriginalRaw,
                    isOriginal: isOriginal,
                    datasetComplete: JSON.stringify(targetImage.dataset)
                });
                
                // Menu contextuel avec options
                const menuItems = [
                    {
                        label: 'Éditer l\'image',
                        icon: 'fas fa-edit',
                        click: () => {
                            if (window.electron) {
                                window.electron.openImageEditor(imageId, imageName);
                            } else {
                                window.openImageEditor(imageId, imageName);
                            }
                        }
                    },
                    {
                        label: 'Copier',
                        icon: 'fas fa-copy',
                        click: () => {
                            // TODO: Implémenter la copie
                        }
                    }
                ];
                
                // Ajouter l'option de suppression uniquement pour les images non originales
                console.log('Affichage option suppression?', !isOriginal);
                if (!isOriginal) {
                    console.log('Ajout de l\'option de suppression');
                    menuItems.push({
                        label: 'Supprimer',
                        icon: 'fas fa-trash-alt',
                        click: () => {
                            if (confirm('Êtes-vous sûr de vouloir supprimer cette image ?')) {
                                this.deleteImage(imageId);
                            }
                        }
                    });
                }
                
                // Utiliser la fonction showWebContextMenu
                showWebContextMenu(
                    event.clientX,
                    event.clientY,
                    `image-${imageId}`,
                    `Image : "${imageName}"`,
                    menuItems
                );
            }
        }
        
        deleteImage(imageId) {
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
                // Recharger la page pour refléter les changements
                window.location.reload();
            })
            .catch(error => {
                console.error('Erreur:', error);
                alert('Erreur lors de la suppression de l\'image.');
            });
        }
    })
})()
