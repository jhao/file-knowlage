from flask import Blueprint, g, jsonify, request
import json

from .auth import log_action, login_required, require_permission
from .extensions import db
from .models import ApprovalRecord, Archive, SystemConfig

bp = Blueprint("reviews", __name__, url_prefix="/api/reviews")


def _load_workflow_nodes() -> list[dict]:
    config = SystemConfig.query.filter_by(config_key="approval_workflow_json").first()
    if config is None or not config.config_value:
        return []
    try:
        parsed = json.loads(config.config_value)
        if not isinstance(parsed, list):
            return []
        nodes = []
        for item in parsed:
            if not isinstance(item, dict):
                continue
            user_id = str(item.get("userId") or "").strip()
            user_name = str(item.get("userName") or "").strip()
            if user_id:
                nodes.append({"userId": user_id, "userName": user_name})
        return nodes
    except Exception:
        return []


def _build_review_flow(archive: Archive) -> dict:
    workflow = _load_workflow_nodes()
    approve_records = (
        ApprovalRecord.query.filter_by(archive_id=archive.id, action="APPROVE")
        .order_by(ApprovalRecord.created_at.asc())
        .all()
    )
    current_index = len(approve_records)

    recent_comments = (
        ApprovalRecord.query.filter(
            ApprovalRecord.archive_id == archive.id,
            ApprovalRecord.comment.isnot(None),
            ApprovalRecord.comment != "",
        )
        .order_by(ApprovalRecord.created_at.desc())
        .limit(5)
        .all()
    )

    if current_index >= len(workflow):
        return {
            "enabled": len(workflow) > 0,
            "currentIndex": current_index,
            "total": len(workflow),
            "isFinalStep": True,
            "nextApprover": None,
            "recentComments": [item.comment for item in recent_comments],
        }

    next_approver = workflow[current_index]
    return {
        "enabled": len(workflow) > 0,
        "currentIndex": current_index,
        "total": len(workflow),
        "isFinalStep": current_index == len(workflow) - 1,
        "nextApprover": next_approver,
        "recentComments": [item.comment for item in recent_comments],
    }


@bp.get("/<string:document_id>/flow")
@login_required
def review_flow(document_id: str):
    archive = Archive.query.filter_by(document_id=document_id).first_or_404()
    return jsonify({"item": _build_review_flow(archive)})


@bp.get("/queue")
@login_required
@require_permission("canApprove")
def review_queue():
    status = request.args.get("status")
    query = Archive.query
    if status:
        query = query.filter_by(status=status)
    else:
        query = query.filter(Archive.status.in_(["AI处理完成", "等待人工校验"]))
    items = query.order_by(Archive.created_at.desc()).all()
    return jsonify({"items": [item.to_dict() for item in items], "total": len(items)})


@bp.post("/<string:document_id>/approve")
@login_required
@require_permission("canApprove")
def approve(document_id: str):
    archive = Archive.query.filter_by(document_id=document_id).first_or_404()
    data = request.get_json(silent=True) or {}
    comment = str(data.get("comment") or "").strip()
    if not comment:
        return jsonify({"message": "请输入审批意见"}), 400

    flow = _build_review_flow(archive)
    if flow["enabled"] and flow["nextApprover"] is not None:
        if str(g.current_user.id) != flow["nextApprover"]["userId"]:
            return jsonify({"message": "当前审批节点执行人不匹配"}), 403

    db.session.add(
        ApprovalRecord(
            archive_id=archive.id,
            action="APPROVE",
            comment=comment,
            reviewer_id=g.current_user.id,
        )
    )

    if not flow["enabled"] or flow["isFinalStep"]:
        archive.status = "已归档"
    else:
        archive.status = "待审批"

    db.session.commit()
    updated_flow = _build_review_flow(archive)
    log_action("ARCHIVE_APPROVE", "archive", document_id, comment)
    return jsonify(
        {
            "item": archive.to_dict(),
            "flow": updated_flow,
            "message": "审批完成" if archive.status == "已归档" else "已提交到下一级审批",
        }
    )


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
