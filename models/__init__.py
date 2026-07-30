import os
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone

db = SQLAlchemy()

# ---------- 数据库模型 ----------

class Profile(db.Model):
    """个人资料"""
    id = db.Column(db.Integer, primary_key=True)
    nickname = db.Column(db.String(50), default='我的名字')
    avatar = db.Column(db.String(200), default='')  # 头像路径
    bio = db.Column(db.Text, default='这个人很懒，什么都没写~')
    email = db.Column(db.String(100), default='')
    social_links = db.Column(db.Text, default='{}')  # JSON: {"github":"...","weibo":"..."}
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class Work(db.Model):
    """作品/项目展示"""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, default='')
    cover = db.Column(db.String(200), default='')  # 封面图
    url = db.Column(db.String(300), default='')    # 外部链接
    model_path = db.Column(db.String(200), default='')  # 关联的3D模型
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class Favorite(db.Model):
    """收藏/推荐"""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, default='')
    url = db.Column(db.String(300), default='')
    icon = db.Column(db.String(200), default='')
    text_color = db.Column(db.String(20), default='')   # 文字颜色
    text_size = db.Column(db.String(10), default='')    # 文字大小
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class SiteConfig(db.Model):
    """站点配置（主题色、3D场景设置等）"""
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), unique=True, nullable=False)
    value = db.Column(db.Text, default='')
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
