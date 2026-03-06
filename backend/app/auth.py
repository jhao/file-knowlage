from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import Blueprint, current_app, g, jsonify, request

from .extensions import db
from .models import OperationLog, User

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

ROLE_PERMISSIONS = {
    "管理员": {
        "canView": True,
        "canImport": True,
        "canExport": True,
        "canModify": True,
        "canDelete": True,
        "canApprove": True,
    },
    "普通用户": {
        "canView": True,
        "canImport": True,
        "canExport": False,
        "canModify": False,
        "canDelete": False,
        "canApprove": False,
    },
}


def _generate_token(user: User) -> str:
    expires_in_hours = int(current_app.config.get("JWT_EXPIRES_HOURS", 8))
    expire_at = datetime.now(timezone.utc) + timedelta(hours=expires_in_hours)
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role,
        "exp": expire_at,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")


def _decode_token(raw_token: str) -> dict:
    return jwt.decode(raw_token, current_app.config["SECRET_KEY"], algorithms=["HS256"])


def log_action(action: str, target_type: str = "", target_id: str = "", detail: str = "") -> None:
    current_user = getattr(g, "current_user", None)
    db.session.add(
        OperationLog(
            user_id=current_user.id if current_user else None,
            log_type="ACTION",
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id else None,
            detail=detail,
        )
    )
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()


def log_ai_api_call(action: str, detail: str = "", target_id: str = "") -> None:
    current_user = getattr(g, "current_user", None)
    db.session.add(
        OperationLog(
            user_id=current_user.id if current_user else None,
            log_type="AI_API",
            action=action,
            target_type="ai",
            target_id=str(target_id) if target_id else None,
            detail=detail,
        )
    )
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()


def login_required(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"message": "缺少或无效的 Authorization 头"}), 401

        token = auth_header.split(" ", 1)[1].strip()
        if not token:
            return jsonify({"message": "访问令牌为空"}), 401

        try:
            payload = _decode_token(token)
            user = db.session.get(User, int(payload["sub"]))
            if user is None or not user.is_active:
                return jsonify({"message": "用户不存在或已禁用"}), 401
            g.current_user = user
            g.permissions = ROLE_PERMISSIONS.get(user.role, {})
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "登录已过期，请重新登录"}), 401
        except (jwt.InvalidTokenError, ValueError):
            return jsonify({"message": "无效的访问令牌"}), 401

        return view_func(*args, **kwargs)

    return wrapper


def require_permission(permission_key: str):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(*args, **kwargs):
            if not getattr(g, "permissions", {}).get(permission_key, False):
                return jsonify({"message": "权限不足"}), 403
            return view_func(*args, **kwargs)

        return wrapper

    return decorator


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password_digest = (data.get("passwordDigest") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or (not password_digest and not password):
        return jsonify({"message": "用户名和密码不能为空"}), 400

    user = User.query.filter_by(username=username).first()
    password_valid = False
    if user is not None:
        if password_digest:
            password_valid = user.check_password(password_digest)
        if not password_valid and password:
            password_valid = user.check_password(password)
    if user is None or not password_valid:
        return jsonify({"message": "用户名或密码错误"}), 401

    token = _generate_token(user)
    g.current_user = user
    log_action("LOGIN", "user", str(user.id), "用户登录")
    return jsonify({"accessToken": token, "user": user.to_dict()})




@bp.post("/change-password")
@login_required
def change_password():
    data = request.get_json(silent=True) or {}
    old_password_digest = str(data.get("oldPasswordDigest") or "").strip()
    new_password_digest = str(data.get("newPasswordDigest") or "").strip()

    if not old_password_digest or not new_password_digest:
        return jsonify({"message": "旧密码和新密码不能为空"}), 400

    user = g.current_user
    if not user.check_password(old_password_digest):
        return jsonify({"message": "旧密码错误"}), 400

    user.set_password(new_password_digest)
    db.session.commit()
    log_action("CHANGE_PASSWORD", "user", str(user.id), "用户修改密码")
    return jsonify({"message": "密码修改成功"})

@bp.get("/me")
@login_required
def me():
    user = g.current_user
    return jsonify({"user": user.to_dict(), "permissions": g.permissions})
