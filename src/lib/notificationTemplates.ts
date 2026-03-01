import type { NotificationCategory, Notification } from '@/types';

// 通知模板类型
export interface NotificationTemplate {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: NotificationCategory;
}

// 通知模板库
export const notificationTemplates = {
  // 待办相关
  todo: {
    dueToday: (title: string): NotificationTemplate => ({
      title: '待办提醒',
      message: `「${title}」今天到期，请尽快处理`,
      type: 'warning',
      category: 'todo'
    }),
    overdue: (title: string, days: number): NotificationTemplate => ({
      title: '待办逾期提醒',
      message: `「${title}」已逾期 ${days} 天，请尽快处理`,
      type: 'error',
      category: 'todo'
    }),
    urgent: (title: string): NotificationTemplate => ({
      title: '紧急待办',
      message: `「${title}」为紧急重要任务，请优先处理`,
      type: 'error',
      category: 'todo'
    }),
    highPriority: (title: string): NotificationTemplate => ({
      title: '高优先级待办',
      message: `「${title}」将在明天到期`,
      type: 'warning',
      category: 'todo'
    })
  },

  // 客户相关
  customer: {
    followUpNeeded: (name: string, days: number): NotificationTemplate => ({
      title: '客户跟进提醒',
      message: `客户「${name}」已 ${days} 天未跟进`,
      type: 'info',
      category: 'customer'
    }),
    birthday: (name: string): NotificationTemplate => ({
      title: '客户生日提醒',
      message: `客户「${name}」今天生日，记得送上祝福`,
      type: 'info',
      category: 'customer'
    }),
    important: (name: string): NotificationTemplate => ({
      title: '重要客户提醒',
      message: `重要客户「${name}」需要关注`,
      type: 'warning',
      category: 'customer'
    })
  },

  // 合同相关
  contract: {
    expiringSoon: (code: string, days: number): NotificationTemplate => ({
      title: days <= 7 ? '合同即将到期' : '合同到期提醒',
      message: `合同 ${code} 将在 ${days} 天后到期`,
      type: days <= 7 ? 'error' : 'warning',
      category: 'contract'
    }),
    expired: (code: string): NotificationTemplate => ({
      title: '合同已到期',
      message: `合同 ${code} 已到期，请及时处理`,
      type: 'error',
      category: 'contract'
    })
  },

  // 系统相关
  system: {
    weeklyReport: (): NotificationTemplate => ({
      title: '每周工作报告',
      message: '您本周完成了 X 个待办，新增了 Y 个客户，点击查看详情',
      type: 'info',
      category: 'system'
    }),
    monthlyReport: (): NotificationTemplate => ({
      title: '每月数据摘要',
      message: '本月工作数据统计已生成，点击查看详情',
      type: 'info',
      category: 'system'
    }),
    efficiencyAlert: (overdueCount: number): NotificationTemplate => ({
      title: '工作效率预警',
      message: `您有 ${overdueCount} 个逾期任务，建议优先处理`,
      type: 'warning',
      category: 'system'
    }),
    welcome: (name: string): NotificationTemplate => ({
      title: '欢迎回来',
      message: `${name}，祝您今天工作顺利！`,
      type: 'success',
      category: 'system'
    })
  },

  // 通用
  general: {
    success: (title: string, message: string): NotificationTemplate => ({
      title,
      message,
      type: 'success',
      category: 'general'
    }),
    error: (title: string, message: string): NotificationTemplate => ({
      title,
      message,
      type: 'error',
      category: 'general'
    }),
    warning: (title: string, message: string): NotificationTemplate => ({
      title,
      message,
      type: 'warning',
      category: 'general'
    }),
    info: (title: string, message: string): NotificationTemplate => ({
      title,
      message,
      type: 'info',
      category: 'general'
    })
  }
};

// 分类标签映射
export const categoryLabels: Record<NotificationCategory, { label: string; color: string; icon: string }> = {
  system: { label: '系统', color: 'bg-blue-500', icon: 'Settings' },
  todo: { label: '待办', color: 'bg-orange-500', icon: 'CheckSquare' },
  customer: { label: '客户', color: 'bg-purple-500', icon: 'Users' },
  contract: { label: '合同', color: 'bg-red-500', icon: 'FileText' },
  general: { label: '通用', color: 'bg-gray-500', icon: 'Bell' }
};

// 桌面通知权限请求
export const requestDesktopNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('浏览器不支持桌面通知');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.log('用户已拒绝桌面通知权限');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

// 发送桌面通知
export const sendDesktopNotification = (title: string, options?: NotificationOptions): void => {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      requireInteraction: false,
      ...options
    });
  } catch (error) {
    console.error('发送桌面通知失败:', error);
  }
};

// 应该发送桌面通知的通知类型
export const shouldSendDesktopNotification = (category: NotificationCategory, type: string): boolean => {
  // 重要通知发送桌面通知
  const importantCategories: NotificationCategory[] = ['todo', 'contract'];
  const importantTypes = ['error', 'warning'];
  
  return importantCategories.includes(category) || importantTypes.includes(type);
};
