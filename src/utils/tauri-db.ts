// Tauri 本地文件存储 - 替代 IndexedDB
import {
  writeDataFile,
  readDataFile,
  createFullBackup,
  createIncrementalBackup,
  listBackups,
  restoreBackup,
  deleteBackup,
  getDataDirectory,
  type BackupInfo
} from './tauri-api';

// 数据文件名称
const DATA_FILES = {
  USERS: 'users.json',
  CUSTOMERS: 'customers.json',
  LOANS: 'loans.json',
  REPAYMENTS: 'repayments.json',
  PRODUCTS: 'products.json',
  SETTINGS: 'settings.json',
  SESSION: 'session.json',
  BACKUP_META: 'backup_meta.json'
};

// 内存缓存
const memoryCache: Record<string, any> = {};

// 从文件加载数据
export async function loadFromFile<T>(filename: string, defaultValue: T): Promise<T> {
  try {
    const data = await readDataFile(filename);
    if (data && Object.keys(data).length > 0) {
      memoryCache[filename] = data;
      return data;
    }
  } catch (e) {
    console.error(`Failed to load ${filename}:`, e);
  }
  return defaultValue;
}

// 保存数据到文件
export async function saveToFile(filename: string, data: any): Promise<void> {
  memoryCache[filename] = data;
  await writeDataFile(filename, data);
}

// 用户数据操作
export async function loadUsers(): Promise<any[]> {
  return loadFromFile(DATA_FILES.USERS, []);
}

export async function saveUsers(users: any[]): Promise<void> {
  await saveToFile(DATA_FILES.USERS, users);
}

// 客户数据操作
export async function loadCustomers(): Promise<any[]> {
  return loadFromFile(DATA_FILES.CUSTOMERS, []);
}

export async function saveCustomers(customers: any[]): Promise<void> {
  await saveToFile(DATA_FILES.CUSTOMERS, customers);
}

// 贷款数据操作
export async function loadLoans(): Promise<any[]> {
  return loadFromFile(DATA_FILES.LOANS, []);
}

export async function saveLoans(loans: any[]): Promise<void> {
  await saveToFile(DATA_FILES.LOANS, loans);
}

// 还款记录操作
export async function loadRepayments(): Promise<any[]> {
  return loadFromFile(DATA_FILES.REPAYMENTS, []);
}

export async function saveRepayments(repayments: any[]): Promise<void> {
  await saveToFile(DATA_FILES.REPAYMENTS, repayments);
}

// 产品数据操作
export async function loadProducts(): Promise<any[]> {
  return loadFromFile(DATA_FILES.PRODUCTS, []);
}

export async function saveProducts(products: any[]): Promise<void> {
  await saveToFile(DATA_FILES.PRODUCTS, products);
}

// 设置数据操作
export async function loadSettings(): Promise<any> {
  return loadFromFile(DATA_FILES.SETTINGS, {});
}

export async function saveSettings(settings: any): Promise<void> {
  await saveToFile(DATA_FILES.SETTINGS, settings);
}

// 会话数据操作
export async function loadSession(): Promise<any> {
  return loadFromFile(DATA_FILES.SESSION, null);
}

export async function saveSession(session: any): Promise<void> {
  await saveToFile(DATA_FILES.SESSION, session);
}

// ============ 备份功能 ============

// 获取备份元数据
export async function loadBackupMeta(): Promise<{ lastBackupTime?: string; lastFullBackupTime?: string }> {
  return loadFromFile(DATA_FILES.BACKUP_META, {});
}

// 保存备份元数据
export async function saveBackupMeta(meta: { lastBackupTime?: string; lastFullBackupTime?: string }): Promise<void> {
  await saveToFile(DATA_FILES.BACKUP_META, meta);
}

// 执行全量备份
export async function performFullBackup(): Promise<BackupInfo> {
  const backup = await createFullBackup();
  await saveBackupMeta({
    lastBackupTime: backup.timestamp,
    lastFullBackupTime: backup.timestamp
  });
  return backup;
}

// 执行增量备份
export async function performIncrementalBackup(): Promise<BackupInfo | null> {
  const meta = await loadBackupMeta();
  
  if (!meta.lastBackupTime) {
    // 没有之前的备份，执行全量备份
    return performFullBackup();
  }
  
  try {
    const backup = await createIncrementalBackup(meta.lastBackupTime);
    await saveBackupMeta({
      ...meta,
      lastBackupTime: backup.timestamp
    });
    return backup;
  } catch (e: any) {
    if (e.includes('没有需要备份的新数据')) {
      return null;
    }
    throw e;
  }
}

// 自动备份（智能选择全量或增量）
export async function performAutoBackup(): Promise<BackupInfo | null> {
  const meta = await loadBackupMeta();
  const now = new Date();
  
  // 如果没有全量备份，或者距离上次全量备份超过 7 天
  if (!meta.lastFullBackupTime) {
    return performFullBackup();
  }
  
  const lastFullBackup = new Date(meta.lastFullBackupTime);
  const daysSinceFullBackup = (now.getTime() - lastFullBackup.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceFullBackup >= 7) {
    return performFullBackup();
  }
  
  // 否则执行增量备份
  return performIncrementalBackup();
}

// 获取备份列表
export async function getBackupList(): Promise<BackupInfo[]> {
  return listBackups();
}

// 恢复备份
export async function restoreFromBackup(backupPath: string): Promise<void> {
  await restoreBackup(backupPath);
  // 清空内存缓存，强制重新加载
  Object.keys(memoryCache).forEach(key => delete memoryCache[key]);
}

// 删除备份
export async function removeBackup(backupPath: string): Promise<void> {
  await deleteBackup(backupPath);
}

// 获取数据目录
export async function getDataPath(): Promise<string> {
  return getDataDirectory();
}
