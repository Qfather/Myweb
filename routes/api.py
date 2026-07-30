"""API 路由 - 供前端调用的公开接口"""
from flask import Blueprint, jsonify
from models import db, Profile, Work, Favorite, SiteConfig

api_bp = Blueprint('api', __name__)

@api_bp.route('/profile', methods=['GET'])
def get_profile():
    profile = Profile.query.first()
    if not profile:
        return jsonify({'code': 404, 'message': '未找到个人资料'}), 404
    return jsonify({
        'code': 0,
        'data': {
            'nickname': profile.nickname,
            'avatar': profile.avatar,
            'bio': profile.bio,
            'email': profile.email,
            'social_links': profile.social_links,
        }
    })

@api_bp.route('/works', methods=['GET'])
def get_works():
    works = Work.query.order_by(Work.sort_order).all()
    return jsonify({
        'code': 0,
        'data': [{
            'id': w.id,
            'title': w.title,
            'description': w.description,
            'cover': w.cover,
            'url': w.url,
            'model_path': w.model_path,
        } for w in works]
    })

@api_bp.route('/favorites', methods=['GET'])
def get_favorites():
    favorites = Favorite.query.order_by(Favorite.sort_order).all()
    return jsonify({
        'code': 0,
        'data': [{
            'id': f.id,
            'title': f.title,
            'description': f.description,
            'url': f.url,
            'icon': f.icon,
            'text_color': f.text_color,
            'text_size': f.text_size,
        } for f in favorites]
    })

@api_bp.route('/config', methods=['GET'])
def get_config():
    configs = SiteConfig.query.all()
    data = {c.key: c.value for c in configs}
    return jsonify({'code': 0, 'data': data})

@api_bp.route('/hdr-list', methods=['GET'])
def get_hdr_list():
    import os
    hdr_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'Assets', 'hdr')
    files = []
    if os.path.exists(hdr_dir):
        for f in os.listdir(hdr_dir):
            if f.lower().endswith(('.hdr','.exr','.png','.jpg','.jpeg')) and not f.startswith('.'):
                files.append(f)
    files.sort()
    return jsonify({'code': 0, 'data': files})

@api_bp.route('/hdr-preview/<filename>', methods=['GET'])
def get_hdr_preview(filename):
    import os
    from flask import send_file
    base = os.path.splitext(filename)[0]
    preview_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'Assets', 'hdr_preview')
    # 先找同名 .jpg
    for ext in ['.jpg','.png','.jpeg']:
        p = os.path.join(preview_dir, base + ext)
        if os.path.exists(p):
            return send_file(p, mimetype='image/jpeg')
    # 再直接找中文名
    for f in os.listdir(preview_dir):
        if f.startswith(base) and f.lower().endswith(('.jpg','.png','.jpeg')):
            return send_file(os.path.join(preview_dir, f), mimetype='image/jpeg')
    return '', 404

