import os

from flask import Flask, jsonify
from flask_cors import CORS

from .archives import bp as archives_bp
from .auth import bp as auth_bp
from .extensions import db
from .reviews import bp as reviews_bp
from .search import bp as search_bp
from .settings import bp as settings_bp
from .stats import bp as stats_bp
from .tasks import bp as tasks_bp
from .uploads import bp as uploads_bp
from .users import bp as users_bp


def create_app() -> Flask:
    app = Flask(__name__, instance_relative_config=True)

    app.config.from_mapping(
        SECRET_KEY=os.environ.get("SECRET_KEY", "change-me"),
        SQLALCHEMY_DATABASE_URI=os.environ.get(
            "DATABASE_URI", f"sqlite:///{os.path.join(app.instance_path, 'ailibrary.sqlite')}"
        ),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JWT_EXPIRES_HOURS=int(os.environ.get("JWT_EXPIRES_HOURS", 8)),
        MAX_CONTENT_LENGTH=int(os.environ.get("MAX_CONTENT_LENGTH", 1024 * 1024 * 1024)),
    )

    os.makedirs(app.instance_path, exist_ok=True)

    CORS(app, resources={r"/api/*": {"origins": "*"}})
    db.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(archives_bp)
    app.register_blueprint(uploads_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(reviews_bp)
    app.register_blueprint(search_bp)
    app.register_blueprint(stats_bp)
    app.register_blueprint(settings_bp)

    @app.get("/api/health")
    def health_check():
        return jsonify({"status": "ok"})

    from . import cli

    cli.init_app(app)

    return app
