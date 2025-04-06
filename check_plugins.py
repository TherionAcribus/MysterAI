import os
import sys
import json
from app import create_app
from app.models.plugin_model import Plugin
from app.database import db

def check_plugins():
    """Vérifie l'état des plugins et affiche le résultat."""
    app = create_app()
    with app.app_context():
        plugins = Plugin.query.all()
        
        print(f"Nombre de plugins trouvés: {len(plugins)}")
        
        for plugin in plugins:
            print(f"Plugin: {plugin.name} (v{plugin.version})")
            print(f"  - Description: {plugin.description}")
            print(f"  - Path: {plugin.path}")
            print(f"  - Categories: {plugin.categories}")
            print("  ----")

def add_test_plugins():
    """Ajoute des plugins de test à la base de données."""
    app = create_app()
    with app.app_context():
        # Supprimer tous les plugins existants
        Plugin.query.delete()
        db.session.commit()
        
        print("Plugins supprimés. Ajout de plugins de test...")
        
        # Définir le répertoire de base des plugins
        base_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'plugins')
        if not os.path.exists(base_dir):
            print(f"Le répertoire de plugins n'existe pas: {base_dir}")
            print("Création de plugins factices uniquement...")
            base_dir = "plugins"  # Répertoire fictif
        
        # Plugins de test
        test_plugins = [
            {
                'name': 'coordinates_finder',
                'version': '1.0.0',
                'description': 'Détecteur de coordonnées GPS (DEBUG)',
                'author': 'System',
                'plugin_type': 'analyzer',
                'path': os.path.join(base_dir, 'coordinates_finder'),
                'entry_point': 'main.py',
                'enabled': True,
                'categories': json.dumps(['debug', 'solver', 'analysis']),
                'metadata_json': json.dumps({
                    'input_types': {'text': {'type': 'text', 'description': 'Texte à analyser'}},
                    'output_types': {'coordinates': {'type': 'object', 'description': 'Coordonnées détectées'}}
                })
            },
            {
                'name': 'formula_parser',
                'version': '1.0.0',
                'description': 'Analyseur de formules mathématiques (DEBUG)',
                'author': 'System',
                'plugin_type': 'analyzer',
                'path': os.path.join(base_dir, 'formula_parser'),
                'entry_point': 'main.py',
                'enabled': True,
                'categories': json.dumps(['debug', 'solver', 'analysis']),
                'metadata_json': json.dumps({
                    'input_types': {'text': {'type': 'text', 'description': 'Formule à analyser'}},
                    'output_types': {'result': {'type': 'object', 'description': 'Résultat de la formule'}}
                })
            },
            {
                'name': 'analysis_web_page',
                'version': '1.0.0',
                'description': 'Analyse complète de page (DEBUG)',
                'author': 'System',
                'plugin_type': 'meta',
                'path': os.path.join(base_dir, 'analysis_web_page'),
                'entry_point': 'main.py',
                'enabled': True,
                'categories': json.dumps(['debug', 'solver', 'analysis']),
                'metadata_json': json.dumps({
                    'input_types': {'geocache_id': {'type': 'number', 'description': 'ID de la géocache'}},
                    'output_types': {'results': {'type': 'object', 'description': 'Résultats de l\'analyse'}}
                })
            }
        ]
        
        # Ajouter les plugins à la base de données
        for plugin_data in test_plugins:
            plugin = Plugin(**plugin_data)
            db.session.add(plugin)
        
        db.session.commit()
        print(f"{len(test_plugins)} plugins de test ajoutés avec succès.")

def add_solver_category():
    """Ajoute la catégorie 'solver' à tous les plugins existants."""
    app = create_app()
    with app.app_context():
        plugins = Plugin.query.all()
        modified_count = 0
        
        for plugin in plugins:
            try:
                # Charger les catégories existantes
                categories = json.loads(plugin.categories)
                
                # Ajouter la catégorie 'solver' si elle n'existe pas déjà
                if 'solver' not in categories:
                    categories.append('solver')
                    plugin.categories = json.dumps(categories)
                    modified_count += 1
            except Exception as e:
                print(f"Erreur lors du traitement des catégories pour {plugin.name}: {str(e)}")
        
        # Sauvegarder les modifications
        if modified_count > 0:
            db.session.commit()
            print(f"Catégorie 'solver' ajoutée à {modified_count} plugins.")
        else:
            print("Aucun plugin n'a besoin d'être modifié.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "--add-test":
            add_test_plugins()
        elif sys.argv[1] == "--add-solver":
            add_solver_category()
        elif sys.argv[1] == "--help":
            print("Usage: python check_plugins.py [option]")
            print("Options:")
            print("  --add-test      Ajoute des plugins de test à la base de données")
            print("  --add-solver    Ajoute la catégorie 'solver' à tous les plugins")
            print("  --help          Affiche cette aide")
    else:
        check_plugins() 