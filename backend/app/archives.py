import uuid

from flask import Blueprint, g, jsonify, request

from .auth import log_action, login_required, require_permission
from .extensions import db
from .models import Archive, ArchiveEntity, ArchiveMetadata, ArchiveVersion

bp = Blueprint("archives", __name__, url_prefix="/api/archives")


@bp.get("")
@login_required
def list_archives():
    query = Archive.query
    status = request.args.get("status")
    category = request.args.get("category")
    keyword = request.args.get("keyword")

    if g.current_user.role != "管理员":
        query = query.filter(Archive.uploader_id == g.current_user.id)

    if status:
        query = query.filter(Archive.status == status)
    if category:
        query = query.join(ArchiveMetadata, isouter=True).filter(ArchiveMetadata.category == category)
    if keyword:
        like_term = f"%{keyword}%"
        query = query.join(ArchiveMetadata, isouter=True).filter(
            db.or_(Archive.file_name.like(like_term), ArchiveMetadata.title.like(like_term))
        )

    archives = query.order_by(Archive.created_at.desc()).all()
    return jsonify({"items": [item.to_dict() for item in archives], "total": len(archives)})


@bp.post("")
@login_required
@require_permission("canImport")
def create_archive():
    data = request.get_json(silent=True) or {}
    file_name = (data.get("fileName") or "").strip()
    file_type = (data.get("fileType") or "application/octet-stream").strip()
    if not file_name:
        return jsonify({"message": "fileName 不能为空"}), 400

    archive = Archive(
        document_id=data.get("id") or f"doc-{uuid.uuid4().hex[:12]}",
        file_name=file_name,
        file_type=file_type,
        file_size=int(data.get("fileSize") or 0),
        storage_path=data.get("storagePath"),
        folder_path=data.get("path"),
        status=data.get("status") or "UPLOADED",
        department=data.get("department") or g.current_user.department,
        security_level=data.get("securityLevel") or "内部",
        uploader_id=g.current_user.id,
    )
    db.session.add(archive)
    db.session.flush()

    metadata = data.get("metadata") or {}
    if metadata:
        db.session.add(
            ArchiveMetadata(
                archive_id=archive.id,
                title=metadata.get("title"),
                category=metadata.get("category"),
                archive_date=metadata.get("date"),
                authors=",".join(metadata.get("authors") or []),
                summary=metadata.get("summary"),
                keywords=",".join(metadata.get("keywords") or []),
                confidence_score=metadata.get("confidenceScore"),
                text_content=metadata.get("textContent"),
            )
        )

    db.session.add(
        ArchiveVersion(
            archive_id=archive.id,
            version_no=1,
            change_note="初始创建",
            changed_by=g.current_user.id,
        )
    )
    db.session.commit()
    log_action("ARCHIVE_CREATE", "archive", archive.document_id, f"创建档案: {archive.file_name}")
    return jsonify({"item": archive.to_dict()}), 201


@bp.get("/<string:document_id>")
@login_required
def get_archive(document_id: str):
    archive = Archive.query.filter_by(document_id=document_id).first_or_404()
    if g.current_user.role != "管理员" and archive.uploader_id != g.current_user.id:
        return jsonify({"message": "无权查看该档案"}), 403
    return jsonify({"item": archive.to_dict()})


@bp.get("/<string:document_id>/preview")
@login_required
def get_archive_preview(document_id: str):
    archive = Archive.query.filter_by(document_id=document_id).first_or_404()
    if g.current_user.role != "管理员" and archive.uploader_id != g.current_user.id:
        return jsonify({"message": "无权查看该档案"}), 403

    if archive.content_record is None or not archive.content_record.content_base64:
        return jsonify({"contentBase64": None})
    return jsonify({"contentBase64": archive.content_record.content_base64})


@bp.put("/<string:document_id>")
@login_required
@require_permission("canModify")
def update_archive(document_id: str):
    archive = Archive.query.filter_by(document_id=document_id).first_or_404()
    data = request.get_json(silent=True) or {}

    if "status" in data:
        archive.status = data["status"]
    if "securityLevel" in data:
        archive.security_level = data["securityLevel"]
    if "department" in data:
        archive.department = data["department"]

    metadata = data.get("metadata")
    if metadata is not None:
        if archive.metadata_record is None:
            archive.metadata_record = ArchiveMetadata(archive_id=archive.id)
        archive.metadata_record.title = metadata.get("title")
        archive.metadata_record.category = metadata.get("category")
        archive.metadata_record.archive_date = metadata.get("date")
        archive.metadata_record.authors = ",".join(metadata.get("authors") or [])
        archive.metadata_record.summary = metadata.get("summary")
        archive.metadata_record.keywords = ",".join(metadata.get("keywords") or [])
        archive.metadata_record.confidence_score = metadata.get("confidenceScore")
        archive.metadata_record.text_content = metadata.get("textContent")

    if "entities" in data:
        ArchiveEntity.query.filter_by(archive_id=archive.id).delete()
        for entity in data.get("entities") or []:
            db.session.add(
                ArchiveEntity(
                    archive_id=archive.id,
                    name=entity.get("name") or "",
                    entity_type=entity.get("type") or "Concept",
                    context=entity.get("context"),
                    confidence=entity.get("confidence"),
                )
            )

    latest = (
        ArchiveVersion.query.filter_by(archive_id=archive.id)
        .order_by(ArchiveVersion.version_no.desc())
        .first()
    )
    db.session.add(
        ArchiveVersion(
            archive_id=archive.id,
            version_no=(latest.version_no + 1 if latest else 1),
            change_note=data.get("changeNote") or "更新档案",
            changed_by=g.current_user.id,
        )
    )
    db.session.commit()
    log_action("ARCHIVE_UPDATE", "archive", archive.document_id, "更新档案信息")
    return jsonify({"item": archive.to_dict()})


@bp.delete("/<string:document_id>")
@login_required
@require_permission("canDelete")
def delete_archive(document_id: str):
    archive = Archive.query.filter_by(document_id=document_id).first_or_404()
    db.session.delete(archive)
    db.session.commit()
    log_action("ARCHIVE_DELETE", "archive", document_id, "删除档案")
    return jsonify({"message": "删除成功"})
