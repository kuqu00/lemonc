# Vite 依赖缓存问题修复指南

## 问题说明
出现 "Failed to load resource: the server responded with a status of 504 (Outdated Optimize Dep)" 错误,是因为 Vite 的依赖预构建缓存过期或损坏。

## 快速修复方案

### 方法 1: 清理 Vite 缓存并重新启动 (推荐)

```bash
# 停止当前运行的开发服务器 (Ctrl+C)

# 清理 Vite 缓存
rmdir /s /q node_modules\.vite

# 重新启动开发服务器
npm run dev
```

### 方法 2: 使用 --force 参数强制重新构建

```bash
npm run dev -- --force
```

### 方法 3: 完全重新安装依赖 (如果方法1和2无效)

```bash
# 关闭所有占用 node_modules 的程序 (IDE、终端等)

# 删除 node_modules
rmdir /s /q node_modules

# 删除 package-lock.json
del package-lock.json

# 重新安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 自动修复脚本

我已为您创建了 `fix-start.bat` 脚本,双击运行即可自动修复:

1. 关闭当前运行的开发服务器
2. 双击 `fix-start.bat`
3. 等待依赖安装完成
4. 浏览器会自动打开 http://localhost:8099

## 常见问题

### Q: 文件被占用无法删除怎么办?
A:
1. 关闭 VS Code
2. 关闭所有终端窗口
3. 检查是否有其他程序访问 node_modules
4. 使用任务管理器结束可能的占用进程

### Q: npm install 很慢怎么办?
A:
```bash
# 使用淘宝镜像源
npm config set registry https://registry.npmmirror.com

# 然后重新安装
npm install
```

### Q: 504 错误还是出现怎么办?
A:
```bash
# 删除 .vite 缓存目录
rmdir /s /q .vite

# 删除 node_modules 中的 Vite 依赖
rmdir /s /q node_modules\.vite

# 重新安装依赖
npm install

# 启动
npm run dev
```

## 预防措施

### 1. 定期清理缓存
在 `package.json` 中添加清理脚本:

```json
{
  "scripts": {
    "clean": "rimraf node_modules/.vite && rimraf .vite"
  }
}
```

### 2. 使用最新版本的 Vite
```bash
npm install vite@latest -D
```

### 3. 避免频繁修改 package.json
尽量集中修改依赖,避免触发多次重新构建。

## 当前项目配置

项目配置了以下端口:
- 开发服务器: http://localhost:8099
- Vite 配置文件: `vite.config.ts`

## 技术细节

### Vite 依赖预构建
Vite 会在启动时预构建依赖到 `node_modules/.vite` 目录,以提高启动速度。当依赖变更或缓存过期时,会出现 504 错误。

### 强制重新构建
`--force` 参数会强制 Vite 重新构建所有依赖,忽略现有缓存。

## 联系支持

如果以上方法都无法解决问题,请检查:
1. Node.js 版本是否过旧 (建议 18+)
2. npm 版本是否过旧 (建议 9+)
3. 磁盘空间是否充足
4. 是否有防火墙或杀毒软件拦截
