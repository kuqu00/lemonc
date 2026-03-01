import { useState, useRef, useEffect } from 'react';
import {
  X,
  Pin,
  RotateCcw,
  Copy,
  RefreshCw,
  MoreHorizontal,
  Plus,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTabsStore, type Tab } from '@/store/tabs';
import { useAppStore } from '@/store';

interface TabBarProps {
  onTabClick: (path: string) => void;
  onNewTab: () => void;
}

const iconMap: Record<string, any> = {
  home: 'Home',
  dashboard: 'LayoutDashboard',
  calculator: 'Calculator',
  customers: 'Users',
  contracts: 'FileText',
  notebook: 'BookOpen',
  todo: 'CheckSquare',
  analytics: 'BarChart3',
  settings: 'Settings',
  tools: 'Tool',
  image: 'Image',
  pdf: 'FileText',
};

export function TabBar({ onTabClick, onNewTab }: TabBarProps) {
  const {
    tabs,
    activeTabId,
    closedTabs,
    activateTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    closeTabsToRight,
    togglePinTab,
    duplicateTab,
    restoreClosedTab,
    restoreAllClosedTabs,
    clearClosedTabs,
    moveTab,
  } = useTabsStore();

  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [showScrollLeft, setShowScrollLeft] = useState(false);
  const [showScrollRight, setShowScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useAppStore();

  // 分离固定和非固定标签
  const pinnedTabs = tabs.filter(t => t.isPinned);
  const unpinnedTabs = tabs.filter(t => !t.isPinned);

  // 检查滚动位置
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowScrollLeft(scrollLeft > 0);
      setShowScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [tabs]);

  // 滚动到激活标签
  useEffect(() => {
    if (activeTabId && scrollRef.current) {
      const activeElement = scrollRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeTabId]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleTabClick = (tab: Tab) => {
    activateTab(tab.id);
    onTabClick(tab.path);
  };

  const handleClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggedTab(tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTab || draggedTab === targetId) return;

    const draggedIndex = tabs.findIndex(t => t.id === draggedTab);
    const targetIndex = tabs.findIndex(t => t.id === targetId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      moveTab(draggedIndex, targetIndex);
    }
  };

  const handleDragEnd = () => {
    setDraggedTab(null);
  };

  // 快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+W 关闭当前标签
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) {
          closeTab(activeTabId);
        }
      }
      // Ctrl+Shift+T 恢复关闭的标签
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 't') {
        e.preventDefault();
        restoreClosedTab();
      }
      // Ctrl+Tab 切换到下一个标签
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = tabs.findIndex(t => t.id === activeTabId);
        const nextIndex = (currentIndex + 1) % tabs.length;
        if (tabs[nextIndex]) {
          handleTabClick(tabs[nextIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, tabs]);

  const renderTab = (tab: Tab, isPinned = false) => {
    const isActive = tab.id === activeTabId;
    
    return (
      <ContextMenu key={tab.id}>
        <ContextMenuTrigger>
          <TooltipProvider delayDuration={500}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  data-tab-id={tab.id}
                  draggable={!isPinned}
                  onDragStart={(e) => handleDragStart(e, tab.id)}
                  onDragOver={(e) => handleDragOver(e, tab.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleTabClick(tab)}
                  className={cn(
                    'group relative flex items-center gap-2 px-3 py-2 cursor-pointer select-none',
                    'border-r border-border transition-all duration-200',
                    'min-w-[120px] max-w-[200px]',
                    isActive 
                      ? 'bg-background text-foreground border-t-2 border-t-primary'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
                    isPinned && 'min-w-[60px] max-w-[80px]',
                    tab.hasUnsavedChanges && !isActive && 'italic',
                    draggedTab === tab.id && 'opacity-50'
                  )}
                >
                  {/* 加载指示器 */}
                  {tab.isLoading && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  
                  {/* 未保存指示器 */}
                  {!tab.isLoading && tab.hasUnsavedChanges && (
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                  )}
                  
                  {/* 图标 */}
                  <span className="truncate text-sm font-medium flex-1">
                    {isPinned ? '' : tab.title}
                  </span>
                  
                  {/* 通知角标 */}
                  {tab.notificationCount ? (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                      {tab.notificationCount > 9 ? '9+' : tab.notificationCount}
                    </span>
                  ) : null}
                  
                  {/* 关闭按钮 */}
                  {!isPinned && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity',
                        isActive && 'opacity-100'
                      )}
                      onClick={(e) => handleClose(e, tab.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  
                  {/* 固定图标 */}
                  {isPinned && <Pin className="h-3 w-3 text-primary" />}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[300px]">
                <div className="space-y-1">
                  <p className="font-medium">{tab.title}</p>
                  <p className="text-xs text-muted-foreground">{tab.path}</p>
                  {tab.hasUnsavedChanges && (
                    <p className="text-xs text-amber-500">有未保存的更改</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </ContextMenuTrigger>
        
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => handleTabClick(tab)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </ContextMenuItem>
          
          <ContextMenuItem onClick={() => duplicateTab(tab.id)}>
            <Copy className="mr-2 h-4 w-4" />
            复制标签
          </ContextMenuItem>
          
          <ContextMenuItem onClick={() => togglePinTab(tab.id)}>
            <Pin className="mr-2 h-4 w-4" />
            {tab.isPinned ? '取消固定' : '固定标签'}
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          
          <ContextMenuItem onClick={() => closeTab(tab.id)}>
            <X className="mr-2 h-4 w-4" />
            关闭
          </ContextMenuItem>
          
          <ContextMenuItem onClick={() => closeOtherTabs(tab.id)}>
            关闭其他标签
          </ContextMenuItem>
          
          <ContextMenuItem onClick={() => closeTabsToRight(tab.id)}>
            关闭右侧标签
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          
          {closedTabs.length > 0 && (
            <>
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  重新打开
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-48">
                  <ContextMenuItem onClick={restoreClosedTab}>
                    恢复最近关闭 ({closedTabs.length})
                  </ContextMenuItem>
                  <ContextMenuItem onClick={restoreAllClosedTabs}>
                    恢复所有关闭的
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={clearClosedTabs}>
                    清除历史
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <div className="flex items-center bg-muted/30 border-b border-border h-10">
      {/* 滚动左按钮 */}
      {showScrollLeft && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-none"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      
      {/* 标签列表 */}
      <div
        ref={scrollRef}
        className="flex-1 flex overflow-x-auto scrollbar-hide"
        onScroll={checkScroll}
      >
        {/* 固定标签 */}
        {pinnedTabs.length > 0 && (
          <div className="flex shrink-0 border-r border-border">
            {pinnedTabs.map(tab => renderTab(tab, true))}
          </div>
        )}
        
        {/* 非固定标签 */}
        <div className="flex shrink-0">
          {unpinnedTabs.map(tab => renderTab(tab, false))}
        </div>
      </div>
      
      {/* 滚动右按钮 */}
      {showScrollRight && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-none"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
      
      {/* 新建标签按钮 */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-none border-l border-border"
        onClick={onNewTab}
      >
        <Plus className="h-4 w-4" />
      </Button>
      
      {/* 更多菜单 */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-none border-l border-border"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={onNewTab}>
            <Plus className="mr-2 h-4 w-4" />
            新建标签
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          
          <ContextMenuItem onClick={closeAllTabs}>
            关闭所有标签
          </ContextMenuItem>
          
          {closedTabs.length > 0 && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={restoreClosedTab}>
                <RotateCcw className="mr-2 h-4 w-4" />
                恢复关闭的标签
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}
