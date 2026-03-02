# GitHub Actions 自动构建指南

## 快速开始

### 第一步: 推送代码到 GitHub

1. **创建 GitHub 仓库**
   - 访问 https://github.com/new
   - 创建新仓库,例如: `lemonc-office-system`

2. **初始化 Git**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: lemonC office system"
   ```

3. **连接远程仓库**
   ```bash
   git remote add origin https://github.com/你的用户名/lemonc-office-system.git
   git branch -M main
   git push -u origin main
   ```

### 第二步: 触发构建

#### 方法 1: 使用标签推送(推荐)
```bash
git tag v1.0.0
git push origin v1.0.0
```

#### 方法 2: 手动触发
1. 打开 GitHub 仓库
2. 点击 "Actions" 标签
3. 选择 "Tauri Build" workflow
4. 点击 "Run workflow"

### 第三步: 下载构建产物

构建完成后(约 10-15 分钟):

1. **进入 Actions 页面**
   - 仓库 → Actions → 选择最新的构建

2. **下载文件**
   - 在 "Artifacts" 部分下载 `lemonC-windows-latest-build.zip`
   - 或在 "Releases" 页面下载对应版本的安装包

---

## 构建产物说明

构建完成后会生成以下文件:

```
bundle/
├── nsis/
│   └── lemonC_办公系统_1.0.0_x64-setup.exe    # NSIS 安装程序(推荐)
├── msi/
│   └── lemonC_办公系统_1.0.0_x64_en-US.msi    # MSI 安装程序
└── exe/
    └── lemonC_办公系统_1.0.0_x64-setup.exe    # 便携版本
```

---

## 常见问题

### Q: 构建失败怎么办?
A:
1. 检查 Actions 日志中的错误信息
2. 确保所有依赖已提交到仓库
3. 检查 `package.json` 和 `tauri.conf.json` 配置

### Q: 如何修改构建配置?
A: 编辑 `.github/workflows/build.yml`:
- 修改 `platform` 支持其他系统 (ubuntu-latest, macos-latest)
- 修改 `node-version` 使用不同 Node.js 版本
- 修改 `retention-days` 调整产物保存时间

### Q: 如何自动化发布?
A: 使用 GitHub Actions 自动创建 Release:
- 推送带 `v` 前缀的标签 (如 `v1.0.0`)
- workflow 会自动创建 Release 并上传构建产物

### Q: 可以构建其他平台吗?
A: 可以!修改 `build.yml`:
```yaml
matrix:
  platform: [windows-latest, ubuntu-latest, macos-latest]
```

---

## 注意事项

### 网吧使用限制

✅ **可以做的事**:
- 推送代码到 GitHub
- 下载构建好的安装包
- 使用已打包好的应用程序

❌ **不能做的事**:
- 本地构建 Tauri 应用(需要 VS Build Tools)
- 修改后立即测试(需要重新构建)

---

## 替代方案: 预构建二进制

如果你有其他已配置好环境的电脑:

1. **在那台电脑上构建**:
   ```bash
   npm run tauri:build
   ```

2. **复制构建产物**:
   - `src-tauri/target/release/bundle/` 目录

3. **在网吧电脑上使用**:
   - 直接运行安装程序
   - 无需重新编译

---

## 完整工作流程

```
网吧电脑              GitHub              GitHub Actions
  │                   │                       │
  ├── 修改代码 ────────→                       │
  │                   │                       │
  ├── git push ───────→                       │
  │                   │                       │
  │                   ├─── 触发构建 ──────────→
  │                   │                       │
  │                   │                       ├─── 安装依赖
  │                   │                       ├─── 构建前端
  │                   │                       ├─── 编译 Rust
  │                   │                       └─── 打包应用
  │                   │                       │
  │                   ←────────── 构建完成 ──────
  │                   │                       │
  ├── 下载安装包 ────→│                       │
  │                   │                       │
  └── 运行应用 ──────→│                       │
```

---

## 快速命令参考

```bash
# 初始化仓库
git init
git add .
git commit -m "Initial commit"

# 连接远程仓库(替换为你的仓库地址)
git remote add origin https://github.com/你的用户名/你的仓库名.git
git branch -M main

# 首次推送
git push -u origin main

# 后续推送
git add .
git commit -m "Update features"
git push

# 推送标签触发构建
git tag v1.0.0
git push origin v1.0.0

# 删除错误的标签
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0
```

---

**下一步**:
1. 在 GitHub 创建仓库
2. 推送代码
3. 推送标签触发构建
4. 等待构建完成(约 15 分钟)
5. 下载安装包到网吧电脑使用
