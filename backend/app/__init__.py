import os
from time import perf_counter

from flask import Flask, g, jsonify, request
from flask_cors import CORS

from .archives import bp as archives_bp
from .auth import bp as auth_bp
from .extensions import db
from .logs import bp as logs_bp
from .models import OperationLog
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
    app.register_blueprint(logs_bp)

    @app.before_request
    def _start_timer():
        g.request_started_at = perf_counter()

    @app.after_request
    def _record_api_log(response):
        if not request.path.startswith("/api"):
            return response
        try:
            elapsed_ms = int((perf_counter() - getattr(g, "request_started_at", perf_counter())) * 1000)
            current_user = getattr(g, "current_user", None)
            db.session.add(
                OperationLog(
                    user_id=current_user.id if current_user else None,
                    log_type="BACKEND_API",
                    action="API_REQUEST",
                    detail=f"{request.method} {request.path}",
                    method=request.method,
                    path=request.path,
                    status_code=response.status_code,
                    duration_ms=elapsed_ms,
                )
            )
            db.session.commit()
        except Exception:
            db.session.rollback()
        return response

    @app.get("/api/health")
    def health_check():
        return jsonify({"status": "ok"})

    from . import cli

    cli.init_app(app)

    return app
