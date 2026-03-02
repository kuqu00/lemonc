import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeType, LayoutType, User, AppSettings, Notification, QuickAction, NotificationCategory } from '@/types';
import { db } from '@/db';
import { sendDesktopNotification, shouldSendDesktopNotification } from '@/lib/notificationTemplates';

interface AppState {
  // 认证状态
  isAuthenticated: boolean;
  currentUser: User | null;
  lastActivity: number;
  
  // 设置
  theme: ThemeType;
  layout: LayoutType;
  settings: AppSettings | null;
  
  // 通知
  notifications: Notification[];
  unreadCount: number;
  notificationFilter: NotificationCategory | 'all';
  
  // 快捷操作
  quickActions: QuickAction[];
  
  // 全局加载状态
  isLoading: boolean;
  
  // 桌面通知设置
  desktopNotificationEnabled: boolean;
  
  // 操作
  login: (user: User) => void;
  logout: () => void;
  updateLastActivity: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  setTheme: (theme: ThemeType) => void;
  setLayout: (layout: LayoutType) => void;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  loadNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'createTime' | 'read'>) => Promise<void>;
  setNotificationFilter: (filter: NotificationCategory | 'all') => void;
  clearNotifications: () => Promise<void>;
  setDesktopNotificationEnabled: (enabled: boolean) => void;
  initDesktopNotification: () => Promise<void>;
  loadQuickActions: () => Promise<void>;
  updateQuickActions: (actions: QuickAction[]) => Promise<void>;
  setLoading: (loading: boolean) => void;
}

const THEME_TIMEOUT = 30 * 60 * 1000; // 30分钟无操作自动退出

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 初始状态
      isAuthenticated: false,
      currentUser: null,
      lastActivity: Date.now(),
      theme: 'light',
      layout: 'sidebar',
      settings: null,
      notifications: [],
      unreadCount: 0,
      notificationFilter: 'all',
      quickActions: [],
      isLoading: false,
      desktopNotificationEnabled: false,

      // 登录
      login: (user: User) => {
        set({
          isAuthenticated: true,
          currentUser: user,
          lastActivity: Date.now()
        });
      },

      // 登出
      logout: () => {
        set({
          isAuthenticated: false,
          currentUser: null,
          lastActivity: Date.now()
        });
      },

      // 更新最后活动时间
      updateLastActivity: () => {
        set({ lastActivity: Date.now() });
      },

      // 设置主题
      setTheme: (theme: ThemeType) => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
        // 同时保存到数据库
        const current = get().settings;
        if (current) {
          db.settings.put({ ...current, theme });
        }
      },

      // 设置布局
      setLayout: (layout: LayoutType) => {
        set({ layout });
        // 同时保存到数据库
        const current = get().settings;
        if (current) {
          db.settings.put({ ...current, layout });
        }
      },

      // 加载设置
      loadSettings: async () => {
        const settings = await db.settings.get('default');
        if (settings) {
          set({ 
            settings,
            theme: settings.theme,
            layout: settings.layout
          });
          document.documentElement.setAttribute('data-theme', settings.theme);
        }
      },

      // 更新设置
      updateSettings: async (partialSettings: Partial<AppSettings>) => {
        const current = get().settings;
        if (current) {
          const updated = { ...current, ...partialSettings };
          await db.settings.put(updated);
          set({ settings: updated });
          
          if (partialSettings.theme) {
            set({ theme: partialSettings.theme });
            document.documentElement.setAttribute('data-theme', partialSettings.theme);
          }
          if (partialSettings.layout) {
            set({ layout: partialSettings.layout });
          }
        }
      },

      // 加载通知 - 限制数量并添加缓存
      loadNotifications: async () => {
        const notifications = await db.notifications
          .orderBy('createTime')
          .reverse()
          .limit(20) // 减少加载数量
          .toArray();
        const unreadCount = notifications.filter(n => !n.read).length;
        set({ notifications, unreadCount });
      },

      // 标记通知已读
      markNotificationRead: async (id: string) => {
        await db.notifications.update(id, { read: true });
        await get().loadNotifications();
      },

      // 添加通知
      addNotification: async (notification) => {
        const newNotification: Notification = {
          ...notification,
          category: notification.category || 'general',
          id: `notif-${Date.now()}`,
          createTime: Date.now(),
          read: false
        };
        await db.notifications.add(newNotification);
        await get().loadNotifications();

        // 发送桌面通知
        const state = get();
        if (state.desktopNotificationEnabled && shouldSendDesktopNotification(newNotification.category, notification.type)) {
          sendDesktopNotification(notification.title, { body: notification.message });
        }
      },

      // 标记所有通知已读
      markAllNotificationsRead: async () => {
        const unreadNotifications = get().notifications.filter(n => !n.read);
        for (const notif of unreadNotifications) {
          await db.notifications.update(notif.id, { read: true });
        }
        await get().loadNotifications();
      },

      // 设置通知筛选
      setNotificationFilter: (filter) => {
        set({ notificationFilter: filter });
      },

      // 清空所有通知
      clearNotifications: async () => {
        await db.notifications.clear();
        set({ notifications: [], unreadCount: 0 });
      },

      // 设置桌面通知开关
      setDesktopNotificationEnabled: (enabled) => {
        set({ desktopNotificationEnabled: enabled });
      },

      // 初始化桌面通知
      initDesktopNotification: async () => {
        if (!('Notification' in window)) {
          console.log('浏览器不支持桌面通知');
          return;
        }

        if (Notification.permission === 'granted') {
          set({ desktopNotificationEnabled: true });
        } else if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          set({ desktopNotificationEnabled: permission === 'granted' });
        }
      },

      // 加载快捷操作
      loadQuickActions: async () => {
        const actions = await db.quickActions.orderBy('order').toArray();
        set({ quickActions: actions });
      },

      // 更新快捷操作
      updateQuickActions: async (actions: QuickAction[]) => {
        await db.quickActions.clear();
        await db.quickActions.bulkAdd(actions);
        set({ quickActions: actions });
      },

      // 设置加载状态
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // 修改密码
      changePassword: async (oldPassword: string, newPassword: string) => {
        const state = get();
        if (!state.currentUser) {
          return { success: false, message: '用户未登录' };
        }

        try {
          // 验证旧密码
          const user = await db.users.get(state.currentUser.id);
          if (!user) {
            return { success: false, message: '用户不存在' };
          }

          if (user.password !== oldPassword) {
            return { success: false, message: '原密码错误' };
          }

          // 更新密码
          await db.users.update(user.id, { password: newPassword });
          
          // 更新当前用户信息
          set({
            currentUser: { ...user, password: newPassword }
          });

          return { success: true, message: '密码修改成功' };
        } catch (error) {
          console.error('Change password error:', error);
          return { success: false, message: '修改密码失败，请重试' };
        }
      }
    }),
    {
      name: 'bank-office-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity,
        theme: state.theme,
        layout: state.layout
      })
    }
  )
);

// 检查会话超时
export const checkSessionTimeout = () => {
  const state = useAppStore.getState();
  const now = Date.now();
  if (state.isAuthenticated && now - state.lastActivity > THEME_TIMEOUT) {
    state.logout();
    return true;
  }
  return false;
};
