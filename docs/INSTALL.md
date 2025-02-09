# Guide d'Installation MysteryAI

Ce guide vous aidera à installer et configurer MysteryAI pour le développement et la production.

## Prérequis

- Python 3.8 ou supérieur
- Node.js 14 ou supérieur
- npm ou yarn
- Git

## Installation

### 1. Cloner le Projet

```bash
git clone <url-du-repo>
cd MysteryAI
```

### 2. Configuration de l'Environnement Python

```bash
# Créer un environnement virtuel
python -m venv venv

# Activer l'environnement virtuel
# Sur Windows
venv\Scripts\activate
# Sur Unix
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt
```

### 3. Configuration de l'Application

```bash
# Copier le fichier de configuration exemple
cp config.example.py config.py

# Éditer config.py avec vos paramètres
# Notamment :
# - SECRET_KEY
# - SQLALCHEMY_DATABASE_URI
# - GEOCACHING_API_KEY (si nécessaire)
```

### 4. Configuration de la Base de Données

```bash
# Initialiser la base de données
flask db upgrade
```

### 5. Installation des Dépendances Frontend

```bash
# Dans le dossier electron
cd electron
npm install
```

## Lancement en Développement

### 1. Serveur Flask

```bash
# Dans le dossier racine, avec l'environnement virtuel activé
flask run --port 3000
```

### 2. Application Electron

```bash
# Dans un autre terminal, dossier electron
npm start
```

## Construction pour la Production

### 1. Backend

```bash
# Configurer pour la production
export FLASK_ENV=production
# ou sur Windows
set FLASK_ENV=production

# Lancer avec gunicorn (Linux/Mac)
gunicorn -w 4 -b 127.0.0.1:3000 "app:create_app()"
# ou avec waitress (Windows)
waitress-serve --port=3000 "app:create_app()"
```

### 2. Application Electron

```bash
cd electron
npm run build
```

Les fichiers d'installation seront créés dans le dossier `electron/dist`.

## Configuration du Port

L'application utilise le port 3000 par défaut. Ce choix est important car :

1. Il est utilisé dans la configuration Electron
2. Il est différent du port par défaut de Flask (5000)
3. Il évite les conflits avec d'autres services courants

Pour changer le port :

1. Modifier `PORT` dans `config.py`
2. Mettre à jour `API_BASE_URL` dans `templates/index.html`
3. Mettre à jour la configuration Electron dans `electron/main.js`

## Résolution des Problèmes Courants

### Erreur "Address already in use"

```bash
# Trouver le processus utilisant le port 3000
# Sur Windows
netstat -ano | findstr :3000
# Sur Unix
lsof -i :3000

# Arrêter le processus
# Sur Windows
taskkill /PID <PID> /F
# Sur Unix
kill -9 <PID>
```

### Erreur de connexion dans Electron

1. Vérifier que le serveur Flask est lancé sur le port 3000
2. Vérifier que `API_BASE_URL` est correctement configuré
3. Vérifier les logs Electron pour plus de détails

## Support

Pour obtenir de l'aide :

1. Consulter la documentation dans le dossier `docs/`
2. Ouvrir une issue sur le dépôt Git
3. Contacter l'équipe de développement
