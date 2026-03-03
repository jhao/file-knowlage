from sqlalchemy import func
from flask import Blueprint, jsonify

from .auth import login_required
from .extensions import db
from .models import Archive

bp = Blueprint("stats", __name__, url_prefix="/api/stats")


@bp.get("/dashboard")
@login_required
def dashboard():
    total = db.session.query(func.count(Archive.id)).scalar() or 0
    processing = db.session.query(func.count(Archive.id)).filter(Archive.status == "PROCESSING").scalar() or 0
    review_needed = db.session.query(func.count(Archive.id)).filter(Archive.status == "待人工校验").scalar() or 0
    approved = db.session.query(func.count(Archive.id)).filter(Archive.status == "已归档").scalar() or 0

    return jsonify(
        {
            "metrics": {
                "total": total,
                "processing": processing,
                "reviewNeeded": review_needed,
                "approved": approved,
            }
        }
    )
