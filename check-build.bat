@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo =========================================
echo Tauri 构建配置检查
echo =========================================
echo.

:: 检查 Node.js
where node > nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js 未安装
    pause
    exit /b 1
)
for /f "delims=" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js: %NODE_VERSION%

:: 检查 npm
where npm > nul 2>&1
if errorlevel 1 (
    echo ❌ npm 未安装
    pause
    exit /b 1
)
for /f "delims=" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✓ npm: %NPM_VERSION%

:: 检查 Rust
where rustc > nul 2>&1
if errorlevel 1 (
    echo ❌ Rust 未安装
    echo 请访问 https://rustup.rs/ 安装 Rust
    pause
    exit /b 1
)
for /f "delims=" %%i in ('rustc --version') do set RUST_VERSION=%%i
echo ✓ Rust: %RUST_VERSION%

:: 检查 Cargo
where cargo > nul 2>&1
if errorlevel 1 (
    echo ❌ Cargo 未安装
    pause
    exit /b 1
)
for /f "delims=" %%i in ('cargo --version') do set CARGO_VERSION=%%i
echo ✓ Cargo: %CARGO_VERSION%

:: 检查 Tauri CLI
where tauri > nul 2>&1
if errorlevel 1 (
    echo ⚠️  Tauri CLI 未安装
    echo 安装命令: npm install -g @tauri-apps/cli
)

echo.
echo =========================================
echo 检查配置文件
echo =========================================

:: 检查 tauri.conf.json
if not exist "src-tauri\tauri.conf.json" (
    echo ❌ src-tauri\tauri.conf.json 不存在
    pause
    exit /b 1
)
echo ✓ tauri.conf.json 存在

:: 检查 Cargo.toml
if not exist "src-tauri\Cargo.toml" (
    echo ❌ src-tauri\Cargo.toml 不存在
    pause
    exit /b 1
)
echo ✓ Cargo.toml 存在

:: 检查 main.rs
if not exist "src-tauri\src\main.rs" (
    echo ❌ src-tauri\src\main.rs 不存在
    pause
    exit /b 1
)
echo ✓ main.rs 存在

:: 检查图标
if not exist "src-tauri\icons\icon.ico" (
    echo ⚠️  src-tauri\icons\icon.ico 不存在
)
if not exist "src-tauri\icons\128x128.png" (
    echo ⚠️  src-tauri\icons\128x128.png 不存在
)
if not exist "src-tauri\icons\32x32.png" (
    echo ⚠️  src-tauri\icons\32x32.png 不存在
)

echo.
echo =========================================
echo 检查依赖
echo =========================================

:: 检查 node_modules
if not exist "node_modules" (
    echo ⚠️  node_modules 不存在,需要运行 npm install
)

:: 检查 package.json
if not exist "package.json" (
    echo ❌ package.json 不存在
    pause
    exit /b 1
)
echo ✓ package.json 存在

echo.
echo =========================================
echo 检查完成!
echo =========================================
echo.
echo 可以运行以下命令开始构建:
echo   npm run tauri:dev      ^# 开发模式
echo   npm run tauri:build    ^# 生产构建
echo.
pause
