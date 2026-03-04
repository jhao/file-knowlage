from datetime import datetime

from sqlalchemy import func
from flask import Blueprint, jsonify

from .auth import login_required
from .extensions import db
from .models import Archive, ArchiveMetadata

bp = Blueprint("stats", __name__, url_prefix="/api/stats")


@bp.get("/dashboard")
@login_required
def dashboard():
    total = db.session.query(func.count(Archive.id)).scalar() or 0
    processing = db.session.query(func.count(Archive.id)).filter(Archive.status == "PROCESSING").scalar() or 0
    review_needed = db.session.query(func.count(Archive.id)).filter(Archive.status == "AI完成解析").scalar() or 0
    approved = db.session.query(func.count(Archive.id)).filter(Archive.status == "已归档").scalar() or 0
    storage_used_bytes = db.session.query(func.coalesce(func.sum(Archive.file_size), 0)).scalar() or 0

    category_rows = (
        db.session.query(ArchiveMetadata.category, func.count(Archive.id))
        .join(Archive, ArchiveMetadata.archive_id == Archive.id)
        .group_by(ArchiveMetadata.category)
        .all()
    )
    categories = [
        {"name": category or "未分类", "value": count}
        for category, count in category_rows
    ]

    month_rows = (
        db.session.query(func.strftime("%Y-%m", Archive.created_at), func.count(Archive.id))
        .group_by(func.strftime("%Y-%m", Archive.created_at))
        .order_by(func.strftime("%Y-%m", Archive.created_at).asc())
        .all()
    )
    trend = []
    for month_key, count in month_rows[-12:]:
        if not month_key:
            continue
        try:
            label = datetime.strptime(month_key, "%Y-%m").strftime("%m月")
        except ValueError:
            label = month_key
        trend.append({"name": label, "docs": count})

    return jsonify(
        {
            "metrics": {
                "total": total,
                "processing": processing,
                "reviewNeeded": review_needed,
                "approved": approved,
                "storageUsedBytes": storage_used_bytes,
            },
            "charts": {
                "byCategory": categories,
                "byMonth": trend,
            },
        }
    )
