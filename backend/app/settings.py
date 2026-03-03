from flask import Blueprint, g, jsonify, request

from .auth import log_action, login_required, require_permission
from .extensions import db
from .models import SystemConfig

bp = Blueprint("settings", __name__, url_prefix="/api/settings")


@bp.get("")
@login_required
def list_configs():
    configs = SystemConfig.query.order_by(SystemConfig.config_key.asc()).all()
    return jsonify(
        {
            "items": [
                {
                    "key": c.config_key,
                    "value": c.config_value,
                    "description": c.description,
                    "updatedAt": c.updated_at.isoformat(),
                }
                for c in configs
            ]
        }
    )


@bp.put("/<string:config_key>")
@login_required
@require_permission("canModify")
def put_config(config_key: str):
    data = request.get_json(silent=True) or {}
    config = SystemConfig.query.filter_by(config_key=config_key).first()
    if config is None:
        config = SystemConfig(config_key=config_key, config_value="", updated_by=g.current_user.id)
        db.session.add(config)
    config.config_value = str(data.get("value") or "")
    config.description = data.get("description")
    config.updated_by = g.current_user.id
    db.session.commit()
    log_action("CONFIG_UPDATE", "system_config", config_key, "更新系统配置")
    return jsonify({"key": config.config_key, "value": config.config_value})
