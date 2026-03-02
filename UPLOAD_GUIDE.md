# GitHub 上传指南 - 网吧版

## 📦 需要上传的文件清单

### ✅ 必须上传的文件夹 (7 个)

```
✅ src/              - 前端源代码
✅ src-tauri/        - Tauri 后端源代码
✅ public/           - 静态资源
✅ .github/          - GitHub Actions 配置
```

### ✅ 必须上传的配置文件 (9 个)

```
✅ package.json
✅ package-lock.json
✅ tsconfig.json
✅ tsconfig.app.json
✅ tsconfig.node.json
✅ vite.config.ts
✅ tailwind.config.js
✅ postcss.config.js
✅ components.json
```

### ✅ 必须上传的其他文件 (4 个)

```
✅ index.html
✅ eslint.config.js
✅ .gitignore         (如果有)
✅ README.md         (可选,建议保留)
```

---

## ❌ 不需要上传的文件/文件夹

```
❌ node_modules/     (GitHub 会自动安装)
❌ dist/             (GitHub 会自动构建)
❌ .git/             (Git 历史记录,上传新仓库没有)
❌ target/           (Rust 编译产物)
❌ *.md 文档文件     (可选)
```

---

## 🚀 上传步骤

### 1. 创建 GitHub 仓库

1. 访问 https://github.com/new
2. 填写:
   - Repository name: `lemonc-office-system`
   - Description: `LemonC 办公系统 - 纯离线本地办公系统`
   - 选择 Public (推荐) 或 Private
   - **不要勾选** "Add a README file"
3. 点击 "Create repository"

### 2. 上传文件

在创建的仓库页面:

1. 点击上传链接: **"uploading an existing file"**
2. 按顺序上传文件:

**第一批: 根目录配置文件**
- `package.json`
- `package-lock.json`
- `index.html`
- `vite.config.ts`
- `tailwind.config.js`
- `postcss.config.js`
- `components.json`
- `eslint.config.js`
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`

**第二批: 文件夹**
- 拖拽整个 `src/` 文件夹
- 拖拽整个 `src-tauri/` 文件夹
- 拖拽整个 `public/` 文件夹
- 拖拽整个 `.github/` 文件夹

3. 检查所有文件是否已上传
4. 在底部输入提交信息:
   ```
   Initial commit: lemonC office system
   ```
5. 点击绿色按钮: **"Commit changes"**

---

## 🔨 触发构建

上传完成后:

### 方法 1: 手动触发(推荐)

1. 打开仓库
2. 点击顶部 **"Actions"** 标签
3. 左侧选择 **"Tauri Build"**
4. 点击右上角 **"Run workflow"**
5. 选择 `main` 分支
6. 点击绿色 **"Run workflow"** 按钮

### 方法 2: 通过 GitHub 网页版创建 Tag

1. 打开仓库
2. 点击 **"Code"** 标签
3. 在 Releases 右侧点击 **"Create a new release"**
4. 填写:
   - Tag version: `v1.0.0`
   - Release title: `Version 1.0.0`
5. 点击 **"Publish release"**

---

## 📥 下载构建产物

### 等待时间: 约 10-15 分钟

### 下载步骤:

**从 Actions 下载:**
1. Actions → 点击最新的构建
2. 滚动到底部 **Artifacts** 部分
3. 下载 `lemonC-windows-latest-build.zip`

**从 Releases 下载** (如果用方法 2 触发):
1. 打开仓库 → **Releases** 标签
2. 点击 `v1.0.0`
3. 下载以下文件:
   - `lemonC_办公系统_1.0.0_x64-setup.exe` (NSIS 安装包)
   - `lemonC_办公系统_1.0.0_x64_en-US.msi` (MSI 安装包)
   - `lemonC_办公系统_1.0.0_x64-setup.exe` (便携版)

---

## ✅ 验证上传成功

上传完成后,检查:

- `src/` 文件夹应该有 100+ 文件
- `src-tauri/` 文件夹应该有 `src/`, `Cargo.toml`, `tauri.conf.json`
- `.github/workflows/build.yml` 文件存在
- 根目录有 `package.json` 和所有配置文件

---

## 🎯 快速检查清单

上传前确认:

- [ ] 有 GitHub 账号
- [ ] 网络连接正常
- [ ] 准备好所有必需文件
- [ ] 已打开 GitHub 仓库页面

上传后确认:

- [ ] 所有文件已上传成功
- [ ] Actions 标签能看到 workflow
- [ ] 已触发构建
- [ ] 等待 10-15 分钟
- [ ] 下载构建产物

---

## ⚠️ 常见问题

### Q: 上传失败怎么办?
A: 检查网络连接,分批上传,每次不超过 20 个文件。

### Q: 文件太大无法上传?
A: GitHub 单个文件限制 100MB。如果有大文件,使用 Git LFS 或压缩后上传。

### Q: 构建失败?
A: 查看 Actions 日志,确认所有必需文件已上传。

### Q: 如何重新构建?
A: 修改任意文件提交后,重新点击 "Run workflow" 即可。

---

**完成后,你将得到可安装的 Windows 应用程序!**
