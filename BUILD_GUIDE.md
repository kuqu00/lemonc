# Tauri 打包完整指南

## 前置条件检查

### 必需软件

1. **Node.js** (推荐 v18+)
   ```bash
   node --version
   ```

2. **npm**
   ```bash
   npm --version
   ```

3. **Rust** (推荐最新稳定版)
   ```bash
   rustc --version
   cargo --version
   ```

4. **Tauri CLI** (可选,也可通过 npm 运行)
   ```bash
   npm install -g @tauri-apps/cli
   ```

### Windows 额外要求

- **WebView2 Runtime** (Windows 10/11 通常已预装)
- **Microsoft Visual C++ Redistributable**
- **NSIS** (用于创建安装程序,通常 Tauri 会自动下载)

### macOS 额外要求

- **Xcode Command Line Tools**
  ```bash
  xcode-select --install
  ```

### Linux 额外要求

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

---

## 构建前检查

### 运行检查脚本

**Windows:**
```cmd
check-build.bat
```

**Linux/macOS:**
```bash
chmod +x check-build.sh
./check-build.sh
```

### 手动检查清单

- [ ] Node.js 已安装
- [ ] npm 已安装
- [ ] Rust 已安装
- [ ] `src-tauri/tauri.conf.json` 存在且配置正确
- [ ] `src-tauri/Cargo.toml` 存在
- [ ] `src-tauri/src/main.rs` 存在且编译无错误
- [ ] 图标文件存在 (`src-tauri/icons/`)
- [ ] `node_modules` 已安装
- [ ] 端口配置正确 (8093)

---

## 开发模式构建

### 启动开发服务器

```bash
npm run tauri:dev
```

这会:
1. 启动 Vite 开发服务器
2. 编译 Rust 后端
3. 启动 Tauri 应用窗口

### 常见问题

**问题**: `error: linking with cc failed`
**解决**: 确保安装了 C++ 编译器 (Windows 需要 Visual Studio Build Tools)

**问题**: `Error: Cannot find module`
**解决**: 运行 `npm install`

**问题**: 窗口无法启动
**解决**: 检查端口 8093 是否被占用

---

## 生产构建

### 基础构建命令

```bash
npm run tauri:build
```

### 构建特定平台

#### Windows
```bash
# NSIS 安装程序 (默认)
npm run tauri build

# MSI 安装程序
npm run tauri build -- --target msi

# 便携版本 (无需安装)
npm run tauri build -- --target portable
```

#### macOS
```bash
# 通用二进制 (支持 Intel + Apple Silicon)
npm run tauri build -- --target universal-apple-darwin

# 仅 Intel
npm run tauri build -- --target x86_64-apple-darwin

# 仅 Apple Silicon
npm run tauri build -- --target aarch64-apple-darwin

# DMG 磁盘映像
npm run tauri build -- --target dmg
```

#### Linux
```bash
# AppImage
npm run tauri build -- --target appimage

# Debian 包
npm run tauri build -- --target deb

# RPM 包
npm run tauri build -- --target rpm
```

---

## 构建产物位置

### Windows
```
src-tauri/target/release/bundle/
├── nsis/          # NSIS 安装程序
│   └── lemonC_办公系统_1.0.0_x64-setup.exe
├── msi/           # MSI 安装程序
│   └── lemonC_办公系统_1.0.0_x64_en-US.msi
└── exe/           # 便携版本
    └── lemonC_办公系统.exe
```

### macOS
```
src-tauri/target/release/bundle/
├── dmg/           # DMG 磁盘映像
│   └── lemonC_办公系统_1.0.0_x64.dmg
└── app/           # 应用程序包
    └── lemonC_办公系统.app
```

### Linux
```
src-tauri/target/release/bundle/
├── appimage/      # AppImage
│   └── lemonC_办公系统_1.0.0_amd64.AppImage
├── deb/           # Debian 包
│   └── lemonc_1.0.0_amd64.deb
└── app/           # 无包应用
    └── lemonC_办公系统
```

---

## 代码签名

### Windows

1. **获取代码签名证书**
   - 从受信任的 CA 购买证书
   - 或使用自签名证书 (仅用于测试)

2. **配置签名**

在 `src-tauri/tauri.conf.json` 中:
```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "YOUR_CERTIFICATE_THUMBPRINT",
      "timestampUrl": "http://timestamp.digicert.com",
      "digestAlgorithm": "sha256"
    }
  }
}
```

3. **构建**
```bash
npm run tauri build
```

### macOS

1. **获取开发者证书**
   - 从 Apple Developer 获取

2. **配置签名**

```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
      "entitlements": "entitlements.plist",
      "providerShortName": "YOUR_TEAM_ID"
    }
  }
}
```

---

## 优化构建

### 减小体积

1. **启用 LTO (Link Time Optimization)**
   ```toml
   [profile.release]
   lto = true
   ```

2. **优化编译时间**
   ```toml
   [profile.release]
   opt-level = "z"  # 最小化体积
   codegen-units = 1
   ```

3. **启用增量编译**
   ```bash
   export CARGO_INCREMENTAL=1
   ```

### 加速构建

```bash
# 使用更多核心
export CARGO_BUILD_JOBS=8

# 使用 mold 链接器 (Linux)
cargo install mold

# 使用 lld 链接器 (Windows)
```

---

## 自动更新配置

### 1. 准备更新服务器

创建 `latest.json`:
```json
{
  "version": "1.0.1",
  "notes": "Bug 修复和性能优化",
  "pub_date": "2026-03-02T10:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "",
      "url": "https://example.com/downloads/lemonC_1.0.1-setup.exe"
    }
  }
}
```

### 2. 签名更新包

```bash
# 使用 Tauri CLI 签名
tauri signer sign path/to/update.exe pubkey.pem
```

### 3. 启用更新插件

在 `src-tauri/tauri.conf.json` 中:
```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": ["https://example.com/latest.json"],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY"
    }
  }
}
```

---

## 故障排除

### 常见错误

#### 1. `error: failed to run custom build command for openssl-sys`
```bash
# Windows (使用 vcpkg)
vcpkg install openssl:x64-windows-static

# Linux
sudo apt install libssl-dev pkg-config

# macOS
brew install openssl
```

#### 2. `error: Microsoft Visual C++ 14.0 is required`
- 安装 Visual Studio 2019/2022
- 选择 "C++ build tools"
- 确保安装了 "MSVC v142" 或更新版本

#### 3. `Error: The build failed`
```bash
# 清理构建缓存
npm run tauri clean

# 重新构建
npm run tauri build
```

#### 4. `Error: Target triple not found`
```bash
# 添加目标
rustup target add x86_64-pc-windows-msvc
```

### 调试构建

```bash
# 启用详细日志
npm run tauri build -- --verbose

# 检查 Rust 编译错误
cd src-tauri
cargo build --release --verbose
```

---

## 发布清单

### 发布前检查

- [ ] 所有功能测试通过
- [ ] 无控制台错误或警告
- [ ] 版本号已更新
- [ ] CHANGELOG.md 已更新
- [ ] README.md 已更新
- [ ] 图标和元数据正确
- [ ] 已进行代码签名 (如需要)
- [ ] 已在不同系统上测试
- [ ] 许可证文件已包含
- [ ] 用户文档完整

### 发布到 GitHub Releases

```bash
# 1. 创建 Git 标签
git tag v1.0.0
git push origin v1.0.0

# 2. 构建所有平台
npm run tauri build -- --target universal-apple-darwin
npm run tauri build -- --target appimage deb
npm run tauri build

# 3. 上传到 GitHub Releases
# 使用 GitHub CLI 或手动上传
```

---

## 性能优化建议

1. **使用生产构建**
   ```bash
   NODE_ENV=production npm run tauri build
   ```

2. **压缩资源**
   - 压缩图片
   - 最小化 CSS/JS
   - 使用 Gzip/Brotli

3. **优化数据库查询**
   - 添加索引
   - 使用连接池
   - 缓存常用查询

4. **懒加载组件**
   ```typescript
   const HeavyComponent = lazy(() => import('./HeavyComponent'));
   ```

---

## 参考资源

- [Tauri 官方文档](https://tauri.app/)
- [Tauri GitHub](https://github.com/tauri-apps/tauri)
- [Rust 官方文档](https://www.rust-lang.org/)
- [Webview2 下载](https://developer.microsoft.com/microsoft-edge/webview2/)

---

## 获取帮助

如果遇到问题:

1. 查看 [Tauri FAQ](https://tauri.app/faq/)
2. 搜索 [GitHub Issues](https://github.com/tauri-apps/tauri/issues)
3. 在 [Tauri Discord](https://discord.gg/tauri) 提问
4. 查看项目日志: `src-tauri/target/release/build.log`

---

**祝构建顺利! 🚀**
