from flask import Blueprint, jsonify, request

from .auth import login_required
from .extensions import db
from .models import Archive, ArchiveEntity, ArchiveMetadata

bp = Blueprint("search", __name__, url_prefix="/api/search")


@bp.get("")
@login_required
def search_archives():
    keyword = (request.args.get("keyword") or "").strip()
    entity = (request.args.get("entity") or "").strip()

    query = Archive.query.join(ArchiveMetadata, isouter=True)
    if keyword:
        like_term = f"%{keyword}%"
        query = query.filter(
            db.or_(
                Archive.file_name.like(like_term),
                ArchiveMetadata.title.like(like_term),
                ArchiveMetadata.summary.like(like_term),
            )
        )
    if entity:
        query = query.join(ArchiveEntity).filter(ArchiveEntity.name.like(f"%{entity}%"))

    items = query.distinct().order_by(Archive.created_at.desc()).all()
    return jsonify({"items": [item.to_dict() for item in items], "total": len(items)})
