# 依赖安装问题快速修复指南

## 问题原因
`vite` 命令找不到,说明 `node_modules` 没有正确安装或已损坏。

## 🔧 快速解决方案

### 方案 1: 使用自动修复脚本 (推荐)

我已为您创建了 `fix-deps.bat` 脚本,它会自动:

1. ✅ 检查并结束占用的 Node 进程
2. ✅ 清理所有缓存文件
3. ✅ 删除损坏的 node_modules
4. ✅ 重新安装所有依赖

**使用步骤:**
1. 关闭所有终端窗口
2. 双击运行 `fix-deps.bat`
3. 等待安装完成 (可能需要 5-10 分钟)
4. 安装成功后运行 `npm run dev`

---

### 方案 2: 手动修复步骤

如果自动脚本无法运行,请按以下步骤手动操作:

#### 步骤 1: 清理进程和缓存

```batch
# 结束所有 Node 进程
taskkill /F /IM node.exe

# 删除缓存目录
rmdir /s /q node_modules\.vite
rmdir /s /q .vite
rmdir /s /q dist
```

#### 步骤 2: 删除 node_modules

```batch
rmdir /s /q node_modules
```

**如果提示"拒绝访问"或"另一个程序正在使用此文件":**

1. 关闭 VS Code
2. 关闭所有终端窗口
3. 重启电脑
4. 重新执行删除命令

#### 步骤 3: 重新安装依赖

```batch
npm install
```

**如果安装很慢,使用淘宝镜像:**

```batch
npm config set registry https://registry.npmmirror.com
npm install
```

#### 步骤 4: 启动开发服务器

```batch
npm run dev
```

---

### 方案 3: 完全重置 (最后手段)

如果以上方法都失败,执行完全重置:

```batch
# 1. 删除所有相关文件
rmdir /s /q node_modules
del package-lock.json
rmdir /s /q .vite

# 2. 清理 npm 缓存
npm cache clean --force

# 3. 重新安装
npm install

# 4. 启动
npm run dev
```

---

## 📋 常见问题解答

### Q1: npm install 失败,显示 EBUSY 错误
**A:** 文件被占用,按以下步骤操作:
1. 重启电脑
2. 运行 `fix-deps.bat`
3. 或手动删除 node_modules

### Q2: npm install 速度很慢
**A:** 使用国内镜像源:

```batch
npm config set registry https://registry.npmmirror.com
npm config get registry  # 确认设置成功
```

### Q3: 安装后运行 npm run dev 还是报错
**A:** 尝试:

```batch
# 强制重新构建
npm run dev -- --force

# 或删除 .vite 缓存后重启
rmdir /s /q node_modules\.vite
npm run dev
```

### Q4: 提示 "node_modules/.vite" 权限问题
**A:** 以管理员身份运行命令提示符:

1. 右键点击"命令提示符"
2. 选择"以管理员身份运行"
3. 执行修复步骤

### Q5: 依赖版本冲突
**A:** 删除 package-lock.json 后重新安装:

```batch
del package-lock.json
npm install
```

---

## 🎯 推荐工作流程

### 首次安装
```batch
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 打开浏览器访问 http://localhost:8099
```

### 日常开发
```batch
# 启动服务器
npm run dev
```

### 遇到问题时
```batch
# 运行自动修复脚本
fix-deps.bat

# 或手动清理并重启
rmdir /s /q node_modules\.vite
npm run dev -- --force
```

---

## 📁 项目关键文件

- `package.json` - 项目配置和依赖列表
- `vite.config.ts` - Vite 配置文件
- `package-lock.json` - 依赖锁定文件 (可删除重新生成)
- `node_modules/` - 依赖安装目录

---

## 🔍 验证安装成功

执行以下命令验证:

```batch
# 检查 Node.js 版本
node --version  # 应该显示 v18+ 或更高

# 检查 npm 版本
npm --version   # 应该显示 v9+ 或更高

# 检查 Vite 是否安装
npx vite --version

# 列出已安装的包
npm list vite
```

如果 Vite 版本正常显示,说明安装成功!

---

## 💡 最佳实践

1. **定期更新依赖**:
   ```batch
   npm update
   ```

2. **清理缓存**:
   ```batch
   npm cache clean --force
   ```

3. **使用锁文件**:
   - 不要删除 `package-lock.json`
   - 提交到版本控制
   - 确保团队成员使用相同版本

4. **监控磁盘空间**:
   - node_modules 可能占用 500MB+
   - 定期清理不需要的项目

---

## 📞 获取帮助

如果问题仍未解决:

1. 查看完整错误信息
2. 检查 Node.js 和 npm 版本
3. 尝试使用不同的终端 (PowerShell、CMD)
4. 查看项目文档: `README.md`

---

## 🚀 快速启动模板

保存以下内容为 `start.bat`:

```batch
@echo off
if not exist node_modules (
    echo 未检测到 node_modules,正在安装依赖...
    npm install
)
echo 启动开发服务器...
npm run dev
```

双击即可自动安装并启动!
