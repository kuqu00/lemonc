// Electron API 类型声明
export interface ElectronAPI {
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
    toDirectory: (data: any, defaultName?: string) => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
  };
  import: {
    fromFile: () => Promise<{ success: boolean; data?: any; canceled?: boolean; error?: string }>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
