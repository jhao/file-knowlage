from flask import Blueprint, jsonify

from .auth import login_required
from .models import AITask

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
