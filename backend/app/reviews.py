from flask import Blueprint, g, jsonify, request

from .auth import log_action, login_required, require_permission
from .extensions import db
from .models import ApprovalRecord, Archive

bp = Blueprint("reviews", __name__, url_prefix="/api/reviews")


@bp.get("/queue")
@login_required
@require_permission("canApprove")
def review_queue():
    status = request.args.get("status") or "AI完成解析"
    items = Archive.query.filter_by(status=status).order_by(Archive.created_at.desc()).all()
    return jsonify({"items": [item.to_dict() for item in items], "total": len(items)})


@bp.post("/<string:document_id>/approve")
@login_required
@require_permission("canApprove")
def approve(document_id: str):
    archive = Archive.query.filter_by(document_id=document_id).first_or_404()
    data = request.get_json(silent=True) or {}
    archive.status = "已归档"
    db.session.add(
        ApprovalRecord(
            archive_id=archive.id,
            action="APPROVE",
            comment=data.get("comment"),
            reviewer_id=g.current_user.id,
        )
    )
    db.session.commit()
    log_action("ARCHIVE_APPROVE", "archive", document_id, data.get("comment") or "")
    return jsonify({"item": archive.to_dict()})


@bp.post("/<string:document_id>/reject")
@login_required
@require_permission("canApprove")
def reject(document_id: str):
    archive = Archive.query.filter_by(document_id=document_id).first_or_404()
    data = request.get_json(silent=True) or {}
    archive.status = "已驳回"
    db.session.add(
        ApprovalRecord(
            archive_id=archive.id,
            action="REJECT",
            comment=data.get("comment"),
            reviewer_id=g.current_user.id,
        )
    )
    db.session.commit()
    log_action("ARCHIVE_REJECT", "archive", document_id, data.get("comment") or "")
    return jsonify({"item": archive.to_dict()})
