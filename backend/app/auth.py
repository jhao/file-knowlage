from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import Blueprint, current_app, g, jsonify, request

from .models import User

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


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
            user = User.query.get(int(payload["sub"]))
            if user is None:
                return jsonify({"message": "用户不存在"}), 401
            g.current_user = user
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "登录已过期，请重新登录"}), 401
        except (jwt.InvalidTokenError, ValueError):
            return jsonify({"message": "无效的访问令牌"}), 401

        return view_func(*args, **kwargs)

    return wrapper


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not password:
        return jsonify({"message": "用户名和密码不能为空"}), 400

    user = User.query.filter_by(username=username).first()
    if user is None or not user.check_password(password):
        return jsonify({"message": "用户名或密码错误"}), 401

    token = _generate_token(user)
    return jsonify({"accessToken": token, "user": user.to_dict()})


@bp.get("/me")
@login_required
def me():
    user = g.current_user
    return jsonify({"user": user.to_dict()})
