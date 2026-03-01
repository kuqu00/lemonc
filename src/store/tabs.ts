import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Tab {
  id: string;
  title: string;
  icon: string;
  path: string;
  isPinned: boolean;
  isActive: boolean;
  hasUnsavedChanges: boolean;
  notificationCount?: number;
  group?: string;
  createdAt: number;
  lastVisitedAt: number;
  state?: any;
  isLoading?: boolean;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
  closedTabs: Tab[];
  
  // 基础操作
  addTab: (tab: Omit<Tab, 'id' | 'createdAt' | 'lastVisitedAt'>) => string;
  closeTab: (id: string) => void;
  closeOtherTabs: (id: string) => void;
  closeAllTabs: () => void;
  closeTabsToRight: (id: string) => void;
  activateTab: (id: string) => void;
  
  // 标签操作
  pinTab: (id: string) => void;
  unpinTab: (id: string) => void;
  togglePinTab: (id: string) => void;
  duplicateTab: (id: string) => void;
  moveTab: (fromIndex: number, toIndex: number) => void;
  
  // 状态管理
  setTabState: (id: string, state: any) => void;
  setTabLoading: (id: string, loading: boolean) => void;
  setTabUnsavedChanges: (id: string, hasChanges: boolean) => void;
  setTabNotification: (id: string, count?: number) => void;
  updateTabTitle: (id: string, title: string) => void;
  
  // 恢复操作
  restoreClosedTab: () => void;
  restoreAllClosedTabs: () => void;
  clearClosedTabs: () => void;
  
  // 查询
  getTabByPath: (path: string) => Tab | undefined;
  getTabById: (id: string) => Tab | undefined;
  getActiveTab: () => Tab | undefined;
  getPinnedTabs: () => Tab[];
  getUnpinnedTabs: () => Tab[];
}

const generateTabId = () => `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,
      closedTabs: [],

      addTab: (tabData) => {
        const { tabs, activeTabId } = get();
        
        // 检查是否已存在相同路径的标签
        const existingTab = tabs.find(t => t.path === tabData.path);
        if (existingTab) {
          // 激活已存在的标签
          set({
            activeTabId: existingTab.id,
            tabs: tabs.map(t => 
              t.id === existingTab.id 
                ? { ...t, isActive: true, lastVisitedAt: Date.now() }
                : { ...t, isActive: false }
            )
          });
          return existingTab.id;
        }
        
        const newTab: Tab = {
          ...tabData,
          id: generateTabId(),
          createdAt: Date.now(),
          lastVisitedAt: Date.now(),
        };
        
        set({
          tabs: [...tabs.map(t => ({ ...t, isActive: false })), newTab],
          activeTabId: newTab.id
        });
        
        return newTab.id;
      },

      closeTab: (id) => {
        const { tabs, activeTabId, closedTabs } = get();
        const tabToClose = tabs.find(t => t.id === id);
        if (!tabToClose) return;
        
        const newTabs = tabs.filter(t => t.id !== id);
        let newActiveId = activeTabId;
        
        // 如果关闭的是当前激活标签，激活相邻标签
        if (activeTabId === id && newTabs.length > 0) {
          const closedIndex = tabs.findIndex(t => t.id === id);
          const nextTab = newTabs[closedIndex] || newTabs[newTabs.length - 1];
          newActiveId = nextTab?.id || null;
          if (nextTab) {
            nextTab.isActive = true;
          }
        }
        
        set({
          tabs: newTabs,
          activeTabId: newActiveId,
          closedTabs: [tabToClose, ...closedTabs].slice(0, 10) // 最多保存10个
        });
      },

      closeOtherTabs: (id) => {
        const { tabs, closedTabs } = get();
        const keepTab = tabs.find(t => t.id === id);
        if (!keepTab) return;
        
        const tabsToClose = tabs.filter(t => t.id !== id && !t.isPinned);
        
        set({
          tabs: [keepTab],
          activeTabId: id,
          closedTabs: [...tabsToClose, ...closedTabs].slice(0, 10)
        });
      },

      closeAllTabs: () => {
        const { tabs, closedTabs } = get();
        const pinnedTabs = tabs.filter(t => t.isPinned);
        const unpinnedTabs = tabs.filter(t => !t.isPinned);
        
        set({
          tabs: pinnedTabs,
          activeTabId: pinnedTabs.length > 0 ? pinnedTabs[0].id : null,
          closedTabs: [...unpinnedTabs, ...closedTabs].slice(0, 10)
        });
      },

      closeTabsToRight: (id) => {
        const { tabs, activeTabId, closedTabs } = get();
        const index = tabs.findIndex(t => t.id === id);
        if (index === -1 || index === tabs.length - 1) return;
        
        const tabsToKeep = tabs.slice(0, index + 1);
        const tabsToClose = tabs.slice(index + 1).filter(t => !t.isPinned);
        
        let newActiveId = activeTabId;
        if (activeTabId && tabsToClose.some(t => t.id === activeTabId)) {
          newActiveId = id;
          const activeTab = tabsToKeep.find(t => t.id === id);
          if (activeTab) activeTab.isActive = true;
        }
        
        set({
          tabs: [...tabsToKeep.filter(t => t.isPinned || !tabsToClose.some(ct => ct.id === t.id))],
          activeTabId: newActiveId,
          closedTabs: [...tabsToClose, ...closedTabs].slice(0, 10)
        });
      },

      activateTab: (id) => {
        const { tabs } = get();
        set({
          activeTabId: id,
          tabs: tabs.map(t => ({
            ...t,
            isActive: t.id === id,
            lastVisitedAt: t.id === id ? Date.now() : t.lastVisitedAt
          }))
        });
      },

      pinTab: (id) => {
        const { tabs } = get();
        set({
          tabs: tabs.map(t => t.id === id ? { ...t, isPinned: true } : t)
        });
      },

      unpinTab: (id) => {
        const { tabs } = get();
        set({
          tabs: tabs.map(t => t.id === id ? { ...t, isPinned: false } : t)
        });
      },

      togglePinTab: (id) => {
        const { tabs } = get();
        const tab = tabs.find(t => t.id === id);
        if (tab) {
          set({
            tabs: tabs.map(t => t.id === id ? { ...t, isPinned: !t.isPinned } : t)
          });
        }
      },

      duplicateTab: (id) => {
        const { tabs, addTab } = get();
        const tab = tabs.find(t => t.id === id);
        if (tab) {
          addTab({
            title: tab.title,
            icon: tab.icon,
            path: tab.path,
            isPinned: false,
            isActive: true,
            hasUnsavedChanges: false,
            group: tab.group
          });
        }
      },

      moveTab: (fromIndex, toIndex) => {
        const { tabs } = get();
        const newTabs = [...tabs];
        const [movedTab] = newTabs.splice(fromIndex, 1);
        newTabs.splice(toIndex, 0, movedTab);
        set({ tabs: newTabs });
      },

      setTabState: (id, state) => {
        const { tabs } = get();
        set({
          tabs: tabs.map(t => t.id === id ? { ...t, state } : t)
        });
      },

      setTabLoading: (id, loading) => {
        const { tabs } = get();
        set({
          tabs: tabs.map(t => t.id === id ? { ...t, isLoading: loading } : t)
        });
      },

      setTabUnsavedChanges: (id, hasChanges) => {
        const { tabs } = get();
        set({
          tabs: tabs.map(t => t.id === id ? { ...t, hasUnsavedChanges: hasChanges } : t)
        });
      },

      setTabNotification: (id, count) => {
        const { tabs } = get();
        set({
          tabs: tabs.map(t => t.id === id ? { ...t, notificationCount: count } : t)
        });
      },

      updateTabTitle: (id, title) => {
        const { tabs } = get();
        set({
          tabs: tabs.map(t => t.id === id ? { ...t, title } : t)
        });
      },

      restoreClosedTab: () => {
        const { closedTabs, tabs, addTab } = get();
        if (closedTabs.length === 0) return;
        
        const [lastClosed, ...remaining] = closedTabs;
        set({ closedTabs: remaining });
        
        addTab({
          title: lastClosed.title,
          icon: lastClosed.icon,
          path: lastClosed.path,
          isPinned: false,
          isActive: true,
          hasUnsavedChanges: lastClosed.hasUnsavedChanges,
          group: lastClosed.group
        });
      },

      restoreAllClosedTabs: () => {
        const { closedTabs, addTab } = get();
        
        [...closedTabs].reverse().forEach(tab => {
          addTab({
            title: tab.title,
            icon: tab.icon,
            path: tab.path,
            isPinned: false,
            isActive: false,
            hasUnsavedChanges: tab.hasUnsavedChanges,
            group: tab.group
          });
        });
        
        set({ closedTabs: [] });
      },

      clearClosedTabs: () => {
        set({ closedTabs: [] });
      },

      getTabByPath: (path) => {
        return get().tabs.find(t => t.path === path);
      },

      getTabById: (id) => {
        return get().tabs.find(t => t.id === id);
      },

      getActiveTab: () => {
        const { tabs, activeTabId } = get();
        return tabs.find(t => t.id === activeTabId);
      },

      getPinnedTabs: () => {
        return get().tabs.filter(t => t.isPinned);
      },

      getUnpinnedTabs: () => {
        return get().tabs.filter(t => !t.isPinned);
      }
    }),
    {
      name: 'bank-credit-tabs',
      partialize: (state) => ({ 
        tabs: state.tabs.map(t => ({ ...t, isActive: false, isLoading: false })),
        closedTabs: []
      })
    }
  )
);
