// Importer tous les contrôleurs Stimulus
import { Application } from '@hotwired/stimulus';
import WaypointFormController from './waypoint_form_controller';
import MapController from './map_controller';
import ZoneMapController from './zone_map_controller';
import AlphabetDisplayController from './alphabet_display_controller';

// Initialiser l'application Stimulus si elle n'existe pas déjà
window.StimulusApp = window.StimulusApp || Application.start();

// Enregistrer les contrôleurs
window.StimulusApp.register('waypoint-form', WaypointFormController);
window.StimulusApp.register('map', MapController);
window.StimulusApp.register('zone-map', ZoneMapController);
window.StimulusApp.register('alphabet-display', AlphabetDisplayController);

console.log('Contrôleurs Stimulus enregistrés');
