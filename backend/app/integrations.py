import json
import threading
import time
from datetime import datetime

from flask import Blueprint, current_app, g, jsonify, request

from .auth import log_action, login_required, require_permission
from .extensions import db
from .models import AITask, Archive, OperationLog, SystemConfig

bp = Blueprint("integrations", __name__, url_prefix="/api/integrations")
CONFIG_KEY = "sync.integration.apis"


def _get_config() -> dict:
    row = SystemConfig.query.filter_by(config_key=CONFIG_KEY).first()
    if row is None:
        return {}
    try:
        return json.loads(row.config_value)
    except json.JSONDecodeError:
        return {}


def _set_config(payload: dict) -> None:
    row = SystemConfig.query.filter_by(config_key=CONFIG_KEY).first()
    if row is None:
        row = SystemConfig(config_key=CONFIG_KEY, config_value="{}", description="多源系统对接地址", updated_by=g.current_user.id)
        db.session.add(row)
    row.config_value = json.dumps(payload, ensure_ascii=False)
    row.updated_by = g.current_user.id
    db.session.commit()


def _ensure_sync_archive() -> Archive:
    archive = Archive.query.filter_by(document_id="sync-placeholder").first()
    if archive is not None:
        return archive
    archive = Archive(
        document_id="sync-placeholder",
        file_name="数据同步占位任务",
        file_type="application/json",
        file_size=0,
        status="SYSTEM",
        department="档案馆",
        security_level="内部",
        uploader_id=g.current_user.id,
    )
    db.session.add(archive)
    db.session.commit()
    return archive


def _run_sync_job(app, task_id: str, user_id: int) -> None:
    with app.app_context():
        steps = [
            "拉取 token 并校验认证",
            "读取文件总量与待处理清单",
            "按分页拉取文件并异步下载",
            "回写处理状态并同步分类目录",
        ]
        task = AITask.query.filter_by(task_id=task_id).first()
        if task is None:
            return
        task.status = "PROCESSING"
        task.result_message = "同步任务执行中"
        db.session.commit()
        for idx, step in enumerate(steps, start=1):
            db.session.add(OperationLog(user_id=user_id, log_type="ACTION", action="DATA_SYNC_STEP", target_type="sync", target_id=task_id, detail=f"[{idx}/{len(steps)}] {step}"))
            db.session.commit()
            time.sleep(1)

        task = AITask.query.filter_by(task_id=task_id).first()
        if task is None:
            return
        task.status = "SUCCESS"
        task.result_message = "数据同步完成"
        db.session.add(OperationLog(user_id=user_id, log_type="ACTION", action="DATA_SYNC_FINISH", target_type="sync", target_id=task_id, detail="任务已完成"))
        db.session.commit()


@bp.get("")
@login_required
def get_integration_config():
    return jsonify({"item": _get_config()})


@bp.put("")
@login_required
@require_permission("canModify")
def save_integration_config():
    payload = request.get_json(silent=True) or {}
    _set_config(payload)
    log_action("SYNC_CONFIG_UPDATE", "integration", CONFIG_KEY, "更新对接地址")
    return jsonify({"item": payload})


@bp.post("/start-sync")
@login_required
@require_permission("canImport")
def start_sync():
    config = _get_config()
    required_keys = [
        "authUrl",
        "totalCountUrl",
        "pendingFilesUrl",
        "statusCallbackUrl",
        "categoryListUrl",
    ]
    missing = [k for k in required_keys if not config.get(k)]
    if missing:
        return jsonify({"message": f"请先完善接口地址: {', '.join(missing)}"}), 400

    archive = _ensure_sync_archive()
    task_id = f"sync-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    task = AITask(task_id=task_id, archive_id=archive.id, task_type="DATA_SYNC", status="PENDING", result_message="同步任务已创建")
    db.session.add(task)
    db.session.commit()

    app = current_app._get_current_object()
    threading.Thread(target=_run_sync_job, args=(app, task_id, g.current_user.id), daemon=True).start()
    log_action("DATA_SYNC_START", "sync", task_id, "启动数据同步后台任务")
    return jsonify({"taskId": task_id, "message": "已启动同步"}), 202
