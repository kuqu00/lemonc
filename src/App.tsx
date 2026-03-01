import { useEffect, useState, useCallback } from 'react';
import { Login } from '@/components/Login';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/components/Dashboard';
import { Notebook } from '@/components/Notebook';
import { TodoList } from '@/components/TodoList';
import { CustomerManager } from '@/components/CustomerManager';
import { Calculator } from '@/components/Calculator';
import { ToolBox } from '@/components/ToolBox';
import { Analytics } from '@/components/Analytics';
import { Settings } from '@/components/Settings';
import { useAppStore, checkSessionTimeout } from '@/store';
import { db } from '@/db';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isInitialized, setIsInitialized] = useState(false);
  
  const { 
    isAuthenticated, 
    loadSettings, 
    loadNotifications,
    loadQuickActions,
    updateLastActivity
  } = useAppStore();

  // 初始化
  useEffect(() => {
    const init = async () => {
      try {
        // 初始化数据库
        await db.initDefaultData();
        
        // 加载设置
        await loadSettings();
        
        // 加载通知
        await loadNotifications();
        
        // 加载快捷操作
        await loadQuickActions();
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Initialization error:', error);
        toast.error('系统初始化失败，请刷新页面重试');
      }
    };

    init();
  }, [loadSettings, loadNotifications, loadQuickActions]);

  // 检查会话超时
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      if (checkSessionTimeout()) {
        toast.info('会话已过期，请重新登录');
      }
    }, 60000); // 每分钟检查一次

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // 更新活动时间
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleActivity = () => {
      updateLastActivity();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [isAuthenticated, updateLastActivity]);

  // 页面切换处理
  const handlePageChange = useCallback((page: string) => {
    setCurrentPage(page);
    updateLastActivity();
  }, [updateLastActivity]);

  // 渲染当前页面
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onPageChange={handlePageChange} />;
      case 'notebook':
        return <Notebook />;
      case 'todo':
        return <TodoList />;
      case 'customers':
        return <CustomerManager />;
      case 'calculator':
        return <Calculator />;
      case 'tools':
        return <ToolBox />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onPageChange={handlePageChange} />;
    }
  };

  // 未初始化时显示加载状态
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">系统初始化中...</p>
        </div>
      </div>
    );
  }

  // 未登录时显示登录页
  if (!isAuthenticated) {
    return (
      <>
        <Login />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <Layout currentPage={currentPage} onPageChange={handlePageChange}>
        {renderPage()}
      </Layout>
      <Toaster />
    </>
  );
}

export default App;
