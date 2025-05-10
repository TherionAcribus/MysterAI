#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Script pour mettre à jour les plugins existants avec le paramètre accept_accents.
Ce script identifie automatiquement les plugins basés sur la transposition et les
met à jour pour qu'ils acceptent les caractères accentués.
"""

import os
import json
import sys

# Ajouter le répertoire parent au path pour pouvoir importer l'application
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models.plugin_model import Plugin

# Liste des mots-clés qui pourraient indiquer un plugin basé sur la transposition
TRANSPOSITION_KEYWORDS = [
    'transposition', 
    'anagramme', 
    'permutation', 
    'inversion', 
    'reverse', 
    'mirror',
    'palindrome',
    'retournement',
    'rotation'
]

def update_plugin_accept_accents():
    """
    Met à jour les plugins existants en fonction de leur type.
    Les plugins basés sur la transposition sont configurés pour accepter les accents.
    """
    app = create_app()
    with app.app_context():
        plugins = Plugin.query.all()
        print(f"Trouvé {len(plugins)} plugins à analyser")
        
        for plugin in plugins:
            try:
                metadata = json.loads(plugin.metadata_json) if plugin.metadata_json else {}
                plugin_name = plugin.name.lower()
                plugin_description = (plugin.description or "").lower()
                plugin_categories = json.loads(plugin.categories) if plugin.categories else []
                
                # Vérifier si c'est un plugin basé sur la transposition
                is_transposition_based = False
                
                # Vérifier dans le nom, la description et les catégories
                for keyword in TRANSPOSITION_KEYWORDS:
                    if (keyword in plugin_name or 
                        keyword in plugin_description or 
                        any(keyword in cat.lower() for cat in plugin_categories)):
                        is_transposition_based = True
                        break
                
                # Mettre à jour le plugin
                if is_transposition_based:
                    print(f"Plugin {plugin.name} identifié comme basé sur la transposition, activation de accept_accents")
                    plugin.accept_accents = True
                    
                    # Mettre également à jour le metadata_json
                    metadata['accept_accents'] = True
                    plugin.metadata_json = json.dumps(metadata)
                else:
                    print(f"Plugin {plugin.name} configuré pour ne pas accepter les accents")
                    plugin.accept_accents = False
                    
                    # Mettre également à jour le metadata_json s'il n'existe pas déjà
                    if 'accept_accents' not in metadata:
                        metadata['accept_accents'] = False
                        plugin.metadata_json = json.dumps(metadata)
                
                # Vérifier si le plugin a un fichier plugin.json
                plugin_json_path = os.path.join(plugin.path, 'plugin.json')
                if os.path.exists(plugin_json_path):
                    try:
                        # Lire le fichier plugin.json
                        with open(plugin_json_path, 'r', encoding='utf-8') as f:
                            plugin_data = json.load(f)
                        
                        # Ajouter/mettre à jour le paramètre accept_accents
                        plugin_data['accept_accents'] = is_transposition_based
                        
                        # Écrire le fichier plugin.json mis à jour
                        with open(plugin_json_path, 'w', encoding='utf-8') as f:
                            json.dump(plugin_data, f, indent=2, ensure_ascii=False)
                            
                        print(f"Fichier plugin.json mis à jour pour {plugin.name}")
                    except Exception as e:
                        print(f"Erreur lors de la mise à jour du fichier plugin.json pour {plugin.name}: {e}")
            except Exception as e:
                print(f"Erreur lors du traitement du plugin {plugin.name}: {e}")
        
        # Sauvegarder les modifications dans la base de données
        db.session.commit()
        print("Mise à jour terminée")

if __name__ == "__main__":
    update_plugin_accept_accents() 