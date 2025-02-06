from flask import Blueprint, jsonify, request

geocaches = Blueprint('geocaches', __name__, url_prefix='/geocaches')

@geocaches.route('/')
def list_geocaches():
    return jsonify({"message": "Liste des géocaches"})
