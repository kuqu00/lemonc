# Tauri 版本构建说明

## 构建结果

### macOS 版本 ✅
- **文件**: `财务管理系统-macOS.dmg` (3.9 MB)
- **位置**: `/Users/clemon/Documents/28/codeb/财务管理系统-macOS.dmg`
- **状态**: 构建成功

### Windows 版本 ⏳
- 需要在 Windows 环境或 GitHub Actions 上构建
- GitHub Actions 配置已创建: `.github/workflows/build.yml`

## 功能特性

### 1. 本地数据存储
- 数据存储在应用数据目录的 JSON 文件中
- 支持用户、客户、贷款、还款、产品、设置等数据类型
- 文件位置可通过设置查看

### 2. 备份功能
- **全量备份**: 备份所有数据文件
- **增量备份**: 只备份修改过的文件
- **自动备份**: 智能选择（7天自动全量）
- **备份恢复**: 从备份文件恢复数据
- **备份管理**: 查看、删除历史备份

### 3. 体积对比
| 版本 | 体积 | 优势 |
|------|------|------|
| Electron | 107 MB | 功能完整，兼容性好 |
| Tauri | 3.9 MB (DMG) | 体积小 27 倍 |
| 网页版 | ~2 MB | 无需安装 |

## 使用方法

### macOS
1. 双击 `财务管理系统-macOS.dmg`
2. 将应用拖到 Applications 文件夹
3. 从启动台或应用程序文件夹打开

### Windows
推送代码到 GitHub 后，GitHub Actions 会自动构建 Windows 版本。

## 数据存储位置

### macOS
```
~/Library/Application Support/com.finance.manager/
```

### Windows
```
%APPDATA%/com.finance.manager/
```

## 开发命令

```bash
# 开发模式
npm run tauri dev

# 构建
npm run tauri build

# 构建 Windows 版本（需要 Windows 环境）
npm run tauri build -- --target x86_64-pc-windows-msvc
```

## 技术栈

- **前端**: React + TypeScript + Vite
- **后端**: Rust + Tauri
- **压缩**: zip crate
- **时间**: chrono crate
