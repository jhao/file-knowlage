import click
from flask import Flask

from .extensions import db
from .models import User


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

    db.session.commit()
    click.echo("基础用户已初始化：admin/admin123, user/user123")


def init_app(app: Flask) -> None:
    app.cli.add_command(init_db_command)
    app.cli.add_command(seed_command)
