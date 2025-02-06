from flask import Blueprint, render_template

main = Blueprint('main', __name__)

@main.route('/')
def index():
    print("Route '/' appelée")
    try:
        return render_template('index.html')
    except Exception as e:
        print(f"Erreur lors du rendu du template : {e}")
        raise
