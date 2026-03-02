import os

from flask import Flask, jsonify
from flask_cors import CORS

from .auth import bp as auth_bp
from .extensions import db


def create_app() -> Flask:
    app = Flask(__name__, instance_relative_config=True)

    app.config.from_mapping(
        SECRET_KEY=os.environ.get("SECRET_KEY", "change-me"),
        SQLALCHEMY_DATABASE_URI=os.environ.get(
            "DATABASE_URI", f"sqlite:///{os.path.join(app.instance_path, 'ailibrary.sqlite')}"
        ),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JWT_EXPIRES_HOURS=int(os.environ.get("JWT_EXPIRES_HOURS", 8)),
    )

    os.makedirs(app.instance_path, exist_ok=True)

    CORS(app, resources={r"/api/*": {"origins": "*"}})
    db.init_app(app)

    app.register_blueprint(auth_bp)

    @app.get("/api/health")
    def health_check():
        return jsonify({"status": "ok"})

    from . import cli

    cli.init_app(app)

    return app
