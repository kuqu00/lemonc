import { db } from '@/db';
import type { Note, Todo, Customer, Contract, FollowUpRecord, MortgageCalc, IncomeCalc, User, AppSettings, Notification, QuickAction } from '@/types';

// 导出所有数据
export interface ExportData {
  version: string;
  exportTime: number;
  notes: Note[];
  todos: Todo[];
  customers: Customer[];
  contracts: Contract[];
  followUpRecords: FollowUpRecord[];
  mortgageCalcs: MortgageCalc[];
  incomeCalcs: IncomeCalc[];
  users: User[];
  settings: AppSettings[];
  notifications: Notification[];
  quickActions: QuickAction[];
}

// 导出所有数据
export const exportAllData = async (): Promise<ExportData> => {
  const [
    notes,
    todos,
    customers,
    contracts,
    followUpRecords,
    mortgageCalcs,
    incomeCalcs,
    users,
    settings,
    notifications,
    quickActions
  ] = await Promise.all([
    db.notes.toArray(),
    db.todos.toArray(),
    db.customers.toArray(),
    db.contracts.toArray(),
    db.followUpRecords.toArray(),
    db.mortgageCalcs.toArray(),
    db.incomeCalcs.toArray(),
    db.users.toArray(),
    db.settings.toArray(),
    db.notifications.toArray(),
    db.quickActions.toArray()
  ]);

  return {
    version: '1.0',
    exportTime: Date.now(),
    notes,
    todos,
    customers,
    contracts,
    followUpRecords,
    mortgageCalcs,
    incomeCalcs,
    users,
    settings,
    notifications,
    quickActions
  };
};

// 下载 JSON 文件
export const downloadJSON = (data: ExportData, filename?: string) => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `银行信贷系统备份_${formatDate(new Date())}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

// 格式化日期
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0].replace(/-/g, '');
};

// 导入数据
export const importData = async (data: ExportData): Promise<{ success: boolean; message: string }> => {
  try {
    // 验证数据结构
    if (!data.version || !data.exportTime) {
      return { success: false, message: '无效的备份文件格式' };
    }

    // 清空现有数据
    await Promise.all([
      db.notes.clear(),
      db.todos.clear(),
      db.customers.clear(),
      db.contracts.clear(),
      db.followUpRecords.clear(),
      db.mortgageCalcs.clear(),
      db.incomeCalcs.clear(),
      db.users.clear(),
      db.settings.clear(),
      db.notifications.clear(),
      db.quickActions.clear()
    ]);

    // 导入新数据
    await Promise.all([
      data.notes?.length && db.notes.bulkAdd(data.notes),
      data.todos?.length && db.todos.bulkAdd(data.todos),
      data.customers?.length && db.customers.bulkAdd(data.customers),
      data.contracts?.length && db.contracts.bulkAdd(data.contracts),
      data.followUpRecords?.length && db.followUpRecords.bulkAdd(data.followUpRecords),
      data.mortgageCalcs?.length && db.mortgageCalcs.bulkAdd(data.mortgageCalcs),
      data.incomeCalcs?.length && db.incomeCalcs.bulkAdd(data.incomeCalcs),
      data.users?.length && db.users.bulkAdd(data.users),
      data.settings?.length && db.settings.bulkAdd(data.settings),
      data.notifications?.length && db.notifications.bulkAdd(data.notifications),
      data.quickActions?.length && db.quickActions.bulkAdd(data.quickActions)
    ].filter(Boolean));

    return { success: true, message: '数据导入成功，请刷新页面' };
  } catch (error) {
    console.error('导入数据失败:', error);
    return { success: false, message: '数据导入失败: ' + (error as Error).message };
  }
};

// 从文件读取 JSON
export const readJSONFile = (file: File): Promise<ExportData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data);
      } catch (error) {
        reject(new Error('无效的 JSON 文件'));
      }
    };
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsText(file);
  });
};

// File System Access API - 保存到本地文件
export const saveToLocalFile = async (data: ExportData, suggestedName?: string): Promise<boolean> => {
  try {
    // 检查是否支持 File System Access API
    if (!('showSaveFilePicker' in window)) {
      // 不支持则使用传统下载方式
      downloadJSON(data, suggestedName);
      return true;
    }

    const fileHandle = await (window as any).showSaveFilePicker({
      suggestedName: suggestedName || `银行信贷系统备份_${formatDate(new Date())}.json`,
      types: [
        {
          description: 'JSON 备份文件',
          accept: { 'application/json': ['.json'] }
        }
      ]
    });

    const writable = await fileHandle.createWritable();
    const json = JSON.stringify(data, null, 2);
    await writable.write(json);
    await writable.close();

    return true;
  } catch (error) {
    // 用户取消或出错，使用传统方式
    if ((error as Error).name !== 'AbortError') {
      console.error('保存文件失败:', error);
    }
    downloadJSON(data, suggestedName);
    return true;
  }
};

// File System Access API - 从本地文件读取
export const loadFromLocalFile = async (): Promise<ExportData | null> => {
  try {
    if (!('showOpenFilePicker' in window)) {
      throw new Error('浏览器不支持文件选择功能');
    }

    const [fileHandle] = await (window as any).showOpenFilePicker({
      types: [
        {
          description: 'JSON 备份文件',
          accept: { 'application/json': ['.json'] }
        }
      ],
      multiple: false
    });

    const file = await fileHandle.getFile();
    return await readJSONFile(file);
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return null;
    }
    throw error;
  }
};

// 自动备份设置
const AUTO_BACKUP_KEY = 'auto_backup_settings';
const DAILY_BACKUP_KEY = 'daily_backup_settings';

export interface AutoBackupSettings {
  enabled: boolean;
  interval: number; // 分钟
  lastBackupTime: number;
  path?: string;
}

export interface DailyBackupSettings {
  enabled: boolean;
  lastBackupDate: string; // YYYY-MM-DD 格式
}

export const getAutoBackupSettings = (): AutoBackupSettings => {
  const defaultSettings: AutoBackupSettings = {
    enabled: false,
    interval: 30,
    lastBackupTime: 0
  };
  
  const stored = localStorage.getItem(AUTO_BACKUP_KEY);
  if (stored) {
    return { ...defaultSettings, ...JSON.parse(stored) };
  }
  return defaultSettings;
};

export const setAutoBackupSettings = (settings: Partial<AutoBackupSettings>) => {
  const current = getAutoBackupSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(updated));
};

// 检查是否需要自动备份
export const shouldAutoBackup = (): boolean => {
  const settings = getAutoBackupSettings();
  if (!settings.enabled) return false;
  
  const now = Date.now();
  const timeSinceLastBackup = now - settings.lastBackupTime;
  return timeSinceLastBackup >= settings.interval * 60 * 1000;
};

// 执行自动备份（自动下载到默认下载目录，无需用户确认）
export const performAutoBackup = async (): Promise<boolean> => {
  try {
    const data = await exportAllData();
    // 自动备份使用传统下载方式，直接保存到浏览器默认下载目录
    downloadJSON(data, `自动备份_${formatDate(new Date())}.json`);
    setAutoBackupSettings({ lastBackupTime: Date.now() });
    return true;
  } catch (error) {
    console.error('自动备份失败:', error);
    return false;
  }
};

// 获取每日备份设置
export const getDailyBackupSettings = (): DailyBackupSettings => {
  const defaultSettings: DailyBackupSettings = {
    enabled: false,
    lastBackupDate: ''
  };
  
  const stored = localStorage.getItem(DAILY_BACKUP_KEY);
  if (stored) {
    return { ...defaultSettings, ...JSON.parse(stored) };
  }
  return defaultSettings;
};

// 设置每日备份
export const setDailyBackupSettings = (settings: Partial<DailyBackupSettings>) => {
  const current = getDailyBackupSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(DAILY_BACKUP_KEY, JSON.stringify(updated));
};

// 获取今天的日期字符串（YYYY-MM-DD）
const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

// 检查是否是今天第一次打开
export const isFirstOpenToday = (): boolean => {
  const settings = getDailyBackupSettings();
  const today = getTodayString();
  return settings.lastBackupDate !== today;
};

// 执行每日首次备份
export const performDailyBackup = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const settings = getDailyBackupSettings();
    
    // 如果未启用，直接返回
    if (!settings.enabled) {
      return { success: false, message: '每日备份未启用' };
    }
    
    // 检查今天是否已备份
    const today = getTodayString();
    if (settings.lastBackupDate === today) {
      return { success: false, message: '今天已经备份过了' };
    }
    
    // 执行备份
    const data = await exportAllData();
    downloadJSON(data, `每日备份_${formatDate(new Date())}.json`);
    
    // 更新最后备份日期
    setDailyBackupSettings({ lastBackupDate: today });
    
    return { success: true, message: '每日备份成功' };
  } catch (error) {
    console.error('每日备份失败:', error);
    return { success: false, message: '每日备份失败: ' + (error as Error).message };
  }
};
