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
            
            // Option OCR rapide
            const ocrQuickOption = document.createElement('div');
            ocrQuickOption.className = 'px-4 py-2 text-white hover:bg-gray-700 cursor-pointer flex items-center';
            ocrQuickOption.innerHTML = '<i class="fas fa-search mr-2"></i>OCR rapide';
            ocrQuickOption.onclick = () => {
                runOCR(targetImage, false);
                menu.remove();
            };
            menu.appendChild(ocrQuickOption);

            // Option OCR IA (GPT-4o)
            const ocrAIOption = document.createElement('div');
            ocrAIOption.className = 'px-4 py-2 text-white hover:bg-gray-700 cursor-pointer flex items-center';
            ocrAIOption.innerHTML = '<i class="fas fa-robot mr-2"></i>OCR IA (GPT-4o)';
            ocrAIOption.onclick = () => {
                runOCR(targetImage, true);
                menu.remove();
            };
            menu.appendChild(ocrAIOption);

            // Option QR Code
            const qrOption = document.createElement('div');
            qrOption.className = 'px-4 py-2 text-white hover:bg-gray-700 cursor-pointer flex items-center';
            qrOption.innerHTML = '<i class="fas fa-qrcode mr-2"></i>Lire QR Code';
            qrOption.onclick = () => {
                runQRCode(targetImage);
                menu.remove();
            };
            menu.appendChild(qrOption);

            // Séparateur
            const separator1 = document.createElement('div');
            separator1.className = 'border-t border-gray-700 my-1';
            menu.appendChild(separator1);

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

// Ajouter la fonction OCR en bas du fichier
function runOCR(imageElement, useAI) {
    const imgSrc = imageElement.src;
    fetch(imgSrc)
        .then(resp => resp.blob())
        .then(blob => {
            const formData = new FormData();
            formData.append('image', blob, 'image.png');
            formData.append('use_ai', useAI ? 'true' : 'false');

            // Afficher chargement
            console.log('runOCR: window.OCRModal =', window.OCRModal);
            if (window.OCRModal) { OCRModal.showLoading(); }

            return fetch('/api/ai/ocr/extract', {
                method: 'POST',
                body: formData
            });
        })
        .then(resp => resp.json())
        .then(data => {
            if (window.OCRModal) {
                if (data.success) {
                    OCRModal.showResult(data.text || '', data.confidence);
                } else {
                    OCRModal.showResult('Erreur OCR: ' + data.error, 0);
                }
            } else {
                // Fallback alert
                if (data.success) {
                    const conf = (data.confidence * 100).toFixed(1);
                    alert(`Texte détecté (confiance ${conf}%):\n\n${data.text}`);
                } else {
                    alert('Erreur OCR: ' + data.error);
                }
            }
        })
        .catch(err => {
            console.error('OCR error', err);
            if (window.OCRModal) {
                OCRModal.showResult('Erreur lors de l\'appel OCR', 0);
            } else {
                alert('Erreur lors de l\'appel OCR');
            }
        });
}

// Fonction QR Code similaire à runOCR
function runQRCode(imageElement) {
    const imgSrc = imageElement.src;
    fetch(imgSrc)
        .then(resp => resp.blob())
        .then(blob => {
            const formData = new FormData();
            formData.append('image', blob, 'image.png');

            // Afficher chargement (optionnel, peut utiliser la même modale que OCR)
            if (window.OCRModal) { OCRModal.showLoading(); }

            return fetch('/api/ai/qr/extract', {
                method: 'POST',
                body: formData
            });
        })
        .then(resp => resp.json())
        .then(data => {
            if (window.OCRModal) {
                if (data.success) {
                    if (data.qr_codes && data.qr_codes.length > 0) {
                        let resultText = `${data.qr_codes.length} QR Code(s) détecté(s):\n\n`;
                        data.qr_codes.forEach((qr, index) => {
                            resultText += `QR Code ${index + 1}: ${qr.data}\n`;
                        });
                        OCRModal.showResult(resultText, 1.0); // Confiance maximale pour QR codes
                    } else {
                        OCRModal.showResult('Aucun QR Code détecté dans cette image.', 0);
                    }
                } else {
                    OCRModal.showResult('Erreur QR Code: ' + (data.error || 'Erreur inconnue'), 0);
                }
            } else {
                // Fallback alert
                if (data.success) {
                    if (data.qr_codes && data.qr_codes.length > 0) {
                        let message = `${data.qr_codes.length} QR Code(s) détecté(s):\n\n`;
                        data.qr_codes.forEach((qr, index) => {
                            message += `QR Code ${index + 1}: ${qr.data}\n`;
                        });
                        alert(message);
                        
                        // Copier le premier QR code dans le presse-papier si disponible
                        if (data.qr_codes.length === 1 && navigator.clipboard) {
                            navigator.clipboard.writeText(data.qr_codes[0].data).then(() => {
                                console.log('QR code copié dans le presse-papier');
                            }).catch(err => {
                                console.error('Erreur lors de la copie:', err);
                            });
                        }
                    } else {
                        alert('Aucun QR Code détecté dans cette image.');
                    }
                } else {
                    alert('Erreur QR Code: ' + (data.error || 'Erreur inconnue'));
                }
            }
        })
        .catch(err => {
            console.error('QR Code error', err);
            if (window.OCRModal) {
                OCRModal.showResult('Erreur lors de l\'appel QR Code', 0);
            } else {
                alert('Erreur lors de l\'appel QR Code');
            }
        });
}

window.runOCR = runOCR;
window.runQRCode = runQRCode;
