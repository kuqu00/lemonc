# Web 和 Tauri 混合模式说明

本项目同时支持 Web 浏览器和 Tauri 桌面应用,采用条件加载策略确保在两种环境下都能正常运行。

## 设计原则

### 1. **条件导入 (Conditional Imports)**

Tauri 特定的 API 使用动态导入,避免在 Web 环境中报错:

```typescript
// ✅ 正确做法
const loadUpdaterPlugin = async () => {
  try {
    const plugin = await import('@tauri-apps/plugin-updater');
    return plugin;
  } catch {
    return null;
  }
};

// ❌ 错误做法
import { checkUpdate } from '@tauri-apps/plugin-updater';
```

### 2. **环境检测**

使用 `isTauri()` 函数检测运行环境:

```typescript
import { isTauri } from '@/lib/localDataStore';

if (isTauri()) {
  // Tauri 桌面环境
  const stats = await getDbStatistics();
} else {
  // Web 浏览器环境
  // 使用替代方案或不显示该功能
}
```

### 3. **UI 条件渲染**

仅在 Tauri 环境显示桌面特定功能:

```tsx
{isTauri() && (
  <Card>
    <CardHeader>
      <CardTitle>系统托盘</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Tauri 特定功能 */}
    </CardContent>
  </Card>
)}
```

## 功能对比

| 功能 | Web 环境 | Tauri 环境 | 实现方式 |
|------|---------|-----------|---------|
| 数据存储 | IndexedDB | SQLite | 环境检测 |
| 窗口控制 | 不支持 | 支持 | 条件渲染 |
| 系统托盘 | 不支持 | 支持 | 条件渲染 |
| 自动备份 | 不支持 | 支持 | 条件渲染 |
| 自动更新 | 不支持 | 支持 | 条件渲染 |
| 窗口状态记忆 | 不支持 | 支持 | 插件集成 |
| 拖拽功能 | 不支持 | 支持 | 配置开关 |

## Web 环境降级方案

### 数据存储

Web 环境继续使用 IndexedDB:

```typescript
// Web 环境使用 IndexedDB
import { db } from '@/db';
const notes = await db.notes.toArray();

// Tauri 环境使用 SQLite
import { exportAllDataFromSqlite } from '@/utils/sqlite-api';
const data = await exportAllDataFromSqlite();
```

### 备份功能

Web 环境提供下载备份:

```typescript
if (isTauri()) {
  // Tauri: 保存到本地文件系统
  await performFullBackup();
} else {
  // Web: 下载 JSON 文件
  handleExportData();
}
```

## 开发模式

### Web 开发

```bash
# 在浏览器中开发
npm run dev

# 访问 http://localhost:8093
```

### Tauri 开发

```bash
# 在桌面环境中开发
npm run tauri dev

# 首次运行会自动安装 Tauri CLI
```

## 构建部署

### Web 部署

```bash
# 构建静态文件
npm run build

# 输出到 dist 目录
# 可以部署到任何静态服务器
```

### Tauri 打包

```bash
# 构建桌面应用
npm run tauri build

# 输出文件位置:
# - Windows: src-tauri/target/release/bundle/
# - macOS: src-tauri/target/release/bundle/
# - Linux: src-tauri/target/release/bundle/
```

## 常见问题

### Q: Web 环境为什么不能使用某些功能?
A: 浏览器安全限制无法访问文件系统、窗口控制等桌面 API。这些功能仅在 Tauri 桌面环境可用。

### Q: 如何在 Web 环境测试 Tauri 功能?
A: Tauri 功能必须在 Tauri 环境中测试。使用 `npm run tauri dev` 启动桌面版本进行测试。

### Q: 数据能否在 Web 和 Tauri 之间迁移?
A: 可以。Web 环境使用导出 JSON, Tauri 环境支持导入 JSON 备份。

### Q: 为什么使用动态导入?
A: 避免打包器在构建时尝试解析 Tauri 特定模块,导致 Web 构建失败。

## 最佳实践

1. **始终检测环境**: 使用 `isTauri()` 检测运行环境
2. **优雅降级**: 为 Web 环境提供替代方案
3. **UI 提示**: 清楚标明哪些功能仅在桌面版可用
4. **错误处理**: Tauri API 调用始终使用 try-catch
5. **类型安全**: 为不同环境使用适当的类型定义

## 示例: 混合功能组件

```tsx
function DataBackupCard() {
  const { isTauri } = useEnvironment();

  if (isTauri()) {
    // Tauri 版本
    return (
      <Card>
        <CardHeader>
          <CardTitle>本地备份</CardTitle>
          <CardDescription>数据自动保存到本地目录</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleFullBackup}>立即备份</Button>
        </CardContent>
      </Card>
    );
  }

  // Web 版本
  return (
    <Card>
      <CardHeader>
        <CardTitle>导出数据</CardTitle>
        <CardDescription>下载备份文件到本地</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleDownload}>下载备份</Button>
      </CardContent>
    </Card>
  );
}
```

---

## 总结

通过条件导入和环境检测,我们实现了 Web 和 Tauri 的无缝切换。用户可以在浏览器中快速预览和开发,同时享受 Tauri 桌面应用的完整功能。
