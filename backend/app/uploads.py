import uuid

from flask import Blueprint, g, jsonify, request

from .auth import log_action, login_required, require_permission
from .extensions import db
from .models import AITask, Archive

bp = Blueprint("uploads", __name__, url_prefix="/api/uploads")


@bp.post("")
@login_required
@require_permission("canImport")
def create_upload():
    data = request.get_json(silent=True) or {}
    file_name = (data.get("fileName") or "").strip()
    if not file_name:
        return jsonify({"message": "fileName 不能为空"}), 400

    archive = Archive(
        document_id=f"doc-{uuid.uuid4().hex[:12]}",
        file_name=file_name,
        file_type=data.get("fileType") or "application/octet-stream",
        file_size=int(data.get("fileSize") or 0),
        folder_path=data.get("path"),
        storage_path=data.get("storagePath") or f"uploads/{file_name}",
        status="PROCESSING",
        department=g.current_user.department,
        uploader_id=g.current_user.id,
    )
    db.session.add(archive)
    db.session.flush()

    task = AITask(
        task_id=f"task-{uuid.uuid4().hex[:12]}",
        archive_id=archive.id,
        task_type="PARSE",
        status="PENDING",
        result_message="任务已创建，等待处理",
    )
    db.session.add(task)
    db.session.commit()
    log_action("UPLOAD_CREATE", "archive", archive.document_id, f"上传文件 {archive.file_name}")
    return jsonify({"archive": archive.to_dict(), "taskId": task.task_id}), 201
