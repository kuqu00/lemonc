import { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Palette,
  Layout,
  Save,
  Monitor,
  CheckCircle2,
  Shield,
  Lock,
  FileSpreadsheet,
  Download,
  Upload,
  Bell,
  Clock,
  Tag,
  Key,
  FolderOpen,
  HardDrive,
  RefreshCw,
  Database,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAppStore } from '@/store';
import { db } from '@/db';
import type { ThemeType } from '@/types';
import { DataManager } from './DataManager';
import { isTauri, performFullBackup, exportToDirectory, getBackupList, restoreBackup, deleteBackup, getDataPath } from '@/lib/localDataStore';

// 动态导入 Tauri 插件(仅在 Tauri 环境中可用)
const loadUpdaterPlugin = async () => {
  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    return { check };
  } catch {
    return null;
  }
};

const loadProcessPlugin = async () => {
  try {
    const plugin = await import('@tauri-apps/plugin-process');
    return plugin;
  } catch {
    return null;
  }
};

import { exportAllDataFromSqlite, importAllDataToSqlite, getDbStatistics } from '@/utils/sqlite-api';
import { format } from 'date-fns';
import { exportToExcel, importCustomersFromExcel, downloadCustomerTemplate } from '@/utils/excel';
import { getHotkeyList } from '@/hooks/useHotkeys';

const themes: { value: ThemeType; label: string; color: string }[] = [
  { value: 'light', label: '浅色主题', color: 'bg-gray-100' },
  { value: 'dark', label: '深色主题', color: 'bg-gray-800' },
  { value: 'blue', label: '蓝色主题', color: 'bg-blue-500' },
  { value: 'green', label: '绿色主题', color: 'bg-green-500' },
  { value: 'purple', label: '紫色主题', color: 'bg-purple-500' }
];

const layouts = [
  { value: 'sidebar', label: '侧边栏布局', description: '左侧显示导航菜单，适合宽屏显示器' },
  { value: 'topbar', label: '顶部栏布局', description: '顶部显示导航菜单，内容区域更宽' },
  { value: 'mixed', label: '混合布局', description: '顶部显示工具栏，左侧显示图标菜单' }
];

export function Settings() {
  const [activeTab, setActiveTab] = useState('appearance');
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 设置状态
  const [autoSave, setAutoSave] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState(30);
  const [todoReminder, setTodoReminder] = useState(true);
  const [contractReminder, setContractReminder] = useState(true);
  const [reminderDays, setReminderDays] = useState(30);
  const [desktopNotification, setDesktopNotification] = useState(false);
  const [followUpReminder, setFollowUpReminder] = useState(true);
  const [followUpDays, setFollowUpDays] = useState(7);
  const [autoLock, setAutoLock] = useState(true);
  const [autoLockMinutes, setAutoLockMinutes] = useState(30);
  const [defaultTodoTags, setDefaultTodoTags] = useState<string[]>(['工作', '客户', '合同', '其他']);
  const [defaultCustomerTags, setDefaultCustomerTags] = useState<string[]>(['VIP客户', '重点跟进', '普通客户', '潜在客户']);

  // 本地目录保存设置
  const [saveToLocalEnabled, setSaveToLocalEnabled] = useState(false);
  const [localSavePath, setLocalSavePath] = useState('');
  const [backupList, setBackupList] = useState<any[]>([]);
  const [showBackupList, setShowBackupList] = useState(false);

  // 自动备份设置
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupInterval, setAutoBackupInterval] = useState(60);

  // 更新设置
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // SQLite 数据统计
  const [dbStats, setDbStats] = useState<any>(null);

  // 密码修改状态
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const { theme, setTheme, layout, setLayout, settings, loadSettings, updateSettings, addNotification, changePassword, desktopNotificationEnabled, setDesktopNotificationEnabled } = useAppStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (settings) {
      setAutoSave(settings.autoSave);
      setAutoSaveInterval(settings.autoSaveInterval);
      setTodoReminder(settings.todoReminder);
      setContractReminder(settings.contractReminder);
      setReminderDays(settings.reminderDays);
      setDesktopNotification(settings.desktopNotification ?? false);
      setFollowUpReminder(settings.followUpReminder ?? true);
      setFollowUpDays(settings.followUpDays ?? 7);
      setAutoLock(settings.autoLock ?? true);
      setAutoLockMinutes(settings.autoLockMinutes ?? 30);
      setDefaultTodoTags(settings.defaultTodoTags ?? ['工作', '客户', '合同', '其他']);
      setDefaultCustomerTags(settings.defaultCustomerTags ?? ['VIP客户', '重点跟进', '普通客户', '潜在客户']);
      setSaveToLocalEnabled(settings.saveToLocalEnabled ?? false);
      setLocalSavePath(settings.localSavePath ?? '');
    }
    setDesktopNotification(desktopNotificationEnabled);
    loadLocalDataPath();
    if (isTauri()) {
      loadDbStats();
    }
  }, [settings, desktopNotificationEnabled]);

  // 加载本地数据路径
  const loadLocalDataPath = async () => {
    if (isTauri()) {
      try {
        const path = await getDataPath();
        setLocalSavePath(path);
      } catch (error) {
        console.error('获取数据路径失败:', error);
      }
    }
  };

  // 检查更新
  const handleCheckUpdate = async () => {
    const updaterPlugin = await loadUpdaterPlugin();
    if (!updaterPlugin) {
      await addNotification({
        title: '更新功能不可用',
        message: '仅在桌面版支持自动更新',
        type: 'error',
        category: 'system'
      });
      return;
    }

    try {
      const update = await updaterPlugin.check();
      if (update) {
        setUpdateAvailable(true);
        setUpdateInfo(update);
        await addNotification({
          title: '发现新版本',
          message: `发现新版本可用`,
          type: 'success',
          category: 'system'
        });
      } else {
        await addNotification({
          title: '已是最新版本',
          message: '当前系统已是最新版本',
          type: 'info',
          category: 'system'
        });
      }
    } catch (error) {
      console.error('检查更新失败:', error);
    }
  };

  // 安装更新
  const handleInstallUpdate = async () => {
    const updaterPlugin = await loadUpdaterPlugin();
    const processPlugin = await loadProcessPlugin();

    if (!updaterPlugin || !processPlugin) {
      await addNotification({
        title: '更新功能不可用',
        message: '仅在桌面版支持自动更新',
        type: 'error',
        category: 'system'
      });
      return;
    }

    setIsUpdating(true);
    try {
      if (updateInfo) {
        await updateInfo.downloadAndInstall();
        await processPlugin.relaunch();
      }
    } catch (error) {
      console.error('安装更新失败:', error);
      setIsUpdating(false);
    }
  };

  // 启动自动备份
  const handleStartAutoBackup = async () => {
    if (!isTauri()) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke('start_auto_backup', { intervalMinutes: autoBackupInterval });
      await addNotification({
        title: '自动备份已启动',
        message: result as string,
        type: 'success',
        category: 'system'
      });
    } catch (error) {
      console.error('启动自动备份失败:', error);
    }
  };

  // 停止自动备份
  const handleStopAutoBackup = async () => {
    if (!isTauri()) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke('stop_auto_backup');
      await addNotification({
        title: '自动备份已停止',
        message: result as string,
        type: 'info',
        category: 'system'
      });
    } catch (error) {
      console.error('停止自动备份失败:', error);
    }
  };

  // 加载数据库统计
  const loadDbStats = async () => {
    if (!isTauri()) return;
    try {
      const stats = await getDbStatistics();
      setDbStats(stats);
    } catch (error) {
      console.error('获取数据库统计失败:', error);
    }
  };

  // 请求桌面通知权限
  const handleRequestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setDesktopNotification(true);
        await addNotification({
          title: '桌面通知已启用',
          message: '您将收到重要的桌面通知提醒',
          type: 'success',
          category: 'system'
        });
      } else {
        setDesktopNotification(false);
        await addNotification({
          title: '桌面通知已禁用',
          message: '您已拒绝桌面通知权限，请在浏览器设置中更改',
          type: 'warning',
          category: 'system'
        });
      }
    } else {
      await addNotification({
        title: '不支持桌面通知',
        message: '您的浏览器不支持桌面通知功能',
        type: 'error',
        category: 'system'
      });
    }
  };

  // 保存设置
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        autoSave,
        autoSaveInterval,
        todoReminder,
        contractReminder,
        reminderDays,
        desktopNotification,
        followUpReminder,
        followUpDays,
        autoLock,
        autoLockMinutes,
        defaultTodoTags,
        defaultCustomerTags,
        saveToLocalEnabled,
        localSavePath
      });

      setDesktopNotificationEnabled(desktopNotification);

      await addNotification({
        title: '保存成功',
        message: '系统设置已更新',
        type: 'success',
        category: 'system'
      });
    } catch (error) {
      await addNotification({
        title: '保存失败',
        message: '请重试',
        type: 'error',
        category: 'system'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 数据管理
  const handleExportData = async () => {
    const data = {
      notes: await db.getActiveNotes(),
      todos: await db.getActiveTodos(),
      customers: await db.getActiveCustomers(),
      contracts: await db.contracts.toArray(),
      followUpRecords: await db.followUpRecords.toArray(),
      exportTime: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bank-office-backup-${format(new Date(), 'yyyyMMdd-HHmmss')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    await addNotification({
      title: '导出成功',
      message: '数据已导出到文件',
      type: 'success',
      category: 'system'
    });
  };

  const handleClearData = async () => {
    if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) return;
    if (!confirm('再次确认：您真的要删除所有数据吗？')) return;

    await Promise.all([
      db.notes.clear(),
      db.todos.clear(),
      db.customers.clear(),
      db.contracts.clear(),
      db.followUpRecords.clear(),
      db.mortgageCalcs.clear(),
      db.incomeCalcs.clear()
    ]);

    await addNotification({
      title: '清空完成',
      message: '所有数据已清空',
      type: 'success',
      category: 'system'
    });
  };

  // Excel 导出
  const handleExcelExport = async () => {
    setIsLoading(true);
    const result = await exportToExcel();
    setIsLoading(false);
    
    if (result.success) {
      await addNotification({
        title: '导出成功',
        message: '数据已导出到 Excel 文件',
        type: 'success',
        category: 'system'
      });
    } else {
      await addNotification({
        title: '导出失败',
        message: result.message,
        type: 'error',
        category: 'system'
      });
    }
  };

  // Excel 导入
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const result = await importCustomersFromExcel(file);
    setIsLoading(false);
    
    if (result.success) {
      await addNotification({
        title: '导入成功',
        message: result.message,
        type: 'success',
        category: 'system'
      });
    } else {
      await addNotification({
        title: '导入失败',
        message: result.message,
        type: 'error',
        category: 'system'
      });
    }

    // 清空 input
    e.target.value = '';
  };

  // 处理密码修改
  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('请填写所有密码字段');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('新密码长度至少为6位');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的新密码不一致');
      return;
    }

    setIsChangingPassword(true);
    const result = await changePassword(oldPassword, newPassword);
    setIsChangingPassword(false);

    if (result.success) {
      setPasswordSuccess(result.message);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await addNotification({
        title: '密码修改成功',
        message: '您的密码已更新',
        type: 'success',
        category: 'system'
      });
    } else {
      setPasswordError(result.message);
    }
  };

  // 保存到本地目录
  const handleSaveToLocal = async () => {
    if (!isTauri()) {
      await addNotification({
        title: '功能不可用',
        message: '本地目录保存仅在桌面版可用',
        type: 'error',
        category: 'system'
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await performFullBackup();
      if (result.success) {
        await addNotification({
          title: '保存成功',
          message: `数据已保存到: ${result.path}`,
          type: 'success',
          category: 'system'
        });
        loadLocalDataPath();
      } else {
        await addNotification({
          title: '保存失败',
          message: result.error || '未知错误',
          type: 'error',
          category: 'system'
        });
      }
    } catch (error) {
      await addNotification({
        title: '保存失败',
        message: (error as Error).message,
        type: 'error',
        category: 'system'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 导出目录选择
  const handleExportToDirectory = async () => {
    if (!isTauri()) {
      await addNotification({
        title: '功能不可用',
        message: '导出目录仅在桌面版可用',
        type: 'error',
        category: 'system'
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await exportToDirectory();
      if (result.success) {
        await addNotification({
          title: '导出成功',
          message: `数据已导出到: ${result.path}`,
          type: 'success',
          category: 'system'
        });
      } else if (!result.canceled) {
        await addNotification({
          title: '导出失败',
          message: result.error || '未知错误',
          type: 'error',
          category: 'system'
        });
      }
    } catch (error) {
      await addNotification({
        title: '导出失败',
        message: (error as Error).message,
        type: 'error',
        category: 'system'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 加载备份列表
  const handleLoadBackupList = async () => {
    if (!isTauri()) {
      await addNotification({
        title: '功能不可用',
        message: '备份列表仅在桌面版可用',
        type: 'error',
        category: 'system'
      });
      return;
    }

    try {
      const result = await getBackupList();
      if (result.success && result.files) {
        setBackupList(result.files);
        setShowBackupList(true);
      } else {
        await addNotification({
          title: '获取失败',
          message: result.error || '未知错误',
          type: 'error',
          category: 'system'
        });
      }
    } catch (error) {
      await addNotification({
        title: '获取失败',
        message: (error as Error).message,
        type: 'error',
        category: 'system'
      });
    }
  };

  // 恢复备份
  const handleRestoreBackup = async (backupPath: string) => {
    if (!confirm('确定要恢复此备份吗？当前数据将被覆盖！')) return;

    try {
      const result = await restoreBackup(backupPath);
      if (result.success) {
        await addNotification({
          title: '恢复成功',
          message: '数据已恢复，请刷新页面',
          type: 'success',
          category: 'system'
        });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        await addNotification({
          title: '恢复失败',
          message: result.error || '未知错误',
          type: 'error',
          category: 'system'
        });
      }
    } catch (error) {
      await addNotification({
        title: '恢复失败',
        message: (error as Error).message,
        type: 'error',
        category: 'system'
      });
    }
  };

  // 删除备份
  const handleDeleteBackup = async (backupPath: string) => {
    if (!confirm('确定要删除此备份吗？')) return;

    try {
      const result = await deleteBackup(backupPath);
      if (result.success) {
        await addNotification({
          title: '删除成功',
          message: '备份已删除',
          type: 'success',
          category: 'system'
        });
        handleLoadBackupList();
      } else {
        await addNotification({
          title: '删除失败',
          message: result.error || '未知错误',
          type: 'error',
          category: 'system'
        });
      }
    } catch (error) {
      await addNotification({
        title: '删除失败',
        message: (error as Error).message,
        type: 'error',
        category: 'system'
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-5">
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 mr-2" />
            外观
          </TabsTrigger>
          <TabsTrigger value="function">
            <SettingsIcon className="h-4 w-4 mr-2" />
            功能
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            安全
          </TabsTrigger>
          <TabsTrigger value="data">
            <Monitor className="h-4 w-4 mr-2" />
            数据
          </TabsTrigger>
          <TabsTrigger value="system">
            <Zap className="h-4 w-4 mr-2" />
            系统
          </TabsTrigger>
        </TabsList>

        {/* 外观设置 */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>主题设置</CardTitle>
              <CardDescription>选择您喜欢的主题颜色</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {themes.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      theme === t.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full ${t.color} mx-auto mb-2`} />
                    <p className="font-medium text-sm">{t.label}</p>
                    {theme === t.value && (
                      <Badge variant="default" className="mt-2">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        当前
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>布局设置</CardTitle>
              <CardDescription>选择适合您的界面布局</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {layouts.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLayout(l.value as any)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      layout === l.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Layout className="h-6 w-6 mb-2" />
                    <p className="font-medium">{l.label}</p>
                    <p className="text-sm text-muted-foreground mt-1">{l.description}</p>
                    {layout === l.value && (
                      <Badge variant="default" className="mt-2">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        当前
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 功能设置 */}
        <TabsContent value="function" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>自动保存</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">启用自动保存</p>
                  <p className="text-sm text-muted-foreground">编辑内容时自动保存到本地</p>
                </div>
                <Switch checked={autoSave} onCheckedChange={setAutoSave} />
              </div>
              
              {autoSave && (
                <div className="space-y-2">
                  <Label>自动保存间隔（秒）</Label>
                  <Input
                    type="number"
                    value={autoSaveInterval}
                    onChange={(e) => setAutoSaveInterval(parseInt(e.target.value) || 30)}
                    min={10}
                    max={300}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>提醒设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">待办提醒</p>
                  <p className="text-sm text-muted-foreground">到期前提醒待办事项</p>
                </div>
                <Switch checked={todoReminder} onCheckedChange={setTodoReminder} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">合同到期提醒</p>
                  <p className="text-sm text-muted-foreground">合同到期前提醒</p>
                </div>
                <Switch checked={contractReminder} onCheckedChange={setContractReminder} />
              </div>

              {contractReminder && (
                <div className="space-y-2">
                  <Label>提前提醒天数</Label>
                  <Input
                    type="number"
                    value={reminderDays}
                    onChange={(e) => setReminderDays(parseInt(e.target.value) || 30)}
                    min={1}
                    max={90}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">客户跟进提醒</p>
                  <p className="text-sm text-muted-foreground">超过设定天数未跟进的客户提醒</p>
                </div>
                <Switch checked={followUpReminder} onCheckedChange={setFollowUpReminder} />
              </div>

              {followUpReminder && (
                <div className="space-y-2">
                  <Label>跟进提醒天数</Label>
                  <Input
                    type="number"
                    value={followUpDays}
                    onChange={(e) => setFollowUpDays(parseInt(e.target.value) || 7)}
                    min={1}
                    max={90}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                桌面通知
              </CardTitle>
              <CardDescription>
                接收系统重要通知的桌面提醒
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">启用桌面通知</p>
                  <p className="text-sm text-muted-foreground">在桌面显示重要通知</p>
                </div>
                <Switch
                  checked={desktopNotification}
                  onCheckedChange={(checked) => {
                    if (checked && !desktopNotification) {
                      handleRequestNotificationPermission();
                    } else {
                      setDesktopNotification(checked);
                    }
                  }}
                />
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>• 待办到期和逾期通知</p>
                <p>• 合同即将到期通知</p>
                <p>• 系统重要事件通知</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? '保存中...' : '保存设置'}
            </Button>
          </div>
        </TabsContent>

        {/* 安全设置 */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                修改密码
              </CardTitle>
              <CardDescription>
                定期更换密码可以提高账户安全性
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {passwordError && (
                <Alert variant="destructive">
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}
              {passwordSuccess && (
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription className="text-green-700">{passwordSuccess}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="old-password">原密码</Label>
                <Input
                  id="old-password"
                  type="password"
                  placeholder="请输入原密码"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">新密码</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="请输入新密码（至少6位）"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">确认新密码</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="请再次输入新密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleChangePassword} 
                disabled={isChangingPassword}
                className="w-full"
              >
                {isChangingPassword ? '修改中...' : '修改密码'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                安全提示
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• 建议密码长度至少为6位</p>
              <p>• 定期更换密码可以提高安全性</p>
              <p>• 系统会在30分钟无操作后自动锁定，需要重新输入密码</p>
              <p>• 请勿将密码告诉他人</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                自动锁定
              </CardTitle>
              <CardDescription>
                无操作时自动锁定系统，保护数据安全
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">启用自动锁定</p>
                  <p className="text-sm text-muted-foreground">无操作时自动锁定系统</p>
                </div>
                <Switch checked={autoLock} onCheckedChange={setAutoLock} />
              </div>

              {autoLock && (
                <div className="space-y-2">
                  <Label>自动锁定时间（分钟）</Label>
                  <Input
                    type="number"
                    value={autoLockMinutes}
                    onChange={(e) => setAutoLockMinutes(parseInt(e.target.value) || 30)}
                    min={5}
                    max={120}
                  />
                  <p className="text-xs text-muted-foreground">
                    超过设定时间无操作将自动锁定系统
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 数据管理 */}
        <TabsContent value="data" className="space-y-6">
          {/* Excel 导入导出 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Excel 导入导出
              </CardTitle>
              <CardDescription>
                将数据导出到 Excel 或从 Excel 导入客户数据
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 导出按钮 */}
              <div className="flex gap-3">
                <Button 
                  onClick={handleExcelExport} 
                  disabled={isLoading}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isLoading ? '导出中...' : '导出全部数据'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={downloadCustomerTemplate}
                  disabled={isLoading}
                >
                  下载导入模板
                </Button>
              </div>

              {/* 导入区域 */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-sm font-medium mb-2">导入客户数据</p>
                <p className="text-xs text-muted-foreground mb-3">
                  支持 .xlsx 格式，建议使用模板文件
                </p>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    className="relative"
                    disabled={isLoading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    选择 Excel 文件
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelImport}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isLoading}
                    />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {isLoading ? '导入中...' : '支持 .xlsx, .xls 格式'}
                  </span>
                </div>
              </div>

              {/* 导入说明 */}
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• 导出文件包含：客户、合同、笔记、待办等所有数据</p>
                <p>• 导入仅支持客户数据，请先下载模板文件</p>
                <p>• 导入时会自动跳过重复的客户（根据手机号判断）</p>
              </div>
            </CardContent>
          </Card>

          {/* 快捷键说明 */}
          <Card>
            <CardHeader>
              <CardTitle>键盘快捷键</CardTitle>
              <CardDescription>
                使用快捷键可以快速操作系统功能
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {getHotkeyList().map((hotkey) => (
                  <div
                    key={hotkey.key}
                    className="flex items-center justify-between p-2 rounded bg-muted"
                  >
                    <kbd className="px-2 py-1 bg-background rounded border text-xs font-mono">
                      {hotkey.key}
                    </kbd>
                    <span className="text-sm text-muted-foreground">{hotkey.description}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 默认标签设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                默认标签设置
              </CardTitle>
              <CardDescription>
                设置系统默认提供的标签选项
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>默认待办标签</Label>
                <div className="flex flex-wrap gap-2">
                  {defaultTodoTags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="px-3 py-1 cursor-pointer hover:bg-primary/20"
                    >
                      {tag}
                      <button
                        onClick={() => {
                          const newTags = defaultTodoTags.filter((_, i) => i !== index);
                          setDefaultTodoTags(newTags);
                        }}
                        className="ml-2 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newTag = prompt('输入新标签名称:');
                      if (newTag && newTag.trim()) {
                        setDefaultTodoTags([...defaultTodoTags, newTag.trim()]);
                      }
                    }}
                  >
                    + 添加
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>默认客户标签</Label>
                <div className="flex flex-wrap gap-2">
                  {defaultCustomerTags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="px-3 py-1 cursor-pointer hover:bg-primary/20"
                    >
                      {tag}
                      <button
                        onClick={() => {
                          const newTags = defaultCustomerTags.filter((_, i) => i !== index);
                          setDefaultCustomerTags(newTags);
                        }}
                        className="ml-2 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newTag = prompt('输入新标签名称:');
                      if (newTag && newTag.trim()) {
                        setDefaultCustomerTags([...defaultCustomerTags, newTag.trim()]);
                      }
                    }}
                  >
                    + 添加
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 本地目录保存 */}
          {isTauri() && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  本地目录保存
                </CardTitle>
                <CardDescription>
                  将数据保存到本地目录，便于备份和迁移
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 数据路径显示 */}
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">当前数据路径</p>
                  <p className="text-xs text-muted-foreground break-all font-mono">
                    {localSavePath || '加载中...'}
                  </p>
                </div>

                {/* 快速保存 */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleSaveToLocal}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? '保存中...' : '立即保存'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportToDirectory}
                    disabled={isSaving}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    导出目录
                  </Button>
                </div>

                {/* 备份管理 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">备份管理</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLoadBackupList}
                    >
                      刷新列表
                    </Button>
                  </div>

                  {showBackupList && (
                    <div className="border rounded-lg overflow-hidden">
                      {backupList.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          暂无备份文件
                        </div>
                      ) : (
                        <div className="divide-y max-h-64 overflow-y-auto">
                          {backupList.map((backup, index) => (
                            <div
                              key={index}
                              className="p-3 hover:bg-muted/50 flex items-center justify-between gap-4"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {backup.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(backup.created).toLocaleString('zh-CN')} · {(backup.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRestoreBackup(backup.path)}
                                >
                                  恢复
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteBackup(backup.path)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  删除
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!showBackupList && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleLoadBackupList}
                    >
                      查看备份列表
                    </Button>
                  )}
                </div>

                {/* 说明文字 */}
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• 立即保存: 在当前目录创建完整备份</p>
                  <p>• 导出目录: 选择指定位置保存备份</p>
                  <p>• 恢复备份: 从备份文件恢复数据（会覆盖当前数据）</p>
                  <p>• 建议定期备份数据，防止数据丢失</p>
                </div>
              </CardContent>
            </Card>
          )}

          <DataManager />
        </TabsContent>

        {/* 系统设置 - 仅桌面版 */}
        {isTauri() && (
          <TabsContent value="system" className="space-y-6">
            {/* 系统托盘 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  系统托盘
                </CardTitle>
                <CardDescription>
                  配置系统托盘功能
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• 点击系统托盘图标可显示/隐藏窗口</p>
                  <p>• 右键托盘图标可访问快捷菜单</p>
                  <p>• 最小化窗口时会自动隐藏到托盘</p>
                </div>
              </CardContent>
            </Card>

            {/* 自动备份 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  自动备份
                </CardTitle>
                <CardDescription>
                  定时自动备份数据
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">启用自动备份</p>
                    <p className="text-sm text-muted-foreground">定时自动备份所有数据</p>
                  </div>
                  <Switch checked={autoBackupEnabled} onCheckedChange={setAutoBackupEnabled} />
                </div>

                {autoBackupEnabled && (
                  <div className="space-y-2">
                    <Label>备份间隔（分钟）</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={autoBackupInterval}
                        onChange={(e) => setAutoBackupInterval(parseInt(e.target.value) || 60)}
                        min={10}
                        max={1440}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleStartAutoBackup}
                        disabled={isLoading}
                      >
                        启动
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleStopAutoBackup}
                      >
                        停止
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      建议间隔: 60分钟 (1小时)、360分钟 (6小时) 或 720分钟 (12小时)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 更新管理 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  系统更新
                </CardTitle>
                <CardDescription>
                  检查并安装系统更新
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {updateAvailable && updateInfo ? (
                  <Alert className="bg-blue-50 border-blue-200">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-700">
                      发现新版本 {updateInfo.manifest.version}，
                      <Button
                        variant="link"
                        className="p-0 h-auto ml-2"
                        onClick={handleInstallUpdate}
                        disabled={isUpdating}
                      >
                        {isUpdating ? '安装中...' : '立即更新'}
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="flex gap-3">
                  <Button
                    onClick={handleCheckUpdate}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    检查更新
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• 系统会自动检查最新版本</p>
                  <p>• 更新会自动下载并安装</p>
                  <p>• 安装完成后会自动重启应用</p>
                </div>
              </CardContent>
            </Card>

            {/* 数据库统计 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  数据库统计
                </CardTitle>
                <CardDescription>
                  查看数据库使用情况
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dbStats ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <p className="text-2xl font-bold">{dbStats.note_count}</p>
                      <p className="text-sm text-muted-foreground">笔记</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <p className="text-2xl font-bold">{dbStats.todo_count}</p>
                      <p className="text-sm text-muted-foreground">待办</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <p className="text-2xl font-bold">{dbStats.customer_count}</p>
                      <p className="text-sm text-muted-foreground">客户</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <p className="text-2xl font-bold">{dbStats.contract_count}</p>
                      <p className="text-sm text-muted-foreground">合同</p>
                    </div>
                  </div>
                ) : (
                  <Button onClick={loadDbStats} variant="outline" className="w-full">
                    加载统计信息
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
