// Tauri API 封装 - 用于文件操作和备份
import { invoke } from '@tauri-apps/api/core';

export interface BackupInfo {
  timestamp: string;
  path: string;
  size: number;
  backupType: 'full' | 'incremental';
}

// 写入数据文件
export async function writeDataFile(filename: string, content: object): Promise<void> {
  await invoke('write_data_file', {
    filename,
    content: JSON.stringify(content)
  });
}

// 读取数据文件
export async function readDataFile(filename: string): Promise<any> {
  const content = await invoke('read_data_file', { filename }) as string;
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

// 列出所有数据文件
export async function listDataFiles(): Promise<string[]> {
  return await invoke('list_data_files') as string[];
}

// 创建全量备份
export async function createFullBackup(): Promise<BackupInfo> {
  return await invoke('create_full_backup') as BackupInfo;
}

// 创建增量备份
export async function createIncrementalBackup(lastBackupTime: string): Promise<BackupInfo> {
  return await invoke('create_incremental_backup', { lastBackupTime }) as BackupInfo;
}

// 列出所有备份
export async function listBackups(): Promise<BackupInfo[]> {
  return await invoke('list_backups') as BackupInfo[];
}

// 恢复备份
export async function restoreBackup(backupPath: string): Promise<void> {
  await invoke('restore_backup', { backupPath });
}

// 删除备份
export async function deleteBackup(backupPath: string): Promise<void> {
  await invoke('delete_backup', { backupPath });
}

// 获取数据目录
export async function getDataDirectory(): Promise<string> {
  return await invoke('get_data_directory') as string;
}

// 检查是否在 Tauri 环境中运行
export function isTauri(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__;
}
