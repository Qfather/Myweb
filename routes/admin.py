"""管理后台路由 - 需要登录验证"""
import json
import os
from functools import wraps
from flask import Blueprint, request, jsonify, session, current_app
from werkzeug.utils import secure_filename
from models import db, Profile, Work, Favorite, SiteConfig

admin_bp = Blueprint('admin', __name__)

# 简单密码验证（生产环境应使用更强的认证）
ADMIN_PASSWORD = 'admin123'

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return jsonify({'code': 401, 'message': '未登录'}), 401
        return f(*args, **kwargs)
    return decorated

@admin_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if data and data.get('password') == ADMIN_PASSWORD:
        session['admin_logged_in'] = True
        return jsonify({'code': 0, 'message': '登录成功'})
    return jsonify({'code': 401, 'message': '密码错误'}), 401

@admin_bp.route('/logout', methods=['POST'])
def logout():
    session.pop('admin_logged_in', None)
    return jsonify({'code': 0, 'message': '已退出'})

@admin_bp.route('/check', methods=['GET'])
def check_login():
    return jsonify({'code': 0, 'logged_in': session.get('admin_logged_in', False)})

# ---- 个人资料管理 ----

@admin_bp.route('/profile', methods=['PUT'])
@login_required
def update_profile():
    data = request.get_json()
    profile = Profile.query.first()
    if not profile:
        profile = Profile()
        db.session.add(profile)
    
    for field in ['nickname', 'bio', 'email', 'social_links']:
        if field in data:
            setattr(profile, field, data[field])
    
    db.session.commit()
    return jsonify({'code': 0, 'message': '保存成功'})

# ---- 作品管理 ----

@admin_bp.route('/works', methods=['POST'])
@login_required
def create_work():
    data = request.get_json()
    work = Work(
        title=data['title'],
        description=data.get('description', ''),
        cover=data.get('cover', ''),
        url=data.get('url', ''),
        model_path=data.get('model_path', ''),
        sort_order=data.get('sort_order', 0),
    )
    db.session.add(work)
    db.session.commit()
    return jsonify({'code': 0, 'message': '创建成功', 'data': {'id': work.id}})

@admin_bp.route('/works/<int:work_id>', methods=['PUT'])
@login_required
def update_work(work_id):
    work = Work.query.get_or_404(work_id)
    data = request.get_json()
    for field in ['title', 'description', 'cover', 'url', 'model_path', 'sort_order']:
        if field in data:
            setattr(work, field, data[field])
    db.session.commit()
    return jsonify({'code': 0, 'message': '更新成功'})

@admin_bp.route('/works/<int:work_id>', methods=['DELETE'])
@login_required
def delete_work(work_id):
    work = Work.query.get_or_404(work_id)
    db.session.delete(work)
    db.session.commit()
    return jsonify({'code': 0, 'message': '删除成功'})

# ---- 收藏管理 ----

@admin_bp.route('/favorites', methods=['POST'])
@login_required
def create_favorite():
    data = request.get_json()
    fav = Favorite(
        title=data['title'],
        description=data.get('description', ''),
        url=data.get('url', ''),
        icon=data.get('icon', ''),
        text_color=data.get('text_color', ''),
        text_size=data.get('text_size', ''),
        sort_order=data.get('sort_order', 0),
    )
    db.session.add(fav)
    db.session.commit()
    return jsonify({'code': 0, 'message': '创建成功', 'data': {'id': fav.id}})

@admin_bp.route('/favorites/<int:fav_id>', methods=['PUT'])
@login_required
def update_favorite(fav_id):
    fav = Favorite.query.get_or_404(fav_id)
    data = request.get_json()
    for field in ['title', 'description', 'url', 'icon', 'text_color', 'text_size', 'sort_order']:
        if field in data:
            setattr(fav, field, data[field])
    db.session.commit()
    return jsonify({'code': 0, 'message': '更新成功'})

@admin_bp.route('/favorites/<int:fav_id>', methods=['DELETE'])
@login_required
def delete_favorite(fav_id):
    fav = Favorite.query.get_or_404(fav_id)
    db.session.delete(fav)
    db.session.commit()
    return jsonify({'code': 0, 'message': '删除成功'})

# ---- 文件上传 ----

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'glb', 'gltf', 'mp4', 'webm'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@admin_bp.route('/upload', methods=['POST'])
@login_required
def upload_file():
    if 'file' not in request.files:
        return jsonify({'code': 400, 'message': '未选择文件'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'code': 400, 'message': '文件名为空'}), 400
    if not allowed_file(file.filename):
        return jsonify({'code': 400, 'message': '不支持的文件类型'}), 400
    
    filename = secure_filename(file.filename)
    # 添加时间戳避免重名
    import time
    name, ext = os.path.splitext(filename)
    filename = f"{name}_{int(time.time())}{ext}"
    
    upload_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    file.save(upload_path)
    
    url = f"/static/uploads/{filename}"
    return jsonify({'code': 0, 'message': '上传成功', 'data': {'url': url}})

# ---- 站点配置 ----

@admin_bp.route('/config', methods=['PUT'])
@login_required
def update_config():
    data = request.get_json()
    for key, value in data.items():
        config = SiteConfig.query.filter_by(key=key).first()
        if config:
            config.value = value
        else:
            config = SiteConfig(key=key, value=value)
            db.session.add(config)
    db.session.commit()
    return jsonify({'code': 0, 'message': '保存成功'})
