/**
 * Fonctions utilitaires pour l'application MysteryAI
 */

/**
 * Affiche une notification toast
 * @param {Object} options - Options de la notification
 * @param {string} options.message - Message à afficher
 * @param {string} options.type - Type de notification (success, error, warning, info)
 * @param {number} options.duration - Durée d'affichage en ms (défaut: 3000ms)
 */
function showToast(options) {
    const { message, type = 'info', duration = 3000 } = options;
    
    // Créer le conteneur de notification s'il n'existe pas
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
        document.body.appendChild(toastContainer);
    }
    
    // Créer l'élément toast
    const toast = document.createElement('div');
    toast.className = 'px-4 py-2 rounded-lg shadow-lg max-w-sm text-white flex items-center gap-2 animate-fade-in';
    
    // Ajouter la classe de couleur en fonction du type
    switch (type) {
        case 'success':
            toast.classList.add('bg-green-600');
            toast.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
            break;
        case 'error':
            toast.classList.add('bg-red-600');
            toast.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
            break;
        case 'warning':
            toast.classList.add('bg-yellow-600');
            toast.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
            break;
        default:
            toast.classList.add('bg-blue-600');
            toast.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    }
    
    // Ajouter le message
    const messageElement = document.createElement('span');
    messageElement.textContent = message;
    toast.appendChild(messageElement);
    
    // Ajouter le toast au conteneur
    toastContainer.appendChild(toast);
    
    // Ajouter une animation d'apparition
    requestAnimationFrame(() => {
        toast.classList.add('opacity-100');
    });
    
    // Supprimer le toast après la durée spécifiée
    setTimeout(() => {
        toast.classList.add('opacity-0', 'animate-fade-out');
        setTimeout(() => {
            toast.remove();
            
            // Supprimer le conteneur s'il n'y a plus de toasts
            if (toastContainer.childElementCount === 0) {
                toastContainer.remove();
            }
        }, 300);
    }, duration);
}

/**
 * Affiche un menu contextuel personnalisé
 * @param {number} x - Position X
 * @param {number} y - Position Y
 * @param {string} id - ID du menu
 * @param {string} title - Titre du menu
 * @param {Array} items - Éléments du menu
 */
function showWebContextMenu(x, y, id, title, items) {
    // Supprimer tout menu contextuel existant
    const existingMenu = document.querySelector('.web-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // Créer le menu
    const menu = document.createElement('div');
    menu.className = 'web-context-menu fixed z-50 rounded-lg shadow-lg bg-gray-800 border border-gray-700 py-2 opacity-0 transition-opacity duration-200';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    // Ajouter le titre si fourni
    if (title) {
        const titleElement = document.createElement('div');
        titleElement.className = 'px-4 py-1 text-sm text-gray-400 font-medium border-b border-gray-700 mb-1';
        titleElement.textContent = title;
        menu.appendChild(titleElement);
    }
    
    // Ajouter les éléments du menu
    items.forEach(item => {
        if (item.type === 'separator') {
            const separator = document.createElement('hr');
            separator.className = 'my-1 border-gray-700';
            menu.appendChild(separator);
            return;
        }
        
        const menuItem = document.createElement('div');
        menuItem.className = 'px-4 py-1.5 text-sm text-gray-300 hover:bg-gray-700 cursor-pointer';
        
        if (item.className) {
            menuItem.className += ` ${item.className}`;
        }
        
        if (item.disabled) {
            menuItem.className = 'px-4 py-1.5 text-sm text-gray-500 cursor-default';
        }
        
        menuItem.textContent = item.label;
        
        if (item.click && !item.disabled) {
            menuItem.addEventListener('click', () => {
                item.click();
                menu.remove();
            });
        }
        
        menu.appendChild(menuItem);
    });
    
    // Ajouter le menu au document
    document.body.appendChild(menu);
    
    // Afficher avec une animation
    setTimeout(() => {
        menu.classList.add('opacity-100');
    }, 10);
    
    // Fermer le menu lors d'un clic ailleurs
    const closeMenu = (event) => {
        if (!menu.contains(event.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    
    // Attendre un peu avant d'ajouter l'écouteur de clic pour éviter la fermeture immédiate
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 10);
}

// Ajouter des styles CSS pour les animations
(() => {
    if (!document.getElementById('utils-css')) {
        const style = document.createElement('style');
        style.id = 'utils-css';
        style.textContent = `
            .animate-fade-in {
                opacity: 0;
                transition: opacity 0.3s ease-in-out;
            }
            .animate-fade-out {
                transition: opacity 0.3s ease-out;
            }
            .web-context-menu {
                min-width: 160px;
            }
        `;
        document.head.appendChild(style);
    }
})();

// Exporter les fonctions globalement
window.showToast = showToast;
window.showWebContextMenu = showWebContextMenu; 