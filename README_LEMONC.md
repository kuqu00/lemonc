# lemonC 办公系统

一款专为银行信贷场景设计的纯离线本地办公系统。

## 功能特性

- 📝 工作记事本 - 富文本编辑、智能标签、分类管理
- ✓ 待办清单 - 列表/看板视图、循环待办、超期提醒
- 👤 客户档案 - 客户管理、合同信息、跟进记录
- 🧮 房贷计算器 - 5种还款方式、多方案对比
- 📊 数据分析 - 多维度图表、客户画像、效率趋势
- 📈 年度报表 - 自动生成、一键导出Excel
- 🛠️ 办公工具箱 - PDF工具、图片压缩、日期计算等

## 技术栈

### 前端
- React 19 + TypeScript
- Vite 7
- Tailwind CSS
- Radix UI
- Zustand (状态管理)
- Dexie (IndexedDB封装)

### 桌面端
- Tauri 2.0 (Rust) - Windows 桌面应用

## 快速开始

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器 (Web)
npm run dev

# 启动开发服务器 (Tauri)
npm run tauri:dev
```

### 构建

```bash
# 构建 Web 版本
npm run build

# 构建 Tauri 桌面应用 (Windows)
npm run tauri:build
```

## 项目结构

```
lemonc/
├── src/                  # 前端源代码
│   ├── components/       # React 组件
│   ├── lib/              # 工具函数
│   ├── store/            # 状态管理
│   └── types/            # TypeScript 类型
├── src-tauri/            # Tauri Rust 后端
│   ├── src/              # Rust 源代码
│   └── icons/            # 应用图标
├── public/               # 静态资源
└── package.json         # 项目配置
```

## 数据存储

### Web 版本
- 存储：浏览器 IndexedDB
- 自动保存：已实现

### Tauri 桌面版
- 存储：本地文件系统 (`%APPDATA%/lemonC/`)
- 自动保存：已实现（使用 `useTauriAutoSave`）
- 备份功能：全量/增量备份
- 备份路径：`%APPDATA%/lemonC/backups/`

## 性能优化

### 虚拟滚动
- 大数据量列表使用虚拟滚动
- 组件：`VirtualList` (`src/components/ui/virtual-list.tsx`)
- 自动提升长列表渲染性能

### 包体积优化
- 已移除 Electron 依赖，仅使用 Tauri
- Tree-shaking 优化未使用代码
- 使用 Vite 构建优化

## 系统要求

- Web 版本：现代浏览器（Chrome、Edge、Firefox）
- 桌面版本：Windows 10+ (x64)

## 许可证

© 2026 lemonC 版权所有

