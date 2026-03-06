from datetime import datetime
import json

from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db


class TimestampMixin:
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class User(db.Model, TimestampMixin):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    display_name = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(32), nullable=False, default="普通用户")
    department = db.Column(db.String(128), nullable=False, default="档案馆")
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    archives = db.relationship("Archive", back_populates="uploader", lazy="dynamic")

    def set_password(self, raw_password: str) -> None:
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return check_password_hash(self.password_hash, raw_password)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "username": self.username,
            "displayName": self.display_name,
            "role": self.role,
            "department": self.department,
            "isActive": self.is_active,
            "createdAt": self.created_at.isoformat(),
        }


class Archive(db.Model, TimestampMixin):
    __tablename__ = "archives"

    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    file_name = db.Column(db.String(256), nullable=False)
    file_type = db.Column(db.String(128), nullable=False)
    file_size = db.Column(db.BigInteger, nullable=False, default=0)
    storage_path = db.Column(db.String(512), nullable=True)
    folder_path = db.Column(db.String(512), nullable=True)
    status = db.Column(db.String(32), nullable=False, default="UPLOADED")
    department = db.Column(db.String(128), nullable=False, default="档案馆")
    security_level = db.Column(db.String(32), nullable=False, default="内部")
    uploader_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    current_approval_user_ids = db.Column(db.Text, nullable=True)
    current_approval_mode = db.Column(db.String(16), nullable=True)

    uploader = db.relationship("User", back_populates="archives")
    metadata_record = db.relationship(
        "ArchiveMetadata", back_populates="archive", uselist=False, cascade="all, delete-orphan"
    )
    entities = db.relationship(
        "ArchiveEntity", back_populates="archive", cascade="all, delete-orphan"
    )
    versions = db.relationship(
        "ArchiveVersion", back_populates="archive", cascade="all, delete-orphan"
    )
    content_record = db.relationship(
        "ArchiveContent", back_populates="archive", uselist=False, cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        data = {
            "id": self.document_id,
            "fileName": self.file_name,
            "fileType": self.file_type,
            "fileSize": self.file_size,
            "path": self.folder_path,
            "status": self.status,
            "uploadDate": self.created_at.isoformat(),
            "uploadedBy": self.uploader_id,
            "uploadedByName": self.uploader.display_name if self.uploader else None,
            "department": self.department,
            "securityLevel": self.security_level,
        }
        if self.metadata_record is not None:
            data["metadata"] = self.metadata_record.to_dict()
        if self.entities:
            data["entities"] = [item.to_dict() for item in self.entities]

        latest_task = (
            AITask.query.filter_by(archive_id=self.id)
            .order_by(AITask.updated_at.desc())
            .first()
        )
        if latest_task is not None:
            data["aiTaskId"] = latest_task.task_id
            data["aiStatus"] = latest_task.status
            data["aiMessage"] = latest_task.result_message
            data["aiUpdatedAt"] = latest_task.updated_at.isoformat()

        return data


class ArchiveContent(db.Model, TimestampMixin):
    __tablename__ = "archive_contents"

    id = db.Column(db.Integer, primary_key=True)
    archive_id = db.Column(db.Integer, db.ForeignKey("archives.id"), unique=True, nullable=False, index=True)
    content_base64 = db.Column(db.Text, nullable=True)

    archive = db.relationship("Archive", back_populates="content_record")


class ArchiveMetadata(db.Model, TimestampMixin):
    __tablename__ = "archive_metadata"

    id = db.Column(db.Integer, primary_key=True)
    archive_id = db.Column(db.Integer, db.ForeignKey("archives.id"), unique=True, nullable=False)
    title = db.Column(db.String(256), nullable=True)
    category = db.Column(db.String(64), nullable=True)
    archive_date = db.Column(db.String(32), nullable=True)
    authors = db.Column(db.Text, nullable=True)
    summary = db.Column(db.Text, nullable=True)
    keywords = db.Column(db.Text, nullable=True)
    confidence_score = db.Column(db.Float, nullable=True)
    text_content = db.Column(db.Text, nullable=True)

    archive = db.relationship("Archive", back_populates="metadata_record")

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "category": self.category,
            "date": self.archive_date,
            "authors": [i for i in (self.authors or "").split(",") if i],
            "summary": self.summary,
            "keywords": [i for i in (self.keywords or "").split(",") if i],
            "confidenceScore": self.confidence_score,
            "textContent": self.text_content,
            "department": self.archive.department,
            "securityLevel": self.archive.security_level,
        }


class ArchiveEntity(db.Model, TimestampMixin):
    __tablename__ = "archive_entities"

    id = db.Column(db.Integer, primary_key=True)
    archive_id = db.Column(db.Integer, db.ForeignKey("archives.id"), nullable=False, index=True)
    name = db.Column(db.String(128), nullable=False)
    entity_type = db.Column(db.String(64), nullable=False)
    context = db.Column(db.Text, nullable=True)
    confidence = db.Column(db.Float, nullable=True)
    related_entity_ids = db.Column(db.Text, nullable=True)

    archive = db.relationship("Archive", back_populates="entities")

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "name": self.name,
            "type": self.entity_type,
            "context": self.context,
            "confidence": self.confidence,
            "relatedEntityIds": json.loads(self.related_entity_ids) if self.related_entity_ids else [],
        }


class ArchiveVersion(db.Model, TimestampMixin):
    __tablename__ = "archive_versions"

    id = db.Column(db.Integer, primary_key=True)
    archive_id = db.Column(db.Integer, db.ForeignKey("archives.id"), nullable=False, index=True)
    version_no = db.Column(db.Integer, nullable=False)
    change_note = db.Column(db.Text, nullable=True)
    changed_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    archive = db.relationship("Archive", back_populates="versions")


class AITask(db.Model, TimestampMixin):
    __tablename__ = "ai_tasks"

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    archive_id = db.Column(db.Integer, db.ForeignKey("archives.id"), nullable=False)
    task_type = db.Column(db.String(64), nullable=False, default="PARSE")
    status = db.Column(db.String(32), nullable=False, default="PENDING")
    result_message = db.Column(db.Text, nullable=True)
    retry_count = db.Column(db.Integer, nullable=False, default=0)


class ApprovalRecord(db.Model, TimestampMixin):
    __tablename__ = "approval_records"

    id = db.Column(db.Integer, primary_key=True)
    archive_id = db.Column(db.Integer, db.ForeignKey("archives.id"), nullable=False, index=True)
    action = db.Column(db.String(32), nullable=False)
    comment = db.Column(db.Text, nullable=True)
    reviewer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    step_index = db.Column(db.Integer, nullable=False, default=0)


class OperationLog(db.Model):
    __tablename__ = "operation_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=True)
    log_type = db.Column(db.String(32), nullable=False, default="ACTION")
    action = db.Column(db.String(128), nullable=False)
    target_type = db.Column(db.String(64), nullable=True)
    target_id = db.Column(db.String(128), nullable=True)
    detail = db.Column(db.Text, nullable=True)
    method = db.Column(db.String(16), nullable=True)
    path = db.Column(db.String(255), nullable=True)
    status_code = db.Column(db.Integer, nullable=True)
    duration_ms = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)


class SystemConfig(db.Model, TimestampMixin):
    __tablename__ = "system_configs"

    id = db.Column(db.Integer, primary_key=True)
    config_key = db.Column(db.String(128), unique=True, nullable=False)
    config_value = db.Column(db.Text, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    updated_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
