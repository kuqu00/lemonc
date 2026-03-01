import { useState, useEffect } from 'react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  Home,
  Calculator,
  Users,
  FileText,
  BookOpen,
  CheckSquare,
  BarChart3,
  Settings,
  Wrench,
  RotateCcw,
  X,
  Pin,
  Plus,
} from 'lucide-react';
import { useTabsStore } from '@/store/tabs';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (path: string) => void;
}

const navigationItems = [
  { path: 'dashboard', title: '首页', icon: Home },
  { path: 'calculator', title: '贷款计算器', icon: Calculator },
  { path: 'customers', title: '客户管理', icon: Users },
  { path: 'contracts', title: '合同管理', icon: FileText },
  { path: 'notebook', title: '工作笔记', icon: BookOpen },
  { path: 'todo', title: '待办清单', icon: CheckSquare },
  { path: 'analytics', title: '数据分析', icon: BarChart3 },
  { path: 'tools', title: '工具箱', icon: Wrench },
  { path: 'settings', title: '设置', icon: Settings },
];

export function CommandPalette({ open, onOpenChange, onNavigate }: CommandPaletteProps) {
  const {
    tabs,
    closedTabs,
    activateTab,
    addTab,
    closeTab,
    restoreClosedTab,
    togglePinTab,
  } = useTabsStore();

  const [search, setSearch] = useState('');

  // 快捷键打开命令面板
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenChange]);

  const handleSelect = (value: string) => {
    const [type, id] = value.split(':');
    
    switch (type) {
      case 'nav':
        // 检查是否已存在该页面的标签
        const existingTab = tabs.find(t => t.path === id);
        if (existingTab) {
          activateTab(existingTab.id);
          onNavigate(existingTab.path);
        } else {
          const navItem = navigationItems.find(n => n.path === id);
          if (navItem) {
            const newId = addTab({
              title: navItem.title,
              icon: navItem.path,
              path: navItem.path,
              isPinned: false,
              isActive: true,
              hasUnsavedChanges: false,
            });
            activateTab(newId);
            onNavigate(navItem.path);
          }
        }
        break;
        
      case 'tab':
        const tab = tabs.find(t => t.id === id);
        if (tab) {
          activateTab(tab.id);
          onNavigate(tab.path);
        }
        break;
        
      case 'action':
        switch (id) {
          case 'restore':
            restoreClosedTab();
            break;
          case 'close-all':
            tabs.forEach(t => closeTab(t.id));
            break;
        }
        break;
    }
    
    onOpenChange(false);
    setSearch('');
  };

  const iconMap: Record<string, any> = {
    dashboard: Home,
    calculator: Calculator,
    customers: Users,
    contracts: FileText,
    notebook: BookOpen,
    todo: CheckSquare,
    analytics: BarChart3,
    settings: Settings,
    tools: Wrench,
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="搜索页面、标签或操作..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>未找到结果</CommandEmpty>
        
        {/* 打开的标签 */}
        {tabs.length > 0 && (
          <CommandGroup heading="打开的标签">
            {tabs.map(tab => {
              const Icon = iconMap[tab.icon] || FileText;
              return (
                <CommandItem
                  key={tab.id}
                  value={`tab:${tab.id}`}
                  onSelect={handleSelect}
                  className={cn(
                    'flex items-center justify-between',
                    tab.isActive && 'bg-accent'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{tab.title}</span>
                    {tab.isPinned && <Pin className="h-3 w-3 text-primary" />}
                    {tab.hasUnsavedChanges && (
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {tab.isActive && <span className="text-xs text-muted-foreground">当前</span>}
                    <CommandShortcut>Tab</CommandShortcut>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
        
        <CommandSeparator />
        
        {/* 导航页面 */}
        <CommandGroup heading="导航">
          {navigationItems.map(item => {
            const Icon = item.icon;
            const isOpen = tabs.some(t => t.path === item.path);
            return (
              <CommandItem
                key={item.path}
                value={`nav:${item.path}`}
                onSelect={handleSelect}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{item.title}</span>
                  {isOpen && (
                    <span className="text-xs text-muted-foreground">(已打开)</span>
                  )}
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>
        
        <CommandSeparator />
        
        {/* 操作 */}
        <CommandGroup heading="操作">
          {closedTabs.length > 0 && (
            <CommandItem
              value="action:restore"
              onSelect={handleSelect}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>恢复关闭的标签</span>
              <span className="text-xs text-muted-foreground">({closedTabs.length})</span>
              <CommandShortcut>⌘⇧T</CommandShortcut>
            </CommandItem>
          )}
          
          <CommandItem
            value="action:close-all"
            onSelect={handleSelect}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            <span>关闭所有标签</span>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        {/* 快捷键提示 */}
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>⌘K 打开命令面板</span>
            <span>⌘W 关闭标签</span>
            <span>⌘⇧T 恢复标签</span>
          </div>
        </div>
      </CommandList>
    </CommandDialog>
  );
}
