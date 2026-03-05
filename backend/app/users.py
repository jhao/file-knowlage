from flask import Blueprint, g, jsonify, request

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
    password = (data.get("password") or "").strip()
    password_digest = (data.get("passwordDigest") or "").strip()
    if not data.get("username") or (not password and not password_digest):
        return jsonify({"message": "username/password 必填"}), 400
    if User.query.filter_by(username=data["username"]).first() is not None:
        return jsonify({"message": "用户名已存在"}), 400

    user = User(
        username=data["username"],
        display_name=data.get("displayName") or data["username"],
        role=data.get("role") or "普通用户",
        department=data.get("department") or "档案馆",
        is_active=bool(data.get("isActive", True)),
    )
    user.set_password(password_digest or password)
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
    password = (data.get("password") or "").strip()
    password_digest = (data.get("passwordDigest") or "").strip()
    if password_digest or password:
        user.set_password(password_digest or password)
    db.session.commit()
    log_action("USER_UPDATE", "user", str(user.id), f"更新用户 {user.username}")
    return jsonify({"item": user.to_dict()})


@bp.delete("/<int:user_id>")
@login_required
@require_permission("canDelete")
def delete_user(user_id: int):
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify({"message": "用户不存在"}), 404
    if user.id == g.current_user.id:
        return jsonify({"message": "不能删除当前登录用户"}), 400

    username = user.username
    db.session.delete(user)
    db.session.commit()
    log_action("USER_DELETE", "user", str(user_id), f"删除用户 {username}")
    return jsonify({"message": "删除成功"})
