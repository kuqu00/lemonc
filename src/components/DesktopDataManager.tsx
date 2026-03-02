import { useState, useEffect, useCallback } from 'react';
import {
  Download,
  Upload,
  Save,
  Clock,
  AlertCircle,
  CheckCircle,
  FileJson,
  HardDrive,
  RefreshCw,
  Folder,
  Database,
  Trash2,
  Archive,
  FilePlus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  readAllData,
  saveAllData,
  getDataPath,
  performFullBackup,
  performIncrementalBackup,
  getBackupList,
  restoreBackup,
  exportToDirectory,
  importFromFile,
  deleteBackup,
  cleanupBackups,
  isTauri,
  isDesktop,
  type AppData
} from '@/lib/localDataStore';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface BackupFile {
  name: string;
  path: string;
  size: number;
  created: string;
}

export function DesktopDataManager() {
  const [isDesktopEnv, setIsDesktopEnv] = useState(false);
  const [isTauriEnv, setIsTauriEnv] = useState(false);
  const [dataPath, setDataPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null);
  const [dailyBackupEnabled, setDailyBackupEnabled] = useState(() => {
    return JSON.parse(localStorage.getItem('daily_backup_settings') || '{}').enabled || false;
  });
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(() => {
    return JSON.parse(localStorage.getItem('auto_backup_settings') || '{}').enabled || false;
  });
  const [autoBackupInterval, setAutoBackupInterval] = useState(() => {
    return JSON.parse(localStorage.getItem('auto_backup_settings') || '{}').interval || 30;
  });
  const { toast } = useToast();

  // 检查环境和加载数据
  useEffect(() => {
    const init = async () => {
      const isTauriApp = isTauri();
      setIsTauriEnv(isTauriApp);
      setIsDesktopEnv(isTauriApp);
      
      if (isTauriApp) {
        try {
          const path = await getDataPath();
          setDataPath(path);
          await loadBackups();
        } catch (error) {
          console.error('初始化失败:', error);
        }
      }
    };
    init();
  }, []);

  // 加载备份列表
  const loadBackups = useCallback(async () => {
    const result = await getBackupList();
    if (result.success && result.files) {
      setBackups(result.files.map(f => ({
        ...f,
        created: new Date(f.created).toISOString()
      })));
    }
  }, []);

  // 清除消息
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // 执行全量备份
  const handleFullBackup = async () => {
    setIsLoading(true);
    try {
      const result = await performFullBackup();
      if (result.success) {
        toast({
          title: '全量备份成功',
          description: `备份文件: ${result.path}`,
        });
        await loadBackups();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: '备份失败',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  // 执行增量备份
  const handleIncrementalBackup = async () => {
    setIsLoading(true);
    try {
      const result = await performIncrementalBackup();
      if (result.success) {
        if (result.path) {
          toast({
            title: '增量备份成功',
            description: `备份文件: ${result.path}`,
          });
          await loadBackups();
        } else {
          toast({
            title: '无需备份',
            description: '数据没有变更',
          });
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: '备份失败',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  // 导出到指定目录
  const handleExport = async () => {
    setIsLoading(true);
    try {
      const result = await exportToDirectory(`lemonC系统备份_${format(new Date(), 'yyyyMMdd')}.json`);
      if (result.success && result.path) {
        toast({
          title: '导出成功',
          description: `文件已保存到: ${result.path}`,
        });
      } else if (result.canceled) {
        // 用户取消，不显示错误
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: '导出失败',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  // 导入数据
  const handleImport = async () => {
    setIsLoading(true);
    try {
      const result = await importFromFile();
      if (result.success && result.data) {
        await saveAllData(result.data as AppData);
        toast({
          title: '导入成功',
          description: '数据已恢复，请刷新页面',
        });
        setTimeout(() => window.location.reload(), 1500);
      } else if (result.canceled) {
        // 用户取消
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: '导入失败',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  // 恢复备份
  const handleRestore = async () => {
    if (!selectedBackup) return;
    
    setIsLoading(true);
    try {
      const result = await restoreBackup(selectedBackup.path);
      if (result.success) {
        toast({
          title: '恢复成功',
          description: '数据已恢复，请刷新页面',
        });
        setShowRestoreDialog(false);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: '恢复失败',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  // 删除备份
  const handleDeleteBackup = async (backup: BackupFile) => {
    setIsLoading(true);
    try {
      const result = await deleteBackup(backup.path);
      if (result.success) {
        toast({
          title: '删除成功',
          description: `已删除: ${backup.name}`,
        });
        await loadBackups();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: '删除失败',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  // 清理旧备份
  const handleCleanup = async () => {
    setIsLoading(true);
    try {
      const result = await cleanupBackups(10);
      if (result.success) {
        toast({
          title: '清理完成',
          description: `已删除 ${result.deleted} 个旧备份`,
        });
        await loadBackups();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: '清理失败',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  // 切换每日备份
  const toggleDailyBackup = (enabled: boolean) => {
    setDailyBackupEnabled(enabled);
    localStorage.setItem('daily_backup_settings', JSON.stringify({ 
      enabled, 
      lastBackupDate: enabled ? new Date().toISOString().split('T')[0] : '' 
    }));
    toast({
      title: enabled ? '每日备份已开启' : '每日备份已关闭',
    });
  };

  // 切换自动备份
  const toggleAutoBackup = (enabled: boolean) => {
    setAutoBackupEnabled(enabled);
    const settings = {
      enabled,
      interval: autoBackupInterval,
      lastBackupTime: Date.now()
    };
    localStorage.setItem('auto_backup_settings', JSON.stringify(settings));
    toast({
      title: enabled ? '自动备份已开启' : '自动备份已关闭',
    });
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isDesktopEnv) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            当前运行在浏览器模式。要获得完整的本地数据存储和增量备份功能，请使用桌面版应用。
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardHeader>
            <CardTitle>浏览器模式限制</CardTitle>
            <CardDescription>
              浏览器环境无法直接访问本地文件系统，数据将保存在 IndexedDB 中
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• 数据存储在浏览器 IndexedDB 中</p>
            <p>• 可通过导出/导入功能备份到本地文件</p>
            <p>• 建议使用桌面版（Tauri/Electron）获得完整功能</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-bold">数据管理（桌面版）</h2>
        {isTauriEnv && <Badge variant="secondary">Tauri</Badge>}
        {!isTauriEnv && <Badge variant="secondary">Electron</Badge>}
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="backup" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="backup">备份管理</TabsTrigger>
          <TabsTrigger value="import-export">导入/导出</TabsTrigger>
          <TabsTrigger value="settings">自动备份</TabsTrigger>
        </TabsList>

        <TabsContent value="backup" className="space-y-4">
          {/* 数据存储位置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                数据存储位置
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
                <Folder className="h-5 w-5 text-primary" />
                <code className="text-sm break-all">{dataPath}</code>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                数据保存在应用目录中，可直接访问和备份
              </p>
            </CardContent>
          </Card>

          {/* 备份操作 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                手动备份
              </CardTitle>
              <CardDescription>
                创建全量或增量备份
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={handleFullBackup} 
                  disabled={isLoading}
                  variant="outline"
                  className="h-auto py-4"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <HardDrive className="h-4 w-4 mr-2" />
                  )}
                  <div className="text-left">
                    <div className="font-medium">全量备份</div>
                    <div className="text-xs text-muted-foreground">备份所有数据</div>
                  </div>
                </Button>
                
                <Button 
                  onClick={handleIncrementalBackup} 
                  disabled={isLoading}
                  variant="outline"
                  className="h-auto py-4"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FilePlus className="h-4 w-4 mr-2" />
                  )}
                  <div className="text-left">
                    <div className="font-medium">增量备份</div>
                    <div className="text-xs text-muted-foreground">仅备份变更数据</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 备份列表 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="h-5 w-5" />
                  备份列表
                </CardTitle>
                <CardDescription>
                  共 {backups.length} 个备份文件
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCleanup}
                disabled={isLoading || backups.length <= 10}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                清理旧备份
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {backups.map((backup) => (
                    <div 
                      key={backup.path}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                    >
                      <div className="flex items-center gap-3">
                        <FileJson className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{backup.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(backup.size)} · {formatDistanceToNow(new Date(backup.created), { locale: zhCN, addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedBackup(backup);
                            setShowRestoreDialog(true);
                          }}
                        >
                          恢复
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDeleteBackup(backup)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {backups.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      暂无备份文件
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import-export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                导出数据
              </CardTitle>
              <CardDescription>
                将数据导出到指定目录
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleExport} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                选择导出位置
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                导入数据
              </CardTitle>
              <CardDescription>
                从备份文件恢复数据
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  导入数据将覆盖当前所有数据，请确保已备份！
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={handleImport} 
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                选择备份文件
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {/* 每日备份 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                每日首次备份
              </CardTitle>
              <CardDescription>
                每天第一次打开应用时自动创建全量备份
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>启用每日备份</Label>
                  <p className="text-sm text-muted-foreground">
                    自动保存到备份目录
                  </p>
                </div>
                <Switch
                  checked={dailyBackupEnabled}
                  onCheckedChange={toggleDailyBackup}
                />
              </div>
            </CardContent>
          </Card>

          {/* 定时自动备份 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                定时自动备份
              </CardTitle>
              <CardDescription>
                按设定间隔自动创建备份
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>启用定时备份</Label>
                  <p className="text-sm text-muted-foreground">
                    自动保存到备份目录
                  </p>
                </div>
                <Switch
                  checked={autoBackupEnabled}
                  onCheckedChange={toggleAutoBackup}
                />
              </div>

              {autoBackupEnabled && (
                <div className="space-y-2">
                  <Label>备份间隔（分钟）</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="5"
                      max="1440"
                      value={autoBackupInterval}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 30;
                        setAutoBackupInterval(value);
                        localStorage.setItem('auto_backup_settings', JSON.stringify({
                          enabled: autoBackupEnabled,
                          interval: value,
                          lastBackupTime: Date.now()
                        }));
                      }}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">分钟</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 恢复确认对话框 */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认恢复备份</DialogTitle>
            <DialogDescription>
              恢复将覆盖当前所有数据，此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          
          {selectedBackup && (
            <div className="py-4">
              <p className="text-sm font-medium">选择的备份:</p>
              <p className="text-sm text-muted-foreground">{selectedBackup.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(selectedBackup.size)} · {format(new Date(selectedBackup.created), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              取消
            </Button>
            <Button 
              onClick={handleRestore} 
              disabled={isLoading}
              variant="destructive"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              确认恢复
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
