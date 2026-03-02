import { useEffect, useCallback } from 'react';
import hotkeys from 'hotkeys-js';

interface HotkeyConfig {
  key: string;
  description: string;
  handler: (e: KeyboardEvent) => void;
}

export function useGlobalHotkeys(configs: HotkeyConfig[]) {
  useEffect(() => {
    // 禁用所有快捷键的默认行为
    hotkeys.filter = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      // 在输入框中不触发快捷键
      return !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
    };

    // 注册所有快捷键
    configs.forEach(({ key, handler }) => {
      hotkeys(key, (e) => {
        e.preventDefault();
        handler(e);
      });
    });

    return () => {
      // 卸载时取消注册
      configs.forEach(({ key }) => {
        hotkeys.unbind(key);
      });
    };
  }, [configs]);
}

// 页面导航快捷键
export function useNavigationHotkeys(onNavigate: (page: string) => void) {
  const configs: HotkeyConfig[] = [
    {
      key: 'ctrl+1',
      description: '首页',
      handler: () => onNavigate('dashboard'),
    },
    {
      key: 'ctrl+2',
      description: '客户管理',
      handler: () => onNavigate('customers'),
    },
    {
      key: 'ctrl+3',
      description: '笔记',
      handler: () => onNavigate('notebook'),
    },
    {
      key: 'ctrl+4',
      description: '待办事项',
      handler: () => onNavigate('todo'),
    },
    {
      key: 'ctrl+5',
      description: '计算器',
      handler: () => onNavigate('calculator'),
    },
    {
      key: 'ctrl+6',
      description: '工具箱',
      handler: () => onNavigate('tools'),
    },
    {
      key: 'ctrl+7',
      description: '统计分析',
      handler: () => onNavigate('analytics'),
    },
    {
      key: 'ctrl+8',
      description: '设置',
      handler: () => onNavigate('settings'),
    },
  ];

  useGlobalHotkeys(configs);
}

// 全局功能快捷键
export function useGlobalFunctionHotkeys({
  onSearch,
  onSave,
  onNew,
  onRefresh,
}: {
  onSearch?: () => void;
  onSave?: () => void;
  onNew?: () => void;
  onRefresh?: () => void;
}) {
  const configs: HotkeyConfig[] = [
    {
      key: 'ctrl+k',
      description: '搜索',
      handler: () => onSearch?.(),
    },
    {
      key: 'ctrl+s',
      description: '保存',
      handler: () => onSave?.(),
    },
    {
      key: 'ctrl+n',
      description: '新建',
      handler: () => onNew?.(),
    },
    {
      key: 'f5',
      description: '刷新',
      handler: () => onRefresh?.(),
    },
    {
      key: 'ctrl+r',
      description: '刷新',
      handler: () => onRefresh?.(),
    },
  ];

  useGlobalHotkeys(configs);
}

// 获取所有快捷键列表
export function getHotkeyList() {
  return [
    { key: 'Ctrl + 1', description: '首页' },
    { key: 'Ctrl + 2', description: '客户管理' },
    { key: 'Ctrl + 3', description: '笔记' },
    { key: 'Ctrl + 4', description: '待办事项' },
    { key: 'Ctrl + 5', description: '计算器' },
    { key: 'Ctrl + 6', description: '工具箱' },
    { key: 'Ctrl + 7', description: '统计分析' },
    { key: 'Ctrl + 8', description: '设置' },
    { key: 'Ctrl + K', description: '搜索' },
    { key: 'Ctrl + S', description: '保存' },
    { key: 'Ctrl + N', description: '新建' },
    { key: 'F5 / Ctrl + R', description: '刷新' },
  ];
}
