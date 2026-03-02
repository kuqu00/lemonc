import { useEffect, useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  CheckSquare, 
  Users, 
  Calculator, 
  Briefcase, 
  BarChart3, 
  Settings,
  LogOut,
  Menu,
  Bell,
  Palette,
  Trash2,
  CheckCheck,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { useSmartReminders } from '@/hooks/useSmartReminders';
import { categoryLabels } from '@/lib/notificationTemplates';
import type { NotificationCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/store';
import { useTabsStore } from '@/store/tabs';
import { cn } from '@/lib/utils';
import type { ThemeType } from '@/types';
import { TabBar } from './TabBar';
import { CommandPalette } from './CommandPalette';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  showBadge?: (notifications: any[]) => number;
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: '首页概览', icon: LayoutDashboard },
  { id: 'notebook', label: '工作记事本', icon: FileText },
  { 
    id: 'todo', 
    label: '待办清单', 
    icon: CheckSquare,
    showBadge: (notifications) => notifications.filter(n => n.category === 'todo' && !n.read).length
  },
  { 
    id: 'customers', 
    label: '客户档案', 
    icon: Users,
    showBadge: (notifications) => notifications.filter(n => n.category === 'customer' && !n.read).length
  },
  { id: 'calculator', label: '房贷计算器', icon: Calculator },
  { id: 'tools', label: '办公工具箱', icon: Briefcase },
  { id: 'analytics', label: '数据分析', icon: BarChart3 },
  { id: 'settings', label: '系统设置', icon: Settings },
];

const themes: { value: ThemeType; label: string; color: string }[] = [
  { value: 'light', label: '浅色主题', color: 'bg-gray-100' },
  { value: 'dark', label: '深色主题', color: 'bg-gray-800' },
  { value: 'blue', label: '蓝色主题', color: 'bg-blue-500' },
  { value: 'green', label: '绿色主题', color: 'bg-green-500' },
  { value: 'purple', label: '紫色主题', color: 'bg-purple-500' },
];

export function Layout({ children, currentPage, onPageChange }: LayoutProps) {
  const {
    logout,
    currentUser,
    theme,
    setTheme,
    layout,
    setLayout,
    notifications,
    unreadCount,
    notificationFilter,
    loadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    setNotificationFilter,
    clearNotifications,
    initDesktopNotification,
    desktopNotificationEnabled,
    settings,
    updateLastActivity,
    isAuthenticated
  } = useAppStore();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [showDesktopNotifPrompt, setShowDesktopNotifPrompt] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  // 标签管理
  const { 
    addTab, 
    activateTab, 
    getTabByPath,
    tabs 
  } = useTabsStore();

  // 使用智能提醒
  useSmartReminders();

  // 自动锁定功能
  useEffect(() => {
    if (!isAuthenticated || !settings?.autoLock) return;

    const autoLockMinutes = settings.autoLockMinutes || 30;
    const timeoutId = setInterval(() => {
      const { lastActivity } = useAppStore.getState();
      const now = Date.now();
      const inactiveTime = (now - lastActivity) / (1000 * 60); // 转换为分钟

      if (inactiveTime >= autoLockMinutes) {
        logout();
      }
    }, 60000); // 每分钟检查一次

    return () => clearInterval(timeoutId);
  }, [isAuthenticated, settings?.autoLock, settings?.autoLockMinutes, logout]);

  // 监听用户活动
  useEffect(() => {
    if (!isAuthenticated || !settings?.autoLock) return;

    const handleActivity = () => {
      updateLastActivity();
    };

    // 监听各种用户活动事件
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, settings?.autoLock, updateLastActivity]);

  // 页面切换时创建标签
  useEffect(() => {
    const existingTab = getTabByPath(currentPage);
    if (!existingTab) {
      const menuItem = menuItems.find(item => item.id === currentPage);
      if (menuItem) {
        addTab({
          title: menuItem.label,
          icon: menuItem.id,
          path: currentPage,
          isPinned: false,
          isActive: true,
          hasUnsavedChanges: false,
        });
      }
    } else {
      activateTab(existingTab.id);
    }
  }, [currentPage]);

  // 加载通知 - 减少轮询频率
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 300000); // 每5分钟刷新一次
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // 初始化桌面通知
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!desktopNotificationEnabled && Notification.permission === 'default') {
        setShowDesktopNotifPrompt(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [desktopNotificationEnabled]);

  const handleLogout = () => {
    logout();
  };

  const handleNotificationClick = async (id: string) => {
    await markNotificationRead(id);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
  };

  const handleClearAll = async () => {
    await clearNotifications();
  };

  const handleEnableDesktopNotification = async () => {
    await initDesktopNotification();
    setShowDesktopNotifPrompt(false);
  };

  // 筛选后的通知 - 使用 useMemo 缓存
  const filteredNotifications = useMemo(() => {
    if (notificationFilter === 'all') return notifications;
    return notifications.filter(n => n.category === notificationFilter);
  }, [notifications, notificationFilter]);

  // 各分类未读数 - 单次遍历优化计算
  const categoryUnreadCounts = useMemo(() => {
    const counts: Record<NotificationCategory | 'all', number> = {
      all: unreadCount,
      system: 0,
      todo: 0,
      customer: 0,
      contract: 0,
      general: 0
    };
    // 单次遍历计算所有分类
    for (const n of notifications) {
      if (!n.read && n.category in counts) {
        counts[n.category as NotificationCategory]++;
      }
    }
    return counts;
  }, [notifications, unreadCount]);

  const renderSidebar = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-primary">lemonC 办公系统</h1>
        <p className="text-xs text-muted-foreground mt-1">LemonC Office System</p>
      </div>
      
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const badgeCount = item.showBadge ? item.showBadge(notifications) : 0;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  onPageChange(item.id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative',
                  currentPage === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1 text-left">{item.label}</span>
                {badgeCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="h-5 min-w-[20px] flex items-center justify-center p-0 text-xs"
                  >
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {currentUser?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentUser?.name || '用户'}</p>
            <p className="text-xs text-muted-foreground truncate">{currentUser?.role === 'admin' ? '管理员' : '普通用户'}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          退出登录
        </Button>
      </div>
    </div>
  );

  const renderTopbar = () => (
    <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            {renderSidebar()}
          </SheetContent>
        </Sheet>
        
        <h1 className="text-lg font-semibold lg:hidden">lemonC 办公系统</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* 主题切换 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Palette className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>选择主题</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {themes.map((t) => (
              <DropdownMenuItem
                key={t.value}
                onClick={() => setTheme(t.value)}
                className="flex items-center gap-2"
              >
                <div className={cn('w-4 h-4 rounded-full', t.color)} />
                <span>{t.label}</span>
                {theme === t.value && <span className="ml-auto text-primary">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 布局切换 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <LayoutDashboard className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>布局方式</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLayout('sidebar')}>
              侧边栏布局 {layout === 'sidebar' && '✓'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLayout('topbar')}>
              顶部栏布局 {layout === 'topbar' && '✓'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLayout('mixed')}>
              混合布局 {layout === 'mixed' && '✓'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 通知 */}
        <DropdownMenu open={notificationOpen} onOpenChange={setNotificationOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-96">
            {/* 头部操作 */}
            <DropdownMenuLabel className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="font-semibold">通知中心</span>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {unreadCount} 未读
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAllRead();
                    }}
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    全部已读
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearAll();
                    }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    清空
                  </Button>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* 分类筛选 */}
            <div className="p-2">
              <div className="flex flex-wrap gap-1">
                <Button
                  variant={notificationFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setNotificationFilter('all')}
                >
                  全部
                  {categoryUnreadCounts.all > 0 && (
                    <span className="ml-1 text-[10px]">({categoryUnreadCounts.all})</span>
                  )}
                </Button>
                {(Object.keys(categoryLabels) as NotificationCategory[]).map(cat => (
                  <Button
                    key={cat}
                    variant={notificationFilter === cat ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setNotificationFilter(cat)}
                  >
                    {categoryLabels[cat].label}
                    {categoryUnreadCounts[cat] > 0 && (
                      <span className="ml-1 text-[10px]">({categoryUnreadCounts[cat]})</span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
            <DropdownMenuSeparator />
            
            {/* 通知列表 */}
            {filteredNotifications.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {notificationFilter === 'all' ? '暂无通知' : '该分类暂无通知'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-80">
                <div className="divide-y">
                  {filteredNotifications.map((notif) => {
                    const categoryConfig = categoryLabels[notif.category] || categoryLabels.general;
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif.id)}
                        className={cn(
                          'flex flex-col p-3 cursor-pointer hover:bg-accent/50 transition-colors',
                          !notif.read && 'bg-accent/30'
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {/* 分类标识 */}
                          <div 
                            className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', categoryConfig.color)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                'text-xs px-1.5 py-0.5 rounded text-white',
                                categoryConfig.color
                              )}>
                                {categoryConfig.label}
                              </span>
                              {!notif.read && (
                                <span className="w-2 h-2 bg-primary rounded-full" />
                              )}
                            </div>
                            <p className="font-medium text-sm mt-1">{notif.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                            <span className="text-xs text-muted-foreground mt-1">
                              {format(notif.createTime, 'MM-dd HH:mm')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 用户信息 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {currentUser?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <span className="hidden sm:inline">{currentUser?.name || '用户'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>我的账号</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onPageChange('settings')}>
              <Settings className="h-4 w-4 mr-2" />
              系统设置
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );

  // 侧边栏布局
  if (layout === 'sidebar') {
    return (
      <div className="min-h-screen flex">
        {/* 侧边栏 - 桌面端 */}
        <aside className="hidden lg:flex w-64 flex-col border-r bg-card">
          {renderSidebar()}
        </aside>

        {/* 主内容区 */}
        <div className="flex-1 flex flex-col min-w-0">
          {renderTopbar()}
          <TabBar 
            onTabClick={(path) => onPageChange(path)}
            onNewTab={() => setCommandOpen(true)}
          />
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            {children}
          </main>
        </div>

        <CommandPalette
          open={commandOpen}
          onOpenChange={setCommandOpen}
          onNavigate={(path) => onPageChange(path)}
        />
      </div>
    );
  }

  // 顶部栏布局
  if (layout === 'topbar') {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b bg-card">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            <h1 className="text-xl font-bold text-primary">lemonC 办公系统</h1>
            
            <nav className="hidden md:flex items-center gap-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onPageChange(item.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      currentPage === item.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Palette className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {themes.map((t) => (
                    <DropdownMenuItem key={t.value} onClick={() => setTheme(t.value)}>
                      {t.label} {theme === t.value && '✓'}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>
        
        <TabBar 
          onTabClick={(path) => onPageChange(path)}
          onNewTab={() => setCommandOpen(true)}
        />

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>

        <CommandPalette
          open={commandOpen}
          onOpenChange={setCommandOpen}
          onNavigate={(path) => onPageChange(path)}
        />
      </div>
    );
  }

  // 混合布局
  return (
    <div className="min-h-screen flex flex-col">
      {renderTopbar()}
      
      <div className="flex items-center border-b border-border">
        <div className="flex-1 min-w-0">
          <TabBar 
            onTabClick={(path) => onPageChange(path)}
            onNewTab={() => setCommandOpen(true)}
          />
        </div>
      </div>
      
      <div className="flex-1 flex">
        {/* 紧凑侧边栏 */}
        <aside className="hidden lg:flex w-16 flex-col border-r bg-card py-4">
          <nav className="space-y-1 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  title={item.label}
                  className={cn(
                    'w-full flex items-center justify-center p-3 rounded-lg transition-colors',
                    currentPage === item.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 overflow-auto p-4 lg:p-6 relative">
          {/* 桌面通知权限提示 */}
          {showDesktopNotifPrompt && (
            <div className="fixed top-20 right-4 z-50 bg-card border shadow-lg rounded-lg p-4 max-w-sm animate-in slide-in-from-right">
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">启用桌面通知</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    开启后，重要提醒将以桌面通知形式显示，确保您不会错过任何关键信息。
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button 
                      size="sm" 
                      className="h-8 text-xs"
                      onClick={handleEnableDesktopNotification}
                    >
                      开启通知
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-xs"
                      onClick={() => setShowDesktopNotifPrompt(false)}
                    >
                      暂不开启
                    </Button>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 -mt-1 -mr-1"
                  onClick={() => setShowDesktopNotifPrompt(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onNavigate={(path) => onPageChange(path)}
      />
    </div>
  );
}
