import click
from flask import Flask

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
        ("entity_types", "Person,Location,Organization,Event,Concept", "知识实体分类"),
        ("llm.provider", "kimi", "文档处理大模型提供商"),
        ("llm.kimi_url", "https://api.moonshot.cn/v1", "Kimi API 基础地址"),
        ("llm.kimi_api_key", "", "Kimi API Key"),
        ("llm.qwen_url", "https://dashscope.aliyuncs.com/compatible-mode/v1", "千问 API 基础地址"),
        ("llm.qwen_api_key", "", "千问 API Key"),
        ("llm.openai_url", "https://api.openai.com/v1", "OpenAI API 基础地址"),
        ("llm.openai_api_key", "", "OpenAI API Key"),
        ("llm.local_url", "http://127.0.0.1:11434/v1", "本地大模型 API 基础地址"),
        ("llm.local_api_key", "", "本地大模型 API Key"),
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
            status="待人工校验",
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
                result_message="解析完成",
            )
        )

    db.session.commit()
    click.echo("基础数据已初始化：admin/admin123, user/user123")


def init_app(app: Flask) -> None:
    app.cli.add_command(init_db_command)
    app.cli.add_command(seed_command)
