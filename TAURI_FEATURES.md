# Tauri 功能实现文档

本文档说明了已实现的 Tauri 桌面功能及其使用方法。

## 已实现功能

### 1. SQLite 数据库 ✅

**功能说明:**
- 使用 SQLite 作为本地数据库,替代 IndexedDB
- 支持完整的 CRUD 操作
- 提供数据导入导出功能
- 支持数据库统计信息查询

**使用方法:**
```typescript
import { exportAllDataFromSqlite, importAllDataToSqlite, getDbStatistics } from '@/utils/sqlite-api';

// 导出所有数据
const data = await exportAllDataFromSqlite();

// 导入数据
await importAllDataToSqlite(data);

// 获取数据库统计
const stats = await getDbStatistics();
```

**数据库位置:**
- Windows: `%APPDATA%\com.lemonc.system\lemonc.db`
- macOS: `~/Library/Application Support/com.lemonc.system/lemonc.db`
- Linux: `~/.config/com.lemonc.system/lemonc.db`

---

### 2. 自动备份定时器 ✅

**功能说明:**
- 可配置自动备份间隔
- 支持启动/停止自动备份
- 备份完成后会在后台创建 ZIP 文件

**使用方法:**
1. 在系统设置 > 系统标签页中启用自动备份
2. 设置备份间隔(分钟)
3. 点击"启动"按钮开始自动备份

**备份文件位置:**
- 与数据库在同一目录的 `backups` 文件夹中
- 文件命名格式: `backup_full_YYYYMMDD_HHMMSS.zip`

---

### 3. 更新机制 ✅

**功能说明:**
- 自动检查系统更新
- 支持一键更新
- 更新完成后自动重启

**使用方法:**
1. 在系统设置 > 系统标签页中点击"检查更新"
2. 如果有新版本,会显示更新按钮
3. 点击"立即更新"下载并安装

**更新服务器配置:**
需要在 `src-tauri/tauri.conf.json` 中配置更新端点:
```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/yourusername/lemonc/releases/latest/download/latest.json"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

**发布更新步骤:**
1. 构建: `npm run tauri build`
2. 上传到 GitHub Releases
3. 创建 `latest.json` 文件

---

### 4. 系统托盘 ✅

**功能说明:**
- 点击托盘图标显示/隐藏窗口
- 右键托盘图标显示菜单
- 最小化窗口自动隐藏到托盘

**使用方法:**
- 应用启动后会在系统托盘显示图标
- 左键点击托盘图标: 切换窗口显示/隐藏
- 右键点击托盘图标: 显示菜单(显示/隐藏/退出)

---

### 5. 拖拽功能 ✅

**功能说明:**
- 无边框窗口支持拖拽
- 自定义标题栏

**使用方法:**
1. 应用使用无边框窗口(`decorations: false`)
2. 在 `data-tauri-drag-region` 属性的区域可以拖拽窗口
3. 使用 `CustomTitleBar` 组件提供窗口控制按钮

**示例:**
```tsx
import { CustomTitleBar } from '@/components/CustomTitleBar';
import { useWindowControls } from '@/hooks/useWindowControls';

function App() {
  const { minimize, maximize, close } = useWindowControls();

  return (
    <>
      <CustomTitleBar
        title="lemonC 办公系统"
        onMinimize={minimize}
        onMaximize={maximize}
        onClose={close}
      />
      {/* 其他内容 */}
    </>
  );
}
```

---

### 6. 窗口状态记忆 ✅

**功能说明:**
- 自动记住窗口位置和大小
- 自动记住窗口最大化状态

**使用方法:**
- 已集成到应用中,无需手动配置
- 应用启动时会自动恢复上次的窗口状态

---

## 开发配置

### 添加依赖

`src-tauri/Cargo.toml`:
```toml
[dependencies]
sqlx = { version = "0.7", features = ["runtime-tokio-rustls", "sqlite", "chrono", "uuid"] }
tokio = { version = "1.0", features = ["full"] }
uuid = { version = "1.0", features = ["v4", "serde"] }
tauri-plugin-window-state = "2"
tauri-plugin-updater = "2"
tauri-plugin-drag = "2"
```

### 构建命令

```bash
# 开发模式
npm run tauri dev

# 构建生产版本
npm run tauri build

# 构建特定平台
npm run tauri build -- --target nsis
npm run tauri build -- --target msi
npm run tauri build -- --target portable
```

---

## 后续可扩展功能

1. **全局快捷键**: 快速打开应用、添加待办等
2. **自启动**: 系统开机自动启动
3. **数据加密**: 敏感数据加密存储
4. **OCR 文字识别**: 图片转文字
5. **邮件集成**: 直接发送邮件
6. **日历同步**: 导出/导入日历文件

---

## 注意事项

1. **数据库迁移**: 从 IndexedDB 迁移到 SQLite 需要手动导出旧数据
2. **更新服务器**: 需要配置自己的更新服务器或使用 GitHub Releases
3. **代码签名**: 发布正式版本需要代码签名,否则会触发系统警告
4. **Windows Defender**: 首次运行可能需要添加信任

---

## 故障排除

### 数据库初始化失败
- 检查应用是否有写入权限
- 确认应用数据目录存在

### 自动备份不工作
- 检查是否已点击"启动"按钮
- 查看控制台日志

### 更新检查失败
- 确认网络连接正常
- 检查更新服务器地址是否正确

### 系统托盘不显示
- 检查系统托盘设置
- 重新启动应用
