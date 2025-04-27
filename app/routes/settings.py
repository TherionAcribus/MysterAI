from flask import Blueprint, jsonify, request, render_template
from app.models.app_config import AppConfig
import logging

# Configurer le logger
logger = logging.getLogger(__name__)

# Créer un blueprint pour les routes de paramètres
settings_bp = Blueprint('settings', __name__, url_prefix='/api/settings')

@settings_bp.route('/general_panel', methods=['GET'])
def get_general_settings_panel():
    """
    Retourne le template HTML pour les paramètres généraux
    """
    logger.info("=== DEBUG: Route /api/settings/general_panel appelée ===")
    try:
        html = render_template('settings/general_settings.html')
        logger.info("=== DEBUG: Template des paramètres généraux rendu avec succès ===")
        return html
    except Exception as e:
        logger.error(f"=== ERREUR lors du rendu du template: {str(e)} ===")
        return f"Erreur lors du chargement des paramètres: {str(e)}", 500

@settings_bp.route('/formula_panel', methods=['GET'])
def get_formula_settings_panel():
    """
    Retourne le template HTML pour les paramètres du Formula Solver
    """
    logger.info("=== DEBUG: Route /api/settings/formula_panel appelée ===")
    try:
        html = render_template('settings/formula_settings.html')
        logger.info("=== DEBUG: Template des paramètres Formula Solver rendu avec succès ===")
        return html
    except Exception as e:
        logger.error(f"=== ERREUR lors du rendu du template: {str(e)} ===")
        return f"Erreur lors du chargement des paramètres: {str(e)}", 500

@settings_bp.route('/general', methods=['GET'])
def get_general_settings():
    """
    Récupère les paramètres généraux
    """
    logger.info("=== DEBUG: Route /api/settings/general appelée ===")
    try:
        settings = {
            'auto_mark_solved': AppConfig.get_value('auto_mark_solved', True),
            'auto_correct_coordinates': AppConfig.get_value('auto_correct_coordinates', True)
        }
        
        logger.info(f"=== DEBUG: Paramètres récupérés: {settings} ===")
        return jsonify({
            'success': True,
            'settings': settings
        })
    except Exception as e:
        logger.error(f"=== ERREUR lors de la récupération des paramètres: {str(e)} ===")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@settings_bp.route('/formula', methods=['GET'])
def get_formula_settings():
    """
    Récupère les paramètres du Formula Solver
    """
    logger.info("=== DEBUG: Route /api/settings/formula appelée ===")
    try:
        settings = {
            'formula_extraction_method': AppConfig.get_value('formula_extraction_method', 'regex'),
            'question_extraction_method': AppConfig.get_value('question_extraction_method', 'regex')
        }
        
        logger.info(f"=== DEBUG: Paramètres Formula Solver récupérés: {settings} ===")
        return jsonify({
            'success': True,
            'settings': settings
        })
    except Exception as e:
        logger.error(f"=== ERREUR lors de la récupération des paramètres Formula Solver: {str(e)} ===")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@settings_bp.route('/general/save', methods=['POST'])
def save_general_settings():
    """
    Enregistre les paramètres généraux
    """
    try:
        data = request.get_json()
        logger.info(f"=== DEBUG: Données reçues pour enregistrement: {data} ===")
        
        # Valider les données
        if not isinstance(data, dict):
            return jsonify({
                'success': False,
                'error': 'Format de données invalide'
            }), 400
        
        # Enregistrer les paramètres
        AppConfig.set_value(
            'auto_mark_solved', 
            data.get('auto_mark_solved', True),
            category='general',
            description='Marquer automatiquement une géocache comme "résolue" quand on corrige les coordonnées'
        )
        
        AppConfig.set_value(
            'auto_correct_coordinates', 
            data.get('auto_correct_coordinates', True),
            category='general',
            description='Dans le Solver, corriger automatiquement les coordonnées quand on trouve des coordonnées valides'
        )
        
        logger.info("=== DEBUG: Paramètres enregistrés avec succès ===")
        return jsonify({
            'success': True,
            'message': 'Paramètres enregistrés avec succès'
        })
        
    except Exception as e:
        logger.error(f"=== ERREUR lors de l'enregistrement des paramètres: {str(e)} ===")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@settings_bp.route('/formula/save', methods=['POST'])
def save_formula_settings():
    """
    Enregistre les paramètres du Formula Solver
    """
    try:
        data = request.get_json()
        logger.info(f"=== DEBUG: Données reçues pour enregistrement Formula Solver: {data} ===")
        
        # Valider les données
        if not isinstance(data, dict):
            return jsonify({
                'success': False,
                'error': 'Format de données invalide'
            }), 400
        
        # Récupérer les méthodes d'extraction
        formula_extraction_method = data.get('formula_extraction_method', 'regex')
        question_extraction_method = data.get('question_extraction_method', 'regex')
        
        logger.info(f"=== DEBUG: Méthode d'extraction de formule à enregistrer: {formula_extraction_method} ===")
        logger.info(f"=== DEBUG: Méthode d'extraction de question à enregistrer: {question_extraction_method} ===")
        
        # Enregistrer les paramètres
        result1 = AppConfig.set_value(
            'formula_extraction_method', 
            formula_extraction_method,
            category='formula',
            description='Méthode d\'extraction des formules (ia ou regex)'
        )
        
        result2 = AppConfig.set_value(
            'question_extraction_method', 
            question_extraction_method,
            category='formula',
            description='Méthode d\'extraction des questions (ia ou regex)'
        )
        
        # Vérifier l'enregistrement
        saved_formula_value = AppConfig.get_value('formula_extraction_method', 'regex')
        saved_question_value = AppConfig.get_value('question_extraction_method', 'regex')
        
        logger.info(f"=== DEBUG: Valeur de formule enregistrée en base: {saved_formula_value} ===")
        logger.info(f"=== DEBUG: Valeur de question enregistrée en base: {saved_question_value} ===")
        
        logger.info("=== DEBUG: Paramètres Formula Solver enregistrés avec succès ===")
        return jsonify({
            'success': True,
            'message': 'Paramètres enregistrés avec succès',
            'saved_values': {
                'formula_extraction_method': saved_formula_value,
                'question_extraction_method': saved_question_value
            }
        })
        
    except Exception as e:
        logger.error(f"=== ERREUR lors de l'enregistrement des paramètres Formula Solver: {str(e)} ===")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@settings_bp.route('/param/<param_name>', methods=['GET'])
def get_specific_param(param_name):
    """
    Récupère la valeur d'un paramètre spécifique par son nom
    """
    logger.info(f"=== DEBUG: Route /api/settings/param/{param_name} appelée ===")
    try:
        value = AppConfig.get_value(param_name)
        logger.info(f"=== DEBUG: Valeur récupérée pour {param_name}: {value} ===")
        return jsonify({
            'success': True,
            'key': param_name,
            'value': value
        })
    except Exception as e:
        logger.error(f"=== ERREUR lors de la récupération du paramètre {param_name}: {str(e)} ===")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@settings_bp.route('/param/debug/set/<param_name>/<param_value>', methods=['GET'])
def debug_set_param(param_name, param_value):
    """
    Route de débogage pour définir rapidement un paramètre
    """
    logger.info(f"=== DEBUG: Route de débogage pour définir {param_name}={param_value} ===")
    try:
        # Convertir param_value au format approprié
        if param_value.lower() == 'true':
            value = True
        elif param_value.lower() == 'false':
            value = False
        elif param_value.isdigit():
            value = int(param_value)
        else:
            value = param_value
            
        # Enregistrer la valeur
        AppConfig.set_value(param_name, value, category='general')
        
        logger.info(f"=== DEBUG: Paramètre {param_name} défini à {value} ===")
        return jsonify({
            'success': True,
            'message': f"Paramètre {param_name} défini à {value}"
        })
    except Exception as e:
        logger.error(f"=== ERREUR lors de la définition du paramètre {param_name}: {str(e)} ===")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 