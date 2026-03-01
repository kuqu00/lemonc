import { contextBridge, ipcRenderer } from 'electron';

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 数据操作
  data: {
    read: () => ipcRenderer.invoke('data:read'),
    save: (data: any) => ipcRenderer.invoke('data:save', data),
    getPath: () => ipcRenderer.invoke('data:getPath'),
  },
  
  // 备份操作
  backup: {
    full: (data: any) => ipcRenderer.invoke('backup:full', data),
    incremental: (changes: any) => ipcRenderer.invoke('backup:incremental', changes),
    list: () => ipcRenderer.invoke('backup:list'),
    restore: (path: string) => ipcRenderer.invoke('backup:restore', path),
    delete: (path: string) => ipcRenderer.invoke('backup:delete', path),
    cleanup: (keepCount: number) => ipcRenderer.invoke('backup:cleanup', keepCount),
  },
  
  // 导入导出
  export: {
    toDirectory: (data: any, defaultName?: string) => 
      ipcRenderer.invoke('export:toDirectory', data, defaultName),
  },
  import: {
    fromFile: () => ipcRenderer.invoke('import:fromFile'),
  },
});

// 类型定义（供 TypeScript 使用）
declare global {
  interface Window {
    electronAPI: {
      data: {
        read: () => Promise<{ success: boolean; data?: any; error?: string }>;
        save: (data: any) => Promise<{ success: boolean; error?: string }>;
        getPath: () => Promise<{ success: boolean; path?: string; error?: string }>;
      };
      backup: {
        full: (data: any) => Promise<{ success: boolean; path?: string; error?: string }>;
        incremental: (changes: any) => Promise<{ success: boolean; path?: string; error?: string }>;
        list: () => Promise<{ success: boolean; files?: any[]; error?: string }>;
        restore: (path: string) => Promise<{ success: boolean; data?: any; error?: string }>;
        delete: (path: string) => Promise<{ success: boolean; error?: string }>;
        cleanup: (keepCount: number) => Promise<{ success: boolean; deleted?: number; error?: string }>;
      };
      export: {
        toDirectory: (data: any, defaultName?: string) => 
          Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
      };
      import: {
        fromFile: () => Promise<{ success: boolean; data?: any; path?: string; canceled?: boolean; error?: string }>;
      };
    };
  }
}
