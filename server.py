from app import create_app

app = create_app()

@app.route('/test')
def test():
    return 'Test route works!'

if __name__ == '__main__':
    print("Routes enregistrées :")
    for rule in app.url_map.iter_rules():
        print(f"{rule.endpoint}: {rule.rule}")
    
    # Utiliser SocketIO pour le serveur si disponible
    if hasattr(app, 'socketio'):
        print("Démarrage du serveur avec WebSocket support...")
        app.socketio.run(app, host='0.0.0.0', port=3000, debug=True, allow_unsafe_werkzeug=True)
    else:
        print("Démarrage du serveur Flask classique...")
        app.run(host='0.0.0.0', port=3000, debug=True)
