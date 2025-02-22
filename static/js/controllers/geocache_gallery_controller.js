// Geocache Gallery Controller
(() => {
    const application = Stimulus.Application.start()
    
    application.register("geocache-gallery", class extends Stimulus.Controller {
        static targets = ["image"]

        connect() {
            console.log('Geocache Gallery Controller connected')
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
                
                // Utiliser la fonction showWebContextMenu
                showWebContextMenu(
                    event.clientX,
                    event.clientY,
                    `image-${imageId}`,
                    `Image : "${imageName}"`,
                    [
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
                    ]
                );
            }
        }
    })
})()
