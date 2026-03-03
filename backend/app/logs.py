from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request

from .auth import login_required
from .models import OperationLog

bp = Blueprint("logs", __name__, url_prefix="/api/logs")


@bp.get("")
@login_required
def list_logs():
    log_type = (request.args.get("type") or "").strip().upper()
    start_date = (request.args.get("startDate") or "").strip()
    end_date = (request.args.get("endDate") or "").strip()
    limit = request.args.get("limit", type=int) or 100
    page = max(request.args.get("page", type=int) or 1, 1)

    limit = max(1, min(limit, 99999))

    query = OperationLog.query

    if log_type and log_type != "ALL":
        query = query.filter(OperationLog.log_type == log_type)

    if start_date:
        try:
            start_at = datetime.fromisoformat(start_date)
            query = query.filter(OperationLog.created_at >= start_at)
        except ValueError:
            return jsonify({"message": "startDate 格式错误，应为 YYYY-MM-DD 或 ISO 时间"}), 400

    if end_date:
        try:
            end_at = datetime.fromisoformat(end_date)
            if len(end_date) == 10:
                end_at = end_at + timedelta(days=1)
            query = query.filter(OperationLog.created_at <= end_at)
        except ValueError:
            return jsonify({"message": "endDate 格式错误，应为 YYYY-MM-DD 或 ISO 时间"}), 400

    total = query.count()
    items = (
        query.order_by(OperationLog.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return jsonify(
        {
            "items": [
                {
                    "id": item.id,
                    "userId": item.user_id,
                    "type": item.log_type,
                    "action": item.action,
                    "targetType": item.target_type,
                    "targetId": item.target_id,
                    "detail": item.detail,
                    "method": item.method,
                    "path": item.path,
                    "statusCode": item.status_code,
                    "durationMs": item.duration_ms,
                    "createdAt": item.created_at.isoformat(),
                }
                for item in items
            ],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": (total + limit - 1) // limit,
            },
        }
    )
