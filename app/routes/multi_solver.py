from flask import Blueprint, render_template, request, jsonify
import logging
import json
import urllib.parse

logger = logging.getLogger(__name__)

multi_solver_bp = Blueprint('multi_solver', __name__)

@multi_solver_bp.route('/multi-solver', methods=['GET'])
def multi_solver_panel():
    """
    Affiche le panneau du multi-solver pour plusieurs géocaches
    """
    geocaches_param = request.args.get('geocaches')
    
    logger.debug(f"Paramètres de requête multi_solver: {dict(request.args)}")
    logger.debug(f"Paramètre geocaches: {geocaches_param}")
    
    geocaches = []
    if geocaches_param:
        try:
            # Essayer de décoder les géocaches depuis le paramètre URL
            geocaches = json.loads(urllib.parse.unquote(geocaches_param))
            logger.info(f"Multi-solver: {len(geocaches)} géocaches chargées depuis les paramètres")
        except Exception as e:
            logger.error(f"Erreur lors du décodage des géocaches: {str(e)}")
    
    # Passer les géocaches au template
    return render_template('multi_solver.html', geocaches=json.dumps(geocaches)) 