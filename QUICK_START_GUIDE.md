# LemonC 办公系统 - 快速打包指南

## ⚡ 5 分钟快速打包

### 📋 前置要求
- ✅ GitHub 账号 (免费注册: https://github.com/signup)
- ✅ 网络连接

---

## 🚀 方案选择

### 当前场景: 网吧环境,无法安装构建工具

**最佳方案: GitHub Actions 云构建**

---

## 📝 操作步骤 (只需 3 步)

### 步骤 1: 创建 GitHub 仓库 (1 分钟)

1. 访问: https://github.com/new
2. 填写:
   - Repository name: `lemonc-office-system`
   - 选择 Public (推荐) 或 Private
   - **不要勾选** "Add a README file"
3. 点击 "Create repository"

### 步骤 2: 推送代码 (1-2 分钟)

双击运行脚本:
```batch
setup-github-push.bat
```

输入:
- GitHub 用户名: `你的用户名`
- 仓库名称: `lemonc-office-system` (默认)

等待推送完成...

### 步骤 3: 下载构建产物 (10-15 分钟)

1. 打开你的 GitHub 仓库
2. 点击顶部 **"Actions"** 标签
3. 点击 **"Tauri Build"** workflow
4. 点击右上角 **"Run workflow"**
5. 等待 10-15 分钟
6. 在 Actions 页面底部下载 `lemonC-windows-latest-build.zip`

---

## ✅ 完成!

解压 `lemonC-windows-latest-build.zip` 后,你会得到:

```
bundle/
├── nsis/
│   └── lemonC_办公系统_1.0.0_x64-setup.exe  ← 双击安装
├── msi/
│   └── lemonC_办公系统_1.0.0_x64_en-US.msi
└── exe/
    └── lemonC_办公系统_1.0.0_x64-setup.exe  ← 便携版,双击运行
```

---

## 🎯 常见问题

### Q: 我没有 GitHub 账号怎么办?
A: 访问 https://github.com/signup 免费注册,只需 1 分钟

### Q: 推送失败怎么办?
A:
1. 确认已在 GitHub 创建仓库
2. 检查仓库名称是否正确
3. 检查网络连接
4. 确认脚本在项目根目录运行

### Q: 构建需要多久?
A: 首次构建约 15 分钟,后续构建约 10 分钟

### Q: 如何重新构建?
A:
1. 修改代码
2. 运行 `git add . && git commit -m "update" && git push`
3. 在 GitHub Actions 页面重新点击 "Run workflow"

### Q: 构建产物有多大?
A:
- NSIS 安装包: ~50-80 MB
- 便携版本: ~100-150 MB
- MSI 安装包: ~50-80 MB

---

## 📦 安装和使用

### 推荐: NSIS 安装包
1. 双击 `lemonC_办公系统_1.0.0_x64-setup.exe`
2. 按照安装向导操作
3. 安装完成后,桌面会有快捷方式
4. 双击快捷方式启动应用

### 备选: 便携版本
1. 双击 `lemonC_办公系统_1.0.0_x64-setup.exe`
2. 直接运行,无需安装
3. 适合临时使用或放在 U 盘中

---

## 🔄 更新流程

下次更新时:

1. 修改代码
2. 推送更新:
   ```batch
   git add .
   git commit -m "update"
   git push
   ```
3. 在 GitHub Actions 重新运行构建
4. 下载新版本

---

## 💡 提示

- 首次推送可能需要 2-3 分钟(取决于网络速度)
- 构建时间取决于 GitHub Actions 队列情况
- 所有构建产物会保存 30 天
- 可以从 GitHub Releases 下载历史版本

---

## 🎉 完成!

现在你可以在网吧电脑上使用 LemonC 办公系统了!

---

**需要更多帮助?**
- 查看 `PACKAGING_RECOMMENDATIONS.md` - 详细方案对比
- 查看 `UPLOAD_GUIDE.md` - 上传指南
- 查看 `GITHUB_BUILD_GUIDE.md` - 构建指南
