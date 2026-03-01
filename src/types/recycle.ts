// ==================== 回收站类型 ====================

export type RecycleItemType = 'note' | 'todo' | 'customer';

export interface RecycleItem {
  id: string;
  originalId: string; // 原始数据ID
  type: RecycleItemType;
  title: string; // 显示标题
  content?: string; // 简要内容预览
  data: any; // 完整原始数据
  deletedAt: number; // 删除时间
  expiresAt: number; // 过期时间（30天后）
  deletedBy?: string; // 删除人
}

export interface RecycleBinState {
  items: RecycleItem[];
  lastCleanupAt: number; // 上次清理时间
}

// 回收站配置
export const RECYCLE_BIN_CONFIG = {
  RETENTION_DAYS: 30, // 保留天数
  AUTO_CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 自动清理间隔（24小时）
};

// 获取过期时间
export const getExpirationTime = (deletedAt: number): number => {
  return deletedAt + RECYCLE_BIN_CONFIG.RETENTION_DAYS * 24 * 60 * 60 * 1000;
};

// 检查是否已过期
export const isExpired = (expiresAt: number): boolean => {
  return Date.now() > expiresAt;
};

// 获取剩余天数
export const getRemainingDays = (expiresAt: number): number => {
  const remaining = expiresAt - Date.now();
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
};
