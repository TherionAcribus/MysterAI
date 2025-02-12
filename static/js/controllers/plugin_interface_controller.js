// Controller Stimulus pour l'interface du plugin
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
    connect() {
        console.log("Plugin interface controller connected")
    }

    execute(event) {
        // La soumission est gérée par HTMX, mais nous pouvons ajouter une logique supplémentaire ici si nécessaire
        console.log("Executing plugin...")
    }
}
