#!/bin/bash

# Tauri 构建前检查脚本

echo "========================================="
echo "Tauri 构建配置检查"
echo "========================================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi
echo "✓ Node.js: $(node --version)"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi
echo "✓ npm: $(npm --version)"

# 检查 Rust
if ! command -v rustc &> /dev/null; then
    echo "❌ Rust 未安装"
    echo "请访问 https://rustup.rs/ 安装 Rust"
    exit 1
fi
echo "✓ Rust: $(rustc --version)"

# 检查 Cargo
if ! command -v cargo &> /dev/null; then
    echo "❌ Cargo 未安装"
    exit 1
fi
echo "✓ Cargo: $(cargo --version)"

# 检查 Tauri CLI
if ! command -v tauri &> /dev/null; then
    echo "⚠️  Tauri CLI 未安装"
    echo "安装命令: npm install -g @tauri-apps/cli"
fi

echo ""
echo "========================================="
echo "检查配置文件"
echo "========================================="

# 检查 tauri.conf.json
if [ ! -f "src-tauri/tauri.conf.json" ]; then
    echo "❌ src-tauri/tauri.conf.json 不存在"
    exit 1
fi
echo "✓ tauri.conf.json 存在"

# 检查 Cargo.toml
if [ ! -f "src-tauri/Cargo.toml" ]; then
    echo "❌ src-tauri/Cargo.toml 不存在"
    exit 1
fi
echo "✓ Cargo.toml 存在"

# 检查 main.rs
if [ ! -f "src-tauri/src/main.rs" ]; then
    echo "❌ src-tauri/src/main.rs 不存在"
    exit 1
fi
echo "✓ main.rs 存在"

# 检查图标
if [ ! -f "src-tauri/icons/icon.ico" ]; then
    echo "⚠️  src-tauri/icons/icon.ico 不存在"
fi
if [ ! -f "src-tauri/icons/128x128.png" ]; then
    echo "⚠️  src-tauri/icons/128x128.png 不存在"
fi
if [ ! -f "src-tauri/icons/32x32.png" ]; then
    echo "⚠️  src-tauri/icons/32x32.png 不存在"
fi

echo ""
echo "========================================="
echo "检查依赖"
echo "========================================="

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules 不存在,需要运行 npm install"
fi

# 检查 package.json
if [ ! -f "package.json" ]; then
    echo "❌ package.json 不存在"
    exit 1
fi
echo "✓ package.json 存在"

echo ""
echo "========================================="
echo "检查完成!"
echo "========================================="
echo ""
echo "可以运行以下命令开始构建:"
echo "  npm run tauri:dev      # 开发模式"
echo "  npm run tauri:build    # 生产构建"
echo ""
