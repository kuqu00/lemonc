import { useEffect, useRef, useCallback } from 'react';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => void | Promise<void>;
  delay?: number;
  enabled?: boolean;
}

export function useAutoSave<T>({ data, onSave, delay = 3000, enabled = true }: UseAutoSaveOptions<T>) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedDataRef = useRef<T>(data);
  const isSavingRef = useRef(false);

  const triggerSave = useCallback(async () => {
    if (isSavingRef.current) return;
    
    isSavingRef.current = true;
    try {
      await onSave(data);
      lastSavedDataRef.current = data;
    } finally {
      isSavingRef.current = false;
    }
  }, [data, onSave]);

  useEffect(() => {
    if (!enabled) return;

    // 数据变化时启动自动保存定时器
    const hasChanged = JSON.stringify(data) !== JSON.stringify(lastSavedDataRef.current);
    
    if (hasChanged) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        triggerSave();
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, triggerSave]);

  // 组件卸载时强制保存
  useEffect(() => {
    return () => {
      const hasChanged = JSON.stringify(data) !== JSON.stringify(lastSavedDataRef.current);
      if (hasChanged && enabled) {
        onSave(data);
      }
    };
  }, []);

  return {
    triggerSave,
    isSaving: isSavingRef.current
  };
}
