from flask import Blueprint, jsonify
import uuid

from .auth import log_action, log_ai_api_call, login_required, require_permission
from .extensions import db
from .models import AITask, Archive, OperationLog

bp = Blueprint("tasks", __name__, url_prefix="/api/tasks")


@bp.get("")
@login_required
def list_tasks():
    tasks = AITask.query.order_by(AITask.created_at.desc()).all()
    return jsonify(
        {
            "items": [
                {
                    "taskId": t.task_id,
                    "archiveId": t.archive_id,
                    "taskType": t.task_type,
                    "status": t.status,
                    "message": t.result_message,
                    "retryCount": t.retry_count,
                    "updatedAt": t.updated_at.isoformat(),
                }
                for t in tasks
            ]
        }
    )


@bp.get('/<task_id>/logs')
@login_required
def list_task_logs(task_id: str):
    logs = (
        OperationLog.query.filter(OperationLog.target_id == task_id)
        .order_by(OperationLog.created_at.desc())
        .all()
    )

    return jsonify(
        {
            "items": [
                {
                    "id": item.id,
                    "type": item.log_type,
                    "action": item.action,
                    "detail": item.detail,
                    "targetId": item.target_id,
                    "createdAt": item.created_at.isoformat(),
                }
                for item in logs
            ]
        }
    )


@bp.delete('/<task_id>')
@login_required
@require_permission("canDelete")
def delete_task(task_id: str):
    task = AITask.query.filter_by(task_id=task_id).first_or_404()
    archive = db.session.get(Archive, task.archive_id)

    task.status = "DELETED"
    task.result_message = "任务已删除，状态转为等待人工校验"
    if archive is not None:
        archive.status = "等待人工校验"

    db.session.commit()
    log_action("TASK_DELETE", "ai_task", task_id, f"删除后台任务 {task_id}，档案转为等待人工校验")
    return jsonify({"message": "任务已删除"})


@bp.post('/<task_id>/retry')
@login_required
@require_permission("canModify")
def retry_task(task_id: str):
    task = AITask.query.filter_by(task_id=task_id).first_or_404()
    archive = db.session.get(Archive, task.archive_id)
    if archive is None:
        return jsonify({"message": "关联档案不存在"}), 404

    new_task_id = f"task-{uuid.uuid4().hex[:12]}"
    new_task = AITask(
        task_id=new_task_id,
        archive_id=archive.id,
        task_type=task.task_type,
        status="PENDING",
        retry_count=task.retry_count + 1,
        result_message=f"由任务 {task.task_id} 发起重试，等待处理",
    )
    archive.status = "PROCESSING"
    db.session.add(new_task)
    db.session.commit()
    log_ai_api_call("AI_PARSE_RETRY", f"任务 {task.task_id} 重试为新任务 {new_task_id}", new_task_id)
    log_action("TASK_RETRY", "ai_task", task_id, f"重试任务并创建 {new_task_id}")
    return jsonify({"taskId": new_task_id, "message": "任务已重试"})
