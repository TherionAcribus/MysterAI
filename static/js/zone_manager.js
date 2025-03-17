/**
 * Gestionnaire des zones
 * Ce script gère les interactions avec les zones dans l'application.
 */

// Fonction pour recharger la liste des zones après une modification
function reloadZonesList() {
    console.log('Rechargement de la liste des zones');
    // Utiliser HTMX pour recharger la liste des zones
    htmx.ajax('GET', '/api/zones', {
        target: '#geocaches-panel-content',
        swap: 'innerHTML'
    });
}

// Initialiser les gestionnaires d'événements lorsque le DOM est chargé
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initialisation des gestionnaires d\'événements pour les zones');
    
    // Ajouter des gestionnaires d'événements pour les boutons de suppression
    document.body.addEventListener('click', function(e) {
        // Délégation d'événements pour les boutons de suppression
        if (e.target.closest('.delete-zone-btn')) {
            const button = e.target.closest('.delete-zone-btn');
            const zoneId = button.getAttribute('data-zone-id');
            const zoneName = button.getAttribute('data-zone-name');
            confirmDeleteZone(zoneId, zoneName);
        }
    });
});

// Fonction pour confirmer la suppression d'une zone
function confirmDeleteZone(zoneId, zoneName) {
    const zoneNameElement = document.getElementById('zoneNameToDelete');
    if (zoneNameElement) {
        zoneNameElement.textContent = zoneName;
    }
    
    const deleteForm = document.getElementById('deleteZoneForm');
    if (deleteForm) {
        deleteForm.action = `/zones/${zoneId}/delete`;
        
        // Ajouter les attributs HTMX au formulaire
        deleteForm.setAttribute('hx-post', `/zones/${zoneId}/delete`);
        deleteForm.setAttribute('hx-target', '#geocaches-panel-content');
        deleteForm.setAttribute('hx-swap', 'innerHTML');
    }
    
    const deleteModal = document.getElementById('deleteZoneModal');
    if (deleteModal) {
        deleteModal.classList.remove('hidden');
    }
}

// Fonction pour fermer le modal de suppression
function closeDeleteZoneModal() {
    const deleteModal = document.getElementById('deleteZoneModal');
    if (deleteModal) {
        deleteModal.classList.add('hidden');
    }
}

// Fonction pour ouvrir un onglet avec la liste des géocaches d'une zone
window.openGeocachesTab = function(zoneId, zoneName) {
    console.log('Redirection vers la liste des géocaches pour la zone', zoneId, zoneName);
    window.location.href = `/geocaches?zone_id=${zoneId}`;
}; 