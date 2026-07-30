@echo off
REM 个人3D主页 - Windows 启动脚本
echo ===============================
echo   个人3D主页 - 启动器
echo ===============================

cd /d %~dp0

REM 检查 Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Python，请安装 Python 3.10+
    pause
    exit /b 1
)

REM 安装依赖
echo [1/3] 检查依赖...
pip install -r requirements.txt -q

REM 启动服务
echo [2/3] 启动 Flask 服务...
echo.
echo ===============================
echo   访问地址:
echo   主页: http://localhost:5001
echo   后台: http://localhost:5001/admin/
echo   密码: admin123
echo ===============================
echo.

python app.py
pause
