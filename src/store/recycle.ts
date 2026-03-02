import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RecycleItem, RecycleItemType } from '@/types/recycle';
import { 
  RECYCLE_BIN_CONFIG, 
  getExpirationTime, 
  isExpired, 
  getRemainingDays 
} from '@/types/recycle';

interface RecycleStore {
  items: RecycleItem[];
  lastCleanupAt: number;
  
  // 添加删除项
  addToRecycleBin: (item: Omit<RecycleItem, 'deletedAt' | 'expiresAt'>) => void;
  
  // 恢复项目
  restoreItem: (id: string) => RecycleItem | null;
  
  // 永久删除
  permanentDelete: (id: string) => void;
  
  // 清空回收站
  emptyRecycleBin: () => void;
  
  // 获取所有项目（按删除时间倒序）
  getAllItems: () => RecycleItem[];
  
  // 按类型获取项目
  getItemsByType: (type: RecycleItemType) => RecycleItem[];
  
  // 获取即将过期的项目（7天内）
  getExpiringItems: (days?: number) => RecycleItem[];
  
  // 自动清理过期项目
  cleanupExpired: () => number;
  
  // 获取统计信息
  getStats: () => {
    total: number;
    byType: Record<RecycleItemType, number>;
    expiringSoon: number;
  };
}

export const useRecycleStore = create<RecycleStore>()(
  persist(
    (set, get) => ({
      items: [],
      lastCleanupAt: Date.now(),

      addToRecycleBin: (item) => {
        const now = Date.now();
        const newItem: RecycleItem = {
          ...item,
          deletedAt: now,
          expiresAt: getExpirationTime(now),
        };
        
        set((state) => ({
          items: [newItem, ...state.items],
        }));
        
        // 触发自动清理检查
        const { lastCleanupAt, cleanupExpired } = get();
        if (now - lastCleanupAt > RECYCLE_BIN_CONFIG.AUTO_CLEANUP_INTERVAL) {
          cleanupExpired();
        }
      },

      restoreItem: (id) => {
        const { items } = get();
        const item = items.find((i) => i.id === id);
        
        if (!item) return null;
        
        // 检查是否已过期
        if (isExpired(item.expiresAt)) {
          return null;
        }
        
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        }));
        
        return item;
      },

      permanentDelete: (id) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        }));
      },

      emptyRecycleBin: () => {
        set({ items: [] });
      },

      getAllItems: () => {
        const { items } = get();
        return [...items].sort((a, b) => b.deletedAt - a.deletedAt);
      },

      getItemsByType: (type) => {
        const { items } = get();
        return items
          .filter((i) => i.type === type)
          .sort((a, b) => b.deletedAt - a.deletedAt);
      },

      getExpiringItems: (days = 7) => {
        const { items } = get();
        return items.filter((item) => {
          const remainingDays = getRemainingDays(item.expiresAt);
          return remainingDays <= days && remainingDays > 0;
        });
      },

      cleanupExpired: () => {
        const { items } = get();
        const now = Date.now();
        const validItems = items.filter((item) => !isExpired(item.expiresAt));
        const deletedCount = items.length - validItems.length;
        
        if (deletedCount > 0) {
          set({
            items: validItems,
            lastCleanupAt: now,
          });
        }
        
        return deletedCount;
      },

      getStats: () => {
        const { items, getExpiringItems } = get();
        
        const byType = {
          note: items.filter((i) => i.type === 'note').length,
          todo: items.filter((i) => i.type === 'todo').length,
          customer: items.filter((i) => i.type === 'customer').length,
        };
        
        return {
          total: items.length,
          byType,
          expiringSoon: getExpiringItems().length,
        };
      },
    }),
    {
      name: 'lemonc-recycle-bin',
      partialize: (state) => ({ 
        items: state.items,
        lastCleanupAt: state.lastCleanupAt,
      }),
    }
  )
);

// 辅助函数：创建回收站项目
export const createRecycleItem = (
  type: RecycleItemType,
  originalData: any,
  title: string,
  content?: string,
  deletedBy?: string
): Omit<RecycleItem, 'deletedAt' | 'expiresAt'> => {
  return {
    id: `recycle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    originalId: originalData.id,
    type,
    title,
    content,
    data: originalData,
    deletedBy,
  };
};
