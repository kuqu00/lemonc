import { useEffect, useRef } from 'react';
import { isTauri } from '@/lib/localDataStore';
import { writeDataFile } from '@/utils/tauri-api';

interface UseTauriAutoSaveOptions<T> {
  key: string;
  data: T;
  enabled?: boolean;
  delay?: number; // 毫秒
}

/**
 * Tauri 环境自动保存 Hook
 * 数据变化后延迟保存到本地文件系统
 */
export function useTauriAutoSave<T>({
  key,
  data,
  enabled = true,
  delay = 5000,
}: UseTauriAutoSaveOptions<T>) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    // 只在 Tauri 环境下启用
    if (!isTauri() || !enabled) {
      return;
    }

    // 计算数据哈希值，避免不必要的保存
    const currentDataHash = JSON.stringify(data);

    // 如果数据没有变化，不保存
    if (currentDataHash === lastSavedRef.current) {
      return;
    }

    // 清除之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // 设置新的定时器
    timerRef.current = setTimeout(async () => {
      try {
        await writeDataFile(`${key}.json`, data);
        lastSavedRef.current = currentDataHash;
        console.log(`[Tauri AutoSave] ${key} saved successfully`);
      } catch (error) {
        console.error(`[Tauri AutoSave] Failed to save ${key}:`, error);
      }
    }, delay);

    // 清理函数
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [data, key, enabled, delay]);
}

/**
 * 立即保存数据（用于手动保存）
 */
export async function immediateSave<T>(key: string, data: T): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }

  try {
    await writeDataFile(`${key}.json`, data);
    console.log(`[Tauri AutoSave] ${key} saved immediately`);
    return true;
  } catch (error) {
    console.error(`[Tauri AutoSave] Failed to save ${key}:`, error);
    return false;
  }
}
