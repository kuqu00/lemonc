import type { Note, Todo, Customer, Contract, FollowUpRecord, MortgageCalc, IncomeCalc, User, AppSettings, Notification, QuickAction } from '@/types';

// 数据结构接口
export interface AppData {
  version: string;
  lastModified: number;
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

// 变更追踪
interface DataChanges {
  timestamp: number;
  modified: Partial<AppData>;
  deleted: { [key in keyof AppData]?: string[] }; // 存储被删除项的 ID
}

// 当前数据缓存
let currentData: AppData | null = null;
let lastSnapshot: string = '';

// 获取初始数据结构
const getInitialData = (): AppData => ({
  version: '1.0',
  lastModified: Date.now(),
  notes: [],
  todos: [],
  customers: [],
  contracts: [],
  followUpRecords: [],
  mortgageCalcs: [],
  incomeCalcs: [],
  users: [],
  settings: [],
  notifications: [],
  quickActions: []
});

// 检查是否在 Tauri 环境
const isTauri = () => {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__;
};

// 检查是否在桌面环境（仅 Tauri）
const isDesktop = () => isTauri();

// 读取所有数据
export const readAllData = async (): Promise<AppData> => {
  // 使用 IndexedDB (Web 和 Tauri 都支持)
  const { db } = await import('@/db');
  const [
    notes, todos, customers, contracts, followUpRecords,
    mortgageCalcs, incomeCalcs, users, settings, notifications, quickActions
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

  currentData = {
    version: '1.0',
    lastModified: Date.now(),
    notes, todos, customers, contracts, followUpRecords,
    mortgageCalcs, incomeCalcs, users, settings, notifications, quickActions
  };
  lastSnapshot = JSON.stringify(currentData);
  return currentData;
};

// 保存所有数据
export const saveAllData = async (data: AppData): Promise<void> => {
  const dataToSave = { ...data, lastModified: Date.now() };

  // 使用 IndexedDB (Web 和 Tauri 都支持)
  const { db } = await import('@/db');
  await Promise.all([
    db.notes.clear().then(() => db.notes.bulkAdd(data.notes)),
    db.todos.clear().then(() => db.todos.bulkAdd(data.todos)),
    db.customers.clear().then(() => db.customers.bulkAdd(data.customers)),
    db.contracts.clear().then(() => db.contracts.bulkAdd(data.contracts)),
    db.followUpRecords.clear().then(() => db.followUpRecords.bulkAdd(data.followUpRecords)),
    db.mortgageCalcs.clear().then(() => db.mortgageCalcs.bulkAdd(data.mortgageCalcs)),
    db.incomeCalcs.clear().then(() => db.incomeCalcs.bulkAdd(data.incomeCalcs)),
    db.users.clear().then(() => db.users.bulkAdd(data.users)),
    db.settings.clear().then(() => db.settings.bulkAdd(data.settings)),
    db.notifications.clear().then(() => db.notifications.bulkAdd(data.notifications)),
    db.quickActions.clear().then(() => db.quickActions.bulkAdd(data.quickActions))
  ]);
  currentData = dataToSave;
  lastSnapshot = JSON.stringify(dataToSave);
};

// 获取数据存储路径
export const getDataPath = async (): Promise<string> => {
  if (isTauri()) {
    const { getDataPath: tauriGetDataPath } = await import('@/utils/tauri-api');
    return await tauriGetDataPath();
  }
  return '浏览器 IndexedDB（无法获取具体路径）';
};

// 计算数据变更
export const calculateChanges = (oldData: AppData, newData: AppData): Partial<AppData> => {
  const changes: Partial<AppData> = {};
  
  const keys: (keyof AppData)[] = [
    'notes', 'todos', 'customers', 'contracts', 'followUpRecords',
    'mortgageCalcs', 'incomeCalcs', 'users', 'settings', 'notifications', 'quickActions'
  ];
  
  for (const key of keys) {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      (changes as any)[key] = newData[key];
    }
  }
  
  return changes;
};

// 执行全量备份
export const performFullBackup = async (): Promise<{ success: boolean; path?: string; error?: string }> => {
  if (!isDesktop()) {
    return { success: false, error: '全量备份仅在桌面版可用' };
  }

  try {
    // Tauri 环境
    if (isTauri()) {
      const { performFullBackup: tauriFullBackup } = await import('@/utils/tauri-db');
      const result = await tauriFullBackup();
      return { success: true, path: result.path };
    }

    return { success: false, error: '不支持的桌面环境' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

// 执行增量备份
export const performIncrementalBackup = async (): Promise<{ success: boolean; path?: string; error?: string }> => {
  if (!isDesktop()) {
    return { success: false, error: '增量备份仅在桌面版可用' };
  }

  try {
    // Tauri 环境
    if (isTauri()) {
      const { performIncrementalBackup: tauriIncrementalBackup } = await import('@/utils/tauri-api');
      const result = await tauriIncrementalBackup();
      if (result) {
        return { success: true, path: result.path };
      }
      return { success: true, error: '无变更数据' };
    }

    return { success: false, error: '增量备份仅支持桌面版' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

// 获取备份列表
export const getBackupList = async (): Promise<{ success: boolean; files?: any[]; error?: string }> => {
  if (!isDesktop()) {
    return { success: false, error: '备份列表仅在桌面版可用' };
  }

  // Tauri 环境
  if (isTauri()) {
    const { listBackups: tauriGetBackupList } = await import('@/utils/tauri-api');
    const backups = await tauriGetBackupList();
    return {
      success: true,
      files: backups.map((b: any) => ({
        name: b.path.split(/[/\\]/).pop() || '',
        path: b.path,
        size: b.size,
        created: b.timestamp
      }))
    };
  }

  return { success: false, error: '备份列表仅支持桌面版' };
};

// 恢复备份
export const restoreBackup = async (backupPath: string): Promise<{ success: boolean; error?: string }> => {
  if (!isDesktop()) {
    return { success: false, error: '恢复备份仅在桌面版可用' };
  }

  // Tauri 环境
  if (isTauri()) {
    const { restoreFromBackup: tauriRestoreBackup } = await import('@/utils/tauri-db');
    await tauriRestoreBackup(backupPath);
    return { success: true };
  }

  return { success: false, error: '不支持的桌面环境' };
};

// 导出到指定目录
export const exportToDirectory = async (defaultName?: string): Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }> => {
  if (!isDesktop()) {
    return { success: false, error: '导出到目录仅在桌面版可用' };
  }

  try {
    // Tauri 环境 - 使用全量备份作为导出
    if (isTauri()) {
      const { createFullBackup } = await import('@/utils/tauri-api');
      const result = await createFullBackup();
      return { success: true, path: result.path };
    }

    return { success: false, error: '导出仅支持桌面版' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

// 从文件导入
export const importFromFile = async (): Promise<{ success: boolean; data?: AppData; canceled?: boolean; error?: string }> => {
  // Tauri 版本请使用恢复备份功能
  return { success: false, error: '请使用"恢复备份"功能导入数据' };
};

// 删除备份
export const deleteBackup = async (backupPath: string): Promise<{ success: boolean; error?: string }> => {
  if (!isDesktop()) {
    return { success: false, error: '删除备份仅在桌面版可用' };
  }

  // Tauri 环境
  if (isTauri()) {
    const { deleteBackup: tauriDeleteBackup } = await import('@/utils/tauri-api');
    await tauriDeleteBackup(backupPath);
    return { success: true };
  }

  return { success: false, error: '删除备份仅支持桌面版' };
};

// 清理旧备份
export const cleanupBackups = async (keepCount: number = 10): Promise<{ success: boolean; deleted?: number; error?: string }> => {
  if (!isDesktop()) {
    return { success: false, error: '清理备份仅在桌面版可用' };
  }

  // Tauri 环境
  if (isTauri()) {
    const { listBackups: tauriGetBackupList, deleteBackup: tauriDeleteBackup } = await import('@/utils/tauri-api');
    const backups = await tauriGetBackupList();
    // 按时间排序，保留最新的 keepCount 个
    const sortedBackups = backups.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const toDelete = sortedBackups.slice(keepCount);

    let deleted = 0;
    for (const backup of toDelete) {
      await tauriDeleteBackup(backup.path);
      deleted++;
    }
    return { success: true, deleted };
  }

  return { success: false, error: '清理备份仅支持桌面版' };
};

// 自动备份检查
export const shouldAutoBackup = (): boolean => {
  const settings = JSON.parse(localStorage.getItem('auto_backup_settings') || '{}');
  if (!settings.enabled) return false;
  
  const now = Date.now();
  const lastBackup = settings.lastBackupTime || 0;
  const interval = (settings.interval || 30) * 60 * 1000;
  
  return now - lastBackup >= interval;
};

// 检查是否今天第一次打开
export const isFirstOpenToday = (): boolean => {
  const today = new Date().toISOString().split('T')[0];
  const lastOpen = localStorage.getItem('last_open_date');
  return lastOpen !== today;
};

// 标记今天已打开
export const markOpenedToday = (): void => {
  localStorage.setItem('last_open_date', new Date().toISOString().split('T')[0]);
};

export { isTauri, isDesktop };
