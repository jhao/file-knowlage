from flask import Blueprint, jsonify, request

from .auth import log_action, login_required, require_permission
from .extensions import db
from .models import User

bp = Blueprint("users", __name__, url_prefix="/api/users")


@bp.get("")
@login_required
@require_permission("canView")
def list_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({"items": [user.to_dict() for user in users], "total": len(users)})


@bp.post("")
@login_required
@require_permission("canModify")
def create_user():
    data = request.get_json(silent=True) or {}
    if not data.get("username") or not data.get("password"):
        return jsonify({"message": "username/password 必填"}), 400
    if User.query.filter_by(username=data["username"]).first() is not None:
        return jsonify({"message": "用户名已存在"}), 400

    user = User(
        username=data["username"],
        display_name=data.get("displayName") or data["username"],
        role=data.get("role") or "普通用户",
        department=data.get("department") or "档案馆",
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()
    log_action("USER_CREATE", "user", str(user.id), f"创建用户 {user.username}")
    return jsonify({"item": user.to_dict()}), 201


@bp.put("/<int:user_id>")
@login_required
@require_permission("canModify")
def update_user(user_id: int):
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify({"message": "用户不存在"}), 404
    data = request.get_json(silent=True) or {}
    user.display_name = data.get("displayName", user.display_name)
    user.role = data.get("role", user.role)
    user.department = data.get("department", user.department)
    if "isActive" in data:
        user.is_active = bool(data["isActive"])
    if data.get("password"):
        user.set_password(data["password"])
    db.session.commit()
    log_action("USER_UPDATE", "user", str(user.id), f"更新用户 {user.username}")
    return jsonify({"item": user.to_dict()})
