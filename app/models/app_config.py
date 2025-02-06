from datetime import datetime
from app.database import db
import json

class AppConfig(db.Model):
    __bind_key__ = 'config'  # Utilise la base de données app_config.db
    
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), nullable=False, unique=True)
    value = db.Column(db.Text)
    value_type = db.Column(db.String(20), nullable=False)  # str, int, float, bool, json
    category = db.Column(db.String(50), nullable=False)    # ai_model, api_key, general
    description = db.Column(db.Text)
    is_secret = db.Column(db.Boolean, default=False)       # Pour les clés API et autres données sensibles
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @staticmethod
    def get_value(key, default=None):
        config = AppConfig.query.filter_by(key=key).first()
        if not config:
            return default
        
        if config.value_type == 'int':
            return int(config.value)
        elif config.value_type == 'float':
            return float(config.value)
        elif config.value_type == 'bool':
            return config.value.lower() == 'true'
        elif config.value_type == 'json':
            return json.loads(config.value)
        return config.value

    @staticmethod
    def set_value(key, value, category='general', description=None, is_secret=False):
        config = AppConfig.query.filter_by(key=key).first()
        value_type = type(value).__name__
        if isinstance(value, dict):
            value = json.dumps(value)
            value_type = 'json'
        
        if not config:
            config = AppConfig(
                key=key,
                value=str(value),
                value_type=value_type,
                category=category,
                description=description,
                is_secret=is_secret
            )
            db.session.add(config)
        else:
            config.value = str(value)
            config.value_type = value_type
            config.updated_at = datetime.utcnow()
        
        db.session.commit()
        return config
