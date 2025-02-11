import json

class AnalysisWebPagePlugin:
    def __init__(self):
        self.name = "analysis_web_page"
        self.description = "Méta-plugin pour analyser une page de cache en lançant plusieurs plugins"

    def execute(self, inputs):
        print("inputs", inputs)
        print("START analysis_web_page")
        """
        1. Récupère l'ID de la géocache
        2. Lit la pipeline (liste de sous-plugins) dans plugin.json (ou DB).
        3. Pour chaque sous-plugin : exécute-le, agrège les résultats.
        """
        geocache_id = inputs.get('geocache_id')
        print("geocache_id", geocache_id)
        if not geocache_id:
            return {"error": "Missing 'geocache_id' in inputs."}
        
        # Récupérer la géocache depuis la base de données
        from app.models.models import Geocache
        from app import db
        
        geocache = db.session.query(Geocache).get(geocache_id)
        if not geocache:
            return {"error": f"Geocache with id {geocache_id} not found."}
        
        page_content = geocache.description
        if not page_content:
            return {"error": "No description found for this geocache."}
        
        # Charger la configuration (pipeline) depuis le plugin.json
        import os
        import json
        base_dir = os.path.dirname(__file__)
        plugin_json_path = os.path.join(base_dir, "plugin.json")
        with open(plugin_json_path, "r", encoding="utf-8") as f:
            config = json.load(f)

        pipeline = config.get("pipeline", [])

        # On prépare un dictionnaire pour stocker tous les résultats
        combined_results = {}

        # Importer ou récupérer PluginManager
        from app import get_plugin_manager
        plugin_manager = get_plugin_manager()

        # On itère sur les sous-plugins
        for step in pipeline:
            plugin_name = step["plugin_name"]
            # On construit les inputs pour ce sous-plugin
            plugin_inputs = {
                "text": page_content,
                "geocache_id": geocache_id
                # ... on peut ajouter d'autres infos,
                # ou lire step["params"] si besoin
            }

            # Exécuter le plugin
            result = plugin_manager.execute_plugin(plugin_name, plugin_inputs)
            # On stocke le résultat dans combined_results
            combined_results[plugin_name] = result

        # On retourne tous les résultats
        return {
            "combined_results": combined_results
        }
