@echo off
chcp 65001 >nul
echo ========================================
echo lemonC 依赖修复工具
echo ========================================
echo.

echo [1/4] 检查进程占用...
tasklist | findstr "node.exe" >nul
if %errorlevel%==0 (
    echo 检测到 Node.js 进程正在运行
    echo 请先关闭所有终端窗口和 VS Code
    echo.
    choice /C YN /M "是否尝试自动结束 Node 进程"
    if %errorlevel%==1 (
        echo 正在结束 Node 进程...
        taskkill /F /IM node.exe >nul 2>&1
        timeout /t 2 >nul
    )
)

echo.
echo [2/4] 清理缓存和临时文件...
if exist node_modules\.vite (
    echo   - 删除 Vite 缓存
    rmdir /s /q node_modules\.vite 2>nul
)
if exist .vite (
    echo   - 删除项目 .vite 目录
    rmdir /s /q .vite 2>nul
)
if exist dist (
    echo   - 删除 dist 目录
    rmdir /s /q dist 2>nul
)

echo.
echo [3/4] 尝试删除 node_modules...
rmdir /s /q node_modules 2>nul
if exist node_modules (
    echo   警告: node_modules 仍然存在,可能被占用
    echo   请尝试:
    echo   1. 重启电脑
    echo   2. 手动删除 node_modules 文件夹
    echo   3. 然后重新运行此脚本
    echo.
    pause
    exit /b 1
) else (
    echo   ✓ node_modules 已删除
)

echo.
echo [4/4] 重新安装依赖...
echo   这可能需要几分钟时间,请耐心等待...
echo.

npm install

if %errorlevel%==0 (
    echo.
    echo ========================================
    echo ✓ 依赖安装成功!
    echo ========================================
    echo.
    echo 现在可以运行: npm run dev
    echo.
) else (
    echo.
    echo ========================================
    echo ✗ 依赖安装失败
    echo ========================================
    echo.
    echo 可能的解决方案:
    echo 1. 检查网络连接
    echo 2. 使用淘宝镜像: npm config set registry https://registry.npmmirror.com
    echo 3. 删除 package-lock.json 后重试
    echo.
)

pause
