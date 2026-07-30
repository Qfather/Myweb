#!/bin/bash
# 个人3D主页 - macOS/Linux 启动脚本
echo "==============================="
echo "  个人3D主页 - 启动器"
echo "==============================="

cd "$(dirname "$0")"

# 检查 Python
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "[错误] 未找到 Python，请安装 Python 3.10+"
    exit 1
fi

PYTHON=$(command -v python3 || command -v python)

# 安装依赖
echo "[1/3] 检查依赖..."
$PYTHON -m pip install -r requirements.txt -q

# 启动服务
echo "[2/3] 启动 Flask 服务..."
echo ""
echo "==============================="
echo "  访问地址:"
echo "  主页: http://localhost:5001"
echo "  后台: http://localhost:5001/admin/"
echo "  密码: admin123"
echo "==============================="
echo ""

$PYTHON app.py
