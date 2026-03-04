import json
import os
import time
from datetime import datetime
from urllib import error, request

from .auth import log_ai_api_call
from .extensions import db
from .models import AITask, Archive, ArchiveEntity, ArchiveMetadata, SystemConfig

SYSTEM_PROMPT = (
    "你是高校档案解析助手。请根据文件名和基础信息推断档案内容，"
    "并返回结构化 JSON。"
)


DEFAULT_PROVIDER_MODELS = {
    "kimi": "moonshot-v1-8k",
    "qwen": "qwen-plus",
    "glm": "glm-4-flash",
    "deepseek": "deepseek-chat",
    "openai": "gpt-4o-mini",
    "local": "llama3.1:8b",
}

ALLOWED_CATEGORIES = {
    "学籍档案",
    "人事档案",
    "科研档案",
    "行政档案",
    "会议纪要",
    "多媒体档案",
    "手稿",
    "教材",
    "新闻稿",
}

def _split_keywords(text: str) -> list[str]:
    cleaned = [part.strip() for part in text.replace("\n", " ").replace("，", " ").replace(",", " ").split(" ") if part.strip()]
    uniq: list[str] = []
    for item in cleaned:
        if len(item) < 2:
            continue
        if item not in uniq:
            uniq.append(item)
        if len(uniq) >= 8:
            break
    return uniq or ["自动解析"]


def _bootstrap_from_existing_metadata(archive: Archive) -> dict:
    metadata = ArchiveMetadata.query.filter_by(archive_id=archive.id).first()
    if metadata is None or not metadata.text_content:
        return {}
    text = metadata.text_content[:5000]
    return {
        "summary": text[:180],
        "keywords": _split_keywords(text),
        "textContent": text,
        "entities": [
            {
                "name": archive.department,
                "type": "Organization",
                "context": "上传部门",
                "confidence": 0.72,
            }
        ],
    }



def _config_map() -> dict[str, str]:
    rows = SystemConfig.query.all()
    return {item.config_key: item.config_value for item in rows}


def _provider_config() -> tuple[str, str, str, str]:
    cfg = _config_map()
    provider = (cfg.get("llm.provider") or "local").strip().lower()
    base_url = (cfg.get(f"llm.{provider}_url") or "").strip()
    api_key = (cfg.get(f"llm.{provider}_api_key") or "").strip()
    model = (cfg.get(f"llm.{provider}_model") or os.environ.get("LLM_MODEL") or DEFAULT_PROVIDER_MODELS.get(provider, "gpt-4o-mini")).strip()
    return provider, base_url, api_key, model


def _build_fallback_result(archive: Archive) -> dict:
    file_name = archive.file_name
    now = datetime.utcnow().strftime("%Y-%m-%d")
    base_name = file_name.rsplit(".", 1)[0]
    bootstrap = _bootstrap_from_existing_metadata(archive)
    return {
        "title": base_name,
        "category": "行政档案",
        "date": now,
        "authors": [archive.department],
        "summary": bootstrap.get("summary") or f"根据文件名《{file_name}》生成的自动解析结果（未调用外部 AI）。",
        "keywords": bootstrap.get("keywords") or ["自动解析", "待人工复核", archive.department],
        "confidenceScore": 60 if not bootstrap else 72,
        "textContent": bootstrap.get("textContent") or f"文件名：{file_name}；路径：{archive.folder_path or '未设置'}。",
        "entities": bootstrap.get("entities") or [
            {
                "name": archive.department,
                "type": "Organization",
                "context": f"上传部门为 {archive.department}",
                "confidence": 0.6,
            }
        ],
    }


def _normalize_result(raw: dict, archive: Archive) -> dict:
    category = raw.get("category") if isinstance(raw.get("category"), str) else "行政档案"
    if category not in ALLOWED_CATEGORIES:
        category = "行政档案"

    entities = raw.get("entities") if isinstance(raw.get("entities"), list) else []

    return {
        "title": (raw.get("title") or archive.file_name).strip()[:256],
        "category": category,
        "date": str(raw.get("date") or datetime.utcnow().strftime("%Y-%m-%d"))[:32],
        "authors": raw.get("authors") if isinstance(raw.get("authors"), list) else [archive.department],
        "summary": str(raw.get("summary") or "")[:2000],
        "keywords": raw.get("keywords") if isinstance(raw.get("keywords"), list) else ["自动解析"],
        "confidenceScore": float(raw.get("confidenceScore") or 0),
        "textContent": str(raw.get("textContent") or "")[:10000],
        "entities": entities[:10],
    }


def _call_ai(archive: Archive) -> dict:
    provider, base_url, api_key, model = _provider_config()
    if not base_url or not api_key:
        return _build_fallback_result(archive)

    existing_metadata = ArchiveMetadata.query.filter_by(archive_id=archive.id).first()
    archive_brief = {
        "fileName": archive.file_name,
        "fileType": archive.file_type,
        "department": archive.department,
        "path": archive.folder_path or "",
        "preExtractedText": (existing_metadata.text_content[:3000] if existing_metadata and existing_metadata.text_content else ""),
    }
    user_prompt = (
        "请解析以下档案并返回 JSON："
        f"{json.dumps(archive_brief, ensure_ascii=False)}。"
        "JSON 字段必须包含：title, category, date, authors, summary, keywords, confidenceScore, textContent, entities。"
    )
    payload = {
        "model": model,
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    }
    req = request.Request(
        url=f"{base_url.rstrip('/')}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            content = body["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            return _normalize_result(parsed, archive)
    except (error.URLError, TimeoutError, KeyError, ValueError, json.JSONDecodeError):
        return _build_fallback_result(archive)


def _save_parse_result(task: AITask, archive: Archive, result: dict) -> None:
    normalized = _normalize_result(result, archive)

    metadata = ArchiveMetadata.query.filter_by(archive_id=archive.id).first()
    if metadata is None:
        metadata = ArchiveMetadata(archive_id=archive.id)
        db.session.add(metadata)

    metadata.title = normalized["title"]
    metadata.category = normalized["category"]
    metadata.archive_date = normalized["date"]
    metadata.authors = ",".join([str(i) for i in normalized["authors"] if i])
    metadata.summary = normalized["summary"]
    metadata.keywords = ",".join([str(i) for i in normalized["keywords"] if i])
    metadata.confidence_score = normalized["confidenceScore"]
    metadata.text_content = normalized["textContent"]

    ArchiveEntity.query.filter_by(archive_id=archive.id).delete()
    for item in normalized["entities"]:
        if not isinstance(item, dict):
            continue
        db.session.add(
            ArchiveEntity(
                archive_id=archive.id,
                name=str(item.get("name") or "未命名实体")[:128],
                entity_type=str(item.get("type") or "Concept")[:64],
                context=str(item.get("context") or "")[:1000],
                confidence=float(item.get("confidence") or 0),
            )
        )

    task.status = "SUCCESS"
    task.result_message = "解析完成"
    archive.status = "待人工校验"


def process_pending_tasks(batch_size: int = 2) -> int:
    pending_tasks = (
        AITask.query.filter_by(status="PENDING", task_type="PARSE")
        .order_by(AITask.created_at.asc())
        .limit(batch_size)
        .all()
    )
    if not pending_tasks:
        return 0

    processed = 0
    for task in pending_tasks:
        archive = db.session.get(Archive, task.archive_id)
        if archive is None:
            task.status = "FAILED"
            task.result_message = "关联档案不存在"
            continue

        task.status = "PROCESSING"
        task.result_message = "任务处理中"
        db.session.commit()

        try:
            ai_result = _call_ai(archive)
            _save_parse_result(task, archive, ai_result)
            log_ai_api_call("AI_PARSE_SUCCESS", f"任务 {task.task_id} 解析完成", task.task_id)
        except Exception as exc:
            task.status = "FAILED"
            task.retry_count = task.retry_count + 1
            task.result_message = f"解析失败：{str(exc)[:180]}"
            log_ai_api_call("AI_PARSE_FAILED", f"任务 {task.task_id} 失败：{exc}", task.task_id)

        db.session.commit()
        processed += 1
    return processed


def worker_loop(interval_seconds: int = 60, batch_size: int = 2) -> None:
    while True:
        process_pending_tasks(batch_size=batch_size)
        time.sleep(interval_seconds)
