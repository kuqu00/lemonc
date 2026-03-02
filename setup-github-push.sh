#!/bin/bash

echo "========================================"
echo "GitHub HTTPS 推送配置脚本"
echo "========================================"
echo ""

# 检查 Git 是否安装
if ! command -v git &> /dev/null; then
    echo "[错误] Git 未安装"
    echo "请先安装 Git: https://git-scm.com/downloads"
    exit 1
fi

echo "[✓] Git 已安装"
echo ""

# 获取用户输入
read -p "请输入你的 GitHub 用户名: " GITHUB_USERNAME
read -p "请输入仓库名称 (默认: lemonc-office-system): " REPO_NAME
REPO_NAME=${REPO_NAME:-lemonc-office-system}

echo ""
echo "========================================"
echo "配置信息"
echo "========================================"
echo "GitHub 用户名: $GITHUB_USERNAME"
echo "仓库名称: $REPO_NAME"
echo "仓库地址: https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
echo ""
read -p "确认继续? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 0
fi

# 删除旧的远程仓库
echo ""
echo "[1/6] 移除旧的远程仓库配置..."
git remote remove origin 2>/dev/null

# 添加新的 HTTPS 远程仓库
echo "[2/6] 添加 HTTPS 远程仓库..."
git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git

# 检查当前分支
echo "[3/6] 检查当前分支..."
git branch -M main

# 添加所有文件
echo "[4/6] 添加所有文件到 Git..."
git add .

# 提交文件
echo "[5/6] 提交文件..."
git commit -m "Initial commit: lemonC office system"

# 推送到 GitHub
echo "[6/6] 推送到 GitHub..."
echo ""
echo "========================================"
echo "推送中,请稍候..."
echo "========================================"
echo ""

git push -u origin main

if [ $? -ne 0 ]; then
    echo ""
    echo "========================================"
    echo "[错误] 推送失败!"
    echo "========================================"
    echo "可能的原因:"
    echo "1. 仓库不存在 - 请先在 GitHub 创建仓库: https://github.com/new"
    echo "2. 仓库名称错误 - 请检查仓库名称是否正确"
    echo "3. 网络连接问题 - 请检查网络连接"
    echo "4. 权限问题 - 请确保你有该仓库的推送权限"
    echo ""
    echo "手动创建仓库步骤:"
    echo "1. 访问: https://github.com/new"
    echo "2. 仓库名: $REPO_NAME"
    echo "3. 点击 'Create repository'"
    echo "4. 重新运行此脚本"
    echo ""
    exit 1
fi

echo ""
echo "========================================"
echo "[✓] 推送成功!"
echo "========================================"
echo "仓库地址: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo ""
echo "下一步:"
echo "1. 访问 Actions 标签触发构建"
echo "2. 等待 10-15 分钟"
echo "3. 下载构建产物"
echo ""
