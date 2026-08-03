"""
个人3D主页 - Flask 后端
"""
import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from models import db
from routes.api import api_bp
from routes.admin import admin_bp


def create_app():
    app = Flask(__name__, static_folder='static')
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
    app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'static', 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max upload

    # 数据库配置 - SQLite
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(app.root_path, 'instance', 'site.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    CORS(app, supports_credentials=True)
    db.init_app(app)

    # 确保目录存在
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(os.path.join(app.root_path, 'instance'), exist_ok=True)

    # 注册蓝图
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/admin')

    # 首页路由 - 托管 React 构建产物 web/dist/
    web_dist = os.path.join(app.root_path, 'web', 'dist')

    @app.route('/')
    def index():
        if os.path.exists(os.path.join(web_dist, 'index.html')):
            return send_from_directory(web_dist, 'index.html')
        # 兜底：无构建产物时用旧版静态首页
        return send_from_directory(os.path.join(app.root_path, 'templates'), 'index.html')

    @app.route('/admin/')
    def admin_page():
        return send_from_directory(os.path.join(app.root_path, 'templates'), 'admin.html')

    # 前端构建资源 /assets/* （vite 产物） 与 资产目录 Assets/* 共用路径，按存在性分流
    assets_path = os.path.join(app.root_path, 'Assets')
    dist_assets = os.path.join(web_dist, 'assets')
    if os.path.exists(assets_path) or os.path.exists(dist_assets):
        @app.route('/assets/<path:filename>')
        def serve_assets(filename):
            # 优先前端构建产物（js/css），其次资产目录（hdr/图标等）
            if os.path.exists(os.path.join(dist_assets, filename)):
                return send_from_directory(dist_assets, filename)
            return send_from_directory(assets_path, filename)

    # 创建表
    with app.app_context():
        db.create_all()
        # 初始化默认个人资料
        from models import Profile
        if not Profile.query.first():
            db.session.add(Profile(nickname='访客', bio='欢迎来到我的个人主页~'))
            db.session.commit()

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5001)
