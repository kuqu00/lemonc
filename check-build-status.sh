#!/bin/bash

# 检查 GitHub Actions 构建状态脚本
REPO="kuqu00/lemonc"

echo "=== 检查 GitHub Actions 构建状态 ==="
echo ""

# 获取最近的 workflow runs
response=$(curl -s "https://api.github.com/repos/$REPO/actions/runs?per_page=5")

# 提取关键信息
echo "最近的构建记录："
echo ""
echo "$response" | grep -E '"head_branch"|"conclusion"|"status"|"run_number"|"created_at"|"name"' | head -30

echo ""
echo "=== 检查完成 ==="
echo "查看详细日志: https://github.com/$REPO/actions"
