# -*- coding: utf-8 -*-
"""
静态展示站导出器 —— 为 GitHub Pages 生成 docs/ 静态站
================================================================
用法（在工程根目录执行）：
    python export_static.py

流程：
  1. 从 SQLite(instance/site.db) 读取内容，导出为 docs/data.json（含路径重写）
  2. 复制 React 构建产物 web/dist/* -> docs/（index.html、assets/*）
  3. 注入静态标记 window.__STATIC__ = true 到 docs/index.html
  4. 复制资源：Assets/icons -> docs/assets/icons，Assets/hdr -> docs/media/hdr，
     static/uploads -> docs/media/uploads

之后把 docs/ 提交推送，GitHub Pages 选择 /docs 即可静态访问（只读）。

注意：先运行  cd web && npm run build  生成最新前端，再运行本脚本。
"""
import json
import shutil
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

# 兼容 Windows cmd（GBK）：中文输出不报编码错误
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

ROOT = Path(__file__).resolve().parent
DB = ROOT / "instance" / "site.db"
DIST = ROOT / "web" / "dist"
DOCS = ROOT / "docs"


def rewrite(path: str) -> str:
    """把后端绝对路径改写为静态相对路径"""
    if not path:
        return path or ""
    p = path
    p = p.replace("/static/uploads/", "./media/uploads/")
    p = p.replace("/assets/hdr/", "./media/hdr/")
    p = p.replace("/assets/icons/", "./assets/icons/")
    return p


def read_db():
    if not DB.exists():
        print(f"[错误] 数据库不存在: {DB}")
        sys.exit(1)
    con = sqlite3.connect(str(DB))
    con.row_factory = sqlite3.Row

    def rows(table):
        try:
            return [dict(r) for r in con.execute(f"SELECT * FROM {table}")]
        except Exception:
            return []

    profile_rows = rows("profile")
    profile = profile_rows[0] if profile_rows else {}

    # 个人资料：头像路径重写，社交链接内路径重写
    if profile:
        profile["avatar"] = rewrite(profile.get("avatar", ""))
        raw_social = profile.get("social_links", "")
        try:
            socials = json.loads(raw_social) if isinstance(raw_social, str) else (raw_social or [])
            for s in socials:
                s["icon"] = rewrite(s.get("icon", ""))
                s["qrcode"] = rewrite(s.get("qrcode", ""))
            profile["social_links"] = json.dumps(socials, ensure_ascii=False)
        except Exception:
            pass

    experiences = []
    for f in rows("favorite"):
        f["url"] = f.get("url", "")
        experiences.append(f)

    works = []
    for w in rows("work"):
        w["cover"] = rewrite(w.get("cover", ""))
        w["model_path"] = rewrite(w.get("model_path", ""))
        works.append(w)

    config = {c["key"]: c["value"] for c in rows("site_config") if c.get("key")}
    for k in ("model_path", "hdr_path", "bg_image"):
        if config.get(k):
            config[k] = rewrite(config[k])

    con.close()
    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "profile": profile,
        "experiences": experiences,
        "works": works,
        "config": config,
    }


def copy_tree(src: Path, dst: Path):
    if not src.exists():
        print(f"[跳过] 不存在: {src}")
        return
    shutil.copytree(src, dst, dirs_exist_ok=True)
    print(f"[复制] {src} -> {dst}")


def main():
    if not DIST.exists():
        print(f"[错误] 未找到前端构建产物 {DIST}")
        print("请先运行:  cd web && npm run build")
        sys.exit(1)

    # 1. 清空并重建 docs
    if DOCS.exists():
        shutil.rmtree(DOCS)
    DOCS.mkdir(parents=True)

    # 2. 复制 React 构建产物
    for item in DIST.iterdir():
        dst = DOCS / item.name
        if item.is_dir():
            shutil.copytree(item, dst)
        else:
            shutil.copy2(item, dst)
    print(f"[复制] {DIST}/* -> {DOCS}/")

    # 3. 注入静态标记
    index = DOCS / "index.html"
    html = index.read_text(encoding="utf-8")
    if "__STATIC__" not in html:
        marker = "<script>window.__STATIC__=true;</script>"
        if "</head>" in html:
            html = html.replace("</head>", marker + "\n</head>", 1)
        else:
            html = marker + html
        index.write_text(html, encoding="utf-8")
        print("[注入] window.__STATIC__ = true")

    # 4. 复制资源
    copy_tree(ROOT / "Assets" / "icons", DOCS / "assets" / "icons")
    copy_tree(ROOT / "Assets" / "hdr", DOCS / "media" / "hdr")
    copy_tree(ROOT / "Assets" / "hdr_preview", DOCS / "media" / "hdr_preview")
    copy_tree(ROOT / "static" / "uploads", DOCS / "media" / "uploads")

    # 5. 生成 data.json
    data = read_db()
    (DOCS / "data.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print(f"[导出] docs/data.json（{len(data['experiences'])} 经历 / {len(data['works'])} 作品）")

    # 6. 关闭 Jekyll（避免下划线文件被忽略）
    (DOCS / ".nojekyll").write_text("", encoding="utf-8")

    print("\n[完成] 静态站已生成到 docs/")
    print("下一步：提交推送 docs/，GitHub 仓库 Settings → Pages → Source 选 'Deploy from a branch'，")
    print("        Branch 选 main，目录选 /docs，保存后访问 https://<用户名>.github.io/<仓库名>/")


if __name__ == "__main__":
    main()
