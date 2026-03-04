import json
from urllib import error, request as urllib_request

from flask import Blueprint, g, jsonify, request

from .auth import log_action, login_required, require_permission
from .extensions import db
from .models import SystemConfig

bp = Blueprint("settings", __name__, url_prefix="/api/settings")



DEFAULT_PROVIDER_MODELS = {
    "kimi": "moonshot-v1-8k",
    "qwen": "qwen-plus",
    "glm": "glm-4-flash",
    "deepseek": "deepseek-chat",
    "openai": "gpt-4o-mini",
    "local": "llama3.1:8b",
}


def _build_curl_command(url: str, api_key: str, payload: dict) -> str:
    payload_json = json.dumps(payload, ensure_ascii=False)
    escaped_payload = payload_json.replace("'", "'\''")
    return (
        "curl -X POST "
        f"'{url}' "
        "-H 'Content-Type: application/json' "
        f"-H 'Authorization: Bearer {api_key}' "
        f"-d '{escaped_payload}'"
    )

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


@bp.delete("/<string:config_key>")
@login_required
@require_permission("canModify")
def delete_config(config_key: str):
    config = SystemConfig.query.filter_by(config_key=config_key).first()
    if config is None:
        return jsonify({"message": "配置不存在"}), 404
    db.session.delete(config)
    db.session.commit()
    log_action("CONFIG_DELETE", "system_config", config_key, "删除系统配置")
    return jsonify({"message": "删除成功"})


@bp.post("/llm/test")
@login_required
@require_permission("canModify")
def test_llm_config():
    data = request.get_json(silent=True) or {}
    provider = str(data.get("provider") or "").strip().lower()
    base_url = str(data.get("baseUrl") or "").strip()
    api_key = str(data.get("apiKey") or "").strip()
    model = str(data.get("model") or DEFAULT_PROVIDER_MODELS.get(provider, "gpt-4o-mini")).strip()

    if not provider or not base_url:
        return jsonify({"success": False, "message": "缺少 provider 或 baseUrl"}), 400
    if not api_key:
        return jsonify({"success": False, "message": "请填写 API Key"}), 400

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "你是档案系统连通性测试助手。"},
            {"role": "user", "content": "请回复：连接测试成功"},
        ],
        "temperature": 0,
        "max_tokens": 16,
    }
    request_url = f"{base_url.rstrip('/')}/chat/completions"
    request_payload_text = json.dumps(payload, ensure_ascii=False)
    curl_command = _build_curl_command(request_url, api_key, payload)

    req = urllib_request.Request(
        url=request_url,
        data=request_payload_text.encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with urllib_request.urlopen(req, timeout=20) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            message = (
                body.get("choices", [{}])[0].get("message", {}).get("content")
                if isinstance(body, dict)
                else ""
            )
            log_action("LLM_TEST", "system_config", provider, "测试大模型配置成功")
            return jsonify(
                {
                    "success": True,
                    "message": str(message or "测试调用成功")[:300],
                    "provider": provider,
                    "request": {
                        "url": request_url,
                        "payload": payload,
                        "curl": curl_command,
                    },
                    "response": body,
                }
            )
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")[:600]
        return (
            jsonify(
                {
                    "success": False,
                    "message": f"HTTP {exc.code}",
                    "detail": detail or str(exc),
                    "request": {
                        "url": request_url,
                        "payload": payload,
                        "curl": curl_command,
                    },
                }
            ),
            400,
        )
    except Exception as exc:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "测试调用失败",
                    "detail": str(exc)[:600],
                    "request": {
                        "url": request_url,
                        "payload": payload,
                        "curl": curl_command,
                    },
                }
            ),
            400,
        )
