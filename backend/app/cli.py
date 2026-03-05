import click
from flask import Flask

from .ai_batch import process_pending_tasks, worker_loop
from .extensions import db
from .models import AITask, Archive, ArchiveMetadata, SystemConfig, User


@click.command("init-db")
def init_db_command() -> None:
    db.create_all()
    click.echo("数据库表已创建。")


@click.command("seed")
def seed_command() -> None:
    admin = User.query.filter_by(username="admin").first()
    if admin is None:
        admin = User(
            username="admin",
            display_name="系统管理员",
            role="管理员",
            department="档案馆",
        )
        admin.set_password("admin123")
        db.session.add(admin)

    demo = User.query.filter_by(username="user").first()
    if demo is None:
        demo = User(
            username="user",
            display_name="普通用户",
            role="普通用户",
            department="教务处",
        )
        demo.set_password("user123")
        db.session.add(demo)

    db.session.flush()


    default_configs = [
        ("entity_types", "Person,Location,Organization,Event,Concept", "知识实体分类（兼容）"),
        ("entity_types_json", "[{\"key\":\"Person\",\"label\":\"人物\"},{\"key\":\"Location\",\"label\":\"地点\"},{\"key\":\"Organization\",\"label\":\"组织\"},{\"key\":\"Event\",\"label\":\"事件\"},{\"key\":\"Concept\",\"label\":\"概念\"}]", "知识实体分类（JSON）"),
        ("archive_category_tree", "[{\"name\":\"学籍档案\",\"children\":[\"本科生学籍\",\"研究生学籍\"]},{\"name\":\"人事档案\",\"children\":[\"教师人事\",\"行政人员人事\"]},{\"name\":\"科研档案\",\"children\":[\"项目档案\",\"成果档案\"]},{\"name\":\"行政档案\",\"children\":[\"制度文件\",\"会议纪要\"]}]", "档案目录与子门类配置"),
        ("llm.enabled", "true", "是否启用 AI 调用"),
        ("llm.system_prompt", "你是高校档案解析助手。请根据文件名和基础信息推断档案内容，并返回结构化 JSON。", "档案解析 System Prompt"),
        ("llm.user_prompt_template", "请解析以下档案并返回 JSON：{{archiveBrief}}。category 字段必须且只能使用下列档案目录分类之一：{{allowedCategories}}。JSON 字段必须包含：title, category, date, authors, summary, keywords, confidenceScore, textContent, entities。", "档案解析 User Prompt 模板"),
        ("llm.provider", "kimi", "文档处理大模型提供商"),
        ("llm.kimi_url", "https://api.moonshot.cn/v1", "Kimi API 基础地址"),
        ("llm.kimi_api_key", "", "Kimi API Key"),
        ("llm.kimi_model", "moonshot-v1-8k", "Kimi 默认模型"),
        ("llm.qwen_url", "https://dashscope.aliyuncs.com/compatible-mode/v1", "千问 API 基础地址"),
        ("llm.qwen_api_key", "", "千问 API Key"),
        ("llm.qwen_model", "qwen-plus", "千问默认模型"),
        ("llm.glm_url", "https://open.bigmodel.cn/api/paas/v4", "GLM-4.6V API 基础地址"),
        ("llm.glm_api_key", "", "GLM-4.6V API Key"),
        ("llm.glm_model", "glm-4-flash", "GLM 默认模型"),
        ("llm.deepseek_url", "https://api.deepseek.com/v1", "DeepSeek API 基础地址"),
        ("llm.deepseek_api_key", "", "DeepSeek API Key"),
        ("llm.deepseek_model", "deepseek-chat", "DeepSeek 默认模型"),
        ("llm.openai_url", "https://api.openai.com/v1", "OpenAI API 基础地址"),
        ("llm.openai_api_key", "", "OpenAI API Key"),
        ("llm.openai_model", "gpt-4o-mini", "OpenAI 默认模型"),
        ("llm.local_url", "http://127.0.0.1:11434/v1", "本地大模型 API 基础地址"),
        ("llm.local_api_key", "", "本地大模型 API Key"),
        ("llm.local_model", "llama3.1:8b", "本地大模型默认模型"),
    ]

    for key, value, desc in default_configs:
        if SystemConfig.query.filter_by(config_key=key).first() is None:
            db.session.add(
                SystemConfig(
                    config_key=key,
                    config_value=value,
                    description=desc,
                    updated_by=admin.id,
                )
            )

    if Archive.query.filter_by(document_id="seed-doc-001").first() is None:
        archive = Archive(
            document_id="seed-doc-001",
            file_name="校园发展史.pdf",
            file_type="application/pdf",
            file_size=234567,
            status="AI处理完成",
            department="档案馆",
            security_level="内部",
            uploader_id=demo.id,
        )
        db.session.add(archive)
        db.session.flush()
        db.session.add(
            ArchiveMetadata(
                archive_id=archive.id,
                title="校园发展史",
                category="行政档案",
                archive_date="2024-01-01",
                authors="档案馆",
                summary="用于演示的档案数据",
                keywords="演示,校园",
                confidence_score=85,
            )
        )
        db.session.add(
            AITask(
                task_id="seed-task-001",
                archive_id=archive.id,
                task_type="PARSE",
                status="SUCCESS",
                result_message="AI处理完成",
            )
        )

    db.session.commit()
    click.echo("基础数据已初始化：admin/admin123, user/user123")


@click.command("run-ai-batch-once")
@click.option("--batch-size", default=2, show_default=True, type=int, help="每次处理任务数量")
def run_ai_batch_once_command(batch_size: int) -> None:
    processed = process_pending_tasks(batch_size=max(1, batch_size))
    click.echo(f"本次批处理完成，处理任务数：{processed}")


@click.command("run-ai-batch-worker")
@click.option("--interval", default=60, show_default=True, type=int, help="轮询间隔（秒）")
@click.option("--batch-size", default=2, show_default=True, type=int, help="每次处理任务数量")
def run_ai_batch_worker_command(interval: int, batch_size: int) -> None:
    click.echo(f"后台任务启动：每 {max(1, interval)} 秒处理一次，每次最多 {max(1, batch_size)} 条")
    worker_loop(interval_seconds=max(1, interval), batch_size=max(1, batch_size))


def init_app(app: Flask) -> None:
    app.cli.add_command(init_db_command)
    app.cli.add_command(seed_command)
    app.cli.add_command(run_ai_batch_once_command)
    app.cli.add_command(run_ai_batch_worker_command)
