from flask import Blueprint, g, jsonify, request
import json

from .auth import log_action, login_required, require_permission
from .extensions import db
from .models import ApprovalRecord, Archive, SystemConfig, User

bp = Blueprint("reviews", __name__, url_prefix="/api/reviews")


def _normalize_workflow_nodes(raw_nodes: list) -> list[dict]:
    normalized = []
    for item in raw_nodes:
        if not isinstance(item, dict):
            continue
        users = item.get("users")
        mode = str(item.get("mode") or "OR").upper()
        if mode not in ["OR", "AND"]:
            mode = "OR"

        normalized_users = []
        if isinstance(users, list):
            for user in users:
                if not isinstance(user, dict):
                    continue
                user_id = str(user.get("userId") or "").strip()
                user_name = str(user.get("userName") or "").strip()
                if user_id:
                    normalized_users.append({"userId": user_id, "userName": user_name})
        else:
            # 兼容旧格式：单人节点
            user_id = str(item.get("userId") or "").strip()
            user_name = str(item.get("userName") or "").strip()
            if user_id:
                normalized_users.append({"userId": user_id, "userName": user_name})

        if normalized_users:
            normalized.append(
                {
                    "mode": mode,
                    "users": normalized_users,
                }
            )
    return normalized


def _load_workflow_nodes() -> list[dict]:
    config = SystemConfig.query.filter_by(config_key="approval_workflow_json").first()
    if config is None or not config.config_value:
        return []
    try:
        parsed = json.loads(config.config_value)
        if not isinstance(parsed, list):
            return []
        return _normalize_workflow_nodes(parsed)
    except Exception:
        return []


def _parse_archive_current_user_ids(archive: Archive) -> list[str]:
    if not archive.current_approval_user_ids:
        return []
    try:
        parsed = json.loads(archive.current_approval_user_ids)
        if not isinstance(parsed, list):
            return []
        return [str(item).strip() for item in parsed if str(item).strip()]
    except Exception:
        return []


def _step_satisfied(archive: Archive, step_index: int, node: dict) -> bool:
    step_records = ApprovalRecord.query.filter_by(
        archive_id=archive.id,
        action="APPROVE",
        step_index=step_index,
    ).all()
    approved_ids = {str(item.reviewer_id) for item in step_records}
    node_user_ids = {str(item.get("userId")) for item in node.get("users", [])}
    if not node_user_ids:
        return True

    mode = str(node.get("mode") or "OR").upper()
    if mode == "AND":
        return node_user_ids.issubset(approved_ids)
    return len(node_user_ids.intersection(approved_ids)) > 0


def _first_pending_step_index(archive: Archive, workflow: list[dict]) -> int:
    for idx, node in enumerate(workflow):
        if not _step_satisfied(archive, idx, node):
            return idx
    return len(workflow)


def _ensure_current_step_state(archive: Archive, workflow: list[dict], current_index: int) -> tuple[list[str], str]:
    if current_index >= len(workflow):
        archive.current_approval_user_ids = None
        archive.current_approval_mode = None
        db.session.commit()
        return [], "OR"

    default_users = [str(item.get("userId")) for item in workflow[current_index].get("users", []) if str(item.get("userId"))]
    mode = str(workflow[current_index].get("mode") or "OR").upper()
    manual_users = _parse_archive_current_user_ids(archive)

    valid_manual_users = manual_users
    if valid_manual_users:
        # 当前节点已手工改派
        if archive.current_approval_mode != mode:
            archive.current_approval_mode = mode
            db.session.commit()
        return valid_manual_users, mode

    archive.current_approval_user_ids = json.dumps(default_users, ensure_ascii=False)
    archive.current_approval_mode = mode
    db.session.commit()
    return default_users, mode


def _build_review_flow(archive: Archive) -> dict:
    workflow = _load_workflow_nodes()
    current_index = _first_pending_step_index(archive, workflow)

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
            "nextApprovers": [],
            "approvalMode": None,
            "recentComments": [item.comment for item in recent_comments],
        }

    users, mode = _ensure_current_step_state(archive, workflow, current_index)
    next_approvers = []
    for user in workflow[current_index].get("users", []):
        user_id = str(user.get("userId"))
        if user_id in users:
            next_approvers.append({"userId": user_id, "userName": user.get("userName") or ""})

    next_approver = next_approvers[0] if next_approvers else None
    return {
        "enabled": len(workflow) > 0,
        "currentIndex": current_index,
        "total": len(workflow),
        "isFinalStep": current_index == len(workflow) - 1,
        "nextApprover": next_approver,
        "nextApprovers": next_approvers,
        "approvalMode": mode,
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
    approvers = [str(item.get("userId")) for item in flow.get("nextApprovers") or [] if str(item.get("userId"))]
    if flow["enabled"] and approvers:
        if str(g.current_user.id) not in approvers:
            return jsonify({"message": "当前审批节点执行人不匹配"}), 403

    existing = ApprovalRecord.query.filter_by(
        archive_id=archive.id,
        action="APPROVE",
        step_index=flow["currentIndex"],
        reviewer_id=g.current_user.id,
    ).first()
    if existing is not None:
        return jsonify({"message": "当前节点您已审批，无需重复提交"}), 400

    db.session.add(
        ApprovalRecord(
            archive_id=archive.id,
            action="APPROVE",
            comment=comment,
            reviewer_id=g.current_user.id,
            step_index=flow["currentIndex"],
        )
    )
    db.session.commit()

    updated_flow = _build_review_flow(archive)
    if not updated_flow["enabled"] or updated_flow["nextApprover"] is None:
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


@bp.post("/<string:document_id>/reassign")
@login_required
def reassign(document_id: str):
    if g.current_user.role != "管理员":
        return jsonify({"message": "仅系统管理员可修改当前审批人"}), 403

    archive = Archive.query.filter_by(document_id=document_id).first_or_404()
    flow = _build_review_flow(archive)
    if not flow.get("enabled") or flow.get("nextApprover") is None:
        return jsonify({"message": "当前流程已结束，无需改派"}), 400

    data = request.get_json(silent=True) or {}
    user_ids = data.get("userIds")
    if not isinstance(user_ids, list):
        return jsonify({"message": "userIds 参数格式错误"}), 400

    target_ids = [str(item).strip() for item in user_ids if str(item).strip()]
    if not target_ids:
        return jsonify({"message": "请至少选择一个审批人"}), 400

    system_user_ids = {str(item.id) for item in User.query.all()}
    if not set(target_ids).issubset(system_user_ids):
        return jsonify({"message": "改派审批人必须是系统内有效用户"}), 400

    archive.current_approval_user_ids = json.dumps(target_ids, ensure_ascii=False)
    db.session.commit()
    updated_flow = _build_review_flow(archive)
    log_action("ARCHIVE_REASSIGN", "archive", document_id, f"改派审批人: {','.join(target_ids)}")
    return jsonify({"item": archive.to_dict(), "flow": updated_flow, "message": "当前审批人已更新"})


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
            step_index=_first_pending_step_index(archive, _load_workflow_nodes()),
        )
    )
    db.session.commit()
    log_action("ARCHIVE_REJECT", "archive", document_id, data.get("comment") or "")
    return jsonify({"item": archive.to_dict()})
